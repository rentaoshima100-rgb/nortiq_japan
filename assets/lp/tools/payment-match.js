/* /tools/payment-match — 入金消し込み照合
 * 請求一覧（取引先名・金額・番号・日付・カナ名義）と入金一覧（日付・名義・金額）を名義と金額で突き合わせる。
 * 判定: 名義一致+金額一致 → 消し込み済み / 名義一致+差額≤手数料 → 手数料差引 / 金額一致で請求・入金とも1件 → 消し込み済み（名義要確認）
 *       差額≤手数料で1件ずつ → 手数料差引（名義要確認） / 名義一致+差額>手数料 → 金額不一致 / 残り → 未入金・不明入金
 * 入力はブラウザの中だけで処理し、サーバーには送らない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;

  function norm(s) {
    s = String(s || '').normalize('NFKC').replace(/\s+/g, '');
    s = s.replace(/[ぁ-ゖ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + 0x60); }); // ひらがな→カタカナ
    s = s.replace(/株式会社|有限会社|合同会社|合資会社|合名会社|医療法人|社会福祉法人|一般社団法人|\(株\)|\(有\)|\(同\)|（株）|（有）|（同）/g, '');
    s = s.replace(/^(カ|ユ|ド|シヤ|イ|ザイ|キヨウ|フク|ガク|カブシキガイシヤ|ユウゲンガイシヤ)[\)）]/, '').replace(/[\(（](カ|ユ|ド|シヤ|イ|ザイ|キヨウ|フク|ガク)$/, '');
    s = s.replace(/[ァィゥェォャュョッ]/g, function (c) { return { 'ァ': 'ア', 'ィ': 'イ', 'ゥ': 'ウ', 'ェ': 'エ', 'ォ': 'オ', 'ャ': 'ヤ', 'ュ': 'ユ', 'ョ': 'ヨ', 'ッ': 'ツ' }[c]; });
    s = s.replace(/[ー－‐\-・.,。、]/g, '').replace(/御中|様$/g, '');
    return s.toUpperCase();
  }
  function num(s) { var m = String(s || '').normalize('NFKC').replace(/[,，円¥￥\s]/g, '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; }
  function isDate(s) { return /^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$|^\d{1,2}[\/\-.]\d{1,2}$|^\d{8}$/.test(String(s).trim()); }
  // タブ区切り（Excel からのコピー）はタブだけで切る。カンマ区切りは「165,000」のような桁区切り（数字3桁の組）を先に守ってから切る。
  function split(line) {
    if (line.indexOf('\t') >= 0) return line.split('\t').map(function (c) { return c.replace(/^"|"$/g, '').trim(); });
    var kept = line.replace(/"([^"]*)"/g, function (m, q) { return q.replace(/,/g, '\u0001'); })
      .replace(/(^|[^\d\/\-.])(\d{1,3}(?:,\d{3})+)(?!\d)/g, function (m, pre, n) { return pre + n.replace(/,/g, '\u0001'); });
    return kept.split(/,|、|\s{2,}/).map(function (c) { return c.replace(/\u0001/g, ',').trim(); });
  }

  function parseBills(txt) {
    var out = [];
    txt.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var c = split(line).filter(Boolean); if (c.length < 2) return;
      var name = c[0], amt = NaN, no = '', date = '', kana = '';
      for (var i = 1; i < c.length; i++) {
        var x = c[i];
        if (isNaN(amt) && !isNaN(num(x)) && !isDate(x) && !/^[A-Za-z]/.test(x) && !/[^\d,，.円¥￥\-\s]/.test(x.normalize('NFKC'))) amt = num(x);
        else if (isDate(x)) date = x;
        else if (/^[ァ-ヶー\s]+$/.test(x.normalize('NFKC'))) kana = x;
        else if (!no) no = x;
      }
      if (isNaN(amt)) return;
      out.push({ name: name, amt: amt, no: no, date: date, kana: kana, key: norm(name), key2: kana ? norm(kana) : '', used: false });
    });
    return out;
  }
  function parsePays(txt) {
    var out = [];
    txt.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var c = split(line).filter(Boolean); if (c.length < 2) return;
      var date = '', name = '', amt = NaN;
      c.forEach(function (x) {
        if (isDate(x) && !date) date = x;
        else if (!isNaN(num(x)) && !/[^\d,，.円¥￥\-\s]/.test(x.normalize('NFKC'))) { if (isNaN(amt)) amt = num(x); }
        else if (!name) name = x;
      });
      if (isNaN(amt)) return;
      out.push({ date: date, name: name, amt: amt, key: norm(name), used: false });
    });
    return out;
  }
  function nameMatch(b, p) { return p.key && (p.key === b.key || (b.key2 && p.key === b.key2) || (p.key.length >= 3 && (b.key.indexOf(p.key) >= 0 || (b.key2 && b.key2.indexOf(p.key) >= 0))) || (b.key.length >= 3 && p.key.indexOf(b.key) >= 0)); }

  function match(bills, pays, fee) {
    var res = [];
    function take(b, p, status, note) { b.used = true; p.used = true; res.push({ st: status, b: b, p: p, diff: p.amt - b.amt, note: note || '' }); }
    // 1. 名義一致 + 金額一致
    bills.forEach(function (b) { if (b.used) return; var p = pays.find(function (p) { return !p.used && p.amt === b.amt && nameMatch(b, p); }); if (p) take(b, p, '消し込み済み'); });
    // 2. 名義一致 + 差額 ≤ 手数料
    bills.forEach(function (b) { if (b.used) return; var p = pays.find(function (p) { return !p.used && b.amt - p.amt > 0 && b.amt - p.amt <= fee && nameMatch(b, p); }); if (p) take(b, p, '手数料差引', '差額 ' + fmt(b.amt - p.amt) + '円'); });
    // 3. 金額一致で、その金額の未消込の請求・入金が1件ずつ
    bills.forEach(function (b) {
      if (b.used) return;
      var bs = bills.filter(function (x) { return !x.used && x.amt === b.amt; }), ps = pays.filter(function (p) { return !p.used && p.amt === b.amt; });
      if (bs.length === 1 && ps.length === 1) take(b, ps[0], '消し込み済み（名義要確認）', '名義「' + ps[0].name + '」');
    });
    // 4. 差額 ≤ 手数料 で1件ずつ
    bills.forEach(function (b) {
      if (b.used) return;
      var ps = pays.filter(function (p) { return !p.used && b.amt - p.amt > 0 && b.amt - p.amt <= fee; });
      var bs = ps.length === 1 ? bills.filter(function (x) { return !x.used && x.amt - ps[0].amt > 0 && x.amt - ps[0].amt <= fee; }) : [];
      if (ps.length === 1 && bs.length === 1) take(b, ps[0], '手数料差引（名義要確認）', '差額 ' + fmt(b.amt - ps[0].amt) + '円・名義「' + ps[0].name + '」');
    });
    // 5. 名義一致 + 金額不一致
    bills.forEach(function (b) { if (b.used) return; var p = pays.find(function (p) { return !p.used && nameMatch(b, p); }); if (p) take(b, p, '金額不一致', (p.amt < b.amt ? '不足 ' : '過入金 ') + fmt(Math.abs(p.amt - b.amt)) + '円'); });
    bills.forEach(function (b) { if (!b.used) res.push({ st: '未入金', b: b, p: null, diff: -b.amt, note: '' }); });
    pays.forEach(function (p) { if (!p.used) res.push({ st: '不明入金', b: null, p: p, diff: p.amt, note: '' }); });
    return res;
  }

  function run() {
    var fee = Math.max(0, Number($('#fee').value) || 0), month = $('#month').value;
    var bills = parseBills($('#bills').value), pays = parsePays($('#pays').value);
    var el = $('#result'); el.hidden = false;
    if (!bills.length || !pays.length) { el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">請求一覧と入金一覧を、1行に「取引先名　金額」「日付　名義　金額」の形で貼ってください（読み取れた行：請求 ' + bills.length + '・入金 ' + pays.length + '）。</div>'; return; }
    var res = match(bills, pays, fee);
    var order = ['未入金', '金額不一致', '不明入金', '手数料差引（名義要確認）', '消し込み済み（名義要確認）', '手数料差引', '消し込み済み'];
    res.sort(function (a, b) { return order.indexOf(a.st) - order.indexOf(b.st); });
    var cnt = {}; res.forEach(function (r) { cnt[r.st] = (cnt[r.st] || 0) + 1; });
    var billed = bills.reduce(function (a, b) { return a + b.amt; }, 0), paid = pays.reduce(function (a, p) { return a + p.amt; }, 0);
    var unpaid = res.filter(function (r) { return r.st === '未入金' || r.st === '金額不一致'; });
    var unpaidAmt = unpaid.reduce(function (a, r) { return a + (r.st === '未入金' ? r.b.amt : Math.max(0, r.b.amt - r.p.amt)); }, 0);
    var done = (cnt['消し込み済み'] || 0) + (cnt['手数料差引'] || 0) + (cnt['消し込み済み（名義要確認）'] || 0) + (cnt['手数料差引（名義要確認）'] || 0);
    var d = T.today(), title = (month ? month.replace('-', '年') + '月分 ' : '') + '入金消し込み表';
    var rows = res.map(function (r) {
      var warn = /未入金|不一致|不明|要確認/.test(r.st);
      return '<tr><td class="st' + (warn ? ' warn' : '') + '">' + esc(r.st) + '</td><td>' + (r.b ? esc(r.b.name) + (r.b.no || r.b.date ? '<br><small>' + esc(r.b.no) + (r.b.date ? ' ' + esc(r.b.date) : '') + '</small>' : '') : '—') + '</td><td class="num">' + (r.b ? fmt(r.b.amt) : '—') + '</td><td>' + (r.p ? esc(r.p.date ? r.p.date + ' ' : '') + esc(r.p.name) : '—') + '</td><td class="num">' + (r.p ? fmt(r.p.amt) : '—') + '</td><td>' + esc(r.note) + '</td></tr>';
    }).join('');
    el.innerHTML = '<div class="res-title"><h2>' + esc(title) + '</h2><p class="sub">' + d + '　請求 ' + bills.length + '件 ¥' + fmt(billed) + '　入金 ' + pays.length + '件 ¥' + fmt(paid) + '　手数料の上限 ' + fmt(fee) + '円</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + done + '<small>/' + bills.length + '件</small></div><div class="lab">消し込みできた請求（要確認 ' + ((cnt['消し込み済み（名義要確認）'] || 0) + (cnt['手数料差引（名義要確認）'] || 0)) + '件を含む）</div></div>' +
      '<div class="res-stat"><div class="big">¥' + fmt(unpaidAmt) + '</div><div class="lab">未入金・不足（' + unpaid.length + '件）</div></div>' +
      '<div class="res-stat"><div class="big">' + (cnt['不明入金'] || 0) + '<small>件</small></div><div class="lab">請求に見当たらない入金</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="csv">照合表をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">未入金の一覧をコピー（督促用）</button><button type="button" class="btn btn--outline btn--sm" id="print">照合表を印刷</button></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Matching</span><span class="d">' + esc(title) + '　' + d + '</span></div>' +
      '<div class="tbl tbl--wide tbl--xl"><table><thead><tr><th>判定</th><th>請求（取引先・番号）</th><th>請求額</th><th>入金（日付・名義）</th><th>入金額</th><th>備考</th></tr></thead><tbody>' + rows + '</tbody></table><div class="tbl-hint">← 横にスクロールできます →</div></div>' +
      '<div class="note-red"><b>確認してから使ってください</b>「名義要確認」は金額だけで結びつけた候補、「手数料差引」は差額が' + fmt(fee) + '円以内のものです。明細を見て確定してください。</div></div>' +
      '<div class="doc-wrap" hidden><div class="doc print-target" id="doc"><h2 class="doc-title">' + esc(title) + '</h2><p class="doc-meta">作成日：' + d + '　請求 ' + bills.length + '件 ¥' + fmt(billed) + '／入金 ' + pays.length + '件 ¥' + fmt(paid) + '</p>' +
      '<table><thead><tr><th>判定</th><th>取引先</th><th>請求額</th><th>入金</th><th>入金額</th><th>備考</th></tr></thead><tbody>' + rows.replace(/ class="st( warn)?"/g, '') + '</tbody></table></div></div>' +
      '<div class="again">ほかのツール：<a href="/tools/invoice">請求書・見積書メーカー</a>　<a href="/tools/cover-letter">送付状メーカー（支払いのお願い）</a>　<a href="/tools/stocktake">棚卸差異チェック</a></div>' +
      '<div class="ctas" id="ctas"></div>';
    var csv = [['判定', '取引先', '請求番号', '請求日', '請求額', '入金日', '入金名義', '入金額', '差額', '備考']].concat(res.map(function (r) { return [r.st, r.b ? r.b.name : '', r.b ? r.b.no : '', r.b ? r.b.date : '', r.b ? r.b.amt : '', r.p ? r.p.date : '', r.p ? r.p.name : '', r.p ? r.p.amt : '', r.b && r.p ? r.p.amt - r.b.amt : '', r.note]; }))
      .map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var memo = ['【' + title + '】' + d, '請求 ' + bills.length + '件 ' + fmt(billed) + '円／入金 ' + pays.length + '件 ' + fmt(paid) + '円／消し込み ' + done + '件／未入金・不足 ' + unpaid.length + '件 ' + fmt(unpaidAmt) + '円／不明入金 ' + (cnt['不明入金'] || 0) + '件', '', '■ 未入金・不足（ご確認のお願い）']
      .concat(unpaid.length ? unpaid.map(function (r) { return '・' + r.b.name + (r.b.no ? '　' + r.b.no : '') + (r.b.date ? '（' + r.b.date + '）' : '') + '　' + (r.st === '未入金' ? fmt(r.b.amt) + '円 未入金' : '請求 ' + fmt(r.b.amt) + '円に対し入金 ' + fmt(r.p.amt) + '円（' + r.note + '）'); }) : ['なし'])
      .concat(['', '■ 請求に見当たらない入金'], (cnt['不明入金'] ? res.filter(function (r) { return r.st === '不明入金'; }).map(function (r) { return '・' + (r.p.date ? r.p.date + ' ' : '') + r.p.name + '　' + fmt(r.p.amt) + '円'; }) : ['なし'])).join('\n');
    $('#csv').addEventListener('click', function () { T.download('入金消し込み_' + (month || d) + '.csv', '﻿' + csv, 'text/csv;charset=utf-8'); T.track('tool_download', { kind: 'tools-payment-match' }); });
    $('#copy').addEventListener('click', function () { T.copyText(memo, $('#copy')); });
    $('#print').addEventListener('click', function () { $('.doc-wrap').hidden = false; window.print(); setTimeout(function () { $('.doc-wrap').hidden = true; }, 500); });
    T.renderCtas($('#ctas'), { memo: memo, kind: 'tools-payment-match', memoLabel: '結果をコピー', shareTitle: '未入金の一覧を経理・営業に共有する', shareDesc: '未入金と不明入金の一覧です。担当者への連絡にそのまま貼れます。',
      quoteTitle: '銀行明細との消し込みを毎日自動にする相談', quoteDesc: 'ネットバンキングの明細と販売管理ソフトの請求を毎朝突き合わせ、未入金だけを通知する仕組みを月額で組みます。', quoteBtn: '相談を依頼する →', askExamples: '「うちの銀行の明細形式でも読める？」「請求が合算で振り込まれるときは？」', lineUrl: T.LINE_URL,
      extraFields: [['請求件数', bills.length + '件'], ['消し込み', done + '件'], ['未入金', unpaid.length + '件 ' + fmt(unpaidAmt) + '円']] });
    T.track('tool_result', { kind: 'tools-payment-match', bills: bills.length, unpaid: unpaid.length });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
  if (!$('#month').value) { var d0 = new Date(); d0.setMonth(d0.getMonth() - 1); $('#month').value = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0'); }
})();
