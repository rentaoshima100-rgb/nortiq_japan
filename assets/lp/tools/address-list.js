/* /tools/address-list — 宛先リスト整形（送り状ソフト取込用CSV）
 * 1行1件の宛先（名前・郵便番号・住所・電話・備考を順不同）を中身から見分け、半角にそろえて CSV（UTF-8／Shift_JIS）と宛先一覧（A4）にする。
 * 入力はブラウザの中だけで処理し、サーバーには送らない・保存しない。相談フォームに引き継ぐメモにも宛名・住所は入れない（件数と行番号だけ）。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc;
  var PREFS = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];
  var PREF_RE = new RegExp('^(' + PREFS.join('|') + ')');
  var DASH = /[‐-―−ー]/g;

  // 全角英数字・記号 → 半角、半角カナ → 全角、空白の連続 → 1つ（①・㈱ などはそのまま残す）
  function nk(s) {
    return String(s == null ? '' : s).replace(/[\uFF01-\uFF5D]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\uFF61-\uFF9F]+/g, function (m) { return m.normalize('NFKC'); }).replace(/\s+/g, ' ').trim();
  }
  // 数字に挟まれた「−」「ー」「―」などをハイフンに（カタカナの長音はそのまま残る）
  function dash(s) { return s.replace(/(\d)[‐-―−ー](?=\d)/g, '$1-'); }
  // 全角1字=1、半角1字=0.5 で数える
  function flen(s) { var n = 0; Array.from(String(s)).forEach(function (ch) { var c = ch.charCodeAt(0); n += (c <= 0x7e || (c >= 0xff61 && c <= 0xff9f)) ? 0.5 : 1; }); return n; }
  function isAddr(s) { return PREF_RE.test(s) || (/[市区町村郡]/.test(s) && /\d/.test(s)); }

  // セル1つを見分ける → { k: 'zip' | 'tel' | 'text', v, rest }
  function classify(cell) {
    var c = nk(cell); if (!c) return null;
    var mark = /^〒/.test(c), z = c.replace(/^〒\s*/, '').replace(DASH, '-');
    if (/^\d{3}-?\d{4}$/.test(z) || /^\d{3}-\d{0,4}$/.test(z) || (mark && /^[\d-]+$/.test(z))) return { k: 'zip', v: z.replace(/\D/g, ''), raw: z };
    var mz = z.match(/^(\d{3}-?\d{4})\s+(\S.*)$/) || (mark && z.match(/^(\d{3}-?\d{4})(\D.*)$/)) || z.match(/^(\d{3}-\d{4})(\D.*)$/);
    if (mz && isAddr(mz[2].trim())) return { k: 'zip', v: mz[1].replace(/\D/g, ''), rest: mz[2].trim() };
    var t = c.replace(/^(TEL|Tel|tel|電話番号|電話|☎)\s*[:.]?\s*/, '').replace(DASH, '-');
    if (/^[\d\-() ]+$/.test(t) && /^\(?0/.test(t)) { var d = t.replace(/\D/g, ''); if (d.length >= 9 && d.length <= 12) return { k: 'tel', v: t, d: d }; }
    return { k: 'text', v: c };
  }

  // 区切りが空白1つだけの行（1セルに全部入っている）を、空白で切って並べ直す
  function loose(cell) {
    var toks = nk(cell).split(' '), name = [], addr = [], memo = [], out = [], state = 'name';
    toks.forEach(function (tk) {
      var c = classify(tk); if (!c) return;
      if (c.k !== 'text') { out.push(tk); if (state === 'addr') state = 'after'; return; }
      if (state === 'name' && isAddr(c.v)) { state = 'addr'; addr.push(c.v); return; }
      if (state === 'name') name.push(c.v); else if (state === 'addr') addr.push(c.v); else memo.push(c.v);
    });
    if (!out.length && !addr.length) return [cell];
    return [name.join(' ')].concat(out, [addr.join(' ')], memo.length ? [memo.join(' ')] : []);
  }

  // 番地のあとの空白、または番地の直後から建物名を分ける
  function splitBld(s) {
    var re = /\s+/g, m;
    while ((m = re.exec(s))) {
      var left = s.slice(0, m.index), right = s.slice(m.index + m[0].length);
      if (/(\d|号|番地|番)$/.test(left) && right) return [left.replace(/\s+/g, ''), right];
    }
    var m2 = s.match(/^(.+?(?:\d+号|\d+番地|\d+-\d+(?:-\d+)?))([^\d\-号番丁目条のノ\s].+)$/);
    if (m2) return [m2[1].replace(/\s+/g, ''), m2[2].trim()];
    return [s.replace(/\s+/g, ''), ''];
  }

  function fmtTel(raw, d, mode) {
    if (mode === 'none') return d;
    if (raw.indexOf('-') >= 0 || raw.indexOf('(') >= 0) return raw.replace(/^\(/, '').replace(/\)\s*/g, '-').replace(/\(/g, '-').replace(/\s+/g, '').replace(/-+/g, '-');
    if (d.length === 11 && /^0[5789]0/.test(d)) return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
    if (d.length === 10 && /^0120/.test(d)) return d.slice(0, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7);
    if (d.length === 10 && /^0[36]/.test(d)) return d.slice(0, 2) + '-' + d.slice(2, 6) + '-' + d.slice(6);
    return d;
  }

  function opts() {
    var o = {};
    o.cols = $('#addrcols').value; o.zip = $('#zipfmt').value; o.tel = $('#telfmt').value; o.enc = $('#enc').value;
    o.sama = $('#sama').checked; o.header = $('#header').checked; o.nodup = $('#nodup').checked;
    o.maxName = T.num($('#maxname').value); o.maxAddr = T.num($('#maxaddr').value);
    if (!(o.maxName > 0)) o.maxName = 16;
    if (!(o.maxAddr > 0)) o.maxAddr = 32;
    return o;
  }

  function parse(txt, o) {
    var rows = [];
    txt.split(/\r?\n/).forEach(function (line, li) {
      if (!line.trim()) return;
      var cells = T.splitLine(line).filter(function (x) { return x !== ''; });
      if (cells.length === 1 && /[ 　]/.test(cells[0])) cells = loose(cells[0]).filter(function (x) { return x !== ''; });
      if (!cells.length) return;
      var zip = null, zipRaw = '', tel = null, texts = [];
      cells.forEach(function (cell) {
        var c = classify(cell); if (!c) return;
        if (c.k === 'zip') { if (zip == null) { zip = c.v; zipRaw = c.raw || c.v; } else texts.push(c.raw || c.v); if (c.rest) texts.push(c.rest); return; }
        if (c.k === 'tel') { if (tel == null) tel = c; else texts.push(c.v); return; }
        texts.push(c.v);
      });
      var ai = -1;
      texts.forEach(function (t, i) { if (ai < 0 && PREF_RE.test(t)) ai = i; });
      if (ai < 0) texts.forEach(function (t, i) { if (ai < 0 && isAddr(t)) ai = i; });
      var addrRaw = ai >= 0 ? dash(texts[ai]) : '';
      var rest = texts.filter(function (t, i) { return i !== ai; });
      var pm = addrRaw.match(PREF_RE), pref = pm ? pm[1] : '';
      var sb = splitBld(addrRaw.slice(pref.length).trim());
      var r = { line: li + 1, name: rest.length ? rest[0] : '', memo: rest.slice(1).join(' '), zipD: zip == null ? '' : zip, pref: pref, addr: sb[0], bld: sb[1], telD: tel ? tel.d : '', tel: tel ? fmtTel(tel.v, tel.d, o.tel) : '', why: [], dup: 0 };
      r.zip = r.zipD.length !== 7 ? zipRaw : o.zip === 'none' ? r.zipD : r.zipD.slice(0, 3) + '-' + r.zipD.slice(3);
      // 住所の列（選んだ形）
      r.acols = o.cols === '1' ? [[r.pref + r.addr, r.bld].filter(Boolean).join(' ')] : o.cols === '3' ? [r.pref, r.addr, r.bld] : [r.pref + r.addr, r.bld];
      if (!r.name) r.why.push('名前なし');
      else if (flen(r.name) > o.maxName) r.why.push('名前が上限超え（全角' + flen(r.name) + '字）');
      if (!r.zipD) r.why.push('郵便番号なし'); else if (r.zipD.length !== 7) r.why.push('郵便番号の桁不足');
      if (!addrRaw) r.why.push('住所なし');
      else {
        if (!r.pref) r.why.push('都道府県なし');
        var over = r.acols.reduce(function (a, c) { return Math.max(a, flen(c)); }, 0);
        if (over > o.maxAddr) r.why.push('住所が上限超え（全角' + over + '字）');
      }
      if (!r.telD) r.why.push('電話番号なし'); else if (r.telD.length !== 10 && r.telD.length !== 11) r.why.push('電話番号の桁数');
      rows.push(r);
    });
    // 重複: 名前（空白無視）＋ 郵便番号 または 住所 が同じ2件目以降
    var seenZ = {}, seenA = {};
    rows.forEach(function (r) {
      var nkey = r.name.replace(/\s+/g, '').toUpperCase(); if (!nkey) return;
      var kz = r.zipD ? nkey + '|' + r.zipD : '', ka = (r.pref + r.addr) ? nkey + '|' + (r.pref + r.addr + r.bld).replace(/\s+/g, '').toUpperCase() : '';
      var first = (kz && seenZ[kz]) || (ka && seenA[ka]) || 0;
      if (first) r.dup = first; else { if (kz) seenZ[kz] = r.line; if (ka) seenA[ka] = r.line; }
    });
    rows.forEach(function (r) { r.st = r.dup ? '重複' : r.why.length ? '要確認' : 'OK'; });
    return rows;
  }

  function csvRows(rows, o) {
    var head = o.cols === '1' ? ['お届け先名', '郵便番号', '住所', '電話番号', '品名・備考'] : o.cols === '3' ? ['お届け先名', '郵便番号', '都道府県', '市区町村・番地', '建物名', '電話番号', '品名・備考'] : ['お届け先名', '郵便番号', '住所', '建物名', '電話番号', '品名・備考'];
    var body = rows.map(function (r) { return [r.name && o.sama && !/(様|御中|殿|さま)$/.test(r.name) ? r.name + ' 様' : r.name, r.zip].concat(r.acols, [r.tel, r.memo]); });
    return o.header ? [head].concat(body) : body;
  }

  function ctaOpts(memo, extra) {
    return { memo: memo, kind: 'tools-address-list', memoLabel: '結果をコピー', shareTitle: '整形の結果を出荷担当と共有する', shareDesc: '件数と要確認の理由（行番号だけ。宛名や住所は入りません）のテキストです。出荷担当への引き継ぎに貼れます。',
      quoteTitle: '送り状までを自動でつなぐ相談', quoteDesc: '受注ソフトやECの注文データを、送り状・納品書の発行まで打ち直さずにつなぐ仕組みを組みます。引き継ぐのは上の件数だけで、宛先は送りません。', quoteBtn: '相談を依頼する →',
      askExamples: '「うちの受注ソフトのCSVをそのまま変換できる？」「納品書と送り状を一度に出せる？」', lineUrl: T.LINE_URL, extraFields: extra };
  }

  function run(scroll) {
    var o = opts(), src = $('#list').value;
    var rows = parse(src, o), el = $('#result'); el.hidden = false;
    if (!rows.length) { el.innerHTML = '<div class="tool-card" style="color:var(--text-3)">宛先を1行に1件、「お届け先名　郵便番号　住所　電話番号　品名・備考」の形で貼ってください（タブ・カンマ・空白2つ以上で区切ります）。</div>'; return; }
    var warn = rows.filter(function (r) { return r.st === '要確認'; }), dups = rows.filter(function (r) { return r.st === '重複'; }), ok = rows.length - warn.length - dups.length;
    var stamp = T.today();
    var tr = function (r) { return '<tr><td class="st' + (r.st === 'OK' ? '' : ' warn') + '">' + esc(r.st) + '</td><td>' + esc(r.name || '—') + '</td><td class="st">' + esc(r.zip || '—') + '</td><td>' + esc(r.pref + r.addr || '—') + '</td><td>' + esc(r.bld) + '</td><td class="st">' + esc(r.tel || '—') + '</td><td>' + esc(r.memo) + '</td></tr>'; };
    var whyList = warn.map(function (r) { return '<li>' + r.line + '行目 ' + esc(r.name || '（名前なし）') + '：' + esc(r.why.join('・')) + '</li>'; })
      .concat(dups.map(function (r) { return '<li>' + r.line + '行目 ' + esc(r.name) + '：' + r.dup + '行目と同じ宛先（重複）</li>'; })).join('');
    el.innerHTML = '<div class="res-title"><h2>宛先リスト（整形後）</h2><p class="sub">英数字は半角、郵便番号は' + (o.zip === 'none' ? 'ハイフンなし7桁' : '123-4567の形') + '、建物名は別の列にそろえました</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + rows.length + '<small>件</small></div><div class="lab">宛先の件数（そのまま使える ' + ok + '件）</div></div>' +
      '<div class="res-stat"><div class="big">' + warn.length + '<small>件</small></div><div class="lab">要確認（郵便番号・住所・電話）</div></div>' +
      '<div class="res-stat"><div class="big">' + dups.length + '<small>件</small></div><div class="lab">重複（同じ名前・同じ宛先）</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="csv">CSVで保存（送り状ソフト取込用）</button><button type="button" class="btn btn--outline btn--sm" id="csvwarn">要確認だけCSVで保存</button><button type="button" class="btn btn--outline btn--sm" id="print">宛先一覧を印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">要確認の一覧をコピー</button></div>' +
      '<div class="msg" id="csvmsg" hidden></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Address list</span><span class="d">' + rows.length + '件　' + (o.enc === 'sjis' ? 'Shift_JIS' : 'UTF-8（BOM付き）') + '　' + stamp + '</span></div>' +
      '<div class="sheet-pad"><div class="tbl tbl--xxl"><table><colgroup><col style="width:7%"><col style="width:18%"><col style="width:9%"><col style="width:29%"><col style="width:16%"><col style="width:12%"><col style="width:9%"></colgroup><thead><tr><th>判定</th><th>お届け先名</th><th>郵便番号</th><th>住所</th><th>建物名</th><th>電話番号</th><th>品名・備考</th></tr></thead><tbody>' + rows.map(tr).join('') + '</tbody></table><div class="tbl-hint">← 横にスクロールできます →</div></div></div>' +
      (whyList ? '<div class="note-red"><b>要確認・重複の理由</b><ul style="margin:6px 0 0;padding-left:1.2em">' + whyList + '</ul><p style="margin:8px 0 0;font-size:13px">上の貼り付け欄を直して、もう一度「宛先を整える」を押してください。</p></div>' : '<div class="min"><b>要確認はありません</b>全件、郵便番号7桁・都道府県・電話番号がそろっています。</div>') + '</div>' +
      '<div class="doc-wrap" hidden><div class="doc print-target" id="doc"><h2 class="doc-title">宛先一覧</h2><p class="doc-meta">作成日：' + stamp + '　' + rows.length + '件（要確認 ' + warn.length + '・重複 ' + dups.length + '）</p>' +
      '<table><colgroup><col style="width:6%"><col style="width:21%"><col style="width:12%"><col><col style="width:17%"><col style="width:8%"></colgroup><thead><tr><th>No.</th><th>お届け先名</th><th>〒</th><th>住所</th><th>電話</th><th>確認</th></tr></thead><tbody>' +
      rows.map(function (r, i) { return '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.zip) + '</td><td>' + esc([r.pref + r.addr, r.bld].filter(Boolean).join(' ')) + (r.memo ? '<br><small>' + esc(r.memo) + '</small>' : '') + '</td><td>' + esc(r.tel) + '</td><td class="c">' + (r.st === 'OK' ? '&nbsp;' : esc(r.st)) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="again">ほかのツール：<a href="/tools/order-summary">注文集計・出荷指示書</a><a href="/tools/list-dedupe">名簿の重複チェック</a><a href="/tools/invoice">請求書・納品書メーカー</a><a href="/tools/cover-letter">送付状メーカー</a></div>' +
      '<div class="ctas" id="ctas"></div>';

    var msg = $('#csvmsg');
    function save(list, fname) {
      var out = T.saveCsv(fname, csvRows(list, o), o.enc);
      msg.hidden = false; msg.className = 'msg';
      if (o.enc === 'sjis' && out.enc !== 'sjis') { msg.textContent = 'このブラウザでは Shift_JIS に変換できないため、UTF-8（BOM付き）で保存しました。'; msg.classList.add('err'); }
      else if (out.miss.length) { msg.textContent = 'Shift_JIS に無い文字を「?」に置き換えました：' + out.miss.slice(0, 20).join(' ') + '　貼り付け欄で別の字に直すか、UTF-8 で保存してください。'; msg.classList.add('err'); }
      else msg.textContent = list.length + '件を ' + (out.enc === 'sjis' ? 'Shift_JIS' : 'UTF-8（BOM付き）') + ' で保存しました。';
      T.track('tool_download', { kind: 'tools-address-list', rows: list.length, enc: out.enc });
    }
    $('#csv').addEventListener('click', function () { save(o.nodup ? rows.filter(function (r) { return !r.dup; }) : rows, '宛先リスト_' + T.isoToday() + '.csv'); });
    $('#csvwarn').addEventListener('click', function () {
      var list = rows.filter(function (r) { return r.st !== 'OK'; });
      if (!list.length) { msg.hidden = false; msg.className = 'msg'; msg.textContent = '要確認・重複の宛先はありません。'; return; }
      save(list, '宛先リスト_要確認_' + T.isoToday() + '.csv');
    });
    $('#print').addEventListener('click', function () { $('.doc-wrap').hidden = false; T.track('tool_print', { kind: 'tools-address-list' }); window.print(); setTimeout(function () { $('.doc-wrap').hidden = true; }, 500); });
    var copyTxt = ['【宛先リスト 要確認】' + stamp + '　全' + rows.length + '件／要確認 ' + warn.length + '件／重複 ' + dups.length + '件']
      .concat(warn.map(function (r) { return '・' + r.line + '行目 ' + (r.name || '（名前なし）') + '：' + r.why.join('・'); }))
      .concat(dups.map(function (r) { return '・' + r.line + '行目 ' + r.name + '：' + r.dup + '行目と同じ宛先（重複）'; }))
      .concat(warn.length + dups.length ? [] : ['要確認はありません。']).join('\n');
    $('#copy').addEventListener('click', function () { T.copyText(copyTxt, $('#copy')); });
    // 相談フォームに引き継ぐメモには宛名・住所を入れない
    var memo = ['【宛先リスト整形】' + stamp, '宛先 ' + rows.length + '件／そのまま使える ' + ok + '件／要確認 ' + warn.length + '件／重複 ' + dups.length + '件', 'CSV：住所' + o.cols + '列・' + (o.enc === 'sjis' ? 'Shift_JIS' : 'UTF-8（BOM付き）')]
      .concat(warn.length ? ['', '■ 要確認の理由（行番号）'].concat(warn.map(function (r) { return '・' + r.line + '行目：' + r.why.join('・'); })) : [])
      .concat(dups.length ? ['', '■ 重複'].concat(dups.map(function (r) { return '・' + r.line + '行目：' + r.dup + '行目と同じ宛先'; })) : []).join('\n');
    T.renderCtas($('#ctas'), ctaOpts(memo, [['宛先', rows.length + '件'], ['要確認', warn.length + '件'], ['重複', dups.length + '件']]));
    T.track('tool_result', { kind: 'tools-address-list', rows: rows.length, warn: warn.length, dup: dups.length });
    if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#run').addEventListener('click', function () { run(true); });
  // 結果が出ているときは、選択肢を変えたらその場で作り直す
  ['addrcols', 'zipfmt', 'telfmt', 'enc', 'sama', 'header', 'nodup', 'maxname', 'maxaddr'].forEach(function (id) {
    $('#' + id).addEventListener('change', function () { if (!$('#result').hidden) run(false); });
  });
})();
