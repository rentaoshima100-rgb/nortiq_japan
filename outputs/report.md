# NORTIQLAB — SEO インデックス問題 調査・対応レポート

最終更新: 2026-05-23

---

## フェーズ1：コードベース調査（確定）

### 採用スタック
**フレームワークなしの自前静的ビルド**（Vite/Next/Nuxt/Angular/Svelte/Astro いずれも不使用）。

- React 18 を **UMD グローバル**で読み込み（`assets/vendor/react.production.min.js` / `react-dom.production.min.js`）。npm 依存に React は無い
- JSX は **classic ランタイム**（`React.createElement`）。各コンポーネントは `*.jsx` で定義し `Object.assign(window, {...})` でグローバル登録
- ビルド: 自作 `build.js`（`@babel/core` + `@babel/preset-react` で各 jsx をトランスパイル → 連結 → `terser` で `dist/app.bundle.js` に minify）
- コンテンツ生成: `marked` v12 でビルド時に Markdown→HTML（`dist/articles.js` = `window.NORTIQ_ARTICLES`）
- 画像: `sharp`（>1600px リサイズ + WebP 生成）
- `package.json` deps: `sharp` のみ／devDeps: `@babel/cli` `@babel/core` `@babel/preset-react` `marked` `terser`

### ルーティング方式
自前のステートベース・ルーティング（`app.jsx` の `ROUTES`）。`react-router` 不使用。`history.pushState` + `popstate` で実 URL 同期（`/web` `/works` 等）。Vercel 側で `rewrites: /(.*) → /index.html`（SPA フォールバック）。

### データ取得パターン
- ビルド時: Markdown → `window.NORTIQ_ARTICLES`（記事本文はビルド時に HTML 化済み・JS に同梱）
- クライアント: `fetch('/api/diagnose')` `fetch('/api/contact')`（Vercel Serverless Functions）。axios/GraphQL なし

### 既存 SEO 実装
- 静的 `<head>`（build.js 生成）: title / description / canonical / OGP / Twitter / JSON-LD `@graph`（Organization+founder / WebSite / ProfessionalService / FAQPage）
- クライアント側でルート毎に更新（`app.jsx`）: canonical・description・og:url/title/description・twitter、`route-ld`（Service / BreadcrumbList / Review）、記事は `BlogPosting` を head に動的注入
- react-helmet / next-head 等は不使用（素の DOM 操作で head 更新）
- robots.txt / sitemap.xml(50URL) はビルド時生成

### ビルド/デプロイ
`npm run build` → `node build.js` → `dist/`。Vercel（`buildCommand: node build.js` / `outputDirectory: dist` / `framework: null` / SPA リライト / `api/*` Functions / 全アセット `?v=` キャッシュバスター）。

### SSR 化の難易度
- **Next.js 移行 = 高**：バンドラ無し・ESモジュール無し・UMDグローバル・classic createElement・window 登録という非標準構成のため、移行ではなく実質フルリライト。
- **プリレンダリング追加 = 低〜中**：SPA は既に URL ルーティング対応済みで、各ルートを開けば React が正しく描画する（Playwright/Chromium で全ルート描画を確認済み）。既存ビルドの後段に headless Chromium を足し、各ルートをレンダリング後 HTML として保存すれば本文入り静的 HTML を配置可能。既存コードはほぼ無改変。

---

## フェーズ2：SPA 問題の確定診断（確定）

Googlebot UA（`Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)`）でレンダリング前の生 HTML を取得・計測。

| URL | body内テキスト文字数 | h1–h6 | p | article | HTML | 判定 |
|---|---|---|---|---|---|---|
| `/` (top) | 0 | 0 | 0 | 0 | 4,053 B | 空 |
| `/web` | 0 | 0 | 0 | 0 | 4,053 B | 空 |
| `/works` | 0 | 0 | 0 | 0 | 4,053 B | 空 |
| `/article-japan-dx` | 0 | 0 | 0 | 0 | 4,053 B | 空 |
| `/article-vetonet` | 0 | 0 | 0 | 0 | 4,053 B | 空 |

**判定：SPA確定（Client-Side Rendering）。**
全 URL で本文・見出し・段落・記事要素が 0。5URL が完全に同一の 4,053 バイト（SPA リライトで全ルートが同一 index.html を返す）。本文だけでなくページ別 title/canonical も生 HTML には無く、JS 実行後に初めて差し替わる。

### 「ツールが JS を実行できないだけ」可能性の切り分け
curl/生 fetch は JS を実行しないため、SPA なら必ず本文 0 になる。よって本結果は「CSR である」ことは確定するが、それ単独では「Google がインデックスできない」ことの証明にはならない（Google は後追いで JS をレンダリングする）。切り分けには：

- **GSC「URL 検査 → 公開 URL をテスト → レンダリング済み HTML を表示」を併用する**
  - レンダリング後 HTML に本文＋ページ別 canonical が入っていれば → Google は描画できている（遅延が本質。SSR/プリレンダで確実性とスピードを底上げする価値）。
  - レンダリング後も空なら → Googlebot のレンダリング段階で失敗（JS エラー等）＝より深刻。要修正。
- 補助ツール: Google「リッチリザルト テスト」「Mobile-Friendly（旧）」のレンダリング結果も同様の確認に使える。

---

## フェーズ3：解決策（決定）
3案（A: Next.js移行 / B: Astro等ハイブリッド / C: Playwrightプリレンダ後段）を比較し、
**案C（プリレンダ後段）** を採用。A/Bは非標準構成（UMD・classic createElement・window登録）の
ため実質フルリライトで、効果は同等なのに工数・リスク・維持責任が突出するため却下。

さらに案Cの実装方式として、Vercelビルド環境で Chromium が起動しなかった（後述）ため
**C-local（ローカルでプリレンダ生成 → prerendered/ をコミット → build.js が dist へコピー）** に決定。

## フェーズ4：実装
- **build-prerender.js（新規）**: dist をローカル配信し headless Chromium で各ルートを描画、
  レンダリング後HTMLを `prerendered/<route>/index.html` に保存。相対アセットを絶対(/)へ書換
  （`<base>` 不使用＝`href="#"` 挙動を維持）。`ROUTES_ALLOWLIST` で部分ロールアウト制御。
- **build.js**: `dist/app.html`（canonical除去のクリーンSPAシェル）を出力。末尾で
  `prerendered/` があれば `dist/` へ冪等コピー（無ければ純SPAへ自動フォールバック）。
- **app.jsx**: ルート遷移時に canonical を「無ければ生成」してページ別URLに設定。
- **vercel.json**: `rewrites` の宛先を `/app.html`（未プリレンダのみクリーンシェル配信。
  プリレンダ済みはファイルシステム優先で配信）。buildCommand/installCommand は Chromium無しに復帰。
- **安全装置**: `prerendered/README.md`（編集禁止・再生成手順）／`npm run prerender:check`
  （ソースが prerendered より新しければ exit 1）／build.js コピーは存在時のみ実行（冪等）。

### Vercelビルドでの Chromium 起動失敗（重要な知見）
オンVercelで `npx playwright install chromium` は成功するが、ビルドコンテナに
`libnspr4.so` 等のシステムライブラリが無く Chromium が exit 127。`--with-deps` は
apt/root前提で不可。→ プリレンダはローカル生成＋コミット方式（C-local）に確定。

## フェーズ5：検証（本番 nortiqlab.com・Googlebot UA）
| URL | bytes | body本文 | canonical(生HTML) |
|---|---|---|---|
| `/` | 100,690 | 7,288 | https://nortiqlab.com/ |
| `/web` | 6,008 | 0 | （なし＝クリーンシェル）|
| `/works` | 6,008 | 0 | （なし）|
| `/article-japan-dx` | 6,008 | 0 | （なし）|

- トップ＝レンダリング済み本文あり（フェーズ2の body 0 を解消）。
- 未プリレンダのサブページ＝クリーンシェル（本文0・canonicalなし・キャッチコピーなし）→ revert基準すべて非該当。
- ヘッドレス確認: ナビ遷移で URL/ canonical がページ別に更新（JS生成）、お問い合わせモーダル開閉OK、コンソールエラー0。

## フェーズ6：最終まとめ
- **確定原因**: 全URLが本文0の同一4KB shell を返すCSR(SPA)。クローラーの2段階レンダリング遅延でインデックスされにくい。
- **採用approach**: C-local プリレンダ（ローカル生成＋コミット、Vercelはコピーのみ）。
- **変更/新規ファイル**: build-prerender.js / prerender-check.js / prerendered/（README + 各ルートHTML）/ build.js / app.jsx / vercel.json / package.json。
- **新ビルド/デプロイ手順**:
  1. コンテンツ/ページを変更したら **ローカルで `npm run build:full`**（build + prerender）
  2. `git add prerendered/ && commit && push`（main）→ Vercelが `node build.js` で dist へ overlay 配信
  3. 鮮度チェック: `npm run prerender:check`
- **デプロイ後アクション**: Google Search Console で対象URLを「URL検査 → 公開URLをテスト →（レンダリング済みHTMLに本文確認）→ インデックス登録をリクエスト」。sitemap.xml(50URL)は送信済み。
- **既知のリスク / 後追い**: (1) コンテンツ変更時のプリレンダ再生成忘れ → prerender:check で検知。(2) ロールアウトはトップ→`['/','/web','/works','/voice']`(別ブランチ `ssr-prerender-expand-4` 準備済)→全50URL の順。(3) 将来 GitHub Actions でプリレンダ自動化すれば手動コミット不要。
- **ロールバック**: `prerendered/` を削除してコミット（build.js のコピーが自動スキップ＝純SPA復帰）、または該当マージコミットを `git revert`。数分で完全復帰。

### GSC スクリーンショット（ユーザー追記欄）
（URL検査「公開URLをテスト」のレンダリング済みHTML確認・インデックス登録リクエストのスクショをここに貼付）

---

## フェーズ7：アクセス解析（GA4）＋ Google Ads コンバージョン計測（2026-05-25）

### 実装概要
- **GA4 / Google Ads gtag.js を `<head>` に設置**（`build.js`）。`index.html` と `app.html` の共通ヘッドテンプレートに注入するため、両シェル＋プリレンダ済み全 HTML に同一タグが入る。`<meta viewport>` 直後（＝`<head>` 冒頭・推奨位置）に配置。
- **2 つのコンバージョンを発火**：
  1. **お問い合わせフォーム送信時** — `components.jsx` の `sendInquiry()` 成功時（3 フォーム＝ContactModal / BigInlineForm / SideTabForm の共通経路）に `gtag('event','generate_lead')` ＋ Google Ads `conversion`（`send_to: contact`）。
  2. **「無料診断」CTA クリック時** — `app.jsx` の `handleNavigate()` で `id==='diagnostic'` のとき `gtag('event','diagnostic_cta_click')` ＋ Google Ads `conversion`（`send_to: diagnostic`）。サイト内の無料診断 CTA（トップ hero / フッタ / Sticky / SP ナビ / メガメニュー）はすべてこの 1 経路を通るため、ここ 1 箇所で全 CTA を捕捉。

### 計測ヘルパー（`components.jsx` `nqTrack()`）
- `gtag` 未ロード時（ローカル開発・ID 未設定時）は **完全 no-op**。`try/catch` で囲み、解析処理が UI を壊すことは絶対にない設計。
- `convKey` で `window.NORTIQ_CONV`（ヘッドの gtag スニペットが定義）から Ads の `send_to` 文字列を引く。`window.nqTrack` として公開し、バンドル全域（app.jsx 含む）から呼べる。

### 設定方法（ユーザー対応・**ここだけ埋めれば有効化**）
`build.js` 冒頭の解析設定ブロックに実 ID を貼り付け、**`npm run build:full` で再ビルド**するだけ（※ `build` だけだと、コミット済みプリレンダ `prerendered/index.html` がトップに上書きコピーされ、トップだけタグが入らない。プリレンダ再生成を含む `build:full` が必須）：

| 定数 | 値の形式 | 取得元 |
|---|---|---|
| `GA4_ID` | `G-XXXXXXXXXX` | GA4 管理 → データストリーム → 測定 ID |
| `GADS_ID` | `AW-XXXXXXXXXX` | Google Ads → コンバージョン → タグ設定（コンバージョン ID）|
| `GADS_LABEL_CONTACT` | 英数字ラベル | 〃「お問い合わせ」コンバージョンアクションのラベル |
| `GADS_LABEL_DIAGNOSTIC` | 英数字ラベル | 〃「無料診断」コンバージョンアクションのラベル |

- **未設定時は何も出力しない**（厳格な書式チェック＋`XXXX` 検出でガード）。半端なプレースホルダのまま誤って存在しないプロパティへ計測が飛ぶ事故を防止。
- GA4 だけ・Ads だけの片方設定も可（ローダ ID は GA4 優先）。Ads ラベル未入力時は該当 `send_to` が `null` になり、コンバージョンは送らず GA4 イベントのみ発火。

### Cookie 同意バナー
- **Phase 2 扱い（今回は未実装）**。日本国内向けでは現状必須ではないとの方針。EU/英国向けトラフィックを取りに行く・Google Consent Mode v2 を厳密適用する段階で別途対応。

### 検証
- プレースホルダのままビルド → `dist/app.html` ヘッドは `<!-- Analytics off ... -->` コメントのみ（タグ・外部リクエストなし）を確認。
- サンプル実 ID でスニペット生成ロジックを単体評価 → 正規の gtag.js スニペット（GA4 + Ads config + `NORTIQ_CONV`）が生成されることを確認。
- minify 後の `dist/app.bundle.js` に `window.nqTrack` / `NORTIQ_CONV` / `generate_lead` / `diagnostic_cta_click` が残存することを確認（マングルで欠落していない）。
- ※ 実 ID 設定後の **GA4 DebugView / Ads タグアシスタント実機確認は ID 投入後に要実施**（プレースホルダ段階では実発火テスト不可）。

### 後追い候補（任意）
- 無料診断の**実行**（DiagUrlForm で URL を入れて診断を回した時）を GA4 ファネルイベント `run_diagnosis` として別途計測すると、CTA クリック→実行→リードの遷移率が見える。
- Google Tag Manager 経由に切替えれば、ID やイベントをコード再ビルドなしで管理可能。

### GA4 有効化記録（2026-05-25・コミット `5f1f3f9`）
- **GA4 測定 ID 投入**: `build.js` の `GA4_ID = 'G-EYTD1TWR7T'`。Google Ads は `GADS_ID = ''`（空＝no-op、ラベルも空。Ads は後日 Phase8 で有効化）。
- `npm run build:full` で再ビルド＋プリレンダ再生成 → 公開トップ（プリレンダ HTML）の `<head>` に GA4 が入ることを確認。

**本番検証（デプロイ後 ~72s でライブ確認）**

| URL | GA4 (`G-EYTD1TWR7T`) | Ads (`AW-`) | gtag.js URL |
|---|---|---|---|
| `https://nortiqlab.com/` | 2 | 0 | `gtag/js?id=G-EYTD1TWR7T` |
| `https://nortiqlab.com/web` | 2 | 0 | `gtag/js?id=G-EYTD1TWR7T` |
| `https://nortiqlab.com/works` | 2 | 0 | `gtag/js?id=G-EYTD1TWR7T` |

- GA4 はトップ（プリレンダ）＋サブページ（app.html フォールバック）の双方で配信。Ads タグは全 URL で 0（no-op 維持）。

**/en/ Soft 404（再確認）**
- 本番リダイレクトチェーン: `/en/` → **308** → `/en` → **308** → `/` → **200 OK**。
- `permanent:true`（=308）は Google が 301 と同等の恒久リダイレクトとして扱うため SEO 等価。2 ホップは `trailingSlash:false` がスラッシュ除去を先に行うため（短い恒久チェーンでクローラ追従に問題なし）。
- `vercel.json` に redirects（`/en`・`/en/`・`/en/:path*` → `/`）あり。本番 `sitemap.xml` の `/en/` 件数 = **0**。→ **修正済み・対応不要**。

**次のアクション（ユーザー手動）**
1. GA4 リアルタイムレポートで自分のアクセスが計測されることを確認。
2. GSC でトップを「URL 検査 → インデックス登録をリクエスト」。
3. GSC で `/en/` を「URL 検査 →（リダイレクト確認）→ 修正を検証」。
4. Google Ads アカウント作成 → コンバージョン 2 件（お問い合わせ / 無料診断）作成 → ID/ラベル取得（後日 Phase8）。
