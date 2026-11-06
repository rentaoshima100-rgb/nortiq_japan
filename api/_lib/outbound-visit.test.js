const test = require('node:test');
const assert = require('node:assert');
const handler = require('../outbound-visit');

const { toVisit } = handler;

test('toVisit: 下書きIDの8桁とパスだけを通す', () => {
  assert.deepStrictEqual(toVisit({ id: '7cf04605', path: '/pricing' }), { id: '7cf04605', path: '/pricing' });
});

test('toVisit: クエリと断片は保存しない', () => {
  assert.deepStrictEqual(toVisit({ id: '7cf04605', path: '/works?utm_content=7cf04605#a' }), { id: '7cf04605', path: '/works' });
});

test('toVisit: 形式の違う値は捨てる', () => {
  for (const body of [null, 'x', {}, { id: 'ABCDEF12', path: '/' }, { id: '7cf0460', path: '/' }, { id: "7cf04605'--", path: '/' }, { id: '7cf04605' }, { id: '7cf04605', path: 'https://evil.example.com/' }, { id: '7cf04605', path: '//evil.example.com/' }]) {
    assert.strictEqual(toVisit(body), null);
  }
});

function call({ method = 'POST', body, headers = {} }) {
  return new Promise((resolve) => {
    const res = {
      setHeader() {},
      status(code) { this.code = code; return this; },
      json() { resolve(this.code); },
      end() { resolve(this.code); },
    };
    handler({ method, body, headers }, res);
  });
}

function withEnv(fn) {
  const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, fetch: global.fetch };
  process.env.SUPABASE_URL = 'https://db.example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const calls = [];
  global.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 204 }; };
  return fn(calls).finally(() => {
    if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
    if (saved.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = saved.key;
    global.fetch = saved.fetch;
  });
}

const BROWSER = { origin: 'https://nortiqlab.com', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0' };

test('handler: 正しい訪問を record_site_visit に渡す', () => withEnv(async (calls) => {
  const code = await call({ body: JSON.stringify({ id: '7cf04605', path: '/pricing?x=1' }), headers: BROWSER });
  assert.strictEqual(code, 204);
  assert.strictEqual(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/record_site_visit$/);
  assert.deepStrictEqual(calls[0].body, { p_short_id: '7cf04605', p_page_path: '/pricing', p_suspect: false });
}));

test('handler: bot の UA は suspect として渡す', () => withEnv(async (calls) => {
  await call({ body: { id: '7cf04605', path: '/' }, headers: { origin: 'https://nortiqlab.com', 'user-agent': 'Googlebot/2.1' } });
  assert.strictEqual(calls[0].body.p_suspect, true);
}));

test('handler: 別のオリジンからは記録しない', () => withEnv(async (calls) => {
  const code = await call({ body: { id: '7cf04605', path: '/' }, headers: { origin: 'https://evil.example.com', 'user-agent': BROWSER['user-agent'] } });
  assert.strictEqual(code, 204);
  assert.strictEqual(calls.length, 0);
}));

test('handler: GET は受けない', () => withEnv(async () => {
  assert.strictEqual(await call({ method: 'GET', headers: BROWSER }), 405);
}));

test('handler: 環境変数が無ければ何もしない', async () => {
  const url = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  assert.strictEqual(await call({ body: { id: '7cf04605', path: '/' }, headers: BROWSER }), 204);
  if (url !== undefined) process.env.SUPABASE_URL = url;
});
