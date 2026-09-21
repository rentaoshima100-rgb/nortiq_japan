// 次ページ提案（nq）— 入口の防御。
//
// /api/suggest は呼ばれるたびにモデルの原価が発生する。既存の2関数（contact / diagnose）と
// 同じ無防備のままでは出せないので、コードだけでできる最低限をここに置く。
// レート制限は Vercel Firewall のルールで掛ける（KV を足さず、IP も保存しないため）。

const crypto = require('crypto');

// 本番ドメイン・Vercel のプレビュー・ローカル確認だけを通す。
const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?nortiqlab\.com$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/,
];

function originOf(value) {
  try { return new URL(String(value)).origin.toLowerCase(); } catch { return ''; }
}

// Origin を見る。無ければ Referer で代用する（同一オリジンの POST と sendBeacon は Origin を送るが、
// 古いブラウザ向けの保険）。どちらも無いリクエストは通さない。
// ヘッダはブラウザ以外なら偽装できるので、これは認証ではなく「よそのサイトに埋め込まれて
// 原価だけ増える」のを防ぐためのもの。
function checkOrigin(req) {
  const h = (req && req.headers) || {};
  const origin = originOf(h.origin) || originOf(h.referer);
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((re) => re.test(origin));
}

const BOT_RE = new RegExp([
  'bot', 'crawl', 'spider', 'slurp', 'preview', 'fetch', 'scan', 'monitor',
  'facebookexternalhit', 'embedly', 'lighthouse', 'pagespeed', 'gtmetrix', 'pingdom',
  'headless', 'phantomjs', 'puppeteer', 'playwright', 'selenium', 'webdriver',
  'curl', 'wget', 'python', 'java\\/', 'go-http', 'okhttp', 'axios', '\\bnode\\b', 'node-fetch', 'undici', 'libwww', 'httpclient',
].join('|'), 'i');

// UA が空のものも bot 扱いにする（ふつうのブラウザは必ず UA を送る）。
function isBot(ua) {
  const s = String(ua == null ? '' : ua).trim();
  if (!s) return true;
  return BOT_RE.test(s);
}

// クライアントが sessionStorage に持つ乱数（'r_' + 英小文字と数字）。それ以外の形は受けない。
function validSessionId(s) {
  return typeof s === 'string' && /^r_[a-z0-9]{6,16}$/.test(s);
}

// env の文字列を 0〜1 の割合に直す。未設定や数値でない値は既定値に落とす。
function parseRate(value, fallback) {
  const fb = Number.isFinite(fallback) ? fallback : 0.2;
  if (value == null || String(value).trim() === '') return fb;
  const n = Number(value);
  if (!Number.isFinite(n)) return fb;
  return Math.min(1, Math.max(0, n));
}

// ホールドアウトは session_id のハッシュから決定的に決める。同じセッションは何度呼んでも
// 同じ群に入り、サーバ側に状態を持たずに済む。接頭辞は、将来ほかの用途で同じ ID を
// ハッシュしたときに群が相関しないようにするための塩。
function isHoldout(sessionId, rate) {
  const r = parseRate(rate, 0);
  if (r <= 0) return false;
  if (r >= 1) return true;
  const h = crypto.createHash('sha256').update('nq-holdout-v1:' + String(sessionId)).digest();
  return h.readUInt32BE(0) / 0x100000000 < r;
}

module.exports = { checkOrigin, isBot, validSessionId, isHoldout, parseRate };
