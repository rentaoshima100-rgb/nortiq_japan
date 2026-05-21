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
    md = md.replace(/^\s*#\s+.+\n+/, '');
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
      let pipeline = sharp(buffer);
      const meta = await pipeline.metadata();
      if (meta.width && meta.width > 1600) {
        pipeline = pipeline.resize({ width: 1600, withoutEnlargement: true });
      }
      if (ext === '.png') {
        pipeline = pipeline.png({ compressionLevel: 9, palette: true, quality: 80 });
      } else {
        pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
      }
      const out = await pipeline.toBuffer();
      if (out.length < original) {
        fs.writeFileSync(file, out);
      }
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

  console.log('• emitting dist/index.html');
  // Cache-busting version token — appended to local asset URLs so each deploy
  // forces browsers to fetch fresh files instead of serving a stale bundle.
  const ver = Date.now().toString(36);
  const SITE = 'https://nortiqlab.com';
  const TITLE = 'Nortiq Labs — 日本のDX、世界水準で巻き返す。';
  const DESC = '米国の技術水準を、日本の中小企業の武器に。Web制作・AIチャットボット・DX/ML実装まで、50社以上の支援実績を持つ技術チームが段階的に伴走するDXパートナーです。';
  const OG_IMAGE = SITE + '/assets/nortiq-hero-bg.png';
  const FAQ_QA = [
    { q: 'Nortiq Labs はどんな会社ですか？', a: '米国の技術背景を持つエンジニアと、日本の経営課題に向き合うメンバーで構成された技術チームです。Web制作・AIチャットボット・DX/ML 実装まで、中小企業のDXを段階的に支援します。これまで50社以上の制作・支援実績があります。' },
    { q: 'Web制作の費用はどれくらいですか？', a: 'オリジナルデザインのWeb制作は30万円から承っています。ページ数・機能・要件に応じてお見積もりし、公開後の運用・改善まで伴走します。' },
    { q: 'AIチャットボットは導入できますか？', a: 'はい。WordPress連携のAI投稿アシスタントをはじめ、問い合わせ対応やブログ更新を自動化するAIチャットボットの導入を、実装の中身まで説明しながら支援します。' },
    { q: 'IT導入補助金には対応していますか？', a: 'はい。最大450万円のIT導入補助金の申請サポートに対応しています。Web・AI・DX投資の補助金活用を一気通貫でご支援します。' },
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
        slogan: '日本のDX、世界水準で巻き返す。', foundingDate: '2024',
        areaServed: { '@type': 'Country', name: 'Japan' },
        knowsAbout: ['Web制作', 'AIチャットボット', 'DX', '機械学習', 'SEO', 'LP制作 / LPO', '業務自動化', 'データ分析'],
        founder: { '@type': 'Person', name: 'Renta Oshima', jobTitle: 'Founder / Engineer', description: '米国の大学で AI 研究。帰国後、日本の中小企業向け DX 支援を起業。' },
      },
      { '@type': 'WebSite', '@id': SITE + '/#website', name: 'Nortiq Labs', url: SITE + '/', publisher: { '@id': SITE + '/#org' }, inLanguage: 'ja' },
      { '@type': 'ProfessionalService', name: 'Nortiq Labs', url: SITE + '/', description: DESC, areaServed: 'JP', serviceType: ['Web制作', 'AIチャットボット導入', 'DX・ML実装', 'IT導入補助金 申請サポート'], provider: { '@id': SITE + '/#org' } },
      { '@type': 'FAQPage', '@id': SITE + '/#faq', mainEntity: FAQ_QA.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
    ],
  }).replace(/</g, '\\u003c');
  // Production-mode React (smaller, faster) — no Babel runtime in the browser.
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
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

  console.log('\n✓ build complete → dist/');
}

build().catch((e) => {
  console.error('\n✗ build failed:', e.message);
  process.exit(1);
});
