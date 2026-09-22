// 判定層のテスト。外部は呼ばない（fetch は差し替える）。
const test = require('node:test');
const assert = require('node:assert');
const { useFixtures } = require('./__fixtures__/setup');
const { buildQuestions } = require('./questions');
const decideLib = require('./decide');
const { decide, normalizeAnswers } = decideLib;
const { applyRules, cardSlots } = require('./rules');
const { recommend } = require('./recommend');

const STATE = { '流入元': 'Google検索', '訪問': '初回' };
let Q;
let CANDIDATES;

test.beforeEach(() => {
  useFixtures();
  decideLib.__setStubForTest(null);
  ({ questions: Q, candidates: CANDIDATES } = buildQuestions({ passed: [], currentUrl: '/' }));
});

// 公式リファレンスの形（type は小文字、probabilities はマップ）
const officialAnswers = () => ({
  visitor_type: { type: 'choice', choice: '事業者', probabilities: { '事業者': 0.72, '同業者・学習者': 0.2, other: 0.08 }, confidence: 0.72 },
  industry: { type: 'choice', choice: '不動産', probabilities: { '不動産': 0.81, '不明・その他': 0.19 }, confidence: 0.81 },
  need: { type: 'choice', choice: 'サイトリニューアル', probabilities: { 'サイトリニューアル': 0.66 }, confidence: 0.66 },
  stage: { type: 'score', score: 2.1, legend: { 0: 'a', 1: 'b', 2: 'c', 3: 'd' }, probabilities: { 0: 0.05, 1: 0.15, 2: 0.45, 3: 0.35 }, confidence: 0.45 },
  intent_compare: { type: 'noul', noul: 0.66 },
  intent_contact: { type: 'noul', noul: 0.12 },
  'rel_sg-web': { type: 'noul', noul: 0.42 },
  'rel_sg-pricing': { type: 'noul', noul: 0.81 },
  'rel_sg-chatbot': { type: 'noul', noul: 0.07 },
  'rel_sg-solution': { type: 'noul', noul: 0.3 },
  'rel_sg-works': { type: 'noul', noul: 0.55 },
  'rel_sg-recruit': { type: 'noul', noul: 0.01 },
  concern_cost: { type: 'noul', noul: 0.83 },
  concern_schedule: { type: 'noul', noul: 0.22 },
  concern_trust: { type: 'noul', noul: 0.4 },
  concern_ai_quality: { type: 'noul', noul: 0.05 },
  concern_scope: { type: 'noul', noul: 0.31 },
  cta_ok: { type: 'noul', noul: 0.74 },
});

test('Jev 正規化: 公式の形（マップ）', () => {
  const a = normalizeAnswers(officialAnswers(), Q);
  assert.deepStrictEqual(Object.keys(a), Object.keys(Q));
  assert.deepStrictEqual(a.visitor_type, {
    choice: '事業者', confidence: 0.72,
    probabilities: { '事業者': 0.72, '同業者・学習者': 0.2, other: 0.08 },
  });
  assert.deepStrictEqual(a.stage, { score: 2.1, confidence: 0.45, probabilities: { 0: 0.05, 1: 0.15, 2: 0.45, 3: 0.35 } });
  assert.deepStrictEqual(a.concern_cost, { noul: 0.83 });
  // 依頼意向の Noul 2問も noul の正規化形
  assert.deepStrictEqual(a.intent_compare, { noul: 0.66 });
  assert.deepStrictEqual(a.intent_contact, { noul: 0.12 });
  // カードごとの関連度は noul。キーは questions のまま（rel_<block_id>）
  assert.deepStrictEqual(a['rel_sg-pricing'], { noul: 0.81 });
  assert.deepStrictEqual(Object.keys(a).filter((k) => k.startsWith('rel_')), CANDIDATES.map((id) => 'rel_' + id));
  assert.deepStrictEqual(a.cta_ok, { noul: 0.74 });
  // legend や type など、正規化形に無いフィールドは残さない
  assert.deepStrictEqual(Object.keys(a.stage), ['score', 'confidence', 'probabilities']);
});

test('Jev 正規化: DEV 記事の形（type が先頭大文字、score の probabilities が配列）', () => {
  const raw = officialAnswers();
  raw.stage = { type: 'Score', score: 2.1, probabilities: [0.05, 0.15, 0.45, 0.35], confidence: 0.45 };
  raw.visitor_type.type = 'Choice';
  raw.cta_ok.type = 'Noul';
  const a = normalizeAnswers(raw, Q);
  assert.deepStrictEqual(a.stage.probabilities, { 0: 0.05, 1: 0.15, 2: 0.45, 3: 0.35 });
  assert.strictEqual(a.stage.score, 2.1);
  assert.strictEqual(a.visitor_type.choice, '事業者');
});

test('Jev 正規化: choice の probabilities が配列（選択肢の並び順／{label, probability}）', () => {
  const raw = officialAnswers();
  const keys = Object.keys(Q.visitor_type.criteria);
  raw.visitor_type = { choice: keys[1], probabilities: [0.1, 0.6, 0.1, 0.15, 0.05] }; // 5ラベルの並び順
  raw.industry = { choice: '不動産', probabilities: [{ label: '不動産', probability: 0.7 }, { key: '人材', p: 0.3 }, { label: '架空', probability: 1 }] };
  const a = normalizeAnswers(raw, Q);
  assert.strictEqual(a.visitor_type.probabilities[keys[1]], 0.6);
  // confidence が無ければ、選んだ選択肢の確率で補う
  assert.strictEqual(a.visitor_type.confidence, 0.6);
  assert.deepStrictEqual(a.industry.probabilities, { '不動産': 0.7, '人材': 0.3 });
  assert.strictEqual(a.industry.confidence, 0.7);
});

test('Jev 正規化: answers が配列（[{ key, ... }]）', () => {
  const o = officialAnswers();
  const arr = Object.keys(o).map((key) => Object.assign({ key }, o[key]));
  assert.deepStrictEqual(normalizeAnswers(arr, Q), normalizeAnswers(o, Q));
});

test('Jev 正規化: score が無く分布だけなら期待値、段階の説明文がキーでも読む', () => {
  const raw = officialAnswers();
  raw.stage = { probabilities: { [Q.stage.criteria[2]]: 0.5, [Q.stage.criteria[3]]: 0.5 } };
  const a = normalizeAnswers(raw, Q);
  assert.deepStrictEqual(a.stage, { score: 2.5, confidence: 0.5, probabilities: { 2: 0.5, 3: 0.5 } });
});

test('Jev 正規化: 選択肢に無い語・範囲外の値・欠けた回答は「確信なし」に倒す', () => {
  const raw = officialAnswers();
  raw.need = { choice: 'ラベルに無い語', confidence: 0.99, probabilities: { 'ラベルに無い語': 0.99 } };
  raw['rel_sg-web'] = { noul: 1.7 };
  raw['rel_sg-pricing'] = { noul: '0.9' };
  raw['rel_sg-unknown'] = { noul: 0.99 };
  raw.visitor_type = { choice: '営業・売り込み', confidence: 7 };
  raw.stage = { score: 99, confidence: -1 };
  raw.concern_cost = { noul: 'high' };
  raw.concern_trust = 0.9;
  delete raw.cta_ok;
  const a = normalizeAnswers(raw, Q);
  assert.deepStrictEqual(a.need, { choice: null, confidence: 0, probabilities: {} });
  // 範囲外の値は 1（最大の確信）に丸めない。回答なしにして、デフォルトの向きに倒す
  assert.deepStrictEqual(a['rel_sg-web'], { noul: null });
  assert.deepStrictEqual(a['rel_sg-pricing'], { noul: null });
  // 聞いていないカードの関連度は、モデルが返しても answers に入れない
  assert.ok(!('rel_sg-unknown' in a));
  assert.strictEqual(a.visitor_type.choice, '営業・売り込み');
  assert.strictEqual(a.visitor_type.confidence, 0); // 補える probabilities も無いので 0
  assert.strictEqual(a.stage.score, null);
  assert.strictEqual(a.stage.confidence, 0);
  assert.deepStrictEqual(a.concern_cost, { noul: null });
  assert.deepStrictEqual(a.concern_trust, { noul: 0.9 });
  assert.deepStrictEqual(a.cta_ok, { noul: null });
  // 推薦とルールに通しても例外にならない
  assert.doesNotThrow(() => {
    const rec = recommend({ answers: a, candidates: CANDIDATES, slots: cardSlots('T2'), currentUrl: '/' });
    applyRules({ answers: a, trigger: 'T2', currentUrl: '/', picks: rec.picks });
  });
});

test('Jev 正規化: 範囲外の値は丸めずに捨てる。丸め誤差だけ許し、捨てた個数を数える', () => {
  const raw = officialAnswers();
  raw['rel_sg-web'] = { noul: 1.0000004 };
  raw['rel_sg-pricing'] = { noul: -0.0000004 };
  raw['rel_sg-works'] = { noul: 1.01 };
  raw['rel_sg-chatbot'] = { noul: -0.2 };
  // confidence が範囲外でも、分布が正しければ選んだ選択肢の確率で補う
  raw.visitor_type = { choice: '事業者', confidence: 72, probabilities: { '事業者': 0.72, '同業者・学習者': 28 } };
  // score は正しく confidence だけ範囲外なら、分布の最大で補う
  raw.stage = { score: 2.1, confidence: 45, probabilities: { 0: 0.05, 1: 0.15, 2: 0.45, 3: 0.35 } };
  const stats = { out_of_range: 0 };
  const a = normalizeAnswers(raw, Q, stats);
  assert.deepStrictEqual(a['rel_sg-web'], { noul: 1 });
  assert.deepStrictEqual(a['rel_sg-pricing'], { noul: 0 });
  assert.deepStrictEqual(a['rel_sg-works'], { noul: null });
  assert.deepStrictEqual(a['rel_sg-chatbot'], { noul: null });
  assert.deepStrictEqual(a.visitor_type, { choice: '事業者', confidence: 0.72, probabilities: { '事業者': 0.72 } });
  assert.deepStrictEqual(a.stage, { score: 2.1, confidence: 0.45, probabilities: { 0: 0.05, 1: 0.15, 2: 0.45, 3: 0.35 } });
  assert.strictEqual(stats.out_of_range, 5);
  // 範囲外の score は、分布があっても期待値で補わない
  const b = normalizeAnswers(Object.assign(officialAnswers(), { stage: { score: 3.2, confidence: 0.9, probabilities: [0, 0, 0, 1] } }), Q);
  assert.deepStrictEqual(b.stage, { score: null, confidence: 0, probabilities: { 0: 0, 1: 0, 2: 0, 3: 1 } });
});

test('Jev 正規化: 全回答が百分率の形（noul:35 / confidence:62 / score:70）で返っても、結果はデフォルト', async () => {
  // 未承認も出せる状態にしても、何も選ばれない（承認フィルタに助けられているのではないことの確認）
  useFixtures(null, { includeUnapproved: true });
  const { questions, candidates } = buildQuestions({ passed: [], currentUrl: '/' });
  const raw = {};
  for (const key of Object.keys(questions)) {
    const q = questions[key];
    if (q.type === 'choice') raw[key] = { choice: Object.keys(q.criteria)[0], confidence: 62 };
    else if (q.type === 'score') raw[key] = { score: 70, confidence: 45 };
    else raw[key] = { noul: 35 };
  }
  const a = normalizeAnswers(raw, questions);
  for (const trigger of ['T1', 'T2', 'T3']) {
    const rec = recommend({ answers: a, candidates, slots: cardSlots(trigger), currentUrl: '/', rng: () => 0.5 });
    assert.deepStrictEqual(rec.picks, {}, trigger);
    const r = applyRules({ answers: a, trigger, currentUrl: '/', picks: rec.picks });
    assert.strictEqual(r.is_default, true, trigger);
    assert.deepStrictEqual(r.matched, [7], trigger);
  }
  // jev の経路では、捨てた個数だけをログに出す（本文は出さない）
  const lines = [];
  const quiet = console.error;
  console.error = (...args) => { lines.push(args); };
  try {
    const out = await withEnv({ JEV_API_KEY: 'k' }, () => decide(STATE, questions, { provider: 'jev', fetch: async () => jsonRes(200, { answers: raw }) }));
    assert.strictEqual(out.answers.cta_ok.noul, null);
  } finally { console.error = quiet; }
  assert.strictEqual(lines.length, 1);
  assert.deepStrictEqual(lines[0].slice(0, 1), ['[nq] jev out_of_range']);
  assert.ok(lines[0][1] > 0 && lines[0].length === 2);
});

test('Jev 正規化: answers がオブジェクトでも配列でもなければ null', () => {
  for (const bad of [null, undefined, 'x', 42]) assert.strictEqual(normalizeAnswers(bad, Q), null);
});

test('stub: 決定的で、推薦とルールに通すと必ずデフォルト', async () => {
  const a = await decide(STATE, Q, { provider: 'stub' });
  const b = await decide(STATE, Q, { provider: 'stub' });
  assert.strictEqual(a.provider, 'stub');
  assert.deepStrictEqual(a.answers, b.answers);
  assert.deepStrictEqual(Object.keys(a.answers), Object.keys(Q));
  // 関連度はどのカードも下限（0.45）未満
  for (const id of CANDIDATES) assert.strictEqual(a.answers['rel_' + id].noul, 0.1);
  for (const trigger of ['T1', 'T2', 'T3']) {
    // 必ず一様探索に入る rng でも、門（rel_gate）の手前で止まる
    const rec = recommend({ answers: a.answers, candidates: CANDIDATES, slots: cardSlots(trigger), currentUrl: '/', rng: () => 0 });
    assert.deepStrictEqual(rec.picks, {});
    const r = applyRules({ answers: a.answers, trigger, currentUrl: '/', picks: rec.picks });
    assert.strictEqual(r.is_default, true);
    assert.deepStrictEqual(r.matched, [7]);
  }
});

test('stub: テスト用の差し替えは、質問に在るキーだけに効く', async () => {
  decideLib.__setStubForTest({ 'rel_sg-web': { noul: 0.9 }, 'rel_sg-unknown': { noul: 0.9 }, stage: { score: 2.4 } });
  const a = await decide(STATE, Q, { provider: 'stub' });
  assert.deepStrictEqual(a.answers['rel_sg-web'], { noul: 0.9 });
  assert.strictEqual(a.answers.stage.score, 2.4);
  assert.ok(!('rel_sg-unknown' in a.answers));
  decideLib.__setStubForTest(null);
  const b = await decide(STATE, Q, { provider: 'stub' });
  assert.deepStrictEqual(b.answers['rel_sg-web'], { noul: 0.1 });
});

const withEnv = async (vars, fn) => {
  const keep = {};
  for (const k of Object.keys(vars)) { keep[k] = process.env[k]; if (vars[k] == null) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return await fn(); } finally {
    for (const k of Object.keys(keep)) { if (keep[k] == null) delete process.env[k]; else process.env[k] = keep[k]; }
  }
};
const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

test('jev: 公式リファレンスどおりのリクエストを送り、レスポンスを正規化して返す', async () => {
  let seen = null;
  const fetch = async (url, init) => { seen = { url, init }; return jsonRes(200, { model: 'jev-1.13.0', answers: officialAnswers(), usage: {} }); };
  const out = await withEnv({ JEV_API_KEY: 'test-key', JEV_MODEL: null, JEV_BASE_URL: null }, () => decide(STATE, Q, { provider: 'jev', fetch }));
  assert.strictEqual(seen.url, 'https://api.typesafe.ai/v1/systemone');
  assert.strictEqual(seen.init.method, 'POST');
  assert.strictEqual(seen.init.headers.Authorization, 'Bearer test-key');
  assert.ok(seen.init.signal);
  const sent = JSON.parse(seen.init.body);
  assert.deepStrictEqual(Object.keys(sent), ['model', 'state', 'questions']);
  assert.strictEqual(sent.model, 'jev-1.13.0');
  assert.deepStrictEqual(sent.state, STATE);
  assert.deepStrictEqual(sent.questions, Q);
  assert.strictEqual(out.provider, 'jev');
  assert.strictEqual(out.model, 'jev-1.13.0');
  // 公式仕様: type は小文字。noul の質問は type と instructions だけ（criteria は任意なので送らない）
  for (const q of Object.values(sent.questions)) assert.ok(['choice', 'score', 'noul'].includes(q.type));
  assert.deepStrictEqual(Object.keys(sent.questions['rel_sg-pricing']), ['type', 'instructions']);
  assert.ok(sent.questions['rel_sg-pricing'].instructions.startsWith('この訪問者は次の説明に当てはまる：'));
  assert.deepStrictEqual(out.answers['rel_sg-pricing'], { noul: 0.81 });
  assert.ok(Number.isInteger(out.latency_ms));
});

test('jev: キー未設定・HTTP エラー・タイムアウト・壊れた応答は throw（本文は載せない）', async () => {
  await withEnv({ JEV_API_KEY: null }, async () => {
    await assert.rejects(decide(STATE, Q, { provider: 'jev', fetch: async () => jsonRes(200, {}) }), { code: 'not_configured' });
  });
  await withEnv({ JEV_API_KEY: 'k' }, async () => {
    const quiet = console.error;
    console.error = () => {};
    try {
      await assert.rejects(decide(STATE, Q, { provider: 'jev', fetch: async () => jsonRes(429, { error: 'secret detail' }) }),
        (e) => e.code === 'http_429' && !String(e.message).includes('secret'));
    } finally { console.error = quiet; }
    await assert.rejects(decide(STATE, Q, { provider: 'jev', fetch: async () => jsonRes(200, { answers: 'nope' }) }), { code: 'bad_response' });
    const slow = (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
    await assert.rejects(decide(STATE, Q, { provider: 'jev', fetch: slow, timeout_ms: 20 }), { code: 'timeout' });
  });
});

// プロバイダは stub と jev の2つだけ。知らない名前は黙って別の経路に落とさず、外部も呼ばずに失敗させる
// （呼び出し側がデフォルトに倒す）。
test('未知のプロバイダは throw（外部は呼ばない）', async () => {
  let called = 0;
  const fetch = async () => { called++; return jsonRes(200, {}); };
  await assert.rejects(decide(STATE, Q, { provider: 'nope', fetch }), (e) => e.code === 'unknown_provider' && e.provider === 'nope');
  assert.strictEqual(called, 0);
});
