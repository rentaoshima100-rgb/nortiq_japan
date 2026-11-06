# showcase/

実績ショーケースサイト置き場。1案件 = 1フォルダ (例: `showcase/estia/index.html`)。

- 自己完結の静的HTML (CSS/JSインライン、外部CDN不可) で配置する
- ビルド時に dist/showcase/ へコピーされ、/showcase/<name>/ で同一ドメイン配信される
- HTML には build.js が自動で noindex を注入する (本体と検索競合させない)
- 実績データ (WORKS_DATA / GalleryTabs) の `demo: '/showcase/<name>/'` で
  カードからサイト内モーダル表示される

## 全幅対応 (スマホ・タブレット・小さいPC)

実績サイトは Claude Design の書き出しで、原本はデスクトップ幅の設計。原本は触らず、
`_responsive/` の CSS を build.js がビルド時に各ページの `<head>` へ差し込む。
メディアクエリの中だけに書くので、幅1280px以上の見た目は原本と変わらない。

- `_responsive/base.css` 全ページ共通
- `_responsive/generated/<slug>.css` `node scripts/showcase-responsive-gen.js` の生成物 (手で編集しない)
- `_responsive/<slug>.css` ページごとの手直し

要素の指定には描画時に付く `data-dc-tpl` の番号を使う。番号はテンプレートの要素順で決まるので、
書き出し直したページは generated を作り直し、手直しの番号も合わせ直すこと。
