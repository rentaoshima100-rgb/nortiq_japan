// Build script: pre-compile JSX, minify, copy assets, emit dist/index.html
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { minify } = require('terser');
const { marked } = require('marked');

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

  console.log('• emitting dist/index.html');
  // Cache-busting version token — appended to local asset URLs so each deploy
  // forces browsers to fetch fresh files instead of serving a stale bundle.
  const ver = Date.now().toString(36);
  // Production-mode React (smaller, faster) — no Babel runtime in the browser.
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nortiq Labs — 日本のDX、世界水準で巻き返す。</title>
  <meta name="description" content="米国の技術水準を、中小企業の武器に。Web制作からAI実装、業務効率化まで段階的に伴走するDXパートナー。">
  <link rel="icon" href="assets/nortiq-fav.png" type="image/png">
  <link rel="stylesheet" href="styles.css?v=${ver}">
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

  console.log('\n✓ build complete → dist/');
}

build().catch((e) => {
  console.error('\n✗ build failed:', e.message);
  process.exit(1);
});
