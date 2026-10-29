// 静的LPの納品画像 (JPEG/PNG) から、配信用の JPEG と WebP (srcset 用の縮小版つき) を作る。
//
//   node scripts/make-lp-images.js <入力dir> <出力dir> [--max 2400] [--widths 1400,780] [--quality 82]
//
// 出力 (入力 foo.jpg ごと):
//   foo.jpg          最大幅 max px の JPEG (フォールバック)
//   foo.webp         最大幅 max px の WebP
//   foo-<w>.webp     --widths の各幅の WebP (srcset 用)
// 出力先はパスに banners / figures を含むディレクトリにする (build.js の optimizeImages が触らない)。
// 文字入りの画像なので品質は 82 (既定)。元画像より大きくはしない。
//
// 例 (セキュリティLP、2026-10-28): node scripts/make-lp-images.js <zip展開dir>/images assets/lp/security/banners
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const [src, out] = args.filter((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--')));
if (!src || !out) { console.error('usage: node scripts/make-lp-images.js <in-dir> <out-dir> [--max 2400] [--widths 1400,780] [--quality 82]'); process.exit(1); }
const MAX = parseInt(opt('--max', '2400'), 10);
const WIDTHS = opt('--widths', '1400,780').split(',').map((s) => parseInt(s, 10)).filter(Boolean);
const Q = parseInt(opt('--quality', '82'), 10);

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const files = fs.readdirSync(src).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  let total = 0;
  for (const f of files) {
    const base = f.replace(/\.(jpe?g|png)$/i, '');
    const buf = fs.readFileSync(path.join(src, f));
    const meta = await sharp(buf).metadata();
    const w = Math.min(MAX, meta.width || MAX);
    const jpg = await sharp(buf).resize({ width: w, withoutEnlargement: true }).jpeg({ quality: Q, mozjpeg: true }).toBuffer();
    fs.writeFileSync(path.join(out, base + '.jpg'), jpg);
    const webp = await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: Q }).toBuffer();
    fs.writeFileSync(path.join(out, base + '.webp'), webp);
    const sizes = [`${w}: jpg ${(jpg.length / 1024).toFixed(0)}KB / webp ${(webp.length / 1024).toFixed(0)}KB`];
    total += jpg.length + webp.length;
    for (const sw of WIDTHS) {
      if (sw >= w) continue;
      const b = await sharp(buf).resize({ width: sw, withoutEnlargement: true }).webp({ quality: Q }).toBuffer();
      fs.writeFileSync(path.join(out, `${base}-${sw}.webp`), b);
      sizes.push(`${sw}: ${(b.length / 1024).toFixed(0)}KB`);
      total += b.length;
    }
    console.log(`${f} (${meta.width}x${meta.height}) → ${sizes.join(' | ')}`);
  }
  console.log(`done: ${files.length} file(s), ${(total / 1024 / 1024).toFixed(1)}MB → ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
