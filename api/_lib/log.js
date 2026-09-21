// 次ページ提案（nq）— Supabase への記録（nq_decisions / nq_events）。
//
// SDK は足さず、PostgREST に fetch で1行ずつ挿入する（api/ は依存ゼロの流儀）。
// env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY。どちらか欠けていれば何もしない。
// service_role キーは Function の環境変数にだけ置く。テーブルは RLS 有効・ポリシー無しなので、
// このキー以外からは読み書きできない（supabase/nq_schema.sql）。
//
// 保存しないもの: IP アドレス、User-Agent の全文、フォームの入力内容、Cookie などの永続 ID。
// 渡された row をそのまま送るので、呼び出し側でこれらを row に入れないこと。
//
// 記録の失敗で提案を止めない。例外は握りつぶし、サーバのログに状況コードだけ出す
// （エラー本文には URL やキーの断片が混じりうるので、ブラウザには返さない）。

const FG_TIMEOUT_MS = 400;   // 応答の前に待つ場合の上限
const BG_TIMEOUT_MS = 2000;  // 応答の後ろに回せた場合の上限

const configured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insert(table, row, timeoutMs) {
  if (!configured()) return false;
  const base = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const r = await fetch(`${base}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(timeoutMs > 0 ? timeoutMs : FG_TIMEOUT_MS),
    });
    if (!r.ok) console.error('[nq] log http', table, r.status);
    return r.ok;
  } catch (e) {
    console.error('[nq] log failed', table, String((e && e.name) || 'error'));
    return false;
  }
}

const logDecision = (row, timeoutMs) => insert('nq_decisions', row, timeoutMs);
const logEvent = (row, timeoutMs) => insert('nq_events', row, timeoutMs);

// Vercel の waitUntil（応答を返したあとも、渡した Promise が終わるまで関数を生かす仕組み）。
// 公式には @vercel/functions から import するが、その中身は下のグローバルを読んでいるだけ。
// このリポジトリは api/ に依存を足さない方針なので、同じ場所を直接読む。
// ローカルや他の実行環境には無いので、無ければ null を返す。
function getWaitUntil() {
  try {
    const store = globalThis[Symbol.for('@vercel/request-context')];
    const ctx = store && typeof store.get === 'function' ? store.get() : null;
    return ctx && typeof ctx.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : null;
  } catch { return null; }
}

// 記録で応答を遅らせない。
//  - waitUntil が在れば、書き込みを応答の後ろに回してすぐ戻る。
//  - 無ければ 400ms を上限に待ってから戻る。待たずに投げっぱなしにすると、応答を返した時点で
//    関数が凍結されて書き込みが落ちる。
// write は (timeoutMs) => Promise。
async function settle(write) {
  const waitUntil = getWaitUntil();
  let p;
  try { p = Promise.resolve(write(waitUntil ? BG_TIMEOUT_MS : FG_TIMEOUT_MS)).catch(() => {}); } catch { return; }
  if (waitUntil) {
    try { waitUntil(p); return; } catch { /* 渡せなければ下で待つ（二重に書かないよう同じ Promise を待つ） */ }
  }
  await p;
}

module.exports = { logDecision, logEvent, settle, configured, getWaitUntil };
