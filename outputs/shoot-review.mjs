// Screenshot main pages for the page-by-page design review.
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = new URL('./review-shots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['top', '/'],
  ['web', '/web'],
  ['chatbot', '/chatbot'],
  ['dx', '/dx'],
  ['works', '/works'],
  ['voice', '/voice'],
  ['support', '/support'],
  ['pricing', '/pricing'],
  ['column', '/column'],
  ['company', '/company'],
  ['staff', '/staff'],
  ['subsidy', '/subsidy'],
  ['guidebook', '/guidebook'],
  ['diagnostic', '/diagnostic'],
  ['product-wpchat', '/product-wpchat'],
  ['product-vetonet', '/product-vetonet'],
  ['recruit', '/recruit'],
  ['article', '/article-homepage-renewal-failure-causes-sme'],
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

for (const [name, path] of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
  const url = 'http://localhost:5173' + path;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    // let fadein observers fire: scroll through the page, then back to top
    await page.evaluate(async () => {
      await new Promise((res) => {
        let y = 0;
        const step = () => {
          y += 900;
          window.scrollTo(0, y);
          if (y < document.body.scrollHeight) setTimeout(step, 120);
          else { window.scrollTo(0, 0); setTimeout(res, 400); }
        };
        step();
      });
    });
    await page.screenshot({ path: OUT + name + '.png', fullPage: true });
    const h = await page.evaluate(() => document.body.scrollHeight);
    console.log(`ok ${name} (${path}) height=${h}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
