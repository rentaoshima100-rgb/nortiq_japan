// Vercel serverless function — real, lightweight site diagnosis.
//
// POST /api/diagnose  { url }
//   -> { url, overall:{score,rank,summary}, categories:{...}, fetchedAt }
//
// Runs server-side (no CORS limits) and analyses the target page's HTML +
// robots.txt / llms.txt / sitemap.xml + a sampled broken-link check.
// Deliberately dependency-free (Node 20 global fetch + regex) so it deploys
// on Vercel without a build step. Heavier Lighthouse/Core-Web-Vitals scoring
// can be layered on later via the PageSpeed Insights API.

const UA = 'Mozilla/5.0 (compatible; NortiqLabDiagnostic/1.0; +https://nortiqlab.com)';

function clamp(n, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, Math.round(n))); }

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
  if (!res.body) return '';
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
  return Buffer.concat(chunks).toString('utf8').slice(0, limit);
}

// リダイレクトは自分で追う (redirect: 'follow' だと、公開サイトから内部アドレスへ 302 されても止められない)。
// 1ホップごとにプロトコル・ホスト名・名前解決の結果を確かめる。
async function fetchDoc(url, { method = 'GET', timeout = 7000 } = {}) {
  try {
    let current = url;
    let res;
    for (let hop = 0; ; hop++) {
      const u = new URL(current);
      if (!/^https?:$/.test(u.protocol) || isPrivateHost(u.hostname) || await resolvesToPrivate(u.hostname)) {
        return { ok: false, status: 0, text: '', error: 'blocked_host' };
      }
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
    const text = method === 'GET' ? await readBounded(res, MAX_BODY) : '';
    if (method !== 'GET') { try { if (res.body) await res.body.cancel(); } catch { /* ignore */ } }
    return { ok: res.ok, status: res.status, text, finalUrl: current };
  } catch (e) {
    return { ok: false, status: 0, text: '', error: String(e && e.message || e) };
  }
}

// ---- HTML helpers (regex-based, no DOM) ----
const between = (html, re) => { const m = html.match(re); return m ? m[1].trim() : ''; };
const countMatches = (html, re) => (html.match(re) || []).length;

function analyzeOnPage(html, baseUrl) {
  const issues = [];
  let score = 100;

  const title = between(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) { score -= 22; issues.push('title タグがありません'); }
  else if (title.length < 10 || title.length > 60) { score -= 8; issues.push(`title が ${title.length} 文字 (推奨 10–60)`); }

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  const desc = descMatch ? between(descMatch[0], /content=["']([\s\S]*?)["']/i) : '';
  if (!desc) { score -= 14; issues.push('meta description がありません'); }
  else if (desc.length < 60 || desc.length > 170) { score -= 5; issues.push(`meta description が ${desc.length} 文字 (推奨 60–160)`); }

  const h1 = countMatches(html, /<h1[\s>]/gi);
  if (h1 === 0) { score -= 12; issues.push('h1 がありません'); }
  else if (h1 > 1) { score -= 8; issues.push(`h1 が ${h1} 個 (推奨 1 個)`); }

  const imgs = countMatches(html, /<img[\s>]/gi);
  const imgsNoAlt = countMatches(html, /<img(?![^>]*\balt=)[^>]*>/gi);
  if (imgs > 0 && imgsNoAlt > 0) {
    const ratio = imgsNoAlt / imgs;
    score -= clamp(ratio * 18, 0, 18);
    issues.push(`alt 属性なしの画像が ${imgsNoAlt}/${imgs} 件`);
  }

  const hasOg = /<meta[^>]+property=["']og:(title|image|description)["']/i.test(html);
  if (!hasOg) { score -= 8; issues.push('OGP (og:title/og:image) が未設定'); }

  const hasLang = /<html[^>]+\blang=/i.test(html);
  if (!hasLang) { score -= 5; issues.push('<html lang> が未設定'); }

  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  if (!hasCanonical) { score -= 4; issues.push('canonical が未設定'); }

  return { score: clamp(score), topIssue: issues[0] || '大きな問題は見つかりませんでした', issues };
}

function analyzeTechnical(html, finalUrl, robotsTxt, sitemapOk) {
  const issues = [];
  let score = 100;

  if (!/^https:/i.test(finalUrl)) { score -= 25; issues.push('HTTPS化されていません'); }
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) { score -= 18; issues.push('viewport メタがなくモバイル非対応の可能性'); }
  if (!/<meta[^>]+charset/i.test(html)) { score -= 6; issues.push('charset 宣言が見当たりません'); }
  if (!robotsTxt) { score -= 12; issues.push('robots.txt がありません'); }
  if (!sitemapOk) { score -= 10; issues.push('sitemap.xml が見当たりません'); }
  if (!/application\/ld\+json/i.test(html)) { score -= 12; issues.push('構造化データ (JSON-LD) が未設置'); }

  // crude render-blocking signal
  const headSyncScripts = countMatches((html.split(/<\/head>/i)[0] || ''), /<script(?![^>]*\b(async|defer|type=["']module)["']?)[^>]*\bsrc=/gi);
  if (headSyncScripts > 2) { score -= 8; issues.push(`head 内の同期スクリプトが ${headSyncScripts} 件 (描画ブロックの可能性)`); }

  return { score: clamp(score), topIssue: issues[0] || '基本的なテクニカル要件は満たしています', issues };
}

function analyzeAI(html, llmsTxt, robotsTxt) {
  const issues = [];
  let score = 100;

  if (!/application\/ld\+json/i.test(html)) { score -= 28; issues.push('構造化データ (JSON-LD) が無く AI が文脈を理解しにくい'); }
  if (!llmsTxt) { score -= 22; issues.push('llms.txt が未設置 (AI 検索向けの案内ファイル)'); }

  const blockedBots = [];
  if (robotsTxt) {
    const txt = robotsTxt.toLowerCase();
    // very rough: look for "user-agent: gptbot" ... "disallow: /"
    for (const bot of ['gptbot', 'claude-web', 'claudebot', 'perplexitybot', 'google-extended']) {
      const idx = txt.indexOf(bot);
      if (idx !== -1) {
        const seg = txt.slice(idx, idx + 200);
        if (/disallow:\s*\//.test(seg)) blockedBots.push(bot);
      }
    }
  }
  if (blockedBots.length) { score -= 18; issues.push(`AIクローラーをブロック: ${blockedBots.join(', ')}`); }

  const hasAuthor = /(rel=["']author["']|itemprop=["']author["']|class=["'][^"']*author)/i.test(html) || /著者|執筆|監修/.test(html);
  if (!hasAuthor) { score -= 12; issues.push('著者・監修情報 (E-E-A-T) が見当たりません'); }

  const hasDate = /(datetime=|itemprop=["']dateModified["']|published|更新日|公開日)/i.test(html);
  if (!hasDate) { score -= 8; issues.push('更新日/公開日が見当たりません'); }

  const lists = countMatches(html, /<(ul|ol|table)[\s>]/gi);
  if (lists < 1) { score -= 8; issues.push('箇条書き/表が少なく AI に引用されにくい構成'); }

  return { score: clamp(score), topIssue: issues[0] || 'AI 可視性の基礎要件は概ね満たしています', issues };
}

function extractLinks(html, baseUrl) {
  const hrefs = [];
  const re = /<a[^>]+href=["']([^"'#]+)["']/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) && hrefs.length < 40) {
    let href = m[1].trim();
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    try {
      const abs = new URL(href, baseUrl).href;
      if (!/^https?:/i.test(abs)) continue;
      if (seen.has(abs)) continue;
      seen.add(abs);
      hrefs.push(abs);
    } catch { /* skip */ }
  }
  return hrefs;
}

async function analyzeBrokenLinks(html, baseUrl) {
  const links = extractLinks(html, baseUrl).slice(0, 12);
  if (links.length === 0) return { score: 100, topIssue: 'チェック対象のリンクが見つかりませんでした', issues: [], checked: 0, broken: 0 };
  const results = await Promise.allSettled(
    links.map((href) => fetchDoc(href, { method: 'HEAD', timeout: 4000 }))
  );
  let broken = 0;
  results.forEach((r) => {
    const v = r.status === 'fulfilled' ? r.value : null;
    if (!v || (v.status >= 400) || v.status === 0) broken++;
  });
  const rate = broken / links.length;
  const score = clamp(100 - rate * 100 * 4); // 5% broken ~= 80, 25% ~= 0
  const issues = broken ? [`${links.length} 件中 ${broken} 件のリンクが到達不可`] : [];
  return { score, topIssue: broken ? issues[0] : 'リンク切れは検出されませんでした', issues, checked: links.length, broken };
}

function rankOf(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return '要改善';
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

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
    res.status(502).json({ error: 'fetch_failed', detail: main.error || ('HTTP ' + main.status) });
    return;
  }
  const html = main.text.slice(0, 600000); // cap
  const finalUrl = main.finalUrl || target.href;

  const origin = new URL(finalUrl).origin;
  const [robots, llms, sitemap, brokenLinks] = await Promise.all([
    fetchDoc(origin + '/robots.txt', { timeout: 4000 }),
    fetchDoc(origin + '/llms.txt', { timeout: 4000 }),
    fetchDoc(origin + '/sitemap.xml', { method: 'HEAD', timeout: 4000 }),
    analyzeBrokenLinks(html, finalUrl),
  ]);

  const robotsTxt = robots.ok ? robots.text : '';
  const onPage = analyzeOnPage(html, finalUrl);
  const technical = analyzeTechnical(html, finalUrl, robotsTxt, sitemap.ok);
  const ai = analyzeAI(html, llms.ok && llms.text, robotsTxt);

  const categories = {
    technicalSEO: { label: 'Technical SEO', icon: '🔧', ...technical },
    onPageSEO:    { label: 'On-Page SEO',  icon: '📝', ...onPage },
    brokenLinks:  { label: 'Broken Links', icon: '🔗', ...brokenLinks },
    aiVisibility: { label: 'AI Visibility', icon: '🤖', ...ai },
  };

  const overallScore = clamp(
    technical.score * 0.32 +
    onPage.score * 0.30 +
    brokenLinks.score * 0.16 +
    ai.score * 0.22
  );

  const weakest = Object.values(categories).sort((a, b) => a.score - b.score)[0];
  const summary = overallScore >= 75
    ? `全体的に良好です。さらに伸ばすなら「${weakest.label}」に改善余地があります。`
    : `「${weakest.label}」を中心に改善余地があります。詳細レポートで優先順位をご提案します。`;

  res.status(200).json({
    url: finalUrl,
    fetchedAt: new Date().toISOString(),
    overall: { score: overallScore, rank: rankOf(overallScore), summary },
    categories,
    note: 'Core Web Vitals を含む詳細スコアは、NORTIQLAB の詳細レポートでお届けします。',
  });
};
