# prerendered/ — DO NOT EDIT BY HAND（手動編集禁止）

このディレクトリ内の HTML は **`build-prerender.js` が自動生成**したスナップショットです。
人間が直接編集しないでください。編集しても次回の再生成で上書きされます。

## これは何か
SPA（クライアントレンダリング）のままだとクローラーが本文を取得しづらいため、
ローカルの headless Chromium で各ルートを**レンダリング後のHTML**として保存したものです。
デプロイ時に `build.js` が `prerendered/ → dist/` へコピーします（Vercel ではこのコピーのみ実行）。

> なぜローカル生成なのか: Vercel のビルドコンテナには Chromium のシステムライブラリ
> （`libnspr4` 等）が無く、ビルド中に Playwright を起動できないため。生成はローカルで行い、
> 成果物をコミットして配信します。

## 再生成手順（コンテンツ/ページを変更したら必ず実行）
```bash
npm run build:full      # = node build.js && node build-prerender.js
git add prerendered/
git commit -m "chore: regenerate prerendered snapshots"
git push
```

## 鮮度チェック
```bash
npm run prerender:check   # ソース(content/blog, *.jsx, styles.css)が prerendered より新しい場合 exit 1
```
CI / pre-commit に組み込むと「編集したが再生成し忘れた」を検出できます。

## 対象ルート（ロールアウト）
生成対象は `build-prerender.js` の `ROUTES_ALLOWLIST` で制御します。
- 現在: `['/']`（トップのみ）
- 拡張時: 主要ページ → 全URL（`[]` にすると `sitemap.xml` の全URL）

## ロールバック
`prerendered/` を削除（または空に）すれば、`build.js` のコピーは自動スキップされ、
**純SPA（従来どおり）に戻ります**。
