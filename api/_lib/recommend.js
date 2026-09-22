// 次ページ提案（nq）— 推薦アルゴリズム（設計書7章 ＋ コントラクト 6.4）。
//
//   recommend({ answers, candidates, slots, currentUrl, viewedUrls, revisit, model, policy, rng })
//     -> { picks: { [slot]: { block_id, propensity, industry?, explored? } },
//          candidates: [...ログ用], policy, explored, reason }
//
// Jev の関連度（rel_<block_id>）を事前知識にして、カードごとの期待値 σ(w·x + b) で順位をつけ、
// 探索つきで選ぶ。ここが決めるのは「どのカードか」と「その選択確率」だけ。どのスロットに
// どの文言（variant）で出すか、そもそも出してよい相手か（営業・求職者など）は rules.js が決める。
//
// 純関数: 乱数は rng（0 以上 1 未満を返す関数）から引く。同じ入力・同じ rng・同じ data/*.json なら
// 同じ結果になる。テストと eval/ は seededRng() を渡して再現できるようにする。
//
// 方策（policy）:
//   prior  既定。フェーズ1〜2。事前分布の平均で期待値を計算して最大を選ぶ。学習済みモデルを
//          渡されても重みには使わない（フェーズ3に入る前に、順位が実績で動き出さないようにする）。
//          選択確率は厳密に 0.95·[最大か] + 0.05/候補数。
//   ts     フェーズ3。事後分布（対角の分散）から重みを1組引いて最大を選ぶ（トンプソン抽出）。
//          選択確率は 200 回の抽出の頻度から 0.95·頻度 + 0.05/候補数。
// どちらも 5% は候補の中から等確率で選ぶ（一様探索）。どのカードの選択確率も 0 にしないためで、
// これが無いと、記録した選択確率の逆数で重みづけするオフポリシー評価（7章「6. 評価」）が成り立たない。
//
// 探索の範囲は、関連度が rel_floor 以上のカードに限る（下限は探索と2枚目の候補にしか効かず、
// 1位のカードは取りこぼさない）。最大の関連度が rel_gate 未満なら何も選ばない（探索もしない）。
// 訪問者から見て的外れな提案は、探索であっても出さない。
// 2枚目（slot-end）も同じで、1枚目を除いた候補の最大が rel_gate 未満なら2枚目は選ばない。
// 訪問者タイプで対象外になるカード（blocks.json の only_visitor_types）は、候補にも探索にも入れない。

const data = require('./data');
const { FEATURES, featureVector, priorModel, cardKey, cardInfo, linearScore, sigmoid } = require('./features');

// FEATURES の並びや特徴量の意味を変えたら、ここを上げる（過去のログと混ぜて学習しないため）。
const POLICY_VERSION = { prior: 'prior-v1', ts: 'ts-v1' };

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const fin = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round6 = (v) => Math.round(v * 1e6) / 1e6;

function config() {
  const t = (data.rules && data.rules.thresholds) || {};
  const r = (data.rules && data.rules.recommend) || {};
  const pick = (o, k, d) => (fin(o[k]) != null ? o[k] : d);
  return {
    rel_gate: pick(t, 'rel_gate', 0.55),
    // 候補の下限。2026-09-21 決定 4章で 0.35 → 0.45（0.35〜0.45 の帯は当たり7・外れ18）。値は data/nq-rules.json の
    // thresholds.rel_floor が正で、ここはキーが無いときの受け皿。rules.js の関連記事の下限も同じキーを読む。
    rel_floor: pick(t, 'rel_floor', 0.45),
    industry_switch: pick(t, 'industry_switch', 0.6),
    explore_rate: Math.min(1, Math.max(0, pick(r, 'explore_rate', 0.05))),
    propensity_draws: Math.max(1, Math.round(pick(r, 'propensity_draws', 200))),
  };
}

// 再現できる乱数（mulberry32）。テストと評価ランナー用。本番は Math.random を使う。
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

// 標準正規乱数（ボックス＝ミュラー法）。
function gauss(rand) {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// 学習済みモデルを事前分布の上に重ねる。モデルに無い名前（学習後に足したカードなど）と、
// 壊れた値（数値でない・分散が正でない）は事前分布のまま残す。
function mergeModel(model, cardIds) {
  const base = priorModel(cardIds);
  const m = isObj(model) ? model : {};
  for (const key of Object.keys(base.mean)) {
    if (isObj(m.mean) && has(m.mean, key) && fin(m.mean[key]) != null) base.mean[key] = m.mean[key];
    if (isObj(m.variance) && has(m.variance, key) && fin(m.variance[key]) != null && m.variance[key] > 0) base.variance[key] = m.variance[key];
  }
  return base;
}

// 得点が最大の候補の添字。同点は関連度が高い方、それも同じなら候補の並びで先の方。
// 関連度のロジットは ±4 で打ち切るので、0.98 を超えるカード同士は得点が並ぶ。そこで順位が
// 関連度の順から外れないようにしている。
function argmax(pool, scores) {
  let best = 0;
  for (let i = 1; i < pool.length; i++) {
    if (scores[i] > scores[best] || (scores[i] === scores[best] && pool[i].rel > pool[best].rel)) best = i;
  }
  return best;
}

// 1スロットぶんを選ぶ。pool は候補（x はこのスロットでの特徴量）。
// 戻り値の propensity は pool と同じ並びの選択確率（合計 1）。
function choose(pool, weights, pol, cfg, rand) {
  const n = pool.length;
  const eps = cfg.explore_rate;
  const meanScores = pool.map((c) => linearScore(weights.mean, c.x, c.block_id));

  // 事後分布から重みを1組引いて、最大の候補を返す。
  const thompson = () => {
    const w = {};
    for (const k of FEATURES) w[k] = weights.mean[k] + Math.sqrt(weights.variance[k]) * gauss(rand);
    for (const c of pool) {
      const k = cardKey(c.block_id);
      w[k] = weights.mean[k] + Math.sqrt(weights.variance[k]) * gauss(rand);
    }
    return argmax(pool, pool.map((c) => linearScore(w, c.x, c.block_id)));
  };

  let greedy;
  if (pol === 'ts' && n > 1) {
    greedy = new Array(n).fill(0);
    for (let d = 0; d < cfg.propensity_draws; d++) greedy[thompson()] += 1 / cfg.propensity_draws;
  } else {
    const best = argmax(pool, meanScores);
    greedy = pool.map((_, i) => (i === best ? 1 : 0));
  }
  const propensity = greedy.map((g) => (1 - eps) * g + eps / n);

  let index;
  let explored = false;
  if (n > 1 && rand() < eps) {
    index = Math.min(n - 1, Math.floor(rand() * n));
    explored = true;
  } else if (pol === 'ts' && n > 1) {
    // 選択確率の見積もりに使った抽出とは別に、もう1組引いて選ぶ。
    index = thompson();
  } else {
    index = greedy.indexOf(1);
  }
  return { index, explored, propensity, meanScores };
}

function recommend({ answers, candidates, slots, currentUrl, viewedUrls, revisit, model, policy, rng } = {}) {
  const cfg = config();
  const pol = policy === 'ts' ? 'ts' : 'prior';
  const rand = typeof rng === 'function' ? rng : Math.random;
  const a = isObj(answers) ? answers : {};
  const slotList = (Array.isArray(slots) ? slots : []).filter((s) => typeof s === 'string' && s);
  const viewed = new Set(Array.isArray(viewedUrls) ? viewedUrls : []);
  const aux = isObj(model) && isObj(model.aux) ? model.aux : {};
  const weights = pol === 'ts' ? mergeModel(model) : priorModel();

  const out = { picks: {}, candidates: [], policy: POLICY_VERSION[pol], explored: false, reason: null };

  // 候補ごとに、関連度の下限と「いま出せるか」を確かめる。落とした候補も理由つきでログに残す
  // （関連度は高いのに出せなかったカードが分かると、承認や業種版の不足に気づける）。
  const eligible = [];
  const seen = new Set();
  for (const id of Array.isArray(candidates) ? candidates : []) {
    if (typeof id !== 'string' || seen.has(id)) continue;
    seen.add(id);
    const block = data.getBlock(id);
    const rel = fin(isObj(a['rel_' + id]) ? a['rel_' + id].noul : null);
    const entry = { block_id: id, rel };
    out.candidates.push(entry);

    if (!block || block.kind !== 'suggest' || block.selectable !== true) { entry.excluded = 'not_selectable'; continue; }
    if (rel == null || rel < cfg.rel_floor) { entry.excluded = 'rel_floor'; continue; }
    // 訪問者タイプで対象外になるカード（設計書7章「1. 候補を絞る」。ここは学習させず、ルールで固定する）。
    // blocks.json の only_visitor_types に在るタイプのときだけ候補にする（sg-recruit は「求職者・学生」だけ）。
    // 見るのは choice だけで、確信度は問わない。確信度がしきい値以上の求職者は rules.js の行3が先に処理し、
    // それ未満の求職者には従来どおり行5でこのカードを出せる。一様探索 5% の対象からも外れる。
    // 関連度（rel_*）は聞き続ける（questions.js は変えない）。外したことはログで検証できる。
    const only = Array.isArray(block.only_visitor_types) ? block.only_visitor_types : null;
    if (only && !(isObj(a.visitor_type) && only.includes(a.visitor_type.choice))) { entry.excluded = 'visitor_type'; continue; }
    // 業種で行き先が変わるカード: 業種が決まれば業種版、決まらなければトップレベル（sg-works）。
    // トップレベルに行き先が無いもの（sg-solution）は、業種が決まらない限り候補にしない。
    const industry = data.industryFor(block, a.industry, cfg.industry_switch);
    const card = cardInfo(block, industry);
    if (!card) { entry.excluded = 'no_industry'; continue; }
    if (!data.deliverable(block, data.baseVariantName(block), industry)) { entry.excluded = 'unapproved'; continue; }
    if (currentUrl && card.target_url === currentUrl) { entry.excluded = 'same_page'; continue; }
    if (viewed.has(card.target_url)) { entry.excluded = 'viewed'; continue; }

    if (industry) entry.industry = industry;
    entry.target_url = card.target_url;
    eligible.push({ block_id: id, rel, card, entry });
  }

  const xFor = (c, slot) => featureVector({ rel: c.rel, card: c.card, answers: a, slot, currentUrl, revisit, aux });

  // ログの features と score は1枚目のスロットでのもの。2枚目のスロットでの値は、
  // slot_end を 1 に置き換えれば同じ式で再現できる。
  for (const c of eligible) {
    c.x = xFor(c, slotList[0] || null);
    c.entry.features = c.x;
    c.entry.score = round6(sigmoid(linearScore(weights.mean, c.x, c.block_id)));
    c.entry.propensity = {};
  }

  if (!eligible.length) { out.reason = 'no_candidates'; return out; }
  if (Math.max(...eligible.map((c) => c.rel)) < cfg.rel_gate) { out.reason = 'below_gate'; return out; }
  if (!slotList.length) { out.reason = 'no_slot'; return out; }

  let pool = eligible;
  let first = null;
  for (const slot of slotList.slice(0, 2)) {
    if (first) {
      // 2枚目は、1枚目と提案先のページ群が違う候補から選ぶ（同じ種類のページを2枚並べない）。
      // 選択確率は「1枚目が決まったあと」の条件つきの値になる。
      pool = eligible.filter((c) => c !== first && c.card.type !== first.card.type);
      // 2枚目にも rel_gate を掛ける。1枚目の門は全候補の最大値で通っているので、ここを見ないと、
      // 残った候補の最大が門に届かなくても、そのうちの最大のカードがほぼ確実に slot-end の既定カードを
      // 置き換えてしまう（原則2「確信が低ければ何も変えない」）。門は pool の最大値に掛ける
      // （門を通った pool の中で 5% の探索が rel_floor 以上のカードを出すのは、1枚目と同じ）。
      // 1枚目が決まれば通るかどうかも決まるので、条件つきの選択確率は変わらない。
      // picks に slot-end が無ければ、rules.js は slot-end を変えない（コントラクト 6.3 の (c)）。
      if (pool.length && Math.max(...pool.map((c) => c.rel)) < cfg.rel_gate) break;
      for (const c of pool) c.x = xFor(c, slot);
    }
    if (!pool.length) break;
    const r = choose(pool, weights, pol, cfg, rand);
    pool.forEach((c, i) => { c.entry.propensity[slot] = round6(r.propensity[i]); });
    const won = pool[r.index];
    const pick = { block_id: won.block_id, propensity: round6(r.propensity[r.index]) };
    if (won.card.industry) pick.industry = won.card.industry;
    if (r.explored) { pick.explored = true; out.explored = true; won.entry.explored = true; }
    won.entry.picked = slot;
    out.picks[slot] = pick;
    if (!first) first = won;
  }
  return out;
}

// ログの policy 列に残す文字列。一様探索で選んだ判定は '+explore' を付ける。
const policyLabel = (rec) => (rec && rec.policy ? rec.policy + (rec.explored ? '+explore' : '') : null);

module.exports = { recommend, policyLabel, seededRng, mergeModel, POLICY_VERSION };
