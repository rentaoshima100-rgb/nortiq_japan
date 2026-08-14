// Generate the page-by-page review HTML with embedded screenshots.
import fs from 'fs';
import path from 'path';

const EMBED = new URL('./review-shots/embed/', import.meta.url).pathname;
const OUT = '/tmp/claude-0/-home-user/b17276e5-8f7f-5bd4-bb00-f323640e2248/scratchpad/nortiq-page-review.html';

const uri = (name) => {
  const b = fs.readFileSync(path.join(EMBED, name + '.webp'));
  return `data:image/webp;base64,${b.toString('base64')}`;
};

const PAGES = [
  {
    id: 'top', url: '/', title: 'トップ', h: '16,378px',
    good: ['実数(20社+/24h SLA/価格)を前面に出す構成は説得力があり、セクションの流れ(実績→理由→Inside→機能→声→フォーム)も営業導線として良くできている', 'ベントーグリッド・導入実績カード・フッターの骨格は既に水準が高い'],
    bad: ['ヒーロー背景の作品壁が不透明のまま文字と重なり、見出しの可読性と高級感を両方削っている', '楕円アウトラインの「メダル」3連が古い印象。マーキー帯(赤)+業種チップ帯の2連続も騒がしい', '「最新コラム」のサムネイルが白い定型画像で、画像が壊れているように見える', '資料請求フォームのチェックボックスタイルが幅不足で「Web制/作」のように縦に割れ、押しにくい', 'タグクラウド(重み付き文字雲)は2010年代の語彙で、精密さの印象を下げる'],
    fix: ['作品壁に perspective + 白へのグラデーションベールを掛け「奥に流れる壁」へ(提案書デモ1)', 'メダル→罫線+数字カウントアップのKPIタイルに置換', 'フォームのカテゴリー選択は横並びのピル型トグルに変更', 'タグクラウドは廃止し、キーワードチップ行に統合'],
  },
  {
    id: 'web', url: '/web', title: 'Web制作', h: '8,551px',
    good: ['「ただ作るだけのサイトは、もう作りません。」のコピーと痛点→強み→工程→料金→FAQの構成が強い', '料金3プランの整理と推奨バッジは分かりやすい'],
    bad: ['工程図がピンク・黄・緑・紫のカラフルな配色で、赤×墨のブランドから浮いている(別サイトの図に見える)', '「ありませ/ん。」など見出しがワード途中で改行される', '告知ピルが「作っただけのサイトで〜」の見出しに重なる(全ページ共通バグ)'],
    fix: ['工程図を赤/墨2色のSVGステップUIに作り直し、スクロールで1工程ずつ点灯させる', '見出しに word-break: keep-all + 手動改行(<wbr>)を導入'],
  },
  {
    id: 'chatbot', url: '/chatbot', title: 'AIチャットボット', h: '8,001px',
    good: ['デスクトップ+モバイル実UIのモックを見せているのは説得力がある', '「6.2× / −87% / 1.8× / 14位」の数字セクションが明快'],
    bad: ['UIモックが静止画のため、対話型プロダクトの良さが伝わりきらない', '導入事例の写真がストックフォト(医師)で、実績の実在感を弱める'],
    fix: ['モックにタイピング→記事生成のループアニメーション(CSSのみで可)を追加', '事例写真は実クライアントのサイトスクショ or イニシャルアバターに置換'],
  },
  {
    id: 'dx', url: '/dx', title: 'DX・ML', h: '6,917px',
    good: ['「技術領域、明示します。」の6分類+技術チップは差別化として効いている', 'チーム実写・段階投資・GO/NO-GO の透明性が良い'],
    bad: ['「初期投資ゼロ」比較表の打ち消し線(取り消し文字)が小さく読みにくい', '告知ピルが本文に重なる'],
    fix: ['比較は「従来 vs Nortiq」の2カラムカードにして Before に薄墨、After に赤を割り当てる'],
  },
  {
    id: 'works', url: '/works', title: '制作実績一覧', h: '5,378px',
    good: ['業種フィルタチップ+成果バッジ(問い合わせ2.4×等)付きカードは情報設計として優秀'],
    bad: ['実サイトのスクリーンショットと人物ストックフォトが混在し、「実績」の信頼性を下げる', '告知ピルがカード1列目に重なる'],
    fix: ['全カードをブラウザフレーム付きの実スクショに統一', 'hover時にスクショが枠内で下にスクロールするプレビュー+3Dチルト(提案書デモ2)を適用'],
  },
  {
    id: 'voice', url: '/voice', title: 'ご利用会社様の声', h: '3,720px',
    good: ['赤カードと白カードの交互リズムで単調さを回避している', '具体的な数字入りの引用が多い'],
    bad: ['ページ末尾に黒帯→赤帯が連続し、色圧が強すぎる', '引用符の透かしが薄く装飾として機能していない'],
    fix: ['赤カードは各段1枚までに抑え、残りは白+赤罫線に', 'Google クチコミの実埋め込み(または件数+星の実データ)で三者性を足す'],
  },
  {
    id: 'support', url: '/support', title: '運用サポート', h: '3,776px',
    good: ['「毎月、4つのことを必ず実施します。」の約束型の見せ方が良い'],
    bad: ['「範/囲。」の見出し改行', '白カードの羅列で他ページとの差が出ていない'],
    fix: ['月次レポートの実物モック(GA4ダッシュボード風)を1枚見せて具体性を出す'],
  },
  {
    id: 'pricing', url: '/pricing', title: '料金プラン', h: '4,368px',
    good: ['3サービス×3プランの一貫構造と推奨バッジ。目安を全公開する姿勢も信頼につながる'],
    bad: ['同型カードが9枚並び単調。サービス間の違いが視覚化されていない', '告知ピルがセクション見出しに重なる'],
    fix: ['サービス切替タブ+プラン比較表(行hoverハイライト)の2段構成にし、カードは各サービス3枚に留める'],
  },
  {
    id: 'column', url: '/column', title: 'コラム一覧', h: '9,487px',
    good: ['記事本数(52本)と更新頻度は資産。後半のダークネイビー3Dイラストのサムネはトーンが揃っていて良い'],
    bad: ['最重要: 先頭2スクロール分の記事サムネイルが白い定型画像(Nortiq Labs COLUMN)で、画像切れ・未完成に見える。一覧の第一印象を大きく損ねている', 'カテゴリチップ行に告知ピルが重なる'],
    fix: ['カテゴリ色×タイトル組版のデザイン済みカバーをビルド時に自動生成(sharp導入済みなので追加依存なし)、またはネイビー3Dイラスト路線に統一', '先頭に「特集」ヒーロー記事枠を作り、一覧の単調さを断つ'],
  },
  {
    id: 'company', url: '/company', title: '会社概要', h: '5,404px',
    good: ['沿革タイムラインと基本情報テーブルが整理されている'],
    bad: ['「沿革」の見出しが告知ピルにほぼ完全に隠れる(このページが被害最大)', 'タイムラインが左寄せ単色で寂しい'],
    fix: ['ピル問題の修正(全ページ共通)', '京都オフィスの写真か地図、および「2025創業→現在」の数字ハイライトを追加'],
  },
  {
    id: 'staff', url: '/staff', title: 'チーム・スタッフ', h: '3,233px',
    good: ['実写+役割+技術タグのカードは信頼性が高い。平安神宮前の和装写真はブランドの個性になっている'],
    bad: ['ヒーロー下のタグチップ行が途中で切れて表示されるクリッピングバグがある', '3名でグリッドが空く'],
    fix: ['チップ行の overflow 修正', '各メンバーに「担当領域」ミニマップ(Web/AI/DXのどこを見るか)を追加し、カード下段を揃える'],
  },
  {
    id: 'subsidy', url: '/subsidy', title: '補助金相談', h: '3,104px',
    good: ['枠ごとの相場カードと「申請サポートは登録準備中」という正直な注記は好印象'],
    bad: ['一般情報のみでページ固有の価値が薄い'],
    fix: ['「対象になるか3問で判定」ミニチェッカーと年間スケジュール図を追加して滞在価値を作る'],
  },
  {
    id: 'guidebook', url: '/guidebook', title: 'サービス紹介資料', h: '3,143px',
    good: ['資料の目次を先に見せる構成は誠実で良い'],
    bad: ['PDFビューアのページサムネイルが真っ白で、資料が壊れているように見える', '告知ピルがビューアのヘッダに重なる'],
    fix: ['表紙・主要ページのサムネイルをビルド時に画像化して敷く(render-pdf.mjs の流用で可)'],
  },
  {
    id: 'diagnostic', url: '/diagnostic', title: '無料診断LP', h: '8,627px',
    good: ['URL入力→60秒診断の導線が明快。5観点の診断項目開示も良い'],
    bad: ['アイコンが絵文字(🔧📝🔗)で、精密さを一気に損ねる', 'ブランド表記が「NORTIQLAB」で他ページ(Nortiq Labs)と揺れている', '「見え/る。」の改行、社証3件が姓のみで信憑性が弱い'],
    fix: ['絵文字→赤/墨のラインSVGアイコンへ全置換', '表記を Nortiq Labs に統一', '診断実行中のプログレス演出(項目が順に点灯)をライブデモとして見せる'],
  },
  {
    id: 'product-wpchat', url: '/product-wpchat', title: 'ブログボット(製品)', h: '16,652px',
    good: ['8ステップ・6設計原則・デザインシステムまで開示する構成は他社にない独自性で、このサイトで最も「読ませる」ページ'],
    bad: ['紫(AI Purple)アクセントがサイトの赤と衝突し、別サイトに見える', '埋め込まれた設計提案書の画像に「Loop株式会社」の表記が残っており、ブランドが混乱する(意図した仮名なら注記が必要)', '16,000px超と長大で現在地が分からなくなる'],
    fix: ['紫は「製品サブブランド」として明示するか、赤系グラデに寄せる', 'Loop表記を差し替え or「サンプル案件」の注記を付す', '左側に目次スクロールスパイを追加'],
  },
  {
    id: 'product-vetonet', url: '/product-vetonet', title: 'VetoNet(研究)', h: '4,958px',
    good: ['ダークUIスクショと研究フェーズの開示が「研究開発をやっている会社」の証明になっている'],
    bad: ['スクショが小さく静的で、動いている感が無い', 'β感・先端感の演出が足りない'],
    fix: ['ターミナル風のライブ検証ログ演出(行が流れて PASS/VETO が点く)をCSS/JSで追加 — 提案書の粒子デモと同系のダーク演出が最も合うページ'],
  },
  {
    id: 'recruit', url: '/recruit', title: '採用情報', h: '4,814px',
    good: ['バリュー6枚と求人テーブル(レベル・勤務地明記)の整理は良い'],
    bad: ['告知ピルが「私たちが大事にしていること」の見出しに重なる', 'バリューカードが文字のみで、働く場の画が無い'],
    fix: ['チーム写真・京都の写真帯を1枚挟む', '求人行に hover ハイライト+矢印スライドを追加'],
  },
  {
    id: 'article', url: '/article-*(記事)', title: 'コラム記事', h: '16,351px',
    good: ['本文の組版(リード・表・箇条書き)は読みやすく、内容の密度も高い'],
    bad: ['ヒーロー画像が白い定型カバーで、記事冒頭の印象が弱い', '長文なのに目次が無い', '告知ピルがヒーロー画像に重なる'],
    fix: ['自動生成カバー(コラム一覧と共通)', '見出しから自動目次+読了プログレスバー', '関連記事のカード化(現状の白カバー問題も同時に解決)'],
  },
];

const sev = (t, cls) => `<span class="sev ${cls}">${t}</span>`;

const pageSection = (p) => `
<section class="page" id="pg-${p.id}">
  <header class="pg-head">
    <h3>${p.title}</h3>
    <span class="mono url">${p.url}</span>
    <span class="mono ph">全高 ${p.h}</span>
  </header>
  <div class="pg-body">
    <figure class="shot"><div class="shot-scroll"><img src="${uri(p.id)}" alt="${p.title}ページの全景スクリーンショット" loading="lazy"></div><figcaption>ページ全景(スクロールで下まで確認できます)</figcaption></figure>
    <div class="notes">
      <div class="note good"><h4>良い点</h4><ul>${p.good.map((x) => `<li>${x}</li>`).join('')}</ul></div>
      <div class="note bad"><h4>課題</h4><ul>${p.bad.map((x) => `<li>${x}</li>`).join('')}</ul></div>
      <div class="note fix"><h4>改善提案</h4><ul>${p.fix.map((x) => `<li>${x}</li>`).join('')}</ul></div>
    </div>
  </div>
</section>`;

const html = `<title>Nortiq 全ページUXレビュー</title>
<style>
  :root {
    --paper:#FFFFFF; --mist:#F6F6F7; --ink:#101014; --ink2:#3A3A40; --ink3:#8A8A92;
    --line:#E3E3E6; --red:#E60012; --red-deep:#B3000E; --red-soft:#FCE8EA;
    --good:#1F8A5B; --good-soft:#E7F3EE; --warn:#B3000E; --warn-soft:#FCE8EA; --fix:#2A6FDB; --fix-soft:#E9F1FC;
    --card:#FFFFFF;
    --shadow:0 1px 2px rgba(16,16,20,.05),0 4px 16px rgba(16,16,20,.06);
    --font-jp:"Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic Medium","Meiryo",sans-serif;
    --font-latin:"Avenir Next","Century Gothic","Helvetica Neue",Arial,sans-serif;
    --font-mono:"SF Mono","JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --paper:#0E0E11; --mist:#15151A; --ink:#F0F0F2; --ink2:#C9C9CF; --ink3:#7E7E88;
    --line:#26262C; --red:#FF3B4A; --red-deep:#E60012; --red-soft:#33141A;
    --good:#3FBF87; --good-soft:#12281E; --warn:#FF3B4A; --warn-soft:#33141A; --fix:#5C9DFF; --fix-soft:#14213A;
    --card:#17171B; --shadow:0 1px 2px rgba(0,0,0,.4),0 4px 16px rgba(0,0,0,.35);
  } }
  :root[data-theme="dark"] {
    --paper:#0E0E11; --mist:#15151A; --ink:#F0F0F2; --ink2:#C9C9CF; --ink3:#7E7E88;
    --line:#26262C; --red:#FF3B4A; --red-deep:#E60012; --red-soft:#33141A;
    --good:#3FBF87; --good-soft:#12281E; --warn:#FF3B4A; --warn-soft:#33141A; --fix:#5C9DFF; --fix-soft:#14213A;
    --card:#17171B; --shadow:0 1px 2px rgba(0,0,0,.4),0 4px 16px rgba(0,0,0,.35);
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink2); font-family:var(--font-jp);
    font-feature-settings:"palt" 1; -webkit-font-smoothing:antialiased; font-size:14.5px; line-height:1.9; letter-spacing:.02em; }
  .wrap { max-width:1100px; margin:0 auto; padding:0 24px; }
  h1,h2,h3 { color:var(--ink); margin:0; text-wrap:balance; }
  h1 { font-size:clamp(30px,4.6vw,46px); line-height:1.3; letter-spacing:-.015em; }
  h2 { font-size:clamp(21px,2.8vw,28px); letter-spacing:-.01em; }
  p { max-width:70ch; }
  .mono { font-family:var(--font-mono); font-size:.86em; }
  .eyebrow { font-family:var(--font-latin); font-size:11px; letter-spacing:.24em; text-transform:uppercase; color:var(--red); font-weight:600; margin:0 0 12px; }
  :focus-visible { outline:2px solid var(--red); outline-offset:3px; }

  header.top { padding:64px 0 40px; border-bottom:1px solid var(--line); }
  header.top .meta { display:flex; flex-wrap:wrap; gap:6px 20px; margin-top:20px; font-family:var(--font-mono); font-size:12px; color:var(--ink3); }

  .summary { padding:44px 0 12px; }
  .findings { display:grid; gap:12px; margin:24px 0 8px; }
  .finding { display:grid; grid-template-columns:auto 1fr; gap:14px; border:1px solid var(--line); border-radius:10px; padding:14px 18px; background:var(--card); box-shadow:var(--shadow); align-items:start; }
  .finding .rank { font-family:var(--font-latin); font-weight:700; color:var(--red); font-size:13px; padding-top:2px; white-space:nowrap; }
  .finding h4 { margin:0 0 2px; font-size:14.5px; color:var(--ink); }
  .finding p { margin:0; font-size:13px; color:var(--ink3); }
  .sev { display:inline-block; font-size:10.5px; font-weight:700; letter-spacing:.06em; padding:1px 9px; border-radius:16px; margin-left:8px; vertical-align:2px; }
  .sev.bug { background:var(--warn-soft); color:var(--warn); }
  .sev.qual { background:var(--fix-soft); color:var(--fix); }

  .toc { display:flex; flex-wrap:wrap; gap:8px; padding:20px 0 36px; }
  .toc a { font-size:12.5px; padding:6px 14px; border:1px solid var(--line); border-radius:20px; text-decoration:none; color:var(--ink2); background:var(--card); }
  .toc a:hover { border-color:var(--red); color:var(--red); }

  .page { padding:40px 0; border-top:1px solid var(--line); }
  .pg-head { display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
  .pg-head h3 { font-size:20px; }
  .pg-head .url { color:var(--red); }
  .pg-head .ph { color:var(--ink3); font-size:11px; }
  .pg-body { display:grid; grid-template-columns:300px 1fr; gap:24px; align-items:start; }
  @media (max-width:760px) { .pg-body { grid-template-columns:1fr; } }
  .shot { margin:0; }
  .shot-scroll { border:1px solid var(--line); border-radius:10px; overflow-y:auto; max-height:430px; background:var(--mist); box-shadow:var(--shadow); }
  .shot-scroll img { width:100%; display:block; }
  .shot figcaption { font-size:11px; color:var(--ink3); margin-top:8px; }
  .notes { display:flex; flex-direction:column; gap:12px; }
  .note { border:1px solid var(--line); border-left-width:3px; border-radius:8px; padding:12px 18px; background:var(--card); }
  .note h4 { margin:0 0 4px; font-size:12px; letter-spacing:.08em; }
  .note ul { margin:0; padding-left:1.3em; font-size:13px; }
  .note li { margin:4px 0; }
  .note.good { border-left-color:var(--good); } .note.good h4 { color:var(--good); }
  .note.bad { border-left-color:var(--warn); } .note.bad h4 { color:var(--warn); }
  .note.fix { border-left-color:var(--fix); } .note.fix h4 { color:var(--fix); }
  footer { padding:40px 0 64px; border-top:1px solid var(--line); font-size:12px; color:var(--ink3); }
</style>

<header class="top">
  <div class="wrap">
    <p class="eyebrow">Nortiq Labs · Page-by-Page Review · 2026.08</p>
    <h1>nortiqlab.com 全18ページ<br>デザイン・UXレビュー</h1>
    <p style="margin-top:18px">リポジトリをローカルビルドし、Chromium で全ページを実際に開いて撮影・確認した結果です。各ページのスクリーンショット(全景・スクロール可)と、良い点 / 課題 / 改善提案をまとめています。姉妹ドキュメント「デザイン刷新案」に、ここで提案する演出の動くデモがあります。</p>
    <div class="meta"><span>対象: 18ページ</span><span>撮影幅: 1360px</span><span>ビルド: dist (本番同等)</span></div>
  </div>
</header>

<section class="summary">
  <div class="wrap">
    <p class="eyebrow">Cross-cutting Findings</p>
    <h2>全ページ横断の指摘(優先度順)</h2>
    <div class="findings">
      <div class="finding"><span class="rank">F1</span><div><h4>告知ピルがコンテンツに重なる ${sev('バグ', 'bug')}</h4><p>「初回相談無料・営業日24h以内にご返信」の黒いフローティングピルが、全ページでセクション見出し・カード・CTAに重なる。会社概要では「沿革」の見出しがほぼ完全に隠れる。ヒーロー直下の帯に組み込むか、下端固定のトースト(閉じたら再表示しない)へ変更を推奨。</p></div></div>
      <div class="finding"><span class="rank">F2</span><div><h4>コラムの白い定型サムネイル ${sev('品質(最重要)', 'qual')}</h4><p>コラム一覧の先頭約20記事・トップの最新コラム・記事ヒーローが白い「Nortiq Labs COLUMN」画像で、画像が壊れて見える。カテゴリ色×タイトル組版のカバーをビルド時に自動生成するか、後半記事で使っているダークネイビーの3Dイラスト路線に統一する。</p></div></div>
      <div class="finding"><span class="rank">F3</span><div><h4>見出しの中途改行 ${sev('品質', 'qual')}</h4><p>「ありませ/ん。」「範/囲。」「見え/る。」など、語の途中で折り返される見出しが複数ページにある。word-break: keep-all と手動改行ポイントの整備で解消する。</p></div></div>
      <div class="finding"><span class="rank">F4</span><div><h4>実績・事例へのストックフォト混在 ${sev('品質', 'qual')}</h4><p>制作実績カードや事例・声のアバターに汎用ストック写真が混在し、「実在する実績」の説得力を下げている。実サイトのスクリーンショット(ブラウザフレーム付き)とイニシャルアバターに統一する。</p></div></div>
      <div class="finding"><span class="rank">F5</span><div><h4>ブランド表記・装飾語彙の揺れ ${sev('品質', 'qual')}</h4><p>NORTIQ LABS / Nortiq Labs / NORTIQLAB(診断LP)の表記揺れ。Web制作の工程図(ピンク・黄・緑・紫)、診断LPの絵文字アイコン、製品ページの紫アクセントなど、赤×墨のブランドから外れた語彙が点在。製品ページに他社名(Loop株式会社)が見える埋め込み画像もあり要差し替え。</p></div></div>
      <div class="finding"><span class="rank">F6</span><div><h4>全ページ同型のヒーローとCTA帯 ${sev('磨き', 'qual')}</h4><p>眉ラベル+大見出し+チップ+同じ2ボタン(「デモを見る」の対象が曖昧なページあり)+同じ赤ストライプCTA帯が全ページで繰り返され、ページ固有の見せ場がない。ページの内容に応じたヒーロー演出(製品=UIアニメ、研究=ダーク+粒子、実績=作品壁)への分化を推奨。</p></div></div>
      <div class="finding"><span class="rank">F7</span><div><h4>平面的な質感とモーションの解像度 ${sev('磨き', 'qual')}</h4><p>影が弱く全要素が同じ奥行きにあり、fadein も全要素一律。2層シャドウのトークン化・統一イージング・スクロール連動の描画(数字・バー)・3Dチルトで「精密で豪華」に引き上げる。具体案と動くデモは姉妹ドキュメント「デザイン刷新案」参照。</p></div></div>
    </div>
  </div>
</section>

<div class="wrap">
  <p class="eyebrow" style="margin-top:28px">Pages</p>
  <nav class="toc">${PAGES.map((p) => `<a href="#pg-${p.id}">${p.title}</a>`).join('')}</nav>
</div>

<main class="wrap">
${PAGES.map(pageSection).join('\n')}
</main>

<footer><div class="wrap">撮影: ローカルビルド(dist) を Chromium 1360px で全ページ巡回・全景キャプチャ。スクリーンショットは表示用に圧縮しています。 — Nortiq Labs Page-by-Page Review, 2026.08</div></footer>
`;

fs.writeFileSync(OUT, html);
console.log('written', OUT, (fs.statSync(OUT).size / 1024 / 1024).toFixed(2) + 'MB');
