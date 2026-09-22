-- 次ページ提案（nq）— Supabase のスキーマ（情報設計書 10章「データモデル」、7章「4. モデル」）。
--
-- 流し方: Supabase の SQL Editor にこのファイルを貼って1回実行する。何度流しても同じ結果になる
-- （create ... if not exists / create or replace）。マイグレーションの仕組みはこのリポジトリに無いので、
-- 列を足すときは末尾に alter table ... add column if not exists を書き足していく。
-- 関数の戻り値の列を変えるときだけは、先に drop function が要る（create or replace では戻り値の型を変えられない）。
--
-- 書くのは Vercel Function だけ（api/_lib/log.js・api/nq-train.js が service_role キーで PostgREST を叩く）。
-- ブラウザにキーは出さない。どの表も RLS 有効・ポリシー無しにして、service_role 以外からは
-- 1行も読み書きできないようにする。
--
-- 保存しないもの: IP アドレス、User-Agent の全文、フォームの入力内容、Cookie などの永続 ID。
-- session_id はブラウザを閉じたら消える乱数で、個人にも端末にも結びつかない。
--
-- 列挙値（trigger、type、slot、goal など）に check 制約は付けない。値の検証は API 側の許可リストで
-- 済んでいる。ここでも縛ると、API に値を足した日（例: type の engaged）から挿入が 400 で落ち、
-- 記録の失敗は提案を止めない作りなので、だれも気づかないままログが欠ける。
--
-- 設計書12章の nq_gsc_rows ほか9テーブルは、記事パイプライン（別リポジトリ nortiq-pipeline）の持ち物。ここでは作らない。

-- ---------- 1. 判定ログ ----------

-- /api/suggest の判定1回につき1行。ホールドアウトとシャドーの判定も残す（比較の母数と、意図レポートに要る）。
create table if not exists public.nq_decisions (
  decision_id text primary key,                 -- 'd_…'
  created_at  timestamptz not null default now(),
  session_id  text not null,                    -- 'r_…'。乱数
  page_url    text,                             -- 判定したページ
  trigger     text,                             -- 'T1'〜'T3'
  holdout     boolean not null default false,   -- 比較のため常にデフォルトを出す群か
  shadow      boolean not null default false,   -- シャドーモード（判定と記録だけ）だったか
  is_default  boolean not null default true,    -- 実際にデフォルトを返したか（ホールドアウトとシャドーでは常に true）
  state       jsonb,                            -- 6章の状態そのまま（日本語キー。URL は入らない）
  answers     jsonb,                            -- 各質問の選択・確率・確信度。モデルの失敗時は null
  candidates  jsonb,                            -- 候補ごとの関連度・特徴量・期待値・選択確率（7章）。推薦まで進まなければ null
  slots       jsonb,                            -- ルールが選んだブロック。返していなくても「出していたら何だったか」を残す
  policy      text,                             -- 'prior-v1' / 'ts-v1+explore' など
  model       text,                             -- 判定モデルのバージョン
  latency_ms  integer                           -- Jev の呼び出しだけの時間。model_timeout_ms（900）で頭打ち。関数の起動待ち・
                                                -- ログ書き込み・往復の通信は含まない。訪問者から見た応答時間は nq_events の decide 行
);

-- 夜間バッチ（api/nq-train.js）は created_at の範囲を、created_at の降順（新しい側）から、前ページの最後の時刻を
-- 次ページの上限にして読む（offset は使わない）。この索引は後ろ向きの走査でもそのまま使える。
create index if not exists nq_decisions_created_idx on public.nq_decisions (created_at, decision_id);
-- セッション単位の集計（月次レポート、遷移表）。
create index if not exists nq_decisions_session_idx on public.nq_decisions (session_id, created_at);

-- ---------- 2. イベント ----------

-- /api/nq-event が受けた表示・クリックなど。1イベント1行。
-- type = 'decide' は「ブラウザが /api/suggest を1回呼んだ結果」。result と latency_ms（ブラウザで測った往復時間）は
-- この種別の行にだけ入る。client_timeout_ms（1200）で打ち切った回も result = 'timeout' で必ず1行になる
-- （decision_id は null。応答を読んでいないので ID が分からない）。フェーズ1の完了条件「応答の9割が1.2秒以内」は
-- ここから出す（nq_report.sql の K5）。nq_decisions.latency_ms では測れない（Jev の呼び出しだけの時間で、900ms で頭打ち）。
-- decision_id は null 可。null になるのは、判定の応答より先に画面へ入ったスロットと、判定を呼んでいないページの表示。
-- decision_id の有無はデフォルト表示かどうかを表さない。クライアントは、応答を受けたあとに画面へ入ったスロットなら、
-- デフォルト表示（ホールドアウト・シャドー・確信不足・クライアントが差し替えを見送った場合）でも decision_id を付けて送る
-- （ホールドアウトと分母をそろえるため）。個別化した表示かどうかは、nq_decisions を decision_id で引いて
-- 「is_default が false、かつ slots のそのスロットの block_id がイベントの block_id と同じ」で決める
-- （月次レポートの指標5・K1、nq_snapshot_month の *_personalized。api/_lib/learn.js の学習行と同じ基準）。
-- nq_decisions への外部キーは張らない。判定ログは応答の後ろで書く（waitUntil）ので、表示イベントの方が先に
-- 届くことがある。判定ログの書き込みが時間切れで落ちることもあり、そのたびにイベントまで捨てたくない。
create table if not exists public.nq_events (
  event_id    text primary key,                 -- 'e_…'
  created_at  timestamptz not null default now(),
  decision_id text,
  session_id  text not null,
  type        text not null,                    -- shown / click / engaged / dismiss / goal / decide
  slot        text,
  block_id    text,
  variant     text,
  page_url    text,
  goal        text,                             -- diagnostic / guidebook / contact（goal のときだけ）
  read        text,                             -- deep / skim（engaged のときだけ）
  result      text,                             -- ok / timeout / http / format / network（decide のときだけ）
  latency_ms  integer                           -- ブラウザで測った /api/suggest の往復時間（decide のときだけ）
);
-- すでに表を作ってある環境向け（create table if not exists は既存の表に列を足さない）。
alter table public.nq_events add column if not exists result text;
alter table public.nq_events add column if not exists latency_ms integer;

create index if not exists nq_events_created_idx on public.nq_events (created_at, event_id);
create index if not exists nq_events_decision_idx on public.nq_events (decision_id) where decision_id is not null;
create index if not exists nq_events_session_idx on public.nq_events (session_id, created_at);

-- ---------- 3. 学習済みモデル ----------

-- 夜間バッチごとに1行追加する（上書きしない。いつの重みで出した提案かを後から追えるように）。
-- /api/suggest は方策（NQ_POLICY）によらず、created_at が最新の1行を読む（api/_lib/model.js。
-- select は version, created_at, mean, variance, aux）。prior は aux だけを特徴量に使い、重みは ts のときだけ使う。
--   mean / variance: 重みの事後平均と分散。配列ではなく「名前 → 数値」のマップ。名前は
--                    api/_lib/features.js の FEATURES の10個 ＋ 'card:<block_id>'。
--                    配列だと、カードを足したり外したりしたときに学習済みの重みとの対応が黙ってずれる。
--   aux:             { V: {url: 値}, V_type: {ページ群: 値}, cov: {from_url: {to_url: 対数比}} }。
--                    リクエスト時に特徴量 dv / cov を引くための表。
--   ope:             オフポリシー評価の結果（月次レポートの「学習による推定改善幅」）。n / logged / rel_only / learned /
--                    lift_snips / lift_ips は1枚目のスロット（slot-mid / slot-next）の行だけの値。rel_only と learned は
--                    { matched, clipped, ips, snips, ess }。clipped は重み 1/選択確率 が上限（20）で打ち切られた行数で、
--                    1行でも在れば lift_ips は null（ips が下限になり、符号まで逆に出うるため）。
--                    by_slot['slot-end'] は「1枚目はログのまま2枚目だけ替えた場合」の参考値（lift は無い）。
create table if not exists public.nq_model (
  version       text primary key,               -- 'm_20260920T180000Z'
  created_at    timestamptz not null default now(),
  mean          jsonb not null,
  variance      jsonb not null,
  n_impressions integer not null default 0,     -- 学習に使った表示回数
  aux           jsonb not null default '{}'::jsonb,
  ope           jsonb
);

create index if not exists nq_model_created_idx on public.nq_model (created_at desc);

-- ---------- 4. 遷移表 ----------

-- ページ間の遷移回数。夜間バッチが毎晩まるごと作り直す。to_url の '(goal)' と '(exit)' は
-- 吸収状態（ゴール到達・離脱）で、URL は必ず '/' で始まるので衝突しない。
-- updated_at は入れ替えのための列。バッチは「今回の時刻で upsert → 今回より古い行を delete」の順で入れ替える
-- （先に全部消すと、途中で失敗した晩に表が空のまま残る）。upsert の衝突キーが主キー (from_url, to_url)。
create table if not exists public.nq_transitions (
  from_url   text not null,
  to_url     text not null,
  count      integer not null default 0,        -- 遷移回数
  goal_count integer not null default 0,        -- その遷移のあとでゴールに着いたセッションの数
  updated_at timestamptz not null default now(),
  primary key (from_url, to_url)
);

-- ---------- 5. 月次の集計値 ----------

-- 生ログの保持は13か月。それ以降は月次の集計値だけを残す（設計書10章）。その置き場。
-- 1か月1行。割合ではなく件数で持つ（あとから別の切り口の割合を計算し直せるように）。
-- 設計書のテーブル一覧には無いが、これが無いと保持期限の削除で月次の数字まで消える。
create table if not exists public.nq_monthly (
  month      date primary key,                  -- 日本時間の月初
  created_at timestamptz not null default now(),
  metrics    jsonb not null
);

-- ---------- 6. RLS ----------

-- ポリシーを1つも作らないので、anon / authenticated からは全行が見えず、書けもしない。
-- service_role は RLS を素通りする。Supabase は public の新しい表に anon / authenticated の権限を
-- 既定で付けるので、念のためそれも外す（RLS を誤って切っても API から読めないように）。
alter table public.nq_decisions   enable row level security;
alter table public.nq_events      enable row level security;
alter table public.nq_model       enable row level security;
alter table public.nq_transitions enable row level security;
alter table public.nq_monthly     enable row level security;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    -- Supabase 以外の Postgres（手元での確認など）にはこのロールが無い。
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.nq_decisions, public.nq_events, public.nq_model, public.nq_transitions, public.nq_monthly from %I', r);
    end if;
  end loop;
  -- 書くのは Vercel Function（service_role）だけ。プロジェクト作成時に「Automatically expose new tables」を
  -- 切っていると既定の権限が付かないので、ここで明示的に付ける（付いていれば何も変わらない）。
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public to service_role;
    grant all on table public.nq_decisions, public.nq_events, public.nq_model, public.nq_transitions, public.nq_monthly to service_role;
  end if;
end
$$;

-- ---------- 7. 集計の部品（月次レポートと保持期限の削除が共通で使う） ----------

-- 日本時間の「n か月前の月」の範囲。nq_month_range(-1) が先月、0 が今月。
create or replace function public.nq_month_range(months_back integer default -1)
returns table (t0 timestamptz, t1 timestamptz)
language sql stable
as $$
  select (date_trunc('month', now() at time zone 'Asia/Tokyo') + make_interval(months => months_back)) at time zone 'Asia/Tokyo',
         (date_trunc('month', now() at time zone 'Asia/Tokyo') + make_interval(months => months_back + 1)) at time zone 'Asia/Tokyo'
$$;

-- URL → ページ群（設計書2章「ページ群と提案可否」）。DB には catalog が無いので、URL の形で決める。
-- 判定ログの state にはページ群が日本語で入っているが、イベントには URL しか無い。
-- ページ群を足したら data/catalog-pages.json とここの両方を直す。
-- /subsidy だけは catalog（type: goal）と分け方が違う。設計書2章ではゴール層だが、10章の nq_goal は
-- /diagnostic・/guidebook・フォーム送信だけで、/subsidy に着いても goal イベントは出ない。'goal' のままだと
-- sg-subsidy を押して /subsidy を読んだセッションが K2（記事→サービス遷移率）にも K3（ゴール到達率）にも
-- 数えられないので、計測上は中間層と同じに数える 'goal_info' に分ける（docs/nq/open-decisions.md の E9）。
-- 特徴量の側（data/catalog-pages.json の type: goal、goal_proximity = 1）は設計書2章のまま変えない。
-- 2026-09-21（docs/nq/decisions-2026-09-21.md 2章）: /company と /staff は 'trust' から 'company'（会社情報）、
-- /recruit は 'company' から 'recruit'（採用情報）に変えた。catalog-pages.json の type と同じ分け方にするため。
-- 会社概要・スタッフ紹介は求職者や営業も読むので「サービス系ページ」（K2 の到達先）には数えない。
-- 5ラベル化より前の判定ログは無い（api:false で未稼働）ので、集計の連続性は切れない。
create or replace function public.nq_page_group(url text)
returns text
language sql immutable
as $$
  select case
    when url is null then null
    when url ~ '^/article-' or url = '/column' then 'article'
    when url ~ '^/service/' then 'industry_lp'
    when url ~ '^/solution-' then 'solution'
    when url in ('/web', '/chatbot', '/dx') then 'service'
    when url ~ '^/feature-' then 'feature'
    when url = '/works' or url ~ '^/works-' then 'works'
    when url in ('/pricing', '/voice', '/support') then 'trust'
    when url ~ '^/product-' then 'product'
    when url in ('/diagnostic', '/guidebook') then 'goal'
    when url = '/subsidy' then 'goal_info'
    when url in ('/company', '/staff') then 'company'
    when url = '/recruit' then 'recruit'
    when url = '/' then 'top'
    else 'other'
  end
$$;

-- 「サービス系ページ」= 2章の中間層 ＋ /subsidy（'goal_info'。上のコメント）。KPI「記事→サービス遷移率」の到達先。
-- /diagnostic・/guidebook（'goal'）は含めない。そちらは goal イベントで K3 に数える。
create or replace function public.nq_is_service_group(page_group text)
returns boolean
language sql immutable
as $$
  select page_group in ('industry_lp', 'solution', 'service', 'feature', 'works', 'trust', 'product', 'goal_info')
$$;

-- セッション1つにつき1行の要約。期間は「セッションの最初の判定の時刻」で切る。
-- 母数は「判定が1回以上あったセッション」。記事を25%まで読まずに帰ったセッションは判定が無いので入らない
-- （サイト全体のセッション数は GA4 を見る）。
--   landing_*:  最初の判定の state の着地ページ（state に URL は無いので title で持つ）
--   answers:    回答が取れた最後の判定のもの。閲覧が進んだあとの判定ほど材料が多い
--   reached_service / reached_goal: 判定かイベントの page_url が中間層（と /subsidy）に在ったか、goal イベントが在ったか。
--               1セッションの判定は最大3回なので、4ページ目以降の到達はイベントが無ければ拾えない。
--               /subsidy にはカードのスロットが無い。到達が拾えるのは、sg-subsidy を押して途中離脱せずに読んだとき
--               （engaged の page_url）と、PC で slot-bar の判定・表示がそこで起きたときだけ
create or replace function public.nq_session_summary(t0 timestamptz, t1 timestamptz)
returns table (
  session_id      text,
  first_at        timestamptz,
  holdout         boolean,
  shadow          boolean,
  personalized    boolean,
  landing_type    text,
  landing_title   text,
  answers         jsonb,
  reached_service boolean,
  reached_goal    boolean
)
language sql stable
as $$
  with firsts as (
    select distinct on (d.session_id) d.session_id, d.created_at as first_at, d.state
    from public.nq_decisions d
    order by d.session_id, d.created_at, d.decision_id
  ),
  in_range as (
    select * from firsts f where f.first_at >= t0 and f.first_at < t1
  ),
  flags as (
    select d.session_id,
           bool_or(d.holdout) as holdout,
           bool_or(d.shadow) as shadow,
           bool_or(not d.is_default) as personalized,
           bool_or(public.nq_is_service_group(public.nq_page_group(d.page_url))) as on_service
    from public.nq_decisions d
    join in_range f using (session_id)
    group by d.session_id
  ),
  last_answers as (
    select distinct on (d.session_id) d.session_id, d.answers
    from public.nq_decisions d
    join in_range f using (session_id)
    where d.answers is not null
    order by d.session_id, d.created_at desc, d.decision_id desc
  ),
  ev as (
    select e.session_id,
           bool_or(public.nq_is_service_group(public.nq_page_group(e.page_url))) as on_service,
           bool_or(e.type = 'goal') as goal
    from public.nq_events e
    join in_range f using (session_id)
    group by e.session_id
  )
  select f.session_id,
         f.first_at,
         g.holdout,
         g.shadow,
         g.personalized,
         f.state -> '着地ページ' ->> 'type',
         f.state -> '着地ページ' ->> 'title',
         a.answers,
         coalesce(g.on_service, false) or coalesce(ev.on_service, false),
         coalesce(ev.goal, false)
  from in_range f
  join flags g using (session_id)
  left join last_answers a using (session_id)
  left join ev using (session_id)
$$;

-- ---------- 8. 13か月の保持 ----------

-- 1か月ぶんの集計値を nq_monthly に書く（在れば上書き）。p_month は日本時間の月初。
create or replace function public.nq_snapshot_month(p_month date)
returns jsonb
language plpgsql
as $$
declare
  v_t0 timestamptz := (date_trunc('month', p_month)::timestamp) at time zone 'Asia/Tokyo';
  v_t1 timestamptz := ((date_trunc('month', p_month) + interval '1 month')::timestamp) at time zone 'Asia/Tokyo';
  v_metrics jsonb;
begin
  with s as (
    select * from public.nq_session_summary(v_t0, v_t1)
  ),
  totals as (
    select jsonb_build_object(
      'sessions', count(*),
      'sessions_judged', count(*) filter (where answers is not null),
      'sessions_holdout', count(*) filter (where holdout),
      'sessions_shadow', count(*) filter (where shadow),
      'sessions_personalized', count(*) filter (where personalized),
      'sessions_goal', count(*) filter (where reached_goal)
    ) as j
    from s
  ),
  axes as (
    select jsonb_object_agg(axis, by_label) as j
    from (
      select axis, jsonb_object_agg(label, n) as by_label
      from (
        select k.axis, coalesce(s.answers -> k.axis ->> 'choice', '(null)') as label, count(*) as n
        from s
        cross join (values ('visitor_type'), ('industry'), ('need')) as k(axis)
        where s.answers is not null
        group by k.axis, 2
      ) x
      group by axis
    ) y
  ),
  concerns as (
    select jsonb_object_agg(key, n) as j
    from (
      select k.key, count(*) filter (where (s.answers -> k.key ->> 'noul')::numeric >= 0.6) as n
      from s
      cross join (values ('concern_cost'), ('concern_schedule'), ('concern_trust'), ('concern_ai_quality'), ('concern_scope')) as k(key)
      where s.answers is not null
      group by k.key
    ) x
  ),
  compare as (
    -- ホールドアウト比較の材料。記事に着地したセッションだけ。シャドーの期間は全員デフォルトなので除く。
    select jsonb_object_agg(grp, j) as j
    from (
      select case when holdout then 'holdout' else 'applied' end as grp,
             jsonb_build_object(
               'article_sessions', count(*),
               'reached_service', count(*) filter (where reached_service),
               'reached_goal', count(*) filter (where reached_goal)
             ) as j
      from s
      where landing_type = '記事' and not shadow
      group by 1
    ) x
  ),
  blocks as (
    -- *_personalized は「判定で差し替えた表示」だけ。decision_id の有無では分けられない（デフォルト表示でも、
    -- 応答のあとに画面へ入ったスロットは decision_id を持つ。上の「2. イベント」のコメント）。判定ログを引いて、実際に個別化を
    -- 返した判定（is_default が false）で、そのスロットに置いたブロックと同じものが出たときだけ数える。
    -- 判定の行が無いイベント（記録の失敗、API の即デフォルト応答）は left join で null になり、デフォルト側に入る。
    -- 生ログを消したあとは計算し直せないので、判定ログが残っているうちに集計する（nq_purge は消す前にここを呼ぶ）。
    select jsonb_object_agg(block_id, j) as j
    from (
      select e.block_id,
             jsonb_build_object(
               'shown', count(*) filter (where e.type = 'shown'),
               'click', count(*) filter (where e.type = 'click'),
               'engaged', count(*) filter (where e.type = 'engaged'),
               'shown_personalized', count(*) filter (where e.type = 'shown' and d.is_default is false
                                                        and d.slots -> e.slot ->> 'block_id' = e.block_id),
               'click_personalized', count(*) filter (where e.type = 'click' and d.is_default is false
                                                        and d.slots -> e.slot ->> 'block_id' = e.block_id)
             ) as j
      from public.nq_events e
      left join public.nq_decisions d on d.decision_id = e.decision_id
      where e.created_at >= v_t0 and e.created_at < v_t1 and e.block_id is not null
      group by e.block_id
    ) x
  ),
  goals as (
    select jsonb_object_agg(goal, n) as j
    from (
      select e.goal, count(distinct e.session_id) as n
      from public.nq_events e
      where e.created_at >= v_t0 and e.created_at < v_t1 and e.type = 'goal' and e.goal is not null
      group by e.goal
    ) x
  ),
  suggest_calls as (
    -- ブラウザから見た /api/suggest の結果（type = 'decide'）。ok 以外は、応答を捨ててデフォルトのままにした回。
    select jsonb_build_object(
      'n', count(*),
      'ok', count(*) filter (where e.result = 'ok'),
      'timeout', count(*) filter (where e.result = 'timeout'),
      'other_fail', count(*) filter (where e.result not in ('ok', 'timeout'))
    ) as j
    from public.nq_events e
    where e.created_at >= v_t0 and e.created_at < v_t1 and e.type = 'decide' and e.result is not null
  ),
  decisions as (
    select jsonb_build_object(
      'decisions', count(*),
      'judged', count(*) filter (where d.answers is not null),
      'judged_default', count(*) filter (where d.answers is not null and (d.slots is null or d.slots = '{}'::jsonb))
    ) as j
    from public.nq_decisions d
    where d.created_at >= v_t0 and d.created_at < v_t1
  )
  select (select j from totals)
      || (select j from decisions)
      || jsonb_build_object(
           'answers', coalesce((select j from axes), '{}'::jsonb),
           'concerns', coalesce((select j from concerns), '{}'::jsonb),
           'holdout_compare', coalesce((select j from compare), '{}'::jsonb),
           'blocks', coalesce((select j from blocks), '{}'::jsonb),
           'goals', coalesce((select j from goals), '{}'::jsonb),
           'suggest_calls', (select j from suggest_calls)
         )
    into v_metrics;

  insert into public.nq_monthly (month, created_at, metrics)
  values (date_trunc('month', p_month)::date, now(), v_metrics)
  on conflict (month) do update set created_at = excluded.created_at, metrics = excluded.metrics;

  return v_metrics;
end
$$;

-- 保持期限を過ぎた生ログを消す。消す前に、その月の集計値が nq_monthly に無ければ作る。
-- 月の途中で切ると集計と生ログの境目がずれるので、日本時間の月単位で消す
-- （keep_months = 13 なら、13か月前の月の月初より前を消す。生ログは13か月〜14か月ぶん残る）。
-- nq_model は生ログではないが毎晩1行ずつ増える（aux が大きい）ので、期限を過ぎたぶんは各月の最後の1行だけ残す。
-- 戻り値は消した行数。
create or replace function public.nq_purge(keep_months integer default 13)
returns jsonb
language plpgsql
as $$
declare
  v_cutoff_local timestamp := date_trunc('month', now() at time zone 'Asia/Tokyo') - make_interval(months => greatest(keep_months, 1));
  v_cutoff timestamptz := v_cutoff_local at time zone 'Asia/Tokyo';
  v_month date;
  v_decisions bigint;
  v_events bigint;
  v_models bigint;
begin
  for v_month in
    select distinct date_trunc('month', x.created_at at time zone 'Asia/Tokyo')::date
    from (
      select created_at from public.nq_decisions where created_at < v_cutoff
      union all
      select created_at from public.nq_events where created_at < v_cutoff
    ) x
  loop
    if not exists (select 1 from public.nq_monthly m where m.month = v_month) then
      perform public.nq_snapshot_month(v_month);
    end if;
  end loop;

  delete from public.nq_events where created_at < v_cutoff;
  get diagnostics v_events = row_count;
  delete from public.nq_decisions where created_at < v_cutoff;
  get diagnostics v_decisions = row_count;

  delete from public.nq_model m
  where m.created_at < v_cutoff
    and exists (
      select 1 from public.nq_model n
      where n.created_at > m.created_at
        and date_trunc('month', n.created_at at time zone 'Asia/Tokyo') = date_trunc('month', m.created_at at time zone 'Asia/Tokyo')
    );
  get diagnostics v_models = row_count;

  return jsonb_build_object('cutoff', v_cutoff, 'nq_decisions', v_decisions, 'nq_events', v_events, 'nq_model', v_models);
end
$$;

-- public の関数は PostgREST の /rpc から呼べてしまう。どれも security invoker なので anon が呼んでも
-- RLS で1行も見えないが、呼べる必要も無いので実行権を外す（service_role と SQL Editor からは呼べる）。
do $$
declare
  r text;
begin
  revoke execute on function public.nq_month_range(integer) from public;
  revoke execute on function public.nq_page_group(text) from public;
  revoke execute on function public.nq_is_service_group(text) from public;
  revoke execute on function public.nq_session_summary(timestamptz, timestamptz) from public;
  revoke execute on function public.nq_snapshot_month(date) from public;
  revoke execute on function public.nq_purge(integer) from public;
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke execute on function public.nq_month_range(integer), public.nq_page_group(text), public.nq_is_service_group(text), public.nq_session_summary(timestamptz, timestamptz), public.nq_snapshot_month(date), public.nq_purge(integer) from %I', r);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.nq_month_range(integer), public.nq_page_group(text), public.nq_is_service_group(text), public.nq_session_summary(timestamptz, timestamptz), public.nq_snapshot_month(date), public.nq_purge(integer) to service_role;
  end if;
end
$$;

-- ---------- 9. 定期実行（pg_cron の例。必要になったら手で流す） ----------
--
-- Supabase のダッシュボード → Database → Extensions で pg_cron を有効にしてから、SQL Editor で次を実行する。
-- 時刻は UTC。下は毎月2日の 19:00 UTC（日本時間 3日 04:00。夜間バッチの 03:00 とずらしてある）。
--
--   select cron.schedule('nq-monthly-snapshot', '0 19 2 * *',
--     $job$ select public.nq_snapshot_month(((now() at time zone 'Asia/Tokyo') - interval '1 month')::date) $job$);
--   select cron.schedule('nq-purge', '30 19 2 * *', $job$ select public.nq_purge(13) $job$);
--
-- 確認と停止:
--   select jobid, jobname, schedule, command from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select cron.unschedule('nq-purge');
--
-- pg_cron を使わないなら、月次レポートを出すついでに SQL Editor で select public.nq_purge(13); を流せば足りる
-- （消すのは13か月より前だけなので、数か月さぼっても消えすぎることは無い）。
