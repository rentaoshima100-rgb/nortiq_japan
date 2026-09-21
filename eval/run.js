#!/usr/bin/env node
// 次ページ提案（nq）— 評価ランナー（設計書13章「0. 検証」）。
//
//   node eval/run.js --provider jev|stub [--limit N] [--ids s01,s02] [--out eval/results/<name>.json]
//                    [--sessions eval/sessions.json] [--timeout-ms 8000] [--verbose]
//   node eval/run.js --check        評価セットの形だけ確かめる（モデルは呼ばない）
//
// eval/sessions.json の各セッションを、本番（api/suggest.js）と同じ部品に同じ順で通す:
//   buildState → buildQuestions → decide → recommend → applyRules
// そのうえで、人が付けた正解（expected）とモデルの回答を軸ごとに突き合わせ、一致率・レイテンシ・
// 原価・other／低確信率を表にして出す。しきい値（data/nq-rules.json）やラベル（data/nq-labels.json）を
// 変えたら、これを回して確認し直す。
//
// 本番と変えてあるのは3点だけ。
//  1. 未承認のブロックも候補に入れる（data.js の __setForTest({ includeUnapproved:true })）。
//     承認前の下書きの audience を試すのが目的なので。本番経路の承認フィルタは変わらない。
//  2. モデルのタイムアウトを長くする（既定 8 秒。本番は model_timeout_ms の 900ms）。
//     一致率を測るには遅い応答でも回答が要る。「1.2 秒以内の割合」は実測のレイテンシから別に出す。
//  3. 乱数を固定する（seededRng）。同じ回答なら、何度回しても同じカードが選ばれる。
//
// 依存ゼロ。API キーは環境変数か、リポジトリ直下の .env.local（.gitignore 済み）からだけ読む。
// キーの値は、標準出力にも結果ファイルにも書かない。
//
// 結果ファイル（--out）に入るのは、状態・質問への回答・選ばれたブロック・レイテンシ・トークン数だけ。
// どれもカタログ由来の語と数値で、個人の情報もキーも含まない。

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const data = require('../api/_lib/data');
const guard = require('../api/_lib/guard');
const { buildState, resolvePage } = require('../api/_lib/state');
const { buildQuestions, CONCERNS } = require('../api/_lib/questions');
const { decide } = require('../api/_lib/decide');
const { recommend, policyLabel, seededRng } = require('../api/_lib/recommend');
const { applyRules, cardSlots } = require('../api/_lib/rules');

// Jev の料金（docs/nq/jev-api-notes.md）。入力 $0.042 / 100万トークン、出力は無料。
const JEV_USD_PER_MTOK = 0.042;
// usage が返らないとき（stub など）の概算。送る JSON（state ＋ questions）の文字数に掛ける。
// 2026-09-20 に実キーで 5 件測った値（入力トークン ÷ 文字数）の平均。日本語が多いほど大きくなる。
const TOKENS_PER_CHAR = 0.79;
const TRIGGERS = ['T1', 'T2', 'T3'];
const DEFAULT_TIMEOUT_MS = 8000;
// 「いま出せない」という理由で推薦から外れた候補。関連度が高くても配信されないので、
// 1位のカードと適合率・再現率の計算からも外す（rel_floor で落ちたものは「低い」と答えただけなので残す）。
// visitor_type は、訪問者タイプで対象外にしたカード（blocks.json の only_visitor_types。sg-recruit は求職者だけ）。
const UNDELIVERABLE = ['not_selectable', 'no_industry', 'unapproved', 'same_page', 'viewed', 'visitor_type'];

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const fin = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const arr = (v) => (Array.isArray(v) ? v : []);

// ---- 引数と .env.local ----

function parseArgs(argv) {
  const out = { provider: null, limit: 0, ids: null, out: null, sessions: path.join(__dirname, 'sessions.json'),
    timeoutMs: DEFAULT_TIMEOUT_MS, verbose: false, check: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--provider') out.provider = String(next() || '').toLowerCase();
    else if (a === '--limit') out.limit = Math.max(0, parseInt(next(), 10) || 0);
    else if (a === '--ids') out.ids = String(next() || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--out') out.out = next();
    else if (a === '--sessions') out.sessions = path.resolve(next());
    else if (a === '--timeout-ms') out.timeoutMs = Math.max(100, parseInt(next(), 10) || DEFAULT_TIMEOUT_MS);
    else if (a === '--verbose') out.verbose = true;
    else if (a === '--check') out.check = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else { console.error('不明な引数: ' + a); out.help = true; }
  }
  return out;
}

// KEY=VALUE の行だけを読む簡易パーサ（dotenv を足さないため）。すでに環境変数に在るキーは
// 上書きしない（CI や vercel dev が渡した値を優先する）。値は返さず、読めたキーの名前だけ返す。
function loadEnvLocal(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const loaded = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '#') continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    if (process.env[m[1]] == null || process.env[m[1]] === '') { process.env[m[1]] = v; loaded.push(m[1]); }
  }
  return loaded;
}

// ---- catalog ----

// 記事のタイトルは build.js の BLOG にしか無い。api/_data/catalog.json は build.js の生成物
// （.gitignore 対象）なので、ビルド前の作業ツリーには無い。評価のためだけにビルドを要求しないよう、
// ここで同じ規則（コントラクト 3.3）で組み立てる。BLOG は読むだけ（build-prerender.js と同じ正規表現）。
// 生成物が在れば、そちらを上に重ねる（本番が実際に読むものを優先する）。
function buildEvalCatalog() {
  const readJson = (rel) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return null; } };
  const pages = data.pagesToMap(readJson('data/catalog-pages.json'));

  const meta = readJson('data/catalog-articles.json') || {};
  const defaults = meta.category_defaults || {};
  const overrides = meta.overrides || {};
  let src = '';
  try { src = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8'); } catch { /* 記事なしで続ける */ }
  const m = src.match(/const BLOG = \[([\s\S]*?)\n\];/);
  let articles = 0;
  for (const line of (m ? m[1] : '').split('\n')) {
    const slug = line.match(/slug: '([^']+)'/);
    if (!slug) continue;
    const category = line.match(/category: '([^']+)'/);
    const title = line.match(/title: '((?:[^'\\]|\\.)*)'/);
    const topic = category ? category[1] : '';
    const d = overrides[slug[1]] || defaults[topic] || defaults['*'] || {};
    pages['/article-' + slug[1]] = {
      title: title ? title[1].replace(/\\(.)/g, '$1') : '',
      type: 'article',
      topic,
      industry: arr(d.industry),
      need: arr(d.need),
    };
    articles += 1;
  }

  const built = readJson('api/_data/catalog.json');
  const fromBuild = built && isObj(built.pages) ? Object.keys(built.pages).length : 0;
  if (fromBuild) Object.assign(pages, built.pages);
  return { pages, articles, fromBuild };
}

// ---- 評価セットの検査 ----

function labelKeys(axis) {
  const L = data.labels || {};
  return Object.keys((L[axis] && L[axis].criteria) || {});
}

// 形の誤り（errors）があるセッションは実行しない。warnings は実行するが、正解の付け方を見直す合図。
function checkSession(s) {
  const errors = [];
  const warnings = [];
  const req = s && s.request;
  const exp = s && s.expected;
  if (!s || typeof s.id !== 'string' || !s.id) { errors.push('id が無い'); return { errors, warnings }; }
  if (!isObj(req)) errors.push('request が無い');
  if (!isObj(exp)) errors.push('expected が無い');
  if (errors.length) return { errors, warnings };

  // 本番の入口（api/suggest.js）と同じ検証。ここで落ちる要求は、本番でも判定されない。
  if (!guard.validSessionId(req.session_id)) errors.push('session_id の形が不正: ' + req.session_id);
  if (!TRIGGERS.includes(req.trigger)) errors.push('trigger が不正: ' + req.trigger);
  if (req.page_url != null && !resolvePage(req.page_url)) errors.push('page_url が catalog に無い: ' + req.page_url);
  const st = isObj(req.state) ? req.state : {};
  const urls = [st.landing, st.current && st.current.url].concat(arr(st.history).map((h) => h && h.url));
  for (const u of urls) {
    if (!resolvePage(u)) errors.push('catalog に無い URL: ' + u);
    // 未登録の /article-* は state.js が素通しするが、評価セットには実在する記事だけを置く。
    else if (!has(data.catalog, resolvePage(u).url)) errors.push('BLOG に無い記事: ' + u);
  }
  const built = buildState(req.state);
  if (!built.ok) errors.push('buildState が通らない（列挙値か URL を確認）');
  if (built.ok && arr(st.passed).length !== built.passed.length) errors.push('passed に blocks に無い ID がある');

  // 正解ラベル
  const alt = isObj(exp.alt) ? exp.alt : {};
  for (const axis of ['visitor_type', 'industry', 'need']) {
    const keys = labelKeys(axis);
    for (const v of [exp[axis]].concat(arr(alt[axis]))) if (!keys.includes(v)) errors.push(axis + ' のラベルが nq-labels.json に無い: ' + v);
  }
  if (![0, 1, 2, 3].includes(exp.stage)) errors.push('stage は 0〜3 の整数: ' + exp.stage);
  if (typeof exp.cta_ok !== 'boolean') errors.push('cta_ok は true / false');
  for (const c of arr(exp.concerns)) if (!CONCERNS.includes(c)) errors.push('不安の ID が不正: ' + c);
  if (!Array.isArray(exp.relevant_cards)) errors.push('relevant_cards は配列');

  // カードの正解は「そのとき聞かれる候補」の中に在ること。すでに読んだページや現在のページを指す
  // カードは候補から外れるので（設計書7章「1. 候補を絞る」）、正解にしても当たりようがない。
  if (built.ok) {
    const { candidates } = buildQuestions({ passed: built.passed, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls });
    const cards = arr(exp.relevant_cards).concat(exp.best_card === 'none' ? [] : [exp.best_card], arr(alt.best_card).filter((c) => c !== 'none'));
    for (const id of cards) {
      if (!data.getBlock(id)) errors.push('blocks.json に無いカード: ' + id);
      else if (!candidates.includes(id)) errors.push('候補に入らないカードが正解になっている: ' + id);
    }
    if (exp.best_card !== 'none' && !arr(exp.relevant_cards).includes(exp.best_card)) warnings.push('best_card が relevant_cards に入っていない');
    if (exp.best_card === 'none' && arr(exp.relevant_cards).length) warnings.push('relevant_cards が在るのに best_card が none');
  }
  return { errors, warnings };
}

// ---- 1セッションを通す ----

// usage（入力トークン数）を横から控える fetch。decide.js は回答しか返さないので、応答の写しを読む。
function meteredFetch(sink) {
  return async (url, init) => {
    const r = await globalThis.fetch(url, init);
    try {
      const j = await r.clone().json();
      if (j && isObj(j.usage)) sink.usage = { input_tokens: fin(j.usage.input_tokens), output_tokens: fin(j.usage.output_tokens) };
    } catch { /* JSON でなければ控えない。decide 側がエラーにする */ }
    return r;
  };
}

async function runOne(session, index, opts) {
  const req = session.request;
  const built = buildState(req.state);
  const { questions, candidates } = buildQuestions({ passed: built.passed, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls });
  const chars = JSON.stringify({ state: built.state, questions }).length;
  const rec0 = { id: session.id, trigger: req.trigger, n_questions: Object.keys(questions).length, candidates_asked: candidates,
    request_chars: chars, expected: session.expected, state: built.state };

  const sink = {};
  let decided;
  try {
    decided = await decide(built.state, questions, { provider: opts.provider, timeout_ms: opts.timeoutMs, fetch: meteredFetch(sink) });
  } catch (e) {
    return Object.assign(rec0, { ok: false, error: String((e && e.code) || 'error'), latency_ms: fin(e && e.latency_ms), usage: sink.usage || null });
  }

  const rec = recommend({
    answers: decided.answers, candidates, slots: cardSlots(req.trigger), currentUrl: built.currentUrl,
    viewedUrls: built.viewedUrls, revisit: built.revisit, model: null, policy: 'prior',
    // セッションの順番を種にする。5% の一様探索も含めて、同じ回答なら同じ結果になる。
    rng: seededRng(index + 1),
  });
  const ruled = applyRules({ answers: decided.answers, trigger: req.trigger, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls, picks: rec.picks });

  return Object.assign(rec0, {
    ok: true, model: decided.model, latency_ms: decided.latency_ms, usage: sink.usage || null,
    answers: decided.answers,
    recommend: { reason: rec.reason, policy: policyLabel(rec), picks: rec.picks,
      candidates: rec.candidates.map((c) => ({ block_id: c.block_id, rel: c.rel, excluded: c.excluded || null, score: c.score == null ? null : c.score })) },
    slots: ruled.slots, is_default: ruled.is_default, matched: ruled.matched, skipped: ruled.skipped,
  });
}

// ---- 集計 ----

const ratio = (a, b) => (b > 0 ? a / b : null);

function percentile(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}

function latencyStats(values, budgets) {
  const v = values.filter((x) => fin(x) != null).sort((a, b) => a - b);
  const out = { n: v.length, p50: percentile(v, 0.5), p90: percentile(v, 0.9), max: v.length ? v[v.length - 1] : null };
  for (const b of budgets) out['within_' + b] = ratio(v.filter((x) => x <= b).length, v.length);
  return out;
}

function prf(tp, fp, fn) {
  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const f1 = precision != null && recall != null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
  return { tp, fp, fn, precision, recall, f1 };
}

// 「判断できない」を表すラベル。しきい値に届かない回答は、ルールの上ではこれと同じ扱いになる。
const UNKNOWN_LABEL = { visitor_type: 'other', industry: '不明・その他', need: 'other' };
const BUSINESS_TYPES = ['発注検討中の事業者', '情報収集中の事業者'];

function summarize(records, th) {
  const ok = records.filter((r) => r.ok);
  const out = { n: records.length, answered: ok.length, failed: records.length - ok.length, errors: {} };
  for (const r of records) if (!r.ok) out.errors[r.error] = (out.errors[r.error] || 0) + 1;

  // 択一の3軸。strict は第1ラベルとの完全一致、lenient は expected.alt の許容ラベルも正解にしたもの、
  // effective は「確信度がしきい値未満の回答を『判断できない』に読み替えた」うえでの lenient。
  const axisTh = { visitor_type: th.visitor_type, industry: th.industry_switch, need: th.visitor_type };
  out.axes = {};
  for (const axis of ['visitor_type', 'industry', 'need']) {
    let strict = 0; let lenient = 0; let effective = 0; let unknown = 0; let sure = 0; let sureHit = 0;
    const confusion = {};
    for (const r of ok) {
      const a = r.answers[axis] || {};
      const exp = r.expected[axis];
      const accept = [exp].concat(arr(r.expected.alt && r.expected.alt[axis]));
      const conf = fin(a.confidence) || 0;
      if (a.choice === exp) strict += 1; else confusion[exp + ' → ' + a.choice] = (confusion[exp + ' → ' + a.choice] || 0) + 1;
      if (accept.includes(a.choice)) lenient += 1;
      const eff = conf >= axisTh[axis] ? a.choice : UNKNOWN_LABEL[axis];
      if (accept.includes(eff)) effective += 1;
      if (eff === UNKNOWN_LABEL[axis]) unknown += 1;
      if (conf >= axisTh[axis]) { sure += 1; if (accept.includes(a.choice)) sureHit += 1; }
    }
    out.axes[axis] = {
      strict: ratio(strict, ok.length), lenient: ratio(lenient, ok.length), effective: ratio(effective, ok.length),
      threshold: axisTh[axis], sure_share: ratio(sure, ok.length), sure_accuracy: ratio(sureHit, sure),
      unknown_or_low: ratio(unknown, ok.length),
      confusion: Object.keys(confusion).map((k) => ({ pair: k, n: confusion[k] })).sort((a, b) => b.n - a.n).slice(0, 8),
    };
  }

  // 検討度。Score は小数で返るので四捨五入して比べる。
  // 事業者でない訪問者（同業者・求職者・営業・other）の正解はすべて 0 なので、全件の数字は甘く出る。
  // CTA の強さを決めるのは事業者の検討度なので、事業者だけの数字を別に出す。
  const stageOf = (rows) => {
    let s0 = 0; let s1 = 0; let sAbs = 0; let sN = 0;
    for (const r of rows) {
      const score = fin(r.answers.stage && r.answers.stage.score);
      if (score == null) continue;
      sN += 1;
      const d = Math.abs(Math.round(score) - r.expected.stage);
      if (d === 0) s0 += 1;
      if (d <= 1) s1 += 1;
      sAbs += Math.abs(score - r.expected.stage);
    }
    return { n: sN, exact: ratio(s0, sN), within1: ratio(s1, sN), mean_abs_error: ratio(sAbs, sN) };
  };
  out.stage = stageOf(ok);
  out.stage_business = stageOf(ok.filter((r) => BUSINESS_TYPES.includes(r.expected.visitor_type)));

  // カード。関連度の1位と、rel_floor で二値化した適合率・再現率。
  let noneAgree = 0; let top1N = 0; let top1 = 0; let top1Lenient = 0; let belowGate = 0;
  let tp = 0; let fp = 0; let fn = 0;
  const perCard = {};
  for (const r of ok) {
    const pool = r.recommend.candidates.filter((c) => !UNDELIVERABLE.includes(c.excluded) && fin(c.rel) != null);
    let best = null;
    for (const c of pool) if (!best || c.rel > best.rel) best = c;
    const predicted = best && best.rel >= th.rel_gate ? best.block_id : 'none';
    r.predicted_best = predicted;
    if (predicted === 'none') belowGate += 1;
    const exp = r.expected.best_card;
    if ((predicted === 'none') === (exp === 'none')) noneAgree += 1;
    if (exp !== 'none') {
      top1N += 1;
      if (predicted === exp) top1 += 1;
      const accept = [exp].concat(arr(r.expected.alt && r.expected.alt.best_card), arr(r.expected.relevant_cards));
      if (accept.includes(predicted)) top1Lenient += 1;
    }
    const relevant = arr(r.expected.relevant_cards);
    for (const c of pool) {
      const yes = c.rel >= th.rel_floor;
      const truth = relevant.includes(c.block_id);
      const pc = perCard[c.block_id] || (perCard[c.block_id] = { tp: 0, fp: 0, fn: 0 });
      if (yes && truth) { tp += 1; pc.tp += 1; } else if (yes) { fp += 1; pc.fp += 1; } else if (truth) { fn += 1; pc.fn += 1; }
    }
  }
  out.cards = {
    none_agreement: ratio(noneAgree, ok.length), top1_n: top1N, top1: ratio(top1, top1N), top1_in_relevant: ratio(top1Lenient, top1N),
    below_gate: ratio(belowGate, ok.length), rel_gate: th.rel_gate, rel_floor: th.rel_floor,
    relevant: prf(tp, fp, fn),
    per_card: Object.keys(perCard).sort().map((id) => Object.assign({ block_id: id }, prf(perCard[id].tp, perCard[id].fp, perCard[id].fn))),
  };

  // 不安と CTA。しきい値で二値化する。
  let ctp = 0; let cfp = 0; let cfn = 0;
  const perConcern = {};
  for (const c of CONCERNS) perConcern[c] = { tp: 0, fp: 0, fn: 0 };
  let ctaHit = 0; let ktp = 0; let kfp = 0; let kfn = 0;
  for (const r of ok) {
    for (const c of CONCERNS) {
      const yes = (fin(r.answers['concern_' + c] && r.answers['concern_' + c].noul) || 0) >= th.concern;
      const truth = arr(r.expected.concerns).includes(c);
      if (yes && truth) { ctp += 1; perConcern[c].tp += 1; } else if (yes) { cfp += 1; perConcern[c].fp += 1; } else if (truth) { cfn += 1; perConcern[c].fn += 1; }
    }
    const yes = (fin(r.answers.cta_ok && r.answers.cta_ok.noul) || 0) >= th.cta_ok;
    if (yes === r.expected.cta_ok) ctaHit += 1;
    if (yes && r.expected.cta_ok) ktp += 1; else if (yes) kfp += 1; else if (r.expected.cta_ok) kfn += 1;
  }
  out.concerns = Object.assign({ threshold: th.concern }, prf(ctp, cfp, cfn),
    { per_concern: CONCERNS.map((c) => Object.assign({ concern: c }, prf(perConcern[c].tp, perConcern[c].fp, perConcern[c].fn))) });
  out.cta_ok = Object.assign({ threshold: th.cta_ok, accuracy: ratio(ctaHit, ok.length) }, prf(ktp, kfp, kfn));

  // ルールを通した結果。正解のタイプ別に、何件が個別化されたか（営業に営業系のカードが出ていないかを見る）。
  const byType = {};
  const rows = {};
  for (const r of ok) {
    const t = r.expected.visitor_type;
    const b = byType[t] || (byType[t] = { n: 0, personalized: 0, blocks: {} });
    b.n += 1;
    if (!r.is_default) b.personalized += 1;
    for (const slot of Object.keys(r.slots)) b.blocks[r.slots[slot].block_id] = (b.blocks[r.slots[slot].block_id] || 0) + 1;
    for (const m of r.matched) rows[m] = (rows[m] || 0) + 1;
  }
  out.rules = { personalized: ratio(ok.filter((r) => !r.is_default).length, ok.length), matched_rows: rows, by_expected_type: byType };

  // レイテンシ。1件目は新規の TLS 接続を含むので、除いた値も出す（docs/nq/jev-api-notes.md）。
  const lat = records.map((r) => r.latency_ms);
  out.latency = { all: latencyStats(lat, [1200, 900]), warm: latencyStats(lat.slice(1), [1200, 900]) };

  // 原価。usage が取れた件はその値、取れなかった件は文字数からの概算。
  let tokens = 0; let measured = 0;
  for (const r of records) {
    const t = fin(r.usage && r.usage.input_tokens);
    if (t != null) { tokens += t; measured += 1; } else tokens += Math.round(r.request_chars * TOKENS_PER_CHAR);
  }
  const avg = ratio(tokens, records.length);
  out.cost = { input_tokens_total: tokens, input_tokens_avg: avg, measured, estimated: records.length - measured,
    usd_per_mtok: JEV_USD_PER_MTOK, usd_total: (tokens * JEV_USD_PER_MTOK) / 1e6, usd_per_1000_calls: avg == null ? null : (avg * 1000 * JEV_USD_PER_MTOK) / 1e6 };
  return out;
}

// ---- 表示 ----

// 全角を 2 桁として幅をそろえる（日本語のラベルが混じる表なので）。
const width = (s) => [...String(s)].reduce((w, ch) => w + (ch.charCodeAt(0) > 0xff ? 2 : 1), 0);
const pad = (s, w) => String(s) + ' '.repeat(Math.max(0, w - width(s)));
const pc = (v) => (v == null ? '  -  ' : (v * 100).toFixed(1) + '%');
const ms = (v) => (v == null ? '-' : Math.round(v) + 'ms');

function table(rows) {
  const widths = [];
  for (const r of rows) r.forEach((c, i) => { widths[i] = Math.max(widths[i] || 0, width(c)); });
  return rows.map((r) => '  ' + r.map((c, i) => pad(c, widths[i])).join('  ').trimEnd()).join('\n');
}

function printSummary(meta, s) {
  const L = [];
  L.push('');
  L.push(`== nq 評価: provider=${meta.provider} model=${meta.model || '-'} / ${s.n} セッション（回答あり ${s.answered}・失敗 ${s.failed}）`);
  if (s.failed) L.push('  失敗の内訳: ' + Object.keys(s.errors).map((k) => `${k}×${s.errors[k]}`).join(' '));

  L.push('\n[択一の3軸] 完全一致 = 第1ラベルと一致 ／ 許容込み = expected.alt も正解 ／ しきい値後 = 確信度がしきい値未満なら「判断できない」に読み替え');
  L.push(table([['軸', '完全一致', '許容込み', 'しきい値後', '確信あり', '確信ありの正答', 'other・低確信']].concat(
    ['visitor_type', 'industry', 'need'].map((k) => { const a = s.axes[k]; return [k, pc(a.strict), pc(a.lenient), pc(a.effective), pc(a.sure_share), pc(a.sure_accuracy), pc(a.unknown_or_low)]; }))));
  for (const k of ['visitor_type', 'industry', 'need']) {
    if (s.axes[k].confusion.length) L.push(`  ${k} の取り違え（正解 → 回答）: ` + s.axes[k].confusion.slice(0, 5).map((c) => `${c.pair} ×${c.n}`).join(' ／ '));
  }

  L.push('\n[検討度 stage] 四捨五入して比較');
  const stageRow = (label, g) => [label, g.n, pc(g.exact), pc(g.within1), g.mean_abs_error == null ? '-' : g.mean_abs_error.toFixed(2)];
  L.push(table([['', 'n', '±0', '±1', '平均絶対誤差'], stageRow('全件', s.stage), stageRow('事業者だけ', s.stage_business)]));

  L.push(`\n[カード] 1位 = 関連度が最大のカード（${s.cards.rel_gate} 未満なら none）／ 適合率・再現率は関連度 ${s.cards.rel_floor} で二値化`);
  L.push(table([['none の一致', `1位の一致（n=${s.cards.top1_n}）`, '1位が正解カードのどれか', '適合率', '再現率', 'F1', '門の未満（none）'],
    [pc(s.cards.none_agreement), pc(s.cards.top1), pc(s.cards.top1_in_relevant), pc(s.cards.relevant.precision), pc(s.cards.relevant.recall), pc(s.cards.relevant.f1), pc(s.cards.below_gate)]]));
  L.push(table([['カード', 'TP', 'FP', 'FN', '適合率', '再現率']].concat(s.cards.per_card.map((c) => [c.block_id, c.tp, c.fp, c.fn, pc(c.precision), pc(c.recall)]))));

  L.push(`\n[不安] しきい値 ${s.concerns.threshold} で二値化`);
  L.push(table([['不安', 'TP', 'FP', 'FN', '適合率', '再現率']].concat(
    s.concerns.per_concern.map((c) => [c.concern, c.tp, c.fp, c.fn, pc(c.precision), pc(c.recall)]),
    [['（合計）', s.concerns.tp, s.concerns.fp, s.concerns.fn, pc(s.concerns.precision), pc(s.concerns.recall)]])));

  L.push(`\n[cta_ok] しきい値 ${s.cta_ok.threshold} で二値化`);
  L.push(table([['一致率', '適合率', '再現率'], [pc(s.cta_ok.accuracy), pc(s.cta_ok.precision), pc(s.cta_ok.recall)]]));

  L.push('\n[ルール適用後] 正解のタイプ別に、表示が変わった件数と入ったブロック');
  L.push(table([['正解のタイプ', '件数', '個別化', 'ブロック']].concat(Object.keys(s.rules.by_expected_type).map((t) => {
    const b = s.rules.by_expected_type[t];
    return [t, b.n, b.personalized, Object.keys(b.blocks).map((id) => `${id}×${b.blocks[id]}`).join(' ') || '-'];
  }))));
  L.push('  当たった行: ' + Object.keys(s.rules.matched_rows).sort().map((k) => `行${k}×${s.rules.matched_rows[k]}`).join(' ') + ` ／ 個別化率 ${pc(s.rules.personalized)}`);

  L.push('\n[レイテンシ] decide() の経過時間。1件目は新規接続を含む');
  L.push(table([['', 'n', 'p50', 'p90', '最大', '1.2秒以内', '0.9秒以内'],
    ['全件', s.latency.all.n, ms(s.latency.all.p50), ms(s.latency.all.p90), ms(s.latency.all.max), pc(s.latency.all.within_1200), pc(s.latency.all.within_900)],
    ['2件目以降', s.latency.warm.n, ms(s.latency.warm.p50), ms(s.latency.warm.p90), ms(s.latency.warm.max), pc(s.latency.warm.within_1200), pc(s.latency.warm.within_900)]]));

  L.push(`\n[原価] 入力 $${s.cost.usd_per_mtok}/100万トークン（出力は無料）。usage 実測 ${s.cost.measured} 件・文字数からの概算 ${s.cost.estimated} 件`);
  L.push(table([['入力トークン合計', '1回あたり', 'この実行の原価', '1,000回あたり'],
    [s.cost.input_tokens_total, s.cost.input_tokens_avg == null ? '-' : Math.round(s.cost.input_tokens_avg), '$' + s.cost.usd_total.toFixed(5), s.cost.usd_per_1000_calls == null ? '-' : '$' + s.cost.usd_per_1000_calls.toFixed(4)]]));

  // 設計書13章の完了条件。許容ラベルを含めない「完全一致」で見る（甘い方で通さない）。
  const vt = s.axes.visitor_type.strict;
  L.push(`\n[フェーズ0 検証の完了条件] 訪問者タイプの一致 8 割以上: ${vt == null ? '判定不能' : vt >= 0.8 ? '達成' : '未達'}（${pc(vt)}）`);
  if (meta.provider === 'stub') L.push('  ※ stub は常に「判断できない」と答える配線確認用。一致率に意味は無い。');
  console.log(L.join('\n'));
}

// ---- 入口 ----

const USAGE = `使い方:
  node eval/run.js --provider jev|stub [--limit N] [--ids s01,s02] [--out eval/results/<name>.json]
                   [--sessions eval/sessions.json] [--timeout-ms ${DEFAULT_TIMEOUT_MS}] [--verbose]
  node eval/run.js --check     評価セットの形だけ確かめる（モデルは呼ばない）`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.check && !['jev', 'stub'].includes(args.provider))) { console.log(USAGE); process.exit(args.help ? 0 : 1); }

  const loaded = loadEnvLocal(path.join(ROOT, '.env.local'));
  if (loaded.length) console.log('.env.local から読んだキー: ' + loaded.join(', ') + '（値は表示しない）');

  const cat = buildEvalCatalog();
  data.__setForTest({ includeUnapproved: true, catalog: { pages: cat.pages } });
  console.log(`catalog: ${Object.keys(cat.pages).length} ページ（記事 ${cat.articles}・build 生成物から ${cat.fromBuild}）／ 未承認のブロックも候補に入れる`);

  let file;
  try { file = JSON.parse(fs.readFileSync(args.sessions, 'utf8')); } catch (e) { console.error('評価セットを読めない: ' + args.sessions); process.exit(1); }
  let sessions = arr(file.sessions);
  if (args.ids) sessions = sessions.filter((s) => args.ids.includes(s.id));
  if (args.limit) sessions = sessions.slice(0, args.limit);

  const runnable = [];
  let nErr = 0; let nWarn = 0;
  const ids = new Set();
  for (const s of sessions) {
    const { errors, warnings } = checkSession(s);
    if (s && ids.has(s.id)) errors.push('id が重複');
    if (s) ids.add(s.id);
    for (const e of errors) console.error(`  ! ${s && s.id}: ${e}`);
    for (const w of warnings) console.warn(`  ? ${s && s.id}: ${w}`);
    nErr += errors.length; nWarn += warnings.length;
    if (!errors.length) runnable.push(s);
  }
  console.log(`評価セット: ${sessions.length} 件（実行できる ${runnable.length}・誤り ${nErr}・注意 ${nWarn}）`);
  if (args.check) {
    const count = (f) => { const m = {}; for (const s of runnable) { const k = f(s); m[k] = (m[k] || 0) + 1; } return Object.keys(m).map((k) => `${k}×${m[k]}`).join(' '); };
    console.log('  タイプ: ' + count((s) => s.expected.visitor_type));
    console.log('  業種: ' + count((s) => s.expected.industry));
    console.log('  ニーズ: ' + count((s) => s.expected.need));
    console.log('  検討度: ' + count((s) => String(s.expected.stage)) + ' ／ トリガー: ' + count((s) => s.request.trigger));
    console.log('  1位のカード: ' + count((s) => s.expected.best_card));
    process.exit(nErr ? 1 : 0);
  }
  if (!runnable.length) process.exit(1);
  if (args.provider === 'jev' && !process.env.JEV_API_KEY) {
    console.error('JEV_API_KEY が無い。リポジトリ直下の .env.local に置く（コミットしない）。');
    process.exit(1);
  }

  const started = new Date();
  const records = [];
  for (let i = 0; i < runnable.length; i++) {
    const r = await runOne(runnable[i], i, args);
    records.push(r);
    if (args.verbose || !r.ok) {
      const a = r.answers || {};
      console.log(r.ok
        ? `  ${r.id} ${ms(r.latency_ms)} type=${a.visitor_type.choice}(${a.visitor_type.confidence}) stage=${a.stage.score} slots=${JSON.stringify(r.slots)}`
        : `  ${r.id} 失敗: ${r.error} ${ms(r.latency_ms)}`);
    } else if ((i + 1) % 10 === 0) console.log(`  ${i + 1} / ${runnable.length}`);
  }

  const t = (data.rules && data.rules.thresholds) || {};
  const th = { visitor_type: fin(t.visitor_type) ?? 0.6, industry_switch: fin(t.industry_switch) ?? 0.6, concern: fin(t.concern) ?? 0.6,
    cta_ok: fin(t.cta_ok) ?? 0.7, rel_gate: fin(t.rel_gate) ?? 0.55, rel_floor: fin(t.rel_floor) ?? 0.35 };
  const summary = summarize(records, th);
  const firstOk = records.find((r) => r.ok);
  const meta = { provider: args.provider, model: firstOk ? firstOk.model : null, started_at: started.toISOString(),
    finished_at: new Date().toISOString(), sessions_file: path.relative(ROOT, args.sessions).replace(/\\/g, '/'),
    timeout_ms: args.timeoutMs, include_unapproved: true, policy: 'prior', thresholds: th };
  printSummary(meta, summary);

  // jev の実行は原価がかかるので、--out が無くても結果を残す。stub は指定されたときだけ。
  let outFile = args.out ? path.resolve(args.out) : null;
  if (!outFile && args.provider !== 'stub') {
    const stamp = started.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
    outFile = path.join(__dirname, 'results', `${args.provider}-${stamp}.json`);
  }
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify({ meta, summary, records }, null, 2) + '\n');
    console.log('\n結果: ' + path.relative(ROOT, outFile).replace(/\\/g, '/'));
  }
  if (!summary.answered) process.exit(1);
}

if (require.main === module) {
  main().catch((e) => { console.error('eval failed: ' + String((e && e.message) || e)); process.exit(1); });
}

module.exports = { parseArgs, loadEnvLocal, buildEvalCatalog, checkSession, summarize, percentile };
