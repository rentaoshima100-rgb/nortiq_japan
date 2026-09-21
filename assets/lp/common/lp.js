/* Nortiq Labs — サービスLP共通スクリプト
 * FAQ開閉 / H1差し替え / GA4イベント / フォーム送信 (/api/contact → Resend)
 * 本体サイト (components.jsx の sendInquiry / nqTrack) と同じ規約で動く。
 */
(function () {
  'use strict';

  var body = document.body;
  var LP = body.dataset.lp || '';

  // ---------- GA4 (gtag は build.js が <head> に注入。無い環境では何もしない) ----------
  function track(name, params, convKey) {
    try {
      if (typeof window.gtag !== 'function') return;
      var p = Object.assign({ lp: LP }, params || {});
      window.gtag('event', name, p);
      var target = convKey && window.NORTIQ_CONV ? window.NORTIQ_CONV[convKey] : null;
      if (target) window.gtag('event', 'conversion', { send_to: target });
    } catch (_) { /* analytics must never throw into the UI */ }
  }

  // ---------- H1 A/B: ?h1=b / ?h1=c で代替案を表示 (判断用。本番はHTMLを書き換えて確定) ----------
  var h1 = document.querySelector('[data-h1-variants]');
  var v = new URLSearchParams(location.search).get('h1');
  if (h1 && v && h1.dataset['h1' + v.toUpperCase()]) {
    h1.innerHTML = h1.dataset['h1' + v.toUpperCase()];
  }

  // ---------- FAQ アコーディオン (初期状態は1問目のみ開く。構造化データは全問出力済み) ----------
  document.querySelectorAll('.faq__item').forEach(function (item) {
    var btn = item.querySelector('.faq__q');
    var panel = item.querySelector('.faq__a');
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      var open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // ---------- CTA クリック計測 ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ga]');
    if (el) track(el.dataset.ga, { location: el.dataset.gaLocation || '' });
  });

  // ---------- 次ページ提案 (nq) のセッションログ ----------
  // 本体サイト (nq-suggest.jsx の NQ) が sessionStorage['nq_s'] に持つ閲覧履歴へ、このLPの1件を
  // 同じ形式 {u,t,sc,dw} で追記する。LPはフルリロードで開くので、ここで書かないと履歴からLPが抜け、
  // 「カードを押してLPを読んだか」(nq_engaged) も本体側で判定できない。
  // キーが既に在るときだけ動く (= 本体側で session_log が有効で、セッションが始まっている)。
  // 無ければ何も読み書きしない。LP着地のセッションをここから始めることもしない (IDの発行は本体側だけ)。
  var nqGoalContact = function () {}; // フォーム送達時に呼ぶ。nq のセッションが在るときだけ、下で中身を入れる
  (function () {
    var KEY = 'nq_s';
    var MAX_PAGES = 30; // nq-suggest.jsx の保持上限と同じ
    try {
      if (!window.sessionStorage.getItem(KEY)) return;
    } catch (_) { return; }

    var path = location.pathname.replace(/\/+$/, '') || '/';
    var entry = null;   // いま追記している1件 (t で同定する)
    var since = document.hidden ? 0 : Date.now();
    var dwMs = 0;
    var sc = 0;

    function load() {
      try {
        var s = JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
        return s && /^r_[a-z0-9]{6,16}$/.test(String(s.sid || '')) && Array.isArray(s.pages) ? s : null;
      } catch (_) { return null; }
    }
    // 毎回読み直してから書く。別タブの本体サイトが同じキーを更新していても、履歴を巻き戻さない。
    function write(push) {
      try {
        var s = load();
        if (!s) return;
        if (push) {
          entry = { u: path, t: Date.now(), sc: 0, dw: 0 };
          s.pages.push(entry);
          if (s.pages.length > MAX_PAGES) s.pages = s.pages.slice(-MAX_PAGES);
        } else if (entry) {
          for (var i = s.pages.length - 1; i >= 0; i--) {
            if (s.pages[i].u === entry.u && s.pages[i].t === entry.t) {
              s.pages[i].sc = sc;
              s.pages[i].dw = Math.round(dwMs / 1000);
              break;
            }
          }
        }
        window.sessionStorage.setItem(KEY, JSON.stringify(s));
      } catch (_) { /* 容量超過など。履歴が1件欠けるだけで、LPの動作には影響しない */ }
    }
    function tick() {
      if (!since) return;
      var now = Date.now();
      dwMs += now - since;
      since = now;
    }

    write(true);
    if (!entry) return;

    // フォームの送達 = ゴール到達 (設計書10章の nq_goal)。本体サイトの NQ.goal('contact') と同じ扱いにする。
    // 提案カードの行き先として最優先のLPで成約しても goal が残らないと、KPI にも学習の成果信号にも入らない。
    // 本体の nq-config.json はここから読めないので、送ってよいかは本体が nq_s に控えたフラグに従う
    // (ga = GA4 / ev = /api/nq-event)。控えが無い・0 なら送らない。設定で止めたら LP 側も止まる。
    // 送るのは決定ID・種別・パスだけ。フォームの入力値は渡さない。
    nqGoalContact = function () {
      try {
        var s = load();
        if (!s) return;
        var goals = Array.isArray(s.goals) ? s.goals : [];
        if (goals.indexOf('contact') >= 0) return; // goal 種別ごとに1セッション1回 (本体と同じ)
        goals.push('contact');
        s.goals = goals;
        // 読み直した全体をそのまま書き戻す (知らないフィールドを落とさない)。書けなくても送信は続ける。
        try { window.sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
        var did = typeof s.did === 'string' ? s.did : null;
        if (s.ga === 1) track('nq_goal', { decision_id: did, goal: 'contact' });
        if (s.ev === 1 && window.navigator && typeof window.navigator.sendBeacon === 'function') {
          // 本体と同じく文字列ボディ (text/plain) の sendBeacon。完了表示の直後に離脱されても落ちにくい。
          window.navigator.sendBeacon('/api/nq-event', JSON.stringify({
            session_id: s.sid, decision_id: did, type: 'goal', goal: 'contact', page_url: path
          }));
        }
      } catch (_) { /* 計測の失敗でフォームの完了表示を止めない */ }
    };

    var ticking = false;
    function measure() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      if (y <= 0) return; // 実際に読み進めた分だけ数える
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? Math.round(Math.max(0, Math.min(100, (y / max) * 100))) : 100;
      if (pct > sc) sc = pct;
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(measure); else setTimeout(measure, 100);
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { tick(); since = 0; write(false); } else { since = Date.now(); }
    });
    window.addEventListener('pagehide', function () { tick(); write(false); });
    // bfcache から戻ったときは、新しいページ表示として1件足す (本体側の pageshow と同じ扱い)
    window.addEventListener('pageshow', function (e) {
      if (!e.persisted) return;
      dwMs = 0; sc = 0; since = document.hidden ? 0 : Date.now();
      write(true);
    });
  })();

  // ---------- フォーム送信 ----------
  var form = document.getElementById('contact-form');
  if (!form) return;

  var submitBtn = form.querySelector('button[type="submit"]');
  var status = document.getElementById('form-status');
  var done = document.getElementById('form-done');
  var submitLabel = submitBtn ? submitBtn.textContent : '';

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg || '';
    status.className = 'form__status' + (kind ? ' form__status--' + kind : '');
    status.hidden = !msg;
  }

  function fieldError(el, msg) {
    var field = el.closest('.field') || el.closest('.consent');
    if (field) field.classList.toggle('is-invalid', !!msg);
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }

  function validate() {
    var ok = true;
    var first = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
      if (!bad && el.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
      fieldError(el, bad ? 'required' : '');
      if (bad) { ok = false; if (!first) first = el; }
    });
    if (first) first.focus();
    return ok;
  }

  form.querySelectorAll('input,select,textarea').forEach(function (el) {
    el.addEventListener('input', function () { fieldError(el, ''); });
    el.addEventListener('change', function () { fieldError(el, ''); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) {
      setStatus('未入力の項目があります。赤枠の項目をご確認ください。', 'error');
      return;
    }
    var fd = new FormData(form);
    var topicSel = form.querySelector('[name="topic"]');
    var timingSel = form.querySelector('[name="timing"]');
    // select はラベル文字列、hidden/text はそのままの値を返す
    var label = function (sel) {
      if (!sel) return '';
      if (!sel.options) return String(sel.value || '');
      if (sel.selectedIndex < 0 || !sel.value) return '';
      return sel.options[sel.selectedIndex].text;
    };

    // api/contact.js が読むキーに合わせる (company / name / email / phone / siteUrl / message / kind)
    var payload = {
      kind: LP || 'lp',
      lp: location.pathname,
      company: String(fd.get('company') || '').trim(),
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('tel') || '').trim(),
      siteUrl: String(fd.get('siteUrl') || '').trim(),
      topic: label(topicSel),
      timing: label(timingSel),
      message: String(fd.get('note') || '').trim(),
      industry: label(form.querySelector('[name="industry"]')),
      jobs: String(fd.get('jobs') || '').trim(),
      hp: String(fd.get('website') || '') // honeypot: 人は空のまま
    };

    setStatus('', '');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中…'; }
    track('form_submit', { topic: payload.topic });

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.error || ('HTTP ' + res.status));
        });
      }
      // 送達 → GA4 generate_lead (+ Google Ads コンバージョン。本体と同じ key event)
      track('generate_lead', { lead_type: 'contact', currency: 'JPY', form_kind: payload.kind }, 'contact');
      nqGoalContact(); // 次ページ提案 (nq) のゴール。nq のセッションが無ければ何もしない
      form.hidden = true;
      if (done) { done.hidden = false; done.setAttribute('tabindex', '-1'); done.focus(); }
      try { history.replaceState(null, '', location.pathname + location.search + '#contact-done'); } catch (_) {}
    }).catch(function (err) {
      setStatus('送信に失敗しました（' + (err && err.message ? err.message : 'network') + '）。お手数ですが info@nortiqlab.com まで直接ご連絡ください。', 'error');
      track('form_error', { reason: err && err.message ? err.message : 'unknown' });
    }).finally(function () {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
    });
  });
})();
