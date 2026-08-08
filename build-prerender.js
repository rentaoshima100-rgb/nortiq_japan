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
const PRERENDERED = path.join(__dirname, 'prerendered');
const SITE = 'https://nortiqlab.com';

// --- Partial rollout control --------------------------------------------------
// Homepage + the 10 sub-pages whose <head> must carry page-specific meta in the
// INITIAL HTML (SNS crawlers don't run JS, so client-side meta isn't enough).
// Set to [] to prerender every sitemap URL.
const ROUTES_ALLOWLIST = [
  '/article-llm-guardrails-3-layer-architecture',
  '/article-ios-nfc-felica-detection-time-comparison',
  '/article-homepage-renewal-timing-guide',
  '/article-core-nfc-felica-system-code-limit',
  '/article-homepage-renewal-subsidy-guide',
  '/article-homepage-renewal-subsidy-cost-calculation',
  '/article-homepage-production-cost-sme',
  '/article-homepage-renewal-cost-guide',
  '/article-llm-overfitting-detection-prevention',
  '/article-ai-chatbot-industry-suitability',
  '/article-homepage-renewal-cost-by-industry',
  '/article-in-house-system-outsourcing-cost',
  '/article-it-subsidy-homepage-eligibility-guide',
  '/article-llm-guardrail-jailbreak-defense',
  '/article-cms-comparison-wordpress-small-business',
  '/article-ai-seo-article-quality-check',
  '/article-ios-nfc-felica-slow-fix',
  '/article-homepage-renewal-timing-checklist',
  '/article-system-development-outsourcing-cost-guide',
  '/article-homepage-renewal-case-study-by-industry',
  '/article-homepage-renewal-301-redirect-guide',
  '/',
  '/article-japan-dx',
  '/works-build',
  '/works-clinic',
  '/feature-analytics',
  '/feature-cms',
  '/feature-recruit',
  '/diagnostic',
  '/news',
  '/product-tennis',
  '/product-vetonet',
  // 5 existing top-level routes — meta lives in app.jsx (ROUTES / SEO_DESC /
  // SERVICE_LD); adding them here bakes that meta into the INITIAL HTML so
  // non-JS crawlers see per-page values instead of the homepage shell.
  '/web',
  '/chatbot',
  '/dx',
  '/works',
  '/voice',
  // --- Full route coverage (remaining nav/footer-linked routes) ---
  // Articles (BlogPosting; title/desc auto from article data)
  '/article-vetonet',
  '/article-wordpress-stall',
  '/article-core-web-vitals',
  '/article-clinic-web',
  '/article-ai-poc',
  '/article-realty-lp',
  '/article-claude-vs-gpt',
  // 2026 article series (10 new posts)
  '/article-website-launch-1month',
  '/article-aio-llmo-reality-check',
  '/article-multi-ai-parallel-productivity',
  '/article-ai-literacy-mindset-shift',
  // /article-local-business-geo-meo は google-business-profile-meo に統合し301 (2026-08-03)
  '/article-btob-web-marketing',
  '/article-office-work-automation',
  '/article-benchmark-competitor-success',
  // /article-seo-aio-dual-strategy は llmo-basics-for-smb に統合し301 (2026-08-03)
  '/article-how-to-choose-web-agency',
  // 2026 blog-bot pillar article
  '/article-blog-bot',
  // 2026 SMB series (10 new posts)
  '/article-web-production-cost-guide',
  '/article-website-renewal-guide',
  '/article-website-not-converting',
  '/article-llmo-basics-for-smb',
  '/article-google-business-profile-meo',
  '/article-listing-ads-cpc-roi',
  '/article-page-speed-conversion',
  '/article-ai-chatbot-introduction',
  '/article-smb-dx-first-step',
  '/article-subsidy-2026-digital-ai',
  // Works categories (CollectionPage + ItemList)
  '/works-realty',
  '/works-hr',
  '/works-retail',
  '/works-infra',
  '/works-ai',
  // Works LP / video variants (CollectionPage)
  '/works-lp-corp',
  '/works-lp-recruit',
  '/works-lp-ec',
  '/works-video',
  // Industry solutions (Service)
  '/solution-clinic',
  '/solution-realty',
  '/solution-build',
  '/solution-hr',
  '/solution-retail',
  // Feature / product
  '/feature-lpo',
  '/product-wpchat',
  // Company / content
  '/company',
  '/staff',
  '/recruit',
  '/support',
  '/pricing',
  '/column',
  '/guidebook',
  '/subsidy',
  '/diagnosis',
  // Legal (indexable, unique titles)
  '/privacy',
  '/terms',
  '/privacy-handling',
  // Utility (prerendered WITH noindex meta)
  '/sitemap',
];

// ------------------------------------------------------------------------------
function routesFromSitemap() {
  const xml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return locs.map((u) => u.replace(SITE, '') || '/').map((p) => (p === '' ? '/' : p));
}

// Output goes to the COMMITTED prerendered/ tree (Chromium can't run in the
// Vercel build container, so snapshots are generated locally and committed;
// build.js overlays them onto dist/ at deploy time).
function routeToFile(route) {
  if (route === '/') return path.join(PRERENDERED, 'index.html');
  return path.join(PRERENDERED, route.replace(/^\//, ''), 'index.html');
}

// Copy prerendered/ onto dist/ (skipping README) so the freshly generated
// snapshots are immediately testable in dist/ locally.
function overlayOntoDist(src, dest) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'README.md') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(d, { recursive: true }); overlayOntoDist(s, d); }
    else fs.copyFileSync(s, d);
  }
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
  // Use the CLEAN shell (app.html). build.js overlays the previous prerendered
  // home onto index.html, so index.html can carry stale head/JSON-LD; app.html
  // is always the fresh build output and is never overlaid.
  const shellPath = fs.existsSync(path.join(DIST, 'app.html'))
    ? path.join(DIST, 'app.html') : path.join(DIST, 'index.html');
  if (!fs.existsSync(shellPath)) {
    console.error('  ! dist shell not found — run `node build.js` first.');
    process.exit(1);
  }
  const shellHtml = fs.readFileSync(shellPath, 'utf8');
  let allRoutes = ROUTES_ALLOWLIST.length ? ROUTES_ALLOWLIST : routesFromSitemap();
  // PRERENDER_ONLY=/route-a,/route-b limits this run to a subset (re-snapshot a
  // few routes without re-rendering — and re-versioning — the whole committed set).
  const only = (process.env.PRERENDER_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (only.length) {
    allRoutes = allRoutes.filter((r) => only.includes(r));
    console.log(`• PRERENDER_ONLY: limited to ${allRoutes.length} route(s)`);
  }

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
  // Mirror fresh snapshots into dist/ for immediate local verification.
  overlayOntoDist(PRERENDERED, DIST);
  console.log(`• prerender complete: ${ok}/${allRoutes.length} routes (written to prerendered/ + mirrored to dist/)`);
}

main();
