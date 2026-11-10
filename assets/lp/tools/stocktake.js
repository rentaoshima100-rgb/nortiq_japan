/* /tools/stocktake — 棚卸差異チェック
 * 帳簿一覧（品番・品名・数量・単価）と実地一覧（品番・数量）を品番（無ければ品名）で突き合わせ、差異表と棚卸表（カウントシート）を出す。
 * 入力はブラウザの中だけで処理し、サーバーには送らない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;
  function num(s) { var m = String(s || '').normalize('NFKC').replace(/[,，円¥￥\s]/g, '').match(/^-?\d+(\.\d+)?$/); return m ? Number(m[0]) : NaN; }
  function key(s) { return String(s || '').normalize('NFKC').replace(/\s+/g, '').toUpperCase(); }
  // タブ区切り（Excel からのコピー）はタブだけで切る。カンマ区切りは「1,200」のような桁区切り（数字3桁の組）を先に守ってから切る。
  function split(line) {
    if (line.indexOf('\t') >= 0) return line.split('\t').map(function (c) { return c.replace(/^"|"$/g, '').trim(); });
    var kept = line.replace(/"([^"]*)"/g, function (m, q) { return q.replace(/,/g, '\u0001'); })
      .replace(/(^|[^\d\/\-.])(\d{1,3}(?:,\d{3})+)(?!\d)/g, function (m, pre, n) { return pre + n.replace(/,/g, '\u0001'); });
    return kept.split(/,|、|\s{2,}/).map(function (c) { return c.replace(/\u0001/g, ',').trim(); });
  }
  // 列の推定: 数値の列を後ろから「単価」「数量」、文字の列を前から「品番」「品名」
  function parse(txt, withPrice) {
    var out = [];
    txt.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var c = split(line).filter(function (x) { return x !== ''; }); if (c.length < 2) return;
      var nums = [], strs = [];
      c.forEach(function (x) { if (!isNaN(num(x))) nums.push(num(x)); else strs.push(x); });
      if (!nums.length || !strs.length) return;
      var qty = withPrice && nums.length >= 2 ? nums[nums.length - 2] : nums[0], price = withPrice && nums.length >= 2 ? nums[nums.length - 1] : NaN;
      out.push({ code: strs[0], name: strs.length > 1 ? strs.slice(1).join(' ') : '', qty: qty, price: price, key: key(strs[0]) });
    });
    return out;
  }
  if (!$('#date').value) { var d0 = new Date(); $('#date').value = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0'); }
  function jpDate(iso) { var p = (iso || '').split('-'); return p.length === 3 ? Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日' : iso; }
  function label() { return jpDate($('#date').value) + ($('#place').value.trim() ? '　' + $('#place').value.trim() : ''); }

  function countSheet() {
    var book = parse($('#book').value, true);
    var el = $('#result'); el.hidden = false;
    if (!book.length) { el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">帳簿の在庫一覧を「品番　品名　数量」の形で貼ってください。</div>'; return; }
    el.innerHTML = '<div class="res-title"><h2>棚卸表（数える用）</h2><p class="sub">帳簿数は印字しません。印刷して現場で数え、数えた数を Step 2 に貼ってください</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + book.length + '<small>品目</small></div><div class="lab">棚卸表に載せる品目</div></div><div class="res-stat"><div class="big">' + Math.ceil(book.length / 28) + '<small>枚</small></div><div class="lab">A4の目安（28行／枚）</div></div><div class="res-stat"><div class="big txt">' + esc(label()) + '</div><div class="lab">棚卸日・場所</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="print">棚卸表を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="csv">棚卸表をCSVで保存（実地数の列が空）</button></div>' +
      '<div class="doc-wrap"><div class="doc print-target" id="doc"><h2 class="doc-title">棚卸表</h2><p class="doc-meta">' + esc(label()) + '　　担当：＿＿＿＿＿＿　確認：＿＿＿＿＿＿</p>' +
      '<table><colgroup><col style="width:8%"><col style="width:20%"><col><col style="width:16%"><col style="width:22%"></colgroup><thead><tr><th>No.</th><th>品番</th><th>品名</th><th>実地数</th><th>メモ</th></tr></thead><tbody>' +
      book.map(function (b, i) { return '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(b.code) + '</td><td>' + esc(b.name) + '</td><td>&nbsp;</td><td>&nbsp;</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="ctas" id="ctas"></div>';
    var csv = [['No.', '品番', '品名', '実地数', 'メモ']].concat(book.map(function (b, i) { return [i + 1, b.code, b.name, '', '']; })).map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    $('#print').addEventListener('click', function () { T.track('tool_print', { kind: 'tools-stocktake' }); window.print(); });
    $('#csv').addEventListener('click', function () { T.download('棚卸表_' + $('#date').value + '.csv', '﻿' + csv, 'text/csv;charset=utf-8'); });
    T.renderCtas($('#ctas'), ctaOpts('棚卸表 ' + label() + '：' + book.length + '品目', [['品目', book.length + '品目']]));
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function ctaOpts(memo, extra) {
    return { memo: memo, kind: 'tools-stocktake', memoLabel: '結果をコピー', shareTitle: '差異の一覧を現場・経理に共有する', shareDesc: '差の大きい順の一覧です。数え直しの指示や経理への報告にそのまま貼れます。',
      quoteTitle: '実地数の取り込みを自動にする相談', quoteDesc: 'バーコード・QRをスマホで読んで実地数を入れ、在庫システムと自動で突き合わせる仕組みを月額で組みます。', quoteBtn: '相談を依頼する →', askExamples: '「うちの在庫管理ソフトの一覧でも読める？」「ロット・倉庫別でも照合できる？」', lineUrl: T.LINE_URL, extraFields: extra };
  }

  function run() {
    var book = parse($('#book').value, true), real = parse($('#real').value, false);
    var el = $('#result'); el.hidden = false;
    if (!book.length || !real.length) { el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">帳簿一覧と実地一覧を、1行に「品番　品名　数量」「品番　数量」の形で貼ってください（読み取れた行：帳簿 ' + book.length + '・実地 ' + real.length + '）。</div>'; return; }
    var hasPrice = book.some(function (b) { return !isNaN(b.price); });
    var byKey = {}; real.forEach(function (r) { byKey[r.key] = (byKey[r.key] || 0) + r.qty; });
    var byName = {}; real.forEach(function (r) { if (r.name) byName[key(r.name)] = (byName[key(r.name)] || 0) + r.qty; });
    var usedKeys = {};
    var rows = book.map(function (b) {
      var k = b.key, q = byKey[k];
      if (q == null && b.name && byKey[key(b.name)] != null) { k = key(b.name); q = byKey[k]; }
      if (q == null && byName[k] != null) { q = byName[k]; usedKeys[k] = true; }
      if (q != null) usedKeys[k] = true;
      var diff = q == null ? -b.qty : q - b.qty;
      return { code: b.code, name: b.name, book: b.qty, real: q == null ? null : q, diff: diff, amt: !isNaN(b.price) ? diff * b.price : null, st: q == null ? '実地なし' : diff === 0 ? '一致' : diff > 0 ? '実地が多い' : '実地が少ない' };
    });
    real.forEach(function (r) { if (!usedKeys[r.key] && !usedKeys[key(r.name)]) { rows.push({ code: r.code, name: r.name, book: 0, real: r.qty, diff: r.qty, amt: null, st: '帳簿なし' }); usedKeys[r.key] = true; } });
    rows.sort(function (a, b) { var ka = a.amt != null ? Math.abs(a.amt) : Math.abs(a.diff) * 1e9, kb = b.amt != null ? Math.abs(b.amt) : Math.abs(b.diff) * 1e9; return hasPrice ? kb - ka : Math.abs(b.diff) - Math.abs(a.diff); });
    var diffRows = rows.filter(function (r) { return r.diff !== 0; }), ok = rows.length - diffRows.length;
    var amtTotal = rows.reduce(function (a, r) { return a + (r.amt || 0); }, 0), amtAbs = rows.reduce(function (a, r) { return a + Math.abs(r.amt || 0); }, 0);
    var rate = rows.length ? Math.round(ok / rows.length * 1000) / 10 : 0;
    var title = '棚卸差異表　' + label();
    var tr = function (r, warnCls) { return '<tr><td class="st' + (warnCls && r.diff !== 0 ? ' warn' : '') + '">' + esc(r.st) + '</td><td>' + esc(r.code) + (r.name ? '<br><small>' + esc(r.name) + '</small>' : '') + '</td><td class="num">' + fmt(r.book) + '</td><td class="num">' + (r.real == null ? '—' : fmt(r.real)) + '</td><td class="num">' + (r.diff > 0 ? '+' : '') + fmt(r.diff) + '</td><td class="num">' + (r.amt == null ? '—' : (r.amt > 0 ? '+' : '') + fmt(r.amt)) + '</td></tr>'; };
    var head = '<tr><th>判定</th><th>品番・品名</th><th>帳簿</th><th>実地</th><th>差</th><th>金額差</th></tr>';
    el.innerHTML = '<div class="res-title"><h2>棚卸差異表</h2><p class="sub">' + esc(label()) + '　差の大きい順。＋は実地が多い、−は実地が少ない' + (hasPrice ? '。金額差＝単価×差' : '。単価を入れると金額差も出ます') + '</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + diffRows.length + '<small>/' + rows.length + '品目</small></div><div class="lab">差異のある品目（一致率 ' + rate + '%）</div></div>' +
      '<div class="res-stat"><div class="big">' + (hasPrice ? (amtTotal > 0 ? '+' : '') + '¥' + fmt(amtTotal) : fmt(diffRows.reduce(function (a, r) { return a + r.diff; }, 0))) + '</div><div class="lab">' + (hasPrice ? '金額差の合計（絶対値 ¥' + fmt(amtAbs) + '）' : '数量差の合計') + '</div></div>' +
      '<div class="res-stat"><div class="big">' + rows.filter(function (r) { return r.st === '帳簿なし'; }).length + '<small>件</small></div><div class="lab">帳簿にない品（実地だけにある）</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="csv">差異表をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="print">差異表を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">差異の一覧をコピー</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Variance</span><span class="d">' + esc(title) + '</span></div>' +
      '<div class="tbl tbl--wide"><table><thead>' + head + '</thead><tbody>' + rows.map(function (r) { return tr(r, true); }).join('') + '</tbody></table><div class="tbl-hint">← 横にスクロールできます →</div></div>' +
      '<div class="note-red"><b>数え直す順番</b>金額差（なければ数量差）の大きい品から数え直してください。「実地なし」は数え漏れか品番の表記ゆれ、「帳簿なし」は帳簿の登録漏れか品番違いの可能性があります。</div></div>' +
      '<div class="doc-wrap" hidden><div class="doc print-target" id="doc"><h2 class="doc-title">棚卸差異表</h2><p class="doc-meta">' + esc(label()) + '　作成日：' + T.today() + '　差異 ' + diffRows.length + '/' + rows.length + '品目' + (hasPrice ? '　金額差 ' + (amtTotal > 0 ? '+' : '') + fmt(amtTotal) + '円' : '') + '</p>' +
      '<table><thead>' + head + '</thead><tbody>' + rows.map(function (r) { return tr(r, false); }).join('') + '</tbody></table></div></div>' +
      '<div class="again">ほかのツール：<a href="/tools/reorder-list">発注リストメーカー</a><a href="/tools/payment-match">入金消し込み照合</a><a href="/tools/invoice">請求書・見積書メーカー</a><a href="/tools/order-summary">注文集計・出荷指示書</a></div>' +
      '<div class="ctas" id="ctas"></div>';
    var csv = [['判定', '品番', '品名', '帳簿数', '実地数', '差', '金額差']].concat(rows.map(function (r) { return [r.st, r.code, r.name, r.book, r.real == null ? '' : r.real, r.diff, r.amt == null ? '' : r.amt]; })).map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var memo = ['【' + title + '】' + T.today(), '品目 ' + rows.length + '／差異 ' + diffRows.length + '（一致率 ' + rate + '%）' + (hasPrice ? '／金額差 ' + (amtTotal > 0 ? '+' : '') + fmt(amtTotal) + '円' : ''), '', '■ 差異のある品（差の大きい順）']
      .concat(diffRows.length ? diffRows.map(function (r) { return '・' + r.code + (r.name ? ' ' + r.name : '') + '：帳簿 ' + fmt(r.book) + ' → 実地 ' + (r.real == null ? 'なし' : fmt(r.real)) + '（' + (r.diff > 0 ? '+' : '') + fmt(r.diff) + (r.amt != null ? '・' + (r.amt > 0 ? '+' : '') + fmt(r.amt) + '円' : '') + '）' + r.st; }) : ['なし']).join('\n');
    $('#csv').addEventListener('click', function () { T.download('棚卸差異_' + $('#date').value + '.csv', '﻿' + csv, 'text/csv;charset=utf-8'); T.track('tool_download', { kind: 'tools-stocktake' }); });
    $('#print').addEventListener('click', function () { $('.doc-wrap').hidden = false; T.track('tool_print', { kind: 'tools-stocktake' }); window.print(); setTimeout(function () { $('.doc-wrap').hidden = true; }, 500); });
    $('#copy').addEventListener('click', function () { T.copyText(memo, $('#copy')); });
    T.renderCtas($('#ctas'), ctaOpts(memo, [['品目', rows.length + '品目'], ['差異', diffRows.length + '品目'], ['金額差', hasPrice ? fmt(amtTotal) + '円' : '—']]));
    T.track('tool_result', { kind: 'tools-stocktake', items: rows.length, diff: diffRows.length });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
  $('#sheet').addEventListener('click', countSheet);
})();
