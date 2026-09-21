// 次ページ提案（nq）— モデルに渡す「状態」をサーバ側で組み立てる。
//
// クライアントから受け取るのは URL と列挙値だけ。title / type / topic などの文章は、
// 必ずここで catalog から引き直す。状態の中の文章は判定を動かしうるので（設計書6章）、
// 訪問者やよそのスクリプトが書いた文字列が1文字も入らない作りにしておく。
// 秒数やスクロール率の数値も受け取らない（クライアントが deep / half などの言葉に直して送る）。

const data = require('./data');

const ARTICLE_RE = /^\/article-[a-z0-9][a-z0-9-]{0,118}$/;
const MAX_URL_LEN = 200;
const MAX_PASSED = 30;

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

// ルートからのパスだけを受ける。クエリとハッシュは落とす（utm や検索語、フォームの値が
// 紛れ込む場所なので、ログにも残さない）。末尾スラッシュは catalog のキーに合わせて外す。
function normalizeUrl(u) {
  if (typeof u !== 'string') return null;
  let s = u.trim();
  if (!s || s.length > MAX_URL_LEN) return null;
  if (s[0] !== '/' || s.startsWith('//')) return null; // 絶対URL・プロトコル相対は受けない
  s = s.split('#')[0].split('?')[0];
  if (!/^[A-Za-z0-9\-._~\/]+$/.test(s)) return null;
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}

// URL → catalog のページ。catalog に無い /article-* だけは type「記事」・title なしで通す。
// 記事は外部パイプラインが随時公開するので、catalog の再生成（＝次のデプロイ）より先に
// 着地するセッションがありうる。それを落とすと、いちばん新しい記事ほど判定されなくなる。
function resolvePage(u) {
  const url = normalizeUrl(u);
  if (!url) return null;
  const cat = data.catalog || {};
  const hit = Object.prototype.hasOwnProperty.call(cat, url) ? cat[url] : null;
  if (hit) return { url, page: hit };
  if (ARTICLE_RE.test(url)) return { url, page: { type: 'article' } };
  return null;
}

const typeLabel = (type) => {
  const map = (data.labels && data.labels.page_type_labels) || {};
  return map[type] || map.other || 'その他';
};

const enumLabel = (group, key) => {
  const map = (data.labels && data.labels.state_enums && data.labels.state_enums[group]) || {};
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
};

// catalog 由来の語だけでページを表す。title が無いページ（未登録の記事）は title ごと省く。
function describe(page, extra) {
  const out = {};
  if (page.title) out.title = String(page.title);
  out.type = typeLabel(page.type);
  if (extra) {
    if (page.topic) out.topic = String(page.topic);
    if (Array.isArray(page.industry) && page.industry.length) out.industry = page.industry.slice();
    if (Array.isArray(page.need) && page.need.length) out.need = page.need.slice();
  }
  return out;
}

const FAIL = { ok: false, state: null, currentUrl: null, landingUrl: null, passed: [], viewedUrls: [], revisit: false };

// raw はリクエストの state。返す state は設計書6章の例と同じ日本語キーの形。
function buildState(raw) {
  if (!isObj(raw)) return FAIL;

  const ref = enumLabel('ref', raw.ref);
  const visit = enumLabel('visit', raw.visit);
  const device = enumLabel('device', raw.device);
  if (!ref || !visit || !device) return FAIL;

  const landing = resolvePage(raw.landing);
  if (!landing) return FAIL;

  if (!isObj(raw.current)) return FAIL;
  const current = resolvePage(raw.current.url);
  const reach = enumLabel('reach', raw.current.reach);
  if (!current || !reach) return FAIL;

  // 履歴は、URL が catalog に在り、読み方が列挙値のものだけ残す。直近 N 件に絞る
  // （状態が不要な情報で埋まると判定の精度が落ちるため）。
  if (raw.history != null && !Array.isArray(raw.history)) return FAIL;
  const limit = Number(data.rules && data.rules.history_pages) > 0 ? Number(data.rules.history_pages) : 5;
  // viewedUrls は「すでに見たページ」。モデルには渡さず、提案の候補から外すのに使う（設計書7章
  // 「1. 候補を絞る」）。こちらは直近 N 件に絞らない。読み方も問わない（途中離脱でも一度は開いている）。
  const history = [];
  const viewedUrls = [];
  for (const h of (raw.history || []).slice(-50)) {
    if (!isObj(h)) continue;
    const p = resolvePage(h.url);
    const read = enumLabel('read', h.read);
    if (!p || !read) continue;
    history.push(Object.assign(describe(p.page, false), { '読み方': read }));
    if (!viewedUrls.includes(p.url)) viewedUrls.push(p.url);
  }

  // 見送った提案は blocks に在る ID だけ。
  if (raw.passed != null && !Array.isArray(raw.passed)) return FAIL;
  const passed = [];
  for (const id of (raw.passed || []).slice(0, MAX_PASSED)) {
    if (typeof id === 'string' && data.getBlock(id) && !passed.includes(id)) passed.push(id);
  }

  const state = {
    '流入元': ref,
    '着地ページ': describe(landing.page, true),
    '閲覧履歴': history.slice(-limit),
    '現在のページ': Object.assign(describe(current.page, false), { '到達': reach }),
    '訪問': visit,
    'デバイス': device,
    '見送った提案': passed.slice(),
  };
  return { ok: true, state, currentUrl: current.url, landingUrl: landing.url, passed, viewedUrls, revisit: raw.visit === 'return' };
}

module.exports = { buildState, normalizeUrl, resolvePage };
