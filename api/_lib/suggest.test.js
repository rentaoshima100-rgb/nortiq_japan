// /api/suggest のハンドラを、モックの req / res で端から端まで通すテスト。外部は呼ばない。
// （Function 本体は api/ 直下だが、テストは `node --test "api/_lib/*.test.js"` で拾えるようここに置く）
const test = require('node:test');
const assert = require('node:assert');
const { useFixtures } = require('./__fixtures__/setup');
const decideLib = require('./decide');
const modelLib = require('./model');
const { FEATURES } = require('./features');
const handler = require('../suggest');

const ARTICLE = '/article-website-renewal-unexpected-additional-cost';
const ENV = ['NQ_ENABLED', 'NQ_SHADOW', 'NQ_HOLDOUT_RATE', 'NQ_POLICY', 'NQ_MODEL_PROVIDER', 'JEV_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

let keepEnv;
let keepFetch;
let keepRandom;
let keepError;
let logged; // Supabase に送られた行（table ごと）
let modelRows; // nq_model の GET が返す行（既定は0行）

test.beforeEach(() => {
  useFixtures();
  decideLib.__setStubForTest(null);
  modelLib.__resetForTest();
  keepEnv = ENV.map((k) => process.env[k]);
  for (const k of ENV) delete process.env[k];
  keepFetch = globalThis.fetch;
  keepRandom = Math.random;
  keepError = console.error;
  console.error = () => {};
  Math.random = () => 0.5; // 一様探索（5%）に入らない値に固定する
  logged = { nq_decisions: [], nq_model_reads: 0 };
  modelRows = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('/rest/v1/nq_model')) { logged.nq_model_reads++; return { ok: true, status: 200, json: async () => modelRows }; }
    if (String(url).includes('/rest/v1/nq_decisions')) { logged.nq_decisions.push(JSON.parse(init.body)); return { ok: true, status: 201 }; }
    throw new Error('unexpected fetch: ' + url);
  };
});

test.afterEach(() => {
  ENV.forEach((k, i) => { if (keepEnv[i] == null) delete process.env[k]; else process.env[k] = keepEnv[i]; });
  globalThis.fetch = keepFetch;
  Math.random = keepRandom;
  console.error = keepError;
  decideLib.__setStubForTest(null);
  modelLib.__resetForTest();
});

function mockRes() {
  return {
    statusCode: null, headers: {}, body: undefined, headersSent: false,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; this.headersSent = true; return this; },
    end() { this.headersSent = true; return this; },
  };
}

const body = (over) => Object.assign({
  session_id: 'r_8f3k2m',
  trigger: 'T1',
  page_url: ARTICLE,
  state: {
    ref: 'google', landing: ARTICLE, history: [], current: { url: ARTICLE, reach: 'half' },
    visit: 'first', device: 'sp', passed: [],
  },
}, over || {});

const req = (b, over) => Object.assign({
  method: 'POST',
  headers: { origin: 'https://nortiqlab.com', 'user-agent': UA, 'content-type': 'application/json' },
  body: b === undefined ? body() : b,
}, over || {});

async function call(r) {
  const res = mockRes();
  await handler(r, res);
  return res;
}

const isDefault = (res) => {
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.body.decision_id, /^d_[a-z0-9]{8,40}$/);
  assert.strictEqual(res.body.default, true);
  assert.deepStrictEqual(res.body.slots, {});
};

test('NQ_ENABLED 未設定 → 何も呼ばずに即デフォルト', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  const res = await call(req());
  isDefault(res);
  assert.deepStrictEqual(Object.keys(res.body), ['decision_id', 'default', 'shadow', 'policy', 'slots']);
  assert.strictEqual(res.body.shadow, false);
  assert.strictEqual(res.body.policy, null);
  assert.strictEqual(res.headers['Cache-Control'], 'no-store');
  assert.strictEqual(logged.nq_decisions.length, 0);
});

test('POST 以外は 405', async () => {
  process.env.NQ_ENABLED = '1';
  const res = await call(req(undefined, { method: 'GET' }));
  assert.strictEqual(res.statusCode, 405);
});

test('NQ_ENABLED=1 + stub → 判定はするが結果はデフォルト（方策は prior-v1）', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  const res = await call(req());
  isDefault(res);
  assert.strictEqual(res.body.policy, 'prior-v1');
  assert.strictEqual(res.body.shadow, false);
});

test('不正入力 → デフォルト（モデルも記録も呼ばない）', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  decideLib.__setStubForTest({ 'rel_sg-web': { noul: 0.9 } });
  const bad = [
    req(body({ session_id: 'abc' })),
    req(body({ session_id: 'r_UPPER123' })),
    req(body({ trigger: 'T4' })),
    req(body({ page_url: '/no-such-page' })),
    req(body({ page_url: 'https://evil.example/' })),
    req(body({ state: null })),
    req(body({ state: Object.assign({}, body().state, { ref: '検索' }) })),
    req(body({ state: Object.assign({}, body().state, { current: { url: '/no-such-page', reach: 'half' } }) })),
    req('{ broken json'),
    req(null),
    req(body({ pad: 'x'.repeat(9000) })),
    req(undefined, { headers: { origin: 'https://evil.example', 'user-agent': UA, 'content-type': 'application/json' } }),
    // 第三者の *.vercel.app は通さない（リクエストが届いたホストと違う）
    req(undefined, { headers: { origin: 'https://evil.vercel.app', host: 'nortiqlab.com', 'user-agent': UA, 'content-type': 'application/json' } }),
    // application/json 以外は受けない（text/plain はプリフライトなしでよそのページから送れる）
    req(JSON.stringify(body()), { headers: { origin: 'https://nortiqlab.com', 'user-agent': UA, 'content-type': 'text/plain;charset=UTF-8' } }),
    req(undefined, { headers: { origin: 'https://nortiqlab.com', 'user-agent': UA } }),
    req(undefined, { headers: { 'user-agent': UA, 'content-type': 'application/json' } }),
    req(undefined, { headers: { origin: 'https://nortiqlab.com', 'user-agent': 'curl/8.4.0', 'content-type': 'application/json' } }),
    req(undefined, { headers: { origin: 'https://nortiqlab.com', 'content-type': 'application/json' } }),
  ];
  for (const r of bad) {
    const res = await call(r);
    isDefault(res);
    assert.strictEqual(res.body.policy, null);
  }
  assert.strictEqual(logged.nq_decisions.length, 0);
  // req.body の getter が throw しても（Vercel の JSON パース失敗）デフォルトに倒れる
  const throwing = { method: 'POST', headers: req().headers };
  Object.defineProperty(throwing, 'body', { get() { throw new Error('invalid json'); } });
  isDefault(await call(throwing));
});

test('承認済みのカード ＋ 関連度の高い回答 → policy と propensity つきの slots を返し、ログに candidates と policy が残る', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  decideLib.__setStubForTest({
    'rel_sg-web': { noul: 0.9 }, 'rel_sg-chatbot': { noul: 0.8 }, 'rel_sg-pricing': { noul: 0.6 },
    concern_cost: { noul: 0.75 },
  });
  const res = await call(req());
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.default, false);
  assert.strictEqual(res.body.shadow, false);
  assert.strictEqual(res.body.policy, 'prior-v1');
  // 候補は3枚。1枚目は関連度が最大の sg-web（cost の文言）。2枚目は別のページ群の sg-pricing
  assert.deepStrictEqual(res.body.slots, {
    'slot-mid': { block_id: 'sg-web', variant: 'cost', propensity: 0.966667 },
    'slot-end': { block_id: 'sg-pricing', variant: 'default', propensity: 1 },
  });
  // nq_model は prior でも読む（aux を特徴量に入れるため）。0行なので dv / cov は 0 のまま
  assert.strictEqual(logged.nq_model_reads, 1);

  assert.strictEqual(logged.nq_decisions.length, 1);
  const row = logged.nq_decisions[0];
  assert.deepStrictEqual(Object.keys(row), ['decision_id', 'created_at', 'session_id', 'page_url', 'trigger',
    'holdout', 'shadow', 'is_default', 'state', 'answers', 'candidates', 'slots', 'policy', 'model', 'latency_ms']);
  assert.strictEqual(row.decision_id, res.body.decision_id);
  assert.strictEqual(row.is_default, false);
  assert.strictEqual(row.policy, 'prior-v1');
  assert.strictEqual(row.model, 'stub-1');
  assert.deepStrictEqual(row.slots, res.body.slots);
  assert.strictEqual(row.answers['rel_sg-web'].noul, 0.9);
  const web = row.candidates.find((c) => c.block_id === 'sg-web');
  assert.deepStrictEqual(Object.keys(web), ['block_id', 'rel', 'target_url', 'features', 'score', 'propensity', 'picked']);
  assert.strictEqual(web.rel, 0.9);
  assert.strictEqual(web.features.length, FEATURES.length);
  assert.deepStrictEqual(web.propensity, { 'slot-mid': 0.966667 });
  assert.strictEqual(web.picked, 'slot-mid');
  assert.deepStrictEqual(row.candidates.find((c) => c.block_id === 'sg-recruit'), { block_id: 'sg-recruit', rel: 0.1, excluded: 'rel_floor' });
  // 保存しないもの: UA・IP。行のどこにも UA の断片が無い
  assert.ok(!JSON.stringify(row).includes('Mozilla'));
});

test('prior でも nq_model の aux を読む: 順位と選択確率は変わらず、ログの features に dv / cov だけが入る', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  decideLib.__setStubForTest({ 'rel_sg-web': { noul: 0.9 }, 'rel_sg-chatbot': { noul: 0.8 }, 'rel_sg-pricing': { noul: 0.6 } });
  const DV = FEATURES.indexOf('dv');
  const COV = FEATURES.indexOf('cov');

  const without = await call(req());
  const rowWithout = logged.nq_decisions[0];

  // 学習済みの重み（sg-pricing を強く推す）と aux の入った行。prior は重みを使わず、aux だけを使う
  modelLib.__resetForTest();
  modelRows = [{
    version: 'm_test',
    mean: { 'card:sg-pricing': 6, dv: 3, cov: 3 },
    variance: { 'card:sg-pricing': 0.0001 },
    aux: { V: { '/pricing': 0.2, [ARTICLE]: 0.05 }, V_type: {}, cov: { [ARTICLE]: { '/pricing': 0.7, '/web': -0.9 } } },
  }];
  const withAux = await call(req());
  const rowWith = logged.nq_decisions[1];
  assert.strictEqual(logged.nq_model_reads, 2);

  assert.strictEqual(withAux.body.policy, 'prior-v1');
  assert.deepStrictEqual(withAux.body.slots, without.body.slots);
  const cand = (row, id) => row.candidates.find((c) => c.block_id === id);
  for (const id of ['sg-web', 'sg-chatbot', 'sg-pricing']) {
    assert.strictEqual(cand(rowWith, id).score, cand(rowWithout, id).score, id);
    assert.deepStrictEqual(cand(rowWith, id).propensity, cand(rowWithout, id).propensity, id);
    assert.strictEqual(cand(rowWithout, id).features[DV], 0);
    assert.strictEqual(cand(rowWithout, id).features[COV], 0);
  }
  assert.strictEqual(cand(rowWith, 'sg-pricing').features[DV], 0.15);
  assert.strictEqual(cand(rowWith, 'sg-pricing').features[COV], 0.7);
  assert.strictEqual(cand(rowWith, 'sg-web').features[COV], -0.9);
});

test('一様探索で選んだ判定は、ログの policy に +explore が付く（応答の policy はバージョンだけ）', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  decideLib.__setStubForTest({ 'rel_sg-web': { noul: 0.9 }, 'rel_sg-pricing': { noul: 0.6 } });
  Math.random = () => 0.01;
  const res = await call(req(body({ trigger: 'T2', page_url: '/', state: Object.assign({}, body().state, { current: { url: '/', reach: 'top' } }) })));
  assert.strictEqual(res.body.policy, 'prior-v1');
  assert.strictEqual(res.body.slots['slot-next'].block_id, 'sg-web'); // floor(0.01 × 2) = 0 番目
  assert.strictEqual(logged.nq_decisions[0].policy, 'prior-v1+explore');
});

test('すでに読んだページ・見送った提案を指すカードは、質問にも候補にも入らない', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  decideLib.__setStubForTest({ 'rel_sg-web': { noul: 0.95 }, 'rel_sg-pricing': { noul: 0.9 }, 'rel_sg-chatbot': { noul: 0.7 } });
  const state = Object.assign({}, body().state, { history: [{ url: '/web', read: 'bounce' }], passed: ['sg-pricing'] });
  const res = await call(req(body({ state })));
  assert.deepStrictEqual(res.body.slots, { 'slot-mid': { block_id: 'sg-chatbot', variant: 'default', propensity: 1 } });
  const row = logged.nq_decisions[0];
  assert.ok(!('rel_sg-web' in row.answers));
  assert.ok(!('rel_sg-pricing' in row.answers));
  assert.deepStrictEqual(row.state['見送った提案'], ['sg-pricing']);
});

test('ホールドアウト: 判定と記録はするが、応答はデフォルト', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '1';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  decideLib.__setStubForTest({ 'rel_sg-web': { noul: 0.9 } });
  const res = await call(req());
  isDefault(res);
  assert.strictEqual(res.body.policy, 'prior-v1');
  const row = logged.nq_decisions[0];
  assert.strictEqual(row.holdout, true);
  assert.strictEqual(row.is_default, true);
  // 出していたら何だったかはログに残る
  assert.deepStrictEqual(row.slots, { 'slot-mid': { block_id: 'sg-web', variant: 'default', propensity: 1 } });
});

test('シャドー: 判定と記録だけ行い、default:true, shadow:true', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  process.env.NQ_SHADOW = '1';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  decideLib.__setStubForTest({ 'rel_sg-web': { noul: 0.9 } });
  const res = await call(req());
  isDefault(res);
  assert.strictEqual(res.body.shadow, true);
  assert.strictEqual(logged.nq_decisions[0].shadow, true);
  assert.strictEqual(logged.nq_decisions[0].slots['slot-mid'].block_id, 'sg-web');
});

test('NQ_POLICY=ts: nq_model を読み（0行なら事前分布）、方策は ts-v1。選択確率は 0 より大きい', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  process.env.NQ_POLICY = 'ts';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  decideLib.__setStubForTest({ 'rel_sg-web': { noul: 0.9 }, 'rel_sg-pricing': { noul: 0.6 } });
  let i = 0;
  Math.random = () => { i = (i * 1103515245 + 12345) % 2147483648; return 0.06 + (i / 2147483648) * 0.9; };
  const res = await call(req());
  assert.strictEqual(res.body.policy, 'ts-v1');
  assert.strictEqual(res.body.default, false);
  assert.strictEqual(logged.nq_model_reads, 1);
  const p = res.body.slots['slot-mid'].propensity;
  assert.ok(p > 0 && p <= 1);
  assert.strictEqual(logged.nq_decisions[0].policy, 'ts-v1');
});

test('モデルの失敗 → デフォルト。ログには失敗したことが残る（answers は null）', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  process.env.NQ_MODEL_PROVIDER = 'jev'; // JEV_API_KEY が無いので not_configured で失敗する
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  const res = await call(req());
  isDefault(res);
  assert.strictEqual(res.body.policy, null);
  const row = logged.nq_decisions[0];
  assert.strictEqual(row.answers, null);
  assert.strictEqual(row.candidates, null);
  assert.strictEqual(row.policy, null);
  assert.strictEqual(row.model, 'jev');
  assert.strictEqual(row.is_default, true);
});

test('承認が1つも無ければ（本物の data/blocks.json の初期状態と同じ）、どんな回答でもデフォルト', async () => {
  useFixtures((blocks) => {
    for (const b of blocks) {
      b.approved_by = '';
      for (const v of Object.values(b.variants || {})) delete v.approved_by;
    }
  });
  process.env.NQ_ENABLED = '1';
  process.env.NQ_HOLDOUT_RATE = '0';
  decideLib.__setStubForTest({ 'rel_sg-web': { noul: 0.99 }, stage: { score: 3 }, cta_ok: { noul: 0.99 } });
  for (const trigger of ['T1', 'T2', 'T3']) isDefault(await call(req(body({ trigger }))));
});
