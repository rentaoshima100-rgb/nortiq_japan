// 推薦アルゴリズムの特徴量と事前分布（設計書7章「3. 特徴量」「4. モデル」）のテスト。
const test = require('node:test');
const assert = require('node:assert');
const { useFixtures, answers } = require('./__fixtures__/setup');
const data = require('./data');
const { FEATURES, featureVector, priorModel, weightKeys, cardKey, cardInfo, relLogit, linearScore } = require('./features');

const ARTICLE = '/article-website-renewal-unexpected-additional-cost';
const at = (x, name) => x[FEATURES.indexOf(name)];
const card = (id, industry) => cardInfo(data.getBlock(id), industry);

test.beforeEach(() => { useFixtures(); });

test('FEATURES: 共有の重みは切片を含めて10個。並びは固定', () => {
  assert.deepStrictEqual(FEATURES, ['bias', 'rel', 'dv', 'cov', 'ind_match', 'need_match', 'stage_goal', 'slot_end', 'slot_next', 'revisit']);
});

test('rel: 関連度のロジット。±4 で打ち切る（0・1・範囲外・欠損でも無限大にならない）', () => {
  assert.strictEqual(relLogit(0.5), 0);
  assert.ok(Math.abs(relLogit(0.7) - Math.log(0.7 / 0.3)) < 1e-12);
  assert.strictEqual(relLogit(0.999), 4);
  assert.strictEqual(relLogit(1), 4);
  assert.strictEqual(relLogit(0.001), -4);
  assert.strictEqual(relLogit(0), -4);
  assert.strictEqual(relLogit(null), -4);
  assert.strictEqual(relLogit(NaN), -4);
  // 打ち切り幅は引数でも渡せる
  assert.strictEqual(relLogit(0.999, 2), 2);
  const x = featureVector({ rel: 0.9999, card: card('sg-web'), answers: answers(), slot: 'slot-mid', currentUrl: ARTICLE });
  assert.strictEqual(at(x, 'rel'), 4);
  assert.strictEqual(at(x, 'bias'), 1);
});

test('cardInfo: タグとページ群は、ブロックではなく提案先のページ（catalog）から引く', () => {
  assert.deepStrictEqual(card('sg-web'), {
    block_id: 'sg-web', industry: null, target_url: '/web', type: 'service',
    industry_tags: [], need_tags: ['新規サイト制作', 'サイトリニューアル'], goal_proximity: 0,
  });
  // 業種版に切り替わると、行き先もタグも変わる
  const realty = card('sg-works', '不動産');
  assert.strictEqual(realty.target_url, '/works-realty');
  assert.deepStrictEqual(realty.industry_tags, ['不動産']);
  assert.strictEqual(card('sg-works').target_url, '/works');
  // 行き先が無い（業種が決まっていない sg-solution）
  assert.strictEqual(card('sg-solution'), null);
  assert.strictEqual(card('sg-solution', 'クリニック・医療').type, 'solution');
});

test('ind_match / need_match: Jev の選択が提案先ページのタグに在れば 1', () => {
  const a = answers({ ind: ['不動産', 0.8], need: ['サイトリニューアル', 0.7] });
  const web = featureVector({ rel: 0.6, card: card('sg-web'), answers: a, slot: 'slot-mid', currentUrl: ARTICLE });
  assert.strictEqual(at(web, 'need_match'), 1);
  assert.strictEqual(at(web, 'ind_match'), 0);
  const works = featureVector({ rel: 0.6, card: card('sg-works', '不動産'), answers: a, slot: 'slot-mid', currentUrl: ARTICLE });
  assert.strictEqual(at(works, 'ind_match'), 1);
  assert.strictEqual(at(works, 'need_match'), 0);
  // 「不明・その他」や other はどのページのタグにも無い
  const unknown = featureVector({ rel: 0.6, card: card('sg-works', '不動産'), answers: answers(), slot: 'slot-mid', currentUrl: ARTICLE });
  assert.strictEqual(at(unknown, 'ind_match'), 0);
  assert.strictEqual(at(unknown, 'need_match'), 0);
});

test('stage_goal: 検討度（0〜1）× ゴールへの近さ。近さはブロックの値、無ければページ群の既定値', () => {
  // /pricing は trust → 既定 0.5
  const pricing = card('sg-pricing');
  assert.strictEqual(pricing.goal_proximity, 0.5);
  const x = featureVector({ rel: 0.6, card: pricing, answers: answers({ stage: 2.4 }), slot: 'slot-mid', currentUrl: ARTICLE });
  assert.strictEqual(at(x, 'stage_goal'), 0.4);
  // service は既定 0 → 検討度が高くても 0
  const web = featureVector({ rel: 0.6, card: card('sg-web'), answers: answers({ stage: 3 }), slot: 'slot-mid', currentUrl: ARTICLE });
  assert.strictEqual(at(web, 'stage_goal'), 0);
  // ブロックに goal_proximity が書いてあれば、そちらが優先
  useFixtures((blocks) => { blocks.find((b) => b.block_id === 'sg-web').goal_proximity = 1; });
  const web1 = featureVector({ rel: 0.6, card: card('sg-web'), answers: answers({ stage: 3 }), slot: 'slot-mid', currentUrl: ARTICLE });
  assert.strictEqual(at(web1, 'stage_goal'), 1);
  // 検討度が取れていなければ 0。範囲外は 0〜1 に収める
  const none = featureVector({ rel: 0.6, card: card('sg-web'), answers: {}, slot: 'slot-mid', currentUrl: ARTICLE });
  assert.strictEqual(at(none, 'stage_goal'), 0);
  const over = featureVector({ rel: 0.6, card: card('sg-web'), answers: answers({ stage: 9 }), slot: 'slot-mid', currentUrl: ARTICLE });
  assert.strictEqual(at(over, 'stage_goal'), 1);
});

test('slot_end / slot_next / revisit: slot-mid を基準にした 0/1', () => {
  const base = { rel: 0.6, card: card('sg-web'), answers: answers(), currentUrl: ARTICLE };
  const pickSlots = (x) => [at(x, 'slot_end'), at(x, 'slot_next'), at(x, 'revisit')];
  assert.deepStrictEqual(pickSlots(featureVector({ ...base, slot: 'slot-mid' })), [0, 0, 0]);
  assert.deepStrictEqual(pickSlots(featureVector({ ...base, slot: 'slot-end' })), [1, 0, 0]);
  assert.deepStrictEqual(pickSlots(featureVector({ ...base, slot: 'slot-next', revisit: true })), [0, 1, 1]);
});

test('dv / cov: aux に無ければ 0。在れば V(提案先) − V(現在) と、遷移の対数比', () => {
  const base = { rel: 0.6, card: card('sg-pricing'), answers: answers(), slot: 'slot-mid', currentUrl: ARTICLE };
  const none = featureVector(base);
  assert.strictEqual(at(none, 'dv'), 0);
  assert.strictEqual(at(none, 'cov'), 0);

  const aux = { V: { '/pricing': 0.12, [ARTICLE]: 0.02 }, cov: { [ARTICLE]: { '/pricing': 1.3, '/web': -0.4 } } };
  const x = featureVector({ ...base, aux });
  assert.strictEqual(at(x, 'dv'), 0.1);
  assert.strictEqual(at(x, 'cov'), 1.3);

  // URL ごとの V が無ければ、ページ群の値（V_type）で代用する。新着の記事は catalog にも無い
  const byType = featureVector({ ...base, currentUrl: '/article-brand-new', aux: { V: { '/pricing': 0.12 }, V_type: { article: 0.03 } } });
  assert.strictEqual(at(byType, 'dv'), 0.09);
  // 片方しか無ければ 0（差が作れない）
  assert.strictEqual(at(featureVector({ ...base, aux: { V: { '/pricing': 0.12 } } }), 'dv'), 0);
  // 壊れた値は読まない。大きすぎる値は打ち切る
  assert.strictEqual(at(featureVector({ ...base, aux: { V: 'x', cov: { [ARTICLE]: { '/pricing': 'big' } } } }), 'cov'), 0);
  assert.strictEqual(at(featureVector({ ...base, aux: { cov: { [ARTICLE]: { '/pricing': 99 } } } }), 'cov'), 4);
});

test('featureVector: 長さは FEATURES と同じで、すべて有限の数値（引数が欠けていても）', () => {
  for (const args of [undefined, {}, { rel: 'x', card: null, answers: null }]) {
    const x = featureVector(args);
    assert.strictEqual(x.length, FEATURES.length);
    assert.ok(x.every((v) => Number.isFinite(v)));
  }
});

test('priorModel: 平均は bias −3.5・rel 0.5・ほか 0。標準偏差は共有 0.5・カード別 0.35', () => {
  const ids = data.selectableCardIds();
  // fixture の selectable なカードは7枚（未承認の sg-dx も数える。sg-guidebook は数えない）
  assert.deepStrictEqual(ids, ['sg-web', 'sg-pricing', 'sg-dx', 'sg-chatbot', 'sg-solution', 'sg-works', 'sg-recruit']);
  const m = priorModel();
  assert.deepStrictEqual(Object.keys(m.mean), weightKeys());
  assert.strictEqual(Object.keys(m.mean).length, 10 + ids.length);
  assert.strictEqual(m.mean.bias, -3.5);
  assert.strictEqual(m.mean.rel, 0.5);
  for (const k of Object.keys(m.mean)) if (k !== 'bias' && k !== 'rel') assert.strictEqual(m.mean[k], 0, k);
  for (const k of FEATURES) assert.ok(Math.abs(m.variance[k] - 0.25) < 1e-12, k);
  for (const id of ids) assert.ok(Math.abs(m.variance[cardKey(id)] - 0.1225) < 1e-12, id);
  // カードを指定すれば、その分だけ
  assert.deepStrictEqual(Object.keys(priorModel(['sg-web']).mean), [...FEATURES, 'card:sg-web']);
});

test('priorModel: 本物の data/blocks.json では 10 ＋ 13 ＝ 23 個', () => {
  data.__resetForTest();
  assert.strictEqual(Object.keys(priorModel().mean).length, 23);
});

test('linearScore: Σ w·x ＋ カード別の補正。無い重みは 0 とみなす', () => {
  const x = featureVector({ rel: 0.5, card: card('sg-web'), answers: answers(), slot: 'slot-mid', currentUrl: ARTICLE });
  const m = priorModel();
  assert.strictEqual(linearScore(m.mean, x, 'sg-web'), -3.5);
  assert.strictEqual(linearScore(Object.assign({}, m.mean, { 'card:sg-web': 0.25 }), x, 'sg-web'), -3.25);
  assert.strictEqual(linearScore({}, x, 'sg-web'), 0);
});
