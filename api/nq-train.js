// Vercel serverless function — 次ページ提案（nq）の夜間バッチ。推薦アルゴリズムの重みを学習し直す。
//
// GET /api/nq-train   （Vercel Cron が1日1回呼ぶ。vercel.json の crons。UTC 18:00 = JST 03:00）
//   Authorization: Bearer ${CRON_SECRET}
//   -> { ok, version, n_impressions, n_positive, converged, n_sessions, n_transitions,
//        truncated: { decisions, events, paths }, wrote: { model, transitions } }
//
// リクエスト中（/api/suggest）は学習しない。ここで作った平均と分散を nq_model に1行足し、
// /api/suggest がそれを読む（重みを使うのは NQ_POLICY=ts のときだけ。aux は prior でも特徴量に入る。
// 設計書7章「4. モデル」）。流れ:
//   1. 直近の nq_decisions（個別化カードを返した判定）と nq_events を、PostgREST から新しい順にページングして読む
//   2. 表示されたカードごとに学習行を作る（成果 =「クリック後に engaged」、ゴール到達は重み3、半減期60日）
//   3. ガウス事前分布つきロジスティック回帰の MAP と、ラプラス近似の分散を求める
//   4. セッションごとの閲覧履歴から遷移表を作り直し、V(ページ) と cov を解く
//   5. オフポリシー評価で「関連度だけの順位」と「学習後の順位」の推定成果率を出す
//   6. nq_model に1行追加し、nq_transitions を入れ替える
// 数学は api/_lib/learn.js（純関数）。ここは読み書きと段取りだけ。
//
// 学習は毎晩、事前分布から読めたぶん全部でやり直す（前の晩の事後分布を引き継がない）。半減期の重みづけが
// そのまま効き、一過性の失敗（Supabase の一時的なエラーなど）なら次の晩に取り戻せる。
// 行数が原因の失敗は次の晩も同じように起きるので、行数では失敗させない: ログは新しい側から読み、
// ページ数の上限か読み込みの持ち時間に当たったら、そこで打ち切って読めたぶんで学習する（応答とログの
// truncated に残す）。半減期60日なので、古い側を落としても結果はほとんど変わらない。
//
// env（キーは環境変数からだけ読み、コミットしない）:
//   CRON_SECRET   必須。Vercel Cron はこの値を Authorization ヘッダに付けて呼ぶ。未設定なら誰の呼び出しも通さない
//   NQ_LEARN      '1' のときだけ動く。それ以外は何も読まず何も書かずに 200（フェーズ3 に入るまで止めておく）
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   未設定なら何もしないで 200
//
// 外部サービスのエラー本文は応答に出さない（URL やキーの断片が混じりうる）。サーバのログにも状況コードだけ出す。

const crypto = require('crypto');
const data = require('./_lib/data');
const { priorModel } = require('./_lib/features');
const { POLICY_VERSION } = require('./_lib/recommend');
const learn = require('./_lib/learn');
const log = require('./_lib/log');

const LEARN_WINDOW_DAYS = 365;      // 半減期60日なら1年前の重みは 1.5%。これより前は読んでも結果が変わらない
const TRANSITION_WINDOW_DAYS = 180; // 遷移表は時間減衰を掛けないので、ページ構成が変わっても古い動線が残らない長さにする
const PAGE_SIZE = 1000;             // Supabase の既定の max-rows と同じ
const MAX_PAGES = 300;              // 1回の読み込みの上限。当たったら失敗にせず、そこで打ち切る
const REQUEST_TIMEOUT_MS = 8000;
const BUDGET_MS = 50 * 1000;        // maxDuration 60秒の手前で自分から止まる（書きかけで打ち切られないように）
const READ_BUDGET_MS = 30 * 1000;   // 読み込みに使ってよい時間。残りは学習と書き込みのために空けておく
// 読み込みごとの締め切り（READ_BUDGET_MS に対する割合。開始からの絶対時刻で切る）。行数の多いイベントが
// 持ち時間を使い切って、ほかの読み込みが1行も読めずに終わる（遷移表が空で上書きされる）のを防ぐ。
// 早く終わった読み込みの残り時間は、あとの読み込みがそのまま使える。
const READ_SHARE = { decisions: 0.2, paths: 0.5, events: 1 };
const WRITE_CHUNK = 500;
const OPE_FOLDS = 5;
const HISTORY_KEY = '閲覧履歴';

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

function fail(code) {
  const e = new Error(code);
  e.nq = true;
  e.code = code;
  return e;
}

// 長さの違いでも時間差が出ないよう、ハッシュにそろえてから比べる。
function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = String((req.headers && req.headers.authorization) || '');
  const digest = (s) => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(digest(got), digest(`Bearer ${secret}`));
}

// ---------- PostgREST ----------

async function rest(ctx, method, path, opts) {
  if (ctx.now() > ctx.deadline) throw fail('deadline');
  const o = opts || {};
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.prefer) headers.Prefer = o.prefer;
  return ctx.fetch(`${ctx.base}/rest/v1/${path}`, {
    method,
    headers,
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

const enc = encodeURIComponent;

// [fromIso, untilIso) の行を、新しい側から1ページずつ読んで onPage に渡す。
//   -> { truncated, cutoff }  truncated: 上限か持ち時間に当たって途中でやめた。
//                             cutoff: この時刻より新しい行は全部読めている（ミリ秒。打ち切っていなければ null）
//
// offset では進まない。offset が深くなるほど Postgres の走査が増え、件数が増えると毎晩同じところで
// 時間切れになる。代わりに「前のページの最後の時刻」を次のページの上限にする（created_at の索引を
// 後ろ向きにたどるだけで済む）。同じ時刻の行がページの切れ目をまたぐと取りこぼすので、ページの最後の
// 時刻と同じ行はいったん捨て、次のページを「その時刻以前」から読み直す。ページの全部が同じ時刻のとき
// だけは進めなくなるので、そのまま採って「その時刻より前」へ進む。
// ページの切れ目は「0行が返るまで」で判断する（プロジェクトの max-rows が PAGE_SIZE より小さいと、
// 満杯でないページが途中に来る）。上限の時刻を切ってあるので、読んでいる間に行が増えてもずれない。
// 使う条件は gte / lt / lte だけ（PostgREST の or=(...) は値の引用符と URL エンコードに落とし穴がある）。
async function readNewestFirst(ctx, table, query, pk, fromIso, untilIso, deadline, onPage) {
  let upper = `created_at=lt.${enc(untilIso)}`;
  let cutoff = Date.parse(untilIso);
  for (let page = 0; page < ctx.maxPages; page++) {
    if (ctx.now() > deadline) return { truncated: true, cutoff };
    const r = await rest(ctx, 'GET', `${table}?${query}&created_at=gte.${enc(fromIso)}&${upper}&order=created_at.desc,${pk}.desc&limit=${PAGE_SIZE}`);
    if (!r.ok) throw fail(`read_${table}_${r.status}`);
    const rows = await r.json().catch(() => null);
    if (!Array.isArray(rows)) throw fail(`read_${table}_body`);
    if (!rows.length) return { truncated: false, cutoff: null };
    const oldest = rows[rows.length - 1] && rows[rows.length - 1].created_at;
    if (typeof oldest !== 'string' || !Number.isFinite(Date.parse(oldest))) throw fail(`read_${table}_body`);
    const newer = rows.filter((row) => row && row.created_at !== oldest);
    onPage(newer.length ? newer : rows);
    upper = `created_at=${newer.length ? 'lte' : 'lt'}.${enc(oldest)}`;
    cutoff = Date.parse(oldest);
  }
  return { truncated: true, cutoff };
}

// ---------- 段取り ----------

// 提案先になりうる URL（業種版を含む）。cov はこの URL への値だけを持てば足りる。
function targetUrls() {
  const out = new Set();
  for (const b of data.blocks) {
    if (!b || b.kind !== 'suggest' || b.selectable !== true) continue;
    if (typeof b.target_url === 'string' && b.target_url) out.add(b.target_url);
    for (const entry of Object.values(isObj(b.by_industry) ? b.by_industry : {})) {
      if (entry && typeof entry.target_url === 'string' && entry.target_url) out.add(entry.target_url);
    }
  }
  return Array.from(out);
}

// catalog の title → URL。ログの state には URL を残していないので、閲覧履歴はこれで戻す。
// 同じ title のページが2つあると戻し先を決められないので、その title は使わない。
function titleIndex() {
  const out = {};
  const dup = new Set();
  const cat = data.catalog || {};
  for (const url of Object.keys(cat)) {
    const title = cat[url] && typeof cat[url].title === 'string' ? cat[url].title : '';
    if (!title) continue;
    if (Object.prototype.hasOwnProperty.call(out, title)) dup.add(title); else out[title] = url;
  }
  for (const title of dup) delete out[title];
  return out;
}

function typeOf(url) {
  const cat = data.catalog || {};
  const page = Object.prototype.hasOwnProperty.call(cat, url) ? cat[url] : null;
  if (page && typeof page.type === 'string' && page.type) return page.type;
  return /^\/article-/.test(url) ? 'article' : 'other';
}

async function run(opts) {
  const o = opts || {};
  const clock = typeof o.now === 'function' ? o.now : Date.now;
  const started = clock();
  const ctx = {
    fetch: o.fetch || globalThis.fetch,
    now: clock,
    deadline: started + BUDGET_MS,
    maxPages: o.maxPages > 0 ? o.maxPages : MAX_PAGES, // テストで上限を下げるためのもの
    base: String(process.env.SUPABASE_URL).replace(/\/+$/, ''),
  };
  const until = new Date(started).toISOString();
  const learnFrom = new Date(started - LEARN_WINDOW_DAYS * 86400000).toISOString();
  const pathFrom = new Date(started - TRANSITION_WINDOW_DAYS * 86400000).toISOString();
  const rules = (data.rules && data.rules.recommend) || {};
  const readBy = (share) => started + READ_BUDGET_MS * share;

  // 1. 読む。どれも新しい側から。上限か持ち時間に当たった読み込みは、そこまでのぶんで先へ進む。
  // 学習に使うのは、個別化カードを実際に返した判定だけ（ホールドアウト・シャドー・デフォルトは除く）。
  const truncated = { decisions: false, events: false, paths: false };
  const decisions = [];
  const readDecisions = await readNewestFirst(ctx, 'nq_decisions',
    'select=decision_id,created_at,session_id,candidates,slots,policy&is_default=is.false&holdout=is.false&shadow=is.false&candidates=not.is.null',
    'decision_id', learnFrom, until, readBy(READ_SHARE.decisions), (rows) => { decisions.push(...rows); });
  truncated.decisions = readDecisions.truncated;

  // 遷移表には全セッションを使う（ホールドアウトやデフォルトの閲覧も、サイトの動線としては同じ）。
  // 同じセッションは最後の判定だけ要る。新しい順に読むので、最初に出てきた1件だけ持つ。
  const lastBySession = new Map();
  const readPaths = (columns) => readNewestFirst(ctx, 'nq_decisions', `select=decision_id,session_id,created_at,page_url,${columns}`,
    'decision_id', pathFrom, until, readBy(READ_SHARE.paths), (rows) => { for (const r of rows) if (r && typeof r.session_id === 'string' && !lastBySession.has(r.session_id)) lastBySession.set(r.session_id, r); });
  try {
    // state のうち要るのは閲覧履歴だけなので、そこだけ取り出して転送量を減らす。
    truncated.paths = (await readPaths(`history:state->${enc(HISTORY_KEY)}`)).truncated;
  } catch (e) {
    // 日本語のキーを select に書けない PostgREST だった場合は、state ごと読む（sessionPaths はどちらの形も読める）。
    if (!(e && e.nq === true && e.code === 'read_nq_decisions_400')) throw e;
    lastBySession.clear();
    truncated.paths = (await readPaths('state')).truncated;
  }

  // イベントは行数がいちばん多い（デフォルト表示の shown も1行ずつ入る）。遷移表に要る直近
  // TRANSITION_WINDOW_DAYS だけ全件を読み、それより古い側は学習に要る行だけにする（下の oldEvents）。
  const EVENT_COLUMNS = 'select=created_at,decision_id,session_id,type,slot,block_id,page_url';
  const recentEvents = [];
  const eventsBy = readBy(READ_SHARE.events);
  const readRecent = await readNewestFirst(ctx, 'nq_events', EVENT_COLUMNS, 'event_id', pathFrom, until, eventsBy, (rows) => { recentEvents.push(...rows); });
  truncated.events = readRecent.truncated;

  // 直近より古い側（〜LEARN_WINDOW_DAYS）のイベント。学習が使うのは、判定に結びついた行
  // （shown / click / engaged）とゴールだけ。or=(...) を使わずに済むよう、2回に分けて読む。
  // 直近ぶんを途中で打ち切ったときは読まない（間が抜けたログを足しても、対になる行がそろわない）。
  const oldEvents = [];
  if (!readRecent.truncated) {
    const keep = (rows) => { oldEvents.push(...rows); };
    const linked = await readNewestFirst(ctx, 'nq_events', `${EVENT_COLUMNS}&decision_id=not.is.null`, 'event_id', learnFrom, pathFrom, eventsBy, keep);
    const goals = linked.truncated
      ? linked
      : await readNewestFirst(ctx, 'nq_events', `${EVENT_COLUMNS}&decision_id=is.null&type=eq.goal`, 'event_id', learnFrom, pathFrom, eventsBy, keep);
    truncated.events = linked.truncated || goals.truncated;
  }
  // 学習行の組み立て（buildTrainingRows）は行の並びに依らない。sessionPaths は同じ時刻のイベントを
  // 渡した並びのまま扱うので、遷移表に渡す直近ぶんは、以前と同じ時刻の昇順に戻しておく。
  recentEvents.reverse();
  const events = oldEvents.concat(recentEvents);

  // イベントを途中で打ち切った晩は、それより前に最後の判定があるセッションを遷移表に入れない
  // （その先のページ遷移とゴールが読めていないので、ゴールに着いたセッションまで離脱に数えてしまう）。
  const pathDecisions = Array.from(lastBySession.values())
    .filter((d) => !readRecent.truncated || Date.parse(d.created_at) > readRecent.cutoff);

  // 2〜3. 学習行 → 事後分布。blocks.json から外したカードもログに残っていれば補正を学習し続ける
  // （戻したときに実績が消えていないように。/api/suggest は今のカードの重みしか読まない）。
  const rows = learn.buildTrainingRows({
    decisions,
    events,
    now: started,
    halfLifeDays: Number(rules.half_life_days) || 60,
    goalWeight: Number(rules.goal_weight) || 3,
    policies: Object.values(POLICY_VERSION),
  });
  const cardIds = data.selectableCardIds();
  for (const r of rows) if (!cardIds.includes(r.block_id)) cardIds.push(r.block_id);
  const prior = priorModel(cardIds);
  const fit = learn.fitModel({ rows, prior });

  // 4. 遷移表 → V と cov。
  const paths = learn.sessionPaths({ decisions: pathDecisions, events: recentEvents, titleToUrl: titleIndex() });
  const transitions = learn.buildTransitions(paths);
  const values = learn.solveValues(transitions, { typeOf });
  const cov = learn.buildCov(transitions, { targets: targetUrls() });

  // 5. オフポリシー評価。
  const ope = learn.evaluatePolicies({ rows, prior, cap: Number(rules.ope_weight_cap) || 20, folds: OPE_FOLDS });

  // 6. 書く。/api/suggest が読むのは nq_model だけなので、そちらを先に書く。
  const version = 'm_' + until.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const wrote = { model: false, transitions: false };
  const modelRes = await rest(ctx, 'POST', 'nq_model', {
    prefer: 'return=minimal',
    body: {
      version,
      created_at: until,
      mean: fit.mean,
      variance: fit.variance,
      n_impressions: fit.n_impressions,
      aux: { V: values.V, V_type: values.V_type, cov },
      ope,
    },
  });
  if (!modelRes.ok) throw fail(`write_nq_model_${modelRes.status}`);
  wrote.model = true;

  // 遷移表の入れ替えは「今回の時刻で上書き → 今回より古い行を消す」の順。先に全部消すと、
  // 途中で失敗したときに表が空のまま残る。失敗しても学習済みモデルは書けているので、ここは落とさない。
  try {
    for (let i = 0; i < transitions.length; i += WRITE_CHUNK) {
      const chunk = transitions.slice(i, i + WRITE_CHUNK).map((t) => Object.assign({ updated_at: until }, t));
      const r = await rest(ctx, 'POST', 'nq_transitions?on_conflict=from_url,to_url', { prefer: 'resolution=merge-duplicates,return=minimal', body: chunk });
      if (!r.ok) throw fail(`write_nq_transitions_${r.status}`);
    }
    const del = await rest(ctx, 'DELETE', `nq_transitions?updated_at=lt.${encodeURIComponent(until)}`, { prefer: 'return=minimal' });
    if (!del.ok) throw fail(`clean_nq_transitions_${del.status}`);
    wrote.transitions = true;
  } catch (e) {
    console.error('[nq] train transitions failed', String((e && e.nq && e.code) || (e && e.name) || 'error'));
  }

  return {
    ok: true,
    version,
    n_impressions: fit.n_impressions,
    n_positive: fit.n_positive,
    converged: fit.converged,
    n_sessions: paths.length,
    n_transitions: transitions.length,
    truncated,
    wrote,
    ms: clock() - started,
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!authorized(req)) { res.status(401).json({ error: 'unauthorized' }); return; }

  if (process.env.NQ_LEARN !== '1') { res.status(200).json({ ok: true, skipped: 'disabled' }); return; }
  if (!log.configured()) { res.status(200).json({ ok: true, skipped: 'not_configured' }); return; }

  try {
    const out = await run();
    console.log('[nq] train', JSON.stringify(out));
    // 打ち切りは失敗ではないが、毎晩続くなら行数が増えすぎているしるしなので、エラーのログにも1行出す。
    if (Object.values(out.truncated).some(Boolean)) console.error('[nq] train truncated', JSON.stringify(out.truncated));
    res.status(200).json(out);
  } catch (e) {
    // 自前のエラーは状況コードだけ。それ以外（fetch の例外など）は名前だけ出す。
    const code = e && e.nq === true ? String(e.code) : String((e && e.name) || 'error');
    console.error('[nq] train failed', code);
    res.status(500).json({ ok: false, error: e && e.nq === true ? code : 'failed' });
  }
};

module.exports.run = run;
