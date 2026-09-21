// 次ページ提案（nq）— 学習済みモデル（nq_model の最新の1行）を読む。
//
//   loadModel() -> { version, mean, variance, aux }
//
// リクエスト中は学習しない。夜間バッチ（api/nq-train.js）が保存した平均と分散を読むだけ
// （設計書7章「4. モデル」）。方策が ts のときだけ api/suggest.js から呼ばれる。
//
// 応答を遅らせないための決まり:
//   - 読めた行はモジュールスコープに10分キャッシュする（Function のインスタンスが生きている間だけ効く）。
//   - 読みに行くのは最長 300ms。未設定・失敗・0行・壊れた行なら事前分布（priorModel）を返す。
//     失敗も1分だけ覚えておき、Supabase が落ちている間、毎リクエスト 300ms 待つのを避ける。
// 行に無い重み（学習後に足したカードなど）は、事前分布の値で補ってから返す。
//
// env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（log.js と同じ。キーはコミットしない）。

const { priorModel } = require('./features');
const { mergeModel } = require('./recommend');

const TTL_OK_MS = 10 * 60 * 1000;
const TTL_FAIL_MS = 60 * 1000;
const TIMEOUT_MS = 300;

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

let cache = null; // { at, ttl, model }

const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchLatest(doFetch) {
  const base = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await doFetch(`${base}/rest/v1/nq_model?select=version,mean,variance,aux&order=created_at.desc&limit=1`, {
    method: 'GET',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) { console.error('[nq] model http', r.status); return null; }
  const rows = await r.json().catch(() => null);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!isObj(row) || !isObj(row.mean) || !isObj(row.variance)) return null;
  const merged = mergeModel(row);
  return {
    version: typeof row.version === 'string' && row.version ? row.version : 'unknown',
    mean: merged.mean,
    variance: merged.variance,
    aux: isObj(row.aux) ? row.aux : {},
  };
}

// opts: { fetch, now }。どちらもテストで差し替えるためのもの。
async function loadModel(opts) {
  const o = opts || {};
  const now = typeof o.now === 'function' ? o.now() : Date.now();
  if (cache && now - cache.at < cache.ttl) return cache.model;
  if (!configured()) return priorModel();

  let model = null;
  try {
    model = await fetchLatest(o.fetch || globalThis.fetch);
  } catch (e) {
    console.error('[nq] model failed', String((e && e.name) || 'error'));
  }
  cache = { at: now, ttl: model ? TTL_OK_MS : TTL_FAIL_MS, model: model || priorModel() };
  return cache.model;
}

module.exports = {
  loadModel,
  // テスト専用。キャッシュを捨てる。
  __resetForTest() { cache = null; },
};
