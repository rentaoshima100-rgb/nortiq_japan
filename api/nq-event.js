// Vercel serverless function — 次ページ提案（nq）の表示・クリックなどのイベントを記録する。
//
// POST /api/nq-event
//   { session_id, decision_id|null, type: "shown"|"click"|"engaged"|"dismiss"|"goal"|"decide",
//     slot, block_id, variant, page_url, goal, read, result, latency_ms }
//   -> 204（本文なし。成功でも不採用でも同じ）
//
// engaged は「カードをクリックして移った先を、途中離脱せずに読んだ」。read はその読み方（deep / skim）。
// 推薦アルゴリズムが学習する「成果」はこのイベントで数える（設計書7章「4. モデル」）。
//
// decide は「ブラウザが /api/suggest を1回呼んだ結果」。result は ok（採用できる応答が間に合った）/ timeout
// （client_timeout_ms で打ち切った）/ http / format / network、latency_ms はブラウザで測った往復時間。
// フェーズ1の完了条件「応答の9割が1.2秒以内」はこの行で測る（supabase/nq_report.sql の K5）。
// nq_decisions.latency_ms は別物: Jev の呼び出しだけの時間で、model_timeout_ms で頭打ちになり、
// 関数の起動待ち・ログ書き込み・往復の通信を含まない。ブラウザが打ち切った回は、判定の行が在っても
// 訪問者には届いていない。
//
// 設計書10章の nq_events の受け口。ブラウザに Supabase のキーを出さないために Function を挟む。
// クライアントは navigator.sendBeacon で送る（クリック直後のページ遷移でも落ちにくい）。
// sendBeacon は本文を text/plain の文字列で送るので、文字列ボディを JSON として読む。
// 応答はだれも読まないので、常に 204 を返す。
//
// 受けるのは ID と列挙値と URL だけ。すべてホワイトリストで検証し、自由文は1文字も保存しない。
// デフォルト表示のイベントも受ける（ホールドアウトと分母をそろえるため）。decision_id は、判定の応答を受けたあとに
// 画面へ入ったスロットならデフォルト表示でも付いてくる。null になるのは応答より先に画面へ入ったスロットと、
// 判定を呼んでいないページ。個別化かどうかは nq_decisions.is_default とスロットの block_id 一致で決める
// （supabase/nq_report.sql）。
//
// env: NQ_ENABLED（'1' のときだけ動く） SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY。
//      どれかが欠けていれば 204 を返して何もしない。キーはコミットしない。
// 保存しないもの: IP アドレス、User-Agent の全文、フォームの入力内容、Cookie などの永続 ID。

const crypto = require('crypto');
const data = require('./_lib/data');
const guard = require('./_lib/guard');
const { resolvePage } = require('./_lib/state');
const log = require('./_lib/log');

const MAX_BODY_BYTES = 2 * 1024;
const TYPES = ['shown', 'click', 'engaged', 'dismiss', 'goal', 'decide'];
const SLOTS = ['slot-mid', 'slot-end', 'slot-next', 'slot-bar'];
const VARIANTS = ['default', 'cost', 'schedule', 'trust', 'ai_quality', 'scope', 'weak', 'strong'];
const GOALS = ['diagnostic', 'guidebook', 'contact'];
// engaged の読み方。bounce（途中離脱）は成果ではないので、クライアントは送らないし、来ても受けない。
const READS = ['deep', 'skim'];
// decide の結果。ok 以外は、クライアントが応答を捨ててデフォルトのままにした回。
const RESULTS = ['ok', 'timeout', 'http', 'format', 'network'];
// 往復時間の上限。クライアントは client_timeout_ms（1200）で打ち切るので、これを超える値は壊れているか作り物。
const MAX_LATENCY_MS = 60000;
const DECISION_ID_RE = /^d_[a-z0-9]{8,40}$/;

const newEventId = () => 'e_' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex');

// 許可リストに在る値だけ通す。無い値は null（行は捨てずに、その列だけ空にする）。
const oneOf = (list, v) => (typeof v === 'string' && list.includes(v) ? v : null);

// body → nq_events の1行。受けられない内容なら null。
function toRow(body) {
  if (!body || typeof body !== 'object') return null;
  if (!guard.validSessionId(body.session_id)) return null;
  const type = oneOf(TYPES, body.type);
  if (!type) return null;

  const decision_id = typeof body.decision_id === 'string' && DECISION_ID_RE.test(body.decision_id) ? body.decision_id : null;
  const block_id = typeof body.block_id === 'string' && data.getBlock(body.block_id) ? body.block_id : null;
  const slot = oneOf(SLOTS, body.slot);
  const goal = type === 'goal' ? oneOf(GOALS, body.goal) : null;
  const read = type === 'engaged' ? oneOf(READS, body.read) : null;
  const result = type === 'decide' ? oneOf(RESULTS, body.result) : null;
  const page = resolvePage(body.page_url);

  // 何のイベントか特定できない行は残さない（集計の分母を汚すだけになる）。
  if ((type === 'shown' || type === 'click') && !(slot && block_id)) return null;
  if (type === 'goal' && !goal) return null;
  // engaged はスロットを送ってこない（クリックの時点でページが替わっている）。どのカードの成果かは block_id で決まる。
  if (type === 'engaged' && !(block_id && read)) return null;
  if (type === 'decide' && !result) return null;

  const row = {
    event_id: newEventId(),
    created_at: new Date().toISOString(),
    decision_id,
    session_id: body.session_id,
    type,
    slot: type === 'dismiss' ? (slot || 'slot-bar') : slot,
    block_id,
    variant: oneOf(VARIANTS, body.variant),
    page_url: page ? page.url : null,
    goal,
    read,
  };
  // result / latency_ms の列は decide の行にだけ入れる。全行に null で入れると、Supabase に列を足す前に
  // デプロイした場合に PostgREST が全イベントを 400 で落とす（記録の失敗は黙って続くので、だれも気づかない）。
  // decide の行だけなら、落ちるのは列を足すまでの decide だけで済む。
  if (type === 'decide') {
    const ms = body.latency_ms;
    row.result = result;
    row.latency_ms = Number.isFinite(ms) && ms >= 0 && ms <= MAX_LATENCY_MS ? Math.round(ms) : null;
    row.slot = null;
    row.block_id = null;
    row.variant = null;
  }
  return row;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const done = () => res.status(204).end();

  try {
    if (process.env.NQ_ENABLED !== '1' || !log.configured()) return done();

    const declared = Number(req.headers && req.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return done();

    let body = req.body;
    // sendBeacon に Blob を渡す実装だと Content-Type 次第で Buffer で届く。
    if (Buffer.isBuffer(body)) body = body.toString('utf8');
    if (typeof body === 'string') {
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) return done();
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    if (!body) body = {};

    if (!guard.checkOrigin(req)) return done();
    if (guard.isBot(req.headers && req.headers['user-agent'])) return done();

    const row = toRow(body);
    if (!row) return done();

    await log.settle((timeoutMs) => log.logEvent(row, timeoutMs));
    done();
  } catch (e) {
    console.error('[nq] event failed', String((e && e.name) || 'error'));
    if (!res.headersSent) done();
  }
};

module.exports.toRow = toRow;
