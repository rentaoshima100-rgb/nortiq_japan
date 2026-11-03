#!/usr/bin/env node
// 無料ツール（dist/tools/**）と本体トップの見た目を画像にする。`node build.js` のあとに実行する。
//
//   node scripts/tools-shots.js [出力先フォルダ]   （既定: .tools-shots/ ※ git 管理外）
//
// 390 / 768 / 1280px で、各ツールの「入力前」と「結果画面」、/tools、本体トップ（ヘッダー開閉含む）を
// 縦長 1 枚ずつ撮り、見やすいように 1,400px ごとに分割した画像も出す。
// 数値の検査（tools-e2e.js）では拾えない「詰まり・重なり・切れ・読みにくさ」を、画像を開いて目で確かめるためのもの。
// 公開前は、出力された画像を全部開いて確認する（確認したことを docs の変更履歴に書く）。

function loadPlaywright() {
  const cands = [process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright', 'playwright'].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (_) { /* next */ } }
  throw new Error('playwright が見つからない');
}
const { chromium } = loadPlaywright();
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..'); const DIST = path.join(ROOT, 'dist');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '.tools-shots'));
const PORT = 5399 + Math.floor(Math.random() * 200);
const { FLOWS } = (() => { try { return require('./tools-flows'); } catch (_) { return { FLOWS: null }; } })();

// 結果画面までの操作は tools-e2e.js と同じものを使う（二重管理を避けるため、無ければ e2e から読む）
function flowsFromE2e() {
  const src = fs.readFileSync(path.join(__dirname, 'tools-e2e.js'), 'utf8');
  const m = src.match(/const FLOWS = \{[\s\S]*?\n\};/);
  if (!m) throw new Error('tools-e2e.js の FLOWS が読めない');
  return new Function(m[0] + '\nreturn FLOWS;')();
}
const flows = FLOWS || flowsFromE2e();

const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST') { res.writeHead(p === '/api/tool-rating' ? 204 : 200, { 'Content-Type': 'application/json' }); return res.end(p === '/api/tool-rating' ? '' : '{"ok":true,"id":"test"}'); }
  let f = path.join(DIST, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) f = path.join(DIST, 'index.html');
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.xml': 'text/xml' }[path.extname(f)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime }); fs.createReadStream(f).pipe(res);
}).listen(PORT);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const slugs = fs.readdirSync(path.join(ROOT, 'lp', 'tools'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const browser = await chromium.launch(); const base = `http://localhost:${PORT}`; const files = [];
  const shot = async (page, name) => { const f = path.join(OUT, name + '.png'); await page.screenshot({ path: f, fullPage: true }); files.push(f); };
  for (const vp of [{ n: 'm390', w: 390, h: 844, mobile: true }, { n: 't768', w: 768, h: 1024, mobile: true }, { n: 'd1280', w: 1280, h: 900, mobile: false }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile });
    const page = await ctx.newPage();
    // 本体トップ（ヘッダーの状態も）
    await page.goto(base + '/', { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${vp.n}-home-header.png`) });
    if (vp.w < 1025) { const b = await page.$('button[aria-label*="メニュー"]'); if (b) { await b.click(); await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, `${vp.n}-home-drawer.png`) }); } }
    await page.goto(base + '/tools', { waitUntil: 'networkidle' }); await page.waitForTimeout(300); await shot(page, `${vp.n}-tools-hub`);
    for (const slug of slugs) {
      await page.goto(base + '/tools/' + slug, { waitUntil: 'networkidle' }); await page.waitForTimeout(300);
      await shot(page, `${vp.n}-${slug}-1input`);
      if (!flows[slug]) continue;
      try { await flows[slug](page); await page.waitForSelector('#result:not([hidden]) .res-stat', { timeout: 8000 }); await page.waitForTimeout(400); } catch (_) { /* e2e が拾う */ }
      await shot(page, `${vp.n}-${slug}-2result`);
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  // 縦長の画像は 1,400px ごとに分割（Read で開いたときに潰れないように）
  let parts = 0;
  try {
    const { execFileSync } = require('child_process');
    const py = `
import sys, os
from PIL import Image
out = sys.argv[1]; n = 0
for f in sys.argv[2:]:
    im = Image.open(f); w, h = im.size
    if h <= 1500: continue
    base = os.path.basename(f)[:-4]; i = 0
    for y in range(0, h, 1400):
        im.crop((0, y, w, min(y + 1400, h))).save(os.path.join(out, 'parts', '%s-p%d.png' % (base, i))); i += 1; n += 1
print(n)`;
    fs.mkdirSync(path.join(OUT, 'parts'), { recursive: true });
    parts = Number(execFileSync('python3', ['-I', '-c', py, OUT, ...files]).toString().trim()) || 0;
  } catch (e) { console.log('  (分割はスキップ: ' + String(e.message).slice(0, 80) + ')'); }
  console.log(`tools-shots: ${files.length} 枚（分割 ${parts} 枚）→ ${OUT}`);
  console.log('  公開前に、このフォルダの画像を全部開いて目で確認する。');
})().catch((e) => { console.error('tools-shots FAIL', e); srv.close(); process.exit(1); });
