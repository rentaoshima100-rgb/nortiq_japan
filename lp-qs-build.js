// lp-qs-build.js — Google広告用LP (品質スコア対策) の静的生成。build.js から呼ぶ。
//
//   data/lp/common.json          共通 (会社情報・フォームの選択肢・フッター)
//   data/lp/system.json          システム開発: 親LP + バリエーション5つ
//   data/lp/renewal.json         リニューアル: 親LP + バリエーション5つ
//   assets/lp/qs/lp-qs.css       LPのスタイル (ビルド時に <head> へインライン)
//   assets/lp/qs/lp-qs.js        フォーム送信・属性の隠しフィールド・generate_lead (defer で読む)
//   assets/lp/qs/fonts/*.woff2   サブセットした Noto Sans JP (自前配信)
//
// 出力: dist/lp/<field>/index.html と dist/lp/<field>/<variant>/index.html (合計12ページ)。
//   - H1 は最初のHTMLに含める (JSで差し替えない)。
//   - バリエーションの canonical は親LPへ。sitemap には親だけ載せる (戻り値 parentRoutes)。
//   - 金額・期間はデータに手で書かず、{{price:web.light}} のような印を content-data.jsx の NORTIQ_PRICING から埋める。
//
// 単体実行 (確認用): node lp-qs-build.js  → dist/lp/ に出す (analytics は空)。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = __dirname;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = esc;

// ---------- NORTIQ_PRICING (content-data.jsx の目印の間を vm で評価。pricing-check.js と同じやり方) ----------
function loadPricing() {
  const src = fs.readFileSync(path.join(ROOT, 'content-data.jsx'), 'utf8');
  const a = src.indexOf('// NORTIQ_PRICING:BEGIN'), b = src.indexOf('// NORTIQ_PRICING:END');
  if (a < 0 || b < 0) throw new Error('content-data.jsx に NORTIQ_PRICING の目印がありません');
  const ctx = {};
  vm.runInNewContext(src.slice(a, b) + '\nthis.P = NORTIQ_PRICING;', ctx);
  return ctx.P;
}
const priceNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pricePeriod = (plan) => {
  if (!plan) return '';
  const span = (v) => (Array.isArray(v) ? v[0] + '〜' + v[1] : String(v));
  const s = plan.weeks != null ? span(plan.weeks) + '週間' : plan.months != null ? span(plan.months) + 'ヶ月' : '';
  return s ? (plan.approx ? '約' : '') + s + (plan.orMore ? '以上' : '') : '';
};
function makeResolver(P) {
  const tax = '（' + P.tax + '）';
  const plan = (ref) => {
    const [svc, key] = ref.split('.');
    const s = P[svc]; const p = s && s.plans && s.plans.find((x) => x.key === key);
    if (!p) throw new Error('NORTIQ_PRICING に ' + ref + ' がありません');
    return p;
  };
  const fns = {
    price: (ref) => priceNum(plan(ref).min) + '万円〜' + tax,
    pricenum: (ref) => priceNum(plan(ref).min),
    monthly: (ref) => '月' + priceNum(plan(ref).min) + '万円〜' + tax,
    period: (ref) => pricePeriod(plan(ref)),
    maint: () => '月' + priceNum(P.maintenance.monthlyMin) + '万円〜' + tax,
    yen: (ref) => String(plan(ref).min * 10000),
  };
  const resolve = (s) => String(s).replace(/{{(\w+)(?::([\w.]+))?}}/g, (m, fn, ref) => {
    if (!fns[fn]) throw new Error('不明な印 ' + m);
    return fns[fn](ref);
  });
  const deep = (v) => (typeof v === 'string' ? resolve(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);
  return { resolve, deep, plan };
}

// ---------- 小さな部品 ----------
const ICON = {
  check: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  dash: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
};
const list = (items, cls) => `<ul class="${cls}">${items.map((t) => `<li>${ICON.check}<span>${esc(t)}</span></li>`).join('')}</ul>`;

// ヒーローの図 (画像を使わない: リクエスト0・CLS 0)
function heroVisual(field) {
  if (field === 'system') {
    const rows = ['課題', 'システム化の範囲案', 'PoCで確かめること', '費用と期間の概算レンジ', '次にやること'];
    return `<figure class="fv__fig" aria-label="要件整理メモのサンプル（イメージ）"><div class="memo"><div class="memo__head"><span class="memo__t">要件整理メモ</span><span class="memo__s">PDF・A4で1〜2枚</span></div><ol class="memo__rows">${rows.map((r, i) => `<li><span class="memo__n">${i + 1}</span><span class="memo__l">${r}</span><span class="memo__bar" aria-hidden="true"></span></li>`).join('')}</ol></div><figcaption>無料要件整理でお渡しするメモのサンプル（イメージ）</figcaption></figure>`;
  }
  const r = (x, y, w, h, f, rx = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" rx="${rx}"/>`;
  const before = r(0, 0, 400, 300, '#fff') + r(0, 0, 400, 28, '#E6EAEF') + r(12, 9, 60, 10, '#9AA3B2') + [150, 200, 250, 300, 350].map((x) => r(x, 10, 36, 8, '#9AA3B2')).join('')
    + r(12, 40, 376, 70, '#C9D0DA') + r(24, 56, 180, 12, '#8A93A3') + r(24, 76, 120, 8, '#8A93A3')
    + [0, 1, 2, 3].map((i) => r(12 + i * 95, 122, 85, 50, '#E6EAEF') + r(18 + i * 95, 178, 70, 6, '#B5BCC8')).join('')
    + [0, 1, 2, 3, 4, 5].map((i) => r(12, 196 + i * 16, 376, 8, i % 2 ? '#E6EAEF' : '#D9DEE6')).join('');
  const after = r(0, 0, 400, 300, '#fff') + r(16, 11, 70, 10, '#1E3A5F') + r(300, 8, 84, 16, '#1E3A5F', 4) + r(0, 32, 400, 1, '#D5DBE3')
    + r(16, 56, 220, 16, '#1E3A5F') + r(16, 80, 180, 16, '#1E3A5F') + r(16, 108, 200, 7, '#9AA3B2') + r(16, 122, 160, 7, '#9AA3B2') + r(16, 142, 120, 24, '#B4532A', 4) + r(256, 52, 128, 120, '#F4F6F8', 6)
    + [0, 1, 2].map((i) => r(16 + i * 124, 196, 112, 84, '#F4F6F8', 6) + r(28 + i * 124, 210, 60, 8, '#1E3A5F') + r(28 + i * 124, 226, 88, 6, '#9AA3B2') + r(28 + i * 124, 238, 70, 6, '#9AA3B2')).join('');
  const svg = (body, label) => `<div class="ba__shot" role="img" aria-label="${label}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" aria-hidden="true">${body}</svg></div>`;
  return `<figure class="fv__fig" aria-label="今のサイトと作り直し案のイメージ"><div class="ba"><div class="ba__col"><span class="ba__tag">BEFORE</span>${svg(before, '今のサイトのトップページ（イメージ）')}<span class="ba__cap">今のサイト</span></div><div class="ba__col"><span class="ba__tag ba__tag--after">AFTER</span>${svg(after, '作り直し案のトップページ（イメージ）')}<span class="ba__cap">作り直し案（モックアップ）</span></div></div><figcaption>無料でお作りするトップページ案のイメージ</figcaption></figure>`;
}

// ---------- セクション ----------
function sectionPricing(d) {
  const pr = d.pricing;
  const plans = pr.plans.map((p) => `<article class="plan${p.featured ? ' plan--featured' : ''}">${p.featured ? '<span class="plan__badge">おすすめ</span>' : ''}<h3 class="plan__name">${esc(p.name)}</h3><p class="plan__tag">${esc(p.tagline)}</p><p class="plan__price"><span class="num">${esc(p.price)}</span></p>${p.period ? `<p class="plan__period">期間の目安 ${esc(p.period)}</p>` : ''}<p class="plan__h">含む</p>${list(p.includes, 'plan__list plan__list--in')}<p class="plan__h">別途</p><ul class="plan__list plan__list--ex">${p.extras.map((t) => `<li>${ICON.dash}<span>${esc(t)}</span></li>`).join('')}</ul></article>`).join('');
  return `<section class="sec sec--muted" id="pricing" aria-labelledby="pricing-h"><div class="in"><h2 class="h2" id="pricing-h">${esc(pr.h2)}</h2><p class="legend"><span class="legend__in">${ICON.check}含む</span><span class="legend__ex">${ICON.dash}別途</span></p><div class="plans">${plans}</div>${pr.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}</div></section>`;
}
function sectionProblem(d) {
  return `<section class="sec" id="problem" aria-labelledby="problem-h"><div class="in"><h2 class="h2" id="problem-h">${esc(d.problem.h2)}</h2>${list(d.problem.items, 'checks')}</div></section>`;
}
function sectionSolution(d) {
  const s = d.solution;
  return `<section class="sec sec--muted" id="solution" aria-labelledby="solution-h"><div class="in"><h2 class="h2" id="solution-h">${esc(s.h2)}</h2><p class="lead">${esc(s.lead)}</p><div class="cards">${s.items.map((it, i) => `<article class="card"><span class="card__n">${String(i + 1).padStart(2, '0')}</span><h3 class="h3">${esc(it.h3)}</h3><p>${esc(it.p)}</p></article>`).join('')}</div></div></section>`;
}
function sectionCases(d) {
  const c = d.cases;
  return `<section class="sec" id="cases" aria-labelledby="cases-h"><div class="in"><h2 class="h2" id="cases-h">${esc(c.h2)}</h2><div class="cases">${c.items.map((it) => `<article class="case"><h3 class="case__ind"><span class="case__k">業種</span>${esc(it.industry)}</h3><dl class="case__dl"><div><dt>課題</dt><dd>${esc(it.issue)}</dd></div><div><dt>対応</dt><dd>${esc(it.action)}</dd></div><div><dt>結果</dt><dd>${esc(it.result)}</dd></div></dl></article>`).join('')}</div><p class="note">${esc(c.note)}</p></div></section>`;
}
function sectionOffer(d) {
  const o = d.offer_detail;
  return `<section class="sec sec--muted" id="offer" aria-labelledby="offer-h"><div class="in"><h2 class="h2" id="offer-h">${esc(o.h2)}</h2><div class="offer"><div class="offer__box"><span class="badge">無料</span><h3 class="h3">${esc(d.offer.name)}</h3><dl class="offer__dl">${o.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div><div class="offer__box"><p class="offer__lt">${esc(o.list_title)}</p><ol class="offer__ol">${o.list.map((t) => `<li>${esc(t)}</li>`).join('')}</ol><p class="note">${esc(o.note)}</p></div></div><div class="cta-row"><a class="btn btn--primary" href="#form">${esc(d.offer.cta)}${ICON.arrow}</a><p class="note">${esc(d.common.reply)}</p></div></div></section>`;
}
function sectionReasons(d) {
  return `<section class="sec" id="reasons" aria-labelledby="reasons-h"><div class="in"><h2 class="h2" id="reasons-h">${esc(d.reasons.h2)}</h2>${list(d.reasons.items, 'checks checks--one')}</div></section>`;
}
function sectionProcess(d) {
  const p = d.process;
  return `<section class="sec sec--muted" id="process" aria-labelledby="process-h"><div class="in"><h2 class="h2" id="process-h">${esc(p.h2)}</h2><ol class="steps">${p.steps.map((s, i) => `<li class="step${s.optional ? ' step--opt' : ''}"><span class="step__n">STEP ${i + 1}${s.optional ? '<small>任意</small>' : ''}</span><h3 class="step__t">${esc(s.title)}</h3><p class="step__o"><span class="step__k">成果物</span>${esc(s.out)}</p>${s.note ? `<p class="step__note">${esc(s.note)}</p>` : ''}</li>`).join('')}</ol><p class="note">実線＝標準の工程、破線＝任意の工程</p></div></section>`;
}
function sectionFaq(d) {
  return `<section class="sec" id="faq" aria-labelledby="faq-h"><div class="in in--narrow"><h2 class="h2" id="faq-h">よくある質問</h2><div class="faq">${d.faq.map((f) => `<details class="faq__i"><summary class="faq__q"><span>${esc(f.q)}</span>${ICON.chev}</summary><div class="faq__a"><p>${esc(f.a)}</p></div></details>`).join('')}</div></div></section>`;
}
function sectionCompany(d) {
  const c = d.common.company;
  const rows = [['会社名', `${c.name}（${c.brand_note}）`], ['所在地', `〒${c.postal} ${c.address}`], ['事業内容', c.business], ['設立', c.founded], ['連絡先', c.email]];
  if (c.representative && c.representative.trim()) rows.splice(2, 0, ['代表者', c.representative]);
  return `<section class="sec sec--muted" id="company" aria-labelledby="company-h"><div class="in in--narrow"><h2 class="h2" id="company-h">会社情報</h2><dl class="company">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${k === '連絡先' ? `<a href="mailto:${attr(v)}">${esc(v)}</a>` : esc(v)}</dd></div>`).join('')}</dl><p class="note">会社概要の詳細は <a href="/company">会社概要ページ</a> をご覧ください。</p></div></section>`;
}
function sectionForm(d, page) {
  const f = d.common.form, fd = d.form;
  const opt = (v, sel) => `<option value="${attr(v)}"${sel ? ' selected' : ''}>${esc(v)}</option>`;
  const hidden = ['lead_field', 'lp_variant', 'landing_url', 'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    .map((n) => `<input type="hidden" name="${n}" value="${n === 'lead_field' ? attr(d.field) : n === 'lp_variant' ? attr(page.variant) : ''}">`).join('');
  return `<section class="sec" id="form" aria-labelledby="form-h"><div class="in in--narrow"><h2 class="h2" id="form-h">${esc(d.offer.cta.replace(/を申し込む$/, 'のお申し込み'))}</h2><p class="lead">入力は約1分です。「必須」の項目だけでお申し込みいただけます。</p>
<form class="form" id="contact-form" action="/api/contact" method="post" novalidate data-kind="${attr(d.kind)}">
<div class="hp" aria-hidden="true"><label for="f-website">このフィールドは空のままにしてください<input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
<div class="field"><label for="f-company">会社名<span class="req">必須</span></label><input id="f-company" name="company" type="text" autocomplete="organization" required aria-describedby="e-company"><p class="ferr" id="e-company" hidden>会社名を入力してください</p></div>
<div class="field"><label for="f-name">お名前<span class="req">必須</span></label><input id="f-name" name="name" type="text" autocomplete="name" required aria-describedby="e-name"><p class="ferr" id="e-name" hidden>お名前を入力してください</p></div>
<div class="field"><label for="f-email">メールアドレス<span class="req">必須</span></label><input id="f-email" name="email" type="email" inputmode="email" autocomplete="email" required aria-describedby="e-email"><p class="ferr" id="e-email" hidden>メールアドレスの形式で入力してください（例：name@example.co.jp）</p></div>
<div class="field"><label for="f-field">${esc(f.field_label)}<span class="req">必須</span></label><select id="f-field" name="field" required>${f.field_options.map((v) => opt(v, v === fd.field_default)).join('')}</select></div>
<fieldset class="field field--radio"><legend>${esc(f.budget_label)}<span class="opt">任意</span></legend><div class="radios">${fd.budget_options.map((v, i) => `<label><input type="radio" name="budget" value="${attr(v)}"><span>${esc(v)}</span></label>`).join('')}</div></fieldset>
<div class="field"><label for="f-message">${esc(fd.message_label || f.message_label)}<span class="opt">任意</span></label><textarea id="f-message" name="message" rows="5" placeholder="${attr(fd.message_placeholder)}"></textarea></div>
${hidden}
<p class="form__status" id="form-status" role="alert" hidden></p>
<div class="form__submit"><button class="btn btn--primary btn--lg" type="submit" id="f-submit">${esc(d.offer.cta)}</button><p class="form__reply">${esc(d.common.reply)}</p></div>
<p class="form__privacy"><a href="${attr(f.privacy_link)}" target="_blank" rel="noopener">${esc(f.privacy_link_label)}</a>｜${esc(f.privacy_text)}</p>
<noscript><p class="note">JavaScriptが無効な環境ではフォームを送信できません。お手数ですが <a href="mailto:${attr(d.common.company.email)}">${esc(d.common.company.email)}</a> までメールでご連絡ください。</p></noscript>
</form>
<div class="done" id="form-done" role="status" aria-live="polite" tabindex="-1" hidden><span class="done__ic" aria-hidden="true">${ICON.check}</span><div><p class="done__t">${esc(f.done_title)}</p><p>${esc(fd.done_body)}</p><p class="note">${esc(f.done_note)}</p></div></div>
</div></section>`;
}

// ---------- ページ ----------
function renderPage(d, page, ctx) {
  const c = d.common;
  const site = c.site;
  const parentUrl = `${site}/${d.route}`;
  const pageUrl = page.variant ? `${parentUrl}/${page.variant}` : parentUrl;
  const h1 = ctx.resolve(page.h1);
  const title = page.title, desc = page.desc;
  const order = page.pricing_first
    ? [sectionPricing, sectionProblem, sectionSolution, sectionCases, sectionOffer, sectionReasons, sectionProcess, sectionFaq, sectionCompany, sectionForm]
    : [sectionProblem, sectionSolution, sectionPricing, sectionCases, sectionOffer, sectionReasons, sectionProcess, sectionFaq, sectionCompany, sectionForm];
  const offers = d.pricing.plans.map((p, i) => ({ '@type': 'Offer', name: p.name, price: String(Number(String(p.price).replace(/[^0-9]/g, '')) * 10000), priceCurrency: 'JPY', url: pageUrl + '#pricing', priceSpecification: { '@type': 'PriceSpecification', price: String(Number(String(p.price).replace(/[^0-9]/g, '')) * 10000), priceCurrency: 'JPY', valueAddedTaxIncluded: false } }));
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': site + '/#org', name: c.brand, legalName: c.company.name, url: site + '/', logo: site + '/assets/nortiq-mark.png', email: c.company.email, foundingDate: c.company.founding_date,
      address: { '@type': 'PostalAddress', addressCountry: 'JP', postalCode: c.company.postal, addressRegion: c.company.region, addressLocality: c.company.locality, streetAddress: c.company.street } },
    { '@type': 'WebPage', '@id': pageUrl, url: pageUrl, name: title, description: desc, inLanguage: 'ja', isPartOf: { '@id': site + '/#website' }, about: { '@id': parentUrl + '#service' } },
    { '@type': 'Service', '@id': parentUrl + '#service', name: d.eyebrow, serviceType: d.eyebrow, provider: { '@id': site + '/#org' }, areaServed: { '@type': 'Country', name: 'JP' }, url: parentUrl, offers },
  ] };
  const chips = d.offer.fv_chips.map((t) => `<li>${esc(t)}</li>`).join('');
  const head = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${parentUrl}">
<meta name="theme-color" content="#1E3A5F">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="/assets/nortiq-fav.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/nortiq-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(c.brand)}">
<meta property="og:locale" content="ja_JP">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${site}${d.og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(desc)}">
<meta name="twitter:image" content="${site}${d.og_image}">
${ctx.fontUrl ? `<link rel="preload" href="${ctx.fontUrl}" as="font" type="font/woff2" crossorigin>` : ''}
<style>${ctx.css}</style>
${ctx.analytics}
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body data-lp="${attr(d.kind)}" data-field="${attr(d.field)}" data-variant="${attr(page.variant || 'parent')}">
<a class="skip" href="#main">本文へ移動</a>
<header class="hd"><div class="in hd__in"><a class="brand" href="/" aria-label="Nortiq Labs トップページ">Nortiq Labs</a><nav class="hd__nav" aria-label="ページ内リンク">${c.nav.map((n) => `<a href="${attr(n.href)}">${esc(n.label)}</a>`).join('')}</nav><a class="btn btn--primary btn--sm hd__cta" href="#form">${esc(d.offer.cta)}</a></div></header>
<main id="main">
<section class="hero" aria-labelledby="h1"><div class="in hero__in"><div class="hero__copy">
<p class="eyebrow">${esc(d.eyebrow)}</p>
<h1 class="h1" id="h1">${h1}</h1>
<p class="hero__sub">${esc(page.sub)}</p>
<div class="hero__offer"><p class="hero__price"><span class="num">${esc(d.offer.price_line)}</span><small>${esc(d.offer.price_note)}</small></p><p class="hero__free"><span class="badge">無料</span><span>${esc(d.offer.name)}（${esc(d.offer.sub)}）</span></p></div>
<div class="hero__cta"><a class="btn btn--primary btn--lg" href="#form" id="hero-cta">${esc(page.cta)}${ICON.arrow}</a><p class="hero__reply">${esc(c.reply)}</p></div>
<ul class="chips" aria-label="特長">${chips}</ul>
</div>${heroVisual(d.field)}</div></section>
${order.map((fn) => fn(d, page)).join('\n')}
</main>
<footer class="ft"><div class="in"><p class="ft__brand">${esc(c.company.name)}</p><ul class="ft__links">${c.footer_links.map((l) => `<li><a href="${attr(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul><p class="ft__copy">© ${new Date().getFullYear()} ${esc(c.company.name)}</p></div></footer>
<div class="spbar" id="spbar"><a class="btn btn--primary" href="#form">${esc(d.offer.cta)}</a></div>
<script src="/assets/lp/qs/lp-qs.js?v=${ctx.ver}" defer></script>
</body>
</html>
`;
  return head;
}

function buildLpQs(opts) {
  const DIST = opts.dist || path.join(ROOT, 'dist');
  const analytics = opts.analytics || '';
  const common = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/lp/common.json'), 'utf8'));
  const P = loadPricing();
  const R = makeResolver(P);
  let css = fs.readFileSync(path.join(ROOT, 'assets/lp/qs/lp-qs.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').trim();
  const js = fs.readFileSync(path.join(ROOT, 'assets/lp/qs/lp-qs.js'));
  const ver = crypto.createHash('sha256').update(js).digest('hex').slice(0, 10);
  // 見出し・ボタン・価格だけ Noto Sans JP 700 の静的サブセット (約50KB) を自前配信する。本文は端末のフォント
  // (Android は Noto Sans、iOS は Hiragino) に任せる。可変フォント 1 本 (約290KB) を全文に使う案は、モバイルの Lighthouse で
  // TBT +200ms・LCP +0.7s だったので採らない (docs/lp-qs-report.md)。
  const fontFile = path.join(ROOT, 'assets/lp/qs/fonts/noto-sans-jp-700.woff2');
  let fontUrl = '';
  if (fs.existsSync(fontFile)) {
    const fv = crypto.createHash('sha256').update(fs.readFileSync(fontFile)).digest('hex').slice(0, 10);
    fontUrl = `/assets/lp/qs/fonts/noto-sans-jp-700.woff2?v=${fv}`;
    css = `@font-face{font-family:NortiqHead;font-style:normal;font-weight:700;font-display:swap;src:url(${fontUrl}) format('woff2')}` + css;
  }
  const ctx = { analytics, css, ver, fontUrl, resolve: R.resolve };
  const parentRoutes = [];
  const pages = [];
  for (const file of ['system', 'renewal']) {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/lp', file + '.json'), 'utf8'));
    const d = R.deep(raw); d.common = R.deep(common);
    const variants = [{ ...d.parent, variant: '' }, ...d.variants.map((v) => ({ ...v, variant: v.slug }))];
    for (const page of variants) {
      const html = renderPage(d, page, ctx);
      const rel = page.variant ? `${d.route}/${page.variant}` : d.route;
      const out = path.join(DIST, rel, 'index.html');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, html, 'utf8');
      // 検査: H1 が1つ、H1 に金額があれば料金データと一致
      const h1s = html.match(/<h1\b/g) || [];
      if (h1s.length !== 1) throw new Error(rel + ': h1 が ' + h1s.length + ' 個あります');
      const h1Text = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, '');
      const m = h1Text.match(/(\d+)万円/);
      if (m) {
        const allowed = [].concat(...Object.values(P).filter((s) => s && Array.isArray(s.plans)).map((s) => s.plans.map((p) => String(p.min))));
        if (!allowed.includes(m[1])) throw new Error(rel + ': H1 の金額 ' + m[1] + '万円 が NORTIQ_PRICING にありません');
      }
      pages.push({ route: rel, url: `${common.site}/${rel}`, variant: page.variant || '', field: d.field, keyword: page.keyword || '', adgroup: page.adgroup || '', h1: h1Text, title: page.title, bytes: Buffer.byteLength(html) });
    }
    parentRoutes.push(d.route);
  }
  return { parentRoutes, pages };
}

module.exports = { buildLpQs, loadPricing, makeResolver };

if (require.main === module) {
  const r = buildLpQs({ dist: path.join(ROOT, 'dist'), analytics: '' });
  for (const p of r.pages) console.log(p.route.padEnd(24), (p.bytes / 1024).toFixed(1) + 'KB', '|', p.h1);
}
