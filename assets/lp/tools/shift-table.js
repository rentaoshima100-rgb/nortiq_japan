/* /tools/shift-table — シフト表メーカー
 * 1行に「名前・曜日（または日付）・開始・終了」を貼ると、1週間のシフト表（人×7日）に並べ、
 * 人ごとの労働時間・出勤日数、日ごとの人数、必要人数に足りない日を出す。
 * 休憩は「自動」のとき、開始〜終了が6時間超で45分・8時間45分超で60分を引く（労働基準法34条1項の最低限）。
 * 入力はブラウザの中だけで処理し、サーバーには送らない。localStorage にも置かない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc;
  var KIND = 'tools-shift-table', DOW = '日月火水木金土';
  function key(s) { return String(s || '').normalize('NFKC').replace(/[\s　]+/g, '').toUpperCase(); }
  function clean(s) { return String(s || '').replace(/[\s　]+/g, ' ').trim(); }
  function hm(n) { n = Math.max(0, Math.round(n)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); }
  function tod(abs) { var d = abs % 1440; return (abs >= 1440 ? '翌' : '') + Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0'); }
  function isoOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  // 「月」「月曜」「11/16」「16日」→ 週の中の位置（0〜6）。週に無い日付は -2、日として読めないものは -1
  function dayIndex(s, week) {
    var t = String(s || '').normalize('NFKC').replace(/[\s()（）]/g, '');
    var m = t.match(/^([月火水木金土日])(曜日?)?$/);
    if (m) { var w = DOW.indexOf(m[1]); for (var i = 0; i < 7; i++) if (week[i].getDay() === w) return i; return -1; }
    m = t.match(/^(\d{1,2})[\/.月](\d{1,2})日?(?:[月火水木金土日]曜?日?)?$/);
    if (m) { for (var j = 0; j < 7; j++) if (week[j].getMonth() + 1 === Number(m[1]) && week[j].getDate() === Number(m[2])) return j; return -2; }
    m = t.match(/^(\d{1,2})日$/);
    if (m) { for (var k = 0; k < 7; k++) if (week[k].getDate() === Number(m[1])) return k; return -2; }
    return -1;
  }
  // 「9:00 17:00」「9:00-17:00」「9時〜17時30分」→ [開始分, 終了分]。読めなければ null
  function times(s) {
    var t = String(s || '').normalize('NFKC'), out = [], re = /(\d{1,2})(?::(\d{2})|時(?:(\d{1,2})分?)?)?/g, m;
    while ((m = re.exec(t)) && out.length < 2) {
      var h = Number(m[1]), mi = Number(m[2] || m[3] || 0);
      if (h > 29 || mi > 59) return null;
      out.push(h * 60 + mi);
    }
    return out.length === 2 ? out : null;
  }
  function parseLine(line, week) {
    var c = T.splitLine(line).map(clean).filter(function (x) { return x !== ''; });
    if (c.length < 3) c = clean(line).split(' ');
    var di = -1, idx = -1;
    for (var i = 1; i < c.length; i++) { var d = dayIndex(c[i], week); if (d !== -1) { di = d; idx = i; break; } }
    if (idx < 0) return { err: '曜日が読めません' };
    if (di === -2) return { err: 'この週に無い日付です' };
    var tm = times(c.slice(idx + 1).join(' '));
    if (!tm) return { err: '開始・終了の時刻が読めません' };
    var a = tm[0], b = tm[1]; if (b <= a) b += 1440;
    return { name: c.slice(0, idx).join(' '), day: di, a: a, b: b };
  }

  var weekEl = $('#week');
  if (!weekEl.value) { var n = new Date(); n.setDate(n.getDate() + ((8 - n.getDay()) % 7 || 7)); weekEl.value = isoOf(n); } // 次の月曜

  function run() {
    var p0 = (weekEl.value || T.isoToday()).split('-'), start = new Date(Number(p0[0]), Number(p0[1]) - 1, Number(p0[2]));
    var week = []; for (var i = 0; i < 7; i++) week.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    var need = Math.max(0, Math.round(Number($('#need').value) || 0)), auto = $('#rest').value === 'auto', shop = clean($('#shop').value);
    var dl = function (i) { return (week[i].getMonth() + 1) + '/' + week[i].getDate() + '(' + DOW.charAt(week[i].getDay()) + ')'; };
    var people = [], by = {}, bad = [], count = 0;
    $('#shifts').value.split(/\r?\n/).forEach(function (line, no) {
      if (!line.trim()) return;
      var s = parseLine(line, week);
      if (s.err || !s.name) { bad.push({ no: no + 1, t: clean(line).slice(0, 50), why: s.err || '名前がありません' }); return; }
      var span = s.b - s.a;
      s.rest = auto ? (span > 525 ? 60 : span > 360 ? 45 : 0) : 0; s.work = span - s.rest;
      var k = key(s.name), p = by[k];
      if (!p) { p = by[k] = { name: s.name, days: [[], [], [], [], [], [], []], total: 0 }; people.push(p); }
      p.days[s.day].push(s); p.total += s.work; count++;
    });
    var el = $('#result'); el.hidden = false;
    if (!people.length) {
      el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">シフトを、1行に「名前　曜日　開始　終了」の形で貼ってください（読めた行：0）。' + (bad.length ? '<br>' + esc(bad[0].no + '行目：' + bad[0].why) : '') + '</div>';
      return;
    }
    var heads = [0, 0, 0, 0, 0, 0, 0], totalMin = 0;
    people.forEach(function (p) {
      p.nDays = 0; p.flags = []; var over8 = false, lap = false;
      p.days.forEach(function (list, d) {
        if (!list.length) return;
        list.sort(function (x, y) { return x.a - y.a; });
        p.nDays++; heads[d]++;
        if (list.reduce(function (a, s) { return a + s.work; }, 0) > 480) over8 = true;
        for (var j = 1; j < list.length; j++) if (list[j].a < list[j - 1].b) lap = true;
      });
      if (p.total > 2400) p.flags.push('週40時間超');
      if (over8) p.flags.push('1日8時間超');
      if (p.nDays === 7) p.flags.push('休日なし');
      if (lap) p.flags.push('時間の重なり');
      totalMin += p.total;
    });
    var short = []; if (need > 0) heads.forEach(function (h, d) { if (h < need) short.push(d); });
    var flagged = people.filter(function (p) { return p.flags.length; });
    var range = dl(0) + '〜' + dl(6), cellTxt = function (s) { return tod(s.a) + '–' + tod(s.b); };

    var grid = '<div class="tbl tbl--sh sh"><table><thead><tr><th>名前</th><th class="r">合計</th>' + week.map(function (dt, d) { return '<th class="c">' + (dt.getMonth() + 1) + '/' + dt.getDate() + '<br><small>' + DOW.charAt(dt.getDay()) + '</small></th>'; }).join('') + '</tr></thead><tbody>' +
      people.map(function (p) { return '<tr><td><b>' + esc(p.name) + '</b></td><td class="r"><b>' + hm(p.total) + '</b><br><small>' + p.nDays + '日</small></td>' + p.days.map(function (list) { return '<td class="c">' + (list.length ? list.map(function (s) { return esc(cellTxt(s)); }).join('<br>') : '<span style="color:var(--text-3)">休</span>') + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr><td><b>人数</b></td><td class="r">' + hm(totalMin) + '</td>' + heads.map(function (h, d) { return '<td class="c"><b>' + h + '人</b>' + (short.indexOf(d) >= 0 ? '<br><span class="tag tag--warn">不足 ' + (need - h) + '</span>' : '') + '</td>'; }).join('') + '</tr>' +
      '</tbody></table><div class="tbl-hint">表は横にスクロールできます</div></div>';
    var pplHtml = people.map(function (p) {
      return '<div class="grp"><div class="grp__h"><span>' + esc(p.name) + (p.flags.length ? ' ' + p.flags.map(function (f) { return '<span class="tag tag--warn">' + f + '</span>'; }).join(' ') : '') + '</span><small>' + p.nDays + '日・' + hm(p.total) + '</small></div></div>';
    }).join('');
    var notes = '';
    if (short.length) notes += '<div class="note-red"><b>人数が足りない日（必要 ' + need + '人）</b>' + esc(short.map(function (d) { return dl(d) + ' ' + heads[d] + '人'; }).join('、')) + '</div>';
    if (flagged.length) notes += '<div class="note-red"><b>確認が要る人</b>' + flagged.map(function (p) { return esc(p.name + '：' + p.flags.join('・')); }).join('<br>') + '<br><span style="font-weight:400">週40時間・1日8時間（労働基準法32条）、毎週1回の休日（同35条）の目安です。入力の見直しに使ってください。</span></div>';
    if (bad.length) notes += '<div class="note-red"><b>読めなかった行（' + bad.length + '行・表に入っていません）</b>' + bad.slice(0, 10).map(function (b) { return esc(b.no + '行目：' + b.t + '（' + b.why + '）'); }).join('<br>') + (bad.length > 10 ? '<br>ほか ' + (bad.length - 10) + '行' : '') + '</div>';

    var doc = '<div class="doc print-target" id="doc"><h2 class="doc-title">シフト表</h2><p class="doc-meta">' + (shop ? esc(shop) + '　' : '') + esc(week[0].getFullYear() + '年 ' + range) + '</p>' +
      '<table class="sh-doc"><colgroup><col class="c-n"><col><col><col><col><col><col><col><col class="c-s"></colgroup><thead><tr><th>名前</th>' + week.map(function (_, d) { return '<th>' + esc((week[d].getMonth() + 1) + '/' + week[d].getDate()) + '<br>' + DOW.charAt(week[d].getDay()) + '</th>'; }).join('') + '<th>合計</th></tr></thead><tbody>' +
      people.map(function (p) { return '<tr><td>' + esc(p.name) + '</td>' + p.days.map(function (list) { return '<td class="c">' + (list.length ? list.map(function (s) { return esc(tod(s.a)) + '<br>' + esc(tod(s.b)); }).join('<hr>') : '') + '</td>'; }).join('') + '<td class="num">' + hm(p.total) + '<br>' + p.nDays + '日</td></tr>'; }).join('') +
      '<tr><th>人数</th>' + heads.map(function (h, d) { return '<td class="c"><b>' + h + '</b>' + (short.indexOf(d) >= 0 ? '<br>不足' + (need - h) : '') + '</td>'; }).join('') + '<td class="num">' + hm(totalMin) + '</td></tr></tbody></table>' +
      '<p style="font-size:11px;margin:0">各欄は上が開始・下が終了の時刻。合計は' + (auto ? '休憩（6時間超45分・8時間45分超60分）を引いた' : '開始から終了までの') + '時間。' + (need ? '必要人数 ' + need + '人。' : '') + '</p></div>';

    var L = ['【シフト】' + (shop ? shop + '　' : '') + range, ''];
    week.forEach(function (_, d) {
      var list = []; people.forEach(function (p) { p.days[d].forEach(function (s) { list.push({ n: p.name, s: s }); }); });
      list.sort(function (x, y) { return x.s.a - y.s.a; });
      L.push('■' + dl(d) + (list.length ? '' : '　なし'));
      list.forEach(function (x) { L.push('　' + x.n + '　' + cellTxt(x.s)); });
    });
    var text = L.join('\n');
    var gridCsv = [['名前'].concat(week.map(function (_, d) { return dl(d); }), ['合計時間', '合計(分)', '出勤日数'])].concat(
      people.map(function (p) { return [p.name].concat(p.days.map(function (list) { return list.map(cellTxt).join(' / '); }), [hm(p.total), p.total, p.nDays]); }),
      [['人数'].concat(heads, [hm(totalMin), totalMin, ''])]);
    var detailCsv = [['日付', '曜日', '名前', '開始', '終了', '休憩(分)', '労働時間(分)', '労働時間']];
    week.forEach(function (dt, d) { people.forEach(function (p) { p.days[d].forEach(function (s) { detailCsv.push([isoOf(dt), DOW.charAt(dt.getDay()), p.name, tod(s.a), tod(s.b), s.rest, s.work, hm(s.work)]); }); }); });
    var tag = isoOf(week[0]);

    el.innerHTML = '<div class="res-title"><h2>シフト表ができました</h2><p class="sub">' + esc(range) + '　' + (auto ? '休憩を引いた時間で合計しています' : '開始から終了までの時間で合計しています') + '</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + people.length + '<small>人</small></div><div class="lab">スタッフ（シフト ' + count + ' 件）</div></div>' +
      '<div class="res-stat"><div class="big">' + hm(totalMin) + '</div><div class="lab">1週間の合計時間</div></div>' +
      '<div class="res-stat"><div class="big' + (need && !short.length ? ' txt' : '') + '">' + (need ? (short.length ? short.length + '<small>日</small>' : '足りています') : '—') + '</div><div class="lab">' + (need ? (short.length ? '人数が足りない日（必要 ' + need + '人）' : '毎日 ' + need + '人以上います') : '必要人数を入れると不足の日が出ます') + '</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="print">シフト表を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">文面をコピー（LINE用）</button><button type="button" class="btn btn--outline btn--sm" id="c1">シフト表をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="c2">明細をCSVで保存</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Week</span><span class="d">1週間のシフト表</span></div><div class="sheet-pad">' + grid + '</div>' + notes + '</div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Staff</span><span class="d">人ごとの出勤日数と時間</span></div>' + pplHtml + '</div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Message</span><span class="d">LINE用の文面</span></div><div class="rep-text" id="msgText">' + esc(text) + '</div></div>' +
      '<div class="doc-wrap" hidden>' + doc + '</div>' +
      '<div class="again">ほかのツール：<a href="/tools/timecard">タイムカード集計</a><a href="/tools/booking-sheet">予約表メーカー</a><a href="/tools/daily-report">作業日報メーカー</a><a href="/tools/work-days">出面表メーカー</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    $('#print').addEventListener('click', function () { var w = $('.doc-wrap'); w.hidden = false; T.track('tool_print', { kind: KIND }); window.print(); setTimeout(function () { w.hidden = true; }, 500); });
    $('#copy').addEventListener('click', function () { T.copyText(text, $('#copy'), $('#msgText')); T.track('tool_copy', { kind: KIND }); });
    $('#c1').addEventListener('click', function () { T.saveCsv('シフト表_' + tag + '.csv', gridCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'grid' }); });
    $('#c2').addEventListener('click', function () { T.saveCsv('シフト明細_' + tag + '.csv', detailCsv, 'utf8'); T.track('tool_download', { kind: KIND, file: 'detail' }); });
    // 相談フォームに引き継ぐメモは人数と時間だけ（名前は入れない）
    var memo = '【シフト】' + range + '\nスタッフ ' + people.length + ' 人・シフト ' + count + ' 件・合計 ' + hm(totalMin) + (need ? '\n必要 ' + need + ' 人に足りない日：' + (short.length ? short.map(function (d) { return dl(d); }).join('、') : 'なし') : '');
    T.renderCtas($('#ctas'), {
      memo: memo, kind: KIND, memoLabel: '人数と時間の概要をコピー', shareTitle: 'シフトの概要を共有する', shareDesc: '人数・合計時間・足りない日だけの短いテキストです（名前は入りません）。スタッフに送る文面は、上の「文面をコピー（LINE用）」から取れます。',
      quoteTitle: 'シフト作りを仕組みにする相談', quoteDesc: 'スタッフがスマホから出した希望を自動で表に集め、足りない日を知らせて、確定したシフトをLINEで配る仕組みを組みます。', quoteBtn: '相談を依頼する →',
      askExamples: '「LINEで集めた希望をそのまま表にできる？」「月のシフトにも対応できる？」', lineUrl: T.LINE_URL,
      extraFields: [['スタッフ', people.length + '人'], ['合計時間', hm(totalMin)], ['足りない日', need ? short.length + '日' : '—']]
    });
    T.track('tool_result', { kind: KIND, people: people.length, shifts: count, short: short.length });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
})();
