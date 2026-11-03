/* /tools/document-demo — 帳票の読み取りデモ
 * サンプル3点は AI を呼ばず、画像 (SVG) と結果を同梱。自社の帳票は /api/ocr-demo へ (1日3回まで、localStorage で数える)。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, fmt = T.fmt;

  function svgDoc(title, lines, hand) {
    var font = hand ? "font-family:'Yu Gothic','Hiragino Maru Gothic ProN',sans-serif;font-style:italic" : "font-family:'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif";
    var y = 70; var body = lines.map(function (l) { y += 34; return '<text x="40" y="' + y + '" font-size="18" ' + (l.b ? 'font-weight="700"' : '') + ' fill="#222" style="' + font + '">' + T.esc(l.t) + '</text>' + (l.r ? '<text x="560" y="' + y + '" font-size="18" text-anchor="end" fill="#222" style="' + font + '">' + T.esc(l.r) + '</text>' : ''); }).join('');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="' + (y + 60) + '" viewBox="0 0 600 ' + (y + 60) + '"><rect width="600" height="' + (y + 60) + '" fill="#fbfbf8"/><rect x="20" y="20" width="560" height="' + (y + 20) + '" fill="none" stroke="#999" stroke-dasharray="4 3"/><text x="40" y="56" font-size="22" font-weight="700" fill="#111" style="' + font + '">' + T.esc(title) + '</text><line x1="40" y1="70" x2="560" y2="70" stroke="#333"/>' + body + (hand ? '<text x="300" y="' + (y + 45) + '" font-size="12" text-anchor="middle" fill="#999">※ サンプル（手書きを模した画像）</text>' : '<text x="300" y="' + (y + 45) + '" font-size="12" text-anchor="middle" fill="#999">※ サンプル（FAX受信を模した画像）</text>') + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var SAMPLES = [
    { id: 'fax', t: 'FAX注文書（食品卸）', s: '飲食店から届く定番の注文書',
      img: svgDoc('注 文 書　　宛：丸山食品商事 御中', [{ t: '発注元：居酒屋 いろは（担当 田中）' }, { t: '納品希望日：11月5日（水）午前' }, { t: '品名', r: '数量', b: true }, { t: '国産豚バラ スライス 2kg', r: '3' }, { t: '鶏もも 2kg', r: '5' }, { t: 'キャベツ L', r: '10' }, { t: '長ねぎ 1束', r: '8' }, { t: '濃口醤油 1.8L', r: '2' }, { t: 'サラダ油 16.5kg 一斗缶', r: '1' }, { t: '備考：ねぎは太めで。前回と同じ' }]),
      res: { kind: '注文書', party: '居酒屋 いろは（担当 田中）', date: '', rows: [
        { name: '国産豚バラ スライス 2kg', qty: 3, unit: '', price: '', amount: '', confidence: 'high' }, { name: '鶏もも 2kg', qty: 5, unit: '', price: '', amount: '', confidence: 'high' },
        { name: 'キャベツ L', qty: 10, unit: '', price: '', amount: '', confidence: 'high' }, { name: '長ねぎ 1束', qty: 8, unit: '', price: '', amount: '', confidence: 'high' },
        { name: '濃口醤油 1.8L', qty: 2, unit: '', price: '', amount: '', confidence: 'high' }, { name: 'サラダ油 16.5kg 一斗缶', qty: 1, unit: '', price: '', amount: '', confidence: 'mid' }],
        total: '', memo: '納品希望日「11月5日 午前」と備考「ねぎは太めで」を抽出。単価の記載がないため金額欄は空。', needsCheck: 0 } },
    { id: 'hand', t: '手書き伝票（寝具卸）', s: '数字の判読が難しい例',
      img: svgDoc('納品伝票　No.2041', [{ t: '得意先：ホテル松風 様' }, { t: '品名', r: '数量 / 単価', b: true }, { t: '羽毛掛布団 シングル', r: '12 / 8,500' }, { t: '敷パッド S', r: '12 / 1,900' }, { t: '枕カバー 白', r: '24 / 380' }, { t: 'バスタオル 業務用', r: '30 / 650' }, { t: '合計', r: '¥153,120' }], true),
      res: { kind: '伝票', party: 'ホテル松風', date: '', rows: [
        { name: '羽毛掛布団 シングル', qty: 12, unit: '', price: 8500, amount: 102000, confidence: 'high' }, { name: '敷パッド S', qty: 12, unit: '', price: 1900, amount: 22800, confidence: 'high' },
        { name: '枕カバー 白', qty: 24, unit: '', price: 380, amount: 9120, confidence: 'mid' }, { name: 'バスタオル 業務用', qty: 30, unit: '', price: 650, amount: 19500, confidence: 'low' }],
        total: 153120, memo: '「バスタオル」の数量は 30 か 38 か判読しづらいため要確認。合計 153,120 は各行の計と一致（30で計算）。', needsCheck: 1 } },
    { id: 'receipt', t: 'レシート（経費精算）', s: '写真を撮るだけで経費登録',
      img: svgDoc('ホームセンター コーナン 伏見店', [{ t: '2026/10/28 14:22　レジ03' }, { t: '養生テープ 50mm', r: '¥398' }, { t: 'ブルーシート 3.6×5.4', r: '¥1,280' }, { t: '軍手 12双組', r: '¥598' }, { t: '結束バンド 300mm', r: '¥348' }, { t: '小計', r: '¥2,624' }, { t: '消費税 10%', r: '¥262' }, { t: '合計', r: '¥2,886' }, { t: '登録番号 T1234567890123' }]),
      res: { kind: 'レシート', party: 'ホームセンター コーナン 伏見店', date: '2026-10-28', rows: [
        { name: '養生テープ 50mm', qty: 1, unit: '', price: 398, amount: 398, confidence: 'high' }, { name: 'ブルーシート 3.6×5.4', qty: 1, unit: '', price: 1280, amount: 1280, confidence: 'high' },
        { name: '軍手 12双組', qty: 1, unit: '', price: 598, amount: 598, confidence: 'high' }, { name: '結束バンド 300mm', qty: 1, unit: '', price: 348, amount: 348, confidence: 'high' }],
        total: 2886, memo: '税率10%・消費税262円・インボイス登録番号を抽出。勘定科目の候補：消耗品費。', needsCheck: 0 } }];

  var samplesEl = $('#samples');
  SAMPLES.forEach(function (s) {
    var b = T.el('button', 'sample', '<span class="t">' + T.esc(s.t) + '</span><span class="s">' + T.esc(s.s) + '</span>'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      samplesEl.querySelectorAll('.sample').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      T.track('tool_step', { kind: 'document-demo', step: 'sample', value: s.id });
      render(s.img, s.res, true);
    });
    samplesEl.appendChild(b);
  });

  // 自社の帳票 (1日3回)
  var KEY = 'nq_ocr_demo';
  function quota() { try { var v = JSON.parse(localStorage.getItem(KEY) || '{}'); var d = new Date().toISOString().slice(0, 10); if (v.d !== d) v = { d: d, n: 0 }; return v; } catch (_) { return { d: '', n: 0 }; } }
  function bump() { try { var v = quota(); v.n++; localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) {} }

  var drop = $('#drop'), file = $('#file'), status = $('#status');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer.files && e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); });
  file.addEventListener('change', function () { if (file.files[0]) handle(file.files[0]); });

  function say(msg, err) { status.hidden = false; status.className = 'msg' + (err ? ' err' : ''); status.textContent = msg; }

  function handle(f) {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) { say('JPG・PNG・WebP の画像を選んでください（PDFは実導入で対応します）。', true); return; }
    if (f.size > 5 * 1024 * 1024) { say('5MB以下の画像にしてください。スマホの写真なら「小」サイズで十分です。', true); return; }
    if (quota().n >= 3) { say('自社の帳票は1日3回までです。もっと試したい場合は下の相談フォームから画像をお送りください。無料で読み取ります。', true); return; }
    say('読み取っています（5〜15秒）…');
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = String(reader.result); var b64 = dataUrl.split(',')[1];
      fetch('/api/ocr-demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64, mime: f.type }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
        .then(function (x) {
          if (!x.ok) {
            if (x.status === 503) say('自社画像の読み取りは準備中です。サンプルでお試しいただくか、下の相談フォームから画像をお送りください。', true);
            else say('読み取れませんでした（' + (x.j.error || x.status) + '）。別の画像でお試しください。', true);
            return;
          }
          bump(); status.hidden = true;
          T.track('tool_step', { kind: 'document-demo', step: 'upload', value: x.j.kind });
          render(dataUrl, x.j, false);
        }).catch(function () { say('通信に失敗しました。もう一度お試しください。', true); });
    };
    reader.readAsDataURL(f);
  }

  function csvOf(res) {
    var esc = function (s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return ['種類,相手先,日付,品名,数量,単位,単価,金額,確認'].concat(res.rows.map(function (r) { return [res.kind, res.party, res.date, r.name, r.qty, r.unit, r.price, r.amount, r.confidence === 'low' ? '要確認' : ''].map(esc).join(','); })).join('\n');
  }

  function render(img, res, isSample) {
    var el = $('#result'); el.hidden = false;
    var d = T.today();
    // 単価・金額が全行空なら、その列は出さない（スマホで表が切れないように）
    var hasPrice = res.rows.some(function (r) { return r.price !== '' && r.price != null; });
    var hasAmount = res.rows.some(function (r) { return r.amount !== '' && r.amount != null; });
    var cols = [{ h: '品名', td: function (r) { return '<td>' + T.esc(r.name) + '</td>'; } },
      { h: '数量', td: function (r) { return '<td>' + (r.qty === '' ? '—' : fmt(r.qty)) + (r.unit ? ' ' + T.esc(r.unit) : '') + '</td>'; } }];
    if (hasPrice) cols.push({ h: '単価', td: function (r) { return '<td>' + (r.price === '' ? '—' : fmt(r.price)) + '</td>'; } });
    if (hasAmount) cols.push({ h: '金額', td: function (r) { return '<td>' + (r.amount === '' ? '—' : fmt(r.amount)) + '</td>'; } });
    cols.push({ h: '確認', td: function (r) { return '<td class="' + (r.confidence === 'low' ? 'warn' : '') + '">' + (r.confidence === 'low' ? '要確認' : r.confidence === 'mid' ? '△' : '○') + '</td>'; } });
    var rowHtml = function (r) { return '<tr>' + cols.map(function (c) { return c.td(r); }).join('') + '</tr>'; }; // 各 td は T.esc(...) / fmt(...) 済み
    var tableRows = res.rows.map(rowHtml).join('');
    el.innerHTML =
      '<div class="res-title"><h2>読み取り結果</h2><p class="sub">' + (isSample ? 'サンプル' : '自社の帳票') + '・' + d + '</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big txt">' + T.esc(res.kind) + '</div><div class="lab">書類の種類</div></div>' +
      '<div class="res-stat"><div class="big">' + fmt(res.rows.length) + '<small>行</small></div><div class="lab">抽出した明細</div></div>' +
      '<div class="res-stat"><div class="big">' + fmt(Number(res.needsCheck) || 0) + '<small>件</small></div><div class="lab">要確認（自信のない項目）</div></div></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Extracted</span><span class="d">' + d + '</span></div>' +
      '<div class="conds"><span class="ci">相手先：<b>' + T.esc(res.party || '—') + '</b></span><span class="ci">日付：<b>' + T.esc(res.date || '—') + '</b></span><span class="ci">合計：<b>' + (res.total !== '' && res.total != null ? '¥' + fmt(res.total) : '—') + '</b></span></div>' +
      '<div class="preview" style="padding:14px clamp(18px,4vw,26px) 0"><div><img src="' + img + '" alt="読み取り元の画像" loading="lazy"></div><div class="tbl' + (cols.length > 3 ? ' tbl--wide' : '') + '"><table><tr>' + cols.map(function (c) { return '<th>' + c.h + '</th>'; }).join('') + '</tr>' +
      tableRows + '</table>' + (cols.length > 3 ? '<div class="tbl-hint">横にスクロールできます →</div>' : '') + '</div></div>' +
      '<div class="min" style="margin-top:14px"><b>AIのメモ</b>' + T.esc(res.memo || '') + '</div>' +
      '<div style="padding:14px clamp(18px,4vw,26px) 18px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn--outline btn--sm" id="dlCsv">CSVでダウンロード</button><button type="button" class="btn btn--sm" style="border-color:var(--text)" id="copyCsv">CSVをコピー</button></div></div>' +
      '<div class="note-red" style="border:1px solid var(--accent);border-radius:var(--radius-card);margin-top:12px"><b>実導入では、ここから先を自動にします</b>読み取った内容を販売管理システム・Excel・会計ソフトに入れ、人は「要確認」だけを見る。FAXはそのまま、取引先に何も頼みません。1業務10万円〜、または初期費用0円の月額。</div>' +
      '<div class="res-title"><h2>次にできること</h2><p class="sub">どれを選んでも営業電話はしません</p></div>' +
      '<div class="tool-card" style="margin-bottom:12px"><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn--primary btn--sm" href="/tools/estimate?c=auto&s=s&m=paper&i=sales">この業務の概算見積を出す →</a><a class="btn btn--outline btn--sm" href="/tools/manual-cost">転記の年間コストを計算する</a></div></div>' +
      '<div class="ctas" id="ctas"></div>';
    var csv = csvOf(res);
    $('#dlCsv').addEventListener('click', function () { if (!T.download('yomitori_' + d.replace(/\./g, '') + '.csv', '﻿' + csv, 'text/csv;charset=utf-8')) T.copyText(csv, $('#dlCsv')); });
    $('#copyCsv').addEventListener('click', function () { T.copyText(csv, $('#copyCsv')); });
    var memo = ['【帳票読み取りデモ】Nortiq Labs　' + d, '種類：' + res.kind + '　相手先：' + (res.party || '—') + '　明細：' + res.rows.length + '行　要確認：' + res.needsCheck + '件', '', csv].join('\n');
    T.renderCtas($('#ctas'), { memo: memo, kind: 'tools-document-demo', memoLabel: '結果をコピー', shareTitle: '結果を社内で共有する', shareDesc: 'CSVと一緒に、担当者に「この精度で転記が減る」と見せられます。',
      quoteTitle: '自社の帳票で精度を確かめる', quoteDesc: '帳票の種類（FAX注文書・手書き伝票・納品書など）と月の枚数を書いてください。実物を数枚お送りいただければ、無料で読み取ってお返しします。', quoteBtn: '無料で読み取りを依頼する →', lineUrl: T.LINE_URL,
      extraFields: [['書類', res.kind], ['明細', res.rows.length + '行'], ['要確認', res.needsCheck + '件'], ['サンプル', isSample ? 'はい' : 'いいえ']] });
    T.track('tool_result', { kind: 'document-demo', sample: isSample ? 1 : 0, rows: res.rows.length });
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // 最初から結果が見えるように、1つ目のサンプルを開いておく (初回は自動スクロールしない)
  var resEl = $('#result'); var origScroll = resEl.scrollIntoView;
  resEl.scrollIntoView = function () {};
  samplesEl.querySelector('.sample').click();
  resEl.scrollIntoView = origScroll;
})();
