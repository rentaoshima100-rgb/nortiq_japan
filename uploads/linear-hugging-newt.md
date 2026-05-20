# j-s-p.com (ホームページ博士RHS) デザイン・構成 完全スクレイプデータ

## Context
ユーザーが https://www.j-s-p.com/ のWebサイトをスクレイプし、デザイン・構成を含む全データの取得を依頼。HTML・CSSを直接ダウンロードし、デザイン仕様・レイアウト構造・カラーパレット・フォント・コンポーネント構成を完全に抽出した結果をまとめる。

---

## 🎨 デザインシステム

### カラーパレット (CSSから抽出)
| 用途 | カラーコード | 説明 |
|---|---|---|
| **メインブランドカラー** | `#e60012` | 赤 (CTA、ロゴ、強調) |
| ブランド赤(別バリアント) | `#e93f48` | コラムタグ等 |
| 赤背景(薄) | `#fce0e2` / `#ffe5e7` / `#f7dadc` | タグ背景、hoverオフ |
| **本文テキスト** | `#333` / `#111` | ベーステキスト |
| サブテキスト | `#999` | h1、補助情報 |
| 背景(セクション) | `#f5f5f5` | グレー背景 |
| 背景(ホバー) | `#eee` | カードホバー |
| 黄ハイライト | `#ffff00` | 蛍光マーカー線 |
| 動画系アクセント | `#2799fb` / `#309df8` | 青系アクセント |
| 動画背景(薄) | `#dfedfa` | 動画CTA背景 |
| ボーダー | `#ccc` / `#ddd` | グレーボーダー |
| シャドウ | `hsl(200 50% 20% / 20-40%)` | ヘッダー・メガメニュー影 |

### 装飾パターン
- ストライプ装飾: `linear-gradient(-45deg, #fcfcfc 20%, #aaa 20%, ...)` 16x16px の45度ストライプを薄グレーで使用
- 角丸: 標準10px、ボタン20-30px、タグ3-5px
- シャドウ: `box-shadow: 0 0 5px #ccc` カード用

### タイポグラフィ
**メインフォント:**
```css
font-family: "Noto Sans JP", メイリオ, "MS Pゴシック", "MS PGothic", sans-serif;
```

**ヘッダーメニュー:**
```css
"游ゴシック体", "Yu Gothic", YuGothic, "Noto Sans Japanese", Roboto,
"ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", "メイリオ", Meiryo, Osaka
```

**英字・電話番号:**
```css
"Century Gothic", CenturyGothic, AppleGothic, sans-serif;
```

**フォントウェイト:** 400(Regular) / 600(SemiBold) / 900(Black) を @font-face で読み込み (Google Fonts CDN)

**ベース設定:**
- body: `font-size: 14px; line-height: 1.4rem; color: #333;`
- ヘッダーメニュー: 13px/15px
- 電話番号: 22px (Century Gothic)
- セクション見出し: t_common_tl クラス
- 英字サブタイトル: t_common_stl クラス

---

## 🏗️ HTML構造 / ページ構成 (トップページ)

### head セクション
- `<!doctype html>` HTML5
- `lang="ja"` 日本語
- `scroll-behavior: smooth; scroll-padding-top: 100px;`
- meta viewport: `width=1280` (PC固定幅、SP時はJSで `width=device-width` に切替)
- **構造化マークアップ:** JSON-LD で Organization スキーマ実装
  - name: "株式会社博士.com" / alternateName: "Hakase.com"
  - logo, address, contactPoint をマークアップ
- OGP: og:type=website, og:title, og:image=hphakase.jpg
- Google Tag Manager: `GTM-KN6S2BW`
- 外部CDN: jQuery 3.2.1/3.4.1/1.11.0, Font Awesome 6.7.2, Swiper 4.3.3, Splide, ScrollReveal, lozad (lazy-load)

### ページ全体のセクション順序 (DOM順)

```
<body>
├── <h1> SEO用タイトル (左上固定、視覚的に小)
├── <header class="sp_off"> ← PC用ヘッダー
│   ├── .h_logo
│   ├── .h_menu (メガメニュー機能)
│   │   ├── トップ
│   │   ├── 機能 ▼ (megamenu)
│   │   ├── 制作実績 ▼ (megamenu - 種別/FC/LP/動画)
│   │   ├── ご利用会社様の声
│   │   ├── サポート
│   │   ├── 料金プラン
│   │   ├── セミナー
│   │   └── 無料診断 ▼
│   └── .h_contact (電話 + メールボタン)
│
├── <header class="h_wrap pc_off"> ← SP用ヘッダー
│
├── <div class="all_fixed_nav"> ← 固定サイドフォーム
│   └── 無料相談実施中 (8項目入力フォーム)
│
├── <section class="main_wrap"> ← メインビジュアル
│   ├── .main_bg (4列のSplideスライダー、上下反対方向自動スクロール)
│   │   └── main_h01〜h18.png 制作実績画像が縦に流れる
│   └── .main_inner
│       ├── h2 「不動産専門 ホームページ制作は 博士ドットコム。」
│       ├── ul.main_box (売買/賃貸/投資/建築/売却)
│       └── ul.main_strong (3つの実績メダル画像)
│
├── <div class="main_bottom"> ← FC加盟店ロゴ帯
│
├── <section class="case_wrap"> ← 導入実績 Case Study
│   ├── 博士イラスト(t_common_hakase)
│   └── iframe (動的6件)
│
├── <a class="rhs_bn"> IT導入補助金2026 バナー
├── <a class="guide_bnr"> ガイドブック販売バナー
├── <a class="rhs_bn"> 博士コムAI バナー
│
├── <section class="strong_wrap"> ← えらばれる理由 (strong)
│   └── ul.strong_points (6項目、fadein遅延差で順次表示)
│       1. オリジナルデザイン
│       2. コンサル・運用サポート
│       3. 契約率を高める顧客管理
│       4. 不動産専門コンテンツ無料
│       5. 修正費用無料
│       6. 独自のSEO強化
│
├── <section class="t_inq_wrap"> ← オリジナルデザイン制作CTA
│   ├── h2 + 資料請求/HP診断ボタン + 電話
│   └── 博士キャラクター + 「まずは無料診断から」
│
├── <section class="feature_wrap"> ← ホームページ機能
│   └── ul.feature_conts (売買/売却/賃貸の3カード)
│
├── <section class="gallery_wrap"> ← 制作実績 production results
│   ├── 説明文
│   ├── ul.gallery_tab_tl (5タブ: 売買/賃貸/売却/建築/コーポレート)
│   ├── div.gallery_panel × 5 (iframe差し替え型)
│   └── div.gallery_key (左右スクロールタグクラウド)
│       └── #ハッシュタグカテゴリ
│
├── <section class="we_wrap"> ← 作るだけじゃない
│   └── 月次アクセス報告 / 定期訪問 / 活用勉強会
│
├── <section class="t_voice_wrap"> ← 企業様の声 voice
│   ├── 強調テキスト (spanで赤くハイライト)
│   ├── ul.t_voice_com_box (お客様コメント画像2件)
│   └── ul.t_voice_btns (Google口コミ等への外部リンク)
│
├── <section class="hakase_c_wrap"> ← はかせコンテンツ
│   └── ul.hakase_tab_tl (2タブ: セミナー/コラム)
│       └── iframe (動的5件)
│
├── <div class="pick_up_wrap"> ← ピックアップ
│   └── ul (3アイテム: 博士ドットコム通信/リスティング広告/HP診断)
│
├── <div class="sup_inq_w"> ← 無料資料請求フォーム
│   └── 大型フォーム (12項目: 貴社名/担当/メール/電話/種別/住所/問合せ内容/相談/きっかけ/最寄駅/サイトURL)
│
├── <footer class="new_footer_w sp_off"> ← PC用フッター
│   ├── .new_footer_items (3カラム)
│   │   ├── 不動産ホームページ制作実績 (13リンク)
│   │   ├── ホームページ機能 (10リンク + functionアイコン付き)
│   │   └── WEBコンサルサポート + コンテンツ (12リンク)
│   ├── .new_footer_areaitems (47都道府県リンク、3カラム)
│   ├── .new_footer_mana (運用ポータルサイト7件)
│   └── .new_footer_inq
│       ├── ロゴ
│       ├── 資料請求/HP診断/クイック診断 ボタン
│       ├── TEL 0120-965-805
│       ├── お知らせ/会社概要/スタッフ/採用 リンク
│       ├── 運営会社住所
│       ├── ISMS/ISO認証説明文 (aio_txt)
│       └── 実績バッジ画像
│
├── <footer class="pc_off"> ← SP用フッター
│
├── <div class="foot_nav pc_off"> ← SP用固定下部ナビ
│   └── 5アイコン: トップ/実績/料金/資料/メニュー
│
└── <div class="pushbar"> ← SP用スライドメニュー(ドロワー)
    ├── 不動産ホームページ制作実績
    ├── 不動産クラウドRHS機能
    ├── Webコンサルティング
    ├── 博士.com
    └── 運営ポータルサイト
```

---

## 🧩 主要コンポーネント仕様

### ヘッダー (PC)
- `position: fixed; top: 0; z-index: 10;`
- 背景: `#fff`、padding-top: 7px
- `box-shadow: 0 0.5rem 0.5rem -0.5rem hsl(200 50% 20% / 20%);`
- ロゴ高: 44px
- メニューリンクhover: 文字色 → `#e60012`
- 電話番号: Century Gothic, 22px, `#e60012`
- メールボタン: 背景 `#e60012`, 白文字, border-radius 30px

### メガメニュー
- 背景: `#f5f5f5`
- 幅: 1100px center
- 各リンクアイテム:
  - 背景: `#fce0e2`, ボーダー: `1px solid #e60012`, border-radius: 3px
  - パディング: 10px 35px 10px 15px
  - 矢印アイコン: 6x6pxの45度回転ボーダー
  - hover時: 背景 `#e60012` 白文字

### 固定サイドフォーム (.all_fixed_nav)
- 「資料請求はこちら」タブをクリックで展開
- 7項目の簡易フォーム + 確認ボタン
- 背景クリックで閉じる

### メインビジュアル
- 4列の縦Splideスライダー
- 列1,3: 通常方向、列2,4: 逆方向
- 各列 `fixedWidth: '23vw'`, `gap: '20px'`, `speed: 1`
- 上下無限ループ自動スクロール
- 中央タイトル + 5タイプタグ + 3実績メダル

### タブ切り替え (gallery, hakase_c)
- jQuery でクリック時 `.is-active` / `.is-show` をトグル
- iframe URL固定で内容差替

### アニメーション
- `.fadein` クラスでスクロール表示
- ScrollRevealライブラリ + IntersectionObserver併用
- `data-sa_delay` 属性で遅延制御 (100/500/1000/1500/2000/2500ms)
- 効果: `opacity:0 → 1` + `translate(0, 50px) → 0` 1500ms transition

### CTAボタンスタイル
```css
border: 2px solid #e60012;
background: #e60012;
color: #fff;
border-radius: 30px;
padding: 12px 0;
hover: background #f7dadc; color: #e60012;
```

### タグ(#ハッシュタグ)スタイル
- 5色バリエーション: `tag_blue`/`tag_green`/`tag_gold`/`tag_blue2`/`tag_orange`
- `.big` クラスでサイズ強調
- 自動水平スクロール (gallery_scroll_l/r)

---

## 📐 レイアウト規格
- **PC幅:** コンテンツ最大 1100-1200px (中央寄せ)
- **メインビジュアル高:** 600px
- **viewport:** PC `width=1280` 固定、SP は `width=device-width`
- **メディアクエリ:** `@media screen and (min-width: 769px)` でPC
- **.sp_off:** PC表示時にSP要素を `display: none !important;`
- **.pc_off:** SP表示時にPC要素を非表示

---

## 🖼️ 画像アセット規約
- 配置: `/img/new/` (新デザイン) / `/img/common/` (共通) / `/img/top/` (TOP専用)
- **メインスライド:** `/img/new/main_h01.png` 〜 `main_h18.png` (実績スクショ)
- **博士キャラクター:** `case_hakase.webp`, `rea_hakase.webp`, `gall_hakase.webp`, `con_hakase.webp`, `we_hakase.webp` (場面別イラスト多用)
- **吹き出しテキスト:** `*_hakase_txt.webp` 形式
- **実績メダル:** `main_medaru1〜3.webp`
- **形式:** PNG / WEBP / SVG / JPG混在 (WEBP優先)
- **遅延ロード:** lozad.js使用

---

## 🔌 外部統合 / 技術スタック

### CMS/ライブラリ
- 独自CMS (`/jcapi/_jc_topshow.php` でiframe動的読込)
- **Splide.js** (スライダー)
- **Swiper 4.3.3** (スライダー、別箇所)
- **jQuery 1.11.0/3.2.1/3.4.1** 複数バージョン読込
- **ScrollReveal** (スクロール表示)
- **Font Awesome 6.7.2** (アイコン)
- **lozad.js** (画像遅延ロード)
- **Pushbar.js** (SP用ドロワー)
- **deSVG.js** (SVGインライン化)
- **objectFitImages** (IE対策)
- **Fancybox 2.1.5** (モーダル)
- **moment.min.js** (日付処理)

### 分析・トラッキング
- Google Tag Manager: `GTM-KN6S2BW`
- 自社解析ツール: `hakase-tool.com/member/planning/analytics.js`

### フォーム送信
- POSTフォーム: `/contact_form/index_conf.html`
- フィールド命名: `SfItemVals[13]`, `SfItemVals[14]`... (jcjs_sf 命名空間)
- 必須項目: `requ` クラス / email項目: `email` クラス
- onsubmit: `fo.check()` バリデーション

---

## 📋 フォーム仕様 (詳細)

### メインお問合せフォーム (.sup_inq_w 内)
| 項目 | 必須 | タイプ | フィールド名 |
|---|---|---|---|
| 貴社名 | ✓ | text | SfItemVals[13] |
| ご担当者名 | ✓ | text | SfItemVals[14] |
| メールアドレス | ✓ | email | SfItemVals[15] |
| 電話番号 | ✓ | tel | SfItemVals[16] |
| 種別 | ✓ | checkbox×6 | SfItemVals[17] |
| 住所 | ✓ | text | SfItemVals[18] |
| お問い合わせ内容 | ✓ | checkbox×7 + textarea | SfItemVals[19]/[20] |
| ご相談内容 | 任意 | checkbox×9 | SfItemVals[21] |
| 本サイトを知ったきっかけ | 任意 | select | SfItemVals[22] |
| 最寄り駅 | 任意 | text | SfItemVals[23] |
| サイトURL | 任意 | text | SfItemVals[24] |

**種別チェックボックス:** 賃貸 / 売買 / 売却 / 投資 / テナント / 建築・リフォーム
**問合せ内容:** HP新規制作 / HPリニューアル / 動画作成システム / リスティング広告 / 博士AI / スマホで来店予約 / 客付けシステム
**ご相談内容:** HPが無い / 反響がほしい / サービス資料 / 無料診断 / 成約率改善 / デザイン改善 / SEO向上 / ポータル連動 / リスティング開始
**きっかけselect:** Yahoo検索 / Google検索 / ご紹介 / 案内メール / DMチラシ / FAX / 以前から知っていた / その他

### 固定サイドフォーム (.all_fixed_nav)
簡易版 (7項目): 貴社名/担当者/メール/電話/住所/種別/問合せ内容
- SfID: 14 (メインフォームは SfID: 2)

---

## 🎭 デザインアイデンティティのまとめ

| 要素 | 特徴 |
|---|---|
| **トーン** | 信頼感×親しみやすさ(博士キャラ多用) |
| **メインカラー戦略** | 赤(`#e60012`) を一貫して使用、信頼/情熱を表現 |
| **キャラクター** | 「博士」イラスト + 「ウェブキャラクター」を各セクションに配置 |
| **吹き出し演出** | 博士が各セクションでコメント、occurrence クラスでフェード |
| **CTA配置密度** | ファーストビュー / 中盤 / フッター直前 / 各セクション末で繰り返し |
| **動きの多さ** | 4並列縦スライダー / fadein連鎖 / タグ自動スクロール / メガメニュー展開 |
| **背景使い分け** | 白主体 + `#f5f5f5` グレーでセクション区切り、`#e60012` を強調帯に |
| **角丸の頻度** | 全CTAボタン/カード/タグに使用、柔らかい印象 |
| **ストライプ装飾** | 「メモ用紙」風斜めストライプボーダーを差し色に多用 |

---

## ✅ 取得完了データ一覧
- [x] HTML完全構造 (1490行)
- [x] CSS3ファイル (base.css / common_pc.css / cms_common_pc.css)
- [x] TOP専用CSS2ファイル (top_pc.css / top_sp.css)
- [x] カラーパレット (全16色)
- [x] フォントスタック (Noto Sans JP / 游ゴシック / Century Gothic)
- [x] ヘッダー/フッター完全構造
- [x] メガメニュー全項目
- [x] メインビジュアル仕様 (Splide設定込み)
- [x] 全CTAボタンスタイル
- [x] アニメーション仕様
- [x] フォーム完全仕様 (フィールド名・必須・選択肢全部)
- [x] 構造化マークアップ (JSON-LD)
- [x] 技術スタック完全リスト
- [x] 画像アセット命名規則
- [x] レスポンシブ戦略 (sp_off/pc_off + viewport切替)

---

## 検証方法
- 元データソース: `C:\Users\r2133\jsp_home.html` (61,969 bytes)
- CSSソース: `jsp_base.css` (1,539 bytes) / `jsp_common_pc.css` (37,442 bytes) / `jsp_cms_common.css` (110,846 bytes) / `jsp_top_pc.css` (17,652 bytes) / `jsp_top_sp.css` (15,920 bytes)
- ライブ確認: https://www.j-s-p.com/ をブラウザで開き、本ドキュメントの構造と照合
