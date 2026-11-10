/* /tools/reorder-list — 発注リストメーカー
 * 1行に「品名・今の在庫・発注点・発注ロット・仕入先・単価・入荷待ち」の在庫一覧を貼ると、
 * 「今の在庫＋入荷待ち」が発注点以下の品だけを拾い、ロットの倍数で発注数を出して、仕入先別の発注書にまとめる。
 * 入力はブラウザの中だけで処理し、サーバーには送らない。localStorage にも置かない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;
  var KIND = 'tools-reorder-list', NO_SUP = '（仕入先なし）';
  function key(s) { return String(s || '').normalize('NFKC').replace(/[\s　]+/g, '').toUpperCase(); }
  function clean(s) { return String(s || '').replace(/[\s　]+/g, ' ').trim(); }
  function r3(x) { return Math.round(x * 1000) / 1000; }

  // 1行 → { name, stock, point, lot, sup, price, coming }。在庫か発注点が数で読めない行は null
  function parseLine(line) {
    var c = T.splitLine(line).map(clean);
    if (c.length < 3 || !c[0]) return null;
    var stock = T.num(c[1]), point = T.num(c[2]);
    if (isNaN(stock) || isNaN(point)) return null;
    var lot = T.num(c[3]); if (isNaN(lot) || lot <= 0) lot = 1;
    var price = T.num(c[5]); if (isNaN(price) || price < 0) price = NaN;
    var coming = T.num(c[6]); if (isNaN(coming) || coming < 0) coming = 0;
    return { name: c[0], stock: stock, point: point, lot: lot, sup: c[4] || NO_SUP, price: price, coming: coming };
  }
  // 発注数：ロットの倍数で「有効在庫＋発注数」が発注点を上回る最小の数
  function orderQty(p) {
    var eff = r3(p.stock + p.coming);
    if (eff > p.point) return 0;
    var n = Math.floor(r3((p.point - eff) / p.lot)) + 1;
    return r3(n * p.lot);
  }

  var dateEl = $('#date');
  if (!dateEl.value) dateEl.value = T.isoToday();

  function run() {
    var iso = dateEl.value || T.isoToday(), due = $('#due').value, me = clean($('#me').value), ship = clean($('#ship').value), note = clean($('#note').value);
    var rows = [], bad = [];
    $('#stock').value.split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var p = parseLine(line);
      if (p) { p.qty = orderQty(p); p.eff = r3(p.stock + p.coming); p.amt = isNaN(p.price) ? NaN : Math.round(p.qty * p.price); rows.push(p); }
      else bad.push({ no: i + 1, t: clean(line).slice(0, 60) });
    });
    var el = $('#result'); el.hidden = false;
    if (!rows.length) {
      el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">在庫の一覧を、1行に「品名　今の在庫　発注点　発注ロット　仕入先」の形で貼ってください（読めた行：0）。</div>';
      return;
    }
    var need = rows.filter(function (p) { return p.qty > 0; });
    var sups = [], supBy = {};
    need.forEach(function (p) {
      var k = key(p.sup), s = supBy[k];
      if (!s) { s = supBy[k] = { name: p.sup, rows: [], total: 0, noPrice: 0 }; sups.push(s); }
      s.rows.push(p);
      if (isNaN(p.amt)) s.noPrice++; else s.total += p.amt;
    });
    var grand = sups.reduce(function (a, s) { return a + s.total; }, 0);
    var noPriceAll = sups.reduce(function (a, s) { return a + s.noPrice; }, 0);
    var waiting = rows.filter(function (p) { return p.qty === 0 && p.stock <= p.point; });
    var yen = function (n) { return isNaN(n) ? '—' : '¥' + fmt(n); };
    var st = function (p) { return p.qty > 0 ? '発注する' : (p.stock <= p.point ? '入荷待ちで足りる' : 'まだ足りる'); };
    var dateLabel = T.jpDate(iso, true), dueLabel = due ? T.jpDate(due, true) : '';

    var supHtml = sups.map(function (s) {
      return '<div class="grp"><div class="grp__h"><span>' + esc(s.name) + '</span><small>' + s.rows.length + '品目' + (s.total ? '・' + esc(yen(s.total)) + '（税抜）' : '') + '</small></div><ul>' +
        s.rows.map(function (p) { return '<li><span>' + esc(p.name) + ' <small style="color:var(--text-3)">（在庫 ' + fmt(p.stock) + (p.coming ? '＋入荷待ち ' + fmt(p.coming) : '') + '／発注点 ' + fmt(p.point) + '）</small></span><span class="qty">' + fmt(p.qty) + '</span></li>'; }).join('') + '</ul></div>';
    }).join('');
    var allTbl = '<div class="tbl tbl--wrap tbl--3"><table><thead><tr><th>品名・仕入先</th><th class="r">在庫<br><small>／発注点</small></th><th class="r">判定<br><small>発注数</small></th></tr></thead><tbody>' +
      rows.map(function (p) { return '<tr><td>' + esc(p.name) + '<br><small style="color:var(--text-3)">' + esc(p.sup) + '</small></td><td class="r">' + fmt(p.stock) + ' ／ ' + fmt(p.point) + (p.coming ? '<br><small style="color:var(--text-3)">入荷待ち ' + fmt(p.coming) + '</small>' : '') + '</td><td class="r">' + (p.qty > 0 ? '<span class="tag tag--warn">発注する</span><br><b>' + fmt(p.qty) + '</b>' : '<span class="tag">' + (p.stock <= p.point ? '入荷待ち' : '足りる') + '</span>') + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    var notes = '';
    if (waiting.length) notes += '<div class="min"><b>入荷待ちで足りる品（発注リストに入れていません）</b>' + esc(waiting.map(function (p) { return p.name + '（在庫 ' + fmt(p.stock) + '＋入荷待ち ' + fmt(p.coming) + '）'; }).join('、')) + '</div>';
    if (bad.length) notes += '<div class="note-red"><b>読めなかった行（' + bad.length + '行・判定に入っていません）</b>' + bad.slice(0, 10).map(function (b) { return esc(b.no + '行目：' + b.t); }).join('<br>') + (bad.length > 10 ? '<br>ほか ' + (bad.length - 10) + '行' : '') + '<br>「今の在庫」と「発注点」が数字で入っているか確認してください。</div>';

    // ---- A4 発注書（仕入先ごとに1枚） ----
    var docs = sups.map(function (s, i) {
      var hasPrice = s.rows.some(function (p) { return !isNaN(p.amt); });
      return '<div class="doc print-target' + (i < sups.length - 1 ? ' doc--pb' : '') + '"><h2 class="doc-title">発注書</h2><p class="doc-meta">発注日：' + esc(dateLabel) + '</p>' +
        '<div class="doc-party"><div><div class="doc-to">' + esc(s.name === NO_SUP ? '　　　　　　　　' : s.name) + '　御中</div><p style="margin:0">下記のとおり発注いたします。</p></div><div class="doc-from">' + (me ? '<b>' + esc(me) + '</b>' : '') + (ship ? esc('納品先：' + ship) : '') + '</div></div>' +
        (dueLabel ? '<p class="doc-subject">希望納期：' + esc(dueLabel) + '</p>' : '') +
        '<table class="doc-items"><colgroup><col class="c-no"><col><col class="c-q"><col class="c-p"><col class="c-a"></colgroup><thead><tr><th>No.</th><th>品名</th><th>数量</th><th>単価</th><th>金額</th></tr></thead><tbody>' +
        s.rows.map(function (p, j) { return '<tr><td class="num">' + (j + 1) + '</td><td>' + esc(p.name) + '</td><td class="num">' + fmt(p.qty) + '</td><td class="num">' + (isNaN(p.price) ? '' : fmt(p.price)) + '</td><td class="num">' + (isNaN(p.amt) ? '' : fmt(p.amt)) + '</td></tr>'; }).join('') + '</tbody></table>' +
        (hasPrice ? '<table class="doc-sum"><tbody><tr><th>合計（税抜）</th><td class="num"><b>' + esc(yen(s.total)) + '</b></td></tr></tbody></table><p style="font-size:11px;text-align:right;margin:0">消費税は別途。' + (s.noPrice ? '単価が空欄の ' + s.noPrice + ' 品目は合計に入っていません。' : '') + '</p>' : '') +
        (note ? '<div class="doc-note">' + esc(note) + '</div>' : '') + '</div>';
    }).join('');

    // ---- FAX・メール用の文面 ----
    var text = sups.map(function (s) {
      var L = [(s.name === NO_SUP ? '' : s.name + ' 御中'), '', 'いつもお世話になっております。' + (me ? me + 'です。' : ''), '下記のとおり発注いたします。', '', '発注日：' + dateLabel];
      if (dueLabel) L.push('希望納期：' + dueLabel);
      L.push('');
      s.rows.forEach(function (p) { L.push('・' + p.name + '　' + fmt(p.qty) + (isNaN(p.price) ? '' : '（単価 ' + fmt(p.price) + '円）')); });
      if (s.total) L.push('', '合計（税抜）：' + fmt(s.total) + '円');
      if (ship) L.push('納品先：' + ship);
      if (note) L.push(note);
      L.push('よろしくお願いいたします。');
      return L.filter(function (x, i) { return !(i === 0 && x === ''); }).join('\n');
    }).join('\n\n――――――――――\n\n');

    var orderCsv = [['発注日', '仕入先', '品名', '発注数', '単価', '金額(税抜)', '今の在庫', '入荷待ち', '発注点', '発注ロット']].concat(need.map(function (p) { return [iso, p.sup, p.name, p.qty, isNaN(p.price) ? '' : p.price, isNaN(p.amt) ? '' : p.amt, p.stock, p.coming, p.point, p.lot]; }));
    var allCsv = [['品名', '今の在庫', '入荷待ち', '発注点', '発注ロット', '判定', '発注数', '仕入先', '単価']].concat(rows.map(function (p) { return [p.name, p.stock, p.coming, p.point, p.lot, st(p), p.qty || '', p.sup, isNaN(p.price) ? '' : p.price]; }));

    el.innerHTML = '<div class="res-title"><h2>発注リスト</h2><p class="sub">' + esc(dateLabel) + '　「今の在庫＋入荷待ち」が発注点以下の品を、発注ロットの倍数で拾いました</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + need.length + '<small>品目</small></div><div class="lab">発注が要る品（全 ' + rows.length + ' 品目中）</div></div>' +
      '<div class="res-stat"><div class="big">' + sups.length + '<small>社</small></div><div class="lab">発注書を出す仕入先</div></div>' +
      '<div class="res-stat"><div class="big' + (grand ? '' : ' txt') + '">' + (grand ? '¥' + fmt(grand) : '単価なし') + '</div><div class="lab">' + (grand ? '発注金額の合計（税抜）' + (noPriceAll ? '・単価なし ' + noPriceAll + ' 品目を除く' : '') : '単価を入れると金額が出ます') + '</div></div></div>' +
      (need.length ? '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="print">発注書を印刷・PDF保存（' + sups.length + '社分）</button><button type="button" class="btn btn--outline btn--sm" id="copy">文面をコピー（FAX・メール用）</button><button type="button" class="btn btn--outline btn--sm" id="c1">発注リストをCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="c2">全品目の判定をCSVで保存</button></div>' +
        '<div class="sheet"><div class="sheet-head"><span class="k">Orders</span><span class="d">仕入先別の発注リスト（右の数字が発注数）</span></div>' + supHtml + '</div>'
        : '<div class="tool-card" style="margin-top:16px">発注点を割った品はありません。今日の発注は不要です。</div><div class="doc-actions"><button type="button" class="btn btn--outline btn--sm" id="c2">全品目の判定をCSVで保存</button></div>') +
      '<div class="sheet"><div class="sheet-head"><span class="k">All items</span><span class="d">全品目の判定</span></div><div class="sheet-pad">' + allTbl + '</div>' + notes + '</div>' +
      (need.length ? '<div class="sheet"><div class="sheet-head"><span class="k">Message</span><span class="d">FAX・メール用の文面（仕入先ごと）</span></div><div class="rep-text" id="msgText">' + esc(text) + '</div></div><div class="doc-wrap">' + docs + '</div>' : '') +
      '<div class="again">ほかのツール：<a href="/tools/stocktake">棚卸差異チェック</a><a href="/tools/order-summary">注文集計・出荷指示書</a><a href="/tools/invoice">請求書・見積書メーカー</a><a href="/tools/price-list">価格表メーカー</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    if (need.length) {
      $('#print').addEventListener('click', function () { T.track('tool_print', { kind: KIND }); window.print(); });
      $('#copy').addEventListener('click', function () { T.copyText(text, $('#copy'), $('#msgText')); T.track('tool_copy', { kind: KIND }); });
      $('#c1').addEventListener('click', function () { T.saveCsv('発注リスト_' + iso + '.csv', orderCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'orders' }); });
    }
    $('#c2').addEventListener('click', function () { T.saveCsv('在庫判定_' + iso + '.csv', allCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'all' }); });
    // 相談フォームに引き継ぐメモは件数だけ（仕入先名・品名は入れない）
    var memo = '【発注リスト】' + dateLabel + '\n全 ' + rows.length + ' 品目中、発注が要る品 ' + need.length + ' 品目・仕入先 ' + sups.length + ' 社' + (grand ? '\n発注金額の合計（税抜）：' + fmt(grand) + '円' : '');
    T.renderCtas($('#ctas'), {
      memo: memo, kind: KIND, memoLabel: '件数の概要をコピー', shareTitle: '発注の件数を共有する', shareDesc: '品目数・仕入先の数・合計金額だけの短いテキストです（品名や仕入先名は入りません）。発注の文面は、上の「文面をコピー（FAX・メール用）」から取れます。',
      quoteTitle: '発注を仕組みにする相談', quoteDesc: '在庫表が発注点を割ったら、仕入先別の発注書が自動でできて担当に届く仕組みを組みます。今の在庫表（Excel）のままで始められます。', quoteBtn: '相談を依頼する →',
      askExamples: '「今のExcelの在庫表のままで使える？」「発注書を仕入先に自動でメールできる？」', lineUrl: T.LINE_URL,
      extraFields: [['品目', rows.length + '品目'], ['発注が要る品', need.length + '品目'], ['仕入先', sups.length + '社']]
    });
    T.track('tool_result', { kind: KIND, items: rows.length, need: need.length, suppliers: sups.length });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
})();
