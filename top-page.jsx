// ============================================================
// Nortiq Labs — Top page (matches Nortiq IA spec section order)
// ============================================================

// Descriptive alt text for the hero marquee + reason-card images, keyed by
// filename, so the alt matches the actual image (real work screenshots).
const IMG_ALT = {
  'work-asia-exchange': '外国人材組合 Asia Exchange Cooperative サイトの制作実績',
  'work-pleast': '不動産投資ブランド PLEAST サイトの制作実績',
  'work-renewal': '建物リニューアル・大規模修繕サイトの制作実績',
  'work-rakuyu': 'RAKUYU-Z 工法協会サイトの制作実績',
  'work-cocopa': 'ゴルフリゾート COCOPA サイトの制作実績',
  'work-taketora': '京都の骨董店 TAKETORA 越境ECサイトの制作実績',
  'work-panza': '京都のキッチンカー panza ブランドLPの制作実績',
  'work-aozora-family': 'あおぞら Family Clinic サイトの制作実績',
  'work-aozora-naika': 'あおぞら内科クリニック予約サイトの制作実績',
};
function altFor(src) {
  const m = String(src || '').match(/([^/]+)\.(png|jpe?g|webp)$/i);
  return (m && IMG_ALT[m[1]]) || 'Nortiq Labs の制作実績イメージ';
}

function TopPage({ onNavigate, onContact }) {
  useFadeIn();
  useCardSpotlight();
  useMagnetic();
  return (
    <main className="page-fade">

      {/* =========== HERO: 4-col vertical scroll bg + 3 medals =========== */}
      <section className="main-wrap">
        <span className="geo-blob b1"></span>
        <span className="geo-blob b2"></span>
        <span className="geo-blob b3"></span>
        <div className="main-wordmark-bg" aria-hidden="true">NORTIQ LABS</div>

        <div className="main-bg" aria-hidden="true">
          <VScrollCol direction="down" images={["assets/hero-01.png", "assets/work-asia-exchange.png", "assets/hero-02.png", "assets/work-pleast.png", "assets/hero-03.png", "assets/work-renewal.png", "assets/hero-04.png", "assets/work-rakuyu.png"]}/>
          <VScrollCol direction="up"   images={["assets/work-cocopa.png", "assets/hero-05.png", "assets/work-pleast.png", "assets/hero-06.png", "assets/work-asia-exchange.png", "assets/hero-07.png", "assets/work-renewal.png", "assets/hero-08.png"]}/>
          <VScrollCol direction="down" images={["assets/hero-02.png", "assets/work-rakuyu.png", "assets/hero-04.png", "assets/work-cocopa.png", "assets/hero-06.png", "assets/work-taketora.png", "assets/hero-08.png", "assets/work-pleast.png"]}/>
          <VScrollCol direction="up"   images={["assets/work-panza.png", "assets/hero-01.png", "assets/work-asia-exchange.png", "assets/hero-03.png", "assets/work-cocopa.png", "assets/hero-05.png", "assets/work-renewal.png", "assets/hero-07.png"]}/>
        </div>

        <div className="main-inner">
          <div className="main-eyebrow fadein">NORTIQ LABS · KYOTO</div>

          <h1 className="main-title">
            <span className="reveal-line"><span>日本のDX、</span></span>
            <span className="reveal-line"><span><span className="accent">世界水準で</span>巻き返す。</span></span>
          </h1>

          <ul className="main-box fadein" data-delay="200">
            <li>Web制作</li><li>AIチャットボット</li><li>DX・ML</li><li>業務自動化</li><li>データ分析</li>
          </ul>

          <ul className="main-medaru fadein" data-delay="300">
            <li className="medaru">
              <div className="num"><Counter to={20} suffix="" className=""/><sup>社+</sup></div>
              <div className="lbl">制作・支援実績</div>
            </li>
            <li className="medaru">
              <div className="num"><Counter to={5} suffix="" className=""/><sup>名</sup></div>
              <div className="lbl">少数精鋭チーム</div>
            </li>
            <li className="medaru">
              <div className="num"><Counter to={7} suffix="" className=""/><sup>業種</sup></div>
              <div className="lbl">対応業種</div>
            </li>
          </ul>

          <div className="main-cta-row fadein" data-delay="400">
            <span className="btn-pulse btn-magnet" style={{ display: 'inline-block' }}>
              <Button variant="primary" size="lg" onClick={onContact} arrow>資料請求はこちら</Button>
            </span>
            <Button variant="ghost" size="lg" onClick={() => onNavigate('diagnostic')}><Icon name="search" size={14}/>ホームページ無料診断</Button>
          </div>
        </div>
      </section>

      {/* =========== Mix marquee (stats + values) =========== */}
      <MixMarquee items={[
        { num: "20+", text: "Companies Supported" },
        { num: "5", text: "Team Members" },
        { num: "2025", text: "Founded" },
        { num: "24h", text: "Response SLA" },
        { num: "30万", text: "Web 制作 開始価格" },
        { num: "7", text: "業種カバー" },
        { num: "3", text: "段階的 DX ファネル" },
        { num: "0", text: "AI 重大インシデント" },
      ]}/>

      {/* =========== FC strip ================= */}
      <div className="fc-strip">
        <div className="fc-strip-track">
          {[...Array(2)].map((_, dup) => (
            <React.Fragment key={dup}>
              {["クリニック", "不動産", "建築", "工務店", "人材", "小売", "AIスタートアップ", "士業", "教育", "インフラ", "製造", "NPO/自治体"].map(t => (
                <span key={t + dup} className="fc-cell">▸ {t}</span>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* =========== 導入実績 (Case Study) =========== */}
      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">導入実績</h2>
            <p className="section-sub fadein">CASE STUDY</p>
          </div>
          <div className="case-slider">
            {[
              { tag: "外国人材組合", title: "高い技術と安全性、組合の総合刷新", q: "Webのプロが横にいる感覚を、初めて持てました。", author: "理事 A.K.", img: "assets/work-asia-exchange.png" },
              { tag: "不動産投資", title: "PLEAST 新時代の不動産投資ブランド構築", q: "他社は提案止まりだが、Nortiqは実装まで持ち切ってくれた。", author: "経営企画 T.M.", img: "assets/work-pleast.png" },
              { tag: "建築・リニューアル", title: "建物リニューアル × 大規模修繕の総合刷新", q: "工数が38%減って、現場が回り始めた。", author: "代表 S.W.", img: "assets/work-renewal.png" },
            ].map((c, i) => (
              <article key={i} className="case-card fadein" data-delay={i * 150}>
                <div className="shot-frame">
                  <Placeholder label={c.tag} caption="case study" aspect="16/10" src={c.img} alt={`${c.title}の導入実績`} fit/>
                </div>
                <div className="case-card-body">
                  <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 14 }}>
                    <span className="small text-mono" style={{ color: 'var(--text-3)' }}>CASE / {String(i+1).padStart(2,'0')}</span>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.55, margin: 0, marginBottom: 16 }}>{c.title}</h3>
                  <blockquote className="case-quote">「{c.q}」</blockquote>
                  <p className="small">― {c.author}</p>
                </div>
              </article>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Button variant="ghost" onClick={() => onNavigate('works')}>他の実績を見る<Icon name="arrow-right" size={14}/></Button>
          </div>
        </div>
      </section>

      {/* =========== PROMO BANNERS (補助金 / ガイドブック / AI) =========== */}
      <section className="section-pad-sm">
        <div className="container">
          <div className="promo-grid">
            <article className="promo-card fadein" onClick={() => onNavigate('subsidy')}>
              <div className="promo-tag">申請受付中</div>
              <div className="promo-num">01</div>
              <div className="promo-body">
                <p className="promo-eyebrow">SUBSIDY</p>
                <h3>補助金を活用した<br/>DX導入</h3>
                <p className="promo-desc">IT導入補助金などの活用を視野に、DX投資の進め方をご相談いただけます。</p>
              </div>
              <div className="promo-cta">詳しく見る <Icon name="arrow-right" size={14}/></div>
            </article>
            <article className="promo-card fadein" data-delay="120" onClick={() => onNavigate('guidebook')}>
              <div className="promo-tag">無料DL</div>
              <div className="promo-num">02</div>
              <div className="promo-body">
                <p className="promo-eyebrow">SALES DECK</p>
                <h3>Web制作<br/>サービス紹介資料</h3>
                <p className="promo-desc">制作の進め方・実績・料金プラン・制作の流れを一冊に。</p>
              </div>
              <div className="promo-cta">ダウンロード <Icon name="arrow-right" size={14}/></div>
            </article>
            <article className="promo-card promo-card-feature fadein" data-delay="240" onClick={() => onNavigate('product-wpchat')}>
              <div className="promo-tag">主力プロダクト</div>
              <div className="promo-num">03</div>
              <div className="promo-body">
                <p className="promo-eyebrow">AI PRODUCT</p>
                <h3>ブログボット<br/>AI投稿アシスタント</h3>
                <p className="promo-desc">質問するだけで記事が書ける、Nortiq Labs 内製プロダクト。</p>
              </div>
              <div className="promo-cta">プロダクト詳細 <Icon name="arrow-right" size={14}/></div>
            </article>
          </div>
        </div>
      </section>

      {/* =========== えらばれる理由 (6つの強み) =========== */}
      <section className="section-pad section-stripe" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">えらばれる理由</h2>
            <p className="section-sub fadein">STRONG · 6 POINTS</p>
            <p className="lede fadein" style={{ margin: '24px auto 0' }}>
              中小企業の DX を、20年遅れの常識ではなく米国基準で。<br/>
              Nortiq Labs が選ばれる 6 つの理由をご紹介します。
            </p>
          </div>
          <div className="reasons-grid">
            <ReasonCard num="01" emphasis="WEBサイトで他社と差別化" title="オリジナルデザイン" desc="テンプレ流用ではなく、業種・ブランドに合わせて毎回ゼロから設計。Core Web Vitals Good を標準担保。" link="制作実績一覧へ" delay={0} onClick={() => onNavigate('works')} src="assets/hero-01.png"/>
            <ReasonCard num="02" emphasis="専属チームで" title="コンサル・運用サポート" desc="月次アクセスレポート + 定期訪問 + 改善 MTG。「公開して終わり」を絶対にしない運用体制。" link="サポートについて詳しく見る" delay={150} onClick={() => onNavigate('support')} src="assets/hero-03.png"/>
            <ReasonCard num="03" emphasis="ホームページで" title="契約率を高める顧客管理" desc="ヒーロー / CTA配置 / フォーム設計まで、コンバージョン視点で構造化します。" link="機能サービス一覧へ" delay={300} onClick={() => onNavigate('web')} src="assets/hero-08.png"/>
            <ReasonCard num="04" emphasis="業種別の専門コンテンツ" title="無料で利用可能" desc="医療・不動産・建築など、業種ごとに最適化された記事構成テンプレを無料提供。" link="制作実績一覧へ" delay={450} onClick={() => onNavigate('works')} src="assets/work-asia-exchange.png"/>
            <ReasonCard num="05" emphasis="保守プラン内なら" title="公開後の修正にも対応" desc="軽微修正・テキスト変更は契約中の保守プランで対応可。プラン内回数を超える大規模変更は別途お見積もりさせていただきます。" link="HPサポートについて" delay={600} onClick={() => onNavigate('support')} src="assets/work-aozora-family.png"/>
            <ReasonCard num="06" emphasis="更新コンテンツで" title="独自のSEO強化を図る" desc="AI 投稿ツール + SEO 内部対策 + 業界キーワード設計を一体運用します。" link="SEO対策について" delay={750} onClick={() => onNavigate('chatbot')} src="assets/pdf/loop-ai-07.png"/>
          </div>
        </div>
      </section>

      {/* =========== BENTO: Inside Nortiq Labs =========== */}
      <section className="section-pad inside-dark" style={{ position: 'relative' }}>
        <ParticleNet/>
        <span className="section-no">SECTION / 04 — INSIDE</span>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">Inside Nortiq Labs</h2>
            <p className="section-sub fadein">なぜ私たちが「世界水準」と言えるのか</p>
            <p className="lede fadein" style={{ margin: '24px auto 0' }}>
              実績数字 / 自社プロダクト / 研究背景 / 運用体制 ─ 6つの角度から、Nortiq Labs の中身を開示します。
            </p>
          </div>
          <div className="bento">
            <div className="bento-cell bento-1 fadein" onClick={() => onNavigate('voice')}>
              <p className="bento-eyebrow">CLIENTS / 03</p>
              <div className="bento-num"><Counter to={20} suffix="+" className=""/></div>
              <h3 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.3, marginBottom: 12 }}>
                20 社の<br/>制作・DX 支援実績。
              </h3>
              <p>クリニック・不動産・建築・人材・小売・インフラ・AIスタートアップまで、業種横断で 20 社の制作・DX を支援しています。</p>
              <span className="bento-cta">実績を見る <Icon name="arrow-right" size={14}/></span>
            </div>
            <div className="bento-cell bento-2 fadein" data-delay="80" onClick={() => onNavigate('product-vetonet')}>
              <p className="bento-eyebrow">RESEARCH</p>
              <h3>VetoNet</h3>
              <p>生成 AI の出力を、誰がどう検証するか。「検証レイヤ」を設計する社内研究プロダクト。設計思想と Architecture をホワイトペーパで順次公開予定。</p>
              <span className="bento-cta">研究を見る <Icon name="arrow-right" size={14}/></span>
            </div>
            <div className="bento-cell bento-3 fadein" data-delay="160" onClick={() => onNavigate('staff')}>
              <p className="bento-eyebrow">TEAM</p>
              <div className="bento-num" style={{ fontSize: 42 }}>5<sub style={{ fontSize: 14, color: 'var(--text-3)' }}>名</sub></div>
              <p>Founder・エンジニア・データサイエンティストが連携する、少数精鋭チーム。</p>
            </div>
            <div className="bento-cell bento-4 fadein" data-delay="240" onClick={() => onNavigate('product-wpchat')}>
              <p className="bento-eyebrow">PRODUCT · 主力</p>
              <h3 style={{ color: 'var(--video-accent)' }}>ブログボット</h3>
              <p>WordPress ブログ更新が止まる、を解決する内製プロダクト。月の運用工数を <strong style={{ color: 'var(--video-accent)' }}>1/10</strong> に。</p>
              <span className="bento-cta" style={{ color: 'var(--video-accent)' }}>製品詳細 <Icon name="arrow-right" size={14}/></span>
            </div>
            <div className="bento-cell bento-5 fadein" data-delay="320" onClick={() => onNavigate('subsidy')}>
              <p className="bento-eyebrow">SUBSIDY · 2026</p>
              <h3 style={{ fontSize: 22 }}>補助金を活用した <span style={{ color: 'var(--accent)' }}>DX導入</span>のご相談。</h3>
              <p>IT導入補助金などの活用を視野に、DX投資の進め方をご相談いただけます。（申請サポートは登録準備中）</p>
              <span className="bento-cta">補助金詳細 <Icon name="arrow-right" size={14}/></span>
            </div>
            <div className="bento-cell bento-6 fadein" data-delay="400" onClick={() => onNavigate('support')}>
              <p className="bento-eyebrow">SUPPORT</p>
              <div className="bento-num" style={{ fontSize: 42, color: '#fff' }}>24<sub style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>h以内</sub></div>
              <p style={{ color: 'rgba(255,255,255,0.85)' }}>営業日 24 時間以内の一次返信を SLA として全社員で約束しています。</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========== Red CTA Strip =========== */}
      <RedCTAStrip onContact={onContact} onNavigate={onNavigate}/>

      {/* =========== ホームページ機能 (Feature 3 cards) =========== */}
      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">ホームページ機能</h2>
            <p className="section-sub fadein">HOMEPAGE FEATURE</p>
          </div>
          <div className="feature-trio">
            <FeatureTrioCard
              vertical="STEP 01"
              label="入口"
              titlePrefix="Web"
              titleSuffix="制作"
              sub="機能・サービス一覧"
              desc="集客と問い合わせ獲得を前提とした現代的なWebサイト。WordPress / Next.js から最適選定。"
              price="¥300,000〜"
              onClick={() => onNavigate('web')}
              delay={0}
            />
            <FeatureTrioCard
              vertical="STEP 02"
              label="主力"
              titlePrefix="AI"
              titleSuffix="チャットボット"
              sub="機能・サービス一覧"
              desc="質問するだけで記事が書ける投稿ツール。WordPress 更新が止まる、を解決。"
              price="¥100,000〜"
              featured
              onClick={() => onNavigate('chatbot')}
              delay={150}
            />
            <FeatureTrioCard
              vertical="STEP 03"
              label="本格"
              titlePrefix="DX"
              titleSuffix="・ML"
              sub="機能・サービス一覧"
              desc="ML 実装 / 業務自動化 / データ分析基盤 / 生成AI業務組み込み。"
              price="¥500,000〜"
              onClick={() => onNavigate('dx')}
              delay={300}
            />
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 36, gap: 14 }}>
            <Button variant="ghost" onClick={() => onNavigate('web')}>機能一覧はこちらから<Icon name="arrow-right" size={14}/></Button>
            <Button variant="primary" onClick={onContact}>サービス資料を請求する (無料)<Icon name="arrow-right" size={14}/></Button>
          </div>
        </div>
      </section>

      {/* =========== 制作実績ギャラリー (タブ式) =========== */}
      <GalleryTabs onNavigate={onNavigate}/>

      {/* =========== キーワード絞り込みタグ (5-color, scroll) =========== */}
      <section style={{ paddingBottom: 'clamp(48px, 7vw, 90px)' }}>
        <div className="container">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <h3 className="display-s">キーワードから探す</h3>
            <span className="small text-mono" style={{ color: 'var(--text-3)' }}>― FROM KEYWORDS</span>
          </div>
          <div className="kw-scroll">
            <div className="kw-row">
              {[
                ['クリニック', 'blue', false], ['不動産', 'green', true], ['建築', 'gold', false],
                ['工務店', 'blue2', false], ['人材', 'orange', false], ['小売', 'blue', true],
                ['EC連動', 'green', false], ['AIスタートアップ', 'gold', true], ['士業', 'blue2', false],
                ['教育', 'orange', false], ['インフラ', 'blue', false], ['製造', 'green', false],
                ['自治体', 'gold', false], ['NPO', 'blue2', false],
                ['クリニック', 'blue', false], ['不動産', 'green', true], ['建築', 'gold', false],
                ['工務店', 'blue2', false], ['人材', 'orange', false], ['小売', 'blue', true],
              ].map((k, i) => (
                <HashTag key={i} color={k[1]} big={k[2]} onClick={() => onNavigate('works')}>{k[0]}</HashTag>
              ))}
            </div>
            <div className="kw-row kw-row-rev">
              {[
                ['コーポレートLP', 'blue', true], ['採用LP', 'green', false], ['EC連動LP', 'orange', false],
                ['動画制作', 'blue2', true], ['動画SEO', 'gold', false], ['WordPress', 'blue', false],
                ['Next.js', 'green', false], ['AI記事生成', 'gold', true], ['FAQボット', 'blue2', false],
                ['ML分類', 'orange', false], ['予測モデル', 'blue', false], ['異常検知', 'green', false],
                ['業務自動化', 'gold', true], ['データ可視化', 'blue2', false],
                ['コーポレートLP', 'blue', true], ['採用LP', 'green', false], ['EC連動LP', 'orange', false],
                ['動画制作', 'blue2', true], ['動画SEO', 'gold', false], ['WordPress', 'blue', false],
              ].map((k, i) => (
                <HashTag key={i} color={k[1]} big={k[2]} onClick={() => onNavigate('works')}>{k[0]}</HashTag>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========== Tag Cloud (weighted) =========== */}
      <section style={{ paddingBottom: 'clamp(64px, 9vw, 110px)' }}>
        <div className="container">
          <div className="section-head" style={{ marginBottom: 40 }}>
            <h3 className="display-s fadein">扱う技術と業務領域</h3>
            <p className="section-sub fadein">TOPICS · WEIGHTED CLOUD</p>
          </div>
          <TagCloud
            onTagClick={() => onNavigate('column')}
            tags={[
              { label: "Web制作", w: 5 },
              { label: "AIチャットボット", w: 4 },
              { label: "DX", w: 5 },
              { label: "WordPress", w: 4 },
              { label: "Next.js", w: 3 },
              { label: "ML実装", w: 4 },
              { label: "業務自動化", w: 3 },
              { label: "データ分析", w: 3 },
              { label: "RAG", w: 2 },
              { label: "Fine-tuning", w: 2 },
              { label: "Computer Vision", w: 2 },
              { label: "MLOps", w: 2 },
              { label: "SEO", w: 4 },
              { label: "LPO", w: 3 },
              { label: "Core Web Vitals", w: 1 },
              { label: "WCAG", w: 1 },
              { label: "BigQuery", w: 1 },
              { label: "Looker", w: 1 },
              { label: "Anthropic", w: 2 },
              { label: "OpenAI", w: 2 },
              { label: "Pinecone", w: 1 },
              { label: "LangChain", w: 1 },
              { label: "MediaPipe", w: 1 },
              { label: "FastAPI", w: 1 },
              { label: "PyTorch", w: 2 },
              { label: "Rust", w: 1 },
            ]}
          />
        </div>
      </section>

      {/* =========== 作るだけじゃない (運用サポート) =========== */}
      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">作るだけじゃない。</h2>
            <p className="section-sub fadein">WE DON'T JUST MAKE IT</p>
            <p className="lede fadein" style={{ margin: '24px auto 0' }}>
              専属担当者からの<span className="highlight">「月次アクセス報告」「定期訪問」「活用勉強会の実施」</span>など、1社1社のWEB運用をサポートします。<br/>
              アクセス解析・ヒートマップなどのデータを蓄積し、Web 戦略をたて、運用のアドバイスをします。
            </p>
          </div>
          <div className="support-grid">
            {[
              { n: "01", t: "月次アクセス報告", d: "GA4 / GSC / 独自解析を統合したカスタムダッシュボードで、毎月の変化を可視化。" },
              { n: "02", t: "定期訪問・MTG",   d: "月1回のオンライン or オフライン MTG で、改善施策をその場で決定。" },
              { n: "03", t: "操作マニュアル整備", d: "WordPress / AI ツールの管理画面ごとに、画像付きの操作手順書をお渡しします。" },
              { n: "04", t: "ヒートマップ解析",   d: "どこで離脱するか、どこをクリックするか。データに基づくUI改善を提案。" },
            ].map((it, i) => (
              <div key={i} className="support-card fadein" data-delay={i * 120}>
                <div className="step-num" style={{ marginBottom: 16 }}>SUPPORT / {it.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 10 }}>{it.t}</h3>
                <p className="body" style={{ fontSize: 13, margin: 0 }}>{it.d}</p>
              </div>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 48, gap: 14 }}>
            <Button variant="ghost" onClick={() => onNavigate('support')}>コンサル・運用サポート<Icon name="arrow-right" size={14}/></Button>
            <Button variant="ghost" onClick={() => onNavigate('staff')}>スタッフ紹介<Icon name="arrow-right" size={14}/></Button>
          </div>
        </div>
      </section>

      {/* =========== 企業様の声 =========== */}
      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">実際にご利用いただいている企業様の声</h2>
            <p className="section-sub fadein">VOICE</p>
            <p className="lede fadein" style={{ margin: '24px auto 0' }}>
              Nortiq Labs では、<span className="highlight">ご利用いただいている企業様の声を何より大切</span>にしています。<br/>
              日々いただくリアルなご意見をもとに、サービスを磨き続けています。
            </p>
          </div>
          <div className="voice-bubbles">
            <VoiceBubble
              tag="クリニック (東京)"
              quote="Web制作からの付き合いで、半年後にAIチャットボットも導入。ブログ更新の負担がなくなり、SEO流入が1.8倍になりました。「Webのプロが横にいる」感覚を、初めて持てた気がします。"
              name="A.K."
              role="代表取締役・院長"
              src="assets/voice-clinic-ak.png"
              delay={0}
            />
            <VoiceBubble
              tag="中堅不動産 (大阪)"
              quote="他社は『AIできます』止まりだが、Nortiqは実装の中身まで説明してくれて納得感があった。米国の技術背景は伊達じゃない。判断材料がきちんと揃う、貴重なパートナーです。"
              name="T.M."
              role="経営企画"
              src="assets/voice-realty-tm.png"
              reversed
              delay={200}
            />
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 48, gap: 14 }}>
            <Button variant="ghost" onClick={() => onNavigate('voice')}>クライアント様からの声<Icon name="arrow-right" size={14}/></Button>
            <Button variant="ghost"><Icon name="search" size={14}/>Google 口コミ</Button>
          </div>
        </div>
      </section>

      {/* =========== コラム タブ =========== */}
      <ContentTabs onNavigate={onNavigate}/>

      {/* =========== 最新コラム (個別記事への内部リンク導線) =========== */}
      {(() => {
        const arts = Object.values((typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {}).slice(0, 3);
        if (!arts.length) return null;
        return (
          <section className="section-pad-sm">
            <div className="container">
              <div className="row" style={{ marginBottom: 32, justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h3 className="display-s">最新コラム</h3>
                  <p className="section-sub" style={{ marginTop: 4 }}>COLUMN / 技術ブログ</p>
                </div>
                <Button variant="ghost" onClick={() => onNavigate('column')}>すべての記事<Icon name="arrow-right" size={14}/></Button>
              </div>
              <div className="grid-3" style={{ gap: 32 }}>
                {arts.map((a) => (
                  <a key={a.slug} className="article-card" style={{ cursor: 'pointer' }} {...navProps('article-' + a.slug, onNavigate)}>
                    <ArticleCover article={a}/>
                    <div className="article-meta">
                      <span style={{ color: 'var(--accent)' }}>{a.category}</span>
                      <span className="article-meta-sep">·</span>
                      <span>{a.updated || a.date}{a.updated && a.updated !== a.date ? ' 更新' : ''}</span>
                    </div>
                    <h3 className="article-title">{a.title}</h3>
                  </a>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* =========== ピックアップ 3 バナー =========== */}
      <section className="section-pad-sm">
        <div className="container">
          <div className="row" style={{ marginBottom: 32, justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h3 className="display-s">PICK UP</h3>
              <p className="section-sub" style={{ marginTop: 4 }}>注目コンテンツ</p>
            </div>
          </div>
          <div className="pickup-grid">
            <PickupCard
              label="MAGAZINE"
              title="Nortiq 通信"
              desc="日本のDX、米国の最新、業界別の DX 観察記を月刊配信します。"
              accent="var(--tag-blue2)"
              onClick={() => onNavigate('column')}
            />
            <PickupCard
              label="LISTING"
              title="リスティング広告支援"
              desc="集客に効くリスティング広告、業種別キーワード設計から運用代行まで。"
              accent="var(--tag-orange)"
            />
            <PickupCard
              label="DIAGNOSIS"
              title="サイト無料診断"
              desc="現状の課題を、Nortiq 独自の30項目チェックリストで分析します。"
              accent="var(--accent)"
              onClick={() => onNavigate('diagnosis')}
            />
          </div>
        </div>
      </section>

      {/* =========== 大型インライン資料請求フォーム =========== */}
      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div className="section-head">
            <h2 className="section-title fadein">まずは無料で資料請求</h2>
            <p className="section-sub fadein">FREE REQUEST</p>
            <p className="lede fadein" style={{ margin: '24px auto 0' }}>
              Nortiq Labs だからこそのノウハウと、Web/AI/DX 各機能に関する資料をお送りします。
            </p>
          </div>
          <BigInlineForm/>
        </div>
      </section>

    </main>
  );
}

// ============================================================
// Sub-components
// ============================================================

function VScrollCol({ direction, images }) {
  const items = [...images, ...images];
  return (
    <div className={`main-col ${direction === 'up' ? 'main-col-rev' : ''}`}>
      <div className="main-col-track">
        {items.map((src, i) => (
          <div key={i} className="main-col-img">
            <Picture src={src} alt={altFor(src)} loading="lazy"/>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReasonCard({ num, emphasis, title, desc, link, onClick, delay, src }) {
  return (
    <article className="reason-card fadein" onClick={onClick} data-delay={delay}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
        <span className="reason-num">{num}</span>
        <Icon name="arrow-right" size={14}/>
      </div>
      <Placeholder label={title} caption={`reason / ${num}`} aspect="16/10" src={src} alt={altFor(src)} fit/>
      <div style={{ padding: '20px 0 0' }}>
        <p className="reason-emphasis">{emphasis}</p>
        <h3 className="reason-title">{title}</h3>
        <p className="reason-desc">{desc}</p>
        <span className="reason-link">{link}<Icon name="arrow-right" size={12}/></span>
      </div>
    </article>
  );
}

function WorkCard({ tag, title, stat, services, src }) {
  return (
    <div className="card card-link" style={{ padding: 0, overflow: 'hidden' }}>
      <Placeholder label="" caption="" aspect="16/10" src={src} alt={`${title}の制作実績`} fit/>
      <div style={{ padding: '20px 24px 24px' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="tag">{tag}</span>
          <span className="small text-mono text-accent" style={{ fontWeight: 700 }}>{stat}</span>
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, lineHeight: 1.5, marginBottom: 10 }}>{title}</h3>
        <div className="row-tight">
          {(services || []).map((s, i) => (
            <span key={i} className="small text-mono" style={{ color: 'var(--text-3)' }}>· {s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureTrioCard({ vertical, titlePrefix, titleSuffix, sub, desc, price, featured, onClick, delay }) {
  return (
    <article className={`feature-trio-card fadein${featured ? ' featured' : ''}`} onClick={onClick} data-delay={delay}>
      <div className="row" style={{ marginBottom: 18 }}>
        <span className="step-num">{vertical}</span>
      </div>
      <div className="feature-trio-title">
        <h3><span className="accent-block">{titlePrefix}</span>{titleSuffix}</h3>
        <p>{sub}</p>
      </div>
      <p className="body" style={{ fontSize: 13, marginTop: 18, marginBottom: 24, lineHeight: 1.9 }}>{desc}</p>
      <div className="feature-trio-price">{price}</div>
      <div className="feature-trio-cta">機能一覧を見る<Icon name="arrow-right" size={14}/></div>
    </article>
  );
}

function GalleryTabs({ onNavigate }) {
  const tabs2 = ["クリニック", "不動産", "建築", "人材", "コーポレート", "AI・DX"];
  const [tab, setTab] = React.useState(0);
  const data = [
    [
      { tag: "クリニック", t: "地域密着型クリニックのリニューアル (あおぞら Family Clinic)", stat: "問い合わせ 2.4×", route: 'works-clinic', img: "assets/work-aozora-family.png" },
      { tag: "クリニック", t: "内科クリニックの予約サイト構築 (あおぞら内科クリニック)", stat: "予約 +83%", route: 'works-clinic', img: "assets/work-aozora-naika.png" },
      { tag: "クリニック", t: "皮膚科ブランドサイト × 集客連動 (AIRA CLINIC GINZA)", stat: "PV 2.7×", route: 'works-clinic', img: "assets/hero-05.png" },
      { tag: "クリニック", t: "歯科医院の総合 LP 構築 (白藍 HAKURAN DENTAL)", stat: "予約 +110%", route: 'works-clinic', img: "assets/hero-04.png" },
      { tag: "クリニック", t: "美容外来のブランドサイト (クマ取り専門外来)", stat: "予約離脱 -42%", route: 'works-clinic', img: "assets/hero-06.png" },
      { tag: "クリニック", t: "クリニックグループのコーポレート (Tokyo Clinic Group)", stat: "応募 1.9×", route: 'works-clinic', img: "assets/case-clinic-doctor.png" },
    ],
    [
      { tag: "不動産", t: "新時代の不動産投資ブランド (PLEAST)", stat: "問合せ 3.2×", route: 'works-realty', img: "assets/work-pleast.png" },
      { tag: "不動産", t: "投資物件専門サイト × 物件管理 (ESTIA PARTNERS)", stat: "反響 2.7×", route: 'works-realty', img: "assets/work-estia.png", demo: "/showcase/estia/" },
      { tag: "不動産", t: "賃貸オーナー向け管理ポータル (オーナーズデスク)", stat: "工数 -45%", route: 'works-realty', img: "assets/work-ownersdesk.png", demo: "/showcase/ownersdesk/" },
      { tag: "不動産", t: "売却査定LPの刷新", stat: "査定依頼 +180%", route: 'works-realty' },
      { tag: "不動産", t: "中古リノベ専門のブランドサイト", stat: "問合せ 2.1×", route: 'works-realty', img: "assets/work-renewal.png" },
      { tag: "不動産", t: "テナント仲介のコーポレート", stat: "成約 +33%", route: 'works-realty' },
    ],
    [
      { tag: "建築", t: "大規模修繕・建物リニューアル (建設グループ)", stat: "問合せ 2.6×", route: 'works-build', img: "assets/work-renewal.png" },
      { tag: "建築", t: "不断水水替工法 RAKUYU-Z テクニカルサイト", stat: "BtoB商談 +210%", route: 'works-build', img: "assets/work-rakuyu.png" },
      { tag: "建築", t: "注文住宅メーカーの集客サイト", stat: "資料請求 2.6×", route: 'works-build', img: "assets/work-renewal.png" },
      { tag: "建築", t: "設計事務所のポートフォリオ刷新", stat: "問合せ 1.8×", route: 'works-build' },
      { tag: "建築", t: "外構工事会社のローカル SEO", stat: "MEO 1位", route: 'works-build' },
      { tag: "建築", t: "建材メーカーの製品 LP", stat: "BtoB 商談化 3.4×", route: 'works-build', img: "assets/work-rakuyu.png" },
    ],
    [
      { tag: "人材", t: "外国人材組合の総合ブランドサイト", stat: "応募 +84%", route: 'works-hr', img: "assets/work-asia-exchange.png" },
      { tag: "人材", t: "新卒採用ブランドサイト構築 (AXIA · NEW GRADUATES)", stat: "エントリー 2.1×", route: 'works-hr', img: "assets/hero-07.png" },
      { tag: "人材", t: "中途採用LP + リスティング連動", stat: "応募単価 -38%", route: 'works-hr' },
      { tag: "人材", t: "派遣会社の登録LP", stat: "登録 1.7×", route: 'works-hr' },
      { tag: "人材", t: "外国人材紹介の英日バイリンガル", stat: "海外PV 4×", route: 'works-hr', img: "assets/work-asia-exchange.png" },
      { tag: "人材", t: "業界特化型エージェント刷新", stat: "成約 +44%", route: 'works-hr' },
    ],
    [
      { tag: "コーポレート", t: "ゴルフリゾート (COCOPA) のブランドサイト", stat: "予約 1.9×", route: 'works-lp-corp', img: "assets/work-cocopa.png" },
      { tag: "コーポレート", t: "京都のキッチンカー (panza) ブランドLP", stat: "SNS流入 4.6×", route: 'works-lp-corp', img: "assets/work-panza.png" },
      { tag: "コーポレート", t: "京都の骨董店 (TAKETORA) バイリンガルEC", stat: "海外PV 5.2×", route: 'works-lp-corp', img: "assets/work-taketora.png" },
      { tag: "コーポレート", t: "AIスタートアップのシード期 LP", stat: "商談化率 4.2×", route: 'works-ai' },
      { tag: "コーポレート", t: "メーカーのコーポレート再構築", stat: "PV 1.6×", route: 'works-lp-corp', img: "assets/work-rakuyu.png" },
      { tag: "コーポレート", t: "コンサルファームのサービス紹介", stat: "DL +260%", route: 'works-lp-corp' },
    ],
    [
      { tag: "DX・アプリ", t: "中古フィギュア店の AI 在庫登録システム (TAKETORA)", stat: "AI同定 3層", route: 'works-retail' },
      { tag: "自社プロダクト", t: "ブログボット — AI投稿アシスタント", stat: "運用工数 1/10", route: 'product-wpchat', img: "assets/blog-blog-bot.png" },
      { tag: "研究開発", t: "VetoNet — AI エージェント検証レイヤ", stat: "白書公開予定", route: 'product-vetonet', img: "assets/vetonet-dashboard.png" },
      { tag: "自社プロダクト", t: "テニスフォームの AI 解析 SaaS", stat: "33関節 解析", route: 'product-tennis' },
      { tag: "小売", t: "サブスク EC のリピート率改善", stat: "解約率 -32%", route: 'works-retail', img: "assets/hero-01.png" },
      { tag: "不動産", t: "投資物件専門サイト × 物件管理", stat: "反響 2.7×", route: 'works-realty', img: "assets/work-pleast.png" },
    ],
  ];
  return (
    <section className="section-pad">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title fadein">制作実績</h2>
          <p className="section-sub fadein">PRODUCTION RESULTS</p>
          <p className="lede fadein" style={{ margin: '24px auto 0' }}>
            これまで20社のWEB戦略・運用支援実績をもとに、地域密着の中小企業を中心に幅広くサポートしています。<br/>
            ホームページ制作だけでなく、SEO・広告運用・反響分析・コンテンツ改善まで一貫対応。
          </p>
        </div>
        <div className="gallery-tabs fadein">
          {tabs2.map((t, i) => (
            <button key={t} className={`gallery-tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
        <div className="grid-3" style={{ marginTop: 32 }}>
          {data[tab].slice(0, 6).map((w, i) => (
            <a key={i} className="card card-link fadein" data-delay={i * 80} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
               {...(w.demo ? { onClick: (e) => { e.preventDefault(); openShowcase(w.demo, w.t); } } : navProps(w.route, onNavigate))}>
              <WorkShot work={{ img: w.img, title: w.t, tag: w.tag }}/>
              <div style={{ padding: '18px 22px 20px' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="tag">{w.tag}</span>
                  <span className="stat-pill">{w.stat}</span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.6 }}>{w.t}</h3>
                <span className="work-cta">{w.demo ? 'サイトをこの場で見る' : '実績の詳細を見る'}<Icon name="arrow-right" size={12}/></span>
              </div>
            </a>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Button variant="ghost" onClick={() => onNavigate('works')}>全実績一覧を見る<Icon name="arrow-right" size={14}/></Button>
        </div>
      </div>
    </section>
  );
}

function VoiceBubble({ tag, quote, name, role, reversed, delay, src }) {
  return (
    <figure className={`voice-bubble fadein${reversed ? ' reversed' : ''}`} data-delay={delay}>
      <div className="voice-avatar">
        <Placeholder label={src ? "" : tag} caption="" aspect="1/1" src={src} alt={`${name}（${role}）`} fit/>
      </div>
      <div className="voice-content">
        <blockquote>{quote}</blockquote>
        <figcaption>
          <strong>{name}</strong>
          <span style={{ color: 'var(--text-3)' }}>· {role}</span>
        </figcaption>
      </div>
    </figure>
  );
}

function ContentTabs({ onNavigate }) {
  const [tab, setTab] = React.useState(0);
  const data = [
    {
      label: "コラム",
      en: "COLUMN",
      items: [
        { date: "2026.05.12", title: "日本のDX、なぜ2〜3年遅れているのか", tag: "DX 観察記" },
        { date: "2026.04.28", title: "VetoNet 開発の裏側 — AI agent security とは何か", tag: "技術" },
        { date: "2026.04.14", title: "30万円でちゃんと集客できる Web サイトを作る方法", tag: "Web制作" },
        { date: "2026.03.30", title: "WordPress 更新が止まる本当の理由とその解決", tag: "AI活用" },
        { date: "2026.03.18", title: "Core Web Vitals Good の現実的な取り方", tag: "技術" },
      ],
      onCta: () => onNavigate('column'),
    },
  ];
  const t = data[tab];
  return (
    <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
      <div className="container">
        <div className="section-head">
          <h2 className="section-title fadein">Nortiq コンテンツ</h2>
          <p className="section-sub fadein">CONTENTS</p>
        </div>
        <div className="content-tabs fadein">
          {data.map((d, i) => (
            <button key={i} className={`content-tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>
              <span className="tl">{d.label}</span>
              <span className="en">{d.en}</span>
            </button>
          ))}
        </div>
        <div className="content-list fadein">
          {t.items.map((it, i) => (
            <a key={i} className="content-row" onClick={t.onCta}>
              <span className="content-date">{it.date}</span>
              <span className="content-tag-pill">{it.tag}</span>
              <span className="content-title">{it.title}</span>
              <Icon name="arrow-right" size={14}/>
            </a>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <Button variant="ghost" onClick={t.onCta}>{t.label} 一覧を見る<Icon name="arrow-right" size={14}/></Button>
        </div>
      </div>
    </section>
  );
}

function PickupCard({ label, title, desc, accent, onClick }) {
  return (
    <article className="pickup-card fadein" onClick={onClick}>
      <div className="pickup-accent" style={{ background: accent }}></div>
      <div style={{ padding: 28 }}>
        <p className="pickup-label" style={{ color: accent }}>{label}</p>
        <h3 className="pickup-title">{title}</h3>
        <p className="pickup-desc">{desc}</p>
        <span className="pickup-cta">詳しく見る <Icon name="arrow-right" size={14}/></span>
      </div>
    </article>
  );
}

Object.assign(window, { TopPage });
