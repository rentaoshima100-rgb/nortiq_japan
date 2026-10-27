# サイト改修 2026-10（バナー配置・速度・テクニカルSEO・a11y）

作業ブランチ `feat/site-refresh-2026-10`（origin/main 565beafc から分岐）。
納品バナー `nortiq_banners_web.zip`（2026-10-24、9点）の配置と、Lighthouse で見つかった
速度・SEO・アクセシビリティの問題の修正をまとめて行った。配置の指示書は
[banners-placement-guide-2026-10-24.md](banners-placement-guide-2026-10-24.md)。

## 1. 納品バナーの配置

| # | ファイル (assets/banners/) | 置いた場所 | 実装 |
|---|---|---|---|
| 01 / 02 | `01_top_hero_pc_4x1` / `02_top_hero_sp_4x5` | トップ「導入実績」の直下（PC 4:1 / 767px 以下は 4:5）。公開直後はファーストビューに置いていたが、オーナーの指示でヒーローは元の「実績の壁」に戻し、バナーはここへ移した（2026-10-25） | `top-page.jsx` `.top-banner-section`。クリックは資料請求モーダル、JS 無しでは `#request` |
| 03 / 10 | `03_cta_band_4x1` / `10_cta_band_sp_4x5` | 全ページ共通のフッター直前 CTA 帯（PC 4:1 / 767px 以下は PR #18 で作られた縦長版） | `components.jsx` `RedCTAStrip`。`title` 付きのページ（採用・お知らせ等）は従来の赤帯のまま |
| 04 | `04_pricing_1x1` | `/pricing` ヒーロー右 | `PageHero` の `visual` prop |
| 05 | `05_web_1x1` | `/web` ヒーロー右 | 同上 |
| 06 | `06_chatbot_1x1` | `/chatbot` ヒーロー右 | 同上 |
| 07 | `07_dx_1x1` | `/dx` ヒーロー右 | 同上 |
| 08 | `08_diagnostic_1x1` | `/diagnostic` 見出しの横（960px 以上）／URL 入力欄の上（それ未満）。トップ PICK UP「サイト無料診断」のサムネ | `extra-pages.jsx` `.diag-hero-has-visual`、`PickupCard` の `thumb` |
| 09 | `09_guidebook_1x1` | `/guidebook` ヒーロー右、トップ「02 SALES DECK」カードのサムネ、`/pricing` 下部の資料導線 | `PageHero` の `visual`、`.promo-thumb`、`GuidebookLead` |

- 画像は `components.jsx` の `BannerImg` で出す。WebP（納品のまま）＋ srcset 用の縮小版（`-1400.webp` / `-600.webp`）＋ JPEG フォールバック。
  再生成は `node scripts/make-banners.js <zip を展開した dir> assets/banners`（sharp を使う）。
- `build.js` の `optimizeImages` は `assets/banners/` を触らない（1600px に縮めると PC の 2 倍密度で文字がぼやける）。
- 文字入り画像なので alt に画像内の文言を入れてある。04 の alt の金額は `NORTIQ_PRICING` から組み立てる。
  **画像の中の金額（30/60/120万円〜）は作成時点の値。料金を変えたら 04 の画像も作り直すこと。**
- トップのヒーロー背景「作品の壁」（実績スクショ 4 列 × 16 枚の無限スクロール）は残す（オーナー指示。一度バナーに置き換えたが戻した）。
  以前は 1600px 幅の WebP（1 枚 60〜140KB）64 枚が全部 lazy で、LCP がその中の 1 枚（モバイル Lighthouse 12 秒超）になっていた。
  いまは `optimizeImages` が作る 480px 幅の WebP を `VScrollCol` が srcset で優先し、最初に見える 2 枚ずつ（1〜2 列目）だけ eager にしている。
- **表示・クリック計測**（PR #18 の `ConvBanner` と同じ仕様）: `TrackedBanner` が 50% 以上見えたときに `banner_view`、クリックで `banner_click` を
  `banner_id` / `page_path` 付きで GA4 に送る（`nqTrack` 経由、プリレンダ中は送らない）。banner_id は `top-hero` `cta-band` `web-hero`
  `chatbot-hero` `dx-hero` `pricing-hero` `guidebook-hero` `diagnostic-hero` `guide-lead`。
  GA4 の「管理 → カスタム定義 → イベントスコープ」に `banner_id` を登録すると探索レポートで比較できる。
- **Microsoft Clarity**（PR #18 から取り込み）: `build.js` の `CLARITY_ID`。gtag と同じく DOMContentLoaded 後に読む。プリレンダ中は
  `clarity.ms` への通信を止める。プライバシーポリシー 8 条に Clarity（ヒートマップ・セッション再生）の記載を追加し、改定日を 2026-10-24 に。
- PR #18（`feat/clarity-conv-banners`）は同じ 9 点を別実装で置いていたので、`-s ours` でマージして履歴に残し、機能（Clarity・計測・SP 版の CTA 帯画像）はこの実装に移した。

## 2. 速度

Lighthouse（本番、2026-10-24、v12.8.2、モバイル）: トップ 28 点、/web 38、/pricing 34、記事 33。主因と対処:

| 問題 | 対処 |
|---|---|
| Google Fonts を `styles.css` の `@import` で読んでいた（styles.css の取得・解析後にやっと 200KB の CSS を取りに行き、描画が 3 秒前後止まる）。Noto Serif JP は未使用 | `build.js` の `FONTS_HEAD`: `preconnect` ×2 ＋ `media="print" onload` の非同期読み込み。Serif を外し、600 は 700 で代用。`build-prerender.js` が保存時に `media="print"` を戻す（`restoreAsyncFontLink`） |
| ヒーローの作品の壁（上記） | 壁は残す。画像を 480px 幅の WebP（srcset）にして先頭 2 枚ずつを eager に。ファーストビューの画像バイトは約 1MB → 約 150KB |
| gtag.js（190KB）が `<head>` の async で、モバイルでは React の起動と主スレッドを取り合っていた | `DOMContentLoaded` 後に `<script>` を追加して読む。`dataLayer` は先に作るので page_view は失われない（1〜2 秒遅れて計測される） |
| styles.css が未圧縮（160KB） | csso で空白・コメントを落とす（112KB）。`restructure: false` で宣言の並び替えはしない |
| 画像の `width/height` なし | バナーは `<img>` と `<source>` に付けた（4:1 ↔ 4:5 の切り替えで高さが飛ばない） |
| `<main class="page-fade">` の不透明度 0→1 のフェードインが初回表示にも掛かり、画像が読み込み済みでも LCP が 1.5〜2 秒遅れて記録されていた（Chrome は不透明度 0 で描かれた要素を LCP 候補にしない）。全ページに効いていた | 初回表示では止め、SPA 内の遷移だけ掛ける（`html:not(.spa-nav) .page-fade { animation: none }`。`app.jsx` が遷移時に `<html class="spa-nav">` を付ける） |
| トップで画面外のカード画像 18 枚が eager で、ファーストビューの画像と帯域を取り合っていた | `Picture` の既定を `loading="lazy"` に（ファーストビューに置くものだけ eager）。トップの LCP 画像は `<link rel="preload" as="image">` で最優先（トップ専用。`build-prerender.js` が他ルートのスナップショットからは外す）。SP 用に 780px 幅の WebP も追加 |

測定結果は「5. 検証」。

## 3. テクニカル SEO・アクセシビリティ

- メガメニューの開閉トリガーが `href` の無い `<a>` で、Lighthouse SEO が全ページで「クロールできないリンク」として減点していた → `<button aria-haspopup aria-expanded>`。パネルは常に DOM に置き `hidden` で畳む（クローラと JS 無効環境にもメニューのリンクが見える）。Escape とフォーカス移動で閉じる。
- トップの `HashTag`（業種・技術のピル）と `TagCloud` は onClick だけで行き先が無かった → `/works` `/column` への本物のリンク。PICK UP「リスティング広告支援」は押しても何も起きなかった → 記事 `/article-listing-ads-cpc-roi` へ。実績ギャラリーのデモカードにも `href`。
- コントラスト（axe `color-contrast`）: `--text-3/--text-4` を #757575 → #6B6B6B（灰色面 #F5F5F5 で 4.2:1 → 4.9:1）、タグの赤文字は `--accent-text` #B8000E（淡い赤の上で 3.9:1 → 5.6:1）、タグクラウドの小タグは opacity 0.6 → 0.8。
- 見出し階層: フッターの `h4` → `h3`（h2 の直後に h4 が来ていた）。
- フォーム: 資料請求のテーブル型フォームの入力と `select` に `aria-label`（＋ `autocomplete`）、モーダルに `aria-label`。
- `<head>`: `apple-touch-icon`、`theme-color`。`vercel.json`: `/index.html` → `/` の 308。
- 既存で問題なし（確認のみ）: canonical・OGP・JSON-LD・robots.txt・sitemap.xml（記事だけ lastmod）・404 の HTTP 404・末尾スラッシュ 308・showcase の noindex。

## 4. セキュリティ（Node.js の脆弱性対応を含む）

- **Node.js 2026-10-21 セキュリティリリース**（10 件、High 4: Brotli 展開の OOB write = RCE [CVE-2026-111497]、TLS 証明書検証のすり抜け [CVE-2026-105483 / 106069]、dns の NUL 切り詰め [CVE-2026-105482] など）。修正版は 24.22.1 / 22.23.4 / 26.12.1。
  - Vercel の Function は `nodeVersion: 24.x`。パッチは Vercel 側が当てるので、**次のデプロイで最新の 24.x に乗る**（`/api/diagnose` は外部サイトを fetch して br 展開するので Brotli の件は当事者。早めに deploy する）。
  - GitHub Actions（prerender.yml）は `node-version: 22` → 最新の 22.x を取る。
  - ローカルは v24.12.0 で**未修正**。`nvm` 等で 24.22.1 以上に上げる（ビルド・評価スクリプト・Playwright が動く環境）。
  - `package.json` の `engines.node` を `>=22` に（20 は EOL）。
- `npm audit`: 8 件 → 3 件。`npm audit fix`（tar / brace-expansion / browserslist / baseline-browser-mapping / @babel/core）と `sharp` 0.33.5 → 0.35.5（libvips・libheif・librsvg の CVE）。ビルドは通る。
  残り 3 件は `canvas`（node-pre-gyp → tar）と `pdfjs-dist` 3.x で、どちらも optionalDependencies（`render-pdf.mjs` = サービス資料 PDF をページ画像にするローカル用スクリプト）だけが使う。Vercel の `npm install` でも入るので、使わないなら外す／使うときだけ `npm i --no-save canvas pdfjs-dist@6` にする（判断待ち）。
- `/api/diagnose`（URL 診断）: ホスト名の文字列だけで内部アドレスを弾いていた。リダイレクト先と、内部 IP を指す DNS 名は素通り（SSRF）。
  → リダイレクトを自前で追って 1 ホップごとに検査、`dns.lookup` の結果も検査、応答本文は 600KB で打ち切り。
- `/api/contact`: 入力長に上限（本文 10,000 字、他 500 字、配列 20 件）。
- レート制限は Vercel Firewall のルールで掛ける方針（`api/_lib/guard.js` の注記どおり）。`/api/diagnose` と `/api/contact` には Origin 検査を入れていない（別オリジンの LP（nortiq-lp-static）がフォームと URL 診断をこの API に送るため）。Firewall の設定は管理画面で行う。
- 秘密情報: リポジトリに鍵は無い（`.env.local` は gitignore）。以前チャットに貼られた Jev / Supabase service_role の鍵の再発行は未実施（docs/nq の既知事項）。
- **Content-Security-Policy（2026-10-27 追加）**: `build.js` の `withCsp()` が HTML を書き出す直前に、その HTML のインライン `<script>`（gtag の stub・Clarity のローダ・404 のイベント送信）の SHA-256 を計算し、`<meta http-equiv="Content-Security-Policy">` を `<meta charset>` の直後に入れる（index.html / app.html / 静的LP / 404。プリレンダのスナップショットはシェル由来で同じ meta を持つ）。
  許可先は自サイト、GA4（googletagmanager / google-analytics / analytics.google / doubleclick）、Clarity（clarity.ms / c.bing.com）、Google Fonts。`object-src 'none'`、`base-uri 'self'`、`form-action 'self'`、`frame-src 'self'`。
  `style-src` だけ `'unsafe-inline'`（React の style 属性のため）。フォントの `onload` 属性は `'unsafe-hashes'` ＋ハッシュで許可。
  meta では `frame-ancestors` が効かないので、クリックジャッキング対策は従来どおり `X-Frame-Options: SAMEORIGIN`（vercel.json）。
  **Google 広告のコンバージョン（GADS_ID）を有効にするときは `googleadservices.com` / `googleads.g.doubleclick.net` を `cspFor()` に足す。** 新しい外部サービスを入れたら同様に追加しないと、そのスクリプト・通信は黙って止まる（ブラウザのコンソールに "Refused to ..." が出る）。
- `Content-Disposition: inline; filename="chatbot"` のようなヘッダは Vercel が静的ファイル全部に付けるもの（`inline` なのでダウンロードにはならず、名前を付けて保存するときの既定名になるだけ）。脆弱性ではないが、スキャナが指摘するので vercel.json で `inline` に上書きしている（Vercel が上書きを許すかは公開後に確認）。
- フォーム: クライアントで必須・メール形式を検証、サーバ（`/api/contact`）で必須・メール形式・ハニーポット・入力長上限・HTML エスケープ（通知メール内）。`/api/diagnose` は URL 検証＋内部アドレス遮断。`/api/suggest` `/api/nq-event` は Origin 検査・bot 除外・session_id 検証・本文 8KB 上限。ログインやセッション Cookie は無いので CSRF で奪われる認証情報はない（問い合わせフォームの外部からの大量送信はハニーポットと Firewall のレート制限で防ぐ）。

## 5. 検証

origin/main（改修前）と本ブランチを同じローカル静的サーバ（gzip あり、Vercel の CDN・brotli は無し）で配信し、
Lighthouse 12.8.2 を同条件で実行（モバイルは Moto G Power 相当のエミュレーション）。本番 CDN では両方とも数値が良くなる。

| ページ | 指標 | 改修前 | 改修後 |
|---|---|---|---|
| トップ（モバイル、3回の中央値） | Performance / A11y / SEO | 26 / 85 / 92 | 56 / 100 / 100 |
| | FCP / LCP / Speed Index | 6.9s / 21.5s / 12.8s | 2.4s / 3.5s / 4.3s |
| | TBT | 3.3s（2.3〜5.5s） | 5.2s |
| | 転送量 / リクエスト数 | 2,675KiB / 72 | 1,680KiB / 54 |
| トップ（PC） | Performance | 43 | 73 |
| | FCP / LCP | 2.4s / 4.6s | 0.5s / 0.8s |
| トップ（モバイル、ヒーローを「実績の壁」に戻した後。2026-10-25、2回） | Performance / LCP | 26 / 21.5s | 45〜47 / 4.4s |
| トップ（PC、同上） | Performance / LCP | 43 / 4.6s | 66 / 1.3s |
| /web（モバイル） | Performance / LCP | 30 / 9.0s | 61 / 3.0s |
| /pricing（モバイル） | Performance / LCP | 34 / 7.2s | 66 / 2.6s |
| /diagnostic（モバイル） | Performance / LCP | — | 66 / 2.4s |
| 記事（モバイル） | Performance / LCP | —（本番計測は 33） | 65 / 2.6s |

- SEO は全ページ 100（「クロールできないリンク」が消えた）。アクセシビリティも 100（最後に残った淡い赤の上の赤文字を直した）。
- CLS は改修前後とも 0。横はみ出し・コンソールエラー・404・H1 重複は 20 ページ × 3 幅の自動検証でゼロ。
- **TBT（Total Blocking Time）は改善していない**（トップ モバイル 2.3〜5.5s → 5.2s。ローカル計測は回ごとのブレが大きい）。FCP が 7 秒台から 2 秒台に
  早まった分、React の起動（プリレンダ済み HTML を `root.render` で描き直す処理）が「FCP 以降」に入って計測対象になる。主スレッドの総仕事量は
  変わっていない（Main-thread work 14〜16 秒、改修前も同じ）。利用者には「見えるのが 5 秒以上早くなり、操作できるようになる時刻はほぼ同じ」。
  本当に減らすには `hydrateRoot` への切り替えかルート単位のコード分割が要る（下記 7）。
- 本番公開後は PageSpeed Insights（実機データ）で再確認する。

## 7. 次の候補（今回は未着手）

1. React の起動コストを減らす: `createRoot().render` → `hydrateRoot`（プリレンダ HTML を再利用）。TBT の主因。マークアップ一致の検証が要る。
2. ルート単位のコード分割（app.bundle.js 487KB → 必要なページだけ）。
3. `Picture` に srcset（800px 幅の WebP）を付ける（`uses-responsive-images` 207KB）。
4. Web フォントのウェイトをさらに減らす（500 を外して 3 ウェイトにすると初回のフォント取得が約 25% 減る。見た目の確認が要る）。
5. コラム一覧（193 本を 1 ページに全部描画、SP で 15 万 px）のページング。

## 5b. 幅 320px の検証（2026-10-25）

iPhone SE 初代相当（320 × 568、2 倍密度）で 28 ページを Playwright で開き、横スクロールの発生要素とスクリーンショットを確認。
新しく入れたバナー（トップのバナー、CTA 帯、各ヒーローのビジュアル、無料診断、資料導線、PICK UP / PROMO のサムネ）は全て 320px に収まる。直したもの:

- PICK UP「サイト無料診断」: サムネ 88px のままだと題名が「診|断」で折れる → 374px 以下はサムネ 64px・題名 19px。
- 業種ソリューション（/solution-*）: 長い文言のボタンが `white-space: nowrap` で画面からはみ出していた → 374px 以下は折り返す。
- 業種別システム提案カード（`.sys-grid`）: `minmax(320px, 1fr)` が 320px の画面で横にはみ出していた → `minmax(min(320px, 100%), 1fr)`。

## 6. 公開手順と注意

1. `git add -A && git commit`（`articles.js` と `prerendered/` は含めない。`prerendered/` は CI が再生成する）。
2. main に push（= Vercel 本番デプロイ）。`prerender.yml` が約 5 分で 237 ページの静的 HTML を作り直してコミットする。
   その間、古いスナップショットは古い `<head>`（フォントの `@import` 無し・新 CSS）で配信されるが、JS が描画し直すので表示は崩れない。
3. デプロイ後の確認: `https://nortiqlab.com/` のファーストビュー（PC/SP）、`/web` `/pricing` `/diagnostic` `/guidebook` のヒーロー、フッター直前の帯、Search Console のカバレッジ、GA4 の page_view 数（gtag の読み込みが遅くなった分、極端に短い滞在が落ちる可能性）。
4. ~~Vercel Firewall でレート制限~~ → 2026-10-27 設定済み。Hobby プランは **レート制限ルールを 1 本しか持てない**（画面の「1 / 3」表示は当てにならず、2本目は API が "Rate limiting is not available for this plan" で拒否、画面側も React エラーで保存できない）。
   そのため 1 本のルールで `/api/diagnose` と `/api/contact` の両方（path is any of）を対象にし、**1 IP あたり 60 秒に 10 回（両方の合計）**、超過は 429。本番で 11 回目から 429 になることを確認済み。
   Pro に上げれば endpoint 別に分けられる。ルールの変更は Firewall 画面（Rules）か API（`PATCH /v1/security/firewall/config` の `rules.update`）。
5. ローカル Node を 24.22.1 以上へ。
6. ~~GA4 のカスタム定義に `banner_id` を登録~~ → 2026-10-27 登録済み（イベントスコープ、パラメータ `banner_id`）。
