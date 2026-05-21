# Core Web Vitalsの「Good」評価を現実的に取得する — 2025-2026年版・実践ガイド

## TL;DR

- 2026年5月時点でCore Web Vitalsは **LCP ≤ 2.5秒 / INP ≤ 200ms / CLS ≤ 0.1** の3指標で、いずれもCrUX（実ユーザーデータ）の **75パーセンタイル** で判定される。FIDは2024年3月12日にINPへ正式に置き換えられ、その後Chromeツール群から完全に削除済みである。
- HTTP Archive の Web Almanac 2025 によれば、3指標すべてを満たすのはモバイルで48%、デスクトップで56%にとどまる。Lighthouseで100点でもフィールドで「Good」が取れないのは、ラボが単一の高性能端末・固定ネットワークを前提とするのに対し、CrUXは低スペック端末・低速回線を含む実利用の最遅25%まで救う必要があるためだ。
- 現実解は「測ってから直す」。`web-vitals` v5の attribution build でLCP要素・INP発生箇所を特定し、**LCP → 画像のpreload+`fetchpriority="high"`、INP → 長いタスクの分割、CLS → 寸法予約+`font-display: optional`**、そして全指標に効く **bfcacheの確保** を優先する。

---

## Core Web Vitalsの定義としきい値（2025-2026年時点）

Googleは2020年にCore Web Vitalsを導入したが、2026年5月時点の構成は次の3指標である。Google Search Centralの公式ドキュメントは「LCPはページ読み込み開始から2.5秒以内、INPは200ミリ秒以下、CLSは0.1以下を目指せ」と明記している。

| 指標 | 計測対象 | Good | Needs Improvement | Poor |
|---|---|---|---|---|
| LCP (Largest Contentful Paint) | 体感ロード速度 | ≤ 2.5s | 2.5–4.0s | > 4.0s |
| INP (Interaction to Next Paint) | 操作応答性 | ≤ 200ms | 200–500ms | > 500ms |
| CLS (Cumulative Layout Shift) | 視覚的安定性 | ≤ 0.1 | 0.1–0.25 | > 0.25 |

これらの判定はすべて **75パーセンタイル（p75）** で行われる。「ページの少なくとも75%のセッションが該当しきい値を満たすこと」を意味し、上位50%だけ速くても合格しない。`web.dev` の閾値設計解説には「75パーセンタイルは、サイトを訪れる大多数のユーザーが目標水準を体験することを保証しつつ、外れ値の影響を抑える」とある。

さらに評価は **モバイル / デスクトップで別々に算出** される。Search Consoleの「ウェブに関する主な指標」レポートも、CrUXデータをそのまま参照しモバイルとデスクトップを分けて表示し、片方が「Poor」でももう一方が「Good」なら別評価となる。

### FIDの完全廃止とINPの正式昇格

FID（First Input Delay）は2024年3月12日にINPへ正式に置き換えられた。Chromeチームのブログ（2024年1月31日付）は「INPは3月12日にCore Web Vitalとなり、FIDは廃止される」と告知し、その後2024年9月にChromeツール群（PageSpeed Insights、CrUX API、CrUX BigQuery、`web-vitals.js` v5など）からFIDが完全に除去された。FIDが「最初の入力までの遅延」しか測らなかったのに対し、INPはページ寿命全体のすべてのクリック・タップ・キー入力について **入力遅延 + 処理時間 + プレゼンテーション遅延** を合算し、最遅相当の値を返すため、SPAやインタラクション中心の体験で実態をはるかに正確に表す。

---

## フィールドデータとラボデータ — なぜ乖離するのか

Googleがランキング評価に使うのは **CrUX（Chrome User Experience Report）** のフィールドデータである。CrUXは「Chromeを利用し、使用統計の送信に同意し、Googleアカウントで履歴同期を有効にした」ユーザーから匿名で集約され、過去 **28日間のローリングウィンドウ** でURL単位（データ不足時はオリジン単位）に集計される。Chrome for Developers の CrUX Vis ドキュメント（最終更新2025-05-06 UTC）は「There are over 15 million origins in the dataset」と明記しており、1,500万を超えるオリジンがカバーされている。

これに対し、Lighthouseに代表されるラボデータは **単一の仮想端末・固定スロットリング** で1回の読み込みを測定するに過ぎない。乖離が起きる典型例は次の3つだ。

1. **端末性能の差**：CrUXには低価格Android端末を含む。手元のM2 MacBookで100点でも、ローエンド端末ではJavaScriptパースだけで数秒かかる。
2. **ネットワーク条件**：Lighthouseのモバイル設定は固定スロットリングだが、実ユーザーの25%はそれより遅い回線にいる場合が多い。
3. **インタラクションのライフサイクル**：CLSとINPは「ページの寿命全体」で測られる。ラボツールはロード直後しか観測しないため、スクロール後のレイアウトシフトや後半の重いインタラクションを見逃す。

実務的な結論は明快だ。**ラボは「直すべき場所の診断」、フィールドは「合否判定」**。両方を並行運用するべきである。

---

## LCPを「Good」にする技術手法

`web.dev` の「Optimize LCP」記事は、LCPを4つのサブパートに分解する。最適化されたページの目安配分は **TTFB ~40%、Resource load delay <10%、Resource load duration ~40%、Element render delay <10%** である。逆に言えば「遅延」系が膨らんでいるなら、まずそこを潰すのが最短経路だ。

### 1. LCP要素を特定する

Chrome DevToolsのPerformance Insightsか、`web-vitals/attribution` ビルドで `attribution.element`（要素セレクタ）、`url`（リソースURL）、`timeToFirstByte`、`resourceLoadDelay`、`resourceLoadDuration`、`elementRenderDelay` を取得できる。多くのページでLCPはヒーロー画像か大見出しのテキストだ。

### 2. 画像LCPの最適化

- **モダンフォーマット**：Googleの WebP Compression Study によれば WebP は同等SSIMで JPEG より「25%-34% smaller file sizes」、AVIF はweb.dev の画像パフォーマンスガイドで「greater than 50% savings when compared to JPEG in some cases」と報告されている。
- **適切なサイジング**：`srcset` と `sizes` でデバイスごとに最適解像度を配信。
- **`fetchpriority="high"`**：web.dev の「Optimize resource loading with the Fetch Priority API」記事は、Google Flights での実験について「Fetch Priority improving Largest Contentful Paint from 2.6 s to 1.9 s in a test of Google Flights.」と報告している。`<img fetchpriority="high" src="hero.webp" width="1200" height="600" alt="...">` のようにLCP候補1〜2要素にだけ付与する。
- **`loading="lazy"`をLCP画像に絶対に付けない**：これは確実にLCPを悪化させるアンチパターン。
- **CSS背景画像の場合はpreload必須**：`<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">` をHTML冒頭に配置する。CSS解析後にしか発見できないため、preloadなしでは確実に遅延する。

### 3. TTFBとレンダリングブロック

`web.dev` の TTFB 記事は「0.8秒以下」を good の目安としており、LCP のサブパートとして最大40%を占めるためここの削減が効果的だ。CDN でオリジンに対する物理距離と接続確立コストを削減し、静的部分はエッジで完全キャッシュする。動的部分は **103 Early Hints** や `Server-Timing` でクリティカルリソースの `preconnect` / `preload` を先行ヒントとして送ると効果的。レンダリングブロッキングを減らすには Critical CSS を `<style>` でインライン化し、それ以外は `media="print" onload="this.media='all'"` などで非同期化する。

### 4. フォント最適化

`<link rel="preload" as="font" type="font/woff2" crossorigin>` で重要な書体だけ先読みする。`@font-face` には **`font-display: swap` または `optional`** を必ず指定する。テキストがLCP要素の場合は `swap`、ボディ用には `optional`（100ms以内に届かないと諦めてフォールバックで確定するため、フォント起因のCLSが完全にゼロになる）が推奨される。Web Almanac 2025 によれば `font-display: swap` は50%のページで使われているが、`font-display: optional` を使うサイトは0.5%にとどまり、ここに伸びしろがある。

---

## INPを「Good」にする技術手法

INPは3区間の和である: **入力遅延 + 処理時間 + プレゼンテーション遅延**。web.dev の「Optimize long tasks」は「The main thread can only process one task at a time. Any task that takes longer than 50 milliseconds is a *long task*.」と定義しており、メインスレッドを50ms以上占有するタスクが INP 悪化の主因となる。

### 1. 長いタスクを分割する（yield to main thread）

最も実効性が高いのが、重い同期処理を「中断ポイント」で区切り、ブラウザに描画と入力処理の機会を与えることだ。Chromeチームが推奨する現代的なAPIは **`scheduler.yield()`** で、`setTimeout(fn, 0)` と異なり継続タスクを高優先度キューに戻す（他人のタスクに割り込まれない）。

```javascript
async function processItems(items) {
  for (const [i, item] of items.entries()) {
    doExpensiveWork(item);
    if (i % 50 === 0) {
      // 50件ごとにメインスレッドへ譲る
      await (scheduler.yield?.() ?? new Promise(r => setTimeout(r, 0)));
    }
  }
}
```

Safari等の未対応環境では `setTimeout` フォールバックが必須となる。

### 2. イベントハンドラ内で「描画を先に」

ユーザー操作直後にトラッキング・分析処理を同期で走らせると、それがそのままINPに乗る。可視更新を先にコミットし、副作用は `requestAnimationFrame` + `setTimeout` の組み合わせ、または `requestIdleCallback` で遅延させるのが定石だ。GTMの `dataLayer.push` のような副作用を同期で走らせると、可視更新を完全にブロックする。

### 3. デバウンス・スロットリング

入力系イベント（`input`、`scroll`、`resize`）は連射されるとイベント1件あたりは軽くても累積でメインスレッドを埋める。検索サジェストなどは150〜250msのデバウンスを設定し、`AbortController` で前のfetchを取り消してリクエストの輻輳も防ぐ。

### 4. フレームワーク固有の対策（React / Vue）

React 18以降では **`useTransition` / `startTransition`** で非緊急な再レンダリングをマークすると、Reactが約5msごとにメインスレッドへ譲るConcurrent Renderingが効く。`useDeferredValue` は外部から流入する値の反映を遅延でき、大量の検索結果リストでも入力遅延を抑えられる。長大リストは `react-window` 等で仮想化する。React 19の **React Compiler** が手動 `useMemo` / `useCallback` をほぼ不要にしつつあるが、依存配列の肥大化には依然注意が必要だ。Vue 3でも `shallowRef` と `v-memo` で再描画を抑制できる。

### 5. サードパーティスクリプトの隔離

Chrome Developers blog の「A Next.js package for managing third-party libraries」は、18個のタグを含む GTM コンテナで TBT がほぼ20倍に増えること、およびそれを Web Worker に移したとき「moving the execution of the GTM container and its associated tag scripts to a web worker reduced TBT by 92%」と報告している。広告・解析・チャットウィジェットは、まずGTMから不要なタグを削減し、次に `defer` / `lazyOnload` 戦略で初期描画から外し、それでも改善しないものは **Partytown** で Web Worker に逃がす。

---

## CLSを「Good」にする技術手法

CLSは「予期しないレイアウトシフト」の累積で、ユーザー操作の **500ms以内** に発生したシフトは除外される。web.dev の「The most effective ways to improve Core Web Vitals」（top-cwv）は「the introduction of the bfcache in 2022 was responsible for the biggest improvement in CLS that we saw that year」と述べており、Web Almanac 2022 Performance 章も同様に「CLS is the CWV metric that improved the most in 2022… The cause of this improvement seems to come down to Chrome's launch of bfcache」と確認している。

### 1. メディアに必ず寸法を指定する

`<img>` / `<video>` / `<iframe>` には `width` と `height` 属性を必ず設定する。レスポンシブで実寸が変わる場合でも、属性値からブラウザは `aspect-ratio` を自動計算するため、`width: 100%; height: auto;` のCSSと併用できる。動的なコンテナには CSS `aspect-ratio: 16 / 9;` を明示する。

### 2. フォント切替によるシフト対策

Webフォント読み込み後に文字幅が変わると本文全体がシフトする。`@font-face` で **`size-adjust`、`ascent-override`、`descent-override`、`line-gap-override`** を使い、フォールバックフォントのメトリクスをWebフォントに合わせ込む。`font-display: optional` を選べばフォント起因のシフトは0になるが、Webフォントが100ms以内に届かないと諦める。

### 3. 動的挿入の枠を先に確保する

広告・推薦商品・Cookieバナーなど後から挿入されるコンテンツには、`min-height` または `aspect-ratio` で **領域を先に確保** する。ファーストビュー内に動的バナーを挿入するのは特に致命的なので避ける。

### 4. bfcache（戻る/進むキャッシュ）の確保

Chromeでは96以降、FirefoxとSafariでも有効化されている。`unload` ハンドラを使わない、`Cache-Control: no-store` を付けない、`window.opener` を持つページを避ける、といった条件を満たせば、戻る/進むナビゲーションがメモリスナップショットから即時復元され、LCP・CLSとも実質ゼロで計上される。Chrome DevToolsの「Application > Back/forward cache」パネルで非対応理由を診断できる。

---

## 測定・モニタリング

| 目的 | ツール | データ種別 |
|---|---|---|
| ランキング判定の最終確認 | Search Console「ウェブに関する主な指標」 | フィールド（CrUX, 28日 p75）|
| URL単位の現状把握 | PageSpeed Insights | フィールド + ラボ |
| 原因診断・最適化開発中 | Chrome DevTools (Performance / Insights) | ラボ |
| 競合・トレンド分析 | CrUX Dashboard / CrUX Vis / CrUX API | フィールド（履歴）|
| 自社RUM | `web-vitals` JSライブラリ | フィールド（独自）|

`web-vitals` v5の最小実装は次のように書ける。

```javascript
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

function send(metric) {
  navigator.sendBeacon('/vitals',
    JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
      id: metric.id,
      attribution: metric.attribution // 原因特定用
    })
  );
}
onLCP(send);
onINP(send);
onCLS(send);
```

`attribution` プロパティから、INPなら `interactionTarget`（CSSセレクタ）、`inputDelay`、`processingDuration`、`presentationDelay`、`longAnimationFrameEntries` まで取れるため、**「どの要素のどの段階が遅いか」が本番でわかる**。これがINP改善の出発点となる。

注意点として、CrUX は28日ローリングウィンドウのため、修正をデプロイしても完全反映には最低3週間ほどかかる。RUMで先行確認しつつ、Search Consoleの数値は気長に待つことになる。

---

## 現実的な優先順位とよくある落とし穴

1. **「Lighthouse 100点」を目標にしない**。Lighthouseは単一端末の1回の計測で、CrUXのp75とは別物。フィールドが赤でラボが緑、はごく普通だ。
2. **最も悪い指標から着手する**。Search Consoleは1指標でも「Poor」だとURLグループ全体を「Poor」評価にする。LCP・INP・CLSのうち最も離れている指標を改善する方が、全体3点ずつ稼ぐより合格が早い。
3. **モバイル基準で考える**。Web Almanac 2025 Performance 章は「good CWV performance reached … 48% for mobile websites and 56% for desktop websites」と報告しており、ボトルネックはほぼ必ずモバイルにある。ローエンドAndroid + 低速回線をChrome DevTools のスロットリングや WebPageTest で再現してテストする。
4. **75パーセンタイルは「最悪のユーザー」ではない**。誤解されがちだが、p75は「上位75%（速い方から数えて）」をカバーする指標であり、最遅25%は実質許容される。それでもなお、現代のWebは最遅25%を救う設計が必要だ。
5. **bfcacheは「ゼロコスト最適化」**。`Cache-Control: no-store` を外し、`unload` ハンドラを `pagehide` に置き換えるだけで、戻る/進むナビゲーションがすべて「Good」相当に化ける。
6. **サードパーティを定期棚卸し**。読み込まれたまま忘れられたタグマネージャの計測タグ、A/Bテストツール、チャットウィジェット — これらがINPの最大要因。四半期に一度は「収益寄与 vs パフォーマンス影響」のレビューを行う。

---

## まとめ

Core Web Vitalsの「Good」評価は、単一の魔法の設定で達成するものではなく、**「実ユーザーの遅い側を救う設計」を継続するプロセス**である。LCPはネットワークと優先度の問題、INPはJavaScriptアーキテクチャの問題、CLSはレイアウト宣言の問題、と性格がはっきり異なるため、診断 → 対策 → RUMで検証のループを各指標で別個に回すのが近道だ。`web-vitals` の attribution ビルドで「どこが、何ミリ秒、なぜ遅いか」をフィールドから可視化し、最も影響の大きい上位3件から潰す。これが2026年現在、特定のプラットフォームに依存せず通用する現実解である。