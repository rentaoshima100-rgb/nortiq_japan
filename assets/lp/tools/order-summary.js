/* /tools/order-summary — 注文集計表・出荷指示書メーカー
 * 1行に「得意先・品名・数量・単位・備考」の注文を貼ると、品目別の合計（製造・ピッキング用）と得意先別の出荷リストにまとめる。
 * 入力はブラウザの中だけで処理し、サーバーには送らない。localStorage にも置かない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;
  var KIND = 'tools-order-summary';
  function key(s) { return String(s || '').normalize('NFKC').replace(/[\s　]+/g, '').toUpperCase(); }
  function clean(s) { return String(s || '').replace(/[\s　]+/g, ' ').trim(); }
  function r3(x) { return Math.round(x * 1000) / 1000; }
  // 「20」「２０」「1,200」「20個」→ { n, unit }。数で始まらないセルは null
  function qtyCell(s) {
    var m = String(s || '').normalize('NFKC').replace(/[,，]/g, '').trim().match(/^(\d+(?:\.\d+)?)\s*(\D{0,4})$/);
    return m ? { n: Number(m[1]), unit: m[2].trim() } : null;
  }
  // 1行 → { cust, item, qty, unit, memo }。数量が読めない行は null
  function parseLine(line) {
    var c = T.splitLine(line).map(clean);
    while (c.length && c[c.length - 1] === '') c.pop();
    var qi = -1, q = null;
    for (var i = 1; i < c.length; i++) { q = qtyCell(c[i]); if (q) { qi = i; break; } }
    if (qi < 0) return null;
    var before = c.slice(0, qi).filter(function (x) { return x !== ''; });
    if (!before.length) return null;
    var after = c.slice(qi + 1), unit = q.unit, memo = [];
    after.forEach(function (x, j) {
      if (x === '') return;
      if (j === 0 && !unit && x.length <= 4 && !qtyCell(x)) { unit = x; return; }
      memo.push(x);
    });
    return { cust: before.length > 1 ? before[0] : '（得意先なし）', item: before.length > 1 ? before.slice(1).join(' ') : before[0], qty: q.n, unit: unit, memo: memo.join(' ') };
  }

  var dateEl = $('#date');
  if (!dateEl.value) dateEl.value = T.isoToday();

  function run() {
    var text = $('#orders').value, iso = dateEl.value, me = clean($('#me').value), sort = $('#sort').value;
    var lines = [], bad = [];
    text.split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var p = parseLine(line);
      if (p) lines.push(p); else bad.push({ no: i + 1, t: clean(line).slice(0, 60) });
    });
    var el = $('#result'); el.hidden = false;
    if (!lines.length) {
      el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">注文を、1行に「得意先　品名　数量　単位　備考」の形で貼ってください（数量が読めた行：0）。</div>';
      return;
    }
    // 品目別（品名＋単位が同じものを合算）と、得意先別（得意先×品名×単位を合算）
    var items = [], itemBy = {}, custs = [], custBy = {};
    lines.forEach(function (p) {
      var ik = key(p.item) + '|' + key(p.unit), ck = key(p.cust);
      var it = itemBy[ik]; if (!it) { it = itemBy[ik] = { name: p.item, unit: p.unit, total: 0, by: {}, order: [] }; items.push(it); }
      it.total = r3(it.total + p.qty);
      if (it.by[ck] == null) { it.by[ck] = 0; it.order.push(ck); }
      it.by[ck] = r3(it.by[ck] + p.qty);
      var cu = custBy[ck]; if (!cu) { cu = custBy[ck] = { name: p.cust, rows: [], rowBy: {} }; custs.push(cu); }
      var row = cu.rowBy[ik]; if (!row) { row = cu.rowBy[ik] = { name: it.name, unit: p.unit, qty: 0, memo: [] }; cu.rows.push(row); }
      row.qty = r3(row.qty + p.qty);
      if (p.memo && row.memo.indexOf(p.memo) < 0) row.memo.push(p.memo);
    });
    if (sort === 'qty') items.sort(function (a, b) { return b.total - a.total; });
    else if (sort === 'name') items.sort(function (a, b) { return a.name.localeCompare(b.name, 'ja'); });
    var nameCount = {}; items.forEach(function (it) { var k = key(it.name); nameCount[k] = (nameCount[k] || 0) + 1; });
    var mixed = items.filter(function (it) { return nameCount[key(it.name)] > 1; });
    var q = function (n, u) { return fmt(n) + (u ? ' ' + u : ''); };
    var dateLabel = T.jpDate(iso, true), head = dateLabel + ' 出荷分';
    var breakdown = function (it) { return it.order.map(function (ck) { return custBy[ck].name + ' ' + fmt(it.by[ck]); }).join('、'); };

    var totalsTbl = '<div class="tbl tbl--wrap"><table><thead><tr><th>品名</th><th class="r">合計</th><th class="r">得意先</th></tr></thead><tbody>' +
      items.map(function (it) { return '<tr><td>' + esc(it.name) + '</td><td class="r"><b>' + esc(q(it.total, it.unit)) + '</b></td><td class="r">' + it.order.length + '件</td></tr>'; }).join('') + '</tbody></table></div>';
    var custHtml = custs.map(function (cu) {
      return '<div class="grp"><div class="grp__h"><span>' + esc(cu.name) + '</span><small>' + cu.rows.length + '品目</small></div><ul>' +
        cu.rows.map(function (r) { return '<li><span>' + esc(r.name) + (r.memo.length ? ' <small style="color:var(--text-3)">（' + esc(r.memo.join('／')) + '）</small>' : '') + '</span><span class="qty">' + esc(q(r.qty, r.unit)) + '</span></li>'; }).join('') + '</ul></div>';
    }).join('');
    var notes = '';
    if (mixed.length) notes += '<div class="note-red"><b>同じ品名で単位が違う行があります</b>' + esc(mixed.map(function (it) { return it.name + '（' + (it.unit || '単位なし') + '）'; }).join('、')) + '。単位ごとに別の行で集計しています。</div>';
    if (bad.length) notes += '<div class="note-red"><b>数量が読めなかった行（' + bad.length + '行・集計に入っていません）</b>' + bad.slice(0, 10).map(function (b) { return esc(b.no + '行目：' + b.t); }).join('<br>') + (bad.length > 10 ? '<br>ほか ' + (bad.length - 10) + '行' : '') + '</div>';

    var meta = esc(head) + (me ? '　' + esc(me) : '') + '　作成：' + T.today();
    var doc1 = '<div class="doc" id="doc1"><h2 class="doc-title">出荷指示書</h2><p class="doc-meta">' + meta + '</p><p class="doc-subject">品目別の合計（注文 ' + lines.length + '行・得意先 ' + custs.length + '件・' + items.length + '品目）</p>' +
      '<table><colgroup><col style="width:7%"><col style="width:27%"><col style="width:16%"><col><col style="width:9%"></colgroup><thead><tr><th>No.</th><th>品名</th><th>合計</th><th>内訳（得意先・数量）</th><th>確認</th></tr></thead><tbody>' +
      items.map(function (it, i) { return '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(it.name) + '</td><td class="num"><b>' + esc(q(it.total, it.unit)) + '</b></td><td>' + esc(breakdown(it)) + '</td><td>&nbsp;</td></tr>'; }).join('') + '</tbody></table></div>';
    var doc2 = '<div class="doc" id="doc2"><h2 class="doc-title">出荷リスト</h2><p class="doc-meta">' + meta + '</p><p class="doc-subject">得意先別（' + custs.length + '件）　出したら □ に印を付けてください</p>' +
      custs.map(function (cu) {
        return '<div class="ord-blk"><p class="doc-h3">' + esc(cu.name) + '　様　<small>' + cu.rows.length + '品目</small></p><table><colgroup><col style="width:7%"><col><col style="width:18%"><col style="width:32%"></colgroup><thead><tr><th>済</th><th>品名</th><th>数量</th><th>備考</th></tr></thead><tbody>' +
          cu.rows.map(function (r) { return '<tr><td class="c"><span class="box"></span></td><td>' + esc(r.name) + '</td><td class="num">' + esc(q(r.qty, r.unit)) + '</td><td>' + esc(r.memo.join('／')) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }).join('') + '</div>';

    el.innerHTML = '<div class="res-title"><h2>注文集計</h2><p class="sub">' + esc(head) + '　品名と単位が同じ注文を合算。全角・半角と空白の違いは同じ品として扱います</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + lines.length + '<small>行</small></div><div class="lab">読み取った注文</div></div>' +
      '<div class="res-stat"><div class="big">' + custs.length + '<small>件</small></div><div class="lab">得意先</div></div>' +
      '<div class="res-stat"><div class="big">' + items.length + '<small>品目</small></div><div class="lab">品目（品名＋単位）</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="p1">出荷指示書（品目別）を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="p2">出荷リスト（得意先別）を印刷・PDF保存</button>' +
      '<button type="button" class="btn btn--outline btn--sm" id="c1">集計をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="c2">得意先別の明細をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">集計をコピー（LINE・メール用）</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Totals</span><span class="d">品目別の合計（作る数・そろえる数）</span></div><div style="padding:0 clamp(12px,3vw,20px) 14px">' + totalsTbl + '</div>' + notes + '</div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">By customer</span><span class="d">得意先別の出荷リスト</span></div>' + custHtml + '</div>' +
      '<div class="doc-wrap" hidden>' + doc1 + doc2 + '</div>' +
      '<div class="again">ほかのツール：<a href="/tools/address-list">宛先リスト整形（送り状用CSV）</a><a href="/tools/invoice">納品書・請求書メーカー</a><a href="/tools/stocktake">棚卸差異チェック</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    var totalsCsv = [['出荷日', '品名', '単位', '合計数量', '得意先数', '内訳']].concat(items.map(function (it) { return [iso, it.name, it.unit, it.total, it.order.length, breakdown(it)]; }));
    var detailCsv = [['出荷日', '得意先', '品名', '数量', '単位', '備考']];
    custs.forEach(function (cu) { cu.rows.forEach(function (r) { detailCsv.push([iso, cu.name, r.name, r.qty, r.unit, r.memo.join('／')]); }); });
    var memoHead = '【注文集計】' + head + '　注文' + lines.length + '行・得意先' + custs.length + '件・' + items.length + '品目';
    var itemLines = items.map(function (it) { return '・' + it.name + '：' + q(it.total, it.unit) + '（' + it.order.length + '件）'; });
    var full = [memoHead, '', '■ 品目別の合計'].concat(itemLines, ['', '■ 得意先別']);
    custs.forEach(function (cu) {
      full.push('◎ ' + cu.name);
      cu.rows.forEach(function (r) { full.push('　' + r.name + ' ' + q(r.qty, r.unit) + (r.memo.length ? '（' + r.memo.join('／') + '）' : '')); });
    });
    var fullText = full.join('\n');
    var print = function (id) {
      var wrap = $('.doc-wrap');
      ['doc1', 'doc2'].forEach(function (d) { $('#' + d).classList.toggle('print-target', d === id); });
      wrap.hidden = false; T.track('tool_print', { kind: KIND, doc: id }); window.print();
      setTimeout(function () { wrap.hidden = true; }, 500);
    };
    $('#p1').addEventListener('click', function () { print('doc1'); });
    $('#p2').addEventListener('click', function () { print('doc2'); });
    $('#c1').addEventListener('click', function () { T.saveCsv('注文集計_' + iso + '.csv', totalsCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'totals' }); });
    $('#c2').addEventListener('click', function () { T.saveCsv('出荷明細_' + iso + '.csv', detailCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'detail' }); });
    $('#copy').addEventListener('click', function () { T.copyText(fullText, $('#copy')); T.track('tool_copy', { kind: KIND }); });
    // 相談フォームに引き継ぐメモは件数と品目別の合計だけ（得意先名は入れない）
    T.renderCtas($('#ctas'), {
      memo: [memoHead, ''].concat(itemLines).join('\n'), kind: KIND, memoLabel: '品目別の合計をコピー',
      shareTitle: '集計を製造・倉庫の担当に共有する', shareDesc: '品目別の合計です。得意先別まで入った文面は、上の「集計をコピー」から取れます。',
      quoteTitle: '注文の入力を自動にする相談', quoteDesc: 'FAX注文書・メール・LINEで届く注文を読み取り、この集計表と出荷リストまで自動で出す仕組みを組みます。',
      quoteBtn: '相談を依頼する →', askExamples: '「うちのFAX注文書でも読み取れる？」「販売管理ソフトに入れるCSVにできる？」', lineUrl: T.LINE_URL,
      extraFields: [['注文', lines.length + '行'], ['得意先', custs.length + '件'], ['品目', items.length + '品目']]
    });
    T.track('tool_result', { kind: KIND, lines: lines.length, customers: custs.length, items: items.length });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
})();
