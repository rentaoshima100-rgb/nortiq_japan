# 蓄電池・太陽光 紹介パートナー募集LP（/partner/energy）— 2026-10-28

納品 zip `nortiq-partner-energy-lp.zip`（新エネ 紹介パートナー募集LP 設計書 v2.0 準拠、index.html ＋ バナー3種）を、
サイトの静的LP規約（`lp/<route>/index.html` → `dist/<route>/index.html`、`/service/kanri-dantai` と同じ仕組み）に組み込んだ記録。

## 1. 置き場所と URL

| もの | 場所 |
|---|---|
| ページ | `lp/partner/energy/index.html` → https://nortiqlab.com/partner/energy |
| 画像 | `assets/lp/partner-energy/banners/`（hero 4:3、CTAバンド PC 4:1、CTAバンド SP 4:5。各 jpg ＋ webp ＋ srcset 用の縮小 webp） |
| OG 画像 | `assets/og/partner-energy.png`（1200×630。既存LPと同じ様式で生成。再生成は末尾） |
| 共通スクリプト | `assets/lp/common/lp.js`（FAQ・GA4・フォーム送信。今回、必須の群と項目を足した） |
| 受け口 | `api/contact.js`（Resend でメール。今回、項目を4つ足した） |
| 次ページ提案の台帳 | `data/catalog-pages.json` に1件（`suggestable:false`。施工店向けなので一般の訪問者には勧めない） |

- `assets/lp/partner-energy/banners/` は、パスに `banners` を含むので build.js の `optimizeImages` が触らない（1600px への縮小と WebP の再生成を避けるため。トップのバナーと同じ扱い）。
- 納品の `assets/banners/original/`（生成元 PNG、15MB）はリポジトリに入れていない。再トリミングが要るときは zip（Downloads）から。
- `pricing-check.js` の (b) は `lp/service/*` だけを見るので、このLPは対象外。載っている金額は市場相場（出典つき）と「0円」だけで、当社の料金表は無い。
- sitemap.xml には build.js が自動で載せる（`lp/` 配下で noindex でない index.html）。プリレンダの対象ではない（静的HTMLそのもの）。

## 2. 納品からの変更点（文言・リンク）

設計・配色・インラインスタイルは納品のまま。変えたのは組み込みに要る分と、サイトの事実に合わない分だけ。

1. **日程予約ツールの埋め込み（未決）** → 「ご希望の日時」の自由記入（任意）に置き換え。あわせて
   - 「日程は日本時間で、受けられる枠だけ表示します」→「ご希望の日時をお書きいただければ、日本時間で調整します」
   - 「送信後、日時とオンライン会議のURLを自動返信メールでお送りします」→「送信後、営業日24時間以内に担当から日時の確定とオンライン会議のURLをメールでお送りします」
     （自動返信の仕組みは無い。api/contact.js はオーナー宛にメールするだけ）
   - ツールが決まったら `id="f-time"` の行を埋め込みに戻し、文言も戻す。
2. フッターのリンク `#` → `/company` `/privacy` `/privacy-handling`、同意文の「個人情報の取扱」→ `/privacy-handling`（別タブ）。
3. 「© 2026 Nortiq Labs Inc. All rights reserved.」→「© 2026 NORTIQLAB株式会社」（法人名に合わせた。他のLPと同じ）。
4. 出典リンク5本は別タブ（`target="_blank" rel="noopener noreferrer"`）。LPから離脱させないため。
5. `<head>`：canonical・robots・OG/Twitter・JSON-LD（Organization / WebPage / Service / BreadcrumbList / FAQPage）・`{{ANALYTICS}}`（GA4・Clarity）・hero の preload。タイトル末尾は「— Nortiq Labs」→「｜Nortiq Labs」。
6. 画像：`<picture>` で WebP ＋ srcset（hero は 800w/1600w、バンドは SP 780w/1080w・PC 1400w/2400w）、`width/height` で CLS 防止、バンドは lazy。
7. フォーム：`/api/contact` へ fetch（lp.js）。必須は 会社名・ご担当者名・メール・会社の種類・施工できるエリア（1つ以上）・蓄電池の後付け（どちらか）・同意。
   ハニーポット `website`、送信中表示、失敗時の文言、完了ブロック（`#form-done`）、noscript の案内。
8. GA4 イベント：CTA は `partner_reserve`（location: header / fv / terms / band / spbar）、メール導線は `partner_mail`（header / fv / about / faq）。
   送達で `generate_lead`（Google Ads の `contact` コンバージョンも lp.js が送る）。
9. 追加 CSS（`<style>`）：`[hidden]` の強制非表示（インラインの display:flex に勝つため）、必須エラーの赤枠、SP の固定ボタンぶんの `padding-bottom`、`scroll-padding-top`。
10. 図の矢印 SVG に `aria-hidden`、必須群に `role="group" aria-label`。
8. **お金の流れの図と2つの表の SP 対応（2026-10-29）**：納品の図（HOW IT WORKS）は 960px 固定で、収まらない幅では横スクロールになり、SP では右側が切れて見えた（本人のスクショで発覚）。
   - 〜767px：図（`.flow-pc`）を隠し、縦の手順 `.flow-sp`（3者のカード＋①〜⑤の行。⑤は赤い点線で「お金の流れ」）を出す。文言は図のラベルと同じ。**図の中身を変えたら `.flow-sp` もそろえる**。
   - 768〜1103px：図を `zoom` で幅に合わせて縮める（段階は `<style>` の media query。本文の余白 clamp(18px,4vw,48px)・カードの余白 16px・縦スクロールバー 17px を引いた残りから決めた）。zoom 非対応の古いブラウザは従来どおり横スクロール。
   - 役割の表（3列、`.tbl-roles`）：inline の `min-width:640px` をクラスに移し、SP は最小幅なし・余白 12/10px・13px で幅に収める。条件の表（2列、`.tbl-fee`）：`min-width:420px` を外し、見出し列は折り返さない。

## 3. フォームの項目とメールの対応

| フォーム | payload（lp.js） | メールの行（api/contact.js） |
|---|---|---|
| 会社名 / ご担当者名 / メール / 電話 | company / name / email / phone | 貴社名 / ご担当者名 / メールアドレス / 電話番号 |
| 会社の種類（select） | companyType | 会社の種類 |
| 施工できるエリア（checkbox 群） | areas[] | 施工できるエリア（「京都 / 大阪」） |
| 蓄電池の後付けの対応（radio） | retrofit | 蓄電池の後付け |
| ご希望の日時 | preferredTime | ご希望の日時 |
| ご相談内容 | message | ご相談内容 |
| （自動） | kind=`partner-energy`、lp=`/partner/energy` | 件名の末尾 `(partner-energy)`、流入LP |

他のLP（kanri-dantai / recruit-site）は新しい4項目を空で送り、api/contact.js が空欄を落とすので、メールは変わらない。

### lp.js の「必須の群」
checkbox 群・radio 群は入力ごとの `required` では表せない（checkbox に required を付けると「全部にチェック」になる）ので、
囲みの `.field` に `data-required-group` を置くと「その中のどれか1つがチェック」で OK になる。未チェックなら `.is-invalid` が付き、最初の入力にフォーカスする。

## 4. 検証（2026-10-28、ローカル dist を配信して Chrome で）

- 320 / 375 / 768 / 1280px：横はみ出しなし、console エラー 0、CSP 違反 0、404 なし、`{{ }}` の残りなし。
- hero は 320〜1280 で `-800.webp`、2倍密度の 1440px で `lp_hero_4x3.webp`。CTAバンドは SP で 4:5、PC で 4:1 の WebP を読む。
- フォーム：空送信で 7 項目が赤枠＋「未入力の項目があります」、埋めて送信（/api/contact は差し替え）で payload が上の表のとおり、完了ブロックが出てフォームが隠れる（375 / 1280）。
- `pricing:check`・`npm test` は通過。
- 2026-10-29（図と表の SP 対応後）：320 / 375 / 767 / 768 / 819 / 820 / 899 / 900 / 999 / 1000 / 1023 / 1024 / 1103 / 1104 / 1280px で、図のラッパーと2つの表に内側の横スクロールが無い（scrollWidth ≤ clientWidth）こと、console エラー 0 を確認。767px 以下は `.flow-sp` が表示され図は非表示。

## 5. 公開前に本人がやること（納品 README の「公開前にやること」の残り）

- [ ] 日程予約ツールを決める（決まるまでは自由記入で運用）
- [ ] GA4 で `generate_lead`（form_kind=partner-energy）をコンバージョンに。Google 広告を回すなら UTM と `GADS_*` を build.js に
- [ ] S2 の数字と出典（卒FIT 100万件超 / 173万円→134万円 / 15〜22万円/kWh / 国民生活センター 2020年度 1,314件）を公開前に最新か確認。リンクは 2026-10-28 時点で全部 200
- [ ] 本体サイトからの導線（フッターや /company に「紹介パートナー募集」を置くか）は未決。今は sitemap と直リンクだけ

## 6. OG 画像の再生成

Playwright で 1200×630 の HTML を撮っている（フォントは Google Fonts なので要ネットワーク）。
スクリプトは作業時のスクラッチ（`pe-og.js`）にあり、リポジトリには入れていない。作り直すときは kanri-dantai.png の様式
（上に赤白の斜線、NORTIQ LABS、赤いアイブロウ、太い見出し、右下に金額）に合わせること。
