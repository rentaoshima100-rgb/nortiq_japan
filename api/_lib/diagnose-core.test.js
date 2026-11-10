// 無料診断の判定 (api/_lib/diagnose-core.js) のテスト。通信はしない。
//   node --test "api/_lib/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('./diagnose-core.js');

// 問題の無いページ (各テストはここから1か所だけ崩す)
const GOOD_HEAD = `<meta charset="utf-8">
<title>京都のサンプル株式会社｜Web制作と運用のご相談</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="京都のサンプル株式会社の公式サイトです。Web制作、保守運用、アクセス解析の改善まで、中小企業の担当者と一緒に進めます。まずは無料でご相談ください。">
<meta property="og:title" content="サンプル株式会社">
<meta property="og:image" content="https://example.jp/og.png">
<link rel="canonical" href="https://example.jp/">
<link rel="icon" href="/favicon.ico">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"サンプル株式会社"}</script>`;
const GOOD_BODY = `<h1>サンプル株式会社</h1><h2>サービス</h2><ul><li>Web制作</li><li>保守運用</li></ul><p>${'本文の文章です。'.repeat(40)}</p>
<a href="/about">会社概要</a>`;
const page = ({ head = GOOD_HEAD, body = GOOD_BODY, htmlAttrs = 'lang="ja"' } = {}) => `<!doctype html><html ${htmlAttrs}><head>${head}</head><body>${body}</body></html>`;

const GOOD_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'content-encoding': 'br',
  'strict-transport-security': 'max-age=63072000',
  'content-security-policy': "default-src 'self'; frame-ancestors 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=()',
  server: 'Vercel',
};
const secCtx = (over = {}) => ({ finalUrl: 'https://example.jp/', headers: GOOD_HEADERS, setCookies: [], httpUpgrades: true, ...over });
const techCtx = (over = {}) => ({ finalUrl: 'https://example.jp/', headers: GOOD_HEADERS, robotsTxt: 'User-agent: *\nAllow: /\nSitemap: https://example.jp/sitemap.xml', sitemapOk: true, redirects: 0, ...over });
const has = (r, re) => r.issues.some((x) => re.test(x));

// ---------- HTML の読み取り ----------
test('attr: 引用符あり・なし、値なし、似た名前の属性を取り違えない', () => {
  assert.equal(core.attr('<img src="a.png" alt="">', 'alt'), '');
  assert.equal(core.attr("<img src='a.png'>", 'src'), 'a.png');
  assert.equal(core.attr('<img src=a.png>', 'src'), 'a.png');
  assert.equal(core.attr('<img data-src="lazy.png">', 'src'), null);
  assert.equal(core.attr('<script async src="x.js">', 'async'), '');
  assert.equal(core.attr('<a href="/?a=1&amp;b=2">', 'href'), '/?a=1&b=2');
});

test('metaContent: 属性の順序に依らない', () => {
  assert.equal(core.metaContent('<meta content="説明" name="description">', 'description'), '説明');
  assert.equal(core.metaContent('<meta name="Description" content="説明">', 'description'), '説明');
  assert.equal(core.metaContent('<meta content="x" property="og:title">', 'og:title', 'property'), 'x');
  assert.equal(core.metaContent('<meta name="keywords" content="a">', 'description'), null);
});

test('visibleText: script・style・コメントの中身は本文に数えない', () => {
  const t = core.visibleText('<p>見える</p><script>var a = "見えない";</script><style>.a{}</style><!-- 見えない -->');
  assert.equal(t, '見える');
});

test('looksLikeHtml: SPA が返すトップの HTML を「ファイルがある」と数えない', () => {
  assert.equal(core.looksLikeHtml('<!DOCTYPE html><html>', ''), true);
  assert.equal(core.looksLikeHtml('# llms.txt\n> 案内', 'text/html; charset=utf-8'), true);
  assert.equal(core.looksLikeHtml('# llms.txt\n> 案内', 'text/plain'), false);
  assert.equal(core.looksLikeHtml('User-agent: *\nDisallow:', ''), false);
});

test('baseHref: <base href> があれば相対リンクはそこから解決する', () => {
  const html = '<html><head><base href="https://example.jp/main/"></head><body><a href="p/1.html">x</a></body></html>';
  assert.equal(core.baseHref(html, 'https://example.jp/'), 'https://example.jp/main/');
  assert.equal(new URL('p/1.html', core.baseHref(html, 'https://example.jp/')).href, 'https://example.jp/main/p/1.html');
  assert.equal(core.baseHref('<html><head></head></html>', 'https://example.jp/a/'), 'https://example.jp/a/');
  assert.equal(core.baseHref('<head><base href="javascript:alert(1)"></head>', 'https://example.jp/'), 'https://example.jp/');
});

// ---------- robots.txt ----------
test('robots.txt: グループ単位で読む (特定のボットだけ拒否・全体を拒否・一部のパスだけ拒否)', () => {
  const only = core.parseRobots('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /admin/');
  assert.equal(core.robotsBlocksAll(only, 'gptbot'), true);
  assert.equal(core.robotsBlocksAll(only, 'googlebot'), false);
  assert.equal(core.robotsBlocksAll(only, 'claudebot'), false);

  const all = core.parseRobots('User-agent: *\nDisallow: /');
  assert.equal(core.robotsBlocksAll(all, 'googlebot'), true);

  const shared = core.parseRobots('User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /  # AI は不可\n\nUser-agent: *\nDisallow:');
  assert.equal(core.robotsBlocksAll(shared, 'claudebot'), true);
  assert.equal(core.robotsBlocksAll(shared, 'googlebot'), false);

  const wp = core.parseRobots('User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\nSitemap: https://example.jp/wp-sitemap.xml');
  assert.equal(core.robotsBlocksAll(wp, 'googlebot'), false);
  assert.deepEqual(wp.sitemaps, ['https://example.jp/wp-sitemap.xml']);
});

// ---------- On-Page ----------
test('On-Page: 問題の無いページは 100 点', () => {
  const r = core.analyzeOnPage(page());
  assert.deepEqual(r.issues, []);
  assert.equal(r.score, 100);
});

test('On-Page: title・description・h1 の欠落と、長さ', () => {
  const r = core.analyzeOnPage(page({ head: '<meta charset="utf-8">', body: '<p>短い</p>' }));
  assert.ok(has(r, /title タグがありません/));
  assert.ok(has(r, /meta description がありません/));
  assert.ok(has(r, /h1 がありません/));
  assert.ok(has(r, /本文の文字がほとんどありません/));
  assert.equal(r.topIssue, 'title タグがありません'); // 一番重いものが先頭

  const short = core.analyzeOnPage(page({ head: GOOD_HEAD.replace(/<title>.*<\/title>/, '<title>短い</title>') }));
  assert.ok(has(short, /title が 2 文字/));
  const twoH1 = core.analyzeOnPage(page({ body: GOOD_BODY + '<h1>もう一つ</h1>' }));
  assert.ok(has(twoH1, /h1 が 2 個/));
});

test('On-Page: alt="" (装飾画像) は「alt なし」に数えない。script 内の <img> も数えない', () => {
  const ok = core.analyzeOnPage(page({ body: GOOD_BODY + '<img src="a.png" alt=""><img alt="写真" src="b.png"><script>var s = "<img src=x>";</script>' }));
  assert.ok(!has(ok, /alt 属性なし/));
  const bad = core.analyzeOnPage(page({ body: GOOD_BODY + '<img src="a.png"><img src="b.png" alt="写真">' }));
  assert.ok(has(bad, /alt 属性なしの画像が 1\/2 件/));
});

// ---------- Technical ----------
test('Technical: 問題の無いページは 100 点', () => {
  const r = core.analyzeTechnical(page(), techCtx());
  assert.deepEqual(r.issues, []);
  assert.equal(r.score, 100);
});

test('Technical: noindex (meta と X-Robots-Tag) と、robots.txt の全拒否を見つける', () => {
  const meta = core.analyzeTechnical(page({ head: GOOD_HEAD + '<meta content="noindex, nofollow" name="robots">' }), techCtx());
  assert.ok(has(meta, /noindex/));
  assert.ok(meta.score <= 65);
  const header = core.analyzeTechnical(page(), techCtx({ headers: { ...GOOD_HEADERS, 'x-robots-tag': 'noindex' } }));
  assert.ok(has(header, /noindex/));
  const robots = core.analyzeTechnical(page(), techCtx({ robotsTxt: 'User-agent: *\nDisallow: /' }));
  assert.ok(has(robots, /サイト全体を拒否/));
});

test('Technical: sitemap.xml が無くても、robots.txt に Sitemap: があれば「無い」としない', () => {
  const viaRobots = core.analyzeTechnical(page(), techCtx({ sitemapOk: false }));
  assert.ok(!has(viaRobots, /sitemap/));
  const none = core.analyzeTechnical(page(), techCtx({ sitemapOk: false, robotsTxt: 'User-agent: *\nDisallow:' }));
  assert.ok(has(none, /sitemap\.xml が見当たりません/));
  const noRobots = core.analyzeTechnical(page(), techCtx({ sitemapOk: true, robotsTxt: '' }));
  assert.ok(has(noRobots, /robots\.txt がありません/));
});

test('Technical: http、viewport なし、別ドメインへの canonical', () => {
  const r = core.analyzeTechnical(
    page({ head: GOOD_HEAD.replace(/<meta name="viewport"[^>]*>/, '').replace('href="https://example.jp/"', 'href="https://other.example.com/"') }),
    techCtx({ finalUrl: 'http://example.jp/' }),
  );
  assert.ok(has(r, /HTTPS 化されていません/));
  assert.ok(has(r, /viewport/));
  assert.ok(has(r, /canonical が別のドメイン/));
  // www の有無だけの違いは別ドメインに数えない
  const www = core.analyzeTechnical(page(), techCtx({ finalUrl: 'https://www.example.jp/' }));
  assert.ok(!has(www, /canonical が別のドメイン/));
});

// ---------- AI ----------
test('AI: トップページ (記事ではない) に著者・日付が無くても減点しない', () => {
  const r = core.analyzeAI(page(), '# サンプル株式会社\n> 案内', 'User-agent: *\nAllow: /');
  assert.deepEqual(r.issues, []);
  assert.equal(r.score, 100);
});

test('AI: 記事には著者と日付を求める', () => {
  const article = page({ head: GOOD_HEAD + '<meta property="og:type" content="article">' });
  assert.equal(core.isArticleLike(article), true);
  // トップページのお知らせカードに <article> が使われていても、記事とは扱わない
  assert.equal(core.isArticleLike(page({ body: GOOD_BODY + '<article><h3>お知らせ</h3></article>' })), false);
  const r = core.analyzeAI(article, 'x', '');
  assert.ok(has(r, /著者・監修/));
  assert.ok(has(r, /更新日・公開日/));
  const ok = core.analyzeAI(page({ head: GOOD_HEAD + '<meta property="og:type" content="article">', body: GOOD_BODY + '<p>執筆: 山田</p><time datetime="2026-11-01">2026年11月1日</time>' }), 'x', '');
  assert.ok(!has(ok, /著者・監修|更新日・公開日/));
});

test('AI: AI クローラーの拒否、llms.txt なし、JSON-LD なし、運営者の構造化データなし', () => {
  const blocked = core.analyzeAI(page(), 'x', 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /');
  assert.ok(has(blocked, /AI クローラーを拒否しています: gptbot$/));
  const noLlms = core.analyzeAI(page(), '', '');
  assert.ok(has(noLlms, /llms\.txt が未設置/));
  assert.equal(noLlms.score, 92);
  const noLd = core.analyzeAI(page({ head: GOOD_HEAD.replace(/<script type="application\/ld\+json">.*<\/script>/, '') }), 'x', '');
  assert.ok(has(noLd, /JSON-LD/));
  assert.ok(!has(noLd, /運営者/)); // 重ねて減点しない
  const noOrg = core.analyzeAI(page({ head: GOOD_HEAD.replace('"Organization"', '"WebPage"') }), 'x', '');
  assert.ok(has(noOrg, /運営者/));
});

// ---------- リンク切れ ----------
test('リンク: 404・410・5xx・名前が引けないものだけを「切れている」と数える', () => {
  const r = core.summarizeLinks([
    { status: 200 }, { status: 301 }, { status: 404 }, { status: 410 }, { status: 503 },
    { status: 0, error: 'getaddrinfo ENOTFOUND gone.example' },
    { status: 403 }, { status: 405 }, { status: 429 }, { status: 999 },
    { status: 0, error: 'The operation was aborted due to timeout' },
  ]);
  assert.equal(r.broken, 4);
  assert.equal(r.unknown, 5);
  assert.equal(r.linksChecked, 11);
});

test('リンク: ボット拒否 (403) だけなら満点。リンクが無いページも満点', () => {
  const r = core.summarizeLinks([{ status: 200 }, { status: 403 }, { status: 403 }]);
  assert.equal(r.score, 100);
  assert.equal(r.topIssue, 'リンク切れは検出されませんでした');
  assert.ok(has(r, /2 件は自動では確認できませんでした/));
  assert.equal(core.summarizeLinks([]).score, 100);
});

// ---------- セキュリティ (外形) ----------
test('セキュリティ: 設定の整ったサイトは 100 点', () => {
  const r = core.analyzeSecurity(page(), secCtx());
  assert.deepEqual(r.issues, []);
  assert.equal(r.score, 100);
});

test('セキュリティ: http のサイト', () => {
  const r = core.analyzeSecurity(page(), secCtx({ finalUrl: 'http://example.jp/', headers: {} }));
  assert.match(r.topIssue, /HTTPS 化されていません/);
  assert.ok(!has(r, /HSTS/)); // http のサイトに HSTS は問わない
  assert.ok(r.score <= 50);
});

test('セキュリティ: ヘッダーが何も無い https のサイト', () => {
  const r = core.analyzeSecurity(page(), secCtx({ headers: {}, httpUpgrades: false }));
  for (const re of [/http:\/\/ でも開けてしまいます/, /HSTS/, /Content-Security-Policy/, /クリックジャッキング/, /nosniff/, /Referrer-Policy/, /Permissions-Policy/]) {
    assert.ok(has(r, re), String(re));
  }
  assert.equal(r.score, 100 - (10 + 7 + 7 + 7 + 5 + 3 + 2));
  // http を確かめられなかったとき (null) は、問題にしない
  const unknown = core.analyzeSecurity(page(), secCtx({ httpUpgrades: null }));
  assert.ok(!has(unknown, /http:\/\/ でも開けてしまいます/));
});

test('セキュリティ: CSP は meta でも可。frame-ancestors があれば X-Frame-Options は不要', () => {
  const h = { ...GOOD_HEADERS }; delete h['content-security-policy'];
  const meta = core.analyzeSecurity(page({ head: GOOD_HEAD + `<meta http-equiv="Content-Security-Policy" content="default-src 'self'">` }), secCtx({ headers: { ...h, 'x-frame-options': 'SAMEORIGIN' } }));
  assert.deepEqual(meta.issues, []);
  const noFrame = core.analyzeSecurity(page({ head: GOOD_HEAD + `<meta http-equiv="Content-Security-Policy" content="default-src 'self'">` }), secCtx({ headers: h }));
  assert.ok(has(noFrame, /クリックジャッキング/));
});

test('セキュリティ: Cookie の属性', () => {
  const r = core.analyzeSecurity(page(), secCtx({ setCookies: ['PHPSESSID=abc; path=/', 'theme=dark; Secure; SameSite=Lax'] }));
  assert.ok(has(r, /Secure 属性の無い Cookie が 1 件/));
  assert.ok(has(r, /HttpOnly 属性がありません \(1 件\)/));
  assert.ok(has(r, /SameSite 属性の無い Cookie が 1 件/));
  assert.ok(!r.issues.join(' ').includes('abc')); // Cookie の値は結果に出さない
  const ok = core.analyzeSecurity(page(), secCtx({ setCookies: ['session_id=abc; Path=/; Secure; HttpOnly; SameSite=Lax'] }));
  assert.deepEqual(ok.issues, []);
});

test('セキュリティ: 混在コンテンツと、http へ送るフォーム', () => {
  const r = core.analyzeSecurity(page({ body: GOOD_BODY + '<script src="http://cdn.example.com/a.js"></script><img src="http://img.example.com/a.png" alt=""><form action="http://example.jp/send"></form><a href="http://example.com/">http のリンクは対象外</a>' }), secCtx());
  assert.ok(has(r, /スクリプト・スタイルを 1 件/));
  assert.ok(has(r, /画像・動画を 1 件/));
  assert.ok(has(r, /フォームの送信先が暗号化されていません/));
  assert.equal(r.issues.length, 3);
});

test('セキュリティ: 版の露出と、サポートが終わった PHP・古い WordPress', () => {
  const r = core.analyzeSecurity(
    page({ head: GOOD_HEAD + '<meta name="generator" content="WordPress 5.8.2">' }),
    secCtx({ headers: { ...GOOD_HEADERS, server: 'Apache/2.4.41 (Ubuntu)', 'x-powered-by': 'PHP/7.4.33' } }),
  );
  assert.ok(has(r, /サーバーソフトの種類と版/));
  assert.ok(has(r, /サポートが終了した PHP 7\.4/));
  assert.ok(has(r, /古い WordPress 5\.8\.2/));
  const current = core.analyzeSecurity(
    page({ head: GOOD_HEAD + '<meta name="generator" content="WordPress 6.8">' }),
    secCtx({ headers: { ...GOOD_HEADERS, 'x-powered-by': 'PHP/8.3.1' } }),
  );
  assert.ok(has(current, /WordPress の版が外から分かります \(6\.8\)/));
  assert.ok(has(current, /X-Powered-By: PHP\/8\.3\.1/));
  assert.ok(!has(current, /サポートが終了|古い WordPress/));
  // 版の無い Server (Vercel、cloudflare、nginx) は指摘しない
  assert.ok(!has(core.analyzeSecurity(page(), secCtx({ headers: { ...GOOD_HEADERS, server: 'nginx' } })), /サーバーソフト/));
});

test('セキュリティ: 古い jQuery・Bootstrap (版はファイルのパスから読む)', () => {
  assert.deepEqual(core.libVersions('<script src="https://code.jquery.com/jquery-1.12.4.min.js"></script>'), { jquery: '1.12.4' });
  assert.deepEqual(core.libVersions('<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>'), { jquery: '3.7.1' });
  assert.deepEqual(core.libVersions('<script src="/wp-includes/js/jquery/jquery.min.js?ver=3.4.1"></script>'), { jquery: '3.4.1' });
  // プラグインの ?ver= は、そのプラグイン自身の版。jQuery の版と読まない
  assert.deepEqual(core.libVersions('<script src="/wp-content/plugins/x/jquery.slider.js?ver=1.2.0"></script>'), {});
  assert.deepEqual(core.libVersions('<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.1.3/dist/js/bootstrap.min.js"></script>'), { bootstrap: '4.1.3' });

  const old = core.analyzeSecurity(page({ body: GOOD_BODY + '<script src="/js/jquery-1.12.4.min.js"></script><script src="/js/bootstrap-3.3.7.min.js"></script>' }), secCtx());
  assert.ok(has(old, /古い jQuery 1\.12\.4/));
  assert.ok(has(old, /古い Bootstrap 3\.3\.7/));
  const fine = core.analyzeSecurity(page({ body: GOOD_BODY + '<script src="/js/jquery-3.7.1.min.js"></script><script src="/js/bootstrap-5.3.2.min.js"></script>' }), secCtx());
  assert.deepEqual(fine.issues, []);
});

test('セキュリティ: 公開 HTML の秘密鍵を見つける。値は結果に出さない', () => {
  const key = 'sk_live_' + 'a1B2c3D4e5F6g7H8i9J0';
  const r = core.analyzeSecurity(page({ body: GOOD_BODY + `<script>const k = "${key}";</script>` }), secCtx());
  assert.match(r.topIssue, /秘密鍵とみられる文字列/);
  assert.ok(!JSON.stringify(r).includes(key));
  // 公開してよい鍵 (pk_live_、reCAPTCHA のサイトキーなど) は指摘しない
  const pub = core.analyzeSecurity(page({ body: GOOD_BODY + '<script>Stripe("pk_live_a1B2c3D4e5F6g7H8i9J0")</script>' }), secCtx());
  assert.deepEqual(pub.issues, []);
});

test('versionLess', () => {
  assert.equal(core.versionLess('3.4.1', '3.5.0'), true);
  assert.equal(core.versionLess('3.5.0', '3.5.0'), false);
  assert.equal(core.versionLess('3.10.0', '3.5.0'), false);
  assert.equal(core.versionLess('1.12', '3.5.0'), true);
  assert.equal(core.versionLess('8.2', '8.2'), false);
});

// ---------- 表示速度 (簡易) ----------
test('速度: 応答時間の段階、HTML の大きさ、圧縮', () => {
  const ctx = (over) => ({ headers: GOOD_HEADERS, ms: 300, bytes: 40000, ...over });
  assert.equal(core.analyzeSpeed(page(), ctx()).score, 100);
  assert.ok(has(core.analyzeSpeed(page(), ctx({ ms: 1000 })), /1\.0 秒かかっています/));
  assert.ok(has(core.analyzeSpeed(page(), ctx({ ms: 2500 })), /やや遅い/));
  const slow = core.analyzeSpeed(page(), ctx({ ms: 4200 }));
  assert.ok(has(slow, /応答が遅い \(HTML の取得に 4\.2 秒\)/));
  assert.equal(slow.issues.length, 1); // 段階のある項目は1件だけ
  assert.ok(has(core.analyzeSpeed(page(), ctx({ bytes: 400 * 1024 })), /HTML が大きい \(400KB\)/));
  assert.ok(has(core.analyzeSpeed(page(), ctx({ headers: { 'content-type': 'text/html' } })), /圧縮されずに/));
  // 小さい HTML は圧縮していなくても指摘しない
  assert.ok(!has(core.analyzeSpeed(page(), ctx({ headers: {}, bytes: 5000 })), /圧縮/));
});

test('速度: 描画を止めるスクリプト、画像の読み込み方', () => {
  const blocking = '<script src="a.js"></script><script src="b.js"></script><script src="c.js"></script><script src="d.js" defer></script><script type="module" src="e.js"></script>';
  const r = core.analyzeSpeed(page({ head: GOOD_HEAD + blocking }), { headers: GOOD_HEADERS, ms: 300, bytes: 40000 });
  assert.ok(has(r, /描画を止めるスクリプトが 3 件/));

  const imgs = (a) => Array.from({ length: 8 }, (_, i) => `<img src="p${i}.jpg" alt="" ${a}>`).join('');
  const bad = core.analyzeSpeed(page({ body: GOOD_BODY + imgs('') }), { headers: GOOD_HEADERS, ms: 300, bytes: 40000 });
  assert.ok(has(bad, /遅延読み込み/));
  assert.ok(has(bad, /幅と高さの指定が無い/));
  assert.ok(has(bad, /WebP \/ AVIF/));
  const good = core.analyzeSpeed(page({ body: GOOD_BODY + imgs('loading="lazy" width="400" height="300"').replace(/\.jpg/g, '.webp') }), { headers: GOOD_HEADERS, ms: 300, bytes: 40000 });
  assert.deepEqual(good.issues, []);
});

// ---------- 総合 ----------
test('総合: 重みの合計は 1。6 領域がそろい、点数とランクが出る', () => {
  const sum = Object.values(core.WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  const parts = {
    technicalSEO: core.analyzeTechnical(page(), techCtx()),
    onPageSEO: core.analyzeOnPage(page()),
    security: core.analyzeSecurity(page(), secCtx()),
    speed: core.analyzeSpeed(page(), { headers: GOOD_HEADERS, ms: 300, bytes: 40000 }),
    aiVisibility: core.analyzeAI(page(), 'x', 'User-agent: *\nAllow: /'),
    brokenLinks: core.summarizeLinks([{ status: 200 }]),
  };
  const r = core.buildReport(parts);
  assert.equal(r.overall.score, 100);
  assert.equal(r.overall.rank, 'A');
  assert.deepEqual(Object.keys(r.categories), ['technicalSEO', 'onPageSEO', 'security', 'speed', 'aiVisibility', 'brokenLinks']);
  for (const c of Object.values(r.categories)) { assert.ok(c.jp && c.label && typeof c.score === 'number' && Array.isArray(c.issues)); }
  assert.equal(core.rankOf(89), 'B'); assert.equal(core.rankOf(74), 'C'); assert.equal(core.rankOf(59), '要改善');
});

test('総合: 見る項目の数は最大 58 (画面と LP の「最大58項目」の根拠。項目を増減したらここと文言を直す)', () => {
  // 項目が最大になる条件: https、Cookie あり、画像 6 枚以上、記事ページ、リンクあり
  const article = page({ head: GOOD_HEAD + '<meta property="og:type" content="article">', body: GOOD_BODY + Array.from({ length: 6 }, () => '<img src="a.webp" alt="">').join('') });
  const r = core.buildReport({
    technicalSEO: core.analyzeTechnical(article, techCtx()),
    onPageSEO: core.analyzeOnPage(article),
    security: core.analyzeSecurity(article, secCtx({ setCookies: ['a=1; Secure; SameSite=Lax'] })),
    speed: core.analyzeSpeed(article, { headers: GOOD_HEADERS, ms: 300, bytes: 40000 }),
    aiVisibility: core.analyzeAI(article, 'x', ''),
    brokenLinks: core.summarizeLinks([{ status: 200 }]),
  });
  assert.equal(r.checks, core.MAX_CHECKS);
  assert.equal(core.MAX_CHECKS, 58);
});
