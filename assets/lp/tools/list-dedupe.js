/* /tools/list-dedupe — 名簿の重複チェック・表記ゆれ整形
 * 貼り付けた名簿を、名前（1列目）・電話・メールで突き合わせ、重複と要確認のグループを出す。
 * 名前は 法人格・全角半角・空白・カタカナ/ひらがな・敬称 の違いを無視して比べる。
 * 入力はブラウザの中だけで処理し、サーバーには送らない（相談フォームに引き継ぐのも件数だけ）。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc, fmt = T.fmt;
  var KIND = 'tools-list-dedupe';
  var MAX_SHOW = 100, MAX_PRINT = 300;

  // 長いものから先に外す（「医療法人社団」を「医療法人」より先に）
  var CORP = ['特定非営利活動法人', '社会保険労務士法人', '一般社団法人', '一般財団法人', '公益社団法人', '公益財団法人', '社会福祉法人', '医療法人社団', '医療法人財団', '司法書士法人', '行政書士法人', '税理士法人', '弁護士法人', '医療法人', '学校法人', '宗教法人', 'NPO法人', '株式会社', '有限会社', '合同会社', '合資会社', '合名会社', '(特非)', '(株)', '(有)', '(同)', '(合)', '(資)', '(名)', '(社)', '(財)', '(医)', '(福)', '(学)'];
  var VARIANT = { '髙': '高', '﨑': '崎', '濱': '浜', '濵': '浜', '澤': '沢', '邊': '辺', '邉': '辺', '廣': '広', '齋': '斎', '齊': '斉', '國': '国', '德': '徳' };

  function nameKey(s) {
    var k = String(s == null ? '' : s).normalize('NFKC').toUpperCase().trim();
    k = k.replace(/[\s　]*(様|御中)$/, '').replace(/[\s　]+殿$/, '');
    CORP.forEach(function (c) { if (k.indexOf(c) >= 0) k = k.split(c).join(''); });
    k = k.replace(/[\s　・･.,、。'"’”“‘]/g, '').replace(/[ー‐‑‒–—―−\-]/g, 'ー');
    k = k.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
    return k.replace(/[髙﨑濱濵澤邊邉廣齋齊國德]/g, function (c) { return VARIANT[c]; });
  }
  function phoneKey(c) {
    var s = String(c == null ? '' : c).normalize('NFKC').trim();
    if (!/^(?:TEL|FAX|電話|携帯)?[:.]?\s*[\d\s()\-ー‐‑‒–—―−.+]+$/i.test(s)) return '';
    var d = s.replace(/\D/g, '');
    if (s.indexOf('+81') >= 0 && /^81\d{9,10}$/.test(d)) d = '0' + d.slice(2);
    return /^0\d{9,10}$/.test(d) ? d : '';
  }
  function mailKey(c) {
    var s = String(c == null ? '' : c).normalize('NFKC').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
  }
  function plainKey(c) { return String(c == null ? '' : c).normalize('NFKC').replace(/[\s　]/g, '').toUpperCase(); }
  // 出力用の整形：全角英数字・記号 → 半角、全角空白 → 半角、半角カナ → 全角。電話のセルはハイフンもそろえる。
  function tidy(c, isTel) {
    var s = String(c == null ? '' : c).replace(/[！-～]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); })
      .replace(/　/g, ' ').replace(/[｡-ﾟ]+/g, function (m) { return m.normalize('NFKC'); });
    if (isTel) s = s.replace(/[ー‐‑‒–—―−]/g, '-');
    return s.replace(/ {2,}/g, ' ').trim();
  }

  // union-find
  function makeUf(n) { var p = []; for (var i = 0; i < n; i++) p.push(i); return p; }
  function find(p, i) { while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; }
  function union(p, a, b) { a = find(p, a); b = find(p, b); if (a !== b) { if (a < b) p[b] = a; else p[a] = b; } }

  function parse(txt, hasHeader) {
    var header = null, rows = [], width = 0;
    txt.split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var cells = T.splitLine(line);
      if (!cells.some(function (c) { return c !== ''; })) return;
      if (cells.length > width) width = cells.length;
      if (hasHeader && !header) { header = cells; return; }
      rows.push({ no: i + 1, cells: cells });
    });
    rows.forEach(function (r) {
      while (r.cells.length < width) r.cells.push('');
      r.name = nameKey(r.cells[0]);
      r.tels = []; r.mails = []; r.telCol = {};
      r.cells.forEach(function (c, ci) {
        var t = phoneKey(c), m = mailKey(c);
        if (t) { if (r.tels.indexOf(t) < 0) r.tels.push(t); r.telCol[ci] = true; }
        if (m && r.mails.indexOf(m) < 0) r.mails.push(m);
      });
      r.full = r.name + '\u0001' + r.cells.slice(1).map(function (c) { return phoneKey(c) || mailKey(c) || plainKey(c); }).join('\u0001');
    });
    if (header) while (header.length < width) header.push('');
    return { header: header, rows: rows, width: width };
  }

  // 重複の判定。loose = 名前・電話・メールのどれかが同じ（画面のグループ）、strict = 名前も連絡先も同じ（または行の内容がすべて同じ）。
  function analyze(rows, mergeAll) {
    var n = rows.length, loose = makeUf(n), strict = makeUf(n);
    var link = function (map, key, i, uf) { if (map[key] == null) map[key] = i; else union(uf, map[key], i); };
    var byName = {}, byTel = {}, byMail = {}, byNameTel = {}, byNameMail = {}, byFull = {};
    rows.forEach(function (r, i) {
      if (r.name) link(byName, r.name, i, loose);
      r.tels.forEach(function (t) { link(byTel, t, i, loose); if (r.name) link(byNameTel, r.name + '|' + t, i, strict); });
      r.mails.forEach(function (m) { link(byMail, m, i, loose); if (r.name) link(byNameMail, r.name + '|' + m, i, strict); });
      if (r.name) link(byFull, r.full, i, strict);
    });
    var members = {};
    rows.forEach(function (r, i) { var g = find(loose, i); (members[g] = members[g] || []).push(i); });
    var groups = [];
    Object.keys(members).map(Number).sort(function (a, b) { return a - b; }).forEach(function (g) {
      var idx = members[g]; if (idx.length < 2) return;
      var names = {}, telCount = {}, mailCount = {}, clusters = {};
      idx.forEach(function (i) {
        var r = rows[i]; names[r.name] = true;
        r.tels.forEach(function (t) { telCount[t] = (telCount[t] || 0) + 1; });
        r.mails.forEach(function (m) { mailCount[m] = (mailCount[m] || 0) + 1; });
        var c = find(strict, i); (clusters[c] = clusters[c] || []).push(i);
      });
      var sharedTel = Object.keys(telCount).some(function (k) { return telCount[k] > 1; });
      var sharedMail = Object.keys(mailCount).some(function (k) { return mailCount[k] > 1; });
      var clusterIds = Object.keys(clusters), dup = clusterIds.length === 1;
      var nameList = Object.keys(names).filter(function (k) { return k !== ''; }), hasEmptyName = names[''] === true;
      var namedRows = idx.filter(function (i) { return rows[i].name; }).length;
      var contact = (sharedTel ? '電話' : '') + (sharedTel && sharedMail ? '・' : '') + (sharedMail ? 'メール' : '');
      var reason;
      if (dup) reason = contact ? '名前・' + contact + 'が一致' : '行の内容がすべて一致';
      else if (nameList.length === 1 && !hasEmptyName) reason = '名前が同じ、連絡先は違うか空欄';
      else if (nameList.length === namedRows) reason = contact + 'が同じ、名前が違う';
      else if (hasEmptyName && nameList.length === 1) reason = contact + 'が同じ、名前が空の行がある';
      else reason = '名前か連絡先のどちらかが同じ';
      var grp = { no: groups.length + 1, dup: dup, label: dup ? '重複' : '要確認', reason: reason, rows: [] };
      var mergeSets = mergeAll ? [idx] : clusterIds.map(function (c) { return clusters[c]; });
      mergeSets.forEach(function (set) {
        set.forEach(function (i, k) {
          var r = rows[i]; r.group = grp;
          r.keep = k === 0; r.mergeFrom = k === 0 ? set.slice(1) : null;
          r.status = k > 0 ? '重複' : (dup || mergeAll ? '残す' : '要確認');
        });
      });
      idx.forEach(function (i) { grp.rows.push(rows[i]); });
      groups.push(grp);
    });
    return groups;
  }

  function opt(id) { var e = $(id); return !!(e && e.checked); }
  function encChoice() { var e = document.querySelector('input[name="enc"]:checked'); return e && e.value === 'sjis' ? 'sjis' : 'utf8'; }
  function rowText(r) { return r.cells.filter(function (c) { return c !== ''; }).join(' / '); }

  function run(noScroll) {
    var txt = $('#list').value;
    var hasHeader = opt('#hdr'), fill = opt('#fill'), norm = opt('#norm'), mergeAll = opt('#mergeAll');
    var el = $('#result'); el.hidden = false;
    var t0 = Date.now();
    var p = parse(txt, hasHeader), rows = p.rows;
    if (!rows.length) { el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">名簿を貼り付けてください。1行が1件、1列目が名前（会社名・氏名）です。' + (hasHeader ? '「1行目は見出し」にチェックが入っているので、2行目からを名簿として読みます。' : '') + '</div>'; return; }
    rows.forEach(function (r) { r.group = null; r.keep = true; r.mergeFrom = null; r.status = ''; });
    var groups = analyze(rows, mergeAll);
    var dupGroups = groups.filter(function (g) { return g.dup; }).length, chkGroups = groups.length - dupGroups;
    var dupN = fmt(dupGroups), chkN = fmt(chkGroups);
    var inGroups = groups.reduce(function (a, g) { return a + g.rows.length; }, 0);
    var kept = rows.filter(function (r) { return r.keep; }), removed = rows.length - kept.length;
    var chkRows = rows.filter(function (r) { return r.status === '要確認'; }).length;
    var withTel = rows.filter(function (r) { return r.tels.length; }).length, withMail = rows.filter(function (r) { return r.mails.length; }).length;
    var noName = rows.filter(function (r) { return !r.name; }).length;
    var day = T.isoToday();

    // 整理後の名簿（元の列の並びのまま＋判定）
    var outCell = function (r, ci) {
      var src = r;
      if (r.cells[ci] === '' && fill && r.mergeFrom) {
        for (var k = 0; k < r.mergeFrom.length; k++) { var o = rows[r.mergeFrom[k]]; if (o.cells[ci] !== '') { src = o; break; } }
      }
      return norm ? tidy(src.cells[ci], src.telCol[ci]) : src.cells[ci];
    };
    var cleanRows = [], withJudge = !!p.header || chkRows > 0;
    if (p.header) cleanRows.push(p.header.map(function (h) { return norm ? tidy(h) : h; }).concat(['判定']));
    kept.forEach(function (r) {
      var others = r.status === '要確認' ? r.group.rows.filter(function (o) { return o !== r && o.keep; }).map(function (o) { return o.no; }) : [];
      var line = []; for (var ci = 0; ci < p.width; ci++) line.push(outCell(r, ci));
      if (withJudge) line.push(r.status === '要確認' ? '要確認：' + r.group.reason + '（元の' + others.join('・') + '行目）' : '');
      cleanRows.push(line);
    });
    // 重複の一覧
    var listRows = [['グループ', '判定', '理由', '扱い', '元の行番号'].concat(p.header ? p.header : rows[0].cells.map(function (c, i) { return '列' + (i + 1); }))];
    groups.forEach(function (g) { g.rows.forEach(function (r) { listRows.push([g.no, g.label, g.reason, r.status, r.no].concat(r.cells)); }); });

    var grpHtml = function (g) {
      return '<div class="grp"><div class="grp__h"><span>グループ' + g.no + '　<span class="tag' + (g.dup ? ' tag--warn' : '') + '">' + g.label + '</span></span><small>' + esc(g.reason) + '</small></div><ul>' +
        g.rows.map(function (r) { return '<li><span>' + r.no + '行目：' + esc(rowText(r)) + '</span><span class="tag' + (r.status === '重複' ? ' tag--warn' : '') + '">' + r.status + '</span></li>'; }).join('') + '</ul></div>';
    };
    var statLab2 = groups.length ? '重複 ' + dupN + '組・要確認 ' + chkN + '組（計' + fmt(inGroups) + '行）' : '重複・要確認のグループ';
    var title = '名簿 重複チェック結果';
    var printRows = [];
    groups.some(function (g) { g.rows.forEach(function (r) { printRows.push([g, r]); }); return printRows.length >= MAX_PRINT; });
    var firstTel = function (r) { for (var ci = 0; ci < r.cells.length; ci++) if (r.telCol[ci]) return r.cells[ci]; return ''; };
    var firstMail = function (r) { for (var ci = 0; ci < r.cells.length; ci++) if (mailKey(r.cells[ci])) return r.cells[ci]; return ''; };

    el.innerHTML = '<div class="res-title"><h2>' + title + '</h2><p class="sub">名前（1列目）・電話・メールで突き合わせました。行番号は貼り付けた内容の上からの行数です' + (hasHeader ? '（見出しが1行目）' : '') + '</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + fmt(rows.length) + '<small>件</small></div><div class="lab">元の名簿' + (hasHeader ? '（見出しを除く）' : '') + '</div></div>' +
      '<div class="res-stat"><div class="big">' + fmt(groups.length) + '<small>組</small></div><div class="lab">' + statLab2 + '</div></div>' +
      '<div class="res-stat"><div class="big">' + fmt(kept.length) + '<small>件</small></div><div class="lab">整理後の名簿（' + (removed ? fmt(removed) + '行をまとめた' : 'まとめた行なし') + '）</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="csvClean">整理後の名簿をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="csvList">重複の一覧をCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="print">重複の一覧を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">結果をコピー</button></div>' +
      '<div class="msg" id="encMsg" hidden></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Duplicates</span><span class="d">' + title + '　' + T.today() + '</span></div>' +
      '<div class="conds"><span class="ci">読み取り <b>' + fmt(rows.length) + '件・' + p.width + '列</b></span><span class="ci">電話のある行 <b>' + fmt(withTel) + '</b></span><span class="ci">メールのある行 <b>' + fmt(withMail) + '</b></span>' + (noName ? '<span class="ci">名前が空の行 <b>' + fmt(noName) + '</b></span>' : '') + '</div>' +
      (groups.length ? groups.slice(0, MAX_SHOW).map(grpHtml).join('') + (groups.length > MAX_SHOW ? '<div class="grp" style="color:var(--text-3);font-size:13.5px">画面には先頭の' + MAX_SHOW + '組を表示しています。残り' + fmt(groups.length - MAX_SHOW) + '組は「重複の一覧をCSVで保存」で確認してください。</div>' : '')
        : '<div class="grp" style="font-size:14.5px">重複は見つかりませんでした。名前・電話・メールが同じ行はありません。</div>') +
      '<div class="note-red"><b>まとめ方</b>「重複」（名前も連絡先も同じ）は先頭の行を残して1件にまとめます。「要確認」（名前だけ、または連絡先だけが同じ）は' + (mergeAll ? 'この設定では先頭の行を残して1件にまとめています。' : 'まとめずに残し、整理後のCSVの「判定」列に理由を書きます。同姓同名の別人や、代表番号が同じ別部署の可能性があるためです。') + '</div></div>' +
      '<div class="doc-wrap" hidden><div class="doc print-target" id="doc"><h2 class="doc-title">名簿 重複チェック結果</h2><p class="doc-meta">作成日：' + T.today() + '　元の名簿 ' + fmt(rows.length) + '件　重複 ' + dupN + '組・要確認 ' + chkN + '組　整理後 ' + fmt(kept.length) + '件</p>' +
      (printRows.length ? '<table><colgroup><col style="width:7%"><col style="width:12%"><col style="width:8%"><col style="width:29%"><col style="width:19%"><col style="width:25%"></colgroup><thead><tr><th>組</th><th>扱い</th><th>行</th><th>名前</th><th>電話</th><th>メール</th></tr></thead><tbody>' +
        printRows.map(function (x) { var r = x[1]; return '<tr><td class="c">' + x[0].no + '</td><td class="c">' + r.status + '</td><td class="num">' + r.no + '</td><td>' + esc(r.cells[0]) + '</td><td>' + esc(firstTel(r)) + '</td><td>' + esc(firstMail(r)) + '</td></tr>'; }).join('') + '</tbody></table>' +
        (inGroups > printRows.length ? '<p class="doc-note">印刷は先頭の' + printRows.length + '行までです。全件は「重複の一覧をCSVで保存」で出してください。</p>' : '')
        : '<p class="doc-body">重複は見つかりませんでした。</p>') +
      '<p class="doc-note">扱い：「残す」＝この行を残す　「重複」＝同じ組の「残す」の行にまとめる　「要確認」＝名前だけ・連絡先だけが同じ。目で確かめてから判断する。</p></div></div>' +
      '<div class="again">ほかのツール：<a href="/tools/address-list">宛先リスト整形</a><a href="/tools/order-summary">注文集計</a><a href="/tools/payment-match">入金消し込み照合</a><a href="/tools">ツール一覧</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    var head = '【' + title + '】' + T.today();
    var summary = [head, '元の名簿 ' + fmt(rows.length) + '件 → 整理後 ' + fmt(kept.length) + '件（' + fmt(removed) + '行をまとめた）', '重複 ' + dupN + '組／要確認 ' + chkN + '組（合わせて' + fmt(inGroups) + '行）'].join('\n');
    var full = summary + '\n\n' + (groups.length ? groups.slice(0, 300).map(function (g) {
      return '■ グループ' + g.no + '：' + g.label + '（' + g.reason + '）\n' + g.rows.map(function (r) { return '・' + r.no + '行目 ' + rowText(r) + ' → ' + r.status; }).join('\n');
    }).join('\n\n') + (groups.length > 300 ? '\n\n（以下省略。全件はCSVで保存してください）' : '') : '重複は見つかりませんでした。');

    var encMsg = $('#encMsg');
    var save = function (name, data) {
      var want = encChoice(), r = T.saveCsv(name, data, want);
      encMsg.hidden = true; encMsg.className = 'msg';
      if (want === 'sjis' && r.enc !== 'sjis') { encMsg.hidden = false; encMsg.classList.add('err'); encMsg.textContent = 'このブラウザでは Shift_JIS に変換できないため、UTF-8（BOM付き）で保存しました。'; }
      else if (r.miss && r.miss.length) { encMsg.hidden = false; encMsg.classList.add('err'); encMsg.textContent = 'Shift_JIS にない文字を「?」に置き換えて保存しました（' + r.miss.length + '種類）：' + r.miss.slice(0, 20).join(' ') + (r.miss.length > 20 ? ' …' : '') + '　元の字を残すときは UTF-8 を選んでください。'; }
      T.track('tool_download', { kind: KIND, enc: r.enc });
    };
    $('#csvClean').addEventListener('click', function () { save('名簿_整理後_' + day + '.csv', cleanRows); });
    $('#csvList').addEventListener('click', function () { save('名簿_重複一覧_' + day + '.csv', listRows); });
    $('#print').addEventListener('click', function () { var w = el.querySelector('.doc-wrap'); w.hidden = false; T.track('tool_print', { kind: KIND }); window.print(); setTimeout(function () { w.hidden = true; }, 500); });
    $('#copy').addEventListener('click', function () { T.copyText(full, $('#copy')); });
    // 相談フォームに引き継ぐのは件数だけ（名簿の中身は送らない）
    T.renderCtas($('#ctas'), { memo: summary, kind: KIND, memoLabel: '件数のまとめをコピー', shareTitle: '結果の件数を社内で共有する', shareDesc: '元の件数・重複・要確認・整理後の件数だけのテキストです（名簿の中身は含みません）。行ごとの一覧は上の「結果をコピー」かCSVで残してください。',
      quoteTitle: '名寄せを仕組みにする相談', quoteDesc: '紙の名簿や申込書の読み取りから、取り込み前の名寄せ（重複チェック）までを決まった手順にします。送られるのは上の件数だけで、名簿の中身は送りません。', quoteBtn: '相談を依頼する →',
      askExamples: '「紙の名簿を読み取ってこの形にできる？」「顧客管理ソフトに取り込む前の名寄せを自動にできる？」', lineUrl: T.LINE_URL,
      extraFields: [['元の名簿', fmt(rows.length) + '件'], ['重複', dupN + '組'], ['要確認', chkN + '組'], ['整理後', fmt(kept.length) + '件']] });
    T.track('tool_result', { kind: KIND, items: rows.length, groups: groups.length, ms: Date.now() - t0 });
    if (noScroll !== true) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#run').addEventListener('click', function () { run(); });
  ['#hdr', '#fill', '#norm', '#mergeAll'].forEach(function (id) { $(id).addEventListener('change', function () { if (!$('#result').hidden) run(true); }); });
})();
