// 学習済みモデルの読み込みのテスト。外部は呼ばない（fetch は差し替える）。
const test = require('node:test');
const assert = require('node:assert');
const { useFixtures } = require('./__fixtures__/setup');
const { priorModel } = require('./features');
const modelLib = require('./model');
const { loadModel } = modelLib;

const ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
let keep;
let quiet;

test.beforeEach(() => {
  useFixtures();
  modelLib.__resetForTest();
  keep = ENV.map((k) => process.env[k]);
  process.env.SUPABASE_URL = 'https://example.supabase.co/';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  quiet = console.error;
  console.error = () => {};
});

test.afterEach(() => {
  ENV.forEach((k, i) => { if (keep[i] == null) delete process.env[k]; else process.env[k] = keep[i]; });
  console.error = quiet;
  modelLib.__resetForTest();
});

const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const ROW = {
  version: 'm_20260920',
  mean: { bias: -3.1, rel: 0.7, 'card:sg-web': 0.2 },
  variance: { bias: 0.01, rel: 0.02, 'card:sg-web': 0.05 },
  aux: { V: { '/pricing': 0.12 }, cov: {} },
};

test('未設定なら fetch せずに事前分布', async () => {
  delete process.env.SUPABASE_URL;
  let called = 0;
  const m = await loadModel({ fetch: async () => { called++; return jsonRes(200, [ROW]); } });
  assert.strictEqual(called, 0);
  assert.deepStrictEqual(m, priorModel());
});

test('最新の1行を PostgREST から読み、無い重みは事前分布で補う', async () => {
  let seen = null;
  const m = await loadModel({ fetch: async (url, init) => { seen = { url, init }; return jsonRes(200, [ROW]); } });
  assert.strictEqual(seen.url, 'https://example.supabase.co/rest/v1/nq_model?select=version,mean,variance,aux&order=created_at.desc&limit=1');
  assert.strictEqual(seen.init.method, 'GET');
  assert.strictEqual(seen.init.headers.apikey, 'service-role-test');
  assert.strictEqual(seen.init.headers.Authorization, 'Bearer service-role-test');
  assert.ok(seen.init.signal);
  assert.strictEqual(m.version, 'm_20260920');
  assert.strictEqual(m.mean.bias, -3.1);
  assert.strictEqual(m.mean['card:sg-web'], 0.2);
  assert.strictEqual(m.mean['card:sg-pricing'], 0);
  assert.strictEqual(m.variance.rel, 0.02);
  assert.ok(Math.abs(m.variance['card:sg-pricing'] - 0.1225) < 1e-12);
  assert.deepStrictEqual(Object.keys(m.mean), Object.keys(priorModel().mean));
  assert.deepStrictEqual(m.aux, ROW.aux);
});

test('10分キャッシュする。過ぎたら読み直す', async () => {
  let called = 0;
  let t = 1_000_000;
  const opts = { fetch: async () => { called++; return jsonRes(200, [ROW]); }, now: () => t };
  await loadModel(opts);
  t += 9 * 60 * 1000;
  await loadModel(opts);
  assert.strictEqual(called, 1);
  t += 2 * 60 * 1000;
  await loadModel(opts);
  assert.strictEqual(called, 2);
});

test('失敗・0行・壊れた行は事前分布。失敗も1分は覚えて、毎回は読みに行かない', async () => {
  const bad = [
    async () => jsonRes(500, { message: 'secret detail' }),
    async () => jsonRes(200, []),
    async () => jsonRes(200, [{ version: 'x', mean: 'nope', variance: {} }]),
    async () => jsonRes(200, 'nope'),
    async () => { throw new Error('network'); },
  ];
  for (const fetch of bad) {
    modelLib.__resetForTest();
    assert.deepStrictEqual(await loadModel({ fetch }), priorModel());
  }
  modelLib.__resetForTest();
  let called = 0;
  let t = 5_000_000;
  const opts = { fetch: async () => { called++; throw new Error('down'); }, now: () => t };
  await loadModel(opts);
  t += 30 * 1000;
  await loadModel(opts);
  assert.strictEqual(called, 1);
  t += 40 * 1000;
  await loadModel(opts);
  assert.strictEqual(called, 2);
});

test('応答を遅らせない: 300ms で打ち切って事前分布', async () => {
  const slow = (url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  });
  const t0 = Date.now();
  const m = await loadModel({ fetch: slow });
  assert.ok(Date.now() - t0 < 1000);
  assert.deepStrictEqual(m, priorModel());
});
