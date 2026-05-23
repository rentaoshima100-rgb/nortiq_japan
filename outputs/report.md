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

## フェーズ3：解決策（記入予定）
## フェーズ4：実装（記入予定）
## フェーズ5：検証（記入予定）
## フェーズ6：最終まとめ（記入予定）
