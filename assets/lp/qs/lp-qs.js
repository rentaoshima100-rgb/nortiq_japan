/* Nortiq Labs — Google広告用LP (/lp/system, /lp/renewal) のスクリプト
 * 役割: フォーム送信 (/api/contact) / 広告の属性 (gclid 等) を隠しフィールドへ / 送達時だけ generate_lead を1回。
 * 依存なし。FAQ は <details> で開閉するので JS は要らない。
 */
(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;
  var body = document.body;
  var FIELD = body.getAttribute('data-field') || '';
  var VARIANT = body.getAttribute('data-variant') || 'parent';
  var btn = document.getElementById('f-submit');
  var status = document.getElementById('form-status');
  var done = document.getElementById('form-done');
  var label = btn ? btn.textContent : '';
  var submitting = false;   // 二重送信を防ぐ
  var leadSent = false;     // generate_lead は成功時に1回だけ

  function setStatus(msg) { if (!status) return; status.textContent = msg || ''; status.hidden = !msg; }
  function showErr(el, on) {
    var p = el.closest('.field'); if (p) p.classList.toggle('is-invalid', !!on);
    var e = document.getElementById('e-' + el.name); if (e) e.hidden = !on;
    if (on) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  function validate() {
    var first = null;
    ['company', 'name', 'email', 'field'].forEach(function (n) {
      var el = form.elements[n]; if (!el) return;
      var v = String(el.value || '').trim();
      var bad = !v || (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
      showErr(el, bad); if (bad && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  }
  form.querySelectorAll('input,select,textarea').forEach(function (el) {
    el.addEventListener('input', function () { showErr(el, false); });
  });

  // 広告の属性 (gclid / gbraid / wbraid / utm_*) と着地URL。build.js が <head> に入れる NORTIQ_ATTR から読む。
  function fillAttribution() {
    var a = (window.NORTIQ_ATTR && typeof window.NORTIQ_ATTR.get === 'function') ? window.NORTIQ_ATTR.get() : {};
    ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'landing_url'].forEach(function (k) {
      var el = form.elements[k]; if (el) el.value = a[k] || (k === 'landing_url' ? location.href.split('#')[0] : '');
    });
  }

  function fireLead() {
    if (leadSent) return; leadSent = true;
    var ev = { event: 'generate_lead', lead_field: FIELD, lp_variant: VARIANT };
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(ev); } catch (_) {}
    // GTM コンテナが入るまでの間は gtag (GA4) にも届ける。GTM が読み込まれていれば GTM 側のタグに任せる (二重計上を避ける)。
    try {
      if (!window.google_tag_manager && typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', { lead_type: 'contact', lead_field: FIELD, lp_variant: VARIANT, currency: 'JPY' });
      }
    } catch (_) {}
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting) return;
    setStatus('');
    if (!validate()) { setStatus('未入力の項目があります。赤枠の項目をご確認ください。'); return; }
    fillAttribution();
    var fd = new FormData(form);
    var payload = {
      kind: form.getAttribute('data-kind') || 'lp',
      lp: location.pathname,
      company: String(fd.get('company') || '').trim(),
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      field: String(fd.get('field') || ''),
      budget: String(fd.get('budget') || ''),
      message: String(fd.get('message') || '').trim(),
      lead_field: FIELD,
      lp_variant: VARIANT,
      landing_url: String(fd.get('landing_url') || ''),
      gclid: String(fd.get('gclid') || ''), gbraid: String(fd.get('gbraid') || ''), wbraid: String(fd.get('wbraid') || ''),
      utm_source: String(fd.get('utm_source') || ''), utm_medium: String(fd.get('utm_medium') || ''), utm_campaign: String(fd.get('utm_campaign') || ''),
      utm_term: String(fd.get('utm_term') || ''), utm_content: String(fd.get('utm_content') || ''),
      hp: String(fd.get('website') || '')
    };
    submitting = true;
    if (btn) { btn.disabled = true; btn.textContent = '送信中…'; }
    fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (res) {
        if (!res.ok) return res.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || ('HTTP ' + res.status)); });
        return res.json().catch(function () { return { ok: true }; });
      })
      .then(function () {
        fireLead();
        form.hidden = true;
        if (done) { done.hidden = false; done.focus(); }
      })
      .catch(function (err) {
        setStatus('送信に失敗しました（' + (err && err.message ? err.message : 'network') + '）。時間をおいて再度お試しいただくか、info@nortiqlab.com までメールでご連絡ください。');
        submitting = false;
        if (btn) { btn.disabled = false; btn.textContent = label; }
      });
  });
})();
