// Build script: pre-compile JSX, minify, copy assets, emit dist/index.html
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const { minify } = require('terser');

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

  console.log('• copying styles.css');
  fs.copyFileSync(path.join(ROOT, 'styles.css'), path.join(DIST, 'styles.css'));

  console.log('• copying assets/');
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

  console.log('• emitting dist/index.html');
  // Production-mode React (smaller, faster) — no Babel runtime in the browser.
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nortiq Labs — 日本のDX、世界水準で巻き返す。</title>
  <meta name="description" content="米国の技術水準を、中小企業の武器に。Web制作からAI実装、業務効率化まで段階的に伴走するDXパートナー。">
  <link rel="icon" href="assets/nortiq-fav.png" type="image/png">
  <link rel="stylesheet" href="styles.css">
  <script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
</head>
<body>
  <div id="app"></div>
  <script src="app.bundle.js" defer></script>
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
