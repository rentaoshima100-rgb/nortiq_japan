// ============================================================
// Nortiq Labs — Additional pages (Works, Voice, Support,
// Pricing, Seminar, Diagnosis, QuickDiagnosis, Subsidy,
// Guidebook, Column, Company, Staff, Sitemap, and the
// works-category / feature / product detail pages)
// ============================================================

// ============================================================
// WORKS — index + category
// ============================================================
const WORKS_DATA = [
  { id: 1, tag: "クリニック", category: "clinic", title: "地域密着型クリニックのリニューアル (あおぞら Family Clinic)", stat: "問い合わせ 2.4×", services: ["Web制作", "AIチャットボット"], img: "assets/work-aozora-family.png" },
  { id: 2, tag: "クリニック", category: "clinic", title: "内科クリニックの予約サイト構築 (あおぞら内科クリニック)", stat: "予約 +83%", services: ["Web制作"], img: "assets/work-aozora-naika.png" },
  { id: 18, tag: "クリニック", category: "clinic", title: "皮膚科ブランドサイト × 集客連動 (AIRA CLINIC GINZA)", stat: "PV 2.7×", services: ["Web制作", "SEO"], img: "assets/hero-05.png" },
  { id: 19, tag: "クリニック", category: "clinic", title: "歯科医院の総合 LP 構築 (白藍 HAKURAN DENTAL)", stat: "予約 +110%", services: ["Web制作"], img: "assets/hero-04.png" },
  { id: 20, tag: "クリニック", category: "clinic", title: "美容外来のブランドサイト (クマ取り専門外来)", stat: "予約離脱 -42%", services: ["Web制作"], img: "assets/hero-06.png" },
  { id: 3, tag: "不動産", category: "realty", title: "新時代の不動産投資ブランド構築 (PLEAST)", stat: "問合せ 3.2×", services: ["Web制作", "SEO"], img: "assets/work-pleast.png" },
  { id: 4, tag: "不動産", category: "realty", title: "投資物件専門サイト × 物件管理 (ESTIA PARTNERS)", stat: "反響 2.7×", services: ["Web制作", "DX"], img: "assets/work-estia.png", demo: "/showcase/estia/" },
  { id: 23, tag: "不動産", category: "realty", title: "賃貸オーナー向け管理ポータル (オーナーズデスク)", stat: "工数 -45%", services: ["業務システム", "UI設計", "ロゴ・VI"], img: "assets/work-ownersdesk.png", demo: "/showcase/ownersdesk/" },
  { id: 5, tag: "建築", category: "build", title: "大規模修繕・建物リニューアル (Renew Reuse Loop)", stat: "問合せ 2.6×", services: ["Web制作", "Recruit"], img: "assets/work-renewal.png" },
  { id: 6, tag: "建築", category: "build", title: "不断水水替工法のテクニカルサイト (RAKUYU-Z)", stat: "BtoB商談 +210%", services: ["Web制作"], img: "assets/work-rakuyu.png" },
  { id: 7, tag: "人材", category: "hr", title: "外国人材組合 (Asia Exchange Cooperative) サイト", stat: "応募 +84%", services: ["Web制作", "AIチャットボット"], img: "assets/work-asia-exchange.png" },
  { id: 8, tag: "人材", category: "hr", title: "新卒採用ブランドサイト構築 (AXIA · NEW GRADUATES)", stat: "エントリー 2.1×", services: ["Web制作", "AIチャットボット"], img: "assets/hero-07.png" },
  { id: 21, tag: "人材", category: "hr", title: "中途採用 LP (AXIA · 挑め、想定の外へ)", stat: "応募 1.6×", services: ["Web制作", "LPO"], img: "assets/lpo-axia-recruit.png" },
  { id: 9, tag: "小売", category: "retail", title: "京都のキッチンカー (panza) ブランドLP", stat: "SNS流入 4.6×", services: ["Web制作"], img: "assets/work-panza.png" },
  { id: 10, tag: "小売", category: "retail", title: "京都の骨董店 (TAKETORA) バイリンガルEC", stat: "海外PV 5.2×", services: ["Web制作", "EC"], img: "assets/work-taketora.png" },
  { id: 22, tag: "小売", category: "retail", title: "中古フィギュア店の AI 在庫登録システム (TAKETORA)", stat: "AI同定 3層", services: ["iPadアプリ開発", "AI同定", "スマレジ連携"], img: null },
  { id: 11, tag: "小売", category: "retail", title: "ゴルフリゾート (COCOPA) のブランドサイト", stat: "予約 1.9×", services: ["Web制作"], img: "assets/work-cocopa.png" },
  { id: 12, tag: "小売", category: "retail", title: "サブスク EC のリピート率改善 (Quiet Objects · Spring Editorial)", stat: "解約率 -32%", services: ["DX・ML"], img: "assets/hero-01.png" },
  { id: 13, tag: "インフラ", category: "infra", title: "RAKUYU-Z 工法協会 サイト", stat: "信頼度評価 +", services: ["Web制作"], img: "assets/work-rakuyu.png" },
  { id: 14, tag: "インフラ", category: "infra", title: "電力会社のサービスサイト刷新 (VOLTIO スマートエネルギー)", stat: "PV 2.1×", services: ["Web制作", "アクセス解析"], img: "assets/hero-03.png" },
  { id: 15, tag: "AI", category: "ai", title: "AIスタートアップのシード期 LP (Sable · SEED 2026)", stat: "商談化率 4.2×", services: ["Web制作"], img: "assets/hero-02.png" },
  { id: 16, tag: "AI", category: "ai", title: "BtoB SaaS のサービスサイト (ATLAS ML Engine)", stat: "問合せ +210%", services: ["Web制作", "AIチャットボット"], img: "assets/hero-08.png" },
  { id: 17, tag: "AI", category: "ai", title: "ML エンジン PoC LP (AI ツール解説サービス)", stat: "デモ申込 5.6×", services: ["Web制作"], img: "assets/work-ai-toolpicks.jpg" },
];

// Expose for app.jsx so works-category pages can build ItemList JSON-LD from the
// same source of truth (avoids duplicating the project list in the SEO layer).
if (typeof window !== "undefined") window.NORTIQ_WORKS = WORKS_DATA;

const CATEGORY_LABELS = {
  clinic: "クリニック・医療",
  realty: "不動産",
  build: "建築・工務店",
  hr: "人材",
  retail: "小売 / EC",
  infra: "インフラ・製造",
  ai: "AIスタートアップ",
};

function WorksPage({ category, onNavigate, onContact }) {
  const items = category ? WORKS_DATA.filter(w => w.category === category) : WORKS_DATA;
  const label = category ? CATEGORY_LABELS[category] : null;
  const allCats = Object.keys(CATEGORY_LABELS);
  return (
    <main className="page-fade">
      <Breadcrumb items={[
        { label: "トップ", id: "top" },
        { label: "制作実績", id: "works" },
        ...(label ? [{ label }] : []),
      ]} onNavigate={onNavigate}/>

      <PageHero
        eyebrow={category ? "WORKS / " + label.toUpperCase() : "WORKS"}
        title={category ? <>{label}の<br/>制作実績</> : <>制作実績の<br/>すべて。</>}
        lede={category
          ? `${label}の業種で、Nortiq Labs が手がけた制作・支援実績を集約しました。Web制作からAI実装まで一貫した事例を掲載しています。`
          : "20 社の制作・支援実績から、業種別・LP強化別・動画別に絞り込めます。お探しの業種・課題に近い事例から、最適なアプローチをご検討ください。"
        }
        badges={category
          ? ["業種: " + label, "全 " + items.length + " 件"]
          : ["全20社", "業種 7 / LP 3 / 動画", "オリジナルデザイン"]
        }
        onContact={onContact}
        ctaLabel="同業種の見積依頼"
        subCta="絞り込み条件を保存"
      />

      {/* Category filter */}
      <section style={{ padding: '0 0 48px' }}>
        <div className="container">
          <div className="row" style={{ marginBottom: 16, gap: 8 }}>
            <span className="small text-mono" style={{ color: 'var(--text-3)' }}>業種で絞り込む:</span>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className={`kw-pill ${!category ? 'active' : ''}`} onClick={() => onNavigate('works')} style={!category ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}>すべて</button>
            {allCats.map(c => (
              <button
                key={c}
                className="kw-pill"
                onClick={() => onNavigate('works-' + c)}
                style={category === c ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Works grid */}
      <section style={{ paddingBottom: 'clamp(80px, 11vw, 160px)' }}>
        <div className="container">
          <div className="grid-3">
            {items.map(w => (
              <a key={w.id} className="card card-link" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
                 onClick={w.demo ? (e) => { e.preventDefault(); openShowcase(w.demo, w.title); } : undefined}>
                <WorkShot work={w}/>
                <div style={{ padding: '18px 22px 20px' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                    <span className="tag">{w.tag}</span>
                    <span className="stat-pill">{w.stat}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 10, lineHeight: 1.6 }}>{w.title}</h3>
                  <div className="row-tight">
                    {w.services.map((s, i) => <span key={i} className="small text-mono" style={{ color: 'var(--text-3)' }}>· {s}</span>)}
                  </div>
                  <span className="work-cta">{w.demo ? 'サイトをこの場で見る' : '実績の詳細を見る'}<Icon name="arrow-right" size={12}/></span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Related categories (when in category view) */}
      {category && (
        <section className="section-pad-sm" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="container">
            <h3 className="display-s" style={{ marginBottom: 24 }}>他の業種の実績も見る</h3>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              {allCats.filter(c => c !== category).map(c => (
                <button key={c} className="kw-pill" onClick={() => onNavigate('works-' + c)}>
                  {CATEGORY_LABELS[c]} →
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {category && <IndustrySections category={category} onNavigate={onNavigate}/>}

      <CTAStrip onContact={onContact} title="自社の業種に近い事例で、まず相談する。" sub="ヒアリングでヒアリング前に共有資料 (PDF) もお送りします。"/>
    </main>
  );
}

// ============================================================
// VOICE (ご利用会社様の声)
// ============================================================
function VoicePage({ onNavigate, onContact }) {
  const voices = [
    { tag: "クリニック (東京)", name: "A.K.", role: "代表取締役・院長", size: "xl", q: "Web制作からの付き合いで、半年後にAIチャットボットも導入。ブログ更新の負担がなくなり、SEO流入が1.8倍になりました。「Webのプロが横にいる」感覚を、初めて持てた気がします。" },
    { tag: "中堅不動産 (大阪)", name: "T.M.", role: "経営企画", size: "md", q: "他社は『AIできます』止まりだが、Nortiqは実装の中身まで説明してくれて納得感があった。米国の技術背景は伊達じゃない。" },
    { tag: "工務店 (神奈川)", name: "S.W.", role: "代表取締役", size: "lg", q: "案件管理システム × ブランドサイトの統合で、現場の工数が38%減りました。何より、毎月の定例で改善が前に進むのが嬉しい。" },
    { tag: "人材 (東京)", name: "Y.N.", role: "事業責任者", size: "md", q: "採用LPの応募数が52%増。コピーライティングまで一緒に詰めてくれる伴走型は、ありがたいです。" },
    { tag: "AIスタートアップ (東京)", name: "K.H.", role: "Founder/CEO", size: "lg", q: "シードラウンドのタイミングでLPを発注。商談化率が4倍以上になり、調達後のリードタイム短縮に直結しました。技術系の会社にこそ、技術背景のあるWebチームが必要だと痛感。" },
    { tag: "セレクトショップ (福岡)", name: "M.O.", role: "EC事業責任者", size: "xl", q: "店舗とECの分断を埋めるサイト構築。CVR が1.8倍、EC流入も2倍に。データを見ながら毎週微調整できる体制になり、「ECは数字との対話だ」と社内で実感が広がりました。" },
    { tag: "歯科 (神奈川)", name: "H.K.", role: "院長", size: "md", q: "他社見積もりの半額で、しかも公開後の伴走まで含まれていて驚きました。" },
    { tag: "建材メーカー (愛知)", name: "R.S.", role: "営業推進部", size: "md", q: "BtoB の商談化率が3.4倍になり、展示会依存からの脱却が見えてきました。" },
  ];
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "ご利用会社様の声" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="VOICE / ご利用会社様の声"
        title={<>長く付き合える、<br/>を裏付ける声。</>}
        lede="ご利用いただいている企業様の声を、何より大切にしています。日々いただくリアルなご意見が、私たちのサービスをかたちづくっています。"
        badges={["累計20社の支援", "全業種から声", "長期運用に伴走"]}
        onContact={onContact}
        watermark="VOICE"
        pageNo="VOICE"
      />

      <section className="section-pad">
        <div className="container">
          <div className="quote-wall">
            {voices.map((v, i) => (
              <article key={i} className={`quote-card q-${v.size} fadein`} data-delay={i * 80}>
                <span className="quote-tag">{v.tag}</span>
                <p className="quote-body">{v.q}</p>
                <div className="quote-meta">
                  <strong style={{ fontWeight: 700 }}>{v.name}</strong>
                  <span>·</span>
                  <span>{v.role}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="stats-ribbon">
        <div className="container">
          <div className="stats-ribbon-inner">
            <div className="stats-ribbon-cell"><span className="num">20+</span><span className="lbl">支援企業数</span></div>
            <div className="stats-ribbon-cell"><span className="num">5</span><span className="lbl">チーム人数</span></div>
            <div className="stats-ribbon-cell"><span className="num">24h</span><span className="lbl">返信SLA</span></div>
          </div>
        </div>
      </div>

      <CTAStrip onContact={onContact} title="あなたの会社の声も、いつかここに。" sub="まずは小さな一歩から。Web制作 30 万円〜、初回相談無料です。"/>
    </main>
  );
}

// ============================================================
// SUPPORT
// ============================================================
function SupportPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "サポート" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="SUPPORT / コンサル・運用サポート"
        title={<>作るだけじゃない、<br/>育てる伴走。</>}
        lede="専属担当者からの「月次アクセス報告」「定期訪問」「活用勉強会」など、1社1社のWEB運用を3年・5年と並走支援します。"
        badges={["月次レポート", "保守プラン内で修正対応", "長期運用に伴走"]}
        onContact={onContact}
      />

      <section className="section-pad">
        <div className="container">
          <SectionHead
            eyebrow="STRUCTURE / サポート体制"
            title="毎月、4つのことを必ず実施します。"
            lede="どんなに小さな案件でも、運用体制は変わりません。"
          />
          <div className="grid-4">
            <div className="card"><div className="step-num" style={{ marginBottom: 16 }}>01</div><h3 style={{ fontSize: 19, fontWeight: 500, margin: 0, marginBottom: 10 }}>月次アクセス報告</h3><p className="body" style={{ fontSize: 14 }}>GA4 / GSC / 独自解析を統合したカスタムダッシュボードで、毎月の変化を可視化。</p></div>
            <div className="card"><div className="step-num" style={{ marginBottom: 16 }}>02</div><h3 style={{ fontSize: 19, fontWeight: 500, margin: 0, marginBottom: 10 }}>定期訪問・MTG</h3><p className="body" style={{ fontSize: 14 }}>月1回のオンライン or オフライン MTG で、改善施策をその場で決定します。</p></div>
            <div className="card"><div className="step-num" style={{ marginBottom: 16 }}>03</div><h3 style={{ fontSize: 19, fontWeight: 500, margin: 0, marginBottom: 10 }}>操作マニュアル整備</h3><p className="body" style={{ fontSize: 14 }}>WordPress / AI ツールの管理画面ごとに、画像付きの操作手順書をご提供します。</p></div>
            <div className="card"><div className="step-num" style={{ marginBottom: 16 }}>04</div><h3 style={{ fontSize: 19, fontWeight: 500, margin: 0, marginBottom: 10 }}>ヒートマップ解析</h3><p className="body" style={{ fontSize: 14 }}>どこで離脱するか、どこをクリックするか。データに基づくUI改善を提案。</p></div>
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <SectionHead
            eyebrow="ALL INCLUDED / サポート範囲"
            title={<React.Fragment>契約期間中、追加費用なく<span className="nw">対応する範囲。</span></React.Fragment>}
          />
          <div className="grid-3">
            {[
              { t: "テキスト・画像の差し替え", d: "保守プラン内で対応 (Light 月3件 / Standard 月8件 / Premium 無制限)" },
              { t: "新着記事の投稿代行", d: "保守プラン内 (Standard 月3本 / Premium 月8本)" },
              { t: "バナー画像の制作", d: "Premium プランで月2点まで含む" },
              { t: "セキュリティパッチ適用", d: "WordPress / プラグイン自動更新" },
              { t: "サーバー監視・障害対応", d: "24/7 監視、SLA 99.9%" },
              { t: "メール・Slack 相談", d: "営業日 24h 以内に一次返信" },
            ].map((it, i) => (
              <div key={i} className="card" style={{ padding: '24px 26px' }}>
                <div className="row" style={{ marginBottom: 12 }}>
                  <span className="text-accent"><Icon name="check" size={16} stroke={2}/></span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, marginBottom: 8 }}>{it.t}</h3>
                <p className="body" style={{ fontSize: 13, margin: 0 }}>{it.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ExtraContent blocks={SUPPORT_CONTENT} onNavigate={onNavigate}/>

      <CTAStrip onContact={onContact}/>
    </main>
  );
}

// ============================================================
// PRICING
// ============================================================
function PricingPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "料金プラン" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="PRICING / 料金プラン"
        title={<>透明な、<br/>段階投資。</>}
        lede="サービスごとに3つのプランを用意。実際の費用はヒアリング後の見積でご提案しますが、目安レンジをすべて公開しています。"
        badges={["明朗会計", "補助金活用の相談可", "段階契約OK"]}
        onContact={onContact}
      />

      {[
        { tl: "Web 制作", rows: [
          { plan: "LIGHT", amount: "30", unit: "万円〜", tagline: "コーポレートサイトの新規制作・刷新", features: ["5〜8 ページ程度", "レスポンシブ対応", "GA4 / GSC 初期設定", "1ヶ月のサポート"] },
          { plan: "STANDARD", amount: "60", unit: "万円〜", tagline: "集客重視のサイト構築 + SEO", features: ["10〜20 ページ", "WordPress / MDX", "SEO 内部対策", "3ヶ月のサポート", "月次改善レビュー"] },
          { plan: "PREMIUM", amount: "120", unit: "万円〜", tagline: "Next.js 高速サイト + AI 機能", features: ["Next.js / Vercel", "Core Web Vitals Good 保証", "AIチャットボット組み込み", "6ヶ月のサポート"] },
        ]},
        { tl: "AIチャットボット", rows: [
          { plan: "LIGHT", amount: "10", unit: "万円〜", tagline: "個人事業主・小規模事業者向け", features: ["月5記事まで", "WordPress 連携 1サイト", "メールサポート"] },
          { plan: "STANDARD", amount: "25", unit: "万円〜", tagline: "中堅企業の標準プラン", features: ["月20記事まで", "WordPress 連携 3サイト", "SEO最適化", "Slackサポート"] },
          { plan: "PREMIUM", amount: "50", unit: "万円〜", tagline: "業務全体に AI を組み込む", features: ["生成数 無制限", "任意 CMS 連携", "カスタムML組み込み", "専属サポート"] },
        ]},
        { tl: "DX・ML", rows: [
          { plan: "POC", amount: "50", unit: "万円〜", tagline: "技術検証フェーズ", features: ["要件定義", "プロトタイプ実装", "GO/NO-GO 判断"] },
          { plan: "IMPLEMENTATION", amount: "200", unit: "万円〜", tagline: "本実装フェーズ", features: ["本番品質実装", "MLOps 構築", "3ヶ月の運用支援"] },
          { plan: "OPERATION", amount: "10", unit: "万円/月〜", tagline: "継続運用", features: ["モデル監視・再学習", "週次レポート", "改善施策の実装"] },
        ]},
      ].map((block, i) => (
        <section key={i} className="section-pad" style={{ borderTop: i > 0 ? '1px solid var(--border)' : undefined, background: i % 2 === 1 ? 'var(--bg-2)' : undefined, borderBottom: i % 2 === 1 ? '1px solid var(--border)' : undefined }}>
          <div className="container">
            <div className="row" style={{ marginBottom: 36, justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <h2 className="display-m">{block.tl}</h2>
              <Button variant="text" onClick={() => onNavigate(block.tl === 'Web 制作' ? 'web' : block.tl === 'AIチャットボット' ? 'chatbot' : 'dx')}>機能詳細を見る<Icon name="arrow-right" size={13}/></Button>
            </div>
            <div className="price-grid">
              {block.rows.map((r, j) => (
                <div key={j} className={`price-card${j === 1 ? ' featured' : ''}`}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="step-num">{r.plan}</span>
                    {j === 1 && <span className="tag" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>RECOMMENDED</span>}
                  </div>
                  <div className="price-amount num">{r.amount}<sub>{r.unit}</sub></div>
                  <p className="small" style={{ color: 'var(--text-3)' }}>{r.tagline}</p>
                  <ul className="price-features">
                    {r.features.map((f, k) => (
                      <li key={k}><span className="check"><Icon name="check" size={14} stroke={1.8}/></span><span>{f}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <ExtraContent blocks={PRICING_EXTRA} onNavigate={onNavigate}/>

      <CTAStrip onContact={onContact} title="プランの組み合わせ、ご相談ください。" sub="複数プランを段階導入する形での見積も可能です。補助金の活用も視野に、最適な投資計画をご相談いただけます。"/>
    </main>
  );
}

// ============================================================
// DIAGNOSIS (詳細無料診断)
// ============================================================
function DiagnosisPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "無料診断", id: "diagnosis" }, { label: "サイト無料診断 (詳細)" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="DIAGNOSIS / サイト無料診断"
        title={<>現状の課題を、<br/>30項目で可視化。</>}
        lede="Nortiq 独自の30項目チェックリストで、現状の Web サイトを多面的に分析。診断レポート (PDF) を3営業日以内に無料でお送りします。"
        badges={["完全無料", "3営業日以内に納品", "30項目 / 8カテゴリー"]}
        onContact={() => onContact('diagnosis')}
        ctaLabel="診断を申し込む"
      />
      <section className="section-pad">
        <div className="container">
          <SectionHead eyebrow="CHECKLIST / 診断項目" title="診断する 8 つのカテゴリー" align="center"/>
          <div className="grid-4">
            {[
              { t: "ユーザビリティ", n: "5項目" },
              { t: "SEO 内部対策", n: "5項目" },
              { t: "Core Web Vitals", n: "3項目" },
              { t: "アクセシビリティ", n: "4項目" },
              { t: "コンバージョン設計", n: "4項目" },
              { t: "セキュリティ", n: "3項目" },
              { t: "ブランド一貫性", n: "3項目" },
              { t: "競合比較", n: "3項目" },
            ].map((it, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: 32 }}>
                <div className="num" style={{ fontSize: 32, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>{String(i + 1).padStart(2, '0')}</div>
                <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, marginBottom: 6 }}>{it.t}</h3>
                <p className="small text-mono" style={{ color: 'var(--text-3)' }}>{it.n}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <SectionHead eyebrow="DELIVERABLE / 納品物" title="診断レポート (PDF・約30ページ)"/>
          <div className="grid-2" style={{ gap: 48, alignItems: 'center' }}>
            <Placeholder label="Report" caption="diagnosis-report.pdf" aspect="4/3"/>
            <div className="stack-m">
              <div className="row" style={{ gap: 12 }}><span className="text-accent"><Icon name="check" size={18} stroke={2}/></span><span style={{ fontSize: 15 }}>カテゴリー別スコア (10点満点)</span></div>
              <div className="row" style={{ gap: 12 }}><span className="text-accent"><Icon name="check" size={18} stroke={2}/></span><span style={{ fontSize: 15 }}>競合 3 社との比較</span></div>
              <div className="row" style={{ gap: 12 }}><span className="text-accent"><Icon name="check" size={18} stroke={2}/></span><span style={{ fontSize: 15 }}>優先度別の改善提案</span></div>
              <div className="row" style={{ gap: 12 }}><span className="text-accent"><Icon name="check" size={18} stroke={2}/></span><span style={{ fontSize: 15 }}>概算改善コスト</span></div>
              <div className="row" style={{ gap: 12 }}><span className="text-accent"><Icon name="check" size={18} stroke={2}/></span><span style={{ fontSize: 15 }}>30 分の無料レビュー MTG (オプション)</span></div>
            </div>
          </div>
        </div>
      </section>
      <CDCards title={DIAGNOSIS_CONTENT.categories.title} sub={DIAGNOSIS_CONTENT.categories.sub} items={DIAGNOSIS_CONTENT.categories.items}/>

      <CTAStrip onContact={() => onContact('diagnosis')} title="3営業日後、レポートが届きます。" sub="フォーム送信から3営業日以内に、診断レポート (PDF) をメールでお送りします。"/>
    </main>
  );
}

// ============================================================
// QUICK DIAGNOSIS (1分診断)
// ============================================================
function QuickDiagnosisPage({ onNavigate, onContact }) {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const questions = [
    { id: 'industry', q: "業種を教えてください", options: ["クリニック・医療", "不動産", "建築・工務店", "人材", "小売 / EC", "AIスタートアップ", "その他"] },
    { id: 'team', q: "サイト運用の人数規模は?", options: ["専任なし (兼任のみ)", "1名", "2〜3名", "4名以上"] },
    { id: 'pain', q: "今いちばん困っていることは?", options: ["問い合わせが少ない", "ブログ更新が止まる", "デザインが古い", "AI活用したい", "DXを進めたい"] },
    { id: 'budget', q: "想定予算レンジは?", options: ["〜50万円", "50〜150万円", "150〜500万円", "500万円〜", "未定"] },
  ];
  const setAns = (val) => {
    setAnswers({ ...answers, [questions[step].id]: val });
    setTimeout(() => {
      if (step < questions.length - 1) setStep(step + 1);
      else setStep(questions.length);
    }, 200);
  };
  const reset = () => { setStep(0); setAnswers({}); };
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "無料診断", id: "diagnosis" }, { label: "クイック診断" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="QUICK / クイック診断"
        title={<>1分で、<br/>次の一手がわかる。</>}
        lede="4つの質問に答えるだけ。Nortiq Labs が推奨するサービスプランを、その場でご提案します。"
        badges={["所要 1 分", "4 質問", "詳細診断にもつなげられます"]}
        onContact={onContact}
      />
      <section className="section-pad">
        <div className="container" style={{ maxWidth: 720 }}>
          {step < questions.length ? (
            <div className="card" style={{ padding: 48 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 32 }}>
                <span className="step-num">QUESTION / {String(step + 1).padStart(2, '0')} OF {String(questions.length).padStart(2, '0')}</span>
                <div style={{ flex: 1, marginLeft: 24, height: 4, background: 'var(--bg-2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((step + 1) / questions.length) * 100}%`, background: 'var(--accent)', transition: 'width 300ms' }}></div>
                </div>
              </div>
              <h3 className="display-s" style={{ marginBottom: 32 }}>{questions[step].q}</h3>
              <div className="stack-m">
                {questions[step].options.map((o) => (
                  <button key={o} onClick={() => setAns(o)} className="quick-opt">
                    {o}<Icon name="arrow-right" size={14}/>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
                <Icon name="check" size={24} stroke={1.8}/>
              </div>
              <h3 className="display-s" style={{ marginBottom: 16 }}>診断結果</h3>
              <p className="lede" style={{ marginBottom: 28 }}>
                {answers.pain === "ブログ更新が止まる" ? "AIチャットボットの導入が最優先です。" :
                 answers.pain === "DXを進めたい" ? "DX・ML サービスのご提案が適しています。" :
                 "Web制作からの段階的なアプローチをおすすめします。"}
              </p>
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 32, textAlign: 'left' }}>
                <p className="small text-mono" style={{ color: 'var(--text-3)', marginBottom: 12 }}>YOUR ANSWERS</p>
                {Object.entries(answers).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-3)' }}>{questions.find(q => q.id === k).q}</span>
                    <span style={{ color: 'var(--text)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
                <Button variant="primary" onClick={onContact} arrow>詳細相談する</Button>
                <Button variant="ghost" onClick={reset}>もう一度診断する</Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// ============================================================
// SUBSIDY (IT導入補助金)
// ============================================================
function SubsidyPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "補助金活用相談" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="SUBSIDY / 補助金を活用した DX 導入"
        title={<>補助金を活用した<br/>DX導入のご相談。</>}
        lede="IT導入補助金をはじめとする補助金の活用を視野に入れた、DX投資の進め方をご相談いただけます。"
        badges={["補助金活用のご相談", "段階的なDX投資", "初回相談無料"]}
        onContact={() => onContact('subsidy')}
        ctaLabel="DX導入の相談をする"
      />
      <section className="section-pad">
        <div className="container">
          <SectionHead eyebrow="OVERVIEW / 制度の概要" title="IT導入補助金とは（一般情報）"/>
          <p className="lede" style={{ maxWidth: 820, margin: '0 auto 32px' }}>
            IT導入補助金は、中小企業・小規模事業者が業務効率化やDXのためにITツールを導入する費用の一部を補助する国の制度です。枠ごとに補助上限・補助率の目安が定められています（下記は制度の一般的な区分です）。
          </p>
          <div className="grid-3">
            <SubsidyCard tl="通常枠 A 類型" amount="30〜150" unit="万円" rate="1/2 補助" desc="業務効率化ツールの導入（クラウド利用料を含む）"/>
            <SubsidyCard tl="通常枠 B 類型" amount="150〜450" unit="万円" rate="1/2 補助" desc="複数業務にまたがる業務基盤の導入" featured/>
            <SubsidyCard tl="デジタル化基盤" amount="〜350" unit="万円" rate="2/3 〜 3/4" desc="EC / 会計 / 受発注 / 決済のデジタル化"/>
          </div>
          <p className="small" style={{ color: 'var(--text-3)', maxWidth: 820, margin: '24px auto 0', lineHeight: 1.8 }}>
            ※ 補助金の申請には、登録された「IT導入支援事業者」との連携が必要です。Nortiq Labs は現在 IT導入支援事業者の登録を準備中で、登録後は申請サポートまで対応予定です。現時点では、補助金活用を前提とした DX 導入の方向性・進め方のご相談を承っています。最新の制度内容・補助上限・補助率は公募要領をご確認ください。
          </p>
        </div>
      </section>
      <SubsidySections onNavigate={onNavigate} onContact={onContact}/>

      <CTAStrip onContact={() => onContact('subsidy')} title="補助金を活用したDX投資について、相談しませんか。" sub="初回相談は無料です。現状をうかがい、補助金活用を含めた進め方をご提案します。"/>
    </main>
  );
}

function SubsidyCard({ tl, amount, unit, rate, desc, featured }) {
  return (
    <div className={`card${featured ? '' : ''}`} style={featured ? { borderColor: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 5%, var(--surface))' } : {}}>
      <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 14, letterSpacing: '-0.01em' }}>{tl}</h3>
      <div className="num" style={{ fontSize: 38, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em' }}>{amount}<sub style={{ fontSize: 14, color: 'var(--text-3)', marginLeft: 4, fontWeight: 500 }}>{unit}</sub></div>
      <div className="tag" style={{ marginTop: 12, marginBottom: 18, color: 'var(--accent)', borderColor: 'var(--accent)' }}>{rate}</div>
      <p className="body" style={{ fontSize: 13, margin: 0 }}>{desc}</p>
    </div>
  );
}

function ProcessStep({ title, desc, n }) {
  return (
    <li className="process-item">
      <div className="process-num text-mono">{n ? <span>STEP {n}</span> : null}</div>
      <div>
        <h3 style={{ fontSize: 19, fontWeight: 500, margin: 0, marginBottom: 6 }}>{title}</h3>
        <p className="body" style={{ fontSize: 14, margin: 0 }}>{desc}</p>
      </div>
    </li>
  );
}

// ============================================================
// GUIDEBOOK
// ============================================================
function GuidebookPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "サービス紹介資料" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="SALES DECK / サービス紹介資料"
        title={<>成果につながる、<br/>コーポレートサイトを。</>}
        lede="Nortiq Labs のWeb制作サービスをまとめた営業資料 (PDF・全11ページ)。制作の進め方・実績・料金プラン・制作の流れまで、これ一冊でご確認いただけます。"
        badges={["全11ページ", "無料DL", "Web制作 / DX"]}
        onContact={onContact}
        ctaLabel="資料を無料DLする"
      />
      <section className="section-pad">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 56, alignItems: 'flex-start' }}>
            <div className="guidebook-viewer">
              <iframe
                src="assets/Nortiq_Service_Deck.pdf#view=FitH"
                title="Nortiq Labs サービス紹介資料 (全11ページ)"
                loading="lazy"
              />
            </div>
            <div>
              <h3 className="display-s" style={{ marginBottom: 24 }}>掲載内容</h3>
              <ol style={{ paddingLeft: 20, lineHeight: 2.2, fontSize: 15 }}>
                <li>よくある課題 — 今のサイト、こんな状態になっていませんか</li>
                <li>制作サービス — 設計から公開、その後の運用まで</li>
                <li>制作実績・ポートフォリオ — 数字と事例</li>
                <li>選ばれる理由 — シリコンバレー水準の技術を中小企業の現場に</li>
                <li>料金プラン — ライト / スタンダード / プレミアム</li>
                <li>制作の流れ — お問い合わせから最短で</li>
                <li>成果の声</li>
                <li>会社概要・代表 — チームと歩み</li>
                <li>無料相談のご案内</li>
              </ol>
              <div className="row" style={{ marginTop: 32, gap: 14, flexWrap: 'wrap' }}>
                <a className="btn btn-primary btn-lg" href="assets/Nortiq_Service_Deck.pdf" download>
                  <Icon name="arrow-down" size={16}/>無料ダウンロード (PDF)
                </a>
                <a className="btn btn-ghost btn-lg" href="assets/Nortiq_Service_Deck.pdf" target="_blank" rel="noopener">
                  別タブで全文を読む<Icon name="arrow-right" size={14}/>
                </a>
              </div>
              <p className="small text-mono" style={{ color: 'var(--text-3)', marginTop: 16 }}>PDF · 全11ページ · 約4.7MB</p>
            </div>
          </div>
        </div>
      </section>
      <CDCards title={GUIDEBOOK_CONTENT.who.title} sub={GUIDEBOOK_CONTENT.who.sub} items={GUIDEBOOK_CONTENT.who.items}/>
      <CDSteps title={GUIDEBOOK_CONTENT.after.title} sub={GUIDEBOOK_CONTENT.after.sub} items={GUIDEBOOK_CONTENT.after.items}/>
      <CDFaq title="よくある質問" items={GUIDEBOOK_CONTENT.faqs}/>
      <CTAStrip onContact={onContact}/>
    </main>
  );
}

// ============================================================
// COLUMN (記事一覧)
// ============================================================
function ColumnPage({ onNavigate, onContact }) {
  const store = (typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {};
  const articles = Object.values(store);
  const [cat, setCat] = React.useState('すべて');
  const cats = ['すべて', ...Array.from(new Set(articles.map(a => a.category)))];
  const shown = cat === 'すべて' ? articles : articles.filter(a => a.category === cat);
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "コラム / 技術ブログ" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="COLUMN / コラム・技術ブログ"
        title={<>技術と DX の<br/>現場から。</>}
        lede="Nortiq Labs が執筆する、調査データに基づく技術ブログとコラム。AI・SEO・DX・業種別の実務知見をお届けします。"
        badges={["DX観察記", "技術解説", "業種別", "AI 活用"]}
        onContact={onContact}
        ctaLabel="新着メルマガを購読"
      />
      <section className="section-pad">
        <div className="container">
          <div className="row" style={{ marginBottom: 32, gap: 8, flexWrap: 'wrap' }}>
            {cats.map((c) => (
              <button key={c} className="kw-pill" onClick={() => setCat(c)} style={cat === c ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}>{c}</button>
            ))}
          </div>
          <div className="grid-3" style={{ gap: 32 }}>
            {shown.map((a) => (
              <a key={a.slug} className="article-card" style={{ cursor: 'pointer' }} {...navProps('article-' + a.slug, onNavigate)}>
                <ArticleCover article={a}/>
                <div className="article-meta">
                  <span style={{ color: 'var(--accent)' }}>{a.category}</span>
                  <span className="article-meta-sep">·</span>
                  <span>{a.date}</span>
                  {a.updated && a.updated !== a.date && (
                    <>
                      <span className="article-meta-sep">·</span>
                      <span>{a.updated} 更新</span>
                    </>
                  )}
                  <span className="article-meta-sep">·</span>
                  <span>{a.read} read</span>
                </div>
                <h3 className="article-title">{a.title}</h3>
              </a>
            ))}
          </div>
        </div>
      </section>
      <CTAStrip onContact={onContact}/>
    </main>
  );
}

// ============================================================
// COMPANY (会社概要)
// ============================================================
function CompanyPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "会社概要" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="COMPANY / 会社概要"
        title={<>Nortiq Labs、<br/>と申します。</>}
        lede="米国の AI 研究背景を持つエンジニアと、日本の経営課題に向き合うコンサルタントによる、技術と現場の両輪を持つチームです。"
        badges={["設立 2025", "本社 京都市中京区", "従業員 5 名"]}
        onContact={onContact}
        ctaLabel="採用情報"
        subCta="チーム紹介"
        watermark="ABOUT"
        pageNo="04"
      />

      {/* Timeline */}
      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">沿革</h2>
            <p className="section-sub fadein">HISTORY</p>
          </div>
          <ol className="timeline" style={{ maxWidth: 900, margin: '0 auto' }}>
            <li className="timeline-item fadein">
              <div className="timeline-date">2025</div>
              <div className="timeline-content">
                <h3>創業 / Nortiq Labs Inc. 設立</h3>
                <p>代表 Renta Oshima が、米国 UC Berkeley での AI 研究背景をもとに、日本の中小企業向け DX 支援を専門とする会社として京都で創業。</p>
              </div>
            </li>
            <li className="timeline-item fadein" data-delay="80">
              <div className="timeline-date">2025</div>
              <div className="timeline-content">
                <h3>3 段階ファネル (Web → AI → DX) を確立</h3>
                <p>地域密着型クリニックのリニューアル等を起点に、Web 制作から AI・DX へ段階的に伴走する支援モデルを形成。</p>
              </div>
            </li>
            <li className="timeline-item fadein" data-delay="160">
              <div className="timeline-date">2025〜2026</div>
              <div className="timeline-content">
                <h3>ブログボット（AI投稿アシスタント）開発 / 業種横断で支援拡大</h3>
                <p>WordPress ブログ更新を AI で支援する内製プロダクトを開発。クリニック・不動産・建築・人材・小売・AIスタートアップ等、累計 20 社の制作・DX 支援を展開。</p>
              </div>
            </li>
            <li className="timeline-item fadein" data-delay="240">
              <div className="timeline-date">2026</div>
              <div className="timeline-content">
                <h3>自社プロダクトの研究開発を本格化</h3>
                <p>VetoNet (AI agent security) とテニスフォーム分析 SaaS の研究開発を進め、技術検証の成果を商用案件にフィードバック。</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">基本情報</h2>
            <p className="section-sub fadein">OVERVIEW</p>
          </div>
          <dl className="company-table">
            {[
              ["商号", "Nortiq Labs Inc. (株式会社ノーティック ラボ)"],
              ["設立", "2025年"],
              ["代表取締役", "Renta Oshima"],
              ["所在地", "〒604-0012 京都府京都市中京区竪大恩寺町 751"],
              ["資本金", "100 万円"],
              ["従業員数", "5 名"],
              ["事業内容", "Web 制作 / AI チャットボット開発 / DX・ML 実装 / 自社プロダクト開発"],
              ["主要取引銀行", "三菱UFJ銀行"],
              ["お問い合わせ", "サイトの問い合わせフォームより承ります"],
            ].map(([k, v]) => (
              <div key={k} className="company-row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">アクセス</h2>
            <p className="section-sub fadein">ACCESS</p>
          </div>
          <div className="split-row">
            <div className="split-visual">
              <Placeholder label="MAP" caption="map / kyoto" aspect="4/5"/>
            </div>
            <div>
              <p className="body" style={{ marginBottom: 18 }}>
                〒604-0012 京都府京都市中京区竪大恩寺町 751
              </p>
              <p className="small" style={{ color: 'var(--text-3)' }}>
                ご来社の際は事前にご連絡ください。<br/>
                受付時間: 平日 9:30〜17:00
              </p>
              <div style={{ marginTop: 24 }}>
                <Button variant="ghost" onClick={onContact}>来社予約する<Icon name="arrow-right" size={14}/></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTAStrip onContact={onContact}/>
    </main>
  );
}

// ============================================================
// STAFF
// ============================================================
function StaffPage({ onNavigate, onContact }) {
  const members = [
    { role: "Founder · 代表", name: "Renta Oshima", desc: "米国 UC Berkeley で AI 研究。日本の中小企業向け DX 支援を起業。事業全体と顧客並走の責任者。", tags: ["AI Research", "Full-stack", "JP / EN"], img: "assets/staff-founder.jpg" },
    { role: "CTO · Computer Scientist", name: "Takenosuke", desc: "計算理論・分散システムが専門。自社プロダクト VetoNet (AI Security) とテニスフォーム分析 SaaS の開発主担当 兼 CTO。", tags: ["Distributed", "Security", "Rust"], img: "assets/staff-cto.jpg" },
    { role: "Data Scientist", name: "Ashwin", desc: "AI のコア部分を担うデータサイエンティスト。統計モデリングと ML 実装のエキスパートとして、分析基盤の設計から実装までを牽引。", tags: ["Statistics", "ML Core", "MLOps"], img: "assets/staff-ds.jpg" },
  ];
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "チーム / スタッフ" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="STAFF / チーム"
        title={<>専門家が、<br/>専門家として並走する。</>}
        lede="Founder / CTO・Computer Scientist / Data Scientist — 各領域のプロが、お客様1社にチーム編成で並走します。"
        badges={["代表 3 名体制", "米国 1 拠点", "全員フルリモートOK"]}
        onContact={onContact}
      />
      <section className="section-pad">
        <div className="container">
          <div className="grid-3" style={{ gap: 24 }}>
            {members.map((m, i) => (
              <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <Placeholder label="" caption="" aspect="3/4" src={m.img} alt={`Nortiq Labs ${m.role} ${m.name}`}/>
                <div style={{ padding: 24 }}>
                  <p className="small text-mono" style={{ color: 'var(--text-3)', marginBottom: 4 }}>{m.role}</p>
                  <h3 style={{ fontSize: 19, fontWeight: 600, margin: 0, marginBottom: 12, letterSpacing: '-0.01em' }}>{m.name}</h3>
                  <p className="body" style={{ fontSize: 13, margin: 0, marginBottom: 14 }}>{m.desc}</p>
                  <div className="row-tight" style={{ gap: 6 }}>
                    {m.tags.map(t => <span key={t} className="tag" style={{ background: 'var(--bg-2)', fontSize: 10 }}>{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CTAStrip onContact={onContact}/>
    </main>
  );
}

// ============================================================
// SITEMAP — full IA proof
// ============================================================
function SitemapPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "サイトマップ" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="SITEMAP"
        title="サイトマップ"
        lede="Nortiq Labs サイト内の全ページをご案内します。"
        onContact={onContact}
      />
      <section className="section-pad">
        <div className="container">
          <div className="sitemap-grid">
            <SitemapCol heading="トップ" onNavigate={onNavigate} links={[{ id: 'top', label: 'トップ' }]}/>
            <SitemapCol heading="機能 (サービス別)" onNavigate={onNavigate} links={[
              { id: 'web', label: 'Web制作 機能一覧' },
              { id: 'chatbot', label: 'AIチャットボット 機能一覧' },
              { id: 'dx', label: 'DX・ML 機能一覧' },
              { id: 'feature-lpo', label: 'LP制作 / LPO' },
              { id: 'feature-recruit', label: '採用専門サイト' },
              { id: 'feature-analytics', label: 'アクセス解析カスタム実装' },
            ]}/>
            <SitemapCol heading="自社プロダクト" onNavigate={onNavigate} links={[
              { id: 'product-vetonet', label: 'VetoNet (AI Security)' },
              { id: 'product-wpchat', label: 'ブログボット（AI投稿アシスタント）' },
              { id: 'product-tennis', label: 'Tennis フォームチェック' },
            ]}/>
            <SitemapCol heading="業種ソリューション" onNavigate={onNavigate} links={[
              { id: 'solution-clinic', label: 'クリニック・医療' },
              { id: 'solution-realty', label: '不動産' },
              { id: 'solution-build',  label: '建築・工務店' },
              { id: 'solution-hr',     label: '人材' },
              { id: 'solution-retail', label: '小売 / EC' },
            ]}/>
            <SitemapCol heading="制作実績 (業種別)" onNavigate={onNavigate} links={[
              { id: 'works', label: '全実績一覧' },
              { id: 'works-clinic', label: 'クリニック・医療' },
              { id: 'works-realty', label: '不動産' },
              { id: 'works-build', label: '建築・工務店' },
              { id: 'works-hr', label: '人材' },
              { id: 'works-retail', label: '小売 / EC' },
              { id: 'works-infra', label: 'インフラ・製造' },
              { id: 'works-ai', label: 'AIスタートアップ' },
              { id: 'work-detail', label: '実績詳細サンプル' },
            ]}/>
            <SitemapCol heading="制作実績 (LP/動画)" onNavigate={onNavigate} links={[
              { id: 'works-lp-corp', label: 'コーポレートLP' },
              { id: 'works-lp-recruit', label: '採用LP' },
              { id: 'works-lp-ec', label: 'EC連動LP' },
              { id: 'works-video', label: '動画制作事例' },
            ]}/>
            <SitemapCol heading="サポート・コンサル" onNavigate={onNavigate} links={[
              { id: 'support', label: '運用サポート' },
              { id: 'voice', label: 'ご利用会社様の声' },
              { id: 'diagnosis', label: 'サイト無料診断 (詳細)' },
              { id: 'quick-diagnosis', label: 'クイック診断 (1分)' },
            ]}/>
            <SitemapCol heading="メディア・コンテンツ" onNavigate={onNavigate} links={[
              { id: 'column',         label: 'コラム / 技術ブログ' },
              { id: 'news',           label: 'お知らせ' },
              { id: 'guidebook',      label: 'サービス紹介資料' },
              { id: 'subsidy',        label: '補助金活用相談' },
            ]}/>
            <SitemapCol heading="ご案内" onNavigate={onNavigate} links={[
              { id: 'pricing',  label: '料金プラン' },
              { id: 'company',  label: '会社概要' },
              { id: 'staff',    label: 'チーム / スタッフ' },
              { id: 'recruit',  label: '採用情報' },
              { id: 'sitemap',  label: 'サイトマップ' },
            ]}/>
            <SitemapCol heading="法務" onNavigate={onNavigate} links={[
              { id: 'privacy',          label: 'プライバシーポリシー' },
              { id: 'terms',            label: '利用規約' },
              { id: 'privacy-handling', label: '個人情報の取扱い' },
            ]}/>
          </div>
        </div>
      </section>
      <CTAStrip onContact={onContact}/>
    </main>
  );
}

function SitemapCol({ heading, links, onNavigate }) {
  return (
    <div>
      <h3 className="sitemap-h">{heading}</h3>
      <ul className="sitemap-list">
        {links.map(l => (
          <li key={l.id}>
            <a {...navProps(l.id, onNavigate)}>
              {l.label}<Icon name="arrow-right" size={11}/>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// Generic info page (for feature-* and product-* and works-lp-*)
// ============================================================
const GENERIC_PAGES = {
  'feature-cms':       { eyebrow: "FEATURE / CMS", title: "CMS / 記事更新システム", lede: "WordPress / MDX を、業務フローに最適化。AI 投稿ツールと連動した、現代的な記事更新フローを構築します。" },
  'feature-lpo':       { eyebrow: "FEATURE / LPO", title: "LP制作 / LPO", lede: "コンバージョン特化の LP 制作と、継続的な改善 (LPO) を一気通貫で。広告連動も得意領域です。" },
  'feature-recruit':   { eyebrow: "FEATURE / 採用", title: "採用専門サイト", lede: "応募率を最大化する採用LP・コーポレートサイト。コピーから写真ディレクションまで。" },
  'feature-analytics': { eyebrow: "FEATURE / 解析", title: "アクセス解析カスタム実装", lede: "GA4 / GSC / 独自解析を統合し、経営判断に直結するダッシュボードをカスタム実装します。" },
  'product-vetonet':   { eyebrow: "PRODUCT / 研究開発", title: "VetoNet — AI Security", lede: "AI Agent の振る舞いを検証する研究開発プロダクト。Nortiq Labs の技術研究の柱。", badges: ["β preview", "Python / Rust", "AI Security"] },
  'product-wpchat':    { eyebrow: "PRODUCT / 主力", title: "ブログボット（AI投稿アシスタント）", lede: "WordPress ブログ更新が止まる、を解決。質問するだけで記事が書ける自社プロダクト。", badges: ["GA リリース", "TypeScript / Next.js", "OpenAI / Claude"] },
  'product-tennis':    { eyebrow: "PRODUCT / SaaS", title: "Tennis フォームチェック SaaS", lede: "Computer Vision を応用した、テニスフォーム分析 SaaS。一般ユーザー向けの自社プロダクト。", badges: ["Public beta", "MediaPipe", "FastAPI"] },
  'works-lp-corp':     { eyebrow: "WORKS / コーポレートLP", title: "コーポレートサイト 実績", lede: "上場準備・IRに耐える総合コーポレートサイトの制作実績を集約しました。" },
  'works-lp-recruit':  { eyebrow: "WORKS / 採用LP", title: "採用LP 実績", lede: "応募率を高める採用専門 LP の制作実績を集約しました。" },
  'works-lp-ec':       { eyebrow: "WORKS / EC連動", title: "EC連動LP 実績", lede: "実店舗 × オンラインを連動させる送客 LP の制作実績を集約しました。" },
  'works-video':       { eyebrow: "WORKS / 動画", title: "動画制作事例", lede: "Web 連動の動画制作・動画 SEO 案件の事例を集約しました。" },
};

function GenericPage({ pageId, onNavigate, onContact }) {
  const meta = GENERIC_PAGES[pageId] || { eyebrow: "PAGE", title: "Coming Soon", lede: "このページは近日公開予定です。" };
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: meta.title.replace(/<br\/>/g, '') }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow={meta.eyebrow}
        title={meta.title}
        lede={meta.lede}
        badges={meta.badges || ["近日 詳細追加"]}
        onContact={onContact}
      />
      <section className="section-pad">
        <div className="container">
          <SectionHead eyebrow="DETAIL" title="近日詳細を追加します。" lede="お急ぎの方は、お問い合わせフォームよりご連絡ください。"/>
          <div className="row" style={{ gap: 12 }}>
            <Button variant="primary" onClick={onContact} arrow>このサービスについて相談</Button>
            <Button variant="ghost" onClick={() => onNavigate('top')}>トップに戻る</Button>
          </div>
        </div>
      </section>
      <CTAStrip onContact={onContact}/>
    </main>
  );
}

Object.assign(window, {
  WorksPage, VoicePage, SupportPage, PricingPage,
  DiagnosisPage, QuickDiagnosisPage, SubsidyPage, GuidebookPage,
  ColumnPage, CompanyPage, StaffPage, SitemapPage, GenericPage,
});
