#!/usr/bin/env node
// 無料ツール（lp/tools/**, assets/lp/tools/*.js, api/*.js）のセキュリティと SEO の検査。
//
//   node scripts/tools-check.js            → 不備があれば exit 1（push 前に必ず通す）
//   node scripts/tools-check.js --dist     → dist/tools/** の生成物（CSP・{{V}} 置換）も見る
//
// 「不備」は直さないと公開してはいけないもの、「注意」は直すべきだが止めないもの。
// 新しいツールを足したら: lp/tools/<slug>/index.html, assets/lp/tools/<slug>.js, api/tool-rating.js の TOOLS,
// lp/tools/index.html のハブ, components.jsx のメガメニュー・フッター, info-pages.jsx の /sitemap,
// data/catalog-pages.json — この検査は全部そろっているかも見る。

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIST = process.argv.includes('--dist');
const errors = [], warns = [];
const E = (f, m) => errors.push(`${f}: ${m}`);
const W = (f, m) => warns.push(`${f}: ${m}`);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function walk(dir, re, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, re, out); else if (re.test(e.name)) out.push(p);
  }
  return out;
}

// ---------- 対象 ----------
const htmlFiles = walk(path.join(ROOT, 'lp', 'tools'), /\.html?$/i).map(rel);
const jsFiles = walk(path.join(ROOT, 'assets', 'lp', 'tools'), /\.js$/i).map(rel);
const apiFiles = ['api/contact.js', 'api/ocr-demo.js', 'api/tool-rating.js', 'api/diagnose.js'].filter(exists);
const toolSlugs = fs.readdirSync(path.join(ROOT, 'lp', 'tools'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);

const ALLOWED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'nortiqlab.com', 'www.nortiqlab.com', 'schema.org', 'lin.ee'];
const API_FETCH_HOSTS = ['api.anthropic.com', 'api.resend.com'];

// ---------- セキュリティ: HTML ----------
for (const f of htmlFiles) {
  const h = read(f);
  if (/\son[a-z]+\s*=\s*["']/i.test(h)) E(f, 'インライン属性のイベントハンドラ（onclick など）がある。JS ファイルで addEventListener にする');
  if (/javascript:/i.test(h)) E(f, 'javascript: URL がある');
  for (const m of h.matchAll(/<(script|link|img|iframe|form)\b[^>]*>/gi)) {
    const tag = m[0];
    if (/<iframe/i.test(tag)) E(f, 'iframe は使わない（CSP frame-src self）');
    for (const u of tag.matchAll(/(?:src|href|action)=["']([^"']+)["']/gi)) {
      const url = u[1];
      if (/^https?:\/\//i.test(url)) {
        const host = url.replace(/^https?:\/\//i, '').split('/')[0];
        if (/^http:\/\//i.test(url)) E(f, `http:// の参照: ${url}`);
        if (!ALLOWED_HOSTS.includes(host)) E(f, `許可していない外部ホスト: ${host}（${tag.slice(0, 40)}…）`);
      }
    }
    if (/<form/i.test(tag) && /action=["'](?!\/api\/|$)/i.test(tag)) E(f, 'form の action は /api/ 配下だけ');
  }
  for (const a of h.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
    if (!/rel=["'][^"']*noopener/i.test(a[0])) E(f, `target=_blank に rel="noopener" が無い: ${a[0].slice(0, 80)}`);
  }
  if (!/<meta charset=["']utf-8["']/i.test(h)) E(f, 'charset utf-8 が無い');
  if (!DIST && !/{{ANALYTICS}}/.test(h)) W(f, '{{ANALYTICS}} が無い（計測されない）');
  if (/<input[^>]*type=["']password["']/i.test(h)) E(f, 'パスワード欄は置かない');
  if (/(sk-ant-|re_[A-Za-z0-9]{20,}|eyJhbGci)/.test(h)) E(f, 'キーやトークンらしき文字列が埋まっている');
  // 「サーバーに送りません」と書いたページは、結果画面に描いた業務データがセッション録画（Clarity）に入らないよう、本文を伏せる属性を必須にする。
  // （Clarity は入力欄の中身は既定で伏せるが、結果として画面に描いた文字は伏せない。2026-11-05 に送信内容を復号して確認）
  if (/サーバーに(は)?送(りません|らない)/.test(h) && !/<main\b[^>]*\sdata-clarity-mask=["']true["']/i.test(h)) E(f, '「サーバーに送りません」と書いているのに <main> に data-clarity-mask="true" が無い（結果画面の内容がセッション録画に送られる）');
  // CSP は build.js が付ける。dist を見るときだけ確かめる
}

// ---------- セキュリティ: JS ----------
for (const f of jsFiles) {
  const s = read(f);
  if (/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/.test(s)) E(f, 'eval / new Function / document.write を使っている');
  if (/(sk-ant-|re_[A-Za-z0-9]{20,}|eyJhbGci)/.test(s)) E(f, 'キーやトークンらしき文字列が埋まっている');
  for (const m of s.matchAll(/fetch\(\s*['"]([^'"]+)['"]/g)) {
    if (!/^\/api\//.test(m[1])) E(f, `fetch 先は /api/ 配下だけ: ${m[1]}`);
  }
  if (/https?:\/\/(?!nortiqlab\.com|fonts\.|lin\.ee|schema\.org)[a-z0-9.-]+/i.test(s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) W(f, '外部 URL が埋まっている（CSP で止まる可能性。連絡先・LINE 以外は避ける）');
  // innerHTML に外から来る値（クエリ・入力・API 応答）を esc 無しで入れていないか（粗い検査）
  const lines = s.split('\n');
  lines.forEach((ln, i) => {
    if (!/innerHTML\s*[+]?=/.test(ln) && !/'\s*\+\s*/.test(ln)) return;
    const risky = /(location\.(search|hash|href)|params\.get\(|\.value\b|res\.|resp\.|data\.|x\.j\.|\bjson\b)/.test(ln);
    const inHtml = /innerHTML|<\w+/.test(ln) || /<\/?\w+[^>]*>/.test(ln);
    if (risky && inHtml && !/(T\.esc|esc)\(/.test(ln) && !/fmt\(/.test(ln)) W(f, `${i + 1}行目: 外部由来の値を esc() 無しで HTML に入れていないか確認`);
  });
  if (/localStorage\.setItem\([^)]*(mail|email|tel|phone|name|company)/i.test(s)) E(f, 'localStorage に連絡先を保存しない');
}

// ---------- セキュリティ: API ----------
for (const f of apiFiles) {
  const s = read(f);
  if (!/req\.method\s*!==?\s*['"]POST['"]/.test(s)) E(f, 'POST 以外を拒否していない');
  if (!/Cache-Control['"]?,\s*['"]no-store/.test(s)) E(f, "Cache-Control: no-store を付けていない");
  if (/console\.(log|error)\([^)]*(req\.body|body\.|email|image)/.test(s)) E(f, 'リクエスト本文や個人情報をログに出している');
  if (!/(MAX_BODY|MAX_BYTES|\.slice\(0,\s*\d+\)|\.length\s*>\s*\d+)/.test(s)) E(f, '入力の長さに上限が無い');
  for (const m of s.matchAll(/fetch\(\s*[`'"]https?:\/\/([a-z0-9.-]+)/gi)) {
    if (!API_FETCH_HOSTS.includes(m[1])) E(f, `許可していない外部 API: ${m[1]}`);
  }
  if (/process\.env\.[A-Z_]+/.test(s) && /res\.(status\(\d+\)\.)?json\([^)]*process\.env/.test(s)) E(f, '環境変数を応答に出している');
  if (/(sk-ant-|re_[A-Za-z0-9]{20,}|eyJhbGci)/.test(s)) E(f, 'キーやトークンが直書きされている');
  if (/child_process|execSync|spawn(Sync)?\(|fs\.readFile|fs\.writeFile|require\(['"]fs['"]\)/.test(s)) E(f, 'ファイル・プロセス操作を API に入れない');
}
// 評価 API の許可リストとツール一覧の整合
if (exists('api/tool-rating.js')) {
  const s = read('api/tool-rating.js');
  const m = s.match(/const TOOLS = \[([^\]]*)\]/);
  const listed = m ? [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]) : [];
  for (const slug of toolSlugs) if (!listed.includes(slug)) E('api/tool-rating.js', `TOOLS に '${slug}' が無い（評価が記録されない）`);
}

// ---------- 導線（サイトから飛べるか） ----------
const hub = exists('lp/tools/index.html') ? read('lp/tools/index.html') : '';
const comp = exists('components.jsx') ? read('components.jsx') : '';
const info = exists('info-pages.jsx') ? read('info-pages.jsx') : '';
const catalog = exists('data/catalog-pages.json') ? read('data/catalog-pages.json') : '';
for (const slug of toolSlugs) {
  const url = `/tools/${slug}`;
  if (!hub.includes(`href="${url}"`)) E('lp/tools/index.html', `ハブに ${url} へのカードが無い`);
  if (!catalog.includes(`"url": "${url}"`)) E('data/catalog-pages.json', `${url} の台帳が無い`);
  if (!exists(`assets/lp/tools/${slug}.js`)) E(`assets/lp/tools/${slug}.js`, 'ツールの JS が無い');
}
if (!comp.includes("href: '/tools'")) E('components.jsx', 'メガメニューに /tools が無い');
if (!comp.includes('href="/tools"')) E('components.jsx', 'フッターに /tools が無い');
if (!info.includes("href: '/tools'")) E('info-pages.jsx', '/sitemap に /tools が無い');

// ---------- SEO ----------
const titles = new Map();
for (const f of htmlFiles) {
  const h = read(f);
  const slug = f.replace(/^lp\/tools\/?/, '').replace(/\/?index\.html$/, '');
  const url = slug ? `/tools/${slug}` : '/tools';
  const title = (h.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const desc = (h.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '';
  const canon = (h.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1] || '';
  const h1s = (h.match(/<h1\b/gi) || []).length;
  if (!title) E(f, 'title が無い'); else {
    const t = title.replace(/｜Nortiq Labs$/, '');
    if (t.length < 20 || t.length > 60) W(f, `title が ${t.length} 字（20〜60 字が目安）`);
    if (titles.has(title)) E(f, `title が ${titles.get(title)} と重複`); titles.set(title, f);
  }
  if (!desc) E(f, 'description が無い'); else if (desc.length < 70 || desc.length > 160) W(f, `description が ${desc.length} 字（70〜160 字が目安）`);
  if (canon !== `https://nortiqlab.com${url}`) E(f, `canonical が URL と違う: ${canon}`);
  if (h1s !== 1) E(f, `h1 が ${h1s} 個（1個にする）`);
  if (!/<meta name="robots" content="index/i.test(h)) E(f, 'robots が index でない');
  if (!/<html lang="ja">/i.test(h)) E(f, 'html lang="ja" が無い');
  if (!/<meta name="viewport"/i.test(h)) E(f, 'viewport が無い');
  for (const k of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card']) if (!h.includes(`"${k}"`)) E(f, `${k} が無い`);
  const og = (h.match(/<meta property="og:image" content="([^"]*)"/i) || [])[1] || '';
  if (og) { const p = og.replace('https://nortiqlab.com', ''); if (!exists(p.replace(/^\//, ''))) E(f, `og:image のファイルが無い: ${p}`); }
  for (const img of h.matchAll(/<img\b[^>]*>/gi)) { if (!/\salt=/.test(img[0])) E(f, `alt の無い img: ${img[0].slice(0, 60)}`); if (!/\swidth=/.test(img[0]) || !/\sheight=/.test(img[0])) W(f, `width/height の無い img: ${img[0].slice(0, 60)}`); }
  const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (!ld.length) E(f, 'JSON-LD が無い');
  for (const m of ld) {
    try {
      const j = JSON.parse(m[1]);
      const types = JSON.stringify(j);
      for (const t of ['WebPage', 'BreadcrumbList', 'Organization']) if (!types.includes(`"@type":"${t}"`)) E(f, `JSON-LD に ${t} が無い`);
      if (slug && !types.includes('"@type":"SoftwareApplication"')) W(f, 'JSON-LD に SoftwareApplication が無い（ツールページには付ける）');
      if (slug && !types.includes('"@type":"FAQPage"')) W(f, 'FAQPage が無い（3問以上のFAQを付けると検索での説明が増える）');
      if (slug && !/<div class="faq">/.test(h)) W(f, 'ページ本文に FAQ が無い（JSON-LD と本文は一致させる）');
    } catch (e) { E(f, `JSON-LD が壊れている: ${e.message}`); }
  }
  // 内部リンク: ハブへ、他のツールへ最低2つ、本体サービスへ1つ
  const links = [...h.matchAll(/href="(\/[^"#?]*)"/g)].map((x) => x[1]);
  if (slug) {
    if (!links.includes('/tools')) E(f, '/tools（ハブ）へのリンクが無い');
    const others = toolSlugs.filter((s2) => s2 !== slug && links.includes(`/tools/${s2}`));
    const inJs = exists(`assets/lp/tools/${slug}.js`) ? read(`assets/lp/tools/${slug}.js`) : '';
    const othersJs = toolSlugs.filter((s2) => s2 !== slug && inJs.includes(`/tools/${s2}`));
    if (others.length + othersJs.length < 1) W(f, '他のツールへの導線が無い（結果画面から2つ以上）');
    if (!links.some((l) => /^\/(dx|web|chatbot|automation|support|pricing|works)$/.test(l)) && !/\/(dx|web|chatbot|automation|works)['"]/.test(inJs)) W(f, '本体のサービスページへのリンクが無い');
  }
  const text = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, '');
  if (text.length < 600) W(f, `本文が ${text.length} 字と少ない（JS で描く部分は検索に出にくい。見出し・説明・FAQ を HTML に書く）`);
  if (!/<h2\b/i.test(h)) W(f, 'h2 が無い');
}

// ---------- dist（生成物） ----------
if (DIST) {
  for (const f of walk(path.join(ROOT, 'dist', 'tools'), /\.html$/i).map(rel)) {
    const h = read(f);
    if (!/http-equiv="Content-Security-Policy"/.test(h)) E(f, 'CSP が付いていない');
    if (/{{(V|ANALYTICS)}}/.test(h)) E(f, 'プレースホルダが置換されていない');
    if (/<script src="[^"]*\?v=[a-f0-9]{10}"/.test(h) === false) W(f, 'JS に ?v= が付いていない');
  }
  if (exists('dist/sitemap.xml')) {
    const sm = read('dist/sitemap.xml');
    for (const slug of toolSlugs) if (!sm.includes(`/tools/${slug}<`)) E('dist/sitemap.xml', `/tools/${slug} が無い`);
  }
}

// ---------- 出力 ----------
console.log(`tools-check: ${htmlFiles.length} HTML / ${jsFiles.length} JS / ${apiFiles.length} API / ${toolSlugs.length} tools`);
for (const w of warns) console.log('  ! 注意 ' + w);
for (const e of errors) console.log('  ✗ 不備 ' + e);
console.log(`  → 不備 ${errors.length} 件 / 注意 ${warns.length} 件`);
process.exit(errors.length ? 1 : 0);
