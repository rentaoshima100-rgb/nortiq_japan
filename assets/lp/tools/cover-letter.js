/* /tools/cover-letter — 送付状メーカー（書類送付・支払いのお願い・納期遅延のお詫び・価格改定・休業のお知らせ）
 * 文面はルールとテンプレートで組み立てる。入力はブラウザの中だけで処理し、サーバーには送らない。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, esc = T.esc;
  var rowsEl = $('#rows'), extraEl = $('#extra');
  function isoToday() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function jpDate(iso) { if (!iso) return ''; var p = iso.split('-'); return p.length === 3 ? Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日' : iso; }
  if (!$('#date').value) $('#date').value = isoToday();

  var SAMPLE = [{ n: '請求書（2026年10月分）', c: '1' }, { n: '納品書（控）', c: '1' }];
  function addRow(p) {
    if (rowsEl.children.length >= 8) return;
    var row = T.el('div', 'calc-row calc-row--doc');
    row.innerHTML = '<div><label>同封する書類</label><input type="text" data-k="n" value="' + esc(p ? p.n : '') + '" placeholder="例：見積書" maxlength="40"></div>' +
      '<div><label>部数</label><input type="text" data-k="c" value="' + esc(p ? p.c : '1') + '" maxlength="6" inputmode="numeric"></div>' +
      '<button type="button" class="del" aria-label="この行を削除">✕ <span class="del-t">削除</span></button>';
    row.querySelector('.del').addEventListener('click', function () { row.remove(); });
    rowsEl.appendChild(row);
  }
  SAMPLE.forEach(addRow);
  $('#addRow').addEventListener('click', function () { addRow(); });

  var EXTRA = {
    send: [],
    remind: [['invno', '請求番号', 'text', 'INV-2026-1001'], ['amount', '請求金額（円・税込）', 'text', '165,000'], ['due', '当初のお支払期限', 'date', ''], ['newdue', 'ご入金をお願いする期日', 'date', '']],
    delay: [['item', '対象（品名・案件名）', 'text', '〇〇製品 200個'], ['orig', '当初の納期', 'date', ''], ['newdate', '変更後の納期', 'date', ''], ['reason', '理由（短く）', 'text', '部材の入荷遅れ']],
    price: [['target', '対象（商品・サービス）', 'text', '全商品'], ['rate', '改定の内容', 'text', '平均で約8%の値上げ'], ['from', '改定日', 'date', ''], ['reason', '理由（短く）', 'text', '原材料費と物流費の上昇']],
    holiday: [['from', '休業の開始日', 'date', ''], ['to', '休業の終了日', 'date', ''], ['reason', '休業の名目', 'text', '年末年始休業'], ['contact', '休業中の緊急連絡先（任意）', 'text', '']]
  };
  function renderExtra() {
    var k = $('#kind').value;
    extraEl.innerHTML = (EXTRA[k] || []).map(function (f) { return '<div><label for="x-' + f[0] + '">' + esc(f[1]) + '</label><input id="x-' + f[0] + '" type="' + f[2] + '" value="' + esc(f[3]) + '" maxlength="60"></div>'; }).join('');
    $('#rows').parentElement.querySelector('.qhelp').textContent = k === 'send' ? '同封する書類と部数を入れてください。' : '「書類送付」以外の文面では、同封物の欄は空でも構いません。文面に必要な項目を下に入れてください。';
  }
  $('#kind').addEventListener('change', renderExtra); renderExtra();
  function x(id) { var e = $('#x-' + id); return e ? e.value.trim() : ''; }

  function run() {
    var k = $('#kind').value, date = $('#date').value, to = $('#to').value.trim(), todept = $('#todept').value.trim(), honor = $('#honor').value, me = $('#me').value.trim(), medept = $('#medept').value.trim(), addr = $('#addr').value.trim(), note = $('#note').value.trim();
    var items = []; rowsEl.querySelectorAll('.calc-row').forEach(function (r) { var n = r.querySelector('[data-k="n"]').value.trim(), c = r.querySelector('[data-k="c"]').value.trim(); if (n) items.push({ n: n, c: c || '1' }); });
    var title, body, subjectMail;
    var greet = '拝啓　時下ますますご清栄のこととお慶び申し上げます。平素は格別のご高配を賜り、厚く御礼申し上げます。';
    var list = items.map(function (it, i) { return (i + 1) + '. ' + it.n + '　' + (/^\d+$/.test(it.c) ? it.c + '部' : it.c); });
    if (k === 'send') {
      title = '書類送付のご案内'; subjectMail = '【' + (items[0] ? items[0].n.replace(/（.*?）/, '') : '書類') + '送付のご案内】' + me;
      body = greet + '\n\nさて、下記の書類を' + (items.length ? '同封' : '送付') + 'いたしますので、ご査収のほどよろしくお願い申し上げます。' + '\n\n敬具';
    } else if (k === 'remind') {
      title = 'お支払いのお願い'; subjectMail = '【ご確認のお願い】請求書' + (x('invno') ? '（' + x('invno') + '）' : '') + 'のお支払いについて　' + me;
      body = greet + '\n\nさて、下記の請求書につきまして、' + (x('due') ? jpDate(x('due')) + 'のお支払期限を過ぎておりますが、' : '') + '本日現在ご入金の確認ができておりません。\nご多用のところ恐れ入りますが、' + (x('newdue') ? jpDate(x('newdue')) + 'までに' : '') + 'お振込みいただきますようお願い申し上げます。\n\n記\n請求番号：' + (x('invno') || '—') + '\n請求金額：' + (x('amount') ? x('amount').replace(/円$/, '') + '円（税込）' : '—') + '\n当初のお支払期限：' + (jpDate(x('due')) || '—') + '\n\nなお、本状と行き違いにお振込みいただいておりましたら、何卒ご容赦くださいますようお願い申し上げます。\n\n敬具';
    } else if (k === 'delay') {
      title = '納期遅延のお詫び'; subjectMail = '【お詫び】' + (x('item') || 'ご注文品') + 'の納期について　' + me;
      body = greet + '\n\nこのたび、' + (x('item') || 'ご注文の品') + 'につきまして、' + (x('reason') ? x('reason') + 'のため、' : '') + '当初ご案内しておりました納期（' + (jpDate(x('orig')) || '—') + '）に間に合わない見込みとなりました。ご迷惑をおかけしますことを深くお詫び申し上げます。\n\n変更後の納期は' + (jpDate(x('newdate')) || '追ってご連絡') + 'を予定しております。進捗は随時ご報告いたしますので、何卒ご理解賜りますようお願い申し上げます。\n\n敬具';
    } else if (k === 'price') {
      title = '価格改定のお知らせ'; subjectMail = '【重要】' + (x('target') || '商品') + 'の価格改定のお知らせ　' + me;
      body = greet + '\n\nさて、' + (x('reason') ? x('reason') + 'により、' : '') + '誠に不本意ながら' + (jpDate(x('from')) || '—') + 'より下記のとおり価格を改定させていただくこととなりました。\n\n記\n対象：' + (x('target') || '—') + '\n改定の内容：' + (x('rate') || '—') + '\n改定日：' + (jpDate(x('from')) || '—') + '\n\n品質とサービスの維持に一層努めてまいりますので、何卒ご理解賜りますようお願い申し上げます。\n\n敬具';
    } else {
      title = '休業のお知らせ'; subjectMail = '【' + (x('reason') || '休業') + 'のお知らせ】' + me;
      body = greet + '\n\nさて、弊社では下記の期間を' + (x('reason') || '休業') + 'とさせていただきます。\n\n記\n休業期間：' + (jpDate(x('from')) || '—') + '〜' + (jpDate(x('to')) || '—') + (x('contact') ? '\n休業中の緊急連絡先：' + x('contact') : '') + '\n\n期間中にいただいたご連絡には、営業再開後に順次対応いたします。ご不便をおかけしますが、よろしくお願い申し上げます。\n\n敬具';
    }
    var toLine = (to || '（相手先）') + (todept ? '\n' + todept : '') + '　' + honor;
    var doc = '<div class="doc print-target" id="doc"><p class="doc-meta">' + esc(jpDate(date)) + '</p>' +
      '<div class="doc-party"><div><div class="doc-to" style="white-space:pre-wrap">' + esc(toLine) + '</div></div><div class="doc-from"><b>' + esc(me || '（自社名）') + '</b>' + esc(medept ? medept + '\n' : '') + esc(addr) + '</div></div>' +
      '<p class="doc-center">' + esc(title) + '</p><div class="doc-body">' + esc(body) + '</div>' +
      (k === 'send' && items.length ? '<p class="doc-center">記</p><ol class="doc-list">' + items.map(function (it) { return '<li>' + esc(it.n) + '　' + esc(/^\d+$/.test(it.c) ? it.c + '部' : it.c) + '</li>'; }).join('') + '</ol><p class="doc-end">以上</p>' : (k === 'send' ? '' : '<p class="doc-end">以上</p>')) +
      (note ? '<div class="doc-body" style="margin-top:8px">' + esc(note) + '</div>' : '') + '</div>';
    var letter = [jpDate(date), '', toLine, '', me + (medept ? '\n' + medept : '') + (addr ? '\n' + addr : ''), '', title, '', body].concat(k === 'send' && items.length ? ['', '記'].concat(list, ['以上']) : []).concat(note ? ['', note] : []).join('\n');
    var mail = ['件名：' + subjectMail, '', (to || '（相手先）') + (todept ? '　' + todept : '') + '　' + honor, '', 'いつもお世話になっております。' + me + (medept ? 'の' + medept : '') + 'です。', '', body.replace(/^拝啓　[^\n]*\n\n/, '').replace(/\n\n敬具$/, '')]
      .concat(k === 'send' && items.length ? ['', '■ 送付する書類'].concat(list) : []).concat(note ? ['', note] : [], ['', 'よろしくお願いいたします。', '', '――', me + (medept ? '　' + medept : ''), addr]).join('\n');
    var el = $('#result'); el.hidden = false;
    el.innerHTML = '<div class="res-title"><h2>' + esc(title) + 'ができました</h2><p class="sub">郵送なら印刷、メールなら「メール文をコピー」。文面は必ず一度読んでから送ってください</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big txt">' + esc(title) + '</div><div class="lab">' + esc(jpDate(date)) + '</div></div><div class="res-stat"><div class="big txt">' + esc(to || '（相手先）') + '</div><div class="lab">宛先　' + esc(honor) + '</div></div><div class="res-stat"><div class="big">' + (k === 'send' ? items.length + '<small>点</small>' : body.length + '<small>字</small>') + '</div><div class="lab">' + (k === 'send' ? '同封する書類' : '本文の長さ') + '</div></div></div>' +
      '<div class="doc-actions"><button type="button" class="btn btn--primary btn--sm" id="print">印刷・PDF保存</button><button type="button" class="btn btn--outline btn--sm" id="copy">送付状の文面をコピー</button><button type="button" class="btn btn--outline btn--sm" id="copymail">メール文をコピー</button></div>' +
      '<div class="doc-wrap">' + doc + '</div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Mail</span><span class="d">同じ内容のメール本文</span></div><div class="copybox" style="margin:12px clamp(18px,4vw,26px) 16px;width:auto;max-height:none">' + esc(mail) + '</div></div>' +
      '<div class="again">ほかのツール：<a href="/tools/invoice">請求書・見積書メーカー</a><a href="/tools/payment-match">入金消し込み照合</a><a href="/tools/address-list">宛先リスト整形（送り状用）</a></div>' +
      '<div class="ctas" id="ctas"></div>';
    $('#print').addEventListener('click', function () { T.track('tool_print', { kind: 'tools-cover-letter' }); window.print(); });
    $('#copy').addEventListener('click', function () { T.copyText(letter, $('#copy')); });
    $('#copymail').addEventListener('click', function () { T.copyText(mail, $('#copymail')); T.track('tool_copy', { kind: 'tools-cover-letter', what: 'mail' }); });
    T.renderCtas($('#ctas'), { memo: letter, kind: 'tools-cover-letter', memoLabel: '送付状の文面をコピー', shareTitle: '文面を社内で確認してもらう', shareDesc: '上司や担当者に確認してもらう用の文面です。メール本文は上の「メール文をコピー」。',
      quoteTitle: '毎月の送付状と請求書の発送を自動にする相談', quoteDesc: '請求書の作成から送付状・メール送付までを、取引先ごとに毎月自動で行う仕組みを月額で組みます。', quoteBtn: '相談を依頼する →', askExamples: '「取引先ごとに文面を変えて自動で送れる？」「郵送代行と組み合わせられる？」', lineUrl: T.LINE_URL,
      extraFields: [['文面', title], ['宛先', to || '—']] });
    T.track('tool_result', { kind: 'tools-cover-letter', doc: k });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#run').addEventListener('click', run);
  var q = new URLSearchParams(location.search).get('kind'); if (q && EXTRA[q]) { $('#kind').value = q; renderExtra(); }
})();
