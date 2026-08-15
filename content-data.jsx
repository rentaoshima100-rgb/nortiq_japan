// ============================================================
// content-data.jsx — 薄いページ向けの増強コンテンツ (データ + 共通レンダラー)
//
// 方針 (2026-08 コンテンツ増強プランに基づく):
//  - 実績の主張はしない。「できること / 知っておくべきこと」型に限定する
//  - 法規制は官公庁の一次情報URLを添える (第三者ブログはURL掲載しない)
//  - 相場・統計値は「一般に〜といわれます」の表現で断定を避ける
//  - 補助金は誠実路線: 採択保証不可 / IT導入支援事業者未登録 /
//    インボイス未登録を明記した上で「できること」を書く
// ============================================================

// -------------------- 業種別 (works-* カテゴリページ) --------------------
const INDUSTRY_CONTENT = {
  clinic: {
    intro: "クリニック・歯科のホームページは「地域名+診療科」で今すぐ受診したい方が見に来ます。症状・料金・口コミを確かめる行動が多いため、予約導線の最短化と、医療広告ガイドラインを守った情報設計の両立が制作の中心になります。",
    points: [
      { t: "予約導線を最短に", d: "ファーストビューに電話・Web予約・地図 (経路案内) を常設。Googleビジネスプロフィールからは予約専用ページへ直接リンクさせます。" },
      { t: "MEO (マップ対策)", d: "診療科・診療時間・写真の正確な整備と、検索語・行動数の定期確認。口コミの代行投稿や★評価の依頼は規制対象になり得るため行いません。" },
      { t: "診療科別・症状別ページ", d: "スマホ最優先の設計で、診療科別/症状別ページ・医師紹介・院内写真により来院前の不安を減らします。" },
      { t: "自由診療の適正表示", d: "費用・回数・期間・主なリスクや副作用を明示できるページ構造にします (限定解除要件への対応)。" },
    ],
    laws: {
      title: "医療広告ガイドラインへの対応",
      items: [
        { t: "限定解除要件", d: "ウェブサイト等は、問い合わせ先の明示、自由診療の治療内容・費用・期間・回数の明示、主なリスク・副作用の明示を満たせば広告可能事項の限定を解除できます。" },
        { t: "体験談・ビフォーアフター", d: "治療効果に関する患者の主観的体験談の広告は禁止。ビフォーアフター写真は治療内容・費用・リスク等の説明を付さない掲載が禁止されています。" },
        { t: "表現の制限", d: "診療科名は広告可能な診療科名に限定。最上級表現・No.1表現などは使えません。" },
      ],
      src: { label: "出典: 厚生労働省「医療広告ガイドライン」", url: "https://www.mhlw.go.jp/content/000371812.pdf" },
    },
    faqs: [
      { q: "ビフォーアフター写真は載せられますか?", a: "限定解除要件 (治療内容・費用・主なリスク副作用等の付記) を満たせば掲載できます。付記すべき項目を整理してご案内します。" },
      { q: "患者さんの声 (体験談) は載せられますか?", a: "治療内容・効果に関する主観的な体験談は掲載できません。掲載できる範囲を整理してご提案します。" },
      { q: "Web予約システムは入れられますか?", a: "外部予約システムとの連携や、MEOと組み合わせた予約導線の設計に対応できます。" },
    ],
    columns: ["Web制作", "AI活用"],
    solution: "solution-clinic",
  },
  realty: {
    intro: "不動産サイトは物件情報の見やすさと「査定してほしい」導線が成果を分けます。あわせて、おとり広告の禁止など掲載だけで違反になり得るルールがあり、法令に沿った物件表示の設計が欠かせません。",
    points: [
      { t: "物件データベース連動", d: "自社DB・ポータルとの連携を見据えたデータ設計。スマホでの地図検索・こだわり検索に対応します。" },
      { t: "査定LPの定石", d: "一括査定フォームは入力を最短化し、査定の流れを先に見せることで離脱を減らします。" },
      { t: "エリア特化ページ", d: "「地域名+売却/賃貸」の検索意図に応えるエリアページで、地域密着の強みを見せます。" },
    ],
    laws: {
      title: "宅建業法・表示規約への対応",
      items: [
        { t: "おとり広告の禁止", d: "売る意思のない好条件物件や実在しない物件の掲載は、問い合わせがなくても掲載だけで違反になります (宅建業法32条・表示規約21条)。" },
        { t: "表示ルール", d: "徒歩所要時間 (道路距離80m=1分)・面積・築年数などの表示ルール、取引態様 (売主/代理/媒介) の明示義務に対応した物件テンプレートを設計します。" },
        { t: "広告開始時期の制限", d: "開発許可・建築確認の前の広告はできません。公開フローに確認ステップを組み込みます。" },
      ],
      src: { label: "出典: 国土交通省「宅地建物取引業法の解釈・運用の考え方」", url: "https://www.mlit.go.jp/totikensangyo/const/content/001738457.pdf" },
    },
    faqs: [
      { q: "査定依頼を増やすには?", a: "査定の流れの提示と入力項目の最短化、エリアページからの導線設計が定石です。現状の導線を拝見して具体案をご提案します。" },
      { q: "おとり広告にならない物件表示のルールは?", a: "成約済み物件の速やかな取り下げ、徒歩分数・面積等の表示ルール遵守などを、更新運用まで含めて設計します。" },
      { q: "ポータルと自社サイトの役割分担は?", a: "ポータルは接点の獲得、自社サイトは信頼形成と直接反響が基本の整理です。貴社の商圏に合わせてご提案します。" },
    ],
    columns: ["Web制作", "SEO"],
    solution: "solution-realty",
  },
  build: {
    intro: "建築・工務店・大規模修繕のサイトは、施工事例の見せ方がほぼすべてです。あわせて一般顧客とBtoB (元請・協力会社) の導線を分けること、許可番号などの信頼情報を正しく載せることが問い合わせにつながります。",
    points: [
      { t: "施工事例の見せ方", d: "ビフォーアフター・工期・工法・エリア・費用帯で分類し、写真品質を重視。検討中の方が「自分の場合」を想像できる構成にします。" },
      { t: "不安に応えるコンテンツ", d: "FAQ・保証・アフター対応を明示し、相見積もり中の方の不安を解消します。" },
      { t: "BtoBと一般顧客の導線分離", d: "協力会社募集・元請向けページを分け、それぞれの問い合わせ導線を設計します。" },
    ],
    laws: {
      title: "建設業許可の表示",
      items: [
        { t: "許可票と許可番号", d: "建設業許可業者は店舗・現場への許可票掲示が義務です (建設業法40条)。サイトにも「◯◯県知事許可 (般-◯◯) 第◯◯◯◯号」を正しく表記すると信頼性が高まります。" },
        { t: "番号の正しい読み方", d: "大臣許可/知事許可、般 (一般)/特 (特定)、取得年度・業者番号の意味を踏まえた正確な表記をサポートします。" },
      ],
      src: { label: "参照: 国土交通省 建設業者・宅建業者等企業情報検索システム", url: "https://etsuran.mlit.go.jp/TAKKEN/" },
    },
    faqs: [
      { q: "施工事例はどれくらい載せるべき?", a: "量より分類が重要です。工事種別×費用帯×エリアで絞り込める構造にすると、少数でも効果があります。" },
      { q: "相見積もりのお客様の不安をどう解消?", a: "保証・アフター・工事の流れ・担当者の顔が定番の解消要素です。FAQと合わせて設計します。" },
      { q: "許可番号は載せたほうがいい?", a: "掲載を推奨します。公的データベースと照合できる情報は信頼の裏付けになります。" },
    ],
    columns: ["Web制作", "SEO"],
    solution: "solution-build",
  },
  hr: {
    intro: "採用・人材のサイトは、求人検索エンジンとの連携と、法令に沿った求人情報の的確表示が土台です。その上で「この会社で働く画」が伝わるコンテンツが応募数を左右します。",
    points: [
      { t: "求人検索エンジン連携", d: "Indeed・求人ボックス等への掲載を見据えた1求人1URL設計と、Googleしごと検索向け JobPosting 構造化データに対応します。" },
      { t: "応募が増える求人票", d: "タイトルは「職種+条件+魅力」。抽象表現ではなく数値・事実で書くのが定石です。" },
      { t: "採用サイトの必須要素", d: "社員の声・数字で見る会社・選考フロー・FAQ・募集要項を新卒/中途で分けて設計します。" },
    ],
    laws: {
      title: "職業安定法 (求人情報の的確表示) への対応",
      items: [
        { t: "的確表示義務", d: "虚偽・誤解を生む表示の禁止と、求人情報を正確・最新に保つ義務があります (職業安定法5条の4)。" },
        { t: "明示すべき事項", d: "業務内容・就業場所・賃金等の明示が必要です。固定残業代は基礎となる労働時間数等を示さず基本給に含めて表示してはいけません。" },
      ],
      src: { label: "出典: 厚生労働省 (求人等に関する情報の的確な表示)", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/haken-shoukai/r0604anteisokukaisei1_00006.html" },
    },
    faqs: [
      { q: "Indeed に無料で掲載できますか?", a: "無料掲載の仕組みがあります (有料はスポンサー求人)。掲載要件に沿った求人ページの構造で制作します。" },
      { q: "応募が増える求人票の書き方は?", a: "「アットホーム」のような抽象表現ではなく、業務内容・給与・働き方を数値と事実で書くことです。原稿の添削にも対応します。" },
      { q: "採用サイトと求人媒体の使い分けは?", a: "媒体は接点の獲得、採用サイトは志望度の向上が役割です。媒体から採用サイトへ誘導する導線を設計します。" },
    ],
    columns: ["Web制作", "マーケティング"],
    solution: "solution-hr",
  },
  retail: {
    intro: "小売・ECは「どのカートで始めるか」と「法令表示」で失敗しないことが第一歩です。事業規模と目的に合わせたプラットフォーム選定から、特定商取引法の表示、越境対応までを一貫して設計します。",
    points: [
      { t: "カートの使い分け", d: "固定費を抑えて始めるなら BASE / STORES、拡張性・越境なら Shopify、国内向け・自由度なら カラーミーショップ、という整理が一般的です。総コストと将来の販路で選定します。" },
      { t: "最終確認画面の設計", d: "注文内容を確認・訂正できる画面と、定期購入の誤認防止 (特商法12条の6) に対応した購入フローを設計します。" },
      { t: "越境EC", d: "多通貨決済・海外配送・現地の表示ルールへの対応を、プラットフォームの越境機能を使って設計できます。" },
    ],
    laws: {
      title: "特定商取引法 (通信販売) への対応",
      items: [
        { t: "表示義務", d: "事業者名・住所・電話番号、販売価格 (送料含む)、支払時期・方法、引渡時期、返品特約などの表示が必要です (特商法11条)。" },
        { t: "最終確認画面", d: "分量・価格・解約方法などを最終確認画面で明確に表示することが求められます (特商法12条の6)。" },
      ],
      src: { label: "出典: 消費者庁 特定商取引法ガイド (通信販売)", url: "https://www.no-trouble.caa.go.jp/what/mailorder/" },
    },
    faqs: [
      { q: "BASE と Shopify、どちらがいいですか?", a: "まず小さく試すなら固定費のない BASE、事業として育てるなら Shopify が一般的な整理です。商材と成長計画を伺って選定します。" },
      { q: "特商法表記には何を書けばいいですか?", a: "事業者情報・価格・支払/引渡・返品特約などの必須項目を、消費者庁ガイドに沿って整備します。" },
      { q: "越境ECに対応できますか?", a: "対応できます。多言語・多通貨・海外配送の要件を整理し、プラットフォームの機能選定からご一緒します。" },
    ],
    columns: ["Web制作", "マーケティング"],
    solution: "solution-retail",
  },
  infra: {
    intro: "インフラ・製造などBtoB企業のサイトは、派手さより「信頼の裏付け」と「問い合わせのしやすさ」です。技術・実績・体制を整理して見せ、堅牢で速いサイトに仕上げることが営業資産になります。",
    points: [
      { t: "信頼性の担保", d: "代表・有資格者の顔と経歴、会社情報、対応領域、料金の透明性、アクセスを整理して掲載します。" },
      { t: "問い合わせ導線の複線化", d: "電話・フォーム・オンライン相談予約など、相手が選べる導線を設計します。" },
      { t: "専門コラムで権威性", d: "技術解説の発信は指名検索と信頼につながります。更新しやすい仕組みまで含めて設計します。" },
    ],
    faqs: [
      { q: "問い合わせが増える構成は?", a: "課題→解決アプローチ→技術・体制→問い合わせ、の順で判断材料を揃える構成が定石です。" },
      { q: "料金は載せるべきですか?", a: "目安レンジだけでも載せることを推奨します。問い合わせの質が上がる傾向があるといわれます。" },
      { q: "信頼性を高める要素は?", a: "許認可・資格・体制図・品質管理の取り組みなど、裏付けのある情報の整理が効果的です。" },
    ],
    columns: ["Web制作", "技術"],
  },
  ai: {
    intro: "AIスタートアップ・IT企業のサイトは、プロダクト価値を「課題→解決→効果」で明快に言語化できているかが勝負です。私たち自身が Next.js / React / TypeScript / Supabase / Vercel で開発する会社なので、技術の見せ方を内側から設計できます。",
    points: [
      { t: "価値の言語化", d: "課題→解決→効果の順で、非技術者の決裁者にも伝わるメッセージを設計します。" },
      { t: "CVポイントの設計", d: "資料DL・デモ予約・ホワイトペーパーなど、検討段階に合わせた複数のCVを配置します。" },
      { t: "モダンで高速なフロント", d: "Next.js 等による高速なサイトは、それ自体が技術力の証明になります。" },
    ],
    faqs: [
      { q: "技術スタックの指定はできますか?", a: "Next.js / React / TypeScript / Supabase / Vercel を軸に、要件に合わせて選定します。" },
      { q: "採用も強化したいのですが?", a: "プロダクトサイトと採用コンテンツの両立構成に対応します。エンジニア向けには技術発信の仕組みも有効です。" },
      { q: "デモ予約の導線は作れますか?", a: "カレンダー連携やフォーム設計を含めて対応できます。" },
    ],
    columns: ["AI活用", "技術"],
  },
};

// -------------------- LP・動画 (works-lp-* / works-video) --------------------
const LP_KNOWHOW = {
  structure: {
    title: "成果が出るLPの標準構成",
    sub: "STANDARD STRUCTURE",
    items: [
      { t: "① ファーストビュー", d: "キャッチ+ベネフィット+CTA。3秒で「自分向けだ」と分かることが最重要です。" },
      { t: "② 課題提起・共感", d: "読み手の悩みを言語化し「これは自分の話だ」と思ってもらいます。" },
      { t: "③ 解決策・提供価値", d: "サービスがどう解決するかを具体的に示します。" },
      { t: "④ 選ばれる理由", d: "差別化ポイントを裏付けとともに提示します。" },
      { t: "⑤ 料金・導入の流れ", d: "判断に必要な情報を隠さず、自然な順序で提示します。" },
      { t: "⑥ FAQ → クロージング", d: "残る不安を解消し、フォームへ。盛り込みすぎず「整理」することがCVR向上の鍵です。" },
    ],
  },
  cvr: {
    title: "CVR改善の定番施策",
    sub: "CONVERSION RATE OPTIMIZATION",
    items: [
      { t: "ファーストビュー最適化", d: "流入元の広告・検索語と訴求を一致させます。" },
      { t: "CTA改善", d: "文言・色・配置を1要素ずつA/Bテストで検証します。" },
      { t: "フォーム改善 (EFO)", d: "入力項目の削減が最も効果が大きいといわれます。エラーのリアルタイム表示・住所自動入力なども定番です。" },
      { t: "速度改善", d: "表示速度は離脱率に直結します。一般にECのCVRは1〜3%程度といわれ、小さな改善の積み重ねが効きます。" },
    ],
  },
};
const VIDEO_KNOWHOW = {
  title: "動画活用の定石",
  sub: "VIDEO KNOW-HOW",
  items: [
    { t: "ユーザー主体の再生", d: "自動再生は広告と受け取られ離脱を招くため非推奨です。LP用は16〜30秒程度、動画の近くにCTAを置きます。" },
    { t: "縦型ショート+字幕", d: "30秒〜1分の縦型・字幕付きが近年の標準です。SNSで認知を取り、サイトや長尺動画へ誘導します。" },
    { t: "採用動画の定番3型", d: "社員インタビュー / 職場紹介 / 経営メッセージを軸にシリーズ化するのが定番です。企画から公開まで一般に1〜3か月が目安といわれます。" },
    { t: "効果の考え方", d: "動画の埋め込みは滞在時間の伸長とCVR向上が期待できるといわれます (効果は題材・品質に依存します)。" },
  ],
};

// -------------------- 補助金 (/subsidy) 2026年8月時点 --------------------
const SUBSIDY_CONTENT = {
  honest: {
    title: "先にお伝えする、正直な前提",
    items: [
      "採択を保証することはできません (どの制作会社でも同じです)",
      "当社は IT導入支援事業者に未登録のため、「デジタル化・AI導入補助金」(旧IT導入補助金) を使った申請支援・ツール提供は現状できません",
      "当社は適格請求書発行事業者 (インボイス) 未登録です。貴社の仕入税額控除に関わるため、事前にご確認ください",
      "補助率・上限・スケジュールは公募回ごとに変わります。以下は2026年8月時点の情報で、申請時は必ず公式の公募要領をご確認ください",
    ],
  },
  schemes: {
    title: "主な制度と「ホームページ制作」の関係",
    sub: "SUBSIDY SCHEMES · 2026",
    rows: [
      ["デジタル化・AI導入補助金 2026 (旧IT導入補助金)", "原則対象外", "単純なHP制作は対象外。対象は事務局登録のITツール (予約・在庫・会計等)。申請にはIT導入支援事業者の関与が必要 (当社は未登録)。"],
      ["小規模事業者持続化補助金", "使われやすい", "補助率2/3・通常枠上限50万円 (特例で上限加算あり)。ウェブサイト関連費には公募回により上限等の制約があるため、最新の公募要領で要確認。GビズIDが必要。"],
      ["中小企業省力化投資補助金", "システム開発向け", "省力化設備・システムの導入が主目的。単純なコーポレートサイト制作は対象になりにくい制度です。"],
      ["京都市 デジタル化推進プロジェクト", "京都の事業者向け", "IT専門家派遣 (無料) + 導入費用補助のセット。事前相談が必須で、受付期間・件数に限りがあります。"],
    ],
    src: { label: "参照: 京都市 (デジタル化推進プロジェクト)", url: "https://www.city.kyoto.lg.jp/sankan/page/0000349674.html" },
  },
  check: {
    title: "対象になるか、3つの質問",
    sub: "QUICK CHECK",
    items: [
      { t: "Q1. 導入するものは?", d: "「登録ITツール/業務システム」なら補助金の可能性あり。「単なるHP制作」なら持続化補助金など限られた選択肢になります。" },
      { t: "Q2. 事業計画はあるか?", d: "販路開拓・業務効率化という補助金の目的に沿う計画が必要です。計画の言語化からお手伝いできます。" },
      { t: "Q3. 事業規模の要件は?", d: "小規模事業者/中小企業の従業員数要件を満たすかを確認します。" },
    ],
  },
  flow: {
    title: "申請から交付までの一般的な流れ",
    sub: "GENERAL SCHEDULE",
    items: [
      { n: "01", t: "GビズID取得・公募要領確認", d: "IDの取得に時間がかかるため最初に着手します。" },
      { n: "02", t: "事業計画の作成・申請", d: "見積書などの必要書類は当社で対応できます。" },
      { n: "03", t: "採択 → 交付決定", d: "発注・着手は交付決定後が原則です (先に契約すると対象外になり得ます)。" },
      { n: "04", t: "実施 → 実績報告 → 交付", d: "実績報告用の書類対応も当社でサポートできます。" },
    ],
  },
  can: {
    title: "当社が「できること」",
    items: [
      "持続化補助金などの申請に必要な見積書・仕様書類の作成対応",
      "実績報告に必要な納品書類・スクリーンショット等の整備",
      "京都市デジタル化推進プロジェクトなど地域制度の情報提供",
      "補助金の目的 (販路開拓・効率化) に沿った事業計画の言語化サポート",
    ],
  },
};

// -------------------- リード獲得 (/guidebook /diagnosis) --------------------
const GUIDEBOOK_CONTENT = {
  who: {
    title: "こんな方におすすめです",
    sub: "FOR WHOM",
    items: [
      { t: "初めてWeb制作を発注する", d: "進め方・費用・失敗パターンを最初に把握できます。" },
      { t: "リニューアルを検討中", d: "既存サイトの何が課題かを整理する観点が得られます。" },
      { t: "社内稟議の材料が欲しい", d: "料金プランと制作の流れをそのまま比較資料に使えます。" },
    ],
  },
  after: {
    title: "ダウンロード後の流れ",
    sub: "AFTER DOWNLOAD",
    items: [
      { n: "01", t: "メールで資料が届く", d: "入力いただいたアドレスにPDFをお送りします。" },
      { n: "02", t: "しつこい営業はしません", d: "こちらから架電営業を行うことはありません。ご質問があればいつでもご連絡ください。" },
      { n: "03", t: "無料相談 (任意)", d: "ご希望の場合のみ、30〜60分のオンライン相談を承ります。" },
    ],
  },
  faqs: [
    { q: "営業電話は来ますか?", a: "来ません。資料DLを理由にこちらから架電することはありません。" },
    { q: "費用はかかりますか?", a: "資料・相談とも無料です。" },
    { q: "どんな内容ですか?", a: "制作の進め方・実績・料金プラン・制作の流れを全11ページにまとめています。" },
  ],
};
const DIAGNOSIS_CONTENT = {
  categories: {
    title: "診断でチェックする6カテゴリ",
    sub: "CHECK CATEGORIES",
    items: [
      { t: "SEO・技術基盤", d: "HTTPS化・sitemap・title/meta・見出し構造・内部リンク・構造化データ・インデックス状況" },
      { t: "表示速度", d: "Core Web Vitals・画像最適化・応答速度" },
      { t: "モバイル対応", d: "レスポンシブ・文字サイズ・タップ領域" },
      { t: "セキュリティ", d: "SSL証明書・CMS/プラグインの脆弱性・改ざんチェック" },
      { t: "ユーザビリティ", d: "リンク切れ・ナビゲーション・コントラスト・フォームの使い勝手" },
      { t: "計測", d: "GA4 / Search Console の設置・コンバージョン計測の有無" },
    ],
  },
};

// -------------------- 機能サービス (/feature-*) --------------------
const FEATURE_CONTENT = {
  'feature-analytics': [
    { type: 'cards', title: "標準で含まれる作業", sub: "STANDARD SCOPE", items: [
      { t: "GA4 導入設計", d: "プロパティ設定・拡張計測・自社IP除外まで、計測の土台を正しく作ります。" },
      { t: "GTM イベント計測", d: "クリック・フォーム送信・スクロール等を、click_cta / submit_form のような統一命名規則で実装します。" },
      { t: "キーイベント設定", d: "問い合わせ・資料DLなど成果地点を定義し、Search Console とも連携します。" },
      { t: "月次レポート", d: "流入元・ページ別・CV・前月比を Looker Studio 等のダッシュボードで可視化します。" },
    ]},
    { type: 'faq', title: "よくある質問", items: [
      { q: "GA4は入っているが使いこなせていません", a: "設定の棚卸しから対応します。「見たい数字」から逆算してイベントとレポートを再設計します。" },
      { q: "レポートはどんな形式ですか?", a: "ダッシュボード+月次の解説が基本です。会議にそのまま使える形で納品します。" },
      { q: "広告の計測も対応できますか?", a: "リスティング等の流入・CV計測の設計に対応できます。" },
    ]},
  ],
  'feature-lpo': [
    { type: 'cards', title: "LPOの標準プロセス", sub: "STANDARD PROCESS", items: [
      { t: "現状把握", d: "GA4とヒートマップでクリック位置・スクロール深度・離脱箇所を可視化します。" },
      { t: "仮説とKPI定義", d: "CVR・CTAクリック率・フォーム到達率/完了率を定義します。" },
      { t: "A/Bテスト", d: "見出し・画像・CTAを1要素ずつ検証します。" },
      { t: "EFO (フォーム改善)", d: "入力項目の削減が最も効果が大きいといわれます。一般にフォーム・カートの離脱率は約7割ともいわれ、改善余地の大きい領域です。" },
    ]},
    { type: 'faq', title: "よくある質問", items: [
      { q: "どれくらいで効果が出ますか?", a: "流入量に依存します。テストに必要な訪問数から逆算して現実的な計画を立てます。" },
      { q: "LPが1枚しかなくても頼めますか?", a: "1枚からで問題ありません。まず計測を入れ、改善候補の優先順位をつけます。" },
      { q: "デザインごと作り直すべき?", a: "データを見てから判断します。部分改善で足りるケースも多くあります。" },
    ]},
  ],
  'feature-recruit': [
    { type: 'cards', title: "採用サイトの必須コンテンツ", sub: "MUST-HAVE CONTENTS", items: [
      { t: "社員インタビュー", d: "候補者が最も読むコンテンツ。読了・離脱をヒートマップで分析し改善します。" },
      { t: "数字で見る会社", d: "平均年齢・残業・有給取得率など、事実の数字は抽象的な言葉より伝わります。" },
      { t: "選考フロー・FAQ", d: "応募前の不安を解消し、応募のハードルを下げます。" },
      { t: "求人検索エンジン対応", d: "1求人1URL設計と JobPosting 構造化データで、Indeed・Googleしごと検索からの流入を作ります。" },
    ]},
    { type: 'faq', title: "よくある質問", items: [
      { q: "新卒と中途、分けるべきですか?", a: "訴求が違うため分けることを推奨します。共通部分は活かして効率的に制作します。" },
      { q: "求人票の書き方も見てもらえますか?", a: "的確表示 (職業安定法) の観点も含めて添削・整備に対応します。" },
      { q: "動画は必要ですか?", a: "社員インタビュー・職場紹介の動画は効果的といわれます。まず写真中心で始めて段階的に足す進め方もできます。" },
    ]},
  ],
  'feature-cms': [
    { type: 'cards', title: "CMS選定の比較観点", sub: "HOW WE CHOOSE", items: [
      { t: "WordPress", d: "情報が豊富で柔軟。一方でプラグインの脆弱性対応・更新運用を誰が担うかを最初に決める必要があります。" },
      { t: "ヘッドレスCMS + Next.js", d: "管理画面とフロントを分離し、高速・堅牢・マルチチャネル対応。セキュリティと速度を重視する場合の主力構成です。" },
      { t: "静的サイト生成 (SSG)", d: "高速・堅牢・低コスト。更新頻度が低いサイトに適します。" },
      { t: "選定の軸", d: "更新性・セキュリティ・表示速度・コスト・拡張性・運用負荷の6軸で、担当者の実情に合わせて選びます。" },
    ]},
    { type: 'faq', title: "よくある質問", items: [
      { q: "WordPressのままで大丈夫?", a: "運用体制次第です。更新・バックアップ・脆弱性対応の担い手が決まっていれば問題ありません。保守も含めてご提案できます。" },
      { q: "更新は自社でできますか?", a: "できるように作ります。画像付きの操作マニュアルもお渡しします。" },
      { q: "移行時にSEOは落ちませんか?", a: "URL設計と301リダイレクトを正しく行えばリスクは抑えられます。移行計画から対応します。" },
    ]},
  ],
};

// -------------------- 業種別ソリューション (/solution-*) --------------------
const SOLUTION_CONTENT = {
  'solution-clinic': { pack: ["サイト制作", "Web予約連携", "MEO (ビジネスプロフィール整備)", "医療広告ガイドライン準拠チェック", "(任意) SNS・口コミ運用"], weeks: "標準的な構成で1〜2か月が目安 (要件により変動)" },
  'solution-realty': { pack: ["サイト制作", "物件DB・ポータル連携", "査定LP", "宅建業法の広告チェック", "MEO"], weeks: "システム連動を含む場合2〜3か月以上が目安" },
  'solution-build': { pack: ["サイト制作", "施工事例データベース", "問い合わせ・資料請求導線", "建設業許可番号の表記", "(任意) 採用・協力会社募集"], weeks: "標準的な構成で1〜2か月が目安" },
  'solution-hr': { pack: ["採用サイト制作", "求人媒体 (Indeed/求人ボックス) 連携", "JobPosting 構造化データ", "職業安定法の準拠チェック"], weeks: "標準的な構成で1〜2か月が目安" },
  'solution-retail': { pack: ["ECカート構築 (BASE / Shopify / カラーミー)", "特商法表記の整備", "GA4 計測", "(任意) SNS・広告運用"], weeks: "EC構築は2〜3か月以上が目安" },
};

// -------------------- サポート / 料金 / 採用 --------------------
const SUPPORT_CONTENT = [
  { type: 'cards', title: "保守の標準対応範囲", sub: "MAINTENANCE SCOPE", items: [
    { t: "更新代行", d: "テキスト・画像差し替え、バナー、お知らせの更新。既存素材の差し替えは保守内、新規制作・大幅改修は別お見積もりが一般的な線引きです。" },
    { t: "バックアップと復旧", d: "定期バックアップと、障害時の復旧対応。" },
    { t: "セキュリティ更新", d: "CMS・プラグインの更新、SSL・ドメイン・サーバーの期限管理、稼働監視。" },
    { t: "互換確認", d: "主要ブラウザ・端末での表示確認。" },
  ]},
  { type: 'cards', title: "SLA (サービスレベル) の定番項目", sub: "SLA ITEMS", items: [
    { t: "受付窓口と対応時間", d: "メール・チャット等の窓口と対応時間帯を契約時に明示します。" },
    { t: "一次回答の目安", d: "当社は営業日24時間以内の一次返信を約束しています。" },
    { t: "対応範囲の線引き", d: "保守内でできること/別見積もりになることを事前に一覧化します。" },
  ]},
  { type: 'faq', title: "よくある質問", items: [
    { q: "レポートには何が載りますか?", a: "流入数・流入元・人気ページ・CV数と前月比・検索クエリ・改善提案が基本構成です。" },
    { q: "月次MTGでは何を話しますか?", a: "前月実績→課題→次月施策→スケジュール確認、の流れが標準アジェンダです。" },
    { q: "保守費の相場は?", a: "一般に小規模サイトで月数千円〜1万円、中小企業サイトで月1〜5万円程度といわれます。範囲と頻度で変わるため、実態に合わせてお見積もりします。" },
  ]},
];
const PRICING_EXTRA = [
  { type: 'faq', title: "契約・支払いについて", items: [
    { q: "支払い方法は?", a: "銀行振込に対応しています。なお当社は適格請求書発行事業者 (インボイス) 未登録です。貴社の仕入税額控除に関わる場合は事前にご確認ください。" },
    { q: "追加費用が発生するのはどんな時?", a: "新規ページの制作・大幅なデザイン変更・素材の新規制作などです。見積もり時に線引きを明示します。" },
    { q: "契約期間と解約条件は?", a: "保守は月次契約・解約は1か月前通知が基本です。制作のみのご依頼も承ります。" },
    { q: "納品物の権利はどうなりますか?", a: "納品後のサイト一式は原則お客様に帰属します。使用素材のライセンスも納品時に整理してお渡しします。" },
  ]},
];
const RECRUIT_EXTRA = [
  { type: 'steps', title: "選考フロー", sub: "SELECTION PROCESS", items: [
    { n: "01", t: "応募 / カジュアル面談", d: "まず話を聞きたい、でも歓迎です。" },
    { n: "02", t: "書類選考", d: "経歴とあわせて、作ったもの (GitHub・ポートフォリオ) を重視します。" },
    { n: "03", t: "面接 1〜2回", d: "職種により小さな課題をお願いする場合があります。" },
    { n: "04", t: "内定", d: "条件面を明示してオファーします。" },
  ]},
  { type: 'faq', title: "働き方 FAQ", items: [
    { q: "リモート・副業は可能ですか?", a: "京都オフィス+フルリモート可の体制です。副業は業務に支障のない範囲で相談可能です。" },
    { q: "未経験でも応募できますか?", a: "職種によります。インターンは学生・未経験の応募を受け付けています。" },
    { q: "使用技術は?", a: "Next.js / React / TypeScript / Supabase / Vercel を中心に、iPad業務アプリ (Swift)・LINE連携・ML実装 (PyTorch) まで扱います。" },
    { q: "選考期間はどれくらい?", a: "応募から2〜3週間を目安にしています。" },
  ]},
];

// ============================================================
// 共通レンダラー
// ============================================================
function CDCards({ title, sub, items }) {
  return (
    <section className="section-pad-sm">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 40 }}>
          <h2 className="section-title fadein" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>{title}</h2>
          {sub && <p className="section-sub fadein">{sub}</p>}
        </div>
        <div className="support-grid">
          {items.map((it, i) => (
            <div key={i} className="support-card fadein" data-delay={i * 100}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 10 }}>{it.t}</h3>
              <p className="body" style={{ fontSize: 13, margin: 0 }}>{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function CDSteps({ title, sub, items }) {
  return (
    <section className="section-pad-sm">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 40 }}>
          <h2 className="section-title fadein" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>{title}</h2>
          {sub && <p className="section-sub fadein">{sub}</p>}
        </div>
        <div className="support-grid">
          {items.map((it, i) => (
            <div key={i} className="support-card fadein" data-delay={i * 100}>
              <div className="step-num" style={{ marginBottom: 12 }}>STEP / {it.n}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 8 }}>{it.t}</h3>
              <p className="body" style={{ fontSize: 13, margin: 0 }}>{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function CDFaq({ title, items }) {
  return (
    <section className="section-pad-sm">
      <div className="container" style={{ maxWidth: 860 }}>
        <div className="section-head" style={{ marginBottom: 36 }}>
          <h2 className="section-title fadein" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>{title}</h2>
          <p className="section-sub fadein">FAQ</p>
        </div>
        <FAQ items={items}/>
      </div>
    </section>
  );
}
// 法規制ブロック: 官公庁一次情報へのリンク付き
function CDLaws({ data }) {
  if (!data) return null;
  return (
    <section className="section-pad-sm" style={{ background: 'var(--bg-2)' }}>
      <div className="container" style={{ maxWidth: 860 }}>
        <div className="section-head" style={{ marginBottom: 32 }}>
          <h2 className="section-title fadein" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>{data.title}</h2>
          <p className="section-sub fadein">COMPLIANCE</p>
          <p className="lede fadein" style={{ margin: '18px auto 0', fontSize: 14 }}>
            守るべきルールを知った上で作ることが、公開後のリスクを減らします。当社は法令・ガイドラインに沿った設計に対応します。
          </p>
        </div>
        <div>
          {data.items.map((it, i) => (
            <div key={i} className="fadein" data-delay={i * 100} style={{ display: 'flex', gap: 16, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
              <span className="step-num" style={{ flex: 'none', paddingTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 6 }}>{it.t}</h3>
                <p className="body" style={{ fontSize: 13, margin: 0 }}>{it.d}</p>
              </div>
            </div>
          ))}
        </div>
        {data.src && (
          <p className="small" style={{ marginTop: 20, color: 'var(--text-3)' }}>
            <a href={data.src.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)', textDecoration: 'underline' }}>{data.src.label}</a>
            {' '}· 掲載内容の最終確認は最新の一次情報をご参照ください
          </p>
        )}
      </div>
    </section>
  );
}
// カテゴリ一致コラムの自動挿入 (QW-1)
function RelatedColumns({ cats, onNavigate }) {
  const store = (typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {};
  const arts = Object.values(store).filter((a) => cats.includes(a.category)).slice(0, 3);
  if (!arts.length) return null;
  return (
    <section className="section-pad-sm">
      <div className="container">
        <div className="row" style={{ marginBottom: 28, justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h3 className="display-s">関連する読み物</h3>
            <p className="section-sub" style={{ marginTop: 4 }}>RELATED COLUMNS</p>
          </div>
          <Button variant="ghost" onClick={() => onNavigate('column')}>コラム一覧<Icon name="arrow-right" size={14}/></Button>
        </div>
        <div className="grid-3" style={{ gap: 32 }}>
          {arts.map((a) => (
            <a key={a.slug} className="article-card" style={{ cursor: 'pointer' }} {...navProps('article-' + a.slug, onNavigate)}>
              <ArticleCover article={a}/>
              <div className="article-meta">
                <span style={{ color: 'var(--accent)' }}>{a.category}</span>
                <span className="article-meta-sep">·</span>
                <span>{a.updated || a.date}</span>
              </div>
              <h3 className="article-title">{a.title}</h3>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
// 業種ページ一式 (works-<category> 用)
function IndustrySections({ category, onNavigate }) {
  const c = INDUSTRY_CONTENT[category];
  if (!c) return null;
  return (
    <React.Fragment>
      <section className="section-pad-sm" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <p className="lede fadein" style={{ margin: '0 auto', textAlign: 'center' }}>{c.intro}</p>
        </div>
      </section>
      <CDCards title="この業種の制作ポイント" sub="INDUSTRY POINTS" items={c.points}/>
      <CDLaws data={c.laws}/>
      <CDFaq title="よくある質問" items={c.faqs}/>
      {c.solution && (
        <section className="section-pad-sm" style={{ paddingTop: 0 }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <Button variant="primary" onClick={() => onNavigate(c.solution)}>この業種の集客パッケージを見る<Icon name="arrow-right" size={14}/></Button>
          </div>
        </section>
      )}
      <RelatedColumns cats={c.columns} onNavigate={onNavigate}/>
    </React.Fragment>
  );
}
// 汎用: FEATURE_CONTENT / SUPPORT_CONTENT 等の descriptor 配列を描画
function ExtraContent({ blocks, onNavigate }) {
  if (!blocks) return null;
  return (
    <React.Fragment>
      {blocks.map((b, i) => {
        if (b.type === 'cards') return <CDCards key={i} title={b.title} sub={b.sub} items={b.items}/>;
        if (b.type === 'steps') return <CDSteps key={i} title={b.title} sub={b.sub} items={b.items}/>;
        if (b.type === 'faq') return <CDFaq key={i} title={b.title} items={b.items}/>;
        return null;
      })}
    </React.Fragment>
  );
}
// ソリューションページ: パッケージ内容 + 期間目安
function SolutionExtra({ pageId, onNavigate }) {
  const s = SOLUTION_CONTENT[pageId];
  if (!s) return null;
  return (
    <section className="section-pad-sm">
      <div className="container" style={{ maxWidth: 860 }}>
        <div className="section-head" style={{ marginBottom: 32 }}>
          <h2 className="section-title fadein" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>パッケージに含まれるもの</h2>
          <p className="section-sub fadein">WHAT'S INCLUDED</p>
        </div>
        <div className="fadein">
          {s.pack.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: 14.5 }}>{p}</span>
            </div>
          ))}
        </div>
        <p className="small" style={{ marginTop: 18, color: 'var(--text-3)' }}>導入期間: {s.weeks}</p>
      </div>
    </section>
  );
}
// 補助金ページ一式
function SubsidySections({ onNavigate, onContact }) {
  const S = SUBSIDY_CONTENT;
  return (
    <React.Fragment>
      <section className="section-pad-sm" style={{ background: 'var(--bg-2)' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="section-head" style={{ marginBottom: 28 }}>
            <h2 className="section-title fadein" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>{S.honest.title}</h2>
            <p className="section-sub fadein">HONEST NOTES</p>
          </div>
          <div className="fadein">
            {S.honest.items.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, flex: 'none' }}>{String(i + 1).padStart(2, '0')}</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section-pad-sm">
        <div className="container">
          <div className="section-head" style={{ marginBottom: 36 }}>
            <h2 className="section-title fadein" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>{S.schemes.title}</h2>
            <p className="section-sub fadein">{S.schemes.sub}</p>
          </div>
          <div className="tablewrap fadein" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table className="cd-table">
              <thead><tr><th>制度</th><th>HP制作との関係</th><th>ポイント</th></tr></thead>
              <tbody>
                {S.schemes.rows.map((r, i) => (
                  <tr key={i}><td style={{ fontWeight: 700 }}>{r[0]}</td><td style={{ whiteSpace: 'nowrap' }}>{r[1]}</td><td>{r[2]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small" style={{ marginTop: 14, color: 'var(--text-3)' }}>
            <a href={S.schemes.src.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-3)', textDecoration: 'underline' }}>{S.schemes.src.label}</a>
            {' '}· 2026年8月時点。申請時は必ず最新の公募要領をご確認ください
          </p>
        </div>
      </section>
      <CDCards title={S.check.title} sub={S.check.sub} items={S.check.items}/>
      <CDSteps title={S.flow.title} sub={S.flow.sub} items={S.flow.items}/>
      <section className="section-pad-sm" style={{ background: 'var(--bg-2)' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="section-head" style={{ marginBottom: 28 }}>
            <h2 className="section-title fadein" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>{S.can.title}</h2>
            <p className="section-sub fadein">WHAT WE CAN DO</p>
          </div>
          <div className="fadein">
            {S.can.items.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '12px 0', borderTop: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </React.Fragment>
  );
}

// ============================================================
// Showcase viewer — 実績サイトをページ遷移なしでサイト内モーダル表示
// 閉じている間は null を返し DOM に何も出さない (プリレンダー済みHTMLを変えない)。
// 開く側は openShowcase(url, title) を呼ぶだけ。
// ============================================================
function openShowcase(url, title) {
  window.dispatchEvent(new CustomEvent('nq:showcase', { detail: { url, title } }));
}
// 実績サイトはデスクトップ幅 (1280〜1440px) で設計されている。モーダルの実寸を
// そのまま iframe に与えると、狭いノートPCでは横あふれして「つぶれた」見た目になる。
// 常に DESIGN_W で描画し、CSS transform で縮小して収める (端末プレビュー方式)。
const SHOWCASE_DESIGN_W = 1440;
// PC/タブレットでは縮小しすぎると読めないので下限を設ける (下回る分は横スクロール)。
// スマホでは逆に「全体が入る」ほうが価値があるため下限を外して完全に収める。
const SHOWCASE_MIN_SCALE = 0.45;
const SHOWCASE_NARROW = 760;
function ShowcaseViewer() {
  const [view, setView] = React.useState(null); // { url, title }
  const stageRef = React.useRef(null);
  const [fit, setFit] = React.useState({ scale: 1, h: 900 });

  React.useEffect(() => {
    const onOpen = (e) => setView(e.detail);
    const onKey = (e) => { if (e.key === 'Escape') setView(null); };
    window.addEventListener('nq:showcase', onOpen);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('nq:showcase', onOpen); window.removeEventListener('keydown', onKey); };
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = view ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [view]);

  React.useEffect(() => {
    if (!view) return;
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const raw = Math.min(1, r.width / SHOWCASE_DESIGN_W);
      const scale = r.width < SHOWCASE_NARROW ? raw : Math.max(SHOWCASE_MIN_SCALE, raw);
      setFit({ scale, h: r.height / scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  if (!view) return null;
  return (
    <div className="showcase-overlay" onClick={() => setView(null)} role="dialog" aria-modal="true" aria-label={`制作実績プレビュー: ${view.title || ''}`}>
      <div className="showcase-frame" onClick={(e) => e.stopPropagation()}>
        <div className="showcase-bar">
          <span className="showcase-dots" aria-hidden="true"></span>
          <span className="showcase-url">{view.title || view.url}</span>
          <a className="showcase-open" href={view.url} target="_blank" rel="noopener noreferrer">別タブで開く</a>
          <button className="showcase-close" onClick={() => setView(null)} aria-label="閉じる">×</button>
        </div>
        <div className="showcase-stage" ref={stageRef}>
          <iframe
            className="showcase-iframe"
            src={view.url}
            title={view.title || '制作実績プレビュー'}
            style={{
              width: SHOWCASE_DESIGN_W + 'px',
              height: Math.round(fit.h) + 'px',
              transform: `scale(${fit.scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  openShowcase, ShowcaseViewer,
  INDUSTRY_CONTENT, LP_KNOWHOW, VIDEO_KNOWHOW, SUBSIDY_CONTENT, GUIDEBOOK_CONTENT,
  DIAGNOSIS_CONTENT, FEATURE_CONTENT, SOLUTION_CONTENT, SUPPORT_CONTENT, PRICING_EXTRA, RECRUIT_EXTRA,
  CDCards, CDSteps, CDFaq, CDLaws, RelatedColumns, IndustrySections, ExtraContent, SolutionExtra, SubsidySections,
});
