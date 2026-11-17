# 電話AIページ（/phone-ai）— 2026-11-16

電話の一次対応をAIに任せる「電話AI導入・開発」のサービスページ。構成と見た目は `/chatbot` に合わせている。

## 置き場所

| 対象 | ファイル |
|---|---|
| ページ本体 | `service-pages.jsx` の `PhoneAiPage` |
| ルート・title・description・構造化データ | `app.jsx`（`ROUTES` / `SEO_DESC` / `SERVICE_LD` の `phone-ai`） |
| ナビ・フッター・サイトマップページ | `components.jsx`、`info-pages.jsx` |
| sitemap.xml・プリレンダ・リライト | `build.js`（`SITEMAP_ROUTES`）、`build-prerender.js`、`vercel.json` |
| 次ページ提案のカタログ | `data/catalog-pages.json`（`suggestable: false`。提案カードはまだ無い） |
| このページだけのCSS | `styles.css` 末尾の `.phone-ai-*` |

## 画像

| ファイル | 位置 | 備考 |
|---|---|---|
| `assets/banners/13_phone_ai_1x1`（1200×1200） | ヒーロー右 | Higgsfield（gpt_image_2_6）。既存バナー 06・03 を参照画像にしてマスコットを揃えた |
| `assets/banners/14_phone_ai_band_21x9`（2400×1029） | 解決策の下 | 同上。スマホ用の縦長（4:5）はまだ無い |
| `assets/phone-ai-case-retail.jpg` / `assets/phone-ai-case-infra.jpg` | 導入実績 | AIで作成したイメージ。写真の角に注記を出している。実写が届いたら同じファイル名で差し替える |

## まだ決まっていないこと

- 料金：金額が未定のため「個別にお見積り」としている。決まったら `content-data.jsx` の `NORTIQ_PRICING` に足し、料金セクションを `PricingTable` に差し替える（`/pricing` にも行を足す）。
- 導入実績：社名と導入したものだけを載せている。課題と導入後の数値は確認が取れてから足す。
- 対応言語（日本語・英語）、LINE・メール通知、転送、録音と文字起こしの記載は、実際の仕様に合わせて見直す。
