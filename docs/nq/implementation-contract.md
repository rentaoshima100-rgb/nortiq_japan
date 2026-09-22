# 次ページ提案（nq）実装コントラクト

情報設計書「Jevによる次ページ提案（nortiqlab.com）v1.0」（2026-09-18）を、このリポジトリの現実
（React SPA + createRoot + Playwright プリレンダ + 外部パイプラインによる自動記事公開）に合わせて
実装するための取り決め。複数人（複数エージェント）が並行して実装しても噛み合うよう、
**ファイルの持ち主・データ形式・グローバル名・API の形** をここで固定する。

設計書と食い違う箇所は「設計書からの読み替え」に理由つきで列挙した。

> **2026-09-20 改訂。** 設計書に 7章「推薦アルゴリズム」と 12章「記事パイプラインへの組み込み」が加わり、
> 章番号がずれた（デザインシステム→8章、ビジュアル→9章、計測→10章、文言→11章、フェーズ→13章）。
> 本書の章番号の参照は改訂後のもの。6章の `next_block`（Choice）は **カードごとの関連度 `rel_{block_id}`（Noul）** に
> 置き換わり、カードは 7章の推薦アルゴリズム（本書 6.4）が選ぶ。
> 12章（J1〜J9）の本体は別リポジトリ `nortiq-pipeline` の仕事で、このリポジトリ側で受けるのは
> 「J2 が決めた slot-mid の位置」を読む口（2.3 の `mid_before_h2`）だけ。
>
> **2026-09-20 オーナー決定: Sonnet との比較は不要。** 設計書13章「0. 検証」の「同じセットをSonnetにも通し」は行わない。
> `decide.js` の `anthropic` プロバイダ、`ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`、`eval/run.js` の `--provider anthropic`、文書中の Sonnet 比較の記述は **作らない。既に在れば削除する**。
> プロバイダは `stub` と `jev` の2つだけ（`decide(state, questions)` の差し替え口は残す）。Jev の実キーは `.env.local` の `JEV_API_KEY`（コミットしない）。

> **2026-09-21 オーナー決定（設計書 v1.0 改訂: 2・3・6・7・10・13・14章）。** 決定文と実装の形は
> [`decisions-2026-09-21.md`](decisions-2026-09-21.md) に固定してあり、**本書と食い違う箇所はそちらが優先**。本書は該当する節を追記・修正してある。変わった点の要約:
> - **訪問者タイプは5ラベル**: 事業者／同業者・学習者／求職者・学生／営業・売り込み／other（旧「発注検討中の事業者」「情報収集中の事業者」は「事業者」に統合。検討の進み具合は `stage` で表す）。
>   評価の完了条件は「決定一致率 90% 以上、かつ 事業者への誤り（人が事業者なのに行3か行4）2件以下」（1章）。
> - **ページ型 `company` / `recruit`**: `/company` `/staff` は type `company`（状態には「会社情報」）、`/recruit` は `recruit`（「採用情報」）。どちらも `default_next` は null（2章・2.2）。
> - **強い CTA（行6）**: `data/nq-rules.json` の `cta`（`mode` score｜noul、`gate_visitor_types`、`stage_cta` / `stage_contact` / `cta_ok` / `compare` / `contact`）を `rules.js` の `ctaConfig()` が読む。
>   visitor_type の第1候補が `gate_visitor_types`（事業者・other）のときだけ評価する。stage の指示文は「当社のページをどれだけ読んだか」の4段階に変え、依頼意向の Noul 2問（`intent_compare` / `intent_contact`）を常に聞く（6.2・6.3）。
> - **状態のスイッチ**: `data/nq-rules.json` の `state: { article_need: false, article_audience: true }`。記事の need タグは状態に渡さず、記事の **audience（対象読者。発注側向け／制作側・技術者向け／求職者向け）** を着地ページと閲覧履歴の記事に `"対象"` として渡す（6.2 の state.js）。
> - **関連記事の候補（設計書13章）**: build.js が記事ごとに `related`（slug、最大12本）を `window.NORTIQ_ARTICLES[slug]` と `api/_data/catalog.json` に出し、questions.js は現在のページが記事ならその候補に `rel_article_<slug>`（Noul）を聞く。
>   rules.js は rl-related を出す場面で関連度の高い順に3本を slot の `related` に入れ、nq-suggest.jsx はそれを優先する。1回の質問数は最大 37（上限 40 を assert）（3.1・3.3・4.1・4.4・6.1・6.2）。
> - **記事の audience**: `data/catalog-articles.json` の `overrides[slug].audience`（`category_defaults` にも置ける）。どちらにも無ければ build.js が「発注側向け」で仮置きして warn。`eval/tag-articles.js` が Jev の Choice で一括付与する（2.3・3.3・3.4）。
> - **関連度の下限 `rel_floor` は 0.45**（表示の門 `rel_gate` 0.55 は据え置き）（6.4）。
> - **評価**: `eval/sessions.json` は v2（許容集合・`cards`）の70件。`eval/run.js` は決定一致率・事業者への誤り・stage の分布・`--baseline` の回帰テスト（`eval/baseline.json`、`.github/workflows/nq-eval.yml`）を持つ。

---

## 0. 絶対に守ること

1. **`build.js` の `const BLOG = [ ... ];` の位置・書式・既存行に触らない。** リポジトリ外の公開ワーカ
   `nortiq-pipeline` が `const BLOG = [` の直後へ1行ずつテキスト挿入し、`build-prerender.js` も正規表現で読む。
   記事の拡張メタは `data/catalog-articles.json` に置く。
2. **自動公開された記事でビルドを落とさない。** 記事に関する検証はすべて `console.warn('  ! ...')` 止まり。
   未知のカテゴリは `"*"` の既定値にフォールバックする。
3. **プリレンダ・bot では何もしない。** `window.__NORTIQ_PRERENDER__`、`navigator.webdriver`、bot UA、
   Storage 不可のいずれかなら、クライアントは API・Storage・計測・DOM 属性の書き換えを一切しない
   （デフォルトの描画だけは行う。スナップショットに常にデフォルトが焼き込まれる）。
4. **承認がキルスイッチ。** `approved_by` が空のバリエーションは配信物（`window.NORTIQ_NQ.blocks`）に入れない。
   スロットは、承認済みの default が無ければ `null` を返して何も描画しない。
   → 下書き段階のまま本番に出ても、サイトの見た目は1pxも変わらない。
   配信ブロック（`window.NORTIQ_NQ.blocks`）が1つも無い間は `NQ` のランタイムも何もしない（セッション・スクロール監視・
   GA4・`/api`・Storage のすべて。判定は `nq-suggest.jsx` の `active()` の1か所）。
5. **`prerendered/` をローカルで再生成してコミットしない**（CI に任せる）。`articles.js`（ルート直下）も
   ローカルビルドで書き換わるが、作業の最後に `git checkout -- articles.js` で戻す。
6. **commit / push はしない。** main への push は本番デプロイ。
7. 依存パッケージを増やさない（api/ は CommonJS・依存ゼロ・グローバル fetch の流儀）。
8. 新しい色・フォント・`:root` のトークンを足さない。既存の `--ease-out`（styles.css:93）を上書きしない。

---

## 1. ファイルの持ち主

| 担当 | 触ってよいファイル |
|---|---|
| (済) 共通 | `data/nq-labels.json` `data/nq-rules.json` `data/nq-config.json` `docs/nq/implementation-contract.md` |
| U1 文言 | `data/blocks.json` `docs/nq/copy-sources.md` |
| U2 カタログ | `data/catalog-pages.json` `data/catalog-articles.json` |
| U3 ビルド | `build.js` `build-prerender.js` `prerender-check.js` `.github/workflows/prerender.yml` `.gitignore` `Nortiq Labs.html` |
| U4 フロント | `nq-suggest.jsx`（新規） `extra-pages.jsx` `components.jsx` `app.jsx` `service-pages.jsx` `info-pages.jsx` `detail-pages.jsx` `top-page.jsx` `assets/lp/common/lp.js` |
| U5 CSS | `styles.css`（末尾への追記のみ） |
| U6 API | `api/**` `vercel.json` `package.json` `supabase/**` |
| U7 評価・文書 | `eval/**` `docs/nq/**`（本ファイルと copy-sources.md 以外） |

自分の担当外のファイルは編集しない。必要な変更があれば最終報告に書く。
`node build.js` を実行してよいのは U3 と統合担当だけ（dist/ を掃除するので並行実行すると壊れる）。
JSX の構文確認は `npx babel --presets @babel/preset-react <file> > /dev/null` で行う。

---

## 2. データファイル

### 2.1 `data/blocks.json`（U1）

```jsonc
{
  "version": 1,
  "blocks": [
    {
      "block_id": "sg-web",
      "kind": "suggest",                 // suggest | reassure | cta | related
      "target_url": "/web",              // ルートからのパス。ct-contact は null
      "action": null,                    // ct-contact だけ "contact"（資料請求モーダルを開く）
      "selectable": true,                // Jev に関連度を聞く候補（7章）に入れるか。sg-guidebook は false
      "audience": "会社のサイトを新しく作る、または作り直すことを検討している人向け", // 肯定文。内部用（配信しない）。Jev の関連度の質問文にそのまま入る
      "goal_proximity": 0.5,             // 任意。提案先のゴールへの近さ（0 / 0.5 / 1）。無ければ nq-rules.json の type 別の既定値
      "only_visitor_types": ["求職者・学生"], // 任意・サーバ専用（配信しない）。この訪問者タイプのときだけ候補にする。sg-recruit だけが持つ。語は nq-labels.json の visitor_type と同じ表記
      "approved_by": "",                 // ブロック単位の承認者。空なら未承認。必ず文字列（false / 0 などは未承認として扱い、ビルドが警告する）
      "approved_at": "",
      "variants": {
        "default": { "eyebrow": "", "title": "", "body": "", "cta": "" }
        // suggest は cost / schedule / trust / ai_quality / scope のうち最大3つまで追加可
        // バリエーション単位で approved_by / approved_at を持ってもよい（あればブロック単位より優先）
      },
      "by_industry": {                   // sg-solution / sg-works だけ。キーは nq-labels.json の industry ラベル
        "クリニック・医療": { "target_url": "/solution-clinic", "variants": { "default": { ... } } }
      }
    }
  ]
}
```

- 種類ごとの variant の形と字数上限（全角半角とも1字と数える。`[...str].length`）:
  - `suggest`: `eyebrow` ≤16 / `title` ≤28 / `body` ≤60 / `cta` ≤10（動詞で終える。矢印は入れない。表示側が「 →」を付ける）
  - `reassure`（variants は `default` のみ）: `answer` ≤40 / `note` ≤60 / `cta` ≤16（リンク文言だけで行き先が分かること）
  - `cta`（variants は `weak` と `strong`）: `text` ≤22 / `button` ≤10
  - `related`（`default` のみ）: `eyebrow`（固定「あわせて読まれている記事」）。記事3本はクライアントが選ぶ
- 初期ブロックは **23個**: 設計書の22個（sg- 13 / rs- 5 / ct- 3 / rl-related 1）＋ `sg-guidebook`
  （slot-end のデフォルト「資料ダウンロードのカード」。設計書4章に該当ブロックが無いため追加。`selectable:false`）。
- `sg-solution` は業種が決まらないと行き先が無いので、トップレベルの `target_url` は `null`、`variants` は `{}`。
  `sg-works` のトップレベルは `/works`。
- **下書きはすべて `approved_by: ""` のまま置く。** 承認は人が行う。
- 数字（価格・期間・件数）は、リンク先ページの記載と一字一句そろえる。出典（file:line と原文）を
  `docs/nq/copy-sources.md` に variant ごとに記録する。リンク先に無い数字は書かない。
- 設計書11章の禁止表現（行動の言い当て・AIの強調・効果の断定・緊急性のあおり・他社比較）を使わない。

### 2.2 `data/catalog-pages.json`（U2）— 記事以外の全ページ

```jsonc
{
  "version": 1,
  "pages": [
    {
      "url": "/web",
      "type": "service",          // nq-labels.json の page_type_labels のキー
      "title": "Web制作",          // Jev に渡す短い表示名（「｜Nortiq Labs」やSEOキーワードを含めない）
      "industry": [],             // nq-labels.json の industry ラベル
      "need": ["新規サイト制作", "サイトリニューアル"],
      "audience": "…人向け",       // 肯定文1文。suggestable:true なら必須
      "summary": "…",             // 60字以内
      "suggestable": true,        // ⇔ block_id が data/blocks.json に在る
      "block_id": "sg-web",       // このページを勧める提案ブロック。無ければ null
      "default_next": "sg-works"  // このページ末尾の slot-next に出すデフォルトの提案ブロック。出さないなら null
    }
  ]
}
```

- 対象: build.js の SITEMAP_ROUTES の固定ルート全部 ＋ `/sitemap` `/quick-diagnosis` ＋ LP 2本（`/service/kanri-dantai` `/service/recruit-site`）。トップは `/`。
- `default_next` を持てるのは type が service / feature / solution / works / trust のページだけ。
  自分自身を指すブロックや、`selectable:false` のブロックは指定しない。LP（industry_lp）は今回 null。
- 記事一覧 `/column` は type `article`、`suggestable:false`。
- **2026-09-21**: `/company` `/staff` は type `company`（`page_type_labels` は「会社情報」）、`/recruit` は type `recruit`（「採用情報」）。
  どちらも `default_next` は null（`company` / `recruit` は `default_next` を持てる型に入っていないので、slot-next のデフォルトも出ない）。
  会社概要・スタッフ紹介を「信頼・条件」として渡すと、求職者や営業に高い検討度が付く（`decisions-2026-09-21.md` 2章）。

### 2.3 `data/catalog-articles.json`（U2）

```jsonc
{
  "version": 1,
  "category_defaults": {
    "Web制作":   { "block_id": "sg-web",     "need": ["新規サイト制作", "サイトリニューアル"], "industry": [] },
    "技術":      { "block_id": "sg-dx",      "need": ["業務システム・DX"], "industry": [] },
    "AI活用":    { "block_id": "sg-chatbot", "need": ["AI導入・チャットボット"], "industry": [] },
    "DX 観察記": { "block_id": "sg-dx",      "need": ["業務システム・DX"], "industry": [] },
    "SEO":       { "block_id": "sg-cms",     "need": ["集客・SEO"], "industry": [] },
    "マーケティング": { "block_id": "sg-lpo", "need": ["LP制作・改善"], "industry": [] },
    "業種別":    { "block_id": "sg-solution", "need": ["新規サイト制作"], "industry": [] },
    "*":         { "block_id": "sg-web",     "need": [], "industry": [] }
  },
  "overrides": {
    "<slug>": { "block_id": "sg-pricing", "need": ["サイトリニューアル"], "industry": ["不動産"], "summary": "60字以内（任意）",
                "mid_before_h2": 4,    // 任意。12章 J2 が決めた slot-mid の位置。「本文の n 番目（1始まり）の <h2 の直前」
                "audience": "発注側向け",          // 2026-09-21。対象読者の列挙値: 発注側向け | 制作側・技術者向け | 求職者向け
                "audience_confidence": 0.93,       // eval/tag-articles.js が書く（build.js は読まない）
                "_review": true }                  // 確信度 0.6 未満の印（人が本文で確かめたら外す）
  }
}
```

- キーは BLOG の `slug`（`article-` 接頭辞なし）。カテゴリ名は BLOG の実データの表記（`'DX 観察記'` は半角スペース入り）。
- `block_id` が `sg-solution` / `sg-works` の記事は、`industry` の先頭の業種で `by_industry` を引く。引けなければ `"*"` の既定に落とす。
- 記事は提案先にしない（suggestable:false）ので、ページやカードの audience（関連度の質問文）は持たない。
- **2026-09-21 記事の `audience`（対象読者）**: `overrides[slug].audience`、無ければ `category_defaults[category].audience`。
  列挙値（`data/nq-labels.json` の `article_audience.criteria` のキー）だけを採り、列挙外は build.js が bad 警告して無視する。
  どちらにも無ければ **「発注側向け」で仮置きして warn**（制作側向けと誤ると事業者から提案カードが消えるが、逆は技術者にカードが1枚出るだけ）。
  `api/_lib/state.js` が着地ページと閲覧履歴の記事に `"対象"` として Jev に渡す。記事の `need` は状態に渡さない（catalog.json には残す）。
  既存記事への一括付与は `eval/tag-articles.js`（README 8章）。パイプライン（nortiq-pipeline）が新記事に付けるときも `overrides[slug]` に書く。

### 2.4 共通データ（済）

- `data/nq-labels.json`: 3章のラベルと説明、ページ種別の日本語ラベル、state の列挙値→日本語、関連度の指示文（`rel.instructions`。`{audience}` を含む1文）。
  **2026-09-21**: `visitor_type` は5ラベル、`stage` は新しい4段階の文（旧の文は `stage_legacy`。questions.js は読まない。評価の段階実行用）、
  `intents`（`intent_compare` / `intent_contact`。キーがそのまま質問キー）、`article_audience`（記事の対象読者の3ラベル。tag-articles.js の Choice と build.js の列挙）、
  `rel_article`（関連記事の質問文。`{title}` と `{audience}`）、`page_type_labels` に `company` / `recruit`。
- `data/nq-rules.json`: 6章のしきい値と各種上限。**2026-09-21**: `thresholds.rel_floor` 0.45、`state`（`article_need` / `article_audience`。状態に何を入れるかのスイッチ）、
  `cta`（行6の条件。`mode` / `gate_visitor_types` / `stage_cta` / `stage_contact` / `cta_ok` / `compare` / `contact`）、`recommend.goal_proximity_by_type` に `company: 0` `recruit: 0`。
  評価の段階実行（`decisions-2026-09-21.md` 6章の表）では、評価担当がこれらを一時的に前の値に戻して回す。
- `data/nq-config.json`: クライアントの動作モード。初期値は `api:false`・`session_log:false`・`events_api:false`。

---

## 3. ビルド（U3）

### 3.1 `buildArticles()` への追加
- `chars` = marked 出力からタグ・実体参照・空白を除いた文字数。`est_read_sec = Math.round(chars / 10)`。
- **slot-mid マーカー**: overrides に `mid_before_h2` があり、その h2 が累積文字率 40% 以降にあれば、その直前に入れる
  （設計書5章・12章 J2。40% より前を指していたら warn して下の規則に落とす）。無ければ、
  本文HTMLの「累積文字率 40〜70% の範囲にあり、55% に最も近い `<h2`」の直前に
  `<!--nq-slot-mid-->` を1つだけ入れる。該当 h2 が無ければ同じ規則で `<h3` を探す。それも無い、
  または `chars < 2000` の記事にはマーカーを入れない（slot-mid なし）。
  マーカーは HTML コメントなので、React 側が未対応でも表示に影響しない。
  - `mid_before_h2` の n は「一番外側の `<h2`」だけを1始まりで数える（引用・リストの中の h2 は数えない。そこで本文を割ると HTML が壊れる）。
    2,000字未満の記事は `mid_before_h2` があっても入れない（warn）。
  - タグの開閉が合わない本文（md に生の HTML / JSX が残っている記事）にも入れない（warn）。前半・後半を別々の
    `dangerouslySetInnerHTML` に入れるので、開閉がずれていると後半が壊れる。
- 記事メタ（`window.NORTIQ_ARTICLES[slug]`）に `est_read_sec` と `nq_block`（デフォルトの提案ブロックID。
  overrides → category_defaults → `"*"` の順で解決）を足す。
  - `sg-solution` / `sg-works` の業種版は `"ID@業種"`（例 `"sg-solution@不動産"`）の形で渡す。`pages[url].next` も同じ形式。
    業種版が配信物（承認済み）に無ければ、ビルド側で `"*"` の既定（`sg-works` はトップレベル）へ落としてから渡す。
    クライアントは引けなければ何も描かない。処理に失敗した記事は `nq_block: null`。
- **2026-09-21 関連記事の候補 `related`**（設計書13章）: 記事メタに `related: ["<slug>", …]`（`article-` 接頭辞なし、最大 `NQ_RELATED_MAX` = 12、
  自分と noindex の記事を除く）。並びは「同カテゴリ → 同 need → 同業種 → 残り」、各段は新着順。先頭3本は旧の「同カテゴリの新着順」と同じ並びになるので、
  判定が無いときの見た目は変わらない。`api/_data/catalog.json` の記事にも同じ配列を出す（3.3）。記事ごとに固定の候補を持つことで、
  記事が 1,000 本になっても Jev に聞く関連記事は最大12本に収まる。

### 3.2 `window.NORTIQ_NQ`（app.bundle.js の先頭に連結）
```js
window.NORTIQ_NQ = {
  config: { enabled, ga_events, session_log, api, events_api },       // data/nq-config.json（_comment は除く）
  rules:  { client_timeout_ms, max_calls_per_session, max_shows_per_block, history_pages },
  blocks: {                       // 承認済みの variant だけ。内部用フィールドは落とす
    "sg-web": { kind: "suggest", target_url: "/web", action: null, selectable: true,
                variants: { default: {eyebrow,title,body,cta}, cost: {...} },
                by_industry: { "<業種>": { target_url, variants: {...} } } }   // 在るものだけ
  },
  pages:  { "/web": { type: "service", next: "sg-works" }, ... },     // catalog-pages.json の type と default_next だけ
  end_default: "sg-guidebook"
};
```
- 承認済みの variant が1つも無いブロックは `blocks` に入れない。`default`（cta は `weak`）が未承認なら、そのブロックごと入れない。
- 環境変数 `NQ_INCLUDE_UNAPPROVED=1` のときだけ未承認も入れる（**ローカル確認専用**。ビルドログに目立つ警告を出す。
  Vercel / CI では設定しない）。
- `window.NORTIQ_NQ` は bundle に入るので `ver` のハッシュに自動で反映される。terser には通さず、minify 後の
  bundle の1行目に JSON のまま置く（何が配信されているかを1行目で機械的に確かめられる）。
- `NQ_INCLUDE_UNAPPROVED=1` は、環境変数 `VERCEL` か `CI` が立っていれば無視して warn を出す（env の設定ミスで下書きが本番に出るのを構造で防ぐ）。
- `pages` には catalog-pages.json の全ページを `{ type, next }` で入れる（next の無いページは `null`）。
- `NQ_INCLUDE_UNAPPROVED=1` のローカルビルドのときだけ、末尾に `unapproved: true` が入る（承認済みのみのビルドには入らないので
  本番の `ver` は変わらない）。`build-prerender.js` は bundle の1行目でこの印を見て、スナップショットを1枚も書かずに exit 1 で止まる。
  1行目が読めないときも止まるので、1行目の形（`window.NORTIQ_NQ=<JSON>;` ＋ 改行）を変えるなら `build-prerender.js` の `nqRefuseReason` も合わせる。

### 3.3 API 用の生成物
- `api/_data/catalog.json` を生成する（`.gitignore` に `api/_data/` を追加）。中身は
  `{ "pages": { "<url>": { title, type, topic?, industry, need, audience?, related? } } }`。記事は `/article-<slug>` をキーに
  BLOG ＋ catalog-articles.json から導出（`type:"article"`、`topic` = category）。固定ページと LP は catalog-pages.json から。
  - **2026-09-21**: 記事には `audience`（2.3 の列挙値。仮置きを含めて必ず入る）と `related`（3.1 と同じ slug の配列、最大12）が付く。
    固定ページ・LP には無い。`need` は状態には渡さないが、J1・J3・レポート用に残す。
    例: `"/article-clinic-web": { "title": "…", "type": "article", "topic": "業種別", "industry": ["クリニック・医療"], "need": ["集客・SEO", "新規サイト制作"], "audience": "発注側向け", "related": ["realty-lp", …] }`。
    `api/_lib/data.js` の代替読み込み（catalog.json が無いとき catalog-pages.json だけで動く）では記事に `audience` / `related` が無く、
    「対象」は付かず関連記事の質問も出ない（判定は続く）。
- blocks / labels / rules は API が `data/*.json` を直接 `require` するので生成しない。

### 3.4 検証 `assertNq()`（初回リリースは **すべて warn**。`NQ_STRICT=1` で throw に上がる。ただし記事に由来する検証は 0章2 を優先して常に warn）
- blocks: 字数上限／`target_url` が catalog に在る／`by_industry` のキーが industry ラベルに在る／
  variant 名が許可リストに在る／`audience` に否定形（`でない` `ではない` `じゃない` `以外`）が無い／
  ID 接頭辞と kind の対応（sg-/rs-/ct-/rl-）／`approved_by`・`approved_at` が文字列か（ブロック・業種版・variant の3階層）／
  `only_visitor_types` が文字列の配列で、各語が visitor_type のラベルに在るか（綴り違いだと、そのカードがだれにも出なくなる）。
- catalog-pages: SITEMAP_ROUTES の固定ルート・`/sitemap`・`/quick-diagnosis`・LP_ROUTES が全部載っているか／
  `suggestable:true` なのに `audience` が空／`block_id`・`default_next` が blocks に在るか／
  `industry`・`need` の語がラベル集合に在るか／`summary` ≤60字／type が page_type_labels に在るか。
- catalog-articles: overrides の slug が BLOG に在るか（無ければ warn）／未知カテゴリ（warn して `"*"`）／
  **2026-09-21**: `audience` が列挙外（bad。値は無視して次の既定か仮置きに落ちる）／audience が無い記事の仮置き（本数と先頭3本をまとめて1行の warn。
  記事に由来するので NQ_STRICT でも warn のまま）／`data/nq-labels.json` の `article_audience.criteria` と build.js の `NQ_ARTICLE_AUDIENCES` の食い違い（bad）。
- 失敗メッセージは既存の `assertNoDraftScaffolding` と同じ流儀（ファイル名・ID・対処法を日本語で）。

### 3.5 その他
- `JSX_FILES` に `'nq-suggest.jsx'` を `'components.jsx'` の直後へ追加。`Nortiq Labs.html` の script 群にも同じ位置で追加。
- `build-prerender.js`: `page.route()` で `googletagmanager.com` と `google-analytics.com` へのリクエストを abort
  （プリレンダが GA4 に page_view / nq_shown を送ってベースラインを汚すのを止める）。
- `.github/workflows/prerender.yml` の `paths` と `prerender-check.js` の監視対象に `data/**` を追加。
- `npm run prerender:check`（`prerender-check.js`）は `api/_lib/data.js` の `deliverable()` を使い、`prerendered/` 内の
  `data-block` / `data-variant` の組が配信可能（承認済み）かを検査する。承認 0 件なのに `class="nq-slot"` がある場合も exit 1。
  古さの検査に引っかかっても、nq の検査まで実行する。CI には組み込んでいない（従来どおり）。
  `deliverable(block, variantName, industry)` のシグネチャや意味を変えるときは、このスクリプトも直す。

---

## 4. フロント（U4）

### 4.1 `nq-suggest.jsx`（新規。`components.jsx` の直後に読み込まれる。Babel classic runtime・グローバルスコープ共有）

公開するもの（ファイル末尾で `Object.assign(window, { NqSlot, NQ })`）:

- **`window.NQ`** — React 非依存のランタイム（単一ストア）。
  - `NQ.inert` : boolean。0章3の条件に当たれば true。inert のときは下の副作用系がすべて no-op。
  - `NQ.pageView(path)` : app.jsx の route 監視から呼ぶ。履歴の追記、T2 判定、ゴール検知（`/diagnostic` `/guidebook`）。
  - `NQ.articleReady(slug, el)` : 記事本文が DOM に入った後に呼ぶ。T1（実際の scroll イベント・`scrollY>0`・本文の25%通過）を仕掛ける。
  - `NQ.get(slot)` → `{ block_id, variant, industry, related } | null` / `NQ.subscribe(fn)` → unsubscribe。
    `related` は **2026-09-21** に増えた。rl-related の決定にだけ入る slug の配列（`/article-` 無し。関連度の高い順、最大12）。無ければ null。
    `NQ.resolve(ref)` の戻り値にも `related`（kind が related のときだけ。それ以外は null）が付く。
  - `NQ.markSeen(slot, shown)` : スロットが一度画面に入ったら、そのページでは中身を固定する（以降の決定を無視）。`shown` に `related` を渡すとその並びで固定する。
  - `NQ.track(name, params)` : `config.ga_events` なら `window.nqTrack(name, params)`。`config.events_api` なら
    `navigator.sendBeacon('/api/nq-event', JSON)` も送る。
  - `NQ.viewed()` : このセッションで開いたページのパスの配列（いまのページを含む）。関連記事から既読を外すのに使う。
    ランタイムが動いていない間は `[]`（Storage に触れない）。
  - `NQ.goal(kind)` : `nq_goal` を goal 種別ごとに1セッション1回だけ送る。
  - `nq_engaged`（設計書10章）: カードをクリックして移動した先のページを離れるとき（次の pageView か pagehide）、
    そのページの読み方が deep か skim なら `nq_engaged { decision_id, block_id, read }` を1回送る。bounce なら送らない。
  - `NQ.dismissBar()` / `NQ.barDismissed()` : slot-bar を閉じた状態を sessionStorage に保持。
- **`<NqSlot slot="slot-mid|slot-end|slot-next" defaultBlock={id} onNavigate={fn} />`**
  - 初回描画は必ずデフォルト（同期）。`blocks[defaultBlock]` に承認済み default が無ければ `null`。
  - `slot-next` の defaultBlock は `NORTIQ_NQ.pages[location.pathname].next`。無ければ `null`。
  - マークアップは設計書8章のとおり（`<aside class="nq-slot" data-slot aria-label="…">` の中に
    `nq-suggest` / `nq-reassure` / `nq-related`）。`data-block` と `data-variant` を付ける。
    `aria-label` は slot ごとに変える（slot-mid は「おすすめのページ」、slot-end と slot-next は「次に読むページ」。
    記事ページで同名の complementary ランドマークが2つ並ばないようにするため）。
  - 提案カードの CTA の文字（`.nq-suggest__cta`）は `pointer-events: none`。ホバー時の transform で全面リンクの `::after` より
    手前に出るので、これが無いと PC で CTA の文字の上を押しても遷移しない。
  - リンク先が SPA の ROUTES に在れば `navProps`、それ以外（`/service/*`）は素の `href`。
  - 差し替えは「まだ一度も画面に入っていない」ときだけ。150ms の opacity フェード（`prefers-reduced-motion` なら即時）。
  - `nq_shown` は IntersectionObserver（threshold 0.5）でページ表示ごとに1回。`nq_click` はリンク押下時。
    デフォルト表示でも送る（`is_default:true`）。`decision_id` は、判定の応答を受けたあとに画面へ入ったスロットなら
    デフォルト表示でも付ける（ホールドアウト・シャドー・確信不足・差し替えの見送り。ホールドアウトと分母をそろえるため）。
    null になるのは、応答より先に画面へ入ったスロットと、判定を呼んでいないページ。`is_default` は GA4 にだけ送り、
    `/api/nq-event` には送らない。Supabase の側で個別化した表示かどうかを決めるときは、`decision_id` の有無ではなく
    `nq_decisions.is_default = false` かつ `slots[slot].block_id` がイベントの `block_id` と同じ、で判定する
    （`supabase/nq_report.sql` の指標5・K1、`nq_snapshot_month`、`api/_lib/learn.js` の学習行）。
  - `.fadein` クラスは付けない。inline style の grid は使わない（768px以下の `!important` 規則に潰される）。

### 4.2 セッションログ（`config.session_log` が true のときだけ Storage に書く）
- `sessionStorage['nq_s']` = `{ sid:"r_"+乱数, pages:[{u,t,sc,dw}], calls, hash, last, shown:{id:n}, passed:[], bar:0|1, goals:[], ref, land, v, did, eng }`
  （ref / land / v = 着地時の流入元・着地ページ・初回/再訪。did = 直近の decision_id（nq_goal 用）。eng = 押したカードの控え（nq_engaged の精算用）。lp.js は未知のフィールドを保持したまま書き戻す）
  - 保存のたびに `ga` / `ev`（`config.ga_events` / `config.events_api` の控え。0|1）も書く。nq-config.json を読めない静的LPの lp.js が、
    フォーム送信の nq_goal を GA4 / `/api/nq-event` に送ってよいかをこれで判断する。
- `localStorage['nq_v']` = `'1'`（再訪フラグのみ。IDは持たない）
- 読み方: 滞在 ≥ est_read_sec×0.5 かつ スクロール ≥75% →`deep` ／ スクロール <50% →`bounce` ／ それ以外 `skim`。
  記事以外の est_read_sec は 60 秒とみなす。
- `assets/lp/common/lp.js`: `sessionStorage['nq_s']` が **既に存在するときだけ** 同じ形式で履歴を1件追記する（無ければ何もしない）。
  フォームの送達成功（`generate_lead` の直後）でも、`nq_s` が在り `goals` に `'contact'` が無ければ `goals` に追記する。
  `nq_s.ga === 1` のとき GA4 に `nq_goal`、`nq_s.ev === 1` のとき `/api/nq-event` に
  `{ session_id, decision_id, type:'goal', goal:'contact', page_url }` を sendBeacon で送る。フォームの入力値は渡さない。
- 読了率（`sc`）: 記事は本文コンテナ基準。本文が DOM に入る前（`articleReady` より前）のスクロールは記録しない
  （プレースホルダの短い文書で 50% を超え、読了率と nq_engaged が水増しされるため）。

### 4.3 `/api/suggest` の呼び出し（`config.api` が true のときだけ）
- T1: slot-mid と slot-end。T2（セッション2ページ目以降）: slot-next と slot-bar。T3 は第2段階（未実装。フックのコメントだけ残す）。
- 1セッション最大3回。リクエスト本体のハッシュが前回と同じなら前回の結果を使う。
- `state.history` は「いまのページより前」に見たページ（いまのページは `current` で伝える。T1 は25%地点で走るので、入れると読んでいる最中のページに
  必ず bounce が付く）。着地直後の T1 では `[]`。件数はクライアントでは絞らない（保持上限の30件まで）。サーバが全件を「すでに読んだページ」の除外に使い、
  モデルに渡すのは直近 `rules.history_pages` 件だけにする。
- `AbortController` で 1200ms。`res.ok` かつ `content-type` が JSON のときだけ採用。それ以外はデフォルトのまま。
- **呼び出し1回につき、結果を必ず1件だけ数える**（フェーズ1の完了条件「応答の9割が1.2秒以内」の分子と分母）。
  採用できる応答が届けば `nq_decide { decision_id, trigger, is_default, policy, latency_ms, page_url }`、捨てた回は
  `nq_decide_fail { trigger, reason, latency_ms, page_url }`（`reason` = `timeout`（1200ms で打ち切り。タイマーの中で数えるので、
  fetch が返ってこないブラウザでも残る）/ `http` / `format`（JSON でない・壊れている）/ `network`）。
  `latency_ms` はブラウザで測った往復時間で、`nq_decisions.latency_ms`（Jev の呼び出しだけ。900ms で頭打ち）とは別物。
  `config.events_api` が true なら、どちらも `/api/nq-event` に `type:'decide'`（`result` = `ok` または reason、`latency_ms`）で送る。
  設計書10章の nq_decide は「/api/suggest が応答した」ときのイベントなので、捨てた回は名前を分けてある。
  ページを閉じて応答を待たなかった回は、どちらにもならない。
- 配信ブロックが1つも無い間は呼ばない（0章4）。
- 同じブロックは1セッション2回まで。表示してクリックされなかったブロックは `passed` に入れて次の要求で送る。

### 4.4 既存コンポーネントへの組み込み
- `<NqSlot>` は components.jsx の薄いラッパー `NqSlotMount`（描画時に `window.NqSlot` を引く）経由で置く。読み込み順が崩れた HTML でも、提案が出ないだけで白画面にならない。
- `ArticleDetailPage`（extra-pages.jsx）: 本文HTMLを `<!--nq-slot-mid-->` で2分割し、間に `<NqSlot slot="slot-mid" defaultBlock={article.nq_block}>`。
  分割するときだけ、前半・slot-mid・後半を包む素の `<div>`（余白も枠も無し）を足す。本文25%と読了率を測る基準の要素にするため。
  マーカーが無ければ従来どおり1塊。前半の div は `article-prose article-body` のまま（build-prerender.js が `.article-body` を待つ）。
  slot-end は監修ボックスの後・780px コンテナの閉じタグの前に `<NqSlot slot="slot-end" defaultBlock={NORTIQ_NQ.end_default}>`。
- `RedCTAStrip`（components.jsx）: 赤帯は固定のまま、その直前に `<NqSlot slot="slot-next">`。
  slot-next が出るページの呼び出し元で `onNavigate` が渡っていなければ渡す。
- `StickyCTA`（components.jsx）: 見た目は変えない。(a) `NQ.get('slot-bar')` が `ct-*` の strong を返したら文言とボタンを差し替え
  （`ct-diagnostic` は `/diagnostic` へ遷移、`ct-contact` は `onContact`）。(b) 閉じた状態を `NQ.dismissBar()` で保持。
  (c) `role="region"` `aria-label="ご相談の案内"`、閉じるボタンの当たり判定 44×44px。(d) `nq_dismiss`（送る条件は (e) と同じ。
  `ct-*` の strong が1つも配信されていない間と SP では送らない。閉じた状態の保持 `bar=1` だけは常に行う）。SP には何も出さない。
  (e) slot-bar の `nq_shown` / `nq_click` も送る（ブロック別 CTR の分子と分母）。ただし `ct-*` の strong が1つも配信されていない間と SP では何も送らない。
  既定の文言のままのバー（block_id なし）は GA4 だけに送り、`/api/nq-event` には投げない。
- `sendInquiry()` の成功直後に `NQ.goal('contact')`。フォームの入力内容は渡さない。
  静的LP（`assets/lp/common/lp.js`）のフォーム送達も、同じ goal として記録する（4.2）。
- `rl-related` の3本（**2026-09-21 改訂**。`nqRelatedArticles(related)`）: 優先順に
  (1) 決定の `slots[slot].related`（rules.js が関連度の高い順に選んだ slug。0〜3本、最大12本まで受ける。存在しない slug・noindex・自分自身は落とす）→
  (2) `NORTIQ_ARTICLES[slug].related`（ビルド時の候補。先頭3本は旧の「同カテゴリ新着順」と同じ）→ (3) 同カテゴリの新着 → 全カテゴリの新着。
  既読（`NQ.viewed()`）は (1)〜(3) のどれでも除き、未読が足りないときだけ既読で埋めて常に3本にする（記事が2本しか無ければ2本）。
  決定が無い・`related` が無い旧 articles.js では従来の並びに戻る（`session_log` が false の間はフルリロードで既読が消え、従来と同じ並びになる）。
- `window.nqTrack` に `__NORTIQ_PRERENDER__` ガードを足す。

---

## 5. CSS（U5）— `styles.css` の末尾に追記

- すべて `.nq-` 接頭辞＋BEM。トークンは `:root` に足さず、コンポーネントのルートにスコープした別名で既存変数へ橋渡しする:
  ```css
  .nq-slot, .nq-bar { --nq-base: var(--bg); --nq-base-alt: var(--bg-2); --nq-text: var(--text);
    --nq-text-sub: var(--text-2); --nq-text-note: var(--text-3); --nq-line: var(--border);
    --nq-main: var(--text); --nq-accent: var(--accent);
    --nq-s1: 8px; --nq-s2: 16px; --nq-s3: 24px; --nq-s4: 32px; --nq-s5: 40px; --nq-s6: 48px;
    --nq-r-sm: 8px; --nq-r-md: 12px; --nq-dur-swap: 150ms; --nq-ease: cubic-bezier(0.2, 0, 0, 1); }
  ```
  `--nq-main` は未決事項（設計書7章）。記事 h2 と blockquote の赤い左線と紛れないよう、初期値は `var(--text)`。確定したらこの1行を変える。
- 記事本文（`.article-prose` `.article-body`）の h3 / p / a の規則に負けないよう、セレクタは親クラス付きの2クラス以上にし、
  margin / padding / border / text-decoration / word-break を明示的に打ち消す。
- ブレークポイントは SPA の慣習に合わせ `@media (min-width: 1025px)`。
- 高さ: `min-height` は実測で決める（設計書の 168/144px は実際の文字設定では足りない）。行数のトークンは2組:
  `--nq-title-lines` / `--nq-body-lines` は `-webkit-line-clamp` の上限（SP 3/5・PC 2/3。承認済みの文言を「…」で切らないための安全弁）、
  `--nq-minh-title-lines` / `--nq-minh-body-lines` は下限の高さを組む行数（全ブロック×全バリエーションを実機で測った最大。
  〜359px: 2/5 → 312.6px、360〜439px: 2/4 → 285.6px、440〜539px: 2/3 → 258.6px、540〜1024px: 1/2 → 204.6px、1025px〜: 1/2 → 230.4px）。
  文言の字数上限や文字サイズを変えたら測り直す。
- 影は使わない。`prefers-reduced-motion: reduce` で transition を切る。タップ領域 44px 以上。

---

## 6. API（U6）

### 6.1 `POST /api/suggest`
リクエスト（クライアントは **URL と列挙値だけ** を送る。文章は送らない）:
```json
{ "session_id": "r_8f3k2m", "trigger": "T1", "page_url": "/article-xxx",
  "state": { "ref": "google", "landing": "/article-xxx",
             "history": [ { "url": "/article-xxx", "read": "deep" } ],
             "current": { "url": "/pricing", "reach": "half" },
             "visit": "first", "device": "sp", "passed": ["sg-web"] } }
```
レスポンス（**どんな失敗でも 200 でデフォルトに倒す**。外部サービスのエラー本文は返さない）:
```json
{ "decision_id": "d_01J8...", "default": false, "shadow": false, "policy": "prior-v1",
  "slots": { "slot-mid": { "block_id": "sg-web", "variant": "cost", "propensity": 0.96 },
             "slot-end": { "block_id": "sg-pricing", "variant": "default", "propensity": 0.31 },
             "slot-bar": { "block_id": "ct-diagnostic", "variant": "strong" } } }
```
- `sg-solution` / `sg-works` は `industry` キー（業種ラベル）を付けて返す: `{ "block_id":"sg-works", "variant":"default", "industry":"不動産" }`。
- **2026-09-21**: `rl-related` は `related`（slug の配列。関連度の高い順に最大3本）を付けて返す:
  `"slot-mid": { "block_id": "rl-related", "variant": "default", "related": ["clinic-web", "realty-lp", "seo-basics"] }`。
  候補が無い（記事以外のページ・すでに全部読んだ）ときはキーごと無く、クライアントが従来どおり選ぶ（4.4）。
- 処理の順: メソッド／`NQ_ENABLED!=='1'` なら即デフォルト → Content-Type が `application/json` 以外は即デフォルト
  （`/api/suggest` のみ。プリフライトなしのクロスオリジン POST を受けないため。nq-event は sendBeacon の text/plain を受ける）／ボディ上限 8KB →
  Origin 検証（nortiqlab.com / www は名前で許可。それ以外は同一オリジン = Origin（無ければ Referer）のホストが x-forwarded-host（無ければ host）と
  一致するときだけ。プレビューとローカル確認はこれで通る。`*.vercel.app` は名前では許可しない）→
  bot UA → 入力検証（`session_id` は `/^r_[a-z0-9]{6,16}$/`、trigger は T1〜T3、URL は catalog に在るものだけ、列挙値は許可リスト、
  `passed` は blocks に在る ID だけ）→ サーバ側で catalog から日本語の state を組み立てる → `decide()` → `applyRules()` → ログ → 応答。
- `nq_model` は方策によらず読む（`decide()` と並行。上限 300ms・10分キャッシュ）。prior は `aux`（V と cov）だけを特徴量に使い、
  学習済みの重みは `NQ_POLICY=ts` のときだけ使う。prior の順位・期待値・選択確率は aux の有無で変わらない（dv / cov の事前平均が 0 のため）。
- ログの `latency_ms` は `decide()`（Jev の呼び出し）だけの時間。訪問者から見た往復時間はクライアントが測る（4.3）。
- ホールドアウトは `session_id` のハッシュから決定的に決める（`NQ_HOLDOUT_RATE`、既定 0.2）。ホールドアウトでも判定は行い、
  ログに残し、応答は `default:true`。`NQ_SHADOW==='1'` のときも判定とログだけ行い `default:true, shadow:true`。

### 6.2 `api/_lib/`
| ファイル | 公開する関数 |
|---|---|
| `data.js` | `labels` `rules` `blocks`（`data/*.json` を require。承認済み variant だけを配信対象として扱うヘルパー `deliverable(block, variant)`）、`catalog`（`../_data/catalog.json` を try/catch で require。無ければ catalog-pages.json だけで代替）。**2026-09-21**: `articleAudienceLabels()`（`labels.article_audience.criteria` のキー。無ければ既定の3語）、`articleAudience(page)`（記事の audience の列挙値。列挙外・記事以外は null）、`relatedSlugs(url)`（記事の `related`。自分・重複・slug の形でないものを除き最大 `MAX_RELATED` = 12） |
| `guard.js` | `checkOrigin(req)`（本番ドメインは名前で、それ以外は同一オリジンだけ許可。6.1）`isBot(ua)` `validSessionId(s)` `isHoldout(sessionId, rate)` |
| `state.js` | `buildState(raw)` → `{ ok, state, currentUrl, landingUrl, passed, viewedUrls, revisit }`。設計書6章の日本語キーの state を返す。**2026-09-21**: 着地ページと閲覧履歴の記事に `"対象"`（記事の audience の列挙値。現在のページには付けない）。記事の `need` は `rules.state.article_need === true` のときだけ着地ページに入れる（既定は入れない）。`"対象"` は `rules.state.article_audience !== false` のとき（既定は入れる）。ページ型のラベルは `labels.page_type_labels`（company → 会社情報、recruit → 採用情報） |
| `questions.js` | `buildQuestions({ passed, currentUrl, viewedUrls })` → `{ questions, candidates, related_candidates }`。質問の並びは visitor_type / industry / need（Choice）、stage（Score。`labels.stage`）、**`intent_compare` / `intent_contact`（Noul。`labels.intents`。行6の mode=noul 用。Score と並べて常に両方聞く）**、**カードごとの関連度 `rel_<block_id>`（Noul。指示文は「この訪問者は次の説明に当てはまる：{audience}」）**、**関連記事の候補ごとの `rel_article_<slug>`（Noul。「この訪問者は次の記事を読むと役に立つ：{title}（{audience}）」。`labels.rel_article.instructions`）**、concern_×5、cta_ok。関連度を聞くカード（= candidates）は `selectable` かつ承認済みで、`passed`・現在のページ自身を指すブロック・すでに読んだページを指すブロックを除いたもの（7章「1. 候補を絞る」。ここは学習させずルールで固定）。`sg-solution` / `sg-works` はブロックの audience で1問ずつ。`related_candidates` は現在のページが記事のとき catalog の `related` から既読と catalog に無い記事を除いた slug の配列（`pickRelated()`。それ以外は `[]`）。質問数が `MAX_QUESTIONS`（40）を超えたら assert で throw（suggest.js が拾ってデフォルト。設計書13章「1回の質問数は固定」） |
| `features.js` | `FEATURES`（共有の重みの並び。下記 6.4）、`featureVector({ rel, card, answers, slot, currentUrl, revisit, aux })` → number[]、`priorModel(cardIds)` → `{ mean, variance }` |
| `recommend.js` | `recommend({ answers, candidates, slots, currentUrl, revisit, model, policy, rng })` → `{ picks: { [slot]: { block_id, propensity } }, candidates: [...ログ用], policy, explored }`。純関数（rng を注入できる）。blocks の `only_visitor_types` に在る訪問者タイプ（`answers.visitor_type.choice`。確信度は問わない）のときだけ候補にする。外した候補は `excluded:'visitor_type'`（`sg-recruit` は「求職者・学生」だけ。関連度は聞き続け、ログに残る） |
| `model.js` | `async loadModel()` → 最新の `nq_model` 行（mean / variance / aux）を Supabase から読み、モジュールスコープに10分キャッシュ。未設定・失敗・0行なら `priorModel()`。応答を遅らせない（300ms 上限）。`NQ_POLICY=ts` で最新の行が3日より古ければ `[nq] model stale_days N` をログに出す（重みは使い続ける） |
| `decide.js` | `async decide(state, questions, opts)` → `{ provider, model, answers, latency_ms }`。`NQ_MODEL_PROVIDER` = `stub`（既定）/ `jev`。answers は正規化形（下記）。0〜1（score は 0〜段階数−1）の外の数値は丸めずに「回答なし」（null）として扱い、`[nq] jev out_of_range <個数>` をログに出す |
| `rules.js` | `applyRules({ answers, trigger, currentUrl, viewedUrls, picks, relatedCandidates? })` → `{ slots, is_default, matched, skipped }`。純関数。行5のカードは `recommend()` の結果（picks）を受け取って配置する。すでに読んだページ（viewedUrls）を指す提案カードは、ルールが直接決める行3の `sg-recruit` も含めて採用しない（`rs-*` / `ct-*` は対象外）。**2026-09-21**: `relatedCandidates`（questions.js が質問した slug の配列）は任意で、無ければ `pickRelated()` で同じ集合を組み直す。rl-related を置くとき slot に `related`（`pickRelatedArticles()`: `rel_article_<slug>` が `rel_floor` 以上のものを高い順に `RELATED_COUNT` = 3 本。足りなければ候補の先頭で埋める。候補が無ければキー無し）。行6は `ctaConfig()`（`rules.cta`。後方互換で `thresholds.stage_cta / stage_contact / cta_ok` も読む）の `mode` と `gate_visitor_types` で決める（6.3） |
| `log.js` | `logDecision(row)` `logEvent(row)`。`SUPABASE_URL` 未設定なら no-op。PostgREST へ fetch（`Prefer: return=minimal`、400ms タイムアウト）。IP・UA 全文は保存しない |

answers の正規化形:
```js
{ visitor_type: { choice, confidence, probabilities: {label: p} }, industry: {...}, need: {...},
  stage: { score, confidence, probabilities }, intent_compare: { noul }, intent_contact: { noul },
  concern_cost: { noul }, ..., cta_ok: { noul },
  "rel_sg-web": { noul }, "rel_sg-pricing": { noul }, ..., "rel_article_clinic-web": { noul }, ... }
```

Jev プロバイダ: `POST https://api.typesafe.ai/v1/systemone`、`Authorization: Bearer ${JEV_API_KEY}`、
body `{ model: JEV_MODEL（既定 "jev-1.13.0"。latest は使わない）, state, questions }`、question の `type` は小文字
（`choice` / `score` / `noul`）。レスポンスは `answers[key].{choice,probabilities,confidence | score,... | noul}`。
score の `probabilities` は配列・マップの両方を受ける。`AbortSignal.timeout(rules.model_timeout_ms)`。リトライしない。
詳細は `docs/nq/jev-api-notes.md`。

### 6.3 ルール（設計書6章の表 ＋ 未定義部分の暫定。2026-09-21 決定 2章・5章を反映）
訪問者タイプは5ラベル（事業者／同業者・学習者／求職者・学生／営業・売り込み／other）。行2〜4が見るのは後ろの3つで、事業者と other は行5以降に進む。
1. ホールドアウト・bot・エラー・タイムアウト → デフォルト
2. visitor_type「営業・売り込み」≥0.6 → 何も変えない
3. 「求職者・学生」≥0.6 → カードのスロット（T1: slot-mid ／ T2: slot-next）に `sg-recruit`
4. 「同業者・学習者」≥0.6 → T1 の slot-mid に `rl-related`（T2 は何も変えない）。記事3本は **質問した関連候補（`rel_article_<slug>`）の関連度の高い順**に slot の `related` に入れる（`rel_floor` 未満は落とし、足りなければ候補の先頭で埋める）。候補が無ければ `related` を付けず、クライアントが従来どおり決める（4.4）
5. 関連度 `rel_*` の最大値 ≥0.55 → 6.4 の推薦アルゴリズムが選んだカード。variant は「≥0.6 で最大の不安」に対応するものがブロックに在ればそれ、無ければ default。
   - T1: 1枚目を slot-mid に。slot-end は (a)「最大の不安 ≥0.6 で、かつ1枚目にその不安の variant が無い」なら `rs-<不安>`、(b) そうでなければ推薦アルゴリズムの2枚目（1枚目と違うページ群）、(c) 2枚目の候補が無ければ変えない。
   - T2: 1枚目を slot-next に。
   - `sg-solution` / `sg-works`: industry の確信度 ≥0.6 かつ `by_industry` に在れば業種版。無ければ `sg-works` はトップレベル、`sg-solution` は候補から外す。
6. 強い CTA（`data/nq-rules.json` の `cta`。`rules.js` の `ctaConfig()`）。行5と同時に成立してよい。行2〜4に当たったら評価しない。
   - **ゲート**: visitor_type の第1候補（確信度は問わない）が `cta.gate_visitor_types`（既定 `["事業者","other"]`）に在るときだけ評価する。空なら無条件（段階2・3の基準値の形）。
   - `mode: "score"`（既定）: cta_ok ≥ `cta.cta_ok`（0.7）かつ stage ≥ `cta.stage_cta`（2.0。仮置き。人が 2 以上と付けたセッションの Jev スコア分布から置き換える）→ slot-bar を strong に。stage ≥ `cta.stage_contact`（2.5）なら `ct-contact`、それ未満は `ct-diagnostic`。
   - `mode: "noul"`（Score で分離できなければ切り替える）: cta_ok ≥ `cta.cta_ok` かつ `intent_contact` ≥ `cta.contact`（0.6）→ `ct-contact`、そうでなく `intent_compare` ≥ `cta.compare`（0.6）→ `ct-diagnostic`。
     ct-contact にも cta_ok を要求する（決定文は後者に cta_ok が掛かるか曖昧だが、強い方の CTA の条件を緩めない側に倒した）。
   - 旧の `thresholds.stage_cta / stage_contact / cta_ok` は `cta` に統合（`cta` に無ければ thresholds を読む後方互換だけ残す）。
7. どれにも当たらない → デフォルト

### 6.4 推薦アルゴリズム（設計書7章）

- **候補**: 6.2 の candidates のうち、関連度 ≥ `rel_floor`（**0.45**。2026-09-21 決定 4章で 0.35 から上げた。0.35〜0.45 の帯は 当たり7・外れ18）で、`only_visitor_types` の制限（6.2）に掛からないカード。
  最大の関連度 < `rel_gate`（0.55。据え置き）ならデフォルト（探索もしない）。下限は探索と2枚目の候補にしか効かず、1位のカードは取りこぼさない。0.45〜0.55 の帯はシャドーモードの実データで再確認する。
  `rel_floor` は関連記事の候補（6.3 の行4）にも同じ値を使う。
- **特徴量**（共有の重み10個。この順で固定。`FEATURES`）:
  `bias`（常に1）, `rel`（関連度のロジット。±4で打ち切り）, `dv`（V(提案先) − V(現在のページ)。aux に無ければ 0）,
  `cov`（現在のページ→提案先の遷移割合の対数比。無ければ 0）, `ind_match`（Jev の industry が提案先ページの industry タグに在れば1）,
  `need_match`（同じく need）, `stage_goal`（stage.score/3 × goal_proximity）, `slot_end`, `slot_next`（slot-mid 基準の 0/1）, `revisit`。
  これにカード別の補正（selectable なカード13個ぶん）を足して合計23個。タグは `api/_data/catalog.json` の提案先ページから引く。
  goal_proximity はブロックの値、無ければ `data/nq-rules.json` の `recommend.goal_proximity_by_type`。
- **事前分布**: 平均は bias −3.5、rel 0.5、ほか 0。標準偏差は共有の重み 0.5、カード別の補正 0.35（`data/nq-rules.json` の `recommend.prior`）。
- **方策**（env `NQ_POLICY`）:
  - `prior`（既定。フェーズ1〜2）: 事前分布の平均（学習済みの重みがあっても使わない。`nq_model` から使うのは aux だけ）で期待値を計算し最大を選ぶ。一様探索5%だけ。
    選択確率は厳密に `0.95·[最大か] + 0.05/候補数`。policy 文字列は `"prior-v1"`。
  - `ts`（フェーズ3）: `loadModel()` の事後分布（対角の分散）から重みを1組引き（トンプソン抽出）、期待値最大を選ぶ。一様探索5%。
    選択確率は200回の抽出での頻度から `0.95·頻度 + 0.05/候補数`。policy 文字列は `"ts-v1"`。
  - 一様探索で選んだかどうかを `explored` として返し、ログの policy 列には `"ts-v1"` / `"ts-v1+explore"` のように残す。
- **2枚を同時に決める**（T1）: 2枚目は、1枚目と提案先のページ群（catalog の type）が違う候補から同じ方法で選ぶ。選択確率は1枚目を所与とした条件つき。
  2枚目の pool（1枚目とページ群が違う候補）の最大関連度にも `rel_gate` を掛け、未満なら2枚目は選ばない（slot-end は 6.3 の (c) で変えない）。
- **ログ**: `candidates` = 候補ごとの `{ block_id, rel, features, score（事前/事後平均での期待値）, propensity }`。候補から外したものは `excluded` に理由
  （`not_selectable` / `rel_floor` / `visitor_type` / `no_industry` / `unapproved` / `same_page` / `viewed`）。
- データが0件の日、順位は関連度の順と一致すること（テストで保証する）。

### 6.5 夜間バッチ `GET /api/nq-train`（Vercel Cron。設計書7章「4. モデル」「6. 評価」）

- `vercel.json` の `crons` に1日1回（UTC 18:00 = JST 03:00）。`Authorization: Bearer ${CRON_SECRET}` を検証。`NQ_LEARN!=='1'` か Supabase 未設定なら何もしないで 200。
- やること: (1) 直近の `nq_decisions`（shadow でも holdout でもなく、個別化カードを返したもの）と `nq_events` を PostgREST からページングして読む。
  新しい順に、前ページの最後の時刻を次ページの上限にする時刻カーソルで読む（offset は使わない）。ページ上限（300）か読み込みの持ち時間
  （30秒。decisions 20% / paths 50% / events 100% の絶対締め切り）に当たったら失敗にせず、読めたぶんで学習し、応答とログに
  `truncated:{decisions,events,paths}` を残す。イベントは直近180日だけ全件、180〜365日は decision_id つきの行とゴールだけを読む。
  (2) 表示（shown）されたカードごとに学習行を作る: 特徴量はログの candidates から、成果は「クリック後に engaged」で 1、ゴール到達は重み3。ログは半減期60日で重みづけ。
  (3) ガウス事前分布つきロジスティック回帰の MAP をニュートン法で求め、ヘッセ行列の逆行列の対角を分散とする（ラプラス近似。23次元なので素の JS で解く）。
  (4) セッションごとの閲覧履歴から `nq_transitions` を作り直し、吸収マルコフ連鎖として V(ページ) を解く（件数の少ないページはページ群の平均へ寄せる）。cov も同時に作る。
  cov は、一度も進んでいない提案先にも同じ平滑化の式の値 `log(smooth/(件数+smooth))` を入れる（件数による切り替えはしない。
  進んだ提案先が進んでいない提案先より必ず上になる）。`aux.cov` は「遷移表に出てくる全 from ページ × 提案先」の大きさになる。
  (5) `nq_model` に1行追加（version, mean, variance, n_impressions, aux = { V, cov }）。
  (6) オフポリシー評価: 記録した選択確率の逆数（20で打ち切り）で重みづけし、「関連度だけの順位」と「学習後の順位」の推定成果率を出して同じ行の `ope` に残す。
  lift は1枚目のスロット（slot-mid / slot-next）の行だけで出す（slot-end は `ope.by_slot['slot-end']` に参考値として分ける。lift は持たせない）。
  `rel_only` / `learned` には打ち切られた行数 `clipped` を出し、`lift_ips` は両方とも `clipped = 0` かつ一致した行が在るときだけ数値（それ以外は null）。
  判断は `lift_snips` と `ess` で行う。
- 数学部分は `api/_lib/learn.js` に純関数で置き、合成データのテストで「真の重みを回復する」「データ0件なら事前分布に一致する」を確かめる。

### 6.6 `POST /api/nq-event`
`{ session_id, decision_id|null, type: "shown|click|engaged|dismiss|goal|decide", slot, block_id, variant, page_url, goal, read, result, latency_ms }`
（`read` は engaged のときの読み方 deep / skim。`result`（ok / timeout / http / format / network）と `latency_ms`（ブラウザで測った `/api/suggest` の往復。0〜60000 の整数）は
decide のときだけ。decide の行は slot / block_id / variant を持たない。`result` / `latency_ms` の列は decide の行にだけ入れて送る
（Supabase に列を足す前にデプロイしても、落ちるのが decide の行だけで済むように））。
sendBeacon の文字列ボディを受ける。ホワイトリスト検証のうえ `nq_events` に挿入。`NQ_ENABLED!=='1'` か Supabase 未設定なら 204 で何もしない。

### 6.7 環境変数
`NQ_ENABLED` `NQ_SHADOW` `NQ_HOLDOUT_RATE` `NQ_POLICY`（prior / ts） `NQ_LEARN` `CRON_SECRET` `NQ_MODEL_PROVIDER` `JEV_API_KEY` `JEV_MODEL` `JEV_BASE_URL`
`SUPABASE_URL` `SUPABASE_SERVICE_ROLE_KEY`

### 6.8 その他
- `vercel.json` の `functions` に `api/suggest.js` `api/nq-event.js`（maxDuration 10）と `api/nq-train.js`（maxDuration 60）、`crons` に nq-train。
  3つとも `includeFiles: "api/_data/**"`（ビルド生成物の catalog.json を Function に同梱する保険。同梱されなくても data.js は catalog-pages.json に落ちて動く）。
- `package.json` に `"test": "node --test \"api/_lib/*.test.js\""`（Node 24 は `node --test api/` をモジュールパスと解釈して失敗する）。
- `supabase/nq_schema.sql`: nq_decisions（設計書10章の列。candidates / policy を含む）、nq_events（＋ variant, session_id, page_url, goal, read, result, latency_ms。decision_id は null 可。result / latency_ms は `type = 'decide'` の行だけ）、
  nq_model（version, created_at, mean, variance, n_impressions, aux, ope。mean / variance は「名前 → 数値」の jsonb。名前は `features.js` の `weightKeys()`）、
  nq_transitions（from_url, to_url, count, goal_count, updated_at。主キー (from_url, to_url)。nq-train は upsert してから古い updated_at の行を消す）、
  nq_monthly（month, created_at, metrics jsonb。生ログを消す前の月次の集計値）。RLS 有効でポリシー無し。
  関数 `nq_snapshot_month` / `nq_purge(13)`（未集計の月を集計してから、13か月より前の生ログを日本時間の月単位で削除）/ `nq_month_range` / `nq_page_group` / `nq_is_service_group` / `nq_session_summary`
  （security invoker・実行権なし。public のビューは RLS を素通りするので関数にしてある）。`nq_page_group` は URL の形でページ群を決めるので、catalog-pages.json にページ群や URL を足したらこの関数も直す。
  /subsidy だけは catalog の `type: goal` と分け方が違い、`'goal_info'` として K2（記事→サービス遷移率）の到達先に数える
  （/subsidy に着いても nq_goal は出ないため。`open-decisions.md` E9）。
  12章の nq_gsc_rows ほか9テーブルは `nortiq-pipeline` 側の仕事なのでここでは作らない。
- `supabase/nq_report.sql`: 10章の月次指標（カード別の実力・学習による推定改善幅を含む）と KPI のクエリ。
  K5 は `type = 'decide'` の行から出す「`/api/suggest` の応答が 1.2秒以内に間に合った割合」（フェーズ1の完了条件）。
  `nq_snapshot_month` の metrics にも `suggest_calls: { n, ok, timeout, other_fail }` を残す。

---

## 7. 設計書からの読み替え（理由つき）

| 設計書 | 実装 | 理由 |
|---|---|---|
| catalog.json は front matter から生成 | `data/catalog-*.json` ＋ BLOG 配列から生成 | front matter はリポジトリに存在しない。BLOG は外部パイプラインが書くので触れない |
| HTML に先に描画し JS は中身だけ差し替え | React がデフォルトを同期描画 → プリレンダが焼き込み → state で差し替え | `createRoot` が全DOMを作り直し、`key={route}` で遷移ごとに再マウントされる |
| トークン `--c-*` `--s*` を継承 | `.nq-*` にスコープした別名で既存変数へ橋渡し | 継承元のトークンはどこにも定義が無い。`--ease-out` は別値で既存 |
| `--c-accent` #E5602B（仮） | 既存の `--accent`（赤） | 「新しい色は足さない」。橙はサイトに存在しない |
| CtaBar（全幅56px・全ページ） | 既存 StickyCTA をその場で拡張（PC のみ） | SP は固定ナビと2段になる（過去に問題として撤去済み）。ベースラインを汚さない |
| slot-next のデフォルト = 既存の赤帯 | 赤帯は固定。その上に提案カード形式のデフォルトを置く | 赤帯とカードは高さも見た目も違い、差し替えるとレイアウトがずれる |
| 22ブロック | 23ブロック（`sg-guidebook` を追加） | slot-end のデフォルト「資料DLカード」に当たるブロックが無い |
| クライアントが state を組み立てて送る | クライアントは URL と列挙値だけ送り、サーバが catalog から組み立てる | 自由文の混入（6章の禁止事項）を構造で防ぐ |
| slot-mid は 50〜60% の h2 直前 | 40〜70% で 55% に最も近い h2（無ければ h3）。2,000字未満は出さない | 50〜60% に h2 がある記事は 63/96。短い記事は slot-end と同じ画面に入る |
| nq_events の受け口が未定義 | `/api/nq-event` を追加 | ブラウザに Supabase のキーを出さない |
| 完了条件「応答の9割が1.2秒以内」の測り方が未定義。nq_decide は応答したときだけ | 捨てた回も `nq_decide_fail` として数え、`nq_events` に `type:'decide'`（result, latency_ms）を足す | `nq_decisions.latency_ms` は Jev の時間だけで 900ms で頭打ち。打ち切った回はブラウザからしか数えられない |
| 候補の絞り込みは「訪問者タイプで対象外のカードを除く」 | blocks の `only_visitor_types`（`sg-recruit` だけ） | どのカードがどのタイプ向けかをデータで持つ。関連度は聞き続け、除外はログで検証できる |
| slot-mid は J2 が決めた節の直後 | overrides の `mid_before_h2` を読む口だけ用意。無ければ 40〜70% の規則 | J2 の本体は nortiq-pipeline 側。未判定の記事は設計書も「50〜60%地点」 |
| RelatedList の3本も7章の式で並べる | 2026-09-21 から: ビルド時に記事ごと最大12本の候補を結び付け、実行時に Jev がその中の関連度（`rel_article_<slug>`）で3本を選ぶ。判定が無いときは候補の先頭3本（＝旧の同カテゴリ新着順） | 記事が増えても質問数を固定するため（設計書13章）。7章の式（dv / cov）で並べるのは学習開始（フェーズ3）の課題のまま |
| 記事の need タグを状態に渡す | 渡さない。代わりに記事の `audience`（対象読者）を「対象」として渡す | Jev がタグをそのまま訪問者のニーズと答え、技術記事を読んだだけの人に「AI導入」が付いた（2026-09-21 決定 3章） |
| /company /staff は「信頼・条件」 | type `company`（会社情報）。/recruit は `recruit`（採用情報） | 会社概要・スタッフ紹介を見た求職者・営業に高い検討度が付いた（2026-09-21 決定 2章） |
| nq_model は mean / variance / n_impressions | `aux`（V と cov）と `ope`（オフポリシー評価）の列を足す | リクエスト時に dv / cov を引く置き場と、月次レポートの「推定改善幅」の置き場が要る |
| 12章 J1〜J9 | このリポジトリでは未実装 | 記事パイプラインは別リポジトリ（nortiq-pipeline）。Search Console API の接続など前提が未決 |
