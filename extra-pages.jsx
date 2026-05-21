// ============================================================
// Nortiq Labs — Extra pages
// Legal (3) / News / Recruit / Industry Solutions (5) /
// Detail templates: Work / Article / Seminar
// ============================================================

// ============================================================
// LEGAL — Privacy / Terms / Privacy-Handling
// ============================================================
const LEGAL_DATA = {
  privacy: {
    title: "プライバシーポリシー",
    subtitle: "Privacy Policy",
    updated: "2026年4月1日",
    sections: [
      { h: "1. 基本方針", b: "Nortiq Labs Inc. (以下「当社」) は、お客様の個人情報の重要性を認識し、関係法令およびガイドラインを遵守して、適切な取得・利用・管理を行います。" },
      { h: "2. 個人情報の定義", b: "本ポリシーにおける「個人情報」とは、個人情報の保護に関する法律 (個人情報保護法) に定める個人情報をいいます。生存する個人に関する情報であって、特定の個人を識別できるものを指します。" },
      { h: "3. 個人情報の取得", b: "当社は、適法かつ公正な手段によって、必要な範囲内で個人情報を取得します。お問い合わせフォーム・資料請求フォーム等を通じて取得します。" },
      { h: "4. 利用目的", b: "取得した個人情報は、お問い合わせへの回答 / 資料・メルマガの送付 / 当社サービスのご案内 / 統計分析 / 採用選考 を目的として利用します。" },
      { h: "5. 第三者提供", b: "法令に基づく場合、人の生命・身体・財産の保護のため必要な場合、お客様の同意がある場合を除き、個人情報を第三者に提供しません。" },
      { h: "6. 安全管理措置", b: "個人情報への不正アクセス、紛失、改ざん、漏えい等を防止するため、適切な安全管理措置 (技術的・組織的・物理的・人的) を講じます。SOC 2 Type II 準拠の運用フローを採用しています。" },
      { h: "7. 開示・訂正・削除", b: "ご本人から個人情報の開示・訂正・削除のご請求があった場合、合理的な範囲で速やかに対応します。ご請求は本ポリシー末尾の連絡先までお願いします。" },
      { h: "8. Cookie の利用", b: "当社サイトでは、サービス向上のため Cookie を使用します。ブラウザ設定で Cookie の受け入れを拒否することが可能です。" },
      { h: "9. お問い合わせ", b: "個人情報の取り扱いに関するお問い合わせは、Nortiq Labs Inc. 個人情報保護管理者 (privacy@nortiq-labs.example) までご連絡ください。" },
    ],
  },
  terms: {
    title: "利用規約",
    subtitle: "Terms of Service",
    updated: "2026年4月1日",
    sections: [
      { h: "第1条 (適用)", b: "本利用規約 (以下「本規約」) は、Nortiq Labs Inc. (以下「当社」) が提供するすべてのサービス (以下「本サービス」) の利用条件を定めるものです。利用者は本サービスを利用することにより、本規約に同意したものとみなされます。" },
      { h: "第2条 (定義)", b: "「利用者」とは本サービスを利用する個人または法人を指します。「コンテンツ」とは、当社が本サービスを通じて提供する文章・画像・動画・音声・データ・プログラム等の総称を指します。" },
      { h: "第3条 (利用契約の成立)", b: "本サービスの利用契約は、利用者が当社所定の方法で申込を行い、当社がこれを承諾した時点で成立します。" },
      { h: "第4条 (利用者の義務)", b: "利用者は、本サービスの利用にあたり、関係法令および本規約を遵守するものとし、第三者の権利を侵害してはなりません。" },
      { h: "第5条 (禁止事項)", b: "法令違反行為 / 当社または第三者の権利侵害 / 本サービスの運営妨害 / 虚偽情報の登録 / リバースエンジニアリングを禁止します。" },
      { h: "第6条 (知的財産権)", b: "本サービスに関する知的財産権は、当社または正当な権利を有する第三者に帰属します。利用者は、これらを当社の事前の書面による承諾なく利用してはなりません。" },
      { h: "第7条 (免責事項)", b: "当社は、本サービスの完全性・正確性・有用性等について、明示・黙示を問わず一切保証しません。利用者は自己の責任において本サービスを利用するものとします。" },
      { h: "第8条 (規約の変更)", b: "当社は、利用者への事前通知なく、本規約を変更することができます。変更後の規約は、当社サイトに掲載した時点で効力を生じます。" },
      { h: "第9条 (準拠法・管轄裁判所)", b: "本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合、東京地方裁判所を第一審の専属的合意管轄裁判所とします。" },
    ],
  },
  'privacy-handling': {
    title: "個人情報の取扱い",
    subtitle: "Handling of Personal Information",
    updated: "2026年4月1日",
    sections: [
      { h: "1. 個人情報の利用目的", b: "お問い合わせフォーム等を通じて取得する個人情報は、以下の目的でのみ利用いたします。お問い合わせへの回答 / 資料の送付 / 当社サービスのご案内 / 採用選考。" },
      { h: "2. 第三者への提供", b: "ご本人の同意がある場合、または法令に基づく場合を除き、個人情報を第三者に提供することはありません。" },
      { h: "3. 個人情報の委託", b: "業務遂行に必要な範囲で、個人情報の取り扱いを業務委託先に委託することがあります。その際は、適切な監督を行います。" },
      { h: "4. 安全管理措置", b: "個人情報の漏えい・滅失・毀損の防止その他の安全管理のため、適切な措置を講じます。" },
      { h: "5. 開示等の請求", b: "ご本人から個人情報の開示・訂正・削除等のご請求があった場合、合理的な範囲ですみやかに対応いたします。" },
      { h: "6. お問い合わせ窓口", b: "個人情報の取扱いに関するお問い合わせは、Nortiq Labs Inc. 個人情報保護管理者 (privacy@nortiq-labs.example / 0120-XXX-XXX) までお願いいたします。" },
    ],
  },
};

function LegalPage({ pageId, onNavigate, onContact }) {
  const data = LEGAL_DATA[pageId] || LEGAL_DATA.privacy;
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: data.title }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow={`LEGAL / ${data.subtitle.toUpperCase()}`}
        title={data.title}
        lede={`制定日 / 改定日: ${data.updated}`}
        onContact={onContact}
        ctaLabel="お問い合わせ"
        subCta="サイトマップを見る"
      />
      <section className="section-pad">
        <div className="container" style={{ maxWidth: 880 }}>
          <ol className="legal-list">
            {data.sections.map((s, i) => (
              <li key={i} className="fadein" data-delay={i * 50}>
                <h3>{s.h}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </ol>
          <div className="legal-meta">
            <p>制定: {data.updated}</p>
            <p>Nortiq Labs Inc. (株式会社ノーティック ラボ)</p>
          </div>
        </div>
      </section>
      <section className="section-pad-sm" style={{ background: 'var(--bg-2)' }}>
        <div className="container" style={{ maxWidth: 880, textAlign: 'center' }}>
          <h3 className="display-s" style={{ marginBottom: 24 }}>その他の法務文書</h3>
          <div className="row" style={{ justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(LEGAL_DATA).filter(([k]) => k !== pageId).map(([k, v]) => (
              <Button key={k} variant="ghost" onClick={() => onNavigate(k)}>{v.title}<Icon name="arrow-right" size={14}/></Button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

// ============================================================
// NEWS (お知らせ)
// ============================================================
function NewsPage({ onNavigate, onContact }) {
  const news = [
    { date: "2026.05.18", cat: "リリース",     title: "WP AIチャットボット v2.4 をリリース。多言語生成・SEO構造化データ強化など。" },
    { date: "2026.05.10", cat: "プレス",       title: "Nortiq Labs、IT導入補助金 2026 の IT 導入支援事業者に採択。" },
    { date: "2026.04.12", cat: "リリース",     title: "VetoNet β を、特定のお客様向けに先行公開しました。" },
    { date: "2026.03.28", cat: "リリース",     title: "WP AIチャットボット、Anthropic Claude API 対応。" },
  ];
  const cats = ["すべて", "リリース", "プレス"];
  const [tab, setTab] = React.useState(0);
  const filtered = tab === 0 ? news : news.filter(n => n.cat === cats[tab]);
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "お知らせ" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="NEWS / お知らせ"
        title={<>Nortiq Labs<br/>からのお知らせ。</>}
        lede="プロダクトリリース・プレスリリース・メディア掲載など、Nortiq Labs からの最新情報をお届けします。"
        badges={["毎週更新", "RSS 配信", "メルマガ購読可"]}
        onContact={onContact}
      />
      <section className="section-pad">
        <div className="container">
          <div className="row" style={{ marginBottom: 24, gap: 8 }}>
            {cats.map((c, i) => (
              <button key={c} className="kw-pill" onClick={() => setTab(i)} style={i === tab ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}}>{c}</button>
            ))}
          </div>
          <div className="content-list">
            {filtered.map((n, i) => (
              <a key={i} className="content-row">
                <span className="content-date">{n.date}</span>
                <span className="content-tag-pill">{n.cat}</span>
                <span className="content-title">{n.title}</span>
                <Icon name="arrow-right" size={14}/>
              </a>
            ))}
          </div>
        </div>
      </section>
      <RedCTAStrip onContact={onContact} onNavigate={onNavigate} title={<>Nortiq Labs に、まずはお気軽にお問い合わせください。</>}/>
    </main>
  );
}

// ============================================================
// RECRUIT (採用情報)
// ============================================================
function RecruitPage({ onNavigate, onContact }) {
  const positions = [
    { dept: "Engineering", title: "Senior Full-stack Engineer", type: "正社員", emp: "東京 / フルリモート可", level: "L4-L6" },
    { dept: "Engineering", title: "ML Engineer / Data Scientist", type: "正社員", emp: "東京 / Berkeley", level: "L4-L6" },
    { dept: "Engineering", title: "Frontend Engineer (Next.js)", type: "正社員", emp: "東京 / フルリモート可", level: "L3-L5" },
    { dept: "Design", title: "UI/UX Designer (Lead)", type: "正社員", emp: "東京", level: "L4-L5" },
    { dept: "Consulting", title: "DX Consultant", type: "正社員", emp: "東京 / 出張多", level: "L4-L6" },
    { dept: "Customer Success", title: "Customer Success Manager", type: "正社員", emp: "東京", level: "L3-L5" },
    { dept: "Sales", title: "Inside Sales", type: "正社員 / 業務委託可", emp: "東京 / フルリモート可", level: "L2-L4" },
    { dept: "Internship", title: "AI Research インターン", type: "インターン", emp: "東京 / Berkeley", level: "学生" },
  ];
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "採用情報" }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow="RECRUIT / 採用情報"
        title={<>日本のDXを、<br/>世界水準で変える仲間を。</>}
        lede="米国 AI 研究の知見を、日本の中小企業の現場に届けるチーム。エンジニア / Data Scientist / Designer / Consultant、各領域でメンバーを募集しています。"
        badges={["代表 3 名 → 拡大採用中", "東京 + Berkeley", "フルリモート可", "ストックオプション制度"]}
        onContact={onContact}
        ctaLabel="求人にエントリー"
        subCta="カルチャー資料DL"
      />

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">私たちが大切にしていること</h2>
            <p className="section-sub fadein">VALUES</p>
          </div>
          <div className="grid-3">
            {[
              { n: "01", t: "Technical Honesty", d: "「AIできます」止まりではなく、実装の中身まで誠実に説明する。技術的にできること / できないことを正確に伝える。" },
              { n: "02", t: "Owner-side Thinking", d: "受託でもクライアントの経営課題を自分ごととして考える。「公開して終わり」のチームには、絶対にしない。" },
              { n: "03", t: "World-class Standards", d: "東京で米国基準のアウトプットを作る。20年遅れの常識ではなく、世界水準で。" },
              { n: "04", t: "Long-term Relationships", d: "案件単発で終わる関係ではなく、3年・5年と並走するパートナーシップを築く。" },
              { n: "05", t: "Continuous Research", d: "業務の20%は研究開発に振る。VetoNet / Tennis SaaS 等、自社プロダクトは技術研鑽の場でもある。" },
              { n: "06", t: "Compassion in Code", d: "「AIで楽になった」を、業務の現場まで届ける。技術は手段、目的は人の働き方を変えること。" },
            ].map((v, i) => (
              <div key={i} className="card fadein" data-delay={i * 80} style={{ padding: 32 }}>
                <div className="bignum" style={{ fontSize: 32, marginBottom: 16 }}>{v.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{v.t}</h3>
                <p className="body" style={{ fontSize: 13, margin: 0 }}>{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">募集ポジション</h2>
            <p className="section-sub fadein">OPEN POSITIONS</p>
          </div>
          <div className="content-list">
            {positions.map((p, i) => (
              <a key={i} className="content-row" style={{ gridTemplateColumns: '140px 1fr 120px 160px 80px auto' }}>
                <span className="content-tag-pill">{p.dept}</span>
                <span className="content-title">{p.title}</span>
                <span className="small">{p.type}</span>
                <span className="small">{p.emp}</span>
                <span className="small num">{p.level}</span>
                <Icon name="arrow-right" size={14}/>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">福利厚生・働き方</h2>
            <p className="section-sub fadein">BENEFITS</p>
          </div>
          <div className="grid-4" style={{ gap: 16 }}>
            {[
              { t: "フルリモート可", d: "Engineering / Designer は完全リモート可。コアタイムなし。" },
              { t: "ストックオプション", d: "全社員に SO 配布。長期インセンティブを共有。" },
              { t: "学習支援", d: "書籍・カンファレンス参加費 年30万円まで補助。" },
              { t: "海外研修", d: "Berkeley 拠点で年1回1週間の研修機会。" },
              { t: "副業OK", d: "競合制限のない副業は事前申請のみで可。" },
              { t: "週4日勤務制", d: "シニア職以上は週4日勤務の選択肢あり。" },
              { t: "産休・育休", d: "男女問わず取得実績多数。復帰サポートも。" },
              { t: "20% Research Time", d: "業務時間の20%を研究開発に充てられる制度。" },
            ].map((b, i) => (
              <div key={i} className="card fadein" data-delay={i * 60} style={{ padding: 22 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{b.t}</h3>
                <p className="body" style={{ fontSize: 12.5, margin: 0 }}>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RedCTAStrip onContact={onContact} onNavigate={onNavigate} title={<>気になるポジションがあれば、<br/>カジュアル面談から。</>}/>
    </main>
  );
}

// ============================================================
// INDUSTRY SOLUTIONS (業種別パッケージ)
// ============================================================
const SOLUTION_DATA = {
  clinic: {
    label: "クリニック・医療",
    title: <>クリニック・医療<br/>DXパッケージ。</>,
    lede: "Web集客 / オンライン予約 / AIチャットボット / 患者管理データ分析を、医療業界の規制を踏まえて一気通貫で導入します。薬機法・医療広告ガイドライン準拠の運用設計が強みです。",
    badges: ["医療広告ガイドライン対応", "薬機法チェック", "予約システム連動", "オンライン診療対応"],
    pains: [
      "ホームページが古く、若年層が来てくれない",
      "電話予約だけで、若手スタッフの負担が大きい",
      "院長ブログが書けず、SEOで競合に負ける",
      "問い合わせの一次受付に人手をかけられない",
    ],
    solutions: [
      { t: "Web制作", d: "予約導線を組み込んだクリニックLP。Core Web Vitals Good 標準担保。" },
      { t: "オンライン予約連動", d: "Reserva / EPARK 等の予約システムをHPに自然に組み込み。" },
      { t: "AIチャットボット", d: "院長監修のもと、患者向け FAQ ボットを24時間稼働。" },
      { t: "ブログAI投稿", d: "薬機法フィルター付きの AI 投稿ツールで月4本の SEO 記事を自動生成。" },
    ],
    cases: [
      { tag: "内科", t: "ブログ更新が止まっていた医院の集客刷新", stat: "問い合わせ 2.4×" },
      { tag: "皮膚科", t: "皮膚科ブランドサイト × 集客連動", stat: "PV 2.7×" },
      { tag: "歯科", t: "歯科医院の総合 LP 構築", stat: "予約 +110%" },
    ],
    price: "60〜180 万円 + 月額運用 3〜8 万円",
  },
  realty: {
    label: "不動産",
    title: <>不動産業の<br/>集客 × 管理パッケージ。</>,
    lede: "売買・賃貸・売却査定・投資物件を、それぞれの導線で最適化したWebサイトと、物件管理データを連動した集客・追客の仕組みを構築します。",
    badges: ["売買 / 賃貸 / 売却 / 投資 対応", "物件データ連携", "ポータルサイト連動", "宅建業法対応"],
    pains: [
      "ポータル経由でしか反響が来ない",
      "物件情報の更新が大変で、サイトが古い",
      "売却査定の問い合わせが少ない",
      "オーナー向け / 借主向けの導線が混ざっている",
    ],
    solutions: [
      { t: "Web制作", d: "売買・賃貸・売却ごとに最適化された LP。動的物件表示にも対応。" },
      { t: "物件管理連携", d: "既存の物件管理システム (ATBB / レインズ等) と自動連携。" },
      { t: "売却査定LP", d: "AI価格査定を組み込んだ査定LP、リスティング広告と連動。" },
      { t: "オーナー向け管理ポータル", d: "賃貸オーナー向けの管理状況可視化ポータルを別立てで構築。" },
    ],
    cases: [
      { tag: "売買", t: "都内仲介の集客サイト構築", stat: "月間PV 3.1×" },
      { tag: "売却", t: "売却査定LPの刷新", stat: "査定依頼 +180%" },
      { tag: "賃貸", t: "賃貸オーナー向け管理ポータル", stat: "工数 -45%" },
    ],
    price: "80〜300 万円 + 月額運用 5〜15 万円",
  },
  build: {
    label: "建築・工務店",
    title: <>建築・工務店の<br/>ブランド × 案件管理パッケージ。</>,
    lede: "ブランドサイト構築 + 案件管理 + 施工事例の蓄積 + 顧客リテンションを一体化したパッケージ。注文住宅・リフォーム・工務店の業務全体を見据えた DX 設計です。",
    badges: ["施工事例DB", "案件管理連動", "図面ビューア", "OB顧客追客"],
    pains: [
      "施工事例が紙ベースで、Webに活かせていない",
      "見積もり依頼の管理が Excel で限界",
      "OB 顧客からの紹介・追加工事の機会を逃している",
      "ブログ更新が止まり、SEO で工務店比較サイトに負ける",
    ],
    solutions: [
      { t: "Web制作", d: "施工事例DBを軸にしたブランドサイト。地域 SEO 対応。" },
      { t: "案件管理連動", d: "見積もり依頼 → 営業 → 施工 → アフターを1画面で管理。" },
      { t: "OB顧客追客", d: "メルマガ + LINE で OB 顧客とつながり続ける仕組み。" },
      { t: "AI記事投稿", d: "建築用語ベースの SEO 記事を AI 投稿ツールで自動生成。" },
    ],
    cases: [
      { tag: "工務店", t: "工務店のブランド × 案件管理", stat: "工数 -38%" },
      { tag: "リフォーム", t: "リフォーム会社の総合ブランド刷新", stat: "受注 +52%" },
      { tag: "設計事務所", t: "設計事務所のポートフォリオ刷新", stat: "問合せ 1.8×" },
    ],
    price: "100〜400 万円 + 月額運用 5〜20 万円",
  },
  hr: {
    label: "人材",
    title: <>人材業界の<br/>マッチング × 集客パッケージ。</>,
    lede: "求職者集客 / 求人企業集客 / マッチング体験を、業界特化型に最適化。新卒・中途・派遣・業界エージェント・外国人材まで、人材ビジネスのバーティカルに対応します。",
    badges: ["新卒 / 中途 / 派遣 / エージェント", "ATS連携", "応募率 +52%(平均)", "バイリンガル対応"],
    pains: [
      "求人広告コストが上昇、自社流入を増やしたい",
      "応募者の質より量の状態を脱したい",
      "登録から面談までの離脱率が高い",
      "業界特化型へのリブランドを検討中",
    ],
    solutions: [
      { t: "求職者向け LP", d: "ターゲットペルソナごとに3〜5本の LP をリスティング連動で運用。" },
      { t: "求人企業向け サービスサイト", d: "BtoB 商談化を意識した、信頼性と差別化を打ち出すサイト。" },
      { t: "ATS連携", d: "HERP / Greenhouse / Workday 等の ATS と自動連携。" },
      { t: "AI記事投稿", d: "キャリア論・業界動向・転職ノウハウを AI 投稿ツールで継続発信。" },
    ],
    cases: [
      { tag: "中途", t: "中堅人材会社のマッチング刷新", stat: "応募 +52%" },
      { tag: "新卒", t: "新卒採用ブランドサイト構築", stat: "エントリー 2.1×" },
      { tag: "外国人材", t: "外国人材紹介のバイリンガル", stat: "海外PV 4×" },
    ],
    price: "150〜500 万円 + 月額運用 10〜30 万円",
  },
  retail: {
    label: "小売 / EC",
    title: <>小売・EC の<br/>OMOパッケージ。</>,
    lede: "実店舗とオンラインを連動させる OMO 戦略。EC サイト構築・送客 LP・店舗在庫連動・購買データ分析を一体化したパッケージです。",
    badges: ["EC連動LP", "実店舗送客", "Shopify / 独自 EC", "BI ダッシュボード"],
    pains: [
      "EC と実店舗の顧客データが分断されている",
      "EC の CVR が業界平均より低い",
      "リピート率が下がっている",
      "在庫データを EC に反映する手作業が限界",
    ],
    solutions: [
      { t: "EC構築 (Shopify / 独自)", d: "Shopify Plus を中心に、必要に応じて独自 EC をフルカスタム実装。" },
      { t: "実店舗 × EC連動", d: "店舗在庫を EC に自動反映、店舗受取・店舗試着予約も組み込み。" },
      { t: "顧客データ統合", d: "POS + EC + メルマガを統合した顧客 DB、LTV分析を可能に。" },
      { t: "AI 商品レコメンド", d: "購買履歴ベースのレコメンドエンジンをサイトに実装。" },
    ],
    cases: [
      { tag: "セレクト", t: "セレクトショップの EC 連携", stat: "CVR 1.8×" },
      { tag: "OMO", t: "実店舗 EC 統合 OMO 基盤", stat: "EC売上 +210%" },
      { tag: "サブスク", t: "サブスク EC のリピート率改善", stat: "解約率 -32%" },
    ],
    price: "200〜800 万円 + 月額運用 10〜40 万円",
  },
};

function SolutionPage({ pageId, onNavigate, onContact }) {
  const key = pageId.replace('solution-', '');
  const m = SOLUTION_DATA[key];
  if (!m) return <main className="page-fade"><div className="container section-pad">業種が見つかりません</div></main>;
  return (
    <main className="page-fade">
      <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "業種別ソリューション" }, { label: m.label }]} onNavigate={onNavigate}/>
      <PageHero
        eyebrow={`SOLUTION / ${m.label.toUpperCase()}`}
        title={m.title}
        lede={m.lede}
        badges={m.badges}
        onContact={onContact}
      />

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">こんな課題、ありませんか</h2>
            <p className="section-sub fadein">PROBLEMS</p>
          </div>
          <div className="pain-grid">
            {m.pains.map((p, i) => (
              <div key={i} className="pain-item fadein" data-delay={i * 80}>
                <div className="pain-mark">PAIN — {String(i + 1).padStart(2, '0')}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, marginTop: 4, lineHeight: 1.6 }}>{p}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">パッケージ内容</h2>
            <p className="section-sub fadein">PACKAGE</p>
            <p className="lede fadein" style={{ margin: '20px auto 0' }}>
              下記すべて、または必要なものだけを選んで導入できます。<br/>
              <span className="highlight">{m.price}</span>
            </p>
          </div>
          <div className="grid-2" style={{ gap: 20 }}>
            {m.solutions.map((s, i) => (
              <div key={i} className="card fadein" data-delay={i * 100}>
                <div className="row" style={{ marginBottom: 16 }}>
                  <span className="step-num">/ {String(i + 1).padStart(2, '0')}</span>
                  <span className="text-accent"><Icon name="check" size={18} stroke={2}/></span>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{s.t}</h3>
                <p className="body" style={{ fontSize: 14, margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">{m.label}の制作実績</h2>
            <p className="section-sub fadein">CASES</p>
          </div>
          <div className="grid-3">
            {m.cases.map((c, i) => (
              <a key={i} className="card card-link fadein" data-delay={i * 120} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
                <Placeholder label={c.tag} caption="case" aspect="16/10"/>
                <div style={{ padding: '20px 22px 22px' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="tag">{c.tag}</span>
                    <span className="small text-mono text-accent" style={{ fontWeight: 700 }}>{c.stat}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.6 }}>{c.t}</h3>
                </div>
              </a>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Button variant="ghost" onClick={() => onNavigate('works-' + key)}>{m.label}の実績をすべて見る<Icon name="arrow-right" size={14}/></Button>
          </div>
        </div>
      </section>

      <section className="section-pad-sm" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <h3 className="display-s" style={{ textAlign: 'center', marginBottom: 28 }}>他の業種ソリューション</h3>
          <div className="row" style={{ justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(SOLUTION_DATA).filter(([k]) => k !== key).map(([k, v]) => (
              <Button key={k} variant="ghost" size="sm" onClick={() => onNavigate('solution-' + k)}>{v.label}<Icon name="arrow-right" size={13}/></Button>
            ))}
          </div>
        </div>
      </section>

      <RedCTAStrip onContact={onContact} onNavigate={onNavigate}/>
    </main>
  );
}

// ============================================================
// WORK DETAIL — individual case study page
// ============================================================
function WorkDetailPage({ onNavigate, onContact }) {
  return (
    <main className="page-fade">
      <Breadcrumb items={[
        { label: "トップ", id: "top" },
        { label: "制作実績", id: "works" },
        { label: "クリニック", id: "works-clinic" },
        { label: "地域密着型クリニックのリニューアル" },
      ]} onNavigate={onNavigate}/>

      <section style={{ paddingTop: 'clamp(48px, 7vw, 90px)', paddingBottom: 'clamp(40px, 6vw, 72px)' }}>
        <div className="container">
          <div className="row" style={{ marginBottom: 20, gap: 8 }}>
            <span className="tag tag-on-accent">クリニック</span>
            <span className="tag">Web制作</span>
            <span className="tag">AIチャットボット</span>
            <span className="tag">SEO</span>
            <span className="small num text-accent" style={{ fontWeight: 700, marginLeft: 'auto' }}>問い合わせ 2.4×</span>
          </div>
          <h1 className="display-xl fadein" style={{ marginBottom: 24 }}>地域密着型クリニックの<br/>集客リニューアル</h1>
          <p className="lede fadein" style={{ marginBottom: 32, maxWidth: 800 }}>
            東京・武蔵野市の内科クリニック。10年以上前に作られたサイトをリニューアルし、Web集客 → オンライン予約 → ブログ運用までを一気通貫で構築。半年で問い合わせを 2.4 倍にしました。
          </p>
          <Placeholder label="Hero shot" caption="case-clinic-hero.png" aspect="16/9"/>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="grid-4" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {[
              { l: "業種",       v: "クリニック・医療" },
              { l: "規模",       v: "代表 3 名 + 業務委託" },
              { l: "制作期間",   v: "10 週間" },
              { l: "公開後の運用", v: "継続中 (1年9ヶ月)" },
              { l: "予算",       v: "中規模 (Standard プラン)" },
              { l: "技術選定",   v: "WordPress + 予約システム連携" },
              { l: "公開時期",   v: "2024年10月" },
              { l: "対応領域",   v: "Web / AIチャットボット / SEO" },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', padding: '20px 24px' }}>
                <div className="small text-3" style={{ marginBottom: 4 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 64, alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow eyebrow-accent" style={{ marginBottom: 14 }}>CHALLENGE</div>
              <h2 className="section-title" style={{ paddingBottom: 0 }}>抱えていた課題</h2>
            </div>
            <div className="stack-m">
              <p className="body">
                10年以上前に制作したサイトのまま運用が止まっており、スマホ対応もできていない状態でした。Google 検索からの流入はほぼゼロ、新規患者の獲得チャネルが口コミだけに偏っていました。
              </p>
              <ul style={{ paddingLeft: 20, lineHeight: 2.1 }}>
                <li>スマホで予約までたどり着けないレイアウト</li>
                <li>ブログを更新する余裕がスタッフになく、SEO 順位が後退</li>
                <li>問い合わせのうち、診療時間外の電話が多く、機会損失が発生</li>
                <li>院長としては「Web のプロが横にいる感覚」を求めていた</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 64, alignItems: 'flex-start' }}>
            <div>
              <div className="eyebrow eyebrow-accent" style={{ marginBottom: 14 }}>APPROACH</div>
              <h2 className="section-title" style={{ paddingBottom: 0 }}>Nortiq のアプローチ</h2>
            </div>
            <div className="stack-m">
              <p className="body">
                「公開して終わり」にしない設計で、3 フェーズに分けて段階的に導入しました。
              </p>
              <ol style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                {[
                  { t: "Phase 1: Web リニューアル", d: "予約導線を意識したクリニック LP を WordPress + Reserva 連携で構築。スマホ最適化と Core Web Vitals Good を担保。" },
                  { t: "Phase 2: AIチャットボット導入", d: "公開3ヶ月後に WP AIチャットボット 投稿ツールを導入。月4本の SEO 記事を院長監修で自動生成。" },
                  { t: "Phase 3: 運用最適化", d: "月次レビューで離脱地点を分析、フォーム設計の改善を繰り返しました。" },
                ].map((p, i) => (
                  <li key={i} style={{ padding: '20px 0', borderBottom: '1px dashed var(--border)' }}>
                    <div className="step-num" style={{ marginBottom: 6 }}>PHASE / 0{i + 1}</div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, marginBottom: 6 }}>{p.t}</h3>
                    <p className="body" style={{ fontSize: 14, margin: 0 }}>{p.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">数値で見る成果</h2>
            <p className="section-sub fadein">RESULTS · 半年後</p>
          </div>
          <StatGrid stats={[
            { num: "2.4", unit: "×",  label: "問い合わせ数",        sub: "月15件 → 月36件" },
            { num: "+180", unit: "%", label: "オンライン予約",       sub: "月28件 → 月78件" },
            { num: "1.8", unit: "×",  label: "SEO オーガニック流入", sub: "6ヶ月後の月間比較" },
            { num: "-72", unit: "%",  label: "ブログ更新の工数",     sub: "週3h → 週50分" },
          ]}/>
        </div>
      </section>

      <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div className="card" style={{ padding: 48 }}>
              <div className="eyebrow eyebrow-accent" style={{ marginBottom: 14 }}>VOICE / クライアント様の声</div>
              <blockquote style={{ margin: 0, fontSize: 19, lineHeight: 1.9, color: 'var(--text)', marginBottom: 20 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 28, marginRight: 4 }}>“</span>
                Web制作からの付き合いで、半年後にAIチャットボットも導入。ブログ更新の負担がなくなり、SEO流入が1.8倍になりました。「Webのプロが横にいる」感覚を、初めて持てた気がします。
                <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 28, marginLeft: 4 }}>”</span>
              </blockquote>
              <div className="row" style={{ gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>A.K.</div>
                <div>
                  <strong style={{ fontSize: 14 }}>A.K. 様</strong>
                  <div className="small">代表取締役・院長 / クリニック (東京)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title fadein">関連する制作実績</h2>
            <p className="section-sub fadein">RELATED CASES</p>
          </div>
          <div className="grid-3">
            {[
              { tag: "クリニック", t: "内科クリニックの予約サイト構築", stat: "予約 +83%" },
              { tag: "クリニック", t: "皮膚科ブランドサイト × 集客連動", stat: "PV 2.7×" },
              { tag: "クリニック", t: "歯科医院の総合 LP 構築", stat: "予約 +110%" },
            ].map((c, i) => (
              <a key={i} className="card card-link fadein" data-delay={i * 100} style={{ padding: 0, overflow: 'hidden' }}>
                <Placeholder label={c.tag} caption="related case" aspect="16/10"/>
                <div style={{ padding: '20px 22px 22px' }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="tag">{c.tag}</span>
                    <span className="small text-mono text-accent" style={{ fontWeight: 700 }}>{c.stat}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.55 }}>{c.t}</h3>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <RedCTAStrip onContact={onContact} onNavigate={onNavigate} title={<>同業種で、似た課題を解決しませんか。</>}/>
    </main>
  );
}

// ============================================================
// ARTICLE DETAIL — individual blog post page (markdown-rendered)
// ============================================================
function ArticleDetailPage({ onNavigate, onContact, slug }) {
  const store = (typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {};
  const article = store[slug] || Object.values(store)[0];

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);

  if (!article) {
    return (
      <main className="page-fade">
        <Breadcrumb items={[{ label: "トップ", id: "top" }, { label: "コラム", id: "column" }]} onNavigate={onNavigate}/>
        <section className="section-pad"><div className="container"><p className="lede">記事が見つかりませんでした。</p></div></section>
      </main>
    );
  }

  const related = Object.values(store).filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <main className="page-fade">
      <Breadcrumb items={[
        { label: "トップ", id: "top" },
        { label: "コラム", id: "column" },
        { label: article.title },
      ]} onNavigate={onNavigate}/>

      <article>
        <header style={{ paddingTop: 'clamp(48px, 7vw, 90px)', paddingBottom: 32 }}>
          <div className="container" style={{ maxWidth: 820 }}>
            <div className="row" style={{ gap: 10, marginBottom: 24, color: 'var(--text-3)', fontSize: 13, flexWrap: 'wrap' }}>
              <span className="tag" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>{article.category}</span>
              <span className="num">{article.date}</span>
              <span>·</span>
              <span>{article.read} read</span>
              <span>·</span>
              <span>Nortiq Labs</span>
            </div>
            <h1 className="display-l fadein" style={{ marginBottom: 8 }}>{article.title}</h1>
          </div>
        </header>

        {article.img && (
          <div className="container" style={{ maxWidth: 880, marginBottom: 8 }}>
            <img src={article.img} alt={article.title} className="article-hero-img"/>
          </div>
        )}

        <div className="container" style={{ maxWidth: 780, marginTop: 24, marginBottom: 80 }}>
          <div className="article-prose article-body" dangerouslySetInnerHTML={{ __html: article.html }}/>
        </div>

        {related.length > 0 && (
          <section className="section-pad" style={{ background: 'var(--bg-2)' }}>
            <div className="container" style={{ maxWidth: 880 }}>
              <h3 className="display-s" style={{ marginBottom: 24 }}>関連記事</h3>
              <div className="grid-3">
                {related.map((a) => (
                  <a key={a.slug} className="article-card fadein" style={{ cursor: 'pointer' }} onClick={() => onNavigate('article-' + a.slug)}>
                    <Placeholder label={a.img ? "" : a.category} caption={a.img ? "" : a.slug} aspect="16/10" src={a.img} fit/>
                    <div className="article-meta">
                      <span style={{ color: 'var(--accent)' }}>{a.category}</span>
                      <span className="article-meta-sep">·</span>
                      <span>{a.date}</span>
                    </div>
                    <h3 className="article-title">{a.title}</h3>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>

      <RedCTAStrip onContact={onContact} onNavigate={onNavigate} title={<>こうした観点をベースに、<br/>貴社の DX を一緒に考えませんか。</>}/>
    </main>
  );
}

// ============================================================
// DIAGNOSTIC LANDING PAGE — NORTIQLAB サイト診断ツール
// (LP spec v1.0 / navy-blue theme, scoped .diag-page)
// URL 入力 → 送信で rdaichi27@gmail.com にリード通知 (mailto)。
// 実際の自動診断エンジンはバックエンド (別Next.jsプロジェクト) で実装。
// ============================================================
function diagBarColor(score) {
  if (score >= 75) return '#1c7a4d';
  if (score >= 60) return 'var(--warn)';
  return 'var(--accent)';
}

function DiagResult({ data, onLead }) {
  const cats = data.categories || {};
  const order = ['technicalSEO', 'onPageSEO', 'brokenLinks', 'aiVisibility'];
  const ov = data.overall || { score: 0, rank: '-', summary: '' };
  return (
    <div className="diag-result fadein">
      <div className="diag-result-head">
        <div className="diag-gauge" style={{ '--g': `${ov.score}` }}>
          <span className="diag-gauge-val">{ov.score}<small>/100</small></span>
        </div>
        <div className="diag-result-meta">
          <div className="diag-result-rank">ランク <strong>{ov.rank}</strong></div>
          <p className="diag-result-url">{data.url}</p>
          <p className="diag-result-summary">{ov.summary}</p>
        </div>
      </div>
      <div className="diag-cats">
        {order.filter((k) => cats[k]).map((k) => {
          const c = cats[k];
          return (
            <div key={k} className="diag-cat">
              <div className="diag-cat-top">
                <span className="diag-cat-name">{c.icon} {c.label}</span>
                <span className="diag-cat-score" style={{ color: diagBarColor(c.score) }}>{c.score}</span>
              </div>
              <div className="diag-cat-bar"><span style={{ width: `${c.score}%`, background: diagBarColor(c.score) }}/></div>
              {c.topIssue && <p className="diag-cat-issue">⚠ {c.topIssue}</p>}
            </div>
          );
        })}
      </div>
      <div className="diag-locked">
        <p className="diag-locked-title">🔒 さらに詳しい改善提案を受け取る</p>
        <ul className="diag-locked-list">
          <li>各項目の詳細な課題リスト</li>
          <li>優先度付きの改善アクションプラン</li>
          <li>競合との詳細比較レポート</li>
          <li>NORTIQLAB 専門家による解説</li>
        </ul>
        <button className="diag-btn" type="button" onClick={onLead}>無料で詳細レポートを受け取る <Icon name="arrow-right" size={16}/></button>
        <p className="diag-microcopy">※ 詳細レポートはメールでお届けします (無料)。</p>
      </div>
    </div>
  );
}

const DIAG_STEPS = [
  'サイトへ接続しています',
  'テクニカルSEO（HTTPS・表示速度・構造化データ）を解析',
  'オンページSEO（タイトル・見出し・メタ情報）を解析',
  'リンク切れ・内部リンクをチェック',
  'AI可視性（生成AIからの参照しやすさ）を評価',
  '総合スコアとレポートを生成',
];

function DiagProgress() {
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a < DIAG_STEPS.length - 1 ? a + 1 : a));
    }, 1400);
    return () => clearInterval(id);
  }, []);
  const pct = Math.round(((active + 1) / DIAG_STEPS.length) * 100);
  return (
    <div className="diag-progress fadein">
      <div className="diag-progress-head">
        <span className="diag-spinner" aria-hidden="true"></span>
        <div>
          <p className="diag-progress-title">サイトを解析しています…</p>
          <p className="diag-progress-sub">通常 10〜30 秒ほどで完了します。</p>
        </div>
      </div>
      <div className="diag-progress-bar"><span style={{ width: `${pct}%` }}/></div>
      <ol className="diag-steps">
        {DIAG_STEPS.map((s, i) => (
          <li key={i} className={i < active ? 'is-done' : i === active ? 'is-active' : 'is-wait'}>
            <span className="diag-step-mark">{i < active ? '✓' : ''}</span>
            <span className="diag-step-label">{s}</span>
          </li>
        ))}
      </ol>
      <div className="diag-warn" role="alert">
        <strong>⚠ このまま画面を開いたままお待ちください。</strong>
        解析が完了するまで、ページの再読み込み・タブの移動・ブラウザを閉じる操作は行わないでください。途中で離れると結果を取得できない場合があります。
      </div>
    </div>
  );
}

function DiagUrlForm({ buttonLabel = "無料で診断する", dark = false }) {
  const [url, setUrl] = React.useState('');
  const [status, setStatus] = React.useState('idle'); // idle | loading | done | error
  const [result, setResult] = React.useState(null);
  const [errMsg, setErrMsg] = React.useState('');

  const normalize = (v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

  const sendLead = () => {
    if (typeof openInquiryMailto !== 'function') return;
    const r = result;
    const scoreLine = r
      ? `総合スコア ${r.overall.score}/100 (${r.overall.rank}) / `
        + Object.values(r.categories).map((c) => `${c.label}:${c.score}`).join(' / ')
      : '';
    openInquiryMailto({
      company: '', name: '', email: '', phone: '',
      siteUrl: r ? r.url : normalize(url.trim()),
      message: `NORTIQLAB サイト診断 詳細レポート希望。\n${scoreLine}`,
    }, 'diagnostic-lp');
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = url.trim();
    if (!v) return;
    setStatus('loading');
    setErrMsg('');
    // Keep the progress checklist on screen long enough to read, even if the
    // API responds (or fails) almost instantly.
    const startedAt = Date.now();
    const MIN_MS = 4200;
    const settle = async (fn) => {
      const wait = MIN_MS - (Date.now() - startedAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      fn();
    };
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalize(v) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      await settle(() => { setResult(data); setStatus('done'); });
    } catch (err) {
      await settle(() => { setErrMsg(String(err.message || err)); setStatus('error'); });
    }
  };

  if (status === 'loading') {
    return <DiagProgress/>;
  }

  if (status === 'done' && result) {
    return <DiagResult data={result} onLead={sendLead}/>;
  }

  return (
    <>
      <form className="diag-form" onSubmit={submit} noValidate>
        <input
          className="diag-input"
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-site.com"
          aria-label="診断するサイトのURL"
        />
        <button className="diag-btn" type="submit">{buttonLabel} <Icon name="arrow-right" size={16}/></button>
      </form>
      <ul className="diag-trust">
        <li>その場で結果表示</li>
        <li>登録不要</li>
        <li>4領域を即時診断</li>
      </ul>
      {status === 'error' && (
        <p className="diag-error">
          診断に失敗しました（{errMsg}）。URL をご確認のうえ再度お試しください。
          <br/>解決しない場合は <a href="#" onClick={(e) => { e.preventDefault(); sendLead(); }}>こちらから直接ご相談</a> いただけます。
        </p>
      )}
      {!dark && status !== 'error' && <p className="diag-microcopy">※ 診断結果のサマリーはその場で無料表示。詳細レポートはメールでお届けします。</p>}
    </>
  );
}

function DiagnosticLPPage({ onNavigate, onContact }) {
  const pains = [
    { ico: "❓", q: "「SEOが悪い」と言われるけど、具体的に何が問題か分からない", a: "47項目を診断し、具体的な課題を可視化" },
    { ico: "🔧", q: "改善ポイントが多すぎて、何から手をつければいいか優先度が分からない", a: "改善インパクトの高い順に優先順位を提案" },
    { ico: "🤖", q: "ChatGPTやGeminiで検索しても、自社サイトが出てこない", a: "AI可視性を独自指標でスコア化・対策提示" },
    { ico: "⚔️", q: "競合と比べて、何が劣っているのかが把握できない", a: "競合サイトと並べて詳細比較レポート" },
  ];
  const feats = [
    { ico: "🔧", name: "Technical SEO", jp: "サイトの土台を徹底チェック", items: ["Core Web Vitals", "モバイル対応", "HTTPS / robots.txt", "構造化データ"] },
    { ico: "📝", name: "On-Page SEO", jp: "ページ単位の最適化を診断", items: ["title タグ", "メタディスクリプション", "見出し構造", "画像 alt / OGP"] },
    { ico: "🔗", name: "Broken Links", jp: "リンク切れを自動検出", items: ["内部 404", "外部リンク到達性", "リダイレクト深度", "画像リンク切れ"] },
    { ico: "🤖", name: "AI Visibility", jp: "AI検索時代の新指標", tag: "NEW", items: ["llms.txt 設置", "AIクローラー許可", "E-E-A-T シグナル", "引用されやすい構造"] },
    { ico: "⚔️", name: "Competitive", jp: "競合と並べて評価", items: ["競合サイト自動検出", "スコア比較", "キーワードギャップ", "改善優先度マッピング"] },
  ];
  const steps = [
    { n: "STEP 1", ico: "🌐", t: "URLを入力", d: "診断したいサイトのURLを入力フォームに貼り付けて、ボタンを押すだけ。", time: "5秒" },
    { n: "STEP 2", ico: "⚡", t: "自動診断", d: "NORTIQLAB の診断エンジンが、5領域を並列で実行します。", time: "60秒" },
    { n: "STEP 3", ico: "📊", t: "レポートを確認", d: "総合スコアと主要課題が即表示。詳細レポートと改善提案はメールでお届け。", time: "即時" },
  ];
  const whys = [
    { t: "専門家による解説付き", d: "ただの数値羅列ではありません。NORTIQLAB認定エンジニアが、あなたのサイトに特化した改善提案を添えてお届けします。" },
    { t: "AI検索時代に対応した独自指標", d: "従来のSEOツールが見逃す「AIに引用されやすい構造」を独自評価。ChatGPT・Claude・Gemini・Perplexity 全てに対応した可視性スコアを算出します。" },
    { t: "改善まで一気通貫サポート", d: "診断だけで終わらせません。ご希望に応じて、NORTIQLAB が改善実装まで責任を持って支援。診断 → 提案 → 実装 → 効果測定まで一気通貫で。" },
  ];
  const stats = [
    { v: "1,200+", l: "累計診断実行サイト数" },
    { v: "+47%", l: "平均SEOスコア改善 (併用時)" },
    { v: "4.8 / 5", l: "ユーザー満足度評価" },
  ];
  const quotes = [
    { p: "AI可視性スコアが衝撃でした。自社サイトがChatGPTで一切引用されない理由が初めて分かり、改善後は問い合わせが2倍に。", c: "田中様 — EC事業 マーケ部長" },
    { p: "競合との比較レポートが秀逸。経営層への説明にもそのまま使え、施策の優先順位がクリアになりました。", c: "鈴木様 — SaaS事業 CMO" },
    { p: "60秒で診断が終わるのに、内容は他の有料ツール以上。NORTIQLAB さんのサポート体制も心強かったです。", c: "佐藤様 — 製造業 経営者" },
  ];
  const faqs = [
    { q: "本当に無料ですか?", a: "はい、サイト診断とサマリーレポートは完全無料です。詳細レポート・改善提案も無料でメール送付します。会員登録も不要です。" },
    { q: "個人情報の入力が必要ですか?", a: "URL入力だけで診断は実行できます。詳細レポートを受け取る際にのみ、お名前・会社名・メールアドレスをいただきます。" },
    { q: "診断結果はどれくらいの精度ですか?", a: "Lighthouse (Google公式) 準拠の技術指標と、NORTIQLAB独自のAI可視性アルゴリズムを組み合わせています。実証済みのロジックで高い精度を実現します。" },
    { q: "どんなサイトでも診断できますか?", a: "HTTPS / HTTP の公開ウェブサイトであれば診断可能です。ログインが必要なページや、JavaScriptで動的生成される一部のSPAは部分的に対応となります。" },
    { q: "競合の自動検出はどうやっていますか?", a: "サイトの内容 (タイトル・キーワード・カテゴリ) から類似性の高いサイトを自動抽出します。任意の競合URLを手動で指定することも可能です。" },
    { q: "診断結果は保存されますか?", a: "レポートは90日間保存されます。共有URL機能で社内チームと共有することも可能です。" },
    { q: "改善を依頼するといくらかかりますか?", a: "サイト規模・改善範囲によって変動します。診断後のご相談時に、無料でお見積もりをご提示します。" },
    { q: "個人情報はどう扱われますか?", a: "プライバシーポリシーに基づき厳重に管理します。第三者への提供は行いません。" },
  ];
  return (
    <main className="page-fade diag-page">
      {/* Hero */}
      <section className="diag-hero">
        <div className="diag-wrap">
          <div className="diag-hero-inner">
            <span className="diag-badge">完全無料・登録不要</span>
            <h1 className="diag-h1">URLを入れるだけで、<br/>サイトの<span className="hl">「本当の課題」</span>が見える。</h1>
            <p className="diag-hero-sub">テクニカルSEO・AI可視性・競合比較まで、NORTIQLAB の専門家が改善提案までお届けします。</p>
            <DiagUrlForm/>
            <p className="diag-social">既に <strong>1,200社</strong> が利用 / 平均満足度 <strong>4.8 / 5</strong></p>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="diag-section">
        <div className="diag-wrap">
          <div className="diag-head">
            <p className="diag-eyebrow">Pain Points</p>
            <h2 className="diag-h2">あなたのサイト、こんな状態になっていませんか?</h2>
          </div>
          <div className="diag-pain-grid">
            {pains.map((p, i) => (
              <div key={i} className="diag-pain-card fadein" data-delay={i * 60}>
                <div className="diag-pain-ico">{p.ico}</div>
                <p className="diag-pain-q">{p.q}</p>
                <p className="diag-pain-a">{p.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 features */}
      <section className="diag-section alt">
        <div className="diag-wrap">
          <div className="diag-head">
            <p className="diag-eyebrow">Features</p>
            <h2 className="diag-h2">5つの観点で、サイトを徹底解剖</h2>
            <p className="diag-lead">業界標準のテクニカル指標から、AI検索時代の新しい評価軸まで。NORTIQLAB独自のアルゴリズムで包括的に診断します。</p>
          </div>
          <div className="diag-feat-grid">
            {feats.map((f, i) => (
              <div key={i} className={`diag-feat-card fadein${f.tag ? ' new' : ''}`} data-delay={i * 50}>
                <div className="diag-feat-ico">{f.ico}</div>
                {f.tag && <span className="diag-feat-tag">★ {f.tag}</span>}
                <div className="diag-feat-name">{f.name}</div>
                <div className="diag-feat-jp">{f.jp}</div>
                <ul className="diag-feat-list">{f.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <a className="diag-btn ghost" href="#diag-top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>今すぐ無料診断を試す <Icon name="arrow-right" size={16}/></a>
          </div>
        </div>
      </section>

      {/* 3 steps */}
      <section className="diag-section">
        <div className="diag-wrap">
          <div className="diag-head">
            <p className="diag-eyebrow">How It Works</p>
            <h2 className="diag-h2">たった60秒。3ステップで完了。</h2>
          </div>
          <div className="diag-steps">
            {steps.map((s, i) => (
              <div key={i} className="diag-step fadein" data-delay={i * 80}>
                <div className="diag-step-n">{s.n}</div>
                <div className="diag-step-ico">{s.ico}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
                <span className="diag-step-time">所要 {s.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="diag-section alt">
        <div className="diag-wrap">
          <div className="diag-head">
            <p className="diag-eyebrow">Why Us</p>
            <h2 className="diag-h2">なぜ、NORTIQLABなのか。</h2>
          </div>
          <div className="diag-why">
            {whys.map((w, i) => (
              <div key={i} className="diag-why-row fadein" data-delay={i * 70}>
                <div className="diag-why-num">{i + 1}</div>
                <div>
                  <h3>{w.t}</h3>
                  <p>{w.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="diag-section">
        <div className="diag-wrap">
          <div className="diag-head">
            <p className="diag-eyebrow">Social Proof</p>
            <h2 className="diag-h2">多くの企業様にご活用いただいています</h2>
          </div>
          <div className="diag-stats">
            {stats.map((s, i) => (
              <div key={i} className="diag-stat fadein" data-delay={i * 60}>
                <div className="diag-stat-v">{s.v}</div>
                <div className="diag-stat-l">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="diag-quotes">
            {quotes.map((qt, i) => (
              <figure key={i} className="diag-quote fadein" data-delay={i * 60}>
                <p>「{qt.p}」</p>
                <cite>― {qt.c}</cite>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="diag-section alt">
        <div className="diag-wrap" style={{ maxWidth: 820 }}>
          <div className="diag-head">
            <p className="diag-eyebrow">FAQ</p>
            <h2 className="diag-h2">よくあるご質問</h2>
          </div>
          <FAQ items={faqs}/>
        </div>
      </section>

      {/* Final CTA */}
      <section className="diag-final">
        <div className="diag-wrap">
          <h2>まずは、あなたのサイトを<br/>60秒で診断してみませんか?</h2>
          <DiagUrlForm dark/>
        </div>
      </section>
    </main>
  );
}

Object.assign(window, {
  LegalPage, NewsPage, RecruitPage, SolutionPage,
  WorkDetailPage, ArticleDetailPage,
  DiagnosticLPPage,
  SOLUTION_DATA, LEGAL_DATA,
});
