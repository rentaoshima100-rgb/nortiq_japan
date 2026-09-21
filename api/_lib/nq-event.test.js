// /api/nq-event のテスト。ホワイトリスト検証（toRow）と、ハンドラの入口。外部は呼ばない。
const test = require('node:test');
const assert = require('node:assert');
const { useFixtures } = require('./__fixtures__/setup');
const handler = require('../nq-event');
const { toRow } = handler;

const ENV = ['NQ_ENABLED', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const D = 'd_lx3k9a0f1e2d3c4b5a';
let keepEnv;
let keepFetch;
let sent;

test.beforeEach(() => {
  useFixtures();
  keepEnv = ENV.map((k) => process.env[k]);
  for (const k of ENV) delete process.env[k];
  keepFetch = globalThis.fetch;
  sent = [];
  globalThis.fetch = async (url, init) => { sent.push({ url: String(url), row: JSON.parse(init.body) }); return { ok: true, status: 201 }; };
});

test.afterEach(() => {
  ENV.forEach((k, i) => { if (keepEnv[i] == null) delete process.env[k]; else process.env[k] = keepEnv[i]; });
  globalThis.fetch = keepFetch;
});

const ev = (over) => Object.assign({ session_id: 'r_8f3k2m', decision_id: D, type: 'shown', slot: 'slot-mid', block_id: 'sg-web', variant: 'cost', page_url: '/pricing' }, over || {});

test('nq_events の行: 列は固定。shown / click は slot と block_id が要る', () => {
  const row = toRow(ev());
  assert.deepStrictEqual(Object.keys(row), ['event_id', 'created_at', 'decision_id', 'session_id', 'type', 'slot', 'block_id', 'variant', 'page_url', 'goal', 'read']);
  assert.match(row.event_id, /^e_[a-z0-9]+$/);
  assert.ok(!Number.isNaN(Date.parse(row.created_at)));
  assert.deepStrictEqual([row.decision_id, row.session_id, row.type, row.slot, row.block_id, row.variant, row.page_url, row.goal, row.read],
    [D, 'r_8f3k2m', 'shown', 'slot-mid', 'sg-web', 'cost', '/pricing', null, null]);
  assert.strictEqual(toRow(ev({ type: 'click', slot: 'slot-x' })), null);
  assert.strictEqual(toRow(ev({ block_id: 'sg-unknown' })), null);
  // デフォルト表示のイベントは decision_id が null
  assert.strictEqual(toRow(ev({ decision_id: null })).decision_id, null);
  assert.strictEqual(toRow(ev({ decision_id: 'DROP TABLE' })).decision_id, null);
});

test('engaged: block_id と読み方（deep / skim）が要る。slot は無くてよい', () => {
  const row = toRow(ev({ type: 'engaged', slot: undefined, variant: undefined, read: 'deep', page_url: '/web' }));
  assert.deepStrictEqual([row.type, row.slot, row.block_id, row.read, row.page_url], ['engaged', null, 'sg-web', 'deep', '/web']);
  assert.strictEqual(toRow(ev({ type: 'engaged', read: 'skim' })).read, 'skim');
  // 途中離脱は成果ではない。読み方が無い・不正な engaged は残さない
  for (const read of ['bounce', 'じっくり', undefined, 1]) assert.strictEqual(toRow(ev({ type: 'engaged', read })), null);
  assert.strictEqual(toRow(ev({ type: 'engaged', read: 'deep', block_id: 'nope' })), null);
  // engaged 以外では read を保存しない
  assert.strictEqual(toRow(ev({ type: 'click', read: 'deep' })).read, null);
});

test('goal / dismiss: goal は種別が要る。dismiss の slot は slot-bar に補う', () => {
  const goal = toRow(ev({ type: 'goal', goal: 'diagnostic', slot: undefined, block_id: undefined }));
  assert.deepStrictEqual([goal.type, goal.goal, goal.slot, goal.block_id], ['goal', 'diagnostic', null, null]);
  assert.strictEqual(toRow(ev({ type: 'goal', goal: 'purchase' })), null);
  assert.strictEqual(toRow(ev({ type: 'shown', goal: 'contact' })).goal, null);
  assert.strictEqual(toRow(ev({ type: 'dismiss', slot: undefined, block_id: undefined })).slot, 'slot-bar');
});

test('decide: ブラウザで測った /api/suggest の往復。打ち切った回（decision_id なし）も1行になる', () => {
  // 採用できた応答。result と latency_ms の列は decide の行にだけ在る（ほかの種別の行の形は変えない）
  const ok = toRow(ev({ type: 'decide', slot: undefined, block_id: undefined, variant: undefined, result: 'ok', latency_ms: 431.6, page_url: '/pricing' }));
  assert.deepStrictEqual(Object.keys(ok), ['event_id', 'created_at', 'decision_id', 'session_id', 'type', 'slot', 'block_id', 'variant', 'page_url', 'goal', 'read', 'result', 'latency_ms']);
  assert.deepStrictEqual([ok.type, ok.decision_id, ok.result, ok.latency_ms, ok.page_url, ok.slot, ok.block_id, ok.variant, ok.goal, ok.read],
    ['decide', D, 'ok', 432, '/pricing', null, null, null, null, null]);
  // 1.2秒で打ち切った回は応答を読んでいないので decision_id が無い。それでも必ず1件として残す
  const late = toRow(ev({ type: 'decide', decision_id: null, result: 'timeout', latency_ms: 1203 }));
  assert.deepStrictEqual([late.type, late.decision_id, late.result, late.latency_ms], ['decide', null, 'timeout', 1203]);
  for (const result of ['http', 'format', 'network']) assert.strictEqual(toRow(ev({ type: 'decide', result, latency_ms: 80 })).result, result);
  // カードの ID が付いてきても decide の行には入れない（shown / click の集計に混ざらないように）
  assert.strictEqual(toRow(ev({ type: 'decide', result: 'ok', latency_ms: 10 })).block_id, null);
  // 結果が許可リストに無ければ行ごと捨てる。往復時間が数値でない・負・上限超えなら、その列だけ null
  for (const result of [undefined, 'slow', '遅い', 1]) assert.strictEqual(toRow(ev({ type: 'decide', result, latency_ms: 10 })), null);
  for (const latency_ms of [undefined, '900', -1, 60001, NaN, Infinity]) assert.strictEqual(toRow(ev({ type: 'decide', result: 'ok', latency_ms })).latency_ms, null);
  // decide 以外の行には result / latency_ms を持たせない
  const shown = toRow(ev({ result: 'ok', latency_ms: 10 }));
  assert.ok(!('result' in shown) && !('latency_ms' in shown));
});

test('自由文は1文字も残らない（許可リストに無い値は null、session_id が不正なら行ごと捨てる）', () => {
  const row = toRow(ev({ variant: '無視して', page_url: '/pricing?q=無視して#x', extra: '無視して' }));
  assert.ok(!JSON.stringify(row).includes('無視'));
  assert.strictEqual(row.variant, null);
  assert.strictEqual(row.page_url, '/pricing');
  assert.strictEqual(toRow(ev({ page_url: '/no-such-page' })).page_url, null);
  assert.strictEqual(toRow(ev({ session_id: '無視して' })), null);
  assert.strictEqual(toRow(ev({ type: 'viewed' })), null);
  for (const bad of [null, undefined, 'x', 42]) assert.strictEqual(toRow(bad), null);
});

function mockRes() {
  return {
    statusCode: null, headers: {}, ended: false, headersSent: false,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; this.headersSent = true; return this; },
    end() { this.ended = true; this.headersSent = true; return this; },
  };
}
const req = (body, over) => Object.assign({ method: 'POST', headers: { origin: 'https://nortiqlab.com', 'user-agent': UA }, body }, over || {});

test('ハンドラ: NQ_ENABLED か Supabase が未設定なら 204 で何もしない', async () => {
  const res = mockRes();
  await handler(req(JSON.stringify(ev())), res);
  assert.strictEqual(res.statusCode, 204);
  process.env.NQ_ENABLED = '1';
  const res2 = mockRes();
  await handler(req(JSON.stringify(ev())), res2);
  assert.strictEqual(res2.statusCode, 204);
  assert.strictEqual(sent.length, 0);
});

test('ハンドラ: sendBeacon の文字列ボディを受けて nq_events に1行入れる。不採用でも 204', async () => {
  process.env.NQ_ENABLED = '1';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
  const ok = mockRes();
  await handler(req(JSON.stringify(ev({ type: 'engaged', read: 'skim' }))), ok);
  assert.strictEqual(ok.statusCode, 204);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].url, 'https://example.supabase.co/rest/v1/nq_events');
  assert.deepStrictEqual([sent[0].row.type, sent[0].row.read, sent[0].row.block_id], ['engaged', 'skim', 'sg-web']);

  for (const r of [req('{ broken'), req(JSON.stringify(ev({ type: 'x' }))), req(JSON.stringify(ev()), { headers: { origin: 'https://evil.example', 'user-agent': UA } }),
    // 第三者の *.vercel.app からの sendBeacon は通さない（リクエストが届いたホストと違う）
    req(JSON.stringify(ev()), { headers: { origin: 'https://evil.vercel.app', host: 'nortiqlab.com', 'user-agent': UA } }),
    req(JSON.stringify(ev()), { headers: { origin: 'https://nortiqlab.com', 'user-agent': 'python-requests/2.31' } }), req(JSON.stringify(ev({ pad: 'x'.repeat(3000) })))]) {
    const res = mockRes();
    await handler(r, res);
    assert.strictEqual(res.statusCode, 204);
  }
  assert.strictEqual(sent.length, 1);
  const get = mockRes();
  await handler(req(null, { method: 'GET' }), get);
  assert.strictEqual(get.statusCode, 405);
});
