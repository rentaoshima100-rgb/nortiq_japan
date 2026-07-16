// ============================================================
// Nortiq Labs — App shell
// ============================================================

const ROUTES = {
  top:             { c: () => window.TopPage,             title: 'Nortiq Labs — 日本のDX、世界水準で巻き返す。' },
  web:             { c: () => window.WebPage,             title: 'Web制作｜WordPress・Next.jsで作る集客サイト（30万円〜） — Nortiq Labs' },
  chatbot:         { c: () => window.ChatbotPage,         title: 'AIチャットボット｜WordPressのブログ更新を自動化する投稿ツール（10万円〜） — Nortiq Labs' },
  dx:              { c: () => window.DXPage,              title: 'DX・ML実装｜機械学習・業務自動化・データ分析を初期投資ゼロで段階導入 — Nortiq Labs' },
  works:           { c: () => window.WorksPage,           title: '制作実績｜7業種20社のWeb制作・DX支援事例 — Nortiq Labs', argName: 'category', argVal: null },
  voice:           { c: () => window.VoicePage,           title: 'ご利用会社様の声｜20社の支援先が語る成果と伴走の評価 — Nortiq Labs' },
  support:         { c: () => window.SupportPage,         title: 'サポート — Nortiq Labs' },
  pricing:         { c: () => window.PricingPage,         title: '料金プラン — Nortiq Labs' },
  diagnosis:       { c: () => window.DiagnosisPage,       title: 'サイト無料診断 — Nortiq Labs' },
  'quick-diagnosis': { c: () => window.QuickDiagnosisPage, title: 'クイック診断 — Nortiq Labs' },
  subsidy:         { c: () => window.SubsidyPage,         title: '補助金活用相談 — Nortiq Labs' },
  guidebook:       { c: () => window.GuidebookPage,       title: 'サービス紹介資料 — Nortiq Labs' },
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
// Per-category titles so each works page is distinct from the index (avoids the
// duplicate-title / duplicate-content problem flagged in Search Console).
ROUTES['works-clinic'].title = 'クリニック・医療の制作実績 — Nortiq Labs';
ROUTES['works-build'].title  = '建築・工務店の制作実績 — Nortiq Labs';
ROUTES['works-realty'].title = '不動産の制作実績｜投資ブランド・物件管理連動の事例 — Nortiq Labs';
ROUTES['works-hr'].title     = '人材業界の制作実績｜採用ブランド・外国人材サイトの事例 — Nortiq Labs';
ROUTES['works-retail'].title = '小売・ECの制作実績｜ブランドLP・越境EC・サブスクの事例 — Nortiq Labs';
ROUTES['works-infra'].title  = 'インフラ・製造の制作実績｜技術サイト・電力サービスの事例 — Nortiq Labs';
ROUTES['works-ai'].title     = 'AIスタートアップの制作実績｜SaaS・シードLPの事例 — Nortiq Labs';

// Generic pages — for any pageId not yet implemented
const GENERIC_IDS = [];
GENERIC_IDS.forEach(id => {
  ROUTES[id] = { c: () => window.GenericPage, title: id + ' — Nortiq Labs', argName: 'pageId', argVal: id };
});

// Product detail pages
ROUTES['product-vetonet'] = { c: () => window.ProductVetoNetPage, title: 'VetoNet｜AI Agent Security 研究開発プロダクト — Nortiq Labs' };
ROUTES['product-wpchat']  = { c: () => window.ProductWPChatPage,  title: 'WP AIチャットボット — Nortiq Labs' };
ROUTES['product-tennis']  = { c: () => window.ProductTennisPage,  title: 'テニスのフォームをAIで解析するアプリ｜33関節をスマホ動画で診断 — Nortiq Labs' };

// Feature pages
ROUTES['feature-cms']       = { c: () => window.FeatureCMSPage,       title: 'CMS / 記事更新システム — Nortiq Labs' };
ROUTES['feature-lpo']       = { c: () => window.FeatureLPOPage,       title: 'LP制作 / LPO — Nortiq Labs' };
ROUTES['feature-recruit']   = { c: () => window.FeatureRecruitPage,   title: '採用専門サイトの制作 — Nortiq Labs' };
ROUTES['feature-analytics'] = { c: () => window.FeatureAnalyticsPage, title: 'アクセス解析のカスタム実装 — Nortiq Labs' };

// Works variant pages
['works-lp-corp', 'works-lp-recruit', 'works-lp-ec', 'works-video'].forEach(id => {
  ROUTES[id] = { c: () => window.WorksVariantPage, title: '制作実績 — Nortiq Labs', argName: 'pageId', argVal: id };
});
ROUTES['works-lp-corp'].title    = 'コーポレートサイトの制作実績｜エネ・SaaS・建設・製造の事例 — Nortiq Labs';
ROUTES['works-lp-recruit'].title = '採用LPの制作実績｜新卒採用ブランドサイトの事例 — Nortiq Labs';
ROUTES['works-lp-ec'].title      = 'EC連動LPの制作実績｜越境EC・実店舗送客の事例 — Nortiq Labs';
ROUTES['works-video'].title      = '動画制作の実績｜動画SEO・配信基盤・ショート動画の事例 — Nortiq Labs';

// Legal pages
['privacy', 'terms', 'privacy-handling'].forEach(id => {
  ROUTES[id] = { c: () => window.LegalPage, title: '法務 — Nortiq Labs', argName: 'pageId', argVal: id };
});
ROUTES['privacy'].title          = 'プライバシーポリシー — Nortiq Labs';
ROUTES['terms'].title            = '利用規約 — Nortiq Labs';
ROUTES['privacy-handling'].title = '個人情報の取扱いについて — Nortiq Labs';

// News & Recruit
ROUTES['news']    = { c: () => window.NewsPage,    title: 'お知らせ・最新情報 — Nortiq Labs' };
ROUTES['recruit'] = { c: () => window.RecruitPage, title: '採用情報 — Nortiq Labs' };

// NORTIQLAB Site Diagnostic — landing page
ROUTES['diagnostic'] = { c: () => window.DiagnosticLPPage, title: 'NORTIQLAB サイト無料診断｜URLを入れるだけでSEO・AI可視性まで分析 — Nortiq Labs' };

// Industry solutions
['clinic', 'realty', 'build', 'hr', 'retail'].forEach(k => {
  ROUTES['solution-' + k] = { c: () => window.SolutionPage, title: '業種別ソリューション — Nortiq Labs', argName: 'pageId', argVal: 'solution-' + k };
});
ROUTES['solution-clinic'].title = 'クリニック・医療のDXパッケージ｜集客×予約×AI投稿 — Nortiq Labs';
ROUTES['solution-realty'].title = '不動産業の集客×管理パッケージ｜売却査定LP・物件連動 — Nortiq Labs';
ROUTES['solution-build'].title  = '建築・工務店のブランド×案件管理パッケージ — Nortiq Labs';
ROUTES['solution-hr'].title     = '人材業界のマッチング×集客パッケージ｜ATS連携・採用LP — Nortiq Labs';
ROUTES['solution-retail'].title = '小売・ECのOMOパッケージ｜Shopify・実店舗送客・BI分析 — Nortiq Labs';

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
// SEO title override for the flagship DX article (keyword-extended over the bare
// article headline). Guarded so it only applies when the article is registered.
if (ROUTES['article-japan-dx']) {
  ROUTES['article-japan-dx'].title =
    'なぜ日本のDXはアメリカに2〜3年遅れているのか｜中小企業のための調査データ解説 — Nortiq Labs';
}
// SEO <title> overrides for the 2026 article series. Keyword-front-loaded and
// already brand-suffixed (｜Nortiq Labs), so they REPLACE the default
// "${headline} — Nortiq Labs" rather than double-stacking the brand. The page
// headline (article.title / og:title) stays the reader-friendly version.
const ARTICLE_SEO_TITLE = {
  'article-website-launch-1month': 'ホームページ制作は最短1ヶ月で可能｜速さと品質を両立する方法｜Nortiq Labs',
  'article-aio-llmo-reality-check': 'AIO・LLMO対策は本当に必要?日本のAI検索利用率の実態｜Nortiq Labs',
  'article-multi-ai-parallel-productivity': 'AIは複数同時に使うから効率化できる｜利益率を上げる活用術｜Nortiq Labs',
  'article-ai-literacy-mindset-shift': 'なぜAI導入は失敗するのか｜定着に必要な「思考の転換」とは｜Nortiq Labs',
  'article-local-business-geo-meo': '口コミだけでは限界｜実店舗が今すぐやるWeb集客・MEO対策｜Nortiq Labs',
  'article-btob-web-marketing': 'BtoBはWeb集客が最も効率的｜検索流入をリードに変える方法｜Nortiq Labs',
  'article-office-work-automation': 'AIを使わない事務は人件費の無駄｜安全に自動化する方法｜Nortiq Labs',
  'article-benchmark-competitor-success': '成功施策を真似ればWeb集客は成功する｜競合分析と著作権の境界｜Nortiq Labs',
  'article-seo-aio-dual-strategy': 'SEOとAIO両睨みのコンテンツ戦略｜両方に効く共通の型とは｜Nortiq Labs',
  'article-how-to-choose-web-agency': 'Web制作会社の選び方｜「安かろう悪かろう」の罠を避ける方法｜Nortiq Labs',
};
Object.keys(ARTICLE_SEO_TITLE).forEach((id) => { if (ROUTES[id]) ROUTES[id].title = ARTICLE_SEO_TITLE[id]; });
// Punchy social-share titles (og:title / twitter:title) — shorter and stronger
// than the SERP <title>. Falls back to the route title when absent.
const OG_TITLE = {
  'article-website-launch-1month': 'Web制作を最短1ヶ月で。速さと丁寧さは両立できる',
  'article-aio-llmo-reality-check': 'AIO対策に踊らされる前に。日本人はまだAI検索を使っていない',
  'article-multi-ai-parallel-productivity': 'AIは「複数同時に使う」から効率化できる',
  'article-ai-literacy-mindset-shift': 'AIの使い方を教えるのは、想像以上に難しい',
  'article-local-business-geo-meo': '「口コミだけ」では、もう競争にならない',
  'article-btob-web-marketing': 'Web集客はまだまだ熱い。特にBtoBで最強',
  'article-office-work-automation': 'AIを使わない＝無駄な労働。もう自動化できる',
  'article-benchmark-competitor-success': 'うまくいっている施策を真似れば、集客は成功する',
  'article-seo-aio-dual-strategy': 'SEOとAIO、両方に効く「共通の型」がある',
  'article-how-to-choose-web-agency': '制作会社の選び方。「安かろう悪かろう」の罠',
};

// URL <-> route id helpers
function pathFor(id) {
  return id === 'top' ? '/' : '/' + id;
}
function idFromPath(path) {
  const stripped = (path || '').replace(/^\//, '');
  return stripped === '' ? 'top' : stripped;
}

// Build props for an SPA-internal <a>: a REAL href (so crawlers see the link
// and modifier-clicks open a new tab) plus an onClick that keeps client-side
// routing for plain left-clicks. `nav` is the route handler in scope
// (App's onNavigate, or Nav's navTo). `id` is a route id understood by pathFor.
function navProps(id, nav) {
  return {
    href: pathFor(id),
    onClick: (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      nav(id);
    },
  };
}

// Per-route SEO metadata. Since this SPA serves one static index.html for every
// route, canonical + description must be rewritten client-side on navigation so
// each page gets its own (Google reads the rendered DOM). Falls back to default.
const NORTIQ_SITE = 'https://nortiqlab.com';
const DEFAULT_DESC = '米国の技術水準を、日本の中小企業の武器に。Web制作・AIチャットボット・DX/ML実装まで、20社の支援実績を持つ技術チームが段階的に伴走するDXパートナーです。';
const SEO_DESC = {
  top: DEFAULT_DESC,
  web: 'WordPress・静的・Next.jsを目的別に選ぶ集客重視のWeb制作。WCAG 2.1 AA／Core Web Vitals Goodを標準実装し、コーポレート・LP・ブランドサイトを30万円〜、設計から公開後の運用改善まで一貫支援します。',
  chatbot: 'WordPressのブログ更新が止まる課題を、自社開発のAIチャットボット投稿ツールで解決。質問するだけで記事を作成しWordPressへ自動投稿。既存導入先で記事1本の工数-87%・投稿頻度6.2倍・オーガニック流入1.8倍。10万円〜。',
  dx: '機械学習・業務自動化・データ分析基盤・生成AI組み込みを、米国UC Berkeley研究背景の技術チームが伴走。Web/チャットボットからの初期投資ゼロで始め、PoC→本実装まで段階的にGO/NO-GO判断。50万円〜。',
  works: 'クリニック・不動産・建築・人材・小売/EC・インフラ・AIの7業種20社のWeb制作・DX支援事例。予約+110%、問い合わせ2.4倍、BtoB商談+210%などの成果につながったオリジナル制作を業種別に掲載。',
  voice: 'Web制作からAI・DXまでご利用いただいた20社の声。SEO流入1.8倍、現場工数38%減、採用応募52%増、商談化率4倍など、長期運用に伴走するNortiq Labsへの評価を業種横断で紹介します。',
  pricing: '料金プラン。Web制作30万円〜、AIチャットボット・DX実装まで、段階的に始められる明朗な料金体系をご案内します。',
  support: '公開後も伴走するサポート体制。営業日24時間以内のご返信で、Web・AI・DXの運用と改善を継続的にご支援します。',
  diagnostic: 'URLを入れるだけでテクニカルSEO・オンページ・リンク切れ・AI可視性・競合比較を無料診断。認定エンジニアが改善提案まで添えてお届けします。登録不要・約60秒。',
  diagnosis: 'サイト無料診断。Nortiq独自のチェックリストで、現状のWeb課題を可視化し、改善の優先順位をご提案します。',
  subsidy: '補助金を活用したDX導入のご相談。IT導入補助金などの活用を視野に、DX投資の進め方をご相談いただけます。',
  guidebook: 'Nortiq LabsのWeb制作サービス紹介資料（無料DL・全11ページ）。制作の進め方・実績・料金プラン・制作の流れまで一冊にまとめました。',
  column: 'Nortiq Labsのコラム・技術ブログ。AI・SEO・DX・業種別の実務知見を、調査データに基づいてお届けします。',
  company: 'Nortiq Labs 会社概要。米国のAI研究背景を持つエンジニアと、日本の経営課題に向き合うメンバーによる技術チームです。',
  staff: 'Nortiq Labsのチーム紹介。Founder / Computer Scientist / Data Scientist の三職能が、お客様1社にチーム編成で並走します。',
  recruit: 'Nortiq Labsの採用情報。米国の技術水準を、日本の中小企業の武器に。技術と現場の両輪で挑むメンバーを募集しています。',
  'product-vetonet': 'AI Agentの出力を7段階で多層検証する研究開発プロダクト。分散システム理論を応用したMulti-Agent検証・監査証跡・Red Teamで、業務にAIを導入する前のリスクを洗い出します。',
  'product-wpchat': 'WordPress AIチャットボット / AI投稿アシスタント。ブログ更新と問い合わせ対応を自動化し、運用負担を減らします。',
  'product-tennis': 'スマホ動画をAIが解析し、テニスのフォームの改善点を可視化する一般向けアプリ。MediaPipeで33関節を追跡してプロとの差分をスコア化する、自社開発のComputer Vision検証プロダクトです。',
  'feature-lpo': 'LP制作 / LPO 支援。コンバージョンを最大化するランディングページの設計・改善を、データに基づいて行います。',
  'feature-recruit': '求める人材像の言語化から採用ブランドサイト・LP・エントリーフォーム、社員撮影・ATS連携まで一貫設計。応募率を平均+52%高める採用専門サイトを構築します。',
  'feature-analytics': 'GA4・GSC・BigQuery・Looker Studioを統合し、経営判断に直結するKPIダッシュボードをカスタム実装。ファネル分析・流入元別LTV/ROAS・異常検知アラートまで設計します。',
  'feature-cms': 'WordPress・Next.js+MDX・Headless CMSを運用体制に合わせ選定。AI投稿ツール連携で下書き生成・校正・公開予約まで自動化し、記事更新の工数を1/10に削減します。',
  news: 'Nortiq Labsからの最新情報。WP AIチャットボットのバージョンアップ、VetoNet βの先行公開、Anthropic Claude API対応など、リリース・プレス情報をお届けします。',
  'works-build': '大規模修繕のRenew Reuse Loop、不断水工法のRAKUYU-Zなど建築・工務店のWeb制作・採用支援事例。BtoB商談+210%等の成果につながったオリジナル制作を紹介します。',
  'works-clinic': 'あおぞらFamily Clinic、AIRA CLINIC GINZA、白藍デンタル等のWeb制作・AIチャットボット導入事例。予約+110%・問い合わせ2.4倍の医療業界向け実績を掲載します。',
  'article-website-launch-1month': '「来月までにサイトを公開したい」を叶えます。Web制作が通常2〜4ヶ月かかる理由と、AIを駆使して品質を保ちながら最短1ヶ月でローンチする方法を、京都のNortiq Labsが解説します。',
  'article-aio-llmo-reality-check': 'GoogleのAI Overviewsで注目のAIO・LLMO対策。しかし現状の対策は効果が見えにくく陳腐化も早いのが実情です。日本人のAI検索利用率の最新データをもとに、中小企業が今やるべきことを冷静に解説します。',
  'article-multi-ai-parallel-productivity': '「AIを使ったけど変わらなかった」のは使い方の問題です。契約書・コード・マーケを並行処理する複数AI活用で生産性は激変します。UC Berkeley出身チームが実践するAI活用術を、データとともに解説します。',
  'article-ai-literacy-mindset-shift': 'アカウントを配っても現場でAIが使われない。中小企業の約6割がAIを活用できていない原因は、技術ではなく発想にあります。「どれだけ自分でやらないか」という思考転換と、定着のための進め方を解説します。',
  'article-local-business-geo-meo': '「常連と紹介で回っているから大丈夫」は危険です。Googleビジネスプロフィール最適化で7倍のクリックを獲得できるデータも。実店舗が地域検索で見つけてもらうためのローカルSEO・MEO対策を解説します。',
  'article-btob-web-marketing': 'SNS全盛でも、BtoBではWeb集客が最も費用対効果の高い手法です。自ら検索する高意欲層をリードに変える仕組みとは。ブログ運営で67%多いリードを得るデータをもとに、Nortiq Labsが解説します。',
  'article-office-work-automation': '請求書作成やデータ入力、その事務作業の多くは自動化できます。情報漏洩が心配ならLlamaやgpt-ossをローカル運用すれば解決。AIを使わないことの本当のコストと、自動化の進め方を解説します。',
  'article-benchmark-competitor-success': 'Web集客の正解はすでに市場にあります。競合の技術スタックや構造はBuiltWith等で調査可能です。著作権を守りながら成功施策を学び、自社のオリジナルへ昇華させる具体的な方法を解説します。',
  'article-seo-aio-dual-strategy': '「SEOとAIOどちらに賭けるか」は誤った問いです。両方に効く共通施策があります。明確な見出し構造、結論先行、出典明示など、人にもAIにも評価されるコンテンツ設計を、最新研究をもとに解説します。',
  'article-how-to-choose-web-agency': '格安ホームページ制作の裏側では、テンプレート流用や保守なしなどコスト削減の仕組みが働いています。失敗しない制作会社の見極め方と、安さの理由を見抜くための質問を、料金の目安とともに解説します。',
  'article-japan-dx': 'IPA・経産省・OECD等の最新調査から、日本のDXが米国に遅れる構造的要因を3点に整理。中小企業が「段階的アプローチ」で人手不足と2025年の崖を越える現実解を解説します。',
  'article-vetonet': 'AIエージェントは今や自律的にファイル操作・コマンド実行・決済まで行う。その出力を多層検証する自社開発ツールVetoNetの開発記。3,820通りの攻撃テストから見えたAIエージェントセキュリティの要点を、開発者目線で解説します。',
  'article-wordpress-stall': '日本のオウンドメディアは約3割が更新停止、65.5%が半年以内に止まる。執筆負荷・ひとり広報・SEOの時間軸ギャップという構造を調査データで分解し、AI投稿アシスタントで更新を継続させる現実的な解決策を解説します。',
  'article-core-web-vitals': 'LCP・INP・CLSはCrUX実ユーザーデータの75%タイルで判定され、Lighthouse満点でも「Good」が取れない理由がここにある。3指標すべてを満たすのはモバイルで48%。測ってから直すための実装手順を解説します。',
  'article-clinic-web': '2026年のクリニック集客はE-E-A-T強化・MEO優位・医療広告ガイドライン対応の3点が同時に問われる。初診の集患手段1位はGoogle検索（51.3%）。AI検索時代に患者へ選ばれる医院サイトの作り方を調査データで解説します。',
  'article-ai-poc': '生成AI PoCの約3分の2は本番運用に到達しない。失敗には目的の曖昧さ・ROIの非定量化・データ基盤の不在など再現性あるパターンがある。本実装まで進む案件との分岐点を、最新調査とGo/No-Go基準から解説します。',
  'article-realty-lp': '不動産売却査定LPのCVRは2〜3%台、フォーム離脱率は約70%。ファーストビュー・売主心理に刺さるコピー・EFO・匿名AI査定の入口化など、反響を最大化する7つの必須要素を一つの設計思想で貫く方法を解説します。',
  'article-claude-vs-gpt': '2026年5月時点の業務利用比較。Claude（Opus 4.7／Sonnet 4.6）はコーディング・長文理解・ハルシネーション抑制・日本語で優位、GPT-5.5は汎用性で先行。エンタープライズシェアと用途別の使い分けを解説します。',
  'works-realty': '不動産投資ブランドPLEAST（問合せ3.2×）、物件管理連動の投資物件専門サイト（反響2.7×）など、不動産業のWeb制作・SEO・DX実績を紹介します。',
  'works-hr': '外国人材組合Asia Exchange（応募+84%）、新卒採用ブランドAXIA（エントリー2.1×）、中途採用LP（応募1.6×）など、人材業界のWeb制作・AIチャットボット・LPO実績を紹介します。',
  'works-retail': 'キッチンカーpanza（SNS流入4.6×）、骨董店TAKETORAの越境EC（海外PV5.2×）、サブスクEC（解約率-32%）など、小売・ECのWeb制作・EC・DX実績を紹介します。',
  'works-infra': '不断水工法のRAKUYU-Z工法協会サイト、電力会社VOLTIOのサービスサイト刷新（PV2.1×）など、インフラ・製造業のWeb制作・アクセス解析実装の実績を紹介します。',
  'works-ai': 'AIスタートアップSable（商談化率4.2×）、BtoB SaaSのATLAS ML Engine（問合せ+210%）、ML PoC LP（デモ申込5.6×）など、AI企業のWeb制作・AIチャットボット実績を紹介します。',
  'works-lp-corp': '再エネVOLTIO（資料DL2.4×）、AI SaaS Sable（問合せ+210%）、ML製品ATLAS（PoC申込2.6×）など、投資家・取引先・採用候補に伝わるコーポレートサイトの制作実績を紹介します。',
  'works-lp-recruit': '新卒採用ブランドサイトAXIA（マニフェスト型：エントリー2.4×／社員フィーチャー型：応募数3.6×）など、コンセプト設計から社員撮影・エントリー導線まで一貫構築した採用LP実績を紹介します。',
  'works-lp-ec': 'クラフト衣料のエディトリアルEC（客単価+24%）、骨董店TAKETORAのバイリンガル越境EC（海外売上2.2×）など、OMO設計・越境対応のEC送客LP制作実績を紹介します。',
  'works-video': '院長インタビュー（視聴完了率+42%）、物件紹介の動画SEO（問い合わせ1.9×）、配信プラットフォーム構築（登録者+3.1k）など、撮影・編集・配信まで対応した動画制作事例を紹介します。',
  'solution-clinic': '薬機法フィルター付きAI投稿・予約サイト・FAQボットを一体化したクリニック向けDXパッケージ。問い合わせ2.4×・予約+110%の事例。60〜180万円＋月額運用3〜8万円。',
  'solution-realty': '売買・賃貸・売却査定・投資を導線別に最適化し、ATBB/レインズ等の物件管理と連動。月間PV3.1×・査定依頼+180%の事例。80〜300万円＋月額運用5〜15万円。',
  'solution-build': '施工事例DBを軸にしたブランドサイトに、見積〜施工〜アフターの案件管理とOB顧客追客を一体化。工数-38%・受注+52%の事例。100〜400万円＋月額運用5〜20万円。',
  'solution-hr': '新卒・中途・派遣・外国人材に対応し、求職者LP・求人企業サイト・ATS連携を最適化。応募+52%・エントリー2.1×の事例。150〜500万円＋月額運用10〜30万円。',
  'solution-retail': 'Shopify/独自ECと実店舗在庫連動、POS+EC+メルマガ統合のLTV分析、AIレコメンドを一体化したOMOパッケージ。CVR1.8×・EC売上+210%の事例。200〜800万円＋月額運用10〜40万円。',
  'privacy': 'Nortiq Labs Inc. の個人情報保護方針。収集・利用目的、第三者提供、SOC 2 Type II準拠のセキュリティ、開示・訂正・削除請求、Cookieの取り扱いを定めています。',
  'terms': 'Nortiq Labs Inc. のサービス利用規約。適用範囲・契約の成立・利用者の義務・禁止事項・知的財産権・免責事項・準拠法および管轄について定めています。',
  'privacy-handling': 'Nortiq Labs Inc. における個人情報の利用目的、第三者提供、業務委託、開示請求の窓口など、個人情報の具体的な取扱いについて説明しています。',
};
const NOINDEX_ROUTES = { sitemap: true };
function descFor(route) {
  // Explicit per-route description wins (incl. SEO-tuned article descriptions).
  if (SEO_DESC[route]) return SEO_DESC[route];
  if (route && route.indexOf('article-') === 0) {
    const slug = route.slice('article-'.length);
    const a = ((typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {})[slug];
    return a ? `${a.title} ｜ Nortiq Labs の技術ブログ（${a.category}）。` : DEFAULT_DESC;
  }
  return DEFAULT_DESC;
}
// Per-route OG/Twitter share image. Article routes use their own eyecatch
// (assets/blog-*.png, same image referenced by the BlogPosting JSON-LD); every
// other route falls back to the site-wide og-image.png.
function ogImageFor(route) {
  if (route && route.indexOf('article-') === 0) {
    const slug = route.slice('article-'.length);
    const a = ((typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {})[slug];
    if (a && a.img) return NORTIQ_SITE + '/' + String(a.img).replace(/^\//, '');
  }
  return NORTIQ_SITE + '/assets/og-image.png';
}
// Social-share title for a route: punchy OG override when defined, else the
// route's <title> (the prior behavior for every non-overridden route).
function ogTitleFor(route) {
  if (OG_TITLE[route]) return OG_TITLE[route];
  return (ROUTES[route] || ROUTES.top).title;
}
function setMetaContent(selector, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute('content', value);
}

// Per-route structured data (injected into <head> on navigation; Google reads
// the rendered DOM, and the prerender stage bakes it into the static HTML).
// BreadcrumbList on every subpage + a page-specific primary node. Organization
// (#org) and WebSite (#website) are fully defined in the static shell's @graph
// (see build.js), so sub-page nodes only REFERENCE them by @id — provider /
// publisher / author links resolve without re-declaring those nodes.
const NORTIQ_ORG_ID = NORTIQ_SITE + '/#org';
const NORTIQ_WEBSITE_ID = NORTIQ_SITE + '/#website';
const ORG_REF = { '@id': NORTIQ_ORG_ID };
const SERVICE_LD = {
  web: { name: 'Web制作', types: ['コーポレートサイト制作', 'LP制作', 'ブランドサイト制作'] },
  chatbot: { name: 'AIチャットボット導入', types: ['AIチャットボット', 'WordPress AI投稿アシスタント', '問い合わせ自動化'] },
  dx: { name: 'DX・ML実装', types: ['機械学習', 'データ分析', '業務自動化'] },
};

// Intermediate breadcrumb level (between トップ and the current page) for routes
// whose parent is a real, linkable page. Routes absent here get a 2-level crumb.
const CRUMB_PARENT = {
  'works-build':       { name: '制作実績', id: 'works' },
  'works-clinic':      { name: '制作実績', id: 'works' },
  'feature-analytics': { name: '機能・サービス', id: 'web' },
  'feature-cms':       { name: '機能・サービス', id: 'web' },
  'feature-recruit':   { name: '機能・サービス', id: 'web' },
};
// Any article route nests under コラム (handled generically in routeLd).
const ARTICLE_CRUMB_PARENT = { name: 'コラム', id: 'column' };

// BLOG manifest dates are 'YYYY.MM.DD'; Article schema wants ISO 'YYYY-MM-DD'.
function isoDate(d) { return (d || '').replace(/\./g, '-'); }

// Page-specific primary schema (in addition to BreadcrumbList) for the routes
// that need a dedicated @type. Returns null for routes handled elsewhere.
function pageLd(route, url) {
  const desc = descFor(route);
  // Article routes (incl. #1 /article-japan-dx) → BlogPosting referencing #org.
  if (route.indexOf('article-') === 0) {
    const slug = route.slice('article-'.length);
    const a = ((typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {})[slug];
    if (!a) return null;
    const img = a.img ? NORTIQ_SITE + '/' + String(a.img).replace(/^\//, '') : NORTIQ_SITE + '/assets/og-image.png';
    const date = isoDate(a.date);
    return {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: a.title, description: desc, image: img, url,
      inLanguage: 'ja', articleSection: a.category,
      datePublished: date, dateModified: date,
      author: { '@type': 'Organization', '@id': NORTIQ_ORG_ID, name: 'Nortiq Labs' },
      publisher: ORG_REF,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    };
  }
  switch (route) {
    case 'works-clinic':
    case 'works-realty':
    case 'works-build':
    case 'works-hr':
    case 'works-retail':
    case 'works-infra':
    case 'works-ai': {
      const cat = route.slice('works-'.length);
      const works = ((typeof window !== 'undefined' && window.NORTIQ_WORKS) || []).filter((w) => w.category === cat);
      const WCH = { clinic: 'クリニック・医療', realty: '不動産', build: '建築・工務店', hr: '人材', retail: '小売 / EC', infra: 'インフラ・製造', ai: 'AIスタートアップ' };
      const heading = (WCH[cat] || '制作実績') + 'の制作実績';
      return {
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: heading, description: desc, url,
        isPartOf: { '@id': NORTIQ_WEBSITE_ID }, publisher: ORG_REF,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: works.map((w, i) => ({ '@type': 'ListItem', position: i + 1, name: w.title, url })),
        },
      };
    }
    case 'feature-analytics':
    case 'feature-cms':
    case 'feature-recruit':
    case 'feature-lpo': {
      const svc = {
        'feature-analytics': { name: 'アクセス解析のカスタム実装', type: 'Analytics Implementation' },
        'feature-cms':       { name: 'CMS / 記事更新システム',     type: 'CMS Implementation' },
        'feature-recruit':   { name: '採用専門サイトの制作',       type: 'Recruitment Website Development' },
        'feature-lpo':       { name: 'LP制作 / LPO',               type: 'Landing Page Optimization' },
      }[route];
      return {
        '@context': 'https://schema.org', '@type': 'Service',
        name: svc.name, serviceType: svc.type, description: desc, url, areaServed: 'JP',
        provider: ORG_REF,
      };
    }
    case 'diagnostic':
      return {
        '@context': 'https://schema.org', '@type': 'WebApplication',
        name: 'NORTIQLAB サイト診断', url,
        applicationCategory: 'SEO Analysis Tool', operatingSystem: 'Any (Web)',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
        featureList: ['テクニカルSEO', 'オンページ分析', 'リンク切れ検出', 'AI可視性チェック', '競合比較'],
        provider: ORG_REF,
      };
    case 'news':
      return {
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: 'お知らせ・最新情報', description: desc, url,
        isPartOf: { '@id': NORTIQ_WEBSITE_ID }, publisher: ORG_REF,
      };
    case 'product-tennis':
      return {
        '@context': 'https://schema.org', '@type': 'SoftwareApplication',
        name: 'テニスフォーム分析アプリ', description: desc, url,
        applicationCategory: 'SportsApplication', operatingSystem: 'Web (iOS / Android ブラウザ対応)',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
        provider: ORG_REF, publisher: ORG_REF,
      };
    case 'product-vetonet':
      return {
        '@context': 'https://schema.org', '@type': 'SoftwareApplication',
        name: 'VetoNet', description: desc, url,
        applicationCategory: 'SecurityApplication', operatingSystem: 'Web / Server',
        softwareVersion: 'beta', applicationSuite: 'Nortiq Labs AI Agent Security',
        provider: ORG_REF, publisher: ORG_REF,
      };
    case 'works':
      // Works index → CollectionPage whose ItemList is built from the same
      // NORTIQ_WORKS source of truth the page renders (all categories).
      return {
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: '制作実績', description: desc, url,
        isPartOf: { '@id': NORTIQ_WEBSITE_ID }, publisher: ORG_REF,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: ((typeof window !== 'undefined' && window.NORTIQ_WORKS) || [])
            .map((w, i) => ({ '@type': 'ListItem', position: i + 1, name: w.title, url })),
        },
      };
    case 'voice':
      // Testimonials are anonymized (initials, no ratings) → CollectionPage only.
      // Review / AggregateRating intentionally avoided (unverifiable review rich
      // results violate Google's policy), consistent with routeLd's note.
      return {
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: 'ご利用会社様の声', description: desc, url,
        isPartOf: { '@id': NORTIQ_WEBSITE_ID }, publisher: ORG_REF,
      };
    case 'product-wpchat':
      return {
        '@context': 'https://schema.org', '@type': 'SoftwareApplication',
        name: 'WP AIチャットボット', description: desc, url,
        applicationCategory: 'BusinessApplication', operatingSystem: 'WordPress / Web',
        provider: ORG_REF, publisher: ORG_REF,
      };
    case 'column':
      return {
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: 'コラム / 技術ブログ', description: desc, url,
        isPartOf: { '@id': NORTIQ_WEBSITE_ID }, publisher: ORG_REF,
      };
    case 'works-lp-corp':
    case 'works-lp-recruit':
    case 'works-lp-ec':
    case 'works-video': {
      const LPH = { 'works-lp-corp': 'コーポレートサイトの制作実績', 'works-lp-recruit': '採用LPの制作実績', 'works-lp-ec': 'EC連動LPの制作実績', 'works-video': '動画制作の実績' };
      return {
        '@context': 'https://schema.org', '@type': 'CollectionPage',
        name: LPH[route], description: desc, url,
        isPartOf: { '@id': NORTIQ_WEBSITE_ID }, publisher: ORG_REF,
      };
    }
    case 'solution-clinic':
    case 'solution-realty':
    case 'solution-build':
    case 'solution-hr':
    case 'solution-retail': {
      const SOL = { 'solution-clinic': 'クリニック・医療 DXパッケージ', 'solution-realty': '不動産 集客×管理パッケージ', 'solution-build': '建築・工務店 ブランド×案件管理パッケージ', 'solution-hr': '人材 マッチング×集客パッケージ', 'solution-retail': '小売・EC OMOパッケージ' };
      return {
        '@context': 'https://schema.org', '@type': 'Service',
        name: SOL[route], serviceType: '業種特化 DX / Web制作パッケージ', description: desc, url, areaServed: 'JP',
        provider: ORG_REF,
      };
    }
    default:
      return null;
  }
}

function routeLd(route) {
  const url = NORTIQ_SITE + pathFor(route);
  const meta = ROUTES[route] || ROUTES.top;
  const pageName = (meta.title || '').replace(/\s*[—｜|].*$/, '').trim() || 'Nortiq Labs';
  const out = [];
  if (route !== 'top') {
    const crumbs = [{ '@type': 'ListItem', position: 1, name: 'トップ', item: NORTIQ_SITE + '/' }];
    const parent = CRUMB_PARENT[route] || (route.indexOf('article-') === 0 ? ARTICLE_CRUMB_PARENT : null);
    if (parent) {
      crumbs.push({ '@type': 'ListItem', position: 2, name: parent.name, item: NORTIQ_SITE + pathFor(parent.id) });
    }
    crumbs.push({ '@type': 'ListItem', position: crumbs.length + 1, name: pageName, item: url });
    out.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs });
  }
  // Page-specific primary node (Article / CollectionPage / Service / WebApplication
  // / SoftwareApplication). Falls back to the generic Service map for web/chatbot/dx.
  const primary = pageLd(route, url);
  if (primary) {
    out.push(primary);
  } else if (SERVICE_LD[route]) {
    const s = SERVICE_LD[route];
    out.push({
      '@context': 'https://schema.org', '@type': 'Service',
      name: s.name, description: descFor(route), url, serviceType: s.types, areaServed: 'JP',
      provider: { '@type': 'Organization', '@id': NORTIQ_ORG_ID, name: 'Nortiq Labs', url: NORTIQ_SITE + '/' },
    });
  }
  // Review / AggregateRating omitted intentionally — no public reviews yet.
  return out;
}

function App() {
  const [route, setRoute] = React.useState(() => {
    const id = idFromPath(window.location.pathname);
    return ROUTES[id] ? id : 'top';
  });
  const [contactOpen, setContactOpen] = React.useState(false);
  const [contactCategory, setContactCategory] = React.useState('');
  // The <head> gtag('config') already sent a page_view for the document that
  // loaded, so the route effect below must skip its first run or the landing
  // page would be counted twice.
  const landingViewSent = React.useRef(false);

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
    // Set per-route canonical, creating the <link> if the shell omitted it
    // (the app.html fallback shell ships without a canonical so non-prerendered
    // routes never appear to canonicalize to the homepage in raw HTML).
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
    // Utility pages (HTML sitemap) → noindex; all others stay indexable.
    let robots = document.head.querySelector('meta[name="robots"]');
    if (NOINDEX_ROUTES[route]) {
      if (!robots) { robots = document.createElement('meta'); robots.setAttribute('name', 'robots'); document.head.appendChild(robots); }
      robots.setAttribute('content', 'noindex, follow');
    } else if (robots) {
      robots.setAttribute('content', 'index, follow');
    }
    const ogImg = ogImageFor(route);
    setMetaContent('meta[name="description"]', desc);
    setMetaContent('meta[property="og:url"]', url);
    setMetaContent('meta[property="og:title"]', ogTitleFor(route));
    setMetaContent('meta[property="og:description"]', desc);
    setMetaContent('meta[property="og:image"]', ogImg);
    setMetaContent('meta[name="twitter:title"]', ogTitleFor(route));
    setMetaContent('meta[name="twitter:description"]', desc);
    setMetaContent('meta[name="twitter:image"]', ogImg);
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

    // GA4 page_view for the SPA navigation that just happened. pushState/popstate
    // have already updated window.location by the time this effect runs, and
    // document.title is set above, so the hit carries the new page's identity.
    if (landingViewSent.current) {
      if (typeof window.nqPageView === 'function') {
        window.nqPageView({ page_location: window.location.href, page_title: meta.title });
      }
    } else {
      landingViewSent.current = true;
    }
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
      // 無料診断 CTA click → GA4 event + Google Ads conversion (all entry CTAs
      // route through here, so this is the single place that fires it).
      if (id === 'diagnostic' && typeof window.nqTrack === 'function') {
        window.nqTrack('diagnostic_cta_click', {}, 'diagnostic');
      }
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
