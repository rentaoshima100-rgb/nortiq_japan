// api/contact.js の入力チェックと、メールに載る行のテスト。Resend への送信は fetch を差し替えて止める。
const test = require('node:test');
const assert = require('node:assert');

const handler = require('../contact.js');

function mockRes() {
  return {
    statusCode: 0, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

// 1回の呼び出しを実行し、Resend に渡した内容 (sent) と応答 (res) を返す。
async function call(body, { method = 'POST', key = 'test-key' } = {}) {
  const prevFetch = global.fetch;
  const prevKey = process.env.RESEND_API_KEY;
  let sent = null;
  global.fetch = async (url, opts) => {
    sent = { url, payload: JSON.parse(opts.body) };
    return { ok: true, json: async () => ({ id: 'email_1' }) };
  };
  if (key) process.env.RESEND_API_KEY = key; else delete process.env.RESEND_API_KEY;
  const res = mockRes();
  try {
    await handler({ method, body }, res);
  } finally {
    global.fetch = prevFetch;
    if (prevKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = prevKey;
  }
  return { res, sent };
}

test('貴社名とメールだけ (担当者名なし) で送れる', async () => {
  const { res, sent } = await call({ company: 'テスト株式会社', email: 'a@example.com', kind: 'modal' });
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { ok: true, id: 'email_1' });
  assert.match(sent.payload.subject, /テスト株式会社 様 \(modal\)/);
  assert.strictEqual(sent.payload.reply_to, 'a@example.com');
  assert.ok(!sent.payload.text.includes('ご担当者名'), '空の担当者名は行にしない');
});

test('担当者名とメールだけ (貴社名なし) でも送れる (LP の従来どおり)', async () => {
  const { res, sent } = await call({ name: '山田', email: 'a@example.com' });
  assert.strictEqual(res.statusCode, 200);
  assert.match(sent.payload.subject, /山田 様/);
});

test('貴社名も担当者名も無ければ 400', async () => {
  const { res, sent } = await call({ email: 'a@example.com' });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'name_email_required');
  assert.strictEqual(sent, null);
});

test('メールが無い・形式が違うと 400', async () => {
  assert.strictEqual((await call({ company: 'A社' })).res.statusCode, 400);
  const bad = await call({ company: 'A社', email: 'not-an-email' });
  assert.strictEqual(bad.res.statusCode, 400);
  assert.strictEqual(bad.res.body.error, 'invalid_email');
});

test('相談の種別と送信元ページがメールに載る', async () => {
  const { sent } = await call({ company: 'A社', email: 'a@example.com', topic: 'Web制作 / Standard プラン', page: '/pricing' });
  assert.ok(sent.payload.text.includes('ご相談内容（種別）: Web制作 / Standard プラン'));
  assert.ok(sent.payload.text.includes('送信元ページ: /pricing'));
});

test('オブジェクトが紛れ込んだ項目は空にして送る (文字列と配列だけを通す)', async () => {
  const { res, sent } = await call({ company: 'A社', email: 'a@example.com', categories: [{ a: 1 }], topic: { type: 'click' } });
  assert.strictEqual(res.statusCode, 200);
  assert.ok(!sent.payload.text.includes('ご相談内容（種別）'));
});

test('ハニーポットが埋まっていたら送らずに成功を返す', async () => {
  const { res, sent } = await call({ company: 'A社', email: 'a@example.com', hp: 'bot' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(sent, null);
});

test('POST 以外は 405、API キーが無ければ 500', async () => {
  assert.strictEqual((await call({}, { method: 'GET' })).res.statusCode, 405);
  assert.strictEqual((await call({ company: 'A社', email: 'a@example.com' }, { key: '' })).res.statusCode, 500);
});
