// prerender-check.js — staleness guard for the committed prerendered/ snapshots.
//
// Exits 1 if the prerendered output is missing or OLDER than the source content
// it was generated from (article markdown + page components + styles), or if it
// carries next-page-suggestion (nq) state that must never be baked into static HTML.
//
// prerendered/ は CI (.github/workflows/prerender.yml) が main への push で再生成してコミットする。
// ローカルで再生成してコミットしない (docs/nq/implementation-contract.md 0章5)。
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
  console.error('✗ prerendered/index.html not found. main に push すると CI (prerender.yml) が生成します。ローカルで生成してコミットしないでください。');
  process.exit(1);
}
const prerenderedMtime = fs.statSync(home).mtimeMs;
let failed = false;

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

// 古いだけでは終わらせず、下の nq の検査まで進む (未承認の焼き込みは、古さとは別に必ず知らせたい)。
if (sourceNewest > prerenderedMtime) {
  console.error('✗ Source content is newer than prerendered/. main に push すると CI (prerender.yml) が再生成します。ローカルで再生成してコミットしないでください。');
  failed = true;
}

// 配信してよい「block_id + variant」の組。条件は api/_lib/data.js の deliverable() をそのまま使う
// (build.js の nqDeliveredBlocks と同じ条件。承認はブロック / by_industry の業種 / variant の3階層にあるので、
// ブロック単位の承認だけを見ても足りない)。スナップショットの属性に業種は出ないので、
// 業種版はどれか1つで配信できれば可とする。
function nqDeliverablePairs() {
  const data = require('./api/_lib/data.js');
  const pairs = new Set();
  for (const b of data.blocks) {
    if (!b || typeof b !== 'object' || typeof b.block_id !== 'string') continue;
    for (const name of Object.keys(b.variants || {})) {
      if (data.deliverable(b, name)) pairs.add(b.block_id + ' ' + name);
    }
    for (const label of Object.keys(b.by_industry || {})) {
      const entry = b.by_industry[label];
      for (const name of Object.keys((entry && entry.variants) || {})) {
        if (data.deliverable(b, name, label)) pairs.add(b.block_id + ' ' + name);
      }
    }
  }
  return pairs;
}

// 次ページ提案 (nq) の状態がスナップショットに焼き込まれていないか。
// プリレンダ中のクライアントは何もしない取り決め (window.__NORTIQ_PRERENDER__) なので、入っているのは
// 常にデフォルトの文言 (data-variant は default。固定バーには属性が付かない) で、差し替え途中の
// is-swapping も付かない。ここが崩れると、特定の訪問者向けの文言や透明なままのカードが、
// クローラとJS無効環境に届くHTMLに固定される。
// 未承認の文言も同じ。NQ_INCLUDE_UNAPPROVED=1 の dist から撮ると未承認の default カードが入る
// (主防壁は build-prerender.js 冒頭のガード。ここは、すでに入ってしまったものを見つける側)。
function nqBurnedIn(dir, pairs, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { nqBurnedIn(p, pairs, acc); continue; }
    if (e.name !== 'index.html') continue;
    const html = fs.readFileSync(p, 'utf8');
    const hits = [];
    if (/class="nq-[^"]*\bis-swapping\b/.test(html)) hits.push('is-swapping');
    for (const m of html.matchAll(/data-variant="([^"]*)"/g)) {
      if (m[1] !== 'default') hits.push('data-variant="' + m[1] + '"');
    }
    for (const m of html.matchAll(/<[a-z][^>]*\sdata-block="([^"]*)"[^>]*>/g)) {
      const v = / data-variant="([^"]*)"/.exec(m[0]);
      if (!pairs.has(m[1] + ' ' + (v ? v[1] : ''))) hits.push('未承認 data-block="' + m[1] + '"' + (v ? ' data-variant="' + v[1] + '"' : ''));
    }
    // 承認が1件も無ければ、スロットの枠そのものが出ていないはず (NqSlot は承認済みの default が無ければ null)。
    if (!pairs.size && /class="nq-slot"/.test(html)) hits.push('承認 0 件なのに class="nq-slot"');
    if (hits.length) acc.push(path.relative(ROOT, p) + ': ' + [...new Set(hits)].join(', '));
  }
  return acc;
}
const burned = nqBurnedIn(path.join(ROOT, 'prerendered'), nqDeliverablePairs(), []);
if (burned.length) {
  console.error('✗ prerendered/ に次ページ提案 (nq) の差し替え後の状態か、未承認の文言が入っています。このままコミットしないでください。');
  console.error('  差し替え後の状態 (is-swapping / default 以外の data-variant) なら nq-suggest.jsx の inert 判定を確認する。');
  console.error('  未承認の文言なら、NQ_INCLUDE_UNAPPROVED=1 の dist から撮っています。git checkout -- prerendered で戻し、再生成は CI (prerender.yml) に任せる。');
  for (const line of burned.slice(0, 10)) console.error('  - ' + line);
  if (burned.length > 10) console.error('  … ほか ' + (burned.length - 10) + ' ファイル');
  failed = true;
}
if (failed) process.exit(1);
console.log('✓ prerendered/ is up to date with source content.');
