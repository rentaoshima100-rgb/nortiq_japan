# blocks.json 文言の出典表（承認者用）

`data/blocks.json` の 23 ブロックについて、文言に使った **数字** と **固有の表現** が、リンク先ページのどこに
どう書いてあるかを variant ごとに並べた表。設計書4章の承認ルール（数字を含む文言は、該当ページの記載と
一致していることを承認時に確認する）を、この表だけで済ませられるようにしてある。

- 確認日: 2026-09-18。行番号はこの日のローカルの作業ツリーのもの。リンク先のファイルを編集すると行がずれるので、
  ずれていたら「原文」の文字列でファイル内を検索する。
- 再検証: 2026-09-20（HEAD `496a2c1f`）。09-18 以降の4コミットは記事の公開とプリレンダの再生成だけで、この表が引く
  ファイルは変わっていない。2 章の全 191 行について「原文」の断片が出典の行に在ること、文言の数字がすべてこの表に載っていることを
  機械的に突き合わせた。このとき直した文言は 6 章。
- 料金表記の統一に追従: 2026-09-21（作業ツリー。未コミット）。リンク先の金額・期間が `content-data.jsx` の `NORTIQ_PRICING` から
  描画される形に変わり、表記も変わった（税別の明記、AIチャットボットの「初期費用」と「月額」、保守の月額、`か月`→`ヶ月`、
  業種パッケージの「月額運用」→「月額」）。文言と 2 章の該当行を直し、2 章の行番号をすべて今の作業ツリーに合わせ直した（2 章は 200 行になった。全行を機械的に再照合済み）。
  直した文言は 7 章。3〜6 章の本文が引く行番号も同じ日の作業ツリーのもの。
- 評価後の audience の絞り込みに追従: 2026-09-21（作業ツリー。未コミット）。フェーズ0 の評価で、カード8件の audience を絞った。
  変わったのは audience（画面に出ない。Jev への質問文に入る）だけで、画面に出る文言と 2 章の出典表は1字も変わっていない。前後の文と、承認のとき見てほしい点は 8 章。
- 章番号は 2026-09-20 改訂後の設計書のもの（デザインシステム 8章、文言ルール 11章）。
- 下書きはすべて `approved_by: ""`。**この表で照合してから** `approved_by` / `approved_at` を入れる。
- リンク先の数字（価格・期間・件数）を変えるときは、この表で該当 variant を引き、`data/blocks.json` も同時に直す。
  金額・期間・相談時間は `npm run pricing:check` が `NORTIQ_PRICING` と機械的に照合する（見る範囲は `docs/pricing/README.md`）。数字を直したら実行し、失敗 0 件を確かめる。

## 1. 表の読み方

| 列 | 内容 |
|---|---|
| block / variant | `data/blocks.json` の `block_id` と variant 名。業種別は `sg-solution[不動産]` のように書く |
| 文言で使った表現 | blocks.json の文言に **その文字のまま** 入っている部分 |
| 出典 | リポジトリのルートからのパスと行番号。`NORTIQ_PRICING` から描画される数字は「描画する行（値は データの行）」の形で両方を書く |
| 原文 | 出典の行にある文字列。` … ` は途中の省略（タグや別の行をまたぐ箇所）。描画される数字は「表示結果「…」 ← 描画する行のコード」の形で書く |

表記の正規化（ここだけは「一字一句」から外している。理由は 4 章の末尾）:

1. **空白は無視する。** リンク先は `月 5 記事` `6 ステップ` `3 つのプラン` のように数字の前後へ半角スペースを入れる
   箇所と入れない箇所が混ざっている。カードはスペースなしに統一した。金額と期間は 2026-09-21 からヘルパーが
   スペースなしで出すので（下の 4）、空白の違いが残るのは件数や見出しの数字だけ。
2. **「〜」はそのまま使い、「から」に言い換えない。** 設計書の例「30万円から」は recruit-site のどこにも無い（JSON-LD も 2026-09-21 に「30万円〜（税別）。」へ直った）。
3. **`×` の前後の空白は詰める。** 例: `集客 × 管理パッケージ` → `集客×管理パッケージ`。業種パッケージの価格は、ページ側が
   `priceInitPlusMonthly()` で `60〜180万円＋月額3〜8万円`（全角＋・スペースなし）と出すようになったので、もう正規化は要らない。
4. JSX のテンプレート文字列（`累計${NORTIQ_STATS.clients}社の支援`）は、`content-data.jsx:17-18` の値を入れた表示結果で照合する。
   金額・期間・税の表記も同じ扱い。値は `NORTIQ_PRICING`（`content-data.jsx:43-145`）、書式は同じファイルのヘルパー
   （`:153-213`。`priceFrom(30)` → `30万円〜`、`priceMonthly(2)` → `月額2万円〜`、`priceTax()` → `（税別）`、
   `pricePeriod({weeks:[4,6]})` → `4〜6週間`、`priceInitPlusMonthly()` → `60〜180万円＋月額3〜8万円`）が決める。
   本体サイトのページ側に自社料金の文字列リテラルはもう無いので（LP 2本は静的HTMLのまま）、「原文」にはヘルパーを通した表示結果と、描画する行のコードを並べて書く。
5. 料金表は数字と単位が別の要素に分かれている（本体サイトは `pricePlanRows()` が返す `amount: "60"` と `unit: "万円〜"`、
   LP は `<span class="num">30</span><small>万円〜</small>`）。画面ではつながって出るので、つなげた形で照合する。
   本体サイトのカードは金額の上に「初期費用（税別）」か「月額（税別）」のラベルが付く（`service-pages.jsx:46-57` の PriceFigure）。
   ラベルと金額もつなげて読む（「月額（税別）」＋「10万円〜」→ カードでは「月額10万円〜…（税別）」）。

## 2. 出典表

### sg-recruit-site → `/service/recruit-site`

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-recruit-site / default | 現場の写真1枚から、応募が来る採用サイトを。 | lp/service/recruit-site/index.html:74 | 現場の写真1枚から、 … 応募が来る … 採用サイトを。 |
| sg-recruit-site / default | 建設・運送・介護に絞った採用サイト制作 | lp/service/recruit-site/index.html:75 | 作って終わりにしない採用サイトを、建設・運送・介護に絞ってつくります。 |
| sg-recruit-site / default | 料金プランは、 | lp/service/recruit-site/index.html:284 | 料金プラン（税別） |
| sg-recruit-site / default | ライトが30万円〜 | lp/service/recruit-site/index.html:287-288 | ライト … 30 … 万円〜 |
| sg-recruit-site / default | （税別） | lp/service/recruit-site/index.html:284 | 料金プラン（税別） |
| sg-recruit-site / cost | 採用サイトは30万円〜。 | lp/service/recruit-site/index.html:287-288 | ライト … 30 … 万円〜 |
| sg-recruit-site / cost | ライトは8ページ・応募フォーム・しごと検索対応まで | lp/service/recruit-site/index.html:291-293 | 8ページ … 応募フォーム … しごと検索対応（JobPosting） |
| sg-recruit-site / cost | 価格は税別、カメラマン手配は実費です。 | lp/service/recruit-site/index.html:331 | 価格は税別。カメラマン手配は実費。 |
| sg-recruit-site / schedule | 公開までの期間を、プラン別に確認する。 | lp/service/recruit-site/index.html:289 | 期間の目安 3週間 |
| sg-recruit-site / schedule | ライト3週間 | lp/service/recruit-site/index.html:287-289 | ライト … 期間の目安 3週間 |
| sg-recruit-site / schedule | スタンダード4週間 | lp/service/recruit-site/index.html:300-302 | スタンダード … 期間の目安 4週間 |
| sg-recruit-site / schedule | プレミアム6週間 | lp/service/recruit-site/index.html:314-316 | プレミアム … 期間の目安 6週間 |
| sg-recruit-site / schedule | 制作の流れも載せています | lp/service/recruit-site/index.html:345 | 制作の流れ |
| sg-recruit-site / trust | モックを見てから、依頼を決められます。 | lp/service/recruit-site/index.html:458 | モックを見てから依頼するかどうかを決められます |
| sg-recruit-site / trust | トップページの無料モックアップ | lp/service/recruit-site/index.html:80 | トップページの無料モックアップ |
| sg-recruit-site / trust | 3業種のモックアップ | lp/service/recruit-site/index.html:271 | まず、3業種のモックアップをご覧ください。 |
| sg-recruit-site / trust | 35項目の設計チェックリスト | lp/service/recruit-site/index.html:362 | 採用サイト設計チェックリスト … 建設・運送・介護版（35項目） |

### sg-kanri-dantai → `/service/kanri-dantai`

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-kanri-dantai / default | 制度が変わる前に、伝わるサイトへ。 | lp/service/kanri-dantai/index.html:74 | 制度が変わる前に、 … 伝わるサイト … へ。 |
| sg-kanri-dantai / default | 育成就労・特定技能の制度解説20本 | lp/service/kanri-dantai/index.html:75 | 育成就労・特定技能の制度解説20本、19分野の公式表記チェック |
| sg-kanri-dantai / default | 19分野の公式表記チェックつき | lp/service/kanri-dantai/index.html:75 | 19分野の公式表記チェック |
| sg-kanri-dantai / default | 70万円〜（税別） | lp/service/kanri-dantai/index.html:221-227 | 料金（税別） … 70 … 万円〜 |
| sg-kanri-dantai / default | 制度解説20本（70万円〜のプランに含まれること） | lp/service/kanri-dantai/index.html:226-233 | 制度対応ライト … 制度解説20本 … 公式表記チェック |
| sg-kanri-dantai / cost | 監理団体向けのサイト制作は70万円〜。 | lp/service/kanri-dantai/index.html:226-227 | 制度対応ライト … 70 … 万円〜 |
| sg-kanri-dantai / cost | 料金は税別で、ページ数と言語数で確定します。 | lp/service/kanri-dantai/index.html:221-222 | 料金（税別） … ページ数と言語数で確定します。 |
| sg-kanri-dantai / cost | 無償の軽微修正は3回まで、と最初に明示します。 | lp/service/kanri-dantai/index.html:275 | 無償の軽微修正は3回まで、と最初に明示します |
| sg-kanri-dantai / schedule | 2026年12月末までの着手が目安です。 | lp/service/kanri-dantai/index.html:303 | 2027年4月に間に合わせるなら、 … 2026年12月末までの着手が目安です |
| sg-kanri-dantai / schedule | 2027年4月の育成就労制度の施行 | lp/service/kanri-dantai/index.html:102 | 2027 … 年 … 4 … 月 … 1 … 日 … 育成就労制度 施行 |
| sg-kanri-dantai / schedule | 制度対応ライトで約1.5ヶ月 | lp/service/kanri-dantai/index.html:226-228 | 制度対応ライト … 期間 約1.5ヶ月 |
| sg-kanri-dantai / trust | 協同組合のサイト全13ページを刷新しました。 | lp/service/kanri-dantai/index.html:192 | 協同組合（2009年設立・累計受入れ1,800人超・送出し9カ国）のコーポレートサイト全13ページを刷新。 |
| sg-kanri-dantai / trust | 制度ページ・キャリアパス図・7ステップ表・AIチャットボットを実装 | lp/service/kanri-dantai/index.html:192 | 制度ページ・キャリアパス図・7ステップ表・AIチャットボットを実装しました。 |
| sg-kanri-dantai / trust | 団体名は掲載許諾が取れ次第、表示します。 | lp/service/kanri-dantai/index.html:192 | 団体名・ロゴは掲載許諾が取れ次第、表示します。 |

### sg-web → `/web`

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-web / default | 集客と問い合わせ獲得を前提に設計するWeb制作。 | service-pages.jsx:138 | 集客と問い合わせ獲得を前提に設計する Web 制作。 |
| sg-web / default | WordPress・静的サイト・Next.jsを、目的に合わせて選びます。 | service-pages.jsx:138 | WordPress / 静的サイト / Next.js を、目的に合わせて適切に選びます。 |
| sg-web / default | 料金は30万円〜（税別）。 | service-pages.jsx:139（値は content-data.jsx:51 の min: 30） | 表示結果「30万円〜（税別）」 ← `priceFrom(plans[0].min) + priceTax()` |
| sg-web / cost | Web制作は30万円〜、3つのプラン。 | service-pages.jsx:210 | 3 つのプラン、明朗会計。 |
| sg-web / cost | 30万円〜・60万円〜・120万円〜 | service-pages.jsx:214（値は content-data.jsx:51-60 の min: 30 … min: 60 … min: 120） | 表示結果 カード3枚「初期費用（税別）30万円〜」「同 60万円〜」「同 120万円〜」 ← `<PricingTable rows={pricePlanRows('web')}/>` |
| sg-web / cost | （税別）。 | service-pages.jsx:211（値は content-data.jsx:45 の taxNote: '表示価格はすべて税別です'） | 表示結果「表示価格はすべて税別です。」 ← `lede={P.taxNote +` |
| sg-web / cost | 目安の金額で、実際の費用はヒアリング後にご提案します。 | service-pages.jsx:211 | 目安の金額で、実際の費用はヒアリング後にご提案します。 |
| sg-web / schedule | 納期の目安は、Lightプランで4〜6週間。 | service-pages.jsx:269（値は content-data.jsx:52 の weeks: [4, 6]） | 表示結果「Light プランで4〜6週間」 ← `p.name + (i === 0 ? ' プランで' : ' で') + pricePeriod(p)` |
| sg-web / schedule | Standardで8〜12週間、Premiumで12〜16週間が目安。 | service-pages.jsx:269（値は content-data.jsx:56-61 の weeks: [8, 12] … weeks: [12, 16]） | 表示結果「Standard で8〜12週間、Premium で12〜16週間を目安にしています。」 ← `pricePeriod(p)).join('、') + 'を目安にしています。` |
| sg-web / schedule | コンテンツの準備状況によって変動します。 | service-pages.jsx:269 | コンテンツの準備状況によって変動します。 |
| sg-web / scope | Web制作だけの発注も歓迎しています。 | service-pages.jsx:168 | Web 制作単体の発注も歓迎しています。 |
| sg-web / scope | 最初のヒアリングで、現状の課題、ターゲット、目標を整理します。30〜60分のオンラインMTGです。 | service-pages.jsx:190（値は content-data.jsx:46 の format: 'オンライン', minutes: [30, 60]） | 表示結果「現状の課題、ターゲット、目標。30〜60分のオンライン MTG。」 ← `ProcessStep title="ヒアリング" … 現状の課題、ターゲット、目標。${consultTime}の${P.consult.format} MTG。` |

### sg-chatbot → `/chatbot`

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-chatbot / default | ブログ更新が止まりがちな方へ | service-pages.jsx:309 | WordPress のブログ更新が止まる、を解決します。 |
| sg-chatbot / default | 質問するだけで記事が書ける、AI投稿ツール。 | service-pages.jsx:312 | 質問するだけで記事が書ける、Nortiq Labs 内製の AIチャットボット 投稿ツール。 |
| sg-chatbot / default | AIチャットボットに質問しながら骨子を作り、本文展開、WordPress投稿までを自動化。 | service-pages.jsx:361 | AIチャットボットに質問しながら骨子を作り、本文展開、WordPress 投稿までを自動化。 |
| sg-chatbot / default | 初期費用10万円〜（税別）。 | service-pages.jsx:313（値は content-data.jsx:72 の min: 10） | 表示結果「初期費用10万円〜（税別）」 ← `'初期費用' + priceFrom(P.chatbot.plans[0].min) + priceTax()` |
| sg-chatbot / cost | AIチャットボットは初期費用10万円〜 | service-pages.jsx:431（値は content-data.jsx:72 の kind: 'initial', min: 10） | 表示結果 LIGHT のカード「初期費用（税別）10万円〜」 ← `pricePlanRows('chatbot')` |
| sg-chatbot / cost | 月額1万円〜。 | service-pages.jsx:112（値は content-data.jsx:70 の monthlyMin: 1） | 表示結果「カードの金額は導入時の初期費用です。継続利用は月額1万円〜（税別）。プランと生成本数に応じてお見積もりします。」 ← `継続利用は … {priceMonthly(c.monthlyMin)}{priceTax()}` |
| sg-chatbot / cost | 表示価格はすべて税別です。 | service-pages.jsx:427（値は content-data.jsx:45 の taxNote: '表示価格はすべて税別です'） | 表示結果「表示価格はすべて税別です。目安の金額で、実際の費用はヒアリング後にご提案します。」 ← `lede={P.taxNote +` |
| sg-chatbot / cost | LIGHTは月5記事まで生成、初期セットアップ込み。 | content-data.jsx:72-74（描画は service-pages.jsx:431 の料金表） | card: 'LIGHT' … '月 5 記事まで生成' … '初期セットアップ込み' |
| sg-chatbot / cost | 月次契約で、解約は1ヶ月前通知です。 | service-pages.jsx:497（値は content-data.jsx:70 の monthlyMin: 1） | 表示結果「導入時に初期費用をいただき、その後は月次契約（月額1万円〜・税別）です。解約は1ヶ月前通知で、導入後の縛り期間はありません。」 ← `その後は月次契約（' + monthlyFrom + '・' + P.tax + '）です。解約は1ヶ月前通知で、導入後の縛り期間はありません。` |
| sg-chatbot / ai_quality | 公開前の人間のレビューを必須としています。 | service-pages.jsx:496 | 公開前の人間のレビューを必須としており |
| sg-chatbot / ai_quality | 明らかな事実誤認は出力検証レイヤーで自動検出。 | service-pages.jsx:496 | 出力検証レイヤーで明らかな事実誤認は自動検出します。 |
| sg-chatbot / ai_quality | 事実情報の検証と、業界特化の専門性チェックを経て公開する設計です。 | service-pages.jsx:493 | 事実情報の検証ステップと、業界特化の専門性チェックを経て公開する設計 |

### sg-dx → `/dx`

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-dx / default | 検証して、判断して、進める | service-pages.jsx:653 | 検証して、判断して、進める。 |
| sg-dx / default | ML実装、業務自動化、データ分析基盤、生成AIの業務組み込み。 | service-pages.jsx:563 | ML 実装 / 業務自動化 / データ分析基盤 / 生成 AI 業務組み込み。 |
| sg-dx / default | フェーズごとにGO/NO-GOを判断できます。 | service-pages.jsx:654 | フェーズごとに検証して GO/NO-GO 判断ができる構造にしています。 |
| sg-dx / cost | PoCは50万円〜 | service-pages.jsx:696（値は content-data.jsx:89 の card: 'PoC' … kind: 'initial', min: 50） | 表示結果 PoC のカード「初期費用（税別）50万円〜」 ← `pricePlanRows('dx')` |
| sg-dx / cost | 初回相談は無料。 | service-pages.jsx:665 | 初回相談は無料 |
| sg-dx / cost | 本実装は200万円〜 | service-pages.jsx:696（値は content-data.jsx:92 の name: '本実装' … kind: 'initial', min: 200） | 表示結果 IMPLEMENTATION のカード「初期費用（税別）200万円〜」 ← `pricePlanRows('dx')` |
| sg-dx / cost | 継続運用は月額10万円〜 | service-pages.jsx:696（値は content-data.jsx:95-96 の kind: 'monthly', min: 10 … tagline: '継続運用'） | 表示結果 OPERATION のカード「月額（税別）」「10万円〜」「継続運用」（ラベルと金額をつなげて「月額10万円〜」。1 章の 5） ← `pricePlanRows('dx')` |
| sg-dx / cost | が目安（税別）。 | service-pages.jsx:654（値は content-data.jsx:44 の tax: '税別'） | 表示結果「金額は目安です（税別）。」 ← `金額は目安です' + priceTax()` |
| sg-dx / cost | 一括契約ではなく、フェーズごとに検証して判断できます。 | service-pages.jsx:654 | 一括契約ではなく、フェーズごとに検証して GO/NO-GO 判断ができる構造にしています。 |
| sg-dx / schedule | PoCは4〜8週間 | service-pages.jsx:659（値は content-data.jsx:89 の en: 'PoC' … weeks: [4, 8]） | 表示結果「PoC」「4〜8週間」 ← `name={poc.en} duration={pricePeriod(poc)}` |
| sg-dx / schedule | 本実装は2〜6ヶ月。 | service-pages.jsx:660（値は content-data.jsx:92 の en: 'Implementation' … months: [2, 6]） | 表示結果「Implementation」「2〜6ヶ月」 ← `name={impl.en} duration={pricePeriod(impl)} … desc="本実装。` |
| sg-dx / schedule | ヒアリングは1〜2週間。 | service-pages.jsx:658（値は content-data.jsx:87 の weeks: [1, 2]） | 表示結果「Hearing」「1〜2週間」 ← `name="Hearing" duration={pricePeriod(hearing)}` |
| sg-dx / schedule | 本実装はアジャイル開発で、マイルストーンごとにリリースします。 | service-pages.jsx:660 | 本実装。アジャイル開発でマイルストーンごとにリリース。 |
| sg-dx / scope | 初回相談（無料・60分） | service-pages.jsx:658（値は content-data.jsx:87 の free: true, minutes: 60） | 表示結果「初回相談（無料・60分）のあと、」 ← `初回相談（無料・{hearing.minutes}分）のあと` |
| sg-dx / scope | から始められます。 | service-pages.jsx:700 | まずは初回ヒアリング (無料) から。 |
| sg-dx / scope | そのあと1〜2週間で、課題の言語化、データの棚卸し、対象業務の特定まで行います。 | service-pages.jsx:658（値は content-data.jsx:87 の weeks: [1, 2]） | 表示結果「初回相談（無料・60分）のあと、1〜2週間で課題の言語化、データの棚卸し、対象業務の特定まで行います。」 ← `のあと、<span className="nw">{pricePeriod(hearing)}</span>で課題の言語化、データの棚卸し、対象業務の特定まで行います。` |
| sg-dx / scope | PoCから先は有料です。 | service-pages.jsx:665（値は content-data.jsx:89 の name: 'PoC' … min: 50） | 表示結果「PoC（50万円〜）から先は有料ですが、フェーズごとの契約なので、検証結果を見てから次へ進むかを判断できます。」 ← `{poc.name}（{pocFrom}）から先は有料ですが` |

### sg-lpo → `/feature-lpo`（ページに価格の記載なし。カードにも価格を書いていない）

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-lpo / default | LP制作と改善（LPO）を、一気通貫で。 | detail-pages.jsx:672 | LP制作 + 改善 (LPO) を、 … 一気通貫で。 |
| sg-lpo / default | コンバージョン特化のLP制作から、広告連動・ヒートマップ解析・A/Bテストまでセットで運用します。 | detail-pages.jsx:673 | コンバージョン特化の LP 制作と、継続的な改善 (LPO) を一気通貫で提供。広告連動・ヒートマップ解析・A/Bテストまでセットで運用します。 |
| sg-lpo / scope | LPが1枚だけでも、改善を頼めます。 | content-data.jsx:519 | LPが1枚しかなくても頼めますか? … 1枚からで問題ありません。 |
| sg-lpo / scope | まず計測を入れ、改善候補の優先順位をつけます。 | content-data.jsx:519 | まず計測を入れ、改善候補の優先順位をつけます。 |
| sg-lpo / scope | 作り直すかどうかは、データを見てから判断します。 | content-data.jsx:520 | デザインごと作り直すべき? … データを見てから判断します。 |

### sg-cms → `/feature-cms`（ページに価格・期間の記載なし。カードにも書いていない）

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-cms / default | 自社で更新できるCMSを、運用体制に合わせて。 | content-data.jsx:545 | 更新は自社でできますか? … できるように作ります。 |
| sg-cms / default | WordPress・MDX・Headless CMSから選定・カスタマイズ。 | detail-pages.jsx:613 | WordPress / MDX / Headless CMS を、貴社の運用体制に合わせて選定・カスタマイズ。 |
| sg-cms / default | 画像付きの操作マニュアルもお渡しします。 | content-data.jsx:545 | 画像付きの操作マニュアルもお渡しします。 |
| sg-cms / scope | CMSは6軸で比べ、実情に合わせて選びます。 | content-data.jsx:541 | 運用負荷の6軸で、担当者の実情に合わせて選びます。 |
| sg-cms / scope | 更新性・セキュリティ・表示速度・コスト・拡張性・運用負荷の6軸。 | content-data.jsx:541 | 更新性・セキュリティ・表示速度・コスト・拡張性・運用負荷の6軸 |
| sg-cms / scope | WordPressのままでよいかの目安も載せています。 | content-data.jsx:544 | WordPressのままで大丈夫? … 運用体制次第です。更新・バックアップ・脆弱性対応の担い手が決まっていれば問題ありません。 |

### sg-solution → 業種で切替（トップレベルは `target_url: null`・`variants: {}`）

5業種とも cost の body は同じ型で、出典は `extra-pages.jsx:429`「下記すべて、または必要なものだけを選んで導入できます。」。
価格は `extra-pages.jsx:430` で「{m.price}（税別）」の形で出る。`m.price` は `solutionPrice(key)`（`extra-pages.jsx:262`）が
`NORTIQ_PRICING.solutions`（`content-data.jsx:113-117`）から作る。
価格はページの「パッケージ内容」見出しの下に出るパッケージ全体の目安で、同じページ下部の「よくある課題と、システムの組み方」
（構成例ごとの費用。例: `content-data.jsx:572`「40〜120万円」）とは別の数字。カードは前者だけを使っている。
構成例がパッケージに含まれるのか別料金なのかは未確認のまま（料金表記の統一でも触っていない）。
導入期間は `content-data.jsx:907`「導入期間: {s.weeks}」で画面に出る。schedule の body に並べた項目は、同じ枠に出る
`pack`（`content-data.jsx:553-557`）から「(任意)」の付かないものを取った。同じ行の `weeks` は `pricePeriod()` で作られ、
月数は「ヶ月」で出る（以前は「か月」）。
cost の body の「〜向けパッケージの目安です」の「目安」はページに無い語（ページは価格の幅をそのまま見せている）。
幅のある価格を言い換えただけで、数字は足していない。

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-solution[クリニック・医療] / default | クリニック・医療向けのDXパッケージ。 | extra-pages.jsx:266 | クリニック・医療 … DXパッケージ。 |
| sg-solution[クリニック・医療] / default | Web集客、オンライン予約、AIチャットボットを、医療広告ガイドラインと薬機法を踏まえて導入します。 | extra-pages.jsx:267 | Web集客 / オンライン予約 / AIチャットボット / 患者管理データ分析を、医療業界の規制を踏まえて一気通貫で導入します。薬機法・医療広告ガイドライン準拠の運用設計が強みです。 |
| sg-solution[クリニック・医療] / cost | 60〜180万円＋月額3〜8万円（税別）。 | extra-pages.jsx:430（price は extra-pages.jsx:287 の solutionPrice('clinic')。値は content-data.jsx:113 の init: [60, 180], monthly: [3, 8]） | 表示結果「60〜180万円＋月額3〜8万円（税別）」 ← `{m.price}{priceTax()}` |
| sg-solution[クリニック・医療] / cost | すべて、または必要なものだけを選んで導入できます。 | extra-pages.jsx:429 | 下記すべて、または必要なものだけを選んで導入できます。 |
| sg-solution[クリニック・医療] / schedule | 導入期間は、標準的な構成で1〜2ヶ月が目安。 | content-data.jsx:553（値は content-data.jsx:113 の months: [1, 2]） | 表示結果「導入期間: 標準的な構成で1〜2ヶ月が目安 (要件により変動)」 ← `weeks: "標準的な構成で" + pricePeriod(NORTIQ_PRICING.solutions.clinic) + "が目安 (要件により変動)"` |
| sg-solution[クリニック・医療] / schedule | 要件により変動します。 | content-data.jsx:553 | (要件により変動) |
| sg-solution[クリニック・医療] / schedule | サイト制作、Web予約連携、MEO、医療広告ガイドライン準拠チェックを含む構成です。 | content-data.jsx:553 | "サイト制作", "Web予約連携", "MEO (ビジネスプロフィール整備)", "医療広告ガイドライン準拠チェック" |
| sg-solution[不動産] / default | 不動産業の集客×管理パッケージ。 | extra-pages.jsx:291 | 不動産業の … 集客 × 管理パッケージ。 |
| sg-solution[不動産] / default | 売買・賃貸・売却査定・投資物件ごとに導線を最適化したサイトと、物件管理データを連動した集客・追客の仕組み。 | extra-pages.jsx:292 | 売買・賃貸・売却査定・投資物件を、それぞれの導線で最適化したWebサイトと、物件管理データを連動した集客・追客の仕組みを構築します。 |
| sg-solution[不動産] / cost | 80〜300万円＋月額5〜15万円（税別）。 | extra-pages.jsx:430（price は extra-pages.jsx:312 の solutionPrice('realty')。値は content-data.jsx:114 の init: [80, 300], monthly: [5, 15]） | 表示結果「80〜300万円＋月額5〜15万円（税別）」 ← `{m.price}{priceTax()}` |
| sg-solution[不動産] / cost | すべて、または必要なものだけを選んで導入できます。 | extra-pages.jsx:429 | 下記すべて、または必要なものだけを選んで導入できます。 |
| sg-solution[不動産] / schedule | システム連動を含む場合、2〜3ヶ月以上が目安。 | content-data.jsx:554（値は content-data.jsx:114 の months: [2, 3], orMore: true） | 表示結果「導入期間: システム連動を含む場合2〜3ヶ月以上が目安」 ← `weeks: "システム連動を含む場合" + pricePeriod(NORTIQ_PRICING.solutions.realty) + "が目安"` |
| sg-solution[不動産] / schedule | サイト制作、物件DB・ポータル連携、査定LP、宅建業法の広告チェック、MEOを含む構成 | content-data.jsx:554 | "サイト制作", "物件DB・ポータル連携", "査定LP", "宅建業法の広告チェック", "MEO" |
| sg-solution[建設・工務店] / default | 建築・工務店のブランド×案件管理パッケージ。 | extra-pages.jsx:316 | 建築・工務店の … ブランド × 案件管理パッケージ。 |
| sg-solution[建設・工務店] / default | ブランドサイト構築、案件管理、施工事例の蓄積、顧客リテンションを一体化。注文住宅・リフォーム・工務店向けです。 | extra-pages.jsx:317 | ブランドサイト構築 + 案件管理 + 施工事例の蓄積 + 顧客リテンションを一体化したパッケージ。注文住宅・リフォーム・工務店の業務全体を見据えた DX 設計です。 |
| sg-solution[建設・工務店] / cost | 100〜400万円＋月額5〜20万円（税別）。 | extra-pages.jsx:430（price は extra-pages.jsx:337 の solutionPrice('build')。値は content-data.jsx:115 の init: [100, 400], monthly: [5, 20]） | 表示結果「100〜400万円＋月額5〜20万円（税別）」 ← `{m.price}{priceTax()}` |
| sg-solution[建設・工務店] / cost | すべて、または必要なものだけを選んで導入できます。 | extra-pages.jsx:429 | 下記すべて、または必要なものだけを選んで導入できます。 |
| sg-solution[建設・工務店] / schedule | 導入期間は、標準的な構成で1〜2ヶ月が目安。 | content-data.jsx:555（値は content-data.jsx:115 の months: [1, 2]） | 表示結果「導入期間: 標準的な構成で1〜2ヶ月が目安」 ← `weeks: "標準的な構成で" + pricePeriod(NORTIQ_PRICING.solutions.build) + "が目安"` |
| sg-solution[建設・工務店] / schedule | サイト制作、施工事例データベース、問い合わせ・資料請求導線、建設業許可番号の表記を含む構成です。 | content-data.jsx:555 | "サイト制作", "施工事例データベース", "問い合わせ・資料請求導線", "建設業許可番号の表記" |
| sg-solution[人材] / default | 人材業界のマッチング×集客パッケージ。 | extra-pages.jsx:341 | 人材業界の … マッチング × 集客パッケージ。 |
| sg-solution[人材] / default | 求職者集客、求人企業集客、マッチング体験を業界特化型に最適化。新卒・中途・派遣・エージェントに対応します。 | extra-pages.jsx:342 | 求職者集客 / 求人企業集客 / マッチング体験を、業界特化型に最適化。新卒・中途・派遣・業界エージェント・外国人材まで |
| sg-solution[人材] / cost | 150〜500万円＋月額10〜30万円（税別）。 | extra-pages.jsx:430（price は extra-pages.jsx:362 の solutionPrice('hr')。値は content-data.jsx:116 の init: [150, 500], monthly: [10, 30]） | 表示結果「150〜500万円＋月額10〜30万円（税別）」 ← `{m.price}{priceTax()}` |
| sg-solution[人材] / cost | すべて、または必要なものだけを選んで導入できます。 | extra-pages.jsx:429 | 下記すべて、または必要なものだけを選んで導入できます。 |
| sg-solution[人材] / schedule | 導入期間は、標準的な構成で1〜2ヶ月が目安。 | content-data.jsx:556（値は content-data.jsx:116 の months: [1, 2]） | 表示結果「導入期間: 標準的な構成で1〜2ヶ月が目安」 ← `weeks: "標準的な構成で" + pricePeriod(NORTIQ_PRICING.solutions.hr) + "が目安"` |
| sg-solution[人材] / schedule | 採用サイト制作、求人媒体連携、JobPosting構造化データ、職業安定法の準拠チェックを含む構成です。 | content-data.jsx:556 | "採用サイト制作", "求人媒体 (Indeed/求人ボックス) 連携", "JobPosting 構造化データ", "職業安定法の準拠チェック" |
| sg-solution[小売・EC] / default | 小売・ECのOMOパッケージ。 | extra-pages.jsx:366 | 小売・EC の … OMOパッケージ。 |
| sg-solution[小売・EC] / default | 実店舗とオンラインを連動。 | extra-pages.jsx:367 | 実店舗とオンラインを連動させる OMO 戦略。 |
| sg-solution[小売・EC] / default | ECサイト構築・送客LP・店舗在庫連動・購買データ分析を一体化したパッケージです。 | extra-pages.jsx:367 | EC サイト構築・送客 LP・店舗在庫連動・購買データ分析を一体化したパッケージです。 |
| sg-solution[小売・EC] / cost | 200〜800万円＋月額10〜40万円（税別）。 | extra-pages.jsx:430（price は extra-pages.jsx:387 の solutionPrice('retail')。値は content-data.jsx:117 の init: [200, 800], monthly: [10, 40]） | 表示結果「200〜800万円＋月額10〜40万円（税別）」 ← `{m.price}{priceTax()}` |
| sg-solution[小売・EC] / cost | すべて、または必要なものだけを選んで導入できます。 | extra-pages.jsx:429 | 下記すべて、または必要なものだけを選んで導入できます。 |
| sg-solution[小売・EC] / schedule | EC構築は、2〜3ヶ月以上が目安。 | content-data.jsx:557（値は content-data.jsx:117 の months: [2, 3], orMore: true） | 表示結果「導入期間: EC構築は2〜3ヶ月以上が目安」 ← `weeks: "EC構築は" + pricePeriod(NORTIQ_PRICING.solutions.retail) + "が目安"` |
| sg-solution[小売・EC] / schedule | ECカート構築、特商法表記の整備、GA4計測を含む構成の導入期間です。SNS・広告運用は任意で選べます。 | content-data.jsx:557 | "ECカート構築 (BASE / Shopify / カラーミー)", "特商法表記の整備", "GA4 計測", "(任意) SNS・広告運用" |

### sg-works → `/works`（業種別は `/works-*`。ページに価格の記載なし）

業種別ページの件数（バッジ「全 N 件」）は WORKS_DATA の増減で変わるので、カードには書いていない。
各実績カードの成果の数字（「問い合わせ 2.4×」など）も、効果の断定に当たるので使っていない。
業種別カードの見出しは、`info-pages.jsx:56-64` の CATEGORY_LABELS（サイトに出る語）に合わせた。
`by_industry` のキー（`data/nq-labels.json` の語）とは別の語になる業種が3つある:
建設・工務店 → 表示は「建築・工務店」、小売・EC →「小売 / EC」、製造・インフラ →「インフラ・製造」。

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-works / default | 制作実績を、業種別に確認できます。 | info-pages.jsx:83 | 業種別・LP強化別・動画別に絞り込めます。 |
| sg-works / default | 30社の制作・支援実績から、業種別・LP強化別・動画別に絞り込めます。 | info-pages.jsx:83 | ${NORTIQ_STATS.clients} 社の制作・支援実績から、業種別・LP強化別・動画別に絞り込めます。 |
| sg-works / default | 30社 | content-data.jsx:18 | clients: 30, |
| sg-works / default | 近い業種の事例からご覧ください。 | info-pages.jsx:83 | お探しの業種・課題に近い事例から、最適なアプローチをご検討ください。 |
| sg-works[クリニック・医療] / default | クリニック・医療の制作実績。 | info-pages.jsx:57 | clinic: "クリニック・医療", |
| sg-works[不動産] / default | 不動産の制作実績。 | info-pages.jsx:58 | realty: "不動産", |
| sg-works[建設・工務店] / default | 建築・工務店の制作実績。 | info-pages.jsx:59 | build: "建築・工務店", |
| sg-works[人材] / default | 人材の制作実績。 | info-pages.jsx:60 | hr: "人材", |
| sg-works[小売・EC] / default | 小売 / ECの制作実績。 | info-pages.jsx:61 | retail: "小売 / EC", |
| sg-works[製造・インフラ] / default | インフラ・製造の制作実績。 | info-pages.jsx:62 | infra: "インフラ・製造", |
| sg-works[クリニック・医療] / default | の制作実績。（見出しの型。6業種共通） | info-pages.jsx:80 | {label}の<br/>制作実績 |
| sg-works[クリニック・医療] / default | の業種で手がけた制作・支援実績を集約。Web制作からAI実装までの事例を掲載しています。（本文の型。6業種共通） | info-pages.jsx:82 | の業種で、Nortiq Labs が手がけた制作・支援実績を集約しました。Web制作からAI実装まで一貫した事例を掲載しています。 |

### sg-pricing → `/pricing`

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-pricing / default | 料金の目安レンジを、すべて公開しています。 | info-pages.jsx:395 | 目安レンジをすべて公開しています。 |
| sg-pricing / default | 初期費用は | service-pages.jsx:81（値は content-data.jsx:204 の label: monthly ? '月額' : '初期費用'） | 表示結果 3サービスとも先頭のカードのラベルが「初期費用（税別）」 ← `<PriceFigure label={r.label} tax={r.tax}` |
| sg-pricing / default | Web制作30万円〜 | info-pages.jsx:382（値は content-data.jsx:49-51 の label: 'Web制作' … min: 30） | 表示結果 見出し「Web制作」と LIGHT のカード「初期費用（税別）30万円〜」 ← `title: P.web.label … pricePlanRows('web')` |
| sg-pricing / default | AIチャットボット10万円〜 | info-pages.jsx:383（値は content-data.jsx:69-72 の label: 'AIチャットボット' … min: 10） | 表示結果 見出し「AIチャットボット」と LIGHT のカード「初期費用（税別）10万円〜」 ← `title: P.chatbot.label … pricePlanRows('chatbot')` |
| sg-pricing / default | DX・ML50万円〜 | info-pages.jsx:384（値は content-data.jsx:86-89 の label: 'DX・ML' … min: 50） | 表示結果 見出し「DX・ML」と PoC のカード「初期費用（税別）50万円〜」 ← `title: P.dx.label … pricePlanRows('dx')` |
| sg-pricing / default | （税別）。 | info-pages.jsx:395（値は content-data.jsx:45 の taxNote: '表示価格はすべて税別です'） | 表示結果「…目安レンジをすべて公開しています。表示価格はすべて税別です。」 ← `目安レンジをすべて公開しています。' + P.taxNote` |
| sg-pricing / default | サービスごとに3つのプラン。 | info-pages.jsx:395 | サービスごとに3つのプランを用意。 |
| sg-pricing / cost | 追加費用の線引きは、見積もり時に明示します。 | content-data.jsx:707 | 見積もり時に線引きを明示します。 |
| sg-pricing / cost | 追加費用が発生するのは、新規ページの制作・大幅なデザイン変更・素材の新規制作などです。 | content-data.jsx:707 | 追加費用が発生するのはどんな時? … 新規ページの制作・大幅なデザイン変更・素材の新規制作などです。 |
| sg-pricing / scope | プランの組み合わせも、ご相談いただけます。 | info-pages.jsx:417 | プランの組み合わせ、ご相談ください。 |
| sg-pricing / scope | 段階契約でのご依頼も、 | info-pages.jsx:396 | "段階契約OK" |
| sg-pricing / scope | 制作のみのご依頼も承ります。 | content-data.jsx:708 | 制作のみのご依頼も承ります。 |

### sg-support → `/support`（保守プランの金額は開始価格だけ。プラン別の月額はページにも無いので、カードにも書いていない）

default の title は、ページの見出し「毎月、4つのことを必ず実施します。」（`info-pages.jsx:262`）から「必ず」だけを抜いた（3 章の #19）。
cost は 2026-09-21 に、ページに出た開始価格「保守プランは月額2万円〜（税別）」を title にした（7 章の #11）。
Light / Standard / Premium 別の月額は決まっておらず、ページも「対応範囲と頻度をうかがってお見積もりします」としている。
件数（月3件・月8件・無制限）は `NORTIQ_PRICING.maintenance.plans` の値で、`/pricing` の保守・運用の表と同じ。

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-support / default | 毎月4つのことを実施します。 | info-pages.jsx:262 | 毎月、4つのことを … 実施します。 |
| sg-support / default | 月次アクセス報告、定期訪問・MTG、操作マニュアル整備、ヒートマップ解析。 | info-pages.jsx:266-269 | 月次アクセス報告 … 定期訪問・MTG … 操作マニュアル整備 … ヒートマップ解析 |
| sg-support / default | 保守プラン内で修正にも対応します。 | info-pages.jsx:254 | "保守プラン内で修正対応" |
| sg-support / cost | 保守プランは月額2万円〜（税別）。 | info-pages.jsx:279（値は content-data.jsx:103 の monthlyMin: 2） | 表示結果「保守プランは月額2万円〜（税別）。Light / Standard / Premium の金額は、対応範囲と頻度をうかがってお見積もりします。」 ← `保守プランは … {priceMonthly(M.monthlyMin)}{priceTax()}` |
| sg-support / cost | テキスト・画像の差し替えは保守プラン内で対応 | info-pages.jsx:235 | label: 'テキスト・画像の差し替え' |
| sg-support / cost | 保守プラン内で対応（Light 月3件・Standard 月8件・Premium 無制限）。 | info-pages.jsx:283（値は content-data.jsx:105-107 の edits: '月3件' … edits: '月8件' … edits: '無制限'） | 表示結果「保守プラン内で対応 (Light 月3件 / Standard 月8件 / Premium 無制限)」 ← `保守プラン内で対応 (${byPlan(itemEdits.field)})` |
| sg-support / scope | 保守でできることを、事前に一覧化します。 | content-data.jsx:695 | 保守内でできること/別見積もりになることを事前に一覧化します。 |
| sg-support / scope | 既存素材の差し替えは保守内、新規制作・大幅改修は別お見積もりが一般的な線引きです。 | content-data.jsx:687 | 既存素材の差し替えは保守内、新規制作・大幅改修は別お見積もりが一般的な線引きです。 |
| sg-support / scope | 窓口と対応時間も明示します。 | content-data.jsx:693 | メール・チャット等の窓口と対応時間帯を契約時に明示します。 |

### sg-subsidy → `/subsidy`

「補助金でサイトが作れる」と読める書き方を避けた。ページは `content-data.jsx:417` で
「単純なHP制作は対象外」（デジタル化・AI導入補助金 2026）、`:408` で「IT導入支援事業者に未登録」、`:407` で
「採択を保証することはできません」と明記している。カードには金額・補助率を書いていない（公募回ごとに変わるため）。

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-subsidy / default | 補助金がホームページ制作に使えるか確認する。 | content-data.jsx:414 | 主な制度と「ホームページ制作」の関係 |
| sg-subsidy / default | 主な制度とホームページ制作の関係 | content-data.jsx:414 | 主な制度と「ホームページ制作」の関係 |
| sg-subsidy / default | 当社ができること・できないことをまとめています。 | content-data.jsx:444 | 当社が「できること」 |
| sg-subsidy / default | できないこと | content-data.jsx:408 | 申請支援・ツール提供は現状できません |
| sg-subsidy / default | 初回相談無料。 | info-pages.jsx:574 | "初回相談無料" |
| sg-subsidy / schedule | 申請から交付までの一般的な流れ。 | content-data.jsx:434 | 申請から交付までの一般的な流れ |
| sg-subsidy / schedule | GビズIDの取得に時間がかかるため最初に着手します。 | content-data.jsx:437 | GビズID取得・公募要領確認 … IDの取得に時間がかかるため最初に着手します。 |
| sg-subsidy / schedule | 発注・着手は交付決定後が原則です。 | content-data.jsx:439 | 発注・着手は交付決定後が原則です |
| sg-subsidy / scope | 対象になるかは、3つの質問で確認できます。 | content-data.jsx:425 | 対象になるか、3つの質問 |
| sg-subsidy / scope | 導入するもの、事業計画、事業規模の要件の3点です。 | content-data.jsx:428-430 | Q1. 導入するものは? … Q2. 事業計画はあるか? … Q3. 事業規模の要件は? |
| sg-subsidy / scope | 単なるHP制作は、持続化補助金など限られた選択肢になります。 | content-data.jsx:428 | 「単なるHP制作」なら持続化補助金など限られた選択肢になります。 |

### sg-recruit → `/recruit`

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-recruit / default | 各領域でメンバーを募集しています。 | extra-pages.jsx:169 | 各領域でメンバーを募集しています。 |
| sg-recruit / default | 京都＋フルリモート可。 | extra-pages.jsx:170 | "京都 + フルリモート可" |
| sg-recruit / default | エンジニア、デザイナー、コンサルタント | extra-pages.jsx:169 | エンジニア / Data Scientist / Designer / Consultant |
| sg-recruit / default | 学生向けのインターンも募集しています。 | extra-pages.jsx:161 | title: "AI Research インターン", type: "インターン", emp: "京都 / フルリモート可", level: "学生" |

### sg-guidebook → `/guidebook`（`selectable: false`。slot-end のデフォルト）

`content-data.jsx:469` に「メールで資料が届く」とあるが、実装はフォームなしの PDF 直リンク（`info-pages.jsx:663`）。
カードには「メールで届く」と書いていない。

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| sg-guidebook / default | この記事を読んだ方へ | （設計書8章「する」の例文。リンク先の表現ではない） | — |
| sg-guidebook / default | サービス紹介資料を無料でダウンロード。 | info-pages.jsx:632-635 | サービス紹介資料 … "無料DL" |
| sg-guidebook / default | 制作の進め方・実績・料金プラン・制作の流れを、全11ページのPDFにまとめています。 | info-pages.jsx:634 | 営業資料 (PDF・全11ページ)。制作の進め方・実績・料金プラン・制作の流れまで、これ一冊でご確認いただけます。 |
| sg-guidebook / default | 費用はかかりません。 | content-data.jsx:476 | 費用はかかりますか? … 資料・相談とも無料です。 |

### rs-cost → `/pricing`

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| rs-cost / default | Web制作は30万円〜 | info-pages.jsx:382（値は content-data.jsx:49-51 の label: 'Web制作' … min: 30） | 表示結果 見出し「Web制作」と LIGHT のカード「初期費用（税別）30万円〜」 ← `title: P.web.label … pricePlanRows('web')` |
| rs-cost / default | （税別）。 | info-pages.jsx:395（値は content-data.jsx:45 の taxNote: '表示価格はすべて税別です'） | 表示結果「…目安レンジをすべて公開しています。表示価格はすべて税別です。」 ← `目安レンジをすべて公開しています。' + P.taxNote` |
| rs-cost / default | 目安レンジをすべて公開しています。 | info-pages.jsx:395 | 目安レンジをすべて公開しています。 |
| rs-cost / default | 追加費用が出るのは新規ページの制作・大幅なデザイン変更・素材の新規制作など。見積もり時に線引きを明示します。 | content-data.jsx:707 | 新規ページの制作・大幅なデザイン変更・素材の新規制作などです。見積もり時に線引きを明示します。 |

### rs-schedule → `/web`

期間の出典は `/web` の FAQ 1か所に固定した。recruit-site LP の「最短3週間で公開」「4週間で公開」や kanri-dantai LP の「約1.5ヶ月」とは混ぜていない。
同じ期間は 2026-09-21 から `/web` と `/pricing` の料金表にも「制作期間の目安 4〜6週間」の行として出る（値はどれも `content-data.jsx:52-61` の `weeks`）。

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| rs-schedule / default | Web制作の納期は、Lightプランで4〜6週間が目安です。 | service-pages.jsx:269（値は content-data.jsx:52 の weeks: [4, 6]） | 表示結果「納期はどのくらいですか? … Light プランで4〜6週間」 ← `納期はどのくらいですか? … p.name + (i === 0 ? ' プランで' : ' で') + pricePeriod(p)` |
| rs-schedule / default | Standardは8〜12週間、Premiumは12〜16週間。 | service-pages.jsx:269（値は content-data.jsx:56-61 の weeks: [8, 12] … weeks: [12, 16]） | 表示結果「Standard で8〜12週間、Premium で12〜16週間を目安にしています。」 ← `pricePeriod(p)).join('、') + 'を目安にしています。` |
| rs-schedule / default | 6ステップで進めます。 | service-pages.jsx:186 | 6 ステップで、確実に。 |
| rs-schedule / default | ヒアリングから運用・改善まで | service-pages.jsx:190-196 | ProcessStep title="ヒアリング" … ProcessStep title="運用・改善" |

### rs-trust → `/voice`

`/voice` のバッジは「累計30社の支援」（`info-pages.jsx:187`）。下部リボンは以前ハードコードの「20+ 支援企業数」で数字が割れていたが、
いまは `{NORTIQ_STATS.clients}+`（`info-pages.jsx:217`。表示は「30+」）に直っている（5章の 1）。このブロックはバッジの文字列に合わせた。
設計書4章の「支援実績30社以上」という文字列は、サイトのどこにも無いので使っていない。
声に含まれる成果の数字（「SEO流入が1.8倍」など）は、効果の断定に当たるので使っていない。

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| rs-trust / default | 累計30社の支援。 | info-pages.jsx:187 | `累計${NORTIQ_STATS.clients}社の支援` |
| rs-trust / default | 30社 | content-data.jsx:18 | clients: 30, |
| rs-trust / default | ご利用企業の声を公開しています。 | info-pages.jsx:186 | ご利用いただいている企業様の声を、何より大切にしています。 |
| rs-trust / default | クリニック、不動産、工務店、人材などの声を、業種と役職を添えて掲載しています。 | info-pages.jsx:171-174 | tag: "クリニック (東京)", name: "A.K.", role: "代表取締役・院長" … tag: "中堅不動産 (大阪)" … tag: "工務店 (神奈川)" … tag: "人材 (東京)" |
| rs-trust / default | ご利用会社様の声を見る | info-pages.jsx:182 | label: "ご利用会社様の声" |

### rs-ai-quality → `/chatbot`（設計書は `/support`。読み替えの理由は 3 章）

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| rs-ai-quality / default | AIで作る記事は、公開前の人間のレビューを必須としています。 | service-pages.jsx:496 | 公開前の人間のレビューを必須としており |
| rs-ai-quality / default | 明らかな事実誤認は出力検証レイヤーで自動検出。 | service-pages.jsx:496 | 出力検証レイヤーで明らかな事実誤認は自動検出します。 |
| rs-ai-quality / default | 事実情報の検証と、業界特化の専門性チェックを経て公開する設計です。 | service-pages.jsx:493 | 事実情報の検証ステップと、業界特化の専門性チェックを経て公開する設計 |
| rs-ai-quality / default | AIチャットボットの詳細を見る | service-pages.jsx:308 | title="AIチャットボット導入・開発" |

### rs-scope → `/diagnostic`（数字は使っていない。理由は 3 章）

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| rs-scope / default | 今のサイトの課題と、直す優先順位が無料で分かります。 | extra-pages.jsx:1043 | URLを入れるだけで、 … サイトの … 「本当の課題」 … が見える。 |
| rs-scope / default | 直す優先順位 | extra-pages.jsx:995 | 何から手をつければいいか優先度が分からない … 改善インパクトの高い順に優先順位を提案 |
| rs-scope / default | URLを入れるだけの自動診断です。 | extra-pages.jsx:1046 | URLを入れるだけ |
| rs-scope / default | 完全無料・登録不要。 | extra-pages.jsx:1042 | 完全無料・登録不要 |
| rs-scope / default | 改善インパクトの高い順に優先順位を提案します。 | extra-pages.jsx:995 | 改善インパクトの高い順に優先順位を提案 |
| rs-scope / default | ホームページ無料診断を試す | app.jsx:79 | ホームページ無料診断 |

### ct-diagnostic → `/diagnostic`（数字は使っていない）

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| ct-diagnostic / weak | URLを入れるだけで、サイトの課題が見える。 | extra-pages.jsx:1043 | URLを入れるだけで、 … サイトの … 「本当の課題」 … が見える。 |
| ct-diagnostic / strong | 完全無料・登録不要。 | extra-pages.jsx:1042 | 完全無料・登録不要 |
| ct-diagnostic / strong | その場で結果表示。 | extra-pages.jsx:977 | その場で結果表示 |
| ct-diagnostic / strong | 無料で診断する | extra-pages.jsx:903 | buttonLabel = "無料で診断する" |

### ct-guidebook → `/guidebook`

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| ct-guidebook / weak | 制作の進め方と料金を、資料で確認できます。 | info-pages.jsx:634 | 制作の進め方・実績・料金プラン・制作の流れまで、これ一冊でご確認いただけます。 |
| ct-guidebook / strong | 全11ページの紹介資料を無料でダウンロード。 | info-pages.jsx:635 | "全11ページ", "無料DL" |
| ct-guidebook / strong | 資料を無料DLする | info-pages.jsx:637 | ctaLabel="資料を無料DLする" |

### ct-contact → 資料請求モーダル（`target_url: null`・`action: "contact"`）

リンク先にあたるのは ContactModal（`components.jsx`）。返信時間の表記はサイト内に数通りあるが、
押したあとに開くモーダルの表記（「営業日24時間以内にご返信します」）にそろえた。

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| ct-contact / weak | 資料請求・お問い合わせを受け付けています。 | components.jsx:747 | 資料請求・お問い合わせ |
| ct-contact / strong | 初回相談は無料。営業日24時間以内にご返信。 | components.jsx:748 | 初回相談は無料です。営業日24時間以内にご返信します。 |

### rl-related

| block / variant | 文言で使った表現 | 出典 | 原文 |
|---|---|---|---|
| rl-related / default | あわせて読まれている記事 | （設計書8章で固定。リンク先の表現ではない） | — |

## 3. 設計書の例文・定義から変えた箇所と理由

| # | ブロック | 設計書 | 下書き | 理由 |
|---|---|---|---|---|
| 1 | sg-recruit-site / default | body「…30万円〜、4週間で公開。」 | 「料金はライトプランで30万円〜（税別）です。」 | LP の料金表では 30万円〜（ライト）の期間の目安は 3週間（`:289`）、4週間は 60万円〜のスタンダード（`:302`）。1文に並べると「30万円で4週間」と読める。期間は schedule でプラン別に出す。LP 側も 2026-09-21 に、金額と並べる箇所を「30万円〜（税別）・最短3週間で公開」へ直した（`:7` `:26` `:37`） |
| 2 | sg-recruit-site / cost | title「採用サイトは30万円から。」 | 「採用サイトは30万円〜。」 | 画面は「30万円〜」だけ。下書きの時点で JSON-LD（`:39`）にだけあった「30万円から」も、2026-09-21 に「30万円〜（税別）。」へ直った |
| 3 | sg-recruit-site / cost | body「職種別ページと求人記事まで含めた料金です。追加費用が出る条件も先にお伝えします。」 | ライトの中身（8ページ・応募フォーム・しごと検索対応）と、税別・カメラマン実費 | 職種別5ページと求人記事 初回5本は 60万円〜のスタンダードの項目（`:305` `:308`）。「追加費用が出る条件」に当たる記述は LP に無く、あるのは `:331` の注記だけ |
| 4 | sg-recruit-site / trust | 「採用サイトの制作実績を見る。」「業種別の事例と、…を公開しています。」 | 「モックを見てから、依頼を決められます。」＋モックアップとチェックリスト | LP は「実績は許諾がとれたものから掲載します。まず、3業種のモックアップをご覧ください。」（`:271`）で、載っているのはモックアップ。事例があると読める書き方をやめ、小ラベルも「仕上がりを先に見たい方へ」にした |
| 5 | sg-recruit-site / schedule | （設計書に無い） | 追加 | 汎用の rs-schedule は `/web` の納期（4〜6週間）を答えるので、採用サイトの検討者には LP の期間をカード側で答える |
| 6 | sg-web / default | 8章のサンプル「集客と問い合わせを前提にしたWeb制作」「オリジナルデザインで30万円から。」「機能一覧を見る」 | lede の語順どおり／「30万円〜（税別）」／「機能と料金を見る」 | 「オリジナルデザイン」は `/web` の本体に無い（共通 CTA と meta にだけある）。価格は「30万円〜」（2026-09-21 からバッジは「30万円〜（税別）」）。ページ内に「機能一覧」という見出しは無い |
| 7 | sg-chatbot | audience「サイトへのAIチャットボット導入やAI活用を検討している人向け」 | 「AIを使ってブログ記事の作成と更新を省力化したい、またはサイトへのAIチャットボット導入を検討している人向け」（2026-09-21 の評価のあとにさらに絞った。いまの文は 8 章） | `/chatbot` の主訴求は AI によるブログ投稿ツール（`service-pages.jsx:309-312`）。FAQ チャットボットは STANDARD の1項目（`content-data.jsx:77`）。Jev は audience を文字どおりに読むので、ページの実際の中身を先に書いた。カードの文言も投稿ツールに合わせた |
| 8 | rs-trust | 「支援実績30社以上」 | 「累計30社の支援。」 | 「支援実績30社以上」はサイトのどこにも無い。`/voice` のバッジの文字列に合わせた。「以上」は根拠が無いので付けない |
| 9 | rs-ai-quality | リンク先 `/support` | リンク先 `/chatbot` | `/support` に AI と人の分担の記述が無い（`info-pages.jsx:240-307`、`content-data.jsx:685-703`）。記述があるのは `/chatbot` の FAQ と LP 2本。LP は業種が限られるので、業種を問わない `/chatbot` にした。答えの範囲も、ページに書いてある「AIで作る記事」に絞った |
| 10 | rs-scope | 「何を頼むべきかを無料診断で整理できること」 | 「今のサイトの課題と、直す優先順位が無料で分かります。」 | `/diagnostic` は URL 入力式の自動診断で、依頼内容を整理する相談ではない。ページが実際に約束している「課題の可視化」と「優先順位の提案」（`extra-pages.jsx:995`）に寄せた |
| 11 | rs-scope / ct-diagnostic | — | 数字を一切使わない | `/diagnostic` のページ内で数字が割れている: 47項目（`:994`）、5つの観点（`:1075`）と5領域（`:1008`）、4領域（`:979` `:1019`）、60秒（`:1100`）、10〜30秒（`:883`）。どれを書いても別の箇所と食い違う |
| 12 | sg-subsidy | audience は下書きの時点では設計書のまま（2026-09-21 の評価のあと、文言と同じ「使えるかを確かめたい」に絞った。8 章）。文言の例は設計書に無い | 「使えるか確認する」調 | `/subsidy` は単純なHP制作を原則対象外とし、IT導入支援事業者に未登録、採択保証も不可と明記している。「補助金で作れる」「採択」「必ず」は使わない |
| 13 | ct-contact | 「資料請求・相談（営業日24時間以内に返信）」 | 「営業日24時間以内にご返信。」 | 押すと開く ContactModal の表記は「ご返信します」（`components.jsx:748`）。「返信」とだけ書くのは recruit-site LP（`:80`）だけ |
| 14 | ct-guidebook | 「サービス紹介資料のダウンロード」 | 「メールで届く」とは書かない | 実装はフォームなしの PDF 直リンク（`info-pages.jsx:663`）。`content-data.jsx:469` の「メールで資料が届く」は実装と合っていない |
| 15 | sg-solution / sg-works | 1ブロック1リンク | `by_industry` で業種別に持つ（コントラクト 2.1） | 業種が決まらないと行き先が決まらない。sg-solution はトップレベルの行き先なし、sg-works は `/works` |
| 16 | sg-guidebook | （設計書に無い） | 追加（コントラクト 2.1、`selectable: false`） | slot-end のデフォルト「資料ダウンロードのカード」に当たるブロックが4章に無い |
| 17 | 全 variant | 「不安別に最大3文言」 | ブロックによって 0〜3 個 | その不安に答える材料がリンク先に実在するものだけ作った。作らなかった組み合わせは下の表 |
| 18 | sg-solution | audience「クリニック、不動産、建築、人材、小売のいずれかで、業種に合った提案を見たい人向け」 | 「クリニック・医療、不動産、建設・工務店、人材、小売・ECのいずれかの事業者で、自社の業種に合った提案を見たい人向け」 | 改訂後の設計書では audience が Jev への質問文「この訪問者は次の説明に当てはまる：{audience}」にそのまま入る。「いずれかで」では誰のことかが文だけで決まらないので「事業者」を補い、業種の語を `data/nq-labels.json` の industry ラベル（= `by_industry` のキー、Jev が industry の質問で選ぶ語）にそろえた。audience は画面に出ない |
| 19 | sg-support / default | （設計書に例文なし） | title からページの見出しにある「必ず」を抜いた | 11章は「必ず」を効果の断定の例に挙げている。ここでの「必ず」は実施内容の約束で効果の断定ではないが、カードは見出しだけで読まれ、語の有無で機械検査もしやすいので、全文言で「必ず」を使わないことにした。「4つのこと」の数字と中身はページのまま |
| 20 | sg-cms / scope | （設計書に例文なし） | 「WordPressのままでよいかの目安も載せています。」 | 下書きの「判断できます」は、ページに判断の手段があると読める。リンク先にあるのは FAQ の答え（`content-data.jsx:544`「運用体制次第です。…担い手が決まっていれば問題ありません。」）なので、「目安が載っている」に弱めた |
| 21 | sg-recruit-site / default | — | 「料金プランは、ライトが30万円〜（税別）です。」 | 下書きの「ライトプラン」という語は LP に無い。LP は見出し「料金プラン（税別）」の下にプラン名「ライト」を置いている（`:284` `:287`）ので、その2語に分けた |

variant を作らなかった組み合わせ（材料がリンク先に無い、または使えない）:

| ブロック | 作らなかった variant | 理由 |
|---|---|---|
| sg-recruit-site / sg-kanri-dantai | ai_quality | 材料はある（「AIで下地を作り、人が仕上げます」）が、上限3つに cost / schedule / trust を優先した。ai_quality の不安が最大のときは、ルール5で slot-end に rs-ai-quality が出る |
| sg-web | trust / ai_quality | `/web` の実績欄は成果の倍率つきのカード3枚だけ（効果の断定に当たる）。AI の分担の記述は無い |
| sg-chatbot | schedule / trust / scope | 導入期間の記述が無い。効果の欄は倍率と%（`service-pages.jsx:387-390`）で使えない |
| sg-dx | trust / ai_quality | 材料はチームの経歴だけで、実績の記述が無い。上限3つに cost / schedule / scope を優先した |
| sg-lpo | cost / schedule / trust / ai_quality | 価格・納期の記載が無い。「平均改善実績」は倍率と%（`detail-pages.jsx:704-707`）で使えない |
| sg-cms | cost / schedule / trust / ai_quality | 価格・期間の記載が無い。h2 の「月の運用工数を 1/10 に」（`detail-pages.jsx:645`）は効果の断定に当たるので使っていない |
| sg-solution（5業種） | trust / ai_quality / scope | 実績欄は成果の数字つき。hr のバッジ「応募率 +52%(平均)」も使っていない |
| sg-works | すべて | ブロック自体が trust への答え。trust が最大の不安なら slot-end に rs-trust（`/voice`）が並ぶ |
| sg-pricing | schedule / trust / ai_quality | trust と ai_quality は料金ページに該当する記述が無い。schedule は 2026-09-21 から料金表に「制作期間の目安 4〜6週間」などの行が出ているが、納期の答えは `/web` の FAQ を出典にした sg-web / schedule と rs-schedule に任せている |
| sg-support | schedule / trust / ai_quality | AI と人の分担の記述が無い（上の #9 と同じ）。SLA 99.9% などは実績の裏づけを問われるので使っていない |
| sg-subsidy | cost / trust / ai_quality | 補助額・補助率は公募回ごとに変わる（`content-data.jsx:410`）ので書かない |
| sg-recruit / sg-guidebook | すべて | 5つの不安は発注を検討する事業者のもので、求職者と資料DLには当てはまらない |

## 4. 禁止表現の確認（設計書11章）

全 variant について次を確認した（2026-09-20 に正規表現でも再確認。「必ず」「No.1」「今だけ」「残りわずか」、数字＋倍・×・%、
「あなた」「ご覧になっ」「ご訪問」「他社」「保証」は 0 件）。

- 行動の言い当て（「〜をご覧になりましたね」「2回目のご訪問」）: なし。呼びかけはすべて「〜の方へ」の形で状況に向けている。
- AI の強調（「AIがあなたに最適なページを選びました」）: なし。「AI」が出るのは、リンク先のサービス名と機能の説明だけ。
- 効果の断定（倍率・%・No.1・「必ず」）: なし。リンク先にある成果の数字は1つも転記していない。
  sg-support の title は、ページの見出し「毎月、4つのことを必ず実施します。」（`info-pages.jsx:262`）から「必ず」を抜いてある（3 章の #19）。
  「最適化」は2か所にある（sg-solution[不動産] と [人材] の default。どちらもリンク先の lede の語で、サービスの中身の説明）。
  11章が禁じる「AIがあなたに最適なページを選びました」とは別の使い方。
- 緊急性のあおり（「今だけ」「残りわずか」）: なし。sg-kanri-dantai / schedule の「2026年12月末までの着手が目安」は
  制度の施行日（2027年4月1日）から逆算した LP の記載（`:303`）で、事実にもとづく。
- 他社との比較: なし。`/dx` の「VS AI 開発専業会社」の比較表（`service-pages.jsx:576-592`）は使っていない。
  同じ枠にあった「初期投資ゼロ」「¥0」は 2026-09-21 にページから外れた（無料なのは初回相談だけで、PoC は50万円〜）。
  sg-dx / cost と scope も「初回相談は無料」「PoCから先は有料です」と、ページと同じ線引きで書いている。
- CTA: すべて動詞で終わり、10字以内（rs- は16字以内）、矢印なし。小ラベルはすべて日本語。

「一字一句」から外した正規化（1章）の理由: 下書きの時点では、リンク先のソース自体が同じ数字を `30万円〜` と `30 万円〜` の
両方で書いていて、空白まで合わせるとどちらかと必ず食い違った。金額と期間は 2026-09-21 にヘルパー経由の1通りの表記になったが、
件数や見出しの数字（`月 5 記事`＝`content-data.jsx:74`、`6 ステップ`＝`service-pages.jsx:186`）には空白入りが残っている。

## 5. 承認の前に決めてほしいこと（リンク先側の不整合）

カードの文言では避けて通したが、リンク先のページ自体に残っている食い違い。どれも blocks.json の外の話。

1. ~~`/voice` の「20+ 支援企業数」~~ **解消。** `info-pages.jsx:217` は `{NORTIQ_STATS.clients}+`（表示は「30+」）になり、
   バッジの「累計30社の支援」と同じ数字を引いている。
2. ~~recruit-site LP の「30万円〜・4週間で公開」~~ **解消（2026-09-21）。** 金額と期間を並べる箇所は、LP の meta・twitter・JSON-LD
   （`lp/service/recruit-site/index.html:7` `:26` `:37`）も本体サイトのバナー（`components.jsx:440`）も
   「30万円〜（税別）・最短3週間で公開」になった。料金表（30万円〜＝3週間、60万円〜＝4週間）と合う。title と FV タグ（`:80`）の
   「4週間で公開」は金額と並べない形で残っている。sg-recruit-site は default が金額だけ、schedule がプラン別の期間なので、直す所は無い。
3. **`/diagnostic` のページ内の数字**（47項目・5つの観点・4領域・60秒・10〜30秒）。統一されたら、rs-scope と ct-diagnostic に
   数字を足すかを検討する。
4. **`/guidebook` の「メールで資料が届く」**（`content-data.jsx:469`）。実装は直リンクのダウンロード。どちらかに合わせる。
5. **`/subsidy` の「登録を準備中」**（`info-pages.jsx:590`）と「未登録のため…現状できません」（`content-data.jsx:408`）。
   矛盾ではないが、並べて読むと印象が割れる。sg-subsidy は後者の側に立って書いている。
6. **rs-ai-quality のリンク先**。`/chatbot` に読み替えた（3章の #9）。`/support` に「AIで下地を作り、人が確認・仕上げる」旨の節を
   足すなら、リンク先を設計書どおり `/support` に戻し、文言をその節に合わせて書き直す。
   承認のとき見てほしい点がもう1つある。`/chatbot` の FAQ（`service-pages.jsx:496`）は続けて「最終的な記事の責任は運用者にあります」と
   書いていて、レビューをするのはツールを使う側（お客様）とも読める。カードは「誰が」を書いていないので嘘にはならないが、
   この不安（AIを使った制作の品質）を持つ人は「Nortiq の人が確認する」と受け取りやすい。sg-chatbot / ai_quality も同じ文を使っている。
7. **rs-scope のリンク先**。意図（何を頼むべきか整理する）にいちばん近いのは `/quick-diagnosis`（4つの質問で推奨プランが出る）だが、
   noindex で設計書の対象外。`/diagnostic` のままにするなら、今の文言（課題と優先順位が分かる）で承認する。
8. **業種ラベルの語**。`data/nq-labels.json` は「建設・工務店」「小売・EC」「製造・インフラ」、サイトの表示は
   「建築・工務店」「小売 / EC」「インフラ・製造」。カードの表示はサイト側の語に合わせた。どちらかに統一するなら
   sg-solution / sg-works の by_industry の文言も直す。
9. **期限つきの文言**。sg-kanri-dantai / schedule の「2026年12月末までの着手が目安です。」は、2027年1月以降は事実と合わなくなる。
   LP（`lp/service/kanri-dantai/index.html:303`）を書き換える日に、この variant も同時に直すか、`approved_by` を空に戻して止める。
   施行日（2027年4月1日）を過ぎたら default の「制度が変わる前に」も見直す。
10. **`/guidebook` の営業資料 PDF の料金**。サイトの Web制作は 30 / 60 / 120万円〜（税別）だが、配布中の PDF は別の金額
   （25 / 70 / 150万円）のまま。リポジトリでは直せないので、差し替えはオーナーへの依頼事項（料金表記の統一の作業で `docs/pricing/` に置く依頼リスト）。
   それまでのつなぎとして `/guidebook` に「最新の料金は料金プランのページで…」の1行が入っている（`info-pages.jsx:673`）。
   sg-guidebook と ct-guidebook は金額を書いていないが、「料金プラン」が載った資料へ送るカードなので、PDF を差し替えてから承認する。
11. **AIチャットボットと保守の、プラン別の月額**。決まっているのは開始価格だけ（AIチャットボットは月額1万円〜、保守は月額2万円〜）。
   カードも開始価格だけを書いている。プラン別の月額が決まったら `NORTIQ_PRICING` とあわせて sg-chatbot / cost と sg-support / cost を見直す。
12. **業種パッケージと「システムの組み方」の関係**。構成例（例:「40〜120万円」）がパッケージ価格に含まれるのか別料金なのかが未確認。
   sg-solution / cost はパッケージ価格だけを書いている。決まったら body の「すべて、または必要なものだけを選んで導入できます。」を見直す。

## 6. 2026-09-20 の再検証で直した文言

下書きを「間違っている前提」で検査し直した結果。数字の誤りは無かった。直したのは語の出どころと約束の強さ。

| # | ブロックと項目 | 直す前 | 直した後 | 理由 |
|---|---|---|---|---|
| 1 | sg-recruit-site / default の body | …料金はライトプランで30万円〜（税別）です。 | …料金プランは、ライトが30万円〜（税別）です。 | 3 章の #21 |
| 2 | sg-cms / scope の body | …WordPressのままでよいかも判断できます。 | …WordPressのままでよいかの目安も載せています。 | 3 章の #20 |
| 3 | sg-support / default の title | 公開後は、毎月4つのことを必ず実施します。 | 公開後は、毎月4つのことを実施します。 | 3 章の #19 |
| 4 | sg-solution の audience | クリニック、不動産、建築、人材、小売のいずれかで、業種に合った提案を見たい人向け | クリニック・医療、不動産、建設・工務店、人材、小売・ECのいずれかの事業者で、自社の業種に合った提案を見たい人向け | 3 章の #18 |

検査の中身（どれも `data/blocks.json` と、この表と、リンク先のソースだけを読む）:

1. 23 ブロックの有無、ID 接頭辞と kind、variant 名、`by_industry` のキーと industry ラベルの一致、`approved_by` / `approved_at` が空であること。
2. 字数（`[...str].length`）。上限ちょうどが最大で、超過は 0。
3. audience の否定形（でない／ではない／じゃない／以外）と、1文で「人向け」で終わっていること。
4. この表の全行について、「文言で使った表現」が該当 variant の文言に在ること、「原文」の断片が出典の行に在ること。
5. 文言に含まれる数字つきの語（価格・期間・件数）が、すべてこの表のどれかの行に載っていること。
6. 11章の禁止表現の正規表現（4 章）。

## 7. 2026-09-21 の料金表記の統一で直した文言

リンク先の金額・期間が `NORTIQ_PRICING`（`content-data.jsx:43-145`）から描画される形になり、表記が変わった。数字そのものは変わっていない
（Web制作 30 / 60 / 120万円〜、AIチャットボット 10 / 25 / 50万円〜、DX 50万円〜 / 200万円〜 / 月額10万円〜、業種パッケージ5本、LP 2本）。
新しく出た数字は、AIチャットボットの月額1万円〜と保守の月額2万円〜の2つ。

| # | ブロックと項目 | 直す前 | 直した後 | 理由 |
|---|---|---|---|---|
| 1 | sg-web / default の body | …料金は30万円〜。 | …料金は30万円〜（税別）。 | 全サービス税別と明記する決定。`/web` のバッジも「30万円〜（税別）」になった |
| 2 | sg-web / cost の body | 30万円〜・60万円〜・120万円〜の目安レンジです。実際の費用は… | 30万円〜・60万円〜・120万円〜（税別）。目安の金額で、実際の費用は… | `/web` の料金表の lede が「表示価格はすべて税別です。目安の金額で、…」に変わった。title は字数の都合で税別を body に持たせた |
| 3 | sg-chatbot / default の body | …自動化。10万円〜。 | …自動化。初期費用10万円〜（税別）。 | 10 / 25 / 50万円〜 は初期（構築）費用と決まった。`/chatbot` のバッジと同じ言い方 |
| 4 | sg-chatbot / cost | title「AIチャットボットは10万円〜。」 | title「AIチャットボットは初期費用10万円〜、月額1万円〜。」、body の先頭に「表示価格はすべて税別です。」 | 初期費用と月額を分けて書く。月額はサービス全体の開始価格（プラン別は未定）。body の「月次契約で、解約は1ヶ月前通知」は FAQ の新しい文とも合う |
| 5 | sg-dx / cost | title「…初回ヒアリングは無料。」、body「…継続運用は10万円/月〜が目安。」 | title「…初回相談は無料。」、body「…継続運用は月額10万円〜が目安（税別）。」 | `/dx` は「初回相談は無料」に統一。「万円/月〜」は廃止で、カードは「月額（税別）」のラベル＋「10万円〜」 |
| 6 | sg-dx / scope | title「初回ヒアリング（無料）で整理できます。」、body「現状のデータ、業務、目標を60分で整理。課題の言語化、…特定から始めます。」 | title「初回相談（無料・60分）から始められます。」、body「そのあと1〜2週間で、課題の言語化、データの棚卸し、対象業務の特定まで行います。PoCから先は有料です。」 | 旧 body の出典だった CTA 帯の sub は画面に出ない属性で、今回削除された。フェーズ01 が「初回相談（無料・60分）のあと、1〜2週間で…」と、相談の時間と整理の期間を分けたのに合わせた。無料の範囲を取り違えないよう「PoCから先は有料」を足した |
| 7 | sg-solution（5業種）/ cost の title | 60〜180万円＋月額運用3〜8万円。 ほか | 60〜180万円＋月額3〜8万円（税別）。 ほか | ページの書式が「60〜180万円＋月額3〜8万円（税別）」になった（「運用」が取れ、税別が付いた） |
| 8 | sg-solution（5業種）/ schedule の title | …1〜2か月が目安。／…2〜3か月以上が目安。 | …1〜2ヶ月が目安。／…2〜3ヶ月以上が目安。 | 月数の表記を「ヶ月」に統一 |
| 9 | sg-pricing / default の body | Web制作30万円〜、AIチャットボット10万円〜、DX・ML 50万円〜。サービスごとに3つのプランがあります。 | 初期費用はWeb制作30万円〜、AIチャットボット10万円〜、DX・ML50万円〜（税別）。サービスごとに3つのプラン。 | 3つとも `/pricing` のカードのラベルは「初期費用（税別）」。「DX・ML 50万円〜」の半角スペースを取った。60字に収めるため文末を詰めた |
| 10 | sg-pricing / scope の body | 複数プランを段階導入する形での見積も可能です。制作のみの… | 段階契約でのご依頼も、制作のみのご依頼も承ります。 | 旧文の出典だった CTA 帯の sub は画面に出ない属性で、今回削除された。画面に出ているバッジ「段階契約OK」に寄せた |
| 11 | sg-support / cost | eyebrow「追加費用が気になる方へ」、title「契約期間中、追加費用なく対応する範囲。」 | eyebrow「費用が気になる方へ」、title「保守プランは月額2万円〜（税別）。」 | `/support` と `/pricing` に保守の開始価格が出た。費用が不安な人への答えは金額を先に出す。body（件数）はそのまま |
| 12 | rs-cost / default の answer | Web制作は30万円〜。目安レンジを… | Web制作は30万円〜（税別）。目安レンジを… | #1 と同じ |

変えなかったもの: sg-recruit-site と sg-kanri-dantai（もとから税別つき。LP の料金表は変わっていない）、sg-web / schedule・scope と rs-schedule
（期間と「30〜60分のオンラインMTG」は同じ値。出典がデータ参照に変わっただけ）、sg-dx / schedule。

`data/catalog-pages.json` の summary（画面には出ない。Jev に渡す要約）も同じ日に合わせた: `/web`「30万円〜（税別）の3プラン」、
`/chatbot`「初期費用10万円〜、月額1万円〜（税別）」、`/dx`「初回相談は無料、PoCは50万円〜（税別）」、`/support`「保守プランは月額2万円〜（税別）」、
`/pricing`「初期費用は…。保守は月額2万円〜（税別）」、`/solution-*` 5本「◯〜◯万円＋月額◯〜◯万円（税別）」、LP 2本に（税別）。どれも60字以内。

このときの検査（6 章の 1〜6 と同じもの。加えて）:

7. 「表示結果」の行について、描画する行にそのコードが在ること、データの行にその値が在ること、表示結果の金額・期間がすべて
   `NORTIQ_PRICING` とヘルパーから作った文字列（`30万円〜` `月額2万円〜` `4〜6週間` `60〜180万円` `月額3〜8万円` など）に一致すること。
8. blocks.json と catalog-pages.json に、廃止した表記（`か月`、数字と「万円」の間の空白、`万円から`、`万円台`、`万円/月`、`月額運用`）が無いこと。

## 8. 2026-09-21 の評価（フェーズ0 検証）で絞った audience

評価セット60件を Jev に通した1回目で、audience が広いカードに的外れな関連度が多く付いた（sg-lpo は関連度 0.35 以上の 28回のうち 26回が外れ）。
そこで8件の audience を「どういう状況の事業者が、何を知りたいのか」まで書く形に絞り、通し直した。数字と経緯は `docs/nq/eval-2026-09-21.md` の「2回目」。
**audience は画面に出ない。** Jev への質問文「この訪問者は次の説明に当てはまる：{audience}」にそのまま入る。数字も固有の表現も含まないので、2 章の出典表に行は無い。
同じ文を、リンク先ページの `data/catalog-pages.json` の audience にも入れてある（2つのファイルは手で揃える。`build.js` は一致を検査しない）。

| # | ブロック（リンク先） | 直す前 | 直した後 | リンク先の中身との対応 |
|---|---|---|---|---|
| 1 | sg-lpo（`/feature-lpo`） | 広告や検索からの問い合わせを増やすLPを作りたい、改善したい人向け | Web広告を出している、または自社のLP（ランディングページ）を運用している事業者で、広告の費用対効果やLPからの問い合わせ率を上げたい人向け | lede「コンバージョン特化の LP 制作と、継続的な改善 (LPO) …広告連動・ヒートマップ解析・A/Bテスト」、バッジ「リスティング連動」（`detail-pages.jsx:673-674`） |
| 2 | sg-dx（`/dx`） | 業務の自動化、データ活用、業務システム開発を検討している人向け | 自社の社内業務を効率化したい事業者で、業務システムの開発、定型業務の自動化、機械学習の導入を外部に依頼する進め方を調べている人向け | lede「ML 実装 / 業務自動化 / データ分析基盤 / 生成 AI 業務組み込み」（`service-pages.jsx:563`）、「定型業務を自動化」（`:617`） |
| 3 | sg-chatbot（`/chatbot`） | AIを使ってブログ記事の作成と更新を省力化したい、またはサイトへのAIチャットボット導入を検討している人向け | 自社サイトを運営している事業者で、ブログ記事の作成と投稿をAIで省力化したい、または自社サイトに問い合わせ対応のAIチャットボットを置きたい人向け | 3 章の #7 と同じ（主訴求は AI によるブログ投稿ツール、「FAQ チャットボット組み込み」は STANDARD の1項目＝`content-data.jsx:77`） |
| 4 | sg-pricing（`/pricing`） | 依頼した場合の費用の目安を知りたい人向け | 制作や開発の外注を検討している、または費用の相場を調べている事業者で、依頼した場合の料金の目安を知りたい人向け | 料金プランのページ。サービス名は列挙していない（列挙すると、載っていないサービスを見ている訪問者の関連度が落ちた） |
| 5 | sg-works（`/works`） | 依頼前に、自分と近い業種の制作実績を確認したい人向け | 制作や開発の依頼を検討している事業者で、依頼先の制作実績と成果を、自社に近い業種の事例で確かめたい人向け | 業種別に絞り込める制作実績の一覧。`by_industry` で業種別の実績ページへ送る |
| 6 | sg-web（`/web`） | 会社のサイトを新しく作る、または作り直すことを検討している人向け | 自社のホームページの新規制作またはリニューアルを、外部に依頼することを検討している人向け | Web制作のサービスページ。「ホームページ」と書いたことで、採用サイト目当ての訪問者（sg-recruit-site の対象）との重なりが消えた |
| 7 | sg-subsidy（`/subsidy`） | 補助金を使ってサイト制作やDX投資を進めたい人向け | 事業者で、サイト制作やシステム導入に補助金が使えるかを確かめたい人向け | 3 章の #12 と同じ。ページは「対象になるかの確認」の内容で、カードの文言も「使えるか確認する」調 |
| 8 | sg-recruit-site（`/service/recruit-site`） | 建設・運送・介護の事業者で、求人への応募を増やしたい人向け | 建設・運送・介護の事業者で、自社の求人への応募を増やす採用サイトを作りたい人向け | LP は採用サイト制作。「採用サイトを作りたい」まで書いて、求人の話題に触れただけの訪問者と分けた |

触っていないのは sg-solution、sg-kanri-dantai、sg-recruit、sg-support、sg-cms、sg-guidebook と、rs-* / ct-* / rl-related。
sg-support は3案、sg-cms は1案を試したが、評価の数字が良くならなかったので元の文に戻してある。

承認のとき見てほしい点:

1. **sg-dx の「業務システムの開発」という語は、`/dx` のページには無い。** 直す前の audience にも、ニーズのラベル「業務システム・DX」にも在る語で、今回足したものではない。
   ページの語は「ML 実装 / 業務自動化 / データ分析基盤 / 生成 AI 業務組み込み」。業務システムの受託開発を `/dx` の対象として案内してよいかを確かめる。
2. **sg-chatbot の「問い合わせ対応のAIチャットボット」**は、ページの「FAQ チャットボット組み込み」を言い換えたもの。問い合わせ対応と呼んでよいかを確かめる。
3. sg-web は「外部に依頼することを検討している」まで書いた。読んでいるだけの段階の訪問者には関連度が低めに出る（そのぶん、事業者でない訪問者への的外れが減る）。

このときの検査:

1. `git diff` で、`data/blocks.json` と `data/catalog-pages.json` の差分が audience の8行ずつだけであること（画面に出る文言、`approved_by` / `approved_at`、リンク先は変わっていない）。
2. 6 章の検査 3（否定形が無いこと、1文で「人向け」で終わること）。
3. リンク先を持つ sg-* のカードについて、blocks.json の audience と、リンク先ページの catalog-pages.json の audience が同じ文であること
   （もともと別の文だった `/guidebook` と sg-guidebook を除く。sg-guidebook は `selectable: false` で Jev に聞かない）。
4. `node build.js` のデータ検査が不備 0 件で、配信ブロックが 0/23 のままであること。`node --test "api/_lib/*.test.js"` が 181件すべて通ること。

## 9. 2026-09-22 承認

オーナー決定 (a) により、**全23ブロックをブロック単位で承認**した（`approved_by: "oshima"` / `approved_at: "2026-09-22"`。variant 単位・業種版はブロック単位の承認を引き継ぐ）。
配信できる文言は68件（業種版を含む）すべて。承認の直前に `npm run pricing:check`（料金・期間・税の食い違い 0）と `node --test` を通した。

承認したが見直しが残る点（`open-decisions.md` の該当項目）:
- `rs-ai-quality` のリンク先が /chatbot（B3）。`rs-scope` / `ct-diagnostic` のリンク先 /diagnostic の中身（B4・B5）
- `sg-kanri-dantai` の schedule「2026年12月末までの着手が目安です。」は **2027年1月以降は事実と合わない**（B6）。それまでに直すか、この variant（schedule）を blocks.json から消す
- `sg-solution` の cost の「目安」（B8）、`sg-chatbot` の audience（B10）、業種の語の表記ゆれ（B7）

**取り消し方**: 止めたいブロックの `approved_by` を `""` に戻して push（variant だけ止めるなら、その variant に `"approved_by": ""` を足しても止まらない。ブロック単位の承認を引き継ぐため、止めたい variant を消すか、ブロックごと止める）。
全部止めるなら `data/nq-config.json` の `enabled` を false（README 10章）。
