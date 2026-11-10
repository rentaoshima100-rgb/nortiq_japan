// Vercel serverless function — 無料診断。
//
// POST /api/diagnose  { url }
//   -> { url, fetchedAt, overall:{score,rank,summary}, categories:{6領域}, checks, limits }
//
// サーバー側で対象のページを1回開き (HTML と応答ヘッダー)、robots.txt / llms.txt / sitemap.xml と、
// ページ内のリンクの一部 (最大12件) の到達を確かめる。判定は api/_lib/diagnose-core.js。
// 依存パッケージなし (Node の fetch と正規表現)。Lighthouse (Core Web Vitals) の実測はしていない。
//
// セキュリティは「外形チェック」だけ: ふつうのブラウザがページを開いたときに受け取る情報 (HTTPS、応答ヘッダー、
// Cookie の属性、HTML に書かれた部品の版) を読む。管理画面や設定ファイルの場所を探りに行く要求、ポートの検査、
// 攻撃の試行は送らない。入力された URL は第三者のサイトでもあり得るので、所有者の同意が要る検査はここではしない
// (それは /security で、所有・運営の確認を取ってから行う)。

const core = require('./_lib/diagnose-core.js');
const guard = require('./_lib/guard');

const UA = 'Mozilla/5.0 (compatible; NortiqLabDiagnostic/1.1; +https://nortiqlab.com/diagnostic)';

const dns = require('dns').promises;
const net = require('net');

// 内部アドレス (この関数が動くネットワークの中) への到達を防ぐ。IP リテラルと、名前が引ける先の IP の両方を見る。
// 2026-10: 以前はホスト名の文字列だけを見ていた。リダイレクト先と、内部 IP に向く DNS 名は素通りだった (SSRF)。
function isPrivateIp(ip) {
  let v = String(ip || '').toLowerCase();
  if (v.startsWith('::ffff:')) v = v.slice(7); // IPv4-mapped IPv6
  if (net.isIPv4(v)) {
    const [a, b] = v.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(v)) {
    return v === '::' || v === '::1' || /^(fc|fd)/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('64:ff9b:');
  }
  return true; // 判定できないものは通さない
}

function isPrivateHost(host) {
  host = (host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.arpa')) return true;
  if (net.isIP(host)) return isPrivateIp(host);
  // 0x7f000001 / 2130706433 / 0177.0.0.1 のような IP の別表記は new URL() が正規化するが、念のため数字と点だけの名前は通さない
  if (/^[0-9.]+$/.test(host) || /^0x/.test(host)) return true;
  return false;
}

// 名前解決の結果も確かめる (内部 IP を指す DNS 名を防ぐ)。引けなければ到達できないので false を返して fetch に任せる。
async function resolvesToPrivate(host) {
  if (net.isIP(host)) return isPrivateIp(host);
  try {
    const addrs = await dns.lookup(host, { all: true, verbatim: true });
    return addrs.some((a) => isPrivateIp(a.address));
  } catch {
    return false;
  }
}

const MAX_BODY = 600000;   // 読む HTML の上限 (これ以上は捨てる。巨大な応答でメモリと時間を使い切らない)
const MAX_REDIRECTS = 5;

async function readBounded(res, limit) {
  if (!res.body) return { text: '', bytes: 0 };
  const chunks = [];
  let total = 0;
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
      total += value.byteLength;
      if (total >= limit) { try { await reader.cancel(); } catch { /* ignore */ } break; }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
  return { text: Buffer.concat(chunks).toString('utf8').slice(0, limit), bytes: Math.min(total, limit) };
}

function headerMap(res) {
  const h = {};
  res.headers.forEach((v, k) => { h[k.toLowerCase()] = v; });
  return h;
}

// リダイレクトは自分で追う (redirect: 'follow' だと、公開サイトから内部アドレスへ 302 されても止められない)。
// 1ホップごとにプロトコル・ホスト名・名前解決の結果を確かめる。
// 戻り値: { ok, status, text, finalUrl, headers, setCookies, ms (最後の応答を受け取り終わるまで), bytes, redirects }
async function fetchDoc(url, { method = 'GET', timeout = 7000 } = {}) {
  try {
    let current = url;
    let res;
    let started = Date.now();
    let hop = 0;
    for (;; hop++) {
      const u = new URL(current);
      if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname) || await resolvesToPrivate(u.hostname)) {
        return { ok: false, status: 0, text: '', error: 'blocked_host' };
      }
      started = Date.now();
      res = await fetch(current, {
        method,
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*' },
        redirect: 'manual',
        signal: AbortSignal.timeout(timeout),
      });
      const loc = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      if (loc) {
        try { if (res.body) await res.body.cancel(); } catch { /* ignore */ }
        if (hop >= MAX_REDIRECTS) return { ok: false, status: res.status, text: '', error: 'too_many_redirects' };
        current = new URL(loc, current).href;
        continue;
      }
      break;
    }
    const body = method === 'GET' ? await readBounded(res, MAX_BODY) : { text: '', bytes: 0 };
    if (method !== 'GET') { try { if (res.body) await res.body.cancel(); } catch { /* ignore */ } }
    return {
      ok: res.ok, status: res.status, text: body.text, finalUrl: current,
      headers: headerMap(res),
      setCookies: typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [],
      ms: Date.now() - started, bytes: body.bytes, redirects: hop,
    };
  } catch (e) {
    return { ok: false, status: 0, text: '', error: String(e && (e.cause && e.cause.code || e.message) || e) };
  }
}

function extractLinks(html, baseUrl) {
  const internal = [];
  const external = [];
  const seen = new Set();
  let host = '';
  try { host = new URL(baseUrl).hostname; } catch { /* ignore */ }
  // <base href> があるページは、相対リンクをそこから解決する (無視すると、開けるリンクを「切れている」と数えてしまう)
  const resolveFrom = core.baseHref(html, baseUrl);
  for (const t of core.tags(html, 'a')) {
    const href = (core.attr(t, 'href') || '').trim();
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try {
      const u = new URL(href, resolveFrom);
      if (!/^https?:$/.test(u.protocol)) continue;
      u.hash = '';
      if (seen.has(u.href) || u.href === baseUrl) continue;
      seen.add(u.href);
      (u.hostname === host ? internal : external).push(u.href);
    } catch { /* skip */ }
    if (internal.length >= 40 && external.length >= 20) break;
  }
  // 自サイト内を優先して 8 件、外部を 4 件まで (足りない側の枠はもう一方で埋める)
  const picked = internal.slice(0, 8).concat(external.slice(0, 4));
  for (const rest of [internal.slice(8), external.slice(4)]) {
    for (const x of rest) { if (picked.length >= 12) break; picked.push(x); }
  }
  return picked;
}

// HEAD を受け付けないサーバー (405・501・403 など) と応答なしは、GET でもう一度確かめる。
async function checkLink(href) {
  const head = await fetchDoc(href, { method: 'HEAD', timeout: 4000 });
  if (head.status && head.status < 400) return head;
  if (head.error === 'blocked_host') return { status: 200 }; // 内部アドレスへのリンクは確かめない (切れているとも数えない)
  const get = await fetchDoc(href, { method: 'GET', timeout: 4000 });
  return get.status ? get : (head.status ? head : get);
}

async function analyzeBrokenLinks(html, baseUrl) {
  const links = extractLinks(html, baseUrl);
  const results = await Promise.all(links.map((href) => checkLink(href).catch(() => ({ status: 0 }))));
  return core.summarizeLinks(results);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // この診断は、指定された URL に代わってサーバーから何件かの要求を出す。よそのサイトやスクリプトから
  // 「代理で他人のサイトを調べる道具」として使われないよう、自サイトの画面からの要求だけを受ける
  // (Origin を見る。認証ではないが、ブラウザ経由の第三者利用は止まる。回数の制限は Vercel Firewall のルール)。
  if (!guard.checkOrigin(req)) { res.status(403).json({ error: 'forbidden' }); return; }

  // Body may already be parsed by Vercel; fall back to manual parse.
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body) body = {};

  let raw = (body.url || '').trim();
  if (!raw) { res.status(400).json({ error: 'url_required' }); return; }
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;

  let target;
  try { target = new URL(raw); } catch { res.status(400).json({ error: 'invalid_url' }); return; }
  if (!/^https?:$/.test(target.protocol)) { res.status(400).json({ error: 'unsupported_protocol' }); return; }
  if (isPrivateHost(target.hostname)) { res.status(400).json({ error: 'blocked_host' }); return; }

  const main = await fetchDoc(target.href, { timeout: 7000 });
  if (!main.ok || !main.text) {
    // 401・403・429 は「サイト側が自動アクセスを拒否した」。URL の間違いや停止 (それ以外) と分けて返す
    const refused = [401, 403, 429].includes(main.status);
    res.status(502).json({ error: refused ? 'site_refused' : 'fetch_failed', detail: main.error || ('HTTP ' + main.status) });
    return;
  }
  const html = main.text;
  // PDF・画像・JSON など、ページではないものは診断しない
  if (!core.looksLikeHtml(html, main.headers && main.headers['content-type'])) {
    res.status(422).json({ error: 'not_html' });
    return;
  }
  const finalUrl = main.finalUrl || target.href;
  const u = new URL(finalUrl);
  const origin = u.origin;
  const https = u.protocol === 'https:';

  const [robots, llms, sitemap, httpTry, brokenLinks] = await Promise.all([
    fetchDoc(origin + '/robots.txt', { timeout: 4000 }),
    fetchDoc(origin + '/llms.txt', { timeout: 4000 }),
    fetchDoc(origin + '/sitemap.xml', { timeout: 4000 }),
    // https のサイトだけ: http:// で開いたときに https:// へ転送されるか (トップを1回開くだけ)
    https && !u.port ? fetchDoc('http://' + u.hostname + '/', { timeout: 4000 }) : Promise.resolve(null),
    analyzeBrokenLinks(html, finalUrl),
  ]);

  // 存在しないパスにもトップの HTML を返すサイトがあるので、HTML が返ってきたものは「無い」と扱う
  const textFile = (r) => (r && r.ok && r.text && !core.looksLikeHtml(r.text, r.headers && r.headers['content-type']) ? r.text : '');
  const robotsTxt = textFile(robots);
  const llmsTxt = textFile(llms);
  const sitemapOk = !!(sitemap && sitemap.ok && /<(urlset|sitemapindex)[\s>]/i.test(sitemap.text || ''));
  // http で開けなかった (80番が閉じている) 場合は問題にしない。開けて https に移らなかったときだけ false
  const httpUpgrades = !httpTry || !httpTry.status ? null : /^https:/i.test(httpTry.finalUrl || '');

  const report = core.buildReport({
    technicalSEO: core.analyzeTechnical(html, { finalUrl, headers: main.headers, robotsTxt, sitemapOk, redirects: main.redirects }),
    onPageSEO: core.analyzeOnPage(html),
    security: core.analyzeSecurity(html, { finalUrl, headers: main.headers, setCookies: main.setCookies, httpUpgrades }),
    speed: core.analyzeSpeed(html, { headers: main.headers, ms: main.ms, bytes: main.bytes }),
    aiVisibility: core.analyzeAI(html, llmsTxt, robotsTxt),
    brokenLinks,
  });

  res.status(200).json({
    url: finalUrl,
    fetchedAt: new Date().toISOString(),
    overall: report.overall,
    categories: report.categories,
    checks: report.checks,
    linksChecked: brokenLinks.linksChecked || 0,
    limits: '公開されているページを1回開いて分かる範囲の診断です。セキュリティは設定の外形チェックで、侵入テストやログイン後の画面の検査ではありません。表示速度は応答時間と読み込み方の簡易チェックです。',
    note: 'Core Web Vitals の実測を含む詳細な診断と改善提案は、NORTIQLAB の詳細レポートでお届けします。',
  });
};
