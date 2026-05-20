// Render every page of the design-proposal PDF to a PNG in assets/pdf/.
// Run with: node render-pdf.mjs
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createCanvas } from 'canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// pdfjs-dist v3 has a stable Node renderer (CJS).
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

const SRC = path.join(__dirname, 'uploads', 'AIブログ投稿アプリ.pdf');
const OUT = path.join(__dirname, 'assets', 'pdf');
const SCALE = 2;

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

await fs.mkdir(OUT, { recursive: true });

const data = new Uint8Array(await fs.readFile(SRC));
const cMapUrl = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'cmaps') + path.sep;
const standardFontDataUrl =
  path.join(__dirname, 'node_modules', 'pdfjs-dist', 'standard_fonts') + path.sep;

const doc = await pdfjs.getDocument({
  data,
  cMapUrl,
  cMapPacked: true,
  standardFontDataUrl,
  disableFontFace: true,
  useSystemFonts: false,
  canvasFactory: new NodeCanvasFactory(),
}).promise;

console.log(`PDF loaded: ${doc.numPages} pages`);

for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const viewport = page.getViewport({ scale: SCALE });
  const factory = new NodeCanvasFactory();
  const { canvas, context } = factory.create(viewport.width, viewport.height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, viewport.width, viewport.height);
  await page.render({ canvasContext: context, viewport, canvasFactory: factory }).promise;
  const outFile = path.join(OUT, `loop-ai-${String(p).padStart(2, '0')}.png`);
  await fs.writeFile(outFile, canvas.toBuffer('image/png'));
  const sizeKB = ((await fs.stat(outFile)).size / 1024).toFixed(0);
  console.log(`  page ${p} → ${path.basename(outFile)} (${sizeKB} KB)`);
}

console.log(`\n✓ rendered ${doc.numPages} pages → assets/pdf/`);
