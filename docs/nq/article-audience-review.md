# 記事の audience（対象読者）の一括付与と目視（2026-09-21）

- 付けた人: 担当 A（エージェント）。Jev の Choice で 106本に付け、そのうち 47本を本文で確かめた
- 日付: 2026-09-21
- 取り決め: `docs/nq/decisions-2026-09-21.md` 3章（既存記事は Jev の Choice で一括付与し、確信度 0.6 未満と無作為 20本を目視。空なら「発注側向け」で仮置き）
- 書いた先: `data/catalog-articles.json` の `overrides[slug]`（`audience` / `audience_confidence` / `_reviewed`）。BLOG 配列・`content/blog/*.md` は1文字も変えていない
- 目視の判断基準: 発注側向け＝事業者が外注・費用・進め方・導入を判断するために読む記事。制作側・技術者向け＝実装方法・技術の仕組み・ツール比較を「作る側の視点」で書いた記事。求職者向け＝働く・採用に関する読者向け。**迷えば発注側向け**（制作側と誤ると事業者から提案カードが消えるが、逆は技術者にカードが1枚出るだけ）
- 評価セットのラベル（`eval/sessions.json`）と `eval/results/` は、判定を決めたあとで「人のラベルと矛盾しないか」を確かめるためにだけ見た（5章）

## 1. 実行の記録

| 項目 | 値 |
|---|---|
| コマンド | `node eval/tag-articles.js --dry-run` → `node eval/tag-articles.js`（`--only-missing` 既定。全 106本が未設定だった） |
| 質問 | Choice 1問。文と選択肢は `data/nq-labels.json` の `article_audience`。state は title・desc・本文の冒頭 約800字 |
| model | jev-1.13.0 |
| 結果 | 106本に付けた。失敗 0。5.4秒 |
| 原価 | 入力 153,233 トークン（実測 106本）≈ $0.0064（dry-run の概算は 109,290 トークン ≈ $0.0046。実測が概算より 4割多いのは、日本語の字数→トークンの係数 0.79 が本文の冒頭では小さめだったため） |
| 確信度 0.6 未満（`_review: true`） | 12本 |

## 2. 分布（3ラベルの件数）

| ラベル | Jev の結果 | 目視後（確定） |
|---|---|---|
| 発注側向け | 85 | **94** |
| 制作側・技術者向け | 21 | **12** |
| 求職者向け | 0 | 0 |
| 合計 | 106 | 106 |

- 求職者向けが 0本なのは正しい。Nortiq で働くこと・インターン・社内の様子を主題にした記事は BLOG に無い（採用は `/recruit` が受ける）
- `node build.js` の「audience が無い記事 N本を仮置きしています」の warn は **0件** になった（「不備 0 件 / 記事まわりの注意 0 件」）。`api/_data/catalog.json` の記事 106本すべてに列挙値の `audience` が入る（`/column` は type article だが一覧ページなので対象外）
- 直したのは 9本すべて「制作側・技術者向け → 発注側向け」。逆向き（発注側 → 制作側）の修正は 0本

## 3. 確信度 0.6 未満の 12本（必須の目視）

本文を読んで判定した。「判定」が Jev と違う行は `overrides[slug].audience` を書き換えた（`audience_confidence` は Jev の値のまま残す）。

| slug | Jev（確信度） | 判定 | 理由（本文の手がかり） |
|---|---|---|---|
| benchmark-competitor-success | 制作側 (0.58) | **発注側向け（直した）** | 「新しいサービスのWeb集客を考えるとき」から始まり、競合分析を「無料診断で始めましょう」で締める読み物。BuiltWith 等のツール名は出るが、使い方の手順ではなく「観察できる」ことの例示 |
| blog-bot | 発注側 (0.54) | 発注側向け | 「ブログを更新したいのに続かない」事業者向けのツールの選び方。自社プロダクト（Loop AI）への誘導つき |
| customer-reviews-stealth-marketing-rules | 発注側 (0.26) | 発注側向け | 自社サイトに口コミを載せる事業者向けの法令（ステマ規制）解説。criteria の「法規制や制度への自社サイトでの対応」 |
| google-business-profile-meo | 発注側 (0.51) | 発注側向け | 地域店舗の経営者が自分で MEO を始める手順。読者は事業者（作る側ではない） |
| homepage-core-web-vitals-guide | 制作側 (0.28) | **発注側向け（直した）** | 題が「中小企業向け5ステップ」、本文は「御社のサイト」に語りかけ、「制作・リニューアル発注時に CWV を要件に組み込む方法」「当社の品質保証基準」の節がある。中盤に fetchpriority や aspect-ratio の実装手順もあるが、読者の位置は PageSpeed Insights で自社サイトを測る発注側。基準書 2.3 の「どちらにも読める題」なので安全側 |
| homepage-renewal-301-redirect-guide | 発注側 (0.32) | 発注側向け | 「制作会社に依頼する場合の確認ポイント」「担当者が自分で操作する必要はありません」と、発注担当者が発注前に押さえる構成 |
| image-data-structuring-model-selection | 制作側 (0.51) | **発注側向け（直した）** | 「御社のようにこれから画像認識AIの導入を検討する段階の企業」「自社にAIエンジニアがいない場合」「自社での導入を検討する際の進め方」と導入判断の記事。無料診断・機械学習開発の料金へ誘導。overrides の block_id も sg-dx（AI導入）。基準書 2.3 は題だけで作る側の例に挙げているが、本文は発注側（5章） |
| multi-ai-parallel-productivity | 発注側 (0.28) | 発注側向け | 「経営者や担当者」向けのコラム。実装は無い |
| page-speed-conversion | 発注側 (0.36) | 発注側向け | 表示速度を「明確な経営課題」として事業者に語り、リニューアル・診断へ誘導 |
| realty-lp | 制作側 (0.43) | **発注側向け（直した）** | 読者は自社の売却査定 LP で反響を増やしたい不動産会社。overrides は sg-solution（不動産）で、業種別カードの対象そのもの。制作側のままだと不動産の事業者から業種カードが消える向きの誤り。評価セット s12 の人のラベルも 事業者 |
| website-renewal-kpi-metrics | 発注側 (0.36) | 発注側向け | 「制作会社への発注仕様に目標値を含めておく」発注担当者向け |
| womens-advancement-act-disclosure | 発注側 (0.36) | 発注側向け | 自社サイトに情報公表する会社の担当者向け（法規制への自社サイトでの対応） |

**傾向**: 0.6 未満のうち、制作側と付いた 4本は **4本とも誤り**、発注側と付いた 8本は **8本とも正しかった**。発注側の低確信度は「外注の話ではない（法令・MEO・コラム）が事業者の判断材料」の記事で、criteria の後半「統計や業界動向の解説のような読み物で、事業者の判断材料になるものも含む」が効いている。

## 4. 無作為 20本（確信度 0.6 以上から）

選び方: 確信度 0.6 以上の 94本の slug をソートし、`floor(i × 94 / 20)`（i = 0..19）番目を取った（決定的。task の指定）。tag-articles.js が出力する種 20260921 の 20本とは別の集合（重なりは homepage-renewal-timing-checklist / web-production-cost-guide / llm-guardrail-evaluation-metrics / pos-system-outsourcing-specification-checklist / website-renewal-acceptance-checklist の 5本）。

| slug | Jev（確信度） | 判定 |
|---|---|---|
| ai-chatbot-industry-suitability | 発注側 (1.00) | 一致（「自社業種に合うかどうかを判断したい方に向けて」） |
| ai-literacy-mindset-shift | 発注側 (0.93) | 一致（経営者向けコラム） |
| btob-web-marketing | 発注側 (0.99) | 一致（経営者向け） |
| competitive-quotes-subcontract-antitrust-law | 発注側 (1.00) | 一致（「御社がリニューアルの発注先を検討する際」） |
| crm-build-vs-package-comparison | 発注側 (1.00) | 一致（中小企業の CRM 選定） |
| homepage-estimate-reading-guide | 発注側 (1.00) | 一致（見積書の見方） |
| homepage-renewal-failure-causes-sme | 発注側 (1.00) | 一致（発注前チェックリスト） |
| homepage-renewal-timing-checklist | 発注側 (1.00) | 一致（稟議資料として使うチェックリスト） |
| in-house-system-outsourcing-cost | 発注側 (1.00) | 一致（外注費用の相場） |
| ipa-security-guideline-smb | 発注側 (0.87) | 一致（中小企業向けガイドラインの解説。「自社での対応が難しい場合は」の節） |
| legacy-system-replacement-guide | 発注側 (0.99) | 一致（刷新の投資判断） |
| llm-guardrail-evaluation-metrics | 制作側 (1.00) | 一致（評価指標・実装手順・ベンチマーク・「実装者がはまりやすい評価設計の落とし穴」） |
| llm-overfitting-detection-prevention | 制作側 (1.00) | 一致（分類器の過学習を防ぐ実装手順。末尾に自社実装かマネージドかの節はあるが本文の大半はモデル学習） |
| pos-system-outsourcing-specification-checklist | 発注側 (1.00) | 一致（外注前の仕様確認） |
| site-renewal-process-guide | 発注側 (1.00) | 一致（リニューアルの進め方） |
| subsidy-for-business-system-dx | 発注側 (1.00) | 一致（補助金の進め方） |
| system-development-outsourcing-contract-types | 発注側 (1.00) | 一致（準委任と請負の選び方） |
| web-production-cost-guide | 発注側 (1.00) | 一致（制作費用の相場） |
| website-renewal-acceptance-checklist | 発注側 (1.00) | 一致（検収の項目と期限） |
| website-renewal-unexpected-additional-cost | 発注側 (1.00) | 一致（追加費用の原因と対策） |

**一致率: 20 / 20（100%）。** 発注側 18本・制作側 2本。確信度 0.87 以上の帯では誤りが見つからなかった。

## 5. 追加の確認: 制作側・技術者向けと付いた残り 15本（範囲外。安全側の確認）

取り決めの目視は 3章＋4章で終わりだが、誤りの向きが非対称（制作側と誤ると事業者から提案カードが消える）なので、制作側と付いた 21本のうち 3章・4章に入らなかった 15本も題・冒頭・見出しと、判断を分ける節（外部への依頼・相談、御社への語りかけ）を読んで確かめた。3章の傾向（制作側の誤りが多い）を見てから決めた追加なので、**Jev の結果より本文を優先する** 同じ基準で通した。

### 5.1 直した 5本（制作側・技術者向け → 発注側向け）

| slug | Jev（確信度） | 理由 |
|---|---|---|
| ai-content-google-spam-update | 制作側 (0.94) | 「御社の記事」「自社の記事が対象にならないために確認すべき手順」と、AI で記事を作る事業者の運用の話。承認フローの設計を「DXコンサル・機械学習開発で承ります」→ 無料診断で締める。コードは無い。評価セット s14 の人のラベルは [事業者, 同業者・学習者]（どちらにも読める題）なので安全側 |
| ai-seo-article-quality-check | 制作側 (0.96) | 「品質管理フロー構築を自社で進めるか外部に依頼するかの判断基準」の節（内製／外部依頼の表、外部依頼で確認する3点）があり、「御社の記事運用フロー」に語りかける。評価セット s15 の人のラベルは 事業者 |
| ai-review-requirements-document | 制作側 (1.00) | 「中小企業の要件定義で AI レビューが特に有効な場面は」（専任の要件定義担当者がいない会社）「自社での導入が難しい場合はどうすればよいですか」→ 無料診断。要件定義は発注者の上流工程で、読者はシステム開発を外注する側。基準書 2.3 の「どちらにも読める題」。評価セット s40 は [事業者, 同業者・学習者] |
| website-renewal-site-reputation-policy | 制作側 (1.00) | リニューアルする会社の担当者が「既存ページの棚卸し・外部コンテンツ区画の洗い出し」をする話で、「ノーティックラボに相談するとどう進められるか」→ 無料診断。「実装者として気づいた」の見出しは当社の語りで、読者が実装者なのではない。コードは無い |
| llmo-cited-by-ai-search-implementation | 制作側 (0.93) | 「明日から自社サイトに実装できる具体的な手順」だが、中身は結論を先に書く・一次情報にリンクする・著者を明示する・表にする、と自社サイトを運営する人の編集方針で、構造化データも型名を挙げるだけでコードは無い。末尾は「自社サイトの現状を診断してほしい場合は URL を」。基準書 2.3 の「どちらにも読める題」なので安全側。**15本の中でいちばん迷った**。制作側に戻すなら、この行だけ戻せばよい |

### 5.2 据え置いた 10本（制作側・技術者向けのまま）

| slug | Jev（確信度） | 据え置く理由 |
|---|---|---|
| core-nfc-felica-system-code-limit | 制作側 (1.00) | Info.plist の登録手順・版別の上限・実装パターン |
| ios-nfc-felica-detection-time-comparison | 制作側 (1.00) | 実測の前提条件と調査手法。末尾に「外部に依頼するときの確認ポイント」の節はあるが、本文の大半は検出時間の実測 |
| ios-nfc-felica-slow-fix | 制作側 (1.00) | Info.plist 設定ガイド（基準書 2.3 の作る側の例） |
| ios17-nfc-felica-system-code-limit | 制作側 (1.00) | Info.plist の設定手順・設計パターン・動作検証 |
| core-web-vitals | 制作側 (1.00) | web-vitals v5 の attribution build、preload・fetchpriority・長いタスクの分割など技術手法 |
| llm-guardrail-bypass-cases | 制作側 (0.95) | バイパス手法の分類と検出回避率、過学習のメカニズム |
| llm-guardrail-evaluation-method | 制作側 (1.00) | 評価指標の選び方・テストデータの作り方・5ステップの実施手順。末尾に「外部実装者への依頼基準」はあるが、題が「自社評価する方法」で読者は評価を自分で行う |
| llm-guardrail-jailbreak-defense | 制作側 (1.00) | 多層化の実装ステップ・運用チェックリスト |
| llm-guardrails-3-layer-architecture | 制作側 (1.00) | NeMo・OWASP に基づく実装手順（基準書 2.3 の作る側の例） |
| vetonet | 制作側 (1.00) | 開発の裏側（intent drift・設計思想・突破された 24 ケース）。読者は開発者 |

## 6. 直した slug の一覧（9本。すべて 制作側・技術者向け → 発注側向け）

| slug | Jev の確信度 | 出どころ |
|---|---|---|
| benchmark-competitor-success | 0.58 | 3章（0.6 未満） |
| homepage-core-web-vitals-guide | 0.28 | 3章 |
| image-data-structuring-model-selection | 0.51 | 3章 |
| realty-lp | 0.43 | 3章 |
| ai-content-google-spam-update | 0.94 | 5章（追加） |
| ai-seo-article-quality-check | 0.96 | 5章 |
| ai-review-requirements-document | 1.00 | 5章 |
| website-renewal-site-reputation-policy | 1.00 | 5章 |
| llmo-cited-by-ai-search-implementation | 0.93 | 5章 |

`overrides[slug]` では `audience` を書き換え、`audience_confidence` は Jev の値のまま残し（あとで「確信度が高いのに直した」記事を拾えるように）、`_review` を外して `_reviewed: true` を付けた。確かめて一致した 38本にも `_reviewed: true` を付けた（47本）。`_reviewed` の無い 59本は Jev の結果（確信度 0.66〜1.00、すべて発注側向け）のまま。`_review` / `_reviewed` は build.js も api も読まない（人のための印）。

## 7. 基準書（labeling-guide.md 2.3）との食い違い

基準書 2.3 は **題と desc だけ** で記事を3分類し、評価セットのラベル付けに使う。本書は **本文** で判定し、状態に「対象」として Jev に渡す値を決める。役割が違うので食い違いは許容するが、次の2点は基準書担当に知らせる（担当外なので本書からは直さない）:

1. 基準書 2.3 が「作る側向け」の例に挙げる **AI画像データの構造化抽出、モデル選定方法**（image-data-structuring-model-selection）は、本文が「導入を検討する段階の企業」向けなので 発注側向け にした。題だけ読むと作る側に見える記事の例として、基準書の例から外すか「どちらにも読める題」に移すのがよい
2. 基準書 2.3 の「どちらにも読める題」6本は、本書ではすべて 発注側向け になった（homepage-core-web-vitals-guide / homepage-renewal-301-redirect-guide / llmo-cited-by-ai-search-implementation / ai-review-requirements-document は本文で確認。wordpress-vs-nextjs-comparison 0.90 と llm-guardrail-monthly-cost-sme-guide 0.91 は Jev が発注側と付け、目視の対象に入らなかったので Jev のまま）。audience は3値で「両方」が無く、安全側が 発注側向け だから。評価セットでこれらの記事から入るセッションは visitor_type が集合（[事業者, 同業者・学習者]）なので、Jev が 事業者 と答えても 同業者 と答えても一致になり、決定一致率には効かない

評価セットで使われている記事のうち audience を直したのは realty-lp（s12: 事業者）、ai-content-google-spam-update（s14: 集合）、ai-seo-article-quality-check（s15: 事業者）、ai-review-requirements-document（s40: 集合）の 4本で、いずれも人のラベルと同じ向き。

## 8. パイプライン側（nortiq-pipeline）が keyword 段で付けるときの判断基準

新記事の audience は `data/catalog-articles.json` の `overrides[slug].audience` に **3語ちょうど**（発注側向け／制作側・技術者向け／求職者向け）で書く。書かれない間は build.js が 発注側向け で仮置きして warn する。今回の 106本で分かったことを基準にする:

1. **既定は 発注側向け。** 迷ったら発注側向け。誤りの向きが非対称（制作側と誤ると事業者から提案カードが消える。逆は技術者にカードが1枚出るだけ）
2. **制作側・技術者向け にするのは、本文の主要部分が「読者がコード・設定ファイル・モデル・評価手順を自分で扱う」ものに限る。** 目安: コードブロックや設定ファイル名（Info.plist など）、API・ライブラリ・フレームワーク名の使い方、エラーの原因と解決、評価指標の算出手順、モデルの学習、開発の裏側。今回 制作側 のまま残った 12本は、NFC/FeliCa 4本、LLM ガードレールの実装・評価 6本、Core Web Vitals の技術手法 1本、開発記 1本
3. **次のどれかがあれば、実装の節があっても 発注側向け:** 題に「中小企業向け」「発注」「外注」「費用・相場・見積」「進め方」「選び方」「補助金」「自社サイトに載せる」。本文に「外部に依頼するかの判断」「制作会社（開発会社）に依頼する場合の確認ポイント」「自社での導入が難しい場合は」の節。業種別の記事（業種 LP に対応するもの）。法令・制度・統計を事業者の判断材料として解説する読み物
4. **CTA（無料診断・御社への語りかけ）の有無だけでは分けられない。** 制作側のまま残した 12本のうち 9本にも「御社」か「無料診断」がある（技術記事も当社の実装力の証明として書かれ、末尾に相談導線がある）。見るのは本文の主要部分が「発注側の判断」か「作る側の作業」か
5. **求職者向け** は、Nortiq で働くこと・インターン・社内の様子や働き方を主題にした記事だけ。今回は 0本
6. **Jev に付けさせる場合の較正。** 今回の実測では、確信度 0.6 未満で 制作側 と出た 4本は全部誤り、0.6 以上でも 制作側 の 17本中 5本が誤り（御社への語りかけ・外部依頼の判断の節がある記事）。一方 発注側 と出た 85本のうち目視した 26本（無作為 18本＋低確信度 8本）に誤りは無かった。したがって、**制作側 と出た記事は確信度に関わらず本文を目視する（または 0.9 未満なら機械的に 発注側向け に倒す）、発注側 と出た記事はそのまま採る** のが、今回の記事群では安全で手間も小さい
7. audience を付けたら評価セットを回す（`npm run nq:eval:check`）。audience は visitor_type の判定を変える（README 5章・9章）

## 9. 次の手順（担当外）

- 評価担当: 段階3（need を外し audience を渡す）はこの結果で回せる。`node build.js` 済みで `api/_data/catalog.json` に audience が入っている
- 基準書担当: 7章の2点
- 統括: `data/catalog-articles.json` の差分は overrides 33行の書き換え（audience の追記）＋ 73行の追加。`dist/` と `api/_data/` は .gitignore 済みで、コミット対象は catalog-articles.json と本書だけ


## 追記 2026-09-22: 公開後に足した記事

| slug | Jev の判定（確信度） | 目視の判定 | 理由 |
|---|---|---|---|
| pos-integration-single-source-of-truth | 制作側・技術者向け（0.98） | **発注側向け** に修正 | 「発注者と開発会社が合意しておく」「ノーティックラボに相談するとどう進められるか」「無料診断からお問い合わせ」の節があり、実装経験を根拠に発注者へ設計の判断材料を示す記事。コードは無い。制作側と出た記事は確信度に関わらず目視する、という本書の基準どおりの例 |
