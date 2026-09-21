// 夜間バッチの数学のテスト。合成データだけで確かめる（外部は呼ばない。乱数は種つきで再現できる）。
const test = require('node:test');
const assert = require('node:assert');
const { useFixtures } = require('./__fixtures__/setup');
const { FEATURES, priorModel, cardKey } = require('./features');
const { seededRng } = require('./recommend');
const learn = require('./learn');

test.beforeEach(() => { useFixtures(); });

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const near = (actual, expected, tol, label) => assert.ok(Math.abs(actual - expected) <= tol, `${label || ''} ${actual} は ${expected} ± ${tol} の外`);
const F = (o = {}) => FEATURES.map((k) => (k === 'bias' ? 1 : (o[k] || 0)));
const NOW = Date.parse('2026-09-20T18:00:00Z');
const daysAgo = (d, plusSec = 0) => new Date(NOW - d * 86400000 + plusSec * 1000).toISOString();

// ---------- 1. MAP ----------

test('fitLogistic: 合成データから真の重みを回復する', () => {
  const rng = seededRng(11);
  const truth = [-1, 0.8, -0.5, 1.2];
  const rows = [];
  for (let i = 0; i < 20000; i++) {
    const x = [1, rng() * 2 - 1, rng() * 2 - 1, rng() < 0.5 ? 1 : 0];
    const z = truth.reduce((s, t, k) => s + t * x[k], 0);
    rows.push({ x, y: rng() < sigmoid(z) ? 1 : 0, weight: 1 });
  }
  // 事前分布を広くして、ほぼ最尤推定にする。
  const fit = learn.fitLogistic({ rows, priorMean: [0, 0, 0, 0], priorVar: [100, 100, 100, 100] });
  assert.strictEqual(fit.converged, true);
  assert.ok(fit.iterations < 20);
  truth.forEach((t, k) => near(fit.mean[k], t, 0.08, `w[${k}]`));
  fit.variance.forEach((v) => assert.ok(v > 0 && v < 0.01));
});

test('fitLogistic: 重みつきサンプルは、同じ行をその回数だけ並べたのと同じ結果になる', () => {
  const base = [
    { x: [1, 0.5], y: 1 }, { x: [1, -0.3], y: 0 }, { x: [1, 1.2], y: 1 }, { x: [1, -1.0], y: 0 }, { x: [1, 0.1], y: 0 },
  ];
  const weighted = base.map((r, i) => Object.assign({ weight: i === 0 ? 3 : 1 }, r));
  const repeated = base.map((r) => Object.assign({ weight: 1 }, r)).concat([0, 1].map(() => Object.assign({ weight: 1 }, base[0])));
  const prior = { priorMean: [0, 0], priorVar: [1, 1] };
  const a = learn.fitLogistic(Object.assign({ rows: weighted }, prior));
  const b = learn.fitLogistic(Object.assign({ rows: repeated }, prior));
  a.mean.forEach((m, k) => near(m, b.mean[k], 1e-9));
  a.variance.forEach((v, k) => near(v, b.variance[k], 1e-9));
});

test('fitLogistic: 完全に分離できるデータでも、事前分布があるので発散しない', () => {
  const rows = [];
  for (let i = 0; i < 50; i++) rows.push({ x: [1, i < 25 ? -1 : 1], y: i < 25 ? 0 : 1, weight: 1 });
  const fit = learn.fitLogistic({ rows, priorMean: [0, 0], priorVar: [0.25, 0.25] });
  assert.strictEqual(fit.converged, true);
  assert.ok(Number.isFinite(fit.mean[1]) && fit.mean[1] > 0.5 && fit.mean[1] < 5);
});

// 23次元の形（共有の重み ＋ カード別の補正）のままの合成データ。
function syntheticImpressions(n, seed, truth) {
  const rng = seededRng(seed);
  const ids = Object.keys(truth.cards);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const slot = rng() < 0.5 ? 'slot-mid' : (rng() < 0.5 ? 'slot-end' : 'slot-next');
    const features = F({
      rel: rng() * 4 - 2,
      dv: rng() * 0.6 - 0.3,
      cov: rng() * 2 - 1,
      ind_match: rng() < 0.3 ? 1 : 0,
      need_match: rng() < 0.4 ? 1 : 0,
      stage_goal: Math.round(rng() * 3) / 3 * (rng() < 0.5 ? 0.5 : 1),
      slot_end: slot === 'slot-end' ? 1 : 0,
      slot_next: slot === 'slot-next' ? 1 : 0,
      revisit: rng() < 0.2 ? 1 : 0,
    });
    const block_id = ids[Math.floor(rng() * ids.length)];
    const z = FEATURES.reduce((s, k, j) => s + truth.shared[k] * features[j], 0) + truth.cards[block_id];
    rows.push({ block_id, features, y: rng() < sigmoid(z) ? 1 : 0, weight: 1 });
  }
  return rows;
}

const TRUTH = {
  shared: { bias: -1.2, rel: 0.9, dv: 1.5, cov: 0.4, ind_match: 0.6, need_match: -0.3, stage_goal: 0.8, slot_end: -0.5, slot_next: 0.3, revisit: 0.5 },
  cards: { 'sg-web': 0.4, 'sg-pricing': -0.4, 'sg-dx': 0.2, 'sg-chatbot': -0.2, 'sg-solution': 0, 'sg-works': 0.3, 'sg-recruit': -0.3 },
};

test('fitModel: 共有の重みと「切片＋カード別の補正」を回復する', () => {
  const wide = priorModel();
  for (const k of Object.keys(wide.variance)) wide.variance[k] = 25;
  const fit = learn.fitModel({ rows: syntheticImpressions(30000, 7, TRUTH), prior: wide });
  assert.strictEqual(fit.converged, true);
  assert.strictEqual(fit.n_impressions, 30000);
  assert.deepStrictEqual(Object.keys(fit.mean), Object.keys(wide.mean));
  for (const k of FEATURES) if (k !== 'bias') near(fit.mean[k], TRUTH.shared[k], 0.12, k);
  // 切片とカード別の補正は、和でしか決まらない（分け方は事前分布が決める）。
  for (const id of Object.keys(TRUTH.cards)) {
    near(fit.mean.bias + fit.mean[cardKey(id)], TRUTH.shared.bias + TRUTH.cards[id], 0.15, id);
  }
});

test('fitModel: データ0件なら、平均も分散も事前分布と一致する', () => {
  const prior = priorModel();
  const fit = learn.fitModel({ rows: [], prior });
  assert.deepStrictEqual(fit.mean, prior.mean);
  assert.deepStrictEqual(fit.variance, prior.variance);
  assert.strictEqual(fit.n_impressions, 0);
  // 事前分布の重みで選ぶカードは、関連度だけで選ぶカードと同じ（特徴量が rel しか違わないとき）。
  const pool = [['sg-web', 0.6], ['sg-pricing', 0.9], ['sg-dx', 0.4]].map(([block_id, rel]) => ({
    block_id, rel, features: F({ rel: Math.log(rel / (1 - rel)) }),
  }));
  assert.strictEqual(learn.pickByWeights(pool, fit.mean), 'sg-pricing');
  assert.strictEqual(learn.pickByRel(pool), 'sg-pricing');
});

test('fitModel: サンプルが増えると分散が縮む。表示の無いカードの補正は事前分布のまま', () => {
  const truth = { shared: TRUTH.shared, cards: { 'sg-web': 0.4, 'sg-pricing': -0.4 } };
  const prior = priorModel();
  const small = learn.fitModel({ rows: syntheticImpressions(300, 3, truth), prior });
  const large = learn.fitModel({ rows: syntheticImpressions(6000, 3, truth), prior });
  for (const k of FEATURES.concat([cardKey('sg-web'), cardKey('sg-pricing')])) {
    assert.ok(small.variance[k] < prior.variance[k], `${k}: 300件で事前分布より狭い`);
    assert.ok(large.variance[k] < small.variance[k], `${k}: 6000件でさらに狭い`);
  }
  near(large.mean[cardKey('sg-dx')], 0, 1e-6);
  near(large.variance[cardKey('sg-dx')], prior.variance[cardKey('sg-dx')], 1e-6);
});

// ---------- 2. 学習行 ----------

const cand = (block_id, rel, propensity, extra) => Object.assign({ block_id, rel, target_url: '/x', features: F({ rel }), score: 0.05, propensity }, extra || {});
const decision = (id, o = {}) => Object.assign({
  decision_id: id,
  created_at: daysAgo(0),
  session_id: 'r_' + id,
  is_default: false,
  holdout: false,
  shadow: false,
  policy: 'prior-v1',
  candidates: [
    cand('sg-web', 0.9, { 'slot-mid': 0.975 }, { picked: 'slot-mid' }),
    cand('sg-pricing', 0.7, { 'slot-mid': 0.025, 'slot-end': 1 }, { picked: 'slot-end' }),
    { block_id: 'sg-dx', rel: 0.1, excluded: 'rel_floor' },
  ],
  slots: {
    'slot-mid': { block_id: 'sg-web', variant: 'default', propensity: 0.975 },
    'slot-end': { block_id: 'sg-pricing', variant: 'default', propensity: 1 },
  },
}, o);
const ev = (decision_id, type, o = {}) => Object.assign({ decision_id, session_id: 'r_' + decision_id, type, created_at: daysAgo(0, 10), slot: null, block_id: null, page_url: null }, o);
const POLICIES = ['prior-v1', 'ts-v1'];

test('buildTrainingRows: 表示されたカードごとに1行。成果は engaged、スロットの特徴量は置き直す', () => {
  const rows = learn.buildTrainingRows({
    now: NOW,
    policies: POLICIES,
    decisions: [decision('d_aaaaaaaa1')],
    events: [
      ev('d_aaaaaaaa1', 'shown', { slot: 'slot-mid', block_id: 'sg-web' }),
      ev('d_aaaaaaaa1', 'shown', { slot: 'slot-mid', block_id: 'sg-web' }), // 二重に届いても1行
      ev('d_aaaaaaaa1', 'shown', { slot: 'slot-end', block_id: 'sg-pricing' }),
      ev('d_aaaaaaaa1', 'click', { slot: 'slot-end', block_id: 'sg-pricing', created_at: daysAgo(0, 20) }),
      ev('d_aaaaaaaa1', 'engaged', { block_id: 'sg-pricing', created_at: daysAgo(0, 90) }),
    ],
  });
  assert.strictEqual(rows.length, 2);
  const mid = rows.find((r) => r.slot === 'slot-mid');
  const end = rows.find((r) => r.slot === 'slot-end');
  assert.deepStrictEqual([mid.block_id, mid.y, mid.propensity], ['sg-web', 0, 0.975]);
  assert.deepStrictEqual([end.block_id, end.y, end.propensity], ['sg-pricing', 1, 1]);
  assert.strictEqual(mid.features[FEATURES.indexOf('slot_end')], 0);
  assert.strictEqual(end.features[FEATURES.indexOf('slot_end')], 1);
  // pool は、そのスロットで選択肢だったカードだけ（落とした候補と、1枚目に使ったカードは入らない）。
  assert.deepStrictEqual(mid.pool.map((c) => c.block_id), ['sg-web', 'sg-pricing']);
  assert.deepStrictEqual(end.pool.map((c) => c.block_id), ['sg-pricing']);
  assert.strictEqual(end.pool[0].features[FEATURES.indexOf('slot_end')], 1);
  near(mid.weight, 1, 1e-9);
});

test('buildTrainingRows: ゴール到達は重み3。半減期60日で古いログほど軽くなる', () => {
  const rows = learn.buildTrainingRows({
    now: NOW,
    halfLifeDays: 60,
    goalWeight: 3,
    policies: POLICIES,
    decisions: [
      decision('d_goal00001', { created_at: daysAgo(60) }),
      decision('d_old000001', { created_at: daysAgo(120) }),
      decision('d_before001'),
    ],
    events: [
      ev('d_goal00001', 'shown', { slot: 'slot-mid', block_id: 'sg-web', created_at: daysAgo(60, 5) }),
      ev('d_goal00001', 'click', { slot: 'slot-mid', block_id: 'sg-web', created_at: daysAgo(60, 10) }),
      // クリックした先は流し読みもせず離れた（engaged なし）が、そのあとゴールに着いた → 成果。
      ev('d_goal00001', 'goal', { goal: 'diagnostic', created_at: daysAgo(60, 300) }),
      ev('d_old000001', 'shown', { slot: 'slot-mid', block_id: 'sg-web', created_at: daysAgo(120, 5) }),
      // ゴールはカードを押す前。カードの成果にはしない。
      ev('d_before001', 'goal', { goal: 'guidebook', created_at: daysAgo(0, 1) }),
      ev('d_before001', 'shown', { slot: 'slot-mid', block_id: 'sg-web', created_at: daysAgo(0, 5) }),
    ],
  });
  const by = Object.fromEntries(rows.map((r) => [r.decision_id, r]));
  assert.deepStrictEqual([by.d_goal00001.y, by.d_goal00001.goal], [1, true]);
  near(by.d_goal00001.weight, 0.5 * 3, 1e-9);
  assert.strictEqual(by.d_old000001.y, 0);
  near(by.d_old000001.weight, 0.25, 1e-9);
  assert.deepStrictEqual([by.d_before001.y, by.d_before001.goal], [0, false]);
});

test('buildTrainingRows: 学習に入れない行', () => {
  const shown = (id, block = 'sg-web') => ev(id, 'shown', { slot: 'slot-mid', block_id: block });
  const rows = learn.buildTrainingRows({
    now: NOW,
    policies: POLICIES,
    decisions: [
      decision('d_holdout01', { holdout: true, is_default: true }),
      decision('d_shadow001', { shadow: true, is_default: true }),
      decision('d_noshown01'),
      decision('d_oldpolicy', { policy: 'prior-v0+explore' }),
      // ルールが直接置いたカード（選択確率なし）は、推薦アルゴリズムの表示ではない。
      decision('d_rule00001', { slots: { 'slot-mid': { block_id: 'sg-recruit', variant: 'default' } } }),
      // slot-end は不安解消ブロックに置き換わった。2枚目のカードは表示されていない。
      decision('d_concern01', { slots: { 'slot-mid': { block_id: 'sg-web', variant: 'cost', propensity: 0.975 }, 'slot-end': { block_id: 'rs-cost', variant: 'default' } } }),
      decision('d_explore01', { policy: 'ts-v1+explore' }),
    ],
    events: [
      shown('d_holdout01'), shown('d_shadow001'), shown('d_oldpolicy'), shown('d_rule00001', 'sg-recruit'),
      shown('d_concern01'), ev('d_concern01', 'shown', { slot: 'slot-end', block_id: 'rs-cost' }),
      shown('d_explore01'),
    ],
  });
  assert.deepStrictEqual(rows.map((r) => r.decision_id + ':' + r.slot).sort(), ['d_concern01:slot-mid', 'd_explore01:slot-mid']);
});

// ---------- 3. 遷移表・V・cov ----------

const TITLES = {
  'サイトリニューアル 追加費用が発生する原因と対策': '/article-website-renewal-unexpected-additional-cost',
  '料金プラン': '/pricing',
  'Web制作': '/web',
  'ホームページ無料診断': '/diagnostic',
};
const ARTICLE = '/article-website-renewal-unexpected-additional-cost';
const hist = (...titles) => titles.map((title) => ({ title, type: '記事', '読み方': 'じっくり' }));

test('sessionPaths: 最後の判定の閲覧履歴を title から URL に戻し、その後のイベントでつなぐ', () => {
  const paths = learn.sessionPaths({
    titleToUrl: TITLES,
    decisions: [
      { session_id: 'r_aaaaaa', created_at: daysAgo(1), page_url: ARTICLE, history: hist('サイトリニューアル 追加費用が発生する原因と対策') },
      // 同じセッションの後の判定。state ごと渡された形でも読める。
      { session_id: 'r_aaaaaa', created_at: daysAgo(1, 60), page_url: '/pricing', state: { '閲覧履歴': hist('サイトリニューアル 追加費用が発生する原因と対策', '料金プラン') } },
      // catalog に無い記事（title なし）は飛ばす。現在のページは page_url から分かる。
      { session_id: 'r_bbbbbb', created_at: daysAgo(2), page_url: '/article-brand-new', history: [{ type: '記事', '読み方': '流し見' }] },
    ],
    events: [
      { session_id: 'r_aaaaaa', created_at: daysAgo(1, 30), type: 'shown', page_url: ARTICLE }, // 最後の判定より前
      { session_id: 'r_aaaaaa', created_at: daysAgo(1, 120), type: 'shown', page_url: '/web' },
      { session_id: 'r_aaaaaa', created_at: daysAgo(1, 200), type: 'goal', page_url: '/diagnostic' },
      { session_id: 'r_aaaaaa', created_at: daysAgo(1, 400), type: 'shown', page_url: '/voice' }, // ゴールの後は数えない
      { session_id: 'r_zzzzzz', created_at: daysAgo(1), type: 'goal', page_url: '/guidebook' }, // 判定の無いセッション
    ],
  });
  const by = Object.fromEntries(paths.map((p) => [p.session_id, p]));
  assert.deepStrictEqual(by.r_aaaaaa, { session_id: 'r_aaaaaa', path: [ARTICLE, '/pricing', '/web', '/diagnostic'], goal: true });
  assert.deepStrictEqual(by.r_bbbbbb, { session_id: 'r_bbbbbb', path: ['/article-brand-new'], goal: false });
  assert.strictEqual(paths.length, 2);
});

test('buildTransitions: 最後のページから (goal) か (exit) へ。goal_count はゴールに着いたセッションの数', () => {
  const t = learn.buildTransitions([
    { path: ['/a', '/b'], goal: true },
    { path: ['/a', '/b'], goal: false },
    { path: ['/a'], goal: false },
  ]);
  const get = (from, to) => t.find((r) => r.from_url === from && r.to_url === to);
  assert.deepStrictEqual(get('/a', '/b'), { from_url: '/a', to_url: '/b', count: 2, goal_count: 1 });
  assert.deepStrictEqual(get('/b', learn.GOAL), { from_url: '/b', to_url: learn.GOAL, count: 1, goal_count: 1 });
  assert.deepStrictEqual(get('/b', learn.EXIT), { from_url: '/b', to_url: learn.EXIT, count: 1, goal_count: 0 });
  assert.deepStrictEqual(get('/a', learn.EXIT), { from_url: '/a', to_url: learn.EXIT, count: 1, goal_count: 0 });
  assert.strictEqual(t.length, 4);
});

const tr = (from_url, to_url, count) => ({ from_url, to_url, count, goal_count: 0 });

test('solveValues: 手で解ける吸収マルコフ連鎖', () => {
  // A →(1/2) B、A →(1/2) 離脱。B →(2/3) ゴール、B →(1/3) 離脱。 V(B) = 2/3、V(A) = 1/3。
  const chain = learn.solveValues([tr('/a', '/b', 1), tr('/a', learn.EXIT, 1), tr('/b', learn.GOAL, 2), tr('/b', learn.EXIT, 1)], { shrink: 0 });
  near(chain.raw['/b'], 2 / 3, 1e-9);
  near(chain.raw['/a'], 1 / 3, 1e-9);
  assert.deepStrictEqual(chain.visits, { '/a': 2, '/b': 3 });
  // 行き来のある場合: V(A) = V(B)/2、V(B) = V(A)/2 + 1/2 → V(B) = 2/3、V(A) = 1/3。
  const loop = learn.solveValues([tr('/a', '/b', 1), tr('/a', learn.EXIT, 1), tr('/b', '/a', 1), tr('/b', learn.GOAL, 1)], { shrink: 0 });
  near(loop.raw['/a'], 1 / 3, 1e-8);
  near(loop.raw['/b'], 2 / 3, 1e-8);
  // データが無ければ空。
  assert.deepStrictEqual(learn.solveValues([], {}).V, {});
});

test('solveValues: 件数の少ないページは、ページ群の平均へ寄せる', () => {
  const typeOf = (u) => (u.startsWith('/article-') ? 'article' : 'goal');
  const v = learn.solveValues([
    tr('/article-big', learn.GOAL, 10), tr('/article-big', learn.EXIT, 90), // 100件、V = 0.10
    tr('/article-tiny', learn.GOAL, 1),                                      // 1件だけ、V = 1.00
  ], { shrink: 20, typeOf });
  const mean = (100 * 0.1 + 1 * 1) / 101;
  near(v.V_type.article, mean, 1e-4);
  near(v.V['/article-big'], (100 * 0.1 + 20 * mean) / 120, 1e-4);
  near(v.V['/article-tiny'], (1 * 1 + 20 * mean) / 21, 1e-4);
  assert.ok(v.V['/article-tiny'] < 0.2, '1件だけのページの V が 1 のまま残らない');
});

test('buildCov: 遷移割合の対数比。件数の少ない from は 0 に寄る', () => {
  const t = [tr('/a', '/x', 3), tr('/a', learn.EXIT, 1), tr('/b', '/x', 1), tr('/b', learn.EXIT, 3)];
  const raw = learn.buildCov(t, { smooth: 0 });
  near(raw['/a']['/x'], Math.log(0.75 / 0.5), 1e-4);
  near(raw['/b']['/x'], Math.log(0.25 / 0.5), 1e-4);
  const smoothed = learn.buildCov(t, { smooth: 20 });
  assert.ok(smoothed['/a']['/x'] > 0 && smoothed['/a']['/x'] < raw['/a']['/x']);
  // targets を渡すと、提案先への値だけを持つ。件数の多い from には「一度も進んでいない」も負の値で入る。
  const big = [tr('/a', '/x', 50), tr('/a', learn.EXIT, 50), tr('/b', '/y', 5), tr('/b', learn.EXIT, 5)];
  const cov = learn.buildCov(big, { targets: ['/y'], smooth: 20, minFrom: 30 });
  assert.deepStrictEqual(Object.keys(cov['/a']), ['/y']);
  near(cov['/a']['/y'], Math.log(20 / 120), 1e-4);
  assert.ok(cov['/b']['/y'] > 0);
});

// ---------- 4. オフポリシー評価 ----------

const opeRow = (block_id, propensity, y, pool) => ({ block_id, propensity, y, pool: pool || [{ block_id: 'A', rel: 0.9, features: F() }, { block_id: 'B', rel: 0.5, features: F() }] });

test('offPolicyValue: 手計算と一致する。重みは上限で打ち切る', () => {
  const rows = [opeRow('A', 0.5, 1), opeRow('A', 0.5, 0), opeRow('B', 0.5, 1), opeRow('B', 0.25, 0)];
  const alwaysA = learn.offPolicyValue(rows, () => 'A', 20);
  assert.deepStrictEqual([alwaysA.matched, alwaysA.ips, alwaysA.snips, alwaysA.ess], [2, 0.5, 0.5, 2]);
  const alwaysB = learn.offPolicyValue(rows, () => 'B', 20);
  near(alwaysB.ips, (2 * 1 + 4 * 0) / 4, 1e-9);
  near(alwaysB.snips, 2 / 6, 1e-6);
  // 1/0.01 = 100 は 20 で打ち切る。
  const capped = learn.offPolicyValue([opeRow('A', 0.01, 1), opeRow('B', 0.99, 0)], () => 'A', 20);
  near(capped.ips, 20 / 2, 1e-9);
});

test('offPolicyValue: 既知の方策の成果率を、別の方策のログから推定できる', () => {
  // ログの方策は「70% で B、30% で A」。成果率は A が 0.30、B が 0.10。
  // 「いつも A」の真の成果率は 0.30、「いつも B」は 0.10、ログの方策そのものは 0.16。
  const rng = seededRng(5);
  const rows = [];
  for (let i = 0; i < 40000; i++) {
    const a = rng() < 0.3 ? 'A' : 'B';
    rows.push(opeRow(a, a === 'A' ? 0.3 : 0.7, rng() < (a === 'A' ? 0.3 : 0.1) ? 1 : 0));
  }
  const a = learn.offPolicyValue(rows, () => 'A', 20);
  const b = learn.offPolicyValue(rows, () => 'B', 20);
  near(a.ips, 0.3, 0.015, 'IPS(A)');
  near(a.snips, 0.3, 0.015, 'SNIPS(A)');
  near(b.ips, 0.1, 0.01, 'IPS(B)');
  near(b.snips, 0.1, 0.01, 'SNIPS(B)');
  // 関連度の順位は A を選ぶ（pool の rel は A が高い）。
  near(learn.offPolicyValue(rows, (pool) => learn.pickByRel(pool), 20).snips, a.snips, 1e-12);
});

test('evaluatePolicies: 関連度の低いカードの方が成果が出ているログでは、学習後の順位の方が高く出る', () => {
  // 関連度は A が上だが、実際に成果が出るのは B（A 0.05、B 0.30）。ログは一様（選択確率 0.5）。
  const rng = seededRng(9);
  const rows = [];
  for (let i = 0; i < 6000; i++) {
    const pool = [
      { block_id: 'sg-web', rel: 0.8, features: F({ rel: 1.4 }) },
      { block_id: 'sg-pricing', rel: 0.6, features: F({ rel: 0.4 }) },
    ];
    const pick = rng() < 0.5 ? 0 : 1;
    rows.push({
      decision_id: 'd_' + i, session_id: 'r_' + (i % 3000), slot: 'slot-mid', block_id: pool[pick].block_id,
      features: pool[pick].features, y: rng() < (pick === 0 ? 0.05 : 0.3) ? 1 : 0, weight: 1, propensity: 0.5, pool,
    });
  }
  const ope = learn.evaluatePolicies({ rows, prior: priorModel(), cap: 20, folds: 5 });
  assert.strictEqual(ope.n, 6000);
  assert.strictEqual(ope.in_sample, false);
  near(ope.logged.rate, 0.175, 0.015);
  near(ope.rel_only.snips, 0.05, 0.015);
  near(ope.learned.snips, 0.3, 0.03);
  assert.ok(ope.lift_snips > 0.2);
  assert.ok(ope.learned.ess > 1000);
});

test('evaluatePolicies: 0件と少数のとき', () => {
  const none = learn.evaluatePolicies({ rows: [], prior: priorModel() });
  assert.deepStrictEqual([none.n, none.rel_only, none.learned, none.lift_snips], [0, null, null, null]);
  const pool = [{ block_id: 'sg-web', rel: 0.8, features: F({ rel: 1.4 }) }, { block_id: 'sg-pricing', rel: 0.6, features: F({ rel: 0.4 }) }];
  const few = learn.evaluatePolicies({
    rows: [0, 1, 2].map((i) => ({ decision_id: 'd_' + i, session_id: 'r_' + i, block_id: 'sg-web', features: pool[0].features, y: i === 0 ? 1 : 0, weight: 1, propensity: 0.975, pool })),
    prior: priorModel(),
  });
  // セッションが少なすぎて分けられない。事前分布に近い重みなので、関連度の順位と同じカードを選ぶ。
  assert.strictEqual(few.in_sample, true);
  assert.deepStrictEqual(few.learned, few.rel_only);
  assert.strictEqual(few.lift_snips, 0);
});
