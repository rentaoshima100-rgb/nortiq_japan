# 無料診断の強化と、入口の追加（2026-11）

2026-11-10。GA4（過去90日）と Clarity の分析を受けた変更の記録。

## 1. なぜ

- 着地の約4割は記事だが、記事から問い合わせ・診断へ進んだ記録が無い。
- 資料請求フォームに入力を始める人は月に10人ほど。
- 無料診断は連絡先なしで結果が出るので、入口として軽い。ただし診断の結果画面から問い合わせに進む道が弱かった（「詳細レポートを受け取る」は資料請求のモーダルを開くだけで、診断した URL も結果も引き継がれない）。

**GA4 の読み方の注意:** `generate_lead` は2種類ある。`lead_type=diagnosis` は「診断を実行した」で、連絡先は受け取っていない。連絡先つきの問い合わせは `lead_type=contact`。ページ別のキーイベント数で `/diagnostic` に出ていた数は前者。

## 2. 診断エンジン（api/diagnose.js、api/_lib/diagnose-core.js）

判定を `api/_lib/diagnose-core.js`（通信をしない関数）に分け、テスト（`api/_lib/diagnose-core.test.js`、32件）を付けた。

| 領域 | 重み | 見ているもの |
|---|---|---|
| テクニカルSEO | 22% | noindex（meta / X-Robots-Tag）、robots.txt の全拒否、HTTPS、viewport、charset、robots.txt、sitemap.xml、JSON-LD、別ドメインへの canonical、転送の回数、favicon |
| オンページSEO | 20% | title・description の有無と長さ、h1 の数、h2、本文の量、画像の alt、OGP、html lang、canonical |
| セキュリティ（外形）**新** | 18% | 下の表 |
| 表示速度（簡易）**新** | 12% | 応答時間、HTML の大きさ、圧縮、head 内の描画を止めるスクリプト、スクリプト・CSS の数、画像の遅延読み込み・幅と高さ・WebP/AVIF |
| AI可視性 | 16% | JSON-LD、AI クローラーの拒否、記事の著者・日付、運営者の構造化データ、箇条書き・表、本文の量、llms.txt |
| リンク切れ | 12% | ページ内のリンク最大12件（サイト内8・外部4） |

見る項目は最大58（https・Cookie あり・画像6枚以上・記事ページのとき）。画面と LP の「最大58項目」はこの数で、テストが実数と突き合わせている。項目を増減したら `MAX_CHECKS`（diagnose-core.js）と `DIAG_MAX_CHECKS`（extra-pages.jsx）を直す。

### セキュリティの外形チェック

| 項目 | 内容 |
|---|---|
| 通信の暗号化 | HTTPS か、http:// で開いたとき https:// へ転送されるか、HSTS |
| ヘッダー | Content-Security-Policy（meta でも可）、X-Frame-Options / frame-ancestors、X-Content-Type-Options、Referrer-Policy、Permissions-Policy |
| Cookie | Secure、HttpOnly（セッション用とみられる名前のもの）、SameSite。このページの応答で発行されたものだけ |
| 混在コンテンツ | https のページが読む http:// のスクリプト・スタイル・画像、http:// へ送るフォーム |
| 版の露出 | Server、X-Powered-By、meta generator |
| 古いソフト | サポートが終了した PHP（8.2 未満）、WordPress 6.0 未満、jQuery 3.5.0 未満（CVE-2020-11022/11023）、Bootstrap 3.4.1 未満・4.0.0〜4.3.0（CVE-2019-8331） |
| 鍵の漏れ | 公開 HTML に含まれる秘密鍵とみられる文字列（Stripe の sk_live_、AWS の AKIA…、PRIVATE KEY）。値は結果に出さない |

**やらないこと（意図して）:** 管理画面や設定ファイルの場所を探りに行く要求、ポートの検査、攻撃の試行。入力される URL は第三者のサイトでもあり得るので、ふつうのブラウザがページを開いたときに受け取る情報だけを読む。所有者の同意が要る検査は `/security` の領域。結果画面にも「侵入テストではない」と出している。

**期限のある基準:** 「サポートが終了した PHP」は 8.2 未満（8.1 は 2025-12-31 まで）。PHP 8.2 のサポートは 2026-12-31 に終わるので、年が明けたら `'8.2'` を `'8.3'` に上げる。

### 直した誤判定

- `<base href>` のあるページで、相対リンクをページの URL から解決していた（京都市のサイトで、開けるリンクを「切れている」と数えた）。
- ボットの拒否（401・403・405・429）とタイムアウトをリンク切れに数えていた。今は「確認できなかった」に分ける。HEAD を受け付けないサーバーは GET で確かめ直す。
- 存在しないパスにもトップの HTML を返すサイト（SPA）で、llms.txt・robots.txt が「ある」と判定されていた。
- `meta` の属性の順序（`content` が先）で、description や OGP を「無い」と判定していた。
- `alt=""`（装飾画像）を「alt なし」に数えていた。script の中の `<img` も数えていた。
- robots.txt を1行ずつ見ていた。今は User-agent のグループ単位（「GPTBot だけ拒否」を全体の拒否と読まない）。
- トップページに著者名・日付が無いことを減点していた。今は記事（og:type=article か、Article の構造化データ）だけ。
- llms.txt が無いことの減点が大きすぎた（18点 → 8点。まだ標準ではない）。
- PDF・画像の URL を診断しようとしていた（今は「ページではない」と返す）。

### 入口の防御

`/api/diagnose` は、指定された URL に代わってサーバーから要求を出す。`guard.checkOrigin`（`/api/suggest` などと同じ）で、自サイトの画面からの要求だけを受ける。回数の制限は Vercel Firewall のルール（`docs/site-refresh-2026-10.md`）。内部アドレスへの到達を防ぐ確認（1ホップごと）はこれまでどおり。

## 3. 結果の画面（extra-pages.jsx の DiagResult）

- 6領域。各領域は点数・区分・一番重い指摘・「ほか N 件」。区分は記号と言葉（◎ 良好 / ○ おおむね良好 / △ 要注意 / × 要改善）で、色だけに頼らない。
- 結果のすぐ下に2項目のフォーム（貴社名・メール・同意）。送信するとその場で全ての指摘が開く。
- 届くメール（`kind=diagnostic-report`）に、診断した URL（サイトURL の行）と結果の要約（ご相談内容）が載る。
- エラーは理由を日本語で出す（以前は `fetch_failed` などのコードをそのまま出していた）。

## 4. 入口

| 場所 | 内容 |
|---|---|
| トップのヒーロー | URL の入力欄と「無料で診断する」（`DiagQuickEntry`）。押すと `/diagnostic` がその URL の診断を始める。資料請求・制作実績・無料ツールのボタンはその下に残した（資料請求は赤の塗りから枠線のボタンにした） |
| 料金ページのヒーロー | 2つ目のボタンを無料診断に戻した。概算見積（`/tools/estimate`）はすぐ下の文字リンク |
| 記事（Web制作・SEO・マーケティングの87本） | 2つ目の見出しの前に案内（`data-banner="article-diagnostic-cta"`）。build.js が入れる。セキュリティの9本は `/security` の案内のまま。AI活用・DX・技術などの記事には入れない |

URL の受け渡しはタブの `sessionStorage`（`nq_diag_url`）。クエリに載せると、訪問者のサイト名がアクセス解析と履歴に残る。

## 5. 計測

| イベント | いつ | 主なパラメータ |
|---|---|---|
| `diag_entry_submit` | 入口（ヒーロー）で押した | `location`、`with_url` |
| `diagnosis_result` | 診断の結果が出た | `score`、`rank`、`weakest`、`security_score` |
| `diagnosis_error` | 診断できなかった | `code` |
| `form_start` | 結果のフォームに入力を始めた | `form_kind=diagnostic-report` |
| `generate_lead` | 結果のフォームが届いた | `lead_type=contact`、`form_kind=diagnostic-report` |
| `diagnosis_unlock` | 全ての指摘を開いた | `score` |
| `banner_view` / `banner_click` | 記事の案内 | `article-diagnostic-cta` |

診断の実行時の `generate_lead`（`lead_type=diagnosis`）と Google 広告のコンバージョン（`diagnostic`）は変えていない。

## 6. LP の文言（/diagnostic）

診断が見ていない項目の記載を直した: 「47項目」→「最大58項目」、「4領域」「5領域」→「6領域」、機能カードの Core Web Vitals・画像リンク切れ・Competitive（競合の自動検出）を外し、Security と Speed を足した。「60秒」は「約10〜30秒」などに。FAQ の「Lighthouse 準拠」を実際の内容に書き直し、セキュリティの FAQ を足した。競合比較と Core Web Vitals の実測は「詳細レポートでお届けします」と書いている。

**そのままにしてあるもの（要確認）:**

- お客様の声 3件（田中様・鈴木様・佐藤様）。実在の声かどうかをこちらでは確かめられない。
- FAQ「競合の自動検出はどうやっていますか?」「診断結果は保存されますか?（90日間保存・共有URL）」。このリポジトリの診断には、どちらの機能も無い。
- ヒーローの画像（`08_diagnostic_1x1`）は「SEO・表示速度・AI可視性・競合比較」の4項目のまま。

## 7. 確認したこと

- `npm test`（247件。失敗0。3件はこの環境で main でも「cancelled」になるもので、今回の変更とは無関係）、`node build.js`、`npm run tools:check`（不備0）。
- `npm run pricing:check` は失敗1件（`data/catalog-pages.json:744` の「1か月」。今回より前のコミットのもの）。
- 実サイトでの診断: nortiqlab.com、example.com、京都市、京都大学、WordPress.org、Yahoo! JAPAN、Wikipedia。
- 実ブラウザ（Chrome、PC 1440×900 とスマホ 390×844）で63項目: ヒーローからの診断、結果の表示、フォームの送信と全表示、エラー文、料金ページ、記事の案内、イベント、横スクロールが出ないこと。`/api/contact` はローカルで受け、本番には送っていない。
- main に入れた直後の状態（古いスナップショット + 新しいバンドル）でも動くこと。

## 8. やっていないこと

- Core Web Vitals の実測（PageSpeed Insights の API を使えばできる。API キーが要る）。
- 複数ページの巡回（今は入力された1ページだけ）。
- 診断結果の保存と共有 URL。
- 記事の案内に URL の入力欄を置くこと（今はリンクだけ）。
- nortiqlab.com 自身の llms.txt（無い。診断では「AI可視性 92点」で、唯一の指摘になる）。
