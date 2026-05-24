// ============================================================
// Nortiq Labs — Service Pages (Web制作 / AIチャットボット / DX・ML)
// ============================================================

// ---------------- Shared sub-components ----------------
// PageHero is imported from components.jsx (global). Local definition removed.

function PainList({ items }) {
  return (
    <div className="pain-grid">
      {items.map((it, i) => (
        <div key={i} className="pain-item">
          <div className="pain-mark">PAIN — {String(i + 1).padStart(2, '0')}</div>
          <h3 style={{ fontSize: 19, fontWeight: 500, margin: 0, marginTop: 4, lineHeight: 1.5 }}>{it.title}</h3>
          {it.desc && <p className="body" style={{ fontSize: 14, marginTop: 4 }}>{it.desc}</p>}
        </div>
      ))}
    </div>
  );
}

function FeatureList({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {items.map((it, i) => (
        <div key={i} style={{ background: 'var(--bg)', padding: 36 }}>
          <div className="row" style={{ marginBottom: 20, justifyContent: 'space-between' }}>
            <span className="step-num">/ {String(i + 1).padStart(2, '0')}</span>
            <span style={{ color: 'var(--accent)' }}><Icon name="check" size={18} stroke={1.8}/></span>
          </div>
          <h3 className="display-s" style={{ fontSize: 22, marginBottom: 10 }}>{it.title}</h3>
          <p className="body" style={{ fontSize: 14 }}>{it.desc}</p>
        </div>
      ))}
    </div>
  );
}

function PricingTable({ rows, featuredIndex = 1 }) {
  return (
    <div className="price-grid">
      {rows.map((r, i) => (
        <div key={i} className={`price-card ${i === featuredIndex ? 'featured' : ''}`}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="step-num">{r.plan}</span>
            {i === featuredIndex && <span className="tag" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>RECOMMENDED</span>}
          </div>
          <div className="stack-s">
            <div className="price-amount num">
              {r.amount}{r.unit && <sub>{r.unit}</sub>}{r.from && <sup>{r.from}</sup>}
            </div>
            <p className="small" style={{ color: 'var(--text-3)' }}>{r.tagline}</p>
          </div>
          <ul className="price-features">
            {r.features.map((f, j) => (
              <li key={j}>
                <span className="check"><Icon name="check" size={14} stroke={1.8}/></span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 1) Web 制作
// ============================================================
function WebPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <PageHero
        eyebrow="STEP 01 / WEB 制作"
        title={<>ただ作るだけのサイトは、<br/>もう作りません。</>}
        watermark="WEB"
        pageNo="01"
        lede="集客と問い合わせ獲得を前提に設計する Web 制作。WordPress / 静的サイト / Next.js を、目的に合わせて適切に選びます。"
        badges={["WordPress", "Next.js", "WCAG 2.1 AA", "Core Web Vitals Good", "30万円〜"]}
        onContact={() => onContact('web')}
      />

      {/* PAINS */}
      <section className="section-pad-sm">
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 18 }}>PROBLEMS / こんな課題ありませんか</div>
          <h2 className="display-m" style={{ marginBottom: 56, maxWidth: 880 }}>
            「作っただけ」のサイトで止まっていませんか?
          </h2>
          <PainList items={[
            { title: "問い合わせが、来ない", desc: "ヒーローに何を載せるか・どこに CTA を置くかが設計されていないと、訪問者は迷って離脱します。" },
            { title: "ブログの更新が、止まる", desc: "WordPress を導入したが結局誰も更新できない、結果 SEO 流入も伸びない。" },
            { title: "デザインが、古臭い", desc: "5〜10年前のテンプレートのまま。スマホで見づらく、競合と比較した時に見劣りします。" },
            { title: "公開後、何も伸びない", desc: "運用設計がなく、Google Analytics を見ても何を改善すべきか判断できない。" },
          ]}/>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <SectionHead
            eyebrow="FEATURES / Nortiq Labs の Web 制作"
            title="ただの Web 制作会社では、ありません。"
            lede="3 段階ファネルを設計に組み込みつつ、Web 制作単体の発注も歓迎しています。"
          />
          <FeatureList items={[
            { title: "段階的 DX 視野での設計", desc: "「公開して終わり」ではなく、AIチャットボット / DX 実装への接続を最初から見据えた構造で設計します。" },
            { title: "WordPress と Next.js、両方プロ", desc: "更新性重視なら WordPress、パフォーマンス・拡張性重視なら Next.js。プロジェクトに合わせて選定。" },
            { title: "集客導線の組み込み", desc: "ヒアリングでターゲットと検索キーワードを言語化し、コンテンツ構成 / 内部リンク / SEO までを一気通貫設計。" },
            { title: "Core Web Vitals Good 全域", desc: "LCP 1.5s 以下を標準目標として実装。フッターにスコアバッジを表示するレベルで、技術的に妥協しません。" },
            { title: "アクセシビリティ WCAG 2.1 AA", desc: "業界標準準拠。コンプライアンス重視の企業の選定基準もクリアします。" },
            { title: "バイリンガル対応可", desc: "必要に応じて日本語 × 英語の二言語サイトも構築。米国チームの強みを活かしたコピーライティングも。" },
          ]}/>
        </div>
      </section>

      {/* PROCESS */}
      <section className="section-pad">
        <div className="container">
          <SectionHead
            eyebrow="PROCESS / 制作プロセス"
            title="6 ステップで、確実に。"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 64, alignItems: 'flex-start' }}>
            <ol className="process-list" style={{ counterReset: 'step' }}>
              <ProcessStep title="ヒアリング" desc="現状の課題、ターゲット、目標。30〜60分のオンライン MTG。"/>
              <ProcessStep title="情報設計・ワイヤフレーム" desc="サイトマップ、ページ別ワイヤ、コピーの方向性をドキュメントで提示。"/>
              <ProcessStep title="デザイン" desc="ヒーロー含む主要ページの hi-fi デザイン。レビュー2回まで含む。"/>
              <ProcessStep title="開発・実装" desc="WordPress または Next.js での実装。ステージング環境でのレビューを並行。"/>
              <ProcessStep title="公開・移行" desc="DNS 切替、旧 URL からの 301 リダイレクト、GA4 / GSC 設定。"/>
              <ProcessStep title="運用・改善" desc="公開後 3 ヶ月のサポート期間中、月次レビュー会で改善施策を実行。"/>
            </ol>
            <div style={{ position: 'sticky', top: 100 }}>
              <Placeholder label="Process Diagram" caption="6 steps · web build" aspect="4/5" src="assets/process-6steps.png" fit/>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <SectionHead
            eyebrow="PRICING / Web 制作の料金"
            title="3 つのプラン、明朗会計。"
            lede="目安レンジです。実際の費用はヒアリング後にご提案します。"
            align="center"
          />
          <PricingTable rows={[
            {
              plan: "LIGHT",
              amount: "30",
              unit: "万円〜",
              tagline: "コーポレートサイトの新規制作・刷新",
              features: [
                "5〜8 ページ程度",
                "レスポンシブ対応",
                "お問い合わせフォーム",
                "GA4 / GSC 初期設定",
                "公開後1ヶ月のサポート",
              ],
            },
            {
              plan: "STANDARD",
              amount: "60",
              unit: "万円〜",
              tagline: "集客重視のサイト構築 + SEO",
              features: [
                "10〜20 ページ程度",
                "ブログ機能 (WordPress / MDX)",
                "業種別 LP 1〜2 本制作",
                "SEO 内部対策",
                "公開後3ヶ月のサポート",
                "月次改善レビュー",
              ],
            },
            {
              plan: "PREMIUM",
              amount: "120",
              unit: "万円〜",
              tagline: "Next.js による高速サイト + AI 機能組み込み",
              features: [
                "Next.js / Vercel 構築",
                "Core Web Vitals Good 保証",
                "WCAG 2.1 AA 準拠",
                "AIチャットボット組み込み",
                "公開後6ヶ月のサポート",
                "アクセス解析カスタム実装",
              ],
            },
          ]}/>
        </div>
      </section>

      {/* WORKS */}
      <section className="section-pad">
        <div className="container">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 18 }}>WORKS / Web 制作の実績</div>
              <h2 className="display-m">業種を超えて、つくってきました。</h2>
            </div>
            <Button variant="text">すべての実績を見る<Icon name="arrow-right" size={13}/></Button>
          </div>
          <div className="grid-3">
            <WorkCard tag="クリニック" title="地域密着型クリニックのリニューアル" stat="問い合わせ 2.4×" services={["Web制作", "AIチャットボット"]} src="assets/hero-05.png"/>
            <WorkCard tag="不動産" title="都内不動産仲介の集客サイト構築" stat="月間PV 3.1×" services={["Web制作", "SEO"]} src="assets/work-pleast.png"/>
            <WorkCard tag="AI スタートアップ" title="シードラウンド時の Tech 企業 LP" stat="商談化率 4.2×" services={["Web制作"]} src="assets/hero-08.png"/>
          </div>
        </div>
      </section>

      {/* NEXT STEP */}
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
            <div>
              <div className="eyebrow eyebrow-accent" style={{ marginBottom: 18 }}>NEXT STEP / 段階的に</div>
              <h2 className="display-m" style={{ marginBottom: 20 }}>
                サイト公開後、AIチャットボットで<br/>さらに効率化できます。
              </h2>
              <p className="lede">
                Web 制作の段階で AIチャットボット導入を見据えた構造にしておけば、後から組み込む時のコストを大幅に下げられます。
              </p>
              <div style={{ marginTop: 32 }}>
                <Button variant="ghost" onClick={() => onNavigate('chatbot')}>STEP 02 を見る<Icon name="arrow-right" size={14}/></Button>
              </div>
            </div>
            <Placeholder label="Funnel · 02" caption="AI 投稿アシスタント (next step)" aspect="4/3" src="assets/pdf/loop-ai-04.png" fit/>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-pad">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 64, alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 18 }}>FAQ / よくある質問</div>
              <h2 className="display-m">不安は、先に解消。</h2>
            </div>
            <FAQ items={[
              { q: "納期はどのくらいですか?", a: "Light プランで 4〜6 週間、Standard で 8〜12 週間、Premium で 12〜16 週間を目安にしています。コンテンツの準備状況によって変動します。" },
              { q: "WordPress と Next.js、どちらを選べばいいですか?", a: "ブログ更新を社内で頻繁に行いたい場合は WordPress、更新頻度よりパフォーマンスや拡張性を重視する場合は Next.js を推奨します。初回ヒアリングで一緒に決定します。" },
              { q: "ロゴやデザインの素材がないのですが?", a: "ブランドガイドラインから一緒に整える形でも対応可能です。必要に応じてデザイナーをアサインします。" },
              { q: "公開後のサポート範囲は?", a: "Light は1ヶ月、Standard は3ヶ月、Premium は6ヶ月のサポートを含みます。それ以降は月次保守契約 (月2〜5万円〜) で継続可能です。" },
              { q: "契約形態は?", a: "請負契約が基本ですが、長期の改善伴走をご希望の場合は準委任契約 (月額) もご相談いただけます。" },
              { q: "助成金・補助金は使えますか?", a: "IT導入補助金などの活用を視野に入れた DX 投資のご相談を承っています。なお、補助金申請の手続きサポート（登録 IT 導入支援事業者としての対応）は現在準備中です。" },
            ]}/>
          </div>
        </div>
      </section>

      <CTAStrip onContact={() => onContact('web')} />
    </main>
  );
}

function ProcessStep({ title, desc }) {
  return (
    <li className="process-item">
      <div className="process-num text-mono"></div>
      <div>
        <h3 style={{ fontSize: 19, fontWeight: 500, margin: 0, marginBottom: 6 }}>{title}</h3>
        <p className="body" style={{ fontSize: 14, margin: 0 }}>{desc}</p>
      </div>
    </li>
  );
}

// ============================================================
// 2) AIチャットボット
// ============================================================
function ChatbotPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <PageHero
        eyebrow="STEP 02 / AIチャットボット"
        title={<>WordPress のブログ更新が止まる、<br/>を解決します。</>}
        watermark="AI"
        pageNo="02"
        lede="質問するだけで記事が書ける、Nortiq Labs 内製の AIチャットボット 投稿ツール。SEO 流入を止めないための、現実解です。"
        badges={["自社プロダクト", "WordPress 連携", "OpenAI / Claude", "10万円〜"]}
        onContact={() => onContact('chatbot')}
        subCta="デモを見る"
      />

      {/* SPIRAL OF DECLINE */}
      <section className="section-pad-sm">
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 18 }}>THE SPIRAL / 衰退の連鎖</div>
          <h2 className="display-m" style={{ marginBottom: 56, maxWidth: 880 }}>
            ブログが止まると、問い合わせも止まります。
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'stretch' }}>
            {[
              { n: "01", t: "ブログ更新の停止", d: "リソース不足 / ネタ切れ / 担当者の退職" },
              { n: "02", t: "SEO 流入の低下", d: "新規記事ゼロ → 検索順位が徐々に後退" },
              { n: "03", t: "サイトへの訪問が減る", d: "競合のメディアに、検索流入を奪われる" },
              { n: "04", t: "問い合わせが、来なくなる", d: "気付いた頃には、再起動コストが高い" },
            ].map((it, i) => (
              <div key={i} style={{
                padding: 24,
                background: i === 3 ? 'var(--surface)' : 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderColor: i === 3 ? 'var(--accent)' : 'var(--border)',
                borderRadius: 'var(--radius-lg)',
                position: 'relative',
              }}>
                <div className="step-num" style={{ marginBottom: 16 }}>{it.n}</div>
                <h3 style={{ fontSize: 17, fontWeight: 500, margin: 0, marginBottom: 8, color: i === 3 ? 'var(--accent)' : 'var(--text)' }}>{it.t}</h3>
                <p className="small" style={{ color: 'var(--text-2)' }}>{it.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="eyebrow eyebrow-accent" style={{ marginBottom: 18 }}>SOLUTION / 解決策</div>
              <h2 className="display-m" style={{ marginBottom: 24 }}>
                質問するだけで、<br/>記事が書けます。
              </h2>
              <p className="lede" style={{ marginBottom: 28 }}>
                AIチャットボットに質問しながら骨子を作り、本文展開、WordPress 投稿までを自動化。<span style={{ color: 'var(--text)' }}>月 2 本のブログ運用が、月 1 時間で回せます。</span>
              </p>
              <div className="stack-m" style={{ marginBottom: 32 }}>
                <SolutionBullet n="01" title="質問するだけで骨子作成" desc="チャット形式で要点をヒアリングし、見出し構造を提案"/>
                <SolutionBullet n="02" title="本文展開 + 画像生成" desc="プロンプトに沿って本文を肉付け、必要に応じて画像生成も"/>
                <SolutionBullet n="03" title="WordPress に直接投稿" desc="ドラフト or 公開を選択、SEO メタ情報も自動生成"/>
              </div>
              <Button variant="primary" onClick={() => onContact('chatbot')} arrow>導入の相談をする</Button>
            </div>
            <div className="stack-m">
              <Placeholder label="Desktop UI" caption="A · Notion-style (PC)" aspect="4/3" src="assets/chatbot-ui-desktop.png" fit/>
              <Placeholder label="Mobile UI" caption="C · iPhone" aspect="4/5" src="assets/chatbot-ui-mobile.png" fit/>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="section-pad">
        <div className="container">
          <SectionHead
            eyebrow="RESULTS / 導入による効果"
            title="数字で見る、導入後の変化。"
            lede="既存顧客 (Web 制作 → AIチャットボット 追加導入のお客様) の平均値です。"
          />
          <div className="grid-4" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', gap: 1, background: 'var(--border)' }}>
            <ResultStat num="6.2" unit="×" label="投稿頻度" sub="月平均 0.5本 → 3.1本"/>
            <ResultStat num="-87" unit="%" label="記事1本の工数" sub="平均 4.2h → 0.5h"/>
            <ResultStat num="1.8" unit="×" label="月間オーガニック流入" sub="6ヶ月後の比較"/>
            <ResultStat num="14" unit="位" label="平均順位の上昇幅" sub="主要キーワード"/>
          </div>
        </div>
      </section>

      {/* CASE STUDY */}
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 80, alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 18 }}>CASE / 導入事例</div>
              <h2 className="display-m" style={{ marginBottom: 28 }}>
                Web 制作後、半年で <span className="text-accent">AIチャットボット</span> も導入されたお客様
              </h2>
              <p className="lede" style={{ marginBottom: 24 }}>
                クリニック (東京・院長 50代) のケース。Web 制作のリニューアルから半年運用した後、ブログ更新が完全に止まっていることに気付き AIチャットボットを追加導入。
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
                <CaseLine label="導入前のブログ更新" before="3ヶ月で 0 本" after="月 4 本"/>
                <CaseLine label="記事 1 本の工数" before="3〜5 時間" after="20 分"/>
                <CaseLine label="オンライン予約数" before="月 28 件" after="月 51 件"/>
              </ul>
              <div style={{ marginTop: 36 }}>
                <Button variant="text">事例の詳細を見る<Icon name="arrow-right" size={13}/></Button>
              </div>
            </div>
            <Placeholder label="" caption="" aspect="3/4" src="assets/case-clinic-doctor.png" fit/>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section-pad">
        <div className="container">
          <SectionHead
            eyebrow="PRICING / 料金プラン"
            title="使った分だけ、効果が出る価格設計。"
            align="center"
          />
          <PricingTable rows={[
            { plan: "LIGHT", amount: "10", unit: "万円〜", tagline: "個人事業主・小規模事業者向け",
              features: ["月 5 記事まで生成", "WordPress 連携 1サイト", "メールサポート", "初期セットアップ込み"] },
            { plan: "STANDARD", amount: "25", unit: "万円〜", tagline: "中堅企業の標準導入プラン",
              features: ["月 20 記事まで生成", "WordPress 連携 3サイト", "FAQ チャットボット組み込み", "SEO 最適化機能", "Slack サポート", "月次改善レビュー"] },
            { plan: "PREMIUM", amount: "50", unit: "万円〜", tagline: "業務全体に AI を組み込む",
              features: ["生成数 無制限", "WordPress + 任意 CMS 連携", "カスタム ML モデル組み込み", "オンサイト導入研修", "専属サポート"] },
          ]}/>
        </div>
      </section>

      {/* TECH UNDER THE HOOD */}
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 18 }}>UNDER THE HOOD / 技術的な裏側</div>
              <h2 className="display-m" style={{ marginBottom: 24 }}>
                「ChatGPT を使うだけ」<br/>では、ありません。
              </h2>
              <p className="lede" style={{ marginBottom: 24 }}>
                独自の RAG パイプライン + Fine-tuning + 出力検証レイヤー で、業界特化の出力品質を担保しています。
              </p>
              <p className="body" style={{ marginBottom: 24 }}>
                Nortiq Labs 内製の AIチャットボットは、単純な API ラッパーではなく、業種別のプロンプト最適化と社内ナレッジ統合をフレームワーク化しています。<br/>
                技術的詳細はブログで公開しています。
              </p>
              <Button variant="text">技術ブログを読む<Icon name="arrow-right" size={13}/></Button>
            </div>
            <div className="stack-m">
              <div className="card" style={{ padding: 24, background: 'var(--bg)' }}>
                <div className="eyebrow" style={{ marginBottom: 14 }}>STACK</div>
                <div className="row-tight" style={{ gap: 8 }}>
                  {["TypeScript", "Next.js", "OpenAI", "Anthropic Claude", "Pinecone", "LangChain", "WordPress REST API", "Vercel"].map(s => (
                    <span key={s} className="tag" style={{ background: 'var(--surface)' }}>{s}</span>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: 24, background: 'var(--bg)' }}>
                <div className="eyebrow" style={{ marginBottom: 14 }}>SECURITY</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li className="body" style={{ fontSize: 14, display: 'flex', gap: 10 }}>
                    <span className="text-accent" style={{ marginTop: 4 }}><Icon name="check" size={13} stroke={2}/></span>
                    顧客データは学習に使用しない契約 (OpenAI / Anthropic 経由)
                  </li>
                  <li className="body" style={{ fontSize: 14, display: 'flex', gap: 10 }}>
                    <span className="text-accent" style={{ marginTop: 4 }}><Icon name="check" size={13} stroke={2}/></span>
                    全データを国内データセンター (AWS Tokyo) で処理
                  </li>
                  <li className="body" style={{ fontSize: 14, display: 'flex', gap: 10 }}>
                    <span className="text-accent" style={{ marginTop: 4 }}><Icon name="check" size={13} stroke={2}/></span>
                    SOC 2 Type II 準拠の運用フロー
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-pad">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 64, alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 18 }}>FAQ / よくある質問</div>
              <h2 className="display-m">気になる点を、先に。</h2>
            </div>
            <FAQ items={[
              { q: "AI が書いた記事だと SEO ペナルティになりませんか?", a: "Google は『AI 生成かどうか』ではなく『コンテンツの質』で評価する旨を明示しています。当ツールは事実情報の検証ステップと、業界特化の専門性チェックを経て公開する設計のため、適切に運用すればペナルティリスクはありません。" },
              { q: "業界固有の専門用語に対応できますか?", a: "はい。導入時に業界の知識ベース (社内ドキュメント・既存記事) を読み込ませる Fine-tuning フェーズがあります。クリニック・不動産・建築・人材など、すでに複数業種で運用実績があります。" },
              { q: "WordPress 以外の CMS でも使えますか?", a: "Premium プランで他 CMS (Shopify / Wix / Webflow / Headless CMS) との連携にも対応可能です。" },
              { q: "AI が間違った情報を書いたら、誰が責任を持ちますか?", a: "公開前の人間のレビューを必須としており、出力検証レイヤーで明らかな事実誤認は自動検出します。最終的な記事の責任は運用者にありますが、レビューに要する時間を最小化する仕組みを提供しています。" },
              { q: "解約・契約条件は?", a: "月次契約で、解約は1ヶ月前通知。導入後の縛り期間はありません。" },
            ]}/>
          </div>
        </div>
      </section>

      <CTAStrip onContact={() => onContact('chatbot')} />
    </main>
  );
}

function SolutionBullet({ n, title, desc }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 16, alignItems: 'flex-start' }}>
      <div className="num" style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, paddingTop: 2 }}>{n}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>{title}</div>
        <p className="body" style={{ fontSize: 14, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

function ResultStat({ num, unit, label, sub }) {
  return (
    <div style={{ background: 'var(--bg)', padding: '36px 32px' }}>
      <div className="num" style={{ fontSize: 56, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {num}<span style={{ fontSize: 24, color: 'var(--accent)', marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ marginTop: 16, fontSize: 15, fontWeight: 500 }}>{label}</div>
      <div className="small text-mono" style={{ color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function CaseLine({ label, before, after }) {
  return (
    <li style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto 1fr', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
      <span className="small" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="num" style={{ color: 'var(--text-3)', textDecoration: 'line-through', fontSize: 14 }}>{before}</span>
      <span className="text-accent" style={{ display: 'flex' }}><Icon name="arrow-right" size={14}/></span>
      <span className="num" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 500 }}>{after}</span>
    </li>
  );
}

// ============================================================
// 3) DX・ML
// ============================================================
function DXPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <PageHero
        eyebrow="STEP 03 / DX · ML"
        title={<>データを、本当の<br/>経営判断に変える。</>}
        watermark="DX"
        pageNo="03"
        lede="ML 実装 / 業務自動化 / データ分析基盤 / 生成 AI 業務組み込み。米国 UC Berkeley での研究背景を持つ代表のもと、Engineer × Data Scientist × Computer Scientist チームで本格 DX を伴走。"
        badges={["Python", "PyTorch / TF", "AWS / GCP", "MLOps", "50万円〜"]}
        onContact={() => onContact('dx')}
      />

      {/* WHY STAGED */}
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div className="eyebrow eyebrow-accent" style={{ marginBottom: 18 }}>VS AI 開発専業会社</div>
              <h2 className="display-m">
                <span className="text-accent">初期投資ゼロ</span>で<br/>スタートできます。
              </h2>
            </div>
            <div className="stack-m">
              <p className="lede">
                AI 開発専業会社は PoC で数百万、本開発で数千万のレンジ。中小企業には心理的・予算的ハードルが高い領域です。
              </p>
              <p className="body">
                Nortiq Labs は Web 制作 30 万円〜という低い入口から始められます。AIチャットボット導入 → DX/ML と段階展開し、検証しながら投資配分を決められるのが本質的な強みです。
              </p>
              <div style={{ marginTop: 24, padding: 24, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <ComparisonRow label="PoC 開始時の初期費用" them="200〜500万円" us="¥0 (Web/Chatbot から開始可)"/>
                <ComparisonRow label="本実装までの期間" them="6〜12ヶ月" us="検証ごとに段階リリース"/>
                <ComparisonRow label="撤退時の損失" them="数百万 (実装済み投資)" us="段階契約のため最小化"/>
                <ComparisonRow label="伴走範囲" them="ML 実装のみ" us="Web / Chatbot / DX 全域" last/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COVERAGE */}
      <section className="section-pad">
        <div className="container">
          <SectionHead
            eyebrow="COVERAGE / 対応領域"
            title="技術領域、明示します。"
            lede="守秘範囲では具体名を出せないものもありますが、対応技術の解像度を明示することで「ChatGPT を使ってるだけ」の会社と差別化します。"
          />
          <div className="grid-3" style={{ gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <CoverageCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="12" cy="12" r="3"/><circle cx="3" cy="12" r="2"/><circle cx="21" cy="12" r="2"/><circle cx="12" cy="3" r="2"/><circle cx="12" cy="21" r="2"/><path d="M9 9L5 5M19 5l-4 4M9 15l-4 4M19 19l-4-4"/></svg>}
              title="ML 実装"
              desc="分類・回帰・予測・推薦システム・異常検知。要件定義から PoC、本実装、運用まで。"
              tags={["scikit-learn", "PyTorch", "XGBoost", "TensorFlow"]}
            />
            <CoverageCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
              title="業務自動化"
              desc="LLM + ワークフローエンジンで、定型業務を自動化。RPA の進化形として位置付け。"
              tags={["LangChain", "n8n", "Zapier", "OpenAI Functions"]}
            />
            <CoverageCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>}
              title="データ分析基盤"
              desc="DWH 構築、ETL パイプライン、BI ダッシュボード。データドリブン経営の足場。"
              tags={["BigQuery", "dbt", "Airbyte", "Metabase"]}
            />
            <CoverageCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4"/></svg>}
              title="生成 AI 業務組み込み"
              desc="GPT / Claude / Gemini を、社内業務の中核に組み込む。RAG / Fine-tuning の選定から。"
              tags={["OpenAI", "Anthropic", "Pinecone", "Weaviate"]}
            />
            <CoverageCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>}
              title="Computer Vision"
              desc="画像認識・物体検知・OCR。Tennis フォームチェック SaaS の応用技術を活用。"
              tags={["MediaPipe", "YOLO", "OpenCV", "PyTorch Vision"]}
            />
            <CoverageCard
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              title="MLOps / Security"
              desc="モデルの本番運用、監視、再学習。AI agent security の研究 (VetoNet) の知見を応用。"
              tags={["MLflow", "Kubeflow", "Sentry", "GCP Vertex"]}
            />
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <SectionHead
            eyebrow="PROCESS / 導入プロセス"
            title="検証して、判断して、進める。"
            lede="一括契約ではなく、フェーズごとに検証して GO/NO-GO 判断ができる構造にしています。"
          />
          <div className="grid-4">
            <PhaseCard n="01" name="Hearing" duration="1〜2 週間" cost="無料" desc="課題の言語化、データの棚卸し、対象業務の特定。"/>
            <PhaseCard n="02" name="PoC" duration="4〜8 週間" cost="50〜150万円" desc="技術検証、フィージビリティ確認。終了時に GO/NO-GO 判断。"/>
            <PhaseCard n="03" name="Implementation" duration="2〜6 ヶ月" cost="200〜2,000万円" desc="本実装。アジャイル開発でマイルストーンごとにリリース。"/>
            <PhaseCard n="04" name="Operation" duration="継続" cost="月額 10〜50万円" desc="運用・監視・改善。MLOps による継続的な性能向上。"/>
          </div>
          <div style={{ marginTop: 32, padding: 24, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
            <p className="body" style={{ fontSize: 14 }}>
              <span className="text-accent" style={{ fontWeight: 500 }}>初期投資ゼロ</span> で Web/Chatbot から開始し、リソースが整ってから PoC へ。<span style={{ color: 'var(--text)' }}>この段階性が、Nortiq Labs の最大の強みです。</span>
            </p>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="section-pad">
        <div className="container">
          <SectionHead
            eyebrow="TEAM / 担当チーム"
            title="技術背景を、隠しません。"
            lede="米国 UC Berkeley での研究背景を持つ代表のもとに集まった技術チーム。Engineer / Data Scientist / Computer Scientist の三職能が連携します。"
          />
          <div className="grid-3">
            <TeamCard role="Founder · 代表" name="Renta Oshima" desc="米国 UC Berkeley で AI 研究。日本の中小企業向け DX 支援を起業。" tags={["AI Research", "Full-stack", "JP / EN"]} src="assets/staff-founder.jpg"/>
            <TeamCard role="Data Scientist" name="D.S." desc="AI のコア部分を担う。統計モデリング・ML 実装のエキスパート。" tags={["Statistics", "ML Core", "MLOps"]} src="assets/staff-ds.jpg"/>
            <TeamCard role="CTO · Computer Scientist" name="C.S." desc="計算理論・分散システム。VetoNet とテニス分析 SaaS の開発主担当 兼 CTO。" tags={["Distributed", "Security", "Rust"]} src="assets/staff-cto.jpg"/>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section-pad" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <SectionHead
            eyebrow="PRICING / 料金目安"
            title="個別見積、ただし透明に。"
            lede="プロジェクトの内容によりレンジが広いため、目安として記載します。"
            align="center"
          />
          <PricingTable rows={[
            { plan: "POC", amount: "50", unit: "万円〜", tagline: "技術検証フェーズ",
              features: ["要件定義", "データ前処理", "プロトタイプ実装", "フィージビリティレポート", "GO/NO-GO 判断"] },
            { plan: "IMPLEMENTATION", amount: "200", unit: "万円〜", tagline: "本実装フェーズ",
              features: ["本番品質の実装", "MLOps 構築", "監視・アラート設定", "ドキュメント整備", "社内研修", "3ヶ月の運用支援"] },
            { plan: "OPERATION", amount: "10", unit: "万円/月〜", tagline: "継続運用",
              features: ["モデルの監視・再学習", "週次レポート", "改善施策の実装", "緊急対応"] },
          ]} featuredIndex={1}/>
        </div>
      </section>

      <CTAStrip onContact={() => onContact('dx')} title="まずは初回ヒアリング (無料) から。" sub="現状のデータ、業務、目標を 60 分で整理。可能性のあるアプローチをその場でご提案します。"/>
    </main>
  );
}

function ComparisonRow({ label, them, us, last }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 16, padding: '14px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span className="small" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="small" style={{ color: 'var(--text-3)', textDecoration: 'line-through' }}>{them}</span>
      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{us}</span>
    </div>
  );
}

function CoverageCard({ icon, title, desc, tags }) {
  return (
    <div style={{ background: 'var(--bg)', padding: 32, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--accent)', marginBottom: 20 }}>{icon}</div>
      <h3 style={{ fontSize: 19, fontWeight: 500, margin: 0, marginBottom: 10 }}>{title}</h3>
      <p className="body" style={{ fontSize: 14, marginBottom: 20 }}>{desc}</p>
      <div className="row-tight">
        {tags.map(t => <span key={t} className="tag" style={{ background: 'var(--surface)' }}>{t}</span>)}
      </div>
    </div>
  );
}

function PhaseCard({ n, name, duration, cost, desc }) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
        <span className="step-num">{n}</span>
        <span className="tag">{duration}</span>
      </div>
      <h3 style={{ fontSize: 22, fontWeight: 600, margin: 0, marginBottom: 8, letterSpacing: '-0.01em' }}>{name}</h3>
      <div className="num" style={{ fontSize: 17, fontWeight: 500, color: 'var(--accent)', marginBottom: 14 }}>{cost}</div>
      <p className="body" style={{ fontSize: 13, margin: 0 }}>{desc}</p>
    </div>
  );
}

function TeamCard({ role, name, desc, tags, src }) {
  return (
    <div className="card">
      <Placeholder label={src ? "" : role.split(' · ')[0]} caption="" aspect="4/5" src={src} alt={`Nortiq Labs ${role} ${name}`}/>
      <div style={{ marginTop: 24 }}>
        <p className="small text-mono" style={{ color: 'var(--text-3)', marginBottom: 6 }}>{role}</p>
        <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 12, letterSpacing: '-0.01em' }}>{name}</h3>
        <p className="body" style={{ fontSize: 14, marginBottom: 18 }}>{desc}</p>
        <div className="row-tight">
          {tags.map(t => <span key={t} className="tag" style={{ background: 'var(--bg-2)' }}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}

// Export
Object.assign(window, { WebPage, ChatbotPage, DXPage });
