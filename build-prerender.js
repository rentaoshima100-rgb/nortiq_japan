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
// 記事は build.js の BLOG から自動で拾う (追加のたびにここへ書き足す必要をなくす)。
// 記事以外の固定ページは下のリストで管理する。
const ARTICLE_ROUTES = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'build.js'), 'utf8');
  const m = src.match(/const BLOG = \[([\s\S]*?)\n\];/);
  if (!m) return [];
  return [...m[1].matchAll(/slug: '([^']+)'/g)].map((x) => '/article-' + x[1]);
})();

const ROUTES_ALLOWLIST = [
  '/article-manufacturing-paperless-field-forms',
  '/article-website-renewal-baseline-metrics',
  '/article-non-functional-requirements-performance-guide',
  '/article-women-empowerment-act-disclosure-website',
  '/article-back-button-hijacking-spam-policy-guide',
  '/article-website-renewal-maintenance-structure-guide',
  '/article-site-migration-without-email-downtime',
  '/article-outsource-vs-inhouse-vs-package-comparison',
  '/article-system-development-source-code-copyright',
  '/article-core-system-data-integration-outsourcing',
  '/article-llmo-tool-japanese-support',
  '/article-review-structured-data-fake-review-policy',
  '/article-website-renewal-content-audit',
  '/article-construction-daily-report-outsourcing-requirements',
  '/article-ai-chatbot-acceptance-criteria',
  '/article-japan-ai-usage-rate-low',
  '/article-system-development-acceptance-criteria-contract',
  '/article-proposal-quote-contradiction-check',
  '/article-pos-integration-single-source-of-truth',
  '/article-disability-welfare-financial-report',
  '/article-website-renewal-site-reputation-policy',
  '/article-kaigo-productivity-committee-records',
  '/article-website-project-delay-causes',
  '/article-website-renewal-agency-handover',
  '/article-fax-order-entry-digitization',
  '/article-customer-reviews-stealth-marketing-rules',
  '/article-website-renewal-acceptance-checklist',
  '/article-supply-chain-security-assessment-scheme',
  '/article-womens-advancement-act-disclosure',
  '/article-website-renewal-unexpected-additional-cost',
  '/article-website-security-measures-new-business-impact',
  '/article-sme-generative-ai-adoption-rate-comparison',
  '/article-ai-development-outsourcing-design-review-guide',
  '/article-system-development-agile-contract-guide',
  '/article-system-development-fp-estimate-validity',
  '/article-competitive-quotes-subcontract-antitrust-law',
  '/article-system-development-outsourcing-contract-types',
  '/article-website-renewal-no-inhouse-staff',
  '/article-website-renewal-kpi-metrics',
  '/article-ai-review-requirements-document',
  '/article-ipa-security-guideline-smb',
  '/article-website-absence-risk-smb',
  '/article-ai-content-google-spam-update',
  '/article-image-data-structuring-model-selection',
  '/article-data-migration-record-count-scale',
  '/article-sme-cyber-attack-statistics',
  '/article-homepage-renewal-security-cost',
  '/article-pos-system-outsourcing-specification-checklist',
  '/article-homepage-security-measures-sme',
  '/article-cheap-homepage-pitfalls-checklist',
  '/article-system-outsourcing-rfp-requirements-guide',
  '/article-homepage-estimate-reading-guide',
  '/article-homepage-core-web-vitals-guide',
  '/article-llm-guardrail-monthly-cost-sme-guide',
  '/article-rfp-template-web-design',
  '/article-site-renewal-process-guide',
  '/article-llm-guardrail-inhouse-vs-cloud-api',
  '/article-llm-guardrail-bypass-cases',
  ...ARTICLE_ROUTES,
  '/article-internal-system-outsourcing-requirements-checklist',
  '/article-in-house-system-cloud-migration-cost-guide',
  '/article-homepage-renewal-failure-causes-sme',
  '/article-llm-guardrail-evaluation-metrics',
  '/article-ios17-nfc-felica-system-code-limit',
  '/article-llm-guardrail-evaluation-method',
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
  // /diagnosis は /diagnostic に301統合したため対象外
  // /quick-diagnosis は sitemap.xml に載せない noindex ページだが、プリレンダしないと
  // app.html (中身が空のSPAシェル) が 200 で返りソフト404になるため対象に含める
  '/quick-diagnosis',
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

// 未承認の文言が入った dist/ からはスナップショットを作らない。
// build.js は NQ_INCLUDE_UNAPPROVED=1 (ローカルの見た目確認) でビルドしたときだけ、bundle の1行目
// (window.NORTIQ_NQ=...;) に unapproved:true の印を入れる。prerendered/ はコミットされてそのまま本番の
// dist に重ねられ、build.js の Vercel / CI のガードを通らない。ここで止めないと、承認前の下書きが
// クローラと JS 無効環境に届く HTML に固定される。
// 環境変数ではなく bundle の印で判定すること。build.js は CI / Vercel ではこの変数を無視して承認済みだけを
// 入れるので、変数で止めると、変数が紛れ込んだだけで自動プリレンダが止まり、公開記事の静的HTMLが欠ける。
// 戻り値は、止める理由 (止めなくてよければ null)。
function nqRefuseReason() {
  const file = path.join(DIST, 'app.bundle.js');
  if (!fs.existsSync(file)) return 'dist/app.bundle.js がありません。先に node build.js を実行してください。';
  const src = fs.readFileSync(file, 'utf8');
  const nl = src.indexOf('\n');
  const line = (nl < 0 ? src : src.slice(0, nl)).trim();
  const head = 'window.NORTIQ_NQ=';
  let data = null;
  if (line.indexOf(head) === 0 && line.slice(-1) === ';') {
    try { data = JSON.parse(line.slice(head.length, -1)); } catch (_) { data = null; }
  }
  // 読めないときも止める。承認済みだけの dist だと確かめられないまま撮らないため
  // (build.js の bundle の1行目の形を変えたら、ここも合わせる)。
  if (!data || typeof data !== 'object') {
    return 'dist/app.bundle.js の1行目 (window.NORTIQ_NQ=...;) が読めず、承認済みだけの dist か確かめられません。node build.js をやり直してください。';
  }
  if (data.unapproved === true) {
    return '未承認の文言が入った dist/ (NQ_INCLUDE_UNAPPROVED=1 のビルド) からは prerendered/ を作れません。'
      + '変数を外して node build.js をやり直してください (PowerShell: Remove-Item Env:NQ_INCLUDE_UNAPPROVED)。';
  }
  return null;
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
  // サーバもブラウザも起こす前に確かめる (1枚も書かずに終わる)。
  const refuse = nqRefuseReason();
  if (refuse) {
    console.error('  ✗ ' + refuse);
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
  // CHROMIUM_PATH: ピン留めされた Playwright のブラウザが無い環境 (CI / リモート
  // セッション等) で、既存の Chromium 実行体を指定して再ダウンロードを避ける
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  // カウントアップ等の「途中経過が正解ではない」演出を止めるフラグ。
  // これが無いと、スナップショットを撮った瞬間の中途半端な数字 (0 や 17) が
  // 静的HTMLに焼き込まれ、JSを実行しないクローラがその値を読む。
  await page.addInitScript(() => { window.__NORTIQ_PRERENDER__ = true; });
  // プリレンダ中は Google のタグを読み込ませない。シェルには本番の GA4 タグが入っているので、
  // 止めないと約150ルートぶんの page_view が毎回 GA4 に入り、次ページ提案 (nq) の効果を比べる
  // ベースラインを汚す。gtag.js 自体を落とすので、アプリ側が積む dataLayer もどこにも送られない。
  // シェルの <script async src=".../gtag/js"> の要素は残る (通信だけ失敗する) ので、保存するHTMLは変わらない。
  await page.route(/^https?:[/][/]([^/]+[.])?(googletagmanager|google-analytics)[.]com[/]/, (route) => route.abort());

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
      // 記事ページは本文を /articles/<slug>.js から遅延読み込みするので、
      // 本文が入る前にスナップショットを撮らないよう明示的に待つ。
      if (route.indexOf('/article-') === 0) {
        await page.waitForFunction(
          () => {
            const el = document.querySelector('.article-body');
            return !!el && el.textContent.trim().length > 200;
          },
          undefined,
          { timeout: 15000 },
        ).catch(() => { console.warn('  ! 本文の読み込み待ちがタイムアウト: ' + route); });
      }
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
