// 出し分けルール（設計書6章の表 ＋ コントラクト 6.3）のテスト。
// 行5のカードは推薦アルゴリズムが選ぶ。ここでは picks を手で書いて、配置と文言の決め方だけを見る
// （recommend() とつないだ確認は、このファイルの末尾と suggest.test.js）。
const test = require('node:test');
const assert = require('node:assert');
const { useFixtures, answers, picks, fixedRng } = require('./__fixtures__/setup');
const { applyRules, cardSlots } = require('./rules');
const { recommend } = require('./recommend');

const ARTICLE = '/article-website-renewal-unexpected-additional-cost';
const P = 0.9625; // picks() が付ける既定の選択確率

test.beforeEach(() => { useFixtures(); });

test('行1: answers が無ければデフォルト（picks が在っても）', () => {
  const r = applyRules({ answers: null, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web' }) });
  assert.deepStrictEqual(r.slots, {});
  assert.strictEqual(r.is_default, true);
  assert.deepStrictEqual(r.matched, [1]);
});

test('行2: 営業・売り込み ≥0.6 は何も変えない（行5・6の条件を満たしていても）', () => {
  const a = answers({ vt: ['営業・売り込み', 0.6], stage: 3, cta: 0.9 });
  const r = applyRules({ answers: a, trigger: 'T2', currentUrl: '/pricing', picks: picks({ 'slot-next': 'sg-web' }) });
  assert.deepStrictEqual(r.slots, {});
  assert.strictEqual(r.is_default, true);
  assert.deepStrictEqual(r.matched, [2]);
});

test('行2: 確信度がしきい値未満なら当たらない', () => {
  const a = answers({ vt: ['営業・売り込み', 0.59] });
  const r = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web' }) });
  assert.deepStrictEqual(r.matched, [5]);
  assert.strictEqual(r.slots['slot-mid'].block_id, 'sg-web');
});

test('行3: 求職者・学生 → T1 は slot-mid、T2 は slot-next に sg-recruit（選択確率は付かない）', () => {
  const a = answers({ vt: ['求職者・学生', 0.7], stage: 3, cta: 0.9 });
  const t1 = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web' }) });
  assert.deepStrictEqual(t1.slots, { 'slot-mid': { block_id: 'sg-recruit', variant: 'default' } });
  assert.deepStrictEqual(t1.matched, [3]);
  const t2 = applyRules({ answers: a, trigger: 'T2', currentUrl: '/web', picks: picks({ 'slot-next': 'sg-web' }) });
  assert.deepStrictEqual(t2.slots, { 'slot-next': { block_id: 'sg-recruit', variant: 'default' } });
});

test('行3: いま /recruit を見ているなら sg-recruit は出さない', () => {
  const a = answers({ vt: ['求職者・学生', 0.9] });
  const r = applyRules({ answers: a, trigger: 'T2', currentUrl: '/recruit' });
  assert.deepStrictEqual(r.slots, {});
  assert.strictEqual(r.skipped[0].reason, 'same_page');
});

test('行3: すでに /recruit を読んだあとなら sg-recruit は出さない', () => {
  const a = answers({ vt: ['求職者・学生', 0.9] });
  const r = applyRules({ answers: a, trigger: 'T2', currentUrl: '/staff', viewedUrls: ['/recruit'] });
  assert.deepStrictEqual(r.slots, {});
  assert.strictEqual(r.skipped[0].reason, 'viewed');
  // 読んでいなければ従来どおり出る（viewedUrls に別のページが入っていても）
  const r2 = applyRules({ answers: a, trigger: 'T2', currentUrl: '/staff', viewedUrls: ['/web'] });
  assert.strictEqual(r2.slots['slot-next'].block_id, 'sg-recruit');
});

test('行4: 同業者・学習者 → T1 の slot-mid に rl-related。T2 は何も変えない', () => {
  const a = answers({ vt: ['同業者・学習者', 0.8], stage: 3, cta: 0.9 });
  const t1 = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web' }) });
  assert.deepStrictEqual(t1.slots, { 'slot-mid': { block_id: 'rl-related', variant: 'default' } });
  const t2 = applyRules({ answers: a, trigger: 'T2', currentUrl: '/web', picks: picks({ 'slot-next': 'sg-web' }) });
  assert.deepStrictEqual(t2.slots, {});
  assert.deepStrictEqual(t2.matched, [4]);
});

test('行5: 1枚目を T1 は slot-mid に。不安が無ければ default。選択確率（propensity）を付けて返す', () => {
  const r = applyRules({ answers: answers(), trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': ['sg-web', 0.9625] }) });
  assert.deepStrictEqual(r.slots, { 'slot-mid': { block_id: 'sg-web', variant: 'default', propensity: 0.9625 } });
  assert.strictEqual(r.is_default, false);
  assert.deepStrictEqual(r.matched, [5]);
});

test('行5: picks が空（関連度がしきい値未満）ならデフォルト（行7）', () => {
  for (const p of [undefined, null, {}, { 'slot-end': { block_id: 'sg-web', propensity: 1 } }]) {
    const r = applyRules({ answers: answers(), trigger: 'T1', currentUrl: ARTICLE, picks: p });
    assert.deepStrictEqual(r.slots, {});
    assert.deepStrictEqual(r.matched, [7]);
  }
});

test('行5: 最大の不安（≥0.6）の variant がカードに在ればそれを使う', () => {
  const a = answers({ concerns: { cost: 0.8, trust: 0.65 } });
  const r = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web' }) });
  assert.deepStrictEqual(r.slots, { 'slot-mid': { block_id: 'sg-web', variant: 'cost', propensity: P } });
});

test('行5 slot-end (a): 1枚目にその不安の variant が無ければ、2枚目より先に rs-<不安>', () => {
  const a = answers({ concerns: { cost: 0.61, trust: 0.9 } });
  const r = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web', 'slot-end': 'sg-pricing' }) });
  assert.deepStrictEqual(r.slots, {
    'slot-mid': { block_id: 'sg-web', variant: 'default', propensity: P },
    'slot-end': { block_id: 'rs-trust', variant: 'default' },
  });
});

test('行5 slot-end (b): 不安が無い／1枚目が不安に答えているなら、推薦アルゴリズムの2枚目', () => {
  const calm = applyRules({ answers: answers(), trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web', 'slot-end': ['sg-pricing', 0.31] }) });
  assert.deepStrictEqual(calm.slots, {
    'slot-mid': { block_id: 'sg-web', variant: 'default', propensity: P },
    'slot-end': { block_id: 'sg-pricing', variant: 'default', propensity: 0.31 },
  });
  // 1枚目が cost の文言で答えている → 2枚目は default（同じ不安の話を2回並べない）
  useFixtures((blocks) => { blocks.find((b) => b.block_id === 'sg-pricing').variants.cost = { eyebrow: 'e', title: 't', body: 'b', cta: '見る' }; });
  const cost = applyRules({ answers: answers({ concerns: { cost: 0.8 } }), trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web', 'slot-end': 'sg-pricing' }) });
  assert.strictEqual(cost.slots['slot-mid'].variant, 'cost');
  assert.deepStrictEqual(cost.slots['slot-end'], { block_id: 'sg-pricing', variant: 'default', propensity: P });
});

test('行5 slot-end (b): 不安解消ブロックが未承認で置けないときも、2枚目に回す', () => {
  const a = answers({ concerns: { schedule: 0.9 } });
  const r = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-pricing', 'slot-end': 'sg-web' }) });
  assert.deepStrictEqual(r.slots, {
    'slot-mid': { block_id: 'sg-pricing', variant: 'default', propensity: P },
    'slot-end': { block_id: 'sg-web', variant: 'default', propensity: P },
  });
  assert.deepStrictEqual(r.skipped.map((s) => [s.block_id, s.reason]), [['rs-schedule', 'unapproved']]);
});

test('行5 slot-end (c): 2枚目の候補が無ければ変えない', () => {
  const r = applyRules({ answers: answers(), trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web' }) });
  assert.deepStrictEqual(Object.keys(r.slots), ['slot-mid']);
  // 未承認の rs も、2枚目も無い
  const a = answers({ concerns: { schedule: 0.9 } });
  const r2 = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-pricing' }) });
  assert.deepStrictEqual(Object.keys(r2.slots), ['slot-mid']);
});

test('行5: 不安が 0.6 未満なら variant も slot-end の rs も変えない', () => {
  const a = answers({ concerns: { cost: 0.59 } });
  const r = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-web' }) });
  assert.deepStrictEqual(r.slots, { 'slot-mid': { block_id: 'sg-web', variant: 'default', propensity: P } });
});

test('行5: T2 は slot-next に入れ、slot-end は触らない', () => {
  const a = answers({ concerns: { trust: 0.9 } });
  const r = applyRules({ answers: a, trigger: 'T2', currentUrl: '/pricing', picks: picks({ 'slot-next': 'sg-web', 'slot-end': 'sg-recruit' }) });
  assert.deepStrictEqual(r.slots, { 'slot-next': { block_id: 'sg-web', variant: 'default', propensity: P } });
});

test('行5: 1枚目が置けなければ slot-end も変えない（現在のページを指すカード）', () => {
  const r = applyRules({ answers: answers({ concerns: { trust: 0.9 } }), trigger: 'T1', currentUrl: '/pricing', picks: picks({ 'slot-mid': 'sg-pricing', 'slot-end': 'sg-web' }) });
  assert.deepStrictEqual(r.slots, {});
  assert.strictEqual(r.is_default, true);
  assert.deepStrictEqual(r.matched, [5]);
  assert.strictEqual(r.skipped[0].reason, 'same_page');
});

test('未承認: ブロック単位で未承認のカードは、picks に入っていても採用しない', () => {
  const r = applyRules({ answers: answers(), trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-dx' }) });
  assert.deepStrictEqual(r.slots, {});
  assert.strictEqual(r.skipped[0].reason, 'unapproved');
});

test('未承認: variant 単位の承認。承認済みの default は出し、未承認の trust には切り替えない', () => {
  const a = answers({ concerns: { trust: 0.9 } });
  const r = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-chatbot' }) });
  assert.deepStrictEqual(r.slots['slot-mid'], { block_id: 'sg-chatbot', variant: 'default', propensity: P });
  // カードが trust の文言を出せていないので、slot-end で補う
  assert.deepStrictEqual(r.slots['slot-end'], { block_id: 'rs-trust', variant: 'default' });
});

test('未承認: 承認が1つも無ければ、どんな回答・picks でも結果はデフォルト', () => {
  useFixtures((blocks) => {
    for (const b of blocks) {
      b.approved_by = '';
      for (const v of Object.values(b.variants || {})) delete v.approved_by;
    }
  });
  const cases = [
    answers({ vt: ['求職者・学生', 0.9] }),
    answers({ vt: ['同業者・学習者', 0.9] }),
    answers({ concerns: { cost: 0.9 }, stage: 3, cta: 0.9 }),
    answers({ ind: ['不動産', 0.9], stage: 2.2, cta: 0.9 }),
  ];
  for (const a of cases) {
    for (const trigger of ['T1', 'T2', 'T3']) {
      const p = picks({ 'slot-mid': 'sg-web', 'slot-end': 'sg-works', 'slot-next': 'sg-works' });
      const r = applyRules({ answers: a, trigger, currentUrl: ARTICLE, picks: p });
      assert.deepStrictEqual(r.slots, {});
      assert.strictEqual(r.is_default, true);
    }
  }
});

test('候補に出していないブロック（selectable:false / rs- / ct- / 未知のID）は、picks に入っていても採らない', () => {
  for (const id of ['sg-guidebook', 'rs-cost', 'ct-contact', 'sg-unknown']) {
    const r = applyRules({ answers: answers(), trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': id }) });
    assert.deepStrictEqual(r.slots, {}, id);
    assert.ok(['not_selectable', 'unknown_block'].includes(r.skipped[0].reason), id);
  }
});

test('by_industry: 業種 ≥0.6 で by_industry に在れば業種版（industry キー付き）', () => {
  const a = answers({ ind: ['不動産', 0.6] });
  const r = applyRules({ answers: a, trigger: 'T2', currentUrl: '/web', picks: picks({ 'slot-next': 'sg-works' }) });
  assert.deepStrictEqual(r.slots, { 'slot-next': { block_id: 'sg-works', variant: 'default', industry: '不動産', propensity: P } });
});

test('by_industry: 業種版に不安の variant が在ればそれを使う', () => {
  const a = answers({ ind: ['不動産', 0.8], concerns: { trust: 0.7 } });
  const r = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-works' }) });
  assert.deepStrictEqual(r.slots, { 'slot-mid': { block_id: 'sg-works', variant: 'trust', industry: '不動産', propensity: P } });
});

test('by_industry: 業種の確信度が足りない／by_industry に無い → sg-works はトップレベル', () => {
  const low = applyRules({ answers: answers({ ind: ['不動産', 0.59] }), trigger: 'T2', currentUrl: '/web', picks: picks({ 'slot-next': 'sg-works' }) });
  assert.deepStrictEqual(low.slots, { 'slot-next': { block_id: 'sg-works', variant: 'default', propensity: P } });
  const none = applyRules({ answers: answers({ ind: ['人材', 0.9] }), trigger: 'T2', currentUrl: '/web', picks: picks({ 'slot-next': 'sg-works' }) });
  assert.deepStrictEqual(none.slots, { 'slot-next': { block_id: 'sg-works', variant: 'default', propensity: P } });
});

test('by_industry: sg-solution は業種が決まらなければ不採用、決まれば業種版', () => {
  const no = applyRules({ answers: answers({ ind: ['不明・その他', 0.9] }), trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-solution' }) });
  assert.deepStrictEqual(no.slots, {});
  assert.strictEqual(no.skipped[0].reason, 'no_industry');
  const yes = applyRules({ answers: answers({ ind: ['クリニック・医療', 0.75] }), trigger: 'T1', currentUrl: ARTICLE, picks: picks({ 'slot-mid': 'sg-solution' }) });
  assert.deepStrictEqual(yes.slots, { 'slot-mid': { block_id: 'sg-solution', variant: 'default', industry: 'クリニック・医療', propensity: P } });
});

test('by_industry: 業種版の行き先がいま見ているページなら採用しない', () => {
  const a = answers({ ind: ['不動産', 0.9] });
  const r = applyRules({ answers: a, trigger: 'T2', currentUrl: '/works-realty', picks: picks({ 'slot-next': 'sg-works' }) });
  assert.deepStrictEqual(r.slots, {});
  assert.strictEqual(r.skipped[0].reason, 'same_page');
});

test('行6: stage ≥2.0 かつ cta_ok ≥0.7 → slot-bar を strong に。2.5 未満は ct-diagnostic', () => {
  const r = applyRules({ answers: answers({ stage: 2.0, cta: 0.7 }), trigger: 'T2', currentUrl: '/web' });
  assert.deepStrictEqual(r.slots, { 'slot-bar': { block_id: 'ct-diagnostic', variant: 'strong' } });
  assert.deepStrictEqual(r.matched, [6]);
});

test('行6: stage ≥2.5 は ct-contact', () => {
  const r = applyRules({ answers: answers({ stage: 2.5, cta: 0.9 }), trigger: 'T2', currentUrl: '/web' });
  assert.deepStrictEqual(r.slots, { 'slot-bar': { block_id: 'ct-contact', variant: 'strong' } });
});

test('行6: どちらかがしきい値未満なら変えない', () => {
  assert.deepStrictEqual(applyRules({ answers: answers({ stage: 1.99, cta: 0.9 }), trigger: 'T2', currentUrl: '/web' }).slots, {});
  assert.deepStrictEqual(applyRules({ answers: answers({ stage: 3, cta: 0.69 }), trigger: 'T2', currentUrl: '/web' }).slots, {});
});

test('行6: T1 は slot-bar を決めない。T3 は slot-bar だけを決める', () => {
  const a = answers({ stage: 3, cta: 0.9 });
  const p = picks({ 'slot-mid': 'sg-web', 'slot-next': 'sg-web' });
  const t1 = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: p });
  assert.deepStrictEqual(Object.keys(t1.slots), ['slot-mid']);
  const t3 = applyRules({ answers: a, trigger: 'T3', currentUrl: ARTICLE, picks: p });
  assert.deepStrictEqual(t3.slots, { 'slot-bar': { block_id: 'ct-contact', variant: 'strong' } });
});

test('行6: strong が未承認なら weak に落とさず不採用', () => {
  useFixtures((blocks) => {
    const b = blocks.find((x) => x.block_id === 'ct-diagnostic');
    b.approved_by = '';
    b.variants.weak.approved_by = 'tester';
  });
  const r = applyRules({ answers: answers({ stage: 2.2, cta: 0.9 }), trigger: 'T2', currentUrl: '/web' });
  assert.deepStrictEqual(r.slots, {});
  assert.strictEqual(r.skipped[0].reason, 'unapproved');
});

test('行6: いま /diagnostic を見ているなら ct-diagnostic は出さない', () => {
  const r = applyRules({ answers: answers({ stage: 2.2, cta: 0.9 }), trigger: 'T2', currentUrl: '/diagnostic' });
  assert.deepStrictEqual(r.slots, {});
});

test('同時成立: 行5と行6は同じ応答に両方入る', () => {
  const a = answers({ vt: ['発注検討中の事業者', 0.8], stage: 2.7, cta: 0.8, concerns: { cost: 0.7 } });
  const r = applyRules({ answers: a, trigger: 'T2', currentUrl: '/web', picks: picks({ 'slot-next': 'sg-pricing' }) });
  assert.deepStrictEqual(r.slots, {
    'slot-next': { block_id: 'sg-pricing', variant: 'default', propensity: P },
    'slot-bar': { block_id: 'ct-contact', variant: 'strong' },
  });
  assert.deepStrictEqual(r.matched, [5, 6]);
  assert.strictEqual(r.is_default, false);
});

test('欠けた answers・壊れた値・壊れた picks でも例外を出さずデフォルトに倒れる', () => {
  const broken = [{}, { visitor_type: null }, { stage: { score: 'x' }, cta_ok: { noul: null } }];
  const badPicks = [undefined, 'x', { 'slot-next': null }, { 'slot-next': { block_id: 42 } }, { 'slot-next': { propensity: 1 } }];
  for (const a of broken) {
    for (const p of badPicks) {
      const r = applyRules({ answers: a, trigger: 'T2', currentUrl: '/web', picks: p });
      assert.deepStrictEqual(r.slots, {});
      assert.strictEqual(r.is_default, true);
    }
  }
  // 選択確率が数値でなければ、カードは出すが propensity は付けない
  const r = applyRules({ answers: answers(), trigger: 'T2', currentUrl: '/', picks: { 'slot-next': { block_id: 'sg-web', propensity: 'high' } } });
  assert.deepStrictEqual(r.slots, { 'slot-next': { block_id: 'sg-web', variant: 'default' } });
});

test('純関数: 同じ入力なら同じ結果で、入力を書き換えない', () => {
  const a = answers({ concerns: { cost: 0.8 }, stage: 2.2, cta: 0.9 });
  const p = picks({ 'slot-next': 'sg-web' });
  const before = JSON.stringify([a, p]);
  const r1 = applyRules({ answers: a, trigger: 'T2', currentUrl: '/pricing', picks: p });
  const r2 = applyRules({ answers: a, trigger: 'T2', currentUrl: '/pricing', picks: p });
  assert.deepStrictEqual(r1, r2);
  assert.strictEqual(JSON.stringify([a, p]), before);
});

test('cardSlots: T1 は slot-mid と slot-end、T2 は slot-next、T3 と不明なトリガーは無し', () => {
  assert.deepStrictEqual(cardSlots('T1'), ['slot-mid', 'slot-end']);
  assert.deepStrictEqual(cardSlots('T2'), ['slot-next']);
  assert.deepStrictEqual(cardSlots('T3'), []);
  assert.deepStrictEqual(cardSlots('constructor'), []);
});

test('recommend → applyRules: 関連度からスロットまで通す（T1 で2枚、選択確率つき）', () => {
  const a = answers({ rel: { 'sg-web': 0.9, 'sg-chatbot': 0.8, 'sg-pricing': 0.6 }, concerns: { cost: 0.7 } });
  const rec = recommend({ answers: a, candidates: ['sg-web', 'sg-chatbot', 'sg-pricing'], slots: cardSlots('T1'), currentUrl: ARTICLE, rng: fixedRng([0.5]) });
  const r = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: rec.picks });
  assert.deepStrictEqual(r.slots, {
    'slot-mid': { block_id: 'sg-web', variant: 'cost', propensity: rec.picks['slot-mid'].propensity },
    'slot-end': { block_id: 'sg-pricing', variant: 'default', propensity: rec.picks['slot-end'].propensity },
  });
  // 関連度がどれもしきい値未満なら、ルールまで来てもデフォルト
  const low = answers({ rel: { 'sg-web': 0.5, 'sg-pricing': 0.4 } });
  const rec2 = recommend({ answers: low, candidates: ['sg-web', 'sg-pricing'], slots: cardSlots('T1'), currentUrl: ARTICLE, rng: fixedRng([0.5]) });
  assert.deepStrictEqual(applyRules({ answers: low, trigger: 'T1', currentUrl: ARTICLE, picks: rec2.picks }).matched, [7]);
});

test('recommend → applyRules: 2枚目の候補が rel_gate に届かなければ slot-end は変えない（6.3 の (c)）', () => {
  // 1枚目（sg-web）と同じページ群の sg-chatbot を除くと、残るのは関連度 0.36 の sg-pricing だけ
  const a = answers({ rel: { 'sg-web': 0.9, 'sg-chatbot': 0.8, 'sg-pricing': 0.36 } });
  const rec = recommend({ answers: a, candidates: ['sg-web', 'sg-chatbot', 'sg-pricing'], slots: cardSlots('T1'), currentUrl: ARTICLE, rng: fixedRng([0.5]) });
  const r = applyRules({ answers: a, trigger: 'T1', currentUrl: ARTICLE, picks: rec.picks });
  assert.deepStrictEqual(r.slots, { 'slot-mid': { block_id: 'sg-web', variant: 'default', propensity: rec.picks['slot-mid'].propensity } });
  assert.deepStrictEqual(r.matched, [5]);
  assert.deepStrictEqual(r.skipped, []);
});
