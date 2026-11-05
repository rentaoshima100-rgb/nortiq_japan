/* /tools/timecard — タイムカード集計・残業時間計算表
 * 労働基準法32条（1日8時間・週40時間）、37条（法定外25%・月60h超50%・深夜25%・法定休日35%）で時間を分単位に集計する。
 * 週の起算は月曜。変形労働時間制・フレックスには対応しない。入力はブラウザの中だけで処理し、サーバーには送らない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var rowsEl = $('#rows');
  var SAMPLE = { 1: ['9:00', '20:00'], 2: ['9:00', '23:30'], 3: ['9:00', '15:00', 'sat'] }; // 平日のうち 1,2 番目を残業・深夜、最初の土曜を所定休日出勤に
  function pad(n) { return String(n).padStart(2, '0'); }
  function toMin(s) { var m = String(s || '').trim().normalize('NFKC').match(/^(\d{1,2})[:：.](\d{1,2})$/); if (!m) { var h = String(s || '').trim().match(/^(\d{1,2})$/); return h ? Number(h[1]) * 60 : NaN; } return Number(m[1]) * 60 + Number(m[2]); }
  function hhmm(min) { return Math.floor(min / 60) + ':' + pad(Math.round(min % 60)); }
  function hrs(min) { return (min / 60).toFixed(2).replace(/\.?0+$/, ''); }

  function buildRows(fill) {
    var ym = $('#ym').value || '2026-10', hol = Number($('#holiday').value), brk = $('#brk').value || '60';
    var y = Number(ym.split('-')[0]), m = Number(ym.split('-')[1]), days = new Date(y, m, 0).getDate();
    var old = {}; rowsEl.querySelectorAll('.tc-row').forEach(function (r) { old[r.dataset.d] = [r.querySelector('[data-k="i"]').value, r.querySelector('[data-k="o"]').value, r.querySelector('[data-k="b"]').value]; });
    rowsEl.innerHTML = '';
    var wk = 0, sat = 0;
    for (var d = 1; d <= days; d++) {
      var w = new Date(y, m - 1, d).getDay(), isHol = w === hol, isSat = !isHol && (w === 6 || w === 0);
      var val = old[d] || ['', '', brk];
      if (fill === 'clear') val = ['', '', brk];
      if (fill === 'sample' || fill === 'plain') {
        val = ['', '', brk];
        if (!isHol && !isSat) { wk++; val = ['9:00', '18:00', brk]; if (fill === 'sample' && SAMPLE[wk]) val = [SAMPLE[wk][0], SAMPLE[wk][1], brk]; }
        if (fill === 'sample' && isSat && w === 6) { sat++; if (sat === 2) val = ['9:00', '15:00', '45']; }
      }
      var row = T.el('div', 'tc-row' + (isHol ? ' hol' : '')); row.dataset.d = d;
      row.innerHTML = '<span class="d">' + d + '(' + WD[w] + ')' + (isHol ? '法休' : '') + '</span>' +
        '<input type="text" data-k="i" value="' + esc(val[0]) + '" placeholder="9:00" maxlength="5" aria-label="' + d + '日の出勤" autocomplete="off">' +
        '<input type="text" data-k="o" value="' + esc(val[1]) + '" placeholder="18:00" maxlength="5" aria-label="' + d + '日の退勤" autocomplete="off">' +
        '<input type="number" data-k="b" value="' + esc(val[2]) + '" min="0" step="5" inputmode="numeric" aria-label="' + d + '日の休憩（分）">';
      rowsEl.appendChild(row);
    }
  }
  buildRows('sample');
  $('#ym').addEventListener('change', function () { buildRows(); });
  $('#holiday').addEventListener('change', function () { buildRows(); });
  $('#fill').addEventListener('click', function () { buildRows('plain'); });
  $('#clear').addEventListener('click', function () { buildRows('clear'); });

  function overlap(a1, a2, b1, b2) { return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1)); }

  function run() {
    var ym = $('#ym').value || '2026-10', y = Number(ym.split('-')[0]), m = Number(ym.split('-')[1]);
    var hol = Number($('#holiday').value), stdMin = Math.min(8, Math.max(1, Number($('#std').value) || 8)) * 60, wage = Math.max(0, Number($('#wage').value) || 0), name = $('#name').value.trim();
    var days = [], bad = [];
    rowsEl.querySelectorAll('.tc-row').forEach(function (r) {
      var d = Number(r.dataset.d), w = new Date(y, m - 1, d).getDay();
      var si = r.querySelector('[data-k="i"]').value.trim(), so = r.querySelector('[data-k="o"]').value.trim(), b = Math.max(0, Number(r.querySelector('[data-k="b"]').value) || 0);
      var rec = { d: d, w: w, hol: w === hol, si: si, so: so, b: b, work: 0, night: 0, over: 0, wover: 0, holw: 0, holn: 0, inner: 0 };
      if (si || so) {
        var i = toMin(si), o = toMin(so);
        if (isNaN(i) || isNaN(o)) { bad.push(d); } else {
          if (o < i) o += 1440;
          rec.work = Math.max(0, o - i - b);
          var night = overlap(i, o, 0, 300) + overlap(i, o, 1320, 1740) + overlap(i, o, 2760, 3180); // 0:00-5:00, 22:00-29:00(翌5:00), 翌22:00-
          rec.night = Math.min(rec.work, night);
          if (rec.hol) { rec.holw = rec.work; rec.holn = rec.night; }
          else { rec.over = Math.max(0, rec.work - 480); rec.inner = Math.max(0, Math.min(rec.work, 480) - stdMin); }
        }
      }
      days.push(rec);
    });
    // 週40時間（月曜起算）。法定休日を除く「8時間以内の部分」の合計が週2,400分を超えた分を法定外に
    var weeks = {};
    days.forEach(function (r) { if (r.hol) return; var wkKey = Math.floor((r.d + ((new Date(y, m - 1, 1).getDay() + 6) % 7) - 1) / 7); weeks[wkKey] = weeks[wkKey] || []; weeks[wkKey].push(r); });
    Object.keys(weeks).forEach(function (k) {
      var acc = 0; weeks[k].forEach(function (r) { var within = Math.min(r.work, 480); var before = acc; acc += within; if (acc > 2400) { var ex = Math.min(within, acc - Math.max(2400, before)); r.wover = ex; r.inner = Math.max(0, r.inner - ex); } });
    });
    var tot = { work: 0, over: 0, night: 0, hol: 0, holn: 0, inner: 0, daysWorked: 0 };
    days.forEach(function (r) { tot.work += r.work; tot.over += r.over + r.wover; tot.night += r.hol ? 0 : r.night; tot.hol += r.holw; tot.holn += r.holn; tot.inner += r.inner; if (r.work) tot.daysWorked++; });
    var over60 = Math.max(0, tot.over - 3600), overBase = tot.over - over60;
    var regular = tot.work - tot.inner - tot.over - tot.hol;
    var pay = wage ? Math.round((tot.work * wage + tot.over * wage * 0.25 + over60 * wage * 0.25 + tot.night * wage * 0.25 + tot.hol * wage * 0.35 + tot.holn * wage * 0.25) / 60) : 0;
    var el = $('#result'); el.hidden = false;
    if (!tot.daysWorked) { el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">出勤・退勤を1日以上入れてください。' + (bad.length ? '（読めない時刻：' + bad.join('・') + '日。「9:00」の形で入れてください）' : '') + '</div>'; return; }
    var title = y + '年' + m + '月 勤怠集計表' + (name ? '（' + name + '）' : '');
    var sumRows = [['出勤日数', tot.daysWorked + '日'], ['総労働時間', hhmm(tot.work)], ['所定内', hhmm(regular)], ['法定内残業（8時間まで・割増なし）', hhmm(tot.inner)], ['法定外（25%）', hhmm(overBase)], ['うち月60時間超（50%）', hhmm(over60)], ['深夜（22〜5時・＋25%）', hhmm(tot.night)], ['法定休日（35%）', hhmm(tot.hol)], ['法定休日の深夜（＋25%）', hhmm(tot.holn)]];
    var dayRows = days.map(function (r) { return '<tr' + (r.hol ? ' class="hol"' : '') + '><td class="st">' + r.d + '(' + WD[r.w] + ')' + (r.hol ? '法休' : '') + '</td><td>' + esc(r.si) + '</td><td>' + esc(r.so) + '</td><td class="num">' + (r.work ? r.b : '') + '</td><td class="num">' + (r.work ? hhmm(r.work) : '') + '</td><td class="num">' + (r.over + r.wover ? hhmm(r.over + r.wover) : '') + '</td><td class="num">' + (r.night && !r.hol ? hhmm(r.night) : '') + '</td><td class="num">' + (r.holw ? hhmm(r.holw) : '') + '</td></tr>'; }).join('');
    var head = '<tr><th>日</th><th>出勤</th><th>退勤</th><th>休憩</th><th>労働</th><th>法定外</th><th>深夜</th><th>休日</th></tr>';
    el.innerHTML = '<div class="res-title"><h2>' + esc(title) + '</h2><p class="sub">所定 ' + (stdMin / 60) + 'h／日・法定休日 ' + WD[hol] + '曜・週の起算は月曜' + (bad.length ? '　※読めない時刻（' + bad.join('・') + '日）は除外' : '') + '</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + hhmm(tot.work) + '</div><div class="lab">総労働時間（' + tot.daysWorked + '日）</div></div>' +
      '<div class="res-stat"><div class="big">' + hhmm(tot.over) + '</div><div class="lab">法定外労働（深夜 ' + hhmm(tot.night) + '・休日 ' + hhmm(tot.hol) + '）</div></div>' +
      '<div class="res-stat"><div class="big">' + (wage ? '¥' + fmt(pay) : hhmm(tot.inner)) + '</div><div class="lab">' + (wage ? '割増込みの概算（時給 ' + fmt(wage) + '円）' : '法定内残業（割増なし）') + '</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="print">集計表を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="csv">日別をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">集計をコピー</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Summary</span><span class="d">' + esc(title) + '</span></div><div class="rows">' +
      sumRows.map(function (s) { return '<div class="row"><span class="n">' + esc(s[0]) + '</span><span class="v">' + esc(s[1]) + '</span></div>'; }).join('') + '</div>' +
      '<div class="section-h">日別</div><div class="tbl tbl--wide"><table><thead>' + head + '</thead><tbody>' + dayRows + '</tbody></table><div class="tbl-hint">← 横にスクロールできます →</div></div>' +
      '<div class="note-red"><b>確定前に確認</b>週40時間の判定は月の初日からの週で数えるため、前月末から続く週は実際より少なく出ることがあります。変形労働時間制・フレックス・固定残業代には対応していません。</div></div>' +
      '<div class="doc-wrap" hidden><div class="doc print-target" id="doc"><h2 class="doc-title">勤怠集計表</h2><p class="doc-meta">' + esc(title) + '　作成日：' + T.today() + '</p>' +
      '<table class="doc-sum" style="margin-left:0;width:100%"><tbody>' + sumRows.map(function (s) { return '<tr><th>' + esc(s[0]) + '</th><td class="num">' + esc(s[1]) + '</td></tr>'; }).join('') + (wage ? '<tr><th>割増込みの概算（時給 ' + fmt(wage) + '円）</th><td class="num">¥' + fmt(pay) + '</td></tr>' : '') + '</tbody></table>' +
      '<table><thead>' + head + '</thead><tbody>' + dayRows + '</tbody></table><p style="font-size:11px">法定外＝1日8時間超と週40時間超（労基法32条・37条）。深夜＝22時〜5時。法定休日＝' + WD[hol] + '曜。時間は分単位・丸めなし。</p></div></div>' +
      '<div class="again">ほかのツール：<a href="/tools/daily-report">作業日報メーカー</a><a href="/tools/invoice">請求書・見積書メーカー</a><a href="/tools/stocktake">棚卸差異チェック</a></div>' +
      '<div class="ctas" id="ctas"></div>';
    var csv = [['日', '曜日', '区分', '出勤', '退勤', '休憩(分)', '労働(分)', '法定内残業(分)', '法定外(分)', '深夜(分)', '法定休日(分)']].concat(days.map(function (r) { return [r.d, WD[r.w], r.hol ? '法定休日' : '', r.si, r.so, r.work ? r.b : '', r.work, r.inner, r.over + r.wover, r.hol ? 0 : r.night, r.holw]; }))
      .concat([[], ['合計', '', '', '', '', '', tot.work, tot.inner, tot.over, tot.night, tot.hol], ['うち60時間超(分)', '', '', '', '', '', '', '', over60, '', '']])
      .map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var memo = ['【' + title + '】' + T.today()].concat(sumRows.map(function (s) { return s[0] + '：' + s[1]; })).concat(wage ? ['割増込みの概算：' + fmt(pay) + '円（時給 ' + fmt(wage) + '円）'] : [], ['', '※ 法定外＝1日8h超・週40h超。深夜22〜5時。法定休日 ' + WD[hol] + '曜。分単位・丸めなし。変形労働時間制は未対応。']).join('\n');
    $('#print').addEventListener('click', function () { $('.doc-wrap').hidden = false; T.track('tool_print', { kind: 'tools-timecard' }); window.print(); setTimeout(function () { $('.doc-wrap').hidden = true; }, 500); });
    $('#csv').addEventListener('click', function () { T.download('勤怠集計_' + ym + '.csv', '﻿' + csv, 'text/csv;charset=utf-8'); T.track('tool_download', { kind: 'tools-timecard' }); });
    $('#copy').addEventListener('click', function () { T.copyText(memo, $('#copy')); });
    T.renderCtas($('#ctas'), { memo: memo, kind: 'tools-timecard', memoLabel: '集計をコピー', shareTitle: '集計結果を給与計算担当に渡す', shareDesc: '区分ごとの時間の一覧です。給与ソフトへの入力や社労士への連絡にそのまま使えます。',
      quoteTitle: '打刻から集計までを自動にする相談', quoteDesc: 'スマホ打刻や既存のタイムレコーダーのデータを毎月自動で集計し、給与ソフト用のCSVまで出す仕組みを月額で組みます。', quoteBtn: '相談を依頼する →', askExamples: '「紙のタイムカードを写真で取り込める？」「変形労働時間制でも集計できる？」', lineUrl: T.LINE_URL,
      extraFields: [['対象月', ym], ['総労働', hhmm(tot.work)], ['法定外', hhmm(tot.over)]] });
    T.track('tool_result', { kind: 'tools-timecard' });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
})();
