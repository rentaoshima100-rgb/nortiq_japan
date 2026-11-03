// Vercel serverless function — /tools/document-demo の読み取り (登録不要デモ)
//
// POST /api/ocr-demo  { image: "<base64>", mime: "image/jpeg" }
//   -> { ok:true, kind, rows:[{name, qty, unit, price, amount, confidence}], memo, needsCheck }
//
// 画像は読み取りのために1回だけモデルに送り、保存しない (ログにも残さない)。
// Requires env ANTHROPIC_API_KEY (無いときは 503 で「未設定」を返し、ページはサンプルだけで動く)。
// Optional env OCR_DEMO_MODEL (default claude-sonnet-4-5)。

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const PROMPT = `あなたは日本の中小企業の受注・経理担当を助けるAI-OCRです。この画像（FAX注文書・手書き伝票・納品書・レシートなど）を読み取り、次のJSONだけを返してください。説明文は不要です。
{
 "kind": "注文書|納品書|請求書|レシート|伝票|その他",
 "party": "発注元や店名など、分かれば",
 "date": "YYYY-MM-DD か空",
 "rows": [ {"name":"品名","qty":数値か空,"unit":"単位か空","price":単価の数値か空,"amount":金額の数値か空,"confidence":"high|mid|low"} ],
 "total": 合計の数値か空,
 "memo": "読み取れなかった箇所や注意点を1〜2文"
}
読み取りに自信がない項目は confidence を "low" にしてください。数値は半角の数字だけにし、桁区切りは入れないでください。品名は原文のままにしてください。`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(503).json({ error: 'not_configured' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};
  const mime = String(body.mime || '');
  const image = String(body.image || '');
  if (!ALLOWED.has(mime)) { res.status(400).json({ error: 'unsupported_type' }); return; }
  if (!image || image.length > MAX_BYTES * 1.4) { res.status(413).json({ error: 'too_large' }); return; }
  if (!/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 2000))) { res.status(400).json({ error: 'bad_image' }); return; }

  const model = process.env.OCR_DEMO_MODEL || 'claude-sonnet-4-5';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: 1500,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: image } },
          { type: 'text', text: PROMPT }] }]
      })
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      res.status(502).json({ error: 'model_failed', detail: String(detail).slice(0, 300) });
      return;
    }
    const data = await r.json();
    const text = (data.content || []).map((c) => c.text || '').join('');
    const m = text.match(/\{[\s\S]*\}/);
    let parsed = null;
    try { parsed = m ? JSON.parse(m[0]) : null; } catch { parsed = null; }
    if (!parsed || !Array.isArray(parsed.rows)) { res.status(502).json({ error: 'parse_failed' }); return; }
    const rows = parsed.rows.slice(0, 40).map((x) => ({
      name: String(x.name || '').slice(0, 80),
      qty: x.qty === '' || x.qty == null ? '' : Number(x.qty),
      unit: String(x.unit || '').slice(0, 10),
      price: x.price === '' || x.price == null ? '' : Number(x.price),
      amount: x.amount === '' || x.amount == null ? '' : Number(x.amount),
      confidence: ['high', 'mid', 'low'].includes(x.confidence) ? x.confidence : 'mid'
    }));
    res.status(200).json({
      ok: true,
      kind: String(parsed.kind || 'その他').slice(0, 20),
      party: String(parsed.party || '').slice(0, 60),
      date: String(parsed.date || '').slice(0, 10),
      rows,
      total: parsed.total === '' || parsed.total == null ? '' : Number(parsed.total),
      memo: String(parsed.memo || '').slice(0, 300),
      needsCheck: rows.filter((x) => x.confidence === 'low').length
    });
  } catch (e) {
    res.status(502).json({ error: 'exception', detail: String((e && e.message) || e).slice(0, 200) });
  }
};
