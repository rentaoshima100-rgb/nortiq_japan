# 評価セットの盲検再ラベル（2026-09-21）

- 付けた人: 担当 U6（エージェント）。1人で全件を同じ基準で通した
- 日付: 2026-09-21
- 基準書: `docs/nq/labeling-guide.md`（2026-09-21 確定版）。判断はすべて本書の節番号で示す
- 盲検: **モデル（Jev）の回答、`eval/results/`、`eval/baseline.json`、`docs/nq/eval-2026-09-21.md`、`docs/nq/eval-label-review.md` の3〜6章、`docs/nq/open-decisions.md` の E7・D10・D11、`api/_lib` の Jev 関連コードを見ていない。** `node eval/run.js --provider jev|stub` も実行していない（`--check` だけ）
- **モデルの回答に合わせた修正: 0 件**（見ていないので起こりえない）
- 旧 `expected`・旧 `alt` は、60件すべての新ラベルを scratch に書き終えたあと、本書の差分表を作るためにだけ見た

## 1. 手順（基準書 1.4）

1. 使い捨てのスクリプト（scratch。コミットしない）で `id` `note` `request` と各ページの題・種別だけの作業表を作った。`expected` は写していない
2. id 順に、読み方 → visitor_type → industry → need → stage → cards → concerns → cta_ok の順で付けた。集合にした行は `label_note` に理由を書いた
3. 基準書 6章の型ごとに並べて揃えを確かめた（5章）
4. 旧 `expected` と突き合わせ、変わった行を 2章の表に記録した
5. v2 の形式で `eval/sessions.json` に書いた（`version: 2`。`relevant_cards` `best_card` `alt` は使わない。`label_note` は `expected` の中）
6. 高検討度の 10 件（s61〜s70）を、ページ列を先に決めてから同じ手順で付けた（3章）
7. `node eval/run.js --check` を通した（6章）

`note` は事実の要約に直した（解釈語を消した: s03 s13 s14 s26 s29 s35 s53 s57 s58 s59）。`request` は 1 件も変えていない。

## 2. 変更の記録（旧 expected → 新。変わった行だけ）

visitor_type の「旧」は旧ラベルをそのまま書き、`alt` があれば併記した。「新」の `[a, b]` は許容集合。
5ラベル化だけによる機械的な変更（情報収集中の事業者／発注検討中の事業者 → 事業者、内容が同じ `alt` → 集合、`relevant_cards`／`best_card` → `cards`）は表に入れず、4章で件数だけ示す。

| ID | 軸 | 旧 | 新 | 理由（基準書の節番号と手がかり） |
|---|---|---|---|---|
| s01 | stage | 1 | 0 | 3.4 記事だけなので 0（旧の「費用の記事＝1」は新の4段階に無い） |
| s02 | need | AI導入・チャットボット（alt: 保守・運用） | AI導入・チャットボット | 3.3 題の主題はチャットボット導入。保守・運用の手がかりが題に無い |
| s02 | stage | 1 | 0 | 3.4 記事だけなので 0 |
| s02 | cards | best sg-chatbot／relevant [sg-chatbot] | best sg-chatbot／relevant [sg-chatbot, sg-pricing] | 3.5 題に費用があるので sg-pricing も relevant（手がかりの表）。best は主題のサービス sg-chatbot |
| s02 | concerns | [] | [cost] | 3.6 題に費用があり検索で着地しているので cost |
| s03 | visitor_type | 情報収集中の事業者（alt: 同業者・学習者） | 事業者 | 3.1 (a) 発注側向けの題（自社の広告の費用対効果）を検索で引いた。作る側向けの題ではないので 同業者 は入れない |
| s03 | need | LP制作・改善（alt: 集客・SEO） | LP制作・改善 | 3.3 LP・広告・CPC・費用対効果は LP制作・改善。SEO の手がかりが題に無い |
| s03 | concerns | [cost] | [] | 3.6 題の「費用対効果」は広告費の話で、当社の料金への不安とは読めない（迷ったら付けない） |
| s05 | stage | 1 | 0 | 3.4 記事だけなので 0 |
| s06 | stage | 1 | 0 | 3.4 記事だけなので 0 |
| s07 | need | 新規サイト制作 | [新規サイト制作, サイトリニューアル] | 3.3 「ホームページ制作」は新規かリニューアルか分からないので集合 |
| s07 | cards | best sg-web（alt: sg-works）／relevant [sg-web, sg-works] | best [sg-web, sg-subsidy]／relevant [sg-web, sg-subsidy] | 3.5 stage 1 なので sg-works の手がかり（stage 2 以上）が無い。題の補助金活用から sg-subsidy が relevant。best は題に答える sg-subsidy と主題のサービス sg-web のどちらが上とも言えず集合 |
| s08 | cards | best sg-works／relevant [sg-works, sg-subsidy] | best sg-subsidy／relevant [sg-subsidy] | 3.5 stage 1 なので sg-works の手がかりが無い。sg-pricing は passed、sg-web は現在のページ。残るのは題の補助金から sg-subsidy |
| s09 | stage | 1 | 0 | 3.4 記事だけなので 0 |
| s09 | cards | best sg-pricing（alt: sg-works）／relevant [sg-pricing, sg-works] | best none／relevant [] | 3.5 stage 0 なので sg-pricing・sg-works の stage 手がかりが無く、2本の題にも費用・実績の語が無い。sg-web は passed。relevant が空なので best は none |
| s09 | concerns | [] | [scope] | 3.6 じっくり読んだ題の「事前チェック表」を外注前に決めることと読んで scope |
| s10 | need | 新規サイト制作（alt: サイトリニューアル, 集客・SEO） | [新規サイト制作, サイトリニューアル] | 3.3 業種ソリューションだけが根拠なので 新規／リニューアル の集合。集客・SEO の手がかりが無い |
| s10 | stage | 1 | 2 | 3.4 業種パッケージ（S）を じっくり読んだので 2 |
| s10 | cards | best sg-pricing（alt: sg-web）／relevant [sg-pricing, sg-web] | best sg-pricing／relevant [sg-web, sg-pricing] | 3.5 パッケージ（主題のサービス）を読み実績が現在なので、次は料金（best の選び方 4）。集合にする根拠が無い |
| s10 | concerns | [] | [trust] | 3.6 実績が現在のページなので trust |
| s10 | cta_ok | false | true | 3.7 事業者の確定、stage 2、T2 |
| s11 | need | 集客・SEO（alt: 新規サイト制作） | 集客・SEO | 3.3 題は Web集客 なので 集客・SEO。新規サイト制作の手がかりが題に無い |
| s11 | cards | best sg-solution（alt: sg-works）／relevant [sg-solution, sg-works, sg-cms] | best sg-solution／relevant [sg-solution, sg-cms] | 3.5 stage 0 で題に事例・実績の語が無いので sg-works は手がかり無し。best は業種の記事 → sg-solution（選び方 1） |
| s12 | cards | best sg-solution（alt: sg-lpo）／relevant [sg-solution, sg-lpo, sg-works] | best sg-solution／relevant [sg-solution, sg-lpo] | 3.5 同上（sg-works の手がかり無し）。best は業種の記事 → sg-solution（選び方 1） |
| s13 | stage | 1 | 0 | 3.4 記事だけなので 0 |
| s14 | need | 集客・SEO（alt: AI導入・チャットボット） | [AI導入・チャットボット, other] | 3.3 主題は AI生成記事（AIでの記事作成）→ AI導入・チャットボット。visitor_type が集合なので other を足す |
| s14 | cards | best sg-chatbot（alt: sg-cms）／relevant [sg-chatbot, sg-cms] | best [sg-chatbot, none]／relevant [sg-chatbot] | 3.5 題に SEO・記事更新などの語が無いので sg-cms の手がかりが無い。事業者と同業者の集合なので best は [sg-chatbot, none] |
| s15 | need | AI導入・チャットボット（alt: 集客・SEO） | AI導入・チャットボット | 3.3 じっくり読んだ2本（AI記事の運用、ブログボット）の主題は AIでの記事作成。集客・SEO は従 |
| s15 | cards | best sg-cms（alt: sg-pricing）／relevant [sg-cms, sg-pricing] | best sg-cms／relevant [sg-cms] | 3.5 stage 1 で題に費用の語が無いので sg-pricing の手がかりが無い |
| s16 | stage | 1 | 2 | 3.4 運用サポート（S）を じっくり読んだので 2 |
| s16 | cards | best sg-pricing（alt: sg-works）／relevant [sg-pricing, sg-works] | best sg-pricing／relevant [sg-pricing, sg-works] | 3.5 主題のサービス（/web）が現在なので、次は料金（選び方 4）。集合にする根拠が無い |
| s16 | cta_ok | false | true | 3.7 事業者の確定、stage 2、T2 |
| s17 | stage | 2 | 1 | 3.4 採用サイトLP（S）は流し見、実績は現在のページなので 1 |
| s17 | cards | best sg-pricing／relevant [sg-pricing] | best sg-pricing／relevant [sg-pricing, sg-web] | 3.5 need 採用強化 で採用サイトの制作を調べているので sg-web も relevant（手がかりの表） |
| s17 | cta_ok | true | false | 3.7 stage 1 なので false |
| s18 | cards | best sg-web（alt: sg-works）／relevant [sg-web, sg-works] | best sg-web／relevant [sg-web, sg-works] | 3.5 主題のサービス（/web）が未閲覧なので best は sg-web（選び方 3）。集合にする根拠が無い |
| s18 | concerns | [cost, schedule] | [cost, trust] | 3.6 最短1ヶ月の記事は流し見だけなので schedule を付けない。声が現在のページなので trust |
| s19 | need | サイトリニューアル | [新規サイト制作, サイトリニューアル] | 3.3 記事は流し見なので主題にしない。じっくり読んだ /web からは新規かリニューアルか分からず集合 |
| s19 | cards | best sg-solution／relevant [sg-solution, sg-support] | best sg-solution／relevant [sg-solution] | 3.5 保守・運用の手がかり（題・/support）が無いので sg-support は relevant に入らない |
| s20 | industry | 不動産 | [不動産, 不明・その他] | 3.2 不動産の実績は流し見1回だけなので集合 |
| s20 | cards | best sg-web（alt: sg-solution）／relevant [sg-web, sg-solution] | best sg-web／relevant [sg-web] | 3.5 業種が集合なので sg-solution は候補外（付録 B） |
| s21 | cards | best sg-works／relevant [sg-works] | best sg-works／relevant [sg-web, sg-works] | 3.5 業種特化LPだけが根拠の need（新規／リニューアル）から sg-web も relevant |
| s22 | stage | 3 | 2 | 3.4 ゴール（G）のページが無いので 2（旧の 3 は新の定義に合わない） |
| s22 | cards | best sg-web／relevant [sg-web, sg-support] | best sg-web／relevant [sg-web] | 3.5 保守・運用の手がかりが無いので sg-support は relevant に入らない |
| s23 | stage | 3 | 2 | 3.4 ゴール（G）のページが無いので 2 |
| s23 | cards | best none（alt: sg-support）／relevant [] | best none／relevant [] | 3.5 題に保守の語が無く /support も見ていないので sg-support の手がかりが無い。集合にする根拠が無い |
| s24 | cards | best sg-pricing（alt: sg-web）／relevant [sg-pricing, sg-web] | best sg-pricing／relevant [sg-web, sg-pricing] | 3.5 小売のパッケージ（主題のサービス）が現在で料金が未閲覧なので best は sg-pricing（選び方 4。s10 と同じ付け方） |
| s24 | concerns | [] | [trust] | 3.6 小売の実績を じっくり読んだので trust |
| s25 | industry | 建設・工務店 | [建設・工務店, 不明・その他] | 3.2 採用サイトLPは3業種共通、建設の実績は流し見1回だけなので集合 |
| s25 | cards | best sg-pricing（alt: sg-solution）／relevant [sg-pricing, sg-solution] | best sg-pricing／relevant [sg-web, sg-pricing] | 3.5 業種が集合なので sg-solution は候補外。need 採用強化 で採用サイトの制作を調べているので sg-web が relevant |
| s26 | need | other（alt: 新規サイト制作, サイトリニューアル） | other | 3.3 資料・料金・実績だけで主題のページが無いので other の確定 |
| s26 | stage | 2 | 3 | 3.4 サービス紹介資料（G）に到達しているので 3 |
| s26 | cards | best none（alt: sg-web）／relevant [] | best sg-web／relevant [sg-web] | 3.5 need other で stage 2 以上なので sg-web が手がかりに当たる（手がかりの表） |
| s26 | concerns | [cost] | [cost, trust] | 3.6 実績が現在のページなので trust |
| s27 | cards | best none（alt: sg-support, sg-works）／relevant [] | best none／relevant [] | 3.5 製造・インフラのパッケージは無く、題に保守の語も無い。実績は見たページ。集合にする根拠が無い |
| s27 | concerns | [cost] | [cost, trust, scope] | 3.6 製造の実績を じっくり読んだので trust。題の「進め方」から scope |
| s28 | need | 補助金活用 | [補助金活用, サイトリニューアル] | 3.3 補助金の記事2本の主題は補助金と（実質負担額の）リニューアルで、どちらを頼みたいか分けられない |
| s28 | stage | 2 | 3 | 3.4 補助金活用相談（G）に到達しているので 3 |
| s28 | cards | best sg-web（alt: sg-pricing）／relevant [sg-web, sg-pricing] | best sg-pricing／relevant [sg-pricing, sg-web, sg-works] | 3.5 stage 3 で実績が未閲覧なので sg-works も relevant。題の実質負担額（費用）に直接答えるのは料金（選び方 1） |
| s29 | need | 新規サイト制作（alt: サイトリニューアル） | 新規サイト制作 | 3.3 RFP は表で新規サイト制作 |
| s29 | stage | 2 | 0 | 3.4 記事だけなので 0（記事の内容は stage に効かない） |
| s29 | cards | best sg-web／relevant [sg-web, sg-pricing] | best sg-web／relevant [sg-web] | 3.5 stage 0 で題に費用の語が無いので sg-pricing の手がかりが無い |
| s29 | cta_ok | true | false | 3.7 T1 かつ stage 0 なので false |
| s30 | stage | 2 | 1 | 3.4 DX（S）が現在のページなので 1 |
| s30 | cards | best sg-works（alt: sg-pricing）／relevant [sg-works, sg-pricing] | best none／relevant [] | 3.5 stage 1 なので sg-works・sg-pricing の stage 手がかりが無く、要件定義の題にも費用・実績の語が無い |
| s30 | cta_ok | true | false | 3.7 stage 1 なので false |
| s31 | industry | クリニック・医療 | [クリニック・医療, 不明・その他] | 3.2 クリニックの実績は現在のページだけなので集合 |
| s31 | need | 新規サイト制作 | [新規サイト制作, サイトリニューアル] | 3.3 格安制作は新規かリニューアルか分からないので集合 |
| s31 | cards | best sg-pricing（alt: sg-web, sg-solution）／relevant [sg-pricing, sg-web, sg-solution] | best sg-pricing／relevant [sg-pricing, sg-web] | 3.5 業種が集合なので sg-solution は候補外。best は題の適正価格に答える料金（選び方 1） |
| s32 | industry | 人材 | [人材, 不明・その他] | 3.2 人材の実績は流し見1回だけなので集合 |
| s32 | cards | best sg-solution／relevant [sg-solution] | best none／relevant [] | 3.5 業種が集合なので sg-solution は候補外。料金・実績は見たページ、Web制作は現在で、残る手がかりが無い |
| s34 | need | other（alt: AI導入・チャットボット） | other | 3.3 事業者を含まないラベルは other の確定 |
| s35 | visitor_type | 同業者・学習者（alt: 情報収集中の事業者） | 同業者・学習者 | 3.1 「Good を現実的に取得する」は実装手順の題（作る側向け）で、S・P・W・G を見ていないので 同業者 の確定 |
| s35 | need | other（alt: サイトリニューアル） | other | 3.3 事業者を含まないラベルは other の確定 |
| s35 | cards | best none（alt: sg-web）／relevant [] | best none／relevant [] | 3.5 事業者を含まないラベルは relevant [] ／ best none の確定 |
| s36 | visitor_type | 同業者・学習者 | [同業者・学習者, 事業者] | 3.1 作る側向けの記事から自社プロダクトへ進んだので [同業者・学習者, 事業者]（集合の表） |
| s36 | need | other（alt: AI導入・チャットボット） | other | 3.3 作る側向けの記事の主題は自社の課題ではなく、need の表に当たる主題が無いので other |
| s38 | visitor_type | 同業者・学習者 | [同業者・学習者, 事業者] | 3.1 同上（開発の裏側の記事 → 自社プロダクト） |
| s40 | cards | best none（alt: sg-dx）／relevant [] | best [sg-dx, none]／relevant [sg-dx] | 3.5 need に 業務システム・DX を含むので sg-dx が relevant。事業者と同業者の集合なので best は [sg-dx, none] |
| s40 | concerns | [] | [scope, ai_quality] | 3.6 題の要件定義から scope、AIレビューの精度から ai_quality（じっくり読み検索で着地） |
| s41 | need | other（alt: AI導入・チャットボット） | other | 3.3 事業者を含まないラベルは other の確定 |
| s46 | visitor_type | 求職者・学生（alt: other, 同業者・学習者） | [事業者, 求職者・学生] | 3.1 (d) 読み物から実績（現在のページ）へ進んだので 事業者、採用情報の流し見で 求職者・学生 を足す（集合の表） |
| s46 | need | other | [AI導入・チャットボット, other] | 3.3 visitor_type に 事業者 を含むので、AI活用の読み物から AI導入・チャットボット ＋ other |
| s46 | stage | 0 | 1 | 3.4 実績（W）が現在のページなので 1 |
| s46 | cards | best none／relevant [] | best [sg-chatbot, none]／relevant [sg-chatbot] | 3.5 need に AI導入 を含むので sg-chatbot が relevant。事業者と求職者の集合なので best は [sg-chatbot, none] |
| s46 | concerns | [] | [trust] | 3.6 実績が現在のページなので trust |
| s47 | visitor_type | 求職者・学生（alt: other） | 求職者・学生 | 3.1 採用情報に検索で着地した（途中離脱でもよい）ので 求職者・学生 の確定 |
| s50 | visitor_type | 営業・売り込み（alt: other） | [other, 営業・売り込み, 求職者・学生] | 3.1 会社概要に加えてスタッフ紹介を見ているので 求職者・学生 を足す（集合の表） |
| s53 | visitor_type | other（alt: 情報収集中の事業者, 同業者・学習者） | other | 3.1 other (a) 読み物1本に直接着地。事業者・同業者を支える手がかりが無い |
| s53 | need | other（alt: 業務システム・DX） | other | 3.3 事業者を含まないラベルは other の確定 |
| s54 | visitor_type | other（alt: 情報収集中の事業者, 同業者・学習者） | other | 3.1 other (a) ツール比較の読み物1本に SNS から着地 |
| s54 | need | other（alt: AI導入・チャットボット） | other | 3.3 事業者を含まないラベルは other の確定 |
| s55 | visitor_type | other（alt: 情報収集中の事業者） | other | 3.1 other (b) 記事は途中離脱で根拠にならず、トップは何も言わない |
| s55 | need | other（alt: 保守・運用） | other | 3.3 事業者を含まないラベルは other の確定 |
| s59 | visitor_type | other（alt: 情報収集中の事業者, 同業者・学習者） | other | 3.1 other (a) 読み物1本に外部リンクから着地（再訪は根拠を変えない） |
| s59 | need | AI導入・チャットボット（alt: 業務システム・DX, other） | other | 3.3 事業者を含まないラベルは other の確定 |
| s59 | cards | best sg-dx（alt: none, sg-chatbot）／relevant [sg-dx] | best none／relevant [] | 3.5 事業者を含まないラベルは relevant [] ／ best none |

## 3. 追加した高検討度の 10 件（s61〜s70）

ページ列を先に決め（基準書 7章の目安どおり 2・1・1・2・2・2 件）、そのあと 60 件と同じ手順で付けた。URL は `data/catalog-pages.json` と BLOG に実在するものだけ。T3 は 2 件、`passed` は 1 件（s69）。既存の 60 件とページ列は重ねていない。

| ID | 動き | trigger／ref／visit | ページ列 | visitor_type／industry／need | stage | cards（best／relevant） | concerns | cta_ok |
|---|---|---|---|---|---|---|---|---|
| s61 | 料金 じっくり → 実績 → 無料診断 | T2／google／first | /pricing deep → /works deep → /diagnostic | 事業者／不明・その他／サイトリニューアル | 3 | sg-web／[sg-web] | cost, trust | true |
| s62 | 料金 じっくり → 業種の実績 → 無料診断 | T2／yahoo／first | /pricing deep → /works-build deep → /voice skim → /diagnostic | 事業者／建設・工務店／サイトリニューアル | 3 | sg-solution／[sg-web, sg-solution] | cost, trust | true |
| s63 | サービス じっくり → 料金 → 資料 | T2／direct／first | /web deep → /pricing skim → /guidebook | 事業者／不明・その他／[新規サイト制作, サイトリニューアル] | 3 | sg-works／[sg-works] | （料金は流し見なので cost 無し） | true |
| s64 | 補助金の記事 じっくり → 補助金活用相談 | T2／google／first | /article-homepage-renewal-subsidy-guide deep → /subsidy | 事業者／不明・その他／[補助金活用, サイトリニューアル] | 3 | sg-web／[sg-web, sg-pricing, sg-works] | cost | true |
| s65 | 再訪で料金（流し見） → 実績 → サービス | T2／direct／return | /pricing skim → /works-infra deep → /dx | 事業者／製造・インフラ／業務システム・DX | 2 | none／[] | cost, trust | true |
| s66 | 再訪で料金 じっくり → 業種の実績 → サービス（最後まで） | T3／google／return | /pricing deep → /works-hr deep → /feature-recruit end | 事業者／人材／採用強化 | 2 | sg-solution／[sg-solution, sg-web] | cost, trust | true |
| s67 | 業種パッケージ じっくり → 業種の実績 → 料金 | T2／google／first | /solution-realty deep → /works-realty skim → /pricing | 事業者／不動産／[新規サイト制作, サイトリニューアル] | 2 | sg-web／[sg-web] | cost | true |
| s68 | 費用の記事 → 業種パッケージ じっくり → 業種の実績 じっくり → 料金（最後まで） | T3／yahoo／first | /article-recruit-site-cost-guide deep → /solution-build deep → /works-build deep → /pricing end | 事業者／建設・工務店／採用強化 | 2 | sg-recruit-site／[sg-recruit-site, sg-web] | cost, trust | true |
| s69 | RFP の記事 じっくり → 料金 じっくり → 実績 → 会社概要（passed: sg-web） | T2／google／first | /article-corporate-site-rfp-guide deep → /pricing deep → /works skim → /company | 事業者／不明・その他／サイトリニューアル | 2 | none／[] | cost, trust, scope | true |
| s70 | 選び方の記事 じっくり → 料金 じっくり → 実績 じっくり → 会社概要 | T2／yahoo／return | /article-system-development-company-selection deep → /pricing deep → /works deep → /company | 事業者／不明・その他／業務システム・DX | 2 | sg-dx／[sg-dx] | cost, trust | true |

s65 は「再訪して料金を見た」だけで stage 2 になる型（流し見でも 2）。s68 は `--check` が「一度も出ない」と警告していた `sg-recruit-site` を自然に正解にした。

## 4. 件数のまとめ

軸ごとの変更行（2章の表）: **97 行／60 件中 44 件に変更あり**

| 軸 | 変更行 |
|---|---|
| visitor_type | 11 |
| industry | 4 |
| need | 21 |
| stage | 16 |
| cards | 30 |
| concerns | 10 |
| cta_ok | 5 |

5ラベル化だけによる機械的な変更（表に入れていない）:

| 種類 | 件数 |
|---|---|
| 情報収集中の事業者／発注検討中の事業者 → 事業者（主ラベル） | 32 件 |
| `alt` がもう一方の事業者ラベルだけで、→ 事業者 の確定に畳んだもの | 14 件（上の 32 件に含む） |
| `alt` → 集合（内容が同じ。visitor_type 8・need 8・best 1） | 17 行（s05 s14 s16 s20 s21 s22 s23 s32 s40×3 s48 s49 s51 s52 s57 s58） |
| `relevant_cards`／`best_card` → `cards.relevant`／`cards.best` | 60 件（全件） |

stage の変更 16 行はすべて定義の置き換え（新: 0 記事だけ／1 流し見か現在のページ／2 じっくりか再訪の料金／3 ゴール到達）によるもので、旧の「費用の記事＝1」「RFP の記事＝2」「料金と実績を じっくり＝3」は新の定義に無い。

**人が stage 2 以上と付けた件数**（decisions 2章が先に報告を求めているもの）: 元の 60 件で **15 件**（stage 2 が 13、stage 3 が 2: s10 s16 s18 s19 s20 s21 s22 s23 s24 s25 s26 s27 s28 s31 s32）。追加の 10 件は全部 2 以上（stage 2 が 6、stage 3 が 4）なので、70 件で **25 件**。cta_ok true も同じ 25 件（すべて 事業者 の確定で T2・T3）。

70 件の分布: visitor_type は 事業者 41／同業者・学習者 6／求職者・学生 5／other 6／集合 12（事業者と同業者 4、事業者と求職者 1、other と営業 1、other と営業と求職者 6）。stage は 0×39／1×6／2×19／3×6。

## 5. 揃えの確認（基準書 6章）

| 型 | セッション | 揃え |
|---|---|---|
| 発注側向けの記事に検索で着地（T1） | s01 s02 s03 s04 s05 s06 s11 s12 s13 s29 | 全部 事業者 確定／stage 0／cta_ok false／best は題の問いに答えるカード（費用→sg-pricing、補助金→sg-subsidy、保守→sg-support、業種→sg-solution、それ以外は主題のサービス） |
| 作る側向けの記事に着地 | s33 s34 s35 s37 s39 s41 | 全部 同業者 確定／need other／stage 0／cards none／concerns []／industry 不明 |
| 作る側向けの記事 → 自社プロダクト | s36 s38 | 両方 [同業者・学習者, 事業者]／need other／cards none |
| どちらにも読める記事に着地 | s14 s40 | 両方 [事業者, 同業者・学習者]／need は主題＋other／best は [カード, none] |
| 読み物・統計・時事の記事に着地 | s53（直接）s54（SNS）s59（外部） | 全部 other 確定（検索で来たものは無い） |
| 記事 → 料金（現在のページ） | s07 | 事業者／stage 1／cost／cta_ok false |
| 記事 → サービス（現在のページ） | s08 s15 s30 | 事業者／stage 1／cta_ok false |
| 記事 → サービスか実績を じっくり → 料金 | s16 s18 s20 s27 s31 | stage 2／cta_ok true／trust は実績・声を じっくり読んだか現在のときだけ |
| 業種ページを含む | 確定: s10 s19 s21 s22 s24 s27 s65 s66 s67 s68 s62／集合: s20 s25 s31 s32／不明: s17 | sg-solution は「業種確定・パッケージあり・未閲覧」の s19 s62 s66 だけ候補 |
| 再訪で料金 | s18 s22 s26 s32 s65 s66 | stage 2 以上／cta_ok true |
| ゴールに到達 | s26 s28 s61 s62 s63 s64 | stage 3 |
| 採用情報を含む | じっくり・着地: s42 s43 s44 s45 s47（確定）／流し見: s46（集合） | |
| 会社情報・お知らせ・プロダクト・トップだけ | 集合: s48 s49 s50 s51 s52 s57 s58／確定 other: s56 s60 | stage 0／cards none。s56 は会社情報を見ていないので営業を足さない |
| 記事を途中離脱 | s47（採用情報の例外）s51（実績の途中離脱を無視）s55 | 途中離脱を根拠にしていない |
| `passed` があるもの | s08（sg-pricing）s09（sg-web）s69（sg-web） | relevant・best に入っていない |

揃えのために採った判断（同型を同じ付け方にしたもの）:
- 業種パッケージ（`/solution-*`）と業種特化LP（`/service/*`）は「主題のサービス」として扱い、じっくり読んだか現在のページなら best は料金 → 実績 の順（3.5 の選び方 4）: s10 s21 s24 s25。
- 実績ページ（`/works*`）を1つでも見ていれば、業種が集合でも sg-works は候補から外した（「実績をまだ見ていない」に当たらない）: s20 s25 s32。
- `/works-ai` は業種を指さない（付録 B の業種版に無い）: s46 s58。

## 6. `node eval/run.js --check` の結果

```
評価セット: 70 件（実行できる 70・誤り 0・注意 0）／ 形式 v2×70（file version 2）
質問数: 最小 23 ・最大 37 ・平均 28（上限 40）
? 網羅: best/relevant に一度も出ないカード: sg-kanri-dantai sg-recruit
```

残った警告 2 つは構造上の制約で、セッションを足しても消えない（`_comment` にも書いた）:
- `sg-recruit`: 求職者と分かるのは `/recruit` を見たあとで、その時点で候補から外れる。
- `sg-kanri-dantai`: 業種 外国人材 の手がかりは `/service/kanri-dantai` だけ（題に監理団体・技能実習を含む記事が BLOG に無い）で、見た時点で候補から外れる。

## 7. 迷った点（評価担当・オーナーに見てほしいところ）

いずれも基準書のとおりに付けたが、基準書の解釈に幅がある。直すなら基準書を直してから該当行を直す（結果を見ながらは直さない）。
- s09 concerns scope: 「失敗の原因と対策｜事前チェック表」を「外注前に決めること」と読んだ。読まなければ []。
- s46 visitor_type: 読み物 → 実績（現在）で 3.1 (d) により 事業者 を含めた。(d) を「発注側向け・どちらにも読める記事」に限るなら [other, 求職者・学生]。
- s36 s38 need: 作る側向けの記事 → プロダクトの集合で、need を other の確定にした（表に当たる主題が無い）。「AI導入・チャットボット ＋ other」と読む余地もあるが、その場合は sg-chatbot の手がかりが「作る側向けの LLM の記事」になり 3.5 と矛盾する。
- s07 best: [sg-web, sg-subsidy] の集合。題の「補助金活用」を従と見るなら sg-web の確定。
- s14: 「AI生成記事のスパムアップデート対策」を どちらにも読める と分類した（desc に「実装者の視点」とある）。発注側向けと見るなら 事業者 の確定、need AI導入・チャットボット、best sg-chatbot。

`request` の不備は見つからなかった（URL・履歴・reach・passed は全件が `_comment` の条件を満たす）。
