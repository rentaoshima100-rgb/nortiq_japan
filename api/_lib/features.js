// 次ページ提案（nq）— 推薦アルゴリズムの特徴量と事前分布（設計書7章「3. 特徴量」「4. モデル」）。
//
//   P(成果 | 訪問者, カード i) = σ( Σ w[k]·x[k]  +  b[i] )
//
// 共有の重み w は下の FEATURES の10個（切片を含む）。b はカード別の補正で、selectable な
// 提案カード1枚につき1つ。合わせて23個の小さなロジスティック回帰になる。
//
// 重みの持ち方: mean / variance は「名前 → 数値」のマップ。共有の重みは FEATURES の名前、
// カード別の補正は 'card:<block_id>'。配列にしないのは、カードを足したり外したりしたときに、
// 学習済みの重みとの対応が黙ってずれるのを防ぐため（マップに無い名前は事前分布で補う）。
// 特徴量ベクトル（featureVector の戻り値とログの features）は FEATURES の順の配列。
// この並びを変えるときは、方策のバージョン（recommend.js の POLICY_VERSION）も上げること。
// 夜間バッチ（learn.js）は、過去のログの features をこの並びだと思って読む。
//
// しきい値と事前分布の数値は data/nq-rules.json の recommend。

const data = require('./data');

const FEATURES = ['bias', 'rel', 'dv', 'cov', 'ind_match', 'need_match', 'stage_goal', 'slot_end', 'slot_next', 'revisit'];
const CARD_PREFIX = 'card:';
const STAGE_MAX = 3; // 検討度は 0〜3 の4段階（設計書3章）

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const fin = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round4 = (v) => Math.round(v * 10000) / 10000;

const cardKey = (blockId) => CARD_PREFIX + blockId;

function config() {
  const r = (data.rules && data.rules.recommend) || {};
  const prior = isObj(r.prior) ? r.prior : {};
  const pos = (v, d) => (fin(v) != null && v > 0 ? v : d);
  return {
    rel_logit_clip: pos(r.rel_logit_clip, 4),
    prior_mean: isObj(prior.mean) ? prior.mean : { bias: -3.5, rel: 0.5 },
    sd_shared: pos(prior.sd_shared, 0.5),
    sd_card: pos(prior.sd_card, 0.35),
    goal_proximity_by_type: isObj(r.goal_proximity_by_type) ? r.goal_proximity_by_type : {},
  };
}

// 重みの名前の並び（共有10個 ＋ カード別）。learn.js が行列の添字に使う。
function weightKeys(cardIds) {
  const ids = Array.isArray(cardIds) ? cardIds : data.selectableCardIds();
  return FEATURES.concat(ids.map(cardKey));
}

// 事前分布。平均は bias と rel だけが 0 でない。このためデータが0件のあいだ、
// 期待値の順位は Jev の関連度の順と一致する（設計書7章「4. モデル」）。
function priorModel(cardIds) {
  const c = config();
  const mean = {};
  const variance = {};
  for (const key of weightKeys(cardIds)) {
    const shared = !key.startsWith(CARD_PREFIX);
    const m = shared && has(c.prior_mean, key) ? fin(c.prior_mean[key]) : null;
    mean[key] = m == null ? 0 : m;
    variance[key] = (shared ? c.sd_shared : c.sd_card) ** 2;
  }
  return { version: 'prior', mean, variance, aux: {} };
}

// 関連度（0〜1）→ ロジット。0 や 1 に近い値で無限大に飛ばないよう ±clip で打ち切る。
function relLogit(p, clip) {
  const lim = fin(clip) != null && clip > 0 ? clip : config().rel_logit_clip;
  const v = fin(p);
  if (v == null || v <= 0) return -lim;
  if (v >= 1) return lim;
  return clamp(Math.log(v / (1 - v)), -lim, lim);
}

// 提案先のゴールへの近さ（0 / 0.5 / 1）。ブロックに書いてあればそれ、無ければ提案先のページ群の既定値。
function goalProximity(block, pageType) {
  const own = fin(block && block.goal_proximity);
  if (own != null) return clamp(own, 0, 1);
  const byType = config().goal_proximity_by_type;
  const v = has(byType, pageType) ? fin(byType[pageType]) : null;
  return v == null ? 0 : clamp(v, 0, 1);
}

// ブロック → 特徴量づくりに要るカードの情報。industry は業種版を使うときの業種ラベル（無ければ null）。
// タグ（industry / need）とページ群（type）は、ブロックではなく提案先のページから引く
// （業種版に切り替わると行き先が変わり、タグも変わる）。行き先が無ければ null。
function cardInfo(block, industry) {
  if (!block) return null;
  const target = data.targetOf(block, industry || null);
  if (!target) return null;
  const cat = data.catalog || {};
  const page = has(cat, target) && isObj(cat[target]) ? cat[target] : {};
  const type = typeof page.type === 'string' && page.type ? page.type : 'other';
  return {
    block_id: block.block_id,
    industry: industry || null,
    target_url: target,
    type,
    industry_tags: Array.isArray(page.industry) ? page.industry.slice() : [],
    need_tags: Array.isArray(page.need) ? page.need.slice() : [],
    goal_proximity: goalProximity(block, type),
  };
}

// V(ページ)。URL ごとの値が無ければページ群の値（aux.V_type）で代用する。
// 記事は毎日増えるので、着地した記事そのものの V はたいてい無い。
function valueOf(aux, url, type) {
  const V = isObj(aux && aux.V) ? aux.V : {};
  if (url && has(V, url) && fin(V[url]) != null) return V[url];
  const VT = isObj(aux && aux.V_type) ? aux.V_type : {};
  if (type && has(VT, type) && fin(VT[type]) != null) return VT[type];
  return null;
}

// 特徴量ベクトル（FEATURES の順）。
//   rel: Jev の関連度（0〜1）  card: cardInfo() の戻り値  answers: 正規化形  slot: 配置先
//   aux: nq_model.aux = { V: {url: 値}, V_type: {type: 値}, cov: {from_url: {to_url: 対数比}} }
// aux に値が無い特徴量は 0（＝その重みが効かない）。フェーズ1〜2 は aux が空なので dv も cov も 0。
function featureVector({ rel, card, answers, slot, currentUrl, revisit, aux } = {}) {
  const a = isObj(answers) ? answers : {};
  const c = isObj(card) ? card : {};
  const cat = data.catalog || {};

  let dv = 0;
  const curPage = currentUrl && has(cat, currentUrl) && isObj(cat[currentUrl]) ? cat[currentUrl] : null;
  const curType = curPage ? curPage.type : (currentUrl && /^\/article-/.test(currentUrl) ? 'article' : null);
  const vTo = valueOf(aux, c.target_url, c.type);
  const vFrom = valueOf(aux, currentUrl, curType);
  if (vTo != null && vFrom != null) dv = clamp(vTo - vFrom, -1, 1);

  let cov = 0;
  const covMap = isObj(aux && aux.cov) ? aux.cov : {};
  const row = currentUrl && has(covMap, currentUrl) && isObj(covMap[currentUrl]) ? covMap[currentUrl] : null;
  if (row && c.target_url && has(row, c.target_url) && fin(row[c.target_url]) != null) cov = clamp(row[c.target_url], -4, 4);

  // 一致は Jev の選択そのもので見る（確信度では切らない）。低確信の一致がどれだけ効くかは重みが学ぶ。
  // 「不明・その他」や other はどのページのタグにも無いので、自然に 0 になる。
  const ind = isObj(a.industry) ? a.industry.choice : null;
  const need = isObj(a.need) ? a.need.choice : null;
  const stage = fin(isObj(a.stage) ? a.stage.score : null);

  const x = {
    bias: 1,
    rel: relLogit(rel),
    dv,
    cov,
    ind_match: ind && Array.isArray(c.industry_tags) && c.industry_tags.includes(ind) ? 1 : 0,
    need_match: need && Array.isArray(c.need_tags) && c.need_tags.includes(need) ? 1 : 0,
    stage_goal: (stage == null ? 0 : clamp(stage / STAGE_MAX, 0, 1)) * (fin(c.goal_proximity) == null ? 0 : c.goal_proximity),
    slot_end: slot === 'slot-end' ? 1 : 0,
    slot_next: slot === 'slot-next' ? 1 : 0,
    revisit: revisit ? 1 : 0,
  };
  return FEATURES.map((k) => round4(x[k]));
}

// 線形の得点 Σ w·x + b。weights は「名前 → 数値」。無い名前は 0 とみなす。
function linearScore(weights, x, blockId) {
  const w = isObj(weights) ? weights : {};
  let z = 0;
  for (let i = 0; i < FEATURES.length; i++) {
    const wi = has(w, FEATURES[i]) ? fin(w[FEATURES[i]]) : null;
    if (wi != null) z += wi * x[i];
  }
  const b = has(w, cardKey(blockId)) ? fin(w[cardKey(blockId)]) : null;
  return z + (b == null ? 0 : b);
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

module.exports = { FEATURES, featureVector, priorModel, weightKeys, cardKey, cardInfo, relLogit, goalProximity, linearScore, sigmoid };
