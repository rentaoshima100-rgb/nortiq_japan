// Slice tall fullpage screenshots into readable chunks + make compressed embeds.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SRC = new URL('./review-shots/', import.meta.url).pathname;
const SLICES = path.join(SRC, 'slices');
const EMBED = path.join(SRC, 'embed');
fs.mkdirSync(SLICES, { recursive: true });
fs.mkdirSync(EMBED, { recursive: true });

const CHUNK = 3000;

for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith('.png'))) {
  const name = f.replace(/\.png$/, '');
  const img = sharp(path.join(SRC, f));
  const { width, height } = await img.metadata();

  // review slices (width 760)
  let n = 0;
  for (let top = 0; top < height; top += CHUNK) {
    const h = Math.min(CHUNK, height - top);
    if (h < 200) break;
    await sharp(path.join(SRC, f))
      .extract({ left: 0, top, width, height: h })
      .resize({ width: 760 })
      .webp({ quality: 72 })
      .toFile(path.join(SLICES, `${name}-${String(n).padStart(2, '0')}.webp`));
    n++;
  }

  // embed version (width 560, capped height for artifact size)
  await sharp(path.join(SRC, f))
    .resize({ width: 560 })
    .webp({ quality: 55 })
    .toFile(path.join(EMBED, `${name}.webp`));

  console.log(`${name}: ${width}x${height} -> ${n} slices`);
}
