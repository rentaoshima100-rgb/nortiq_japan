#!/usr/bin/env node
// 無料ツール（dist/tools/**）の動作検査。`node build.js` のあとに実行する。
//
//   node scripts/tools-e2e.js
//
// dist/ をローカル HTTP で配信し、/api/contact・/api/ocr-demo・/api/tool-rating はダミー応答にして、
// 1280px と 390px で各ツールの結果画面まで操作する。確かめること:
//   - コンソールエラー 0、ページエラー 0、横スクロール無し
//   - 結果画面に評価ウィジェット（.rating）があり、★を押すと /api/tool-rating に届く
//   - 相談フォームを送ると「受け付け」の表示が出る
// 新しいツールを足したら FLOWS に「結果画面までの操作」を1つ足す（無いツールは不備にする）。
// Playwright は devDependencies に在る（require('playwright')）。

// Playwright は、ブラウザ入りで動く方を使う（この環境のグローバル → 無ければリポジトリの devDependency）。
function loadPlaywright() {
  const cands = [process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright', 'playwright'].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (_) { /* next */ } }
  throw new Error('playwright が見つからない');
}
const { chromium } = loadPlaywright();
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..'); const DIST = path.join(ROOT, 'dist');
const PORT = 5199 + Math.floor(Math.random() * 200);

// slug → 結果画面までの操作
const FLOWS = {
  'estimate': async (page) => { await page.click('#opt-cat-auto'); await page.click('#opt-scale-s'); await page.click('#opt-method-paper'); await page.click('#opt-integs-sales'); await page.click('#next'); await page.click('#opt-urg-q'); await page.click('#opt-bud-b30'); },
  'ai-fit': async (page) => { await page.click('#opts .opt:nth-child(1)'); await page.click('#opts .opt:nth-child(1)'); await page.click('#opts .opt:nth-child(3)'); await page.click('#next'); await page.click('#opts .opt:nth-child(2)'); await page.click('#opts .opt:nth-child(2)'); },
  'manual-cost': async () => {},
  'ai-risk': async (page) => { for (const g of await page.$$('.yn')) { await (await g.$('.opt')).click(); } await page.click('#run'); },
  'document-demo': async () => {},
};

const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && p === '/api/contact') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"ok":true,"id":"test"}'); }
  if (req.method === 'POST' && p === '/api/ocr-demo') { res.writeHead(503, { 'Content-Type': 'application/json' }); return res.end('{"error":"not_configured"}'); }
  if (req.method === 'POST' && p === '/api/tool-rating') { res.writeHead(204); return res.end(); }
  let f = path.join(DIST, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'text/xml' }[path.extname(f)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime }); fs.createReadStream(f).pipe(res);
}).listen(PORT);

(async () => {
  const slugs = fs.readdirSync(path.join(ROOT, 'lp', 'tools'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const browser = await chromium.launch(); const problems = []; const lines = [];
  for (const vp of [{ w: 1280, h: 900 }, { w: 390, h: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage(); const base = `http://localhost:${PORT}`;
    let errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
    page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 160)));
    const ratingHits = []; page.on('request', (r) => { if (r.url().endsWith('/api/tool-rating')) ratingHits.push(r.url()); });
    const over = async () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    await page.goto(base + '/tools'); if (await over()) problems.push(`[${vp.w}] /tools 横スクロール`);
    for (const slug of slugs) {
      errs = [];
      if (!FLOWS[slug]) { problems.push(`scripts/tools-e2e.js: FLOWS に '${slug}' が無い（結果画面までの操作を足す）`); continue; }
      await page.goto(base + '/tools/' + slug); await FLOWS[slug](page);
      try { await page.waitForSelector('#result:not([hidden]) .res-stat', { timeout: 8000 }); } catch { problems.push(`[${vp.w}] /tools/${slug}: 結果画面が出ない`); continue; }
      const big = ((await page.textContent('#result .res-stat .big')) || '').trim().replace(/\s+/g, ' ');
      if (await over()) problems.push(`[${vp.w}] /tools/${slug}: 横スクロール`);
      // 評価
      const before = ratingHits.length;
      const star = await page.$('#result .rating .star[data-s="5"]');
      if (!star) problems.push(`[${vp.w}] /tools/${slug}: 結果画面に評価ウィジェットが無い`);
      else { await star.click(); await page.waitForTimeout(300); if (ratingHits.length <= before) problems.push(`[${vp.w}] /tools/${slug}: ★を押しても /api/tool-rating に届かない`); }
      // 相談フォーム
      const mail = await page.$('#result [data-f="qmail"]');
      if (!mail) problems.push(`[${vp.w}] /tools/${slug}: 相談フォームが無い`);
      else {
        await mail.fill('test@example.com'); await page.click('#result [data-f="qform"] button[type=submit]');
        try { await page.waitForFunction(() => { const m = document.querySelector('#result [data-f="qmsg"]'); return m && m.textContent.includes('受け付け'); }, null, { timeout: 5000 }); }
        catch { problems.push(`[${vp.w}] /tools/${slug}: 送信後に「受け付け」が出ない`); }
      }
      if (errs.length) problems.push(`[${vp.w}] /tools/${slug}: console ${errs.join(' | ')}`);
      lines.push(`[${vp.w}] /tools/${slug}: ${big}`);
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  for (const l of lines) console.log('  ' + l);
  for (const p of problems) console.log('  ✗ ' + p);
  console.log(`tools-e2e: ${slugs.length} tools × 2 widths → 不備 ${problems.length} 件`);
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.error('tools-e2e FAIL', e); srv.close(); process.exit(1); });
