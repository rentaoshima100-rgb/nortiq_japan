// 推薦アルゴリズム（設計書7章 ＋ コントラクト 6.4）のテスト。
const test = require('node:test');
const assert = require('node:assert');
const { useFixtures, answers, fixedRng } = require('./__fixtures__/setup');
const { FEATURES, priorModel } = require('./features');
const { recommend, policyLabel, seededRng, mergeModel } = require('./recommend');

const ARTICLE = '/article-website-renewal-unexpected-additional-cost';
const ALL = ['sg-web', 'sg-pricing', 'sg-chatbot', 'sg-solution', 'sg-works', 'sg-recruit'];
const NO_EXPLORE = () => fixedRng([0.5]); // 0.5 ≥ 0.05 なので一様探索に入らない
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);
const entry = (rec, id) => rec.candidates.find((c) => c.block_id === id);
const run = (o) => recommend(Object.assign({ candidates: ALL, slots: ['slot-mid', 'slot-end'], currentUrl: ARTICLE, rng: NO_EXPLORE() }, o));

test.beforeEach(() => { useFixtures(); });

test('データ0件: 期待値の順位は関連度の順と一致する（タグの一致や検討度があっても動かない）', () => {
  const a = answers({
    rel: { 'sg-web': 0.62, 'sg-pricing': 0.81, 'sg-chatbot': 0.44, 'sg-works': 0.7, 'sg-recruit': 0.36 },
    ind: ['不動産', 0.9], need: ['サイトリニューアル', 0.8], stage: 2.6,
  });
  for (const policy of ['prior', 'ts']) {
    const rec = run({ answers: a, policy, model: null, revisit: true });
    const ranked = rec.candidates.filter((c) => !c.excluded);
    assert.strictEqual(ranked.length, 5);
    const byScore = ranked.slice().sort((x, y) => y.score - x.score).map((c) => c.block_id);
    const byRel = ranked.slice().sort((x, y) => y.rel - x.rel).map((c) => c.block_id);
    assert.deepStrictEqual(byScore, byRel, policy);
    assert.deepStrictEqual(byRel, ['sg-pricing', 'sg-works', 'sg-web', 'sg-chatbot', 'sg-recruit']);
  }
  // 事前分布の平均で選ぶ方策は、関連度が最大のカードを選ぶ
  assert.strictEqual(run({ answers: a }).picks['slot-mid'].block_id, 'sg-pricing');
});

test('データ0件: ロジットの打ち切り（0.98 超）で得点が並んでも、関連度が高い方を選ぶ', () => {
  const a = answers({ rel: { 'sg-web': 0.985, 'sg-pricing': 0.999, 'sg-chatbot': 0.99 } });
  assert.strictEqual(run({ answers: a }).picks['slot-mid'].block_id, 'sg-pricing');
});

test('rel_gate: 最大の関連度が 0.55 未満ならデフォルト（探索もしない）', () => {
  const a = answers({ rel: { 'sg-web': 0.54, 'sg-pricing': 0.5, 'sg-chatbot': 0.4 } });
  // 必ず一様探索に入る rng を渡しても、何も選ばない
  const rec = run({ answers: a, rng: fixedRng([0]) });
  assert.deepStrictEqual(rec.picks, {});
  assert.strictEqual(rec.reason, 'below_gate');
  assert.strictEqual(rec.explored, false);
  // ログには候補と特徴量が残る（選択確率は付かない）
  assert.strictEqual(entry(rec, 'sg-web').features.length, FEATURES.length);
  assert.deepStrictEqual(entry(rec, 'sg-web').propensity, {});
  // ちょうど 0.55 は通る
  assert.strictEqual(run({ answers: answers({ rel: { 'sg-web': 0.55 } }) }).picks['slot-mid'].block_id, 'sg-web');
});

test('rel_floor: 0.35 未満は候補外。一様探索でも選ばれない', () => {
  const a = answers({ rel: { 'sg-web': 0.8, 'sg-pricing': 0.349, 'sg-chatbot': 0.35, 'sg-works': 0.1 } });
  const rec = run({ answers: a });
  assert.strictEqual(entry(rec, 'sg-pricing').excluded, 'rel_floor');
  assert.strictEqual(entry(rec, 'sg-works').excluded, 'rel_floor');
  assert.strictEqual(entry(rec, 'sg-chatbot').excluded, undefined);
  assert.strictEqual(entry(rec, 'sg-recruit').excluded, 'rel_floor'); // 回答が無いカードも同じ扱い
  assert.strictEqual(entry(rec, 'sg-recruit').rel, null);
  for (let seed = 0; seed < 300; seed++) {
    const r = run({ answers: a, rng: seededRng(seed) });
    for (const p of Object.values(r.picks)) assert.ok(['sg-web', 'sg-chatbot'].includes(p.block_id), `seed ${seed}: ${p.block_id}`);
  }
});

test('一様探索: 選択確率は厳密に 0.95·[最大か] + 0.05/候補数。合計は 1', () => {
  const a = answers({ rel: { 'sg-web': 0.8, 'sg-pricing': 0.6, 'sg-recruit': 0.5 } });
  const rec = run({ answers: a, slots: ['slot-next'] });
  assert.strictEqual(rec.policy, 'prior-v1');
  close(entry(rec, 'sg-web').propensity['slot-next'], 0.95 + 0.05 / 3);
  close(entry(rec, 'sg-pricing').propensity['slot-next'], 0.05 / 3);
  close(entry(rec, 'sg-recruit').propensity['slot-next'], 0.05 / 3);
  // 個々の値は小数6桁に丸めて記録するので、合計はその分だけずれうる
  close(rec.candidates.reduce((s, c) => s + ((c.propensity && c.propensity['slot-next']) || 0), 0), 1, 1e-5);
  assert.deepStrictEqual(rec.picks, { 'slot-next': { block_id: 'sg-web', propensity: entry(rec, 'sg-web').propensity['slot-next'] } });
  assert.strictEqual(entry(rec, 'sg-web').picked, 'slot-next');
  assert.strictEqual(policyLabel(rec), 'prior-v1');
  // 候補が1枚なら選択確率は 1
  const one = run({ answers: answers({ rel: { 'sg-web': 0.8 } }), slots: ['slot-next'], rng: fixedRng([0]) });
  assert.deepStrictEqual(one.picks, { 'slot-next': { block_id: 'sg-web', propensity: 1 } });
  assert.strictEqual(one.explored, false);
});

test('一様探索: rng が 0.05 未満なら候補から等確率で選び、explored を立てる', () => {
  const a = answers({ rel: { 'sg-web': 0.8, 'sg-pricing': 0.6, 'sg-recruit': 0.5 } });
  // 1つ目の乱数 0.01 → 探索に入る。2つ目 0.99 → 3枚のうち最後
  const rec = run({ answers: a, slots: ['slot-next'], rng: fixedRng([0.01, 0.99]) });
  assert.strictEqual(rec.picks['slot-next'].block_id, 'sg-recruit');
  assert.strictEqual(rec.picks['slot-next'].explored, true);
  close(rec.picks['slot-next'].propensity, 0.05 / 3);
  assert.strictEqual(rec.explored, true);
  assert.strictEqual(entry(rec, 'sg-recruit').explored, true);
  assert.strictEqual(policyLabel(rec), 'prior-v1+explore');
  // 探索に入る割合はおよそ 5%
  let explored = 0;
  for (let seed = 0; seed < 4000; seed++) if (run({ answers: a, slots: ['slot-next'], rng: seededRng(seed) }).explored) explored++;
  assert.ok(explored > 140 && explored < 260, `explored ${explored}/4000`);
});

test('2枚同時: 2枚目は1枚目とページ群が違う候補から。選択確率は条件つき', () => {
  // /web と /chatbot は service、/pricing は trust、/recruit は company
  const a = answers({ rel: { 'sg-web': 0.9, 'sg-chatbot': 0.8, 'sg-pricing': 0.6, 'sg-recruit': 0.4 } });
  const rec = run({ answers: a });
  assert.strictEqual(rec.picks['slot-mid'].block_id, 'sg-web');
  // 関連度2位の sg-chatbot は同じページ群なので選ばない
  assert.strictEqual(rec.picks['slot-end'].block_id, 'sg-pricing');
  close(rec.picks['slot-mid'].propensity, 0.95 + 0.05 / 4);
  close(rec.picks['slot-end'].propensity, 0.95 + 0.05 / 2);
  assert.deepStrictEqual(Object.keys(entry(rec, 'sg-chatbot').propensity), ['slot-mid']);
  assert.deepStrictEqual(Object.keys(entry(rec, 'sg-web').propensity), ['slot-mid']);
  close(entry(rec, 'sg-recruit').propensity['slot-end'], 0.05 / 2);
  // どの乱数でも、2枚のページ群は必ず違う
  const type = { 'sg-web': 'service', 'sg-chatbot': 'service', 'sg-pricing': 'trust', 'sg-recruit': 'company' };
  for (let seed = 0; seed < 300; seed++) {
    const p = run({ answers: a, rng: seededRng(seed) }).picks;
    assert.ok(p['slot-mid'] && p['slot-end'], `seed ${seed}`);
    assert.notStrictEqual(type[p['slot-mid'].block_id], type[p['slot-end'].block_id], `seed ${seed}`);
  }
});

test('2枚同時: ページ群が違う候補が無ければ1枚だけ。スロットが1つなら1枚だけ', () => {
  const a = answers({ rel: { 'sg-web': 0.9, 'sg-chatbot': 0.8 } });
  assert.deepStrictEqual(Object.keys(run({ answers: a }).picks), ['slot-mid']);
  const b = answers({ rel: { 'sg-web': 0.9, 'sg-pricing': 0.8 } });
  assert.deepStrictEqual(Object.keys(run({ answers: b, slots: ['slot-next'] }).picks), ['slot-next']);
  const none = run({ answers: b, slots: [] });
  assert.deepStrictEqual(none.picks, {});
  assert.strictEqual(none.reason, 'no_slot');
});

test('2枚目のスロットの特徴量は slot_end = 1（ログの features は1枚目のスロットでの値）', () => {
  const a = answers({ rel: { 'sg-web': 0.9, 'sg-pricing': 0.8 } });
  const rec = run({ answers: a, slots: ['slot-next'] });
  assert.strictEqual(entry(rec, 'sg-web').features[FEATURES.indexOf('slot_next')], 1);
  const t1 = run({ answers: a });
  assert.strictEqual(entry(t1, 'sg-pricing').features[FEATURES.indexOf('slot_end')], 0);
});

test('rng 固定で決定的。入力を書き換えない', () => {
  const a = answers({ rel: { 'sg-web': 0.7, 'sg-pricing': 0.65, 'sg-chatbot': 0.6, 'sg-recruit': 0.5 }, ind: ['不動産', 0.9] });
  const before = JSON.stringify(a);
  const cands = ALL.slice();
  for (const policy of ['prior', 'ts']) {
    for (const seed of [1, 7, 42]) {
      const r1 = run({ answers: a, candidates: cands, policy, rng: seededRng(seed) });
      const r2 = run({ answers: a, candidates: cands, policy, rng: seededRng(seed) });
      assert.deepStrictEqual(r1, r2, `${policy} seed ${seed}`);
    }
  }
  assert.strictEqual(JSON.stringify(a), before);
  assert.deepStrictEqual(cands, ALL);
  // 種が違えば ts の選択確率の見積もりは変わりうる（同じ乱数列を使い回していない確認）
  const p1 = run({ answers: a, policy: 'ts', rng: seededRng(1) }).candidates;
  const p2 = run({ answers: a, policy: 'ts', rng: seededRng(2) }).candidates;
  assert.notDeepStrictEqual(p1, p2);
});

test('ts: 選択確率は 0.95·頻度 + 0.05/候補数。スロットごとに合計 1 で、どの候補も 0 にならない', () => {
  const a = answers({ rel: { 'sg-web': 0.7, 'sg-pricing': 0.65, 'sg-chatbot': 0.6, 'sg-recruit': 0.5 } });
  const rec = run({ answers: a, policy: 'ts', model: null, rng: seededRng(3) });
  assert.strictEqual(rec.policy, 'ts-v1');
  for (const slot of ['slot-mid', 'slot-end']) {
    const ps = rec.candidates.map((c) => c.propensity && c.propensity[slot]).filter((p) => p != null);
    assert.ok(ps.length >= 2, slot);
    close(ps.reduce((s, p) => s + p, 0), 1, 1e-4);
    for (const p of ps) assert.ok(p >= 0.05 / ps.length - 1e-6 && p <= 1, `${slot}: ${p}`);
  }
  // 200回の抽出の頻度なので、0.95·(k/200) + 0.05/4 の形になっている
  const k = (entry(rec, 'sg-web').propensity['slot-mid'] - 0.05 / 4) / 0.95 * 200;
  close(k, Math.round(k), 1e-3);
  assert.strictEqual(rec.picks['slot-mid'].propensity, entry(rec, rec.picks['slot-mid'].block_id).propensity['slot-mid']);
});

test('ts: 学習済みの重みが順位を動かす。prior は同じモデルを渡されても重みに使わない', () => {
  const a = answers({ rel: { 'sg-web': 0.9, 'sg-pricing': 0.56 } });
  const model = mergeModel({ mean: { 'card:sg-pricing': 6 }, variance: { 'card:sg-pricing': 0.0001, rel: 0.0001, bias: 0.0001 } });
  const ts = run({ answers: a, slots: ['slot-next'], policy: 'ts', model, rng: seededRng(5) });
  assert.strictEqual(ts.picks['slot-next'].block_id, 'sg-pricing');
  assert.ok(ts.picks['slot-next'].propensity > 0.9);
  assert.ok(entry(ts, 'sg-pricing').score > entry(ts, 'sg-web').score);
  const prior = run({ answers: a, slots: ['slot-next'], policy: 'prior', model });
  assert.strictEqual(prior.picks['slot-next'].block_id, 'sg-web');
  assert.strictEqual(prior.policy, 'prior-v1');
});

test('mergeModel: モデルに無い重みと壊れた値は事前分布のまま', () => {
  const prior = priorModel();
  const m = mergeModel({ mean: { rel: 0.8, dv: 'x', 'card:sg-unknown': 1 }, variance: { rel: 0.01, bias: 0, dv: -1 } });
  assert.strictEqual(m.mean.rel, 0.8);
  assert.strictEqual(m.mean.dv, 0);
  assert.strictEqual(m.variance.rel, 0.01);
  assert.strictEqual(m.variance.bias, prior.variance.bias);
  assert.strictEqual(m.variance.dv, prior.variance.dv);
  assert.ok(!('card:sg-unknown' in m.mean));
  assert.deepStrictEqual(mergeModel(null), prior);
});

test('aux（V と cov）は特徴量に入る。prior でも特徴量としてはログに残る', () => {
  const a = answers({ rel: { 'sg-web': 0.9, 'sg-pricing': 0.6 } });
  const model = { aux: { V: { '/pricing': 0.2, [ARTICLE]: 0.05 }, cov: { [ARTICLE]: { '/pricing': 0.7 } } } };
  const rec = run({ answers: a, model });
  assert.strictEqual(entry(rec, 'sg-pricing').features[FEATURES.indexOf('dv')], 0.15);
  assert.strictEqual(entry(rec, 'sg-pricing').features[FEATURES.indexOf('cov')], 0.7);
  assert.strictEqual(entry(rec, 'sg-web').features[FEATURES.indexOf('dv')], 0);
});

test('業種で行き先が変わるカード: 業種 ≥0.6 かつ by_industry に在れば業種版の提案先', () => {
  const a = answers({ rel: { 'sg-works': 0.8, 'sg-solution': 0.7 }, ind: ['不動産', 0.6] });
  const rec = run({ answers: a });
  assert.strictEqual(entry(rec, 'sg-works').target_url, '/works-realty');
  assert.strictEqual(entry(rec, 'sg-works').industry, '不動産');
  assert.strictEqual(entry(rec, 'sg-works').features[FEATURES.indexOf('ind_match')], 1);
  assert.strictEqual(entry(rec, 'sg-solution').target_url, '/solution-realty');
  assert.deepStrictEqual(rec.picks['slot-mid'], { block_id: 'sg-works', propensity: rec.picks['slot-mid'].propensity, industry: '不動産' });
  assert.strictEqual(rec.picks['slot-end'].block_id, 'sg-solution'); // works と solution はページ群が違う
});

test('業種で行き先が変わるカード: 業種が決まらなければ sg-works はトップレベル、sg-solution は候補から外す', () => {
  for (const ind of [['不動産', 0.59], ['人材', 0.9], ['不明・その他', 0.9]]) {
    const rec = run({ answers: answers({ rel: { 'sg-works': 0.8, 'sg-solution': 0.9 }, ind }) });
    assert.strictEqual(entry(rec, 'sg-works').target_url, '/works');
    assert.strictEqual(entry(rec, 'sg-works').industry, undefined);
    assert.strictEqual(entry(rec, 'sg-solution').excluded, 'no_industry');
    assert.deepStrictEqual(rec.picks['slot-mid'], { block_id: 'sg-works', propensity: 1 });
  }
  // sg-solution しか関連が無く、業種も決まらなければデフォルト（外したカードの関連度では門を通さない）
  const only = run({ answers: answers({ rel: { 'sg-solution': 0.95, 'sg-web': 0.4 } }) });
  assert.deepStrictEqual(only.picks, {});
  assert.strictEqual(only.reason, 'below_gate');
});

test('出せないカードは候補外: 現在のページ・すでに読んだページ・未承認・カードでないブロック', () => {
  const a = answers({ rel: { 'sg-web': 0.9, 'sg-pricing': 0.8, 'sg-dx': 0.95, 'sg-works': 0.7, 'sg-guidebook': 0.99, 'rs-cost': 0.99 }, ind: ['不動産', 0.9] });
  const rec = run({
    answers: a, currentUrl: '/pricing', viewedUrls: ['/works-realty'],
    candidates: ['sg-web', 'sg-pricing', 'sg-dx', 'sg-works', 'sg-guidebook', 'rs-cost', 'sg-unknown', 'sg-web'],
  });
  assert.strictEqual(entry(rec, 'sg-pricing').excluded, 'same_page');
  assert.strictEqual(entry(rec, 'sg-works').excluded, 'viewed'); // 業種版の行き先を見たあと
  assert.strictEqual(entry(rec, 'sg-dx').excluded, 'unapproved');
  assert.strictEqual(entry(rec, 'sg-guidebook').excluded, 'not_selectable');
  assert.strictEqual(entry(rec, 'rs-cost').excluded, 'not_selectable');
  assert.strictEqual(entry(rec, 'sg-unknown').excluded, 'not_selectable');
  assert.strictEqual(rec.candidates.filter((c) => c.block_id === 'sg-web').length, 1); // 重複は1つに
  assert.deepStrictEqual(rec.picks, { 'slot-mid': { block_id: 'sg-web', propensity: 1 } });
});

test('評価用フック: includeUnapproved のときは未承認のカードも選べる', () => {
  useFixtures(null, { includeUnapproved: true });
  const rec = run({ answers: answers({ rel: { 'sg-dx': 0.9 } }), candidates: ['sg-dx'] });
  assert.strictEqual(rec.picks['slot-mid'].block_id, 'sg-dx');
});

test('壊れた入力でも例外を出さず、何も選ばない', () => {
  for (const args of [undefined, {}, { answers: null, candidates: null, slots: null }, { answers: 'x', candidates: [1, null, {}], slots: ['slot-mid'] }]) {
    const rec = recommend(args);
    assert.deepStrictEqual(rec.picks, {});
    assert.strictEqual(rec.explored, false);
  }
  assert.strictEqual(policyLabel(null), null);
});
