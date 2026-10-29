# 脆弱性診断・セキュリティ保守LP（/security）— 2026-10-28

納品 zip `nortiq-security-lp.zip`（index.html ＋ 画像8点、README なし）を静的LP規約（`lp/<route>/index.html`）に組み込んだ記録。
同日に組み込んだ `docs/partner-energy-lp-2026-10.md`・`docs/shindan-battery-lp-2026-10.md` と同じ作り。

## 1. 置き場所と URL

| もの | 場所 |
|---|---|
| ページ | `lp/security/index.html` → https://nortiqlab.com/security |
| 画像 | `assets/lp/security/banners/`（FV 21:9 と 4:1 バナー7点。納品は JPEG だけだったので `scripts/make-lp-images.js` で JPEG 2400px ＋ WebP 2400/1400/780px を生成） |
| ページ固有の JS | `assets/lp/security/security.js`（FV の URL 入力を下の申し込みフォームに写してスクロール） |
| 共通 JS | `assets/lp/common/lp.js`（申し込みフォームの送信 `/api/contact`、GA4） |
| OG 画像 | `assets/og/security.png` |
| 次ページ提案の台帳 | `data/catalog-pages.json` に1件（type service、need 保守・運用、`suggestable:false`） |
| 導線 | ヘッダーのメガメニュー「業種ソリューション → 特設ページ (NEW)」、トップの LP カード（`components.jsx` の `INDUSTRY_LPS`）、フッター「特設ページ」 |

- **`lp/service/` ではなく `lp/security/` に置いた理由**: 料金が「月19,800円〜」の円単位で、サイトの表記ルール（`docs/pricing/README.md`: 円単位は使わず「◯万円〜」、`pricing-check.js` の lint `yen`）と合わない。
  `lp/service/*` に置くと pricing:check が失敗する。納品の金額表記は変えず、ルールとの整合は本人の判断待ち（`docs/pricing/open-items.md` D1）。決まったら `lp/service/security/` へ移して `NORTIQ_PRICING.lps` に足す。
- `build.js` の `optimizeImages` はパスに `banners` を含む画像を触らない。

## 2. 納品からの変更点

1. `<head>`：canonical・robots・OG/Twitter・JSON-LD（Organization / WebPage / Service＋Offer 4つ / BreadcrumbList / FAQPage）・`{{ANALYTICS}}`・FV 画像の preload。納品の `<style>` 2つはそのまま残し、フォームの状態表示と `[hidden]` の強制を足した。
2. 画像8点を `<picture>`（WebP srcset、`width/height`、FV 以外は lazy）に。
3. **LINE で相談（3か所）→ メールで相談**（`mailto:info@nortiqlab.com`）。公式LINEの問い合わせ窓口はまだ無い（`nortiq-line-inquiry` は未公開）。できたら href を戻す。
4. **行き先の無いリンク**：`#sample`（レポートのサンプル）はボタンごと削除、`#partner`（制作会社向け）と `#emergency`（緊急）は件名つきの mailto、`#privacy` → `/privacy-handling`、フッター → `/` `/web` `/support` `/works` `/column` `/company` `/privacy` `/privacy-handling` `/terms`、パンくず → ホーム › 運用サポート(/support) › 本LP。
5. **`#consent`（外形チェックの同意事項）**：別ページが無いので、フォームの直前に `<details id="consent">` で6項目を書いた（対象範囲、所有確認、負荷、データの扱い、保証しない、撤回）。**法務の確認待ち**。
6. 申し込みフォーム：`#contact-form` にして lp.js で送信。URL（`siteUrl`）・会社名・お名前・メールが必須、3つの同意チェックも必須。hidden の `topic`＝「無料セキュリティ外形チェック」が件名の種別になる。送信後の完了文は「確認用コードの設置方法をメールで送る → 設置確認後に点検 → 3営業日以内に結果」。
7. FV の URL 入力（`#check-mini`）は、下のフォームの URL 欄に写してスクロールするだけ（点検は所有確認のあとに担当が行う）。
8. 「6か月」→「6ヶ月」（2か所。サイトの表記ルール）。著作権表記 → NORTIQLAB株式会社。フッター下の固定バーぶんの余白は SP だけに。
9. GA4：CTA は `security_cta`（header / header-consult / fv-mini / why-daily / report / price / final / spbar）、メール導線は `security_mail`（price / partner / emergency / final / spbar）。送達で `generate_lead`（form_kind=security）。

## 3. 所有確認の運用（人がやること）

1. 申し込みメール（件名「【お問い合わせ】◯◯ 様 (security)」、サイトURL の行あり）を受けたら、営業日24時間以内に確認用コード `<meta name="nortiq-verify" content="…">` の設置方法を返信する。
2. 設置を確認してから外形チェックを行い、受付から3営業日以内を目安に結果レポートを送る。
3. 確認できない場合は点検せず、相談を案内する（同意事項 2 項）。

## 4. 検証（2026-10-28、ローカル dist を配信して Chrome で）

- 320 / 375 / 768 / 1024 / 1280 / 1440(2x)px：横はみ出し・console エラー・CSP 違反・404 なし、画像はすべて読み込み。SP（〜900px）は固定バー表示・ページ内メニュー非表示。
- FV の URL 入力 → 下のフォームに写ってスクロール。空送信で必須6項目が赤表示、埋めて送信（/api/contact は差し替え）で `kind=security`・`siteUrl`・`topic`、完了表示。
- トップページ（JS 実行後）：ヘッダー・フッター・LP カード（5枚）に全LPのリンク。

## 5. 公開前に本人がやること

- [ ] **料金表記の方針**（円単位のまま許すか、「万円」に直すか）→ `docs/pricing/open-items.md` D1。決まるまで /pricing の一覧には出ない
- [ ] 同意事項（#consent）の文言の確認
- [ ] 公式LINE ができたら「メールで相談」を LINE に戻す（`sec-transform` の MAIL を使っている5か所）
- [ ] S03 / S04 / S06 の統計（警察庁・IPA・VulnCheck・Patchstack・Qualys・Verizon・Cobalt）の出典URLは本文に無い。公開前に一次資料のリンクを添えるか確認
- [ ] GA4 で `generate_lead`（form_kind=security）をコンバージョンに
