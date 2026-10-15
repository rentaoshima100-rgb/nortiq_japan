/* 広告の属性を 1st-party Cookie に保存する (サイト全体)。build.js が <head> にインラインで入れる。
 * URL の gclid / gbraid / wbraid / utm_* を読み、あれば Cookie nq_attr (90日) に保存する (最後のクリックで上書き)。
 * 着地URL (landing_url) は Cookie が無いときだけ記録する (最初の着地)。
 * 読み出しは window.NORTIQ_ATTR.get() → {gclid,...,landing_url}。フォーム (components.jsx の sendInquiry / lp-qs.js) が送信時に付ける。
 */
(function () {
  var KEYS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var NAME = 'nq_attr', DAYS = 90;
  function read() {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + NAME + '=([^;]*)'));
      var o = m ? JSON.parse(decodeURIComponent(m[1])) : null;
      return o && typeof o === 'object' ? o : {};
    } catch (_) { return {}; }
  }
  function write(o) {
    try {
      var v = encodeURIComponent(JSON.stringify(o));
      document.cookie = NAME + '=' + v + '; Max-Age=' + (DAYS * 86400) + '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    } catch (_) {}
  }
  var cur = read(), q, hit = false, next = {};
  try { q = new URLSearchParams(location.search); } catch (_) { q = null; }
  if (q) KEYS.forEach(function (k) { var v = q.get(k); if (v) { next[k] = String(v).slice(0, 200); hit = true; } });
  if (hit) {
    KEYS.forEach(function (k) { cur[k] = next[k] || ''; });
    cur.at = new Date().toISOString().slice(0, 10);
  }
  if (!cur.landing_url) cur.landing_url = location.href.split('#')[0].slice(0, 500);
  write(cur);
  window.NORTIQ_ATTR = { get: function () { var o = read(); var out = {}; KEYS.concat(['landing_url']).forEach(function (k) { out[k] = o[k] || ''; }); return out; } };
})();
