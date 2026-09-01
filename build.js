// Build script: pre-compile JSX, minify, copy assets, emit dist/index.html
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const babel = require('@babel/core');
const { minify } = require('terser');
const { marked } = require('marked');
const sharp = require('sharp');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// 実績・体制の数字は content-data.jsx の NORTIQ_STATS を唯一の出典にする。
// (build-prerender.js が build.js の BLOG を正規表現で読むのと同じ方式)
// ここを別に持つと、FAQ・Organizationスキーマとページ本文の数字がまた食い違う。
const NORTIQ_STATS = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'content-data.jsx'), 'utf8');
  const start = src.indexOf('const NORTIQ_STATS');
  const pick = (k) => {
    const i = start < 0 ? -1 : src.indexOf(k + ':', start);
    const v = i < 0 ? NaN : parseInt(src.slice(i + k.length + 1).trim(), 10);
    if (!Number.isFinite(v)) throw new Error('content-data.jsx の NORTIQ_STATS.' + k + ' を読み取れません');
    return v;
  };
  return { clients: pick('clients'), team: pick('team'), industries: pick('industries') };
})();

// JSX files in load order (matches the script tags in Nortiq Labs.html)
const JSX_FILES = [
  'tweaks-panel.jsx',
  'components.jsx',
  'content-data.jsx',
  'top-page.jsx',
  'service-pages.jsx',
  'info-pages.jsx',
  'detail-pages.jsx',
  'extra-pages.jsx',
  'app.jsx',
];

// Organization schema の sameAs (エンティティ対策: nortiq.ai 等との誤帰属防止)。
// 自社が管理するプロファイルのURLだけを入れる (他社サイトの紹介ページ等は入れない)。
//
// TODO(人間): 下記のコメントを外し、実際のURLに差し替える。
//   作成していないものは行ごと消してよい (空文字や仮URLは入れない)。
//   NAP表記はすべてのプロファイルで「Nortiq Labs（ノーティックラボ/京都）」に統一する。
const ORG_SAME_AS = [
  // 'https://www.google.com/maps/place/?cid=<GBPのCID>',   // Googleビジネスプロフィール
  // 'https://www.linkedin.com/company/<ページ名>',          // LinkedIn 会社ページ
  // 'https://x.com/<アカウント名>',                          // X (旧Twitter)
  // 'https://www.wantedly.com/companies/<会社ID>',          // Wantedly
  // 'https://github.com/<組織名>',                           // GitHub Organization
];

// Blog articles — markdown source in content/blog/ + display metadata.
// Order = newest first (drives the column list).
// supervised: true → 記事ページに監修表記 (承認済みAI活用記事のみ。パイプラインが付与)
// desc → meta description / og:description / BlogPosting.description に使う。
//        未指定の記事は app.jsx の SEO_DESC か自動生成の定型文にフォールバックする
const BLOG = [
  { slug: 'homepage-core-web-vitals-guide', category: 'Web制作', date: '2026.09.01', read: '12 min', title: 'ホームページ制作でCore Web Vitals対応、中小企業向け5ステップ', img: 'assets/blog-default.png', desc: '自社のホームページがCore Web Vitals（LCP・CLS等）の基準を満たしているか確認する方法と、不合格時の優先順位付き改善ステップを解説。中小企業向けです。', supervised: true },
  { slug: 'llm-guardrail-monthly-cost-sme-guide', category: 'AI活用', date: '2026.08.21', read: '10 min', title: '中小企業向けLLMガードレール導入コスト：現実的な選択肢', img: 'assets/blog-default.png', desc: 'LLMガードレール導入にかかるOpenAI・Azure別の月額費用を解説。コンテンツセーフティ等の追加機能コスト、中小企業の予算で実現可能な構成を掲載。', supervised: true },
  { slug: 'rfp-template-web-design', category: 'Web制作', date: '2026.08.20', read: '12 min', title: 'Web制作のRFP作り方｜記載項目・テンプレート付き', img: 'assets/blog-default.png', desc: 'Web制作のRFP（提案依頼書）の作り方を解説。必須記載項目、構成、すぐに使えるテンプレートを掲載。複数社から比較可能な提案を引き出すコツも紹介します。', supervised: true },
  { slug: 'site-renewal-process-guide', category: 'Web制作', date: '2026.08.19', read: '12 min', title: 'サイトリニューアルの進め方｜5つのフェーズと成功チェックリスト', img: 'assets/blog-default.png', desc: 'サイトリニューアルの進め方を着手から公開まで5つのフェーズで解説。各段階での役割分担、判断基準、失敗防止チェックリストを網羅し、プロジェクト成功に必要な全手順をご紹介します。', supervised: true },
  { slug: 'llm-guardrail-inhouse-vs-cloud-api', category: 'AI活用', date: '2026.08.17', read: '12 min', title: 'LLMガードレール自社構築 vs クラウドAPI、中小企業向け費用比較', img: 'assets/blog-default.png', desc: 'LLMガードレールの自社構築とクラウドAPI利用について、中小企業向けに費用・工数・精度を実例で比較。エンジニア数や予算別の最適な選択肢を解説します。', supervised: true },
  { slug: 'llm-guardrail-bypass-cases', category: 'AI活用', date: '2026.08.17', read: '12 min', title: 'LLMガードレール突破の実例5選｜バイパス手法と対策', img: 'assets/blog-default.png', desc: 'LLMガードレールが実際に突破された事例5選を解説。ソーシャルエンジニアリングなどの根本原因と、自社チャットボット・社内システムの脆弱性診断方法を紹介します。', supervised: true },
  { slug: 'wordpress-vs-nextjs-comparison', category: 'Web制作', date: '2026.08.16', read: '11 min', title: 'WordPress と Next.js（静的生成）を比較｜表示速度・SEO・保守で選ぶ', img: 'assets/blog-default.png', desc: 'WordPressとNext.js静的生成を表示速度・SEO・保守・更新のしやすさで比較。中小企業がどちらを選ぶべきかの判断基準を、実際に両方を運用した経験から解説します。', supervised: true },
  { slug: 'system-development-company-selection', category: '技術', date: '2026.08.16', read: '10 min', title: 'システム開発会社の選び方｜失敗しない比較チェックリスト', img: 'assets/blog-default.png', desc: 'システム開発の発注先選定で確認すべき11項目を解説。見積の読み方、相見積もりの取り方、ベンダーロックインの回避まで、発注前に押さえる比較軸をまとめました。', supervised: true },
  { slug: 'excel-to-system-migration-guide', category: '技術', date: '2026.08.16', read: '11 min', title: 'Excel管理からの脱却｜業務システム化で解決できる課題と進め方', img: 'assets/blog-default.png', desc: '脱Excelの判断基準と進め方を解説。どこまでExcelに残し、どこからシステム化すべきかの線引き、既製サービスとの使い分け、費用の目安まで具体的にまとめました。', supervised: true },
  { slug: 'llmo-cited-by-ai-search-implementation', category: 'SEO', date: '2026.08.16', read: '10 min', title: 'AI検索に引用される会社サイトの作り方｜LLMO対策の実装手順', img: 'assets/blog-default.png', desc: 'AI検索（AI Overviews）に引用されるための実装手順を7項目で解説。結論の配置、一次情報リンク、構造化データなど、明日から自社サイトに適用できる形でまとめています。', supervised: true },
  { slug: 'jizokuka-subsidy-website-2026', category: 'Web制作', date: '2026.08.16', read: '9 min', title: '小規模事業者持続化補助金でホームページ制作｜第20回の要件と注意点', img: 'assets/blog-default.png', desc: '小規模事業者持続化補助金 第20回でホームページ制作に使える条件を解説。ウェブサイト関連費の上限30万円・単独申請不可の変更点、申請の流れ、採択率まで一次情報付きで整理しました。', supervised: true },
  { slug: 'recruit-site-cost-guide', category: 'Web制作', date: '2026.08.16', read: '9 min', title: '採用サイト制作の費用相場｜応募が集まる構成と作り方', img: 'assets/blog-default.png', desc: '採用サイト制作の費用を構成別に解説。求人媒体では伝えられない要素、JobPosting構造化データ、職業安定法の的確表示義務まで、応募につながる作り方をまとめました。', supervised: true },
  { slug: 'lp-production-cost-guide', category: 'Web制作', date: '2026.08.16', read: '8 min', title: 'ランディングページ（LP）制作の費用相場と成果を出す作り方', img: 'assets/blog-default.png', desc: 'LP制作費用の相場を構成別に解説。成果が出るLPの構成、フォーム最適化（EFO）、公開後に見るべき指標と改善の順序まで具体的にまとめました。', supervised: true },
  { slug: 'crm-build-vs-package-comparison', category: '技術', date: '2026.08.16', read: '10 min', title: '顧客管理システム（CRM）は自社開発かパッケージか｜費用と選び方', img: 'assets/blog-default.png', desc: 'CRM導入で自社開発とパッケージ（SaaS）のどちらを選ぶべきかを費用・期間で比較。パッケージで足りるケースと開発が必要になる条件を具体的に整理しました。', supervised: true },
  { slug: 'reservation-system-development-cost', category: '技術', date: '2026.08.16', read: '10 min', title: '予約システムの開発費用と作り方｜既製サービスとの違い', img: 'assets/blog-default.png', desc: '予約システムの開発費用を構成別に解説。既製サービスで足りる条件と開発が必要になる条件、ダブルブッキング対策など設計上の論点を業種別の注意点付きでまとめました。', supervised: true },
  { slug: 'legacy-system-replacement-guide', category: '技術', date: '2026.08.16', read: '11 min', title: '基幹システムの刷新・再構築｜レガシー脱却の進め方と費用', img: 'assets/blog-default.png', desc: '基幹システム刷新の進め方を解説。一括移行を避けるストラングラー方式の手順、刷新を急ぐべきサイン、費用の目安、現行踏襲の落とし穴までまとめました。', supervised: true },
  { slug: 'corporate-site-rfp-guide', category: 'Web制作', date: '2026.08.16', read: '9 min', title: 'コーポレートサイトリニューアルのRFP作成ガイド｜提案依頼書の書き方', img: 'assets/blog-default.png', desc: 'リニューアルのRFP（提案依頼書）に書くべき8項目を解説。決まっていることと決まっていないことの分け方、よくある失敗、適切な相見積もり社数までまとめました。', supervised: true },
  { slug: 'subsidy-for-business-system-dx', category: 'DX 観察記', date: '2026.08.16', read: '10 min', title: '補助金を使った業務システム・DX導入の進め方｜申請前に押さえる要点', img: 'assets/blog-default.png', desc: '業務システム・DX導入に使える補助金制度の選び方と申請前の確認事項を解説。交付決定前の発注不可、後払いの資金繰り、対象外経費など実務上の要点をまとめました。', supervised: true },
  { slug: 'website-system-maintenance-cost', category: 'Web制作', date: '2026.08.16', read: '9 min', title: 'ホームページ・システムの保守運用費用の相場｜月額いくらが適正か', img: 'assets/blog-default.png', desc: '保守運用費用の相場を構成別に解説。保守に含まれる内容を4分類で整理し、契約前に確認すべき7項目、費用を抑える方法までまとめました。', supervised: true },
  { slug: 'internal-system-outsourcing-requirements-checklist', category: '技術', date: '2026.08.16', read: '7 min', title: '社内システム外注の要件定義チェックリスト｜失敗を防ぐ7項目', img: 'assets/blog-default.png', desc: '社内システム外注時の要件定義で決めるべき項目を網羅的に解説。発注前の抜け漏れを防ぐチェックリスト付き。中小企業が実施すべき確認手順を具体的に紹介します。', supervised: true },
  { slug: 'in-house-system-cloud-migration-cost-guide', category: '技術', date: '2026.08.14', read: '12 min', title: '社内システムクラウド移行の失敗を防ぐ、発注ステップガイド', img: 'assets/blog-default.png', desc: '社内システムの外注開発とクラウド移行を同時検討する場合の費用感、判断基準、失敗しない発注ステップをわかりやすく解説。オンプレミス継続との比較も。', supervised: true },
  { slug: 'homepage-renewal-failure-causes-sme', category: 'Web制作', date: '2026.08.10', read: '10 min', title: 'ホームページリニューアル失敗の原因と対策｜中小企業向け事前チェック表', img: 'assets/blog-default.png', desc: '中小企業がホームページリニューアルで失敗する原因を、アクセス減・問い合わせ低下・費用超過など実例から解説。発注前チェックと対処法も紹介します。', supervised: true },
  { slug: 'llm-guardrail-evaluation-metrics', category: 'AI活用', date: '2026.08.10', read: '12 min', title: 'LLMガードレール評価の精度測定｜4つの指標と実装手順', img: 'assets/blog-default.png', desc: '自社LLMガードレールの有害出力検出精度を定量評価する方法を解説。精度・再現率・F1スコアなど4つの指標と測定手順、公的基準の活用法を実装ガイド付きで紹介します。', supervised: true },
  { slug: 'ios17-nfc-felica-system-code-limit', category: '技術', date: '2026.08.09', read: '11 min', title: 'iOS 17 FeliCa検出失敗の対策：システムコード上限値を把握する', img: 'assets/blog-default.png', desc: 'iOS 17でNFC FeliCaの読取が不安定になる原因は Info.plist へのシステムコード登録上限にあります。上限値の具体的な数値と超過時の挙動、安定読取のための実装修正方法を解説します。', supervised: true },
  { slug: 'llm-guardrail-evaluation-method', category: 'AI活用', date: '2026.08.09', read: '12 min', title: 'LLMガードレールの攻撃検出精度を自社評価する方法', img: 'assets/blog-default.png', desc: 'LLMガードレールの攻撃検出精度を精度・再現率・F1スコアで自社測定する方法と、プロンプトインジェクション等の攻撃に対する社内テスト設計の手順、評価結果の解釈と運用改善への活かし方を解説します。', supervised: true },
  { slug: 'llm-guardrails-3-layer-architecture', category: 'AI活用', date: '2026.08.08', read: '12 min', title: 'LLM安全対策の3層ガードレール｜NeMo・OWASPに基づく実装手順', img: 'assets/blog-default.png', desc: 'LLMアプリの安全対策を入力・処理・出力の3層で実装する手順を解説。NeMo Guardrails・OWASPガイドラインに基づき、検出漏れや過検知を防ぐ設計方法を具体例で紹介します。', supervised: true },
  { slug: 'ios-nfc-felica-detection-time-comparison', category: '技術', date: '2026.08.08', read: '12 min', title: 'iOS16～18のFeliCa検出時間を実測比較', img: 'assets/blog-default.png', desc: 'iOS16～18でFeliCa検出時間にどの程度の差があるのか実測で検証。Info.plistのシステムコード登録数が検出速度に与える影響と、iOS17の上限約148個の実装制約を詳しく解説します。', supervised: true },
  { slug: 'homepage-renewal-timing-guide', category: 'Web制作', date: '2026.08.07', read: '12 min', title: 'ホームページリニューアルは今が時期？中小企業向け診断ガイド', img: 'assets/blog-default.png', desc: '中小企業のホームページリニューアルタイミングについて、今動くべき5つの判断基準と、先延ばしのリスク、実行の最初のステップを解説します。', supervised: true },
  { slug: 'core-nfc-felica-system-code-limit', category: '技術', date: '2026.08.07', read: '12 min', title: 'iOS Core NFC FeliCaシステムコード上限数を版別に解説', img: 'assets/blog-default.png', desc: 'iOS 16/17/18/26版別に、Core NFCで登録可能なFeliCaシステムコード上限数を実測値付きで解説。検出時間への影響と設計指針を実装者向けにまとめています。', supervised: true },
  { slug: 'homepage-renewal-subsidy-guide', category: 'Web制作', date: '2026.08.07', read: '7 min', title: 'ホームページリニューアル補助金2026|種類・補助率・申請手順', img: 'assets/blog-default.png', desc: 'ホームページリニューアルに活用できる補助金の種類、補助率・上限額、対象条件、申請手順・必要書類を2026年版で完全解説。自社が対象になるかすぐわかります。', supervised: true },
  { slug: 'homepage-renewal-subsidy-cost-calculation', category: 'Web制作', date: '2026.08.07', read: '8 min', title: 'ホームページリニューアル費用の実質負担額|補助金で最大75%圧縮', img: 'assets/blog-default.png', desc: 'ホームページリニューアル費用の相場と補助金を組み合わせた実質負担額を具体的に解説。IT導入補助金など公的支援の補助率・上限額、申請要件、対象判定まで網羅。', supervised: true },
  { slug: 'homepage-production-cost-sme', category: 'Web制作', date: '2026.08.06', read: '10 min', title: 'ホームページ制作費用｜中小企業の予算別相場と補助金活用', img: 'assets/blog-default.png', desc: '中小企業向けホームページ制作費用の相場を予算帯別に解説。10万〜500万円の価格帯ごとに得られる機能・サービスを比較し、費用を抑えるポイントと補助金活用法を紹介します。', supervised: true },
  { slug: 'homepage-renewal-cost-guide', category: 'Web制作', date: '2026.08.05', read: '12 min', title: 'ホームページリニューアル費用|見積もり内訳と補助金', img: 'assets/blog-default.png', desc: '中小企業向けホームページリニューアルの費用相場を規模・内容別に解説。見積もりの妥当性判断に必要な内訳と変動要因、補助金活用方法までを網羅しています。', supervised: true },
  { slug: 'llm-overfitting-detection-prevention', category: 'AI活用', date: '2026.08.05', read: '12 min', title: 'LLM攻撃検出の機械学習モデル、過学習を防ぐ3つのステップ', img: 'assets/blog-default.png', desc: 'LLM攻撃検出用の機械学習分類器で過学習が発生しやすいステップを特定し、評価指標を用いた検出・防止方法を実装者視点で解説します。', supervised: true },
  { slug: 'ai-chatbot-industry-suitability', category: 'AI活用', date: '2026.08.05', read: '12 min', title: 'AIチャットボット業種別活用ガイド｜中小企業の導入判断', img: 'assets/blog-default.png', desc: '中小企業が本当にAIチャットボットを導入すべきかを業種別に判定。導入効果が出やすい業務パターンと失敗しやすい条件を比較し、予算・運用体制の現実を踏まえた検討基準を解説します。', supervised: true },
  { slug: 'homepage-renewal-cost-by-industry', category: 'Web制作', date: '2026.08.05', read: '10 min', title: 'ホームページリニューアル費用相場｜業種別の価格帯と決定要因', img: 'assets/blog-default.png', desc: 'ホームページリニューアルの費用相場を業種別に徹底解説。製造業・士業・飲食・小売など主要業種の価格帯と、費用を左右する要因をまとめました。予算決定の根拠づけにご活用ください。', supervised: true },
  { slug: 'in-house-system-outsourcing-cost', category: '技術', date: '2026.08.05', read: '11 min', title: '社内システム外注費用の相場と工数単価の見方｜失敗しない発注ガイド', img: 'assets/blog-default.png', desc: '社内システム外注の費用相場を機能・規模別に解説。見積書の工程・工数・単価の読み方から、中小企業の予算でも実現可能な開発範囲までをまとめました。', supervised: true },
  { slug: 'it-subsidy-homepage-eligibility-guide', category: 'Web制作', date: '2026.08.04', read: '8 min', title: 'IT導入補助金でホームページ制作は対象？補助率・申請方法を解説', img: 'assets/blog-default.png', desc: 'ホームページ制作・リニューアルがIT導入補助金の対象か、補助率・上限額・申請枠の種類を実例付きで解説。自社が対象事業者か確認する方法も紹介します。', supervised: true },
  { slug: 'llm-guardrail-jailbreak-defense', category: 'AI活用', date: '2026.08.03', read: '12 min', title: 'LLMガードレール破られる原因と実装可能な3つの対策', img: 'assets/blog-default.png', desc: 'LLMのガードレールがプロンプトインジェクション、ジェイルブレイクで突破される原因の構造と、実務で実装できる3つの防御対策を解説します。失敗事例から自社構成の穴を発見できます。', supervised: true },
  { slug: 'cms-comparison-wordpress-small-business', category: 'Web制作', date: '2026.08.02', read: '9 min', title: 'WordPress他CMSを徹底比較｜失敗しない選び方5つのポイント', img: 'assets/blog-default.png', desc: 'WordPress・Wix・Squarespace・Jimdo等の主要CMSを機能・費用・保守性で横並び比較。中小企業の規模・業種に合ったCMS選定基準と導入後のリスク管理を解説します。', supervised: true },
  { slug: 'ai-seo-article-quality-check', category: 'AI活用', date: '2026.07.31', read: '10 min', title: '生成AI記事のSEO品質管理｜公開前チェック5ステップ', img: 'assets/blog-default.png', desc: 'AI生成記事がGoogleで評価されない理由を解説。品質チェックの5ステップと、人手とAIの効果的な組み合わせ方で、工数を増やさずSEO品質を担保する運用方法を紹介します。', supervised: true },
  { slug: 'ios-nfc-felica-slow-fix', category: '技術', date: '2026.07.31', read: '9 min', title: 'iOS NFC FeliCa読み取りが遅い原因と解決法｜Info.plist設定ガイド', img: 'assets/blog-default.png', desc: 'iOSアプリのFeliCa読み取り遅延・タイムアウトの根本原因を解説。Info.plistのsystemCodes設定手順と、iOS 16/17/18での挙動差を含むハウツーガイドです。', supervised: true },
  { slug: 'homepage-renewal-timing-checklist', category: 'Web制作', date: '2026.07.31', read: '11 min', title: 'ホームページリニューアルはいつ？見極め方を診断フロー付きで解説', img: 'assets/blog-default.png', desc: 'ホームページリニューアルのタイミングを5つのチェックリストで自己診断。客観的な判断基準と優先度、後回しにした場合のリスクを分かりやすく解説します。', supervised: true },
  { slug: 'system-development-outsourcing-cost-guide', category: '技術', date: '2026.07.31', read: '12 min', title: '社内システム開発の外注費用相場｜中小企業向け3つの選択肢', img: 'assets/blog-default.png', desc: '社内システムを外注開発する際の費用相場、スクラッチ・パッケージカスタマイズ・SaaS活用の3つの選択肢ごとのコスト比較、中小企業向けの発注先選定ポイントを解説します。', supervised: true },
  { slug: 'homepage-renewal-case-study-by-industry', category: 'Web制作', date: '2026.07.31', read: '12 min', title: 'ホームページリニューアル事例3業種別｜課題解決と成果を公開', img: 'assets/blog-default.png', desc: '製造業・士業・飲食3業種のホームページリニューアル事例を紹介。各企業の課題解決方法、得られた成果、実際の費用と工期をまとめました。業種別の設計ポイントも解説します。', supervised: true },
  { slug: 'homepage-renewal-301-redirect-guide', category: 'Web制作', date: '2026.07.28', read: '12 min', title: 'URL移行で検索順位を下げない301リダイレクト完全ガイド', img: 'assets/blog-default.png', desc: 'ホームページリニューアル時の301リダイレクト設定手順を解説。URL移行で検索評価を引き継ぎ、順位下落を防ぐ具体的な方法と、よくある設定ミスの確認リストを紹介します。', supervised: true },
  { slug: 'blog-bot',                       category: 'AI活用',      date: '2026.07.23', read: '9 min', title: 'ブログボットとは？AIで記事を作成・投稿する仕組みと選び方【2026年版】',           img: 'assets/blog-blog-bot.png', supervised: true, updated: '2026.08.01'},
  { slug: 'web-production-cost-guide',      category: 'Web制作',     date: '2026.07.17', read: '7 min', title: '【2026年最新】中小企業のホームページ制作費用の相場は？失敗しない発注ガイド',      img: 'assets/blog-web-production-cost-guide.png' },
  { slug: 'website-renewal-guide',          category: 'Web制作',     date: '2026.07.15', read: '6 min', title: '失敗しないホームページリニューアルの進め方 — タイミングの見極めと発注チェックリスト', img: 'assets/blog-website-renewal-guide.png', supervised: true, updated: '2026.08.05'},
  { slug: 'website-not-converting',         category: 'Web制作',     date: '2026.07.13', read: '6 min', title: 'ホームページを作ったのに集客できない — 中小企業がやるべき5つの改善',             img: 'assets/blog-website-not-converting.png' },
  { slug: 'llmo-basics-for-smb',            category: 'SEO',         date: '2026.07.11', read: '6 min', title: 'AI検索でアクセスは減る？中小企業がいま始めるべきLLMO対策の基本',                img: 'assets/blog-llmo-basics-for-smb.png', supervised: true, updated: '2026.08.01'},
  { slug: 'google-business-profile-meo',    category: 'SEO',         date: '2026.07.09', read: '6 min', title: '広告費0円から始める集客術 — Googleビジネスプロフィールで地域のお客様を増やす',    img: 'assets/blog-google-business-profile-meo.png', supervised: true, updated: '2026.08.01'},
  { slug: 'listing-ads-cpc-roi',            category: 'マーケティング', date: '2026.07.07', read: '6 min', title: 'リスティング広告のCPCが高すぎる？費用対効果を上げる5つの見直し',                img: 'assets/blog-listing-ads-cpc-roi.png' },
  { slug: 'page-speed-conversion',          category: '技術',        date: '2026.07.04', read: '6 min', title: 'サイトが「遅い」だけで損してる — 表示速度の改善で問い合わせが増える理由',        img: 'assets/blog-page-speed-conversion.png' },
  { slug: 'ai-chatbot-introduction',        category: 'AI活用',      date: '2026.07.02', read: '6 min', title: '問い合わせ対応の負担を減らす — 中小企業のAIチャットボット導入ステップと費用',      img: 'assets/blog-ai-chatbot-introduction.png' },
  { slug: 'smb-dx-first-step',              category: 'DX 観察記',   date: '2026.06.30', read: '7 min', title: '中小企業のDXは何から始める？AI活用の「最初の一歩」と補助金の使い方',             img: 'assets/blog-smb-dx-first-step.png' },
  { slug: 'subsidy-2026-digital-ai',        category: 'DX 観察記',   date: '2026.06.29', read: '6 min', title: 'IT導入補助金は2026年から名称変更 — ホームページ・AIツールは補助金の対象になる？', img: 'assets/blog-subsidy-2026-digital-ai.png' },
  { slug: 'website-launch-1month',          category: 'Web制作',     date: '2026.06.27', read: '6 min', title: 'Webサイトを「最短1ヶ月」でローンチする — 速さと丁寧さは両立できる',            img: 'assets/blog-website-launch-1month.png', supervised: true, updated: '2026.07.31'},
  { slug: 'aio-llmo-reality-check',         category: 'SEO',         date: '2026.06.23', read: '7 min', title: 'AIO・LLMO対策に踊らされる前に — 日本人はまだAI検索をほとんど使っていない',     img: 'assets/blog-aio-llmo-reality-check.png' },
  { slug: 'multi-ai-parallel-productivity', category: 'AI活用',      date: '2026.06.18', read: '6 min', title: 'AIは「複数同時に使う」から効率化できる — 毎日AIに触れる私たちだからわかること', img: 'assets/blog-multi-ai-parallel-productivity.png', supervised: true, updated: '2026.08.01'},
  { slug: 'ai-literacy-mindset-shift',      category: 'AI活用',      date: '2026.06.13', read: '6 min', title: 'AIの使い方を教えるのは、想像以上に難しい — 必要なのは「思考の転換」',          img: 'assets/blog-ai-literacy-mindset-shift.png', supervised: true, updated: '2026.08.05'},
  { slug: 'btob-web-marketing',             category: 'マーケティング', date: '2026.06.04', read: '6 min', title: 'Web集客はまだまだ熱い — 特にBtoBでは最も効率の良い武器',                       img: 'assets/blog-btob-web-marketing.png' },
  { slug: 'office-work-automation',         category: 'AI活用',      date: '2026.05.30', read: '6 min', title: 'AIを使わない＝無駄な労働 — 事務作業の多くは、もう自動化できる',                img: 'assets/blog-office-work-automation.png' },
  { slug: 'benchmark-competitor-success',   category: 'マーケティング', date: '2026.05.26', read: '6 min', title: 'うまくいっている施策を真似れば、Web集客はどんなサービスでも成功する',          img: 'assets/blog-benchmark-competitor-success.png' },
  { slug: 'how-to-choose-web-agency',       category: 'Web制作',     date: '2026.05.16', read: '6 min', title: '制作会社の選び方 — 「安かろう悪かろう」の罠を避ける',                          img: 'assets/blog-how-to-choose-web-agency.png' },
  { slug: 'japan-dx',        category: 'DX 観察記', date: '2026.05.12', read: '8 min',  title: 'なぜ日本のDXはアメリカに2〜3年遅れているのか',          img: 'assets/blog-japan-dx.png' },
  { slug: 'vetonet',         category: '技術',       date: '2026.04.28', read: '12 min', title: 'VetoNet 開発の裏側 — AI agent security とは何か',        img: 'assets/blog-vetonet.png' },
  { slug: 'wordpress-stall', category: 'AI活用',     date: '2026.03.30', updated: '2026.09.01', read: '7 min',  title: 'WordPress 更新が止まる本当の理由とその解決',            img: 'assets/blog-wordpress-stall.png' },
  { slug: 'core-web-vitals', category: '技術',       date: '2026.03.18', read: '10 min', title: 'Core Web Vitals の「Good」を現実的に取得する',           img: 'assets/blog-core-web-vitals.png' },
  { slug: 'clinic-web',      category: '業種別',     date: '2026.03.05', read: '8 min',  title: 'クリニックのWeb集客 2026年版 完全ガイド',                img: 'assets/blog-clinic-web.png' },
  { slug: 'ai-poc',          category: 'DX 観察記', date: '2026.02.22', read: '9 min',  title: 'PoCで終わるAI案件と、本実装まで進むAI案件の違い',        img: 'assets/blog-ai-poc.png' },
  { slug: 'realty-lp',       category: '業種別',     date: '2026.02.10', read: '6 min',  title: '不動産売却査定LPで反響を獲得する7つの必須要素',          img: 'assets/blog-realty-lp.png' },
  // date は 2026.01.28 から修正。本文が扱うのは2026年4月公開のモデルまでで、
  // 調査時点も2026年5月のため、公開日が本文より前という矛盾が出ていた。
  // title も「比較ドシエ」という内部用語をやめ、title / H1 / BlogPosting headline を揃えた。
  { slug: 'claude-vs-gpt',   category: 'AI活用',     date: '2026.05.21', updated: '2026.09.01', read: '11 min', title: 'Claude vs GPT 業務利用の比較｜複数AIの同時活用・使い分け', img: 'assets/blog-claude-vs-gpt.png' },
];

// 公開前チェック — 記事本文に「執筆者向けの指示書」が残ったまま公開されるのを止める。
//
// 実際に /article-claude-vs-gpt と /article-wordpress-stall が、記事ではなく
// 社内リサーチ・ドシエ (構成案 / 記事タイトル候補 / コピー設計の提案 / 執筆時の注意) の
// まま公開されていた。読者には「これから記事を書く人向けの指示書」が見えている状態で、
// AI記事生成を商材にしている会社のオウンドメディアとしては営業上の実害が大きい。
//
// 判定は「読者向け本文には絶対に出てこない語」だけに絞る。
// Key Findings / Recommendations / Caveats という見出し自体は、出典の限界を明示する
// 読者向けセクションとして正しく使っている記事があるため、それ単体では弾かない。
const DRAFT_SCAFFOLDING = [
  '記事執筆時',
  '記事の構成案',
  '記事タイトル候補',
  '推奨ストーリーライン',
  '記事LPコピー設計',
  '記事LP導線に沿った',
  '記事に組み込める',
  '執筆時の参照用',
];
function assertNoDraftScaffolding(entry, md) {
  const hits = DRAFT_SCAFFOLDING.filter((phrase) => md.includes(phrase));
  if (!hits.length) return;
  const where = 'content/blog/' + entry.slug + '.md';
  if (entry.noindex) {
    console.warn('  ! ' + where + ': 下書きの痕跡 [' + hits.join(', ') + '] — noindex 中');
    return;
  }
  throw new Error(
    where + ' に執筆者向けの下書きが残っています: ' + hits.join(', ')
    + " — 読者向けの本文に書き直すか、BLOG エントリに noindex: true を付けて公開を止めてください。"
  );
}

// 記事本文のレイアウト事故を公開前に知らせる (2026-09 レイアウト監査)。
// CSS 側 (.article-body a の overflow-wrap / th,td の min-width) で表示は破綻しなく
// なったが、元のフォーマットを直したほうが読みやすいので警告だけ出す。
// 裸URLは375pxで最大 +320px はみ出していた原因、表は4カラムを超えると
// SPで各カラムが潰れて1文字ずつ縦積みになる。
function warnArticleLayoutRisks(entry, md) {
  const where = 'content/blog/' + entry.slug + '.md';
  const body = md.replace(/`[^`]*`/g, '');   // コードスパンは対象外
  const bare = (body.match(/(^|[^(\[])https?:[/][/][^\s)<>|`」）]+/g) || []).length;
  if (bare) {
    console.warn('  ! ' + where + ': 裸のURL ' + bare + '件 — [表示名](URL) 形式にすると折り返せる');
  }
  const cols = (md.match(/^[|].*[|]$/gm) || []).map((row) => row.split('|').length - 2);
  const widest = cols.length ? Math.max.apply(null, cols) : 0;
  if (widest > 4) {
    console.warn('  ! ' + where + ': 表の最大カラム数 ' + widest + ' — SPでは4カラム以内を推奨');
  }
}

marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });

function buildArticles() {
  const out = {};
  for (const a of BLOG) {
    const mdPath = path.join(ROOT, 'content', 'blog', a.slug + '.md');
    if (!fs.existsSync(mdPath)) { console.warn(`  ! missing ${a.slug}.md`); continue; }
    let md = fs.readFileSync(mdPath, 'utf8');
    assertNoDraftScaffolding(a, md);
    warnArticleLayoutRisks(a, md);
    // Drop the leading H1 (we render title/meta from the manifest in the page header).
    // Tolerate CRLF line endings — on Windows checkouts (core.autocrlf=true) the
    // markdown is \r\n, and `.` doesn't match \r, so a plain \n+ would never match
    // and the H1 would leak into the body (duplicate heading).
    md = md.replace(/^\s*#\s+.+(?:\r?\n)+/, '');
    const html = marked.parse(md);
    // updated は改修 (refit) で本文を書き換えたときにパイプラインが入れる更新日。
    // date は初出の公開日で改修しても変えないため、鮮度は updated 側で伝える。
    out[a.slug] = { slug: a.slug, title: a.title, category: a.category, date: a.date, updated: a.updated || '', read: a.read, img: a.img, supervised: !!a.supervised, desc: a.desc || '', noindex: !!a.noindex, html };
  }
  return out;
}

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  // Empty the directory's contents instead of removing the directory itself —
  // on Windows the working directory may be locked while a static-file server
  // process holds an inode handle, but its children can usually still be deleted.
  if (fs.statSync(p).isDirectory()) {
    for (const entry of fs.readdirSync(p)) {
      const child = path.join(p, entry);
      try {
        fs.rmSync(child, { recursive: true, force: true });
      } catch {
        /* ignore — best effort */
      }
    }
  } else {
    fs.rmSync(p, { force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Small UI icons we never want to resize/recompress (kept pixel-perfect & tiny).
const ICON_SKIP = new Set(['nortiq-fav.png', 'nortiq-icon.png', 'nortiq-mark.png']);
const RASTER_EXT = new Set(['.png', '.jpg', '.jpeg']);

// Recursively collect raster image paths under dir, skipping the vendor/ JS folder.
function collectRasterImages(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'vendor') continue; // vendor/ holds JS, not images
      collectRasterImages(full, acc);
    } else if (RASTER_EXT.has(path.extname(entry.name).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

function rasterBytes(files) {
  let total = 0;
  for (const f of files) {
    try { total += fs.statSync(f).size; } catch { /* ignore */ }
  }
  return total;
}

function humanBytes(n) {
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + 'MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + 'KB';
  return n + 'B';
}

// Walk dist/assets, downscale oversized rasters to <=1600px wide, and re-encode
// PNG/JPEG in place — only keeping the result when it actually saves bytes.
async function optimizeImages(assetsDir) {
  if (!fs.existsSync(assetsDir)) return;
  const files = collectRasterImages(assetsDir);
  const before = rasterBytes(files);
  for (const file of files) {
    const base = path.basename(file);
    if (ICON_SKIP.has(base)) continue;
    const ext = path.extname(file).toLowerCase();
    try {
      // Read into a Buffer first — sharp can't reliably read & overwrite the
      // same path within one pipeline.
      const buffer = fs.readFileSync(file);
      const original = buffer.length;
      const meta = await sharp(buffer).metadata();
      const oversized = !!(meta.width && meta.width > 1600);
      const sized = (p) => (oversized ? p.resize({ width: 1600, withoutEnlargement: true }) : p);
      // Re-encode the same format in place (only when it saves bytes).
      let pipeline = sized(sharp(buffer));
      pipeline = ext === '.png'
        ? pipeline.png({ compressionLevel: 9, palette: true, quality: 80 })
        : pipeline.jpeg({ quality: 80, mozjpeg: true });
      const out = await pipeline.toBuffer();
      if (out.length < original) {
        fs.writeFileSync(file, out);
      }
      // Emit a WebP sibling for <picture> progressive enhancement.
      const webpBuf = await sized(sharp(buffer)).webp({ quality: 78 }).toBuffer();
      fs.writeFileSync(file.replace(/\.(png|jpe?g)$/i, '.webp'), webpBuf);
    } catch (e) {
      console.warn(`  ! image opt skipped ${path.relative(assetsDir, file)}: ${e.message}`);
    }
  }
  const after = rasterBytes(files);
  console.log(`  → image opt: ${humanBytes(before)} -> ${humanBytes(after)}`);
}

async function compileJsx(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const out = babel.transformSync(src, {
    filename: file,
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    babelrc: false,
    configFile: false,
    sourceType: 'script',
  });
  return out.code;
}

async function build() {
  console.log('• cleaning dist/');
  fs.mkdirSync(DIST, { recursive: true });
  rmrf(DIST);

  console.log('• compiling JSX → JS');
  const compiled = [];
  for (const f of JSX_FILES) {
    const code = await compileJsx(f);
    compiled.push({ file: f.replace(/\.jsx$/, '.js'), code, name: f });
    console.log(`  - ${f} → ${f.replace(/\.jsx$/, '.js')}`);
  }

  console.log('• bundling into single app.bundle.js');
  // Concatenate so we ship a single minified bundle instead of 8 separate files.
  // Each module is wrapped in an IIFE-equivalent block; since the originals were
  // already loaded as plain <script> tags at top level, we keep that semantic.
  const bundleSrc = compiled
    .map(({ name, code }) => `/* ===== ${name} ===== */\n${code}`)
    .join('\n\n');

  console.log('• minifying bundle');
  const minified = await minify(bundleSrc, {
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false },
  });
  if (minified.error) throw minified.error;

  fs.writeFileSync(path.join(DIST, 'app.bundle.js'), minified.code, 'utf8');
  const sizeKB = (Buffer.byteLength(minified.code, 'utf8') / 1024).toFixed(1);
  console.log(`  → dist/app.bundle.js (${sizeKB} KB)`);

  console.log('• rendering blog articles (markdown → html)');
  const articles = buildArticles();
  // 記事本文 (html) は articles.js から外し、1記事1ファイルに分割する。
  // 以前は全73本の本文を1つの articles.js (1.5MB) に固めてトップページを含む
  // 全ページで読み込んでいた。記事1本を読むために他72本の本文が付いてくる状態。
  // articles.js にはメタデータだけを残す (ルート登録・記事一覧・関連記事・
  // meta description / JSON-LD は全てメタデータだけで足りる)。
  const meta = {};
  const bodies = {};
  for (const [slug, a] of Object.entries(articles)) {
    const { html, ...rest } = a;
    meta[slug] = rest;
    bodies[slug] = html;
  }
  const articlesJs = 'window.NORTIQ_ARTICLES = ' + JSON.stringify(meta) + ';';
  fs.writeFileSync(path.join(DIST, 'articles.js'), articlesJs, 'utf8');
  // Also drop a copy at project root so the Babel dev HTML can load it.
  fs.writeFileSync(path.join(ROOT, 'articles.js'), articlesJs, 'utf8');
  const BODIES_DIR = path.join(DIST, 'articles');
  fs.mkdirSync(BODIES_DIR, { recursive: true });
  let bodyBytes = 0;
  for (const [slug, html] of Object.entries(bodies)) {
    const js = '(window.NORTIQ_ARTICLE_HTML=window.NORTIQ_ARTICLE_HTML||{})['
      + JSON.stringify(slug) + ']=' + JSON.stringify(html) + ';';
    fs.writeFileSync(path.join(BODIES_DIR, slug + '.js'), js, 'utf8');
    bodyBytes += Buffer.byteLength(js, 'utf8');
  }
  console.log(`  → dist/articles.js (${Object.keys(meta).length} articles, メタのみ ${(Buffer.byteLength(articlesJs, 'utf8') / 1024).toFixed(1)} KB)`);
  console.log(`  → dist/articles/*.js (本文 ${Object.keys(bodies).length} ファイル, 計 ${(bodyBytes / 1024).toFixed(1)} KB)`);

  console.log('• copying styles.css');
  fs.copyFileSync(path.join(ROOT, 'styles.css'), path.join(DIST, 'styles.css'));

  console.log('• copying assets/');
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));

  // showcase/ — 実績ショーケースサイト (自己完結の静的HTML群)。
  // 同一ドメイン (/showcase/<name>/) で配信し、実績カードのサイト内モーダルから
  // iframe 表示する。本体と検索上で競合しないよう、HTML には noindex を注入する。
  const SHOWCASE = path.join(ROOT, 'showcase');
  if (fs.existsSync(SHOWCASE)) {
    const dest = path.join(DIST, 'showcase');
    copyDir(SHOWCASE, dest);
    const injectNoindex = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) { injectNoindex(p); continue; }
        if (!/\.html?$/i.test(entry.name)) continue;
        let html = fs.readFileSync(p, 'utf8');
        if (!/name=["']robots["']/i.test(html)) {
          html = html.replace(/<head([^>]*)>/i, '<head$1>\n<meta name="robots" content="noindex, nofollow">');
          fs.writeFileSync(p, html);
        }
      }
    };
    injectNoindex(dest);
    console.log('• copied showcase/ (noindex injected)');
  }

  console.log('• optimizing dist/assets images');
  await optimizeImages(path.join(DIST, 'assets'));

  // Dedicated 1200x630 Open Graph / Twitter share image.
  try {
    await sharp(path.join(ROOT, 'assets', 'nortiq-hero-bg.png'))
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .png({ quality: 82 })
      .toFile(path.join(DIST, 'assets', 'og-image.png'));
  } catch (e) {
    console.warn('  ! og-image generation skipped: ' + e.message);
  }

  console.log('• emitting dist/index.html');
  // Cache-busting version token — appended to local asset URLs so each deploy
  // forces browsers to fetch fresh files instead of serving a stale bundle.
  // アセットのキャッシュバスター。
  // 以前は Date.now() だったため、内容が同じでもビルドのたびに値が変わり、
  // プリレンダ済みHTML (ローカル/CIのビルド時に生成) とデプロイ時に生成される
  // app.html とで ?v= が食い違っていた。実害として、静的HTMLとReact描画で
  // 実績数字が違う (27社+ → 30社+ に切り替わる) 状態が本番で発生していた。
  // 内容から導出すれば、同じ内容のビルドは必ず同じ値になる。
  const ver = (() => {
    const h = crypto.createHash('sha256');
    for (const f of ['app.bundle.js', 'articles.js', 'styles.css']) {
      h.update(fs.readFileSync(path.join(DIST, f)));
    }
    return h.digest('hex').slice(0, 10);
  })();
  const SITE = 'https://nortiqlab.com';
  const TITLE = '京都のWeb制作・AI導入・DX支援｜Nortiq Labs';
  const DESC = '京都のWeb制作×AI実装カンパニー。オリジナルデザインのホームページ制作からAIチャットボット導入、DXコンサルティングまで一気通貫で支援。初回相談無料・営業日24時間以内に返信します。';
  const OG_IMAGE = SITE + '/assets/og-image.png';

  // --- Analytics & conversion tracking ----------------------------------------
  // Paste your real IDs here, then rebuild. Until they are filled in, NO tag is
  // emitted — the build ships clean (no requests to a non-existent property, no
  // console noise). Format check is strict so a half-filled placeholder stays off.
  //   GA4_ID                Google Analytics 4 measurement ID   → "G-XXXXXXXXXX"
  //   GADS_ID               Google Ads conversion ID            → "AW-XXXXXXXXXX"
  //   GADS_LABEL_CONTACT    Ads conversion label — 問い合わせフォーム送信
  //   GADS_LABEL_DIAGNOSTIC Ads conversion label — 無料診断 CTA クリック
  const GA4_ID = 'G-EYTD1TWR7T';
  const GADS_ID = '';
  const GADS_LABEL_CONTACT = '';
  const GADS_LABEL_DIAGNOSTIC = '';
  const looksReal = (v, re) => typeof v === 'string' && re.test(v) && !/X{4,}/.test(v);
  const GA4_ON = looksReal(GA4_ID, /^G-[A-Z0-9]{6,}$/);
  const GADS_ON = looksReal(GADS_ID, /^AW-[0-9]{6,}$/);
  const sendTo = (label) => (GADS_ON && label && !/X{4,}/.test(label)) ? `'${GADS_ID}/${label}'` : 'null';
  const loaderId = GA4_ON ? GA4_ID : (GADS_ON ? GADS_ID : '');
  const analyticsHead = loaderId ? `
  <!-- Google tag (gtag.js) — GA4 + Google Ads conversion tracking -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${loaderId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());${GA4_ON ? `\n    gtag('config', '${GA4_ID}');` : ''}${GADS_ON ? `\n    gtag('config', '${GADS_ID}');` : ''}
    window.NORTIQ_CONV = { contact: ${sendTo(GADS_LABEL_CONTACT)}, diagnostic: ${sendTo(GADS_LABEL_DIAGNOSTIC)} };
  </script>` : `
  <!-- Analytics off: set GA4_ID / GADS_ID (+ conversion labels) in build.js to emit gtag.js. -->`;

  const FAQ_QA = [
    { q: 'Nortiq Labs はどんな会社ですか？', a: `米国 UC Berkeley での AI 研究背景を持つ代表のもと、日本の経営課題に向き合うメンバーで構成された技術チームです。Web制作・AIチャットボット・DX/ML 実装まで、中小企業のDXを段階的に支援します。これまで${NORTIQ_STATS.clients}社の制作・支援実績があります（2025年・京都設立）。` },
    { q: 'Web制作の費用はどれくらいですか？', a: 'オリジナルデザインのWeb制作は30万円から承っています。ページ数・機能・要件に応じてお見積もりし、公開後の運用・改善まで伴走します。' },
    { q: 'AIチャットボットは導入できますか？', a: 'はい。WordPress連携のAI投稿アシスタントをはじめ、問い合わせ対応やブログ更新を自動化するAIチャットボットの導入を、実装の中身まで説明しながら支援します。' },
    { q: '補助金は活用できますか？', a: 'IT導入補助金などの活用を視野に入れた DX 投資のご相談を承っています。なお、補助金申請の手続きサポート（登録 IT 導入支援事業者としての対応）は現在準備中です。' },
    { q: '対応している業種は？', a: `クリニック・医療、不動産、建築・工務店、人材、小売/EC、インフラ・製造、AIスタートアップなど、${NORTIQ_STATS.industries}業種以上の制作・支援実績があります。` },
    { q: '制作後のサポートはありますか？', a: '公開して終わりにはせず、運用・改善まで継続して伴走します。お問い合わせには営業日24時間以内にご返信します。' },
    { q: '全国対応していますか？', a: 'はい。オンラインを中心に、全国のお客様に対応しています。' },
  ];
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': SITE + '/#org', name: 'Nortiq Labs', url: SITE + '/',
        logo: SITE + '/assets/nortiq-mark.png', image: OG_IMAGE, description: DESC,
        slogan: '日本のDX、世界水準で巻き返す。', foundingDate: '2025', numberOfEmployees: NORTIQ_STATS.team,
        address: { '@type': 'PostalAddress', addressCountry: 'JP', postalCode: '604-0012', addressRegion: '京都府', addressLocality: '京都市中京区', streetAddress: '竪大恩寺町751' },
        areaServed: { '@type': 'Country', name: 'Japan' },
        alternateName: ['株式会社ノーティックラボ', 'ノーティックラボ'],
        ...(ORG_SAME_AS.length ? { sameAs: ORG_SAME_AS } : {}),
        knowsAbout: ['Web制作', 'AIチャットボット', 'DX', '機械学習', 'SEO', 'LP制作 / LPO', '業務自動化', 'データ分析'],
        // @id を付けて記事側から参照できるようにする。記事ページの reviewedBy が
        // このノードを指すので、可視の「監修: 大島蓮太」と構造化データが一致する。
        founder: { '@type': 'Person', '@id': SITE + '/#renta', name: 'Renta Oshima', alternateName: '大島蓮太', jobTitle: 'Founder / Engineer', worksFor: { '@id': SITE + '/#org' }, description: '米国 UC Berkeley で AI 研究。日本の中小企業向け DX 支援を起業。' },
      },
      { '@type': 'WebSite', '@id': SITE + '/#website', name: 'Nortiq Labs', url: SITE + '/', publisher: { '@id': SITE + '/#org' }, inLanguage: 'ja' },
      { '@type': 'ProfessionalService', name: 'Nortiq Labs', url: SITE + '/', description: DESC, areaServed: 'JP', serviceType: ['Web制作', 'AIチャットボット導入', 'DX・ML実装', '補助金活用のDX導入相談'], provider: { '@id': SITE + '/#org' } },
      // FAQPage は出力しない。Googleは2026年6月にFAQリッチリザルトを廃止したため、
      // マークアップしても表示上の利得が無く、ペイロードが増えるだけになる。
      // FAQ自体は本文に残す (AI検索=LLMOと網羅性のため)。
      // Organization / WebSite / ProfessionalService / BreadcrumbList は維持する。
    ],
  }).replace(/</g, '\\u003c');
  // Production-mode React (smaller, faster) — no Babel runtime in the browser.
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${analyticsHead}
  <title>${TITLE}</title>
  <meta name="description" content="${DESC}">
  <link rel="canonical" href="${SITE}/">
  <link rel="icon" href="assets/nortiq-fav.png" type="image/png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Nortiq Labs">
  <!-- 記事ルートでは app.jsx が og:type を article に変え、下の2つに日付を入れる。
       setMetaContent は既存要素しか書き換えないため、空のまま置いておく必要がある -->
  <meta property="article:published_time" content="">
  <meta property="article:modified_time" content="">
  <meta property="og:title" content="${TITLE}">
  <meta property="og:description" content="${DESC}">
  <meta property="og:url" content="${SITE}/">
  <meta property="og:image" content="${OG_IMAGE}">
  <meta property="og:locale" content="ja_JP">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${TITLE}">
  <meta name="twitter:description" content="${DESC}">
  <meta name="twitter:image" content="${OG_IMAGE}">
  <link rel="stylesheet" href="styles.css?v=${ver}">
  <script type="application/ld+json">${jsonLd}</script>
  <!-- defer: この2本 (計約139KB) は head にあって描画をブロックしていた。
       ページの初期表示はプリレンダ済みHTMLで完結するのでJSを待つ必要がない。
       defer は文書順に実行されるため react → react-dom → articles.js →
       app.bundle.js の順序は保たれる。 -->
  <script src="assets/vendor/react.production.min.js?v=${ver}" defer></script>
  <script src="assets/vendor/react-dom.production.min.js?v=${ver}" defer></script>
</head>
<body>
  <div id="app"></div>
  <script src="articles.js?v=${ver}" defer></script>
  <script src="app.bundle.js?v=${ver}" defer></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');
  // Clean SPA shell kept as the rewrite fallback target, so routes that are NOT
  // pre-rendered don't inherit the (pre-rendered) home's body content. The
  // prerendered overlay below overwrites index.html but never app.html.
  // Strip the home canonical so non-prerendered routes don't appear to
  // canonicalize to "/" in raw HTML — the client adds the correct one per route.
  const SPA_SHELL = html.replace(/\s*<link rel="canonical"[^>]*>/, '');
  fs.writeFileSync(path.join(DIST, 'app.html'), SPA_SHELL, 'utf8');

  console.log('• emitting robots.txt + sitemap.xml');
  fs.writeFileSync(path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');
  const SITEMAP_ROUTES = [
    'top', 'web', 'chatbot', 'dx', 'works', 'voice', 'support', 'pricing',
    // /diagnosis は /diagnostic に統合し301 (検索意図が同一で共食いしていた)
    'subsidy', 'guidebook', 'column', 'company', 'staff', 'recruit',
    'news', 'diagnostic', 'product-vetonet', 'product-wpchat', 'product-tennis',
    'feature-cms', 'feature-lpo', 'feature-recruit', 'feature-analytics',
    'works-clinic', 'works-realty', 'works-build', 'works-hr', 'works-retail',
    'works-infra', 'works-ai', 'solution-clinic', 'solution-realty',
    'solution-build', 'solution-hr', 'solution-retail',
    'works-lp-corp', 'works-lp-recruit', 'works-lp-ec', 'works-video',
    'privacy', 'terms', 'privacy-handling',
    // /sitemap は meta robots が noindex。noindex のURLを sitemap.xml に載せると
    // 「登録したのに除外されました」という矛盾したシグナルになるため出さない。
    // /quick-diagnosis も同様 (ツールページなので noindex 運用)。
    ...BLOG.filter((b) => !b.noindex).map((b) => 'article-' + b.slug),
  ];
  // lastmod は記事だけに出す。
  //
  // 以前は全URLにビルド実行日を入れていたため、記事を1本も触っていなくても毎ビルドで
  // 全URLの lastmod が今日になっていた。lastmod が一貫して不正確なサイトでは
  // Google はこの値自体を無視するので、「既存記事を改修して鮮度を回復する」という
  // 運用の更新シグナルが届かなくなる。
  // 記事は updated (改修日) を優先し、無ければ date (初出日) を使う。
  // 固定ページは正確な更新日を持たないため lastmod を出さない (嘘の日付を書かない)。
  // changefreq / priority は Google が利用しないため出力しない。
  const articleLastmod = new Map(
    BLOG.map((b) => ['article-' + b.slug, String(b.updated || b.date).replace(/\./g, '-')]),
  );
  const sitemapUrls = SITEMAP_ROUTES.map((id) => {
    const loc = id === 'top' ? `${SITE}/` : `${SITE}/${id}`;
    const lastmod = articleLastmod.get(id);
    return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  }).join('\n');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + sitemapUrls + '\n'
    + `</urlset>\n`, 'utf8');

  // IndexNow検証キー: リポジトリ直下の indexnow-key.txt (キー文字列1行) があれば
  // dist/<key>.txt を配置する (新記事公開時のBing系への通知に使用。送信はパイプライン側)
  const indexnowKeyPath = path.join(ROOT, 'indexnow-key.txt');
  if (fs.existsSync(indexnowKeyPath)) {
    const indexnowKey = fs.readFileSync(indexnowKeyPath, 'utf8').trim();
    if (indexnowKey) {
      fs.writeFileSync(path.join(DIST, indexnowKey + '.txt'), indexnowKey, 'utf8');
      console.log('• emitting IndexNow key file');
    }
  }

  console.log('• emitting 404.html');
  fs.writeFileSync(path.join(DIST, '404.html'), `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">${analyticsHead}
<meta name="robots" content="noindex, follow">
<title>ページが見つかりません (404) — Nortiq Labs</title>
<link rel="icon" href="/assets/nortiq-fav.png">
<link rel="stylesheet" href="/styles.css">
<style>
  .nf-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;font-family:'Noto Sans JP',system-ui,sans-serif;background:#fff;color:#1a1a1a}
  .nf-box{max-width:560px;text-align:center}
  .nf-code{font-size:64px;font-weight:800;letter-spacing:.05em;margin:0;color:hsl(354,92%,45%)}
  .nf-title{font-size:22px;font-weight:700;margin:12px 0 8px}
  .nf-lede{font-size:15px;line-height:1.8;color:#555;margin:0 0 28px}
  .nf-links{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .nf-links a{display:inline-block;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px}
  .nf-primary{background:hsl(354,92%,45%);color:#fff}
  .nf-ghost{border:1px solid #ddd;color:#1a1a1a}
</style>
</head>
<body>
<div class="nf-wrap"><div class="nf-box">
  <p class="nf-code">404</p>
  <h1 class="nf-title">お探しのページが見つかりませんでした</h1>
  <p class="nf-lede">URL が変更されたか、削除された可能性があります。下記からお探しの情報にお進みください。</p>
  <div class="nf-links">
    <a class="nf-primary" href="/">トップへ戻る</a>
    <a class="nf-ghost" href="/works">制作実績を見る</a>
    <a class="nf-ghost" href="/diagnostic">無料サイト診断</a>
  </div>
</div></div>
<script>
  // The page_view for this hit lands under the 404 URL, which alone doesn't say
  // where the dead link came from. This event carries the broken path + referrer
  // so GA4 can list which links to fix.
  try {
    if (typeof gtag === 'function') {
      gtag('event', 'page_not_found', {
        broken_path: location.pathname + location.search,
        referrer: document.referrer || '(direct)',
      });
    }
  } catch (e) {}
</script>
</body>
</html>
`, 'utf8');

  // Overlay committed pre-rendered route snapshots onto dist/ (if present).
  // Chromium can't run in the Vercel build container, so snapshots are generated
  // locally via `npm run build:full` and committed to prerendered/; here we just
  // copy them in. Skipped automatically when prerendered/ is absent → pure SPA.
  const PRERENDERED = path.join(ROOT, 'prerendered');
  if (fs.existsSync(PRERENDERED)) {
    let pages = 0;
    const overlay = (src, dest) => {
      for (const e of fs.readdirSync(src, { withFileTypes: true })) {
        if (e.name === 'README.md') continue;
        const s = path.join(src, e.name);
        const d = path.join(dest, e.name);
        if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); overlay(s, d); }
        else { fs.copyFileSync(s, d); if (e.name === 'index.html') pages++; }
      }
    };
    overlay(PRERENDERED, DIST);
    console.log(`• overlaid prerendered/ → dist/ (${pages} page(s))`);
    // ver は内容から導出しているので、スナップショット側の ?v= が今回のビルドと
    // 食い違う = prerendered/ が古い。古いまま配信すると、クローラとJS無効環境には
    // 前回の内容が、ブラウザには今回の内容が届く (中身が食い違う) 状態になる。
    const snapshot = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const snapVer = (snapshot.match(/styles[.]css[?]v=([a-z0-9]+)/) || [])[1];
    if (snapVer && snapVer !== ver) {
      console.warn(`  ! prerendered/ が古い (snapshot ?v=${snapVer} / build ?v=${ver})`);
      console.warn('    npm run build:full で prerendered/ を再生成してコミットしてください。');
    }
  } else {
    console.log('• prerendered/ absent — serving pure SPA shell');
  }

  // Fallback for articles that have no prerendered snapshot yet.
  //
  // Article URLs are served as real files (the blanket /article-(.*) rewrite was
  // removed because it returned 200 for any made-up slug, i.e. a soft 404).
  // But a freshly published article has no snapshot until the prerender workflow
  // runs and Vercel rebuilds, so it hard-404s for several minutes — and forever
  // if that workflow ever fails. Emit the SPA shell for those, so the article is
  // at least reachable and renders client-side. Only slugs that really exist in
  // BLOG get one, so unknown /article-xxx still 404s as it should.
  let fallbacks = 0;
  for (const slug of Object.keys(articles)) {
    const dir = path.join(DIST, 'article-' + slug);
    if (fs.existsSync(path.join(dir, 'index.html'))) continue;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), SPA_SHELL, 'utf8');
    fallbacks++;
  }
  if (fallbacks) {
    console.log(`• ${fallbacks} article(s) without a prerender snapshot → SPA shell fallback`);
  }

  console.log('\n✓ build complete → dist/');
}

build().catch((e) => {
  console.error('\n✗ build failed:', e.message);
  process.exit(1);
});
