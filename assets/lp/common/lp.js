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
