// 次ページ提案（nq）— API が使うデータの読み込み口。
//
// labels / rules / blocks は data/*.json を直接 require する（ビルド生成物にしない。
// 文言の承認や しきい値の変更が、そのままコミット差分として見えるようにするため）。
// catalog は build.js が生成する api/_data/catalog.json（.gitignore 対象）を読む。
//
// どのファイルが欠けても throw しない。/api/suggest は「どんな失敗でもデフォルトに倒す」
// のが仕様なので、データが無いときは「候補ゼロ → 常にデフォルト」で動き続ける。
//
// require のパスは文字列リテラルのまま書くこと。Vercel はソースの require を静的に
// たどって Function に同梱するファイルを決めるので、変数で組み立てると本番で読めなくなる。
//
// 使う側は `const data = require('./data')` のあと、呼び出しのたびに data.blocks のように
// 参照する（モジュール読み込み時に分割代入で取り出すと、テストの差し替えが効かない）。

function tryRequire(load) {
  try { return load(); } catch { return null; }
}

const EMPTY_BLOCKS = { version: 1, blocks: [] };

// catalog-pages.json（配列）を catalog.json と同じ { url: {title,type,topic?,industry,need} } に直す。
function pagesToMap(file) {
  const out = {};
  const pages = file && Array.isArray(file.pages) ? file.pages : [];
  for (const p of pages) {
    if (!p || typeof p.url !== 'string') continue;
    out[p.url] = {
      title: p.title || '',
      type: p.type || 'other',
      industry: Array.isArray(p.industry) ? p.industry : [],
      need: Array.isArray(p.need) ? p.need : [],
    };
  }
  return out;
}

function loadCatalog() {
  const built = tryRequire(() => require('../_data/catalog.json'));
  if (built && built.pages && typeof built.pages === 'object') return built.pages;
  // ビルド生成物が Function に同梱されなかった場合の代替。記事の title は引けなくなるが、
  // state.js が /article-* を type「記事」だけで通すので判定は続けられる。
  return pagesToMap(tryRequire(() => require('../../data/catalog-pages.json')));
}

function loadAll() {
  const blocksFile = tryRequire(() => require('../../data/blocks.json')) || EMPTY_BLOCKS;
  return {
    labels: tryRequire(() => require('../../data/nq-labels.json')) || {},
    rules: tryRequire(() => require('../../data/nq-rules.json')) || {},
    blocks: Array.isArray(blocksFile.blocks) ? blocksFile.blocks : [],
    catalog: loadCatalog(),
  };
}

let store = loadAll();

// ---- 承認（キルスイッチ）----

const filled = (s) => String(s == null ? '' : s).trim() !== '';

// クライアントの配信物（window.NORTIQ_NQ.blocks）は、この variant が未承認のブロックを
// ブロックごと落とす（コントラクト 3.2）。サーバも同じ条件で見ないと、ブラウザが持って
// いないブロックを返してしまう。
const baseVariantName = (block) => (block && block.kind === 'cta' ? 'weak' : 'default');

function getBlock(id) {
  if (typeof id !== 'string' || !id) return null;
  return store.blocks.find((b) => b && b.block_id === id) || null;
}

function variantOf(block, name, industry) {
  if (!block || !name) return null;
  if (industry) {
    const entry = block.by_industry && block.by_industry[industry];
    return (entry && entry.variants && entry.variants[name]) || null;
  }
  return (block.variants && block.variants[name]) || null;
}

function approved(block, variant, entry) {
  if (!variant || typeof variant !== 'object') return false;
  // 評価・テスト専用の抜け道（下の __setForTest）。本番の経路からは立てられない。
  if (store.includeUnapproved === true) return true;
  // バリエーション単位の承認があればそれが優先。無ければブロック単位の承認を引き継ぐ。
  return filled(variant.approved_by) || filled(entry && entry.approved_by) || filled(block.approved_by);
}

// 配信してよいか。industry を渡すと by_industry[industry] の variant を見る。
// 承認済みの variant が1つも無ければ、これが常に false を返すので結果は必ずデフォルトになる。
function deliverable(block, variantName, industry) {
  if (!block || !variantName) return false;
  const base = baseVariantName(block);
  const hasTop = block.variants && Object.keys(block.variants).length > 0;
  // トップレベルに variants を持つブロックは、その基準 variant が承認済みであること。
  // sg-solution のようにトップレベルが空のブロックは by_industry 側だけで判断する。
  if (hasTop && !approved(block, block.variants[base])) return false;
  if (!industry) return hasTop && approved(block, variantOf(block, variantName));
  const entry = block.by_industry && block.by_industry[industry];
  if (!entry) return false;
  if (!approved(block, variantOf(block, base, industry), entry)) return false;
  return approved(block, variantOf(block, variantName, industry), entry);
}

// 行き先。industry 版があればその target_url、無ければトップレベル。
function targetOf(block, industry) {
  if (!block) return null;
  if (industry) {
    const entry = block.by_industry && block.by_industry[industry];
    if (entry && entry.target_url) return entry.target_url;
  }
  return block.target_url || null;
}

// 業種で行き先が変わるブロック（sg-solution / sg-works）で、業種版を使うならその業種ラベル、
// 使わないなら null。ind は answers.industry（正規化形）。推薦（recommend.js）とルール（rules.js）が
// 同じ判断をしないと、特徴量を引いたページと実際に出すページが食い違うので、ここに1つだけ置く。
function industryFor(block, ind, minConfidence) {
  const by = block && block.by_industry;
  if (!by || typeof by !== 'object' || !ind || typeof ind.choice !== 'string') return null;
  const conf = typeof ind.confidence === 'number' && Number.isFinite(ind.confidence) ? ind.confidence : 0;
  if (conf < minConfidence) return null;
  if (!Object.prototype.hasOwnProperty.call(by, ind.choice)) return null;
  return deliverable(block, 'default', ind.choice) ? ind.choice : null;
}

// カード別の補正を持つカード（selectable な提案カード）の ID。承認の有無は見ない。
// 重みの並びは承認状況で変わってはいけない（承認を外しても、学習済みの補正は残しておく）。
function selectableCardIds() {
  return store.blocks
    .filter((b) => b && b.kind === 'suggest' && b.selectable === true && typeof b.block_id === 'string')
    .map((b) => b.block_id);
}

module.exports = {
  get labels() { return store.labels; },
  get rules() { return store.rules; },
  get blocks() { return store.blocks; },
  get catalog() { return store.catalog; },
  getBlock,
  variantOf,
  deliverable,
  targetOf,
  baseVariantName,
  industryFor,
  selectableCardIds,
  pagesToMap,
  // テスト・評価専用。blocks.json / catalog.json が未作成でも fixture で動かせるようにする。
  // blocks / catalog はファイルの形（{blocks:[...]} / {pages:{...}}）のまま渡してよい。
  // includeUnapproved:true を渡すと、未承認の variant も承認済みとして扱う。承認前の下書きを
  // eval/ の評価セットに通すためのもので、api/suggest.js からは呼ばない（本番の承認フィルタは
  // 変わらない）。__resetForTest() で元に戻る。
  __setForTest(part) {
    const next = Object.assign({}, part || {});
    if (next.blocks && !Array.isArray(next.blocks)) next.blocks = next.blocks.blocks || [];
    if (next.catalog && next.catalog.pages) {
      next.catalog = Array.isArray(next.catalog.pages) ? pagesToMap(next.catalog) : next.catalog.pages;
    }
    store = Object.assign({}, store, next);
  },
  __resetForTest() { store = loadAll(); },
};
