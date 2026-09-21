// prerender-check.js — staleness guard for the committed prerendered/ snapshots.
//
// Exits 1 if the prerendered output is missing or OLDER than the source content
// it was generated from (article markdown + page components + styles). Use in CI
// or pre-commit to catch "edited content but forgot to re-run build:full".
//
//   npm run prerender:check

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SKIP = new Set(['node_modules', 'dist', '.git', 'prerendered', 'outputs']);

function newest(dir, exts, recurse) {
  let t = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (recurse) t = Math.max(t, newest(p, exts, recurse)); }
    else if (exts.some((x) => e.name.endsWith(x))) t = Math.max(t, fs.statSync(p).mtimeMs);
  }
  return t;
}

const home = path.join(ROOT, 'prerendered', 'index.html');
if (!fs.existsSync(home)) {
  console.error('✗ prerendered/index.html not found. Run `npm run build:full` and commit prerendered/.');
  process.exit(1);
}
const prerenderedMtime = fs.statSync(home).mtimeMs;

// Sources whose changes require re-prerendering: article markdown + top-level
// page components (.jsx) + styles.css + data/*.json.
// data/ は次ページ提案 (nq) の文言・承認・カタログ。build.js が app.bundle.js の先頭と articles.js に
// 焼き込むので、承認や文言を変えるとスナップショットに入るデフォルトのカードも変わる。
const sourceNewest = Math.max(
  newest(path.join(ROOT, 'content', 'blog'), ['.md'], true),
  newest(ROOT, ['.jsx'], false),
  newest(ROOT, ['styles.css'], false),
  newest(path.join(ROOT, 'data'), ['.json'], true),
);

if (sourceNewest > prerenderedMtime) {
  console.error('✗ Source content is newer than prerendered/. Re-run `npm run build:full` and commit prerendered/.');
  process.exit(1);
}

// 次ページ提案 (nq) の状態がスナップショットに焼き込まれていないか。
// プリレンダ中のクライアントは何もしない取り決め (window.__NORTIQ_PRERENDER__) なので、入っているのは
// 常にデフォルトの文言 (data-variant は default。固定バーには属性が付かない) で、差し替え途中の
// is-swapping も付かない。ここが崩れると、特定の訪問者向けの文言や透明なままのカードが、
// クローラとJS無効環境に届くHTMLに固定される。
function nqBurnedIn(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { nqBurnedIn(p, acc); continue; }
    if (e.name !== 'index.html') continue;
    const html = fs.readFileSync(p, 'utf8');
    const hits = [];
    if (/class="nq-[^"]*\bis-swapping\b/.test(html)) hits.push('is-swapping');
    for (const m of html.matchAll(/data-variant="([^"]*)"/g)) {
      if (m[1] !== 'default') hits.push('data-variant="' + m[1] + '"');
    }
    if (hits.length) acc.push(path.relative(ROOT, p) + ': ' + hits.join(', '));
  }
  return acc;
}
const burned = nqBurnedIn(path.join(ROOT, 'prerendered'), []);
if (burned.length) {
  console.error('✗ prerendered/ に次ページ提案 (nq) の差し替え後の状態が入っています。nq-suggest.jsx の inert 判定を確認し、`npm run build:full` をやり直してください。');
  for (const line of burned.slice(0, 10)) console.error('  - ' + line);
  process.exit(1);
}
console.log('✓ prerendered/ is up to date with source content.');
