# 次ページ提案（nq）運用手引き

記事を読んでいる人の閲覧行動を Jev（TypeSafe AI の判定モデル）で分類し、**事前に承認した文言のブロック** の中から
「次に見せる1枚」を選んで出す仕組み。画面に出る文章が実行時に作られることはない。決めるのは「どれを出すか」だけ。

- 取り決め（ファイルの持ち主・データ形式・API の形）: [`implementation-contract.md`](implementation-contract.md) ← **これが正**
- 人の判断が要る事項: [`open-decisions.md`](open-decisions.md)
- 文言の出典表（承認のときに照合する）: [`copy-sources.md`](copy-sources.md)
- Jev の API メモ: [`jev-api-notes.md`](jev-api-notes.md)
- プライバシーポリシー追記の下書き: [`privacy-policy-draft.md`](privacy-policy-draft.md)

> **いまの状態（2026-09-20）。** コードは入っているが、**何も表示されず、何も通信しない**。
> 23ブロックがすべて未承認（`approved_by` が空）で、`data/nq-config.json` の `api` / `session_log` / `events_api` は false、
> Vercel の `NQ_ENABLED` も未設定。下の「フェーズごとのスイッチ」を上から順に入れていく。

---

## 1. 全体像

```
data/*.json（人が書く）
   │  blocks.json（文言と承認）／catalog-pages.json・catalog-articles.json（ページの説明）
   │  nq-labels.json（分類のラベル）／nq-rules.json（しきい値）／nq-config.json（クライアントの動作モード）
   ▼
build.js（ビルド）
   │  ・承認済みの文言だけを window.NORTIQ_NQ として app.bundle.js の先頭に入れる
   │  ・記事本文に slot-mid のマーカー <!--nq-slot-mid--> を入れ、est_read_sec / nq_block を記事メタに足す
   │  ・api/_data/catalog.json を生成する（/api/suggest が URL から title などを引き直す表）
   │  ・assertNq() で data/*.json を検証する（不備は warn。NQ_STRICT=1 で throw）
   ▼
クライアント（nq-suggest.jsx の window.NQ と <NqSlot>）
   │  ・初回描画は必ずデフォルトのブロック。プリレンダにはこれが焼き込まれる
   │  ・T1（記事を25%スクロール）／T2（2ページ目以降）で /api/suggest を呼ぶ（config.api が true のときだけ）
   │  ・まだ画面に入っていないスロットだけ、150ms のフェードで差し替える
   │  ・nq_shown / nq_click / nq_engaged / nq_dismiss / nq_goal と、/api/suggest の往復の結果
   │    （nq_decide / nq_decide_fail）を GA4 と /api/nq-event に送る
   ▼
POST /api/suggest（api/suggest.js）
   │  入口の防御 → 状態の組み立て（state.js。URL と列挙値から日本語の状態を作る）
   │  → 質問の組み立て（questions.js。3軸＋検討度＋不安5つ＋cta_ok＋カードごとの関連度 rel_*）
   │  → 判定（decide.js。Jev を1回だけ呼ぶ）
   │  → 推薦（recommend.js。関連度を事前知識に、期待値で順位をつけて探索つきで選ぶ）
   │  → 出し分けルール（rules.js。営業・求職者・同業者の扱い、文言の選択、slot-bar）
   │  → 記録（log.js → Supabase の nq_decisions）→ 応答
   ▼
Supabase（nq_decisions / nq_events / nq_model / nq_transitions / nq_monthly）
   ▼
GET /api/nq-train（Vercel Cron。毎晩 JST 03:00。NQ_LEARN=1 のときだけ動く）
      ログから重みを学習し直して nq_model に1行足す → /api/suggest は方策によらずそれを読む
      （prior は aux = V と cov だけを特徴量に使う。学習済みの重みを使うのは NQ_POLICY=ts のときだけ）
```

どこで失敗しても、結果は「デフォルトのまま」になる。/api/suggest はどんな失敗でも 200 で `default:true` を返し、
クライアントは 1.2 秒で待つのをやめる。

---

## 2. ファイル一覧

| ファイル | 役割 |
|---|---|
| `data/blocks.json` | ブロックの文言と承認。**`approved_by` が空の文言は、バンドルにも API にも入らない** |
| `data/catalog-pages.json` | 記事以外の全ページの type・タグ・`default_next`（ページ末尾に出すデフォルトのカード） |
| `data/catalog-articles.json` | 記事のカテゴリ別の既定カードと、記事ごとの上書き（`overrides`）。`mid_before_h2` もここ |
| `data/nq-labels.json` | 訪問者タイプ・業種・ニーズ・検討度・不安のラベルと Jev に渡す説明文 |
| `data/nq-rules.json` | しきい値、タイムアウト、各種上限、推薦アルゴリズムの事前分布 |
| `data/nq-config.json` | クライアントの動作モード（`enabled` `ga_events` `session_log` `api` `events_api`） |
| `build.js` | 上の「ビルド」の処理。`const BLOG = [` には触らない |
| `nq-suggest.jsx` | `window.NQ`（セッションログ・トリガー・計測）と `<NqSlot>` |
| `components.jsx` `extra-pages.jsx` ほか | スロットの組み込み（記事の slot-mid / slot-end、赤帯の前の slot-next、StickyCTA の slot-bar） |
| `assets/lp/common/lp.js` | 静的LPの閲覧を、既に在るセッションログに1件追記する |
| `styles.css`（末尾の nq ブロック） | `.nq-*` の見た目。色は既存の変数への別名だけ |
| `api/suggest.js` `api/nq-event.js` `api/nq-train.js` | 判定／イベントの受け口／夜間学習 |
| `api/_lib/*.js` | 判定の部品（純関数が中心）。`*.test.js` は `npm test` で回る |
| `api/_data/catalog.json` | build.js の生成物（`.gitignore` 対象。コミットしない） |
| `supabase/nq_schema.sql` `supabase/nq_report.sql` | テーブル定義／月次レポートと KPI のクエリ |
| `eval/sessions.json` `eval/run.js` | 評価セット（60セッションの下書き）と評価ランナー |
| `docs/nq/` | この手引きと関連文書 |

---

## 3. ブロックを承認して表示を始める手順

承認がこの機能のキルスイッチ。下書きのまま本番に出ても、サイトの見た目は1pxも変わらない。

1. `docs/nq/copy-sources.md` を開き、承認したいブロックの行を見る。variant ごとに「文言で使った表現」「リンク先の原文」
   「出典（file:line）」が並んでいる。
2. **リンク先のページを実際に開き、数字（価格・期間・件数）が一字一句そろっているか確かめる。** ページ側が変わっていたら、
   先にどちらを正とするか決める。`open-decisions.md` の「文言とリンク先」に、承認の前に決めることが残っている
   ブロックがある（`rs-trust` `sg-recruit-site` `rs-ai-quality` `rs-scope` `sg-kanri-dantai` の schedule `sg-solution` の cost）。
3. 設計書11章の「使わない表現」（行動の言い当て・AIの強調・効果の断定・緊急性のあおり・他社比較）に当たらないか読む。
4. `data/blocks.json` の該当ブロックに承認者と日付を入れる。
   ```json
   "approved_by": "oshima",
   "approved_at": "2026-10-01",
   ```
   - ブロック単位で入れると、そのブロックの全 variant（`by_industry` の業種版を含む）が承認済みになる。
   - 一部の variant だけ承認するなら、ブロック単位は空のままにして、variant の中に `approved_by` / `approved_at` を入れる。
   - **基準の文言（`default`。CTA は `weak`）が未承認だと、ブロックごと配信されない。** まず default を承認する。
   - `approved_by` / `approved_at` は **文字列** で書く。未承認は `""`（または `null`）。`false` / `0` など文字列以外の値は
     未承認として扱われ、ビルドが「approved_by は文字列で書いてください」と警告する。
5. 最初に承認するとよい順番（デフォルトとして全員に見えるものから）:
   `sg-guidebook`（slot-end のデフォルト）→ 記事カテゴリの既定カード（`sg-web` `sg-dx` `sg-chatbot` `sg-cms` `sg-lpo` `sg-pricing` `sg-support` `sg-subsidy`）
   → `sg-works`（`sg-pricing` と並んで slot-next のデフォルト）→ 残りの `sg-*` → `rs-*` → `ct-*` → `rl-related`。
6. ローカルで確認する（4章）。ビルドログに `!` で始まる行が出ていないか見る。
7. コミットして push する。`data/**` の変更で GitHub Actions のプリレンダが走り、スナップショットにデフォルトのカードが焼き込まれる。
   **`prerendered/` をローカルで再生成してコミットしない。**
8. 表示を始めた日を記録しておく（ベースラインの起点。GA4 の `nq_shown` / `nq_click` が `is_default:true` で入り始める）。

承認を取り消すときは `approved_by` を空に戻して push する。そのブロックはバンドルからも API の候補からも消える。

---

## 4. ローカル確認

```bash
# 承認済みの文言だけで確認（本番と同じ）
node build.js
npm run serve            # http://localhost:5173

# 未承認の下書きも表示して見た目を確認（ローカル専用）
NQ_INCLUDE_UNAPPROVED=1 node build.js
npm run serve
```

- `NQ_INCLUDE_UNAPPROVED=1` は **ローカルの見た目確認のためだけのもの**。Vercel と CI では変数が立っていても無視される。
  ビルドログに目立つ警告が出る。この状態の `dist/` をどこにも上げない。
- この状態の `dist/` に対して `npm run build:full` / `node build-prerender.js` を実行しない。実行しても build-prerender.js が
  bundle の1行目の印（`unapproved: true`）を見てエラー終了し、`prerendered/` には何も書かれない。
  未承認モードのビルドでは「prerendered/ が古い」の警告は出ない。
- 通常ビルドで「prerendered/ が古い」と出ても、ローカルで再生成しない。main に push すると CI（prerender.yml）が再生成する。
  `npm run prerender:check` は、スナップショットに未承認のブロックが焼き込まれていないかも検査する。
- PowerShell では `$env:NQ_INCLUDE_UNAPPROVED = '1'; node build.js`。終わったら `Remove-Item Env:NQ_INCLUDE_UNAPPROVED`。
- ローカルビルドはルート直下の `articles.js` を書き換える。作業の最後に `git checkout -- articles.js` で戻す。
- データの検証を厳しくして確かめるなら `NQ_STRICT=1 node build.js`（人が書くファイルの不備が throw になる）。
- 見る場所: 記事の本文の途中（slot-mid）と末尾（slot-end）、サービス・実績・料金などのページ末尾の赤帯の直前（slot-next）。
  StickyCTA（slot-bar）は既定の見た目のまま。
- API のテスト: `npm test`（= `node --test "api/_lib/*.test.js"`。Node 24 では `node --test api/` は失敗する）。
- `npm run serve` は静的配信だけなので `/api/suggest` は動かない。API まで通すなら `vercel dev` を使い、`.env.local` に
  `NQ_ENABLED=1` などを置く（`.env.local` は `.gitignore` 済み。コミットしない）。

---

## 5. フェーズごとのスイッチ（設計書13章）

スイッチは2か所にある。

- **クライアント側: `data/nq-config.json`**（コミットして反映。バンドルに入るのでプリレンダの CI が走る）
- **サーバ側: Vercel の Environment Variables**（変更は次のデプロイから効く。変えたら Redeploy する）

クライアントのフラグを Vercel の env からバンドルに注入してはいけない（CI のビルドと Vercel のビルドでバンドルのハッシュが
食い違い、`prerendered/` が常に古い扱いになる）。

| フラグ / env | 意味 | 初期値 |
|---|---|---|
| config `enabled` | false にするとスロットを一切描画しない（デフォルトのカードも消える） | true |
| config `ga_events` | `nq_*` イベントを GA4 に送る | true |
| config `session_log` | セッションログを sessionStorage に、再訪フラグを localStorage に書く。false の間は Storage に触れず、メモリ上だけで動く | false |
| config `api` | `/api/suggest` を呼ぶ | false |
| config `events_api` | `/api/nq-event` にイベントを送る（Supabase の `nq_events`） | false |
| env `NQ_ENABLED` | `1` のときだけ API が動く。それ以外は何も呼ばずに即デフォルト | 未設定 |
| env `NQ_SHADOW` | `1` なら判定と記録だけ行い、応答は `default:true, shadow:true` | 未設定 |
| env `NQ_HOLDOUT_RATE` | 常にデフォルトを返すセッションの割合 | 未設定（= 0.2） |
| env `NQ_POLICY` | `prior`（事前知識だけで選ぶ）/ `ts`（学習済みモデルからトンプソン抽出） | 未設定（= prior） |
| env `NQ_LEARN` | `1` のときだけ夜間バッチが学習する | 未設定 |
| env `CRON_SECRET` | 夜間バッチの認証。Vercel Cron がこの値を `Authorization: Bearer` に付けて呼ぶ。未設定の間は毎晩 401（下の注記） | 未設定 |
| env `NQ_MODEL_PROVIDER` | `stub`（外部を呼ばない。常にデフォルトになる）/ `jev` | 未設定（= stub） |
| env `JEV_API_KEY` / `JEV_MODEL` | Jev のキーとモデル。モデルは `jev-1.13.0` のように固定する（`jev-latest` は使わない） | 未設定 |
| env `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | 未設定なら何も記録しない | 未設定 |

> **`CRON_SECRET` と夜間 Cron の 401。** `vercel.json` の `crons` は、本番にデプロイした日から毎晩 JST 03:00 に `/api/nq-train` を呼ぶ。
> `CRON_SECRET` が未設定の間、この呼び出しは `401 unauthorized` で終わり、Vercel のログに毎晩1件残る
> （認証は `NQ_LEARN` の確認より先。未設定なら誰も通さない作りで、何も読まず何も書かないので無害）。
> ログを汚したくなければ、**最初のデプロイの時点で `CRON_SECRET`（16文字以上のランダム値）を入れておく**。
> `NQ_LEARN` が未設定なら `200 {"ok":true,"skipped":"disabled"}` を返して何もしない。
> フェーズ3より前の 401 は故障ではない。フェーズ3以降の 401 は `CRON_SECRET` の入れ忘れか値の食い違いを疑う。

### 有効化の順番

**フェーズ0 準備（表示は変わるが、通信はしない）**
1. ブロックを承認する（3章）。デフォルトのカードが4スロットに出る。
2. `ga_events: true` のまま、GA4 で `nq_shown` / `nq_click`（`is_default:true`）のベースラインを取り始める。GA4 のカスタムディメンションを登録する（7章）。
3. `session_log` は false のまま。プライバシーポリシーの追記を公開するまで true にしない。
4. `session_log` が false の間、`nq_goal` の重複排除はメモリ上だけで行う。フルリロード（再読み込み、記事の本文内リンク、
   静的LPとの行き来）をまたぐと、同じ goal がもう一度送られうる。GA4 のベースラインは、**イベント数ではなく `nq_goal` を含むセッション数** で数える。
   `session_log` を true にすれば `goals` が sessionStorage に残り、1セッション1回になる。
5. 配信ブロックが1つも無い間（承認ゼロ）は、クライアントのランタイムは何もしない（`nq_goal` も送らない）。
   ベースラインが入り始めるのは、最初のブロックを承認してデプロイした日から。

**フェーズ0 検証（本番には何も出さない）**
1. `eval/sessions.json` の正解ラベルを人が見直す（LLM の下書きなので、そのまま使わない）。
2. `node eval/run.js --provider jev --out eval/results/<日付>.json` を回す（キーは `.env.local` の `JEV_API_KEY`）。
3. 完了の条件: 訪問者タイプの一致が8割以上。Sonnet との比較は行わない（2026-09-20 オーナー決定）。

**フェーズ1 シャドーモード（判定と記録だけ。表示は変えない。1週間）**
1. プライバシーポリシーの追記を公開する（`privacy-policy-draft.md`。専門家の確認を先に済ませる）。
2. Supabase を準備する（6章）。すでに `nq_schema.sql` を流してある場合も、**最新のものをもう一度流す**
   （`nq_events` に `result` / `latency_ms` の列が足される。足さないまま始めると、下の手順5で使う decide の行だけが
   PostgREST に 400 で弾かれ、Vercel のログに `[nq] log http nq_events 400` が出る。ほかのイベントは影響を受けない）。
3. Vercel の env を入れて Redeploy: `NQ_ENABLED=1` `NQ_SHADOW=1` `NQ_MODEL_PROVIDER=jev` `JEV_API_KEY` `JEV_MODEL=jev-1.13.0`
   `SUPABASE_URL` `SUPABASE_SERVICE_ROLE_KEY`。`NQ_POLICY` と `NQ_LEARN` は入れない。
4. `data/nq-config.json` の `session_log` `api` `events_api` を true にしてコミットする。**必ず 3 のあとに行う**
   （先にクライアントを開けると、API が毎回デフォルトを返すだけの無駄な通信になる）。
5. 完了の条件: `nq_decisions` を50件目視して明らかな誤りが1割未満。**応答の9割が1.2秒以内**。
   - 測るのは、ブラウザが数えた `/api/suggest` の往復。クライアントは呼び出し1回につき必ず1件、結果を送る:
     採用できる応答が届けば `nq_decide`、1.2秒（`client_timeout_ms`）で打ち切った回・HTTP エラー・JSON でない応答・通信の失敗は
     `nq_decide_fail`（`reason` = timeout / http / format / network）。どちらにもブラウザで測った `latency_ms` が付く。
     `events_api` が true なら、同じ内容が `nq_events` に `type = 'decide'`（`result` = ok / timeout / …）で入る。
   - 判定は **`supabase/nq_report.sql` の K5** の `within_1200_rate` が 0.9 以上か（期間はシャドーの1週間に合わせて `p` を書き換える）。
     GA4 で見るなら、イベント数の `nq_decide ÷ (nq_decide + nq_decide_fail)`。広告ブロックは両方を同じ率で落とすので、比は保たれる。
   - **`nq_decisions.latency_ms` では判定できない。** あれは Jev の呼び出しだけの時間で、`model_timeout_ms`（900）で頭打ちになり、
     関数の起動待ち（コールドスタート）・ログの書き込み・往復の通信を含まない。必ず 1200 未満になるので、条件が常に満たされて見える。
     こちらは「遅い原因が Jev かどうか」の切り分けに使う（K4 の `model_failed_rate` と `latency_p90_ms`）。
   - 0.9 に届かないとき: K5 の `timeout_rate` が高く K4 の `model_failed_rate` が低ければ、遅いのは関数の起動か回線
     （`vercel.json` の `regions` を見直す）。両方高ければ Jev（`data/nq-rules.json` の `model_timeout_ms`、`jev-api-notes.md` の実測メモ）。
   - ページを閉じて応答を待たなかった回は、どちらのイベントにもならない（分子にも分母にも入らない）。
6. 完了の条件（初日に見る）: `api/_data/catalog.json` が Function に同梱されていること。ビルドの生成物なので、同梱に失敗しても
   エラーにならず、記事が title / topic / タグ無しの `{type:'記事'}` だけで Jev に渡る（`open-decisions.md` E6）。
   次の SQL で、記事に着地した判定のうち title が付いている割合を見る。ほぼ 0% なら同梱に失敗している
   （公開直後で catalog に無い記事は title 無しが正常なので、100% にはならない）。
   ```sql
   select count(*) filter (where state -> '着地ページ' ? 'title') as with_title, count(*) as decisions
   from public.nq_decisions where state -> '着地ページ' ->> 'type' = '記事';
   ```

**フェーズ2 本番適用（事前知識のみ）**
1. `NQ_SHADOW` を外して Redeploy。`NQ_POLICY` は **未設定（prior）のまま**。8割に適用、2割はホールドアウト。
   - あわせて `CRON_SECRET` と `NQ_LEARN=1` もここで入れておくとよい（夜間バッチが毎晩 `nq_model` に1行足す）。
     prior の間、学習済みの重みは順位に使われない。使われるのは `aux`（V と cov）だけで、ログの特徴量 `dv` / `cov` に値が入り始める。
     フェーズ3まで入れずにいると、`dv` / `cov` が 0 の行しか貯まらず、この2つの重みが未学習のまま ts に切り替わる（`open-decisions.md` D2）。
2. シャドーのログを見て、しきい値を1回調整する（9章）。
3. 完了の条件: しきい値を1回調整済み。表示の不具合なし。

**フェーズ3 学習開始**
1. 個別化した表示が **300回** たまったことを確かめる。
   ```sql
   select count(*) from public.nq_events e join public.nq_decisions d using (decision_id)
   where e.type = 'shown' and e.block_id like 'sg-%' and d.is_default = false
     and d.slots -> e.slot ->> 'block_id' = e.block_id;
   ```
   最後の条件は、判定が選んだカードが実際にそのスロットに出た表示だけを数えるためのもの。個別化を返した判定でも、
   クライアントが差し替えを見送ってデフォルトを出すことがある（同じブロックが1セッション2回を超えた、など）。
   `nq_events` の `decision_id` は、デフォルト表示でも応答のあとに画面へ入ったスロットなら付いているので、
   `decision_id` の有無では個別化かどうかを分けられない（`supabase/nq_report.sql` の「前提と限界」）。
2. `CRON_SECRET` が入っていることを確かめ（無ければ入れる。env の表の下の注記）、`NQ_LEARN=1` にして Redeploy（フェーズ2で入れてあれば確認だけ）。
   翌朝 `nq_model` に1行増えていること、`ope`（オフポリシー評価）の
   「学習後の順位」が「関連度だけの順位」を下回っていないことを確かめる（`supabase/nq_report.sql` の指標7）。
   - 判断に使うのは **`lift_snips` と `ess`**（と `learned_clipped`）。`lift_ips` は、重みの打ち切り（`clipped` > 0）が1行でも在ると null になる。
     prior-v1 のログでは探索で選ばれた行が必ず打ち切られるので、ほぼ常に null。ts への切り替えにも、prior へ戻す判断にも使わない。
   - lift は1枚目のスロット（slot-mid / slot-next）の行だけで出る。slot-end は `ope.by_slot` に参考値として分けてある。
3. 数日ぶん確かめてから `NQ_POLICY=ts` にして Redeploy。
   **学習データが少ないうちに ts を入れると、選択がほぼ一様になる**（事前分布のばらつきが関連度の差より大きいため）。
   下回った月は `NQ_POLICY` を外して prior に戻す。
   - 切り替えの前に、最新の `nq_model` の `variance.cov` / `variance.dv` が事前分布の 0.25 から十分に縮んでいることも確かめる
     （縮んでいなければ、`dv` / `cov` の重みが未学習で、ts の抽出に標準偏差 0.5 の雑音がそのまま乗る）。
     ```sql
     select variance ->> 'cov' as var_cov, variance ->> 'dv' as var_dv from public.nq_model order by created_at desc limit 1;
     ```

**夜間バッチと判定の監視（Vercel のログ）**
- `[nq] train truncated` — 夜間バッチが読み込みを途中で打ち切った（ページ上限 300、または読み込みの持ち時間 30秒）。失敗にはせず、
  読めたぶんで学習している。毎晩出るなら行数が増えすぎている。
- `[nq] model stale_days N` — `NQ_POLICY=ts` で、最新の `nq_model` が3日より古い。夜間バッチが止まっている（重みは使い続ける）。
- `[nq] jev out_of_range <個数>` — Jev の応答に 0〜1（score は 0〜段階数−1）の外の数値があった。その値は「回答なし」として扱う。
  `JEV_MODEL` を変えた直後や、Gateway 経由に切り替えた直後はこの行を確認する。
- `[nq] api/_data/catalog.json not bundled` — catalog.json が Function に同梱されていない（`open-decisions.md` E6）。
- `[nq] log http nq_events 400` — Supabase のスキーマが古い（`nq_schema.sql` を流し直す）。

**フェーズ4 運用** — 月初に `supabase/nq_report.sql` のクエリを SQL Editor に1つずつ貼って月次レポートを作る。
other・低確信が2割を超えた軸は、ラベルの見直しかブロックの追加を検討する（ラベルの変更は四半期に1回にまとめる）。

---

## 6. Supabase の準備

1. プロジェクトを作る（既存のプロジェクトに同居させてもよい。テーブルはすべて `nq_` で始まる）。
2. SQL Editor に `supabase/nq_schema.sql` を貼って1回実行する。何度流しても同じ結果になる。
   リポジトリの `nq_schema.sql` が変わったら（列や関数の追加）、同じように流し直す。
   全テーブルが RLS 有効・ポリシー無しで、`service_role` キー以外からは1行も読み書きできない。
3. Project Settings → API の URL と `service_role` キーを、Vercel の `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` に入れる。
   **`service_role` キーはブラウザにもリポジトリにも出さない。**
4. 13か月より前の生ログの削除と月次の集計値の保存は、`nq_schema.sql` 末尾のコメントにある pg_cron の設定を手で流すか、
   月次レポートのついでに `select public.nq_purge(13);` を流す。
5. 保存しないもの: IP アドレス、User-Agent の全文、フォームの入力内容、Cookie などの永続 ID。

---

## 7. GA4 のカスタムディメンション

`nq_decide` `nq_decide_fail` `nq_shown` `nq_click` `nq_engaged` `nq_dismiss` `nq_goal` が、同じ名前で GA4 にも送られる。
GA4 の管理 → カスタム定義で、**イベントスコープ** のディメンションとして次の7つだけを登録する。

| パラメータ | 内容 |
|---|---|
| `slot` | slot-mid / slot-end / slot-next / slot-bar |
| `block_id` | sg-web など |
| `variant` | default / cost など |
| `trigger` | T1 / T2 / T3 |
| `is_default` | デフォルト表示か |
| `policy` | prior-v1 / ts-v1 |
| `reason` | `nq_decide_fail` の理由。timeout / http / format / network |

`nq_decide` / `nq_decide_fail` の `latency_ms`（ブラウザで測った `/api/suggest` の往復時間）は、分布を GA4 で見たいときだけ
**カスタム指標**（単位: ミリ秒）として登録する。フェーズ1の完了条件はイベント数の比で出せるので、登録しなくても判定できる。

**`decision_id` は登録しない。** 値の種類が多すぎて GA4 では (other) に丸められ、レポートで使えない。
判定単位の分析は Supabase を正とする。GA4 は「デフォルト表示を含めた全体の CTR」とホールドアウト比較の分母に使う。
プリレンダ（CI のヘッドレスブラウザ）は GA4 へのリクエストを遮断してあるので、ベースラインを汚さない。

---

## 8. 記事・LP・ブロックを足すとき

### 新しい記事（自動公開）
何もしなくてよい。カテゴリの既定（`data/catalog-articles.json` の `category_defaults`）でカードが決まり、未知のカテゴリは `"*"` に落ちる。
記事を理由にビルドは落ちない（検証はすべて warn）。既定のカードが明らかに合わない記事だけ `overrides` に足す。
```json
"<slug>": { "block_id": "sg-pricing", "need": ["サイトリニューアル"], "industry": [] }
```
キーは BLOG の `slug`（`article-` 接頭辞なし）。`need` / `industry` は `data/nq-labels.json` のラベルと同じ語だけを使う。

### slot-mid の位置を記事ごとに決める（設計書12章 J2 の受け口）
`overrides` の `mid_before_h2` に「本文の n 番目（1始まり）の h2 の直前」を書く。
```json
"<slug>": { "mid_before_h2": 4 }
```
- その h2 が本文の40%地点より前なら、warn を出して既定の規則（40〜70%で55%に最も近い h2。無ければ h3）に落ちる。
- 2,000字未満の記事には slot-mid を出さない。
- J2 の本体（節ごとに Jev へ聞いて位置を決める処理）は別リポジトリ `nortiq-pipeline` の仕事で、まだ無い。
  パイプラインがこのファイルに書き込むときは、`overrides` のキーを足すだけにして、`build.js` の BLOG には何も足さない。

### 新しいLP（パッケージ別LPの残り5本）
1. LP 本体を `lp/service/<name>/` に置く（build.js が自動で拾う）。
2. `data/catalog-pages.json` に1行足す（`type: "industry_lp"`、`audience` は肯定文1文、`suggestable: true`、`block_id`）。
3. `data/blocks.json` に提案カードを1つ足す（下の「新しいブロック」）。
4. `docs/nq/copy-sources.md` に出典の行を足し、承認する（3章）。
5. `eval/sessions.json` に、そのLPが正解になるセッションを数件足して `node eval/run.js --check`。
6. 学習済みモデルに無いカードは、カード別の補正が事前分布（平均0）から始まる。何も設定しなくてよい。
7. 訪問者モデルの業種ラベルに無い業種なら、ラベルの追加は四半期に1回の見直しにまとめる。

### 新しいブロック
- ID の接頭辞と `kind` をそろえる: `sg-`=suggest / `rs-`=reassure / `ct-`=cta / `rl-`=related。
- 字数上限（全角半角とも1字）: suggest は eyebrow 16・title 28・body 60・cta 10。reassure は answer 40・note 60・cta 16。cta は text 22・button 10。
- suggest の variant は `default` のほか `cost` `schedule` `trust` `ai_quality` `scope` から最大3つ。
- `audience` は **肯定文1文**。Jev の関連度の質問「この訪問者は次の説明に当てはまる：{audience}」にそのまま入る。
  否定形（〜でない、〜以外）は誤判定の原因になるので使わない。ほかのカードの audience と対象が紛れないように書く。
- 数字はリンク先ページの記載と一字一句そろえる。リンク先に無い数字は書かない。
- `approved_by` は空のまま置き、`node build.js` の警告が出ないことを確かめてから承認に回す。

---

## 9. しきい値の調整

しきい値は `data/nq-rules.json` の `thresholds`。API は `data/*.json` を直接読むので、デプロイした時点から効く。

1. シャドーモード（または本番）の `nq_decisions` を見て、どの線を動かすか決める。
   例: 営業・求職者の取り違えが多い → `visitor_type` を上げる。デフォルトばかりになる → `rel_gate` を下げる。
2. `data/nq-rules.json` を変える。
3. 評価セットで確認し直す。前回の結果と見比べて、悪くなった軸が無いか見る。
   ```bash
   node eval/run.js --check                      # 評価セットの形だけ確かめる（モデルは呼ばない）
   node eval/run.js --provider stub              # 配線の確認（常にデフォルトになる）
   node eval/run.js --provider jev --out eval/results/2026-10-01-rel-gate-050.json
   ```
   `--limit N` で先頭 N 件、`--ids s01,s17` で指定のセッションだけ、`--verbose` で1件ずつの回答を出す。
   結果の置き場 `eval/results/` は `.gitignore` の対象（実行のたびに増えるため）。見比べる相手は手元に残しておく。
   1回の呼び出しは入力 約2,700トークン（質問は21〜23問）。60件で約16万トークン、原価は1円前後。
4. `npm test` を回す。
5. `supabase/nq_report.sql` は同じしきい値（0.6、0.55 など）を直に書いてある。**変えたら SQL も手で直す。**
6. ラベル（`data/nq-labels.json`）を変えたときも、同じ手順で確認し直す。ラベルの追加と変更は四半期に1回にまとめる。

クライアントが読む値（`client_timeout_ms` `max_calls_per_session` `max_shows_per_block` `history_pages`）はバンドルに入るので、
変えるとプリレンダの CI が走る。`history_pages` はサーバがモデルに渡す履歴の件数で、クライアントは絞らずに送る
（セッション中の全ページ・最大30件。サーバが「すでに読んだページ」を提案の候補から外すのに使う）。

---

## 10. キルスイッチ一覧

| 止めたいもの | やること | 効き方 |
|---|---|---|
| 個別化の表示だけ（記録は続ける） | Vercel env `NQ_SHADOW=1` → Redeploy | 応答が常に `default:true` になる |
| Jev の呼び出しと記録を全部 | Vercel env `NQ_ENABLED` を外す → Redeploy | API が即デフォルトを返す。`/api/nq-event` は 204 |
| Jev の呼び出しだけ（配線は残す） | `NQ_MODEL_PROVIDER=stub` → Redeploy | 常に低確信 → 常にデフォルト |
| 学習済みモデルの利用 | `NQ_POLICY` を外す → Redeploy | 事前知識だけの順位（prior）に戻る |
| 夜間の学習 | `NQ_LEARN` を外す → Redeploy | バッチは何も読まず何も書かない |
| クライアントからの通信 | `data/nq-config.json` の `api` / `events_api` を false → push | 1バイトも送らない |
| Storage への書き込み | `session_log` を false → push | メモリ上だけで動く |
| 特定のブロック・文言 | `data/blocks.json` の `approved_by` を空に → push | バンドルからも API の候補からも消える |
| スロットの描画すべて | `enabled` を false → push | デフォルトのカードも出なくなる（導入前の見た目に戻る） |

急ぐときは Vercel の Instant Rollback で直前のデプロイに戻すのがいちばん速い。
自動で倒れる場面: プリレンダ・bot・`navigator.webdriver`・Storage が使えない環境ではクライアントが何もしない。
タイムアウト（クライアント 1.2 秒、Jev 0.9 秒）・エラー・入力不備・ホールドアウトは、すべてデフォルトのまま。

---

## 11. やってはいけないこと

- `build.js` の `const BLOG = [ ... ];` の位置・書式・既存行に触る（外部の公開ワーカが1行ずつ挿入している）。記事のメタは `data/catalog-articles.json` に置く。
- 記事に関する検証を throw にする（記事は人がいない時間にも自動公開され、main への push はそのまま本番デプロイになる）。
- `prerendered/` をローカルで再生成してコミットする（CI に任せる）。ローカルビルドで書き換わった `articles.js` をコミットする。
- `NQ_INCLUDE_UNAPPROVED=1` でビルドした `dist/` を外に出す。
- クライアントのフラグやホールドアウト率を、Vercel の env からバンドルに注入する。
- API キー（`JEV_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`CRON_SECRET`）をリポジトリ・文書・ログ・ブラウザに出す。
- `jev-latest` を使う（リリースで答えが変わり、しきい値の前提が崩れる）。
- 状態（Jev に渡す情報）に、訪問者が入力した文字列や URL のクエリを入れる。クライアントが送るのは URL と列挙値だけ。
- フォームの入力内容、IP アドレス、User-Agent の全文、永続 ID を記録する。
- プライバシーポリシーの追記を公開する前に、`session_log` / `api` / `events_api` を true にする。
- リンク先に無い数字をブロックに書く。リンク先の数字を変えたのに、ブロックの承認を見直さない。
- GA4 に `decision_id` をカスタムディメンションとして登録する。
- 学習データがたまる前に `NQ_POLICY=ts` にする。
- 特徴量の並び（`api/_lib/features.js` の `FEATURES`）や意味を変えたのに、`recommend.js` の `POLICY_VERSION` を上げない
  （過去のログと混ぜて学習してしまう）。
- 依存パッケージを足す（api/ と eval/ は依存ゼロ）。新しい色・フォント・`:root` のトークンを足す。
