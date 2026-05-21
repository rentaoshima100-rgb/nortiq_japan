# Claude vs GPT 業務利用 比較リサーチ・ドシエ（2025-2026年版）

## TL;DR
- **業務利用の総合的な「精度・信頼性」では、2026年5月時点で Anthropic Claude（Opus 4.7／Sonnet 4.6）が OpenAI GPT-5系（GPT-5.4／GPT-5.5）に対し、コーディング実務、長文ドキュメント理解、ハルシネーション抑制（特に「分からないと正直に言う」設計）、エンタープライズ採用、自然な日本語ビジネス文章 の5領域で優位**。一方、GPT-5.5 は MMLU・Terminal-Bench 2.0・マルチモーダル統合では先行しており、純粋な「全部入り」の汎用性では依然 ChatGPT エコシステムが強い。
- **エンタープライズ市場のシェアは Claude が逆転済み**：Menlo Ventures の 2025 年中間レポートで Anthropic が 32%・OpenAI が 25%（2023 年末は OpenAI 50%）。2026年4月の Ramp 支出データでは Anthropic 34.4% / OpenAI 32.3%。WSJ 報道（2026年3月19-20日）によれば、新規エンタープライズ AI 支出の **73% が Anthropic に流入**（OpenAI 社内で "code red" が発令されたと報じられた）。
- **一般ビジネスパーソンへの推奨**：日常業務（文章作成・要約・メール・社内文書・契約書レビュー）では Claude を第一選択にし、画像生成・音声・最新Web検索・Microsoft 365 統合の場面では GPT-5系を併用する「両刀運用」が最も現実的。月額コスト合計は1人あたり $40〜80 程度で収まる。

---

## Key Findings（記事執筆時に押さえるべき要点）

### 1. 2025-2026 年の主要モデル世代マップ
- **Claude系**：Sonnet 4.5（2025年9月29日）→ Opus 4.5（2025年11月24日）→ Haiku 4.5 → Sonnet 4.6・Opus 4.6（2026年2月、Opus 4.6 は2月5日）→ **Opus 4.7（2026年4月16日、現時点での一般公開最上位）**。Anthropic公式 Series G 発表（2026年2月12日）に「In January alone, we launched more than thirty products and features, including Cowork」と明記されており、**2026年1月だけで30以上の新製品・機能をリリース**している驚異的な開発速度。
- **GPT系**：GPT-5（2025年8月7日）→ GPT-5.2（2025年12月11日、コンテキスト 400K）→ GPT-5.3 Instant（2026年3月3日、デフォルト ChatGPT モデル化）→ GPT-5.4（2026年3月5日）→ **GPT-5.5（2026年4月23日リリース、コードネーム "Spud"、GPT-4.5 以来の本格ベースモデル再学習）**。

### 2. コーディング・エージェント（最も差が大きい領域）
- **SWE-bench Verified**（500件の実 GitHub 課題）：Opus 4.7 = **87.6%**、GPT-5.5 = **88.7%**、Sonnet 4.6 = **79.6%**、GPT-5.4 = 76.3%。ほぼ並ぶが GPT-5.5 がやや先行。
- **SWE-bench Pro**（多言語・実務難易度高）：**Opus 4.7 = 64.3%、GPT-5.5 = 58.6%、GPT-5.4 = 57.7%、Gemini 3.1 Pro = 54.2%**。実務に近い難しい設定では **Claude が明確リード**。
- **業界エコシステムの採用シェア**：Menlo Ventures の State of Generative AI レポートによれば、**エンタープライズコーディング市場における Claude のシェアは42〜54%、OpenAI は21%**。Cursor、GitHub Copilot、Devin（Cognition）、Replit、Lovable、Notion Agent、Figma Make など主要コーディング系製品が Claude をデフォルトに採用。
- **実機評価の代表例**（Anthropic 公式 Opus 4.7 ローンチ資料に掲載）：
  - Devin（Cognition）：「Sonnet 4.5 で計画性能 +18%、エンドツーエンド評価 +12%、Sonnet 3.6 以来最大の伸び」
  - Notion Agent：「Opus 4.7 は Opus 4.6 比で精度 +14%、ツール呼び出しエラーが 1/3」
  - CodeRabbit：「Opus 4.7 は recall が +10% 改善、最も難しい PR で精度を維持しつつ recall 向上」
- **30時間以上の連続自律コーディング**が Sonnet 4.5 以降の Claude で可能になった点も大きい。

### 3. 推論・知識ベンチマーク
- **MMLU**：OpenAI 公式 GPT-5.5 システムカード（2026年4月23日）の自己申告値で **92.4%**（GPT-4 の 86.4% から伸長）。
- **GPQA Diamond**（PhD 級科学知識）：Opus 4.7 = **94.2%**、GPT-5.4 Pro = 94.4%、Gemini 3.1 Pro = 94.3%。**ほぼ飽和、誤差範囲**。
- **ARC-AGI-2**（新規問題解決能力）：**Opus 4.6 = 68.8% で大幅リード**（GPT-5.2 Pro = 54.2%、Gemini 3 Pro = 45.1%）。Opus 4.5 の 37.6% から +31.2 ポイントの飛躍は、Vellum.ai の独立分析で「フロンティアモデル更新における単一ベンチマーク最大級の改善のひとつ（one of the largest single-benchmark improvements in frontier model updates）」と評価された。
- **Humanity's Last Exam**：GPT-5.5 = 41.4%（ツールなし）／52.2%（ツールあり）。Opus 4.7 = 40.0% / **54.7%**。**ツール使用時は Claude が逆転**。
- **Terminal-Bench 2.0**：Vellum.ai の独立検証で「GPT-5.5 achieves state-of-the-art on Terminal-Bench 2.0 at 82.7%, leading Claude Opus 4.7 (69.4%) by over 13 points」と明記。**コマンドライン操作系では GPT-5.5 が13ポイント以上の差で圧倒**。

### 4. ハルシネーション（事実誤認）
**この領域は単一の数字で語れない**ことを記事では強調すべき。ベンチマークによって結果が桁違いに変わる。
- **AA-Omniscience**（「知らないことを正直に認めるか」を測定、CometAPI 2026年4月計測）：**GPT-5.5 = 86%、Gemini 3.1 Pro = 50%、Claude Opus 4.7 = 36%**。GPT-5.5 は AA-Omniscience の正答率も 57% と最高だが、「知らないこと」にも自信を持って答えてしまう傾向が際立つ。
- **Vectara**（要約の忠実度ベンチマーク）：Claude Sonnet 4.6 = 10.6%、GPT-5.2-high = 10.8%、Claude Opus 4.6 = 12.2%（推論モデル全般が10%超え）。非推論モデルの Gemini 2.5 Flash-Lite が 3.3% と最良。
- **共通する第三者評価**：Caylent（AWS パートナー）の内部評価は「Sonnet 4.5 は答えをでっち上げる代わりに『I don't know』と返す傾向が高い」と明言。MindStudio（2026年5月）：「Anthropic は具体的なハルシネーション削減率を主張しない一方、Claude は不確実性をフラグする頻度が高い。これはアーキテクチャ哲学の違い」。
- **HealthBench（医療）**：GPT-5 + thinking モードで 1.6%（GPT-4o は 15.8%）。**医療など特定領域では GPT-5系が強い**。
- **ECRI 2026 健康技術ハザードリストで「医療における AI チャットボット誤用」が第1位**にランクされており、業務利用では人間によるレビューが不可欠。

### 5. 長文・コンテキストウィンドウ
- **Claude Opus 4.7／4.6・Sonnet 4.6**：**1M トークン**（約75万語、約3,000 ページ相当）。2026年3月にロングコンテキスト料金プレミアム撤廃（旧 $10/$37.50 → 標準 $5/$25）、200K 超でも均一料金。
- **GPT-5.4／5.5**：1.05M トークン入力、出力 128K。ただし **GPT-5.5 は 272K トークン超で入力2倍・出力1.5倍**（OpenAI 公式 API ドキュメント明記）。
- **品質（MRCR v2、複数情報抽出ベンチマーク）**：
  - Opus 4.6 = 256K で 93%、**1M で 76%**
  - GPT-5.2 Thinking = 256K で 98%、1M で 70%
  - Gemini 3 Pro = 256K で 77%（フル長で大きく劣化）
  
  → **Claude は長文の終端まで品質維持率が高い**点が実務での強み。Anthropic 公式は「1M 全域で 90% 検索精度」と報告。
- **実務インパクト**：200ページの契約書全体、社内ナレッジベース、月単位の顧客サポート履歴を分割せず一発で投入できる。RAG パイプラインを構築せずに済むケースが増える。

### 6. 日本語処理
- **Artificial Analysis Multilingual Index（Japanese, Global-MMLU-Lite ベース）の Top 5**（2026年5月時点）：
  1. **Gemini 3.1 Pro Preview**（Google）= **94**
  2. Gemini 3 Pro Preview (high) = 93
  3. **Claude Opus 4.6 (max)** = 93
  4. Claude Opus 4.6 = 93
  5. **Claude Sonnet 4.6 (max)** = 93
  
  Artificial Analysis の Japanese ページの説明文（verbatim）：「The top 5 Japanese language AI models are Gemini 3.1 Pro Preview, Gemini 3 Pro Preview (high), Claude Opus 4.6 (max), Claude Opus 4.6, and Claude Sonnet 4.6 (max)」。**GPT-5系は Top 5圏外**（インタラクティブチャート内のみでテキスト表示なし）。
- **日本語の "純粋なベンチマーク王者" は実は Gemini 3.1 Pro**。Claude推し記事として書く場合、「日本語スコアでも僅差の上位群に必ず Claude が複数モデル入っており、かつビジネス日本語の敬語・トーン制御では複数の独立評価で高い実用評価」という事実ベースの表現が誠実。
- **ビジネス日本語の品質に関する独立評価**：
  - explAIn（2026年4月）：「日本語の自然さ・文体の多様性・読んでいて疲れない文章という点では、Claude Mythos Preview（および Opus 4.7）が GPT-5.5 より優れているという評価が多い」
  - tenbin.ai byGMO（2026年3月実機検証）：「Claude Sonnet 4.6 は丁寧に文字数まで自己申告する几帳面さ」「GPT-5.4 は速く効率的、Claudeは丁寧で実務的」
  - myaifrontdesk：「Claudeは日本語ビジネス文脈で敬語と丁寧表現を効果的に扱う」「B2B SaaS 企業の日本市場進出に最適」
  - GuruSup（2026年）：「Claudeは Japanese keigo (honorifics) の形式レベルを保持する点で Gemini を上回る — business メールに不可欠」

### 7. 安全性・信頼性の設計思想
- **Anthropic Constitutional AI**：2026年1月22日に新しい「AI Constitution」を **Creative Commons CC0** ライセンス下で全文公開。安全性 → 倫理 → コンプライアンス → 有用性 の優先順位を階層的に明示。BISI（Bloomsbury Intelligence and Security Institute）：「the most comprehensive public framework yet for governing an advanced Artificial Intelligence (AI) system」。
- **Claude Sonnet 4.5 システムカード（Anthropic公式PDFで一次ソース確認済み）の実測値**：
  - 有害リクエストへの **無害応答率：99.29%**（Sonnet 4 = 98.22%、Opus 4.1 = 98.76% から統計的有意改善）
  - 良性リクエストの **過剰拒否率：0.02%**（Sonnet 4 = 0.15% から大幅低下）
  - 原文引用：「Single-turn evaluations for Claude Sonnet 4.5 showed statistically significant improvements in overall harmless response rate compared to Claude Sonnet 4 (99.29% vs. 98.22%)」
- **Opus 4.5 の安全性主張（Anthropic公式）**：「業界トップのプロンプトインジェクション耐性」「GPT-5.1 / Gemini 3 Pro より約10%少ない問題行動」。
- **OpenAI 側のカウンター**：GPT-5.5 で「医療・法務・金融タスクで 50%+ のハルシネーション削減」を主張。ただし MindStudio の独立分析は「OpenAI 自己申告であり第三者検証は限定的、AA-Omniscience の独立計測では GPT-5.5 が86%でむしろ最も高い」と指摘。

### 8. エンタープライズ採用実績
- **Menlo Ventures「2025 Mid-Year LLM Market Update」**（150社のCTOクラス調査、2025年7月発表）：
  - エンタープライズ LLM 支出は半年で $3.5B → $8.4B に倍増
  - **Anthropic 32%、OpenAI 25%、Google 20%、Meta Llama 9%、DeepSeek 1%**
  - Tim Tully（Menlo Ventures パートナー）コメント：「Teams are prioritizing real performance in production. As enterprise LLM spend crosses $8 billion, Anthropic is capturing the majority share」
- **Ramp 法人カード支出データ（2026年4月）**：Anthropic 34.4% / OpenAI 32.3%。**初めて Anthropic がリード**。
- **Anthropic 公式（2026年2月12日 Series G 発表）**：
  - 年率収益 **$14B**（2025年12月末の $9B から約2か月で1.5倍）
  - Series G で $30B 調達、ポストマネー評価額 **$380B**
  - **Fortune 10 のうち8社が Claude 顧客**
  - 年間 $1M 以上を支出する顧客が500社超（2年前は十数社）
  - 年間 $100K 以上の顧客が前年比 7倍
- **OpenAI 側の規模**：TechCrunch（2026年2月27日）報道「ChatGPT has reached 900 million weekly active users, OpenAI announced Friday」、Reuters/The Information（2026年3月4日）配信「OpenAI topped $25 billion in annualized revenue as of the end of last month」（前期 $21.4B から17%増）。Fortune 500 採用率は92〜93%。
- **WSJ 報道（2026年3月19-20日）**：OpenAI 社内メモで「Anthropic が新規エンタープライズ AI 支出の 73% を獲得」と判明、社内 "code red" が発令されたとされる。

### 9. 日本市場での Claude 導入事例（記事の信頼性向上に有効）
- **楽天（Rakuten）**：Claude Code 導入で市場投入時間を **24営業日 → 5日（79%削減）**。複雑なコード修正で **数値精度 99.9%**、12.5M行の vLLM リファクタリングで **7時間連続の自律コーディング**。関連子会社では「クリティカルエラーを 97% 削減」。Yusuke Kaji（AI for Business 統括）公式コメント：「You can have five tasks running in parallel by delegating four to Claude Code while focusing on the remaining one」
- **クラスメソッド（Classmethod）**：**最大10倍の生産性向上**、コーディング時間 **90%削減**、コードレビュー時間 **80%削減**、Google Apps Script タスクが 24時間→1時間（**96%削減**）、社内 OSS「rulesync」のコードベース **99% を Claude Code が生成**
- **NEC（日本電気）**：2026年4月23日発表で **Anthropic の日本拠点初のグローバルパートナー** に。Claude を **NEC グループ約3万人にグローバル展開**、金融・製造・自治体向けに Claude Cowork を共同開発。
- **野村総合研究所（NRI）**：文書分析業務を「数時間から数分」に短縮（Anthropic 東京オフィス開設発表より）
- **Panasonic**：2025年1月8日発表で業務・消費者向けアプリケーションに Claude を統合

### 10. 料金体系（2026年5月時点、API公式）
| モデル | 入力（$/1M） | 出力（$/1M） | コンテキスト | 備考 |
|---|---|---|---|---|
| **Claude Opus 4.7 / 4.6 / 4.5** | $5 | $25 | 1M | プロンプトキャッシュで最大90%オフ、バッチ50%オフ。前世代Opus 4.1（$15/$75）から**67%値下げ** |
| **Claude Sonnet 4.6 / 4.5** | $3 | $15 | 1M（Sonnet 4.6） | キャッシュ読み取りで最大90%オフ、Opus 4.5級性能を1/5価格で |
| **Claude Haiku 4.5** | $0.80 | $4.00 | 200K | 高速・大量処理用 |
| **GPT-5.5** | $5 | $30 | 1M | **272K超は入力2倍・出力1.5倍**、データ所在地は+10% |
| **GPT-5.4** | $2.50 | $15 | 1.05M | コスパ良 |
| **GPT-5.2** | $1.75 | $14 | 400K | レガシー |
| **GPT-5 mini** | $0.25 | - | - | 低コスト用 |

**個人向けプラン**：Claude Pro $20/月、ChatGPT Plus $20/月（同価格）。Claude Max は $100〜、ChatGPT Pro は $200。

**コスパ評価**：Sonnet 4.6 が Opus 4.5 級の性能を 1/5 の価格で提供している点が決定的。一般業務（要約・メール・文書作成）には Sonnet 4.6 が事実上のスイートスポット。

---

## Details（記事に組み込める引用・素材）

### A. Claude の具体的な強み（Claude推し記事の論拠）

**A-1. 「人間らしい文章」評価の独立検証**
- Tactiq（2026年）：「Claude is widely regarded as the strongest AI for creative writing. It produces the most natural-sounding prose, handles voice and tone matching well, and maintains quality over long-form pieces」
- Missive（メール作成専用評価）：「Claude consistently produces the most human-sounding drafts. It's better at picking up on emotional cues in the original email and adjusting tone accordingly. If a customer sounds frustrated, Claude's draft acknowledges that frustration naturally rather than defaulting to a chipper 'Thanks for reaching out!'」
- AItomation Academy 5タスク実機テスト：「For the writing that actually represents you and your business — the writing clients see, the content your audience reads, the proposals that win or lose deals — Claude is the better tool」
- AI Vortex（法務領域）：「Claude writes better legal prose. Claude's legal documents follow logical IRAC-style organization naturally. Claude takes feedback and produces meaningfully different second drafts」

**A-2. ハルシネーション抑制の設計哲学**
- Caylent 内部評価：「we've found that Sonnet 4.5 has a higher tendency to respond 'I don't know' instead of hallucinating an answer, and it's better at respecting instructions about the output」
- MindStudio：「What Claude Opus 4.6 does have is a well-documented approach to uncertainty. Claude is more likely than most models to say 'I don't know' or 'I'm not confident about this' rather than fabricate a confident answer」

**A-3. 1Mコンテキストの実用品質**
- Anthropic 公式：「Opus 4.6 demonstrates reliable recall at extreme context lengths」「Opus 4.6 is much better at retrieving relevant information from large sets of documents」
- Martin Alderson（実機検証ブログ）：「You can see here that while GPT-5.4 and Gemini 3.1 Pro both have 1M context lengths, they quickly degrade past 256K - struggling to get above 50% match ratio at 1M length. This is a real problem for long running agentic tasks」

### B. GPT-5系の強み（公平に触れるべき点）

- **MMLU 92.4%（GPT-5.5）**、**Terminal-Bench 2.0 82.7%**（Claude を 13 ポイント以上引き離す）でフロンティア
- マルチモーダル統合（DALL-E 画像生成、リアルタイム音声、Codex 統合）が完成度高い
- Microsoft 365 / Azure / Excel / Google Sheets との既存統合が深く、IT管理者の導入摩擦が小さい
- ChatGPT 利用者ベース：週間アクティブユーザー9億人（TechCrunch, 2026年2月27日）、年率収益 $25B（Reuters/The Information, 2026年3月4日）
- 価格優位：GPT-5.4 は $2.50/$15 で、Claude Sonnet 4.6（$3/$15）より入力が安い
- HealthBench 等の医療領域では GPT-5 + thinking モードが圧倒（1.6%ハルシネーション）

### C. ベンチマーク早見表（記事の表素材）

| 評価項目 | Claude Opus 4.7 | Claude Sonnet 4.6 | GPT-5.5 | GPT-5.4 |
|---|---|---|---|---|
| SWE-bench Verified | **87.6%** | 79.6% | **88.7%** | 76.3% |
| SWE-bench Pro | **64.3%** ★ | 53.4%(Opus 4.6) | 58.6% | 57.7% |
| GPQA Diamond | 94.2% | 83.4%(Sonnet 4.5) | ~93% | 94.4%(Pro) |
| Terminal-Bench 2.0 | 69.4% | - | **82.7%** ★ | 75.1% |
| OSWorld-Verified | **78.0%** | 72.5% | ~78% | 75.0% |
| MMLU | - | - | **92.4%** ★ | - |
| MRCR @1M | **76%** ★ | - | 70%(@256K) | - |
| ARC-AGI-2 | - | - | - | 68.8%(Opus 4.6) vs 54.2%(5.2 Pro) |
| AA-Omniscience hallucination | **36%** ★(低い) | - | 86% | - |
| 日本語(AA Multilingual Index) | 93(Top圏) | 93(Top5) | Top5圏外 | Top5圏外 |
| コンテキスト | 1M | 1M | 1M(272K超は2倍) | 1.05M |
| 入力料金($/1M) | $5 | $3 | $5 | $2.50 |
| 出力料金($/1M) | $25 | $15 | $30 | $15 |

★ = カテゴリリーダー

### D. 業務シナリオ別の使い分け推奨

| 業務タスク | 推奨モデル | 理由 |
|---|---|---|
| 社内文書・企画書の執筆 | **Claude Sonnet 4.6** | 自然な日本語、構成力、トーン制御 |
| 長文契約書・規程の要約・レビュー | **Claude Opus 4.7** | 1Mコンテキスト、長文末尾までの品質維持 |
| メール下書き・返信案 | **Claude Sonnet 4.6** | 感情ニュアンスの読み取り、敬語処理 |
| コード生成・コードレビュー | **Claude Opus 4.7 / Sonnet 4.6** | SWE-bench Pro 64.3%、業界シェア42-54% |
| 表計算・財務分析 | **Claude Opus 4.7** | Excel連携、Finance Agent 64.4% |
| マーケコピー、キャッチー表現 | GPT-5.4 / 5.5 | 短文の流暢さ、ブレストの広がり |
| 画像生成・図解作成 | **GPT-5系（DALL-E統合）** | Claude は画像生成非対応 |
| 音声対話・リアルタイム翻訳 | **GPT-5系 / Gemini** | Claude は音声入出力に弱い |
| 最新Web検索を伴うリサーチ | **GPT-5系 / Gemini** | 統合された検索体験 |
| Microsoft 365 統合業務 | **GPT-5系（Copilot）** | エコシステム深さ |

---

## Recommendations（記事の構成案）

### 推奨ストーリーライン（一般ビジネスパーソン向け）

**冒頭（300字）**：「ChatGPTの陰でじわじわ存在感を増している『Claude』。実は2026年5月時点で、エンタープライズ市場のシェアは Claude が逆転している」という事実ベースの導入。

**第1章：3つの数字で見る現状（800字）**
- 32% vs 25%（Menlo Ventures エンタープライズシェア）
- 42-54% vs 21%（コーディング市場シェア）
- 73%（新規エンタープライズ AI 支出が Anthropic に流入）

**第2章：性能ベンチマークの読み解き（1200字）**
- SWE-bench Pro / OSWorld / GPQA / MMLU を表で対比
- 「ベンチマーク王者 = 業務最適とは限らない」というメッセージ
- ARC-AGI-2 で Opus 4.6 が大幅リードしている事実

**第3章：実務で効く5つの差別化ポイント（1500字）**
1. 自然な文章品質（独立評価多数）
2. 長文1Mコンテキストの品質維持率
3. ハルシネーション抑制の設計哲学（謙虚な Claude）
4. Constitutional AI と CC0 公開（透明性）
5. 30時間連続自律タスクの安定性

**第4章：日本企業の実例（800字）**
- 楽天（79%時短）、クラスメソッド（10倍生産性）、NEC（3万人展開）、NRI、Panasonic

**第5章：使い分けと料金（600字）**
- Sonnet 4.6 のコスパ
- GPT-5系を併用すべき場面（画像生成・音声・Office連携）
- 個人月20ドルから始める現実的なロードマップ

**結び（300字）**：「全領域でClaude最強」ではなく、「業務利用の信頼性・品質という観点では今、Claude が一歩リードしている」という誠実な締め方が信頼性を高める。

### 記事タイトル候補
- 「ChatGPTだけでいい？業務利用で Claude を選ぶべき5つの理由【2026年版】」
- 「実は法人市場でChatGPTを逆転 — Anthropic Claude がビジネス利用で選ばれる理由」
- 「日本企業も続々採用：Claude が GPT-5系より業務に向いている本当の理由」

---

## Caveats（記事執筆時に必ず注意すべき点）

1. **モデルの更新速度が極めて速い**：本リサーチは2026年5月21日時点。Anthropic・OpenAI とも約6週間ごとに新モデルを投入しているため、執筆時点で必ず最新版を再確認すること。特に「Mythos Preview」「GPT-5.5 Pro」「Opus 4.7」の位置付けは2-3週間で陳腐化する可能性あり。

2. **ベンチマーク数値の出典リスク**：OpenAI 自己申告（GPT-5.5 のハルシネーション 60% 削減）と独立計測（AA-Omniscience の 86%）で大きな乖離がある。各数値は出典（Anthropic 公式システムカード／OpenAI 公式／Artificial Analysis／Vellum／Vals.ai／Menlo Ventures など）を明記して提示すること。

3. **ハルシネーション率は計測手法で桁が変わる**：「Claude Opus 4.6 = 4%」（Talkory.ai の独自500プロンプト評価）と「Claude Opus 4.6 = 12.2%」（Vectara 要約忠実度）は両方とも信頼できるが計測対象が違う。ベンチマーク名と計測方法をセットで提示。

4. **日本語ベンチマークのトップは実は Gemini 3.1 Pro**：純粋な Global-MMLU-Lite Japanese スコアでは Gemini が首位。Claude推し記事として書く場合は、「Top 5 のうち3モデルが Claude」「ビジネス日本語の体裁・敬語・トーン制御では Claude が複数の独立評価で高評価」と表現するのが事実に忠実。「日本語性能で Claude が最強」と言い切るのは過剰。

5. **「Claude Mythos Preview」は限定公開**：ベンチマーク表で時々最上位に現れるが、これは Anthropic が一般公開していない研究プレビューモデル。記事では Opus 4.7 を「現時点での一般公開最上位」として明確に扱うこと。

6. **GPT-5.5 のリリースは新しく（2026年4月23日）**、業界での実機評価がまだ出揃っていない。古い比較表は GPT-5.4 ベースの可能性がある点に留意。

7. **エンタープライズシェアの数値（32%、34.4%、40%、73%）は計測対象が違う**：
   - 32% = Menlo Ventures（推論支出ベース、2025年中間、150社調査）
   - 34.4% = Ramp（法人カード支出ベース、2026年4月）
   - 40% = Deep Research Global（推計、2026年）
   - 73% = WSJ 報道（新規エンタープライズ AI 支出のみ、2026年3月）
   
   それぞれ出典と計測対象を明示すること。混同して使うと数字の整合性が崩れる。

8. **「Claude推し」と「事実ベース」の両立**：Claude が業務利用で多くの面で優位という根拠は十分にあるが、GPT-5.5 が MMLU・Terminal-Bench 2.0・マルチモーダル統合で先行している事実は認めるべき。誠実な比較こそ記事の信頼性を高める。一般読者は「全方位最強」より「ここが優れている／ここは負けている」という具体性を評価する。

9. **OpenAI を一方的に貶めない**：ChatGPT のユーザーベース（週9億人）、年率収益$25B、Fortune 500 採用率92%、Azure・Microsoft 365 統合の深さは依然として圧倒的。「ChatGPTは終わり」ではなく「Claude の業務利用シェアが急伸している」というトーン推奨。

10. **Anthropic 評価額バブルへの留意**：$380B 評価額に対する懐疑論（27倍年率収益マルチプル、margin expansion 仮定など）も存在することを念頭に置く。記事の主軸は「現在の性能と業務適性」に絞り、企業価値評価の議論には深入りしない方が一般読者向けには適切。

---

**主要出典一覧（記事執筆時の参照用、本文中の引用は省略可）**：Anthropic 公式（claude-sonnet-4-5-system-card.pdf、Opus 4.5/4.6/4.7 ローンチ記事、Series G 発表）、OpenAI 公式（GPT-5.5 システムカード、API ドキュメント）、Artificial Analysis、Vellum.ai、Vals.ai、Menlo Ventures 2025 Mid-Year Report、TechCrunch、Reuters/The Information、Wall Street Journal、CometAPI、MindStudio、Caylent、CodeRabbit、DataCamp、Tactiq、Missive、AI Vortex、tenbin.ai、explAIn、claude.com/customers/rakuten、claude.com/customers/classmethod、NEC プレスリリース（2026年4月23日）、Bloomberg（Anthropic $9B revenue 報道）。