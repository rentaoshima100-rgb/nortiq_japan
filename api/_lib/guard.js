// 次ページ提案（nq）— 入口の防御。
//
// /api/suggest は呼ばれるたびにモデルの原価が発生する。既存の2関数（contact / diagnose）と
// 同じ無防備のままでは出せないので、コードだけでできる最低限をここに置く。
// レート制限は Vercel Firewall のルールで掛ける（KV を足さず、IP も保存しないため）。

const crypto = require('crypto');

// 本番ドメインは名前で通す。
const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?nortiqlab\.com$/,
];
const LOCAL_HOSTNAME = /^(localhost|127\.0\.0\.1)$/;

function originOf(value) {
  try { return new URL(String(value)).origin.toLowerCase(); } catch { return ''; }
}

// リクエストが届いたホスト。Vercel は利用者が開いたホスト名を x-forwarded-host に入れる。
function requestHost(h) {
  const raw = h['x-forwarded-host'] || h.host;
  return String(Array.isArray(raw) ? raw[0] : raw == null ? '' : raw).split(',')[0].trim().toLowerCase();
}

// Origin を見る。無ければ Referer で代用する（同一オリジンの POST と sendBeacon は Origin を送るが、
// 古いブラウザ向けの保険）。どちらも無いリクエストは通さない。
// 通すのは本番ドメインと「同一オリジン」（Origin のホストが、このリクエストの届いたホストと同じ）だけ。
// Vercel のプレビュー（デプロイごとの URL・ブランチのエイリアス）とローカル確認は、同一オリジンで通る。
// *.vercel.app を名前で許可してはいけない。だれでも無料で <任意の名前>.vercel.app を作れるので、
// 第三者のページから訪問者のブラウザ経由で叩けてしまう（プロジェクト名の接頭辞で縛っても、
// 同じ接頭辞のプロジェクトを作られれば通る）。ブラウザからは Host を偽装できない。
// ヘッダはブラウザ以外なら偽装できるので、これは認証ではなく「よそのサイトに埋め込まれて
// 原価だけ増える」のを防ぐためのもの。
function checkOrigin(req) {
  const h = (req && req.headers) || {};
  const origin = originOf(h.origin) || originOf(h.referer);
  if (!origin) return false;
  if (ALLOWED_ORIGINS.some((re) => re.test(origin))) return true;
  const host = requestHost(h);
  if (!host) return false;
  // file: や data: の origin は文字列 'null' になり、URL として読めない。通さない。
  // http を許すのはローカル確認だけ（公開のホストは https でしか配信していない）。
  try {
    const u = new URL(origin);
    return u.host === host && (u.protocol === 'https:' || LOCAL_HOSTNAME.test(u.hostname));
  } catch { return false; }
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
