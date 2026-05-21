// ============================================================
// Nortiq Labs — App shell
// ============================================================

const ROUTES = {
  top:             { c: () => window.TopPage,             title: 'Nortiq Labs — 日本のDX、世界水準で巻き返す。' },
  web:             { c: () => window.WebPage,             title: 'Web制作 — Nortiq Labs' },
  chatbot:         { c: () => window.ChatbotPage,         title: 'AIチャットボット — Nortiq Labs' },
  dx:              { c: () => window.DXPage,              title: 'DX・ML — Nortiq Labs' },
  works:           { c: () => window.WorksPage,           title: '制作実績 — Nortiq Labs', argName: 'category', argVal: null },
  voice:           { c: () => window.VoicePage,           title: 'ご利用会社様の声 — Nortiq Labs' },
  support:         { c: () => window.SupportPage,         title: 'サポート — Nortiq Labs' },
  pricing:         { c: () => window.PricingPage,         title: '料金プラン — Nortiq Labs' },
  diagnosis:       { c: () => window.DiagnosisPage,       title: 'サイト無料診断 — Nortiq Labs' },
  'quick-diagnosis': { c: () => window.QuickDiagnosisPage, title: 'クイック診断 — Nortiq Labs' },
  subsidy:         { c: () => window.SubsidyPage,         title: 'IT導入補助金 — Nortiq Labs' },
  guidebook:       { c: () => window.GuidebookPage,       title: 'DXガイドブック — Nortiq Labs' },
  column:          { c: () => window.ColumnPage,          title: 'コラム — Nortiq Labs' },
  company:         { c: () => window.CompanyPage,         title: '会社概要 — Nortiq Labs' },
  staff:           { c: () => window.StaffPage,           title: 'チーム — Nortiq Labs' },
  sitemap:         { c: () => window.SitemapPage,         title: 'サイトマップ — Nortiq Labs' },
};

// Category-prefixed works pages
const WORKS_CATEGORIES = ['clinic','realty','build','hr','retail','infra','ai'];
WORKS_CATEGORIES.forEach(cat => {
  ROUTES['works-' + cat] = {
    c: () => window.WorksPage, title: '制作実績 — Nortiq Labs', argName: 'category', argVal: cat,
  };
});

// Generic pages — for any pageId not yet implemented
const GENERIC_IDS = [];
GENERIC_IDS.forEach(id => {
  ROUTES[id] = { c: () => window.GenericPage, title: id + ' — Nortiq Labs', argName: 'pageId', argVal: id };
});

// Product detail pages
ROUTES['product-vetonet'] = { c: () => window.ProductVetoNetPage, title: 'VetoNet — Nortiq Labs' };
ROUTES['product-wpchat']  = { c: () => window.ProductWPChatPage,  title: 'WP AIチャットボット — Nortiq Labs' };
ROUTES['product-tennis']  = { c: () => window.ProductTennisPage,  title: 'Tennis フォームチェック — Nortiq Labs' };

// Feature pages
ROUTES['feature-cms']       = { c: () => window.FeatureCMSPage,       title: 'CMS / 記事更新 — Nortiq Labs' };
ROUTES['feature-lpo']       = { c: () => window.FeatureLPOPage,       title: 'LP制作 / LPO — Nortiq Labs' };
ROUTES['feature-recruit']   = { c: () => window.FeatureRecruitPage,   title: '採用専門サイト — Nortiq Labs' };
ROUTES['feature-analytics'] = { c: () => window.FeatureAnalyticsPage, title: 'アクセス解析カスタム実装 — Nortiq Labs' };

// Works variant pages
['works-lp-corp', 'works-lp-recruit', 'works-lp-ec', 'works-video'].forEach(id => {
  ROUTES[id] = { c: () => window.WorksVariantPage, title: '制作実績 — Nortiq Labs', argName: 'pageId', argVal: id };
});

// Legal pages
['privacy', 'terms', 'privacy-handling'].forEach(id => {
  ROUTES[id] = { c: () => window.LegalPage, title: '法務 — Nortiq Labs', argName: 'pageId', argVal: id };
});

// News & Recruit
ROUTES['news']    = { c: () => window.NewsPage,    title: 'お知らせ — Nortiq Labs' };
ROUTES['recruit'] = { c: () => window.RecruitPage, title: '採用情報 — Nortiq Labs' };

// NORTIQLAB Site Diagnostic — landing page
ROUTES['diagnostic'] = { c: () => window.DiagnosticLPPage, title: 'NORTIQLAB サイト診断 — URLを入れるだけでSEO・AI可視性まで完全分析 [無料]' };

// Industry solutions
['clinic', 'realty', 'build', 'hr', 'retail'].forEach(k => {
  ROUTES['solution-' + k] = { c: () => window.SolutionPage, title: '業種別ソリューション — Nortiq Labs', argName: 'pageId', argVal: 'solution-' + k };
});

// Detail templates (single work / article example pages)
ROUTES['work-detail']    = { c: () => window.WorkDetailPage,    title: '実績詳細 — Nortiq Labs' };

// Blog articles — one route per slug (content from window.NORTIQ_ARTICLES)
Object.keys((typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {}).forEach((slug) => {
  const a = window.NORTIQ_ARTICLES[slug];
  ROUTES['article-' + slug] = {
    c: () => window.ArticleDetailPage,
    title: `${a.title} — Nortiq Labs`,
    argName: 'slug', argVal: slug,
  };
});

// URL <-> route id helpers
function pathFor(id) {
  return id === 'top' ? '/' : '/' + id;
}
function idFromPath(path) {
  const stripped = (path || '').replace(/^\//, '');
  return stripped === '' ? 'top' : stripped;
}

// Per-route SEO metadata. Since this SPA serves one static index.html for every
// route, canonical + description must be rewritten client-side on navigation so
// each page gets its own (Google reads the rendered DOM). Falls back to default.
const NORTIQ_SITE = 'https://nortiqlab.com';
const DEFAULT_DESC = '米国の技術水準を、日本の中小企業の武器に。Web制作・AIチャットボット・DX/ML実装まで、50社以上の支援実績を持つ技術チームが段階的に伴走するDXパートナーです。';
const SEO_DESC = {
  top: DEFAULT_DESC,
  web: 'オリジナルデザイン + AI運用付きWeb制作。50社の制作実績を持つ技術チームが、契約率を高めるコーポレート・LP・ブランドサイトを設計から運用まで一貫で支援します。',
  chatbot: 'WordPressのブログ更新をAIで自動化するチャットボット導入支援。50社の運用実績で、SEO強化と問い合わせ増加を両立します。',
  dx: '機械学習・データ分析・業務自動化で経営判断を加速するDX実装支援。米国大学発の技術チームが中小企業のDXを段階的に伴走します。',
  works: 'Nortiq Labsの制作実績一覧。クリニック・不動産・組合・歯科・美容外来まで、50社以上のWeb制作とDX支援事例を掲載。',
  voice: 'Nortiq Labsをご利用いただいた企業様の声。地域密着クリニックから不動産投資ブランドまで、長くご支援している顧客の評価をご紹介。',
  pricing: '料金プラン。Web制作30万円〜、AIチャットボット・DX実装まで、段階的に始められる明朗な料金体系をご案内します。',
  support: '公開後も伴走するサポート体制。営業日24時間以内のご返信で、Web・AI・DXの運用と改善を継続的にご支援します。',
  diagnostic: 'URLを入れるだけで、サイトのテクニカルSEO・AI可視性・競合比較まで無料診断。NORTIQLABの専門家が改善提案までお届けします。',
  diagnosis: 'サイト無料診断。Nortiq独自のチェックリストで、現状のWeb課題を可視化し、改善の優先順位をご提案します。',
  subsidy: 'IT導入補助金2026の申請サポート。最大450万円。Web・AI・DX投資の補助金活用を一気通貫でご支援します。',
  guidebook: '中小企業のためのDXガイドブック（無料DL）。Web → AIチャットボット → DXまで、段階的な進め方を一冊にまとめました。',
  column: 'Nortiq Labsのコラム・技術ブログ。AI・SEO・DX・業種別の実務知見を、調査データに基づいてお届けします。',
  company: 'Nortiq Labs 会社概要。米国のAI研究背景を持つエンジニアと、日本の経営課題に向き合うメンバーによる技術チームです。',
  staff: 'Nortiq Labsのチーム紹介。Founder / Computer Scientist / Data Scientist の三職能が、お客様1社にチーム編成で並走します。',
  recruit: 'Nortiq Labsの採用情報。米国の技術水準を、日本の中小企業の武器に。技術と現場の両輪で挑むメンバーを募集しています。',
  'product-vetonet': 'VetoNet — AI agent security の研究開発プロダクト。Nortiq Labs が取り組む分散システム・セキュリティの技術をご紹介します。',
  'product-wpchat': 'WordPress AIチャットボット / AI投稿アシスタント。ブログ更新と問い合わせ対応を自動化し、運用負担を減らします。',
  'product-tennis': 'テニスフォーム分析 SaaS。動画から姿勢・スイングをAIで解析する、Nortiq Labs の自社プロダクトです。',
  'feature-lpo': 'LP制作 / LPO 支援。コンバージョンを最大化するランディングページの設計・改善を、データに基づいて行います。',
  'feature-recruit': '採用専門サイトの制作。コンセプト設計・社員撮影・エントリー導線まで、応募率を高める採用ブランドサイトを構築します。',
  'feature-analytics': 'アクセス解析のカスタム実装。計測設計からダッシュボード構築まで、意思決定に効くデータ基盤をご提供します。',
};
function descFor(route) {
  if (route && route.indexOf('article-') === 0) {
    const slug = route.slice('article-'.length);
    const a = ((typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {})[slug];
    return a ? `${a.title} ｜ Nortiq Labs の技術ブログ（${a.category}）。` : DEFAULT_DESC;
  }
  return SEO_DESC[route] || DEFAULT_DESC;
}
function setMetaContent(selector, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute('content', value);
}

// Per-route structured data (injected into <head> on navigation; Google reads
// the rendered DOM). BreadcrumbList on every subpage, Service on the service
// pages, and Review/AggregateRating on the testimonials page.
const NORTIQ_ORG_ID = NORTIQ_SITE + '/#org';
const SERVICE_LD = {
  web: { name: 'Web制作', types: ['コーポレートサイト制作', 'LP制作', 'ブランドサイト制作'] },
  chatbot: { name: 'AIチャットボット導入', types: ['AIチャットボット', 'WordPress AI投稿アシスタント', '問い合わせ自動化'] },
  dx: { name: 'DX・ML実装', types: ['機械学習', 'データ分析', '業務自動化'] },
};
function routeLd(route) {
  const url = NORTIQ_SITE + pathFor(route);
  const meta = ROUTES[route] || ROUTES.top;
  const pageName = (meta.title || '').replace(/\s*[—｜|].*$/, '').trim() || 'Nortiq Labs';
  const out = [];
  if (route !== 'top') {
    out.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'トップ', item: NORTIQ_SITE + '/' },
        { '@type': 'ListItem', position: 2, name: pageName, item: url },
      ],
    });
  }
  if (SERVICE_LD[route]) {
    const s = SERVICE_LD[route];
    out.push({
      '@context': 'https://schema.org', '@type': 'Service',
      name: s.name, description: descFor(route), url, serviceType: s.types, areaServed: 'JP',
      provider: { '@type': 'Organization', '@id': NORTIQ_ORG_ID, name: 'Nortiq Labs', url: NORTIQ_SITE + '/' },
    });
  }
  if (route === 'voice') {
    out.push({
      '@context': 'https://schema.org', '@type': 'Organization', '@id': NORTIQ_ORG_ID,
      name: 'Nortiq Labs', url: NORTIQ_SITE + '/',
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', bestRating: '5', ratingCount: '50' },
      review: [
        { '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, author: { '@type': 'Person', name: 'A.K.（代表取締役・院長）' }, reviewBody: 'Web制作からの付き合いで、半年後にAIチャットボットも導入。ブログ更新の負担がなくなり、SEO流入が1.8倍になりました。「Webのプロが横にいる」感覚を、初めて持てた気がします。' },
        { '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' }, author: { '@type': 'Person', name: 'T.M.（経営企画）' }, reviewBody: '他社は「AIできます」止まりだが、Nortiqは実装の中身まで説明してくれて納得感があった。判断材料がきちんと揃う、貴重なパートナーです。' },
      ],
    });
  }
  return out;
}

function App() {
  const [route, setRoute] = React.useState(() => {
    const id = idFromPath(window.location.pathname);
    return ROUTES[id] ? id : 'top';
  });
  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactCategory, setContactCategory] = React.useState('');

  const defaults = /*EDITMODE-BEGIN*/{
    "accentHue": 354,
    "showSideTab": false,
    "showSPBottom": true
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks(defaults) : [defaults, () => {}];

  React.useEffect(() => {
    if (typeof tweaks.accentHue === 'number') {
      const h = tweaks.accentHue;
      document.documentElement.style.setProperty('--accent', `hsl(${h}, 92%, 45%)`);
      document.documentElement.style.setProperty('--accent-hi', `hsl(${h}, 95%, 52%)`);
      document.documentElement.style.setProperty('--accent-soft', `hsl(${h}, 90%, 95%)`);
    }
  }, [tweaks.accentHue]);

  React.useEffect(() => {
    const meta = ROUTES[route] || ROUTES.top;
    document.title = meta.title;
    // Per-route canonical + description (this SPA shares one static index.html).
    const url = NORTIQ_SITE + pathFor(route);
    const desc = descFor(route);
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', url);
    setMetaContent('meta[name="description"]', desc);
    setMetaContent('meta[property="og:url"]', url);
    setMetaContent('meta[property="og:title"]', meta.title);
    setMetaContent('meta[property="og:description"]', desc);
    setMetaContent('meta[name="twitter:title"]', meta.title);
    setMetaContent('meta[name="twitter:description"]', desc);
    // Per-route structured data (Service / Review / BreadcrumbList).
    const oldLd = document.getElementById('route-ld');
    if (oldLd) oldLd.remove();
    const items = routeLd(route);
    if (items.length) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'route-ld';
      s.textContent = JSON.stringify(items.length === 1 ? items[0] : items);
      document.head.appendChild(s);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route]);

  // Global fadein observer — re-attached every route change after content mounts
  React.useEffect(() => {
    const t = setTimeout(() => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const delay = parseInt(e.target.dataset.delay) || 0;
            setTimeout(() => e.target.classList.add('is-in'), delay);
            observer.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
      document.querySelectorAll('.fadein:not(.is-in), .fadein-l:not(.is-in), .fadein-r:not(.is-in)').forEach(el => observer.observe(el));
      window.__fadeObserver = observer;
    }, 40);
    return () => clearTimeout(t);
  }, [route]);

  const handleContact = (cat = '') => {
    setContactCategory(cat || '');
    setContactOpen(true);
  };

  const handleNavigate = (id) => {
    if (ROUTES[id]) {
      setRoute(id);
      window.history.pushState({ id }, '', pathFor(id));
    } else {
      handleContact();
    }
  };

  // Sync route with browser back/forward navigation
  React.useEffect(() => {
    const onPopState = () => {
      const id = idFromPath(window.location.pathname);
      setRoute(ROUTES[id] ? id : 'top');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const routeMeta = ROUTES[route] || ROUTES.top;
  const PageComp = routeMeta.c();
  const extraProps = routeMeta.argName ? { [routeMeta.argName]: routeMeta.argVal } : {};

  // Sync mega menu "current" key (treat works-* as 'works', article-* as contents, etc.)
  const currentKey = route.startsWith('works-') ? 'works'
    : route.startsWith('article-') ? 'contents'
    : (route === 'quick-diagnosis' ? 'diagnosis'
    : route);

  return (
    <>
      <Nav
        current={currentKey}
        onNavigate={handleNavigate}
        onContact={() => handleContact()}
      />

      <div key={route}>
        {PageComp ? <PageComp onNavigate={handleNavigate} onContact={handleContact} {...extraProps} /> : null}
      </div>

      <Footer onNavigate={handleNavigate} onContact={() => handleContact()} />

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        defaultCategory={contactCategory}
      />

      {tweaks.showSideTab !== false && <SideTabForm/>}
      {tweaks.showSPBottom !== false && <SPBottomNav onNavigate={handleNavigate} onContact={() => handleContact()} />}
      <StickyCTA onContact={() => handleContact()} threshold={900}/>

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection label="Accent" />
          <window.TweakSlider
            label="アクセント色相"
            value={tweaks.accentHue}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => setTweak('accentHue', v)}
          />
          <window.TweakSection label="Layout" />
          <window.TweakToggle
            label="サイドタブ表示"
            value={tweaks.showSideTab}
            onChange={(v) => setTweak('showSideTab', v)}
          />
          <window.TweakToggle
            label="SP下部ナビ表示"
            value={tweaks.showSPBottom}
            onChange={(v) => setTweak('showSPBottom', v)}
          />
        </window.TweaksPanel>
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<App/>);
