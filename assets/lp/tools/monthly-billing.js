/* /tools/monthly-billing — 締め請求書メーカー
 * 1行に「日付・得意先・品名・数量・単価（税抜）・税率」の明細を1か月分貼ると、得意先ごとに合計した請求書（A4・1社1枚）を作る。
 * 消費税は、請求書1枚（＝得意先）につき税率ごとに1回だけ端数処理する（消費税法施行令70条の10）。
 * 入力はブラウザの中だけで処理し、サーバーには送らない。localStorage にも置かない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;
  var KIND = 'tools-monthly-billing';
  function clean(s) { return String(s || '').replace(/[\s　]+/g, ' ').trim(); }
  // 得意先の同一判定：全角半角・空白の違い、(株)・㈱＝株式会社、(有)・㈲＝有限会社
  function custKey(s) {
    return String(s || '').normalize('NFKC').replace(/[\s　]+/g, '').replace(/\(株\)/g, '株式会社').replace(/\(有\)/g, '有限会社').toUpperCase();
  }
  function roundTax(x, mode) { return mode === 'ceil' ? Math.ceil(x) : mode === 'round' ? Math.round(x) : Math.floor(x); }
  // 税率セル：空欄＝10、「8」「8%」「軽減」＝8。それ以外は NaN
  function rateCell(s) {
    var t = String(s || '').normalize('NFKC').replace(/[\s%％※]/g, '');
    if (t === '') return 10;
    if (/軽減/.test(t)) return 8;
    var n = Number(t);
    return n === 8 || n === 10 ? n : NaN;
  }
  function parseLine(line) {
    var c = T.splitLine(line).map(clean);
    if (c.length < 5 || !c[1] || !c[2]) return null;
    var qty = T.num(c[3]), price = T.num(c[4]), rate = rateCell(c[5]);
    if (isNaN(qty) || isNaN(price) || isNaN(rate)) return null;
    return { date: c[0], cust: c[1], item: c[2], qty: qty, price: price, rate: rate, amt: Math.round(qty * price) };
  }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  var idateEl = $('#idate'), dueEl = $('#due');
  if (!idateEl.value) idateEl.value = T.isoToday();
  if (!dueEl.value) { var n = new Date(); dueEl.value = iso(new Date(n.getFullYear(), n.getMonth() + 2, 0)); } // 翌月末

  function run() {
    var period = clean($('#period').value), idate = idateEl.value || T.isoToday(), due = dueEl.value, mode = $('#mode').value;
    var prefix = clean($('#prefix').value), regno = clean($('#regno').value).normalize('NFKC').toUpperCase(), me = clean($('#me').value), addr = clean($('#addr').value), tel = clean($('#tel').value), bank = clean($('#bank').value);
    var modeLabel = ({ floor: '切り捨て', round: '四捨五入', ceil: '切り上げ' })[mode];
    var lines = [], bad = [];
    $('#lines').value.split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var p = parseLine(line);
      if (p) lines.push(p); else bad.push({ no: i + 1, t: clean(line).slice(0, 60) });
    });
    var el = $('#result'); el.hidden = false;
    if (!lines.length) {
      el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">明細を、1行に「日付　得意先　品名　数量　単価　税率」の形で貼ってください（読めた行：0）。</div>';
      return;
    }
    var custs = [], by = {};
    lines.forEach(function (p) {
      var k = custKey(p.cust), c = by[k];
      if (!c) { c = by[k] = { name: p.cust, rows: [], s10: 0, s8: 0 }; custs.push(c); }
      c.rows.push(p);
      if (p.rate === 8) c.s8 += p.amt; else c.s10 += p.amt;
    });
    custs.forEach(function (c, i) {
      c.no = prefix + String(i + 1).padStart(3, '0');
      c.t10 = roundTax(c.s10 * 10 / 100, mode); c.t8 = roundTax(c.s8 * 8 / 100, mode);
      c.sub = c.s10 + c.s8; c.tax = c.t10 + c.t8; c.total = c.sub + c.tax;
    });
    var sum = function (f) { return custs.reduce(function (a, c) { return a + c[f]; }, 0); };
    var gSub = sum('sub'), gTax = sum('tax'), gTotal = sum('total');
    var idateL = T.jpDate(idate), dueL = due ? T.jpDate(due) : '';
    var yen = function (n) { return '¥' + fmt(n); };
    var regOk = !regno || /^T\d{13}$/.test(regno);

    var sm = function (t) { return '<br><small style="color:var(--text-3)">' + t + '</small>'; };
    var listTbl = '<div class="tbl tbl--wrap tbl--3"><table><thead><tr><th>得意先・請求番号</th><th class="r">税抜<br><small>消費税</small></th><th class="r">請求額<br><small>税込</small></th></tr></thead><tbody>' +
      custs.map(function (c) { return '<tr><td>' + esc(c.name) + sm(esc(c.no) + '・明細 ' + c.rows.length + '行') + '</td><td class="r">' + fmt(c.sub) + sm('税 ' + fmt(c.tax)) + '</td><td class="r"><b>' + fmt(c.total) + '</b></td></tr>'; }).join('') +
      '<tr><td><b>合計</b>' + sm(custs.length + '社・明細 ' + lines.length + '行') + '</td><td class="r">' + fmt(gSub) + sm('税 ' + fmt(gTax)) + '</td><td class="r"><b>' + fmt(gTotal) + '</b></td></tr>' +
      '</tbody></table></div>';
    var notes = '';
    if (!regOk) notes += '<div class="note-red"><b>登録番号の形式を確認してください</b>適格請求書発行事業者の登録番号は「T」＋数字13桁です。入力：' + esc(regno) + '</div>';
    if (bad.length) notes += '<div class="note-red"><b>読めなかった行（' + bad.length + '行・請求書に入っていません）</b>' + bad.slice(0, 10).map(function (b) { return esc(b.no + '行目：' + b.t); }).join('<br>') + (bad.length > 10 ? '<br>ほか ' + (bad.length - 10) + '行' : '') + '<br>数量・単価が数字か、税率が 10 か 8 かを確認してください。</div>';

    var docs = custs.map(function (c, i) {
      var has8 = c.s8 > 0;
      return '<div class="doc print-target' + (i < custs.length - 1 ? ' doc--pb' : '') + '"><h2 class="doc-title">請求書</h2>' +
        '<p class="doc-meta">請求番号：' + esc(c.no) + '<br>請求日：' + esc(idateL) + '</p>' +
        '<div class="doc-party"><div><div class="doc-to">' + esc(c.name) + '　御中</div><p style="margin:0">下記のとおりご請求申し上げます。</p></div>' +
        '<div class="doc-from">' + (me ? '<b>' + esc(me) + '</b>' : '') + esc([addr, tel, regno ? '登録番号：' + regno : ''].filter(function (x) { return x; }).join('\n')) + '</div></div>' +
        (period ? '<p class="doc-subject">件名：' + esc(period) + ' ご請求</p>' : '') +
        '<div class="doc-total">ご請求金額（税込）<b>' + yen(c.total) + '</b></div>' +
        '<table class="bill-items"><colgroup><col class="c-d"><col><col class="c-q"><col class="c-p"><col class="c-a"></colgroup><thead><tr><th>日付</th><th>品名</th><th>数量</th><th>単価</th><th>金額</th></tr></thead><tbody>' +
        c.rows.map(function (p) { return '<tr><td class="c">' + esc(p.date) + '</td><td>' + esc(p.item) + (p.rate === 8 ? ' ※' : '') + '</td><td class="num">' + fmt(p.qty) + '</td><td class="num">' + fmt(p.price) + '</td><td class="num">' + fmt(p.amt) + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<table class="doc-sum"><tbody>' +
        (c.s10 ? '<tr><th>10%対象（税抜）</th><td class="num">' + fmt(c.s10) + '</td></tr><tr><th>消費税（10%）</th><td class="num">' + fmt(c.t10) + '</td></tr>' : '') +
        (has8 ? '<tr><th>8%対象（税抜）※</th><td class="num">' + fmt(c.s8) + '</td></tr><tr><th>消費税（8%）</th><td class="num">' + fmt(c.t8) + '</td></tr>' : '') +
        '<tr><th>合計（税込）</th><td class="num"><b>' + yen(c.total) + '</b></td></tr></tbody></table>' +
        '<p style="font-size:11px;margin:6px 0 0;text-align:right">' + (has8 ? '※は軽減税率（8%）対象。' : '') + '消費税額は税率ごとに1回の端数処理（' + modeLabel + '）。</p>' +
        ((dueL || bank) ? '<div class="doc-note">' + (dueL ? 'お支払期限：' + esc(dueL) + '\n' : '') + (bank ? 'お振込先：' + esc(bank) + '\n恐れ入りますが、振込手数料はご負担くださいますようお願いいたします。' : '') + '</div>' : '') + '</div>';
    }).join('');

    var text = ['【請求一覧】' + (period || '') + '　請求日 ' + idateL + (dueL ? '／お支払期限 ' + dueL : ''), ''].concat(
      custs.map(function (c) { return '・' + c.no + '　' + c.name + '　' + fmt(c.total) + '円（税抜 ' + fmt(c.sub) + '＋消費税 ' + fmt(c.tax) + '）'; }),
      ['', '合計 ' + custs.length + '社　' + fmt(gTotal) + '円（税抜 ' + fmt(gSub) + '＋消費税 ' + fmt(gTax) + '）']).join('\n');
    var listCsv = [['得意先', '請求額(税込)', '請求番号', 'お支払期限', '請求日', '税抜合計', '10%対象', '消費税10%', '8%対象', '消費税8%', '明細行数']].concat(
      custs.map(function (c) { return [c.name, c.total, c.no, due, idate, c.sub, c.s10, c.t10, c.s8, c.t8, c.rows.length]; }));
    var detailCsv = [['請求番号', '得意先', '日付', '品名', '数量', '単価(税抜)', '金額(税抜)', '税率(%)']];
    custs.forEach(function (c) { c.rows.forEach(function (p) { detailCsv.push([c.no, c.name, p.date, p.item, p.qty, p.price, p.amt, p.rate]); }); });
    var tag = (period || idate).replace(/[\s　\\\/:*?"<>|]/g, '');

    el.innerHTML = '<div class="res-title"><h2>請求書ができました</h2><p class="sub">' + esc(period || idateL) + '　得意先ごとに合計し、消費税の端数は請求書ごと・税率ごとに1回だけ処理しました（' + modeLabel + '）</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + custs.length + '<small>社</small></div><div class="lab">請求書の枚数（明細 ' + lines.length + ' 行）</div></div>' +
      '<div class="res-stat"><div class="big">¥' + fmt(gTotal) + '</div><div class="lab">請求額の合計（税込）</div></div>' +
      '<div class="res-stat"><div class="big">¥' + fmt(gTax) + '</div><div class="lab">うち消費税（税抜 ¥' + fmt(gSub) + '）</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="print">請求書を印刷・PDF保存（' + custs.length + '社分）</button><button type="button" class="btn btn--outline btn--sm" id="c1">請求一覧をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="c2">明細をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">請求一覧をコピー</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Invoices</span><span class="d">請求一覧（得意先別）</span></div><div class="sheet-pad">' + listTbl + '</div>' + notes +
      '<div class="min"><b>入金の確認に使う</b>「請求一覧をCSVで保存」のCSVは、左から「得意先・請求額・請求番号・お支払期限」の順です。入金があったら、この4列を <a href="/tools/payment-match">入金消し込み照合</a> の請求一覧に貼ると、未入金が分かります。</div></div>' +
      '<div class="doc-wrap">' + docs + '</div>' +
      '<div class="again">ほかのツール：<a href="/tools/payment-match">入金消し込み照合</a><a href="/tools/cover-letter">送付状メーカー</a><a href="/tools/invoice">請求書・見積書メーカー（1通ずつ）</a><a href="/tools/price-list">価格表メーカー</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    $('#print').addEventListener('click', function () { T.track('tool_print', { kind: KIND }); window.print(); });
    $('#c1').addEventListener('click', function () { T.saveCsv('請求一覧_' + tag + '.csv', listCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'list' }); });
    $('#c2').addEventListener('click', function () { T.saveCsv('請求明細_' + tag + '.csv', detailCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'detail' }); });
    $('#copy').addEventListener('click', function () { T.copyText(text, $('#copy')); T.track('tool_copy', { kind: KIND }); });
    // 相談フォームに引き継ぐメモは件数と合計だけ（得意先名・品名は入れない）
    var memo = '【締め請求】' + (period || idateL) + '\n請求書 ' + custs.length + ' 社分・明細 ' + lines.length + ' 行\n請求額の合計（税込）：' + fmt(gTotal) + '円（税抜 ' + fmt(gSub) + '＋消費税 ' + fmt(gTax) + '）';
    T.renderCtas($('#ctas'), {
      memo: memo, kind: KIND, memoLabel: '件数と合計をコピー', shareTitle: '今月の請求の合計を共有する', shareDesc: '請求書の枚数と合計金額だけの短いテキストです（得意先名は入りません）。得意先ごとの一覧は、上の「請求一覧をコピー」から取れます。',
      quoteTitle: '請求書の発行を仕組みにする相談', quoteDesc: '売上伝票の入力から、締め日の請求書の作成・PDFでの送付・入金の消し込みまでをつなげる仕組みを組みます。今の伝票や販売管理ソフトのままで始められます。', quoteBtn: '相談を依頼する →',
      askExamples: '「今の販売管理ソフトのCSVから作れる？」「請求書を得意先に自動でメールできる？」', lineUrl: T.LINE_URL,
      extraFields: [['請求書', custs.length + '社分'], ['明細', lines.length + '行'], ['請求額の合計', fmt(gTotal) + '円']]
    });
    T.track('tool_result', { kind: KIND, customers: custs.length, lines: lines.length });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
})();
