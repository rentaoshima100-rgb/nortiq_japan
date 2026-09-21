// 入口の防御（Origin・bot・session_id・ホールドアウト）のテスト。
const test = require('node:test');
const assert = require('node:assert');
const { checkOrigin, isBot, validSessionId, isHoldout, parseRate } = require('./guard');

test('session_id: r_ ＋ 英小文字と数字 6〜16 桁だけを受ける', () => {
  for (const ok of ['r_8f3k2m', 'r_abcdef', 'r_0123456789abcdef']) assert.strictEqual(validSessionId(ok), true, ok);
  for (const ng of ['', 'r_', 'r_abc', 'r_ABCDEF', 'r_0123456789abcdefg', 'x_8f3k2m', 'r-8f3k2m', ' r_8f3k2m',
    'r_8f3k2m\n', 'r_8f3 k2m', "r_8f3k2m'; drop table", null, undefined, 123456, {}, ['r_8f3k2m']]) {
    assert.strictEqual(validSessionId(ng), false, String(ng));
  }
});

test('ホールドアウト: 同じ session_id は何度呼んでも同じ群', () => {
  for (let i = 0; i < 200; i++) {
    const sid = 'r_' + (i * 7919 + 100000).toString(36).padStart(6, '0');
    const first = isHoldout(sid, 0.2);
    for (let k = 0; k < 3; k++) assert.strictEqual(isHoldout(sid, 0.2), first);
  }
});

test('ホールドアウト: 割合がおおよそ rate になる', () => {
  const N = 20000;
  for (const rate of [0.2, 0.5]) {
    let hit = 0;
    for (let i = 0; i < N; i++) if (isHoldout('r_' + i.toString(36).padStart(8, '0'), rate)) hit++;
    assert.ok(Math.abs(hit / N - rate) < 0.02, `rate=${rate} actual=${hit / N}`);
  }
});

test('ホールドアウト: rate を上げても、低い rate で入っていたセッションは入ったまま', () => {
  for (let i = 0; i < 2000; i++) {
    const sid = 'r_' + i.toString(36).padStart(8, '0');
    if (isHoldout(sid, 0.2)) assert.strictEqual(isHoldout(sid, 0.5), true);
  }
});

test('ホールドアウト: 0 以下は全員対象外、1 以上は全員対象。数値でない rate は 0 扱い', () => {
  assert.strictEqual(isHoldout('r_8f3k2m', 0), false);
  assert.strictEqual(isHoldout('r_8f3k2m', -1), false);
  assert.strictEqual(isHoldout('r_8f3k2m', 1), true);
  assert.strictEqual(isHoldout('r_8f3k2m', 5), true);
  assert.strictEqual(isHoldout('r_8f3k2m', 'abc'), false);
  assert.strictEqual(isHoldout('r_8f3k2m', undefined), false);
});

test('parseRate: env の文字列を 0〜1 に。未設定と不正値は既定値', () => {
  assert.strictEqual(parseRate(undefined, 0.2), 0.2);
  assert.strictEqual(parseRate('', 0.2), 0.2);
  assert.strictEqual(parseRate('abc', 0.2), 0.2);
  assert.strictEqual(parseRate('0', 0.2), 0);
  assert.strictEqual(parseRate('0.35', 0.2), 0.35);
  assert.strictEqual(parseRate('2', 0.2), 1);
  assert.strictEqual(parseRate('-3', 0.2), 0);
});

test('Origin: 本番・Vercel プレビュー・localhost だけ通す', () => {
  const ok = ['https://nortiqlab.com', 'https://www.nortiqlab.com', 'https://nortiq-japan-git-nq-team.vercel.app',
    'http://localhost:3000', 'http://localhost', 'http://127.0.0.1:5000'];
  for (const origin of ok) assert.strictEqual(checkOrigin({ headers: { origin } }), true, origin);
  const ng = ['https://evil.example', 'http://nortiqlab.com', 'https://nortiqlab.com.evil.example',
    'https://evil-nortiqlab.com', 'https://x.vercel.app.evil.example', 'https://localhost:3000', 'null', ''];
  for (const origin of ng) assert.strictEqual(checkOrigin({ headers: { origin } }), false, origin);
});

test('Origin: 無ければ Referer で代用。どちらも無ければ通さない', () => {
  assert.strictEqual(checkOrigin({ headers: { referer: 'https://nortiqlab.com/article-x?utm=1' } }), true);
  assert.strictEqual(checkOrigin({ headers: { referer: 'https://evil.example/https://nortiqlab.com' } }), false);
  assert.strictEqual(checkOrigin({ headers: {} }), false);
  assert.strictEqual(checkOrigin({}), false);
  assert.strictEqual(checkOrigin(null), false);
});

test('bot: クローラ・ヘッドレス・HTTP クライアント・空の UA', () => {
  const bots = [
    '', null, undefined,
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (compatible; NortiqLabDiagnostic/1.0; +https://nortiqlab.com) Chrome-Lighthouse',
    'facebookexternalhit/1.1', 'curl/8.4.0', 'python-requests/2.31.0', 'node', 'axios/1.6.0',
  ];
  for (const ua of bots) assert.strictEqual(isBot(ua), true, String(ua));
});

test('bot: ふつうのブラウザとアプリ内ブラウザは通す', () => {
  const humans = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.9.0',
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36 Instagram 336.0.0.35.90 Android',
  ];
  for (const ua of humans) assert.strictEqual(isBot(ua), false, ua);
});
