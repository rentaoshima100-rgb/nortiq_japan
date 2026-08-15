// showcase/<name>/index.html が「バンドル形式」(__bundler/manifest に base64 の
// 画像・フォントを抱える単一HTML) のとき、画像を再エンコードして軽くする。
// PNG のスクリーンショット類が主因で、そのままだと1本10MB超になりモーダルが重い。
//
// 使い方: node outputs/optimize-showcase.mjs showcase/tokyohomes/index.html [...]
import fs from 'fs';
import zlib from 'zlib';
import sharp from 'sharp';

const MAX_W = 1920;
const files = process.argv.slice(2);
if (!files.length) { console.error('usage: optimize-showcase.mjs <index.html>...'); process.exit(1); }

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
  if (!m) { console.log(`${file}: バンドル形式ではありません (skip)`); continue; }

  const manifest = JSON.parse(m[1]);
  const before = Buffer.byteLength(html);
  let saved = 0, touched = 0;

  for (const [key, entry] of Object.entries(manifest)) {
    if (!entry || !/^image\/(png|jpe?g|webp)$/.test(entry.mime || '') || !entry.data) continue;
    let raw;
    try {
      raw = Buffer.from(entry.data, 'base64');
      if (entry.compressed) raw = zlib.gunzipSync(raw);
    } catch { continue; }
    let out;
    try {
      out = await sharp(raw).resize({ width: MAX_W, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
    } catch { continue; }
    if (out.length >= raw.length) continue;
    const encoded = (entry.compressed ? zlib.gzipSync(out) : out).toString('base64');
    saved += entry.data.length - encoded.length;
    entry.data = encoded;
    entry.mime = 'image/webp';
    touched++;
  }

  const next = html.replace(m[1], JSON.stringify(manifest));
  fs.writeFileSync(file, next);
  const after = Buffer.byteLength(next);
  console.log(`${file}: ${touched}枚を最適化  ${(before / 1048576).toFixed(1)}MB → ${(after / 1048576).toFixed(1)}MB`);
}
