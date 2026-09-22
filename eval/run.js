#!/usr/bin/env node
// 次ページ提案（nq）— 評価ランナー（設計書13章「0. 検証」「記事が増えても回る設計」、docs/nq/decisions-2026-09-21.md 1章）。
//
//   node eval/run.js --provider jev|stub [--limit N] [--ids s01,s02] [--out eval/results/<name>.json]
//                    [--sessions eval/sessions.json] [--timeout-ms 8000] [--verbose]
//                    [--baseline eval/baseline.json] [--save-baseline]
//   node eval/run.js --check        評価セットの形と網羅を確かめる（モデルは呼ばない）
//
// eval/sessions.json の各セッションを、本番（api/suggest.js）と同じ部品に同じ順で通す:
//   buildState → buildQuestions → decide → recommend → applyRules
// そのうえで、人が付けた正解（expected）とモデルの回答を突き合わせる。主指標は2つ（decisions 1章）。
//   1. 決定一致率: 人のラベル（確信度 1.0）と Jev の回答（実際の確信度。visitor_type は 0.6 のゲート）を、
//      それぞれ同じ applyRules に通し、行2（営業→何も変えない）／行3（求職者→sg-recruit）／行4（同業者→関連記事）／
//      行5以降 の4分類が同じなら一致。人のラベルが許容集合なら、集合から作れる分類のどれかに入れば一致。
//   2. 事業者への誤り件数: 人が 事業者 と付けたのに、Jev の決定が行3か行4になった件数。
// 補助として、従来の軸別の一致率・カードの適合率・不安・cta_ok・レイテンシ・原価も出す。
// stage は、人が 2 以上と付けたセッションと 2 未満で Jev の score の分布を比べ、最もよく分ける値を出す（decisions 2章）。
// --baseline で前回の要約（eval/baseline.json）と比べ、決定一致率が 5 ポイント以上下がるか誤りが増えたら exit 1（設計書13章の回帰テスト）。
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
// 結果ファイル（--out。既定は eval/results/<YYYYMMDD-HHMM>.json）に入るのは、状態・質問への回答・選ばれたブロック・
// レイテンシ・トークン数・そのとき使った data/*.json の sha256 だけ。どれもカタログ由来の語と数値で、個人の情報もキーも含まない。

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
// 1回の質問数の上限（設計書13章。訪問者タイプ・業種・need・stage・intent×2・不安×5・cta_ok・カード≤13・関連記事≤12 = 最大37）。
const MAX_QUESTIONS = 40;
// 「いま出せない」という理由で推薦から外れた候補。関連度が高くても配信されないので、
// 1位のカードと適合率・再現率の計算からも外す（rel_floor で落ちたものは「低い」と答えただけなので残す）。
// visitor_type は、訪問者タイプで対象外にしたカード（blocks.json の only_visitor_types。sg-recruit は求職者だけ）。
const UNDELIVERABLE = ['not_selectable', 'no_industry', 'unapproved', 'same_page', 'viewed', 'visitor_type'];

// 完了条件（decisions 1章）: 決定一致 90% 以上、かつ 事業者への誤り 2 件以下。
const PASS_AGREEMENT = 0.9;
const PASS_BUSINESS_ERRORS = 2;
// 回帰テスト（設計書13章）: 基準値から決定一致率が 5 ポイント以上下がる、または誤りが増えたら止める。
const REGRESSION_DROP = 0.05;

// 5ラベル化（decisions 1章）。旧ラベル（v1 の評価セット）は、nq-labels.json から消えていれば「事業者」に読み替える。
const BUSINESS_TYPE = '事業者';
const LEGACY_VISITOR_TYPES = { '発注検討中の事業者': BUSINESS_TYPE, '情報収集中の事業者': BUSINESS_TYPE };
const isBusiness = (label) => label === BUSINESS_TYPE || Object.prototype.hasOwnProperty.call(LEGACY_VISITOR_TYPES, label);

// 決定の4分類（decisions 1章）。行2〜4はルール表の行番号、proceed は行5以降に進んだもの。
const DECISION_LABELS = { row2: '行2 営業', row3: '行3 求職者', row4: '行4 同業者', proceed: '行5以降' };

// 人のラベルから組む関連度。best のカードは rel_gate 超（1位になり表示される側）、relevant のカードは
// rel_floor 以上 rel_gate 未満（候補には残るが1位にはならない側）。値そのものに意味は無く、しきい値との位置関係だけを写す。
const HUMAN_REL_BEST = 0.9;

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const fin = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const arr = (v) => (Array.isArray(v) ? v : []);
const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);

// ---- 引数と .env.local ----

function parseArgs(argv) {
  const out = { provider: null, limit: 0, ids: null, out: null, sessions: path.join(__dirname, 'sessions.json'),
    timeoutMs: DEFAULT_TIMEOUT_MS, verbose: false, check: false, help: false, baseline: null, saveBaseline: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--provider') out.provider = String(next() || '').toLowerCase();
    else if (a === '--limit') out.limit = Math.max(0, parseInt(next(), 10) || 0);
    else if (a === '--ids') out.ids = String(next() || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--out') out.out = next();
    else if (a === '--sessions') out.sessions = path.resolve(next());
    else if (a === '--timeout-ms') out.timeoutMs = Math.max(100, parseInt(next(), 10) || DEFAULT_TIMEOUT_MS);
    else if (a === '--baseline') out.baseline = path.resolve(next());
    else if (a === '--save-baseline') out.saveBaseline = true;
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
// ここで同じ規則（コントラクト 3.3、decisions 3章・5章）で組み立てる。BLOG は読むだけ（build-prerender.js と同じ正規表現）。
// 生成物が在れば、そちらを上に重ねる（本番が実際に読むものを優先する）。
//  - audience: overrides → category_defaults[category] → "*" の順。列挙にある値だけ採り、無ければ build.js と同じく「発注側向け」で仮置き。
//  - related: build.js の nqRelatedSlugs と同じ並び（同カテゴリ → 同 need → 同業種 → 残り。各段は新着順、自分と noindex を除く、最大 12）。
//    CI（ビルド無し）でも本番と同じ関連記事の質問が組めるように、ここでも計算する。build.js の規則を変えたらここも合わせる。
const ARTICLE_AUDIENCE_DEFAULT = '発注側向け';
const RELATED_MAX = 12;
function buildEvalCatalog() {
  const readJson = (rel) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return null; } };
  const pages = data.pagesToMap(readJson('data/catalog-pages.json'));

  const meta = readJson('data/catalog-articles.json') || {};
  const defaults = meta.category_defaults || {};
  const overrides = meta.overrides || {};
  const audiences = data.articleAudienceLabels ? data.articleAudienceLabels() : labelKeys('article_audience');
  const audienceOf = (o) => (o && typeof o.audience === 'string' && audiences.includes(o.audience) ? o.audience : null);
  let src = '';
  try { src = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8'); } catch { /* 記事なしで続ける */ }
  const m = src.match(/const BLOG = \[([\s\S]*?)\n\];/);
  const items = [];
  for (const line of (m ? m[1] : '').split('\n')) {
    const slug = line.match(/slug: '([^']+)'/);
    if (!slug) continue;
    const category = line.match(/category: '([^']+)'/);
    const title = line.match(/title: '((?:[^'\\]|\\.)*)'/);
    const date = line.match(/date: '([^']*)'/);
    const topic = category ? category[1] : '';
    const ov = isObj(overrides[slug[1]]) ? overrides[slug[1]] : {};
    const base = defaults[topic] || defaults['*'] || {};
    // build.js の nqArticleMeta と同じく項目ごとに補う。overrides に audience だけ在る記事で need / industry が空にならないように。
    const d = { industry: has(ov, 'industry') ? ov.industry : base.industry, need: has(ov, 'need') ? ov.need : base.need };
    const page = {
      title: title ? title[1].replace(/\\(.)/g, '$1') : '',
      type: 'article',
      topic,
      industry: arr(d.industry),
      need: arr(d.need),
      audience: audienceOf(ov) || audienceOf(base) || ARTICLE_AUDIENCE_DEFAULT,
    };
    pages['/article-' + slug[1]] = page;
    items.push({ slug: slug[1], page, category: topic, date: date ? date[1] : '', noindex: /noindex: true/.test(line) });
  }
  // related（build.js の nqRelatedSlugs と同じ）。
  const pool = items.map((a, i) => ({ a, i })).filter((x) => !x.a.noindex)
    .sort((x, y) => String(y.a.date).localeCompare(String(x.a.date)) || x.i - y.i).map((x) => x.a);
  const shares = (xs, ys) => xs.some((w) => ys.includes(w));
  for (const cur of items) {
    const picked = [];
    const tiers = [(a) => a.category === cur.category, (a) => shares(a.page.need, cur.page.need), (a) => shares(a.page.industry, cur.page.industry), () => true];
    for (const ok of tiers) {
      for (const a of pool) {
        if (picked.length >= RELATED_MAX) break;
        if (a.slug !== cur.slug && !picked.includes(a.slug) && ok(a)) picked.push(a.slug);
      }
    }
    cur.page.related = picked;
  }

  const built = readJson('api/_data/catalog.json');
  const fromBuild = built && isObj(built.pages) ? Object.keys(built.pages).length : 0;
  if (fromBuild) Object.assign(pages, built.pages);
  return { pages, articles: items.length, fromBuild };
}

// そのとき使った data/*.json の sha256（結果と基準値に記録する。指示文・しきい値・文言のどれで結果が変わったかを追えるように）。
function sha256File(abs) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex'); } catch { return null; }
}

function dataHashes() {
  const files = ['data/nq-labels.json', 'data/nq-rules.json', 'data/blocks.json'];
  let names = [];
  try { names = fs.readdirSync(path.join(ROOT, 'data')).filter((f) => /^catalog-.*\.json$/.test(f)).sort(); } catch { /* data/ が無ければ空 */ }
  for (const f of names) files.push('data/' + f);
  const out = {};
  for (const rel of files) out[rel] = sha256File(path.join(ROOT, rel));
  return out;
}

// ---- 正解（expected）の読み方 ----

function labelKeys(axis) {
  const L = data.labels || {};
  return Object.keys((L[axis] && L[axis].criteria) || {});
}

// v1（relevant_cards / best_card / alt）と v2（cards・許容集合。decisions 1章）の両方を同じ内部形に直す。
//   { format, visitor_type: [..], industry: [..], need: [..], stage, best: [..], relevant: [..], concerns: [..], cta_ok, note, label_note }
// 3軸と best の配列は「許容集合」。文字列だった軸は要素1つの配列になる。集合の先頭は、従来の「完全一致」で比べる第1ラベル
// （v2 では集合の順番に意味が無いので、完全一致は参考値）。
function normalizeExpected(exp) {
  const e = isObj(exp) ? exp : {};
  const format = isObj(e.cards) ? 'v2' : 'v1';
  const set = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : typeof v === 'string' ? [v] : []);
  const alt = isObj(e.alt) ? e.alt : {};
  let legacy = 0;
  const axis = (k) => {
    const raw = format === 'v2' ? set(e[k]) : set(e[k]).concat(set(alt[k]));
    const keys = labelKeys(k);
    return uniq(raw.map((v) => {
      if (k === 'visitor_type' && !keys.includes(v) && has(LEGACY_VISITOR_TYPES, v) && keys.includes(LEGACY_VISITOR_TYPES[v])) { legacy += 1; return LEGACY_VISITOR_TYPES[v]; }
      return v;
    }));
  };
  const out = { format, visitor_type: axis('visitor_type'), industry: axis('industry'), need: axis('need'), stage: e.stage };
  if (format === 'v2') { out.best = uniq(set(e.cards.best)); out.relevant = uniq(set(e.cards.relevant)); }
  else { out.best = uniq(set(e.best_card).concat(set(alt.best_card))); out.relevant = uniq(set(e.relevant_cards)); }
  out.concerns = uniq(set(e.concerns));
  out.cta_ok = e.cta_ok;
  if (typeof e.note === 'string') out.note = e.note;
  if (typeof e.label_note === 'string') out.label_note = e.label_note;
  out.legacy_labels = legacy;
  return out;
}

// ---- 評価セットの検査 ----

// 形の誤り（errors）があるセッションは実行しない。warnings は実行するが、正解の付け方を見直す合図
// （docs/nq/labeling-guide.md の約束事から外れているもの）。
function checkSession(s) {
  const errors = [];
  const warnings = [];
  const req = s && s.request;
  const raw = s && s.expected;
  if (!s || typeof s.id !== 'string' || !s.id) { errors.push('id が無い'); return { errors, warnings }; }
  if (!isObj(req)) errors.push('request が無い');
  if (!isObj(raw)) errors.push('expected が無い');
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

  // 正解ラベル。v2 は文字列＝確定・配列＝許容集合（labeling-guide.md 4章: 集合は最大3つ）。
  const exp = normalizeExpected(raw);
  const v2 = exp.format === 'v2';
  for (const axis of ['visitor_type', 'industry', 'need']) {
    const keys = labelKeys(axis);
    if (!exp[axis].length) errors.push(axis + ' が無い');
    for (const v of exp[axis]) if (!keys.includes(v)) errors.push(axis + ' のラベルが nq-labels.json に無い: ' + v);
    if (exp[axis].length > 3) warnings.push(axis + ' の許容集合が 4 つ以上（集合は最小に）');
  }
  if (![0, 1, 2, 3].includes(exp.stage)) errors.push('stage は 0〜3 の整数: ' + exp.stage);
  if (typeof exp.cta_ok !== 'boolean') errors.push('cta_ok は true / false');
  for (const c of exp.concerns) if (!CONCERNS.includes(c)) errors.push('不安の ID が不正: ' + c);
  if (v2) {
    if (!Array.isArray(raw.cards.relevant)) errors.push('cards.relevant は配列');
    if (!exp.best.length) errors.push('cards.best が無い（ID か "none"、または ID の集合）');
    if (has(raw, 'relevant_cards') || has(raw, 'best_card') || has(raw, 'alt')) warnings.push('v2 に旧フィールド（relevant_cards / best_card / alt）が残っている。run.js は cards だけを読む');
  } else {
    if (!Array.isArray(raw.relevant_cards)) errors.push('relevant_cards は配列');
    if (!exp.best.length) errors.push('best_card が無い');
  }
  const bestIds = exp.best.filter((c) => c !== 'none');
  const onlyNone = exp.best.length === 1 && exp.best[0] === 'none';

  // カードの正解は「そのとき聞かれる候補」の中に在ること。すでに読んだページや現在のページを指す
  // カードは候補から外れるので（設計書7章「1. 候補を絞る」）、正解にしても当たりようがない。
  if (built.ok) {
    const { candidates } = buildQuestions({ passed: built.passed, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls });
    for (const id of uniq(exp.relevant.concat(bestIds))) {
      if (!data.getBlock(id)) errors.push('blocks.json に無いカード: ' + id);
      else if (!candidates.includes(id)) errors.push('候補に入らないカードが正解になっている: ' + id);
    }
    // best は relevant の中から選ぶ。v2 ではこれが形の誤り（labeling-guide.md 3.5）。v1 は従来どおり注意にとどめる。
    const push = v2 ? errors : warnings;
    for (const id of bestIds) if (!exp.relevant.includes(id)) push.push((v2 ? 'cards.best' : 'best_card') + ' が relevant に入っていない: ' + id);
    if (onlyNone && exp.relevant.length) push.push('relevant が在るのに best が none');
    // best にカードと "none" を並べる形（["sg-web","none"]）は、visitor_type が 事業者 と 同業者・学習者／求職者・学生 の集合の
    // ときだけ（labeling-guide.md 3.5 の例外）。それ以外で使っていたら、集合の理由を見直す合図。
    if (v2 && bestIds.length && exp.best.includes('none')) {
      const vt = exp.visitor_type;
      const allowed = vt.some(isBusiness) && (vt.includes('同業者・学習者') || vt.includes('求職者・学生'));
      if (!allowed) warnings.push('cards.best にカードと none が並んでいるが、visitor_type が 事業者 と 同業者・学習者／求職者・学生 の集合ではない');
    }
  }

  // 約束事（labeling-guide.md 3.4・3.7）。違反ではなく、付け方を見直す合図。
  const business = exp.visitor_type.some(isBusiness);
  if (!business && exp.stage > 0) warnings.push('事業者を含まないラベルなのに stage が ' + exp.stage + '（約束事では 0）');
  if (!business && (exp.relevant.length || bestIds.length)) warnings.push('事業者を含まないラベルなのにカードの正解がある');
  if (exp.cta_ok === true) {
    if (!(exp.visitor_type.length === 1 && isBusiness(exp.visitor_type[0]))) warnings.push('cta_ok が true だが visitor_type が 事業者 の確定ではない');
    if (exp.stage < 2) warnings.push('cta_ok が true だが stage が 2 未満');
    if (req.trigger === 'T1') warnings.push('cta_ok が true だが trigger が T1');
  }
  return { errors, warnings };
}

// ---- 人のラベルをルール表に通す ----

// 人のラベルを、モデルの回答と同じ正規化形（decide.js）に組む。確信度は 1.0（decisions 1章）。
//  - 3軸の choice は渡されたラベル。visitor_type は許容集合の要素ごとに呼び出し側が回す（分類が変わりうるのはこの軸だけ）。
//  - stage は人の整数。Noul 2問（intent_compare / intent_contact。decisions 2章の mode=noul）は段階から写す:
//    2 以上＝依頼先の候補を探している、3＝すぐに相談や見積もりを依頼したい。
//  - 不安と cta_ok は 1 / 0。
//  - 関連度は best を rel_gate 超、relevant を rel_floor 以上 rel_gate 未満、それ以外を 0 に置く。
function humanAnswers(exp, vtChoice, candidates, th) {
  const stage = fin(exp.stage) != null ? exp.stage : 0;
  const choice = (label) => ({ choice: label, confidence: 1, probabilities: { [label]: 1 } });
  const a = {
    visitor_type: choice(vtChoice),
    industry: choice(exp.industry[0] || UNKNOWN_LABEL.industry),
    need: choice(exp.need[0] || UNKNOWN_LABEL.need),
    stage: { score: stage, confidence: 1, probabilities: { [String(stage)]: 1 } },
    intent_compare: { noul: stage >= 2 ? 1 : 0 },
    intent_contact: { noul: stage >= 3 ? 1 : 0 },
    cta_ok: { noul: exp.cta_ok === true ? 1 : 0 },
  };
  for (const c of CONCERNS) a['concern_' + c] = { noul: exp.concerns.includes(c) ? 1 : 0 };
  const relRel = Math.min(th.rel_floor + (th.rel_gate - th.rel_floor) / 2, HUMAN_REL_BEST);
  for (const id of candidates) {
    a['rel_' + id] = { noul: exp.best.includes(id) ? HUMAN_REL_BEST : exp.relevant.includes(id) ? relRel : 0 };
  }
  return a;
}

// applyRules の結果を4分類に落とす。行2〜4は互いに排他（当たったら他の行を評価しない）。
function classify(ruled) {
  const m = arr(ruled && ruled.matched);
  if (m.includes(2)) return 'row2';
  if (m.includes(3)) return 'row3';
  if (m.includes(4)) return 'row4';
  return 'proceed';
}

// 人のラベルで recommend → applyRules を通す（Jev の回答と同じ関数・同じ引数・同じ乱数の種）。
// visitor_type の許容集合の要素ごとに1回ずつ通し、作れる分類の集合を返す。
// relatedCandidates は buildQuestions が質問した関連記事の候補（slug）。applyRules は省略しても同じ関数で組み直すが、
// 本番（api/suggest.js）と同じく質問した候補をそのまま渡す（人の側と Jev の側で引数をそろえる）。
function humanDecision({ exp, session, built, candidates, relatedCandidates, th, index }) {
  const req = session.request;
  const runs = [];
  for (const vt of exp.visitor_type) {
    const answers = humanAnswers(exp, vt, candidates, th);
    const rec = recommend({
      answers, candidates, slots: cardSlots(req.trigger), currentUrl: built.currentUrl,
      viewedUrls: built.viewedUrls, revisit: built.revisit, model: null, policy: 'prior', rng: seededRng(index + 1),
    });
    const ruled = applyRules({ answers, trigger: req.trigger, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls, picks: rec.picks, relatedCandidates });
    runs.push({ visitor_type: vt, class: classify(ruled), matched: ruled.matched, slots: ruled.slots });
  }
  return { runs, classes: uniq(runs.map((r) => r.class)) };
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
  const exp = normalizeExpected(session.expected);
  delete exp.legacy_labels; // --check 用の数。結果ファイルには要らない
  const built = buildState(req.state);
  const { questions, candidates, related_candidates } = buildQuestions({ passed: built.passed, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls });
  const relatedCandidates = arr(related_candidates);
  const chars = JSON.stringify({ state: built.state, questions }).length;
  // 人のラベルの決定は、モデルを呼ぶ前に決まる（失敗した件でも記録に残す）。
  const human = humanDecision({ exp, session, built, candidates, relatedCandidates, th: opts.th, index });
  const rec0 = { id: session.id, trigger: req.trigger, n_questions: Object.keys(questions).length, candidates_asked: candidates,
    related_asked: relatedCandidates, request_chars: chars, expected: exp, state: built.state,
    decision: { human: human.runs, human_classes: human.classes, jev: null, match: null, business_error: null } };

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
  const ruled = applyRules({ answers: decided.answers, trigger: req.trigger, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls, picks: rec.picks, relatedCandidates });

  // 決定一致（decisions 1章）。事業者への誤りは「人が 事業者 を含むのに Jev が行3か行4に落とし、それが人の集合からは作れない」件。
  // 人の集合が ["事業者","求職者・学生"] で Jev が行3なら、集合の中なので一致であり誤りにも数えない。
  const jevClass = classify(ruled);
  const match = human.classes.includes(jevClass);
  const businessError = !match && exp.visitor_type.some(isBusiness) && (jevClass === 'row3' || jevClass === 'row4');
  Object.assign(rec0.decision, { jev: jevClass, match, business_error: businessError });

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

// しきい値。cta は decisions 2章で thresholds から cta に移った（後方互換で thresholds にあればそれを使う。rules.js と同じ向き）。
function readThresholds() {
  const t = (data.rules && data.rules.thresholds) || {};
  const c = (data.rules && data.rules.cta) || {};
  const pick = (o, k, d) => (fin(o[k]) != null ? o[k] : d);
  return {
    visitor_type: pick(t, 'visitor_type', 0.6), industry_switch: pick(t, 'industry_switch', 0.6), concern: pick(t, 'concern', 0.6),
    rel_gate: pick(t, 'rel_gate', 0.55), rel_floor: pick(t, 'rel_floor', 0.35),
    cta_mode: c.mode === 'noul' ? 'noul' : 'score',
    stage_cta: pick(c, 'stage_cta', pick(t, 'stage_cta', 2.0)), stage_contact: pick(c, 'stage_contact', pick(t, 'stage_contact', 2.5)),
    cta_ok: pick(c, 'cta_ok', pick(t, 'cta_ok', 0.7)), compare: pick(c, 'compare', 0.6), contact: pick(c, 'contact', 0.6),
    gate_visitor_types: arr(c.gate_visitor_types).filter((v) => typeof v === 'string'),
  };
}

// stage の分布（decisions 2章）。人が 2 以上と付けたセッションと 2 未満で Jev の score を比べ、
// 現在のしきい値の当たり具合と、最もよく分ける値（正解率が最大。同点なら現在の値に近いほう）を出す。
// 「分離できる」の目安は、最良の値で 2 以上の 75% 以上を拾い、2 未満の 90% 以上を除けること。決めるのは人。
const STAGE_BINS = [[0, 0.5], [0.5, 1], [1, 1.5], [1.5, 2], [2, 2.5], [2.5, 3]];
function stageSplit(rows, th) {
  const pts = [];
  for (const r of rows) {
    const score = fin(r.answers && r.answers.stage && r.answers.stage.score);
    if (score == null) continue;
    pts.push({ id: r.id, human: r.expected.stage, score });
  }
  const ge2 = pts.filter((p) => p.human >= 2);
  const lt2 = pts.filter((p) => p.human < 2);
  const hist = (list) => STAGE_BINS.map(([lo, hi], i) => list.filter((p) => p.score >= lo && (i === STAGE_BINS.length - 1 ? p.score <= hi : p.score < hi)).length);
  const at = (t) => {
    const hit = ge2.filter((p) => p.score >= t).length;
    const reject = lt2.filter((p) => p.score < t).length;
    return { threshold: t, accuracy: ratio(hit + reject, pts.length), sensitivity: ratio(hit, ge2.length), specificity: ratio(reject, lt2.length), ge2_over: hit, lt2_over: lt2.length - reject };
  };
  const scores = uniq(pts.map((p) => p.score)).sort((a, b) => a - b);
  const cands = [th.stage_cta];
  for (let i = 0; i + 1 < scores.length; i++) cands.push(Math.round(((scores[i] + scores[i + 1]) / 2) * 1000) / 1000);
  let best = null;
  for (const t of uniq(cands)) {
    const c = at(t);
    if (!best || c.accuracy > best.accuracy || (c.accuracy === best.accuracy && Math.abs(t - th.stage_cta) < Math.abs(best.threshold - th.stage_cta))) best = c;
  }
  const separable = !!best && ge2.length >= 5 && best.sensitivity >= 0.75 && best.specificity >= 0.9;
  return {
    n: pts.length, n_ge2: ge2.length, n_lt2: lt2.length, bins: STAGE_BINS.map(([lo, hi]) => `${lo}-${hi}`),
    hist_ge2: hist(ge2), hist_lt2: hist(lt2),
    scores_ge2: ge2.map((p) => ({ id: p.id, human: p.human, score: p.score })).sort((a, b) => a.score - b.score),
    current: pts.length ? at(th.stage_cta) : null, best: pts.length ? best : null, separable,
  };
}

// Noul 2問（mode=noul の材料）。人の段階と Jev の noul を、しきい値で二値化して比べる。質問が無ければ null。
function intentSplit(rows, th) {
  const pick = (key, cut, floorStage) => {
    let n = 0; let posN = 0; let posHit = 0; let negN = 0; let negHit = 0;
    for (const r of rows) {
      const v = fin(r.answers && r.answers[key] && r.answers[key].noul);
      if (v == null) continue;
      n += 1;
      const yes = v >= cut;
      if (r.expected.stage >= floorStage) { posN += 1; if (yes) posHit += 1; } else { negN += 1; if (yes) negHit += 1; }
    }
    if (!n) return null;
    return { n, threshold: cut, stage_from: floorStage, over_share_when_human_ge: ratio(posHit, posN), over_share_when_human_lt: ratio(negHit, negN), n_ge: posN, n_lt: negN };
  };
  const compare = pick('intent_compare', th.compare, 2);
  const contact = pick('intent_contact', th.contact, 3);
  return compare || contact ? { compare, contact } : null;
}

function summarize(records, th) {
  const ok = records.filter((r) => r.ok);
  const out = { n: records.length, answered: ok.length, failed: records.length - ok.length, errors: {} };
  for (const r of records) if (!r.ok) out.errors[r.error] = (out.errors[r.error] || 0) + 1;

  // 主指標（decisions 1章）: 決定一致率と事業者への誤り件数。
  let agree = 0; let businessN = 0; let businessErrors = 0;
  const mismatches = []; const businessErrorIds = []; const pairs = {};
  for (const r of ok) {
    const d = r.decision;
    if (d.match) agree += 1; else mismatches.push({ id: r.id, human: d.human_classes, jev: d.jev });
    if (r.expected.visitor_type.some(isBusiness)) businessN += 1;
    if (d.business_error) { businessErrors += 1; businessErrorIds.push(r.id); }
    const k = d.human_classes.join('|') + ' → ' + d.jev;
    pairs[k] = (pairs[k] || 0) + 1;
  }
  const agreement = ratio(agree, ok.length);
  out.decision = {
    n: ok.length, agree, agreement, business_n: businessN, business_errors: businessErrors, business_error_ids: businessErrorIds,
    pass: agreement != null && agreement >= PASS_AGREEMENT && businessErrors <= PASS_BUSINESS_ERRORS,
    criteria: { agreement: PASS_AGREEMENT, business_errors: PASS_BUSINESS_ERRORS },
    mismatches, pairs: Object.keys(pairs).map((k) => ({ pair: k, n: pairs[k] })).sort((a, b) => b.n - a.n),
  };

  // 択一の3軸。strict は第1ラベルとの完全一致、lenient は許容集合（v1 は expected.alt）も正解にしたもの、
  // effective は「確信度がしきい値未満の回答を『判断できない』に読み替えた」うえでの lenient。
  const axisTh = { visitor_type: th.visitor_type, industry: th.industry_switch, need: th.visitor_type };
  out.axes = {};
  for (const axis of ['visitor_type', 'industry', 'need']) {
    let strict = 0; let lenient = 0; let effective = 0; let unknown = 0; let sure = 0; let sureHit = 0;
    const confusion = {};
    for (const r of ok) {
      const a = r.answers[axis] || {};
      const accept = r.expected[axis];
      const exp = accept[0];
      const conf = fin(a.confidence) || 0;
      if (a.choice === exp) strict += 1;
      if (accept.includes(a.choice)) lenient += 1;
      else { const k = accept.join('|') + ' → ' + a.choice; confusion[k] = (confusion[k] || 0) + 1; }
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
  // CTA の強さを決めるのは事業者の検討度なので、事業者（を含む集合）だけの数字を別に出す。
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
  const businessRows = ok.filter((r) => r.expected.visitor_type.some(isBusiness));
  out.stage = stageOf(ok);
  out.stage_business = stageOf(businessRows);
  // しきい値を決める材料（decisions 2章）。全件と、事業者を含むセッションだけの両方。
  out.stage_split = { threshold: th.stage_cta, all: stageSplit(ok, th), business: stageSplit(businessRows, th), intents: intentSplit(ok, th) };

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
    const expBest = r.expected.best;
    const expIds = expBest.filter((c) => c !== 'none');
    // none の一致: 予測が none なら人も none を許容していること、予測がカードなら人もカードを許容していること。
    if (predicted === 'none' ? expBest.includes('none') : expIds.length > 0) noneAgree += 1;
    if (expIds.length) {
      top1N += 1;
      if (expIds.includes(predicted)) top1 += 1;
      if (expIds.concat(r.expected.relevant).includes(predicted)) top1Lenient += 1;
    }
    const relevant = r.expected.relevant;
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
      const truth = r.expected.concerns.includes(c);
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
    const t = r.expected.visitor_type.join('|');
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

// ---- 基準値（eval/baseline.json）----

// 基準値に入れるのは要約だけ（生の回答は入れない。decisions 1章）。
function baselineFrom(summary, meta) {
  const s = summary;
  const ax = (a) => ({ strict: a.strict, lenient: a.lenient, effective: a.effective });
  return {
    _comment: 'eval/run.js --save-baseline が書く基準値。--baseline で比べ、決定一致率が 5 ポイント以上下がるか事業者への誤りが増えたら exit 1（設計書13章の回帰テスト）。数字は要約だけで、生の回答は入れない。更新するのは、指示文・blocks・audience・しきい値・モデル版を変えて評価し直し、結果を受け入れると決めたとき。',
    version: 1,
    recorded_at: meta.finished_at,
    model: meta.model,
    sessions: { file: meta.sessions_file, n: s.n, answered: s.answered, sha256: meta.sessions_sha256 },
    data_sha256: meta.data_sha256,
    decision_agreement: s.decision.agreement,
    business_errors: s.decision.business_errors,
    axes: { visitor_type: ax(s.axes.visitor_type), industry: ax(s.axes.industry), need: ax(s.axes.need) },
    stage: { exact: s.stage.exact, within1: s.stage.within1, best_threshold: s.stage_split.all.best ? s.stage_split.all.best.threshold : null, n_human_ge2: s.stage_split.all.n_ge2 },
    cards: { top1: s.cards.top1, top1_in_relevant: s.cards.top1_in_relevant, precision: s.cards.relevant.precision, recall: s.cards.relevant.recall },
    concerns: { precision: s.concerns.precision, recall: s.concerns.recall },
    cta_ok: { accuracy: s.cta_ok.accuracy },
  };
}

// 基準値との比較。止める条件は決定一致率の 5 ポイント低下と誤りの増加だけ。ほかの軸は参考に差を出す。
function compareBaseline(summary, baseline, meta) {
  const lines = [];
  const b = isObj(baseline) ? baseline : {};
  if (fin(b.decision_agreement) == null) return { ok: true, unset: true, lines: ['基準値が未設定（eval/baseline.json に decision_agreement が無い）。--save-baseline で書ける。比較は行わない。'] };
  const d = summary.decision;
  const pt = (v) => (v == null ? '-' : (v * 100).toFixed(1) + '%');
  const drop = b.decision_agreement - (d.agreement == null ? 0 : d.agreement);
  const errUp = fin(b.business_errors) != null && d.business_errors > b.business_errors;
  const fail = drop >= REGRESSION_DROP || errUp;
  if (b.sessions && b.sessions.sha256 && meta.sessions_sha256 && b.sessions.sha256 !== meta.sessions_sha256) {
    lines.push('注意: 評価セットが基準値のときと違う（sha256 が不一致）。比較は参考値。');
  }
  lines.push(`決定一致率 ${pt(b.decision_agreement)} → ${pt(d.agreement)}（${drop > 0 ? '-' : '+'}${(Math.abs(drop) * 100).toFixed(1)} ポイント）${drop >= REGRESSION_DROP ? ' ← 5 ポイント以上の低下' : ''}`);
  lines.push(`事業者への誤り ${b.business_errors == null ? '-' : b.business_errors} 件 → ${d.business_errors} 件${errUp ? ' ← 増えた' : ''}`);
  const bx = isObj(b.axes) ? b.axes : {};
  for (const axis of ['visitor_type', 'industry', 'need']) {
    const prev = bx[axis] && fin(bx[axis].effective);
    if (prev != null) lines.push(`  参考 ${axis}（しきい値後） ${pt(prev)} → ${pt(summary.axes[axis].effective)}`);
  }
  if (isObj(b.cards) && fin(b.cards.top1_in_relevant) != null) lines.push(`  参考 1位が正解カードのどれか ${pt(b.cards.top1_in_relevant)} → ${pt(summary.cards.top1_in_relevant)}`);
  lines.push(fail ? '判定: 止める（基準値を下回った）' : '判定: 通る');
  return { ok: !fail, unset: false, lines };
}

// ---- 表示 ----

// 全角を 2 桁として幅をそろえる（日本語のラベルが混じる表なので）。
const width = (s) => [...String(s)].reduce((w, ch) => w + (ch.charCodeAt(0) > 0xff ? 2 : 1), 0);
const pad = (s, w) => String(s) + ' '.repeat(Math.max(0, w - width(s)));
const pc = (v) => (v == null ? '  -  ' : (v * 100).toFixed(1) + '%');
const ms = (v) => (v == null ? '-' : Math.round(v) + 'ms');
const cls = (c) => DECISION_LABELS[c] || c;

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

  const d = s.decision;
  L.push('\n[主指標] 決定一致 = 人のラベル（確信度 1.0）と Jev の回答（実際の確信度・0.6 のゲート）を同じルール表に通し、行2／行3／行4／行5以降 の分類が同じ');
  L.push(table([['決定一致率', '事業者への誤り', `完了条件（${PASS_AGREEMENT * 100}% 以上・誤り ${PASS_BUSINESS_ERRORS} 件以下）`],
    [`${pc(d.agreement)} (${d.agree}/${d.n})`, `${d.business_errors} 件 / 事業者 ${d.business_n} 件`, d.agreement == null ? '判定不能' : d.pass ? '達成' : '未達']]));
  if (d.mismatches.length) L.push('  不一致: ' + d.mismatches.map((m) => `${m.id} [${m.human.map(cls).join('｜')}] → ${cls(m.jev)}`).join(' ／ '));
  if (d.business_error_ids.length) L.push('  事業者への誤り: ' + d.business_error_ids.join(' '));
  L.push('  分類の対応（人 → Jev）: ' + d.pairs.map((p) => `${p.pair.split(' → ').map((x) => x.split('|').map(cls).join('｜')).join(' → ')} ×${p.n}`).join(' ／ '));

  L.push('\n[択一の3軸] 完全一致 = 第1ラベルと一致 ／ 許容込み = 許容集合（v1 は expected.alt）も正解 ／ しきい値後 = 確信度がしきい値未満なら「判断できない」に読み替え');
  L.push(table([['軸', '完全一致', '許容込み', 'しきい値後', '確信あり', '確信ありの正答', 'other・低確信']].concat(
    ['visitor_type', 'industry', 'need'].map((k) => { const a = s.axes[k]; return [k, pc(a.strict), pc(a.lenient), pc(a.effective), pc(a.sure_share), pc(a.sure_accuracy), pc(a.unknown_or_low)]; }))));
  for (const k of ['visitor_type', 'industry', 'need']) {
    if (s.axes[k].confusion.length) L.push(`  ${k} の取り違え（正解 → 回答）: ` + s.axes[k].confusion.slice(0, 5).map((c) => `${c.pair} ×${c.n}`).join(' ／ '));
  }

  L.push('\n[検討度 stage] 四捨五入して比較');
  const stageRow = (label, g) => [label, g.n, pc(g.exact), pc(g.within1), g.mean_abs_error == null ? '-' : g.mean_abs_error.toFixed(2)];
  L.push(table([['', 'n', '±0', '±1', '平均絶対誤差'], stageRow('全件', s.stage), stageRow('事業者を含む', s.stage_business)]));

  const sp = s.stage_split;
  L.push(`\n[検討度の分布] 人が 2 以上と付けた ${sp.all.n_ge2} 件と 2 未満の ${sp.all.n_lt2} 件で Jev の score を比べる（しきい値 ${sp.threshold} を置き換える値を決める材料）`);
  if (sp.all.n) {
    L.push(table([['Jev の score'].concat(sp.all.bins), [`人が 2 以上 (${sp.all.n_ge2})`].concat(sp.all.hist_ge2), [`人が 2 未満 (${sp.all.n_lt2})`].concat(sp.all.hist_lt2)]));
    if (sp.all.scores_ge2.length) L.push('  人が 2 以上の score: ' + sp.all.scores_ge2.map((p) => `${p.id}=${p.score}`).join(' '));
    const cur = sp.all.current;
    L.push(`  現在のしきい値 ${cur.threshold}: 2 以上のうち ${cur.threshold} 以上 ${cur.ge2_over}/${sp.all.n_ge2}、2 未満のうち ${cur.threshold} 以上 ${cur.lt2_over}/${sp.all.n_lt2}、正解率 ${pc(cur.accuracy)}`);
    const b = sp.all.best;
    L.push(`  最もよく分ける値 ${b.threshold}: 正解率 ${pc(b.accuracy)}（2 以上の検出 ${pc(b.sensitivity)}・2 未満の除外 ${pc(b.specificity)}）→ ${sp.all.separable ? '分離できる' : '分離できない'}（目安: 検出 75% 以上かつ除外 90% 以上、2 以上が 5 件以上）`);
    if (sp.all.n_ge2 < 5) L.push('  ※ 人が 2 以上と付けた件数が少ない。しきい値の前に評価セット（高検討度のセッション）を足す。');
    if (sp.business.n && sp.business.best) {
      L.push(`  事業者を含むセッションだけ (${sp.business.n}): 現在の値で正解率 ${pc(sp.business.current.accuracy)}、最もよく分ける値 ${sp.business.best.threshold}（正解率 ${pc(sp.business.best.accuracy)}・検出 ${pc(sp.business.best.sensitivity)}・除外 ${pc(sp.business.best.specificity)}）`);
    }
  }
  if (sp.intents) {
    const i = sp.intents;
    const one = (label, x) => (x ? `${label} ${x.threshold} 以上の割合 — 人が ${x.stage_from} 以上 ${pc(x.over_share_when_human_ge)} (${x.n_ge}) ／ 未満 ${pc(x.over_share_when_human_lt)} (${x.n_lt})` : null);
    L.push('  Noul 2問（mode=noul の材料）: ' + [one('「候補を探している」', i.compare), one('「すぐに依頼したい」', i.contact)].filter(Boolean).join(' ／ '));
  }

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

  L.push('\n[ルール適用後] 正解のタイプ別に、表示が変わった件数と入ったブロック（｜は許容集合）');
  L.push(table([['正解のタイプ', '件数', '個別化', 'ブロック']].concat(Object.keys(s.rules.by_expected_type).map((t) => {
    const b = s.rules.by_expected_type[t];
    return [t.replace(/\|/g, '｜'), b.n, b.personalized, Object.keys(b.blocks).map((id) => `${id}×${b.blocks[id]}`).join(' ') || '-'];
  }))));
  L.push('  当たった行: ' + Object.keys(s.rules.matched_rows).sort().map((k) => `行${k}×${s.rules.matched_rows[k]}`).join(' ') + ` ／ 個別化率 ${pc(s.rules.personalized)}`);

  L.push('\n[レイテンシ] decide() の経過時間。1件目は新規接続を含む');
  L.push(table([['', 'n', 'p50', 'p90', '最大', '1.2秒以内', '0.9秒以内'],
    ['全件', s.latency.all.n, ms(s.latency.all.p50), ms(s.latency.all.p90), ms(s.latency.all.max), pc(s.latency.all.within_1200), pc(s.latency.all.within_900)],
    ['2件目以降', s.latency.warm.n, ms(s.latency.warm.p50), ms(s.latency.warm.p90), ms(s.latency.warm.max), pc(s.latency.warm.within_1200), pc(s.latency.warm.within_900)]]));

  L.push(`\n[原価] 入力 $${s.cost.usd_per_mtok}/100万トークン（出力は無料）。usage 実測 ${s.cost.measured} 件・文字数からの概算 ${s.cost.estimated} 件`);
  L.push(table([['入力トークン合計', '1回あたり', 'この実行の原価', '1,000回あたり'],
    [s.cost.input_tokens_total, s.cost.input_tokens_avg == null ? '-' : Math.round(s.cost.input_tokens_avg), '$' + s.cost.usd_total.toFixed(5), s.cost.usd_per_1000_calls == null ? '-' : '$' + s.cost.usd_per_1000_calls.toFixed(4)]]));

  L.push(`\n[質問数] 1回あたり 最小 ${meta.questions.min} ・最大 ${meta.questions.max}（上限 ${MAX_QUESTIONS}）${meta.questions.max > MAX_QUESTIONS ? ' ← 上限を超えている' : ''}`);

  // 完了条件（decisions 1章）。決定一致率と事業者への誤り件数で見る。
  L.push(`\n[フェーズ0 検証の完了条件] 決定一致 ${PASS_AGREEMENT * 100}% 以上かつ事業者への誤り ${PASS_BUSINESS_ERRORS} 件以下: ${d.agreement == null ? '判定不能' : d.pass ? '達成' : '未達'}（${pc(d.agreement)}・${d.business_errors} 件）`);
  if (meta.provider === 'stub') L.push('  ※ stub は常に「判断できない」と答える配線確認用。一致率に意味は無い。');
  console.log(L.join('\n'));
}

// ---- --check の網羅 ----

// selectable なカードのうち best/relevant に一度も出ないカード、記事カテゴリ（topic）のうち評価セットに無いもの（decisions 1章）。
// 新しい topic・カードを足すときは評価セッションも足す（設計書13章）。
// exempt は sessions.json の coverage_exempt（{ block_id: 理由 }）。いまの catalog では構造上どのセッションでも正解になりえない
// カード（例: sg-kanri-dantai。業種が分かるページが行き先そのものしか無い）を、理由つきで警告から外す。黙って消さず、除外した旨を出す。
function coverageWarnings(runnable, pages, exempt) {
  const warnings = [];
  const ex = isObj(exempt) ? exempt : {};
  const exemptIds = Object.keys(ex).filter((k) => k !== '_comment' && typeof ex[k] === 'string');
  const used = new Set();
  const seenTopics = new Set();
  for (const s of runnable) {
    const exp = normalizeExpected(s.expected);
    for (const id of exp.relevant.concat(exp.best.filter((c) => c !== 'none'))) used.add(id);
    const st = isObj(s.request.state) ? s.request.state : {};
    for (const u of [st.landing, st.current && st.current.url].concat(arr(st.history).map((h) => h && h.url))) {
      const p = resolvePage(u);
      if (p && p.page && p.page.topic) seenTopics.add(p.page.topic);
    }
  }
  // 訪問者タイプで対象を限るカード（sg-recruit）は行3が直接置くもので、正解のカードには入らない（labeling-guide.md 3.5）ので数えない。
  const never = data.selectableCardIds().filter((id) => !used.has(id) && !arr(data.getBlock(id).only_visitor_types).length && !exemptIds.includes(id));
  if (never.length) warnings.push('best/relevant に一度も出ないカード: ' + never.join(' ') + '（そのカードが正解になるセッションを足す）');
  // 除外したカードが正解に出るようになったら、coverage_exempt から外す合図。
  const stale = exemptIds.filter((id) => used.has(id));
  if (stale.length) warnings.push('coverage_exempt に在るのに正解に出ているカード: ' + stale.join(' ') + '（sessions.json の coverage_exempt から外す）');
  const topics = uniq(Object.keys(pages).map((u) => pages[u]).filter((p) => p && p.type === 'article' && p.topic).map((p) => p.topic)).sort();
  const missing = topics.filter((t) => !seenTopics.has(t));
  if (missing.length) warnings.push('評価セットに無い記事カテゴリ（topic）: ' + missing.join(' ') + '（そのカテゴリの記事を読むセッションを足す）');
  return warnings;
}

// ---- 入口 ----

const USAGE = `使い方:
  node eval/run.js --provider jev|stub [--limit N] [--ids s01,s02] [--out eval/results/<name>.json]
                   [--sessions eval/sessions.json] [--timeout-ms ${DEFAULT_TIMEOUT_MS}] [--verbose]
                   [--baseline eval/baseline.json] [--save-baseline]
  node eval/run.js --check     評価セットの形と網羅を確かめる（モデルは呼ばない）
  --baseline       基準値と比べ、決定一致率が ${REGRESSION_DROP * 100} ポイント以上下がるか事業者への誤りが増えたら exit 1
  --save-baseline  この実行の要約を基準値（--baseline の場所。既定 eval/baseline.json）に書く。stub では書かない`;

// ローカル時刻の YYYYMMDD-HHMM（結果ファイルの既定の名前）。
function stampLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

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
  let nErr = 0; let nWarn = 0; let nLegacy = 0;
  const formats = {};
  const ids = new Set();
  for (const s of sessions) {
    const { errors, warnings } = checkSession(s);
    if (s && ids.has(s.id)) errors.push('id が重複');
    if (s) ids.add(s.id);
    for (const e of errors) console.error(`  ! ${s && s.id}: ${e}`);
    for (const w of warnings) console.warn(`  ? ${s && s.id}: ${w}`);
    nErr += errors.length; nWarn += warnings.length;
    if (!errors.length) {
      runnable.push(s);
      const exp = normalizeExpected(s.expected);
      formats[exp.format] = (formats[exp.format] || 0) + 1;
      nLegacy += exp.legacy_labels;
    }
  }
  console.log(`評価セット: ${sessions.length} 件（実行できる ${runnable.length}・誤り ${nErr}・注意 ${nWarn}）／ 形式 ${Object.keys(formats).map((k) => `${k}×${formats[k]}`).join(' ') || '-'}（file version ${file.version == null ? '-' : file.version}）`);
  if (nLegacy) console.log(`  旧ラベル（発注検討中／情報収集中の事業者）を「事業者」に読み替え: ${nLegacy} 件`);

  // 質問数（設計書13章「1回の質問数は 40 以下」）。--check でも数える。
  const qCounts = runnable.map((s) => {
    const built = buildState(s.request.state);
    return Object.keys(buildQuestions({ passed: built.passed, currentUrl: built.currentUrl, viewedUrls: built.viewedUrls }).questions).length;
  });
  const questions = { min: qCounts.length ? Math.min(...qCounts) : null, max: qCounts.length ? Math.max(...qCounts) : null,
    avg: qCounts.length ? Math.round((qCounts.reduce((a, b) => a + b, 0) / qCounts.length) * 10) / 10 : null };

  if (args.check) {
    const count = (f) => { const m = {}; for (const s of runnable) { const k = f(normalizeExpected(s.expected), s); m[k] = (m[k] || 0) + 1; } return Object.keys(m).map((k) => `${k}×${m[k]}`).join(' '); };
    console.log('  タイプ: ' + count((e) => e.visitor_type.join('｜')));
    console.log('  業種: ' + count((e) => e.industry.join('｜')));
    console.log('  ニーズ: ' + count((e) => e.need.join('｜')));
    console.log('  検討度: ' + count((e) => String(e.stage)) + ' ／ トリガー: ' + count((e, s) => s.request.trigger));
    console.log('  1位のカード: ' + count((e) => e.best.join('｜')));
    console.log(`  質問数: 最小 ${questions.min} ・最大 ${questions.max} ・平均 ${questions.avg}（上限 ${MAX_QUESTIONS}）`);
    if (questions.max > MAX_QUESTIONS) console.warn(`  ? 質問数が上限 ${MAX_QUESTIONS} を超えるセッションがある`);
    const exempt = isObj(file.coverage_exempt) ? file.coverage_exempt : {};
    const exemptIds = Object.keys(exempt).filter((k) => k !== '_comment' && typeof exempt[k] === 'string');
    const cov = coverageWarnings(runnable, cat.pages, exempt);
    for (const w of cov) console.warn('  ? 網羅: ' + w);
    if (exemptIds.length) console.log('  網羅の対象外（sessions.json の coverage_exempt。構造上正解になりえないカード）: ' + exemptIds.map((id) => `${id}（${exempt[id]}）`).join(' ／ '));
    process.exit(nErr ? 1 : 0);
  }
  if (!runnable.length) process.exit(1);
  if (args.provider === 'jev' && !process.env.JEV_API_KEY) {
    console.error('JEV_API_KEY が無い。リポジトリ直下の .env.local に置く（コミットしない）。');
    process.exit(1);
  }

  const th = readThresholds();
  const started = new Date();
  const records = [];
  for (let i = 0; i < runnable.length; i++) {
    const r = await runOne(runnable[i], i, Object.assign({ th }, args));
    records.push(r);
    if (args.verbose || !r.ok) {
      const a = r.answers || {};
      console.log(r.ok
        ? `  ${r.id} ${ms(r.latency_ms)} type=${a.visitor_type.choice}(${a.visitor_type.confidence}) stage=${a.stage.score} 決定=${cls(r.decision.jev)}${r.decision.match ? '' : ' ≠ 人[' + r.decision.human_classes.map(cls).join('｜') + ']'} slots=${JSON.stringify(r.slots)}`
        : `  ${r.id} 失敗: ${r.error} ${ms(r.latency_ms)}`);
    } else if ((i + 1) % 10 === 0) console.log(`  ${i + 1} / ${runnable.length}`);
  }

  const summary = summarize(records, th);
  const firstOk = records.find((r) => r.ok);
  const meta = { provider: args.provider, model: firstOk ? firstOk.model : null, started_at: started.toISOString(),
    finished_at: new Date().toISOString(), sessions_file: path.relative(ROOT, args.sessions).replace(/\\/g, '/'),
    sessions_sha256: sha256File(args.sessions), sessions_version: file.version == null ? null : file.version,
    timeout_ms: args.timeoutMs, include_unapproved: true, policy: 'prior', thresholds: th, data_sha256: dataHashes(), questions };
  printSummary(meta, summary);

  // jev の実行は原価がかかるので、--out が無くても結果を残す。stub は指定されたときだけ。
  let outFile = args.out ? path.resolve(args.out) : null;
  if (!outFile && args.provider !== 'stub') outFile = path.join(__dirname, 'results', `${stampLocal(started)}.json`);
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify({ meta, summary, records }, null, 2) + '\n');
    console.log('\n結果: ' + path.relative(ROOT, outFile).replace(/\\/g, '/'));
  }
  if (!summary.answered) process.exit(1);

  // 基準値。比較は --baseline、更新は --save-baseline（stub の数字は基準値にしない）。
  const baselinePath = args.baseline || path.join(__dirname, 'baseline.json');
  let exitCode = 0;
  if (args.baseline) {
    let baseline = null;
    try { baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')); } catch { console.error('基準値を読めない: ' + baselinePath); process.exit(1); }
    const cmp = compareBaseline(summary, baseline, meta);
    console.log('\n[基準値との比較] ' + path.relative(ROOT, baselinePath).replace(/\\/g, '/'));
    for (const l of cmp.lines) console.log('  ' + l);
    if (!cmp.ok) exitCode = 1;
  }
  if (args.saveBaseline) {
    if (args.provider === 'stub') console.warn('\n--save-baseline: stub の結果は基準値にしない（書かない）');
    else if (summary.failed) console.warn('\n--save-baseline: 失敗した件があるので基準値にしない（書かない）');
    else {
      fs.writeFileSync(baselinePath, JSON.stringify(baselineFrom(summary, meta), null, 2) + '\n');
      console.log('\n基準値を書いた: ' + path.relative(ROOT, baselinePath).replace(/\\/g, '/'));
    }
  }
  process.exit(exitCode);
}

if (require.main === module) {
  main().catch((e) => { console.error('eval failed: ' + String((e && e.message) || e)); process.exit(1); });
}

module.exports = { parseArgs, loadEnvLocal, buildEvalCatalog, normalizeExpected, checkSession, humanAnswers, classify, humanDecision,
  runOne, readThresholds, summarize, stageSplit, baselineFrom, compareBaseline, coverageWarnings, percentile };
