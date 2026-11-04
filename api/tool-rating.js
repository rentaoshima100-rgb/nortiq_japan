// Vercel serverless function — 無料ツール（/tools/*）の評価を記録する。
//
// POST /api/tool-rating  { tool, score (1-5), useful (true|false|null), comment?, page_url?, session_id?, stage? }
//   -> 204（本文なし。成功でも不採用でも同じ）
//
// 受けるのは許可リストの tool・1〜5 の score・真偽の useful・200文字までの comment だけ。
// comment からメールアドレス・電話番号・URL を落とす。それ以外の自由文は保存しない。
// env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY。無ければ 204 を返して何もしない。
// 保存しないもの: IP アドレス、User-Agent の全文、Cookie などの永続 ID。
//
// ツールを足したら TOOLS に slug を足す（scripts/tools-check.js が lp/tools/ と突き合わせる）。

const TOOLS = ['estimate', 'ai-fit', 'manual-cost', 'ai-risk', 'document-demo', 'invoice', 'payment-match', 'timecard', 'stocktake', 'cover-letter'];
const STAGES = ['result', 'after_submit'];
const MAX_BODY = 2 * 1024;

function scrub(s) {
  return String(s || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[メール]')
    .replace(/https?:\/\/\S+/gi, '[URL]')
    .replace(/\+?\d[\d\-() ]{8,}\d/g, '[電話]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).end(); return; }

  let raw = req.body;
  if (raw && typeof raw === 'object') raw = JSON.stringify(raw);
  raw = String(raw || '');
  if (raw.length > MAX_BODY) { res.status(204).end(); return; }
  let body = {};
  try { body = JSON.parse(raw); } catch { res.status(204).end(); return; }
  if (!body || typeof body !== 'object') { res.status(204).end(); return; }

  const tool = String(body.tool || '');
  const score = Number(body.score);
  if (!TOOLS.includes(tool) || !Number.isInteger(score) || score < 1 || score > 5) { res.status(204).end(); return; }
  const useful = body.useful === true ? true : body.useful === false ? false : null;
  const stage = STAGES.includes(body.stage) ? body.stage : 'result';
  const pageUrl = String(body.page_url || '').split('?')[0].slice(0, 120);
  const sessionId = /^[A-Za-z0-9_-]{6,40}$/.test(String(body.session_id || '')) ? String(body.session_id) : null;
  const comment = scrub(body.comment) || null;

  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) { res.status(204).end(); return; }
  try {
    const r = await fetch(`${String(base).replace(/\/+$/, '')}/rest/v1/tool_ratings`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ tool, score, useful, comment, page_url: pageUrl || null, session_id: sessionId, stage }),
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) console.error('[tool-rating] http', r.status);
  } catch (e) {
    console.error('[tool-rating] failed', String((e && e.name) || 'error'));
  }
  res.status(204).end();
};
