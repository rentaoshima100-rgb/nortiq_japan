// 次ページ提案（nq）— 出し分けルール（設計書6章の表 ＋ コントラクト 6.3）。
//
//   applyRules({ answers, trigger, currentUrl, viewedUrls, picks }) -> { slots, is_default, matched, skipped }
//
// モデルが返すのは選択と確率だけ。何を表示するかはここで決める。
// 行5のカードは推薦アルゴリズム（recommend.js）が選ぶ。picks はその結果
// （{ [slot]: { block_id, propensity } }）で、ここではスロットへの配置と文言（variant）を決める。
// 関連度のしきい値（rel_gate / rel_floor）は recommend.js の側で見ているので、picks が空なら
// 行5には当たらない。
// 純関数（同じ answers・trigger・currentUrl・picks と同じ data/*.json なら同じ結果）。
// しきい値は data/nq-rules.json。変えたら eval/ の評価セットで確認し直すこと。
//
// 行1（ホールドアウト・bot・エラー・タイムアウト）は呼び出し側で片づく。ここには answers が
// 無い場合の受け皿だけ置く。
//
// matched は「条件に当たった行」、skipped は「当たったが採用しなかったブロックと理由」。
// どちらもログの列には無く、テストと eval/ の目視確認のために返している。

const data = require('./data');
const { CONCERNS } = require('./questions');

const TYPE_SALES = '営業・売り込み';
const TYPE_JOB = '求職者・学生';
const TYPE_PEER = '同業者・学習者';

// トリガーごとに、カードを入れるスロットと slot-bar を決めるかどうか（設計書5章）。
// T3 は第2段階で導入。slot-bar だけを決める。
const CARD_SLOT = { T1: 'slot-mid', T2: 'slot-next', T3: null };
const DECIDES_BAR = { T1: false, T2: true, T3: true };
// 推薦アルゴリズムに選ばせるスロット（この順に1枚目・2枚目）。T1 は slot-mid と slot-end を同時に決める。
const CARD_SLOTS = { T1: ['slot-mid', 'slot-end'], T2: ['slot-next'], T3: [] };

const cardSlots = (trigger) => (Object.prototype.hasOwnProperty.call(CARD_SLOTS, trigger) ? CARD_SLOTS[trigger].slice() : []);

const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function thresholds() {
  const t = (data.rules && data.rules.thresholds) || {};
  const pick = (k, d) => (typeof t[k] === 'number' ? t[k] : d);
  return {
    visitor_type: pick('visitor_type', 0.6),
    concern: pick('concern', 0.6),
    industry_switch: pick('industry_switch', 0.6),
    stage_cta: pick('stage_cta', 2.0),
    stage_contact: pick('stage_contact', 2.5),
    cta_ok: pick('cta_ok', 0.7),
  };
}

// しきい値以上で最大の不安。同点なら CONCERNS の並び順で先のもの。
function topConcern(answers, th) {
  let best = null;
  let bestP = -1;
  for (const c of CONCERNS) {
    const p = n(answers['concern_' + c] && answers['concern_' + c].noul);
    if (p >= th.concern && p > bestP) { best = c; bestP = p; }
  }
  return best;
}

// ブロックID → 返す中身。採用できなければ { skip: 理由 }。
//  - 未承認は採用しない（承認がキルスイッチ）
//  - いま見ているページを指すカードは採用しない（同じページを勧めても意味が無い）
//  - すでに読んだページを指す提案カードも採用しない（設計書7章「1. 候補を絞る」）。行5のカードは
//    recommend.js が先に外しているので、ここで効くのはルールが直接決める行3の sg-recruit。
//    不安解消（rs-*）と CTA（ct-*）は「次に読むページ」の提案ではないので対象にしない
//  - 業種で行き先が変わるカードは、業種の確信度がしきい値以上で by_industry に在れば業種版。
//    無ければトップレベル（sg-works）。トップレベルに行き先が無いもの（sg-solution）は不採用
//  - strict: 欲しい variant が配信できないとき、基準の variant に落とさず不採用にする
//    （slot-bar は strong に変えるための行なので、weak を返しても何も変わらない）
function resolve(blockId, wantVariant, { answers, currentUrl, viewed, th }, strict) {
  const block = data.getBlock(blockId);
  if (!block) return { skip: 'unknown_block' };

  // recommend.js と同じ関数で決める（特徴量を引いたページと、実際に出すページをそろえるため）。
  const industry = data.industryFor(block, answers.industry, th.industry_switch);

  const target = data.targetOf(block, industry);
  if (!industry && !target && block.action == null && block.kind === 'suggest') return { skip: 'no_industry' };
  if (target && currentUrl && target === currentUrl) return { skip: 'same_page' };
  if (target && block.kind === 'suggest' && viewed && viewed.has(target)) return { skip: 'viewed' };

  const base = data.baseVariantName(block);
  let variant = null;
  if (wantVariant && data.deliverable(block, wantVariant, industry)) variant = wantVariant;
  else if (!strict && data.deliverable(block, base, industry)) variant = base;
  if (!variant) return { skip: 'unapproved' };

  const out = { block_id: block.block_id, variant };
  if (industry) out.industry = industry;
  return { slot: out };
}

function applyRules({ answers, trigger, currentUrl, viewedUrls, picks } = {}) {
  const slots = {};
  const matched = [];
  const skipped = [];
  const done = () => ({ slots, is_default: Object.keys(slots).length === 0, matched, skipped });

  if (!answers || typeof answers !== 'object') { matched.push(1); return done(); }

  const th = thresholds();
  const ctx = { answers, currentUrl: currentUrl || null, viewed: new Set(Array.isArray(viewedUrls) ? viewedUrls : []), th };
  const cardSlot = Object.prototype.hasOwnProperty.call(CARD_SLOT, trigger) ? CARD_SLOT[trigger] : null;
  const put = (slot, row, blockId, variant, strict) => {
    const r = resolve(blockId, variant, ctx, strict);
    if (r.slot) { slots[slot] = r.slot; return r.slot; }
    skipped.push({ row, slot, block_id: blockId, reason: r.skip });
    return null;
  };
  // 推薦アルゴリズムが選んだカードを置く。選択確率（propensity）を応答とログに残す
  // （オフポリシー評価に使う。設計書7章「6. 評価」）。
  // 候補に出していない種類のブロック（rs- / ct- や selectable:false）は、picks に入っていても採らない。
  const putPick = (slot, pick, variant) => {
    const id = pick && typeof pick.block_id === 'string' ? pick.block_id : null;
    if (!id) return null;
    const chosen = data.getBlock(id);
    if (!chosen || chosen.kind !== 'suggest' || chosen.selectable !== true) {
      skipped.push({ row: 5, slot, block_id: id, reason: chosen ? 'not_selectable' : 'unknown_block' });
      return null;
    }
    const placed = put(slot, 5, id, variant);
    if (placed && typeof pick.propensity === 'number' && Number.isFinite(pick.propensity)) placed.propensity = pick.propensity;
    return placed;
  };

  // 行2〜4: 営業系を出さない相手。当たったら行5・6は評価しない。
  const vt = answers.visitor_type || {};
  const vtSure = n(vt.confidence) >= th.visitor_type;
  if (vtSure && vt.choice === TYPE_SALES) { matched.push(2); return done(); }
  if (vtSure && vt.choice === TYPE_JOB) {
    matched.push(3);
    if (cardSlot) put(cardSlot, 3, 'sg-recruit', null);
    return done();
  }
  if (vtSure && vt.choice === TYPE_PEER) {
    matched.push(4);
    // 関連記事は記事の途中（T1 の slot-mid）にだけ出す。T2 は何も変えない。
    if (trigger === 'T1') put('slot-mid', 4, 'rl-related', null);
    return done();
  }

  // 行5: 次に読むカード。1枚目を T1 は slot-mid、T2 は slot-next に置く。
  const first = cardSlot && picks && typeof picks === 'object' ? picks[cardSlot] : null;
  if (first && first.block_id) {
    matched.push(5);
    const concern = topConcern(answers, th);
    const card = putPick(cardSlot, first, concern);
    if (card && trigger === 'T1') {
      // slot-end の決め方（コントラクト 6.3）:
      //  (a) 1枚目がその不安の文言を持っていないときは、不安解消ブロックで補う。
      //      カード側で答えているのに同じ不安をもう一度出すと、1ページに同じ話が2回並ぶ。
      //  (b) そうでなければ推薦アルゴリズムの2枚目（1枚目とページ群が違うカード）。
      //      不安解消ブロックが未承認で置けなかったときも、こちらに回す。
      //  (c) 2枚目の候補が無ければ変えない。
      let end = null;
      if (concern && card.variant !== concern) end = put('slot-end', 5, 'rs-' + concern.replace(/_/g, '-'), null);
      // 2枚目の文言: 1枚目がすでにその不安に答えているなら default（同じ話を2回並べない）。
      if (!end) putPick('slot-end', picks['slot-end'], card.variant === concern ? null : concern);
    }
  }

  // 行6: 強いCTA。行5と同時に成立してよい。
  const st = answers.stage || {};
  if (DECIDES_BAR[trigger] && n(st.score) >= th.stage_cta && n(answers.cta_ok && answers.cta_ok.noul) >= th.cta_ok) {
    matched.push(6);
    put('slot-bar', 6, n(st.score) >= th.stage_contact ? 'ct-contact' : 'ct-diagnostic', 'strong', true);
  }

  if (!matched.length) matched.push(7);
  return done();
}

module.exports = { applyRules, topConcern, cardSlots };
