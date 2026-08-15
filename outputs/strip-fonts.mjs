// バンドル形式のショーケースから埋め込み woff2 を外す。
// 日本語ウェブフォントは1本あたり7〜20MBあり、バンドル全体の9割を占める。
// モーダルで開く用途では読み込みが終わらず「白いまま＝壊れて見える」ため、
// フォントは Google Fonts (非同期) に逃がし、届かない環境ではOS標準にフォールバックさせる。
//
// 使い方: node outputs/strip-fonts.mjs showcase/<name>/index.html ...
import fs from 'fs';

const GOOGLE = 'https://fonts.googleapis.com/css2'
  + '?family=Noto+Sans+JP:wght@400;500;700;900'
  + '&family=Zen+Kaku+Gothic+New:wght@400;500;700;900'
  + '&family=IBM+Plex+Sans+JP:wght@400;500;600;700'
  + '&family=Shippori+Mincho+B1:wght@400;500;600;700'
  + '&family=Inter:wght@400;500;600;700;900'
  + '&display=swap';
const LINK = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
  + `<link rel="stylesheet" href="${GOOGLE}" media="print" onload="this.media='all'">`;

for (const file of process.argv.slice(2)) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
  if (!m) { console.log(`${file}: バンドル形式ではありません (skip)`); continue; }

  const manifest = JSON.parse(m[1]);
  const before = Buffer.byteLength(html);
  let dropped = 0;
  for (const [key, entry] of Object.entries(manifest)) {
    if (!entry || !/font\//.test(entry.mime || '')) continue;
    delete manifest[key];   // 参照が解決できなくなり @font-face は無視される (= フォールバック)
    dropped++;
  }

  let next = html.replace(m[1], JSON.stringify(manifest));
  if (!next.includes('fonts.googleapis.com/css2')) {
    next = next.replace(/<head([^>]*)>/i, `<head$1>${LINK}`);
  }
  fs.writeFileSync(file, next);
  console.log(`${file}: フォント${dropped}件を除去  ${(before / 1048576).toFixed(1)}MB → ${(Buffer.byteLength(next) / 1048576).toFixed(2)}MB`);
}
