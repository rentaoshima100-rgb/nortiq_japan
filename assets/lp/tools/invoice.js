/* /tools/invoice — 請求書・見積書・納品書・領収書・発注書メーカー
 * 税率ごとに税抜額を合計 → 税率を掛けて端数処理を1回（適格請求書の要件）。源泉徴収は税抜合計 × 10.21%（100万円以下）。
 * 入力はこのページの中だけで処理し、サーバーには送らない。localStorage にも置かない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;
  var KINDS = {
    invoice: { t: '請求書', lead: '下記のとおりご請求申し上げます。', dueLabel: 'お支払期限', total: 'ご請求金額', bank: true, noLabel: '請求番号' },
    quote: { t: '見積書', lead: '下記のとおりお見積り申し上げます。', dueLabel: '有効期限', total: 'お見積金額', bank: false, noLabel: '見積番号' },
    delivery: { t: '納品書', lead: '下記のとおり納品いたしました。', dueLabel: '納品日', total: '合計金額', bank: false, noLabel: '納品番号' },
    receipt: { t: '領収書', lead: '上記、正に領収いたしました。', dueLabel: '', total: '領収金額', bank: false, noLabel: '領収番号' },
    order: { t: '発注書', lead: '下記のとおり発注いたします。', dueLabel: '納期', total: '発注金額', bank: false, noLabel: '発注番号' }
  };
  var SAMPLE = [{ n: '定期保守作業（10月分）', q: 1, u: '式', p: 80000, r: 10 }, { n: 'ホームページ更新作業', q: 3, u: '時間', p: 6000, r: 10 }, { n: '資料用 飲料（軽減税率）', q: 24, u: '本', p: 120, r: 8 }];
  var rowsEl = $('#rows');

  function isoToday() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function jpDate(iso) { if (!iso) return ''; var p = iso.split('-'); return p.length === 3 ? Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日' : iso; }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  if (!$('#date').value) $('#date').value = isoToday();
  if (!$('#due').value) $('#due').value = addDays($('#date').value, 30);

  function addRow(p) {
    if (rowsEl.children.length >= 15) return;
    var row = T.el('div', 'calc-row calc-row--inv');
    row.innerHTML = '<div><label>品名・内容</label><input type="text" data-k="n" value="' + esc(p ? p.n : '') + '" placeholder="例：〇〇作業一式" maxlength="60"></div>' +
      '<div><label>数量</label><input type="number" data-k="q" min="0" step="any" value="' + (p ? p.q : 1) + '" inputmode="decimal"></div>' +
      '<div><label>単位</label><input type="text" data-k="u" value="' + esc(p ? p.u : '式') + '" maxlength="6"></div>' +
      '<div><label>単価（税抜）</label><input type="number" data-k="p" min="0" step="1" value="' + (p ? p.p : '') + '" inputmode="numeric"></div>' +
      '<div><label>税率</label><select data-k="r"><option value="10"' + (!p || p.r === 10 ? ' selected' : '') + '>10%</option><option value="8"' + (p && p.r === 8 ? ' selected' : '') + '>軽減8%</option><option value="0">不課税</option></select></div>' +
      '<button type="button" class="del" aria-label="この行を削除">✕ <span class="del-t">削除</span></button>';
    row.querySelector('.del').addEventListener('click', function () { row.remove(); });
    rowsEl.appendChild(row);
  }
  SAMPLE.forEach(addRow);
  $('#addRow').addEventListener('click', function () { addRow(); });

  function roundTax(x, mode) { return mode === 'ceil' ? Math.ceil(x) : mode === 'round' ? Math.round(x) : Math.floor(x); }
  function v(id) { return $(id).value.trim(); }

  function build() {
    var kind = KINDS[v('#kind')] || KINDS.invoice;
    var items = [];
    rowsEl.querySelectorAll('.calc-row').forEach(function (row) {
      var n = row.querySelector('[data-k="n"]').value.trim(), q = Number(row.querySelector('[data-k="q"]').value) || 0, u = row.querySelector('[data-k="u"]').value.trim(), p = Number(row.querySelector('[data-k="p"]').value) || 0, r = Number(row.querySelector('[data-k="r"]').value);
      if (!n && !p) return;
      items.push({ n: n || '（品名未入力）', q: q, u: u, p: p, r: r, amt: Math.round(q * p) });
    });
    var el = $('#result'); el.hidden = false;
    if (!items.length) { el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">明細を1行以上入れてください。</div>'; return; }
    var mode = v('#round');
    var byRate = {};
    items.forEach(function (x) { byRate[x.r] = (byRate[x.r] || 0) + x.amt; });
    var sub = items.reduce(function (a, x) { return a + x.amt; }, 0);
    var taxRows = Object.keys(byRate).map(Number).sort(function (a, b) { return b - a; }).map(function (r) { return { r: r, base: byRate[r], tax: roundTax(byRate[r] * r / 100, mode) }; });
    var tax = taxRows.reduce(function (a, x) { return a + x.tax; }, 0);
    var wht = v('#wht') === '1' ? Math.floor(sub * 0.1021) : 0;
    var total = sub + tax - wht;
    var date = v('#date'), due = v('#due'), docno = v('#docno'), to = v('#to'), honor = v('#honor'), subject = v('#subject'), me = v('#me'), regno = v('#regno'), addr = v('#addr'), bank = v('#bank'), note = v('#note');

    var doc = '<div class="doc print-target" id="doc"><h2 class="doc-title">' + esc(kind.t) + '</h2>' +
      '<p class="doc-meta">' + (docno ? esc(kind.noLabel) + '：' + esc(docno) + '<br>' : '') + '発行日：' + esc(jpDate(date)) + '</p>' +
      '<div class="doc-party"><div><div class="doc-to">' + esc(to || '（相手先）') + '　' + esc(honor) + '</div>' +
      (subject ? '<p class="doc-subject">件名：' + esc(subject) + '</p>' : '') +
      (kind.dueLabel && due ? '<p class="doc-subject">' + esc(kind.dueLabel) + '：' + esc(jpDate(due)) + '</p>' : '') +
      '<p class="doc-subject">' + esc(kind.t === '領収書' ? '' : kind.lead) + '</p>' +
      '<div class="doc-total">' + esc(kind.total) + '<b>¥' + fmt(total) + '</b><small>（税込' + (wht ? '・源泉徴収後' : '') + '）</small></div></div>' +
      '<div class="doc-from"><b>' + esc(me || '（自社名）') + '</b>' + esc(addr) + (regno ? '\n登録番号：' + esc(regno) : '') + (kind.t === '領収書' ? '<span class="doc-stamp">収入印紙</span>' : '') + '</div></div>' +
      '<table class="doc-items"><colgroup><col><col class="c-q"><col class="c-u"><col class="c-p"><col class="c-a"></colgroup><thead><tr><th>品名・内容</th><th>数量</th><th>単位</th><th>単価</th><th>金額（税抜）</th></tr></thead><tbody>' +
      items.map(function (x) { return '<tr><td>' + esc(x.n) + (x.r === 8 ? ' <small>※</small>' : '') + '</td><td class="num">' + fmt(x.q) + '</td><td>' + esc(x.u) + '</td><td class="num">' + fmt(x.p) + '</td><td class="num">' + fmt(x.amt) + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<table class="doc-sum"><tbody><tr><th>小計（税抜）</th><td class="num">¥' + fmt(sub) + '</td></tr>' +
      taxRows.map(function (t) { return '<tr><th>' + (t.r === 0 ? '不課税' : t.r + '%対象') + '（税抜 ¥' + fmt(t.base) + '）の消費税' + (t.r === 8 ? '　※軽減税率' : '') + '</th><td class="num">¥' + fmt(t.tax) + '</td></tr>'; }).join('') +
      (wht ? '<tr><th>源泉所得税（10.21%）</th><td class="num">−¥' + fmt(wht) + '</td></tr>' : '') +
      '<tr><th>合計</th><td class="num"><b>¥' + fmt(total) + '</b></td></tr></tbody></table>' +
      (kind.t === '領収書' ? '<p class="doc-subject">但し　' + esc(subject || '上記の通り') + '　として、' + esc(kind.lead) + '</p>' : '') +
      (kind.bank && bank ? '<div class="doc-note">お振込先\n' + esc(bank) + '</div>' : '') +
      (note ? '<div class="doc-note">備考\n' + esc(note) + '</div>' : '') +
      (taxRows.some(function (t) { return t.r === 8; }) ? '<p style="font-size:11px;margin-top:6px">※は軽減税率（8%）対象。消費税額は税率ごとに端数処理（' + ({ floor: '切り捨て', round: '四捨五入', ceil: '切り上げ' })[mode] + '）。</p>' : '') +
      '</div>';

    var text = ['【' + kind.t + '】' + (docno ? docno : ''), (to || '（相手先）') + ' ' + honor, '発行日：' + jpDate(date) + (kind.dueLabel && due ? '　' + kind.dueLabel + '：' + jpDate(due) : ''), subject ? '件名：' + subject : '', '', kind.lead, '']
      .concat(items.map(function (x) { return '・' + x.n + '　' + fmt(x.q) + x.u + ' × ' + fmt(x.p) + '円 ＝ ' + fmt(x.amt) + '円' + (x.r === 8 ? '（軽減8%）' : x.r === 0 ? '（不課税）' : ''); }))
      .concat(['', '小計（税抜）：' + fmt(sub) + '円'].concat(taxRows.map(function (t) { return '消費税（' + (t.r === 0 ? '不課税' : t.r + '%') + '）：' + fmt(t.tax) + '円'; })), wht ? ['源泉所得税（10.21%）：−' + fmt(wht) + '円'] : [], ['合計：' + fmt(total) + '円', '', me, addr, regno ? '登録番号：' + regno : '', kind.bank && bank ? '\nお振込先\n' + bank : '', note ? '\n' + note : '']).filter(function (s) { return s !== null; }).join('\n');
    var csv = [['品名', '数量', '単位', '単価', '税率', '金額（税抜）']].concat(items.map(function (x) { return [x.n, x.q, x.u, x.p, x.r + '%', x.amt]; }))
      .concat([[], ['小計', '', '', '', '', sub]], taxRows.map(function (t) { return ['消費税 ' + t.r + '%', '', '', '', '', t.tax]; }), wht ? [['源泉所得税', '', '', '', '', -wht]] : [], [['合計', '', '', '', '', total]])
      .map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');

    el.innerHTML = '<div class="res-title"><h2>' + esc(kind.t) + 'ができました</h2><p class="sub">画面の内容を確認して、印刷（PDF保存）・CSV・コピーで手元に残してください</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">¥' + fmt(total) + '</div><div class="lab">' + esc(kind.total) + '（税込）</div></div>' +
      '<div class="res-stat"><div class="big">¥' + fmt(tax) + '</div><div class="lab">消費税（' + taxRows.map(function (t) { return t.r + '%'; }).join('・') + '）</div></div>' +
      '<div class="res-stat"><div class="big">' + items.length + '<small>行</small></div><div class="lab">明細（税抜小計 ¥' + fmt(sub) + '）</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="print">印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="csv">明細をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">文面をコピー</button><button type="button" class="btn btn--outline btn--sm" id="other">別の書類を作る</button></div>' +
      '<div class="doc-wrap">' + doc + '</div>' +
      '<div class="again">ほかのツール：<a href="/tools/cover-letter">送付状メーカー</a><a href="/tools/payment-match">入金消し込み照合</a><a href="/tools/order-summary">注文集計・出荷指示書</a><a href="/tools/address-list">宛先リスト整形（送り状用）</a></div>' +
      '<div class="ctas" id="ctas"></div>';
    $('#print').addEventListener('click', function () { T.track('tool_print', { kind: 'tools-invoice' }); window.print(); });
    $('#csv').addEventListener('click', function () { T.download(kind.t + '_' + (docno || date) + '.csv', '﻿' + csv, 'text/csv;charset=utf-8'); T.track('tool_download', { kind: 'tools-invoice' }); });
    $('#copy').addEventListener('click', function () { T.copyText(text, $('#copy')); });
    $('#other').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    T.renderCtas($('#ctas'), { memo: text, kind: 'tools-invoice', memoLabel: '文面をコピー', shareTitle: 'この書類の文面をコピーする', shareDesc: 'メール本文にそのまま貼れる文面です。PDFは上の「印刷・PDF保存」で保存できます。',
      quoteTitle: '請求書の発行を毎月自動にする相談', quoteDesc: '販売管理ソフトやExcelの売上から、取引先ごとの請求書を自動で作って送る仕組みを、月1.2万円〜の月額で組みます。', quoteBtn: '相談を依頼する →', askExamples: '「うちの販売管理ソフトからも作れる？」「電子帳簿保存法の保存はどうする？」', lineUrl: T.LINE_URL,
      extraFields: [['書類', kind.t], ['明細', items.length + '行'], ['合計', fmt(total) + '円']] });
    T.track('tool_result', { kind: 'tools-invoice', doc: v('#kind') });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', build);
  var q = new URLSearchParams(location.search).get('kind'); if (q && KINDS[q]) $('#kind').value = q;
})();
