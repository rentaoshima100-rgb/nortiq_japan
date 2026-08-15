# showcase/

実績ショーケースサイト置き場。1案件 = 1フォルダ (例: `showcase/estia/index.html`)。

- 自己完結の静的HTML (CSS/JSインライン、外部CDN不可) で配置する
- ビルド時に dist/showcase/ へコピーされ、/showcase/<name>/ で同一ドメイン配信される
- HTML には build.js が自動で noindex を注入する (本体と検索競合させない)
- 実績データ (WORKS_DATA / GalleryTabs) の `demo: '/showcase/<name>/'` で
  カードからサイト内モーダル表示される
