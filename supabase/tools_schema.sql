-- 無料ツール（/tools/*）のユーザー評価 — Supabase のスキーマ。
--
-- 流し方: Supabase の SQL Editor にこのファイルを貼って1回実行する（何度流しても同じ結果になる）。
-- 書くのは api/tool-rating.js だけ（service_role キーで PostgREST を叩く）。ブラウザにキーは出さない。
-- RLS 有効・ポリシー無しにして、service_role 以外からは1行も読み書きできないようにする。
--
-- 保存しないもの: IP アドレス、User-Agent の全文、フォームの入力内容、Cookie などの永続 ID。
-- comment は API 側でメール・電話・URL を落とし、200文字で切る。

create table if not exists public.tool_ratings (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  tool        text not null,                    -- 'estimate' / 'ai-fit' / 'manual-cost' / 'ai-risk' / 'document-demo' …（API 側の許可リスト）
  score       smallint not null check (score between 1 and 5),
  useful      boolean,                          -- 「役に立った」はい/いいえ
  comment     text,                             -- 任意。200文字まで
  page_url    text,                             -- クエリ無しのパス
  session_id  text,                             -- ブラウザを閉じたら消える乱数
  stage       text                              -- 'result' / 'after_submit'
);
create index if not exists tool_ratings_tool_created on public.tool_ratings (tool, created_at desc);
alter table public.tool_ratings enable row level security;
comment on table public.tool_ratings is 'nortiqlab.com /tools の評価。api/tool-rating.js のみ書く';

-- 週次の集計（SQL Editor で見る用）
create or replace view public.tool_ratings_weekly as
select tool,
       date_trunc('week', created_at) as week,
       count(*)                        as n,
       round(avg(score), 2)            as avg_score,
       sum(case when useful then 1 else 0 end) as useful_yes,
       sum(case when useful = false then 1 else 0 end) as useful_no
from public.tool_ratings
group by tool, date_trunc('week', created_at)
order by week desc, tool;
