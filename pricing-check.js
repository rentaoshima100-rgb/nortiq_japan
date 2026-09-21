// pricing-check.js — 料金・期間・税の表記が NORTIQ_PRICING (content-data.jsx) と食い違っていないかを検査する。
//
//   npm run pricing:check        (= node pricing-check.js)
//   node pricing-check.js --no-warn   警告を出さず、失敗だけを表示する
//
// なぜ要るか:
//   JSX のページは NORTIQ_PRICING を参照して金額を描画するので食い違わない。しかし静的LP
//   (lp/service/*)・data/*.json・記事 (content/blog/*.md) はデータを参照できず、数字を手で写している。
//   2026-09 の料金統一の前は、この「手で写した数字」がページごとにばらばらになっていた。
//   ここでは NORTIQ_PRICING から「書いてよい金額・期間」の集合を作り、手書きの数字がその中に在るかを見る。
//
// 検査の内容 (失敗 = exit 1。警告だけなら exit 0):
//   (a) data/blocks.json・data/catalog-pages.json … リンク先ごとに、文中の金額・期間・相談時間が許可集合に在るか
//   (b) lp/service/*/index.html … JSON-LD Offer の price、meta・title の金額と期間、料金表の数字、
//       「金額と期間の組」の取り違え (30万円〜 と 4週間 を並べる等)、金額の近くの「税別」
//   (c) *.jsx … NORTIQ_PRICING のブロックの外に、金額の生リテラルが残っていないか
//   (d) content/blog/*.md … 自社語と金額が同じ行にあり、許可集合に無い金額 → 警告のみ
//       (記事は100本超あり、行をまたぐ言及や市場相場との区別を機械では決めきれないため)
//   (e) 表記の lint … 「30 万円」「万円から」「10万円台」「60〜180万円〜」「か月」ほか
//
// 依存パッケージなし。PDF は対象外 (営業資料は画像PDFで読めない。docs/pricing/open-items.md の依頼リストで管理)。
// 料金を変える手順と表記ルールは docs/pricing/README.md。

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const SHOW_WARN = !process.argv.includes('--no-warn');

// ------------------------------------------------------------
// 許可リスト: 自社の料金ではない数字 (市場相場・補助金額・他社・会社情報・記事見出し) と、未決で残している数字。
// 行番号では指定しない (編集のたびにずれるため)。file と、その行に含まれる文字列 (has) か正規表現 (re) で指定し、
// 必ず理由を書く。該当する行は (c) の生リテラル検査と (e) の lint の両方から外れる。
// 静的LPの本文の行 (b) にも使える (file は lp/service/<名前>/index.html)。
// 使われなかった項目は警告に出る (元の行が消えたら、ここからも消す)。
// ------------------------------------------------------------
const ALLOW = [
  { file: 'content-data.jsx', re: /^\s*price: "\d+〜\d+万円", weeks: "/,
    why: 'SYSTEM_TEMPLATES (業種ページの個別システムの目安)。パッケージ料金との関係が未決のため残置 (C14)' },
  { file: 'content-data.jsx', has: '通常枠上限50万円', why: '小規模事業者持続化補助金の補助上限額 (制度の数字)' },
  { file: 'content-data.jsx', has: '月1〜5万円程度', why: '/support FAQ の前半は保守費の市場相場。当社の金額は同じ行の後半でデータから出している' },
  { file: 'service-pages.jsx', has: 'them="200〜500万円"', why: '/dx 他社比較の他社相場' },
  { file: 'info-pages.jsx', has: '"〜50万円", "50〜150万円"', why: '無料診断フォームの予算の選択肢 (訪問者の予算で、当社の料金ではない)' },
  { file: 'info-pages.jsx', has: '"資本金", "100 万円"', why: '会社概要の資本金' },
  { file: 'top-page.jsx', has: '30万円でちゃんと集客できる', why: '記事の見出し (記事タイトルは変えない決まり)' },
  { file: 'extra-pages.jsx', has: '年30万円まで補助', why: '採用ページの福利厚生 (学習支援の補助額)' },
  { file: 'extra-pages.jsx', has: 'v: "10 週間"', why: 'WorkDetailPage は未ルーティングで画面に出ない。実績詳細を公開するときに見直す (C28)' },
  { file: 'app.jsx', has: '会社案内型10万円〜、集客型50万円〜', why: '記事 web-production-cost-guide の meta。市場相場の価格帯' },
  { file: 'lp/service/recruit-site/index.html', has: '給与：日給 12,000円〜', why: '求人票のモックに載せた見本の給与 (当社の料金ではない)' },
];

// 記事 (d) 用。自社語と金額が同じ行にあるが、金額は自社の料金ではない行。
const ALLOW_BLOG = [
  { file: 'system-development-outsourcing-cost-guide.md', has: '100万〜500万円台', why: '公的統計をもとにした市場の価格帯' },
  { file: 'cheap-homepage-pitfalls-checklist.md', has: '10万円未満を「格安帯」と定義', why: '記事内の用語の定義 (市場の価格帯)' },
];

// ------------------------------------------------------------
// 共通
// ------------------------------------------------------------
const failures = [];
const warnings = [];
const fail = (file, line, tag, msg) => failures.push({ file, line: line || 1, tag, msg });
const warn = (file, line, tag, msg) => warnings.push({ file, line: line || 1, tag, msg });

const exists = (p) => fs.existsSync(path.join(ROOT, p));
// 先頭の BOM (0xFEFF) は外す。JSON.parse が BOM で落ちるため。
const read = (p) => {
  const s = fs.readFileSync(path.join(ROOT, p), 'utf8');
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
};
const splitLines = (s) => s.split(/\r?\n/);

function allowEntry(list, file, lineText) {
  for (const a of list) {
    if (a.file !== file) continue;
    if (a.has ? lineText.includes(a.has) : a.re.test(lineText)) { a.used = true; return a; }
  }
  return null;
}

// ------------------------------------------------------------
// 1. NORTIQ_PRICING とヘルパーを読む
//    目印の間を切り出して vm で評価する (入れ子があるので正規表現では読まない)。ヘルパーも一緒に評価し、
//    許可集合の文字列を「画面と同じ関数」で作る。検査側で書式を二重に持たないため。
// ------------------------------------------------------------
const DATA_FILE = 'content-data.jsx';
const HELPER_NAMES = ['priceFrom', 'priceRange', 'priceMonthly', 'priceMonthlyRange', 'priceInitPlusMonthly',
  'priceTax', 'priceConsult', 'pricePeriod', 'pricePlanRows'];

function loadPricing() {
  const lines = splitLines(read(DATA_FILE));
  const at = (mark) => lines.findIndex((l) => l.trim() === mark);
  const block = (name) => {
    const b = at('// ' + name + ':BEGIN');
    const e = at('// ' + name + ':END');
    if (b < 0 || e < 0 || e <= b) {
      throw new Error(DATA_FILE + ' に目印「// ' + name + ':BEGIN」〜「// ' + name + ':END」が見つかりません。' +
        '目印の行には他の文字を足さないでください。');
    }
    return { begin: b, end: e, code: lines.slice(b + 1, e).join('\n') };
  };
  const data = block('NORTIQ_PRICING');
  const helpers = block('NORTIQ_PRICING_HELPERS');
  // トップレベルの const は vm のコンテキストのプロパティにならないので、末尾の式で取り出す。
  const tail = '\n;({ P: NORTIQ_PRICING, H: { ' +
    HELPER_NAMES.map((n) => n + ': typeof ' + n + " === 'function' ? " + n + ' : null').join(', ') + ' } })';
  const out = vm.runInNewContext(data.code + '\n' + helpers.code + tail, {}, { filename: DATA_FILE });
  for (const n of HELPER_NAMES) {
    if (!out.H[n]) throw new Error(DATA_FILE + ' のヘルパー ' + n + ' が見つかりません (NORTIQ_PRICING_HELPERS のブロック)。');
  }
  return { P: out.P, H: out.H, ranges: [[data.begin, data.end], [helpers.begin, helpers.end]] };
}

// ------------------------------------------------------------
// 2. 文から金額・期間・相談時間を抜き出す
//    書き方の違い (「10万円/月〜」と「月額10万円〜」、「70万円から」と「70万円〜」) は同じ意味として照合し、
//    書き方そのものは (e) の lint で見る。キーの形:
//      init:30+ (30万円〜) / init:60-180 (60〜180万円) / init:30 (30万円・「〜」なし)
//      mon:1+ (月額1万円〜) / mon:3-8 (月額3〜8万円) / mon:2 (月2万円)
//      w:4-6 (4〜6週間) / m:1.5 (約1.5ヶ月) / min:30-60 (30〜60分)
// ------------------------------------------------------------
const NUM = '\\d[\\d,]*(?:\\.\\d+)?';
const SP = '[ \\t\\u3000]*';
const num = (s) => Number(String(s).replace(/,/g, ''));

const MONEY_RE = new RegExp(
  '(月額運用|月額|月々|毎月|月)?' + SP + '(' + NUM + ')' + SP + '(?:万)?' + SP +
  '(?:[〜～]' + SP + '(' + NUM + ')' + SP + ')?万円' +
  '(' + SP + '[\\/／]' + SP + '月)?(〜|～|から|台)?', 'g');
// 円単位 (¥300,000〜 / 300,000円から)。¥ か 円 のどちらかが付くものだけを金額とみなす。
const YEN_RE = new RegExp('([¥￥])?' + SP + '(\\d{1,3}(?:,\\d{3})+)' + SP + '(円)?(〜|～|から|台)?', 'g');

function moneyTokens(text) {
  const out = [];
  let m;
  MONEY_RE.lastIndex = 0;
  while ((m = MONEY_RE.exec(text))) {
    const tok = { raw: m[0], index: m.index, monthly: !!(m[1] || m[4]), a: num(m[2]), b: m[3] != null ? num(m[3]) : null,
      open: m[5] === '〜' || m[5] === '～' || m[5] === 'から', tai: m[5] === '台', yen: false };
    // 「30万円から100万円」「10万円〜25万円」は開始価格ではなくレンジとして読む。
    if (tok.open && tok.b == null) {
      const rest = text.slice(MONEY_RE.lastIndex);
      const r = new RegExp('^' + SP + '(' + NUM + ')' + SP + '万円').exec(rest);
      if (r) { tok.b = num(r[1]); tok.open = false; tok.raw += r[0]; MONEY_RE.lastIndex += r[0].length; }
    }
    out.push(tok);
  }
  YEN_RE.lastIndex = 0;
  while ((m = YEN_RE.exec(text))) {
    if (!m[1] && !m[3]) continue;
    const tok = { raw: m[0].trim(), index: m.index, monthly: false, a: num(m[2]) / 10000, b: null,
      open: m[4] === '〜' || m[4] === '～' || m[4] === 'から', tai: m[4] === '台', yen: true };
    if (tok.open) {
      const rest = text.slice(YEN_RE.lastIndex);
      const r = new RegExp('^' + SP + '[¥￥]?' + SP + '(\\d{1,3}(?:,\\d{3})+)' + SP + '円?').exec(rest);
      if (r) { tok.b = num(r[1]) / 10000; tok.open = false; tok.raw += r[0]; YEN_RE.lastIndex += r[0].length; }
    }
    out.push(tok);
  }
  for (const t of out) {
    t.key = (t.monthly ? 'mon:' : 'init:') + (t.b != null ? t.a + '-' + t.b : t.open ? t.a + '+' : String(t.a));
  }
  return out.sort((x, y) => x.index - y.index);
}

// 期間。「解約は1ヶ月前通知」「1ヶ月以内に着手」「3ヶ月目」は制作・導入の期間ではないので拾わない。
const PERIOD_RE = new RegExp('(約)?(\\d+(?:\\.\\d+)?)(?:' + SP + '[〜～]' + SP + '(\\d+(?:\\.\\d+)?))?' + SP +
  '(週間|ヶ月|か月|ヵ月|カ月|ケ月)(?!前|以内|目|ごと|おき)', 'g');
function periodTokens(text) {
  const out = [];
  let m;
  PERIOD_RE.lastIndex = 0;
  while ((m = PERIOD_RE.exec(text))) {
    const unit = m[4] === '週間' ? 'w' : 'm';
    out.push({ raw: m[0], index: m.index, key: unit + ':' + (m[3] != null ? num(m[2]) + '-' + num(m[3]) : String(num(m[2]))) });
  }
  return out;
}

// 相談時間。「19分野」のような語を拾わないよう、相談・ヒアリングの文脈がある文だけを見る。
const MINUTES_RE = /(\d+)(?:[ \t]*[〜～][ \t]*(\d+))?[ \t]*分(?![野類割析岐])/g;
const CONSULT_CONTEXT = /相談|ヒアリング|MTG|面談|打ち合わせ|打合せ|ミーティング/;
function minuteTokens(text, force) {
  if (!force && !CONSULT_CONTEXT.test(text)) return [];
  const out = [];
  let m;
  MINUTES_RE.lastIndex = 0;
  while ((m = MINUTES_RE.exec(text))) {
    out.push({ raw: m[0], index: m.index, key: 'min:' + (m[2] != null ? m[1] + '-' + m[2] : m[1]) });
  }
  return out;
}

// ------------------------------------------------------------
// 3. 許可集合 (リンク先ごと)
// ------------------------------------------------------------
class TokenSet {
  constructor() { this.keys = new Map(); this.pairs = new Map(); this.planPeriods = new Set(); }
  add(str) {
    if (!str) return this;
    for (const t of [...moneyTokens(str), ...periodTokens(str), ...minuteTokens(str, true)]) {
      if (!this.keys.has(t.key)) this.keys.set(t.key, t.raw);
    }
    return this;
  }
  // プランの「金額と期間の組」。30万円〜 と 4週間 のような取り違えを見つけるために持つ。
  addPair(moneyStr, periodStr, label) {
    this.add(moneyStr).add(periodStr);
    const mk = moneyTokens(moneyStr)[0];
    const pk = periodTokens(periodStr)[0];
    if (!mk || !pk) return this;
    if (!this.pairs.has(mk.key)) this.pairs.set(mk.key, []);
    this.pairs.get(mk.key).push({ period: pk.key, periodRaw: pk.raw, label });
    this.planPeriods.add(pk.key);
    return this;
  }
  merge(other) {
    for (const [k, v] of other.keys) if (!this.keys.has(k)) this.keys.set(k, v);
    for (const [k, v] of other.pairs) this.pairs.set(k, (this.pairs.get(k) || []).concat(v));
    for (const k of other.planPeriods) this.planPeriods.add(k);
    return this;
  }
  has(key) { return this.keys.has(key); }
  list(prefixes) {
    return [...this.keys].filter(([k]) => prefixes.some((p) => k.startsWith(p))).map(([, v]) => v).join('、') || '(なし)';
  }
}

function buildSets(P, H) {
  const consult = new TokenSet().add(P.consult.minutes[0] + '〜' + P.consult.minutes[1] + '分');

  const service = (key) => {
    const svc = P[key];
    const s = new TokenSet();
    for (const p of svc.plans || []) {
      if (p.min == null) continue;
      const monthly = p.kind === 'monthly';
      const from = monthly ? H.priceMonthly(p.min) : H.priceFrom(p.min);
      const period = H.pricePeriod(p);
      if (period) s.addPair(from, period, svc.label + ' ' + p.name); else s.add(from);
      if (p.max != null) s.add(monthly ? H.priceMonthlyRange(p.min, p.max) : H.priceRange(p.min, p.max));
      if (p.supportMonths) s.add(p.supportMonths + 'ヶ月');
      s.add(p.tagline);
    }
    // 画面に出る features (差し込み後)。「3ヶ月の運用支援」のように features の文中にある期間も許可に入る。
    for (const r of H.pricePlanRows(key)) { r.features.forEach((f) => s.add(f)); s.add(r.range); }
    if (svc.monthlyMin != null) s.add(H.priceMonthly(svc.monthlyMin));
    if (svc.hearing) s.add(H.pricePeriod(svc.hearing)).add(svc.hearing.minutes + '分');
    return s;
  };

  const lp = (def, withOps) => {
    const s = new TokenSet();
    for (const p of def.plans) s.addPair(H.priceFrom(p.min), H.pricePeriod(p), def.label + ' ' + (p.ja || p.name));
    if (withOps && def.ops) {
      // LPの運用プランは「〜」の付かない固定額 (月2万円)。
      for (const o of def.ops.plans) s.add('月' + o.monthly + '万円');
      if (def.ops.minMonths) s.add(def.ops.minMonths + 'ヶ月');
    }
    return s;
  };

  const routes = new Map();
  const web = service('web'), chatbot = service('chatbot'), dx = service('dx'), maint = service('maintenance');
  routes.set('/' + P.web.route, new TokenSet().merge(web).merge(maint).merge(consult));
  routes.set('/' + P.chatbot.route, new TokenSet().merge(chatbot).merge(consult));
  routes.set('/' + P.dx.route, new TokenSet().merge(dx).merge(consult));
  routes.set('/' + P.maintenance.route, new TokenSet().merge(maint).merge(consult));
  const pricing = new TokenSet().merge(web).merge(chatbot).merge(dx).merge(maint).merge(consult);
  for (const k of Object.keys(P.lps)) for (const p of P.lps[k].plans) pricing.add(H.priceFrom(p.min));
  routes.set('/pricing', pricing);
  for (const k of Object.keys(P.solutions)) {
    const sol = P.solutions[k];
    routes.set('/' + sol.route, new TokenSet().add(H.priceInitPlusMonthly(sol)).add(H.pricePeriod(sol)).merge(consult));
  }
  const lps = new Map();
  for (const k of Object.keys(P.lps)) {
    const set = lp(P.lps[k], true).merge(consult);
    routes.set(P.lps[k].href, set);
    lps.set(P.lps[k].href, { def: P.lps[k], set });
  }
  const union = new TokenSet();
  for (const s of routes.values()) union.merge(s);
  return { routes, lps, union };
}

// ------------------------------------------------------------
// (e) 表記の lint
// ------------------------------------------------------------
const LINT = [
  { id: 'space', re: new RegExp('\\d' + SP.replace('*', '+') + '(?:万円|週間|ヶ月)'), msg: '数字と単位の間にスペースがあります (「30万円〜」「8〜12週間」のように詰める)' },
  { id: 'kara', re: /\d[ \t]*万円から(?![ \t]*[\d約])/, msg: '「万円から」は使いません (「30万円〜」と書く)' },
  { id: 'dai', re: /\d[ \t]*万?円台/, msg: '「◯万円台」は上限があるように読めるので使いません (「10万円〜」と書く)' },
  { id: 'range-open', re: /\d[ \t]*[〜～][ \t]*[\d,]+[ \t]*万円[ \t]*[〜～](?![ \t]*\d)/, msg: 'レンジの後ろに「〜」を重ねません (「60〜180万円」で止める)' },
  { id: 'kagetsu', re: /\d[ \t]*(?:か月|ヵ月|カ月|ケ月)/, msg: '月数は「ヶ月」に統一します' },
  { id: 'yen', re: /[¥￥][ \t]*\d{1,3}(?:,\d{3})+|\d{1,3}(?:,\d{3})+[ \t]*円/, msg: '円単位の表記は使いません (「30万円〜」と書く。円単位は JSON-LD の price だけ)' },
  // 以下の2つは本体サイトと data/*.json の決まり。静的LPは「2万円／月」の書き方で一貫しているので対象外。
  { id: 'per-month', re: /\d[ \t]*万円[ \t]*[\/／][ \t]*月/, msg: '「万円/月」は使いません (「月額10万円〜」と書く)', notLp: true },
  { id: 'getsugaku-unyo', re: /月額運用[ \t]*\d/, msg: '初期＋月額は「60〜180万円＋月額3〜8万円」の形にそろえます (「運用」を入れない)', notLp: true },
];
function lint(text, opts) {
  const out = [];
  for (const r of LINT) {
    if (opts && opts.lp && r.notLp) continue;
    const m = r.re.exec(text);
    if (m) out.push({ id: r.id, msg: r.msg + ': 「' + around(text, m.index, m[0].length) + '」' });
  }
  return out;
}
function around(text, index, len) {
  const s = Math.max(0, index - 6), e = Math.min(text.length, index + len + 6);
  return (s > 0 ? '…' : '') + text.slice(s, e).trim() + (e < text.length ? '…' : '');
}

// ------------------------------------------------------------
// 文の検査 (a)(b) 共通: 金額・期間・相談時間が許可集合に在るか、金額と期間の組が合っているか
// ------------------------------------------------------------
function checkText(text, set, where, report) {
  const money = moneyTokens(text).filter((t) => !t.tai); // 「◯万円台」は lint が報告する
  for (const t of money) {
    if (set.has(t.key)) continue;
    let hint = '';
    if (!t.open && t.b == null && set.has(t.key + '+')) hint = ' (「〜」が抜けると固定額に読めます)';
    report('金額「' + t.raw.trim() + '」は ' + where + ' の料金に在りません' + hint + '。NORTIQ_PRICING の値: ' + set.list(['init:', 'mon:']));
  }
  for (const t of periodTokens(text)) {
    if (!set.has(t.key)) report('期間「' + t.raw.trim() + '」は ' + where + ' の期間に在りません。NORTIQ_PRICING の値: ' + set.list(['w:', 'm:']));
  }
  for (const t of minuteTokens(text)) {
    if (!set.has(t.key)) report('相談時間「' + t.raw.trim() + '」は ' + where + ' の記載と合いません。NORTIQ_PRICING の値: ' + set.list(['min:']));
  }
  // 金額と期間の組。同じ文の中で、期間にいちばん近いプラン金額を相手とみなす
  // (title 全体など広い範囲で判定すると、金額なしの「4週間で」を誤検知する)。
  for (const sentence of text.split(/[。！？!?\n]/)) {
    const plans = moneyTokens(sentence).filter((t) => set.pairs.has(t.key));
    if (!plans.length) continue;
    for (const p of periodTokens(sentence)) {
      if (!set.planPeriods.has(p.key)) continue;
      const near = plans.reduce((best, t) => (Math.abs(t.index - p.index) < Math.abs(best.index - p.index) ? t : best));
      const expected = set.pairs.get(near.key);
      if (expected.some((x) => x.period === p.key)) continue;
      report('「' + near.raw.trim() + '」と「' + p.raw.trim() + '」が同じ文に並んでいますが、プランの組み合わせと合いません (' +
        expected.map((x) => x.label + ' は ' + x.periodRaw).join(' / ') + ')');
    }
  }
}

// JSON の文字列値が raw ファイルの何行目かを探す (from 行目以降で最初に見つかった行)。
function lineOf(lines, text, from) {
  const needle = JSON.stringify(text).slice(1, -1);
  for (let i = Math.max(0, from || 0); i < lines.length; i++) if (lines[i].includes(needle)) return i + 1;
  return (from || 0) + 1;
}

// ------------------------------------------------------------
// (a) data/blocks.json・data/catalog-pages.json
// ------------------------------------------------------------
function checkDataFiles(sets) {
  const taxWord = sets.taxWord;

  const checkStrings = (file, lines, from, route, strings, unitLabel) => {
    const set = sets.routes.get(route);
    let hasMoney = false, hasTax = false, firstLine = 0;
    for (const text of strings) {
      if (typeof text !== 'string' || !text) continue;
      const line = lineOf(lines, text, from);
      if (text.includes(taxWord)) hasTax = true;
      if (moneyTokens(text).length) { hasMoney = true; firstLine = firstLine || line; }
      if (set) {
        checkText(text, set, 'リンク先 ' + route, (msg) => fail(file, line, 'a', msg));
      } else {
        // NORTIQ_PRICING に対応が無いリンク先。どのサービスの料金でもない金額だけを警告する。
        for (const t of moneyTokens(text)) {
          if (!t.tai && !sets.union.has(t.key)) warn(file, line, 'a', '金額「' + t.raw.trim() + '」はどのサービスの料金にも在りません (リンク先 ' + (route || 'なし') + ')。自社の料金なら値を確かめてください');
        }
      }
      for (const l of lint(text)) fail(file, line, 'e', l.msg);
    }
    // 字数上限があるので title に税別が無くてもよい。同じ variant / ページのどこかに在ればよい。
    if (set && hasMoney && !hasTax) warn(file, firstLine, 'a', unitLabel + ' に金額がありますが「' + taxWord + '」がありません (字数が許せば「（' + taxWord + '）」を添える)');
  };

  // blocks.json
  {
    const file = 'data/blocks.json';
    const lines = splitLines(read(file));
    const json = JSON.parse(read(file));
    for (const b of json.blocks || []) {
      const from = Math.max(0, lines.findIndex((l) => l.includes('"block_id"') && l.includes('"' + b.block_id + '"')));
      const visit = (route, variants, start) => {
        for (const name of Object.keys(variants || {})) {
          const v = variants[name];
          checkStrings(file, lines, start, route, Object.values(v), b.block_id + ' の ' + name);
        }
      };
      visit(b.target_url, b.variants, from);
      for (const ind of Object.keys(b.by_industry || {})) {
        const e = b.by_industry[ind];
        const start = Math.max(from, lines.findIndex((l, i) => i >= from && l.includes('"' + ind + '"')));
        visit(e.target_url || b.target_url, e.variants, start);
      }
    }
  }
  // catalog-pages.json
  {
    const file = 'data/catalog-pages.json';
    const lines = splitLines(read(file));
    const json = JSON.parse(read(file));
    for (const p of json.pages || []) {
      const from = Math.max(0, lines.findIndex((l) => l.includes('"url"') && l.includes('"' + p.url + '"')));
      checkStrings(file, lines, from, p.url, [p.title, p.audience, p.summary], p.url + ' の summary');
    }
  }
}

// ------------------------------------------------------------
// (b) lp/service/*/index.html
// ------------------------------------------------------------
function attr(tag, name) {
  const m = new RegExp('\\b' + name + '\\s*=\\s*"([^"]*)"').exec(tag);
  return m ? m[1] : null;
}
// タグを消して画面に出る文だけにする。行番号を保つため、消した部分の改行は残す。
function visibleText(html) {
  const keepNewlines = (s) => s.replace(/[^\n]/g, '');
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, keepNewlines)
    .replace(/<!--[\s\S]*?-->/g, keepNewlines)
    .replace(/<[^>]*>/g, keepNewlines);
}

function checkLps(sets, P) {
  const dir = 'lp/service';
  const found = new Set();
  const dirs = exists(dir) ? fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
  for (const name of dirs) {
    const file = dir + '/' + name + '/index.html';
    if (!exists(file)) continue;
    const href = '/service/' + name;
    const entry = sets.lps.get(href);
    if (!entry) { warn(file, 1, 'b', 'NORTIQ_PRICING.lps に href "' + href + '" の定義がありません。料金を載せているLPなら lps に足してください'); continue; }
    found.add(href);
    checkOneLp(file, entry.def, entry.set, sets, P);
  }
  for (const href of sets.lps.keys()) {
    if (!found.has(href)) fail(DATA_FILE, 1, 'b', 'NORTIQ_PRICING.lps の ' + href + ' に対応する lp' + href + '/index.html がありません');
  }
}

function checkOneLp(file, def, set, sets, P) {
  const html = read(file);
  const lines = splitLines(html);
  const where = 'このLP (' + def.href + ')';
  const findLine = (needle) => { const i = lines.findIndex((l) => l.includes(needle)); return i < 0 ? 1 : i + 1; };

  // --- JSON-LD Offer ---
  const offers = [];
  const ldStrings = []; // { text, line }
  const ldRe = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html))) {
    const startLine = html.slice(0, m.index).split('\n').length;
    let json;
    try { json = JSON.parse(m[1]); } catch (e) { fail(file, startLine, 'b', 'JSON-LD を読めません: ' + e.message); continue; }
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      if (node['@type'] === 'Offer') offers.push(node);
      for (const k of Object.keys(node)) {
        if ((k === 'name' || k === 'description' || k === 'headline') && typeof node[k] === 'string') ldStrings.push({ text: node[k], line: lineOf(lines, node[k], startLine - 1) });
        else walk(node[k]);
      }
    };
    walk(json);
  }
  const byPrice = offers.slice().sort((x, y) => Number(x.price) - Number(y.price));
  const plans = def.plans.slice().sort((x, y) => x.min - y.min);
  if (byPrice.length !== plans.length) {
    fail(file, findLine('"@type":"Offer"'), 'b', 'JSON-LD の Offer が ' + byPrice.length + ' 件、NORTIQ_PRICING.lps のプランが ' + plans.length + ' 件で、件数が合いません');
  } else {
    byPrice.forEach((o, i) => {
      const expected = plans[i].min * 10000;
      const line = lineOf(lines, o.name || '', findLine('"@type":"Offer"') - 1);
      const spec = o.priceSpecification || {};
      const nums = [['price', o.price], ['priceSpecification.price', spec.price], ['priceSpecification.minPrice', spec.minPrice]];
      for (const [label, v] of nums) {
        if (v != null && Number(v) !== expected) fail(file, line, 'b', 'JSON-LD Offer「' + o.name + '」の ' + label + ' が ' + v + ' です。NORTIQ_PRICING.lps では ' + plans[i].min + '万円 (= ' + expected + ')');
      }
      const vat = spec.valueAddedTaxIncluded != null ? spec.valueAddedTaxIncluded : o.valueAddedTaxIncluded;
      const expectedVat = P.tax !== '税別';
      if (vat == null) fail(file, line, 'b', 'JSON-LD Offer「' + o.name + '」に valueAddedTaxIncluded がありません (' + P.tax + ' なら ' + expectedVat + ')');
      else if (vat !== expectedVat) fail(file, line, 'b', 'JSON-LD Offer「' + o.name + '」の valueAddedTaxIncluded が ' + vat + ' です (NORTIQ_PRICING.tax は「' + P.tax + '」)');
    });
  }

  // --- title・meta・JSON-LD の name / description ---
  const metas = ldStrings.slice();
  const title = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (title) metas.push({ text: title[1], line: html.slice(0, title.index).split('\n').length });
  const metaRe = /<meta\b[^>]*>/gi;
  const META_KEYS = new Set(['description', 'og:title', 'og:description', 'twitter:title', 'twitter:description']);
  while ((m = metaRe.exec(html))) {
    const key = attr(m[0], 'name') || attr(m[0], 'property');
    const content = attr(m[0], 'content');
    if (key && content && META_KEYS.has(key)) metas.push({ text: content, line: html.slice(0, m.index).split('\n').length });
  }
  for (const s of metas) {
    checkText(s.text, set, where, (msg) => fail(file, s.line, 'b', msg));
    if (moneyTokens(s.text).some((t) => set.has(t.key)) && !s.text.includes(P.tax)) {
      fail(file, s.line, 'b', '金額を書いていますが、同じ文字列に「' + P.tax + '」がありません: 「' + around(s.text, moneyTokens(s.text)[0].index, 6) + '」');
    }
    for (const l of lint(s.text, { lp: true })) fail(file, s.line, 'e', l.msg);
  }

  // --- 料金表 (plan__price / plan__period) ---
  const pick = (cls) => {
    const out = [];
    const re = new RegExp('<[a-z0-9]+\\b[^>]*class="[^"]*\\b' + cls + '\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/p>', 'gi');
    let x;
    while ((x = re.exec(html))) out.push({ text: x[1].replace(/<[^>]*>/g, ''), line: html.slice(0, x.index).split('\n').length });
    return out;
  };
  const prices = pick('plan__price');
  const periods = pick('plan__period');
  if (!prices.length) {
    warn(file, 1, 'b', '料金表 (class="plan__price") が見つからないので、料金表とプランの照合を省きました');
  } else if (prices.length !== def.plans.length) {
    fail(file, prices[0].line, 'b', '料金表のプランが ' + prices.length + ' 件、NORTIQ_PRICING.lps が ' + def.plans.length + ' 件で、件数が合いません');
  } else {
    def.plans.forEach((p, i) => {
      const got = moneyTokens(prices[i].text)[0];
      const want = moneyTokens(sets.H.priceFrom(p.min))[0];
      if (!got || got.key !== want.key) fail(file, prices[i].line, 'b', '料金表の ' + (i + 1) + ' 番目が「' + prices[i].text.trim() + '」です。NORTIQ_PRICING.lps では ' + want.raw);
      if (periods[i]) {
        const gp = periodTokens(periods[i].text)[0];
        const wp = periodTokens(sets.H.pricePeriod(p))[0];
        if (wp && (!gp || gp.key !== wp.key)) fail(file, periods[i].line, 'b', '料金表の ' + (i + 1) + ' 番目の期間が「' + periods[i].text.trim() + '」です。NORTIQ_PRICING.lps では ' + sets.H.pricePeriod(p));
      }
    });
  }

  // --- 本文の金額と税別 ---
  // 料金表の中 (見出しに税別がある) はセルごとの税別を求めない。それ以外は同じ行に税別が要る。
  const taxHeading = new RegExp('<h[1-4]\\b[^>]*>[^<]*' + P.tax).test(html);
  const visible = splitLines(visibleText(html));
  visible.forEach((text, i) => {
    if (!text.trim()) return;
    if (allowEntry(ALLOW, file, lines[i] || '')) return;
    const own = moneyTokens(text).filter((t) => !t.tai);
    for (const t of own) {
      if (!set.has(t.key)) fail(file, i + 1, 'b', '本文の金額「' + t.raw.trim() + '」は NORTIQ_PRICING.lps に在りません。値: ' + set.list(['init:', 'mon:']));
    }
    if (own.length && !text.includes(P.tax)) {
      const inTable = /plan__price|maint__price|ops__price/.test(lines[i] || '');
      if (!(inTable && taxHeading)) fail(file, i + 1, 'b', '金額「' + own[0].raw.trim() + '」の近くに「' + P.tax + '」がありません');
    }
    for (const l of lint(text, { lp: true })) fail(file, i + 1, 'e', l.msg);
  });
}

// ------------------------------------------------------------
// (c) *.jsx の生リテラル
// ------------------------------------------------------------
const RAW_PRICE = /\d+\s*万円|[¥￥]\s*\d{1,3},\d{3}/;
function checkJsx(pricing) {
  const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.jsx')).sort();
  for (const file of files) {
    const lines = splitLines(read(file));
    lines.forEach((text, i) => {
      if (file === DATA_FILE && pricing.ranges.some(([b, e]) => i >= b && i <= e)) return;
      if (!RAW_PRICE.test(text) && !lint(text).length) return;
      if (allowEntry(ALLOW, file, text)) return;
      const m = RAW_PRICE.exec(text);
      if (m) {
        fail(file, i + 1, 'c', '金額の生リテラルがあります: 「' + around(text, m.index, m[0].length) + '」。自社の料金なら NORTIQ_PRICING と price* ヘルパーから出してください。' +
          '市場相場・補助金額など自社の料金でない数字なら、pricing-check.js の ALLOW に理由つきで足してください');
      }
      for (const l of lint(text)) fail(file, i + 1, 'e', l.msg);
    });
  }
}

// ------------------------------------------------------------
// (d) content/blog/*.md — 警告のみ
// ------------------------------------------------------------
const OWN_WORDS = /当社|弊社|Nortiq|私たち|ノーティック/i;
// 記事の中でのサービスの呼び方。「リニューアル」だけではチャットボット追加の文にも出るので入れない。
const BLOG_SERVICE_WORDS = [
  { name: 'Web制作', re: /Web制作|ウェブ制作|ホームページ制作|Webサイト制作|Webリニューアル|サイト制作/g, route: (P) => '/' + P.web.route },
  { name: 'AIチャットボット', re: /チャットボット|AI投稿ツール/g, route: (P) => '/' + P.chatbot.route },
  { name: 'DX・ML', re: /DX|PoC|機械学習|システム開発/g, route: (P) => '/' + P.dx.route },
  { name: '保守・運用', re: /保守/g, route: (P) => '/' + P.maintenance.route },
];
function lastMatchIndex(text, re) {
  let at = -1, m;
  re.lastIndex = 0;
  while ((m = re.exec(text))) at = m.index;
  return at;
}
function checkBlog(sets, P) {
  const dir = 'content/blog';
  if (!exists(dir)) return;
  for (const name of fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.md')).sort()) {
    const file = dir + '/' + name;
    splitLines(read(file)).forEach((text, i) => {
      if (!OWN_WORDS.test(text)) return;
      const money = moneyTokens(text);
      if (!money.length) return;
      if (allowEntry(ALLOW_BLOG, name, text)) return;
      for (const t of money) {
        if (t.tai) continue;
        // 金額の手前でいちばん近いサービス名から、どのサービスの料金かを推し量る。
        // 分からなければ全サービスの集合で見る (チャットボットの 25万円〜 を Web制作に書く、のような取り違えを拾うため)。
        const before = text.slice(0, t.index);
        let svc = null;
        for (const w of BLOG_SERVICE_WORDS) {
          const at = lastMatchIndex(before, w.re);
          if (at >= 0 && (!svc || at > svc.at)) svc = { at, name: w.name, set: sets.routes.get(w.route(P)) };
        }
        if (svc && svc.set && !svc.set.has(t.key)) {
          warn(file, i + 1, 'd', '「' + svc.name + '」の近くの金額「' + t.raw.trim() + '」は ' + svc.name + ' の料金に在りません (値: ' + svc.set.list(['init:', 'mon:']) + ')。市場相場なら ALLOW_BLOG に足してください');
        } else if (!svc && !sets.union.has(t.key)) {
          warn(file, i + 1, 'd', '自社語と同じ行の金額「' + t.raw.trim() + '」は NORTIQ_PRICING に在りません。自社の料金なら直し、市場相場なら ALLOW_BLOG に足してください');
        }
      }
      // 記事では「（30万円〜・税別）」のように括弧の中に書くこともあるので、同じ行か次の行に「税別」があればよい。
      for (const l of lint(text)) warn(file, i + 1, 'e', l.msg);
    });
  }
}

// ------------------------------------------------------------
// 自己点検: ヘルパーの出す文字列そのものが表記ルールを守り、この検査で読めること。
// ヘルパーの書式を変えて許可集合が空になっても気づけるようにする。
// ------------------------------------------------------------
function selfCheck(P, H) {
  const samples = [H.priceFrom(30), H.priceRange(200, 2000), H.priceMonthly(10), H.priceMonthlyRange(3, 8),
    H.priceInitPlusMonthly([60, 180], [3, 8])];
  const expected = ['init:30+', 'init:200-2000', 'mon:10+', 'mon:3-8', 'init:60-180'];
  samples.forEach((s, i) => {
    const t = moneyTokens(s)[0];
    if (!t || t.key !== expected[i]) fail(DATA_FILE, 1, 'self', 'ヘルパーの出力「' + s + '」をこの検査が読めません (書式を変えたら pricing-check.js の読み取りも直す)');
    for (const l of lint(s)) fail(DATA_FILE, 1, 'self', 'ヘルパーの出力が表記ルールに反しています: ' + l.msg);
  });
  if (P.tax !== '税別') warn(DATA_FILE, 1, 'self', 'NORTIQ_PRICING.tax が「' + P.tax + '」です。オーナー決定 (2026-09-21) は全サービス「税別」');
}

// ------------------------------------------------------------
// 実行
// ------------------------------------------------------------
function main() {
  let pricing;
  try { pricing = loadPricing(); } catch (e) {
    console.error('[失敗] ' + e.message);
    process.exit(1);
  }
  const { P, H } = pricing;
  const sets = buildSets(P, H);
  sets.H = H;
  sets.taxWord = P.tax;

  selfCheck(P, H);
  checkDataFiles(sets);
  checkLps(sets, P);
  checkJsx(pricing);
  checkBlog(sets, P);
  for (const a of [...ALLOW, ...ALLOW_BLOG]) {
    if (!a.used) warn('pricing-check.js', 1, 'allow', '許可リストの項目が使われていません (' + a.file + ': ' + (a.has || a.re) + ')。元の行が消えたなら、この項目も消してください');
  }

  const order = (x, y) => (x.file === y.file ? x.line - y.line : x.file < y.file ? -1 : 1);
  const print = (label, list) => list.sort(order).forEach((r) => console.log(label + ' ' + r.file + ':' + r.line + ' (' + r.tag + ') ' + r.msg));
  console.log('pricing-check: NORTIQ_PRICING を ' + DATA_FILE + ':' + (pricing.ranges[0][0] + 1) + '-' + (pricing.ranges[0][1] + 1) + ' から読みました');
  print('[失敗]', failures);
  if (SHOW_WARN) print('[警告]', warnings);
  console.log('失敗 ' + failures.length + ' 件 / 警告 ' + warnings.length + ' 件' + (SHOW_WARN ? '' : ' (警告は --no-warn で非表示)'));
  if (failures.length) {
    console.log('直し方: docs/pricing/README.md');
    process.exit(1);
  }
}

main();
