// ============================================================
// Nortiq Labs — Detail pages
// Products (3) / Features (4) / Works variants (4)
// ============================================================

// ============================================================
// Shared mini components
// ============================================================
// subCta は subCtaTo (遷移先ルートID) + nav が揃ったときだけ描画する (PageHero と同じ理由)。
function DetailHero({ tag, title, lede, badges, onContact, ctaLabel = "資料請求はこちら", subCta = "デモを見る", subCtaTo, nav, visualLabel, visualCaption, visualSrc, visualAspect = "4/3" }) {
  return (
    <section style={{ paddingTop: 'clamp(56px, 8vw, 100px)', paddingBottom: 'clamp(48px, 6vw, 80px)', borderBottom: '4px solid var(--accent)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div className="main-eyebrow fadein" style={{ marginBottom: 24 }}>{tag}</div>
            <h1 className="display-xl fadein" data-delay="100" style={{ marginBottom: 24 }}>{title}</h1>
            <p className="lede fadein" data-delay="200" style={{ marginBottom: 32, maxWidth: 620 }}>{lede}</p>
            {badges && (
              <div className="row fadein" data-delay="300" style={{ marginBottom: 32 }}>
                {badges.map((b, i) => <span key={i} className="tag">{b}</span>)}
              </div>
            )}
            <div className="row fadein" data-delay="400" style={{ gap: 16 }}>
              <Button variant="primary" size="lg" onClick={onContact} arrow>{ctaLabel}</Button>
              {subCtaTo && nav && (
                <Button variant="ghost" size="lg" to={subCtaTo} nav={nav}>{subCta}<Icon name="arrow-right" size={14}/></Button>
              )}
            </div>
          </div>
          <div className="fadein" data-delay="200">
            <Placeholder
              label={visualLabel || tag.split(' / ')[1] || tag}
              caption={visualCaption || "product visual"}
              aspect={visualAspect}
              src={visualSrc}
              alt={`${tag.split(' / ')[1] || tag}のサービスイメージ`}
              fit
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function BulletGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {items.map((it, i) => (
        <div key={i} className="fadein" data-delay={i * 80} style={{ background: '#fff', padding: '32px 36px' }}>
          <div className="row" style={{ marginBottom: 16, justifyContent: 'space-between' }}>
            <span className="step-num">/ {String(i + 1).padStart(2, '0')}</span>
            <span style={{ color: 'var(--accent)' }}><Icon name="check" size={18} stroke={2}/></span>
          </div>
          <h3 style={{ fontSize: 19, fontWeight: 700, margin: 0, marginBottom: 12 }}>{it.title}</h3>
          <p className="body" style={{ fontSize: 13.5, margin: 0 }}>{it.desc}</p>
        </div>
      ))}
    </div>
  );
}

function StatGrid({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ background: '#fff', padding: 32 }}>
          <div className="bignum" style={{ fontSize: 48 }}>
            {s.num}<span style={{ fontSize: 22, color: 'var(--accent-2)', marginLeft: 4 }}>{s.unit}</span>
          </div>
          <div style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.label}</div>
          <div className="small">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

function StackBlock({ stack }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>TECH STACK</div>
      <div className="row-tight" style={{ gap: 8 }}>
        {stack.map(s => <span key={s} className="tag tag-neutral">{s}</span>)}
      </div>
    </div>
  );
}

// ============================================================
// PRODUCT 1 — VetoNet (AI Security)
// ============================================================
function ProductVetoNetPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "自社プロダクト" }, { label: "VetoNet" }]} onNavigate={onNavigate}/>
      <DetailHero
        tag="PRODUCT / 研究開発"
        title={<>VetoNet,<br/>AI Agent Security の研究プロダクト。</>}
        lede="AI Agent の振る舞いを多層検証する、Nortiq Labs の研究開発プロダクト。自社プロダクト開発の技術基盤として、お客様の AI 実装にもその知見を還元しています。"
        badges={["β preview", "Python / Rust", "AI Research", "Distributed"]}
        onContact={onContact}
        visualLabel="VetoNet"
        visualCaption="dashboard preview"
        visualSrc="assets/vetonet-dashboard.png"
        visualAspect="4/3"
      />

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">なぜ AI Security か。</h2>
            <p className="section-sub fadein">WHY · AI AGENT SECURITY</p>
            <p className="lede fadein" style={{ margin: '24px auto 0' }}>
              生成 AI が業務の中核に入った今、<span className="highlight">「AI の出力を、誰がどう検証するか」</span>が経営課題に直結します。LLM は確率的に振る舞うため、従来のルールベース監査ではカバーしきれない判断が日々生まれている。VetoNet はその検証レイヤを構築するための研究です。
            </p>
          </div>
          <BulletGrid items={[
            { title: "出力検証パイプライン", desc: "LLM 出力に対して 7 段階の検証 (事実性 / 安全性 / 一貫性 / 形式 / 業務適合 / コスト / 監査) を自動実行。1 つの Agent 応答が本番反映される前に、複数の独立した観点から validated される構造にしています。" },
            { title: "Multi-Agent Orchestration", desc: "複数 AI Agent の協調動作を、検証専用 Agent (Veto) が監督する仕組み。分散システム理論の Two-Phase Commit や Byzantine Fault Tolerance を応用し、Agent 間の合意形成に検証を組み込んでいます。" },
            { title: "Audit Trail / 監査証跡", desc: "全 AI 判断にトレースを残し、後から監査・再現できる構造。金融・医療・法務など、判断根拠の説明責任が問われる業種で有効です。" },
            { title: "Red Team Module", desc: "敵対的入力を自動生成し、Agent の脆弱性を発見。Prompt Injection、Jailbreak、Data Exfiltration など既知の攻撃パタンを継続的に投入し、本番投入前にリスクを洗い出します。" },
          ]}/>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">研究の現状と、公開方針。</h2>
            <p className="section-sub fadein">STATUS · IN PROGRESS</p>
          </div>
          <div className="grid-3">
            <div className="card fadein">
              <div className="bignum" style={{ fontSize: 36 }}>01<sub style={{ fontSize: 14, color: 'var(--accent-2)' }}>phase</sub></div>
              <h3 style={{ fontSize: 17, marginTop: 12, marginBottom: 8, fontWeight: 700 }}>三層の検証アーキテクチャを設計中</h3>
              <p className="body" style={{ fontSize: 13, margin: 0 }}>入力検証 / モデル出力検証 / 人間レビューを直列に挟む、多層的な検証レイヤを試作しています。各層が異なる粒度で AI の判断を捕捉する構造を目指しています。</p>
            </div>
            <div className="card fadein" data-delay="120">
              <div className="bignum" style={{ fontSize: 36 }}>02<sub style={{ fontSize: 14, color: 'var(--accent-2)' }}>phase</sub></div>
              <h3 style={{ fontSize: 17, marginTop: 12, marginBottom: 8, fontWeight: 700 }}>社内 PoC を反復中</h3>
              <p className="body" style={{ fontSize: 13, margin: 0 }}>外部公開や商用導入の前に、Nortiq 内部で運用する AI ツールへ組み込み、検出率・偽陽性率・運用負荷を計測しています。実運用に耐えるオーバヘッドかどうかを最優先で検証中。</p>
            </div>
            <div className="card fadein" data-delay="240">
              <div className="bignum" style={{ fontSize: 36 }}>03<sub style={{ fontSize: 14, color: 'var(--accent-2)' }}>phase</sub></div>
              <h3 style={{ fontSize: 17, marginTop: 12, marginBottom: 8, fontWeight: 700 }}>Whitepaper で段階公開</h3>
              <p className="body" style={{ fontSize: 13, margin: 0 }}>完成を待たず、設計思想、脅威モデル、評価指標を順次ホワイトペーパとして公開していく予定です。クローズドな研究ではなく、コミュニティと議論しながら磨いていく方針です。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'flex-start' }}>
            <Placeholder label="" caption="architecture · validation layers" aspect="4/3" src="assets/vetonet-architecture.png" fit/>
            <div>
              <h3 className="display-s" style={{ marginBottom: 16 }}>技術的詳細</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Multi-Agent システム上に Veto Agent を別立てで実装し、他の Agent の出力を 7 種類の検証器に通します。検証器は Rust で実装された高速モジュール (構文・形式・コスト系のルールベース検証) と、Python の LLM ベース検証器 (事実性・一貫性・業務適合の意味論的検証) の組み合わせ。前段で安価に弾けるものは Rust 層で落とし、判断が必要なものだけを LLM 層に流すことで、レイテンシとコストのバランスを取っています。
              </p>
              <StackBlock stack={["Python", "Rust", "PyTorch", "FastAPI", "Anthropic Claude", "OpenAI", "PostgreSQL", "Redis", "Docker"]}/>
              <div style={{ marginTop: 24 }}>
                <Button variant="text" to={'column'} nav={onNavigate}>技術ブログで詳しく読む<Icon name="arrow-right" size={13}/></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <RedCTAStrip onContact={onContact} onNavigate={onNavigate} title={<>業務に AI を入れる前に、<br/>検証レイヤの議論をしませんか。</>}/>
    </main>
  );
}

// ============================================================
// PRODUCT 2 — Nortiq AI 投稿アシスタント (主力プロダクト)
// ============================================================
function ProductWPChatPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "自社プロダクト" }, { label: "ブログボット（AI投稿アシスタント）" }]} onNavigate={onNavigate}/>
      <DetailHero
        tag="PRODUCT / 主力"
        title={<>ブログボット<br/>Nortiq AI 投稿アシスタント。</>}
        lede="「書ける気がしない」を、なくすブログボット。非技術ユーザー向けの AI 投稿アシスタント（WordPress対応のAIブログ作成ツール）。普段の言葉で AI に伝えるだけで、要約・SEOチェック・競合分析まで対話形式で記事を整えます。"
        badges={["GA リリース", "非技術者対応", "対話型UI", "WordPress 連携可"]}
        onContact={() => onContact('chatbot')}
        visualLabel="UI DESIGN PROPOSAL"
        visualCaption="design-proposal cover"
        visualSrc="assets/pdf/loop-ai-01.png"
        visualAspect="4/3"
        ctaLabel="導入の相談をする"
        subCta="製品デモを見る"
      />

      {/* 8 steps */}
      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">8ステップで、迷わず公開まで。</h2>
            <p className="section-sub fadein">FLOW · 8 STEPS</p>
            <p className="lede fadein" style={{ margin: '20px auto 0' }}>
              「書きたい」と思ってから「公開」までを 8 つの小さなステップに分割。AI が各段階で確認を取りながら進むため、勝手に投稿される心配がありません。
            </p>
            <p className="small fadein" style={{ margin: '12px auto 0', textAlign: 'center' }}>
              ブログボットというツールカテゴリの全体像（仕組み・2タイプの違い・選び方）は<a {...navProps('article-blog-bot', onNavigate)} style={{ color: 'var(--accent)', textDecoration: 'underline' }}>解説記事</a>にまとめています。
            </p>
          </div>
          <div className="step8-strip">
            {[
              { n: "01", t: "内容を伝える",   icon: <path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/> },
              { n: "02", t: "画像をアップ",   icon: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="1.5"/><path d="M3 16l5-5 5 5 3-3 5 5"/></> },
              { n: "03", t: "AI要約・確認",   check: true, icon: <path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z"/> },
              { n: "04", t: "SEOチェック",    icon: <><path d="M4 20V10M10 20V4M16 20v-8M22 20h-22"/></> },
              { n: "05", t: "プレビュー",     check: true, icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></> },
              { n: "06", t: "タイトル設定",   icon: <><path d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/></> },
              { n: "07", t: "スケジュール",   icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></> },
              { n: "08", t: "公開",           check: true, icon: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/> },
            ].map((s, i) => (
              <div key={i} className={`step8-pill fadein${s.check ? ' check' : ''}`} data-delay={i * 50}>
                <div className="step8-pill-head">
                  <span className="step8-pill-n">STEP {s.n}</span>
                  {s.check && <span className="step8-pill-flag">確認</span>}
                </div>
                <svg className="step8-pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {s.icon}
                </svg>
                <div className="step8-pill-t">{s.t}</div>
              </div>
            ))}
          </div>

          <div className="checkpoint-head fadein">
            <h3 className="checkpoint-head-title">AIが必ず止まる3つの確認ポイント</h3>
            <span className="checkpoint-head-sub">STEP 03 / 05 / 08</span>
          </div>
          <div className="grid-3 checkpoint-grid">
            {[
              { step: "STEP 03", t: "「こういう内容で合っていますか?」", d: "AIが入力内容を箇条書きにまとめ、ユーザーは「OK」か「直したい」の 2 択で答える。誤解の早期発見に。" },
              { step: "STEP 05", t: "「公開後の見た目」を一緒に確認", d: "技術用語の「プレビュー」を使わず、PC／スマホの実際の表示を見て判断できる。" },
              { step: "STEP 08", t: "最終確認 → 公開", d: "タイトル・カテゴリ・公開日時を一覧表示。「本当に公開しますか？」のダイアログで誤投稿を防止。" },
            ].map((c, i) => (
              <div key={i} className="checkpoint-card fadein" data-delay={i * 80}>
                <div className="checkpoint-step">{c.step}</div>
                <h4 className="checkpoint-title">{c.t}</h4>
                <p className="checkpoint-desc">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 Principles */}
      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">6つの設計原則</h2>
            <p className="section-sub fadein">PRINCIPLES · NON-TECH FIRST</p>
            <p className="lede fadein" style={{ margin: '20px auto 0' }}>
              「非技術ユーザーが、迷わず、安心して、自分の言葉で発信できる」ことを最優先にした、6 つの設計哲学。
            </p>
          </div>
          <div className="grid-3" style={{ gap: 16 }}>
            {[
              { n: "01", t: "進行状況を、線で見せる", d: "8 ステップを常に画面のどこかに表示。今どこにいて、あといくつあるかが一目でわかる。" },
              { n: "02", t: "AIが「これでいいですか?」と必ず止まる", d: "勝手に投稿が進まないよう、要約フェーズでカードを表示。「OK」「直したい」の 2 択で誤投稿を防止。" },
              { n: "03", t: "プレビューを「ライブ」に", d: "編集がそのまま反映。技術用語を使わず「公開後の見た目」と表記。スマホ表示の切替も1タップ。" },
              { n: "04", t: "SEO は「点数+チェック+競合」の3層", d: "丸スコアで全体感、◯△ で項目別、競合上位3記事の文字数・スコアまで提示。" },
              { n: "05", t: "敬語で、急かさず、提案する", d: "「〜しましょうか」「〜してみますね」のトーンで統一。提案チップでタイプ量を最小化。" },
              { n: "06", t: "制約された美しさ", d: "色は白・温白・藍・AI紫の4色のみ。Noto Serif JP × Noto Sans JP の静かな画面設計。" },
            ].map((p, i) => (
              <div key={i} className="value-card fadein" data-delay={i * 70}>
                <div className="v-num">PRINCIPLE / {p.n}</div>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Variations */}
      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">3つのバリエーション</h2>
            <p className="section-sub fadein">VARIATIONS · PC × 2 + MOBILE</p>
          </div>
          <div className="grid-3" style={{ gap: 16 }}>
            <div className="variation-card fadein">
              <div className="variation-label">A · CLASSIC SPLIT</div>
              <h3>クラシック分割</h3>
              <p className="small text-mono" style={{ color: 'var(--text-3)', marginBottom: 16 }}>Notion風 / 2カラム / ライブプレビュー</p>
              <Placeholder label="Variation A" caption="classic-split.png" aspect="16/10" src="assets/pdf/loop-ai-04.png" fit/>
              <ul className="variation-bullets">
                <li>上部の進捗ピル列 (8ステップ)</li>
                <li>左にAIチャット、右にライブプレビュー</li>
                <li>提案チップで定型指示を1タップ送信</li>
                <li>PC / スマホ切替で両表示を即確認</li>
              </ul>
              <p className="variation-fit">向く: 普段からPCで書く方 / Notion に慣れたチーム</p>
            </div>

            <div className="variation-card fadein featured" data-delay="120">
              <div className="variation-label" style={{ color: 'var(--accent)' }}>B · STEP-BY-STEP</div>
              <h3>ステップガイド型</h3>
              <p className="small text-mono" style={{ color: 'var(--text-3)', marginBottom: 16 }}>ガイド付き / 8ステップ / 競合分析</p>
              <Placeholder label="Variation B" caption="step-guide.png" aspect="16/10" src="assets/pdf/loop-ai-06.png" fit/>
              <ul className="variation-bullets">
                <li>左の大きなステップサイドバー</li>
                <li>右の 4 カード (スコア / チェック / キーワード / 競合)</li>
                <li>「+800語で上位を狙えそう」の AI 提案</li>
                <li>非技術者にやさしいガイド体験</li>
              </ul>
              <p className="variation-fit">向く: WordPressから移行直後 / 月数記事の運用</p>
              <span className="variation-badge">非技術者おすすめ</span>
            </div>

            <div className="variation-card fadein" data-delay="240">
              <div className="variation-label">C · ON-THE-GO</div>
              <h3>モバイル版 (iPhone)</h3>
              <p className="small text-mono" style={{ color: 'var(--text-3)', marginBottom: 16 }}>チャット型 / タブ切替 / 親指で完結</p>
              <Placeholder label="Variation C" caption="mobile.png" aspect="16/10" src="assets/pdf/loop-ai-08.png" fit/>
              <ul className="variation-bullets">
                <li>細い 8 本の進捗バー (STEP 03 / 08 表記)</li>
                <li>「AIと会話」「プレビュー」の 2 タブ切替</li>
                <li>横スクロールの提案チップで打鍵最小化</li>
                <li>音声入力 + 写真添付で外出先も投稿可</li>
              </ul>
              <p className="variation-fit">向く: 通勤・移動中に書きたい方 / LINE 慣れユーザー</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO 4 cards */}
      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">SEO最適化 + 競合分析</h2>
            <p className="section-sub fadein">SEO · 4 CARDS</p>
            <p className="lede fadein" style={{ margin: '20px auto 0' }}>
              「投稿しても見てもらえない」を解決するため、SEO機能を 4 つのカードに分けて設計しました。
            </p>
          </div>
          <div className="grid-4" style={{ gap: 16 }}>
            <div className="seo-card fadein">
              <div className="seo-num">CARD / 01</div>
              <h3>SEOスコア</h3>
              <div className="seo-score-circle">
                <span className="seo-score-val">78<sub>/100</sub></span>
                <span className="seo-score-delta">+12</span>
              </div>
              <p>0〜100 の丸グラフで健康度を視覚化。「+12 改善」など前回比を表示。月間検索数・競合の強さも併記。</p>
            </div>
            <div className="seo-card fadein" data-delay="80">
              <div className="seo-num">CARD / 02</div>
              <h3>チェック項目</h3>
              <ul className="seo-checks">
                <li><span className="seo-ok">◯</span> タイトルにキーワード含む</li>
                <li><span className="seo-ok">◯</span> 見出し階層が整理</li>
                <li><span className="seo-ok">◯</span> 画像 alt 自動生成</li>
                <li><span className="seo-warn">△</span> メタが少し長い (132字)</li>
                <li><span className="seo-add">＋</span> 内部リンク候補 +2</li>
              </ul>
            </div>
            <div className="seo-card fadein" data-delay="160">
              <div className="seo-num">CARD / 03</div>
              <h3>キーワード候補</h3>
              <p>月間検索数 + 競合強さ付きで 5〜10 件を提案。タップで選択 / 解除でき、選んだキーワードは記事全体に反映。</p>
              <div className="row-tight" style={{ gap: 8, marginTop: 12 }}>
                {["在宅勤務 集中力", "リモートワーク 効率", "おうち時間 仕事術"].map(k => <span key={k} className="tag">{k}</span>)}
              </div>
            </div>
            <div className="seo-card fadein" data-delay="240">
              <div className="seo-num">CARD / 04</div>
              <h3>競合ブログ TOP3</h3>
              <ol className="seo-rank">
                <li><strong>biz-media.jp</strong><span>3,200語 / SEO 91</span></li>
                <li><strong>work-style.com</strong><span>2,400語 / SEO 84</span></li>
                <li><strong>career-note.jp</strong><span>4,100語 / SEO 82</span></li>
              </ol>
            </div>
          </div>
          <div className="ai-tip fadein" data-delay="320">
            <div className="ai-tip-avatar">N</div>
            <div className="ai-tip-body">
              <span className="ai-tip-label">AI の一言</span>
              <p>上位記事は平均 3,200 語あります。あなたの記事は 2,400 語なので、<strong>あと 800 語</strong>追加すれば上位を狙えそうですね。具体的な追加セクションの案も準備できますよ。</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">3パターン比較表</h2>
            <p className="section-sub fadein">DECISION</p>
          </div>
          <div className="compare-table fadein">
            <div className="compare-row compare-head">
              <div>観点</div>
              <div>A · クラシック分割</div>
              <div>B · ステップガイド型</div>
              <div>C · モバイル版</div>
            </div>
            {[
              ["ターゲット", "PC中堅以上", "WordPress乗り換え初心者", "移動中・スキマ時間"],
              ["学習コスト", "中", "🏆 最低", "低 (LINE的UI)"],
              ["画面情報量", "多 (2カラム同時)", "中 (1ステップ集中)", "少 (1ステップ+切替)"],
              ["SEO機能の見せ方", "右カラムに統合", "🏆 専用画面で4カード詳細", "縦スクロールカード"],
              ["プレビュー", "常に右で見える", "STEP 05 で全画面", "タブ切替"],
            ].map((r, i) => (
              <div key={i} className="compare-row">
                <div className="compare-label">{r[0]}</div>
                <div>{r[1]}</div>
                <div>{r[2]}</div>
                <div>{r[3]}</div>
              </div>
            ))}
          </div>
          <div className="compare-recommend fadein">
            <div className="compare-recommend-mark">🟣</div>
            <div>
              <strong>Nortiq の提案:</strong> A + B のハイブリッド + C をスマホ版に。<br/>
              初心者モード = B でスタート → 慣れたら「A レイアウトに切替」で Notion 風 2 カラムへ。スマホは独立して C を実装。
            </div>
          </div>
        </div>
      </section>

      {/* Design system mini */}
      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">デザインシステム概要</h2>
            <p className="section-sub fadein">DESIGN SYSTEM</p>
          </div>
          <div className="grid-2" style={{ gap: 24 }}>
            <div className="card fadein">
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>カラーパレット</h3>
              <div className="color-strip">
                {[
                  ["BG / 白", "#ffffff"],
                  ["BG / 温白", "#faf9f6"],
                  ["BG / 紙", "#f4f3ef"],
                  ["Border", "#ecebe6"],
                  ["Ink", "#1f1d1a"],
                  ["Ink Muted", "#5b5852"],
                  ["Brand 藍", "#2f3a8f"],
                  ["AI Purple", "#5b4dde"],
                  ["OK", "#1c7a4d"],
                  ["Warn", "#a86d12"],
                ].map(([label, hex]) => (
                  <div key={hex} className="color-chip">
                    <span className="chip-swatch" style={{ background: hex, border: hex === '#ffffff' ? '1px solid var(--border)' : 'none' }}></span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                      <div className="small text-mono" style={{ color: 'var(--text-3)' }}>{hex}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card fadein" data-delay="120">
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>タイポグラフィ</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li className="type-row">
                  <span className="type-label">見出し (大・小)</span>
                  <span className="type-sample" style={{ fontFamily: '"Noto Serif JP", serif', fontWeight: 600, fontSize: 18 }}>在宅勤務でも集中力を保つ</span>
                  <span className="small text-mono">Noto Serif JP 600</span>
                </li>
                <li className="type-row">
                  <span className="type-label">本文</span>
                  <span className="type-sample">あなたの記事も +800 語で上位を狙えます</span>
                  <span className="small text-mono">Noto Sans JP 400</span>
                </li>
                <li className="type-row">
                  <span className="type-label">ラベル / 数値</span>
                  <span className="type-sample text-mono">STEP 04 / 08</span>
                  <span className="small text-mono">JetBrains Mono 500</span>
                </li>
                <li className="type-row">
                  <span className="type-label">アクセント斜体</span>
                  <span className="type-sample" style={{ fontStyle: 'italic', fontFamily: 'serif' }}>Classic Split</span>
                  <span className="small text-mono">Instrument Serif</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Design Proposal — full PDF rendered as a vertical gallery */}
      <section className="section-pad" id="design-proposal">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">設計提案資料</h2>
            <p className="section-sub fadein">UI DESIGN PROPOSAL · v0.1 · 全9ページ</p>
            <p className="lede fadein" style={{ margin: '20px auto 0' }}>
              本プロダクトの設計思想・3パターンのUI・SEO機能・比較表をまとめた提案書をそのまま掲載しています。
            </p>
          </div>
          <div className="pdf-gallery">
            {[
              { n: '01', t: '表紙 — ふだんの言葉でAIに伝える、ブログ投稿UI' },
              { n: '02', t: 'CHAPTER 01 · OVERVIEW — 8ステップと3つの確認ポイント' },
              { n: '03', t: 'CHAPTER 02 · PRINCIPLES — 6つの設計原則' },
              { n: '04', t: 'CHAPTER 03 · VARIATION A — クラシック分割 (Classic Split)' },
              { n: '05', t: 'CHAPTER 03 · VARIATION A — 注目ポイント 6つのこだわり' },
              { n: '06', t: 'CHAPTER 04 · VARIATION B — ステップガイド型 (Step-by-Step)' },
              { n: '07', t: 'CHAPTER 04 · SEO FEATURES — 4カードと AI の一言' },
              { n: '08', t: 'CHAPTER 05 · VARIATION C — モバイル版 (On-the-go Posting)' },
              { n: '09', t: 'CHAPTER 06 · DECISION — 3パターン比較表と提案' },
            ].map((p, i) => (
              <figure key={p.n} className="pdf-gallery-item fadein" data-delay={i * 40}>
                <figcaption className="pdf-gallery-caption">
                  <span className="pdf-gallery-num">{p.n} / 09</span>
                  <span className="pdf-gallery-title">{p.t}</span>
                </figcaption>
                <Picture src={`assets/pdf/loop-ai-${p.n}.png`} alt={`設計提案資料 ページ ${p.n}`} loading="lazy"/>
              </figure>
            ))}
          </div>
          <p className="small text-mono" style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-3)' }}>
            ── LOOP AI · UI DESIGN PROPOSAL · END
          </p>
        </div>
      </section>

      <RedCTAStrip onContact={() => onContact('chatbot')} onNavigate={onNavigate}/>
    </main>
  );
}

// ============================================================
// PRODUCT 3 — Tennis フォームチェック SaaS
// ============================================================
function ProductTennisPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "自社プロダクト" }, { label: "Tennis フォームチェック" }]} onNavigate={onNavigate}/>
      <DetailHero
        tag="PRODUCT / SaaS"
        title={<>Tennis<br/>フォームチェック SaaS。</>}
        lede="スマホで撮影した動画を AI が解析し、フォームの問題点を可視化する一般ユーザー向け SaaS。Computer Vision の技術検証を兼ねた自社プロダクトです。"
        badges={["Public beta", "MediaPipe", "FastAPI / Next.js", "一般ユーザー向け"]}
        onContact={onContact}
        visualLabel="Tennis SaaS"
        visualCaption="form-analyzer.png"
        ctaLabel="製品を試す (無料)"
        subCta="技術詳細を見る"
      />

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">プロダクト機能</h2>
            <p className="section-sub fadein">FEATURES</p>
          </div>
          <BulletGrid items={[
            { title: "ポーズ検出 (33 keypoints)", desc: "MediaPipe の Pose 推定モデルで、人体の 33 関節をフレーム単位で追跡。" },
            { title: "フォーム比較・スコアリング", desc: "プロ選手のリファレンスフォームとの差分を、関節角度ベースでスコア化。" },
            { title: "改善ポイント自動提示", desc: "「肘の角度を 12 度上げる」など、具体的なフィードバックを LLM 経由で生成。" },
            { title: "動画ライブラリ", desc: "撮影動画をクラウド保存。過去フォームとの時系列比較が可能。" },
          ]}/>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">Computer Vision の応用、お客様案件にも。</h2>
            <p className="section-sub fadein">APPLY TO YOUR PROJECT</p>
            <p className="lede fadein" style={{ margin: '20px auto 0' }}>
              Tennis SaaS で確立した CV パイプラインを、業種特化のソリューションに転用可能です。
            </p>
          </div>
          <div className="grid-3">
            {[
              { t: "工場 / 製造業", d: "作業フォームの安全チェック、熟練度評価。" },
              { t: "医療 / リハビリ", d: "理学療法フォームの定量評価、患者ホームワーク分析。" },
              { t: "教育 / 部活", d: "技能評価の自動化、コーチ業務支援。" },
            ].map((s, i) => (
              <div key={i} className="card fadein" data-delay={i * 120}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.t}</h3>
                <p className="body" style={{ fontSize: 13.5, margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RedCTAStrip onContact={onContact} onNavigate={onNavigate}/>
    </main>
  );
}

// ============================================================
// FEATURE 1 — CMS / 記事更新システム
// ============================================================
function FeatureCMSPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "機能", id: "web" }, { label: "CMS / 記事更新システム" }]} onNavigate={onNavigate}/>
      <DetailHero
        tag="FEATURE / CMS"
        title={<>CMS / 記事更新を、<br/>業務フローに最適化。</>}
        lede="WordPress / MDX / Headless CMS を、貴社の運用体制に合わせて選定・カスタマイズ。AI 投稿ツールと連動した現代的な記事更新フローを構築します。"
        badges={["WordPress", "MDX / Next.js", "Headless CMS", "AI 連携"]}
        onContact={onContact}
        visualLabel="CMS"
        visualCaption="editor.png"
      />

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">CMS 選定の判断軸</h2>
            <p className="section-sub fadein">DECISION FRAMEWORK</p>
          </div>
          <div className="grid-3">
            {[
              { t: "WordPress", g: "更新性を最重視", d: "社内に複数の更新者がいる、WordPress 経験者を活用したい場合に最適。" },
              { t: "Next.js + MDX", g: "パフォーマンス重視", d: "Core Web Vitals 最優先、開発者がいる、JAMstack に振り切りたい場合。" },
              { t: "Headless CMS", g: "規模拡大想定", d: "複数チャネル配信、多言語対応、CMS と画面実装を分離したい場合。" },
            ].map((s, i) => (
              <div key={i} className="card fadein" data-delay={i * 120}>
                <span className="tag" style={{ marginBottom: 16, display: 'inline-block' }}>{s.g}</span>
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{s.t}</h3>
                <p className="body" style={{ fontSize: 13.5, margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">CMS + AI 投稿ツールで、月の運用工数を 1/10 に。</h2>
            <p className="section-sub fadein">AI INTEGRATION</p>
          </div>
          <BulletGrid items={[
            { title: "投稿テンプレート自動化", desc: "業種別の記事構成テンプレートを CMS に組み込み、空欄を埋めるだけで完成。" },
            { title: "AI 下書き生成", desc: "ブログボット（AI投稿アシスタント）と連動し、トピックを指示するだけで下書きを生成。" },
            { title: "校正 / 表記揺れ統一", desc: "投稿前の自動チェックで、社内表記ルールに合わせて自動校正。" },
            { title: "公開予約・SNS連携", desc: "公開と同時に X / LinkedIn / メルマガに自動配信。" },
          ]}/>
        </div>
      </section>

      <ExtraContent blocks={FEATURE_CONTENT['feature-cms']} onNavigate={onNavigate}/>
      <RedCTAStrip onContact={onContact} onNavigate={onNavigate}/>
    </main>
  );
}

// ============================================================
// FEATURE 2 — LP制作 / LPO
// ============================================================
function FeatureLPOPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "機能", id: "web" }, { label: "LP制作 / LPO" }]} onNavigate={onNavigate}/>
      <DetailHero
        tag="FEATURE / LPO"
        title={<>LP制作 + 改善 (LPO) を、<br/>一気通貫で。</>}
        lede="コンバージョン特化の LP 制作と、継続的な改善 (LPO) を一気通貫で提供。広告連動・ヒートマップ解析・A/Bテストまでセットで運用します。"
        badges={["コピー設計から", "A/Bテスト", "ヒートマップ解析", "リスティング連動"]}
        onContact={onContact}
        visualLabel="LPO"
        visualCaption="AXIA · 挑め、想定の外へ"
        visualSrc="assets/lpo-axia-recruit.png"
        visualAspect="4/3"
      />

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">改善サイクルを、24時間以内に回す。</h2>
            <p className="section-sub fadein">CONTINUOUS IMPROVEMENT</p>
          </div>
          <BulletGrid items={[
            { title: "1. データ収集", desc: "GA4 / ヒートマップ / スクロール率を毎日収集。" },
            { title: "2. 仮説立案", desc: "週次で 2〜3 個の改善仮説を Nortiq チームから提案。" },
            { title: "3. 実装 & A/Bテスト", desc: "本番環境で 24時間以内に実装。並行 A/B テストを実施。" },
            { title: "4. 効果検証", desc: "統計的有意性を判断して採用 or 廃棄。" },
          ]}/>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">平均改善実績</h2>
            <p className="section-sub fadein">AVERAGE RESULTS</p>
          </div>
          <StatGrid stats={[
            { num: "2.1", unit: "×",  label: "CVR 改善",          sub: "6ヶ月運用後の平均" },
            { num: "-42", unit: "%",  label: "CPA 削減",          sub: "リスティング連動後" },
            { num: "+38", unit: "%",  label: "平均セッション時間", sub: "改善後3ヶ月時点" },
            { num: "92",  unit: "%",  label: "LP の継続発注率",    sub: "1年以上の運用継続" },
          ]}/>
        </div>
      </section>

      <ExtraContent blocks={FEATURE_CONTENT['feature-lpo']} onNavigate={onNavigate}/>
      <RedCTAStrip onContact={onContact} onNavigate={onNavigate}/>
    </main>
  );
}

// ============================================================
// FEATURE 3 — 採用専門サイト
// ============================================================
function FeatureRecruitPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "機能", id: "web" }, { label: "採用専門サイト" }]} onNavigate={onNavigate}/>
      <DetailHero
        tag="FEATURE / 採用"
        title={<>応募率を最大化する、<br/>採用専門サイト。</>}
        lede="求める人材像の言語化から、ブランドサイト/採用LP/エントリーフォームまで、応募の獲得を一貫設計します。写真ディレクション・社員インタビューも対応可。"
        badges={["新卒 / 中途 両対応", "ブランド設計", "応募率 +52% (平均)", "写真ディレクション込"]}
        onContact={onContact}
        visualLabel="Recruit"
        visualCaption="AXIA · NEW GRADUATES (採用実績)"
        visualSrc="assets/hero-07.png"
        visualAspect="4/3"
      />

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">採用サイトに必要な要素</h2>
            <p className="section-sub fadein">REQUIRED ELEMENTS</p>
          </div>
          <BulletGrid items={[
            { title: "ペルソナ言語化",       desc: "ターゲット人材を、職務経歴・志向性・年収レンジまで Nortiq チームと協働で言語化。" },
            { title: "ブランド・トーン設計", desc: "競合と差別化するメッセージング、ビジュアル方針を確定。" },
            { title: "社員インタビュー",     desc: "代表 + 主要ポジション3名の撮影&取材代行。リアルな言葉を引き出します。" },
            { title: "応募フォーム最適化",   desc: "離脱率を下げるフォーム設計 (項目絞り込み + ATS 連携)。" },
            { title: "選考プロセス可視化",   desc: "応募者に「次に何が起こるか」を明示し、辞退を減らす情報設計。" },
            { title: "ATS 連携",             desc: "HERP / Greenhouse / Workday などの ATS と連携、応募者管理を自動化。" },
          ]}/>
        </div>
      </section>

      <ExtraContent blocks={FEATURE_CONTENT['feature-recruit']} onNavigate={onNavigate}/>
      <RedCTAStrip onContact={onContact} onNavigate={onNavigate}/>
    </main>
  );
}

// ============================================================
// FEATURE 4 — アクセス解析カスタム実装
// ============================================================
function FeatureAnalyticsPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "機能", id: "web" }, { label: "アクセス解析カスタム実装" }]} onNavigate={onNavigate}/>
      <DetailHero
        tag="FEATURE / 解析"
        title={<>解析を、経営判断に<br/>直結させる。</>}
        lede="GA4 / GSC / 独自イベント解析を統合し、貴社の経営判断に直結する KPI ダッシュボードをカスタム実装します。"
        badges={["GA4 / GSC", "BigQuery", "Looker Studio", "カスタムイベント"]}
        onContact={onContact}
        visualLabel="Analytics"
        visualCaption="data ops / dashboards"
        visualSrc="assets/feature-analytics-office.png"
        visualAspect="4/3"
      />

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">標準実装 → カスタム実装の差</h2>
            <p className="section-sub fadein">WHY CUSTOM</p>
          </div>
          <div className="grid-2" style={{ gap: 32 }}>
            <div className="card" style={{ background: 'var(--bg-2)' }}>
              <div className="step-num" style={{ marginBottom: 16, color: 'var(--text-3)' }}>標準実装</div>
              <h3 style={{ fontSize: 20, marginBottom: 16, color: 'var(--text-3)' }}>GA4 だけを入れた状態</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-3)' }}>
                <li style={{ padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>· ページビュー / セッション数</li>
                <li style={{ padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>· 標準コンバージョン</li>
                <li style={{ padding: '8px 0' }}>· 流入元 (ざっくり)</li>
              </ul>
            </div>
            <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
              <div className="step-num" style={{ marginBottom: 16 }}>Nortiq カスタム実装</div>
              <h3 style={{ fontSize: 20, marginBottom: 16 }}>事業数値に紐付くダッシュボード</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ padding: '8px 0', borderBottom: '1px dashed var(--accent)' }}>✓ カスタムイベント (CRMと紐付け)</li>
                <li style={{ padding: '8px 0', borderBottom: '1px dashed var(--accent)' }}>✓ ファネル分析・離脱地点特定</li>
                <li style={{ padding: '8px 0', borderBottom: '1px dashed var(--accent)' }}>✓ 流入元別 LTV / ROAS</li>
                <li style={{ padding: '8px 0', borderBottom: '1px dashed var(--accent)' }}>✓ 自動アラート (異常検知)</li>
                <li style={{ padding: '8px 0' }}>✓ 経営会議用週次レポート</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <ExtraContent blocks={FEATURE_CONTENT['feature-analytics']} onNavigate={onNavigate}/>
      <RedCTAStrip onContact={onContact} onNavigate={onNavigate}/>
    </main>
  );
}

// ============================================================
// WORKS variants — LP-corp, LP-recruit, LP-ec, Video
// (Lightweight pages built on Works pattern with theme content)
// ============================================================
const LP_DATA = {
  'works-lp-corp': {
    eyebrow: "WORKS / コーポレートLP",
    title: <>コーポレート<br/>サイト 実績。</>,
    lede: "投資家・取引先・採用候補者に伝わる総合コーポレートサイトの制作実績。エネルギー・SaaS・建設・製造・人材まで、業種を問わずブランドと情報設計を両立させます。",
    badges: ["ブランディング", "情報設計", "多言語対応", "IR / 採用対応"],
    items: [
      { tag: "コーポレート", t: "再エネ発電のスマートエネルギー企業サイト", stat: "資料DL 2.4×", img: "assets/work-voltio.png", demo: "/showcase/voltio/" },
      { tag: "コーポレート", t: "AIエージェント SaaS のプロダクト/会社サイト", stat: "問合せ +210%", img: "assets/work-sable.png", demo: "/showcase/sable/" },
      { tag: "コーポレート", t: "大規模修繕・建物リニューアル企業のブランドサイト", stat: "現地調査依頼 1.8×", img: "assets/work-renewal.png" },
      { tag: "コーポレート", t: "ML推論エンジンのエンタープライズ製品サイト", stat: "PoC申込 2.6×", img: "assets/work-atlas.png", demo: "/showcase/atlas/" },
      { tag: "コーポレート", t: "外国人材・育成就労 組合のコーポレートサイト", stat: "受入相談 +", img: "assets/work-asia-exchange.png" },
    ],
  },
  'works-lp-recruit': {
    eyebrow: "WORKS / 採用LP",
    title: <>採用LP 実績。</>,
    lede: "応募率を高める新卒採用ブランドサイトの制作実績。コンセプト設計・社員撮影・エントリー導線まで一気通貫で構築します。",
    badges: ["新卒ブランディング", "社員撮影込", "エントリー導線設計"],
    items: [
      { tag: "採用LP", t: "新卒採用ブランドサイト「AXIA」(マニフェスト型)", stat: "エントリー 2.4×", img: "assets/lpo-axia-recruit.png" },
      { tag: "採用LP", t: "新卒採用ブランドサイト「AXIA」(社員フィーチャー型)", stat: "応募数 3.6×", img: "assets/hero-07.png" },
    ],
  },
  'works-lp-ec': {
    eyebrow: "WORKS / EC連動LP",
    title: <>EC連動LP 実績。</>,
    lede: "実店舗・ブランドとオンライン販売を連動させる EC 送客 LP の制作実績。越境 EC や実店舗送客まで、購買導線を一気通貫で設計します。",
    badges: ["OMO設計", "越境EC対応", "実店舗送客"],
    items: [
      { tag: "EC連動", t: "クラフト・衣料ブランドのエディトリアル EC", stat: "客単価 +24%", img: "assets/work-quietobjects.png", demo: "/showcase/quietobjects/" },
      { tag: "EC連動", t: "京都・骨董店「TAKETORA」のバイリンガル越境EC", stat: "海外売上 2.2×", img: "assets/work-taketora.png" },
    ],
  },
  'works-video': {
    eyebrow: "WORKS / 動画",
    title: <>動画制作事例。</>,
    lede: "Web 連動の動画制作・動画 SEO 案件の事例。撮影・編集・配信プラットフォーム構築まで対応します。",
    badges: ["撮影〜編集", "動画SEO", "配信プラットフォーム"],
    items: [
      { tag: "動画制作", t: "院長インタビュー動画",         stat: "視聴完了率 +42%" },
      { tag: "動画SEO",  t: "Web連動の物件紹介動画",         stat: "問い合わせ 1.9×" },
      { tag: "動画配信",  t: "動画配信プラットフォーム構築", stat: "登録者 +3.1k" },
      { tag: "動画制作", t: "店舗紹介ショート動画",         stat: "再生 12万" },
      { tag: "動画SEO",  t: "技術解説 YouTube 連動",        stat: "登録 +1.8k" },
      { tag: "動画配信",  t: "社内研修動画基盤",             stat: "工数 -54%" },
    ],
  },
};

function WorksVariantPage({ pageId, onNavigate, onContact }) {
  const m = LP_DATA[pageId] || LP_DATA['works-lp-corp'];
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "制作実績", id: "works" }, { label: m.eyebrow.split(' / ')[1] }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow={m.eyebrow}
        title={m.title}
        lede={m.lede}
        badges={m.badges}
        onContact={onContact}
      />
      <section className="section-pad">
        <div className="container">
          <div className="row" style={{ marginBottom: 24, gap: 8 }}>
            <a className="kw-pill" {...navProps('works', onNavigate)}>← 全実績</a>
            {Object.entries(LP_DATA).filter(([k]) => k !== pageId).map(([k, v]) => (
              <a key={k} className="kw-pill" {...navProps(k, onNavigate)}>{v.eyebrow.split(' / ')[1]}</a>
            ))}
          </div>
          <div className="grid-3">
            {m.items.map((w, i) => (
              <a key={i} className={`card fadein${w.demo ? ' card-link' : ''}`} data-delay={i * 60} style={{ padding: 0, overflow: 'hidden', cursor: w.demo ? 'pointer' : 'default' }}
                 onClick={w.demo ? (e) => { e.preventDefault(); openShowcase(w.demo, w.t); } : undefined}>
                <WorkShot work={{ img: w.img, title: w.t, tag: w.tag }}/>
                <div style={{ padding: '18px 22px 20px' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="tag">{w.tag}</span>
                    <span className="stat-pill">{w.stat}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.6 }}>{w.t}</h3>
                  {w.demo && <span className="work-cta">サイトをこの場で見る<Icon name="arrow-right" size={12}/></span>}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
      {pageId === 'works-video'
        ? <CDCards title={VIDEO_KNOWHOW.title} sub={VIDEO_KNOWHOW.sub} items={VIDEO_KNOWHOW.items}/>
        : <React.Fragment>
            <CDCards title={LP_KNOWHOW.structure.title} sub={LP_KNOWHOW.structure.sub} items={LP_KNOWHOW.structure.items}/>
            <CDCards title={LP_KNOWHOW.cvr.title} sub={LP_KNOWHOW.cvr.sub} items={LP_KNOWHOW.cvr.items}/>
          </React.Fragment>}
      <RedCTAStrip onContact={onContact} onNavigate={onNavigate}/>
    </main>
  );
}

Object.assign(window, {
  ProductVetoNetPage, ProductWPChatPage, ProductTennisPage,
  FeatureCMSPage, FeatureLPOPage, FeatureRecruitPage, FeatureAnalyticsPage,
  WorksVariantPage,
});
