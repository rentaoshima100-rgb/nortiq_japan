/* /tools/work-days — 出面表メーカー
 * 1行に「日付・氏名・現場・人工」を貼ると、対象の月の出面表（人×日）と現場別の人工集計を作る。
 * 同じ日・人・現場は合算。単価（1人工あたり・全員共通）を入れると 人工×単価 の金額も出す。税や手当は計算しない。
 * 入力はブラウザの中だけで処理し、サーバーには送らない。localStorage にも置かない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;
  var KIND = 'tools-work-days', DOW = '日月火水木金土', NO_SITE = '（現場なし）';
  function key(s) { return String(s || '').normalize('NFKC').replace(/[\s　]+/g, '').toUpperCase(); }
  function clean(s) { return String(s || '').replace(/[\s　]+/g, ' ').trim(); }
  function r2(x) { return Math.round(x * 100) / 100; }
  function nk(x) { return String(r2(x)); }

  // 日付セル → { y, m, d }（y・m は書かれていなければ null）。読めなければ null
  function dateCell(s) {
    var t = String(s || '').normalize('NFKC').replace(/\s/g, '').replace(/\([月火水木金土日]\)$/, '');
    var m = t.match(/^(\d{4})[-\/.年](\d{1,2})[-\/.月](\d{1,2})日?$/);
    if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
    m = t.match(/^(\d{1,2})[\/.月](\d{1,2})日?$/);
    if (m) return { y: null, m: Number(m[1]), d: Number(m[2]) };
    m = t.match(/^(\d{1,2})日?$/);
    if (m) return { y: null, m: null, d: Number(m[1]) };
    return null;
  }
  function parseLine(line, Y, M, last) {
    var c = T.splitLine(line).map(clean);
    if (c.filter(function (x) { return x !== ''; }).length < 3) c = clean(line).split(' ');
    var dt = dateCell(c[0]);
    if (!dt) return { err: '日付が読めません' };
    if (!c[1]) return { err: '氏名がありません' };
    if ((dt.y != null && dt.y !== Y) || (dt.m != null && dt.m !== M) || dt.d < 1 || dt.d > last) return { err: '対象の月に無い日付です' };
    var n = 1;
    if (c[3] != null && c[3] !== '') { n = T.num(String(c[3]).replace(/人工|人$/g, '')); if (isNaN(n) || n <= 0 || n > 9) return { err: '人工が読めません' }; }
    return { d: dt.d, name: c[1], site: c[2] || NO_SITE, n: n };
  }

  var ymEl = $('#ym');
  if (!ymEl.value) ymEl.value = T.isoToday().slice(0, 7);

  function run() {
    var ym = (ymEl.value || T.isoToday().slice(0, 7)).split('-'), Y = Number(ym[0]), M = Number(ym[1]);
    var last = new Date(Y, M, 0).getDate(), me = clean($('#me').value);
    var rate = Math.max(0, Math.round(Number($('#rate').value) || 0));
    var people = [], pBy = {}, sites = [], sBy = {}, bad = [], count = 0;
    $('#logs').value.split(/\r?\n/).forEach(function (line, no) {
      if (!line.trim()) return;
      var r = parseLine(line, Y, M, last);
      if (r.err) { bad.push({ no: no + 1, t: clean(line).slice(0, 50), why: r.err }); return; }
      var pk = key(r.name), sk = key(r.site), p = pBy[pk], s = sBy[sk];
      if (!p) { p = pBy[pk] = { name: r.name, days: {}, total: 0 }; people.push(p); }
      if (!s) { s = sBy[sk] = { name: r.site, by: {}, order: [], total: 0 }; sites.push(s); }
      p.days[r.d] = r2((p.days[r.d] || 0) + r.n); p.total = r2(p.total + r.n);
      if (s.by[pk] == null) { s.by[pk] = 0; s.order.push(pk); }
      s.by[pk] = r2(s.by[pk] + r.n); s.total = r2(s.total + r.n); count++;
    });
    var el = $('#result'); el.hidden = false;
    if (!people.length) {
      el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">日報の内容を、1行に「日付　氏名　現場　人工」の形で貼ってください（読めた行：0）。' + (bad.length ? '<br>' + esc(bad[0].no + '行目：' + bad[0].why + '。対象の月が合っているかも確認してください。') : '') + '</div>';
      return;
    }
    var grand = r2(people.reduce(function (a, p) { return a + p.total; }, 0));
    var dayTot = {}, over = [];
    people.forEach(function (p) {
      p.nDays = Object.keys(p.days).length;
      Object.keys(p.days).forEach(function (d) { dayTot[d] = r2((dayTot[d] || 0) + p.days[d]); if (p.days[d] > 1) over.push(p.name + ' ' + M + '/' + d + '（' + nk(p.days[d]) + '）'); });
    });
    var yen = function (n) { return '¥' + fmt(Math.round(n * rate)); };
    var title = Y + '年' + M + '月', days = []; for (var d = 1; d <= last; d++) days.push(d);
    var dw = function (d) { return DOW.charAt(new Date(Y, M - 1, d).getDay()); };

    var grid = '<div class="tbl tbl--days"><table><thead><tr><th>氏名</th><th class="r">合計</th>' + days.map(function (d) { return '<th class="c">' + d + '<br><small>' + dw(d) + '</small></th>'; }).join('') + '</tr></thead><tbody>' +
      people.map(function (p) { return '<tr><td><b>' + esc(p.name) + '</b></td><td class="r"><b>' + nk(p.total) + '</b></td>' + days.map(function (d) { return '<td class="c">' + (p.days[d] ? nk(p.days[d]) : '') + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr><td><b>計</b></td><td class="r"><b>' + nk(grand) + '</b></td>' + days.map(function (d) { return '<td class="c">' + (dayTot[d] ? nk(dayTot[d]) : '') + '</td>'; }).join('') + '</tr>' +
      '</tbody></table><div class="tbl-hint">表は横にスクロールできます（1日〜' + last + '日）</div></div>';
    var siteHtml = sites.map(function (s) {
      return '<div class="grp"><div class="grp__h"><span>' + esc(s.name) + '</span><small>' + nk(s.total) + ' 人工' + (rate ? '・' + yen(s.total) : '') + '</small></div><ul>' +
        s.order.map(function (pk) { return '<li><span>' + esc(pBy[pk].name) + '</span><span class="qty">' + nk(s.by[pk]) + '</span></li>'; }).join('') + '</ul></div>';
    }).join('');
    var pplHtml = '<div class="tbl"><table><thead><tr><th>氏名</th><th class="r">人工</th><th class="r">' + (rate ? '金額' : '日数') + '</th></tr></thead><tbody>' +
      people.map(function (p) { return '<tr><td>' + esc(p.name) + (rate ? ' <small style="color:var(--text-3)">' + p.nDays + '日</small>' : '') + '</td><td class="r"><b>' + nk(p.total) + '</b></td><td class="r">' + (rate ? yen(p.total) : p.nDays + '日') + '</td></tr>'; }).join('') +
      '<tr><td><b>合計</b></td><td class="r"><b>' + nk(grand) + '</b></td><td class="r">' + (rate ? '<b>' + yen(grand) + '</b>' : '') + '</td></tr></tbody></table></div>';
    var notes = '';
    if (over.length) notes += '<div class="note-red"><b>1日の合計が1人工を超える人・日（' + over.length + '件）</b>' + esc(over.slice(0, 12).join('、')) + (over.length > 12 ? ' ほか' : '') + '<br><span style="font-weight:400">残業を1.25人工などと数えている場合はそのままで構いません。二重に貼っていないか確認してください。</span></div>';
    if (bad.length) notes += '<div class="note-red"><b>集計に入れなかった行（' + bad.length + '行）</b>' + bad.slice(0, 10).map(function (b) { return esc(b.no + '行目：' + b.t + '（' + b.why + '）'); }).join('<br>') + (bad.length > 10 ? '<br>ほか ' + (bad.length - 10) + '行' : '') + '</div>';

    var meta = esc(title) + (me ? '　' + esc(me) : '') + '　作成：' + T.today();
    var doc1 = '<div class="doc doc--land" id="doc1"><h2 class="doc-title">出面表</h2><p class="doc-meta">' + meta + '</p>' +
      '<table class="wd-grid"><colgroup><col class="c-n">' + days.map(function () { return '<col>'; }).join('') + '<col class="c-s"><col class="c-s"></colgroup><thead><tr><th>氏名</th>' + days.map(function (d) { return '<th>' + d + '<br>' + dw(d) + '</th>'; }).join('') + '<th>合計</th><th>日数</th></tr></thead><tbody>' +
      people.map(function (p) { return '<tr><td>' + esc(p.name) + '</td>' + days.map(function (d) { return '<td class="c">' + (p.days[d] ? nk(p.days[d]) : '') + '</td>'; }).join('') + '<td class="num"><b>' + nk(p.total) + '</b></td><td class="num">' + p.nDays + '</td></tr>'; }).join('') +
      '<tr><th>計</th>' + days.map(function (d) { return '<td class="c">' + (dayTot[d] ? nk(dayTot[d]) : '') + '</td>'; }).join('') + '<td class="num"><b>' + nk(grand) + '</b></td><td></td></tr></tbody></table>' +
      '<p style="font-size:11px;margin:0">数字は人工。' + (rate ? '1人工 ' + fmt(rate) + '円で計算した合計：' + yen(grand) + '（税・手当は含みません）。' : '') + '</p>' +
      '<table class="rep-seal"><tbody><tr><th>確認</th><th>承認</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table></div>';
    var doc2 = '<div class="doc" id="doc2"><h2 class="doc-title" style="letter-spacing:.2em">現場別 人工集計表</h2><p class="doc-meta">' + meta + '</p>' +
      '<table class="wd-site"><colgroup><col><col class="c-p"><col class="c-q"><col class="c-a"></colgroup><thead><tr><th>現場</th><th>氏名</th><th>人工</th><th>' + (rate ? '金額' : '備考') + '</th></tr></thead><tbody>' +
      sites.map(function (s) {
        return s.order.map(function (pk, i) { return '<tr>' + (i === 0 ? '<td rowspan="' + (s.order.length + 1) + '"><b>' + esc(s.name) + '</b></td>' : '') + '<td>' + esc(pBy[pk].name) + '</td><td class="num">' + nk(s.by[pk]) + '</td><td class="num">' + (rate ? fmt(Math.round(s.by[pk] * rate)) : '') + '</td></tr>'; }).join('') +
          '<tr><th>小計</th><td class="num"><b>' + nk(s.total) + '</b></td><td class="num"><b>' + (rate ? fmt(Math.round(s.total * rate)) : '') + '</b></td></tr>';
      }).join('') +
      '<tr><th colspan="2">合計</th><td class="num"><b>' + nk(grand) + '</b></td><td class="num"><b>' + (rate ? fmt(Math.round(grand * rate)) : '') + '</b></td></tr></tbody></table>' +
      '<p style="font-size:11px;margin:0">' + (rate ? '金額は 人工 × ' + fmt(rate) + '円（税・手当は含みません）。単位：円' : '単位：人工') + '</p></div>';

    var L = ['【出面】' + title + (me ? '　' + me : ''), '合計 ' + nk(grand) + ' 人工（' + people.length + '人・' + sites.length + '現場）' + (rate ? '　' + fmt(Math.round(grand * rate)) + '円（1人工 ' + fmt(rate) + '円）' : ''), '', '■現場別'];
    sites.forEach(function (s) { L.push('・' + s.name + '：' + nk(s.total) + ' 人工（' + s.order.map(function (pk) { return pBy[pk].name + ' ' + nk(s.by[pk]); }).join('、') + '）'); });
    L.push('', '■人別');
    people.forEach(function (p) { L.push('・' + p.name + '：' + nk(p.total) + ' 人工（' + p.nDays + '日）'); });
    var text = L.join('\n');
    var gridCsv = [['氏名'].concat(days.map(function (d) { return M + '/' + d; }), ['合計人工', '出勤日数'], rate ? ['金額'] : [])].concat(
      people.map(function (p) { return [p.name].concat(days.map(function (d) { return p.days[d] || ''; }), [p.total, p.nDays], rate ? [Math.round(p.total * rate)] : []); }),
      [['計'].concat(days.map(function (d) { return dayTot[d] || ''; }), [grand, ''], rate ? [Math.round(grand * rate)] : [])]);
    var siteCsv = [['年月', '現場', '氏名', '人工'].concat(rate ? ['単価', '金額'] : [])];
    sites.forEach(function (s) { s.order.forEach(function (pk) { siteCsv.push([Y + '-' + String(M).padStart(2, '0'), s.name, pBy[pk].name, s.by[pk]].concat(rate ? [rate, Math.round(s.by[pk] * rate)] : [])); }); });
    var tag = Y + '-' + String(M).padStart(2, '0');

    el.innerHTML = '<div class="res-title"><h2>出面表ができました</h2><p class="sub">' + esc(title) + '　同じ日・同じ人・同じ現場の行は合算しています</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + nk(grand) + '<small>人工</small></div><div class="lab">' + M + '月の合計（読んだ行 ' + count + '）</div></div>' +
      '<div class="res-stat"><div class="big">' + people.length + '<small>人</small></div><div class="lab">人数（' + sites.length + ' 現場）</div></div>' +
      '<div class="res-stat"><div class="big' + (rate ? '' : ' txt') + '">' + (rate ? yen(grand) : '単価なし') + '</div><div class="lab">' + (rate ? '人工 × ' + fmt(rate) + '円の合計' : '単価を入れると金額が出ます') + '</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="p1">出面表を印刷・PDF保存（A4横）</button><button type="button" class="btn btn--outline btn--sm" id="p2">現場別の集計表を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="c1">出面表をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="c2">現場別の集計をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">集計をコピー（報告用）</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Work days</span><span class="d">出面表（' + esc(title) + '・数字は人工）</span></div><div class="sheet-pad">' + grid + '</div>' + notes + '</div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">By person</span><span class="d">人ごとの合計</span></div><div class="sheet-pad">' + pplHtml + '</div></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">By site</span><span class="d">現場別の人工（右の数字が人工）</span></div>' + siteHtml + '</div>' +
      '<div class="doc-wrap" hidden>' + doc1 + doc2 + '</div>' +
      '<div class="again">ほかのツール：<a href="/tools/daily-report">作業日報メーカー</a><a href="/tools/timecard">タイムカード集計</a><a href="/tools/shift-table">シフト表メーカー</a><a href="/tools/invoice">請求書・見積書メーカー</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    var print = function (id) {
      var wrap = $('.doc-wrap');
      ['doc1', 'doc2'].forEach(function (x) { $('#' + x).classList.toggle('print-target', x === id); });
      // 出面表（doc1）だけ A4 横で印刷する（tools.css の html.print-land）
      document.documentElement.classList.toggle('print-land', id === 'doc1');
      wrap.hidden = false; T.track('tool_print', { kind: KIND, doc: id }); window.print();
      setTimeout(function () { wrap.hidden = true; document.documentElement.classList.remove('print-land'); }, 500);
    };
    $('#p1').addEventListener('click', function () { print('doc1'); });
    $('#p2').addEventListener('click', function () { print('doc2'); });
    $('#c1').addEventListener('click', function () { T.saveCsv('出面表_' + tag + '.csv', gridCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'grid' }); });
    $('#c2').addEventListener('click', function () { T.saveCsv('現場別人工_' + tag + '.csv', siteCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'site' }); });
    $('#copy').addEventListener('click', function () { T.copyText(text, $('#copy')); T.track('tool_copy', { kind: KIND }); });
    // 相談フォームに引き継ぐメモは件数と合計だけ（氏名・現場名は入れない）
    var memo = '【出面】' + title + '\n合計 ' + nk(grand) + ' 人工（' + people.length + '人・' + sites.length + '現場・' + count + '行）' + (rate ? '\n人工 × ' + fmt(rate) + '円：' + fmt(Math.round(grand * rate)) + '円' : '');
    T.renderCtas($('#ctas'), {
      memo: memo, kind: KIND, memoLabel: '合計の概要をコピー', shareTitle: '今月の人工の合計を共有する', shareDesc: '合計の人工と人数・現場の数だけの短いテキストです（氏名や現場名は入りません）。現場別・人別の内訳は、上の「集計をコピー（報告用）」から取れます。',
      quoteTitle: '日報の集計を仕組みにする相談', quoteDesc: '現場からスマホで出した日報を自動でためて、月末に出面表と現場別の人工が出る仕組みを組みます。今の日報の様式のままで始められます。', quoteBtn: '相談を依頼する →',
      askExamples: '「LINEで届く日報から出面表を作れる？」「人ごとに単価を変えて集計できる？」', lineUrl: T.LINE_URL,
      extraFields: [['合計', nk(grand) + '人工'], ['人数', people.length + '人'], ['現場', sites.length + '件']]
    });
    T.track('tool_result', { kind: KIND, people: people.length, sites: sites.length, lines: count });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
})();
