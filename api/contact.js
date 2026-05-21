// Vercel serverless function — delivers contact-form inquiries by email via Resend.
//
// POST /api/contact  { company, name, email, phone, message, kind, ... }
//   -> { ok: true, id }
//
// Requires env RESEND_API_KEY. Optional env:
//   CONTACT_TO   (default rdaichi27@gmail.com)
//   CONTACT_FROM (default "Nortiq Labs <onboarding@resend.dev>")
// The API key is read from the environment and must NEVER be committed.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const arr = (a) => (Array.isArray(a) ? a.join(' / ') : (a == null ? '' : String(a)));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body) body = {};

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  if (!name || !email) { res.status(400).json({ error: 'name_email_required' }); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'invalid_email' }); return; }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'email_not_configured' }); return; }

  const to = process.env.CONTACT_TO || 'rdaichi27@gmail.com';
  const from = process.env.CONTACT_FROM || 'Nortiq Labs <onboarding@resend.dev>';
  const kind = String(body.kind || 'main');

  const rows = [
    ['貴社名', body.company],
    ['ご担当者名', name],
    ['メールアドレス', email],
    ['電話番号', body.phone],
    ['所在地', body.address],
    ['カテゴリ', arr(body.categories)],
    ['お問い合わせ', arr(body.inqTypes)],
    ['きっかけ', arr(body.reasons)],
    ['流入元', body.source],
    ['最寄り駅', body.station],
    ['サイトURL', body.siteUrl],
  ].filter(([, v]) => v != null && String(v).trim() !== '');

  const tableRows = rows.map(([k, v]) =>
    `<tr><th style="text-align:left;padding:7px 14px;background:#f5f5f7;white-space:nowrap;vertical-align:top;border:1px solid #eee">${esc(k)}</th>`
    + `<td style="padding:7px 14px;border:1px solid #eee">${esc(v)}</td></tr>`
  ).join('');
  const msgHtml = esc(body.message || '(記入なし)').replace(/\n/g, '<br>');

  const subject = `【お問い合わせ】${(body.company || name)} 様 (${kind})`;
  const html = `
    <div style="font-family:-apple-system,'Segoe UI',sans-serif;color:#111;max-width:660px">
      <h2 style="font-size:18px;margin:0 0 16px">サイトからの新規お問い合わせ</h2>
      <table style="border-collapse:collapse;font-size:14px;width:100%">${tableRows}</table>
      <h3 style="font-size:15px;margin:22px 0 8px">ご相談内容</h3>
      <p style="font-size:14px;line-height:1.8;margin:0">${msgHtml}</p>
      <hr style="margin:22px 0;border:none;border-top:1px solid #eee">
      <p style="font-size:12px;color:#888;margin:0">フォーム種別: ${esc(kind)} ／ 送信: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</p>
    </div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n')
    + `\n\nご相談内容:\n${body.message || '(記入なし)'}\n\nフォーム種別: ${kind}`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, reply_to: email, subject, html, text }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      res.status(502).json({ error: 'send_failed', detail: String(detail).slice(0, 400) });
      return;
    }
    const data = await r.json().catch(() => ({}));
    res.status(200).json({ ok: true, id: data.id || null });
  } catch (e) {
    res.status(502).json({ error: 'send_exception', detail: String((e && e.message) || e) });
  }
};
