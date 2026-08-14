// ============================================================
// Nortiq Labs — Shared components
// Aligned to Nortiq IA spec: white base, Noto Sans JP,
// red #e60012 accent, mega menu, side tab form, SP bottom nav,
// fadein-on-scroll, 5-color hashtags, big 12-field form
// ============================================================

// Full IA
const NAV_MEGA = [
  { id: 'top', label: 'トップ', simple: true },
  {
    id: 'features',
    label: '機能',
    columns: [
      { heading: 'サービス別 機能一覧', links: [
        { id: 'web',     label: 'Web制作 機能一覧' },
        { id: 'chatbot', label: 'AIチャットボット 機能一覧' },
        { id: 'dx',      label: 'DX・ML 機能一覧' },
      ]},
      { heading: '技術領域', links: [
        { id: 'feature-lpo',       label: 'LP制作 / LPO' },
        { id: 'feature-recruit',   label: '採用専門サイト' },
        { id: 'feature-analytics', label: 'アクセス解析カスタム実装' },
        { id: 'feature-cms',       label: 'CMS / 記事更新システム' },
      ]},
      { heading: '自社プロダクト', links: [
        { id: 'product-vetonet',  label: 'VetoNet (AI Security)' },
        { id: 'product-wpchat',   label: 'ブログボット（AI投稿アシスタント）' },
        { id: 'product-tennis',   label: 'Tennis フォームチェック' },
      ]},
    ],
  },
  {
    id: 'works',
    label: '制作実績',
    columns: [
      { heading: '業種から探す', links: [
        { id: 'works-clinic',  label: 'クリニック・医療' },
        { id: 'works-realty',  label: '不動産' },
        { id: 'works-build',   label: '建築・工務店' },
        { id: 'works-hr',      label: '人材' },
        { id: 'works-retail',  label: '小売 / EC' },
        { id: 'works-infra',   label: 'インフラ・製造' },
        { id: 'works-ai',      label: 'AIスタートアップ' },
      ]},
      { heading: '強化LP別', links: [
        { id: 'works-lp-corp',    label: 'コーポレートサイト' },
        { id: 'works-lp-recruit', label: '採用LP' },
        { id: 'works-lp-ec',      label: 'EC連動LP' },
      ]},
      { heading: '実績まとめ', links: [
        { id: 'works',         label: '全実績一覧' },
      ]},
    ],
  },
  {
    id: 'solution',
    label: '業種ソリューション',
    columns: [
      { heading: '業種別パッケージ', links: [
        { id: 'solution-clinic', label: 'クリニック・医療 DXパッケージ' },
        { id: 'solution-realty', label: '不動産 集客×管理パッケージ' },
        { id: 'solution-build',  label: '建築 ブランド×案件管理' },
        { id: 'solution-hr',     label: '人材 マッチング×集客' },
        { id: 'solution-retail', label: '小売・EC OMOパッケージ' },
      ]},
    ],
  },
  { id: 'voice',     label: 'ご利用会社様の声' },
  { id: 'support',   label: 'サポート' },
  { id: 'pricing',   label: '料金プラン' },
  {
    id: 'contents',
    label: 'コンテンツ',
    columns: [
      { heading: 'メディア', links: [
        { id: 'column',  label: 'コラム / 技術ブログ' },
        { id: 'news',    label: 'お知らせ' },
        { id: 'guidebook', label: 'サービス紹介資料' },
        { id: 'subsidy',   label: '補助金活用相談' },
      ]},
    ],
  },
  { id: 'diagnostic', label: '無料診断' },
];

const PREFECTURES = [
  '北海道','青森県','栃木県','群馬県','茨城県','埼玉県','千葉県','東京都',
  '神奈川県','新潟県','長野県','静岡県','愛知県','岐阜県','三重県','京都府',
  '大阪府','兵庫県','岡山県','広島県','福岡県','宮城県','岩手県','山形県',
];

// -------------------- Analytics (GA4 + Google Ads) --------------------
// Fail-safe wrapper around gtag. No-ops when gtag.js isn't loaded (local dev,
// or before IDs are configured in build.js), so analytics can never break the
// UI. `convKey` looks up a Google Ads send_to target from window.NORTIQ_CONV
// (defined by the gtag snippet in <head>).
function nqTrack(eventName, params, convKey) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params || {});
    const target = convKey && window.NORTIQ_CONV ? window.NORTIQ_CONV[convKey] : null;
    if (target) window.gtag('event', 'conversion', { send_to: target });
  } catch (_) { /* analytics must never throw into the UI */ }
}
if (typeof window !== 'undefined') window.nqTrack = nqTrack;

// This is a single-page app: after the first load, navigation is pushState, so
// gtag.js never sees a document load and sends no further page_view. Without
// this, GA4 would only ever record the page a session landed on. The initial
// page_view still comes from gtag('config') in <head> — App fires this one only
// for route changes, so each view is counted exactly once.
function nqPageView(params) {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    window.gtag('event', 'page_view', params || {});
  } catch (_) { /* analytics must never throw into the UI */ }
}
if (typeof window !== 'undefined') window.nqPageView = nqPageView;

// -------------------- Contact delivery --------------------
// All inquiry forms POST to the serverless function, which
// sends a real email via Resend (no mail-client dependency). Throws on failure
// so callers can show an error state.
async function sendInquiry(form, kind = 'main') {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form, kind }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  // Lead delivered → GA4 generate_lead (the single key event Google Ads
  // optimizes on) + Google Ads conversion. lead_type='contact' covers every
  // inquiry-form placement; form_kind keeps the placement for GA4 analysis.
  nqTrack('generate_lead', { lead_type: 'contact', currency: 'JPY', form_kind: kind }, 'contact');
  return res.json().catch(() => ({ ok: true }));
}

// -------------------- Icons --------------------
function Icon({ name, size = 16, stroke = 1.4 }) {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'arrow-right':    return (<svg viewBox="0 0 24 24" {...s} className="arrow"><path d="M5 12h14M13 5l7 7-7 7"/></svg>);
    case 'arrow-down':     return (<svg viewBox="0 0 24 24" {...s}><path d="M6 9l6 6 6-6"/></svg>);
    case 'check':          return (<svg viewBox="0 0 24 24" {...s}><path d="M5 12l5 5L20 7"/></svg>);
    case 'close':          return (<svg viewBox="0 0 24 24" {...s}><path d="M6 6l12 12M6 18L18 6"/></svg>);
    case 'phone':          return (<svg viewBox="0 0 24 24" {...s}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>);
    case 'mail':           return (<svg viewBox="0 0 24 24" {...s}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>);
    case 'doc':            return (<svg viewBox="0 0 24 24" {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>);
    case 'home':           return (<svg viewBox="0 0 24 24" {...s}><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>);
    case 'grid':           return (<svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>);
    case 'yen':            return (<svg viewBox="0 0 24 24" {...s}><path d="M4 4l8 11 8-11M7 13h10M7 17h10"/></svg>);
    case 'menu':           return (<svg viewBox="0 0 24 24" {...s}><path d="M4 7h16M4 12h16M4 17h16"/></svg>);
    case 'search':         return (<svg viewBox="0 0 24 24" {...s}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>);
    default: return null;
  }
}

// -------------------- Button --------------------
function Button({ variant = 'primary', size = 'md', children, onClick, arrow = false, type, ...rest }) {
  const cls = ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg'].filter(Boolean).join(' ');
  return (
    <button className={cls} onClick={onClick} type={type || 'button'} {...rest}>
      {children}
      {arrow && <Icon name="arrow-right" size={14}/>}
    </button>
  );
}

// -------------------- useFadeIn hook --------------------
function useFadeIn() {
  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const delay = parseInt(e.target.dataset.delay) || 0;
          setTimeout(() => e.target.classList.add('is-in'), delay);
          observer.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    document.querySelectorAll('.fadein, .fadein-l, .fadein-r').forEach(el => {
      if (!el.classList.contains('is-in')) observer.observe(el);
    });
    return () => observer.disconnect();
  });
}

// -------------------- Mega Menu Nav --------------------
function Nav({ current, onNavigate, onContact, onSideForm }) {
  const [openMega, setOpenMega] = React.useState(null);
  const [drawer, setDrawer] = React.useState(false);
  const [expandedSection, setExpandedSection] = React.useState(null);
  const timer = React.useRef();

  const enter = (id) => {
    clearTimeout(timer.current);
    setOpenMega(id);
  };
  const leave = () => {
    timer.current = setTimeout(() => setOpenMega(null), 120);
  };

  React.useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawer]);

  const navTo = (id) => {
    onNavigate(id);
    setDrawer(false);
    setOpenMega(null);
  };

  return (
    <header className="nav" role="banner">
      <div className="nav-inner">
        <a className="nav-logo" {...navProps('top', navTo)} style={{ cursor: 'pointer' }}>
          <span className="nav-logo-mark"></span>
          <span className="wordmark">
            <span className="wordmark-main">NORTIQ</span>
            <span className="wordmark-sub">LABS</span>
          </span>
        </a>

        <nav className="nav-links" aria-label="メインナビゲーション">
          {NAV_MEGA.map(item => {
            const hasMega = !!item.columns;
            return (
              <div
                key={item.id}
                className="nav-link-wrap"
                onMouseEnter={() => hasMega && enter(item.id)}
                onMouseLeave={() => hasMega && leave()}
              >
                <a
                  className="nav-link"
                  aria-current={current === item.id ? 'page' : undefined}
                  aria-expanded={openMega === item.id ? 'true' : undefined}
                  {...(hasMega ? {} : navProps(item.id, onNavigate))}
                >
                  {item.label}
                  {hasMega && <Icon name="arrow-down" size={11}/>}
                </a>
                {hasMega && openMega === item.id && (
                  <div className="megamenu" onMouseEnter={() => enter(item.id)} onMouseLeave={leave}>
                    <div className="megamenu-inner">
                      {item.columns.map((col, ci) => (
                        <div key={ci} className="megamenu-col">
                          <h4>{col.heading}</h4>
                          <ul>
                            {col.links.map(lk => (
                              <li key={lk.id}>
                                <a {...navProps(lk.id, navTo)}>
                                  {lk.label}
                                  <Icon name="arrow-right" size={11}/>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="nav-cta-wrap">
          <Button variant="primary" size="sm" onClick={onContact}>
            <Icon name="mail" size={13}/>メールでお問合せ
          </Button>
          <button
            className={`hamburger${drawer ? ' open' : ''}`}
            aria-label="メニューを開く"
            aria-expanded={drawer}
            onClick={() => setDrawer(!drawer)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`nav-drawer${drawer ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && setDrawer(false)}>
        <div className="nav-drawer-panel">
          <div className="nav-drawer-head">
            <span className="nav-logo" style={{ fontSize: 18 }}>
              <span className="nav-logo-mark" aria-hidden="true"></span>
              <span className="wordmark">
                <span className="wordmark-main">NORTIQ</span>
                <span className="wordmark-sub">LABS</span>
              </span>
            </span>
            <button className="drawer-close" onClick={() => setDrawer(false)} aria-label="閉じる">
              <Icon name="close" size={20}/>
            </button>
          </div>
          <nav className="nav-drawer-body">
            {NAV_MEGA.map(item => {
              const hasSubs = !!item.columns;
              const exp = expandedSection === item.id;
              if (!hasSubs) {
                return (
                  <a key={item.id} className="drawer-item" {...navProps(item.id, navTo)}>
                    <span>{item.label}</span>
                    <Icon name="arrow-right" size={14}/>
                  </a>
                );
              }
              return (
                <div key={item.id} className={`drawer-group${exp ? ' open' : ''}`}>
                  <button className="drawer-item drawer-group-head" onClick={() => setExpandedSection(exp ? null : item.id)}>
                    <span>{item.label}</span>
                    <Icon name="arrow-down" size={14}/>
                  </button>
                  <div className="drawer-group-body">
                    {item.columns.map((col, ci) => (
                      <div key={ci} className="drawer-subgroup">
                        <h5>{col.heading}</h5>
                        {col.links.map(lk => (
                          <a key={lk.id} className="drawer-sub-item" {...navProps(lk.id, navTo)}>
                            <span>{lk.label}</span>
                            <Icon name="arrow-right" size={12}/>
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="nav-drawer-foot">
            <Button variant="primary" size="lg" onClick={() => { onContact(); setDrawer(false); }} style={{ width: '100%' }}>
              <Icon name="mail" size={14}/>資料請求・お問い合わせ
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

// -------------------- Picture (WebP + raster fallback) --------------------
// Serves an optimized .webp (generated at build time) with the original PNG/JPEG
// as fallback. `picture { display: contents }` keeps layout identical to a bare img.
function Picture({ src, alt = '', className, loading, style }) {
  const webp = typeof src === 'string' && /\.(png|jpe?g)$/i.test(src)
    ? src.replace(/\.(png|jpe?g)$/i, '.webp') : null;
  const img = <img src={src} alt={alt} className={className} loading={loading} style={style}/>;
  return webp ? (<picture><source srcSet={webp} type="image/webp"/>{img}</picture>) : img;
}

// -------------------- Placeholder image --------------------
function Placeholder({ label = "Image", caption, aspect = "16/9", height, children, src, fit = false, alt }) {
  const style = {
    aspectRatio: height ? undefined : aspect,
    height: height || undefined,
    width: '100%',
  };
  if (src) {
    return (
      <div className={`ph ph-image${fit ? ' ph-fit' : ''}`} style={style}>
        <Picture src={src} alt={alt !== undefined ? alt : (label || '')}/>
        {label && <span className="ph-label" style={{ background: 'rgba(255,255,255,0.92)' }}>{label}</span>}
        {caption && <div className="ph-caption" style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{caption}</div>}
      </div>
    );
  }
  return (
    <div className="ph" style={style}>
      <span className="ph-label">{label}</span>
      <div className="ph-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <circle cx="9" cy="11" r="1.5"/>
          <path d="M3 16l5-5 5 5 3-3 5 5"/>
        </svg>
      </div>
      {caption && <div className="ph-caption">{caption}</div>}
      {children}
    </div>
  );
}

// -------------------- FAQ --------------------
function FAQ({ items }) {
  const [open, setOpen] = React.useState(0);
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className={`faq-item${open === i ? ' open' : ''}`}>
          <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{it.q}</span>
            <span className="faq-icon"></span>
          </button>
          <div className="faq-a">
            <div className="faq-a-inner">{it.a}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// -------------------- Footer (5-column rich) --------------------
function Footer({ onNavigate, onContact }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="nav-logo" style={{ marginBottom: 18 }}>
              <span className="nav-logo-mark"></span>
              <span className="wordmark">
                <span className="wordmark-main">NORTIQ</span>
                <span className="wordmark-sub">LABS</span>
              </span>
            </div>
            <p className="body" style={{ fontSize: 13, maxWidth: 320, marginBottom: 24 }}>
              日本のDX、世界水準で巻き返す。<br/>
              Web制作からAI・DX実装までの技術チーム。
            </p>
            <Button variant="primary" size="sm" onClick={onContact}>
              <Icon name="mail" size={13}/>資料請求はこちら
            </Button>
          </div>

          <div className="footer-col">
            <h4>制作実績</h4>
            <ul>
              <li><a {...navProps('works', onNavigate)}>全実績一覧</a></li>
              <li><a {...navProps('works-clinic', onNavigate)}>クリニック・医療</a></li>
              <li><a {...navProps('works-realty', onNavigate)}>不動産</a></li>
              <li><a {...navProps('works-build', onNavigate)}>建築・工務店</a></li>
              <li><a {...navProps('works-hr', onNavigate)}>人材</a></li>
              <li><a {...navProps('works-retail', onNavigate)}>小売 / EC</a></li>
              <li><a {...navProps('works-infra', onNavigate)}>インフラ・製造</a></li>
              <li><a {...navProps('works-ai', onNavigate)}>AIスタートアップ</a></li>
              <li><a {...navProps('works-lp-corp', onNavigate)}>コーポレートLP</a></li>
              <li><a {...navProps('works-lp-recruit', onNavigate)}>採用LP</a></li>
              <li><a {...navProps('works-lp-ec', onNavigate)}>EC連動LP</a></li>
              <li><a {...navProps('works-video', onNavigate)}>動画制作事例</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>機能・サービス</h4>
            <ul>
              <li><a {...navProps('web', onNavigate)}>Web制作 機能一覧</a></li>
              <li><a {...navProps('chatbot', onNavigate)}>AIチャットボット 機能一覧</a></li>
              <li><a {...navProps('dx', onNavigate)}>DX・ML 機能一覧</a></li>
              <li><a {...navProps('feature-lpo', onNavigate)}>LP制作 / LPO</a></li>
              <li><a {...navProps('feature-recruit', onNavigate)}>採用専門サイト</a></li>
              <li><a {...navProps('feature-analytics', onNavigate)}>アクセス解析</a></li>
            </ul>
            <h4 style={{ marginTop: 28 }}>自社プロダクト</h4>
            <ul>
              <li><a {...navProps('product-vetonet', onNavigate)}>VetoNet</a></li>
              <li><a {...navProps('product-wpchat', onNavigate)}>ブログボット（AI投稿アシスタント）</a></li>
              <li><a {...navProps('product-tennis', onNavigate)}>Tennis フォームチェック</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>サポート・コンサル</h4>
            <ul>
              <li><a {...navProps('support', onNavigate)}>運用サポート</a></li>
              <li><a {...navProps('voice', onNavigate)}>ご利用会社様の声</a></li>
              <li><a {...navProps('diagnostic', onNavigate)}>サイト無料診断 (URL入力)</a></li>
              <li><a {...navProps('column', onNavigate)}>技術ブログ / コラム</a></li>
              <li><a {...navProps('news', onNavigate)}>お知らせ</a></li>
              <li><a {...navProps('subsidy', onNavigate)}>補助金活用相談</a></li>
              <li><a {...navProps('guidebook', onNavigate)}>サービス紹介資料</a></li>
            </ul>
            <h4 style={{ marginTop: 28 }}>業種別ソリューション</h4>
            <ul>
              <li><a {...navProps('solution-clinic', onNavigate)}>クリニック・医療</a></li>
              <li><a {...navProps('solution-realty', onNavigate)}>不動産</a></li>
              <li><a {...navProps('solution-build', onNavigate)}>建築・工務店</a></li>
              <li><a {...navProps('solution-hr', onNavigate)}>人材</a></li>
              <li><a {...navProps('solution-retail', onNavigate)}>小売 / EC</a></li>
            </ul>
            <h4 style={{ marginTop: 28 }}>会社</h4>
            <ul>
              <li><a {...navProps('company', onNavigate)}>会社概要</a></li>
              <li><a {...navProps('staff', onNavigate)}>チーム / スタッフ</a></li>
              <li><a {...navProps('recruit', onNavigate)}>採用情報</a></li>
              <li><a {...navProps('pricing', onNavigate)}>料金プラン</a></li>
              <li><a {...navProps('sitemap', onNavigate)}>サイトマップ</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Nortiq Labs Inc. All rights reserved.</span>
          <div className="row" style={{ gap: 24 }}>
            <a {...navProps('privacy', onNavigate)} style={{ color: 'var(--text-3)' }}>プライバシーポリシー</a>
            <a {...navProps('terms', onNavigate)} style={{ color: 'var(--text-3)' }}>利用規約</a>
            <a {...navProps('privacy-handling', onNavigate)} style={{ color: 'var(--text-3)' }}>個人情報の取扱い</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// -------------------- Contact Modal (big 12-field) --------------------
const CATEGORY_OPTIONS = ["Web制作", "AIチャットボット", "DX・ML", "業務自動化", "LP制作", "採用サイト"];
const INQ_TYPE_OPTIONS = ["新規HP制作", "HPリニューアル", "AIチャットボット導入", "DX・ML 実装", "業務自動化", "リスティング広告", "コンサルティング"];
const REASON_OPTIONS = ["HPが無い", "問い合わせを増やしたい", "サービス資料がほしい", "無料診断", "デザインを改善したい", "SEOを上げたい", "AI活用したい", "業務効率化したい", "補助金活用を相談したい"];
const SOURCE_OPTIONS = ["Google検索", "Yahoo検索", "AIチャット (ChatGPT/Claude/Gemini等)", "ご紹介", "メール", "DMチラシ", "SNS (X/LinkedIn)", "以前から知っていた", "その他"];

function ContactModal({ open, onClose, defaultCategory = '' }) {
  const initialForm = {
    company: '', name: '', email: '', phone: '', address: '',
    categories: defaultCategory ? [defaultCategory] : [],
    inqTypes: [], reasons: [],
    source: '', station: '', siteUrl: '', message: '',
    agree: false,
  };
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [stage, setStage] = React.useState('form');

  React.useEffect(() => {
    if (open) {
      setStage('form');
      setErrors({});
      setForm(f => ({ ...initialForm, categories: defaultCategory ? [defaultCategory] : [] }));
    }
  }, [open, defaultCategory]);

  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const validate = () => {
    const e = {};
    if (!form.company.trim()) e.company = '貴社名を入力してください';
    if (!form.name.trim()) e.name = 'ご担当者名を入力してください';
    if (!form.email.trim()) e.email = 'メールアドレスを入力してください';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'メールアドレスの形式が正しくありません';
    if (!form.phone.trim()) e.phone = '電話番号を入力してください';
    if (form.categories.length === 0) e.categories = 'カテゴリーを選択してください';
    if (form.inqTypes.length === 0) e.inqTypes = 'お問い合わせ内容を選択してください';
    if (!form.agree) e.agree = '個人情報取り扱いに同意してください';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStage('sending');
    try {
      await sendInquiry(form, 'modal');
      setStage('done');
    } catch (err) {
      setStage('error');
    }
  };

  const onChange = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const toggleMulti = (key, val) => {
    const list = form[key];
    const next = list.includes(val) ? list.filter(x => x !== val) : [...list, val];
    setForm({ ...form, [key]: next });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  return (
    <div className={`modal-backdrop${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="閉じる"><Icon name="close" size={16}/></button>

        {stage === 'done' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--accent-soft)',
              color: 'var(--accent)', display: 'grid', placeItems: 'center',
              margin: '0 auto 24px'
            }}>
              <Icon name="check" size={24} stroke={2}/>
            </div>
            <h3 className="display-s" style={{ marginBottom: 12 }}>送信が完了しました</h3>
            <p className="body" style={{ marginBottom: 28, fontSize: 14 }}>
              お問い合わせありがとうございます。<br/>
              営業日 24 時間以内に担当者よりご返信します。
            </p>
            <Button variant="ghost" onClick={onClose}>閉じる</Button>
          </div>
        ) : stage === 'error' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'grid', placeItems: 'center', margin: '0 auto 24px'
            }}>
              <Icon name="close" size={24} stroke={2}/>
            </div>
            <h3 className="display-s" style={{ marginBottom: 12 }}>送信に失敗しました</h3>
            <p className="body" style={{ marginBottom: 12, fontSize: 14 }}>
              通信エラーが発生しました。お手数ですが、もう一度お試しください。
            </p>
            <p className="small" style={{ color: 'var(--text-3)', marginBottom: 28 }}>
              解決しない場合は、お手数ですが時間をおいて再度お試しください。
            </p>
            <Button variant="primary" onClick={() => setStage('form')}>フォームに戻る</Button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div className="eyebrow eyebrow-accent" style={{ marginBottom: 10 }}>CONTACT</div>
              <h3 className="display-s" style={{ marginBottom: 8 }}>資料請求・お問い合わせ</h3>
              <p className="small">初回相談は無料です。営業日24時間以内にご返信します。</p>
            </div>

            <form onSubmit={submit} noValidate>
              <div className="field">
                <label>貴社名<span className="req">必須</span></label>
                <input type="text" value={form.company} onChange={onChange('company')} placeholder="株式会社○○"/>
                {errors.company && <div className="err">{errors.company}</div>}
              </div>
              <div className="field">
                <label>ご担当者名<span className="req">必須</span></label>
                <input type="text" value={form.name} onChange={onChange('name')} placeholder="山田 太郎"/>
                {errors.name && <div className="err">{errors.name}</div>}
              </div>
              <div className="field">
                <label>メールアドレス<span className="req">必須</span></label>
                <input type="email" value={form.email} onChange={onChange('email')} placeholder="you@example.com"/>
                {errors.email && <div className="err">{errors.email}</div>}
              </div>
              <div className="field">
                <label>電話番号<span className="req">必須</span></label>
                <input type="tel" value={form.phone} onChange={onChange('phone')} placeholder="03-XXXX-XXXX"/>
                {errors.phone && <div className="err">{errors.phone}</div>}
              </div>
              <div className="field">
                <label>カテゴリー<span className="req">必須</span></label>
                <div className="cb-group">
                  {CATEGORY_OPTIONS.map(o => (
                    <label key={o} className={form.categories.includes(o) ? 'checked' : ''}>
                      <input type="checkbox" checked={form.categories.includes(o)} onChange={() => toggleMulti('categories', o)}/>
                      {o}
                    </label>
                  ))}
                </div>
                {errors.categories && <div className="err">{errors.categories}</div>}
              </div>
              <div className="field">
                <label>お問い合わせ内容<span className="req">必須</span></label>
                <div className="cb-group">
                  {INQ_TYPE_OPTIONS.map(o => (
                    <label key={o} className={form.inqTypes.includes(o) ? 'checked' : ''}>
                      <input type="checkbox" checked={form.inqTypes.includes(o)} onChange={() => toggleMulti('inqTypes', o)}/>
                      {o}
                    </label>
                  ))}
                </div>
                {errors.inqTypes && <div className="err">{errors.inqTypes}</div>}
              </div>
              <div className="field">
                <label>ご相談内容<span className="any">任意</span></label>
                <div className="cb-group">
                  {REASON_OPTIONS.map(o => (
                    <label key={o} className={form.reasons.includes(o) ? 'checked' : ''}>
                      <input type="checkbox" checked={form.reasons.includes(o)} onChange={() => toggleMulti('reasons', o)}/>
                      {o}
                    </label>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>本サイトを知ったきっかけ<span className="any">任意</span></label>
                <select value={form.source} onChange={onChange('source')}>
                  <option value="">選択してください</option>
                  {SOURCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field">
                <label>サイトURL<span className="any">任意</span></label>
                <input type="text" value={form.siteUrl} onChange={onChange('siteUrl')} placeholder="https://"/>
              </div>
              <div className="field">
                <label>その他ご質問<span className="any">任意</span></label>
                <textarea value={form.message} onChange={onChange('message')} placeholder="ご質問・ご相談がございましたらお気軽にご記入ください。"></textarea>
              </div>
              <div className="field field-check">
                <input type="checkbox" id="agree" checked={form.agree} onChange={onChange('agree')} style={{ marginTop: 2 }}/>
                <label htmlFor="agree" style={{ cursor: 'pointer' }}>
                  <a href="#" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>個人情報の取り扱い</a>に同意します<span className="req">必須</span>
                  {errors.agree && <div className="err">{errors.agree}</div>}
                </label>
              </div>
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Button variant="primary" size="lg" type="submit" disabled={stage === 'sending'}>
                  {stage === 'sending' ? '送信中…' : '同意して送信する'}
                  {stage !== 'sending' && <Icon name="arrow-right" size={14}/>}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// -------------------- Big 12-field inline form (table style) --------------------
function BigInlineForm() {
  const initialForm = {
    company: '', name: '', email: '', phone: '', address: '',
    categories: [], inqTypes: [], reasons: [],
    source: '', station: '', siteUrl: '', message: '',
    agree: false,
  };
  const [form, setForm] = React.useState(initialForm);
  const [errors, setErrors] = React.useState({});
  const [done, setDone] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const onChange = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };
  const toggleMulti = (key, val) => {
    const list = form[key];
    const next = list.includes(val) ? list.filter(x => x !== val) : [...list, val];
    setForm({ ...form, [key]: next });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.company) er.company = '必須項目です';
    if (!form.name) er.name = '必須項目です';
    if (!form.email) er.email = '必須項目です';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'メールアドレスの形式が正しくありません';
    if (!form.phone) er.phone = '必須項目です';
    if (form.categories.length === 0) er.categories = 'カテゴリーを選択してください';
    if (form.inqTypes.length === 0) er.inqTypes = 'お問い合わせ内容を選択してください';
    if (!form.address) er.address = '必須項目です';
    if (!form.agree) er.agree = '同意してください';
    setErrors(er);
    if (Object.keys(er).length !== 0) return;
    setSending(true);
    setFailed(false);
    try {
      await sendInquiry(form, 'full-page');
      setDone(true);
    } catch (err) {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="big-form-wrap" style={{ textAlign: 'center', padding: 56 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <Icon name="check" size={24} stroke={2}/>
        </div>
        <h3 className="display-s" style={{ marginBottom: 8 }}>送信が完了しました</h3>
        <p className="small" style={{ marginBottom: 8 }}>お問い合わせありがとうございます。営業日 24h 以内にご返信します。</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="big-form-wrap">
      <p className="lede" style={{ fontSize: 14 }}>
        下記フォームに必要事項をご記入の上、送信してください。
      </p>
      <table className="big-form-table">
        <tbody>
          <tr>
            <th>貴社名<span className="req">必須</span></th>
            <td>
              <input type="text" value={form.company} onChange={onChange('company')} placeholder="株式会社○○"/>
              {errors.company && <div className="err">{errors.company}</div>}
            </td>
          </tr>
          <tr>
            <th>ご担当者名<span className="req">必須</span></th>
            <td>
              <input type="text" value={form.name} onChange={onChange('name')} placeholder="山田 太郎"/>
              {errors.name && <div className="err">{errors.name}</div>}
            </td>
          </tr>
          <tr>
            <th>メールアドレス<span className="req">必須</span></th>
            <td>
              <input type="email" value={form.email} onChange={onChange('email')} placeholder="you@example.com"/>
              {errors.email && <div className="err">{errors.email}</div>}
            </td>
          </tr>
          <tr>
            <th>電話番号<span className="req">必須</span></th>
            <td>
              <input type="tel" value={form.phone} onChange={onChange('phone')} placeholder="03-XXXX-XXXX"/>
              {errors.phone && <div className="err">{errors.phone}</div>}
            </td>
          </tr>
          <tr>
            <th>カテゴリー<span className="req">必須</span></th>
            <td>
              <div className="cb-group">
                {CATEGORY_OPTIONS.map(o => (
                  <label key={o} className={form.categories.includes(o) ? 'checked' : ''}>
                    <input type="checkbox" checked={form.categories.includes(o)} onChange={() => toggleMulti('categories', o)}/>
                    {o}
                  </label>
                ))}
              </div>
              {errors.categories && <div className="err">{errors.categories}</div>}
            </td>
          </tr>
          <tr>
            <th>住所<span className="req">必須</span></th>
            <td>
              <input type="text" value={form.address} onChange={onChange('address')} placeholder="京都府京都市…"/>
              {errors.address && <div className="err">{errors.address}</div>}
            </td>
          </tr>
          <tr>
            <th>お問い合わせ内容<span className="req">必須</span></th>
            <td>
              <div className="cb-group">
                {INQ_TYPE_OPTIONS.map(o => (
                  <label key={o} className={form.inqTypes.includes(o) ? 'checked' : ''}>
                    <input type="checkbox" checked={form.inqTypes.includes(o)} onChange={() => toggleMulti('inqTypes', o)}/>
                    {o}
                  </label>
                ))}
              </div>
              <textarea value={form.message} onChange={onChange('message')} placeholder="その他質問がございましたらお気軽にご記入ください。" style={{ marginTop: 12, minHeight: 90 }}/>
              {errors.inqTypes && <div className="err">{errors.inqTypes}</div>}
            </td>
          </tr>
          <tr>
            <th>ご相談内容<span className="any">任意</span></th>
            <td>
              <div className="cb-group">
                {REASON_OPTIONS.map(o => (
                  <label key={o} className={form.reasons.includes(o) ? 'checked' : ''}>
                    <input type="checkbox" checked={form.reasons.includes(o)} onChange={() => toggleMulti('reasons', o)}/>
                    {o}
                  </label>
                ))}
              </div>
            </td>
          </tr>
          <tr>
            <th>本サイトを知ったきっかけ<span className="any">任意</span></th>
            <td>
              <select value={form.source} onChange={onChange('source')}>
                <option value="">選択してください</option>
                {SOURCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </td>
          </tr>
          <tr>
            <th>最寄り駅<span className="any">任意</span></th>
            <td><input type="text" value={form.station} onChange={onChange('station')}/></td>
          </tr>
          <tr>
            <th>サイトURL<span className="any">任意</span></th>
            <td><input type="text" value={form.siteUrl} onChange={onChange('siteUrl')} placeholder="https://"/></td>
          </tr>
        </tbody>
      </table>
      <div className="big-form-note">
        ※<a href="#">個人情報の取扱</a>への同意の上、送信してください。 ただし個人情報の利用目的はお問合せ者情報に限ります。
      </div>
      <div className="field field-check" style={{ justifyContent: 'center', marginTop: 16 }}>
        <input type="checkbox" id="big-agree" checked={form.agree} onChange={onChange('agree')} style={{ marginTop: 2 }}/>
        <label htmlFor="big-agree" style={{ cursor: 'pointer' }}>
          個人情報の取り扱いに同意します<span className="req">必須</span>
          {errors.agree && <div className="err">{errors.agree}</div>}
        </label>
      </div>
      {failed && (
        <p className="err" style={{ textAlign: 'center', marginTop: 12 }}>
          送信に失敗しました。お手数ですが、時間をおいて再度お試しください。
        </p>
      )}
      <div className="big-form-submit">
        <Button variant="primary" size="lg" type="submit" disabled={sending}>
          {sending ? '送信中…' : <>同意して送信する<Icon name="arrow-right" size={14}/></>}
        </Button>
      </div>
    </form>
  );
}

// -------------------- Side Tab Form (compact) --------------------
function SideTabForm() {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ company: '', name: '', email: '', phone: '', message: '', agree: false });
  const [done, setDone] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const onChange = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: v });
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!form.company || !form.name || !form.email || !form.agree) return;
    setSending(true);
    setFailed(false);
    try {
      await sendInquiry(form, 'side-tab');
      setDone(true);
    } catch (err) {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      {!open && (
        <div className="side-tab">
          <button className="side-tab-btn" onClick={() => setOpen(true)}>資料請求</button>
          <button type="button" className="side-tab-btn side-tab-btn-tel" onClick={() => setOpen(true)} style={{ writingMode: 'vertical-rl', textOrientation: 'upright', padding: '16px 12px', border: 'none', cursor: 'pointer' }}>無料相談</button>
        </div>
      )}
      <div className={`side-form-panel${open ? ' open' : ''}`}>
        <div className="side-form-head">
          <button className="side-form-close" onClick={() => setOpen(false)}><Icon name="close" size={16}/></button>
          <h3>無料相談 実施中</h3>
          <p>お気軽にご記入ください。営業日24h以内にご返信します。</p>
        </div>
        <div className="side-form-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
                <Icon name="check" size={24} stroke={2}/>
              </div>
              <h3 className="display-s" style={{ marginBottom: 8 }}>送信が完了しました</h3>
              <p className="small" style={{ marginBottom: 8 }}>お問い合わせありがとうございます。営業日24h以内にご返信します。</p>
              <Button variant="ghost" size="sm" onClick={() => { setDone(false); setOpen(false); }} style={{ marginTop: 24 }}>閉じる</Button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="field">
                <label>貴社名<span className="req">必須</span></label>
                <input type="text" value={form.company} onChange={onChange('company')} required/>
              </div>
              <div className="field">
                <label>ご担当者名<span className="req">必須</span></label>
                <input type="text" value={form.name} onChange={onChange('name')} required/>
              </div>
              <div className="field">
                <label>メールアドレス<span className="req">必須</span></label>
                <input type="email" value={form.email} onChange={onChange('email')} required/>
              </div>
              <div className="field">
                <label>電話番号</label>
                <input type="tel" value={form.phone} onChange={onChange('phone')}/>
              </div>
              <div className="field">
                <label>ご相談内容</label>
                <textarea value={form.message} onChange={onChange('message')} placeholder="現状の課題やご希望を自由にご記入ください"/>
              </div>
              <div className="field field-check">
                <input type="checkbox" id="side-agree" checked={form.agree} onChange={onChange('agree')} style={{ marginTop: 2 }} required/>
                <label htmlFor="side-agree" style={{ cursor: 'pointer' }}>
                  <a href="#" style={{ color: 'var(--accent)' }}>個人情報の取り扱い</a>に同意します
                </label>
              </div>
              {failed && (
                <p className="err" style={{ marginBottom: 10 }}>
                  送信に失敗しました。時間をおいて再度お試しください。
                </p>
              )}
              <Button variant="primary" size="lg" type="submit" style={{ width: '100%' }} disabled={sending}>
                {sending ? '送信中…' : <>送信する<Icon name="arrow-right" size={14}/></>}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// -------------------- SP Bottom Nav (fixed 5-icon) --------------------
function SPBottomNav({ onNavigate, onContact }) {
  return (
    <nav className="sp-bottom-nav" aria-label="モバイル下部ナビ">
      <ul>
        <li>
          <a {...navProps('top', onNavigate)}>
            <span className="icn"><Icon name="home" size={20}/></span>
            <span>トップ</span>
          </a>
        </li>
        <li>
          <a {...navProps('works', onNavigate)}>
            <span className="icn"><Icon name="grid" size={20}/></span>
            <span>制作実績</span>
          </a>
        </li>
        <li>
          <a {...navProps('pricing', onNavigate)}>
            <span className="icn"><Icon name="yen" size={20}/></span>
            <span>料金</span>
          </a>
        </li>
        <li>
          <a onClick={onContact}>
            <span className="icn"><Icon name="mail" size={20}/></span>
            <span>資料請求</span>
          </a>
        </li>
        <li>
          <a {...navProps('sitemap', onNavigate)}>
            <span className="icn"><Icon name="menu" size={20}/></span>
            <span>メニュー</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}

// -------------------- Section header --------------------
function SectionHead({ eyebrow, title, lede, align = 'center', en }) {
  return (
    <header style={{
      marginBottom: 56,
      textAlign: align,
      maxWidth: align === 'center' ? 760 : undefined,
      marginLeft: align === 'center' ? 'auto' : 0,
      marginRight: align === 'center' ? 'auto' : 0,
    }} className="fadein">
      {eyebrow && <div className="eyebrow" style={{ marginBottom: 14 }}>{eyebrow}</div>}
      <h2 className="section-title">{title}</h2>
      {en && <p className="section-sub">{en}</p>}
      {lede && <p className="lede" style={{ marginTop: 24, marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0 }}>{lede}</p>}
    </header>
  );
}

// -------------------- Red CTA Strip (between-section accent band) --------------------
function RedCTAStrip({ onContact, onNavigate, title }) {
  return (
    <section className="t_inq_wrap fadein">
      <div className="container">
        <h2>{title || (<>オリジナルデザインのWeb制作 × AI運用<br/>まずは無料で資料請求</>)}</h2>
        <div className="t_inq_btns">
          <Button onClick={onContact}><Icon name="mail" size={14}/>資料請求はこちら</Button>
          <Button onClick={() => onNavigate && onNavigate('diagnostic')}><Icon name="search" size={14}/>ホームページ無料診断</Button>
        </div>
        <p className="t_inq_time">営業日 24時間以内に担当者よりご返信します。</p>
      </div>
    </section>
  );
}

// Backwards-compat alias (must be a real top-level function so JSX resolves it as an identifier)
function CTAStrip(props) { return React.createElement(RedCTAStrip, props); }

// -------------------- Page Hero (subpages) — upgraded with watermark + decorative bar --------------------
function PageHero({ eyebrow, title, lede, badges, onContact, ctaLabel = "資料請求はこちら", subCta = "デモを見る", watermark, pageNo }) {
  return (
    <section className="page-hero">
      <div className="page-hero-deco">
        {watermark && <div className="page-hero-watermark">{watermark}</div>}
        <div className="page-hero-band"></div>
        {pageNo && <div className="page-hero-no">/ {pageNo}</div>}
      </div>
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 1100 }}>
          {eyebrow && (
            <div className="main-eyebrow fadein" style={{ marginBottom: 22 }}>
              {eyebrow}
            </div>
          )}
          <h1 className="display-xl fadein" data-delay="100" style={{ marginBottom: 28 }}>{title}</h1>
          {lede && <p className="lede fadein" data-delay="200" style={{ marginBottom: 30, maxWidth: 720 }}>{lede}</p>}
          {badges && (
            <div className="row fadein" data-delay="300" style={{ marginBottom: 32 }}>
              {badges.map((b, i) => <span key={i} className="tag">{b}</span>)}
            </div>
          )}
          <div className="row fadein" data-delay="400" style={{ gap: 14 }}>
            <Button variant="primary" size="lg" onClick={onContact} arrow>{ctaLabel}</Button>
            <Button variant="ghost" size="lg">{subCta}<Icon name="arrow-right" size={14}/></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------------------- Breadcrumb --------------------
function Breadcrumb({ items, onNavigate }) {
  return (
    <nav aria-label="Breadcrumb" style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
      <div className="container">
        <ol className="row-tight" style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: 'var(--text-3)' }}>
          {items.map((it, i) => (
            <li key={i} className="row-tight" style={{ gap: 8 }}>
              {i > 0 && <span style={{ color: 'var(--text-4)' }}>›</span>}
              {it.id ? (
                <a {...navProps(it.id, onNavigate)} style={{ cursor: 'pointer', color: 'var(--text-2)' }}>{it.label}</a>
              ) : (
                <span style={{ color: 'var(--text)' }}>{it.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

// -------------------- Scroll progress bar --------------------
function ScrollProgress() {
  const [pct, setPct] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div className="scroll-progress" style={{ width: `${pct}%` }}/>;
}

// -------------------- Animated counter (counts up when in view) --------------------
function Counter({ to, duration = 1400, suffix = '', prefix = '', decimals = 0, className = "counter" }) {
  const ref = React.useRef(null);
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (!ref.current) return;
    let raf;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const start = performance.now();
          const step = (t) => {
            const p = Math.min(1, (t - start) / duration);
            // ease out cubic
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(to * eased);
            if (p < 1) raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    obs.observe(ref.current);
    return () => { obs.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [to, duration]);
  const display = decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString();
  return <span ref={ref} className={className}>{prefix}{display}{suffix}</span>;
}

// -------------------- Sticky CTA hint --------------------
function StickyCTA({ onContact, threshold = 600 }) {
  const [show, setShow] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  React.useEffect(() => {
    if (dismissed) return;
    const onScroll = () => setShow(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, dismissed]);
  if (dismissed) return null;
  return (
    <div className={`sticky-cta${show ? ' show' : ''}`}>
      <span className="pulse"></span>
      <span>初回相談無料 · 営業日24h以内にご返信</span>
      <button onClick={onContact}>資料請求 →</button>
      <button className="sticky-cta-close" onClick={() => setDismissed(true)} aria-label="閉じる">
        <Icon name="close" size={12}/>
      </button>
    </div>
  );
}

// -------------------- Mixed marquee (stats + words) --------------------
function MixMarquee({ items }) {
  const all = [...items, ...items];
  return (
    <div className="mix-marquee">
      <div className="mix-marquee-track">
        {all.map((it, i) => (
          <span key={i} className="mix-marquee-item">
            {it.num && <span className="num">{it.num}</span>}
            <span>{it.text}</span>
            <span className="dot"></span>
          </span>
        ))}
      </div>
    </div>
  );
}

// -------------------- Tag cloud (weighted) --------------------
function TagCloud({ tags, onTagClick }) {
  return (
    <div className="tagcloud">
      {tags.map((t, i) => (
        <a key={i} className={`w${t.w || 3}`} onClick={() => onTagClick && onTagClick(t.label)}>
          {t.label}
        </a>
      ))}
    </div>
  );
}

// -------------------- Card hover spotlight (mouse-follow gradient) --------------------
function useCardSpotlight() {
  React.useEffect(() => {
    const sel = '.card, .case-card, .pickup-card, .feature-trio-card, .support-card, .promo-card';
    // 主要カードだけポインタ追従の3Dチルト。全カードに掛けると品位が落ちる
    const tiltSel = '.case-card, .reason-card, .promo-card, .pickup-card';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const onMove = (e) => {
      const el = e.target.closest(`${sel}, .reason-card`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
      if (!reduced && fine && el.matches(tiltSel)) {
        const px = x / r.width - 0.5;
        const py = y / r.height - 0.5;
        el.style.transform =
          `perspective(760px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-4px)`;
      }
    };
    const onOut = (e) => {
      const el = e.target.closest(tiltSel);
      if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) el.style.transform = '';
    };
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);
}
// -------------------- Magnetic CTA (pointer-follow, fine pointers only) --------------------
function useMagnetic() {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const RADIUS = 90;
    const onMove = (e) => {
      document.querySelectorAll('.btn-magnet').forEach((el) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < RADIUS + Math.max(r.width, r.height) / 2) {
          el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.18}px)`;
          el.style.transition = 'transform 80ms linear';
        } else if (el.style.transform) {
          el.style.transform = '';
          el.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';
        }
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => document.removeEventListener('pointermove', onMove);
  }, []);
}

function HashTag({ children, color = 'blue', big = false, onClick }) {
  return (
    <a className={`kw-pill c-${color}${big ? ' big' : ''}`} onClick={onClick}>
      <span className="tag-mark">#</span>{children}
    </a>
  );
}

Object.assign(window, {
  Icon, Button, Nav, Footer, Placeholder, FAQ, ContactModal,
  BigInlineForm, SideTabForm, SPBottomNav,
  SectionHead, RedCTAStrip, PageHero, Breadcrumb, HashTag,
  CTAStrip: RedCTAStrip,
  ScrollProgress, Counter, StickyCTA, MixMarquee, TagCloud,
  useCardSpotlight,
  useFadeIn,
  useMagnetic,
  NAV_MEGA, PREFECTURES,
  CATEGORY_OPTIONS, INQ_TYPE_OPTIONS, REASON_OPTIONS, SOURCE_OPTIONS,
});
