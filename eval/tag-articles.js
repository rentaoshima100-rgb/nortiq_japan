#!/usr/bin/env node
// 次ページ提案（nq）— 記事の audience（対象読者）を Jev の Choice で一括付与する（docs/nq/decisions-2026-09-21.md 3章）。
//
//   node eval/tag-articles.js [--only-missing | --all] [--dry-run] [--slugs a,b] [--limit N] [--timeout-ms 8000]
//
// 記事ごとに、build.js の BLOG の title・desc と content/blog/<slug>.md の本文の冒頭 約800字を state にし、
// data/nq-labels.json の article_audience の3ラベル（発注側向け／制作側・技術者向け／求職者向け）で Choice を1問だけ聞く。
// 結果は data/catalog-articles.json の overrides[slug] に audience と audience_confidence（小数2桁）をマージして書く
// （他のフィールドは保持。整形も既存のファイルに合わせる）。確信度 0.6 未満は _review: true を付け、人が本文を読んで確かめる
// （確かめた結果は docs/nq/article-audience-review.md に記録し、直した行から _review を外す）。
//
//   --only-missing  既定。overrides[slug].audience が無い記事だけ（category_defaults の audience は見ない。記事ごとに付ける）
//   --all           全記事を付け直す（既存の audience を上書きする）
//   --dry-run       対象件数と概算原価だけ出して終わる（キー不要。モデルを呼ばず、ファイルも書かない）
//
// 空の audience は build.js が「発注側向け」で仮置きして warn する。制作側向けと誤ると事業者から提案カードが消えるが、
// 逆の誤りは技術者にカードが1枚出るだけなので、仮置きは安全な側に倒してある。このスクリプトはその仮置きを実測値に置き換える。
//
// 依存ゼロ。API キーは環境変数 JEV_API_KEY か、リポジトリ直下の .env.local（.gitignore 済み）からだけ読む。
// キーの値は出力にもファイルにも書かない。build.js の BLOG と content/blog/*.md は読むだけで、1文字も変えない。

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CATALOG_FILE = path.join(ROOT, 'data', 'catalog-articles.json');
const LABELS_FILE = path.join(ROOT, 'data', 'nq-labels.json');

// Jev の直接 API（docs/nq/jev-api-notes.md）。api/_lib/decide.js と同じ既定。
const JEV_DEFAULT_BASE = 'https://api.typesafe.ai';
const JEV_PATH = '/v1/systemone';
const JEV_DEFAULT_MODEL = 'jev-1.13.0';
// 料金（入力 $0.042 / 100万トークン、出力無料）と、文字数→トークンの概算係数（eval/run.js と同じ実測値）。
const JEV_USD_PER_MTOK = 0.042;
const TOKENS_PER_CHAR = 0.79;

const BODY_CHARS = 800;          // state に入れる本文の冒頭の字数
const REVIEW_BELOW = 0.6;        // これ未満の確信度は人が確かめる（decisions 3章）
const DEFAULT_TIMEOUT_MS = 8000;
const CONCURRENCY = 4;           // 同時に投げる数（レート制限 1,200/分 に対して十分小さい）
const SPOT_CHECK = 20;           // 目視の無作為抽出の本数（decisions 3章）
const QUESTION_KEY = 'audience';
// data/nq-labels.json に article_audience が無いときの受け皿（build.js の NQ_ARTICLE_AUDIENCES と同じ列挙）。
const FALLBACK_AUDIENCE = {
  instructions: 'この記事は、どの読者に向けて書かれているか',
  criteria: {
    '発注側向け': '自社のサイト制作、AI導入、システム開発を外部に依頼する事業者が、費用の相場、進め方、依頼先の選び方、補助金、導入の判断のために読む記事',
    '制作側・技術者向け': 'Web制作、開発、マーケティングを仕事や学習として行う人が、実装手順、コードや設定ファイル、APIやライブラリの使い方、エラーの原因と解決、評価指標の測り方のために読む記事',
    '求職者向け': 'Nortiq Labs で働くこと、インターン、社内の様子や働き方を知るために読む記事',
  },
};

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// ---- 引数と .env.local ----

function parseArgs(argv) {
  const out = { mode: 'only-missing', dryRun: false, slugs: null, limit: 0, timeoutMs: DEFAULT_TIMEOUT_MS, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--only-missing') out.mode = 'only-missing';
    else if (a === '--all') out.mode = 'all';
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--slugs') out.slugs = String(next() || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--limit') out.limit = Math.max(0, parseInt(next(), 10) || 0);
    else if (a === '--timeout-ms') out.timeoutMs = Math.max(100, parseInt(next(), 10) || DEFAULT_TIMEOUT_MS);
    else if (a === '--help' || a === '-h') out.help = true;
    else { console.error('不明な引数: ' + a); out.help = true; }
  }
  return out;
}

// KEY=VALUE の行だけを読む簡易パーサ（eval/run.js と同じ。dotenv を足さないため）。すでに環境変数に在るキーは上書きしない。
// 値は返さず、読めたキーの名前だけ返す。
function loadEnvLocal(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const loaded = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '#') continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    if (process.env[m[1]] == null || process.env[m[1]] === '') { process.env[m[1]] = v; loaded.push(m[1]); }
  }
  return loaded;
}

// ---- 入力 ----

// build.js の BLOG を読む（eval/run.js・build-prerender.js と同じ正規表現。編集はしない）。
function readBlog() {
  const src = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');
  const m = src.match(/const BLOG = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('build.js の const BLOG = [...] が見つからない');
  const unescape = (s) => s.replace(/\\(.)/g, '$1');
  const out = [];
  for (const line of m[1].split('\n')) {
    const slug = line.match(/slug: '([^']+)'/);
    if (!slug) continue;
    const title = line.match(/title: '((?:[^'\\]|\\.)*)'/);
    const desc = line.match(/desc: '((?:[^'\\]|\\.)*)'/);
    const category = line.match(/category: '([^']+)'/);
    out.push({ slug: slug[1], title: title ? unescape(title[1]) : '', desc: desc ? unescape(desc[1]) : '', category: category ? category[1] : '' });
  }
  return out;
}

// 本文の冒頭。先頭の見出し（# 題）と Markdown の記号を落とし、空白を詰めて約 BODY_CHARS 字。
// Jev に渡すのは記事本文の写しだけ（訪問者由来の文字列は入らない）。
function readBodyHead(slug) {
  let md;
  try { md = fs.readFileSync(path.join(ROOT, 'content', 'blog', slug + '.md'), 'utf8'); } catch { return null; }
  const text = md
    .replace(/^---[\s\S]*?\n---\s*\n/, '')            // front matter があれば落とす
    .replace(/^#\s+.*$/m, '')                          // 先頭の h1（題は title で渡す）
    .replace(/```[\s\S]*?```/g, ' ')                   // コードブロック
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')             // 画像
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')           // リンクは文字だけ
    .replace(/<[^>]+>/g, ' ')                          // 生の HTML タグ
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')                // 見出し記号
    .replace(/[*_`>|]/g, '')                           // 強調・引用・表の記号
    .replace(/\s+/g, ' ')
    .trim();
  return [...text].slice(0, BODY_CHARS).join('');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// 質問（Choice 1問）。文と選択肢は data/nq-labels.json の article_audience をそのまま使う。
function buildQuestion(labels) {
  const aa = labels && isObj(labels.article_audience) ? labels.article_audience : null;
  const src = aa && isObj(aa.criteria) && Object.keys(aa.criteria).length ? aa : FALLBACK_AUDIENCE;
  const criteria = {};
  for (const k of Object.keys(src.criteria)) if (k !== '_comment') criteria[k] = src.criteria[k];
  return { question: { type: 'choice', instructions: src.instructions || FALLBACK_AUDIENCE.instructions, criteria }, fromLabels: src === aa };
}

// ---- Jev ----

async function askJev(state, questions, opts) {
  const key = process.env.JEV_API_KEY;
  if (!key) throw new Error('not_configured');
  const model = process.env.JEV_MODEL || JEV_DEFAULT_MODEL;
  const base = String(process.env.JEV_BASE_URL || JEV_DEFAULT_BASE).replace(/\/+$/, '');
  const r = await fetch(base + JEV_PATH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, state, questions }),
    signal: AbortSignal.timeout(opts.timeoutMs),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new Error('http_' + r.status + ' ' + String(detail).slice(0, 200).replace(/\s+/g, ' '));
  }
  const json = await r.json();
  const a = json && isObj(json.answers) ? json.answers[QUESTION_KEY] : null;
  const keys = Object.keys(questions[QUESTION_KEY].criteria);
  const choice = a && typeof a.choice === 'string' && keys.includes(a.choice) ? a.choice : null;
  if (!choice) throw new Error('bad_response（choice が選択肢に無い）');
  // confidence が無ければ、選んだ選択肢の確率で補う（decide.js と同じ向き）。0〜1 の外は回答なし扱い。
  let conf = num(a.confidence);
  if (conf == null && isObj(a.probabilities)) conf = num(a.probabilities[choice]);
  if (conf == null || conf < -1e-6 || conf > 1 + 1e-6) throw new Error('bad_response（confidence が 0〜1 に無い）');
  return { choice, confidence: Math.min(1, Math.max(0, conf)), usage: isObj(json.usage) ? num(json.usage.input_tokens) : null, model: json.model || model };
}

// ---- 出力（data/catalog-articles.json の整形を保つ）----

// 既存のファイルは「トップレベルは 2 スペースの字下げ、category_defaults / overrides の各エントリは 1 行」。
// JSON.stringify(…, null, 2) だと各エントリが複数行に広がって差分が読めなくなるので、同じ形で書く。
function inline(v) {
  if (Array.isArray(v)) return v.length ? '[' + v.map(inline).join(', ') + ']' : '[]';
  if (isObj(v)) { const ks = Object.keys(v); return ks.length ? '{ ' + ks.map((k) => JSON.stringify(k) + ': ' + inline(v[k])).join(', ') + ' }' : '{}'; }
  return JSON.stringify(v);
}

function formatCatalog(obj) {
  const lines = ['{'];
  const keys = Object.keys(obj);
  keys.forEach((k, i) => {
    const v = obj[k];
    const last = i === keys.length - 1 ? '' : ',';
    if (isObj(v) && Object.keys(v).length && Object.keys(v).every((e) => isObj(v[e]))) {
      lines.push('  ' + JSON.stringify(k) + ': {');
      const es = Object.keys(v);
      es.forEach((e, j) => { lines.push('    ' + JSON.stringify(e) + ': ' + inline(v[e]) + (j === es.length - 1 ? '' : ',')); });
      lines.push('  }' + last);
    } else {
      lines.push('  ' + JSON.stringify(k) + ': ' + inline(v) + last);
    }
  });
  lines.push('}');
  return lines.join('\n') + '\n';
}

// overrides[slug] に audience / audience_confidence / _review をマージする。他のフィールドとキーの並びは保つ。
function mergeResult(catalog, slug, res) {
  if (!isObj(catalog.overrides)) catalog.overrides = {};
  const cur = isObj(catalog.overrides[slug]) ? catalog.overrides[slug] : {};
  const next = Object.assign({}, cur, { audience: res.choice, audience_confidence: Math.round(res.confidence * 100) / 100 });
  if (res.confidence < REVIEW_BELOW) next._review = true; else delete next._review;
  catalog.overrides[slug] = next;
}

// 再現できる乱数（mulberry32。api/_lib/recommend.js の seededRng と同じ）。目視の無作為 20 本を毎回同じにするため。
function seededRng(seed) {
  let s = (Number(seed) || 0) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(list, n, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

// ---- 入口 ----

const USAGE = `使い方:
  node eval/tag-articles.js [--only-missing | --all] [--dry-run] [--slugs a,b] [--limit N] [--timeout-ms ${DEFAULT_TIMEOUT_MS}]
  --only-missing  既定。overrides[slug].audience が無い記事だけ
  --all           全記事を付け直す
  --dry-run       対象件数と概算原価だけ出す（キー不要。書かない）`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(USAGE); process.exit(0); }

  const loaded = loadEnvLocal(path.join(ROOT, '.env.local'));
  if (loaded.length) console.log('.env.local から読んだキー: ' + loaded.join(', ') + '（値は表示しない）');

  const catalog = readJson(CATALOG_FILE);
  if (!isObj(catalog.overrides)) catalog.overrides = {};
  let labels = null;
  try { labels = readJson(LABELS_FILE); } catch { /* 受け皿の文で続ける */ }
  const { question, fromLabels } = buildQuestion(labels);
  if (!fromLabels) console.warn('  ! data/nq-labels.json に article_audience が無い。スクリプト内の受け皿の文で聞く（先に labels に足すのが正）');
  const audiences = Object.keys(question.criteria);

  // 書き出しの整形が既存のファイルと同じかを先に確かめる（違えば、書いたときに差分がファイル全体に広がる）。
  const original = fs.readFileSync(CATALOG_FILE, 'utf8');
  const formatSame = formatCatalog(catalog) === original.replace(/\r\n/g, '\n');
  if (!formatSame) console.warn('  ! data/catalog-articles.json の整形が想定と違う（書き出すと整形の差分が出る）。dry-run で確かめてから実行すること');

  const blog = readBlog();
  const slugFilter = args.slugs ? new Set(args.slugs) : null;
  const jobs = [];
  let noBody = 0;
  for (const a of blog) {
    if (slugFilter && !slugFilter.has(a.slug)) continue;
    const ov = isObj(catalog.overrides[a.slug]) ? catalog.overrides[a.slug] : {};
    const hasAudience = typeof ov.audience === 'string' && audiences.includes(ov.audience);
    if (args.mode === 'only-missing' && hasAudience) continue;
    const body = readBodyHead(a.slug);
    if (body == null) { noBody += 1; continue; }
    const state = { title: a.title, desc: a.desc, '本文の冒頭': body };
    const questions = { [QUESTION_KEY]: question };
    jobs.push({ slug: a.slug, title: a.title, state, questions, chars: JSON.stringify({ state, questions }).length });
  }
  const limited = args.limit ? jobs.slice(0, args.limit) : jobs;
  const tagged = blog.filter((a) => isObj(catalog.overrides[a.slug]) && audiences.includes(catalog.overrides[a.slug].audience)).length;
  const estTokens = limited.reduce((s, j) => s + Math.round(j.chars * TOKENS_PER_CHAR), 0);
  const estUsd = (estTokens * JEV_USD_PER_MTOK) / 1e6;

  console.log(`記事: ${blog.length} 本（audience 設定済み ${tagged}・本文が無い ${noBody}）／ 対象: ${limited.length} 本（${args.mode}${args.limit ? `・--limit ${args.limit}` : ''}${slugFilter ? `・--slugs ${slugFilter.size}` : ''}）`);
  console.log(`概算原価: 入力 約 ${estTokens.toLocaleString()} トークン ≈ $${estUsd.toFixed(4)}（1本あたり 約 ${limited.length ? Math.round(estTokens / limited.length) : 0} トークン。$${JEV_USD_PER_MTOK}/100万トークン・出力無料）`);
  console.log(`選択肢: ${audiences.join(' ／ ')}（${fromLabels ? 'data/nq-labels.json の article_audience' : 'スクリプト内の受け皿'}）／ 0.${String(REVIEW_BELOW).split('.')[1]} 未満は _review: true`);
  if (args.dryRun) { console.log('--dry-run: モデルを呼ばず、ファイルも書かない。'); return; }
  if (!limited.length) { console.log('対象が無い。'); return; }
  if (!process.env.JEV_API_KEY) { console.error('JEV_API_KEY が無い。リポジトリ直下の .env.local に置く（コミットしない）。'); process.exit(1); }

  // 同時に CONCURRENCY 本ずつ。失敗した本は記録して続け、成功した本だけ書く。
  const results = {};
  const failures = [];
  let done = 0; let tokens = 0; let measured = 0; let model = null;
  const t0 = Date.now();
  let cursor = 0;
  const worker = async () => {
    while (cursor < limited.length) {
      const job = limited[cursor++];
      try {
        const r = await askJev(job.state, job.questions, args);
        results[job.slug] = r;
        if (r.usage != null) { tokens += r.usage; measured += 1; } else tokens += Math.round(job.chars * TOKENS_PER_CHAR);
        model = model || r.model;
      } catch (e) {
        failures.push({ slug: job.slug, error: String((e && e.message) || e).slice(0, 120) });
      }
      done += 1;
      if (done % 10 === 0 || done === limited.length) console.log(`  ${done} / ${limited.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, limited.length) }, worker));

  const okSlugs = Object.keys(results);
  for (const slug of okSlugs) mergeResult(catalog, slug, results[slug]);
  if (okSlugs.length) {
    fs.writeFileSync(CATALOG_FILE, formatCatalog(catalog));
  }

  // 要約: ラベル別の件数、_review の一覧、目視の無作為抽出（種は固定。同じ対象なら同じ 20 本）。
  const byLabel = {};
  const review = [];
  for (const slug of okSlugs.sort()) {
    const r = results[slug];
    byLabel[r.choice] = (byLabel[r.choice] || 0) + 1;
    if (r.confidence < REVIEW_BELOW) review.push(`${slug} (${r.choice} ${r.confidence.toFixed(2)})`);
  }
  const usd = (tokens * JEV_USD_PER_MTOK) / 1e6;
  console.log(`\n== 記事の audience: ${okSlugs.length} 本に付けた（失敗 ${failures.length}）／ model=${model || '-'} ／ ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
  console.log('  ラベル別: ' + audiences.map((k) => `${k}×${byLabel[k] || 0}`).join(' '));
  console.log(`  原価: 入力 ${tokens.toLocaleString()} トークン（実測 ${measured} 本）≈ $${usd.toFixed(4)}`);
  console.log(`  確信度 ${REVIEW_BELOW} 未満（_review: true）${review.length} 本: ` + (review.join(' ／ ') || '-'));
  const spot = sample(okSlugs.filter((s) => results[s].confidence >= REVIEW_BELOW).sort(), SPOT_CHECK, seededRng(20260921));
  console.log(`  目視の無作為 ${SPOT_CHECK} 本（種 20260921）: ` + (spot.join(' ') || '-'));
  for (const f of failures) console.error(`  ! ${f.slug}: ${f.error}`);
  if (okSlugs.length) console.log('\n書いた: data/catalog-articles.json（overrides[slug].audience / audience_confidence / _review）。次は 0.6 未満と無作為 20 本を本文で確かめ、docs/nq/article-audience-review.md に記録する。');
  if (failures.length) process.exit(1);
}

if (require.main === module) {
  main().catch((e) => { console.error('tag-articles failed: ' + String((e && e.message) || e)); process.exit(1); });
}

module.exports = { parseArgs, readBlog, readBodyHead, buildQuestion, formatCatalog, mergeResult };
