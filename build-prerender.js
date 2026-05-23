// build-prerender.js — post-build snapshot stage (run AFTER `node build.js`).
//
// Serves dist/ locally, opens each route in headless Chromium, waits until the
// app has rendered (per-route canonical is set), then writes the fully-rendered
// HTML to dist/<route>/index.html. Crawlers then receive real <body> content +
// per-route <head> without executing JS. The SPA still boots on the client
// (React re-renders into #app), so interactivity / routing / styles are unchanged.
//
// Relative asset URLs in the captured HTML are rewritten to absolute (/...), so
// prerendered files placed at sub-paths (dist/web/index.html) load assets
// correctly without needing <base href="/"> (which would alter href="#" anchors).

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const DIST = path.join(__dirname, 'dist');
const SITE = 'https://nortiqlab.com';

// --- Partial rollout control --------------------------------------------------
// Start with the homepage only. Set to [] to prerender every sitemap URL.
const ROUTES_ALLOWLIST = ['/'];

// ------------------------------------------------------------------------------
function routesFromSitemap() {
  const xml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return locs.map((u) => u.replace(SITE, '') || '/').map((p) => (p === '' ? '/' : p));
}

function routeToFile(route) {
  if (route === '/') return path.join(DIST, 'index.html');
  return path.join(DIST, route.replace(/^\//, ''), 'index.html');
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon',
};

// Local static server: serves real files from disk, and the ORIGINAL build shell
// (kept in memory) for any extensionless route so each render starts clean.
function startServer(shellHtml) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const ext = path.extname(urlPath);
      if (!ext || urlPath === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(shellHtml);
        return;
      }
      fs.readFile(path.join(DIST, urlPath), (err, buf) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    server.on('error', reject);
    // Port 0 → OS assigns a free port (avoids conflicts with leftover servers).
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// Rewrite relative asset URLs to root-absolute so they resolve from any sub-path.
function toAbsolutePaths(html) {
  return html
    .replace(/(\s(?:src|href|srcset)=")(assets\/)/g, '$1/$2')
    .replace(/(\s(?:src|href)=")(app\.bundle\.js|articles\.js|styles\.css)/g, '$1/$2');
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('  ! dist/index.html not found — run `node build.js` first.');
    process.exit(1);
  }
  const shellHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const allRoutes = ROUTES_ALLOWLIST.length ? ROUTES_ALLOWLIST : routesFromSitemap();

  const { server, port } = await startServer(shellHtml);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });

  let ok = 0;
  for (const route of allRoutes) {
    const url = `http://127.0.0.1:${port}${route}`;
    const expectedCanonical = SITE + route;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForFunction(
        (exp) => {
          const c = document.querySelector('link[rel="canonical"]');
          return c && c.getAttribute('href') === exp;
        },
        expectedCanonical,
        { timeout: 15000 },
      ).catch(() => {});
      // Reveal fade-in elements so the snapshot is visible even before JS runs.
      await page.evaluate(() => {
        document.querySelectorAll('.fadein, .fadein-l, .fadein-r').forEach((el) => el.classList.add('is-in'));
      });
      await page.waitForTimeout(400);
      const html = '<!DOCTYPE html>\n' + await page.evaluate(() => document.documentElement.outerHTML);
      const out = toAbsolutePaths(html);
      const file = routeToFile(route);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, out, 'utf8');
      ok++;
      console.log(`  ✓ prerendered ${route} -> ${path.relative(DIST, file)} (${(out.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.warn(`  ! prerender failed ${route}: ${e.message}`);
    }
  }

  await browser.close();
  server.close();
  console.log(`• prerender complete: ${ok}/${allRoutes.length} routes`);
}

main();
