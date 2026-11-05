// Vercel serverless function — 営業メールのリンクから来た人の訪問を記録する（nortiq-outreach の SPEC 10.7）。
//
// POST /api/outbound-visit
//   { id: "7cf04605", path: "/pricing" }  -> 204（本文なし。成功でも不採用でも同じ）
//
// id はメールのリンクの utm_content（下書きIDの先頭8桁）。build.js の <head> のスクリプトが、
// 操作があったとき（スクロール・クリック・キー入力）か、20秒表示されたときに1回だけ sendBeacon で送る。
// 開いただけのリンクスキャナをメールの反応と数えないため。
//
// 記録は nortiq-outreach の record_site_visit（Supabase）に任せる。送信済みの下書きに一致しないものは捨てられる。
// env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（nq と同じ）。欠けていれば何もしない。
// 保存しないもの: IP アドレス、User-Agent、クエリ文字列、Cookie。

const guard = require('./_lib/guard');
const log = require('./_lib/log');

const MAX_BODY_BYTES = 1024;
const ID_RE = /^[0-9a-f]{8}$/;
const TIMEOUT_MS = 2000;

// body から記録する値を取り出す。受けられない内容なら null。パスだけを残し、クエリと断片は落とす。
function toVisit(body) {
  if (!body || typeof body !== 'object') return null;
  if (typeof body.id !== 'string' || !ID_RE.test(body.id)) return null;
  const path = typeof body.path === 'string' ? body.path : '';
  if (path.charAt(0) !== '/' || path.charAt(1) === '/') return null;
  return { id: body.id, path: path.split(/[?#]/)[0].slice(0, 200) };
}

async function record(visit, suspect) {
  const base = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const r = await fetch(`${base}/rest/v1/rpc/record_site_visit`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_short_id: visit.id, p_page_path: visit.path, p_suspect: suspect }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) console.error('[outbound-visit] http', r.status);
  } catch (e) {
    console.error('[outbound-visit] failed', String((e && e.name) || 'error'));
  }
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const done = () => res.status(204).end();
  try {
    if (!log.configured()) return done();
    const declared = Number(req.headers && req.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return done();

    let body = req.body;
    if (Buffer.isBuffer(body)) body = body.toString('utf8');
    if (typeof body === 'string') {
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return done();
      try { body = JSON.parse(body); } catch { body = null; }
    }
    if (!guard.checkOrigin(req)) return done();

    const visit = toVisit(body);
    if (!visit) return done();
    // bot の UA は捨てずに suspect で残す（CTR と同じ扱い。追いメールのきっかけにはならない）
    await record(visit, guard.isBot(req.headers && req.headers['user-agent']));
    done();
  } catch (e) {
    console.error('[outbound-visit] error', String((e && e.name) || 'error'));
    if (!res.headersSent) done();
  }
}

module.exports = handler;
module.exports.toVisit = toVisit;
