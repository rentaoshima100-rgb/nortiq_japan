// prerender-check.js — staleness guard for the committed prerendered/ snapshots.
//
// Exits 1 if the prerendered output is missing or OLDER than the source content
// it was generated from (article markdown + page components + styles). Use in CI
// or pre-commit to catch "edited content but forgot to re-run build:full".
//
//   npm run prerender:check

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SKIP = new Set(['node_modules', 'dist', '.git', 'prerendered', 'outputs']);

function newest(dir, exts, recurse) {
  let t = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (recurse) t = Math.max(t, newest(p, exts, recurse)); }
    else if (exts.some((x) => e.name.endsWith(x))) t = Math.max(t, fs.statSync(p).mtimeMs);
  }
  return t;
}

const home = path.join(ROOT, 'prerendered', 'index.html');
if (!fs.existsSync(home)) {
  console.error('✗ prerendered/index.html not found. Run `npm run build:full` and commit prerendered/.');
  process.exit(1);
}
const prerenderedMtime = fs.statSync(home).mtimeMs;

// Sources whose changes require re-prerendering: article markdown + top-level
// page components (.jsx) + styles.css.
const sourceNewest = Math.max(
  newest(path.join(ROOT, 'content', 'blog'), ['.md'], true),
  newest(ROOT, ['.jsx'], false),
  newest(ROOT, ['styles.css'], false),
);

if (sourceNewest > prerenderedMtime) {
  console.error('✗ Source content is newer than prerendered/. Re-run `npm run build:full` and commit prerendered/.');
  process.exit(1);
}
console.log('✓ prerendered/ is up to date with source content.');
