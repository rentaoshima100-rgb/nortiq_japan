/* /tools/daily-report — 作業日報メーカー
 * 開始・終了の時刻と作業内容から、実働時間（最初の開始〜最後の終了 − 休憩）を出し、
 * A4 の作業日報・LINE/メールに貼る文面・CSV（1日1行／作業の明細）を作る。
 * 入力はこのページの中だけで処理し、サーバーには送らない。localStorage にも置かない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc;
  var KIND = 'tools-daily-report', MAX_ROWS = 20;
  var SAMPLE = [
    { s: '08:00', e: '10:00', c: '資材の搬入・養生', q: '' },
    { s: '10:00', e: '12:00', c: '配管取付 2階', q: '12m' },
    { s: '13:00', e: '17:30', c: '配管取付 3階・気密試験', q: '3階 80%' }
  ];
  var rowsEl = $('#rows'), addBtn = $('#addRow');
  if (!$('#date').value) $('#date').value = T.isoToday();

  function addRow(p) {
    if (rowsEl.children.length >= MAX_ROWS) return;
    var row = T.el('div', 'calc-row calc-row--rep');
    row.innerHTML = '<div><label>開始</label><input type="time" data-k="s" value="' + esc(p ? p.s : '') + '"></div>' +
      '<div><label>終了</label><input type="time" data-k="e" value="' + esc(p ? p.e : '') + '"></div>' +
      '<div class="wide"><label>作業内容</label><input type="text" data-k="c" value="' + esc(p ? p.c : '') + '" placeholder="例：配管取付 2階" maxlength="60"></div>' +
      '<div class="wide"><label>数量・進み具合（任意）</label><input type="text" data-k="q" value="' + esc(p ? p.q : '') + '" placeholder="例：12m／80%" maxlength="30"></div>' +
      '<button type="button" class="del" aria-label="この作業の行を削除">✕ 削除</button>';
    row.querySelector('.del').addEventListener('click', function () { row.remove(); syncAdd(); });
    rowsEl.appendChild(row); syncAdd();
  }
  function syncAdd() { addBtn.disabled = rowsEl.children.length >= MAX_ROWS; addBtn.textContent = addBtn.disabled ? '作業は20行までです' : '＋ 作業を追加'; }
  SAMPLE.forEach(addRow);
  addBtn.addEventListener('click', function () { addRow(); });

  function v(id) { return $(id).value.trim(); }
  function mins(s) { var m = String(s || '').match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; }
  function hm(n) { n = Math.max(0, Math.round(n)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); }
  // 時刻の表示。24:00 を超えた分は「翌5:00」
  function tod(abs) { var d = abs % 1440; return (abs >= 1440 ? '翌' : '') + Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0'); }

  // 行を読む。時刻は入力順に並べ、前の行より早い開始が「前の終了から8時間以内の翌日」なら日またぎとして扱う（夜勤）。
  // それ以外（入力の順番が前後しているだけ）は同じ日として並べ替える。
  function readRows() {
    var out = [], offset = 0, prevStart = null, prevEnd = null;
    rowsEl.querySelectorAll('.calc-row').forEach(function (row) {
      var s = mins(row.querySelector('[data-k="s"]').value), e = mins(row.querySelector('[data-k="e"]').value);
      var c = row.querySelector('[data-k="c"]').value.trim(), q = row.querySelector('[data-k="q"]').value.trim();
      if (!c && !q && isNaN(s) && isNaN(e)) return;
      var it = { c: c || '（作業内容 未入力）', q: q, a: NaN, b: NaN, dur: NaN };
      if (!isNaN(s) && !isNaN(e)) {
        var a = s + offset;
        if (prevStart != null && a < prevStart && (a + 1440 - prevEnd) <= 480) { offset += 1440; a += 1440; }
        var b = e + offset; if (b < a) b += 1440;
        it.a = a; it.b = b; it.dur = b - a; prevStart = a; prevEnd = b;
      }
      out.push(it);
    });
    var timed = out.filter(function (x) { return !isNaN(x.a); }).sort(function (x, y) { return x.a - y.a; });
    var untimed = out.filter(function (x) { return isNaN(x.a); });
    return timed.concat(untimed);
  }

  function build() {
    var items = readRows();
    var el = $('#result'); el.hidden = false;
    if (!items.length) { el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">作業を1行以上入れてください（「＋ 作業を追加」で行を足せます）。</div>'; return; }
    var date = v('#date') || T.isoToday(), name = v('#name'), team = v('#team'), site = v('#site'), weather = v('#weather'), to = v('#to');
    var note = v('#note'), plan = v('#plan'), cost = v('#cost');
    var rest = Math.min(600, Math.max(0, Math.round(Number(v('#rest')) || 0)));
    var timed = items.filter(function (x) { return !isNaN(x.a); });
    var hasTime = timed.length > 0;
    var first = hasTime ? Math.min.apply(null, timed.map(function (x) { return x.a; })) : NaN;
    var last = hasTime ? Math.max.apply(null, timed.map(function (x) { return x.b; })) : NaN;
    var span = hasTime ? last - first : 0;
    var work = Math.max(0, span - rest), over = Math.max(0, work - 480);
    var p = date.split('-'), md = p.length === 3 ? Number(p[1]) + '/' + Number(p[2]) : date;
    var dow = (T.jpDate(date, true).match(/（.）$/) || [''])[0];
    var range = hasTime ? tod(first) + '〜' + tod(last) : '';
    var warn = '';
    if (hasTime && span > 1440) warn = '最初の開始から最後の終了までが24時間を超えています。時刻の入れ間違いがないか確認してください。';
    else if (hasTime && rest > span) warn = '休憩（' + rest + '分）が、最初の開始から最後の終了までの時間（' + hm(span) + '）より長くなっています。入力を確認してください。';
    else if (work > 480 && rest < 60) warn = '実働が8時間を超えていますが、休憩が60分未満です。労働基準法34条の目安（8時間を超える場合は少なくとも1時間）を下回っていないか、入力を確認してください。';
    else if (work > 360 && rest < 45) warn = '実働が6時間を超えていますが、休憩が45分未満です。労働基準法34条の目安（6時間を超える場合は少なくとも45分）を下回っていないか、入力を確認してください。';

    // ---- A4 日報 ----
    var trs = items.map(function (x) {
      return '<tr><td class="c">' + (isNaN(x.a) ? '—' : esc(tod(x.a) + '〜' + tod(x.b))) + '</td><td>' + esc(x.c) + '</td><td>' + esc(x.q) + '</td><td class="num">' + (isNaN(x.dur) ? '—' : hm(x.dur)) + '</td></tr>';
    }).join('');
    var doc = '<div class="doc print-target" id="doc"><h2 class="doc-title">作業日報</h2>' +
      '<table class="rep-kv"><colgroup><col class="k"><col class="v1"><col class="k"><col></colgroup><tbody>' +
      '<tr><th>日付</th><td>' + esc(T.jpDate(date, true)) + '</td><th>天気</th><td>' + esc(weather || '—') + '</td></tr>' +
      '<tr><th>氏名</th><td>' + esc(name || '—') + '</td><th>所属</th><td>' + esc(team || '—') + '</td></tr>' +
      '<tr><th>現場</th><td colspan="3">' + esc(site || '—') + '</td></tr></tbody></table>' +
      '<table class="rep-items"><colgroup><col class="c-t"><col><col class="c-q"><col class="c-d"></colgroup><thead><tr><th>時刻</th><th>作業内容</th><th>数量・進捗</th><th>時間</th></tr></thead><tbody>' + trs + '</tbody></table>' +
      '<table class="doc-sum"><tbody>' +
      '<tr><th>開始〜終了</th><td class="num">' + (hasTime ? esc(range) + '（' + hm(span) + '）' : '—') + '</td></tr>' +
      '<tr><th>休憩</th><td class="num">' + rest + '分</td></tr>' +
      '<tr><th>実働時間</th><td class="num"><b>' + (hasTime ? hm(work) : '—') + '</b></td></tr>' +
      (over ? '<tr><th>うち8時間を超えた時間</th><td class="num">' + hm(over) + '</td></tr>' : '') + '</tbody></table>' +
      '<h3 class="doc-h3">連絡・引き継ぎ事項</h3><div class="doc-note">' + esc(note || '特になし') + '</div>' +
      '<h3 class="doc-h3">明日の予定</h3><div class="doc-note">' + esc(plan || '—') + '</div>' +
      (cost ? '<h3 class="doc-h3">使った材料・経費</h3><div class="doc-note">' + esc(cost) + '</div>' : '') +
      '<table class="rep-seal"><tbody><tr><th>確認</th><th>承認</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>' +
      '</div>';

    // ---- LINE・メールに貼る文面 ----
    var lines = [];
    if (to) lines.push(to, 'お疲れさまです。本日の日報です。', '');
    lines.push('【日報】' + md + dow + (name ? ' ' + name : '') + (team ? '（' + team + '）' : ''));
    if (site || weather) lines.push((site ? '現場：' + site : '') + (site && weather ? '　' : '') + (weather ? '天気：' + weather : ''));
    if (hasTime) lines.push('時間：' + range + '（休憩' + rest + '分・実働' + hm(work) + (over ? '・8時間超 ' + hm(over) : '') + '）');
    lines.push('', '■作業');
    items.forEach(function (x) { lines.push('・' + (isNaN(x.a) ? '' : tod(x.a) + '〜' + tod(x.b) + '　') + x.c + (x.q ? '（' + x.q + '）' : '')); });
    lines.push('', '■連絡・引き継ぎ', note || '特になし');
    if (plan) lines.push('', '■明日の予定', plan);
    if (cost) lines.push('', '■材料・経費', cost);
    var text = lines.join('\n');

    // ---- CSV ----
    var oneLine = function (s) { return String(s || '').replace(/\r?\n/g, ' ／ '); };
    var dayRows = [['日付', '氏名', '所属', '現場', '開始', '終了', '休憩(分)', '実働(時間:分)', '実働(分)', '作業内容', '連絡事項', '明日の予定', '材料経費', '天気'],
      [date, name, team, site, hasTime ? tod(first) : '', hasTime ? tod(last) : '', rest, hasTime ? hm(work) : '', hasTime ? work : '', items.map(function (x) { return x.c + (x.q ? '（' + x.q + '）' : ''); }).join('／'), oneLine(note), oneLine(plan), oneLine(cost), weather]];
    var itemRows = [['日付', '氏名', '現場', '開始', '終了', '時間(分)', '時間(時間:分)', '作業内容', '数量・進捗']].concat(items.map(function (x) {
      return [date, name, site, isNaN(x.a) ? '' : tod(x.a), isNaN(x.b) ? '' : tod(x.b), isNaN(x.dur) ? '' : x.dur, isNaN(x.dur) ? '' : hm(x.dur), x.c, x.q];
    }));
    var fileTag = date + (name ? '_' + name.replace(/[\s　\\\/:*?"<>|]/g, '') : '');

    el.innerHTML = '<div class="res-title"><h2>日報ができました</h2><p class="sub">' + esc(T.jpDate(date, true)) + '　文面はコピーしてLINE・メールへ、紙で出すなら印刷（PDF保存）してください</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + (hasTime ? hm(work) : '—') + '</div><div class="lab">実働' + (hasTime ? '（' + esc(range) + '・休憩' + rest + '分）' : '時間（時刻が未入力）') + '</div></div>' +
      '<div class="res-stat"><div class="big">' + items.length + '<small>件</small></div><div class="lab">作業の件数</div></div>' +
      '<div class="res-stat"><div class="big' + (over ? '' : ' txt') + '">' + (over ? hm(over) : hasTime ? '8時間以内' : '—') + '</div><div class="lab">' + (over ? '8時間を超えた時間' : hasTime ? '8時間を超えた時間はありません' : '時刻を入れると実働時間が出ます') + '</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="copy">文面をコピー（LINE・メール用）</button><button type="button" class="btn btn--outline btn--sm" id="print">日報を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="csvDay">CSVで保存（1日1行）</button><button type="button" class="btn btn--outline btn--sm" id="csvItems">CSVで保存（作業の明細）</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Message</span><span class="d">LINE・メールに貼る文面</span></div>' +
      '<div class="rep-text" id="repText">' + esc(text) + '</div>' +
      (warn ? '<div class="note-red"><b>入力の確認</b>' + esc(warn) + '</div>' : '') +
      '<div class="min"><b>CSVの使い方</b>「1日1行」のCSVを毎日保存し、月末にExcelで行をつなげると月報になります。残業時間の区分や概算は <a href="/tools/timecard">タイムカード集計</a> で出せます。</div></div>' +
      '<div class="doc-wrap">' + doc + '</div>' +
      '<div class="again">ほかのツール：<a href="/tools/timecard">タイムカード集計</a><a href="/tools/booking-sheet">予約表メーカー</a><a href="/tools/order-summary">注文集計・出荷指示書</a><a href="/tools/invoice">請求書・見積書メーカー</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    $('#copy').addEventListener('click', function () { T.copyText(text, $('#copy'), $('#repText')); T.track('tool_copy', { kind: KIND }); });
    $('#print').addEventListener('click', function () { T.track('tool_print', { kind: KIND }); window.print(); });
    $('#csvDay').addEventListener('click', function () { T.saveCsv('日報_' + fileTag + '.csv', dayRows, 'utf8'); T.track('tool_download', { kind: KIND, file: 'day' }); });
    $('#csvItems').addEventListener('click', function () { T.saveCsv('日報明細_' + fileTag + '.csv', itemRows, 'utf8'); T.track('tool_download', { kind: KIND, file: 'items' }); });
    // 相談フォームに引き継ぐメモは概要だけ（氏名・現場名・作業内容は入れない）
    var memoShort = ['【日報】' + md + dow, hasTime ? '時間：' + range + '（休憩' + rest + '分・実働' + hm(work) + (over ? '・8時間超 ' + hm(over) : '') + '）' : '時間：未入力', '作業：' + items.length + '件'].join('\n');
    T.renderCtas($('#ctas'), { memo: memoShort, kind: KIND, memoLabel: '概要をコピー', shareTitle: '実働時間の概要を共有する', shareDesc: '日付・実働時間・作業の件数だけの短いテキストです（氏名や作業内容は入りません）。日報の全文は、上の「文面をコピー（LINE・メール用）」から取れます。',
      quoteTitle: '日報の集計を仕組みにする相談', quoteDesc: 'スマホで出した日報を自動で一覧にためて、現場別・人別の時間を月末に集計する仕組みを組みます。今の日報の様式のままで始められます。', quoteBtn: '相談を依頼する →',
      askExamples: '「LINEで送った日報を自動で表にためられる？」「写真つきの日報にできる？」', lineUrl: T.LINE_URL,
      extraFields: [['実働', hasTime ? hm(work) : '—'], ['作業', items.length + '件'], ['8時間超', over ? hm(over) : 'なし']] });
    T.track('tool_result', { kind: KIND, items: items.length, work_min: work });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', build);
})();
