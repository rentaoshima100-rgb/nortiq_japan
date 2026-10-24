// Generate assets/banners/* from the delivered zip: keep the designer's WebP byte-exact,
// add narrower WebP variants for srcset, and a JPEG fallback for <img src>.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const SRC = process.argv[2];
const OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SRC).filter((f) => /\.png$/i.test(f));
(async () => {
  for (const f of files) {
    const base = f.replace(/\.png$/i, '');
    const png = fs.readFileSync(path.join(SRC, f));
    const meta = await sharp(png).metadata();
    // 1) designer webp, byte-exact
    fs.copyFileSync(path.join(SRC, base + '.webp'), path.join(OUT, base + '.webp'));
    // 2) narrower variants for srcset
    const variants = meta.width >= 2000 ? [1400] : (meta.width === meta.height ? [600] : (meta.width === 1080 ? [780] : []));
    for (const w of variants) {
      const buf = await sharp(png).resize({ width: w }).webp({ quality: 80 }).toBuffer();
      fs.writeFileSync(path.join(OUT, `${base}-${w}.webp`), buf);
    }
    // 3) JPEG fallback (same dimensions)
    const jpg = await sharp(png).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    fs.writeFileSync(path.join(OUT, base + '.jpg'), jpg);
    console.log(base, meta.width + 'x' + meta.height, 'webp', fs.statSync(path.join(OUT, base + '.webp')).size, 'jpg', jpg.length, variants.map((w) => w + ':' + fs.statSync(path.join(OUT, `${base}-${w}.webp`)).size).join(' '));
  }
})().catch((e) => { console.error(e); process.exit(1); });
