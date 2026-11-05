/* /tools/booking-sheet — 予約表メーカー
 * 1行1件の予約（開始時刻・所要時間または終了時刻・お客様名・内容・担当）を読み、
 * 時間順の一覧・担当ごとの空き時間・時間割（行＝コマ、列＝担当）を作る。同じ担当の重なりと営業時間外に印を付ける。
 * 入力はブラウザの中だけで処理し、サーバーには送らない。保存もしない（CSV・印刷で残す）。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc;
  var NONE = '担当なし';

  function nk(s) { return String(s == null ? '' : s).normalize('NFKC').trim(); }
  function key(s) { return nk(s).replace(/\s+/g, '').toUpperCase(); }
  function hm(h, mi) { return h <= 29 && mi < 60 ? h * 60 + mi : NaN; }
  // 時刻 → 0時からの分。「10:00」「10時」「10時半」「10時15分」「午後3時」は常に読む。loose のときだけ「1000」「930」も読む。
  function toMin(s, loose) {
    var t = nk(s).replace(/\s+/g, ''), add = 0;
    var ap = t.match(/^(午前|午後|AM|PM)/i);
    if (ap) { t = t.slice(ap[0].length); if (/午後|PM/i.test(ap[0])) add = 12; }
    var m = t.match(/^(\d{1,2}):(\d{2})$/), v = NaN;
    if (m) v = hm(Number(m[1]), Number(m[2]));
    else if ((m = t.match(/^(\d{1,2})時(?:(半)|(\d{1,2})分?)?$/))) v = hm(Number(m[1]), m[2] ? 30 : m[3] ? Number(m[3]) : 0);
    else if (loose && (m = t.match(/^(\d{1,2})(\d{2})$/))) v = hm(Number(m[1]), Number(m[2]));
    if (isNaN(v)) return NaN;
    return add && v < 720 ? v + 720 : v;
  }
  // 所要時間 →分。「60」「60分」「1時間」「1時間半」「1時間30分」「1.5h」
  function toDur(s) {
    var t = nk(s).replace(/\s+/g, '');
    var m = t.match(/^(\d{1,3})(?:分|min|m)?$/i); if (m) return Number(m[1]);
    m = t.match(/^(\d+)時間(\d{1,2})分$/); if (m) return Number(m[1]) * 60 + Number(m[2]);
    m = t.match(/^(\d+(?:\.\d+)?)(?:時間|h)(半)?$/i); if (m) return Math.round(Number(m[1]) * 60) + (m[2] ? 30 : 0);
    return NaN;
  }
  function fmtT(min) { return Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0'); }
  function span(a, b) { return fmtT(a) + '–' + fmtT(b); }
  function durTxt(min) { return min >= 60 ? Math.floor(min / 60) + '時間' + (min % 60 ? (min % 60) + '分' : '') : min + '分'; }

  // 先頭のセル → { start, end|null }。「10:00-11:30」「10:00〜11:30」「10時から11時半」も読む
  function headOf(s) {
    var t = nk(s).replace(/\s+/g, '');
    var p = t.split(/[-–—−〜~]|から/);
    if (p.length === 2 && p[1] === '') p = [p[0]];
    if (p.length === 2) { var a = toMin(p[0], true), b = toMin(p[1], true); return isNaN(a) || isNaN(b) ? null : { start: a, end: b }; }
    if (p.length !== 1) return null;
    var a1 = toMin(p[0], true); return isNaN(a1) ? null : { start: a1, end: null };
  }
  // 1行をセルに切る。タブ → カンマ・読点・空白2つ以上 → だめなら空白1つ。（所要時間の「120」を桁区切りと取り違えないよう、この道具では数字のカンマを守らない）
  var JOIN = /^(\s*(?:午前|午後)?[0-9０-９]{1,2}(?:[:：][0-9０-９]{2}|時(?:半|[0-9０-９]{1,2}分?)?)?)\s*(?:[-–—−－〜~～]|から)\s*(?=(?:午前|午後)?[0-9０-９])/;
  function cellsOf(line) {
    var ln = line.replace(JOIN, '$1-');
    var c = (ln.indexOf('\t') >= 0 ? ln.split('\t') : ln.split(/,|，|、|[ 　]{2,}/)).map(function (x) { return x.replace(/^"|"$/g, '').trim(); }).filter(function (x) { return x !== ''; });
    if (c.length && headOf(c[0])) return c;
    var w = ln.trim().split(/[\s　]+/);
    return w.length && headOf(w[0]) ? w : null;
  }

  // テキスト → { rows:[{n,start,end,name,what,staff,auto}], bad:[{n,s,why}] }
  function parse(txt, defDur, order) {
    var rows = [], bad = [], known = {};
    order.forEach(function (o) { known[key(o)] = o; });
    txt.split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var c = cellsOf(line);
      if (!c) { bad.push({ n: i + 1, s: line.trim(), why: '先頭の時刻が読めません' }); return; }
      var h = headOf(c[0]), rest = c.slice(1), end = h.end, auto = false;
      if (end == null && rest.length) {
        var d = toDur(rest[0]), e = toMin(rest[0], false);
        if (!isNaN(d) && d > 0) { end = h.start + d; rest = rest.slice(1); }
        else if (!isNaN(e)) { end = e; rest = rest.slice(1); }
      }
      if (end == null) { end = h.start + defDur; auto = true; }
      if (end <= h.start) { bad.push({ n: i + 1, s: line.trim(), why: '終了が開始より前です' }); return; }
      rows.push({ n: i + 1, start: h.start, end: end, rest: rest, auto: auto });
    });
    // 担当の名前を先に集める（3項目そろった行の最後の項目）
    rows.forEach(function (r) { if (r.rest.length >= 3) { var s = r.rest[r.rest.length - 1], k = key(s); if (!known[k]) known[k] = s; } });
    rows.forEach(function (r) {
      var x = r.rest; r.name = x[0] || '（お名前なし）'; r.what = ''; r.staff = NONE;
      if (x.length >= 3) { r.what = x.slice(1, -1).join(' '); r.staff = known[key(x[x.length - 1])]; }
      else if (x.length === 2) { if (known[key(x[1])]) r.staff = known[key(x[1])]; else r.what = x[1]; }
      delete r.rest;
    });
    return { rows: rows, bad: bad };
  }

  if (!$('#date').value) $('#date').value = T.isoToday();

  function msg(html) { var el = $('#result'); el.hidden = false; el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">' + html + '</div>'; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  function run() {
    var txt = $('#list').value;
    var iso = $('#date').value || T.isoToday();
    var open = toMin($('#open').value, false), close = toMin($('#close').value, false);
    var slot = Number($('#slot').value) || 30, defDur = Number($('#dur').value) || 60;
    var shop = $('#shop').value.trim();
    var order = $('#staff').value.split(/[,，、\s　]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s; });
    if (isNaN(open) || isNaN(close) || close <= open) { msg('開店と閉店の時刻を確かめてください（閉店は開店より後にします）。'); return; }
    var p = parse(txt, defDur, order), rows = p.rows, bad = p.bad;
    if (!rows.length) {
      msg('予約を、1行に「開始時刻　所要時間（分）　お客様名　内容　担当」の形で貼ってください。' + (bad.length ? '（読めなかった行：' + bad.length + '行。先頭を「10:00」「10時半」のような時刻にしてください）' : ''));
      return;
    }
    rows.sort(function (a, b) { return a.start - b.start || a.end - b.end || a.n - b.n; });

    // 担当の列：設定の順 → 予約に出てきた順 → 担当なし
    var staff = [], seen = {};
    order.forEach(function (o) { if (!seen[key(o)]) { seen[key(o)] = 1; staff.push(o); } });
    rows.forEach(function (r) { if (r.staff !== NONE && !seen[key(r.staff)]) { seen[key(r.staff)] = 1; staff.push(r.staff); } });
    if (rows.some(function (r) { return r.staff === NONE; })) staff.push(NONE);
    var by = {}; staff.forEach(function (s) { by[s] = []; });
    rows.forEach(function (r) { by[r.staff].push(r); });

    // 判定
    var pairs = [];
    staff.forEach(function (s) {
      var a = by[s];
      for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) {
        if (a[j].start < a[i].end && a[i].start < a[j].end) { a[i].dup = a[j].dup = true; pairs.push([a[i], a[j]]); }
      }
    });
    rows.forEach(function (r) { r.out = r.start < open || r.end > close; });
    var nDup = rows.filter(function (r) { return r.dup; }).length, nOut = rows.filter(function (r) { return r.out; }).length;
    var flags = function (r) { return (r.dup ? ['重なり'] : []).concat(r.out ? ['営業時間外'] : []); };
    var tags = function (r) { return flags(r).map(function (f) { return ' <span class="tag tag--warn">' + f + '</span>'; }).join(''); };

    // 空き時間（営業時間から予約を引く）
    var free = {};
    staff.forEach(function (s) {
      var cur = open, out = [];
      by[s].forEach(function (r) {
        var a = Math.max(r.start, open), b = Math.min(r.end, close);
        if (b <= a) return;
        if (a > cur) out.push([cur, a]);
        if (b > cur) cur = b;
      });
      if (cur < close) out.push([cur, close]);
      free[s] = out;
    });

    // 時間割のコマ（営業時間の外に予約があれば、その分だけ前後に伸ばす）
    var gs = open, ge = close;
    var minS = Math.min.apply(null, rows.map(function (r) { return r.start; })), maxE = Math.max.apply(null, rows.map(function (r) { return r.end; }));
    while (gs > minS) gs -= slot;
    while (ge < maxE) ge += slot;
    var slots = []; for (var t = gs; t < ge && slots.length < 240; t += slot) slots.push(t);
    function cell(s, t0, forDoc) {
      var its = by[s].filter(function (r) { return r.start < t0 + slot && r.end > t0; });
      if (!its.length) return '<td>&nbsp;</td>';
      var anyStart = false;
      var html = its.map(function (r) {
        var st = r.start >= t0 && r.start < t0 + slot;
        if (!st) return '〃';
        anyStart = true;
        var lab = (r.start !== t0 ? fmtT(r.start) + ' ' : '') + r.name + (r.what ? ' ' + r.what : '');
        return esc(lab) + '<span class="nb">（' + (r.end - r.start) + '分）</span>' + (forDoc ? (flags(r).length ? ' ★' + flags(r).join('・') : '') : tags(r));
      }).join('<br>');
      return '<td class="' + (anyStart ? 'on' : 'cont') + '">' + html + '</td>';
    }
    function grid(forDoc) {
      return '<thead><tr><th class="t">時間</th>' + staff.map(function (s) { return '<th>' + esc(s) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        slots.map(function (t0) {
          var off = t0 < open || t0 >= close;
          return '<tr' + (off ? ' class="off"' : '') + '><td class="t">' + fmtT(t0) + (off ? '<br><small>時間外</small>' : '') + '</td>' + staff.map(function (s) { return cell(s, t0, forDoc); }).join('') + '</tr>';
        }).join('') + '</tbody>';
    }

    var dateTxt = T.jpDate(iso, true), title = '予約表　' + dateTxt + (shop ? '　' + shop : '');
    var listRows = rows.map(function (r) {
      return '<tr><td class="st">' + span(r.start, r.end) + '</td><td><b>' + esc(r.name) + '</b>' + (r.what ? ' <span class="bk-what">' + esc(r.what) + '</span>' : '') + (r.auto ? ' <span class="tag">所要' + defDur + '分で仮置き</span>' : '') + tags(r) + '</td><td>' + esc(r.staff) + '</td></tr>';
    }).join('');
    var freeHtml = staff.map(function (s) {
      var f = free[s];
      return '<div class="grp"><div class="grp__h"><span>' + esc(s) + '</span><small>予約 ' + by[s].length + '件／空き ' + durTxt(f.reduce(function (a, x) { return a + x[1] - x[0]; }, 0) || 0) + '</small></div><ul>' +
        (f.length ? f.map(function (x) { return '<li><span>' + span(x[0], x[1]) + '</span><span class="fr">' + durTxt(x[1] - x[0]) + '</span></li>'; }).join('') : '<li><span>営業時間内に空きはありません</span><span class="fr">—</span></li>') + '</ul></div>';
    }).join('');
    var warn = '';
    if (pairs.length) warn += '<div class="note-red"><b>時間が重なっている予約（' + pairs.length + '組）</b>' + pairs.map(function (q) { return esc(q[0].staff + '：' + span(q[0].start, q[0].end) + ' ' + q[0].name + ' と ' + span(q[1].start, q[1].end) + ' ' + q[1].name); }).join('<br>') + '</div>';
    if (bad.length) warn += '<div class="note-red"><b>読めなかった行（' + bad.length + '行）</b>' + bad.map(function (b) { return esc(b.n + '行目：' + b.s + '（' + b.why + '）'); }).join('<br>') + '</div>';

    var el = $('#result'); el.hidden = false;
    el.innerHTML = '<div class="res-title"><h2>予約表</h2><p class="sub">' + esc(dateTxt + (shop ? '　' + shop : '')) + '　営業 ' + span(open, close) + '・1コマ ' + slot + '分</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + rows.length + '<small>件</small></div><div class="lab">予約の件数（担当 ' + staff.length + '）</div></div>' +
      '<div class="res-stat"><div class="big">' + nDup + '<small>件</small></div><div class="lab">重なり（同じ担当・' + pairs.length + '組）</div></div>' +
      '<div class="res-stat"><div class="big">' + nOut + '<small>件</small></div><div class="lab">営業時間外にかかる予約</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="print">予約表を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="csv">予約一覧をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">スタッフに送る文面をコピー</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">List</span><span class="d">時間順の一覧</span></div>' +
      '<div class="sheet-pad"><div class="tbl"><table><colgroup><col class="bk-t"><col><col class="bk-s"></colgroup><thead><tr><th>時間</th><th>お客様・内容</th><th>担当</th></tr></thead><tbody>' + listRows + '</tbody></table></div></div>' + warn + '</div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Free</span><span class="d">担当ごとの空き時間（電話口で次の空きを答える用）</span></div>' + freeHtml + '</div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Timetable</span><span class="d">時間割（行＝' + slot + '分のコマ、列＝担当）</span></div>' +
      '<div class="sheet-pad"><div class="tbl tgrid ' + (staff.length >= 4 ? 'tbl--xl' : 'tbl--wide') + '"><table>' + grid(false) + '</table><div class="tbl-hint">← 横にスクロールできます →</div></div></div></div>' +
      '<div class="doc-wrap" hidden><div class="doc print-target" id="doc"><h2 class="doc-title">予約表</h2><p class="doc-meta">' + esc(dateTxt + (shop ? '　' + shop : '')) + '　営業 ' + span(open, close) + '　予約 ' + rows.length + '件' + (nDup ? '　重なり ' + nDup + '件' : '') + (nOut ? '　営業時間外 ' + nOut + '件' : '') + '</p>' +
      '<table class="doc-grid"><colgroup><col class="c-t">' + staff.map(function () { return '<col>'; }).join('') + '</colgroup>' + grid(true) + '</table>' +
      '<h3 class="doc-h3">時間順の一覧</h3><table class="doc-list"><colgroup><col class="c-t"><col><col><col class="c-s"><col class="c-k"></colgroup><thead><tr><th>時間</th><th>お客様</th><th>内容</th><th>担当</th><th>確認</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td class="c">' + span(r.start, r.end) + '</td><td>' + esc(r.name) + (flags(r).length ? ' ★' + flags(r).join('・') : '') + '</td><td>' + esc(r.what) + '</td><td>' + esc(r.staff) + '</td><td class="c"><span class="box" style="margin:0"></span></td></tr>'; }).join('') + '</tbody></table>' +
      (nDup || nOut ? '<p style="font-size:11px;margin:0">★は、同じ担当で時間が重なっている予約・営業時間外にかかる予約です。</p>' : '') + '</div></div>' +
      '<div class="again">ほかのツール：<a href="/tools/timecard">タイムカード集計</a><a href="/tools/daily-report">作業日報メーカー</a><a href="/tools/order-summary">注文集計</a><a href="/tools">ツール一覧</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    var csvRows = [['日付', '開始', '終了', '所要分', 'お客様名', '内容', '担当', '判定']].concat(rows.map(function (r) { return [iso, fmtT(r.start), fmtT(r.end), r.end - r.start, r.name, r.what, r.staff, flags(r).join('・')]; }));
    var memo = ['【' + title + '】', '予約 ' + rows.length + '件／重なり ' + nDup + '件／営業時間外 ' + nOut + '件', '']
      .concat(staff.reduce(function (a, s) {
        return a.concat(['■ ' + s + '（' + by[s].length + '件）'], by[s].length ? by[s].map(function (r) { return span(r.start, r.end) + ' ' + r.name + (r.what ? ' ' + r.what : '') + (flags(r).length ? ' ★' + flags(r).join('・') : ''); }) : ['予約なし'], ['']);
      }, []))
      .concat(pairs.length ? ['※ 重なり：'].concat(pairs.map(function (q) { return '・' + q[0].staff + ' ' + span(q[0].start, q[0].end) + ' ' + q[0].name + ' と ' + span(q[1].start, q[1].end) + ' ' + q[1].name; })) : []).join('\n').trim();

    // 相談フォームに引き継ぐメモは件数と空き時間だけ（お客様名は入れない）
    var memoShort = ['【' + title + '】', '予約 ' + rows.length + '件／重なり ' + nDup + '件／営業時間外 ' + nOut + '件', '']
      .concat(staff.map(function (s) { return '■ ' + s + '：予約 ' + by[s].length + '件／空き ' + (free[s].length ? free[s].map(function (x) { return span(x[0], x[1]); }).join('、') : 'なし'); })).join('\n');
    $('#print').addEventListener('click', function () { $('.doc-wrap').hidden = false; T.track('tool_print', { kind: 'tools-booking-sheet' }); window.print(); setTimeout(function () { $('.doc-wrap').hidden = true; }, 500); });
    $('#csv').addEventListener('click', function () { T.saveCsv('予約一覧_' + iso + '.csv', csvRows, 'utf8'); T.track('tool_download', { kind: 'tools-booking-sheet' }); });
    $('#copy').addEventListener('click', function () { T.copyText(memo, $('#copy')); T.track('tool_copy', { kind: 'tools-booking-sheet' }); });
    T.renderCtas($('#ctas'), {
      memo: memoShort, kind: 'tools-booking-sheet', memoLabel: '件数のまとめをコピー',
      shareTitle: '予約の件数を共有する', shareDesc: '件数と担当ごとの空き時間だけのテキストです（お客様名は入りません）。お客様名まで入った文面は、上の「スタッフに送る文面をコピー」から取れます。',
      quoteTitle: '予約の電話を減らす相談', quoteDesc: '今の予約表のやり方を変えずに、空き枠だけをWebで見せて受け付ける、営業時間外の電話に自動で答える、といった形から組めます。',
      quoteBtn: '相談を依頼する →', askExamples: '「今の予約表のままWeb予約を足せる？」「電話の一次受付だけ自動にできる？」', lineUrl: T.LINE_URL,
      extraFields: [['予約', rows.length + '件'], ['担当', staff.length + ''], ['重なり', nDup + '件'], ['営業時間外', nOut + '件']]
    });
    T.track('tool_result', { kind: 'tools-booking-sheet', items: rows.length, dup: nDup, out: nOut });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
})();
