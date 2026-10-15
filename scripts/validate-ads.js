#!/usr/bin/env node
// scripts/validate-ads.js — ads/rsa.csv と ads/mapping.csv の文字数を検証する。
//   見出し: 全角15字 / 説明文: 全角45字 / 表示パス: 半角15字 (全角7.5字) 以内。半角は 0.5 字として数える。
//   超過・空欄・固定位置の不備があれば一覧を表示して終了コード 1。
//   node scripts/validate-ads.js [ads/rsa.csv]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RSA = process.argv[2] || path.join(ROOT, 'ads', 'rsa.csv');
const MAP = path.join(ROOT, 'ads', 'mapping.csv');
const LIMIT = { headline: 15, description: 45, path: 7.5 };

// 半角 (ASCII・半角カナ) は 0.5、それ以外 (全角) は 1
function width(s) {
  let w = 0;
  for (const ch of String(s || '')) {
    const c = ch.codePointAt(0);
    w += (c <= 0x7e) || (c >= 0xff61 && c <= 0xff9f) ? 0.5 : 1;
  }
  return w;
}
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}
function table(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const head = rows[0];
  return rows.slice(1).map((r, i) => { const o = { _line: i + 2 }; head.forEach((h, j) => { o[h] = r[j] == null ? '' : r[j]; }); return o; });
}

const problems = [];
const bad = (file, line, what, text, w, limit) => problems.push(`${path.basename(file)}:${line} ${what} ${w}字 > ${limit}字 「${text}」`);

// ---- rsa.csv ----
const ads = table(RSA);
const seen = new Set();
for (const ad of ads) {
  const id = `${ad['Campaign']} / ${ad['Ad group']}`;
  if (seen.has(id)) problems.push(`${path.basename(RSA)}:${ad._line} 広告グループが重複しています ${id}`);
  seen.add(id);
  if (!/^https:\/\//.test(ad['Final URL'] || '')) problems.push(`${path.basename(RSA)}:${ad._line} Final URL が https ではありません`);
  let n = 0, pinned1 = 0;
  for (let i = 1; i <= 15; i++) {
    const h = ad[`Headline ${i}`] || '';
    if (!h) continue; n++;
    const w = width(h); if (w > LIMIT.headline) bad(RSA, ad._line, `見出し${i}`, h, w, LIMIT.headline);
    if ((ad[`Headline ${i} position`] || '') === '1') pinned1++;
  }
  if (n < 15) problems.push(`${path.basename(RSA)}:${ad._line} 見出しが ${n} 本です (15本入れる) ${id}`);
  if (pinned1 !== 2) problems.push(`${path.basename(RSA)}:${ad._line} 位置1に固定した見出しが ${pinned1} 本です (2本にする) ${id}`);
  let d = 0;
  for (let i = 1; i <= 4; i++) {
    const t = ad[`Description ${i}`] || '';
    if (!t) continue; d++;
    const w = width(t); if (w > LIMIT.description) bad(RSA, ad._line, `説明文${i}`, t, w, LIMIT.description);
  }
  if (d < 4) problems.push(`${path.basename(RSA)}:${ad._line} 説明文が ${d} 本です (4本入れる) ${id}`);
  for (const k of ['Path 1', 'Path 2']) {
    const t = ad[k] || ''; const w = width(t);
    if (w > LIMIT.path) bad(RSA, ad._line, k, t, w, LIMIT.path);
    if (/[\/?#\s]/.test(t)) problems.push(`${path.basename(RSA)}:${ad._line} ${k} に使えない文字があります 「${t}」`);
  }
  // 見出し・説明文の重複
  const hs = []; for (let i = 1; i <= 15; i++) if (ad[`Headline ${i}`]) hs.push(ad[`Headline ${i}`]);
  const dup = hs.filter((h, i) => hs.indexOf(h) !== i);
  if (dup.length) problems.push(`${path.basename(RSA)}:${ad._line} 見出しが重複しています 「${[...new Set(dup)].join('」「')}」`);
}

// ---- mapping.csv (あれば): 広告グループと最終URLが rsa.csv と一致するか ----
if (fs.existsSync(MAP)) {
  const map = table(MAP);
  const byGroup = new Map(ads.map((a) => [a['Ad group'], a]));
  for (const m of map) {
    const a = byGroup.get(m['ad_group']);
    if (!a) { problems.push(`${path.basename(MAP)}:${m._line} 広告グループ ${m['ad_group']} が rsa.csv にありません`); continue; }
    if (a['Final URL'] !== m['final_url']) problems.push(`${path.basename(MAP)}:${m._line} final_url が rsa.csv と違います (${m['final_url']} / ${a['Final URL']})`);
    for (const k of ['pinned_headline_1', 'pinned_headline_2']) {
      const t = m[k] || ''; const w = width(t);
      if (w > LIMIT.headline) bad(MAP, m._line, k, t, w, LIMIT.headline);
      const idx = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].find((i) => a[`Headline ${i}`] === t);
      if (!idx) problems.push(`${path.basename(MAP)}:${m._line} ${k} 「${t}」が rsa.csv の見出しにありません`);
      else if ((a[`Headline ${idx} position`] || '') !== '1') problems.push(`${path.basename(MAP)}:${m._line} ${k} 「${t}」が rsa.csv で位置1に固定されていません`);
    }
    if (!/^https:\/\/nortiqlab\.com\/lp\/(system|renewal)(\/[a-z-]+)?$/.test(m['final_url'] || '')) problems.push(`${path.basename(MAP)}:${m._line} final_url の形が想定外です ${m['final_url']}`);
  }
}

if (problems.length) {
  console.error(`validate-ads: ${problems.length} 件の不備`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`validate-ads: OK (${ads.length} 広告グループ、見出し ${ads.length * 15} 本・説明文 ${ads.length * 4} 本を検証)`);
