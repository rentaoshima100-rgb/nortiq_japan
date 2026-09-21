// Vercel serverless function — 次ページ提案（nq）の判定。
//
// POST /api/suggest
//   { session_id: "r_8f3k2m", trigger: "T1"|"T2"|"T3", page_url: "/article-xxx",
//     state: { ref, landing, history:[{url,read}], current:{url,reach}, visit, device, passed:[block_id] } }
//   -> { decision_id, default, shadow, policy,
//        slots: { "slot-mid": { block_id, variant, industry?, propensity? }, ... } }
//
// クライアントが送るのは URL と列挙値だけ。モデルに渡す文章はサーバが catalog から組み立てる
// （api/_lib/state.js）。画面に出る文言はすべて事前に承認したもので、ここで決めるのは
// 「どの承認済みブロックを出すか」だけ。
//
// 判定は4段（設計書6章）: 状態を組み立てる → モデルに1回でまとめて聞く（decide）→
// 推薦アルゴリズムがカードに順位をつけて選ぶ（recommend）→ ルールで出すかどうかを決める（applyRules）。
// policy は方策のバージョン（prior-v1 / ts-v1）、propensity はそのカードの選択確率。
// 推薦アルゴリズムが選んだカードにだけ付く（ルールが直接決める sg-recruit・rs-*・ct-* には付かない）。
//
// 失敗の扱いは既存の2関数と変えてある: 入力不備・env 未設定・モデルの失敗やタイムアウト・
// 想定外の例外は、すべて 200 で { decision_id, default:true, shadow:false, policy:null, slots:{} } を返す。
// 「確信が低ければ何も変えない」（設計書 原則2）ので、クライアントは常にデフォルトに倒れればよい。
// 外部サービスのエラー本文は返さない（サーバのログにだけ出す）。
//
// env（すべて任意。キーは環境変数からだけ読み、コミットしない）:
//   NQ_ENABLED         '1' のときだけ動く。それ以外は何も呼ばずに即デフォルト（キルスイッチ）
//   NQ_SHADOW          '1' なら判定と記録だけ行い、応答は default:true, shadow:true（シャドーモード）
//   NQ_HOLDOUT_RATE    常にデフォルトを返すセッションの割合。既定は data/nq-rules.json の 0.2
//   NQ_POLICY          prior（既定。事前分布の平均で選ぶ）/ ts（学習済みモデルからトンプソン抽出）。
//                      nq_model はどちらでも読む（api/_lib/model.js）。prior が使うのは aux（V と cov）だけで、
//                      学習済みの重みは ts のときだけ使う。どちらも一様探索 5% つき
//   NQ_MODEL_PROVIDER  stub（既定）/ jev。api/_lib/decide.js
//   JEV_API_KEY / JEV_MODEL / JEV_BASE_URL
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   未設定なら記録しない
//
// 保存しないもの: IP アドレス、User-Agent の全文、フォームの入力内容、Cookie などの永続 ID。
// UA は bot 判定に使うだけで、どこにも書かない。

const crypto = require('crypto');
const data = require('./_lib/data');
const guard = require('./_lib/guard');
const { buildState, normalizeUrl, resolvePage } = require('./_lib/state');
const { buildQuestions } = require('./_lib/questions');
const { decide } = require('./_lib/decide');
const { recommend, policyLabel } = require('./_lib/recommend');
const { loadModel } = require('./_lib/model');
const { applyRules, cardSlots } = require('./_lib/rules');
const log = require('./_lib/log');

const MAX_BODY_BYTES = 8 * 1024;
const TRIGGERS = ['T1', 'T2', 'T3'];

// 時刻（36進）を頭に置くと、ログを ID で並べたときにおおよそ時系列になる。
const newDecisionId = () => 'd_' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex');

function tooLarge(req, body) {
  const declared = Number(req.headers && req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return true;
  try {
    const s = typeof body === 'string' ? body : JSON.stringify(body == null ? '' : body);
    return Buffer.byteLength(s, 'utf8') > MAX_BODY_BYTES;
  } catch { return true; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const decision_id = newDecisionId();
  const fallback = () => res.status(200).json({ decision_id, default: true, shadow: false, policy: null, slots: {} });

  try {
    if (process.env.NQ_ENABLED !== '1') return fallback();

    // 受けるのは application/json だけ。text/plain などはプリフライトなしでクロスオリジンから送れるが、
    // application/json はプリフライトが要り、この関数は CORS の応答ヘッダを返さないのでそこで止まる。
    // Origin の検査に穴が開いても、原価の発生するこの関数はよそのページから叩けない。
    // 自前のクライアントは常に application/json で送る（text/plain が要るのは sendBeacon を使う nq-event だけ）。
    const contentType = String((req.headers && req.headers['content-type']) || '').trim().toLowerCase();
    if (!contentType.startsWith('application/json')) return fallback();

    // Vercel は Content-Type が JSON なのに本文が壊れていると、req.body を読んだ時点で throw する。
    // 外側の try がそれも拾ってデフォルトに倒す。
    let body = req.body;
    if (tooLarge(req, body)) return fallback();
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!body || typeof body !== 'object') body = {};

    if (!guard.checkOrigin(req)) return fallback();
    if (guard.isBot(req.headers && req.headers['user-agent'])) return fallback();

    const session_id = body.session_id;
    const trigger = body.trigger;
    if (!guard.validSessionId(session_id)) return fallback();
    if (!TRIGGERS.includes(trigger)) return fallback();
    if (body.page_url != null && !resolvePage(body.page_url)) return fallback();

    const built = buildState(body.state);
    if (!built.ok) return fallback();
    const page_url = normalizeUrl(body.page_url) || built.currentUrl;

    const holdout = guard.isHoldout(session_id, guard.parseRate(process.env.NQ_HOLDOUT_RATE, data.rules.holdout_rate_default));
    const shadow = process.env.NQ_SHADOW === '1';

    // ホールドアウトとシャドーでも判定は行う。意図レポートの母数と、適用群との比較に要る。
    const { questions, candidates } = buildQuestions({ passed: built.passed, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls });
    // nq_model は prior のときも読む。prior は学習済みの重みを使わない（recommend.js）が、aux（V と cov）を
    // 渡さないと、ログの features の dv / cov が必ず 0 になる。その行で何か月学習しても w_dv / w_cov の
    // 事後分布は事前分布のままで、ts に切り替えた瞬間に未学習の重みの雑音がそのまま探索に乗ってしまう。
    // dv / cov の事前平均は 0（data/nq-rules.json の recommend.prior.mean は bias と rel だけ）なので、
    // aux を渡しても prior の順位・期待値・選択確率は変わらない。
    // キャッシュが切れていると最長 300ms かかるので、モデルの呼び出しと並べて先に始めておく。
    // loadModel は throw しない（未設定・失敗なら事前分布を返す）が、念のため失敗も null に倒す。
    const policy = String(process.env.NQ_POLICY || '').toLowerCase() === 'ts' ? 'ts' : 'prior';
    const modelLoading = loadModel().catch(() => null);

    let decided = null;
    let failure = null;
    try {
      // 本番の経路は、プロバイダが何であっても data/nq-rules.json の model_timeout_ms で切る。
      decided = await decide(built.state, questions, { timeout_ms: Number(data.rules.model_timeout_ms) || 900 });
    } catch (e) {
      failure = e || {};
      console.error('[nq] decide failed', String(failure.code || 'error'));
    }

    // 推薦は回答が取れたときだけ。
    let rec = null;
    if (decided) {
      rec = recommend({
        answers: decided.answers,
        candidates,
        slots: cardSlots(trigger),
        currentUrl: built.currentUrl,
        viewedUrls: built.viewedUrls,
        revisit: built.revisit,
        model: await modelLoading,
        policy,
      });
    }

    const ruled = applyRules({ answers: decided && decided.answers, trigger, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls, picks: rec && rec.picks });
    const served = !holdout && !shadow && !ruled.is_default;

    // slots には「ルールが選んだもの」を残す（ホールドアウトとシャドーでは返していないが、
    // 出していたら何だったかが分からないと、目視確認も群の比較もできない）。
    // 実際に返したかどうかは is_default で分かる。
    const row = {
      decision_id,
      created_at: new Date().toISOString(),
      session_id,
      page_url,
      trigger,
      holdout,
      shadow,
      is_default: !served,
      state: built.state,
      answers: decided ? decided.answers : null,
      // 候補ごとの関連度・特徴量・期待値・選択確率。夜間の学習とオフポリシー評価の材料になる。
      candidates: rec ? rec.candidates : null,
      slots: ruled.slots,
      // 方策のバージョン。一様探索で選んだ判定は '+explore' つき（例 'ts-v1+explore'）。
      policy: policyLabel(rec),
      model: decided ? decided.model : String((failure && failure.provider) || process.env.NQ_MODEL_PROVIDER || 'stub'),
      // decide()（Jev の呼び出し）だけの時間。model_timeout_ms で頭打ちになり、関数の起動待ち・ログ書き込み・往復の通信は
      // 含まない。訪問者から見た応答時間（フェーズ1の完了条件）は、ブラウザが /api/nq-event に送る type "decide" の行で測る。
      latency_ms: decided ? decided.latency_ms : (failure && Number.isFinite(failure.latency_ms) ? failure.latency_ms : null),
    };
    await log.settle((timeoutMs) => log.logDecision(row, timeoutMs));

    res.status(200).json({ decision_id, default: !served, shadow, policy: rec ? rec.policy : null, slots: served ? ruled.slots : {} });
  } catch (e) {
    console.error('[nq] suggest failed', String((e && e.name) || 'error'));
    if (!res.headersSent) fallback();
  }
};
