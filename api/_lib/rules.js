// 次ページ提案（nq）— 出し分けルール（設計書6章の表 ＋ コントラクト 6.3 ＋ 2026-09-21 決定 2章・5章）。
//
//   applyRules({ answers, trigger, currentUrl, viewedUrls, picks, relatedCandidates }) -> { slots, is_default, matched, skipped }
//
// モデルが返すのは選択と確率だけ。何を表示するかはここで決める。
// 行5のカードは推薦アルゴリズム（recommend.js）が選ぶ。picks はその結果
// （{ [slot]: { block_id, propensity } }）で、ここではスロットへの配置と文言（variant）を決める。
// 関連度のしきい値（rel_gate / rel_floor）は recommend.js の側で見ているので、picks が空なら
// 行5には当たらない。
// 純関数（同じ answers・trigger・currentUrl・viewedUrls・picks と同じ data/*.json なら同じ結果）。
// しきい値は data/nq-rules.json。変えたら eval/ の評価セットで確認し直すこと。
//
// 訪問者タイプは5ラベル（事業者／同業者・学習者／求職者・学生／営業・売り込み／other）。
// 行2〜4が見るのは後ろの3つで、事業者と other は行5以降に進む。
//
// 行1（ホールドアウト・bot・エラー・タイムアウト）は呼び出し側で片づく。ここには answers が
// 無い場合の受け皿だけ置く。
//
// 関連記事（rl-related）を出す場面では、質問した関連候補（rel_article_<slug>）の関連度が高い順に3本を
// slot の related に入れる（設計書13章。クライアントは決定に related があればそれを使う）。
// relatedCandidates は questions.js が質問した候補（slug の配列）。渡されなければ同じ関数で組み直す。
//
// matched は「条件に当たった行」、skipped は「当たったが採用しなかったブロックと理由」。
// どちらもログの列には無く、テストと eval/ の目視確認のために返している。

const data = require('./data');
const { CONCERNS, pickRelated, relArticleKey } = require('./questions');

const TYPE_SALES = '営業・売り込み';
const TYPE_JOB = '求職者・学生';
const TYPE_PEER = '同業者・学習者';

// トリガーごとに、カードを入れるスロットと slot-bar を決めるかどうか（設計書5章）。
// T3 は第2段階で導入。slot-bar だけを決める。
const CARD_SLOT = { T1: 'slot-mid', T2: 'slot-next', T3: null };
const DECIDES_BAR = { T1: false, T2: true, T3: true };
// 推薦アルゴリズムに選ばせるスロット（この順に1枚目・2枚目）。T1 は slot-mid と slot-end を同時に決める。
const CARD_SLOTS = { T1: ['slot-mid', 'slot-end'], T2: ['slot-next'], T3: [] };
// 関連記事の本数（設計書13章「実行時はその中から Jev が3本を選ぶ」）。
const RELATED_COUNT = 3;

const cardSlots = (trigger) => (Object.prototype.hasOwnProperty.call(CARD_SLOTS, trigger) ? CARD_SLOTS[trigger].slice() : []);

const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const fin = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const num = (o, k, d) => (o && typeof o[k] === 'number' && Number.isFinite(o[k]) ? o[k] : d);

function thresholds() {
  const t = (data.rules && data.rules.thresholds) || {};
  return {
    visitor_type: num(t, 'visitor_type', 0.6),
    concern: num(t, 'concern', 0.6),
    industry_switch: num(t, 'industry_switch', 0.6),
    // 関連記事の候補の下限。recommend.js のカードの下限と同じキー（決定 4章: 0.45）。
    rel_floor: num(t, 'rel_floor', 0.45),
  };
}

// 行6（強い CTA）の条件。data/nq-rules.json の cta（決定 2章）。
//  - mode: 'score' は stage（Score）を stage_cta / stage_contact で切る。'noul' は intent_compare / intent_contact
//    （Noul 2問）を compare / contact で切る。どちらも cta_ok が cta_ok 以上であること
//  - gate_visitor_types: visitor_type の第1候補（確信度は問わない）がこの集合に在るときだけ行6を評価する。
//    空なら無条件（段階2・3の基準値を取るときの形）。
// 旧の置き場（thresholds.stage_cta / stage_contact / cta_ok）にしか無ければそれを読む（後方互換）。
// キーが無ければ、既定は mode=score・ゲート無し・2.0 / 2.5 / 0.7 / 0.6 / 0.6。
function ctaConfig() {
  const t = (data.rules && data.rules.thresholds) || {};
  const c = (data.rules && data.rules.cta) || {};
  const gate = Array.isArray(c.gate_visitor_types) ? c.gate_visitor_types.filter((v) => typeof v === 'string' && v) : [];
  return {
    mode: c.mode === 'noul' ? 'noul' : 'score',
    gate_visitor_types: gate,
    stage_cta: num(c, 'stage_cta', num(t, 'stage_cta', 2.0)),
    stage_contact: num(c, 'stage_contact', num(t, 'stage_contact', 2.5)),
    cta_ok: num(c, 'cta_ok', num(t, 'cta_ok', 0.7)),
    compare: num(c, 'compare', 0.6),
    contact: num(c, 'contact', 0.6),
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

// 関連記事の3本を選ぶ（設計書13章）。candidates は質問した候補（slug の配列。catalog の related の並び）。
//  1. 関連度（rel_article_<slug>）が floor 以上のものを高い順（同点は候補の並びで先）に count 本まで
//  2. 足りなければ、候補の先頭から（まだ入っていないもの）で埋める。関連度が無い（聞いていない・回答なし）
//     ときは候補の先頭 count 本になる ＝ ビルド時の並び（同カテゴリ→同 need→同業種→新着）そのまま
// 候補が count 本に満たなければ在るぶんだけ返す（残りはクライアントが従来どおり埋める）。
function pickRelatedArticles(answers, candidates, floor, count) {
  const a = answers && typeof answers === 'object' ? answers : {};
  const list = (Array.isArray(candidates) ? candidates : []).filter((s) => typeof s === 'string' && s);
  const scored = list.map((slug, i) => ({ slug, i, rel: fin(a[relArticleKey(slug)] && a[relArticleKey(slug)].noul) }));
  const out = scored
    .filter((c) => c.rel != null && c.rel >= floor)
    .sort((x, y) => (y.rel - x.rel) || (x.i - y.i))
    .slice(0, count)
    .map((c) => c.slug);
  for (const c of scored) {
    if (out.length >= count) break;
    if (!out.includes(c.slug)) out.push(c.slug);
  }
  return out;
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
//  - 関連記事ブロック（kind: related）には、選んだ記事の slug を related に付ける（候補が無ければ付けない）
function resolve(blockId, wantVariant, { answers, currentUrl, viewed, th, related }, strict) {
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
  if (block.kind === 'related') {
    const picked = pickRelatedArticles(answers, related, th.rel_floor, RELATED_COUNT);
    if (picked.length) out.related = picked;
  }
  return { slot: out };
}

function applyRules({ answers, trigger, currentUrl, viewedUrls, picks, relatedCandidates } = {}) {
  const slots = {};
  const matched = [];
  const skipped = [];
  const done = () => ({ slots, is_default: Object.keys(slots).length === 0, matched, skipped });

  if (!answers || typeof answers !== 'object') { matched.push(1); return done(); }

  const th = thresholds();
  const viewedList = Array.isArray(viewedUrls) ? viewedUrls : [];
  // 関連記事の候補は、渡されなければ questions.js と同じ関数で組み直す（質問した候補と同じ集合になる）。
  const related = Array.isArray(relatedCandidates) ? relatedCandidates.slice() : pickRelated({ currentUrl, viewedUrls: viewedList });
  const ctx = { answers, currentUrl: currentUrl || null, viewed: new Set(viewedList), th, related };
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
    // 3本の並びは resolve() が関連度（rel_article_*）から決めて related に入れる。
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
  //  - ゲート: visitor_type の第1候補が cta.gate_visitor_types に在るときだけ（決定 2章。求職者や営業が
  //    会社概要・スタッフ紹介を読んで検討度が高く出ても、強い CTA は出さない）。集合が空なら無条件。
  //  - mode=score: stage ≥ stage_cta で ct-diagnostic、≥ stage_contact で ct-contact
  //  - mode=noul:  intent_contact ≥ contact で ct-contact、そうでなく intent_compare ≥ compare で ct-diagnostic
  //  - どちらも cta_ok ≥ cta_ok が要る（ct-contact は強い方の CTA なので、弱い方より条件を緩めない）
  if (DECIDES_BAR[trigger]) {
    const cta = ctaConfig();
    const gated = cta.gate_visitor_types.length > 0 && !cta.gate_visitor_types.includes(vt.choice);
    if (!gated && n(answers.cta_ok && answers.cta_ok.noul) >= cta.cta_ok) {
      let want = null;
      if (cta.mode === 'noul') {
        const contact = n(answers.intent_contact && answers.intent_contact.noul);
        const compare = n(answers.intent_compare && answers.intent_compare.noul);
        if (contact >= cta.contact) want = 'ct-contact';
        else if (compare >= cta.compare) want = 'ct-diagnostic';
      } else {
        const score = n(answers.stage && answers.stage.score);
        if (score >= cta.stage_cta) want = score >= cta.stage_contact ? 'ct-contact' : 'ct-diagnostic';
      }
      if (want) {
        matched.push(6);
        put('slot-bar', 6, want, 'strong', true);
      }
    }
  }

  if (!matched.length) matched.push(7);
  return done();
}

module.exports = { applyRules, topConcern, cardSlots, ctaConfig, pickRelatedArticles, RELATED_COUNT };
