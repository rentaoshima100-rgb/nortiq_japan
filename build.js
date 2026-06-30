// Build script: pre-compile JSX, minify, copy assets, emit dist/index.html
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { minify } = require('terser');
const { marked } = require('marked');
const sharp = require('sharp');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// JSX files in load order (matches the script tags in Nortiq Labs.html)
const JSX_FILES = [
  'tweaks-panel.jsx',
  'components.jsx',
  'top-page.jsx',
  'service-pages.jsx',
  'info-pages.jsx',
  'detail-pages.jsx',
  'extra-pages.jsx',
  'app.jsx',
];

// Blog articles — markdown source in content/blog/ + display metadata.
// Order = newest first (drives the column list).
const BLOG = [
  { slug: 'website-launch-1month',          category: 'Web制作',     date: '2026.06.27', read: '6 min', title: 'Webサイトを「最短1ヶ月」でローンチする — 速さと丁寧さは両立できる',            img: 'assets/blog-website-launch-1month.png' },
  { slug: 'aio-llmo-reality-check',         category: 'SEO',         date: '2026.06.23', read: '7 min', title: 'AIO・LLMO対策に踊らされる前に — 日本人はまだAI検索をほとんど使っていない',     img: 'assets/blog-aio-llmo-reality-check.png' },
  { slug: 'multi-ai-parallel-productivity', category: 'AI活用',      date: '2026.06.18', read: '6 min', title: 'AIは「複数同時に使う」から効率化できる — 毎日AIに触れる私たちだからわかること', img: 'assets/blog-multi-ai-parallel-productivity.png' },
  { slug: 'ai-literacy-mindset-shift',      category: 'AI活用',      date: '2026.06.13', read: '6 min', title: 'AIの使い方を教えるのは、想像以上に難しい — 必要なのは「思考の転換」',          img: 'assets/blog-ai-literacy-mindset-shift.png' },
  { slug: 'local-business-geo-meo',         category: 'SEO',         date: '2026.06.09', read: '6 min', title: 'ローカル店舗こそWeb集客を — 「口コミだけ」では、もう競争にならない',           img: 'assets/blog-local-business-geo-meo.png' },
  { slug: 'btob-web-marketing',             category: 'マーケティング', date: '2026.06.04', read: '6 min', title: 'Web集客はまだまだ熱い — 特にBtoBでは最も効率の良い武器',                       img: 'assets/blog-btob-web-marketing.png' },
  { slug: 'office-work-automation',         category: 'AI活用',      date: '2026.05.30', read: '6 min', title: 'AIを使わない＝無駄な労働 — 事務作業の多くは、もう自動化できる',                img: 'assets/blog-office-work-automation.png' },
  { slug: 'benchmark-competitor-success',   category: 'マーケティング', date: '2026.05.26', read: '6 min', title: 'うまくいっている施策を真似れば、Web集客はどんなサービスでも成功する',          img: 'assets/blog-benchmark-competitor-success.png' },
  { slug: 'seo-aio-dual-strategy',          category: 'SEO',         date: '2026.05.21', read: '7 min', title: 'SEOとAIO、両睨みのコンテンツ戦略 — どちらにも効く「共通の型」がある',          img: 'assets/blog-seo-aio-dual-strategy.png' },
  { slug: 'how-to-choose-web-agency',       category: 'Web制作',     date: '2026.05.16', read: '6 min', title: '制作会社の選び方 — 「安かろう悪かろう」の罠を避ける',                          img: 'assets/blog-how-to-choose-web-agency.png' },
  { slug: 'japan-dx',        category: 'DX 観察記', date: '2026.05.12', read: '8 min',  title: 'なぜ日本のDXはアメリカに2〜3年遅れているのか',          img: 'assets/blog-japan-dx.png' },
  { slug: 'vetonet',         category: '技術',       date: '2026.04.28', read: '12 min', title: 'VetoNet 開発の裏側 — AI agent security とは何か',        img: 'assets/blog-vetonet.png' },
  { slug: 'wordpress-stall', category: 'AI活用',     date: '2026.03.30', read: '7 min',  title: 'WordPress 更新が止まる本当の理由とその解決',            img: 'assets/blog-wordpress-stall.png' },
  { slug: 'core-web-vitals', category: '技術',       date: '2026.03.18', read: '10 min', title: 'Core Web Vitals の「Good」を現実的に取得する',           img: 'assets/blog-core-web-vitals.png' },
  { slug: 'clinic-web',      category: '業種別',     date: '2026.03.05', read: '8 min',  title: 'クリニックのWeb集客 2026年版 完全ガイド',                img: 'assets/blog-clinic-web.png' },
  { slug: 'ai-poc',          category: 'DX 観察記', date: '2026.02.22', read: '9 min',  title: 'PoCで終わるAI案件と、本実装まで進むAI案件の違い',        img: 'assets/blog-ai-poc.png' },
  { slug: 'realty-lp',       category: '業種別',     date: '2026.02.10', read: '6 min',  title: '不動産売却査定LPで反響を獲得する7つの必須要素',          img: 'assets/blog-realty-lp.png' },
  { slug: 'claude-vs-gpt',   category: 'AI活用',     date: '2026.01.28', read: '11 min', title: 'Claude vs GPT 業務利用 比較ドシエ',                       img: 'assets/blog-claude-vs-gpt.png' },
];

marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });

function buildArticles() {
  const out = {};
  for (const a of BLOG) {
    const mdPath = path.join(ROOT, 'content', 'blog', a.slug + '.md');
    if (!fs.existsSync(mdPath)) { console.warn(`  ! missing ${a.slug}.md`); continue; }
    let md = fs.readFileSync(mdPath, 'utf8');
    // Drop the leading H1 (we render title/meta from the manifest in the page header).
    // Tolerate CRLF line endings — on Windows checkouts (core.autocrlf=true) the
    // markdown is \r\n, and `.` doesn't match \r, so a plain \n+ would never match
    // and the H1 would leak into the body (duplicate heading).
    md = md.replace(/^\s*#\s+.+(?:\r?\n)+/, '');
    const html = marked.parse(md);
    out[a.slug] = { slug: a.slug, title: a.title, category: a.category, date: a.date, read: a.read, img: a.img, html };
  }
  return out;
}

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  // Empty the directory's contents instead of removing the directory itself —
  // on Windows the working directory may be locked while a static-file server
  // process holds an inode handle, but its children can usually still be deleted.
  if (fs.statSync(p).isDirectory()) {
    for (const entry of fs.readdirSync(p)) {
      const child = path.join(p, entry);
      try {
        fs.rmSync(child, { recursive: true, force: true });
      } catch {
        /* ignore — best effort */
      }
    }
  } else {
    fs.rmSync(p, { force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Small UI icons we never want to resize/recompress (kept pixel-perfect & tiny).
const ICON_SKIP = new Set(['nortiq-fav.png', 'nortiq-icon.png', 'nortiq-mark.png']);
const RASTER_EXT = new Set(['.png', '.jpg', '.jpeg']);

// Recursively collect raster image paths under dir, skipping the vendor/ JS folder.
function collectRasterImages(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'vendor') continue; // vendor/ holds JS, not images
      collectRasterImages(full, acc);
    } else if (RASTER_EXT.has(path.extname(entry.name).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

function rasterBytes(files) {
  let total = 0;
  for (const f of files) {
    try { total += fs.statSync(f).size; } catch { /* ignore */ }
  }
  return total;
}

function humanBytes(n) {
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + 'MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + 'KB';
  return n + 'B';
}

// Walk dist/assets, downscale oversized rasters to <=1600px wide, and re-encode
// PNG/JPEG in place — only keeping the result when it actually saves bytes.
async function optimizeImages(assetsDir) {
  if (!fs.existsSync(assetsDir)) return;
  const files = collectRasterImages(assetsDir);
  const before = rasterBytes(files);
  for (const file of files) {
    const base = path.basename(file);
    if (ICON_SKIP.has(base)) continue;
    const ext = path.extname(file).toLowerCase();
    try {
      // Read into a Buffer first — sharp can't reliably read & overwrite the
      // same path within one pipeline.
      const buffer = fs.readFileSync(file);
      const original = buffer.length;
      const meta = await sharp(buffer).metadata();
      const oversized = !!(meta.width && meta.width > 1600);
      const sized = (p) => (oversized ? p.resize({ width: 1600, withoutEnlargement: true }) : p);
      // Re-encode the same format in place (only when it saves bytes).
      let pipeline = sized(sharp(buffer));
      pipeline = ext === '.png'
        ? pipeline.png({ compressionLevel: 9, palette: true, quality: 80 })
        : pipeline.jpeg({ quality: 80, mozjpeg: true });
      const out = await pipeline.toBuffer();
      if (out.length < original) {
        fs.writeFileSync(file, out);
      }
      // Emit a WebP sibling for <picture> progressive enhancement.
      const webpBuf = await sized(sharp(buffer)).webp({ quality: 78 }).toBuffer();
      fs.writeFileSync(file.replace(/\.(png|jpe?g)$/i, '.webp'), webpBuf);
    } catch (e) {
      console.warn(`  ! image opt skipped ${path.relative(assetsDir, file)}: ${e.message}`);
    }
  }
  const after = rasterBytes(files);
  console.log(`  → image opt: ${humanBytes(before)} -> ${humanBytes(after)}`);
}

async function compileJsx(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const out = babel.transformSync(src, {
    filename: file,
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    babelrc: false,
    configFile: false,
    sourceType: 'script',
  });
  return out.code;
}

async function build() {
  console.log('• cleaning dist/');
  fs.mkdirSync(DIST, { recursive: true });
  rmrf(DIST);

  console.log('• compiling JSX → JS');
  const compiled = [];
  for (const f of JSX_FILES) {
    const code = await compileJsx(f);
    compiled.push({ file: f.replace(/\.jsx$/, '.js'), code, name: f });
    console.log(`  - ${f} → ${f.replace(/\.jsx$/, '.js')}`);
  }

  console.log('• bundling into single app.bundle.js');
  // Concatenate so we ship a single minified bundle instead of 8 separate files.
  // Each module is wrapped in an IIFE-equivalent block; since the originals were
  // already loaded as plain <script> tags at top level, we keep that semantic.
  const bundleSrc = compiled
    .map(({ name, code }) => `/* ===== ${name} ===== */\n${code}`)
    .join('\n\n');

  console.log('• minifying bundle');
  const minified = await minify(bundleSrc, {
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false },
  });
  if (minified.error) throw minified.error;

  fs.writeFileSync(path.join(DIST, 'app.bundle.js'), minified.code, 'utf8');
  const sizeKB = (Buffer.byteLength(minified.code, 'utf8') / 1024).toFixed(1);
  console.log(`  → dist/app.bundle.js (${sizeKB} KB)`);

  console.log('• rendering blog articles (markdown → html)');
  const articles = buildArticles();
  const articlesJs = 'window.NORTIQ_ARTICLES = ' + JSON.stringify(articles) + ';';
  fs.writeFileSync(path.join(DIST, 'articles.js'), articlesJs, 'utf8');
  // Also drop a copy at project root so the Babel dev HTML can load it.
  fs.writeFileSync(path.join(ROOT, 'articles.js'), articlesJs, 'utf8');
  console.log(`  → dist/articles.js (${Object.keys(articles).length} articles, ${(Buffer.byteLength(articlesJs, 'utf8') / 1024).toFixed(1)} KB)`);

  console.log('• copying styles.css');
  fs.copyFileSync(path.join(ROOT, 'styles.css'), path.join(DIST, 'styles.css'));

  console.log('• copying assets/');
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

  console.log('• optimizing dist/assets images');
  await optimizeImages(path.join(DIST, 'assets'));

  // Dedicated 1200x630 Open Graph / Twitter share image.
  try {
    await sharp(path.join(ROOT, 'assets', 'nortiq-hero-bg.png'))
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .png({ quality: 82 })
      .toFile(path.join(DIST, 'assets', 'og-image.png'));
  } catch (e) {
    console.warn('  ! og-image generation skipped: ' + e.message);
  }

  console.log('• emitting dist/index.html');
  // Cache-busting version token — appended to local asset URLs so each deploy
  // forces browsers to fetch fresh files instead of serving a stale bundle.
  const ver = Date.now().toString(36);
  const SITE = 'https://nortiqlab.com';
  const TITLE = 'Nortiq Labs — 日本のDX、世界水準で巻き返す。';
  const DESC = '米国の技術水準を、日本の中小企業の武器に。Web制作・AIチャットボット・DX/ML実装まで、20社の支援実績を持つ技術チームが段階的に伴走するDXパートナーです。';
  const OG_IMAGE = SITE + '/assets/og-image.png';

  // --- Analytics & conversion tracking ----------------------------------------
  // Paste your real IDs here, then rebuild. Until they are filled in, NO tag is
  // emitted — the build ships clean (no requests to a non-existent property, no
  // console noise). Format check is strict so a half-filled placeholder stays off.
  //   GA4_ID                Google Analytics 4 measurement ID   → "G-XXXXXXXXXX"
  //   GADS_ID               Google Ads conversion ID            → "AW-XXXXXXXXXX"
  //   GADS_LABEL_CONTACT    Ads conversion label — 問い合わせフォーム送信
  //   GADS_LABEL_DIAGNOSTIC Ads conversion label — 無料診断 CTA クリック
  const GA4_ID = 'G-EYTD1TWR7T';
  const GADS_ID = '';
  const GADS_LABEL_CONTACT = '';
  const GADS_LABEL_DIAGNOSTIC = '';
  const looksReal = (v, re) => typeof v === 'string' && re.test(v) && !/X{4,}/.test(v);
  const GA4_ON = looksReal(GA4_ID, /^G-[A-Z0-9]{6,}$/);
  const GADS_ON = looksReal(GADS_ID, /^AW-[0-9]{6,}$/);
  const sendTo = (label) => (GADS_ON && label && !/X{4,}/.test(label)) ? `'${GADS_ID}/${label}'` : 'null';
  const loaderId = GA4_ON ? GA4_ID : (GADS_ON ? GADS_ID : '');
  const analyticsHead = loaderId ? `
  <!-- Google tag (gtag.js) — GA4 + Google Ads conversion tracking -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${loaderId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());${GA4_ON ? `\n    gtag('config', '${GA4_ID}');` : ''}${GADS_ON ? `\n    gtag('config', '${GADS_ID}');` : ''}
    window.NORTIQ_CONV = { contact: ${sendTo(GADS_LABEL_CONTACT)}, diagnostic: ${sendTo(GADS_LABEL_DIAGNOSTIC)} };
  </script>` : `
  <!-- Analytics off: set GA4_ID / GADS_ID (+ conversion labels) in build.js to emit gtag.js. -->`;

  const FAQ_QA = [
    { q: 'Nortiq Labs はどんな会社ですか？', a: '米国 UC Berkeley での AI 研究背景を持つ代表のもと、日本の経営課題に向き合うメンバーで構成された技術チームです。Web制作・AIチャットボット・DX/ML 実装まで、中小企業のDXを段階的に支援します。これまで20社の制作・支援実績があります（2025年・京都設立）。' },
    { q: 'Web制作の費用はどれくらいですか？', a: 'オリジナルデザインのWeb制作は30万円から承っています。ページ数・機能・要件に応じてお見積もりし、公開後の運用・改善まで伴走します。' },
    { q: 'AIチャットボットは導入できますか？', a: 'はい。WordPress連携のAI投稿アシスタントをはじめ、問い合わせ対応やブログ更新を自動化するAIチャットボットの導入を、実装の中身まで説明しながら支援します。' },
    { q: '補助金は活用できますか？', a: 'IT導入補助金などの活用を視野に入れた DX 投資のご相談を承っています。なお、補助金申請の手続きサポート（登録 IT 導入支援事業者としての対応）は現在準備中です。' },
    { q: '対応している業種は？', a: 'クリニック・医療、不動産、建築・工務店、人材、小売/EC、インフラ・製造、AIスタートアップなど、7業種以上の制作・支援実績があります。' },
    { q: '制作後のサポートはありますか？', a: '公開して終わりにはせず、運用・改善まで継続して伴走します。お問い合わせには営業日24時間以内にご返信します。' },
    { q: '全国対応していますか？', a: 'はい。オンラインを中心に、全国のお客様に対応しています。' },
  ];
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': SITE + '/#org', name: 'Nortiq Labs', url: SITE + '/',
        logo: SITE + '/assets/nortiq-mark.png', image: OG_IMAGE, description: DESC,
        slogan: '日本のDX、世界水準で巻き返す。', foundingDate: '2025', numberOfEmployees: 5,
        address: { '@type': 'PostalAddress', addressCountry: 'JP', postalCode: '604-0012', addressRegion: '京都府', addressLocality: '京都市中京区', streetAddress: '竪大恩寺町751' },
        areaServed: { '@type': 'Country', name: 'Japan' },
        knowsAbout: ['Web制作', 'AIチャットボット', 'DX', '機械学習', 'SEO', 'LP制作 / LPO', '業務自動化', 'データ分析'],
        founder: { '@type': 'Person', name: 'Renta Oshima', jobTitle: 'Founder / Engineer', description: '米国 UC Berkeley で AI 研究。日本の中小企業向け DX 支援を起業。' },
      },
      { '@type': 'WebSite', '@id': SITE + '/#website', name: 'Nortiq Labs', url: SITE + '/', publisher: { '@id': SITE + '/#org' }, inLanguage: 'ja' },
      { '@type': 'ProfessionalService', name: 'Nortiq Labs', url: SITE + '/', description: DESC, areaServed: 'JP', serviceType: ['Web制作', 'AIチャットボット導入', 'DX・ML実装', '補助金活用のDX導入相談'], provider: { '@id': SITE + '/#org' } },
      { '@type': 'FAQPage', '@id': SITE + '/#faq', mainEntity: FAQ_QA.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
    ],
  }).replace(/</g, '\\u003c');
  // Production-mode React (smaller, faster) — no Babel runtime in the browser.
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${analyticsHead}
  <title>${TITLE}</title>
  <meta name="description" content="${DESC}">
  <link rel="canonical" href="${SITE}/">
  <link rel="icon" href="assets/nortiq-fav.png" type="image/png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Nortiq Labs">
  <meta property="og:title" content="${TITLE}">
  <meta property="og:description" content="${DESC}">
  <meta property="og:url" content="${SITE}/">
  <meta property="og:image" content="${OG_IMAGE}">
  <meta property="og:locale" content="ja_JP">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${TITLE}">
  <meta name="twitter:description" content="${DESC}">
  <meta name="twitter:image" content="${OG_IMAGE}">
  <link rel="stylesheet" href="styles.css?v=${ver}">
  <script type="application/ld+json">${jsonLd}</script>
  <script src="assets/vendor/react.production.min.js?v=${ver}"></script>
  <script src="assets/vendor/react-dom.production.min.js?v=${ver}"></script>
</head>
<body>
  <div id="app"></div>
  <script src="articles.js?v=${ver}" defer></script>
  <script src="app.bundle.js?v=${ver}" defer></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
  // Clean SPA shell kept as the rewrite fallback target, so routes that are NOT
  // pre-rendered don't inherit the (pre-rendered) home's body content. The
  // prerendered overlay below overwrites index.html but never app.html.
  // Strip the home canonical so non-prerendered routes don't appear to
  // canonicalize to "/" in raw HTML — the client adds the correct one per route.
  fs.writeFileSync(path.join(DIST, 'app.html'),
    html.replace(/\s*<link rel="canonical"[^>]*>/, ''), 'utf8');

  console.log('• emitting robots.txt + sitemap.xml');
  fs.writeFileSync(path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const SITEMAP_ROUTES = [
    'top', 'web', 'chatbot', 'dx', 'works', 'voice', 'support', 'pricing',
    'diagnosis', 'subsidy', 'guidebook', 'column', 'company', 'staff', 'recruit',
    'news', 'diagnostic', 'product-vetonet', 'product-wpchat', 'product-tennis',
    'feature-cms', 'feature-lpo', 'feature-recruit', 'feature-analytics',
    'works-clinic', 'works-realty', 'works-build', 'works-hr', 'works-retail',
    'works-infra', 'works-ai', 'solution-clinic', 'solution-realty',
    'solution-build', 'solution-hr', 'solution-retail',
    'works-lp-corp', 'works-lp-recruit', 'works-lp-ec', 'works-video',
    'privacy', 'terms',
    ...BLOG.map((b) => 'article-' + b.slug),
  ];
  const sitemapUrls = SITEMAP_ROUTES.map((id) => {
    const loc = id === 'top' ? `${SITE}/` : `${SITE}/${id}`;
    const priority = id === 'top' ? '1.0' : '0.8';
    return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
  }).join('\n');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + sitemapUrls + '\n'
    + `</urlset>\n`, 'utf8');

  console.log('• emitting 404.html');
  fs.writeFileSync(path.join(DIST, '404.html'), `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>ページが見つかりません (404) — Nortiq Labs</title>
<link rel="icon" href="/assets/nortiq-fav.png">
<link rel="stylesheet" href="/styles.css">
<style>
  .nf-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;font-family:'Noto Sans JP',system-ui,sans-serif;background:#fff;color:#1a1a1a}
  .nf-box{max-width:560px;text-align:center}
  .nf-code{font-size:64px;font-weight:800;letter-spacing:.05em;margin:0;color:hsl(354,92%,45%)}
  .nf-title{font-size:22px;font-weight:700;margin:12px 0 8px}
  .nf-lede{font-size:15px;line-height:1.8;color:#555;margin:0 0 28px}
  .nf-links{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .nf-links a{display:inline-block;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px}
  .nf-primary{background:hsl(354,92%,45%);color:#fff}
  .nf-ghost{border:1px solid #ddd;color:#1a1a1a}
</style>
</head>
<body>
<div class="nf-wrap"><div class="nf-box">
  <p class="nf-code">404</p>
  <h1 class="nf-title">お探しのページが見つかりませんでした</h1>
  <p class="nf-lede">URL が変更されたか、削除された可能性があります。下記からお探しの情報にお進みください。</p>
  <div class="nf-links">
    <a class="nf-primary" href="/">トップへ戻る</a>
    <a class="nf-ghost" href="/works">制作実績を見る</a>
    <a class="nf-ghost" href="/diagnostic">無料サイト診断</a>
  </div>
</div></div>
</body>
</html>
`, 'utf8');

  // Overlay committed pre-rendered route snapshots onto dist/ (if present).
  // Chromium can't run in the Vercel build container, so snapshots are generated
  // locally via `npm run build:full` and committed to prerendered/; here we just
  // copy them in. Skipped automatically when prerendered/ is absent → pure SPA.
  const PRERENDERED = path.join(ROOT, 'prerendered');
  if (fs.existsSync(PRERENDERED)) {
    let pages = 0;
    const overlay = (src, dest) => {
      for (const e of fs.readdirSync(src, { withFileTypes: true })) {
        if (e.name === 'README.md') continue;
        const s = path.join(src, e.name);
        const d = path.join(dest, e.name);
        if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); overlay(s, d); }
        else { fs.copyFileSync(s, d); if (e.name === 'index.html') pages++; }
      }
    };
    overlay(PRERENDERED, DIST);
    console.log(`• overlaid prerendered/ → dist/ (${pages} page(s))`);
  } else {
    console.log('• prerendered/ absent — serving pure SPA shell');
  }

  console.log('\n✓ build complete → dist/');
}

build().catch((e) => {
  console.error('\n✗ build failed:', e.message);
  process.exit(1);
});
