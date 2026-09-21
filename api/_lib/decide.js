// 次ページ提案（nq）— 判定層。モデルの呼び出しをこの1関数に閉じ込める。
//
//   decide(state, questions, opts) -> { provider, model, answers, latency_ms }
//
// 同じ入出力のまま別のモデルに差し替えられるようにするのが目的（設計書 原則5・6章）。
// どのプロバイダも、返す answers は下の「正規化形」にそろえる。rules.js はこの形しか知らない。
//
//   choice: { choice, confidence, probabilities: { <label>: p } }
//   score : { score, confidence, probabilities: { "0": p, "1": p, ... } }
//   noul  : { noul }
//
// 質問の数と名前は固定ではない。提案カードの関連度（rel_<block_id>、noul）は、そのとき候補に
// なっているカードの数だけ来る（questions.js）。どのプロバイダも、渡された questions のキーを
// そのまま回答のキーにする。
//
// env NQ_MODEL_PROVIDER:
//   stub      既定。外部を呼ばない決定的な疑似回答。常に低確信なので結果は必ずデフォルトになる。
//             API キーが無い段階で、配線（ログ・ホールドアウト・シャドー）だけ先に通すためのもの。
//   jev       本番の判定。TypeSafe AI System One の直接 API（docs/nq/jev-api-notes.md）。
//             env: JEV_API_KEY（必須） JEV_MODEL（既定 jev-1.13.0） JEV_BASE_URL（既定 https://api.typesafe.ai）
// 別のモデルを足すときは、call<名前>(state, questions, opts) -> { model, answers（正規化形） } を書き、
// 下の decide() の分岐に1行足す。呼び出し側（api/suggest.js、rules.js）は変えなくてよい。
// API キーは環境変数からだけ読む。コミットしない。ブラウザにも返さない。
//
// 失敗したら throw する（err.code は短い符号、err.latency_ms は経過時間）。リトライはしない。
// 呼び出し側が 1.2 秒の予算でデフォルトに倒すので、待って取り直しても間に合わない。
// 外部サービスのエラー本文はサーバのログにだけ出し、呼び出し側には渡さない。

const data = require('./data');

const JEV_DEFAULT_BASE = 'https://api.typesafe.ai';
const JEV_PATH = '/v1/systemone';
// latest は使わない。新しいリリースで答えが変わると、しきい値の前提が崩れる。
const JEV_DEFAULT_MODEL = 'jev-1.13.0';

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const round4 = (v) => Math.round(v * 10000) / 10000;

function fail(code, latency) {
  const e = new Error('nq_decide_' + code);
  e.code = code;
  e.nq = true; // この関数が作ったエラーの目印（下の decide() が見分けに使う）
  if (latency != null) e.latency_ms = latency;
  return e;
}

// ---- 正規化 ----

// answers の入れ物。公式はキー→回答のマップだが、配列（[{ key, ... }]）でも受ける。
function toAnswerMap(raw) {
  if (isObj(raw)) return raw;
  if (!Array.isArray(raw)) return null;
  const out = {};
  for (const a of raw) {
    if (!isObj(a)) continue;
    const k = a.key || a.name || a.id || a.question;
    if (typeof k === 'string' && !has(out, k)) out[k] = a;
  }
  return out;
}

// 確率分布 → { label: p }。マップ、数値の配列（選択肢の並び順）、[{label, probability}] の3通りを受ける。
// keys に無いラベルは捨てる（モデルが選択肢に無い語を返しても、ログとルールに混ぜない）。
function toProbMap(raw, keys, aliases) {
  const out = {};
  const put = (k, v) => {
    let key = String(k);
    if (aliases && has(aliases, key)) key = aliases[key];
    const p = num(v);
    if (p != null && keys.includes(key)) out[key] = round4(clamp01(p));
  };
  if (Array.isArray(raw)) {
    if (raw.length && raw.every((v) => typeof v === 'number')) {
      if (raw.length === keys.length) raw.forEach((v, i) => put(keys[i], v));
    } else {
      for (const item of raw) {
        if (!isObj(item)) continue;
        const k = [item.label, item.key, item.option, item.choice, item.level, item.score].find((x) => x != null);
        const v = [item.probability, item.p, item.prob, item.value].find((x) => x != null);
        if (k != null) put(k, v);
      }
    }
  } else if (isObj(raw)) {
    for (const k of Object.keys(raw)) put(k, raw[k]);
  }
  return out;
}

function argmax(probs) {
  let best = null;
  for (const k of Object.keys(probs)) if (best == null || probs[k] > probs[best]) best = k;
  return best;
}

function normChoice(a, q) {
  const keys = Object.keys(q.criteria || {});
  const src = isObj(a) ? a : {};
  const probabilities = toProbMap(src.probabilities, keys);
  let choice = typeof src.choice === 'string' && keys.includes(src.choice) ? src.choice : null;
  if (choice == null && typeof src.choice !== 'string') choice = argmax(probabilities);
  // 選択肢に無い語を返してきたら「分からない」と同じ扱い（確信度 0）にして、ルールに当てない。
  let confidence = choice == null ? 0 : num(src.confidence);
  if (confidence == null) confidence = has(probabilities, choice) ? probabilities[choice] : 0;
  return { choice, confidence: round4(clamp01(confidence)), probabilities };
}

function normScore(a, q) {
  const levels = Array.isArray(q.criteria) ? q.criteria : [];
  const keys = levels.map((_, i) => String(i));
  // 分布のキーが段階の説明文で返ってきた場合は、段階の番号に読み替える。
  const aliases = {};
  levels.forEach((text, i) => { aliases[String(text)] = String(i); });
  const src = isObj(a) ? a : {};
  const probabilities = toProbMap(src.probabilities, keys, aliases);
  let score = num(src.score);
  if (score == null && Object.keys(probabilities).length) {
    score = Object.keys(probabilities).reduce((s, k) => s + Number(k) * probabilities[k], 0);
  }
  if (score != null) score = round4(Math.min(Math.max(0, keys.length - 1), Math.max(0, score)));
  let confidence = num(src.confidence);
  if (confidence == null) {
    const top = argmax(probabilities);
    confidence = top == null ? 0 : probabilities[top];
  }
  return { score, confidence: round4(clamp01(score == null ? 0 : confidence)), probabilities };
}

function normNoul(a) {
  const v = typeof a === 'number' ? num(a) : num(isObj(a) ? a.noul : null);
  return { noul: v == null ? null : round4(clamp01(v)) };
}

// 質問の型は「こちらが送った questions」で決める。レスポンス側の type 表記
// （公式は小文字、DEV 記事の例は先頭大文字）には依存しない。
function normalizeAnswers(raw, questions) {
  const map = toAnswerMap(raw);
  if (!map) return null;
  const out = {};
  for (const key of Object.keys(questions || {})) {
    const q = questions[key];
    const a = has(map, key) ? map[key] : null;
    if (q.type === 'choice') out[key] = normChoice(a, q);
    else if (q.type === 'score') out[key] = normScore(a, q);
    else out[key] = normNoul(a);
  }
  return out;
}

// ---- stub ----

// 決定的な疑似回答。分布は一様、choice は「other／不明」に寄せ、確信度はどのしきい値にも
// 届かない値にする。noul は一律 0.1 で、関連度（rel_*）も下限（rel_floor）に届かない。
// これで recommend は何も選ばず、applyRules は必ず行7（デフォルト）に落ちる。
let stubOverrides = null; // テスト専用の差し替え（下の __setStubForTest）

function stubAnswers(questions) {
  const raw = {};
  for (const key of Object.keys(questions)) {
    const q = questions[key];
    if (q.type === 'choice') {
      const keys = Object.keys(q.criteria || {});
      const choice = ['other', '不明・その他'].find((k) => keys.includes(k)) || keys[keys.length - 1] || null;
      const p = keys.length ? 1 / keys.length : 0;
      const probabilities = {};
      keys.forEach((k) => { probabilities[k] = p; });
      raw[key] = { choice, confidence: p, probabilities };
    } else if (q.type === 'score') {
      const n = (q.criteria || []).length || 1;
      raw[key] = { score: 0.5, confidence: 1 / n, probabilities: (q.criteria || []).map(() => 1 / n) };
    } else {
      raw[key] = { noul: 0.1 };
    }
  }
  if (stubOverrides) {
    for (const key of Object.keys(stubOverrides)) if (has(raw, key)) raw[key] = stubOverrides[key];
  }
  return raw;
}

// ---- Jev ----

async function callJev(state, questions, opts) {
  const key = process.env.JEV_API_KEY;
  if (!key) throw fail('not_configured');
  const model = opts.model || process.env.JEV_MODEL || JEV_DEFAULT_MODEL;
  const base = String(process.env.JEV_BASE_URL || JEV_DEFAULT_BASE).replace(/\/+$/, '');
  // Vercel AI Gateway 経由（model id 'typesafe-ai/jev'）に切り替えるなら、この関数を差し替える。
  // Gateway 側の質問 type 名とバージョン固定の方法が公式ページから確定できなかったので、
  // 初期実装は直接 API にしている。
  const r = await opts.fetch(base + JEV_PATH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, state, questions }),
    signal: AbortSignal.timeout(opts.timeout_ms),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    console.error('[nq] jev http', r.status, String(detail).slice(0, 300));
    throw fail('http_' + r.status);
  }
  const json = await r.json().catch(() => null);
  const answers = normalizeAnswers(json && json.answers, questions);
  if (!answers) throw fail('bad_response');
  return { model: (json && typeof json.model === 'string' && json.model) || model, answers };
}

// ---- 入口 ----

// opts: { provider, model, timeout_ms, fetch }。fetch はテストで差し替えるためのもの。
async function decide(state, questions, opts) {
  const o = Object.assign({}, opts);
  const provider = String(o.provider || process.env.NQ_MODEL_PROVIDER || 'stub').toLowerCase();
  o.fetch = o.fetch || globalThis.fetch;
  if (!(Number(o.timeout_ms) > 0)) o.timeout_ms = Number(data.rules.model_timeout_ms) || 900;

  const t0 = Date.now();
  try {
    let out;
    if (provider === 'stub') out = { model: 'stub-1', answers: normalizeAnswers(stubAnswers(questions), questions) };
    else if (provider === 'jev') out = await callJev(state, questions, o);
    else throw fail('unknown_provider');
    return { provider, model: out.model, answers: out.answers, latency_ms: Date.now() - t0 };
  } catch (e) {
    const timedOut = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
    // e.code の有無では見分けない。AbortSignal.timeout の TimeoutError は DOMException で、
    // 旧来の数値コード（23）を code に持っているため、素通しすると 'timeout' にならない。
    const err = e && e.nq === true ? e : fail(timedOut ? 'timeout' : 'fetch_failed');
    err.provider = provider;
    err.latency_ms = Date.now() - t0;
    throw err;
  }
}

module.exports = {
  decide,
  normalizeAnswers,
  stubAnswers,
  // テスト専用。stub の回答の一部を差し替える（{ 質問のキー: プロバイダが返す形の回答 }）。
  // 外部を呼ばずに、api/suggest.js の「個別化した応答」の経路まで通すためのもの。null で解除。
  // 質問に無いキーは無視するので、ここから質問を増やすことはできない。
  __setStubForTest(overrides) { stubOverrides = isObj(overrides) ? overrides : null; },
};
