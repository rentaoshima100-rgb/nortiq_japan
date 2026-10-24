# nortiqlab.com バナー配置ガイド（2026-10-24）

ブランド配色（白 / #111 / #E60012）に合わせた、コンバージョン目的のバナー9点。
担当者（女性）と赤い吹き出し型マスコットは全点で同一デザイン。
各ファイルは PNG と WebP の2形式。`<picture>` で WebP を優先し、PNG をフォールバックにしてください。

| # | ファイル | 配置ページ・位置 | 目的 | 推奨サイズ | リンク先 |
|---|---|---|---|---|---|
| 1 | `01_top_hero_pc_4x1` (2400×595) | トップ `/` ファーストビュー。現ヒーロー背景の差し替え、または実績数字カードの直下に全幅で配置（PC） | 無料相談・資料請求 | 幅100%（max 1400px） | `#contact` または `/#request` |
| 2 | `02_top_hero_sp_4x5` (1080×1341) | 同上のスマホ版（`<picture>` の `media="(max-width: 767px)"`） | 同上 | 幅100% | 同上 |
| 3 | `03_cta_band_4x1` (2400×595) | 全ページ共通。フッター直前の「まずは無料で資料請求」セクション（赤帯）を画像に置換。下層ページでは本文最後のCTAとして流用可 | 資料請求 | 幅100%（max 1400px） | `/#request` |
| 4 | `04_pricing_1x1` (1200×1200) | `/pricing` ヒーローの右半分（空白部分） | 見積・相談 | 幅 40〜45%（max 560px） | — （装飾。クリックは不要） |
| 5 | `05_web_1x1` | `/web` ヒーロー右半分 | 資料請求 | 同上 | — |
| 6 | `06_chatbot_1x1` | `/chatbot` ヒーロー右半分 | 資料請求 | 同上 | — |
| 7 | `07_dx_1x1` | `/dx` ヒーロー右半分 | 相談 | 同上 | — |
| 8 | `08_diagnostic_1x1` | `/diagnostic` 見出しの横（PC）／URL入力欄の上（SP）。トップ「サイト無料診断」PICK UPカードのサムネにも流用可 | 診断利用 | max 480px | `/diagnostic` |
| 9 | `09_guidebook_1x1` | `/guidebook` ヒーロー、トップ「02 SALES DECK」カードのサムネ、`/pricing` 下部の資料導線 | 資料DL | max 480px | `/guidebook` |

## 実装スニペット

### トップ ファーストビュー（PC/SPを出し分け・バナー全体をリンク）

```html
<a class="hero-banner" href="#request" aria-label="無料で相談する">
  <picture>
    <source media="(max-width: 767px)" type="image/webp" srcset="/assets/banners/02_top_hero_sp_4x5.webp">
    <source media="(max-width: 767px)" srcset="/assets/banners/02_top_hero_sp_4x5.png">
    <source type="image/webp" srcset="/assets/banners/01_top_hero_pc_4x1.webp">
    <img src="/assets/banners/01_top_hero_pc_4x1.png"
         width="2400" height="595" fetchpriority="high" decoding="async"
         alt="ホームページ制作、まずは無料モックアップから。契約前に、御社サイトの完成イメージをお見せします。無料で相談する">
  </picture>
</a>
```

```css
.hero-banner{display:block;max-width:1400px;margin:0 auto}
.hero-banner img{width:100%;height:auto;display:block;border-radius:16px}
```

### 共通CTA帯（フッター直前）

```html
<a class="cta-band" href="/#request" aria-label="資料請求（無料）">
  <picture>
    <source type="image/webp" srcset="/assets/banners/03_cta_band_4x1.webp">
    <img src="/assets/banners/03_cta_band_4x1.png" width="2400" height="595" loading="lazy" decoding="async"
         alt="Web制作・AI・DXの資料を、無料でお届けします。初回相談無料。営業日24時間以内に担当者からご返信します。資料請求（無料）">
  </picture>
</a>
```

### 下層ページのヒーロー右側（/pricing, /web, /chatbot, /dx）

```html
<div class="page-hero">
  <div class="page-hero__text"> …既存の見出し・ボタン… </div>
  <picture class="page-hero__visual">
    <source type="image/webp" srcset="/assets/banners/05_web_1x1.webp">
    <img src="/assets/banners/05_web_1x1.png" width="1200" height="1200" loading="eager" decoding="async"
         alt="集客できるホームページ制作のイメージ：担当者とサイト画面、お問い合わせ数の推移グラフ">
  </picture>
</div>
```

```css
.page-hero{display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center}
.page-hero__visual img{width:100%;max-width:560px;height:auto;display:block}
@media (max-width:767px){.page-hero{grid-template-columns:1fr}.page-hero__visual img{max-width:420px;margin:0 auto}}
```

## 補足

- 文字を画像に含めているため、`alt` には画像内の文言をそのまま入れています（SEO・読み上げ対応）。
- バナー内の数字・訴求は現サイトの記載に合わせています（初回相談無料／営業日24時間以内に返信／制作・支援実績 30社+／30万円〜税別）。変更時は再生成が必要です。
- 「No.1」などの比較表現は優良誤認のリスクがあるため使っていません。
- 原寸（4K/2K PNG）は Higgsfield のライブラリに保存済み。差し替え・追加生成はこのチャットの続きから可能です。
