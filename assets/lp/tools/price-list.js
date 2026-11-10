/* /tools/price-list — 価格表メーカー
 * 1行に「品名・定価（現行単価）・個別の率」の一覧を貼り、掛率（定価×率）か値上げ・値下げ（現行×(100+率)%）を選ぶと、
 * 端数を丸めた価格表（得意先別の価格表／新旧価格表とお知らせ）を作る。金額は税抜として扱い、消費税は計算しない。
 * 入力はブラウザの中だけで処理し、サーバーには送らない。localStorage にも置かない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;
  var KIND = 'tools-price-list';
  function clean(s) { return String(s || '').replace(/[\s　]+/g, ' ').trim(); }
  // 「70」「70%」「-3」「−3」「＋5」→ 数。空欄・数でないものは NaN
  function pctCell(s) {
    var t = String(s == null ? '' : s).normalize('NFKC').replace(/[\s%]/g, '').replace(/[−‐ー―]/g, '-').replace(/^\+/, '');
    if (t === '' || !/^-?\d+(\.\d+)?$/.test(t)) return NaN;
    return Number(t);
  }
  function parseLine(line) {
    var c = T.splitLine(line).map(clean);
    if (c.length < 2 || !c[0]) return null;
    var base = T.num(c[1]);
    if (isNaN(base) || base < 0) return null;
    return { name: c[0], base: base, own: pctCell(c[2]) };
  }
  // 率は小数1桁まで。浮動小数の誤差で丸めの境目がずれないよう、整数にしてから計算する
  function calc(base, pct, kind, unit, mode) {
    var p10 = Math.round(pct * 10);
    var raw = kind === 'rate' ? base * p10 / 1000 : base * (1000 + p10) / 1000;
    var q = raw / unit;
    var n = mode === 'ceil' ? Math.ceil(q - 1e-9) : mode === 'floor' ? Math.floor(q + 1e-9) : Math.round(q + 1e-9);
    return { raw: raw, price: Math.max(0, n * unit) };
  }
  function pctStr(x) { return (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, ''); }

  var kindEl = $('#kind'), pctEl = $('#pct'), dateEl = $('#date');
  if (!dateEl.value) dateEl.value = T.isoToday();
  function syncKind() {
    var rev = kindEl.value === 'rev';
    $('#pctLabel').textContent = rev ? '値上げ・値下げの率（%。値下げは −）' : '掛率（%）';
    $('#dateLabel').textContent = rev ? '改定の実施日' : '適用開始日';
    if (rev && pctEl.value === '65') pctEl.value = '8';
    if (!rev && pctEl.value === '8') pctEl.value = '65';
  }
  kindEl.addEventListener('change', syncKind); syncKind();

  function run() {
    var kind = kindEl.value, rev = kind === 'rev', unit = Number($('#unit').value) || 1, mode = $('#rmode').value;
    var pct = Number(pctEl.value), iso = dateEl.value || T.isoToday();
    var to = clean($('#to').value), me = clean($('#me').value), note = clean($('#note').value), reason = clean($('#reason').value);
    var el = $('#result'); el.hidden = false;
    if (pctEl.value.trim() === '' || isNaN(pct) || (!rev && pct <= 0)) {
      el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">' + (rev ? '値上げ・値下げの率（例：8、−5）' : '掛率（例：65）') + 'を数字で入れてください。</div>';
      return;
    }
    var rows = [], bad = [];
    $('#items').value.split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var p = parseLine(line);
      if (!p) { bad.push({ no: i + 1, t: clean(line).slice(0, 60) }); return; }
      p.pct = isNaN(p.own) ? pct : p.own; p.isOwn = !isNaN(p.own);
      var r = calc(p.base, p.pct, kind, unit, mode);
      p.price = r.price; p.diff = p.price - p.base;
      p.act = p.base > 0 ? (rev ? (p.price / p.base - 1) * 100 : p.price / p.base * 100) : NaN;
      rows.push(p);
    });
    if (!rows.length) {
      el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">一覧を、1行に「品名　定価」の形で貼ってください（読めた行：0）。</div>';
      return;
    }
    var valid = rows.filter(function (p) { return !isNaN(p.act); });
    var avg = valid.length ? valid.reduce(function (a, p) { return a + p.act; }, 0) / valid.length : NaN;
    var ownN = rows.filter(function (p) { return p.isOwn; }).length;
    var unitL = unit + '円単位', modeL = ({ round: '四捨五入', ceil: '切り上げ', floor: '切り捨て' })[mode];
    var dateL = T.jpDate(iso), sign = function (n) { return (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n)); };
    var actL = function (p) { return isNaN(p.act) ? '—' : (rev ? (p.act > 0 ? '+' : p.act < 0 ? '−' : '') + pctStr(Math.abs(p.act)) : pctStr(p.act)) + '%'; };
    var allDown = rev && rows.every(function (p) { return p.diff <= 0; });
    var big50 = rev ? rows.filter(function (p) { return Math.abs(p.pct) > 50; }) : [];
    var H = rev ? ['現行単価', '新単価', '差額', '実際の率'] : ['定価', '価格', '差額', '実際の率'];

    var tbl = '<div class="tbl tbl--wrap tbl--3"><table><thead><tr><th>品名</th><th class="r">' + H[0] + '</th><th class="r">' + H[1] + '<br><small>' + H[2] + '（' + H[3] + '）</small></th></tr></thead><tbody>' +
      rows.map(function (p) { return '<tr><td>' + esc(p.name) + (p.isOwn ? ' <span class="tag">個別 ' + esc(pctStr(p.pct)) + '%</span>' : '') + '</td><td class="r">' + fmt(p.base) + '</td><td class="r"><b>' + fmt(p.price) + '</b><br><small style="color:var(--text-3)">' + sign(p.diff) + '（' + actL(p) + '）</small></td></tr>'; }).join('') +
      '</tbody></table></div>';
    var notes = '';
    if (big50.length) notes += '<div class="note-red"><b>率が50%を超える品があります</b>' + esc(big50.map(function (p) { return p.name + '（' + pctStr(p.pct) + '%）'; }).join('、')) + '。掛率の数字（70 など）が3列目に残っていないか確認してください。</div>';
    if (bad.length) notes += '<div class="note-red"><b>読めなかった行（' + bad.length + '行・表に入っていません）</b>' + bad.slice(0, 10).map(function (b) { return esc(b.no + '行目：' + b.t); }).join('<br>') + (bad.length > 10 ? '<br>ほか ' + (bad.length - 10) + '行' : '') + '<br>2列目の定価（現行単価）が数字で入っているか確認してください。</div>';

    // ---- A4 ----
    var party = '<div class="doc-party"><div>' + (to ? '<div class="doc-to">' + esc(to) + '</div>' : '') + '</div><div class="doc-from">' + (me ? '<b>' + esc(me) + '</b>' : '') + '</div></div>';
    var doc;
    if (rev) {
      var body = '拝啓　時下ますますご清栄のこととお慶び申し上げます。平素は格別のお引き立てを賜り、厚く御礼申し上げます。\n' +
        (allDown ? 'さて、このたび弊社では、' + dateL + 'より下記のとおり価格を改定いたしますので、お知らせ申し上げます。\n今後とも変わらぬお引き立てを賜りますよう、お願い申し上げます。'
          : 'さて、弊社では' + (reason ? reason + 'が続くなか、' : '') + '価格の維持に努めてまいりましたが、自助努力だけでは吸収が難しい状況となりました。\nつきましては、誠に不本意ではございますが、' + dateL + 'より下記のとおり価格を改定させていただきたく、お願い申し上げます。\n何とぞ事情をご賢察のうえ、ご理解を賜りますようお願い申し上げます。');
      doc = '<div class="doc print-target" id="doc"><p class="doc-meta">' + esc(T.jpDate(T.isoToday())) + '</p>' + party +
        '<h2 class="doc-title" style="letter-spacing:.1em;font-size:20px">価格改定のお知らせ</h2><div class="doc-body">' + esc(body) + '</div><p class="doc-end">敬具</p><p class="doc-center">記</p>' +
        '<p class="doc-subject">実施日：' + esc(dateL) + '　ご注文分より</p>' +
        '<table class="pl-items"><colgroup><col class="c-n"><col><col class="c-p"><col class="c-p"><col class="c-p"></colgroup><thead><tr><th>No.</th><th>品名</th><th>現行単価</th><th>新単価</th><th>差額</th></tr></thead><tbody>' +
        rows.map(function (p, i) { return '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(p.name) + '</td><td class="num">' + fmt(p.base) + '</td><td class="num"><b>' + fmt(p.price) + '</b></td><td class="num">' + sign(p.diff) + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<p style="font-size:11px;margin:0;text-align:right">単位：円</p>' + (note ? '<div class="doc-note">' + esc(note) + '</div>' : '') + '<p class="doc-end">以上</p></div>';
    } else {
      doc = '<div class="doc print-target" id="doc"><h2 class="doc-title">価格表</h2><p class="doc-meta">発行日：' + esc(T.jpDate(T.isoToday())) + '</p>' + party +
        '<p class="doc-subject">適用開始日：' + esc(dateL) + '</p>' +
        '<table class="pl-items"><colgroup><col class="c-n"><col><col class="c-p"><col class="c-r"><col class="c-p"></colgroup><thead><tr><th>No.</th><th>品名</th><th>定価</th><th>掛率</th><th>価格</th></tr></thead><tbody>' +
        rows.map(function (p, i) { return '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(p.name) + '</td><td class="num">' + fmt(p.base) + '</td><td class="num">' + esc(pctStr(p.pct)) + '%</td><td class="num"><b>' + fmt(p.price) + '</b></td></tr>'; }).join('') + '</tbody></table>' +
        '<p style="font-size:11px;margin:0;text-align:right">単位：円　端数は' + unitL + 'で' + modeL + '</p>' + (note ? '<div class="doc-note">' + esc(note) + '</div>' : '') + '</div>';
    }

    // ---- メール用の文面 ----
    var L = [];
    if (to) L.push(to, '');
    L.push('いつもお世話になっております。' + (me ? me + 'です。' : ''));
    if (rev) {
      L.push(allDown ? dateL + 'より、下記のとおり価格を改定いたしますのでお知らせいたします。' : (reason ? reason + 'により、' : '') + '誠に恐縮ですが、' + dateL + 'のご注文分より下記のとおり価格を改定させていただきたく、お願い申し上げます。', '');
      rows.forEach(function (p) { L.push('・' + p.name + '　' + fmt(p.base) + '円 → ' + fmt(p.price) + '円（' + sign(p.diff) + '円）'); });
    } else {
      L.push('下記のとおり価格表をお送りいたします。適用開始日は' + dateL + 'です。', '');
      rows.forEach(function (p) { L.push('・' + p.name + '　' + fmt(p.price) + '円（定価 ' + fmt(p.base) + '円）'); });
    }
    if (note) L.push('', note);
    L.push('', rev && !allDown ? '何とぞご理解を賜りますよう、お願い申し上げます。' : 'ご確認のほど、よろしくお願いいたします。');
    var text = L.join('\n');
    var csv = [['品名', rev ? '現行単価' : '定価', rev ? '改定率(%)' : '掛率(%)', rev ? '新単価' : '価格', '差額', '実際の率(%)', rev ? '実施日' : '適用開始日']].concat(
      rows.map(function (p) { return [p.name, p.base, p.pct, p.price, p.diff, isNaN(p.act) ? '' : Math.round(p.act * 10) / 10, iso]; }));

    el.innerHTML = '<div class="res-title"><h2>' + (rev ? '新旧価格表' : '価格表') + '</h2><p class="sub">' + (rev ? '現行単価 ×（100 ' + (pct < 0 ? '− ' + pctStr(-pct) : '＋ ' + pctStr(pct)) + '）%' : '定価 × ' + pctStr(pct) + '%') + '　端数は' + unitL + 'で' + modeL + '　' + esc(dateL) + 'から</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + rows.length + '<small>品目</small></div><div class="lab">価格を出した品</div></div>' +
      '<div class="res-stat"><div class="big">' + (isNaN(avg) ? '—' : (rev && avg > 0 ? '+' : rev && avg < 0 ? '−' : '') + pctStr(Math.abs(avg)) + '<small>%</small>') + '</div><div class="lab">' + (rev ? '丸めたあとの改定率の平均' : '丸めたあとの掛率の平均') + '</div></div>' +
      '<div class="res-stat"><div class="big">' + ownN + '<small>品目</small></div><div class="lab">個別の率を使った品</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="print">' + (rev ? 'お知らせと新旧価格表' : '価格表') + 'を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="csv">CSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">文面をコピー（メール用）</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Prices</span><span class="d">' + (rev ? '新旧価格表' : '価格表') + '（税抜・円）</span></div><div class="sheet-pad">' + tbl + '</div>' + notes + '</div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Message</span><span class="d">メール用の文面</span></div><div class="rep-text" id="msgText">' + esc(text) + '</div></div>' +
      '<div class="doc-wrap">' + doc + '</div>' +
      '<div class="again">ほかのツール：<a href="/tools/invoice">請求書・見積書メーカー</a><a href="/tools/cover-letter">送付状メーカー</a><a href="/tools/monthly-billing">締め請求書メーカー</a><a href="/tools/reorder-list">発注リストメーカー</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    $('#print').addEventListener('click', function () { T.track('tool_print', { kind: KIND }); window.print(); });
    $('#csv').addEventListener('click', function () { T.saveCsv((rev ? '新旧価格表_' : '価格表_') + iso + '.csv', csv, 'utf8'); T.track('tool_download', { kind: KIND }); });
    $('#copy').addEventListener('click', function () { T.copyText(text, $('#copy'), $('#msgText')); T.track('tool_copy', { kind: KIND }); });
    // 相談フォームに引き継ぐメモは条件と件数だけ（宛先・品名・価格は入れない）
    var memo = '【' + (rev ? '新旧価格表' : '価格表') + '】' + rows.length + ' 品目\n' + (rev ? '改定率 ' + pctStr(pct) + '%' : '掛率 ' + pctStr(pct) + '%') + '・端数 ' + unitL + 'で' + modeL + '・' + dateL + 'から';
    T.renderCtas($('#ctas'), {
      memo: memo, kind: KIND, memoLabel: '条件の概要をコピー', shareTitle: '価格表の条件を共有する', shareDesc: '品目数・率・丸め方だけの短いテキストです（品名や価格は入りません）。お渡しする文面は、上の「文面をコピー（メール用）」から取れます。',
      quoteTitle: '見積と単価の管理を仕組みにする相談', quoteDesc: '得意先ごとの掛率を台帳にして、品を選ぶだけで見積書と価格表が出る仕組みを組みます。今のExcelの商品台帳のままで始められます。', quoteBtn: '相談を依頼する →',
      askExamples: '「得意先ごとの掛率を覚えさせられる？」「見積書まで続けて作れる？」', lineUrl: T.LINE_URL,
      extraFields: [['表', rev ? '新旧価格表' : '価格表'], ['品目', rows.length + '品目'], ['率', pctStr(pct) + '%']]
    });
    T.track('tool_result', { kind: KIND, mode: kind, items: rows.length });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
})();
