# Google広告 品質スコア改善のためのLP実装 — 作業レポート

作業日: 2026-10-15 ／ ブランチ: `feat/lp-quality-score`（本番デプロイはしていない。プレビューまで）
対象: 「システム開発」「ホームページのリニューアル」の完全一致キーワード10個 → 1キーワード＝1広告グループ＝1URL

---

## 1. 変更点

### 1-1. LP（12ページ）を静的生成

| 置き場所 | 役割 |
|---|---|
| `data/lp/common.json` | 会社情報・フォームの選択肢・プライバシー文・フッター（分野共通） |
| `data/lp/system.json` / `data/lp/renewal.json` | 親LP＋バリエーション5つの H1 / title / description / サブコピー / CTA と、各セクションの文言 |
| `lp-qs-build.js` | テンプレート。build.js から呼ばれ `dist/lp/<field>/(<variant>/)index.html` を書く |
| `assets/lp/qs/lp-qs.css` | スタイル（ビルド時に `<head>` へインライン。外部CSSのリクエストを無くす） |
| `assets/lp/qs/lp-qs.js` | フォーム送信・隠しフィールド・generate_lead（defer、依存なし、約4KB） |
| `assets/lp/qs/fonts/noto-sans-jp-700.woff2` | 見出し用 Noto Sans JP 700 のサブセット（242字、79KB） |
| `assets/og/lp-system.png` / `lp-renewal.png` | OG画像（1200×630） |
| `design/*.claude-design.html` | テンプレートの元にした Claude Design の書き出し（参照用） |

- データ形式は既存の `data/*.json` に合わせて **JSON**（仕様の YAML は、リポジトリに YAML パーサが無く既存データもすべて JSON のため）。
- **H1 は最初のHTMLに含まれる**（JSで差し替えない）。ビルド時に「h1 が1つ」「H1 の金額が NORTIQ_PRICING に在る」を検査し、違えばビルドを止める。
- 金額・期間は手で書かず `{{price:web.light}}` のような印で書き、`content-data.jsx` の `NORTIQ_PRICING`（料金の唯一の出典）から埋める。`npm run pricing:check` は失敗 0 件。
- セクション順は仕様どおり（ヘッダー → FV → 課題 → 解決策 → 料金 → 事例 → 無料オファー → 選ばれる理由 → 進め方 → FAQ → 会社情報 → フォーム → フッター）。`hiyou` の2ページだけ料金表を FV 直下に移動（`pricing_first: true`）。
- 全ページの FV に「価格（PoC 50万円〜（税別）／リニューアル 30万円〜（税別））」「オファー名（無料）」「主ボタン」「返信時間」を表示。
- ヒーローは画像を使わない（要件整理メモ／Before-After のインラインSVG・HTML）。画像リクエスト 0・CLS 0。
- 事例は業種／課題／対応／結果の4項目、社名なし、数値なし。FAQ は `<details>`（JSなし）。FAQPage の構造化データは、サイトの方針（build.js のコメント: 2026-06 のリッチリザルト廃止）に合わせて出していない。Organization / WebPage / Service(Offer) は出力。
- 会社情報: NORTIQLAB株式会社（ブランド名 Nortiq Labs）、〒604-0012 京都府京都市中京区竪大恩寺町751、事業内容、設立「2026年8月（2025年より事業を開始）」、連絡先 info@nortiqlab.com。代表者名は `common.json` の `company.representative` が空のため非表示。
- 電話番号はヘッダー・フォームともに無し。

#### URL と H1（最終ページURLは末尾スラッシュ無し）

サイト全体が `vercel.json` の `trailingSlash: false` で動いているため、`/lp/system/gaichu/` は 308 で `/lp/system/gaichu` に転送される。広告の最終ページURLは **スラッシュ無し**で登録する（`ads/mapping.csv` もその形）。

| URL | キーワード | H1 |
|---|---|---|
| /lp/system | （親） | 業務システム開発の外注は、PoC 50万円から |
| /lp/system/gaichu | システム開発 外注 | システム開発の外注は、PoC 50万円から |
| /lp/system/gyomu-gaichu | 業務システム 開発 外注 | 業務システム開発の外注は、PoC 50万円から |
| /lp/system/gyomu-irai | 業務システム 開発 依頼 | 業務システム開発のご依頼は、無料要件整理から |
| /lp/system/app-irai | 業務アプリ 開発 依頼 | 業務アプリ開発のご依頼は、PoC 50万円から |
| /lp/system/hiyou | 業務システム 開発 費用 | 業務システム開発の費用は、PoC 50万円（税別）から |
| /lp/renewal | （親） | ホームページのリニューアルは、作り直し案を無料で見てから |
| /lp/renewal/irai | ホームページ リニューアル 依頼 | ホームページのリニューアル依頼は、作り直し案を無料で見てから |
| /lp/renewal/gaichu | ホームページ リニューアル 外注 | ホームページのリニューアル外注は、作り直し案を無料で見てから |
| /lp/renewal/site | サイトリニューアル 依頼 | サイトリニューアルのご依頼は、無料モックアップで比べてから |
| /lp/renewal/corporate | コーポレートサイト リニューアル | コーポレートサイトのリニューアルは、トップ案を無料で見てから |
| /lp/renewal/hiyou | ホームページ リニューアル 費用 | ホームページリニューアルの費用は、税別で明示しています |

### 1-2. フォームと計測

- フォーム項目は6つ: 会社名（必須）／お名前（必須）／メールアドレス（必須）／ご相談の分野（必須、ページに応じた初期値）／ご予算の目安（任意、分野別の選択肢）／ご相談内容（任意）。電話番号なし。
  リニューアルのオファーに必要な「今のサイトのURL」は、項目を増やさず「ご相談内容」のラベルを「今のサイトのURL・ご相談内容」にして受け取る。
- 送信ボタンの文言はオファー名（「無料要件整理を申し込む」「無料モックアップを申し込む」）。下に「営業日24時間以内にメールで返信します」。
- フォーム直下にプライバシーポリシーへのリンクと利用目的の1文。ハニーポット（`website`）あり。
- 送信先は既存の `/api/contact`（Resend）。**通知メールに追加した行**: ご相談の分野／ご予算の目安／分野(lead_field)／LPバリエーション／gclid／gbraid／wbraid／utm_source〜utm_content／ランディングURL（`api/contact.js`、値が空の行は出ない）。
- **広告属性の保存（サイト全体）**: `assets/attr.inline.js` を build.js が gtag スニペットと同じ場所（`analyticsHead`）に入れるので、SPA のシェル・手書きの静的LP（kanri-dantai 等）・新LP のすべてに入る。URL の gclid / gbraid / wbraid / utm_* を 1st-party Cookie `nq_attr`（90日、SameSite=Lax、Secure）に保存（最後のクリックで上書き）。着地URLは最初の着地だけ保存。
  - 新LP: 送信時に隠しフィールド（`gclid` 等 11 項目）へ自動で入れて送る。
  - 既存モーダル等の SPA のフォーム: すべて `sendInquiry()` を通るので、そこで Cookie の値を送信ペイロードに付ける（`components.jsx`）。React のモーダルには hidden input を置かず、同じ値を同じ経路で送る実装にした。
  - プリレンダ済みページ（`prerendered/`、CI が再生成するまで古い）には、ビルド時に `</head>` の手前へ同じスニペットを補う（build.js のオーバーレイ処理）。CI が再生成すれば最初から入る。
- **generate_lead**: `/api/contact` が 2xx を返したときだけ `dataLayer.push({event:'generate_lead', lead_field:'system'|'renewal', lp_variant:'gaichu' など})` を1回。送信中はボタンを無効化し `submitting` フラグで二重送信を防ぐ。エラー時は発火しない。
  - 補足: いまのサイトには GTM コンテナが無く gtag.js だけなので、`dataLayer.push({event})` は誰にも拾われない。GTM が入るまでの間も GA4 に届くよう、`window.google_tag_manager` が無いときだけ `gtag('event','generate_lead', …)` も送る（GTM 導入後は GTM 側のタグだけになり二重にならない）。
- 既存の GTM/GA4 の読み込み（`G-EYTD1TWR7T` の gtag.js）はそのまま。

### 1-3. 技術要件

- 全12URL が 200（ローカルの Vercel 相当のサーバーで確認。末尾スラッシュ付きは 308 → 無し）。
- canonical: バリエーションは親LPへ。sitemap.xml には親2本（/lp/system, /lp/renewal）だけ追加。`data/catalog-pages.json` にも親2本を追加（build.js の検査で LP ルートは全件載せる決まり）。
- robots.txt は `User-agent: * / Allow: /` のまま（/lp/ も AdsBot も拒否していない）。vercel.json にボット遮断・地域制限は無し（`regions: ["hnd1"]` は関数の実行リージョンで、閲覧制限ではない）。
- 表示速度: CSS インライン、JS は defer 1本（4KB）、画像なし、見出しだけ自前フォント（79KB、`font-display: swap`、preload）。本文は端末のフォント（Android は Noto Sans、iOS は Hiragino）。
- モバイル: 本文 16px（補足 14px）、ボタン・リンク・入力欄はタップ領域 44px 以上、375px で横スクロールなし（要素のはみ出し 0）。
- アクセシビリティ: Lighthouse のアクセシビリティ 100。色だけで区別しない（含む＝✓＋「含む」、別途＝—＋「別途」、任意の工程は破線＋「任意」）。label／legend、フォーカスリング、スキップリンク、図の aria-label。

### 1-4. 広告入稿用ファイルと検証

- `ads/mapping.csv`: キャンペーン／広告グループ／キーワード（完全一致）／最終ページURL／H1／固定見出し2本／表示パス。
- `ads/rsa.csv`: Google広告エディタ向けの列名（Campaign, Ad group, Ad type, Status, Final URL, Path 1/2, Headline 1〜15 + position, Description 1〜4 + position）。固定見出し2本を位置1に固定、Status は Paused で取り込み後に有効化する。
- `scripts/make-ads.js`: 上2つを data/lp/*.json と広告文データから生成。`scripts/validate-ads.js`: 見出し全角15字／説明文全角45字／表示パス半角15字（半角0.5字）、本数、固定位置、重複、URL の形を検証 → **全件パス**（10広告グループ、見出し150本・説明文40本）。仕様の説明文 D1 のうち 3本が 46〜47字だったので 45字に詰めた（RN_外注・RN_コーポ・RN_費用）。
- `ads/assets.md`: サイトリンク6本（既存ページ、アンカー無し）、コールアウト、構造化スニペット、価格アセット、除外キーワード案。

---

## 2. 確認結果

### 2-1. Lighthouse（モバイル、ローカルビルドをローカルサーバーで配信、Edge headless、通常のシミュレート スロットリング）

| ページ | Performance | A11y | Best Practices | SEO | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| /lp/system/gaichu | 92 | 100 | 100 | 100 | 1.7s | 1.9s | 0 | 330ms |
| /lp/renewal/hiyou | 91 | 100 | 100 | 100 | 1.7s | 1.8s | 0 | 350ms |

- LCP 2.5秒以下・CLS 0.1以下は達成。TBT 200ms以下は未達（330〜350ms）。内訳は gtag.js の評価（約370ms、4倍スロットリング換算）と Style & Layout。
- フォントの A/B（同条件）: Webフォント無し 95点 / LCP 1.6s / TBT 240ms、可変フォント1本（290KB）を全文に 86点 / 2.3s / 460ms、見出しだけ 700 の静的サブセット（採用） 92点 / 1.9s / 330ms。
- 本番は Vercel の CDN から配信されるので、ローカルより TTFB は不利になる可能性がある。公開後に PageSpeed Insights で再確認（手動作業）。

### 2-2. 動作確認（Playwright + Edge、ローカル）

- 12ページ: 200、`<h1>` がソースに1つ、FV に価格とオファー名、canonical が親、末尾スラッシュは 308。
- `?gclid=TESTGCLID123&utm_source=google&utm_medium=cpc&utm_campaign=test_camp` で着地 → Cookie `nq_attr` に保存され、送信ペイロードに gclid / utm_* / lead_field / lp_variant / landing_url が入ることを確認。
- 未入力で送信 → 3項目にエラー表示、送信されない。
- ローカルは Resend の鍵が無いので `/api/contact` が 500 → エラー文を表示、ボタンが戻る、**generate_lead は発火しない**（dataLayer を監視して 0 回）。
- 成功時の発火（1回）と通知メールの項目は、Resend をモックしたローカル環境で確認した（3章）。
- 375px / 1366px で横はみ出し 0、コンソールエラー 0（API の 500 を除く）。スクリーンショットは `outputs/review-shots/lpqs-*.png`（git 管理外）。

### 2-3. 既存サイトの表記との整合（確認して見つかったもの）

| 項目 | 既存サイト | 仕様 | LPでの扱い |
|---|---|---|---|
| リニューアルの期間 | ライト 4〜6週間／スタンダード 8〜12週間／プレミアム 12〜16週間（/pricing・/web、NORTIQ_PRICING） | 約1か月／1.5〜2か月／要確認 | **既存サイトの値**を NORTIQ_PRICING から表示（食い違いを作らないため）。仕様の値にするなら `NORTIQ_PRICING.web.plans[].weeks` を変える（/pricing も同時に変わる） |
| 本実装の期間 | 2〜6ヶ月（NORTIQ_PRICING.dx.impl） | 2〜3か月〜 | 同上、既存の値 |
| PoC の期間 | 4〜8週間 | （指定なし） | 既存の値 |
| 月数の表記 | 「ヶ月」（pricing-check の lint） | 「か月」 | 「ヶ月」に統一 |
| 設立 | 「2026年8月（2025年より事業を開始）」（/company、作業ツリーの未コミット分で統一済み） | — | 同じ文言 |
| 所在地 | 〒604-0012 京都府京都市中京区竪大恩寺町 751 | 京都市中京区（番地は要確認） | 同じ住所を表示 |
| 「保守のみ 月2万円〜」 | NORTIQ_PRICING.maintenance | 同じ | 一致 |
| 実績の数（NORTIQ_STATS.clients 社） | トップ・会社概要に表示 | 事例に数値を入れない | LP には出していない（矛盾はしない） |

仕様に「（要確認）」が付いている約束で、そのまま文言にしたもの: 要件整理メモは「面談後3営業日以内」、モックアップは「申し込みから5営業日以内」。運用できる納期か確認してください（`data/lp/*.json` の `offer_detail.rows` と `form.done_body`）。

### 2-4. 完了条件

- [x] 12ページが静的に出力され、ページのソースに H1 が含まれている
- [x] 全ページの FV に価格とオファーがある
- [x] テスト送信で、通知メールに分野・バリエーション・gclid・utm が入る（Resend をモックしたローカルで本文を確認。実際の受信はプレビューで要実施、3章）
- [x] generate_lead が送信成功時に1回だけ発火し、エラー時は発火しない（成功時・エラー時ともローカルで確認、二重クリックでも1回）
- [x] canonical、sitemap、robots.txt の対応が済んでいる
- [x] validate-ads.js が全件パスする
- [x] Lighthouse（モバイル）の結果を記録した
- [x] このレポート

---

## 3. プレビュー

- ブランチ: `feat/lp-quality-score`（origin に push 済み。Vercel プロジェクト `files` の Git 連携でプレビューが作られた）
- プレビューURL（ブランチ別名）: https://files-git-feat-lp-quality-score-nortiqs-projects.vercel.app
  - 例: https://files-git-feat-lp-quality-score-nortiqs-projects.vercel.app/lp/system/gaichu
- **プレビューは Vercel Authentication で保護されている**（未ログインだと vercel.com の SSO に 302）。Vercel にログインしたブラウザで開く。
  このため、プレビューに対する自動テスト（実際のメール送信・generate_lead の実測）はここからは実行していない。
  自動で確認したいときは、プロジェクト設定の「Protection Bypass for Automation」でシークレットを発行するか、プレビューの保護を一時的に外す（どちらも設定変更なので実施していない）。
- 代わりに、ローカルで Resend の送信だけを差し替えた（API 側の `fetch('https://api.resend.com/emails')` をモックして、送るはずのメール本文を受け取る）環境で成功経路を確認した:
  - `/lp/renewal/corporate?gclid=…&gbraid=…&utm_*=…` に着地 → パラメータ無しで `/lp/renewal/site` に移動 → 送信。Cookie 経由で属性が引き継がれた。
  - 送信 1 回で `/api/contact` への POST は 1 回、`generate_lead` は 1 回（`{event:'generate_lead', lead_field:'renewal', lp_variant:'site'}`）。送信中にボタンを強制的に再クリックしても POST は増えない。完了パネルが表示されフォーカスが移る。
  - 通知メールの本文（text）に、ご相談の分野／ご予算の目安／分野(lead_field)=renewal／LPバリエーション=site／gclid／gbraid／utm_source〜utm_content／ランディングURL（着地時のURL、パラメータ付き）が入ることを確認。件名は「【お問い合わせ】テスト会社 様 (lp-renewal)」。
- 実環境（Resend 経由で rdaichi27@gmail.com に届くメール）での1通のテスト送信は、プレビューを開ける人が実施する（フォームに「テスト」と分かる会社名で送る）。

---

## 4. 手動作業（Claude Code では行わない）

### Google広告
- 旧キャンペーンを一時停止し、新キャンペーン `検索_業務システム開発` / `検索_HPリニューアル` を作成（`ads/rsa.csv` をエディタで取り込み → Status を有効に）。
- キーワードは `ads/mapping.csv` の完全一致10個を各広告グループに登録。
- アセット（`ads/assets.md`）がキャンペーンに紐付いているか確認。
- 除外キーワードを登録（`ads/assets.md` 5章の案）。
- 品質スコアの列と履歴列（推定CTR・広告の関連性・LPの利便性）を表示項目に追加。
- 「URLのテスト」で最終ページURL（末尾スラッシュ無し）が 200 で開くことを確認。
- 本番公開後、GTM で generate_lead をトリガーにしたコンバージョンタグを作ったら、build.js の `GADS_ID` / `GADS_LABEL_CONTACT` も（既存の仕組みを使うなら）設定する。

### Vercel ダッシュボード
- Firewall / Bot Protection / 地域制限で AdsBot-Google を遮断していないか確認（vercel.json には設定なし）。
- プレビューを本番に出すときは、PR を main にマージ → CI が prerendered/ を再生成するまで、プリレンダ済みページには build.js が属性スニペットを補う。

### GTM
- GTM コンテナを設置するなら、トリガー「カスタムイベント generate_lead」で Google広告のコンバージョンタグと拡張コンバージョン（フォームのメールアドレスをハッシュ）を設定。lead_field / lp_variant は dataLayer 変数で取れる。
- GTM 導入後は、LP の gtag フォールバック（`window.google_tag_manager` が無いときだけ gtag で送る）が自動で止まる。

### 本番公開後
- PageSpeed Insights で /lp/system/gaichu と /lp/renewal/hiyou のモバイルを確認（目標 LCP 2.5s / CLS 0.1 / INP 200ms）。
- Search Console で /lp/system, /lp/renewal がインデックスされ、バリエーションが親に正規化されていることを確認。

---

## 5. 決めてほしいこと

1. リニューアルの期間表記（既存サイトの「4〜6週間／8〜12週間／12〜16週間」のままか、仕様の「約1か月／1.5〜2か月」に /pricing ごと変えるか）。
2. 本実装の期間（「2〜6ヶ月」のままか「2〜3ヶ月〜」か）。
3. 要件整理メモ「面談後3営業日以内」・モックアップ「5営業日以内」の納期。
4. 代表者名を LP に出すか（出すなら `data/lp/common.json` の `company.representative`。サイトの方針は氏名を出さない）。
5. 作業ツリーに残っていた未コミットの変更（設立年の表記統一・代表者写真の削除、`build.js` / `info-pages.jsx` ほか6ファイル）は私の変更ではないので、このブランチには含めず `git stash` に退避してある（`git stash list` の "pre-existing local edits (not mine)"）。コミットするか判断してください。
