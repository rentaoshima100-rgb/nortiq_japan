/* 脆弱性診断・セキュリティ保守LP (lp/security) — ページ固有の動き。
 * ファーストビューの URL 入力 (#check-mini) を、下の申し込みフォーム (#contact-form、assets/lp/common/lp.js が
 * /api/contact へ送る) の URL 欄に写してスクロールする。点検そのものはここでは行わない
 * (所有確認と同意のあとに担当が行う)。
 */
(function () {
  'use strict';
  var mini = document.getElementById('check-mini');
  var url = document.getElementById('f-url');
  if (!mini || !url) return;

  var miniUrl = document.getElementById('fv-url');
  var target = document.getElementById('check');

  mini.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = miniUrl ? String(miniUrl.value || '').trim() : '';
    if (v && !url.value) url.value = v;
    if (target) {
      try { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { target.scrollIntoView(); }
    }
    var focusTo = v ? document.getElementById('f-co') || url : url;
    window.setTimeout(function () { try { focusTo.focus({ preventScroll: true }); } catch (_) { focusTo.focus(); } }, 400);
    try {
      if (typeof window.gtag === 'function') window.gtag('event', 'security_cta', { lp: document.body.dataset.lp || '', location: 'fv-mini', has_url: v ? 1 : 0 });
    } catch (_) { /* 計測の失敗で動きを止めない */ }
  });
})();
