# 2026-09-21 オーナー決定（設計書 v1.0 改訂: 2・3・6・7・10・13・14章）と実装の取り決め

オーナーの決定文をそのまま起点にし、リポジトリでの実装の形（ファイル・フィールド名・スイッチ）を固定する。
`implementation-contract.md` と食い違う箇所は **本書が優先**。設計書の改訂版ファイルは未受領なので、章番号は本書ではオーナーの決定文の呼び方に従う。

## 0. 前提（オーナー）
- 60件だと ±11 ポイントの誤差がある。71.7% と 80% の差は誤差の中。フェーズ0の役目は大きな誤り（sg-lpo の件）を潰すことで、本番の検証はシャドーモードの実データで行う。
- 1回の評価は 1円未満。段階ごとに eval の文書に記録する。

## 1. 完了条件と評価（E7 の回答）
- **測り方は「決定一致率」。** 人のラベルと Jev の回答を、それぞれ6章のルール表に通す。人のラベルは確信度 1.0 扱い、Jev は実際の確信度で 0.6 のゲートを通す。
  4分類 = 行2（営業→何も変えない）／行3（求職者→sg-recruit）／行4（同業者→関連記事）／行5以降に進む。同じ分類なら一致。
- **完了条件: 決定一致 90% 以上（60件なら54件）、かつ「人が事業者と付けたのに、決定が sg-recruit か関連記事になった」誤りが 2件以下。**
- 完全一致・第2候補込みは使わない。確信度のしきい値は上の測り方に含まれる。
- **訪問者タイプは5ラベル**: 事業者／同業者・学習者／求職者・学生／営業・売り込み／other。
  事業者の説明文:「自社のサイト制作、AI導入、システム開発について、外部への依頼、進め方、費用の相場を調べている事業者」。
- ラベル: `eval-label-review.md` の判断基準案を **`docs/nq/labeling-guide.md`** として確定し、**Jev の回答を見ずに** 60件全部を付け直す。
  「どちらとも言えない」は正解を1つに決めず **許容する答えの集合** にする（visitor_type、need、正解カード）。「Jev がそう答えたから」の修正は 0件。直した行と理由は記録。81.7% の試算は採らない。
- 高検討度のセッション（料金→実績→診断、再訪して料金 など）を **10件足して70件** にする。

### 実装
- `eval/sessions.json` v2 の expected:
  ```jsonc
  { "visitor_type": "事業者" | ["事業者","other"],      // 文字列＝確定、配列＝許容集合
    "industry": "…" | ["…"],
    "need": "…" | ["…"],
    "stage": 0..3,                                       // 整数
    "cards": { "best": "sg-web" | ["sg-web","sg-pricing"] | "none", "relevant": ["sg-web", …] },
    "concerns": ["cost", …], "cta_ok": true|false,
    "note": "…", "label_note": "許容集合にした理由（あれば）" }
  ```
  旧フィールド（relevant_cards / best_card）は run.js が読めるが、新規は cards を使う。
- `eval/run.js` が出す主指標:
  1. **決定一致率**（上の4分類。人のラベルが許容集合なら、その集合から作れる分類のどれかに Jev の分類が入れば一致）
  2. **事業者への誤り件数**（人が事業者なのに Jev の決定が行3か行4）
  3. 補助: 従来の軸別の一致・カード適合率・不安・cta_ok。
  4. **stage の分布**: 人が 2以上と付けた件数、その Jev スコアの分布と、2未満の分布、最もよく分ける値（正解率最大）と分離できるか。
  5. `--baseline eval/baseline.json` で比較し、決定一致率が **5ポイント以上下がる、または誤りが増えたら exit 1**（設計書13章の回帰テスト）。
  6. `--check` で、selectable なカードのうち best/relevant に一度も出ないカード、記事カテゴリ（topic）のうち評価セッションに無いものを警告（新しい topic・カードを足すときは評価セッションも足す）。
  7. meta に、そのとき使った data/nq-labels.json・nq-rules.json・blocks.json・catalog-*.json の sha256 と、質問数を記録。
- `eval/baseline.json`（コミットする。決定一致率・誤り件数・軸別の要約だけ。生の回答は入れない）。
- `npm run nq:eval`（= `node eval/run.js --provider jev --out eval/results/<日時>.json`）、`npm run nq:eval:check`（baseline との比較）。
- `.github/workflows/nq-eval.yml`: data/nq-*.json・blocks.json・catalog-*.json・api/_lib/{questions,state,rules,decide}.js・eval/** の push で実行。**JEV_API_KEY の secret が無ければ「未設定」と出して exit 0**（オーナーが secret を登録するまで落とさない）。

## 2. 強い CTA（D10 の回答）
- `/company` と `/staff` の type を trust から **company** に変え、状態には **「会社情報」** として渡す。`/recruit` は新しい type **recruit**（ラベル「採用情報」）。
- stage の指示文:「この訪問者は、サイト制作やAI導入を外部に依頼することについて、どの段階にいるか。料金、実績、サービス内容、無料診断、資料請求のページをどれだけ読んだかで判断する」。
  4段階: 0「記事だけ読んでいる」／1「サービス概要か料金を流し見した」／2「料金・実績・サービス内容をじっくり読んだ、または再訪して料金を見た」／3「無料診断か資料請求に到達した」。
- ルール表の行6は、**visitor_type の第1候補が 事業者 か other のときだけ** 評価する。
- しきい値 2.0 は今は動かさない。ラベルを直したあと、人が 2以上と付けたセッションの Jev スコア分布を出し、2以上と未満を最もよく分ける値に置き換える。**先に「人が2以上と付けた件数」を報告する**（8件あって Jev の 2.0 超が1件なら較正の問題、2件しかなければ評価セットの問題）。
- しきい値で分離できなければ Score をやめ、**Noul 2問**（「依頼先の候補を探している」「すぐに相談や見積もりを依頼したい」）に替える。行6は cta_ok 0.7 以上かつ前者 0.6 以上で ct-diagnostic、後者 0.6 以上で ct-contact。

### 実装
- 質問は **Score と Noul 2問の両方を常に聞く**（並列評価で応答時間は変わらず、原価も数トークン。評価で両方を比べられる）。キーは `stage`、`intent_compare`、`intent_contact`。文は `data/nq-labels.json` の `stage` と `intents`。
- `data/nq-rules.json` に `cta` を追加:
  ```jsonc
  "cta": { "mode": "score",                       // "score" | "noul"
           "gate_visitor_types": ["事業者", "other"],
           "stage_cta": 2.0, "stage_contact": 2.5, // mode=score のとき（thresholds から移す）
           "cta_ok": 0.7, "compare": 0.6, "contact": 0.6 } // mode=noul のとき compare/contact
  ```
  `rules.js` の行6はこれを読む。`thresholds.stage_cta / stage_contact / cta_ok` は `cta` に統合（後方互換で thresholds にあれば読む）。
- `page_type_labels`: `company: "会社情報"`, `recruit: "採用情報"`。`goal_proximity_by_type` に `recruit: 0`。`catalog-pages.json` の `/company` `/staff` は type company・default_next null、`/recruit` は type recruit。

## 3. ニーズのタグ（D11 の回答 1）
- 記事の need は **状態に渡さない**。catalog.json には残す（J1・J3・レポートで使う）。業種タグは残す。
- 記事に **audience（発注側向け／制作側・技術者向け／求職者向け）** を付け、着地ページと閲覧履歴の記事に入れて渡す。
- 既存記事の audience は **Jev の Choice で一括付与**し、確信度 0.6 未満と無作為 20本を目視。空なら「発注側向け」で仮置きして警告（制作側向けと誤ると事業者から提案カードが消えるが、逆は技術者にカードが1枚出るだけなので、安全な側に倒す）。

### 実装
- 記事の audience は `data/catalog-articles.json` の `overrides[slug].audience`（列挙: `発注側向け` | `制作側・技術者向け` | `求職者向け`）。`category_defaults` にも `audience` を置ける。どちらにも無ければ build.js が **「発注側向け」で仮置きして warn**（`assertNq` は列挙外を bad）。
  `api/_data/catalog.json` の記事に `audience` を出す。**記事の audience は列挙値、ページの audience は Jev の関連度の質問文** で、役割が違う（state.js は記事の audience だけを状態に入れる）。
- 状態のキー: 着地ページ・閲覧履歴の記事に `"対象": "発注側向け"`。記事の `need` は入れない（`data/nq-rules.json` の `state: { "article_need": false, "article_audience": true }` で切り替え可。評価の段階実行のため）。
- `eval/tag-articles.js`: Jev の Choice（state = 記事の title・desc・本文の冒頭 約800字。criteria は3ラベルの説明）で全記事に audience を付け、`overrides[slug].audience` と `audience_confidence` を書く。`--only-missing` で未設定の記事だけ。確信度 0.6 未満は `_review: true`。実行後、0.6 未満と無作為 20本を人（今回はエージェント）が記事本文を読んで確かめ、直した slug と理由を `docs/nq/article-audience-review.md` に記録。
- 設計書13章「記事のメタ情報はパイプラインの keyword 段と build.js が公開時に自動で付ける」: パイプライン側（nortiq-pipeline）が `overrides[slug]` に書く前提。書かれていない記事は build.js の仮置きで動く。

## 4. 候補の下限（D11 の回答 2）
- **rel_floor 0.45**。表示のしきい値 0.55 は据え置き。下限は探索と2枚目の候補にしか効かず、1位のカードは取りこぼさない。0.45〜0.55 の帯はシャドーモードの実データで再確認。

## 5. 設計書13章「記事が増えても回る設計」のリポジトリ側
1. **実行時に Jev へ渡す候補の数を固定。** 関連記事はビルド時に記事ごと **最大12本** の候補を結び付け、実行時はその中から Jev が **3本** を選ぶ。1回の質問数は **40以下**（訪問者タイプ・業種・need・stage・intent×2・不安×5・cta_ok・カード≤13・関連記事≤12 = 最大37）。
   - build.js: 各記事に `related`（slug の配列、最大12。同カテゴリ→同 need→同業種→新着の順、自分を除く）を `window.NORTIQ_ARTICLES[slug]` と `api/_data/catalog.json` に出す。
   - questions.js: 現在のページが記事なら、その `related` の各記事に `rel_article_<slug>`（Noul。「この訪問者は次の記事を読むと役に立つ：{title}（{対象}）」）。既読の記事は除く。
   - rules.js: 行4（同業者→rl-related）と、rl-related を出す場面で、関連度の高い順に3本（floor 未満は落とし、足りなければ候補の先頭で埋める）。API 応答の slot に `related: ["slug", …]`。
   - nq-suggest.jsx: 決定に `related` があればそれを、無ければ `NORTIQ_ARTICLES[slug].related` の先頭3本（旧: 同カテゴリ新着）。既読は除く。
2. 記事のメタ自動付与: 上の3章。
3. 夜間バッチのキャッシュ（J1・J7）: **パイプライン側**。このリポジトリでは対象外（README に明記）。
4. **評価セットを回帰テストにする**: 上の1章の run.js `--baseline` と GitHub Actions。指示文・blocks・audience・しきい値・モデル版のどれかを変えたら回す。5ポイント低下か誤りの増加で止める。
5. 承認は新記事につき hold の1回だけ・J2 は hold の前・既存記事の変更は週1回まとめて上限つき: **パイプライン側**。

## 6. 進め方（1回 1円未満。段階ごとに `docs/nq/eval-2026-09-21.md` に記録）
1. 基準書（labeling-guide.md）を確定 → 60件を盲検で再ラベル → 高検討度 10件を追加（70件）
2. 指示文と状態は「5ラベル化だけ」の状態で実行 → **決定一致率の基準値**（need タグは渡したまま、stage の文は旧、/company /staff は trust、floor 0.35）
3. 3章（need を外し audience を渡す）を適用して実行
4. 2章（company 型・stage の文・行6のゲート）を適用して実行 → stage 分布からしきい値を決める（分離できなければ mode=noul）
5. 4章（floor 0.45）を適用して実行
6. 90% 以上かつ誤り 2件以下ならシャドーモードへ（Vercel のデプロイ完了は確認済み: 334dbfaf）。シャドーモードの開始には Vercel の env（NQ_ENABLED / NQ_SHADOW / JEV_API_KEY）と Supabase の準備が要る
7. 以後、変更のたびに `npm run nq:eval:check`

段階実行のためのスイッチ（評価担当が data/*.json を一時的に前の値に戻して回す）:
| 段階 | `nq-rules.json` | `nq-labels.json` | `catalog-pages.json` |
|---|---|---|---|
| 2 基準値 | `state.article_need: true`, `state.article_audience: false`, `cta.gate_visitor_types: []`（ゲート無し）, `thresholds.rel_floor: 0.35` | `stage` は **旧の文**（`stage_legacy` として保存しておく） | /company /staff は trust |
| 3 | `article_need: false`, `article_audience: true` | 同上 | 同上 |
| 4 | `cta.gate_visitor_types: ["事業者","other"]` | `stage` は新の文 | company |
| 5 | `rel_floor: 0.45` | 同上 | 同上 |

最終状態は 5 の列。`stage_legacy` は評価の記録のために残す（questions.js は `stage` だけを使う）。

## 7. 変更点の対応表（ファイル）
| 領域 | ファイル |
|---|---|
| ラベル・しきい値・スイッチ | data/nq-labels.json, data/nq-rules.json |
| ページ型・記事メタ | data/catalog-pages.json, data/catalog-articles.json |
| 状態・質問・ルール・推薦 | api/_lib/state.js, questions.js, rules.js, recommend.js, data.js, api/suggest.js, テスト |
| 5ラベルの反映 | data/blocks.json（only_visitor_types）, supabase/nq_report.sql（見込み客率 = 事業者）, docs |
| ビルド | build.js（記事 audience の仮置きと warn、related ≤12、assertNq の列挙・型 recruit） |
| フロント | nq-suggest.jsx（関連記事の候補と決定） |
| 評価 | eval/sessions.json（v2・70件）, eval/run.js, eval/baseline.json, eval/tag-articles.js, package.json, .github/workflows/nq-eval.yml |
| 文書 | docs/nq/labeling-guide.md, eval-relabel-2026-09-21.md, article-audience-review.md, eval-2026-09-21.md（追記）, open-decisions.md（E7/D10/D11 を決定済みに）, README.md, implementation-contract.md（本書への参照） |

## 8. 厳守
- git の commit / push / stash / checkout / reset / pull をしない（統括が行う）。`prerendered/` を再生成しない。依存を足さない。build.js の `const BLOG = [...]` に触らない。
- 全ブロックは未承認のまま（approved_by 空）。`data/nq-config.json` は api:false のまま。
- Jev のキーは `.env.local` の `JEV_API_KEY`（run.js / tag-articles.js が自分で読む）。値を出力・ログ・文書・コミット対象のファイルに書かない。
- 自分の担当ファイル以外は編集しない。担当外に必要な変更は最終報告の needs_from_others に書く。
- `node build.js` は指示された担当だけが実行する。JSX の構文確認は `npx babel --presets @babel/preset-react <file> > /dev/null`、API のテストは `node --test "api/_lib/*.test.js"`。
