// ============================================================
// Nortiq Labs — App shell
// ============================================================

const ROUTES = {
  top:             { c: () => window.TopPage,             title: '京都のWeb制作・AI導入・DX支援｜Nortiq Labs' },
  web:             { c: () => window.WebPage,             title: 'ホームページ制作サービス・機能一覧｜Nortiq Labs' },
  chatbot:         { c: () => window.ChatbotPage,         title: 'AIチャットボット導入サービス｜機能・料金・事例 — Nortiq Labs' },
  dx:              { c: () => window.DXPage,              title: 'DX支援・機械学習（ML）実装サービス｜Nortiq Labs' },
  works:           { c: () => window.WorksPage,           title: '制作実績一覧｜業種別のWeb制作・DX事例 — Nortiq Labs', argName: 'category', argVal: null },
  voice:           { c: () => window.VoicePage,           title: '導入事例・お客様の声｜Nortiq Labs' },
  support:         { c: () => window.SupportPage,         title: '運用サポート・保守プラン｜Nortiq Labs' },
  pricing:         { c: () => window.PricingPage,         title: '料金プラン｜ホームページ制作・AI導入の費用 — Nortiq Labs' },
  'quick-diagnosis': { c: () => window.QuickDiagnosisPage, title: 'クイック診断 — Nortiq Labs' },
  subsidy:         { c: () => window.SubsidyPage,         title: '補助金を使ったホームページ制作・AI導入の相談｜Nortiq Labs' },
  guidebook:       { c: () => window.GuidebookPage,       title: 'サービス紹介資料ダウンロード（無料）｜Nortiq Labs' },
  column:          { c: () => window.ColumnPage,          title: 'コラム・技術ブログ｜AI・SEO・DXの実務知見 — Nortiq Labs' },
  company:         { c: () => window.CompanyPage,         title: '会社概要｜株式会社ノーティックラボ（京都市）' },
  staff:           { c: () => window.StaffPage,           title: 'チーム・スタッフ紹介｜Nortiq Labs' },
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
ROUTES['works-clinic'].title = 'クリニック・医療のホームページ制作実績｜Nortiq Labs';
ROUTES['works-build'].title  = '建築・工務店のホームページ制作実績｜Nortiq Labs';
ROUTES['works-realty'].title = '不動産会社のホームページ制作実績｜売却査定LP・物件サイト — Nortiq Labs';
ROUTES['works-hr'].title     = '人材会社のホームページ制作実績｜Nortiq Labs';
ROUTES['works-retail'].title = '小売・ECサイトの制作実績｜越境EC・OMO対応 — Nortiq Labs';
ROUTES['works-infra'].title  = 'インフラ・製造業のホームページ制作実績｜Nortiq Labs';
ROUTES['works-ai'].title     = 'AIスタートアップのサイト制作・開発実績｜Nortiq Labs';

// Generic pages — for any pageId not yet implemented
const GENERIC_IDS = [];
GENERIC_IDS.forEach(id => {
  ROUTES[id] = { c: () => window.GenericPage, title: id + ' — Nortiq Labs', argName: 'pageId', argVal: id };
});

// Product detail pages
ROUTES['product-vetonet'] = { c: () => window.ProductVetoNetPage, title: 'VetoNet｜AIエージェント向けセキュリティミドルウェア — Nortiq Labs' };
ROUTES['product-wpchat']  = { c: () => window.ProductWPChatPage,  title: 'ブログボット（AI投稿アシスタント）｜WordPress対応のAIブログ作成ツール — Nortiq Labs' };
ROUTES['product-tennis']  = { c: () => window.ProductTennisPage,  title: 'テニスのフォームをAIで解析するアプリ｜33関節をスマホ動画で診断 — Nortiq Labs' };

// Feature pages
ROUTES['feature-cms']       = { c: () => window.FeatureCMSPage,       title: 'CMS構築・記事更新システム開発｜Nortiq Labs' };
ROUTES['feature-lpo']       = { c: () => window.FeatureLPOPage,       title: 'LP制作・LPO（CVR改善）サービス｜Nortiq Labs' };
ROUTES['feature-recruit']   = { c: () => window.FeatureRecruitPage,   title: '採用サイト制作｜応募が集まる採用専門サイトの設計 — Nortiq Labs' };
ROUTES['feature-analytics'] = { c: () => window.FeatureAnalyticsPage, title: 'GA4カスタム実装・アクセス解析サービス｜Nortiq Labs' };

// Works variant pages
['works-lp-corp', 'works-lp-recruit', 'works-lp-ec', 'works-video'].forEach(id => {
  ROUTES[id] = { c: () => window.WorksVariantPage, title: '制作実績 — Nortiq Labs', argName: 'pageId', argVal: id };
});
ROUTES['works-lp-corp'].title    = 'コーポレートサイト制作実績｜Nortiq Labs';
ROUTES['works-lp-recruit'].title = '採用サイト・採用LP制作実績｜Nortiq Labs';
ROUTES['works-lp-ec'].title      = 'EC連動LP制作実績｜Nortiq Labs';
ROUTES['works-video'].title      = '動画制作事例｜ショート動画×SEO・Web活用 — Nortiq Labs';

// Legal pages
['privacy', 'terms', 'privacy-handling'].forEach(id => {
  ROUTES[id] = { c: () => window.LegalPage, title: '法務 — Nortiq Labs', argName: 'pageId', argVal: id };
});
ROUTES['privacy'].title          = 'プライバシーポリシー — Nortiq Labs';
ROUTES['terms'].title            = '利用規約 — Nortiq Labs';
ROUTES['privacy-handling'].title = '個人情報の取扱いについて — Nortiq Labs';

// News & Recruit
ROUTES['news']    = { c: () => window.NewsPage,    title: 'お知らせ｜Nortiq Labs' };
ROUTES['recruit'] = { c: () => window.RecruitPage, title: '採用情報｜Nortiq Labsで働く — 京都のWeb×AIカンパニー' };

// NORTIQLAB Site Diagnostic — landing page
ROUTES['diagnostic'] = { c: () => window.DiagnosticLPPage, title: 'ホームページ無料診断｜URL入力で改善点をチェック — Nortiq Labs' };

// Industry solutions
['clinic', 'realty', 'build', 'hr', 'retail'].forEach(k => {
  ROUTES['solution-' + k] = { c: () => window.SolutionPage, title: '業種別ソリューション — Nortiq Labs', argName: 'pageId', argVal: 'solution-' + k };
});
ROUTES['solution-clinic'].title = 'クリニック向けDX・Web集客パッケージ｜予約×MEO×AI対応 — Nortiq Labs';
ROUTES['solution-realty'].title = '不動産業の集客×管理パッケージ｜売却査定LP・物件連動 — Nortiq Labs';
ROUTES['solution-build'].title  = '建築・工務店向けサイト制作×案件管理パッケージ｜Nortiq Labs';
ROUTES['solution-hr'].title     = '人材業向けマッチングサイト構築×集客パッケージ｜Nortiq Labs';
ROUTES['solution-retail'].title = 'Shopify OMOパッケージ｜店舗×ECの在庫・顧客統合 — Nortiq Labs';

// Detail templates (single work / article example pages)

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
    'なぜ日本のDXはアメリカに2〜3年遅れているのか｜要因と打ち手 — Nortiq Labs';
}
// SEO <title> overrides for the 2026 article series. Keyword-front-loaded and
// already brand-suffixed (｜Nortiq Labs), so they REPLACE the default
// "${headline} — Nortiq Labs" rather than double-stacking the brand. The page
// headline (article.title / og:title) stays the reader-friendly version.
const ARTICLE_SEO_TITLE = {
  'article-blog-bot': 'ブログボットとは？AIで記事を作成・投稿する仕組みと選び方【2026年版】｜Nortiq Labs',
  'article-vetonet': 'AI agent securityとは？VetoNet開発の裏側 — Nortiq Labs',
  'article-wordpress-stall': 'WordPressのブログ更新が止まる本当の理由と解決策｜AI投稿という選択肢 — Nortiq Labs',
  'article-core-web-vitals': 'Core Web Vitalsで「Good」を取る現実的な方法 — Nortiq Labs',
  'article-claude-vs-gpt': 'Claude vs GPT 業務利用の比較｜複数AIの同時活用・使い分け — Nortiq Labs',
  'article-website-launch-1month': 'ホームページ制作は最短1ヶ月で可能｜速さと品質を両立する方法｜Nortiq Labs',
  'article-aio-llmo-reality-check': 'AIO・LLMO対策は本当に必要?日本のAI検索利用率の実態｜Nortiq Labs',
  'article-multi-ai-parallel-productivity': 'AIは複数同時に使うから効率化できる｜利益率を上げる活用術｜Nortiq Labs',
  'article-ai-literacy-mindset-shift': 'なぜAI導入は失敗するのか｜定着に必要な「思考の転換」とは｜Nortiq Labs',
  'article-google-business-profile-meo': '口コミだけでは限界｜実店舗が今すぐやるWeb集客・MEO対策｜Nortiq Labs',
  'article-btob-web-marketing': 'BtoBはWeb集客が最も効率的｜検索流入をリードに変える方法｜Nortiq Labs',
  'article-office-work-automation': 'AIを使わない事務は人件費の無駄｜安全に自動化する方法｜Nortiq Labs',
  'article-benchmark-competitor-success': '成功施策を真似ればWeb集客は成功する｜競合分析と著作権の境界｜Nortiq Labs',
  'article-llmo-basics-for-smb': 'SEOとAIO両睨みのコンテンツ戦略｜両方に効く共通の型とは｜Nortiq Labs',
  'article-how-to-choose-web-agency': 'Web制作会社の選び方｜「安かろう悪かろう」の罠を避ける方法｜Nortiq Labs',
  'article-web-production-cost-guide': 'ホームページ制作費用の相場2026｜中小企業向け価格帯別ガイド｜Nortiq Labs',
  'article-website-renewal-guide': 'ホームページリニューアルの進め方｜4ステップと発注チェックリスト｜Nortiq Labs',
  'article-website-not-converting': 'ホームページで集客できない5つの原因｜今すぐできる改善策｜Nortiq Labs',
  'article-llmo-basics-for-smb': 'LLMO対策とは｜費用をかけずに始めるAI検索対策の基本｜Nortiq Labs',
  'article-google-business-profile-meo': 'MEO対策の始め方｜Googleビジネスプロフィール最適化5ステップ｜Nortiq Labs',
  'article-listing-ads-cpc-roi': 'リスティング広告のCPCが高い原因｜費用対効果を上げる5つの見直し｜Nortiq Labs',
  // 「Core Web Vitals」を外した。/article-core-web-vitals と <title> がぶつかっており、
  // 同じクエリで自社記事同士が競合していた。こちらは離脱・問い合わせへの影響を扱う
  // 記事なので、技術指標名ではなく成果側の語を前に出す
  'article-page-speed-conversion': 'サイトの表示速度と離脱率｜遅いと問い合わせが減る理由と改善策｜Nortiq Labs',
  'article-ai-chatbot-introduction': 'AIチャットボット導入の費用と手順｜中小企業の問い合わせ自動化｜Nortiq Labs',
  'article-smb-dx-first-step': '中小企業のDXは何から始める｜AI活用の最初の一歩と補助金｜Nortiq Labs',
  'article-subsidy-2026-digital-ai': 'デジタル化・AI導入補助金2026｜ホームページは対象になるか｜Nortiq Labs',
};
Object.keys(ARTICLE_SEO_TITLE).forEach((id) => { if (ROUTES[id]) ROUTES[id].title = ARTICLE_SEO_TITLE[id]; });
// Punchy social-share titles (og:title / twitter:title) — shorter and stronger
// than the SERP <title>. Falls back to the route title when absent.
const OG_TITLE = {
  'article-blog-bot': 'ブログボットとは？AIが書き、人が確認して公開する',
  'article-website-launch-1month': 'Web制作を最短1ヶ月で。速さと丁寧さは両立できる',
  'article-aio-llmo-reality-check': 'AIO対策に踊らされる前に。日本人はまだAI検索を使っていない',
  'article-multi-ai-parallel-productivity': 'AIは「複数同時に使う」から効率化できる',
  'article-ai-literacy-mindset-shift': 'AIの使い方を教えるのは、想像以上に難しい',
  'article-google-business-profile-meo': '「口コミだけ」では、もう競争にならない',
  'article-btob-web-marketing': 'Web集客はまだまだ熱い。特にBtoBで最強',
  'article-office-work-automation': 'AIを使わない＝無駄な労働。もう自動化できる',
  'article-benchmark-competitor-success': 'うまくいっている施策を真似れば、集客は成功する',
  'article-llmo-basics-for-smb': 'SEOとAIO、両方に効く「共通の型」がある',
  'article-how-to-choose-web-agency': '制作会社の選び方。「安かろう悪かろう」の罠',
  'article-web-production-cost-guide': 'ホームページ制作費用の相場、2026年版',
  'article-website-renewal-guide': '「見た目だけ」のリニューアルは失敗する',
  'article-website-not-converting': '作ったのに集客できない、5つの原因',
  'article-llmo-basics-for-smb': 'AI検索対策、お金をかけずに始められること',
  'article-google-business-profile-meo': '広告費0円で地域のお客様を増やす方法',
  'article-listing-ads-cpc-roi': '広告のCPCが高すぎる。費用対効果の上げ方',
  'article-page-speed-conversion': '3秒で半分が離脱する。速度は経営課題',
  'article-ai-chatbot-introduction': '問い合わせ対応、AIに任せて楽になる',
  'article-smb-dx-first-step': '中小企業のDX、何から始めるべきか',
  'article-subsidy-2026-digital-ai': '補助金でホームページは作れるのか',
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
const DEFAULT_DESC = '京都のWeb制作×AI実装カンパニー。オリジナルデザインのホームページ制作からAIチャットボット導入、DXコンサルティングまで一気通貫で支援。初回相談無料・営業日24時間以内に返信します。';
const SEO_DESC = {
  top: DEFAULT_DESC,
  web: 'オリジナルデザインのホームページ制作。SEO設計・高速表示（Core Web Vitals対応）・CMS・アクセス解析まで標準対応。京都から全国のBtoB・店舗ビジネスを支援します。',
  chatbot: '自社サイトのFAQ・問い合わせ対応を自動化するAIチャットボット導入。WordPress連携・LINE連携・自社データ学習に対応。導入10万円台から、京都のNortiq Labsが構築します。',
  dx: 'PoCで終わらせないAI・機械学習の本実装。業務分析から要件定義、モデル構築、運用まで伴走。中小企業のDXを京都の技術チームが支援します。',
  works: '宿泊リゾート、アンティークEC、建築、協同組合、不動産、ジムなど業種別の制作実績。デザイン・実装・成果までを事例ごとに公開しています。',
  voice: 'Nortiq Labsのサービスをご利用いただいた企業様のインタビュー。導入前の課題、選んだ理由、導入後の変化を業種別に紹介します。',
  pricing: 'ホームページ制作・AIチャットボット・DX支援の料金一覧。初期費用と月額運用を明記し、補助金活用のご相談も可能。京都・全国オンライン対応、初回相談は無料です。',
  support: '公開後のサイト更新・セキュリティ保守・改善提案までカバーする運用サポート。月次レポートとGA4データに基づき、作って終わりにしない改善を続けます。',
  diagnostic: 'サイトURLを入力するだけで、SEO・表示速度・導線の改善点を無料診断。営業日24時間以内に、具体的な改善レポートをお返しします。',
  subsidy: 'IT導入補助金・小規模事業者持続化補助金などを活用したホームページ制作・AIツール導入のご相談窓口。対象になるか、いくら補助されるかを無料で確認できます。',
  guidebook: 'Web制作・AI導入・DX支援のサービス内容・料金・事例をまとめた資料を無料ダウンロード。社内検討・比較検討用にそのままお使いいただけます。',
  column: '調査データに基づくAI・SEO・DX・業種別マーケティングの技術ブログ。一次情報と数値で裏づけた、現場で使える知見を発信しています。',
  company: '株式会社ノーティックラボの会社概要。京都市を拠点に、Web制作・AI実装・DXコンサルティングを提供する技術チームです。所在地・代表・事業内容をご覧いただけます。',
  staff: 'Nortiq Labsのメンバー紹介。エンジニアリング・デザイン・データサイエンスの専門領域と経歴を公開しています。',
  recruit: 'Nortiq Labsの採用情報。Web制作・AI実装の現場で、企画から実装まで裁量を持って働けるポジションを募集しています。',
  'product-vetonet': 'AIエージェントの危険なアクションを実行前に検証・拒否するセキュリティミドルウェアVetoNet。Nortiq LabsのR&Dプロダクトとして開発中。技術解説・開発の裏側も公開しています。',
  'product-wpchat': '「書ける気がしない」をなくすブログボット。普段の言葉で伝えるだけでAIが要約・SEOチェック・競合分析まで対話形式でサポート。8ステップで迷わず公開、WordPress連携対応。',
  'product-tennis': 'スマホで撮った動画をAIが解析し、テニスのフォーム改善点を可視化する無料アプリ（Public beta）。33関節をトラッキングしプロとの差分をスコア化。改善ポイントは具体的な言葉でフィードバックします。',
  'feature-lpo': '反響を獲得するランディングページ制作と、公開後のLPO（CVR改善）。ファーストビュー設計・EFO・A/Bテストまで、データに基づく改善サイクルを回します。',
  'feature-recruit': '求人媒体に頼らない採用サイト制作。求職者心理に基づくコンテンツ設計、Indeed・求人検索対応の構造化データ実装まで。中小企業の採用力を底上げします。',
  'feature-analytics': 'GA4のイベント設計・キーイベント設定・Looker Studioダッシュボード構築まで。「計測できていない」を解消し、施策判断に使えるデータ基盤を実装します。',
  'feature-cms': '自社で更新できるCMS・記事投稿システムの構築。WordPressからヘッドレスCMSまで、運用体制に合わせて設計。AI投稿アシスタントとの連携も可能です。',
  news: 'Nortiq Labsからのお知らせ・リリース情報の一覧です。',
  'works-build': '大規模修繕のRenew Reuse Loop、不断水工法のRAKUYU-Zなど建築・工務店のWeb制作・採用支援事例。BtoB商談+210%等の成果につながったオリジナル制作を紹介します。',
  'works-clinic': 'あおぞらFamily Clinic、AIRA CLINIC GINZA、白藍デンタル等のWeb制作・AIチャットボット導入事例。予約+110%・問い合わせ2.4倍の医療業界向け実績を掲載します。',
  'article-website-launch-1month': '「来月までにサイトを公開したい」を叶えます。Web制作が通常2〜4ヶ月かかる理由と、AIを駆使して品質を保ちながら最短1ヶ月でローンチする方法を、京都のNortiq Labsが解説します。',
  'article-aio-llmo-reality-check': 'GoogleのAI Overviewsで注目のAIO・LLMO対策。しかし現状の対策は効果が見えにくく陳腐化も早いのが実情です。日本人のAI検索利用率の最新データをもとに、中小企業が今やるべきことを冷静に解説します。',
  'article-multi-ai-parallel-productivity': '「AIを使ったけど変わらなかった」のは使い方の問題です。契約書・コード・マーケを並行処理する複数AI活用で生産性は激変します。UC Berkeley出身チームが実践するAI活用術を、データとともに解説します。',
  'article-ai-literacy-mindset-shift': 'アカウントを配っても現場でAIが使われない。中小企業の約6割がAIを活用できていない原因は、技術ではなく発想にあります。「どれだけ自分でやらないか」という思考転換と、定着のための進め方を解説します。',
  'article-google-business-profile-meo': '「常連と紹介で回っているから大丈夫」は危険です。Googleビジネスプロフィール最適化で7倍のクリックを獲得できるデータも。実店舗が地域検索で見つけてもらうためのローカルSEO・MEO対策を解説します。',
  'article-btob-web-marketing': 'SNS全盛でも、BtoBではWeb集客が最も費用対効果の高い手法です。自ら検索する高意欲層をリードに変える仕組みとは。ブログ運営で67%多いリードを得るデータをもとに、Nortiq Labsが解説します。',
  'article-office-work-automation': '請求書作成やデータ入力、その事務作業の多くは自動化できます。情報漏洩が心配ならLlamaやgpt-ossをローカル運用すれば解決。AIを使わないことの本当のコストと、自動化の進め方を解説します。',
  'article-benchmark-competitor-success': 'Web集客の正解はすでに市場にあります。競合の技術スタックや構造はBuiltWith等で調査可能です。著作権を守りながら成功施策を学び、自社のオリジナルへ昇華させる具体的な方法を解説します。',
  'article-llmo-basics-for-smb': '「SEOとAIOどちらに賭けるか」は誤った問いです。両方に効く共通施策があります。明確な見出し構造、結論先行、出典明示など、人にもAIにも評価されるコンテンツ設計を、最新研究をもとに解説します。',
  'article-how-to-choose-web-agency': '格安ホームページ制作の裏側では、テンプレート流用や保守なしなどコスト削減の仕組みが働いています。失敗しない制作会社の見極め方と、安さの理由を見抜くための質問を、料金の目安とともに解説します。',
  'article-web-production-cost-guide': '中小企業向けホームページ制作費用の相場を2026年最新情報で価格帯別に解説。会社案内型10万円〜、集客型50万円〜など目安を整理し、失敗しない見積りチェックポイント5つも紹介します。',
  'article-website-renewal-guide': 'ホームページリニューアルの進め方を4ステップで解説。リニューアルすべきタイミングの見極め方、見た目だけの刷新で失敗する理由、発注前チェックリストを中小企業向けに紹介します。',
  'article-website-not-converting': 'ホームページを作ったのに集客できない中小企業向けに、よくある5つの原因と改善策を解説。検索・導線・スマホ対応・更新・ターゲット設計の見直しポイントを紹介します。',
  'article-llmo-basics-for-smb': 'AI OverviewsやAIモードの普及で検索アクセスはどう変わるのか。慌てて予算を投じる前に、費用をかけず今日から始められるLLMO（生成AI最適化）の基本を、結論ファースト・一次情報・構造化データの観点から解説します。',
  'article-google-business-profile-meo': '広告費0円から始められるMEO（Googleマップ集客）の基本を解説。Googleビジネスプロフィールの最適化5ステップと、ホームページと連携した地域集客のコツを中小企業向けに紹介します。',
  'article-listing-ads-cpc-roi': '上昇するリスティング広告のCPCに悩む中小企業向けに、費用対効果を上げる5つの見直しポイントを解説。品質スコア改善やLP最適化、広告に頼らないオウンドメディア集客への考え方も紹介します。',
  'article-page-speed-conversion': 'サイトの表示速度が売上を左右する理由を、Googleのデータとともに解説。モバイルで3秒以上かかると約53%が離脱。Core Web Vitals（LCP・INP・CLS）の基礎、遅くなる原因、無料の速度チェックと改善方法を紹介します。',
  'article-ai-chatbot-introduction': 'AIチャットボットで問い合わせ対応を効率化したい中小企業向けに、できること・導入3ステップ・費用の目安・失敗しない選び方を解説。人手不足対策として今注目される理由も紹介します。',
  'article-smb-dx-first-step': '中小企業のDXは何から始めればいいのか。よくある3つの誤解を解き、紙のデジタル化からAI活用まで「最初の一歩」を3ステップで解説。補助金の使い方や優先順位の付け方も紹介します。',
  'article-subsidy-2026-digital-ai': '2026年から名称が変わる「デジタル化・AI導入補助金」を中小企業向けに解説。ホームページ制作やAIツールは対象になるのか、補助額・補助率、申請の流れと注意点も紹介します。',
  'article-blog-bot': 'ブログボットはAIが記事のネタ出しから執筆、SEOチェック、投稿までを支援するツールの総称。完全自動型と対話アシスト型の違い、Googleのスパムポリシーとの関係、失敗しない選び方5基準を実務目線で解説します。',
  'article-japan-dx': '日米のDX格差はどこで生まれるのか。意思決定構造・人材・投資配分の違いをデータで比較し、日本の中小企業が今から巻き返すための現実的な打ち手を整理します。',
  'article-vetonet': 'AIエージェントの暴走をどう防ぐか。実行前検証ミドルウェアVetoNetの設計思想とアーキテクチャを、開発の裏側とともに技術解説します。',
  'article-wordpress-stall': 'ブログ更新が3ヶ月で止まる原因は意志ではなく仕組みにあります。更新が続かない構造的要因と、AI投稿アシスタント（ブログボット）で運用を仕組み化する方法を解説。',
  'article-core-web-vitals': 'LCP・INP・CLSを実サイトで「Good」にするための優先順位。効果の大きい施策から順に、計測方法と改修コストの目安つきで解説します。',
  'article-clinic-web': '初診の51%はGoogle検索から。AI検索時代のE-E-A-T・MEO・医療広告ガイドライン対応まで、n=15,715の調査データと最新規制動向でクリニック集患の全体像を解説します。',
  'article-ai-poc': 'AI導入の多くがPoC止まりで終わる理由は技術ではなく設計にあります。本実装まで進んだ案件に共通する要件定義・データ整備・体制の条件を実例から整理します。',
  'article-realty-lp': '不動産売却査定LPのCVRは2〜3%台、フォーム離脱率は約70%。ファーストビュー・売主心理に刺さるコピー・EFO・匿名AI査定の入口化など、反響を最大化する7つの必須要素を一つの設計思想で貫く方法を解説します。',
  'article-claude-vs-gpt': 'ClaudeとGPTを業務でどう使い分けるか。文書作成・コーディング・分析それぞれの得意領域と、複数AIを同時に併用するワークフロー設計まで実務目線で比較します。',
  'works-realty': '不動産投資ブランドPLEAST（問合せ3.2×）、物件管理連動の投資物件専門サイト（反響2.7×）など、不動産業のWeb制作・SEO・DX実績を紹介します。',
  'works-hr': '外国人材組合Asia Exchange（応募+84%）、新卒採用ブランドAXIA（エントリー2.1×）、中途採用LP（応募1.6×）など、人材業界のWeb制作・AIチャットボット・LPO実績を紹介します。',
  'works-retail': 'キッチンカーpanza（SNS流入4.6×）、骨董店TAKETORAの越境EC（海外PV5.2×）、サブスクEC（解約率-32%）など、小売・ECのWeb制作・EC・DX実績を紹介します。',
  'works-infra': '不断水工法のRAKUYU-Z工法協会サイト、電力会社VOLTIOのサービスサイト刷新（PV2.1×）など、インフラ・製造業のWeb制作・アクセス解析実装の実績を紹介します。',
  'works-ai': 'AIスタートアップSable（商談化率4.2×）、BtoB SaaSのATLAS ML Engine（問合せ+210%）、ML PoC LP（デモ申込5.6×）など、AI企業のWeb制作・AIチャットボット実績を紹介します。',
  'works-lp-corp': '再エネVOLTIO（資料DL2.4×）、AI SaaS Sable（問合せ+210%）、ML製品ATLAS（PoC申込2.6×）など、投資家・取引先・採用候補に伝わるコーポレートサイトの制作実績を紹介します。',
  'works-lp-recruit': '新卒採用ブランドサイトAXIA（マニフェスト型：エントリー2.4×／社員フィーチャー型：応募数3.6×）など、コンセプト設計から社員撮影・エントリー導線まで一貫構築した採用LP実績を紹介します。',
  'works-lp-ec': 'クラフト衣料のエディトリアルEC（客単価+24%）、骨董店TAKETORAのバイリンガル越境EC（海外売上2.2×）など、OMO設計・越境対応のEC送客LP制作実績を紹介します。',
  'works-video': 'サイト・SNS・広告で使う動画の制作事例。ショート動画をSEO・集客にどう活かすかの設計例も紹介。撮影から編集、掲載ページの実装までワンストップで対応します。',
  'solution-clinic': 'クリニックの集患をWeb×DXで支援。医療広告ガイドライン準拠のサイト制作、Googleビジネスプロフィール（MEO）整備、AIチャットボット・Web予約連携までパッケージで提供します。',
  'solution-realty': '売買・賃貸・売却査定・投資物件それぞれの導線を最適化したWebサイトと、物件管理データ連動の集客・追客システム。80万円〜、必要な機能だけ選んで導入できます。',
  'solution-build': '施工品質が伝わるブランドサイトと、見積・案件管理のDXをセットで。大規模修繕・住宅・リフォーム各分野の制作実績に基づく、建築業特化のWebパッケージです。',
  'solution-hr': '求人検索・スカウト・応募管理を備えたマッチングサイト構築と、SEO・広告での集客支援をワンストップで。人材紹介・派遣業のWeb基盤を短期間で立ち上げます。',
  'solution-retail': 'Shopifyを軸に店舗とECの在庫・顧客・販促を統合するOMOパッケージ。POS連携、店舗受け取り、会員統合まで。小売・ECの「バラバラ運用」を一つにします。',
  'privacy': 'Nortiq Labs Inc. の個人情報保護方針。収集・利用目的、第三者提供、SOC 2 Type II準拠のセキュリティ、開示・訂正・削除請求、Cookieの取り扱いを定めています。',
  'terms': 'Nortiq Labs Inc. のサービス利用規約。適用範囲・契約の成立・利用者の義務・禁止事項・知的財産権・免責事項・準拠法および管轄について定めています。',
  'privacy-handling': 'Nortiq Labs Inc. における個人情報の利用目的、第三者提供、業務委託、開示請求の窓口など、個人情報の具体的な取扱いについて説明しています。',
};
// 検索結果に出すべきでないページ。プリレンダ時にもこの meta が焼き込まれる。
//  - sitemap: HTMLサイトマップ (ナビゲーション用)
//  - quick-diagnosis: 1分診断ツール。/diagnostic と検索意図が重なるため索引させない
const NOINDEX_ROUTES = { sitemap: true, 'quick-diagnosis': true };

// 記事の noindex は build.js の BLOG エントリ (noindex: true) が唯一の出典。
// そこを1箇所直せば sitemap.xml・記事一覧・関連記事・この meta robots がまとめて揃う。
function isNoindexRoute(route) {
  if (NOINDEX_ROUTES[route]) return true;
  if (route && route.indexOf('article-') === 0) {
    const a = ((typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {})[route.slice('article-'.length)];
    return !!(a && a.noindex);
  }
  return false;
}
function descFor(route) {
  // Explicit per-route description wins (incl. SEO-tuned article descriptions).
  if (SEO_DESC[route]) return SEO_DESC[route];
  if (route && route.indexOf('article-') === 0) {
    const slug = route.slice('article-'.length);
    const a = ((typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {})[slug];
    if (!a) return DEFAULT_DESC;
    // 記事メタの desc (パイプラインが P-12 で生成し BLOG エントリに載せる) を優先。
    // 無い記事は従来どおり定型文にフォールバックする
    return a.desc || `${a.title} ｜ Nortiq Labs の技術ブログ（${a.category}）。`;
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
// 監修者。ノードの実体は静的シェルの @graph 側 (build.js の Organization.founder) にあり、
// ここは @id 参照のみ。#org と同じ扱い。
const NORTIQ_PERSON_ID = NORTIQ_SITE + '/#renta';
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
    // date は初出の公開日。改修で本文を書き換えても URL と初出日は変えないため、
    // 更新日は別フィールド (updated) を BLOG 配列に持たせ、そちらを dateModified に使う。
    // 両方を date から作っていた頃は、記事を改修しても鮮度の信号が Google に届かなかった。
    const modified = a.updated ? isoDate(a.updated) : date;
    return {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: a.title, description: desc, image: img, url,
      inLanguage: 'ja', articleSection: a.category,
      datePublished: date, dateModified: modified,
      author: { '@type': 'Organization', '@id': NORTIQ_ORG_ID, name: 'Nortiq Labs' },
      publisher: ORG_REF,
      // 承認済み記事には可視の「監修: 大島蓮太」が出る (supervised フラグ)。
      // 構造化データ側も揃える。reviewedBy は WebPage のプロパティなので
      // BlogPosting 直下ではなく mainEntityOfPage に置く。
      mainEntityOfPage: a.supervised
        ? { '@type': 'WebPage', '@id': url, reviewedBy: { '@id': NORTIQ_PERSON_ID } }
        : { '@type': 'WebPage', '@id': url },
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
        name: 'ブログボット（Nortiq AI投稿アシスタント）', description: desc, url,
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
  // FAQPage schema is intentionally NOT emitted. Google retired FAQ rich results
  // (June 2026), so the markup no longer earns display and only adds payload.
  // FAQ sections stay in the visible article body for LLMO and coverage.
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
    if (isNoindexRoute(route)) {
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
    // 記事ページは og:type を article にし、公開日・更新日を出す。
    // 全ページ website のままだと、SNSもAI検索もこれを「記事」と認識しない。
    const isArticle = route.indexOf('article-') === 0;
    const art = isArticle
      ? ((typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {})[route.slice('article-'.length)]
      : null;
    setMetaContent('meta[property="og:type"]', isArticle ? 'article' : 'website');
    setMetaContent('meta[property="article:published_time"]', art ? isoDate(art.date) : '');
    setMetaContent('meta[property="article:modified_time"]', art ? isoDate(art.updated || art.date) : '');
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
    : (route === 'quick-diagnosis' ? 'diagnostic'
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
      <ShowcaseViewer/>

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
