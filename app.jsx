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
  seminar:         { c: () => window.SeminarPage,         title: 'セミナー — Nortiq Labs' },
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

// Industry solutions
['clinic', 'realty', 'build', 'hr', 'retail'].forEach(k => {
  ROUTES['solution-' + k] = { c: () => window.SolutionPage, title: '業種別ソリューション — Nortiq Labs', argName: 'pageId', argVal: 'solution-' + k };
});

// Detail templates (single work / article / seminar example pages)
ROUTES['work-detail']    = { c: () => window.WorkDetailPage,    title: '実績詳細 — Nortiq Labs' };
ROUTES['article-detail'] = { c: () => window.ArticleDetailPage, title: '記事詳細 — Nortiq Labs' };
ROUTES['seminar-detail'] = { c: () => window.SeminarDetailPage, title: 'セミナー詳細 — Nortiq Labs' };

function App() {
  const [route, setRoute] = React.useState('top');
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
    if (ROUTES[id]) setRoute(id);
    else handleContact();
  };

  const routeMeta = ROUTES[route] || ROUTES.top;
  const PageComp = routeMeta.c();
  const extraProps = routeMeta.argName ? { [routeMeta.argName]: routeMeta.argVal } : {};

  // Sync mega menu "current" key (treat works-* as 'works', etc.)
  const currentKey = route.startsWith('works-') ? 'works'
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
