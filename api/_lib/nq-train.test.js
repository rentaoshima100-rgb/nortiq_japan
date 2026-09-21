// /api/nq-train のハンドラを、モックの req / res と、メモリ上の PostgREST もどきで端から端まで通すテスト。
// 外部は呼ばない。（Function 本体は api/ 直下だが、テストは `node --test "api/_lib/*.test.js"` で拾えるようここに置く）
const test = require('node:test');
const assert = require('node:assert');
const { useFixtures } = require('./__fixtures__/setup');
const { FEATURES, priorModel, weightKeys } = require('./features');
const learn = require('./learn');
const handler = require('../nq-train');

const ARTICLE = '/article-website-renewal-unexpected-additional-cost';
const ARTICLE_TITLE = 'サイトリニューアル 追加費用が発生する原因と対策';
const ENV = ['CRON_SECRET', 'NQ_LEARN', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

let keepEnv;
let keepFetch;
let keepError;
let keepLog;

test.beforeEach(() => {
  useFixtures();
  keepEnv = ENV.map((k) => process.env[k]);
  process.env.CRON_SECRET = 'cron-secret-test';
  process.env.NQ_LEARN = '1';
  process.env.SUPABASE_URL = 'https://example.supabase.co/';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  keepFetch = globalThis.fetch;
  keepError = console.error;
  keepLog = console.log;
  console.error = () => {};
  console.log = () => {};
  globalThis.fetch = async (url) => { throw new Error('unexpected fetch: ' + url); };
});

test.afterEach(() => {
  ENV.forEach((k, i) => { if (keepEnv[i] == null) delete process.env[k]; else process.env[k] = keepEnv[i]; });
  globalThis.fetch = keepFetch;
  console.error = keepError;
  console.log = keepLog;
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
const req = (over) => Object.assign({ method: 'GET', headers: { authorization: 'Bearer cron-secret-test', 'user-agent': 'vercel-cron/1.0' } }, over || {});
async function call(r) { const res = mockRes(); await handler(r || req(), res); return res; }

// メモリ上の PostgREST もどき。このバッチが使う書き方（is.false / is.null / not.is.null / eq / gte / lt / lte /
// order=created_at.desc / limit / select の別名 / upsert / 条件つき DELETE）だけを解釈する。
// offset は解釈しない（件数が増えると失敗し続ける読み方なので、使っていたらテストが落ちるようにしてある）。
//   opts.maxRows: サーバ側の1ページの上限   opts.respond(call) → 応答を差し替える（失敗の再現用）
function fakeSupabase(db, opts) {
  const o = opts || {};
  const calls = [];
  const match = (row, params) => {
    for (const [k, v] of params) {
      if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue;
      if (v === 'is.false') { if (row[k] !== false) return false; continue; }
      if (v === 'is.null') { if (row[k] != null) return false; continue; }
      if (v === 'not.is.null') { if (row[k] == null) return false; continue; }
      if (v.startsWith('eq.')) { if (String(row[k]) !== v.slice(3)) return false; continue; }
      if (v.startsWith('gte.')) { if (!(Date.parse(row[k]) >= Date.parse(v.slice(4)))) return false; continue; }
      if (v.startsWith('lte.')) { if (!(Date.parse(row[k]) <= Date.parse(v.slice(4)))) return false; continue; }
      if (v.startsWith('lt.')) { if (!(Date.parse(row[k]) < Date.parse(v.slice(3)))) return false; continue; }
      throw new Error('fakeSupabase: 未対応の条件 ' + k + '=' + v);
    }
    return true;
  };
  const fetch = async (url, init) => {
    const u = new URL(url);
    const table = u.pathname.replace('/rest/v1/', '');
    const params = Array.from(u.searchParams.entries());
    const c = { method: init.method, table, url: String(url), select: u.searchParams.get('select'), body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers, signal: init.signal };
    calls.push(c);
    const forced = typeof o.respond === 'function' ? o.respond(c) : null;
    if (forced) return forced;
    db[table] = db[table] || [];
    if (init.method === 'GET') {
      const limit = Math.min(Number(u.searchParams.get('limit') || 1000), o.maxRows || 1000);
      const dir = /^created_at.desc/.test(u.searchParams.get('order') || '') ? -1 : 1;
      const rows = db[table].filter((r) => match(r, params))
        .sort((a, b) => dir * (Date.parse(a.created_at) - Date.parse(b.created_at)))
        .slice(0, limit)
        .map((r) => (c.select && c.select.includes('history:state->閲覧履歴') ? Object.assign({ history: r.state ? r.state['閲覧履歴'] : null }, r) : r));
      return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(rows)) };
    }
    if (init.method === 'POST') {
      for (const row of Array.isArray(c.body) ? c.body : [c.body]) {
        const at = table === 'nq_transitions' ? db[table].findIndex((r) => r.from_url === row.from_url && r.to_url === row.to_url) : -1;
        if (at >= 0) db[table][at] = row; else db[table].push(row);
      }
      return { ok: true, status: 201 };
    }
    if (init.method === 'DELETE') {
      db[table] = db[table].filter((r) => !match(r, params));
      return { ok: true, status: 204 };
    }
    throw new Error('fakeSupabase: 未対応のメソッド ' + init.method);
  };
  return { fetch, calls, db };
}

const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
const F = (rel) => FEATURES.map((k) => (k === 'bias' ? 1 : k === 'rel' ? rel : 0));
const state = (...titles) => ({ '流入元': 'Google検索', '閲覧履歴': titles.map((title) => ({ title, type: '記事', '読み方': 'じっくり' })) });

// 適用群の1セッション（記事でカード2枚が表示 → 1枚目を押して /web を読み、/diagnostic に到達）と、
// ホールドアウトの1セッション（記事だけ見て離脱）。
function sampleDb() {
  return {
    nq_decisions: [
      {
        decision_id: 'd_served0001', created_at: ago(60), session_id: 'r_aaaaaa', page_url: ARTICLE, trigger: 'T1',
        holdout: false, shadow: false, is_default: false, state: state(ARTICLE_TITLE), policy: 'prior-v1',
        candidates: [
          { block_id: 'sg-web', rel: 0.9, target_url: '/web', features: F(2.1972), score: 0.08, propensity: { 'slot-mid': 0.975 }, picked: 'slot-mid' },
          { block_id: 'sg-pricing', rel: 0.7, target_url: '/pricing', features: F(0.8473), score: 0.04, propensity: { 'slot-mid': 0.025, 'slot-end': 1 }, picked: 'slot-end' },
          { block_id: 'sg-dx', rel: 0.1, excluded: 'rel_floor' },
        ],
        slots: { 'slot-mid': { block_id: 'sg-web', variant: 'default', propensity: 0.975 }, 'slot-end': { block_id: 'sg-pricing', variant: 'default', propensity: 1 } },
      },
      {
        decision_id: 'd_holdout001', created_at: ago(50), session_id: 'r_bbbbbb', page_url: ARTICLE, trigger: 'T1',
        holdout: true, shadow: false, is_default: true, state: state(ARTICLE_TITLE), policy: 'prior-v1',
        candidates: [{ block_id: 'sg-web', rel: 0.8, target_url: '/web', features: F(1.3863), score: 0.06, propensity: { 'slot-mid': 1 }, picked: 'slot-mid' }],
        slots: { 'slot-mid': { block_id: 'sg-web', variant: 'default', propensity: 1 } },
      },
    ],
    nq_events: [
      { event_id: 'e_1', created_at: ago(59), decision_id: 'd_served0001', session_id: 'r_aaaaaa', type: 'shown', slot: 'slot-mid', block_id: 'sg-web', page_url: ARTICLE },
      { event_id: 'e_2', created_at: ago(58), decision_id: 'd_served0001', session_id: 'r_aaaaaa', type: 'shown', slot: 'slot-end', block_id: 'sg-pricing', page_url: ARTICLE },
      { event_id: 'e_3', created_at: ago(57), decision_id: 'd_served0001', session_id: 'r_aaaaaa', type: 'click', slot: 'slot-mid', block_id: 'sg-web', page_url: ARTICLE },
      { event_id: 'e_4', created_at: ago(55), decision_id: 'd_served0001', session_id: 'r_aaaaaa', type: 'engaged', slot: null, block_id: 'sg-web', page_url: '/web' },
      { event_id: 'e_5', created_at: ago(54), decision_id: 'd_served0001', session_id: 'r_aaaaaa', type: 'goal', slot: null, block_id: null, page_url: '/diagnostic' },
      { event_id: 'e_6', created_at: ago(49), decision_id: 'd_holdout001', session_id: 'r_bbbbbb', type: 'shown', slot: 'slot-mid', block_id: 'sg-guidebook', page_url: ARTICLE },
    ],
    nq_model: [],
    nq_transitions: [{ from_url: '/old-page', to_url: learn.EXIT, count: 9, goal_count: 0, updated_at: ago(60 * 24) }],
  };
}

test('GET 以外は 405。CRON_SECRET が合わない・未設定なら 401 で、何も読まない', async () => {
  assert.strictEqual((await call(req({ method: 'POST' }))).statusCode, 405);
  assert.strictEqual((await call(req({ headers: {} }))).statusCode, 401);
  assert.strictEqual((await call(req({ headers: { authorization: 'Bearer wrong' } }))).statusCode, 401);
  assert.strictEqual((await call(req({ headers: { authorization: 'cron-secret-test' } }))).statusCode, 401);
  delete process.env.CRON_SECRET;
  assert.strictEqual((await call(req({ headers: { authorization: 'Bearer undefined' } }))).statusCode, 401);
  assert.strictEqual((await call(req({ headers: { authorization: 'Bearer ' } }))).statusCode, 401);
});

test('NQ_LEARN が 1 でない・Supabase 未設定なら、何もしないで 200', async () => {
  process.env.NQ_LEARN = '0';
  let res = await call();
  assert.deepStrictEqual([res.statusCode, res.body], [200, { ok: true, skipped: 'disabled' }]);
  process.env.NQ_LEARN = '1';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  res = await call();
  assert.deepStrictEqual([res.statusCode, res.body], [200, { ok: true, skipped: 'not_configured' }]);
  assert.strictEqual(res.headers['Cache-Control'], 'no-store');
});

test('読む → 学習 → nq_model に1行追加 → nq_transitions を入れ替える', async () => {
  const sb = fakeSupabase(sampleDb(), { maxRows: 2 }); // ページングを通すため、1ページ2行に絞る
  globalThis.fetch = sb.fetch;
  const res = await call();
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.ok, true);
  assert.deepStrictEqual(res.body.wrote, { model: true, transitions: true });
  assert.deepStrictEqual([res.body.n_impressions, res.body.n_positive, res.body.n_sessions, res.body.converged], [2, 1, 2, true]);

  // 認証ヘッダとタイムアウトを付けて呼んでいる。
  for (const c of sb.calls) {
    assert.strictEqual(c.headers.apikey, 'service-role-test');
    assert.strictEqual(c.headers.Authorization, 'Bearer service-role-test');
    assert.ok(c.signal);
  }
  // 読み込みは新しい順で、offset を使わない（前のページの最後の時刻を、次のページの上限にする）。
  const reads = sb.calls.filter((c) => c.method === 'GET');
  assert.ok(reads.every((c) => /order=created_at.desc/.test(c.url) && !/offset=/.test(c.url)));
  // nq_events は6行とも直近180日のぶん。1ページ2行でも、1行も落とさず重複もなく読めている
  // （ページの最後の時刻の行はいったん捨てて次のページで読み直すので、1ページで進むのは1行ずつ）。
  const recentReads = reads.filter((c) => c.table === 'nq_events' && !/decision_id=/.test(c.url));
  assert.strictEqual(recentReads.length, 7);
  assert.ok(recentReads.slice(1).every((c) => /created_at=lte?./.test(c.url)));
  // 180日より古い側は、判定に結びついた行とゴールだけを別に読む（今回は0行）。
  assert.strictEqual(reads.filter((c) => c.table === 'nq_events' && /decision_id=not.is.null/.test(c.url)).length, 1);
  assert.strictEqual(reads.filter((c) => c.table === 'nq_events' && /decision_id=is.null&type=eq.goal/.test(c.url)).length, 1);
  assert.deepStrictEqual(res.body.truncated, { decisions: false, events: false, paths: false });

  // nq_model: 重みの名前は weightKeys() と同じ。学習した行は適用群の2枚だけ（ホールドアウトは入らない）。
  assert.strictEqual(sb.db.nq_model.length, 1);
  const m = sb.db.nq_model[0];
  assert.match(m.version, /^m_\d{8}T\d{6}Z$/);
  assert.strictEqual(m.version, res.body.version);
  assert.deepStrictEqual(Object.keys(m.mean), weightKeys());
  assert.deepStrictEqual(Object.keys(m.variance), weightKeys());
  assert.strictEqual(m.n_impressions, 2);
  const prior = priorModel();
  assert.ok(m.mean['card:sg-web'] > 0, '成果が出たカードの補正は上がる');
  assert.ok(m.mean['card:sg-pricing'] < 0, '表示だけで成果の無いカードの補正は下がる');
  assert.strictEqual(m.mean['card:sg-dx'], 0);
  for (const k of weightKeys()) assert.ok(m.variance[k] > 0 && m.variance[k] <= prior.variance[k] + 1e-9);

  // aux: V は「記事 → /web → /diagnostic → ゴール」と「記事 → 離脱」から。/api/suggest の features.js が読む形。
  assert.deepStrictEqual(Object.keys(m.aux).sort(), ['V', 'V_type', 'cov']);
  assert.ok(m.aux.V['/diagnostic'] > m.aux.V[ARTICLE]);
  assert.ok(m.aux.V_type.article > 0 && m.aux.V_type.article < 1);
  assert.ok(m.aux.cov[ARTICLE]['/web'] > 0);
  // ope: 行が少ないので全行で学習した重みで評価している。比べるのは1枚目のスロット（slot-mid）の行だけで、
  // slot-end の行は by_slot に分かれる。
  assert.deepStrictEqual([m.ope.n, m.ope.in_sample, m.ope.cap], [1, true, 20]);
  assert.strictEqual(m.ope.logged.rate, 1);
  assert.strictEqual(m.ope.rel_only.clipped, 0);
  assert.deepStrictEqual([m.ope.by_slot['slot-end'].n, m.ope.by_slot['slot-end'].logged.rate], [1, 0]);

  // nq_transitions: 今回のぶんで入れ替わり、古い行は消える。
  const t = sb.db.nq_transitions;
  assert.ok(!t.some((r) => r.from_url === '/old-page'));
  assert.deepStrictEqual(
    t.map((r) => [r.from_url, r.to_url, r.count, r.goal_count].join(' ')).sort(),
    [`${ARTICLE} (exit) 1 0`, `${ARTICLE} /web 1 1`, '/diagnostic (goal) 1 1', '/web /diagnostic 1 1'].sort(),
  );
  const upsert = sb.calls.find((c) => c.method === 'POST' && c.table === 'nq_transitions');
  assert.strictEqual(upsert.headers.Prefer, 'resolution=merge-duplicates,return=minimal');
  assert.ok(t.every((r) => r.updated_at === m.created_at));
});

test('データ0件: 事前分布そのままの1行を書く', async () => {
  const sb = fakeSupabase({});
  globalThis.fetch = sb.fetch;
  const res = await call();
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual([res.body.n_impressions, res.body.n_sessions, res.body.n_transitions], [0, 0, 0]);
  const m = sb.db.nq_model[0];
  assert.deepStrictEqual(m.mean, priorModel().mean);
  assert.deepStrictEqual(m.variance, priorModel().variance);
  assert.deepStrictEqual(m.aux, { V: {}, V_type: {}, cov: {} });
  assert.strictEqual(m.ope.n, 0);
});

test('select に日本語のキーを書けない PostgREST なら、state ごと読み直す', async () => {
  const sb = fakeSupabase(sampleDb(), {
    respond: (c) => (c.method === 'GET' && c.select && c.select.includes('history:state->') ? { ok: false, status: 400, json: async () => ({ message: 'parse error' }) } : null),
  });
  globalThis.fetch = sb.fetch;
  const res = await call();
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.n_sessions, 2);
  assert.ok(sb.calls.some((c) => c.method === 'GET' && c.select === 'decision_id,session_id,created_at,page_url,state'));
  assert.strictEqual(sb.db.nq_transitions.length, 4);
});

test('読み込みに失敗したら何も書かずに 500。外部のエラー本文は応答に出さない', async () => {
  const sb = fakeSupabase(sampleDb(), {
    respond: (c) => (c.method === 'GET' && c.table === 'nq_events' ? { ok: false, status: 503, json: async () => ({ message: 'secret detail https://example.supabase.co key=abc' }) } : null),
  });
  globalThis.fetch = sb.fetch;
  const res = await call();
  assert.strictEqual(res.statusCode, 500);
  assert.deepStrictEqual(res.body, { ok: false, error: 'read_nq_events_503' });
  assert.ok(!sb.calls.some((c) => c.method !== 'GET'));

  // fetch 自体の例外（ネットワーク断・タイムアウト）は、名前も返さない。
  globalThis.fetch = async () => { throw new Error('connect ECONNREFUSED 10.0.0.1 key=abc'); };
  const down = await call();
  assert.deepStrictEqual([down.statusCode, down.body], [500, { ok: false, error: 'failed' }]);
});

test('nq_transitions の書き込みに失敗しても、学習済みモデルは書けているので 200', async () => {
  const sb = fakeSupabase(sampleDb(), {
    respond: (c) => (c.method === 'POST' && c.table === 'nq_transitions' ? { ok: false, status: 500, json: async () => ({}) } : null),
  });
  globalThis.fetch = sb.fetch;
  const res = await call();
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body.wrote, { model: true, transitions: false });
  // 上書きに失敗したら、古い行を消すところまで進まない（表を空にしない）。
  assert.ok(sb.db.nq_transitions.some((r) => r.from_url === '/old-page'));
  assert.ok(!sb.calls.some((c) => c.method === 'DELETE'));
});

test('時間切れが近ければ、書く前に自分から止まる', async () => {
  const sb = fakeSupabase(sampleDb());
  let t = 1_800_000_000_000;
  // 読むたびに 20 秒進む時計。3回目の読み込みの前に予算（50秒）を超える。
  await assert.rejects(handler.run({ fetch: sb.fetch, now: () => { t += 20000; return t; } }), (e) => e.nq === true && e.code === 'deadline');
  assert.strictEqual(sb.db.nq_model.length, 0);
});

// ---------- 行数が増えても失敗し続けない ----------

// 1分おきに1行ずつ、n 行のデフォルト表示（decision_id が null の shown）を足す。
function manyDefaultShown(db, n, startMinutesAgo) {
  for (let i = 0; i < n; i++) {
    db.nq_events.push({ event_id: 'e_bulk' + i, created_at: ago(startMinutesAgo + i), decision_id: null, session_id: 'r_bulk' + (i % 7), type: 'shown', slot: 'slot-end', block_id: 'sg-guidebook', page_url: ARTICLE });
  }
}

test('ページ数の上限に当たっても失敗にしない: 新しい側から読めたぶんで学習し、truncated を残す', async () => {
  const db = sampleDb();
  manyDefaultShown(db, 40, 120); // サンプルのセッション（60分前〜）より古い側に40行
  const sb = fakeSupabase(db, { maxRows: 5 });
  const errors = [];
  console.error = (...args) => { errors.push(args.join(' ')); };
  // 以前は上限を超えると read_nq_events_too_many で 500 になり、行数が減らない限り毎晩失敗し続けた。
  const out = await handler.run({ fetch: sb.fetch, maxPages: 3 });
  assert.strictEqual(out.ok, true);
  assert.deepStrictEqual(out.truncated, { decisions: false, events: true, paths: false });
  // 新しい側（サンプルのセッション）は読めているので、学習の結果は変わらない。
  assert.deepStrictEqual([out.n_impressions, out.n_positive], [2, 1]);
  assert.deepStrictEqual(out.wrote, { model: true, transitions: true });
  assert.strictEqual(sb.db.nq_model.length, 1);
  // 直近ぶんを打ち切ったら、180日より古い側は読みに行かない。
  assert.ok(!sb.calls.some((c) => c.method === 'GET' && c.table === 'nq_events' && /decision_id=/.test(c.url)));
  assert.strictEqual(sb.calls.filter((c) => c.method === 'GET' && c.table === 'nq_events').length, 3);

  // ハンドラ経由でも 200。打ち切りはエラーのログにも1行出る。
  const sb2 = fakeSupabase(db, { maxRows: 5 });
  globalThis.fetch = sb2.fetch;
  const res = await call();
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.truncated.events, false); // 既定の上限（300ページ）には当たらない
  assert.ok(!errors.some((line) => line.includes('truncated')));
});

test('読み込みの持ち時間を過ぎたら、そこで打ち切って学習と書き込みに進む', async () => {
  const db = sampleDb();
  manyDefaultShown(db, 40, 120);
  const sb = fakeSupabase(db, { maxRows: 5 });
  // nq_events を1ページ読むたびに 12 秒進む時計。持ち時間（30秒）を3ページ目のあとで超える。
  let t = Date.now();
  const slow = async (url, init) => { if (String(url).includes('/nq_events')) t += 12000; return sb.fetch(url, init); };
  const out = await handler.run({ fetch: slow, now: () => t });
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.truncated.events, true);
  assert.deepStrictEqual(out.wrote, { model: true, transitions: true });
  assert.strictEqual(sb.calls.filter((c) => c.method === 'GET' && c.table === 'nq_events').length, 3);
});

test('イベントを打ち切った晩は、読めた範囲より前に最後の判定があるセッションを遷移表に入れない', async () => {
  const db = sampleDb();
  // 3日前のセッション。記事 → /web と進んでゴールに着いたが、その晩はここまでイベントを読めない。
  db.nq_decisions.push({
    decision_id: 'd_old0000001', created_at: ago(3 * 1440), session_id: 'r_cccccc', page_url: '/pricing', trigger: 'T2',
    holdout: true, shadow: false, is_default: true, state: state(), policy: 'prior-v1', candidates: null, slots: {},
  });
  db.nq_events.push({ event_id: 'e_old1', created_at: ago(3 * 1440 - 5), decision_id: null, session_id: 'r_cccccc', type: 'goal', slot: null, block_id: null, page_url: '/diagnostic' });
  const full = await handler.run({ fetch: fakeSupabase(JSON.parse(JSON.stringify(db))).fetch });
  assert.strictEqual(full.n_sessions, 3);
  // 1ページ3行 × 3ページで打ち切る。直近の6行は読めるが、3日前のゴールは「ページの最後の時刻の行」として
  // 捨てられたところで上限に当たり、読めていない。
  const sb = fakeSupabase(db, { maxRows: 3 });
  const out = await handler.run({ fetch: sb.fetch, maxPages: 3 });
  assert.strictEqual(out.truncated.events, true);
  assert.strictEqual(out.n_sessions, 2);
  // 「/pricing で離脱」という、読めていないだけの遷移を作らない。
  assert.ok(!sb.db.nq_transitions.some((r) => r.from_url === '/pricing'));
});

test('同じ時刻の行がページの切れ目をまたいでも、落とさず重複もさせない。180日より古い側は学習に要る行だけ読む', async () => {
  const db = sampleDb();
  // 表示の2行（e_1 / e_2）を同じ時刻にそろえる。1ページ2行だと、この2行がページの切れ目に掛かる。
  db.nq_events[1].created_at = db.nq_events[0].created_at;
  // 200日前の適用群の判定と、そのイベント。デフォルト表示（decision_id が null）の shown は学習に要らない。
  const day = 1440;
  const old = JSON.parse(JSON.stringify(db.nq_decisions[0]));
  Object.assign(old, { decision_id: 'd_old0000002', created_at: ago(200 * day), session_id: 'r_dddddd' });
  db.nq_decisions.push(old);
  db.nq_events.push(
    { event_id: 'e_o1', created_at: ago(200 * day - 1), decision_id: 'd_old0000002', session_id: 'r_dddddd', type: 'shown', slot: 'slot-mid', block_id: 'sg-web', page_url: ARTICLE },
    { event_id: 'e_o2', created_at: ago(200 * day - 2), decision_id: 'd_old0000002', session_id: 'r_dddddd', type: 'click', slot: 'slot-mid', block_id: 'sg-web', page_url: ARTICLE },
    { event_id: 'e_o3', created_at: ago(200 * day - 3), decision_id: null, session_id: 'r_dddddd', type: 'goal', slot: null, block_id: null, page_url: '/diagnostic' },
    { event_id: 'e_o4', created_at: ago(200 * day - 4), decision_id: null, session_id: 'r_eeeeee', type: 'shown', slot: 'slot-end', block_id: 'sg-guidebook', page_url: ARTICLE },
  );
  const served = [];
  const sb = fakeSupabase(db, { maxRows: 2 });
  const spy = async (url, init) => {
    const r = await sb.fetch(url, init);
    if (init.method === 'GET' && String(url).includes('/nq_events')) { const rows = await r.json(); served.push(...rows); return Object.assign({}, r, { json: async () => rows }); }
    return r;
  };
  const out = await handler.run({ fetch: spy });
  assert.deepStrictEqual(out.truncated, { decisions: false, events: false, paths: false });
  // 直近の2枚 ＋ 200日前の1枚（クリック後にゴール → 成果）。同じ時刻の表示2行はどちらも数えられている。
  assert.deepStrictEqual([out.n_impressions, out.n_positive], [3, 2]);
  // 200日前のデフォルト表示は、どのページにも載ってこない（読む量を減らす）。遷移表にも入らない（180日より前）。
  assert.ok(!served.some((e) => e.event_id === 'e_o4'));
  assert.ok(served.some((e) => e.event_id === 'e_o3'));
  assert.strictEqual(out.n_sessions, 2);
});
