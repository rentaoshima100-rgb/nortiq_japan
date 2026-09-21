# 次ページ提案（nq）人の判断が要る事項

実装は、決まっていない部分を「いちばん害の少ない暫定」で埋めて進めてある。ここはその一覧。
各項目は **現状の暫定実装 ／ 決めてほしいこと ／ 決まったら変える場所** の順に書く。

- A: 設計書13章の未決事項（12個）
- B: 文言とリンク先（承認の前に決めること）
- C: 表示とフロント
- D: 判定・推薦・API
- E: 計測・ログ・学習
- F: まだ手を付けていない章

優先度の目安 — **【承認の前】** ブロックを承認する前に要る ／ **【フェーズ1の前】** `/api/suggest` を本番で開ける前に要る ／
**【フェーズ3の前】** 学習を始める前に要る ／ 印なしは急がない。

最終更新: 2026-09-21

---

## A. 設計書13章の未決事項

### A1. Jev の API キーの取得状況
- **現状**: 取得済み。ローカルの `.env.local`（`.gitignore` 済み）に `JEV_API_KEY` があり、2026-09-20 に直接 API
  （`https://api.typesafe.ai/v1/systemone`、`jev-1.13.0`）で疎通を確認した。Vercel AI Gateway 経由は使っていない
  （Gateway 側の質問 type 名とバージョン固定の方法が公式ページから確定できなかったため）。
- **決めてほしいこと**: 本番のキーを Vercel の env に入れる人と時期【フェーズ1の前】。直接 API のままでよいか。
- **変える場所**: Vercel の Environment Variables（`JEV_API_KEY` `JEV_MODEL`）。Gateway に切り替えるなら `api/_lib/decide.js` の `callJev()`。

### A2. `--c-main` と `--c-accent` の確定値（8章）
- **現状**: 新しい色は足していない。`--nq-main: var(--text)`（黒）、`--nq-accent: var(--accent)`（既存の赤）。
  設計書の橙（#E5602B）はサイトに存在しない色なので使っていない。記事 h2 と blockquote の赤い左線と紛れないよう、カードの左線は黒にしてある。
- **決めてほしいこと**: カードの左線とアクセントの色。
- **変える場所**: `styles.css` 末尾の nq ブロックの1行（`.nq-slot, .nq-bar { --nq-main: …; --nq-accent: …; }`）。

### A3. CtaBar は既存の固定バーを置き換えるか、文言だけ差し替えるか（8章）
- **現状**: 既存の StickyCTA をその場で拡張した。見た目は変えず、ストアが `ct-*` の strong を決めたときだけ文言とボタンを差し替える。
  PC だけ（SP は固定ナビと2段になるので出さない。C2）。設計書の「全幅56px・全ページ」の CtaBar は作っていない（`.nq-bar` の CSS は在るが未使用）。
- **決めてほしいこと**: この方針でよいか。置き換えるなら SP の扱いも同時に決める。
- **変える場所**: `components.jsx` の `StickyCTA`、`styles.css` の `.nq-bar`。

### A4. パッケージ別LPの残り5本の公開順（4章）
- **現状**: 公開済みの2本（`/service/kanri-dantai` `/service/recruit-site`）だけカードが在る。
- **決めてほしいこと**: 公開順。公開のたびにカードを1つ足す（手順は `README.md` 8章）。
- **変える場所**: `lp/service/<name>/`、`data/catalog-pages.json`、`data/blocks.json`、`docs/nq/copy-sources.md`、`eval/sessions.json`。

### A5. プライバシーポリシーの追記文と、専門家への確認（11章）【フェーズ1の前】
- **現状**: 下書きを `docs/nq/privacy-policy-draft.md` に置いた。本番のポリシー（`extra-pages.jsx` の `LEGAL_DATA.privacy`）は変えていない。
  現行のポリシーは Cookie の1項目しか持たず、GA4 と Web Storage の記載が無い。
- **決めてほしいこと**: 追記文の確定、専門家の確認、公開日。`session_log` / `api` / `events_api` を true にするのは公開のあと。
- **変える場所**: `extra-pages.jsx` の `LEGAL_DATA.privacy`（`sections` と `updated`）。必要なら `'privacy-handling'` も。

### A6. ホールドアウトの割合（10章）
- **現状**: 2割（`data/nq-rules.json` の `holdout_rate_default: 0.2`。env `NQ_HOLDOUT_RATE` で上書きできる）。
  `session_id` のハッシュから決定的に決める。遷移率 5%→8% の検出には合計約3,000セッション（月2,000セッションなら約1.5か月ぶん）が要る。
- **決めてほしいこと**: 流入が少ない間も2割のままか、期間を延ばして判断するか。
- **変える場所**: Vercel の env `NQ_HOLDOUT_RATE`（コードの変更は不要）。

### A7. 成果の定義（7章）【フェーズ3の前】
- **現状**: 「カードをクリックし、リンク先を途中離脱せずに読んだ（`nq_engaged`）」を 1、ゴール到達（`nq_goal`）は重み3。ログは半減期60日で重みづけ。
- **決めてほしいこと**: この定義でよいか、ゴール到達だけを成果にするか。ゴール到達は件数が少ないので、後者にすると学習が進むのは遅くなる。
- **変える場所**: `data/nq-rules.json` の `recommend.goal_weight` / `half_life_days`、`api/_lib/learn.js`（学習行の組み立て）。
  定義を変えたら `api/_lib/recommend.js` の `POLICY_VERSION` を上げる（古いログと混ぜないため）。

### A8. 学習済みの重みをクライアント間で引き継ぐことを、契約にどう書くか（7章）
- **現状**: 契約の文面は無い。コード上は、`nq_model.mean` の共有の重み10個（`bias` `rel` `dv` `cov` `ind_match` `need_match` `stage_goal` `slot_end` `slot_next` `revisit`）を
  取り出して、次のサイトの `data/nq-rules.json` の `recommend.prior.mean` に入れれば引き継げる。カード別の補正（`card:*`）と生ログは引き継がない。
- **決めてほしいこと**: 契約の条項。引き継ぐのは「共有の重みだけ」であること、個人に結びつく情報を含まないことをどう書くか。
- **変える場所**: 契約書のひな形。実装の変更は不要。

### A9〜A12. 記事パイプライン（12章）の未決事項
- A9. Search Console API の接続状況と、SERP 上位10件の取得を既存のチェックから使い回せるか。
- A10. タイトルの書き換えを1件ずつ承認するか、週に1回まとめて承認するか。
- A11. 公開枠の配分（強化6〜7割・新規3〜4割でよいか。毎日投稿をやめて週3〜4本にするか）。
- A12. Search Console の生成AIパフォーマンスレポート（2026年6月）を J1 の入力に加えられるか。内容は未確認。
- **現状**: 12章の J1〜J9 は、このリポジトリでは未着手（F2）。別リポジトリ `nortiq-pipeline` の仕事。
- **変える場所**: `nortiq-pipeline` 側。このリポジトリが受けるのは `data/catalog-articles.json` の `overrides.<slug>.mid_before_h2` だけ。

---

## B. 文言とリンク先（承認の前に決めること）

詳細と出典の行番号は `docs/nq/copy-sources.md` の5章にある。**すべてのブロックは `approved_by` が空のまま。**
承認は、人が `copy-sources.md` の表とリンク先のページを照合してから入れる。

### B1. /voice のページ内で「累計30社の支援」と「20+ 支援企業数」が食い違っていた（統合時に修正済み。確認だけ）
- **現状**: 下部リボンのハードコード「20+」（`info-pages.jsx:217`）を `{NORTIQ_STATS.clients}+`（= 30+）に直した。
  `content-data.jsx` の冒頭に「実績の数字はここ一箇所で管理する」とあり、その取りこぼしだったため。
  **nq の承認に関係なく、次のデプロイで /voice の表示が「20+」→「30+」に変わる**（プリレンダの /voice も差分になる）。
- **決めてほしいこと**: 「30+」の表記でよいか（トップのティッカーも `30+`）。よければ `rs-trust` を承認できる。
- **変える場所**: 戻すなら `info-pages.jsx:217`。

### B2. 採用サイトLPの「30万円〜・4週間で公開」と料金表の食い違い（2026-09-21 の料金統一で解消。確認だけ）
- **現状**: 料金表を正とした。金額と期間を並べる箇所（LP の meta description・twitter:description・JSON-LD の WebPage、本体サイトのバナー）は
  「30万円〜（税別）・最短3週間で公開」になり、料金表（30万円〜のライトが3週間、60万円〜のスタンダードが4週間）と合う。
  title と FV タグの「4週間で公開」は、金額と並べない形で残している。
  カード（`sg-recruit-site`）は default が金額だけ、schedule がプラン別の期間で、直す所は無い。
- **決めてほしいこと**: 無し（この文言でよいかの確認だけ）。採用サイトLPのプランの中身と納期の実態は `docs/pricing/open-items.md` の A7・A8 に残っている。
- **変える場所**: 戻すなら `lp/service/recruit-site/index.html` と `components.jsx` の `IndustryLpBanner`。数字を変えたら `npm run pricing:check` で照合する。

### B3. `rs-ai-quality` のリンク先（設計書は /support、実装は /chatbot）【承認の前】
- **現状**: /support に「AIで作る部分と人が確認する部分の分担」の記述が無いので、記述のある /chatbot の FAQ にリンクしている。
  ただし FAQ は「最終的な記事の責任は運用者にあります」と続いており、レビューの主体がツールを使うお客様とも読める。
  不安の定義（AIを使った **制作** の品質）とずれている。
- **決めてほしいこと**: このずれを許容するか、/support に「AIで下地を作り、人が確認する」の節を足してリンク先を設計書どおりに戻すか。
- **変える場所**: `info-pages.jsx`（SupportPage）と `content-data.jsx`、`data/blocks.json` の `rs-ai-quality`、`sg-chatbot` の `ai_quality`。

### B4. `rs-scope` と `ct-diagnostic` のリンク先 /diagnostic の中身
- **現状**: /diagnostic は URL 入力式の自動診断で、「何を頼むべきか整理する」内容ではない。意図に近い /quick-diagnosis は noindex で設計書の対象外。
  文言は「今のサイトの課題と、直す優先順位が無料で分かります。」に寄せ、数字は使っていない。
- **決めてほしいこと**: この約束の内容でよいか。/quick-diagnosis を提案先に加えるか。
- **変える場所**: `data/blocks.json` の `rs-scope`、`data/catalog-pages.json`（/quick-diagnosis の `suggestable`）。

### B5. /diagnostic のページ内の数字の不統一
- **現状**: 47項目・5つの観点・5領域・4領域・60秒・10〜30秒が同じページに混じっている（`extra-pages.jsx` の DiagnosticPage）。カードはどの数字も使っていない。
- **決めてほしいこと**: ページ側の数字をそろえるか。そろったらカードに数字を入れてよい。
- **変える場所**: `extra-pages.jsx`（DiagnosticPage）。

### B6. `sg-kanri-dantai` の schedule「2026年12月末までの着手が目安です。」は期限つき
- **現状**: LP の記載どおり。2027年1月以降は事実と合わなくなる。
- **決めてほしいこと**: LP を書き換える日に同時に直すか、その日に `approved_by` を空に戻して止めるか。担当者と日付。
- **変える場所**: `data/blocks.json` の `sg-kanri-dantai.variants.schedule`。

### B7. 業種の語の表記ゆれ
- **現状**: ラベルは「建設・工務店／小売・EC／製造・インフラ」、サイトの表示は「建築・工務店／小売 / EC／インフラ・製造」。
  カードの表示文言はサイト側の語、`by_industry` のキーと `audience` はラベル側の語にしてある。記事カテゴリは「DX 観察記」（半角スペース入り）。
- **決めてほしいこと**: どちらかにそろえるか。そろえるならサイト側を直すのが安全（ラベルの変更は評価のやり直しを伴う）。
- **変える場所**: `info-pages.jsx`（業種の表示名）または `data/nq-labels.json` ＋ `data/blocks.json` ＋ `data/catalog-*.json` ＋ `eval/sessions.json`。

### B8. `sg-solution` の cost の「〜向けパッケージの目安です」
- **現状**: 「目安」はリンク先に無い語（ページは価格の幅をそのまま表示）。数字は足していない。
- **決めてほしいこと**: 承認時に許容するか。

### B9. /guidebook の「メールで資料が届く」と実装（PDF の直リンク）
- **現状**: ページの説明と実装が合っていない。`ct-guidebook` と `sg-guidebook` は「ダウンロード」とだけ書いてある。
  `nq_goal` は「/guidebook に到達した」をゴールとして数える（フォーム送信ではない）。
- **決めてほしいこと**: ページの説明を直すか。資料DLのゴールを「到達」で数えてよいか（PDF のクリックにするか）。
- **変える場所**: `content-data.jsx`（/guidebook の説明）。ゴールの定義を変えるなら `nq-suggest.jsx` の `pageView` と `info-pages.jsx`。

### B10. `sg-chatbot` の audience を設計書から変えてある
- **現状**: /chatbot の主訴求が「ブログ記事のAI投稿ツール」なので、audience を「AIを使ってブログ記事の作成と更新を省力化したい、
  またはサイトへのAIチャットボット導入を検討している人向け」にした。2つの対象を「または」でつないでいるので、Jev の関連度が広めに出る可能性がある。
- **決めてほしいこと**: 評価（`eval/run.js`）で `sg-chatbot` の適合率が低ければ、カードを2つに分けるか。
- **変える場所**: `data/blocks.json` の `sg-chatbot.audience`。

### B11. `sg-subsidy` と /subsidy の「正直な前提」
- **現状**: /subsidy は単純なHP制作を原則対象外とし、採択保証も不可と明記している。カードは「補助金がホームページ制作に使えるか確認する。」と
  約束を弱めてある。同じページ内に「登録を準備中」と「未登録のため現状できません」が並んでいるのはページ側の問題として残っている。
- **決めてほしいこと**: この強さでよいか。

### B12. 「営業日24時間以内に返信」の表記ゆれ
- **現状**: サイト内で「ご返信します」「24h以内にご返信」「一次返信」などが混じる。`ct-contact` は「初回相談は無料。営業日24時間以内にご返信。」。
- **決めてほしいこと**: サイト側の表記を1つにそろえるか。

### B13. 23個目のブロック `sg-guidebook` を設計書に追記するか
- **現状**: slot-end のデフォルト「資料ダウンロードのカード」に当たるブロックが設計書4章に無いので足した（`selectable:false`。Jev には聞かない）。
- **決めてほしいこと**: 設計書の「22ブロック」を23に直すか。

---

## C. 表示とフロント

### C1. CTAStrip の `onNavigate` 欠落
- **現状**: slot-next が出る9ページ（Web / Chatbot / DX / Works / Voice / Support / Pricing / Company / Staff）には渡した。
  slot-next が出ないページの `CTAStrip` 6か所（`info-pages.jsx` の診断・補助金・資料・ほか）は `onNavigate` 無しのまま。今回の機能には影響しない。
- **決めてほしいこと**: 既存の不具合として、まとめて直すか。
- **変える場所**: `info-pages.jsx`。

### C2. SP の slot-bar
- **現状**: SP には何も出さない（固定ナビと2段になり、過去に問題として撤去した経緯がある）。SP では行6（強いCTA）の判定結果は使われない。
  クライアントは、差し替える先が無いトリガーでは API を呼ばない（SP の T2 は slot-next が在るページだけ）。
- **決めてほしいこと**: SP にも強いCTAの出し先を作るか（例: slot-next の下に CTA のブロックを置く）。
- **変える場所**: `components.jsx`（StickyCTA）、`nq-suggest.jsx`（`slotOpen`）、`styles.css`。

### C3. 静的LP（/service/*）への slot 展開
- **現状**: LP にはスロットが無い。`lp.js` は、既に在るセッションログに閲覧を1件追記するだけ。LP に直接着地したセッションはログが始まらない
  （SPA のページに移った時点で始まる）。`data/catalog-pages.json` の LP の `default_next` は null。
- **決めてほしいこと**: LP の末尾にも提案カードを出すか。LP は素の HTML なので、設計書どおり素の JS で差し替えられるが、別実装になる。
- **変える場所**: `assets/lp/common/lp.js`、`assets/lp/common/*.css`、`lp/service/*/index.html`、`data/catalog-pages.json`。

### C4. slot-bar にも「同じブロックは1セッション2回まで」が効く
- **現状**: バーは各ページで一度スクロールすれば表示されるので、3ページ目以降は strong を受け取っても既定の文言に戻る。設計書5章のルール2どおり。
- **決めてほしいこと**: バーに限って上限を緩めるか。
- **変える場所**: `nq-suggest.jsx` の `applyResponse`。

### C5. slot-end は1スロット1ブロック（「提案カード＋弱いCTA」は未実装）
- **現状**: 設計書5章は slot-end を「提案カード＋弱いCTA」とするが、API の応答は1スロット1ブロック。slot-end には、不安解消ブロックか2枚目のカードのどちらかが入る。
  `ct-*` の `weak` は、StickyCTA の既定の文言としても使っていない（既定は既存のまま）。
- **決めてほしいこと**: 弱いCTAをカードの下に並べるか。並べるなら応答の形（`slots['slot-end'].cta`）から決める。
- **変える場所**: コントラクト 6.1、`api/_lib/rules.js`、`nq-suggest.jsx`、`styles.css`。

### C6. 提案可否が「する」なのにカードが無いページ群
- **現状**: /feature-recruit /feature-analytics /product-* /works-lp-* /works-video /voice /staff /company にはカードが無い
  （`suggestable:false`）。`suggestable` は「対応するブロックが blocks.json に在る」と同じ意味にしてある。
- **決めてほしいこと**: カードを足すか。同業者・学習者向けの `/product-*` のカードは、設計書3章では「関連記事か自社プロダクト」とあるが未実装。
- **変える場所**: `data/blocks.json`、`data/catalog-pages.json`。同業者向けに出すなら `api/_lib/rules.js` の行4。

### C7. フェーズ0で訪問者から見た画面が変わる
- **現状**: 設計書13章は「シャドーモードまで何も変わらない」とするが、ブロックを承認した時点で、記事と中間ページにデフォルトのカードが出る。
  記事の末尾は、本文内の診断リンク・関連記事・赤帯と合わせて CTA が増える。ホールドアウト比較は「デフォルトカード有り」同士の比較になる。
- **決めてほしいこと**: ベースラインの起点を「デフォルトカードを出した日」とすること、記事末尾の CTA を減らすかどうか。

### C8. `nq_engaged` の取りこぼし
- **現状**: 提案先を離れるとき（次のページ表示か pagehide）に読み方を判定して送る。モバイルでタブを閉じたりアプリを切り替えたりすると
  pagehide が来ないことがあり、その分は成果 0 として学習される。修飾キーで別タブに開いた場合も取れない。
- **決めてほしいこと**: 許容するか。許容しないなら、提案先で一定の深さまで読んだ時点で先に送る方式に変える。
- **変える場所**: `nq-suggest.jsx`。

### C9. 細かいもの
- 差し替えの待ち時間 150ms が `nq-suggest.jsx` の `SWAP_MS` と `styles.css` の `--nq-dur-swap` の2か所にある。変えるときは両方。
- `.sticky-cta-close` が赤い楕円に見えるのは既存の CSS の詳細度の問題（今回の変更とは無関係。見た目を変えない方針なので触っていない）。
  当たり判定の 44×44px は、見た目を変えずに `::before` で広げてある。見た目も直すなら `styles.css`。
- スロットの下限の高さ（`styles.css` の `--nq-minh-*-lines`）は、全ブロック×全バリエーション（56個）を実機で測った行数で決めてある
  （〜359px: 見出し2行/本文5行、360〜439px: 2/4、440〜539px: 2/3、540px〜: 1/2）。文言の字数上限や文字サイズを変えたら測り直す。
  360〜439px では、本文3行のカード（大半）の下に1行ぶん（27px）の空きができる。丈をそろえる代わりの割り切り。
  320px 幅で見出しが3行になる1個（`sg-solution` の建設・工務店版 default）だけは、下限より 27px 高くなる。
- クライアントが `/api/suggest` に送る履歴は、直近5件ではなくセッション中の全ページ（最大30件）。サーバが「すでに読んだページ」の除外に使う。
  モデルに渡すのは、サーバが絞った直近5件だけ。
- T3（最後までスクロールして20秒）は第2段階。クライアントにはフックのコメントだけ在り、API とルールは T3 を受けられる。

---

## D. 判定・推薦・API

### D1. RelatedList（`rl-related`）の並びを7章の式にする件
- **現状**: 同カテゴリの新着順（クライアントが決める）。記事ごとの関連度を Jev に聞いていないので、7章の式に入れる特徴量が作れない。
  - v1 の並びは「同カテゴリの未読の新着順」。未読が足りなければ、全カテゴリの未読、既読の順に埋めて常に3本にする（設計書7章「すでに読んだページを除く」）。
  - `session_log` が false の間は、フルリロードで既読の一覧が消え、従来と同じ並びに戻る（害は無い）。
- **決めてほしいこと**: フェーズ3以降の課題として、記事の関連度を聞く（質問が増える）か、共有の重みのうち `dv` / `cov` だけで並べるか。
- **変える場所**: `api/_lib/questions.js`、`api/_lib/recommend.js`、`api/_lib/rules.js` の行4、`nq-suggest.jsx` の RelatedList。

### D2. `NQ_POLICY=ts` を入れる条件と、事前分布のばらつき【フェーズ3の前】
- **現状**: 設計書の事前分布（共有の重みの標準偏差 0.5、`rel` の平均 0.5、カード別の補正 0.35）のまま ts を入れると、学習前は選択がほぼ一様になる
  （抽出した `w_rel` が負になる確率が約16%。本物の blocks の13候補で試すと、関連度が最大でないカードが選ばれる例が出た）。
  そのためフェーズ2までは prior（事前分布の平均で選ぶ）に固定してある。
- **現状（オフポリシー評価の読み方）**: 判断に使うのは `lift_snips` と `ess`。`lift_ips` は重みの打ち切り（`clipped` > 0）があると null になり、
  ts への切り替えにも prior へ戻す条件にも使わない。prior-v1 のログでは、探索で選ばれた行の重み（20×候補数）が必ず上限の 20 で打ち切られ、
  ips が下限になって lift の符号まで逆に出うるため。lift は1枚目のスロットの行だけで出る（slot-end は `ope.by_slot` の参考値）。
  選択肢: `ope_weight_cap` を「候補数 ÷ 探索率」（例 13 ÷ 0.05 = 260）以上にすれば ips は不偏になるが、分散が増える。設計書の 20 のままにしてある。
- **現状（dv / cov の重み）**: `/api/suggest` は prior の間も `nq_model` の `aux`（V と cov）を読み、特徴量 `dv` / `cov` をログに残す（順位は変わらない）。
  ただし `aux` は夜間バッチが作るので、`NQ_LEARN=1` を入れるまでは `dv` / `cov` が 0 の行しか貯まらない。その行で何か月学習しても、この2つの重みは
  事前分布（標準偏差 0.5）のままで、ts に切り替えた直後の抽出に雑音として乗る。手順は `README.md` 5章: `NQ_LEARN=1` はフェーズ2から入れて
  aux を先に育て、ts に切り替える条件に「最新の `nq_model` の `variance.cov` / `variance.dv` が 0.25 から十分に縮んでいること」を足す
  （確認 SQL: `select variance->>'cov', variance->>'dv' from nq_model order by created_at desc limit 1`）。
- **決めてほしいこと**: ts に切り替える条件（表示300回に加えて、オフポリシー評価の `lift_snips` が下回っていないこと、`variance.cov` / `variance.dv` が縮んでいること）。
  「十分に縮んだ」の線（例: 0.1 未満）。標準偏差を小さくするか。`NQ_LEARN=1` をフェーズ2から入れてよいか。
- **変える場所**: `data/nq-rules.json` の `recommend.prior.sd_shared` / `sd_card` / `ope_weight_cap`、Vercel の env `NQ_POLICY` / `NQ_LEARN`。

### D3. 求職者が /recruit を読んだあとも `sg-recruit` が出ていた（統合時に修正済み）
- **現状**: `applyRules()` に `viewedUrls` を渡し、すでに読んだページを指す提案カード（kind: suggest）は不採用（`skipped` の理由は `viewed`）にした。
  行5のカードは `recommend.js` が先に外しているので、効くのは行3の `sg-recruit`。不安解消（`rs-*`）と CTA（`ct-*`）は対象外
  （「次に読むページ」の提案ではないため、既読の /pricing を指す `rs-cost` は出る）。`api/suggest.js` と `eval/run.js` の呼び出しも直した。
- **決めてほしいこと**: `rs-*` も既読なら出さない、にするか（いまは出す）。
- **変える場所**: `api/_lib/rules.js` の `resolve()`。

### D4. 営業・売り込みは閲覧だけでは見分けにくい
- **現状**: 会社概要とスタッフ紹介だけを見るセッションは、営業とも求職者とも取れる。実キーの疎通確認（s48）では「求職者・学生 0.37」で、
  しきい値 0.6 に届かずデフォルトになった（害は無い）。行2（営業 → 何も変えない）が実際に当たる場面は少ないと見込まれる。
- **決めてほしいこと**: シャドーモードのログで確かめたうえで、ラベルの説明文を見直すか（四半期の見直しで）。
- **変える場所**: `data/nq-labels.json` の `visitor_type.criteria`。

### D5. Jev のタイムアウトとコールドスタート【フェーズ1の前】
- **現状**: サーバ側の上限は 900ms（`model_timeout_ms`）、クライアントは 1,200ms。日本のローカルPCからの実測は、新規接続の1回目が 1.6〜4.2 秒、
  接続を使い回すと 0.1〜0.9 秒。Vercel の関数のコールドスタートと新規 TLS 接続が重なる回は、間に合わずデフォルトになる。
- **測り方の注意**: `nq_decisions.latency_ms` は Jev の呼び出しだけの時間で、`model_timeout_ms`（900）で頭打ちになる。関数のコールドスタート、
  ログ書き込みの待ち、往復の通信を含まないので、この列の分布では「1.2秒以内」を判定できない（必ず満たして見える）。
  訪問者から見た応答は、クライアントが呼び出し1回ごとに送る `nq_decide` / `nq_decide_fail`（`nq_events` の `type = 'decide'`。
  1.2秒で打ち切った回も `timeout` として必ず1件）で測る。集計は `supabase/nq_report.sql` の K5。
- **決めてほしいこと**: シャドーモードの K5（`within_1200_rate` と `timeout_rate`）と K4（`model_failed_rate` と `latency_p90_ms`）を見て、
  上限と関数のリージョン（Jev に近づけるか）を決める。K5 だけ悪ければ関数の起動か回線、両方悪ければ Jev。
- **変える場所**: `data/nq-rules.json`（`model_timeout_ms` `client_timeout_ms`）、`vercel.json`（`regions`）。

### D6. レート制限
- **現状**: コードにレート制限は無い（KV を足さず、IP も保存しないため）。入口の防御は Origin の確認・bot の UA・入力検証・1セッション3回（クライアント側）だけ。
  Origin と UA は偽装できるので、よそから叩かれると Jev の原価と `nq_decisions` の行が増える。
  第三者の `*.vercel.app` のページ経由（実ブラウザ・IP 分散）の経路は、Origin の同一オリジン化と Content-Type（`application/json` だけ受ける）で塞いだ。
  curl での偽装は従来どおり Firewall の範囲。
- **決めてほしいこと**: Vercel Firewall で `/api/suggest` と `/api/nq-event` にレート制限のルールを入れるか【フェーズ1の前】。
- **変える場所**: Vercel のダッシュボード（Firewall）。

### D7. コントラクトに明記が無く、実装で補った判断
- 関連度の門（`rel_gate` 0.55）は「いま出せる候補」の最大値で判定する（未承認・既読・業種が決まらないカードの高い関連度では門を通さない）。
- slot-end の (a) で `rs-<不安>` が未承認で置けないときは、(b) の2枚目に回す。1枚目がすでにその不安の variant で答えているなら、2枚目は default。
- T1 で slot-end に `rs-*` が入った判定では、推薦アルゴリズムの2枚目は表示されない。学習とオフポリシー評価は `nq_events` の shown を正とする。
- 2枚目の pool（1枚目とページ群が違う候補）の最大関連度にも `rel_gate` を掛け、未満なら2枚目は選ばない（slot-end は 6.3 の (c) で変えない）。コントラクト 6.4 に追記済み。
- 訪問者タイプで対象外のカードは候補から外す（blocks の `only_visitor_types`。`sg-recruit` は「求職者・学生」だけ。確信度は問わない）。コントラクト 6.2 / 6.4 に追記済み。
- `/api/suggest` に送る履歴から現在のページを外した（T1 は25%地点で走るので、入れると必ず「途中離脱」が付く）。
- ログの `candidates[].propensity` はスロット別のオブジェクト。重みは「名前 → 数値」のマップ（配列ではない）。
- **決めてほしいこと**: 異論が無ければコントラクト（`implementation-contract.md`）の 6.3 / 6.4 に追記する。

### D8. `data/nq-labels.json` の掃除（統合時に対応済み。記録のため）
- 廃止した `next_block` のキーを消し、`rel.instructions`（「この訪問者は次の説明に当てはまる：{audience}」）を labels に移した。
  `api/_lib/questions.js` の定数と同じ文なので、質問文は変わらない（定数は labels が読めないときの予備として残してある）。
- 関連度の指示文を変えるときは `data/nq-labels.json` の `rel.instructions` を直す。変えたら eval/ の評価セットで確認し直すこと。

### D9. Sonnet との比較はしない（決定済み。記録のため）
- 2026-09-20 オーナー決定。`anthropic` プロバイダは削除済みで、`eval/run.js` にも無い。設計書13章の「Jev と Sonnet の比較記事」は、
  このままでは材料が無い。記事を書くなら、別途、評価セットを他のモデルに通す手段が要る（`decide.js` の差し替え口は残してある）。

---

## E. 計測・ログ・学習

### E1. GA4 の履歴から V(ページ) と遷移表の初期値を作る件（13章フェーズ0）
- **現状**: 未着手。`nq_model` が無い間、特徴量 `dv`（ゴール到達率の差）と `cov`（遷移割合の対数比）は 0 で、順位は Jev の関連度の順になる。
  夜間バッチが回り始めれば、自前のログから作られる。
- **決めてほしいこと**: GA4 の「ページ参照元 × ページパス」から初期値を作って入れるか。入れるなら誰が GA4 から書き出すか。
- **変える場所**: `nq_model` に `version: 'ga4-init'` の行を1つ手で入れる（`aux = { V, V_type, cov }`。形は `api/_lib/features.js` と `learn.js` のコメント）。
  `aux` は prior の間も読まれ、特徴量としてログに入る（prior の順位は変わらない。学習済みの重みを使うのは `NQ_POLICY=ts` のときだけ）。

### E2. 事前分布の切片 w0（−3.5 = 成果率3%相当）をフェーズ0の実測で置き換える【フェーズ3の前】
- **現状**: 設計書の初期値のまま。
- **決めてほしいこと**: フェーズ0〜2の `nq_click` → `nq_engaged` の実測の率。`ln(p/(1−p))` を入れる。
- **変える場所**: `data/nq-rules.json` の `recommend.prior.mean.bias`。

### E3. 遷移表の材料が直近5ページに限られる
- **現状**: 夜間バッチは、セッションの最後の判定の `state.閲覧履歴`（直近5件）から遷移を作る。6ページ以上見たセッションの序盤は入らない。
  state に URL が無いので、ページは title から catalog を逆引きしている（同じ title のページと、改題された記事は飛ばされる）。
- **決めてほしいこと**: `nq_decisions` に `viewed_urls` の列を足してよいか（スキーマとログ行の変更）。
- **変える場所**: `supabase/nq_schema.sql`、`api/suggest.js`、`api/nq-train.js`。

### E4. 月次レポートの前提
- 母数は「判定が1回以上あったセッション」。記事を25%まで読まずに帰ったセッションは DB に無い（サイト全体の数字は GA4）。
- しきい値（0.6、0.55）は `supabase/nq_report.sql` に直書き。`data/nq-rules.json` を変えたら SQL も手で直す。
- 見込み客率は「選択だけ」と「確信度0.6以上」の2列。設計書は数え方を定めていない。
- **決めてほしいこと**: どちらの列を正式な見込み客率とするか。

### E5. 13か月保持と月次の集計値
- **現状**: コントラクトに無いテーブル `nq_monthly` と関数 `nq_snapshot_month` / `nq_purge` を足した。削除は日本時間の月単位（実際に残るのは13〜14か月ぶん）。
  定期実行（pg_cron）は設定例をコメントで入れただけで、有効にしていない。
- **決めてほしいこと**: pg_cron を使うか、月次レポートのついでに手で流すか。
- **変える場所**: Supabase の SQL Editor（`supabase/nq_schema.sql` 末尾のコメント）。

### E6. 実際の Supabase / Vercel での検証が済んでいない【フェーズ1の前】
- **現状（Supabase）**: SQL は PGlite（WASM の Postgres）で全文を実行して確かめた。本物の PostgREST が `select=history:state->閲覧履歴` を受け付けるかは未確認
  （受け付けない場合は state 全体を読むフォールバックが在る。転送量が増える）。プレビューは SSO 保護されているので、外からの疎通確認がしにくい。
- **現状（Vercel。catalog.json の同梱）**: `api/_data/catalog.json` は buildCommand（`node build.js`）の生成物で、`.gitignore` の対象。
  `vercel.json` の `includeFiles: "api/_data/**"` で3つの Function への同梱を指定したが、**Vercel 上で実際に入るかは未確認**
  （ビルドと Function のトレースの順序に依るので、実デプロイでしか確かめられない）。入らなかった場合、`api/_lib/data.js` は
  エラーにはせず `data/catalog-pages.json`（46ページ。記事は0件）に落ちる。Vercel の上では、関数の起動ごとに1回
  `[nq] api/_data/catalog.json not bundled; …` をログに出す（ログを見なければ気づけないのは同じ）。そうなると記事は title / topic / タグ無しの
  `{type:'記事'}` だけで Jev に渡り、判定の精度が落ちる。夜間バッチの title → URL の逆引き（遷移表。E3）も記事をすべて取りこぼす。
  catalog に無い記事を title 無しで通すのは正規の経路（公開直後の記事）なので、`nq_decisions.state` を数件見ただけでは異常と見分けにくい。
- **現状（夜間バッチの読み込み）**: `api/nq-train.js` の時刻カーソルの読み込みは、メモリ上の PostgREST もどきでしか確かめていない。
  使っている書式は `created_at=gte.<iso>&created_at=lte.<PostgREST が返した created_at を encodeURIComponent したもの>`、
  `order=created_at.desc,event_id.desc`、`decision_id=is.null&type=eq.goal`。`NQ_LEARN=1` にする前に、Supabase に数行入れた状態で
  `/api/nq-train` を1回叩き、200 と `truncated` がすべて false であることを確かめる。
- **現状（Vercel Cron）**: `vercel.json` の `crons`（毎晩 JST 03:00 に `/api/nq-train`）が実際に呼ばれるかも未確認。
  確認は `README.md` 5章フェーズ3の手順2（翌朝 `nq_model` に1行増える）で行う。`CRON_SECRET` を入れるまでは毎晩 401 が
  ログに残る（無害。`README.md` 5章の注記）。
- **決めてほしいこと**: Supabase のプロジェクトを作る人と時期。シャドーモードの初日に `nq_decisions` に行が入ることを確かめる担当。
  catalog.json の同梱を確かめる担当と時期。確かめ方は次のどちらか（プレビューは SSO 保護で外から叩きにくい）。
  - (a) Vercel のデプロイ詳細（Functions の出力ファイル一覧、または `vercel inspect`）で、`api/suggest` の関数に `api/_data/catalog.json` が入っているかを見る。
  - (b) シャドーモードの初日に、記事に着地した判定のうち title が付いている割合を見る（SQL は `README.md` 5章フェーズ1の手順6）。ほぼ 0% なら同梱に失敗している。
  - (c) Vercel のログに `[nq] api/_data/catalog.json not bundled` が出ていないかを見る。
- **変える場所**: 同梱されていなければ `vercel.json` の `includeFiles`、または catalog.json の置き場と `api/_lib/data.js` の読み方。

### E7. 評価セットの正解ラベルの見直し【フェーズ0 検証】
- **現状**: `eval/sessions.json` の60セッションは LLM が作った下書き。迷うものは `expected.alt` に許容ラベルを並べてある。
  運送・物流と介護・福祉は、単独のページがサイトに無く閲覧から推測できないので、正解に出てこない。`sg-recruit` が正解のセッションも無い（求職者と分かるのは /recruit を見たあとで、その時点で候補から外れる）。
  実キーでは5件だけ通した（疎通の確認）。60件の実行と結果の判断はこれから。
  実行結果（`eval/results/`）は `.gitignore` の対象で、コミットされない（実行のたびに増えるため）。
- **決めてほしいこと**: ラベルを見直す人。しきい値やラベルを変える前後の比較に使う「基準の結果」を1つだけコミットして残すか
  （キーも個人の情報も含まない。残すなら `git add -f` か、`eval/baseline/` のような別の置き場にする）。
- **変える場所**: `eval/sessions.json`。基準の結果を残すなら `.gitignore`。

### E8. 再訪フラグは弱い信号
- Safari の ITP は、スクリプトが書いた localStorage を7日で消す。「再訪」は過少に出る。しきい値の調整のときに、`revisit` に強く依る判断をしない。

### E9. /subsidy を計測上どの層として数えるか
- **現状**: 設計書2章は /subsidy をゴール層に置くが、10章の `nq_goal` は /diagnostic・/guidebook への到達とフォーム送信だけで、
  /subsidy に着いても goal イベントは出ない。どちらにも数えないと、カード `sg-subsidy`（補助金の記事6本の既定カード）の行き先が
  K2（記事→サービス遷移率）にも K3（ゴール到達率）にも入らず、ホールドアウト比較が歪む。暫定として、**計測では中間層と同じに数える**
  （`supabase/nq_schema.sql` の `nq_page_group` が /subsidy を `'goal_info'` に分け、`nq_is_service_group` がそれを含める。
  K2 に入り、K3 には入らない）。特徴量の側（`data/catalog-pages.json` の `type: "goal"`、`goal_proximity = 1`）は設計書2章のまま。
  `NQ.goal('subsidy')` を足す案は採っていない。学習は「クリック後に同じセッションで goal が在れば成果・重み3」とするので
  （`api/_lib/learn.js`）、`sg-subsidy` を押して着いただけの全クリックがゴール到達として学習され、このカードに強く偏るため。
  なお /subsidy にはカードのスロットが無く、到達が拾えるのは `sg-subsidy` を押して途中離脱せずに読んだとき（engaged の `page_url`）と、
  PC で slot-bar の判定・表示がそこで起きたときだけ。ほかの中間ページより少なめに出る。
- **決めてほしいこと**: この数え方でよいか。/subsidy を本当のゴールにするなら、到達ではなく /subsidy の相談ボタン → フォーム送信（既存の `contact`）で数えるのが筋。
- **変える場所**: `supabase/nq_schema.sql`（`nq_page_group` `nq_is_service_group`。流し直せば過去の生ログにも効く）、`supabase/nq_report.sql` の冒頭「前提と限界」。

---

## F. まだ手を付けていない章

### F1. 9章 ジェネラティブ・ビジュアル（Calibrated Drift）
- **現状**: 未着手。使う場所（この機能の紹介LP、技術記事の冒頭、月次レポートの表紙、OG 画像）がどれも未作成で、
  `calibrated-drift-philosophy.md` と p5.js のスケッチもリポジトリに無い。提案カードと記事本文には使わない、という制約だけ守っている。
- **決めてほしいこと**: 紹介LPと月次レポートの体裁を先に決める。橙（`--c-accent`）を使う前提なので、A2 の色の決定が先。

### F2. 12章 記事パイプラインへの組み込み（J1〜J9）
- **現状**: 本体は別リポジトリ `nortiq-pipeline` の仕事で、未着手。`nq_gsc_rows` ほか9テーブルも作っていない。
  このリポジトリ側で用意したのは、J2 が決めた slot-mid の位置を読む口（`data/catalog-articles.json` の `overrides.<slug>.mid_before_h2`）だけ。
  J2 の内部リンク（段落ごとに最大3本）と、リンクごとのクリックを `nq_events` に記録する口は無い。
- **決めてほしいこと**: 導入順（設計書は J1 → J2 → J7 → …）と、Search Console API の接続（A9）。
  パイプラインが `data/catalog-articles.json` を書き換える場合の手順（BLOG と同じくテキスト挿入か、JSON の読み書きか。コミットの衝突をどう避けるか）。

### F3. 5章 T3、フェーズ5 横展開
- T3（slot-bar のみ）は第2段階。横展開は、3章のラベルと4章のブロックを業種ごとに作り替え、共有の重みを引き継ぐ（A8）。どちらも未着手。
