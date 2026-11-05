/* Nortiq Labs — 無料ツール共通 (/tools/*)
 * 送信 (/api/contact)・コピー・GA4 の小さな共通関数。lp.js (FAQ/計測) と併用する。
 * グローバル NTOOLS に公開。
 */
(function () {
  'use strict';
  var LP = document.body.dataset.lp || 'tools';

  function track(name, params) {
    try {
      if (typeof window.gtag !== 'function') return;
      window.gtag('event', name, Object.assign({ lp: LP }, params || {}));
    } catch (_) {}
  }

  function lead(formKind) {
    try {
      if (typeof window.gtag !== 'function') return;
      window.gtag('event', 'generate_lead', { lead_type: 'contact', currency: 'JPY', form_kind: formKind, lp: LP });
      var target = window.NORTIQ_CONV ? window.NORTIQ_CONV.contact : null;
      if (target) window.gtag('event', 'conversion', { send_to: target });
    } catch (_) {}
  }

  // /api/contact へ送る。name が無い送信 (PDF希望など) は kind をそのまま name に写す。
  // extra は「ラベル: 値」の配列 (api/contact.js が表にする。20件・各100文字まで)。
  function send(payload) {
    var body = {
      kind: payload.kind || LP,
      lp: location.pathname,
      company: payload.company || '',
      name: payload.name || payload.company || '（ツールからの送信）',
      email: payload.email || '',
      phone: payload.phone || '',
      message: payload.message || '',
      extra: (payload.extra || []).slice(0, 20),
      hp: payload.hp || ''
    };
    return fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.error || ('HTTP ' + res.status));
        });
      }
      lead(body.kind);
      return res.json().catch(function () { return {}; });
    });
  }

  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim()); }

  function copyText(text, btn, box) {
    var done = function () {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = 'コピーしました';
      setTimeout(function () { btn.textContent = old; }, 2000);
    };
    var fallback = function () {
      if (!box) return;
      box.hidden = false;
      var r = document.createRange(); r.selectNodeContents(box);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      if (btn) btn.textContent = '選択しました（Ctrl+C / ⌘C）';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
  }

  function download(filename, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
      return true;
    } catch (_) { return false; }
  }

  function fmt(n) { return Number(n).toLocaleString('ja-JP'); }
  function today() {
    var d = new Date();
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // 共通の「結果を共有・正式相談・LINE」3段 CTA を描く
  //  opts: { memo, kind, memoLabel, quoteTitle, quoteDesc, lineUrl, extraFields:[['ラベル','値'],...] }
  function renderCtas(container, opts) {
    var lineUrl = opts.lineUrl || '';
    container.innerHTML =
      '<div class="cta-box"><div class="h"><span class="num">1</span><h3>' + esc(opts.shareTitle || 'この結果を社内で共有する') + '</h3></div>' +
      '<p>' + esc(opts.shareDesc || 'そのまま稟議や社長への説明に使えるテキストです。メールアドレスを入れると、同じ内容をPDFでお送りします（任意）。') + '</p>' +
      '<div class="ctl"><button type="button" class="btn btn--outline btn--sm" data-act="copy">' + esc(opts.memoLabel || 'メモをコピー') + '</button>' +
      '<input type="email" data-f="pdfmail" placeholder="PDFで受け取る場合のみ（任意）" autocomplete="email" inputmode="email"><button type="button" class="btn btn--sm" style="border-color:var(--text)" data-act="pdf">PDFを送る</button></div>' +
      '<div class="copybox" data-f="copybox" hidden></div><div class="msg" data-f="pdfmsg" hidden></div>' +
      '<p class="fine">メールは送付のためだけに使います。営業電話はしません。</p></div>' +

      '<div class="cta-box"><div class="h"><span class="num">2</span><h3>' + esc(opts.quoteTitle || 'この内容で相談する') + '</h3></div>' +
      '<p>' + esc(opts.quoteDesc || '上の条件をそのまま引き継ぎます。営業日なら24時間以内に一次返信します。') + '</p>' +
      '<form data-f="qform" class="ctl" novalidate><input type="text" data-f="company" placeholder="会社名（任意）" autocomplete="organization"><input type="email" data-f="qmail" placeholder="メールアドレス" required autocomplete="email" inputmode="email"><textarea data-f="qnote" rows="2" placeholder="補足があれば（任意）：今の困りごと、サイトURLなど"></textarea><input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true"><button type="submit" class="btn btn--primary btn--sm">' + esc(opts.quoteBtn || '相談を依頼する →') + '</button></form>' +
      '<div class="msg" data-f="qmsg" hidden></div>' +
      '<p class="fine">やり取りはメールまたはLINEで行います。</p></div>' +

      '<div class="cta-box"><div class="h"><span class="num">3</span><h3>1問だけ聞く</h3></div>' +
      '<p>' + esc(opts.askExamples || '「うちの帳票でもいける？」「この金額に何が含まれる？」') + 'など、1問だけでも構いません。</p>' +
      '<div class="ctl">' + (lineUrl ? '<a class="btn btn--outline btn--sm" href="' + esc(lineUrl) + '" target="_blank" rel="noopener">LINEで質問する</a>' : '') +
      '<a class="btn btn--outline btn--sm" href="/#request">フォームで質問する</a><span style="font-size:13px;color:var(--text-3)">メールなら info@nortiqlab.com</span></div>' +
      '<p class="fine">売り込みはしません。</p></div>';

    // 評価（結果画面ごとに1つ。CTA の上）
    var ratingEl = document.createElement('div');
    container.insertBefore(ratingEl, container.firstChild);
    renderRating(ratingEl, { stage: 'result' });

    var memo = opts.memo || '';
    var copyBtn = container.querySelector('[data-act="copy"]');
    var copyBox = container.querySelector('[data-f="copybox"]');
    copyBtn.addEventListener('click', function () {
      copyBox.textContent = memo; copyBox.hidden = false;
      copyText(memo, copyBtn, copyBox);
      track('tool_copy', { kind: opts.kind });
    });

    var pdfBtn = container.querySelector('[data-act="pdf"]');
    var pdfMail = container.querySelector('[data-f="pdfmail"]');
    var pdfMsg = container.querySelector('[data-f="pdfmsg"]');
    pdfBtn.addEventListener('click', function () {
      var m = pdfMail.value.trim();
      pdfMsg.hidden = false; pdfMsg.className = 'msg';
      if (!validEmail(m)) { pdfMsg.textContent = 'メールアドレスの形式を確認してください。'; pdfMsg.classList.add('err'); return; }
      pdfBtn.disabled = true;
      send({ kind: opts.kind + '-pdf', email: m, message: memo, extra: [['ご希望', '結果をPDFで受け取る']].concat(opts.extraFields || []).map(function (p) { return p[0] + ': ' + p[1]; }) })
        .then(function () { pdfMsg.textContent = m + ' 宛にPDFをお送りします（営業日24時間以内）。'; })
        .catch(function () { pdfMsg.textContent = '送信に失敗しました。info@nortiqlab.com まで直接ご連絡ください。'; pdfMsg.classList.add('err'); })
        .finally(function () { pdfBtn.disabled = false; });
    });

    var qform = container.querySelector('[data-f="qform"]');
    var qmsg = container.querySelector('[data-f="qmsg"]');
    qform.addEventListener('submit', function (e) {
      e.preventDefault();
      var m = container.querySelector('[data-f="qmail"]').value.trim();
      var co = container.querySelector('[data-f="company"]').value.trim();
      var note = container.querySelector('[data-f="qnote"]').value.trim();
      qmsg.hidden = false; qmsg.className = 'msg';
      if (!validEmail(m)) { qmsg.textContent = 'メールアドレスの形式を確認してください。'; qmsg.classList.add('err'); return; }
      var btn = qform.querySelector('button[type="submit"]'); btn.disabled = true;
      send({ kind: opts.kind, company: co, email: m, message: (note ? note + '\n\n' : '') + memo, hp: qform.querySelector('[name="website"]').value,
        extra: (opts.extraFields || []).map(function (p) { return p[0] + ': ' + p[1]; }) })
        .then(function () { qmsg.textContent = '受け付けました。営業日24時間以内に、この条件をもとにした一次返信をお送りします。'; track('tool_quote_request', { kind: opts.kind }); })
        .catch(function () { qmsg.textContent = '送信に失敗しました。info@nortiqlab.com まで直接ご連絡ください。'; qmsg.classList.add('err'); btn.disabled = false; });
    });
  }

  // ---------- 評価ウィジェット（結果画面ごとに1つ。/api/tool-rating へ sendBeacon） ----------
  var TOOL_SLUG = (location.pathname.match(/^\/tools\/([a-z0-9-]+)/) || [])[1] || '';
  function sessionId() {
    try {
      var k = 'nq_tools_sid'; var v = sessionStorage.getItem(k);
      if (!v) { v = 't_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); sessionStorage.setItem(k, v); }
      return v;
    } catch (_) { return null; }
  }
  function postRating(payload) {
    var body = JSON.stringify(Object.assign({ tool: TOOL_SLUG, page_url: location.pathname, session_id: sessionId(), stage: 'result' }, payload));
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/tool-rating', new Blob([body], { type: 'text/plain' }))) return Promise.resolve();
    } catch (_) {}
    return fetch('/api/tool-rating', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true }).catch(function () {});
  }
  // container に評価UIを描く。opts.stage は 'result' | 'after_submit'
  function renderRating(container, opts) {
    opts = opts || {};
    var sent = false, score = 0, useful = null;
    container.className = (container.className || '') + ' rating';
    container.innerHTML =
      '<div class="rating__h"><b>この結果は役に立ちましたか？</b><span>無記名・1クリック。ツールの改善にだけ使います。</span></div>' +
      '<div class="rating__row"><div class="rating__useful" role="group" aria-label="役に立ったか">' +
      '<button type="button" class="opt" data-u="1" aria-pressed="false"><span class="t">役に立った</span></button>' +
      '<button type="button" class="opt" data-u="0" aria-pressed="false"><span class="t">物足りない</span></button></div>' +
      '<div class="rating__stars" role="radiogroup" aria-label="5段階の評価">' +
      [1, 2, 3, 4, 5].map(function (i) { return '<button type="button" class="star" role="radio" aria-checked="false" data-s="' + i + '" aria-label="' + i + '点">★</button>'; }).join('') + '</div></div>' +
      '<div class="rating__more" hidden><textarea rows="2" maxlength="200" placeholder="足りなかったこと・欲しい機能があれば（任意・200字まで）。連絡先は書かないでください"></textarea><button type="button" class="btn btn--sm" style="border-color:var(--text)">送る</button></div>' +
      '<div class="msg rating__done" hidden>ありがとうございます。次の改修に反映します。</div>';
    var stars = container.querySelectorAll('.star'), more = container.querySelector('.rating__more'), done = container.querySelector('.rating__done');
    function paint() { stars.forEach(function (s) { var i = Number(s.dataset.s); s.classList.toggle('on', i <= score); s.setAttribute('aria-checked', i === score ? 'true' : 'false'); }); }
    function submit(extra) {
      if (!score && useful === null) return;
      var payload = { score: score || (useful ? 4 : 2), useful: useful, stage: opts.stage || 'result' };
      if (extra && extra.comment) payload.comment = extra.comment;
      postRating(payload);
      track('tool_rating', { kind: TOOL_SLUG, score: payload.score, useful: useful });
      sent = true;
    }
    container.querySelectorAll('.rating__useful .opt').forEach(function (b) {
      b.addEventListener('click', function () {
        useful = b.dataset.u === '1';
        container.querySelectorAll('.rating__useful .opt').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        submit(); more.hidden = false; done.hidden = false;
      });
    });
    stars.forEach(function (s) {
      s.addEventListener('mouseenter', function () { var h = Number(s.dataset.s); stars.forEach(function (x) { x.classList.toggle('hover', Number(x.dataset.s) <= h); }); });
      s.addEventListener('mouseleave', function () { stars.forEach(function (x) { x.classList.remove('hover'); }); });
      s.addEventListener('click', function () { score = Number(s.dataset.s); paint(); submit(); more.hidden = false; done.hidden = false; });
    });
    more.querySelector('button').addEventListener('click', function () {
      var c = more.querySelector('textarea').value.trim();
      if (!c) return;
      submit({ comment: c }); more.hidden = true; done.textContent = 'ありがとうございます。コメントも受け取りました。';
    });
    return { sent: function () { return sent; } };
  }

  // ---------- 2026-11-05: 貼り付け入力・CSV の共通関数（order-summary / address-list / list-dedupe / booking-sheet / daily-report） ----------
  // 1行をセルに切る。タブ区切り（Excel からのコピー）はタブだけで切る。
  // カンマ区切りは "…" の中と「1,200」の桁区切りを守ってから切る。空白2つ以上・読点でも切る。
  function splitLine(line) {
    if (line.indexOf('\t') >= 0) return line.split('\t').map(function (c) { return c.replace(/^"|"$/g, '').trim(); });
    var kept = line.replace(/"([^"]*)"/g, function (m, q) { return q.replace(/,/g, '\u0001'); })
      .replace(/(^|[^\d\/\-.:：])(\d{1,3}(?:,\d{3})+)(?!\d)/g, function (m, pre, n) { return pre + n.replace(/,/g, '\u0001'); });
    return kept.split(/,|、|[ 　]{2,}/).map(function (c) { return c.replace(/\u0001/g, ',').trim(); });
  }
  // 「1,200」「１２００」「1200個」→ 1200。数でなければ NaN
  function num(s) {
    var m = String(s == null ? '' : s).normalize('NFKC').replace(/[,，\s]/g, '').match(/^-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  }
  function isoToday() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  // '2026-11-05' → '2026年11月5日（木）'
  function jpDate(iso, withDow) {
    var p = String(iso || '').split('-'); if (p.length !== 3) return String(iso || '');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return Number(p[0]) + '年' + Number(p[1]) + '月' + Number(p[2]) + '日' + (withDow ? '（' + '日月火水木金土'.charAt(d.getDay()) + '）' : '');
  }
  // 2次元配列 → CSV（全セルを "" で囲む・CRLF）
  function toCsv(rows) {
    return rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
  }
  // Shift_JIS（Windows-31J）への変換表。ブラウザの TextDecoder で全コードを復号して逆引き表を作る（外部ライブラリ・通信なし）。
  var sjisTable = null;
  function sjisMap() {
    if (sjisTable) return sjisTable;
    var m = {}, dec;
    try { dec = new TextDecoder('shift_jis', { fatal: true }); } catch (_) { return null; }
    var put = function (bytes) { try { var ch = dec.decode(new Uint8Array(bytes)); if (ch.length === 1 && !m[ch]) m[ch] = bytes; } catch (_) {} };
    for (var b = 0xA1; b <= 0xDF; b++) put([b]);
    for (var hi = 0x81; hi <= 0xFC; hi++) {
      if (hi >= 0xA0 && hi <= 0xDF) continue;
      for (var lo = 0x40; lo <= 0xFC; lo++) { if (lo !== 0x7F) put([hi, lo]); }
    }
    sjisTable = m; return m;
  }
  // 文字列 → { bytes: Uint8Array, miss: ['髙', …] }。変換できない文字は「?」にして miss に入れる。非対応ブラウザは null。
  function sjis(text) {
    var m = sjisMap(); if (!m) return null;
    var out = [], miss = [], seen = {};
    Array.from(String(text)).forEach(function (ch) {
      var c = ch.charCodeAt(0);
      if (ch.length === 1 && c < 0x80) { out.push(c); return; }
      var b = m[ch] || m[ch.normalize('NFKC')];
      if (b) { out.push.apply(out, b); return; }
      out.push(0x3F); if (!seen[ch]) { seen[ch] = 1; miss.push(ch); }
    });
    return { bytes: new Uint8Array(out), miss: miss };
  }
  // CSV を保存する。enc: 'utf8'（BOM付き UTF-8・既定）| 'sjis'（Shift_JIS）。戻り値 { ok, enc, miss }
  function saveCsv(filename, rows, enc) {
    var csv = toCsv(rows);
    if (enc === 'sjis') {
      var r = sjis(csv + '\r\n');
      if (r) return { ok: download(filename, r.bytes, 'text/csv;charset=shift_jis'), enc: 'sjis', miss: r.miss };
    }
    return { ok: download(filename, '﻿' + csv + '\r\n', 'text/csv;charset=utf-8'), enc: 'utf8', miss: [] };
  }

  window.NTOOLS = { track: track, send: send, validEmail: validEmail, copyText: copyText, download: download, fmt: fmt, today: today, $: $, el: el, esc: esc, renderCtas: renderCtas, renderRating: renderRating, LINE_URL: '',
    splitLine: splitLine, num: num, isoToday: isoToday, jpDate: jpDate, toCsv: toCsv, sjis: sjis, saveCsv: saveCsv };
})();
