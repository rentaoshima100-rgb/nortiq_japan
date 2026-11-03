# ひと業務AI（1業務自動化サブスク）LP（/automation）— 2026-11-03

商品設計書・LP情報設計書 v1.0（2026-11-02）をもとに制作した静的LP。

## 1. 置き場所と URL

| 項目 | 値 |
|---|---|
| URL | `https://nortiqlab.com/automation` |
| HTML | `lp/automation/index.html`（build.js が `dist/automation/index.html` に配置。`{{ANALYTICS}}` / `{{V}}` を置換） |
| CSS / JS | `assets/lp/common/lp.css` + `assets/lp/automation/automation.css`、`assets/lp/common/lp.js` + `assets/lp/automation/automation.js` |
| バナー | `assets/lp/automation/banners/`（Higgsfield で生成、`scripts/make-lp-images.js` で JPEG + WebP（1400/1000/700）に変換。4点：hero_3x2 / diagnosis_band_21x9 / billing_band_21x9 / cta_4x3） |
| OG 画像 | `assets/og/automation.png`（1200×630。security.png と同じ様式） |
| 次ページ提案の台帳 | `data/catalog-pages.json` に1件（type service、need 業務システム・DX / AI導入・チャットボット、`suggestable:false`） |
| 本体からの導線 | メガメニュー「特設ページ (NEW)」・フッター「特設ページ」（components.jsx）、/sitemap（info-pages.jsx） |

sitemap.xml には build.js が自動で載せる。プリレンダの対象ではない（静的HTML）。*.jsx を触っているので、main に push すると CI (prerender.yml) が prerendered/ を再生成する。

## 2. ページ内の仕掛け（automation.js）

- **30秒業務診断**（#diagnosis）：3問（困っている業務／月の件数／今の担当）→ おすすめメニュー・月額・構築期間・上限。送信なし。結果は `?q1=&q2=&q3=` で共有でき、開いたときに復元する。GA4 `diagnosis_result` / `diagnosis_share`。
- **概算**（#estimate）：メニュー選択＋件数スライダー（上限の2倍まで）＋GBP同時投稿（LINEでサイト更新のみ、+5,000円）＋2つ目の2割引。上限超過は「API実費のみ翌月請求」と表示（単価は出していない）。
- **フォームへの引き継ぎ**：診断・概算・メニューカードの「相談する」を押すと、フォームの「任せたい業務」と hidden の「診断・概算の結果」（data-label → extra[]）に入る。
- 料金の数字は `automation.js` の `MENUS` が出典。LP本文・JSON-LD の Offer と同じ値にそろえること。

## 3. フォーム

`/api/contact`（lp.js 共通）。kind=automation。項目：会社名・お名前・メール・電話（任意）・任せたい業務（必須）・月の件数（任意）・希望の連絡手段（LINE/Zoom/メール、必須）・サイトURL（任意）・今の業務の流れ（任意）・同意。

LINE公式アカウントのURLがまだ無いので、「LINEで相談」は直リンクではなくフォームの「希望の連絡手段：LINE」で受け、返信メールで案内する運用。URLが決まったら FV / CTA / SP固定バーのボタンを直リンクに差し替える。

## 4. SEO（2026-11-03 時点）

- title 46字 / description 120字 / H1 1つ / 見出し階層 h1→h2→h3 / 画像4点すべて alt・width・height あり / 下部3点は loading=lazy / FV画像は preload（imagesrcset）
- JSON-LD：Organization / WebSite / WebPage / Service（Offer 4つ、UnitPriceSpecification 月額）/ BreadcrumbList（ホーム › 業務システム・AI開発 › 本LP）/ FAQPage（6問）
- canonical / robots index / OG・Twitter / theme-color / CSP（build.js が付与）
- ローカル dist（1280 / 375）：console エラー 0、横はみ出しなし、CLS 0、LCP は FV の WebP（PC）
- 書かない表現：No.1・業界最安・必ず上位表示・問い合わせ◯倍・代表者名・他社名

## 5. 公開前に本人が確認すること

- [ ] 比較表「一括請負」側の条件（着手金＋納品時残金／納品後の変更は都度見積／キャンセル・返金は原則なし）は一般的な条件を仮置き。実際の請負契約に合わせる
- [ ] FAQ「自社のデータはAIに学習されますか」の回答を、利用するAPIの規約に合わせて確認
- [ ] 月額利用規約（A4 2ページ）を作り、フッターにリンクを足す（今はリンクなし）
- [ ] LINE公式アカウントのURL
- [ ] GA4 で `generate_lead`（form_kind=automation）と `diagnosis_result` をコンバージョンに
