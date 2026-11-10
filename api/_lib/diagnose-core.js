// 無料診断 (api/diagnose.js) の判定部分。通信をしない純粋な関数だけを置く (api/_lib/diagnose-core.test.js でテストする)。
//
// 入力は「公開ページを1回開いて得た HTML と応答ヘッダー」と、robots.txt / llms.txt などの公開ファイル。
// 2026-11 に次を足した:
//   - セキュリティの外形チェック (analyzeSecurity): HTTPS、セキュリティヘッダー、Cookie の属性、混在コンテンツ、
//     バージョンの露出、既知の脆弱性が報告されている古いライブラリ、公開 HTML に出てしまった秘密鍵。
//     ふつうのブラウザがページを開いたときに受け取る情報だけを見る。管理画面や設定ファイルの場所を探りに行く検査、
//     ポートの検査、攻撃の試行はしない (それは所有者の同意を取ってから行う /security の領域)。
//   - 表示速度の簡易チェック (analyzeSpeed): 応答時間、HTML の重さ、圧縮、画像・スクリプトの読み込み方。
//     Lighthouse (Core Web Vitals) の実測ではない。
//   - 既存の判定の精度: 属性の順序に依らない meta の読み取り、noindex の検出、robots.txt のグループ単位の解釈、
//     llms.txt に HTML が返るサイト (SPA) の誤検出、ボット拒否 (403 など) をリンク切れに数えない、など。
//
// 各関数は { score, topIssue, issues: string[], checked: number } を返す。checked は実際に見た項目の数
// (画面と LP の「◯項目」はここから出す。手で数字を書かない)。

'use strict';

function clamp(n, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, Math.round(n))); }

// ---------- HTML の読み取り (正規表現。DOM は使わない) ----------
function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch { return ''; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return ''; } });
}

// タグ文字列から属性値を取る。引用符あり (" ')・なしの両方。属性が無ければ null、値なし (hidden など) は ''。
function attr(tag, name) {
  const re = new RegExp('(?:^|[\\s"\'])' + name + '(?:\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+)))?(?=[\\s/>]|$)', 'i');
  const m = String(tag).match(re);
  if (!m) return null;
  return decodeEntities(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] != null ? m[3] : '');
}

function tags(html, name) {
  return String(html).match(new RegExp('<' + name + '\\b[^>]*>', 'gi')) || [];
}

// コメント・script・style の中身を除いた HTML (本文中のタグだけを数えるため)
function stripNonContent(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ');
}

function visibleText(html) {
  return decodeEntities(stripNonContent(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// <meta name="..." content="..."> / <meta property="..." content="...">。属性の順序は問わない。
function metaContent(html, key, by = 'name') {
  for (const t of tags(html, 'meta')) {
    const k = attr(t, by);
    if (k != null && k.toLowerCase() === key.toLowerCase()) return (attr(t, 'content') || '').trim();
  }
  return null;
}

function linkHref(html, rel) {
  for (const t of tags(html, 'link')) {
    const r = attr(t, 'rel');
    if (r != null && r.toLowerCase().split(/\s+/).includes(rel)) return (attr(t, 'href') || '').trim();
  }
  return null;
}

function titleOf(html) {
  const m = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : '';
}

// 文字数 (サロゲートペアを1文字に数える)
const len = (s) => Array.from(String(s || '')).length;

// ---------- robots.txt ----------
// User-agent の並びごとのグループに分け、{ agents: [...], rules: [{allow, path}] } の配列にする。
function parseRobots(txt) {
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  const sitemaps = [];
  for (const raw of String(txt || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (key === 'sitemap') sitemaps.push(val);
      else if ((key === 'disallow' || key === 'allow') && cur) cur.rules.push({ allow: key === 'allow', path: val });
    }
  }
  return { groups, sitemaps };
}

// そのボットにサイト全体 (/) を拒否しているか。ボット名のグループがあればそれを、無ければ * を見る。
// 「Disallow: /」があり、「Allow: /」が無いときだけ true (一部のパスだけの拒否は数えない)。
function robotsBlocksAll(parsed, bot) {
  const name = String(bot).toLowerCase();
  const own = parsed.groups.filter((g) => g.agents.includes(name));
  const use = own.length ? own : parsed.groups.filter((g) => g.agents.includes('*'));
  const rules = [].concat(...use.map((g) => g.rules));
  const blocked = rules.some((r) => !r.allow && r.path === '/');
  const allowed = rules.some((r) => r.allow && (r.path === '/' || r.path === '/*'));
  return blocked && !allowed;
}

// 取得したものが HTML なら、そのファイルは「無い」と扱う。存在しないパスにもトップの HTML を 200 で返すサイト
// (SPA のフォールバック) で、llms.txt や robots.txt が「ある」と誤判定していた。
function looksLikeHtml(text, contentType) {
  if (/text\/html/i.test(String(contentType || ''))) return true;
  return /^\s*(<!doctype html|<html[\s>]|<head[\s>]|<body[\s>])/i.test(String(text || '').slice(0, 600));
}

// 相対リンクの起点。<base href> があればそれ (ページの URL から解決)、無ければページの URL。
function baseHref(html, pageUrl) {
  const head = String(html || '').split(/<\/head>/i)[0];
  const b = tags(head, 'base').map((t) => attr(t, 'href')).find(Boolean);
  if (!b) return pageUrl;
  try { const u = new URL(b, pageUrl); return /^https?:$/.test(u.protocol) ? u.href : pageUrl; } catch { return pageUrl; }
}

// ---------- 判定の入れ物 ----------
// add(条件が悪いとき true, 減点, 文言)。issues は減点の大きい順に並べて返す (topIssue = 一番重いもの)。
function scorer() {
  const found = [];
  let checked = 0;
  return {
    check(bad, penalty, text) { checked++; if (bad) found.push({ penalty, text }); return !!bad; },
    // 段階のある1項目。[条件, 減点, 文言] を重い順に並べ、最初に当てはまったものだけを採る (項目数は常に1)。
    tier(list) { checked++; const hit = list.find((x) => x[0]); if (hit) found.push({ penalty: hit[1], text: hit[2] }); return !!hit; },
    result(okText) {
      found.sort((a, b) => b.penalty - a.penalty);
      const score = clamp(100 - found.reduce((a, x) => a + x.penalty, 0));
      return { score, topIssue: found.length ? found[0].text : okText, issues: found.map((x) => x.text), checked };
    },
  };
}

// ---------- On-Page SEO ----------
function analyzeOnPage(html) {
  const s = scorer();
  const body = stripNonContent(html);

  const title = titleOf(html);
  s.tier([
    [!title, 22, 'title タグがありません'],
    [len(title) < 10 || len(title) > 60, 8, `title が ${len(title)} 文字 (推奨 10〜60)`],
  ]);

  const desc = metaContent(html, 'description');
  s.tier([
    [!desc, 14, 'meta description がありません'],
    [len(desc) < 60 || len(desc) > 170, 5, `meta description が ${len(desc)} 文字 (推奨 60〜160)`],
  ]);

  const h1 = (body.match(/<h1[\s>]/gi) || []).length;
  s.tier([
    [h1 === 0, 12, 'h1 がありません'],
    [h1 > 1, 6, `h1 が ${h1} 個 (推奨 1 個)`],
  ]);

  const text = visibleText(html);
  const h2 = (body.match(/<h2[\s>]/gi) || []).length;
  s.check(len(text) >= 1500 && h2 === 0, 4, '本文が長いのに h2 の見出しがありません');
  s.check(len(text) < 200, 8, `HTML に本文の文字がほとんどありません (${len(text)} 文字)。JavaScript で描画するサイトは、検索エンジンや AI に内容が届きにくくなります`);

  const imgs = tags(body, 'img');
  const noAlt = imgs.filter((t) => attr(t, 'alt') == null).length;
  s.check(imgs.length > 0 && noAlt > 0, clamp((noAlt / Math.max(imgs.length, 1)) * 16, 2, 16), `alt 属性なしの画像が ${noAlt}/${imgs.length} 件`);

  s.check(!metaContent(html, 'og:title', 'property'), 4, 'OGP の og:title が未設定 (SNS でシェアされたときの表示)');
  s.check(!metaContent(html, 'og:image', 'property'), 5, 'OGP の og:image が未設定 (SNS でシェアされたときの画像)');
  s.check(!/<html\b[^>]*\blang\s*=/i.test(html), 5, '<html lang> が未設定');
  s.check(!linkHref(html, 'canonical'), 4, 'canonical が未設定');

  return s.result('大きな問題は見つかりませんでした');
}

// ---------- Technical SEO ----------
// ctx: { finalUrl, status, headers, robotsTxt, sitemapOk, redirects }
function analyzeTechnical(html, ctx) {
  const s = scorer();
  const h = ctx.headers || {};
  const robots = parseRobots(ctx.robotsTxt);

  const metaRobots = (metaContent(html, 'robots') || '') + ' ' + (metaContent(html, 'googlebot') || '') + ' ' + (h['x-robots-tag'] || '');
  s.check(/noindex/i.test(metaRobots), 35, '検索結果に出さない設定 (noindex) になっています');
  s.check(!!ctx.robotsTxt && robotsBlocksAll(robots, 'googlebot'), 35, 'robots.txt が検索エンジンにサイト全体を拒否しています (Disallow: /)');

  s.check(!/^https:/i.test(ctx.finalUrl), 18, 'HTTPS 化されていません');
  s.check(metaContent(html, 'viewport') == null, 18, 'viewport メタが無く、スマホで正しく表示されない可能性があります');
  const hasCharset = tags(html, 'meta').some((t) => attr(t, 'charset') != null || /charset=/i.test(attr(t, 'content') || '')) || /charset=/i.test(h['content-type'] || '');
  s.check(!hasCharset, 5, '文字コード (charset) の宣言が見当たりません');
  s.check(!ctx.robotsTxt, 10, 'robots.txt がありません');
  s.check(!ctx.sitemapOk && robots.sitemaps.length === 0, 10, 'sitemap.xml が見当たりません');
  s.check(!/application\/ld\+json/i.test(html), 10, '構造化データ (JSON-LD) が未設置');

  const canonical = linkHref(html, 'canonical');
  let otherHost = false;
  if (canonical) {
    try { otherHost = new URL(canonical, ctx.finalUrl).hostname.replace(/^www\./, '') !== new URL(ctx.finalUrl).hostname.replace(/^www\./, ''); } catch { otherHost = false; }
  }
  s.check(otherHost, 10, 'canonical が別のドメインを指しています (このページは検索結果に出にくくなります)');
  s.check((ctx.redirects || 0) > 2, 5, `表示までに ${ctx.redirects} 回の転送 (リダイレクト) があります`);
  s.check(!linkHref(html, 'icon') && !linkHref(html, 'shortcut'), 2, 'favicon の指定がありません');

  return s.result('基本的なテクニカル要件は満たしています');
}

// ---------- AI Visibility ----------
const AI_BOTS = ['gptbot', 'oai-searchbot', 'chatgpt-user', 'claudebot', 'claude-web', 'perplexitybot', 'google-extended'];

// 記事のページか (著者・日付を求めるのは記事だけ。トップや会社案内に著者名が無いのは普通なので減点しない)。
// <article> タグの有無では決めない (トップページのお知らせ一覧のカードにもよく使われる)。
function isArticleLike(html) {
  return /^article$/i.test(metaContent(html, 'og:type', 'property') || '')
    || /"@type"\s*:\s*\[?\s*"(Article|BlogPosting|NewsArticle|TechArticle|Report)"/i.test(html);
}
// 運営者 (会社・店舗・団体) を示す構造化データ
const ORG_TYPES = /"@type"\s*:\s*\[?\s*"(Organization|Corporation|LocalBusiness|ProfessionalService|Store|Restaurant|MedicalBusiness|MedicalClinic|Dentist|Hospital|EducationalOrganization|School|GovernmentOrganization|NGO|OnlineBusiness|OnlineStore|Hotel|LodgingBusiness|HomeAndConstructionBusiness|LegalService|FinancialService|RealEstateAgent|AutomotiveBusiness|FoodEstablishment|HealthAndBeautyBusiness|SportsOrganization|NewsMediaOrganization|Person)"/i;

function analyzeAI(html, llmsTxt, robotsTxt) {
  const s = scorer();
  const hasJsonLd = /application\/ld\+json/i.test(html);
  s.check(!hasJsonLd, 24, '構造化データ (JSON-LD) が無く、AI が内容を理解しにくい');

  const robots = parseRobots(robotsTxt);
  const blocked = robotsTxt ? AI_BOTS.filter((b) => robotsBlocksAll(robots, b)) : [];
  s.check(blocked.length > 0, 20, `robots.txt が AI クローラーを拒否しています: ${blocked.join(', ')}`);

  if (isArticleLike(html)) {
    const hasAuthor = /(rel\s*=\s*["']?author|itemprop\s*=\s*["']?author|"author"\s*:)/i.test(html) || /著者|執筆|監修/.test(html);
    s.check(!hasAuthor, 12, '記事に著者・監修の情報 (E-E-A-T) が見当たりません');
    const hasDate = /(datetime\s*=|"dateModified"|"datePublished"|itemprop\s*=\s*["']?date|article:(published|modified)_time|更新日|公開日)/i.test(html);
    s.check(!hasDate, 8, '記事に更新日・公開日が見当たりません');
  } else {
    // JSON-LD が無いページは上の項目で数えているので、ここでは重ねて減点しない
    s.check(hasJsonLd && !ORG_TYPES.test(html), 8, '運営者 (会社・店舗) を示す構造化データ (Organization / LocalBusiness) が見当たりません');
  }

  const lists = (stripNonContent(html).match(/<(ul|ol|table|dl)[\s>]/gi) || []).length;
  s.check(lists < 1, 8, '箇条書き・表が無く、AI に引用されにくい構成');
  s.check(len(visibleText(html)) < 200, 12, 'HTML に本文がほとんど無く、JavaScript を実行しない AI クローラーには内容が届きません');
  // llms.txt はまだ標準ではない (対応する AI は一部)。置いてあれば加点要素、という重さにとどめる
  s.check(!llmsTxt, 8, 'llms.txt が未設置 (AI 向けにサイトの要点を伝える案内ファイル。対応する AI は一部)');

  return s.result('AI 可視性の基礎要件は概ね満たしています');
}

// ---------- リンク切れ ----------
// results: [{ status, error }]。リンク切れに数えるのは 404・410・5xx と、名前が引けない・接続できないもの。
// 401・403・405・429・999 は「ボットの拒否や認証」で、人が開けば表示されることが多いので数えない (確認できなかった数に入れる)。
// タイムアウトも数えない。
function summarizeLinks(results) {
  let broken = 0;
  let unknown = 0;
  for (const r of results) {
    const st = r ? r.status : 0;
    if (st === 404 || st === 410 || (st >= 500 && st < 600)) broken++;
    else if (st === 0) {
      if (r && /ENOTFOUND|ECONNREFUSED|getaddrinfo|certificate|CERT_/i.test(String(r.error || ''))) broken++;
      else unknown++;
    } else if (st >= 400) unknown++;
  }
  const total = results.length;
  if (total === 0) return { score: 100, topIssue: 'チェック対象のリンクが見つかりませんでした', issues: [], checked: 0, linksChecked: 0, broken: 0, unknown: 0 };
  const score = clamp(100 - (broken / total) * 100 * 4); // 5% で 80 点、25% で 0 点
  const issues = [];
  if (broken) issues.push(`${total} 件中 ${broken} 件のリンクが開けません (リンク切れ)`);
  if (unknown) issues.push(`${unknown} 件は自動では確認できませんでした (アクセス制限・応答なし)`);
  return { score, topIssue: broken ? issues[0] : 'リンク切れは検出されませんでした', issues, checked: 1, linksChecked: total, broken, unknown };
}

// ---------- セキュリティの外形チェック ----------
// 既知の脆弱性が報告されている古いライブラリ。src のファイル名・パス・?ver= から版を読む。
function versionLess(a, b) {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0); }
  return false;
}
function libVersions(html) {
  const out = {};
  for (const t of tags(html, 'script')) {
    const src = attr(t, 'src');
    if (!src) continue;
    const file = src.split('?')[0];
    // 版はファイル名・パスから読む (jquery-3.6.0.min.js、/jquery/1.12.4/jquery.min.js)。?ver= は WordPress 本体が配る
    // jQuery (/wp-includes/js/jquery/) のときだけ信じる (プラグインやテーマの ?ver= は、そのプラグイン自身の版)。
    let m = file.match(/jquery[-./@]?(\d+\.\d+(?:\.\d+)?)/i)
      || (/\/wp-includes\/js\/jquery\/jquery(\.min)?\.js$/i.test(file) && src.match(/[?&]ver=(\d+\.\d+(?:\.\d+)?)/i));
    if (m) out.jquery = m[1];
    m = file.match(/bootstrap[-./@]?(\d+\.\d+(?:\.\d+)?)/i);
    if (m) out.bootstrap = m[1];
  }
  return out;
}

// ctx: { finalUrl, headers, setCookies: string[], httpUpgrades: true|false|null }
//   httpUpgrades: http:// で開いたとき https:// へ転送されたか (確かめられなかったら null)。
function analyzeSecurity(html, ctx) {
  const s = scorer();
  const h = ctx.headers || {};
  const https = /^https:/i.test(ctx.finalUrl);

  s.check(!https, 30, 'HTTPS 化されていません (通信が暗号化されず、フォームの入力内容を途中で見られるおそれがあります)');
  if (https) {
    s.check(ctx.httpUpgrades === false, 10, 'http:// でも開けてしまいます (https:// への自動転送がありません)');
    s.check(!h['strict-transport-security'], 7, 'HSTS が未設定 (常に https で接続させる指定がありません)');
  }

  const csp = h['content-security-policy'] || tags(html, 'meta').map((t) => (/^content-security-policy$/i.test(attr(t, 'http-equiv') || '') ? attr(t, 'content') : '')).find(Boolean) || '';
  s.check(!csp, 7, 'Content-Security-Policy が未設定 (悪意のあるスクリプトの実行を防ぐ仕組みがありません)');
  s.check(!h['x-frame-options'] && !/frame-ancestors/i.test(csp), 7, '他サイトへの埋め込みを制限していません (クリックジャッキング対策: X-Frame-Options / frame-ancestors)');
  s.check(!/nosniff/i.test(h['x-content-type-options'] || ''), 5, 'X-Content-Type-Options: nosniff が未設定');
  s.check(!h['referrer-policy'] && metaContent(html, 'referrer') == null, 3, 'Referrer-Policy が未設定 (リンク先に閲覧元の URL がそのまま渡ります)');
  s.check(!h['permissions-policy'], 2, 'Permissions-Policy が未設定 (カメラ・位置情報などの利用制限)');

  // Cookie の属性 (このページの応答で発行されたものだけ)
  const cookies = (ctx.setCookies || []).map((c) => ({ name: String(c).split('=')[0].trim(), raw: String(c) }));
  if (cookies.length) {
    const noSecure = cookies.filter((c) => !/;\s*secure/i.test(c.raw));
    const sessionLike = cookies.filter((c) => /sess|sid$|token|auth|login|csrf/i.test(c.name));
    const noHttpOnly = sessionLike.filter((c) => !/;\s*httponly/i.test(c.raw));
    const noSameSite = cookies.filter((c) => !/;\s*samesite=/i.test(c.raw));
    s.check(https && noSecure.length > 0, 6, `Secure 属性の無い Cookie が ${noSecure.length} 件あります`);
    s.check(noHttpOnly.length > 0, 6, `ログイン・セッション用とみられる Cookie に HttpOnly 属性がありません (${noHttpOnly.length} 件)`);
    s.check(noSameSite.length > 0, 2, `SameSite 属性の無い Cookie が ${noSameSite.length} 件あります`);
  }

  // 混在コンテンツ (https のページが http の部品を読む)
  if (https) {
    const body = String(html);
    const active = [...tags(body, 'script'), ...tags(body, 'iframe')].filter((t) => /^http:\/\//i.test(attr(t, 'src') || '')).length
      + tags(body, 'link').filter((t) => /stylesheet/i.test(attr(t, 'rel') || '') && /^http:\/\//i.test(attr(t, 'href') || '')).length;
    const passive = [...tags(body, 'img'), ...tags(body, 'video'), ...tags(body, 'audio'), ...tags(body, 'source')].filter((t) => /^http:\/\//i.test(attr(t, 'src') || '')).length;
    const forms = tags(body, 'form').filter((t) => /^http:\/\//i.test(attr(t, 'action') || '')).length;
    s.check(active > 0, 12, `暗号化されていない (http://) スクリプト・スタイルを ${active} 件読み込んでいます (混在コンテンツ)`);
    s.check(passive > 0, 4, `暗号化されていない (http://) 画像・動画を ${passive} 件読み込んでいます`);
    s.check(forms > 0, 12, `フォームの送信先が暗号化されていません (http://)。${forms} 件`);
  }

  // バージョンの露出
  const server = h.server || '';
  const powered = h['x-powered-by'] || '';
  s.check(/\d+\.\d+/.test(server), 3, `サーバーソフトの種類と版が外から分かります (Server: ${server.slice(0, 40)})`);
  const php = powered.match(/php\/(\d+\.\d+)/i);
  s.tier([
    // PHP 8.1 までは公式のセキュリティサポートが終了している (8.1 は 2025-12-31 まで)
    [!!php && versionLess(php ? php[1] : '99', '8.2'), 14, `サポートが終了した PHP ${php ? php[1] : ''} で動いています (修正されない脆弱性が残ります)`],
    [!!powered, 3, `サーバー側の技術と版が外から分かります (X-Powered-By: ${powered.slice(0, 30)})`],
  ]);
  const gen = metaContent(html, 'generator') || '';
  const wp = gen.match(/wordpress\s+(\d+\.\d+(?:\.\d+)?)/i);
  s.tier([
    [!!wp && versionLess(wp ? wp[1] : '99', '6.0'), 14, `古い WordPress ${wp ? wp[1] : ''} で動いています (既知の脆弱性が修正されていない可能性があります)`],
    [!!wp, 3, `WordPress の版が外から分かります (${wp ? wp[1] : ''})`],
    [/\d+\.\d+/.test(gen), 2, `CMS の種類と版が外から分かります (${gen.slice(0, 40)})`],
  ]);

  // 古いライブラリ (既知の脆弱性が報告されている版)
  const libs = libVersions(html);
  // jQuery 3.5.0 未満: CVE-2020-11022 / CVE-2020-11023 (XSS)
  s.check(!!libs.jquery && versionLess(libs.jquery, '3.5.0'), 8, `既知の脆弱性が報告されている古い jQuery ${libs.jquery || ''} を読み込んでいます (3.5.0 以上に更新)`);
  // Bootstrap 3.4.1 未満、4.0.0〜4.3.0: CVE-2019-8331 (XSS)
  const bs = libs.bootstrap;
  s.check(!!bs && (versionLess(bs, '3.4.1') || (!versionLess(bs, '4.0.0') && versionLess(bs, '4.3.1'))), 5, `既知の脆弱性が報告されている古い Bootstrap ${bs || ''} を読み込んでいます`);

  // 公開 HTML に出てしまった秘密鍵 (値は結果に出さない)
  const secret = /sk_live_[0-9a-zA-Z]{16,}/.test(html) || /\bAKIA[0-9A-Z]{16}\b/.test(html) || /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(html);
  s.check(secret, 30, '公開されている HTML に、秘密鍵とみられる文字列が含まれています (すぐに無効化と再発行が必要です)');

  return s.result('外から見える設定の範囲では、大きな問題は見つかりませんでした');
}

// ---------- 表示速度 (簡易) ----------
// ctx: { headers, ms (HTML を受け取り終わるまでの時間), bytes (HTML の大きさ) }
function analyzeSpeed(html, ctx) {
  const s = scorer();
  const h = ctx.headers || {};
  const ms = ctx.ms || 0;
  const sec = (ms / 1000).toFixed(1);
  s.tier([
    [ms > 3000, 30, `サーバーの応答が遅い (HTML の取得に ${sec} 秒)`],
    [ms > 1800, 18, `サーバーの応答がやや遅い (HTML の取得に ${sec} 秒)`],
    [ms > 800, 8, `サーバーの応答に ${sec} 秒かかっています (目安 0.8 秒以内)`],
  ]);
  const kb = Math.round((ctx.bytes || 0) / 1024);
  s.tier([
    [kb >= 580, 14, `HTML が非常に大きい (${kb}KB 以上)`],
    [kb > 300, 7, `HTML が大きい (${kb}KB)`],
  ]);
  s.check(kb > 20 && !/(gzip|br|zstd|deflate)/i.test(h['content-encoding'] || ''), 10, 'HTML が圧縮されずに送られています (gzip / Brotli)');

  const body = stripNonContent(html);
  const head = String(html).split(/<\/head>/i)[0] || '';
  const blocking = tags(head, 'script').filter((t) => attr(t, 'src') && attr(t, 'async') == null && attr(t, 'defer') == null && !/module/i.test(attr(t, 'type') || '')).length;
  s.check(blocking > 2, 8, `head 内に、描画を止めるスクリプトが ${blocking} 件あります (async / defer の指定なし)`);
  const scripts = tags(html, 'script').filter((t) => attr(t, 'src')).length;
  s.check(scripts > 25, 6, `読み込むスクリプトが多い (${scripts} 件)`);
  const css = tags(html, 'link').filter((t) => /stylesheet/i.test(attr(t, 'rel') || '')).length;
  s.check(css > 8, 4, `読み込む CSS ファイルが多い (${css} 件)`);

  const imgs = tags(body, 'img');
  if (imgs.length >= 6) {
    const lazy = imgs.filter((t) => /lazy/i.test(attr(t, 'loading') || '') || attr(t, 'data-src') != null).length;
    s.check(lazy / imgs.length < 0.3, 6, `画像の遅延読み込みがほとんど使われていません (${imgs.length} 枚中 ${lazy} 枚)`);
    const sized = imgs.filter((t) => attr(t, 'width') != null && attr(t, 'height') != null).length;
    s.check(sized / imgs.length < 0.5, 5, `幅と高さの指定が無い画像が多く、読み込み中に画面がずれます (${imgs.length} 枚中 ${imgs.length - sized} 枚)`);
    const modern = /\.(webp|avif)\b/i.test(body) || /image\/(webp|avif)/i.test(body);
    s.check(!modern, 5, '軽い画像形式 (WebP / AVIF) が使われていません');
  }

  return s.result('応答時間と読み込み方に、大きな問題は見つかりませんでした');
}

// ---------- 総合 ----------
// 見る項目の最大数 (https・Cookie あり・画像 6 枚以上・記事ページ・リンクありのとき)。テストで実際の数と突き合わせている。
const MAX_CHECKS = 58;
const WEIGHTS = { technicalSEO: 0.22, onPageSEO: 0.20, security: 0.18, speed: 0.12, aiVisibility: 0.16, brokenLinks: 0.12 };
const CATEGORY_META = {
  technicalSEO: { label: 'Technical SEO', jp: 'テクニカルSEO', icon: '🔧' },
  onPageSEO: { label: 'On-Page SEO', jp: 'オンページSEO', icon: '📝' },
  security: { label: 'Security', jp: 'セキュリティ (外形)', icon: '🛡' },
  speed: { label: 'Speed', jp: '表示速度 (簡易)', icon: '⚡' },
  aiVisibility: { label: 'AI Visibility', jp: 'AI可視性', icon: '🤖' },
  brokenLinks: { label: 'Broken Links', jp: 'リンク切れ', icon: '🔗' },
};

function rankOf(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return '要改善';
}

// parts: { technicalSEO, onPageSEO, security, speed, aiVisibility, brokenLinks } (各 analyze の戻り値)
function buildReport(parts) {
  const categories = {};
  let overall = 0;
  let checks = 0;
  for (const k of Object.keys(WEIGHTS)) {
    categories[k] = { ...CATEGORY_META[k], ...parts[k] };
    overall += parts[k].score * WEIGHTS[k];
    checks += parts[k].checked || 0;
  }
  const score = clamp(overall);
  const weakest = Object.values(categories).sort((a, b) => a.score - b.score)[0];
  const summary = score >= 75
    ? `全体的に良好です。さらに伸ばすなら「${weakest.jp}」に改善の余地があります。`
    : `「${weakest.jp}」を中心に改善の余地があります。`;
  return { overall: { score, rank: rankOf(score), summary }, categories, checks };
}

module.exports = {
  clamp, decodeEntities, attr, tags, metaContent, linkHref, titleOf, visibleText,
  parseRobots, robotsBlocksAll, looksLikeHtml, baseHref, isArticleLike,
  analyzeOnPage, analyzeTechnical, analyzeAI, summarizeLinks, analyzeSecurity, analyzeSpeed,
  libVersions, versionLess, buildReport, rankOf, WEIGHTS, MAX_CHECKS, CATEGORY_META, AI_BOTS,
};
