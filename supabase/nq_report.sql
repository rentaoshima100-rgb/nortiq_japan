-- 次ページ提案（nq）— 月次の意図レポートと KPI のクエリ集
-- （情報設計書 10章「月次の意図レポート」の9指標 ＋ 1章の KPI 4つ ＋ 運用の確認 K5「応答が間に合った割合」）。
--
-- 使い方: supabase/nq_schema.sql を流してある Supabase の SQL Editor に、クエリを1つずつ貼って実行する
-- （SQL Editor は最後の文の結果しか表示しないので、まとめて流さない）。
-- どのクエリも先月（日本時間）が対象。別の月を見るときは nq_month_range(-1) の -1 を変える
-- （0 が今月、-2 が先々月）。4週間単位で見たいときは p を次のように置き換える:
--   with p as (select timestamptz '2026-10-01 00:00+09' as t0, timestamptz '2026-10-29 00:00+09' as t1)
--
-- 前提と限界:
--   - 母数は「判定（/api/suggest）が1回以上あったセッション」。記事を25%まで読まずに帰ったセッションは
--     ログに無い。サイト全体のセッション数と直帰は GA4 を見る。
--   - 訪問者のタイプ・業種・ニーズ・不安は、セッションの中で回答が取れた最後の判定の値を使う
--     （閲覧が進んだあとの判定ほど材料が多い）。
--   - しきい値（0.6、0.55 など）は data/nq-rules.json の thresholds と同じ値を直に書いてある。
--     あちらを変えたら、ここも変える。
--   - NQ_MODEL_PROVIDER=stub の期間は回答がすべて低確信なので、意図の指標（1〜4、8）は意味を持たない。
--   - 13か月より前の月は生ログが無い。nq_monthly.metrics（件数）から計算する（末尾の付録）。
--   - 「個別化した表示（personalized）」は nq_events の decision_id の有無では決まらない。クライアントは、判定の応答を
--     受けたあとに画面へ入ったスロットなら、デフォルト表示（ホールドアウト・シャドー・確信不足・差し替えの見送り）でも
--     decision_id を付けて送る。nq_decisions を引いて「is_default が false、かつ slots のそのスロットの block_id が
--     イベントの block_id と同じ」ものだけを personalized とする（指標5・K1。api/_lib/learn.js の学習行と同じ基準）。
--   - /subsidy は K2（記事→サービス遷移率）の到達先に含め、K3（ゴール到達率）には含めない。設計書2章ではゴール層だが、
--     /subsidy に着いても nq_goal は出ない（10章）。どちらにも入れないと、sg-subsidy の行き先がどの到達率にも
--     数えられない（nq_schema.sql の nq_page_group の 'goal_info'）。/subsidy にはカードのスロットが無いので、到達が
--     拾えるのは sg-subsidy を押して途中離脱せずに読んだとき（engaged の page_url）と、PC で slot-bar の判定・表示が
--     そこで起きたときだけ。ほかの中間ページより少なめに出る。
--   - 応答時間は2種類あり、別物。nq_decisions.latency_ms は Jev の呼び出しだけの時間（900ms で頭打ち。K4）。
--     訪問者から見た /api/suggest の往復時間と、1.2秒で打ち切った回の数は nq_events の type = 'decide' の行（K5）。
--     フェーズ1の完了条件「応答の9割が1.2秒以内」は K5 で判定する。


-- =====================================================================
-- 月次の意図レポート（10章）
-- =====================================================================

-- ---------- 1. 見込み客率 ----------
-- 「発注検討中」と「情報収集中」の合計が全体に占める割合。サイト全体の集客の質を月ごとに追う。
-- prospect_rate は選択だけで数えた値、prospect_rate_confident は確信度 0.6 以上に限った値（ルールが実際に使う線）。
with p as (select * from public.nq_month_range(-1)),
s as (select x.* from p, public.nq_session_summary(p.t0, p.t1) x where x.answers is not null)
select count(*) as sessions_judged,
       count(*) filter (where answers -> 'visitor_type' ->> 'choice' = '発注検討中の事業者') as considering,
       count(*) filter (where answers -> 'visitor_type' ->> 'choice' = '情報収集中の事業者') as researching,
       round(count(*) filter (where answers -> 'visitor_type' ->> 'choice' in ('発注検討中の事業者', '情報収集中の事業者'))::numeric
             / nullif(count(*), 0), 4) as prospect_rate,
       round(count(*) filter (where answers -> 'visitor_type' ->> 'choice' in ('発注検討中の事業者', '情報収集中の事業者')
                                and (answers -> 'visitor_type' ->> 'confidence')::numeric >= 0.6)::numeric
             / nullif(count(*), 0), 4) as prospect_rate_confident
from s;

-- 訪問者タイプの内訳（上の補足。営業・求職者・同業者がどれだけ混じっているか）。
with p as (select * from public.nq_month_range(-1)),
s as (select x.* from p, public.nq_session_summary(p.t0, p.t1) x where x.answers is not null)
select coalesce(answers -> 'visitor_type' ->> 'choice', '(判定なし)') as visitor_type,
       count(*) as sessions,
       round(count(*)::numeric / sum(count(*)) over (), 4) as share,
       round(avg((answers -> 'visitor_type' ->> 'confidence')::numeric), 3) as avg_confidence
from s
group by 1
order by sessions desc;


-- ---------- 2. 記事別の見込み客率 ----------
-- 30セッション以上の記事だけ。高い記事のテーマを記事パイプラインで増やし、低いテーマは減らす。
-- 記事は着地ページの title で分ける（判定ログの state には URL を残していない）。
with p as (select * from public.nq_month_range(-1)),
s as (select x.* from p, public.nq_session_summary(p.t0, p.t1) x where x.answers is not null and x.landing_type = '記事')
select landing_title,
       count(*) as sessions,
       round(count(*) filter (where answers -> 'visitor_type' ->> 'choice' in ('発注検討中の事業者', '情報収集中の事業者'))::numeric
             / count(*), 4) as prospect_rate,
       round(avg((answers -> 'stage' ->> 'score')::numeric), 2) as avg_stage
from s
group by landing_title
having count(*) >= 30
order by prospect_rate desc, sessions desc;


-- ---------- 3. 業種とニーズの分布 ----------
-- 上位3つ。次に作るパッケージLPの優先順位に使う。「不明・その他」「other」は順位から外し、
-- 見込み客（発注検討中・情報収集中）に限る。営業や求職者の業種を LP の優先順位に混ぜないため。
with p as (select * from public.nq_month_range(-1)),
s as (
  select x.* from p, public.nq_session_summary(p.t0, p.t1) x
  where x.answers is not null
    and x.answers -> 'visitor_type' ->> 'choice' in ('発注検討中の事業者', '情報収集中の事業者')
),
counted as (
  select k.axis,
         s.answers -> k.axis ->> 'choice' as label,
         count(*) as sessions,
         count(*) filter (where (s.answers -> k.axis ->> 'confidence')::numeric >= 0.6) as sessions_confident
  from s cross join (values ('industry'), ('need')) as k(axis)
  group by 1, 2
),
ranked as (
  select c.*,
         round(c.sessions::numeric / (select count(*) from s), 4) as share_of_prospects,
         row_number() over (partition by c.axis order by c.sessions desc, c.label) as rank
  from counted c
  where c.label is not null and c.label not in ('不明・その他', 'other')
)
select axis, rank, label, sessions, sessions_confident, share_of_prospects
from ranked
where rank <= 3
order by axis, rank;


-- ---------- 4. 不安ランキング ----------
-- 各不安が 0.6 以上だったセッションの割合。上位の不安に答えるページや FAQ を足す。
with p as (select * from public.nq_month_range(-1)),
s as (select x.* from p, public.nq_session_summary(p.t0, p.t1) x where x.answers is not null)
select k.label as concern,
       count(*) filter (where (s.answers -> k.key ->> 'noul')::numeric >= 0.6) as sessions,
       count(*) as sessions_judged,
       round(count(*) filter (where (s.answers -> k.key ->> 'noul')::numeric >= 0.6)::numeric / nullif(count(*), 0), 4) as share
from s
cross join (values ('concern_cost', '費用'), ('concern_schedule', '納期'), ('concern_trust', '実績・信頼性'),
                   ('concern_ai_quality', 'AI制作の品質'), ('concern_scope', '依頼範囲')) as k(key, label)
group by k.key, k.label
order by share desc nulls last;


-- ---------- 5. ブロック別 CTR ----------
-- 表示30回以上のブロックだけ。下位のブロックは文言を差し替える。
-- mode = personalized は判定で差し替えた表示、default はデフォルト表示（ホールドアウト・シャドーを含む）。
-- 同じブロックでも、合う人にだけ出したときとデフォルトで全員に出したときで CTR が違うので分けて見る。
-- mode は decision_id の有無では決めない（冒頭「前提と限界」）。判定ログを引き、実際に個別化を返した判定
-- （is_default が false）で、そのスロットに置いたブロックと同じものが出たときだけ personalized。
-- 判定の行が無いイベント（記録の失敗、API の即デフォルト応答）は left join で null になり、default に入る。
with p as (select * from public.nq_month_range(-1)),
e as (
  select ev.*,
         case when d.is_default is false and d.slots -> ev.slot ->> 'block_id' = ev.block_id
              then 'personalized' else 'default' end as mode
  from public.nq_events ev
  cross join p
  left join public.nq_decisions d on d.decision_id = ev.decision_id
  where ev.created_at >= p.t0 and ev.created_at < p.t1
    and ev.type in ('shown', 'click') and ev.block_id is not null
)
select block_id,
       coalesce(variant, '(なし)') as variant,
       mode,
       count(*) filter (where type = 'shown') as shown,
       count(*) filter (where type = 'click') as clicks,
       round(count(*) filter (where type = 'click')::numeric / nullif(count(*) filter (where type = 'shown'), 0), 4) as ctr
from e
group by 1, 2, 3
having count(*) filter (where type = 'shown') >= 30
order by ctr asc nulls last;

-- 成果（クリック後に途中離脱せず読んだ = engaged）まで見る版。engaged はスロットも variant も送ってこないので、
-- ブロック単位でだけ数える。学習器が最大化しているのはこちら（7章「4. モデル」）。
with p as (select * from public.nq_month_range(-1)),
e as (
  select ev.* from public.nq_events ev, p
  where ev.created_at >= p.t0 and ev.created_at < p.t1
    and ev.type in ('shown', 'click', 'engaged') and ev.block_id is not null
)
select block_id,
       count(*) filter (where type = 'shown') as shown,
       count(*) filter (where type = 'click') as clicks,
       count(*) filter (where type = 'engaged') as engaged,
       count(*) filter (where type = 'engaged' and read = 'deep') as engaged_deep,
       round(count(*) filter (where type = 'click')::numeric / nullif(count(*) filter (where type = 'shown'), 0), 4) as ctr,
       round(count(*) filter (where type = 'engaged')::numeric / nullif(count(*) filter (where type = 'shown'), 0), 4) as engaged_rate
from e
group by block_id
having count(*) filter (where type = 'shown') >= 30
order by engaged_rate asc nulls last;


-- ---------- 6. カード別の実力 ----------
-- カード別の補正の事後平均（7章）。最新の nq_model.mean から 'card:<block_id>' の重みを取り出す。
-- 下位は文言か提案先ページを直す。上位の型を新しいカードに使う。
-- correction は対数オッズの差（0 が事前分布の平均 = 「関連度どおり」）。odds_ratio は同じ関連度のカードと比べた
-- 成果のオッズの倍率。sd が事前分布の 0.35 からほとんど縮んでいないカードは、まだ表示が足りず何も言えない。
with m as (
  select version, created_at, n_impressions, mean, variance
  from public.nq_model
  order by created_at desc
  limit 1
)
select m.version,
       m.n_impressions,
       substr(w.key, 6) as block_id,
       round(w.value::numeric, 3) as correction,
       round(exp(w.value::numeric), 2) as odds_ratio,
       round(sqrt((m.variance ->> w.key)::numeric), 3) as sd,
       case when sqrt((m.variance ->> w.key)::numeric) > 0.3 then 'データ不足' else '' end as note
from m, jsonb_each_text(m.mean) as w(key, value)
where w.key like 'card:%'
order by w.value::numeric desc;

-- 共有の重み（特徴量ごと）。どの特徴量が順位を動かしているかを見る。|z| が 2 を超えたものが「効いている」。
with m as (
  select version, mean, variance from public.nq_model order by created_at desc limit 1
)
select m.version,
       w.key as feature,
       round(w.value::numeric, 3) as weight,
       round(sqrt((m.variance ->> w.key)::numeric), 3) as sd,
       round(w.value::numeric / nullif(sqrt((m.variance ->> w.key)::numeric), 0), 2) as z
from m, jsonb_each_text(m.mean) as w(key, value)
where w.key not like 'card:%'
order by abs(w.value::numeric / nullif(sqrt((m.variance ->> w.key)::numeric), 0)) desc nulls last;


-- ---------- 7. 学習による推定改善幅 ----------
-- オフポリシー評価で「Jev のみの順位（関連度だけ）」と「学習後の順位」の推定成果率を比べる（7章「6. 評価」）。
-- 各月の最後の夜間バッチの値を並べる。改善が出ない月が続けば、特徴量を見直す。
--   snips は自己正規化した推定値（ばらつきが小さいので、まずこちらを見る）。ips は素の推定値。
--   ess（有効サンプル数）が小さい、または in_sample が true の月は、件数が足りず結論を出せない。
--   判断は lift_snips と ess、learned_clipped で見る。prior-v1 のログでは、探索で選ばれた行の重み（20×候補数）が
--   必ず上限の 20 で打ち切られるので、ips は下限にしかならない。lift_ips は打ち切りが1行も無いとき
--   （rel_only・learned とも clipped = 0）だけ値が入り、それ以外は null。
--   値は1枚目のスロット（slot-mid / slot-next）の行だけで出したもの。slot-end は ope -> 'by_slot' -> 'slot-end' に
--   参考値として分けてある（1枚目はログのまま2枚目だけ替えた場合。lift は無い）。
select to_char(date_trunc('month', created_at at time zone 'Asia/Tokyo'), 'YYYY-MM') as month,
       version,
       n_impressions,
       (ope ->> 'n')::int as ope_rows,
       (ope -> 'logged' ->> 'rate')::numeric as logged_rate,
       (ope -> 'rel_only' ->> 'snips')::numeric as rel_only_snips,
       (ope -> 'learned' ->> 'snips')::numeric as learned_snips,
       (ope ->> 'lift_snips')::numeric as lift_snips,
       (ope ->> 'lift_ips')::numeric as lift_ips,
       (ope -> 'rel_only' ->> 'ess')::numeric as rel_only_ess,
       (ope -> 'learned' ->> 'ess')::numeric as learned_ess,
       (ope -> 'rel_only' ->> 'clipped')::int as rel_only_clipped,
       (ope -> 'learned' ->> 'clipped')::int as learned_clipped,
       (ope ->> 'in_sample')::boolean as in_sample
from (
  select distinct on (date_trunc('month', created_at at time zone 'Asia/Tokyo')) *
  from public.nq_model
  order by date_trunc('month', created_at at time zone 'Asia/Tokyo'), created_at desc
) last_of_month
order by month desc
limit 13;


-- ---------- 8. other・低確信率（軸ごと） ----------
-- 軸ごとに「other／不明を選んだ」または「確信度が 0.6 未満だった」判定の割合。2割を超えたら警告。
-- 高い軸はラベルの見直しかブロックの追加を考える。こちらはセッションではなく判定の単位で数える
-- （ルールに当たるかどうかは判定ごとに決まるため）。
with p as (select * from public.nq_month_range(-1)),
d as (
  select dd.answers from public.nq_decisions dd, p
  where dd.created_at >= p.t0 and dd.created_at < p.t1 and dd.answers is not null
)
select k.axis,
       count(*) as decisions,
       count(*) filter (where d.answers -> k.axis ->> 'choice' is null or d.answers -> k.axis ->> 'choice' in ('other', '不明・その他')) as chose_other,
       count(*) filter (where (d.answers -> k.axis ->> 'confidence')::numeric < 0.6) as low_confidence,
       round(count(*) filter (where d.answers -> k.axis ->> 'choice' is null
                                 or d.answers -> k.axis ->> 'choice' in ('other', '不明・その他')
                                 or (d.answers -> k.axis ->> 'confidence')::numeric < 0.6)::numeric / nullif(count(*), 0), 4) as other_or_low_rate,
       case when count(*) filter (where d.answers -> k.axis ->> 'choice' is null
                                    or d.answers -> k.axis ->> 'choice' in ('other', '不明・その他')
                                    or (d.answers -> k.axis ->> 'confidence')::numeric < 0.6)::numeric / nullif(count(*), 0) > 0.2
            then '警告（2割超）' else '' end as alert
from d cross join (values ('visitor_type'), ('industry'), ('need')) as k(axis)
group by k.axis
order by other_or_low_rate desc nulls last;

-- 提案カードの関連度（rel_*）の側。どのカードも関連度の門（0.55）に届かなかった判定の割合と、
-- 関連度は足りたのに出せなかったカード（未承認・業種版なしなど）の内訳。後者が多ければ承認か業種版が足りない。
-- excluded = 'visitor_type' は、訪問者タイプで対象外にしたカード（blocks.json の only_visitor_types。sg-recruit は
-- 「求職者・学生」だけ）。意図した除外で、承認や業種版の不足ではないので、どちらの集計からも外す。
with p as (select * from public.nq_month_range(-1)),
d as (
  select dd.decision_id, dd.candidates from public.nq_decisions dd, p
  where dd.created_at >= p.t0 and dd.created_at < p.t1 and dd.candidates is not null
),
per_decision as (
  select d.decision_id,
         max((c ->> 'rel')::numeric) filter (where c ->> 'excluded' is null) as max_rel_deliverable,
         max((c ->> 'rel')::numeric) filter (where c ->> 'excluded' is distinct from 'visitor_type') as max_rel_any
  from d left join lateral jsonb_array_elements(d.candidates) as c on true
  group by d.decision_id
)
select count(*) as decisions,
       count(*) filter (where coalesce(max_rel_deliverable, 0) < 0.55) as below_gate,
       round(count(*) filter (where coalesce(max_rel_deliverable, 0) < 0.55)::numeric / nullif(count(*), 0), 4) as below_gate_rate,
       count(*) filter (where coalesce(max_rel_deliverable, 0) < 0.55 and max_rel_any >= 0.55) as blocked_by_exclusion
from per_decision;

with p as (select * from public.nq_month_range(-1))
select c ->> 'block_id' as block_id,
       c ->> 'excluded' as excluded,
       count(*) as decisions
from public.nq_decisions dd, p, jsonb_array_elements(dd.candidates) as c
where dd.created_at >= p.t0 and dd.created_at < p.t1
  and dd.candidates is not null
  and c ->> 'excluded' not in ('rel_floor', 'visitor_type')
  and (c ->> 'rel')::numeric >= 0.55
group by 1, 2
order by decisions desc;


-- ---------- 9. ホールドアウト比較 ----------
-- 記事に着地したセッションの「記事→サービス遷移率」を、ホールドアウト（常にデフォルト）と適用群で比べる。
-- シャドーモードのセッションは全員デフォルトなので除く。
-- 件数がたまるまで結論を出さない: 5%→8% の差を有意水準5%・検出力80%で確かめるには、ホールドアウト約600、
-- 適用群約2,400 セッションが要る。それまでは4週間単位で傾向だけを見る。z は2群の比率の差の検定統計量
-- （|z| ≥ 1.96 で5%有意）。件数が足りないうちの z は当てにしない。
with p as (select * from public.nq_month_range(-1)),
s as (
  select x.* from p, public.nq_session_summary(p.t0, p.t1) x
  where x.landing_type = '記事' and not x.shadow
),
g as (
  select case when holdout then 'holdout' else 'applied' end as grp,
         count(*)::numeric as n,
         count(*) filter (where reached_service)::numeric as service,
         count(*) filter (where reached_goal)::numeric as goal
  from s group by 1
),
pooled as (
  select sum(service) / nullif(sum(n), 0) as rate, sum(1 / n) as inv_n from g where n > 0
)
select g.grp,
       g.n::int as article_sessions,
       g.service::int as reached_service,
       round(g.service / nullif(g.n, 0), 4) as service_rate,
       g.goal::int as reached_goal,
       round(g.goal / nullif(g.n, 0), 4) as goal_rate,
       round((select (max(service / n) filter (where grp = 'applied') - max(service / n) filter (where grp = 'holdout')) from g where n > 0), 4) as service_rate_diff,
       round((select (max(service / n) filter (where grp = 'applied') - max(service / n) filter (where grp = 'holdout')) from g where n > 0)
             / nullif(sqrt((select rate * (1 - rate) * inv_n from pooled)), 0), 2) as z,
       case when g.grp = 'holdout' and g.n < 600 then '件数不足（目安600）'
            when g.grp = 'applied' and g.n < 2400 then '件数不足（目安2,400）'
            else '' end as note
from g
order by g.grp;


-- =====================================================================
-- KPI（1章）
-- =====================================================================

-- ---------- K1. 提案カード CTR ----------
-- カード（sg-*）を表示したセッションのうち、クリックしたセッションの割合。主 KPI。
-- 訪問者タイプ別。ブロック別は上の 5 を見る。mode は 5 と同じ（判定で差し替えた表示か、デフォルト表示か。
-- decision_id の有無ではなく、判定ログの is_default とスロットの block_id の一致で決める）。
-- シャドーモードの期間は全表示が default に入る（personalized が 0 行で正しい）。
with p as (select * from public.nq_month_range(-1)),
e as (
  select ev.session_id,
         case when d.is_default is false and d.slots -> ev.slot ->> 'block_id' = ev.block_id
              then 'personalized' else 'default' end as mode,
         bool_or(ev.type = 'shown') as shown,
         bool_or(ev.type = 'click') as clicked
  from public.nq_events ev
  cross join p
  left join public.nq_decisions d on d.decision_id = ev.decision_id
  where ev.created_at >= p.t0 and ev.created_at < p.t1
    and ev.type in ('shown', 'click') and ev.block_id like 'sg-%'
  group by 1, 2
),
-- 月をまたいだセッション（月末に始まり、月初に表示）のタイプも引けるよう、要約は1日前から取る。
s as (select x.session_id, x.answers from p, public.nq_session_summary(p.t0 - interval '1 day', p.t1) x),
j as (
  select e.mode, e.shown, e.clicked,
         coalesce(s.answers -> 'visitor_type' ->> 'choice', '(判定なし)') as visitor_type
  from e left join s using (session_id)
)
select mode,
       case when grouping(visitor_type) = 1 then '(全体)' else visitor_type end as visitor_type,
       count(*) filter (where shown) as sessions_shown,
       count(*) filter (where shown and clicked) as sessions_clicked,
       round(count(*) filter (where shown and clicked)::numeric / nullif(count(*) filter (where shown), 0), 4) as card_ctr
from j
group by grouping sets ((mode, visitor_type), (mode))
order by mode, grouping(visitor_type) desc, sessions_shown desc;


-- ---------- K2. 記事→サービス遷移率 ----------
-- 記事に着地したセッションのうち、サービス系ページ（2章の中間層）に到達した割合。主 KPI。
-- /subsidy もここの到達先に数える（K3 には数えない。理由と拾える範囲は冒頭「前提と限界」）。
-- ホールドアウトとの比較は上の 9。ここは月ごとの推移（直近6か月。適用群・ホールドアウト・シャドーの別）。
select to_char(date_trunc('month', x.first_at at time zone 'Asia/Tokyo'), 'YYYY-MM') as month,
       case when x.shadow then 'shadow' when x.holdout then 'holdout' else 'applied' end as grp,
       count(*) as article_sessions,
       count(*) filter (where x.reached_service) as reached_service,
       round(count(*) filter (where x.reached_service)::numeric / nullif(count(*), 0), 4) as service_rate
from public.nq_month_range(-6) a, public.nq_month_range(-1) b, public.nq_session_summary(a.t0, b.t1) x
where x.landing_type = '記事'
group by 1, 2
order by 1 desc, 2;


-- ---------- K3. 相談・資料DL到達率 ----------
-- ゴール（/diagnostic・/guidebook への到達、資料請求フォームの送信）に着いたセッションの割合。
-- /subsidy への到達は含めない（nq_goal が出ない。K2 の側で数える）。
-- 件数が少ないので方向性の確認だけに使う。
with p as (select * from public.nq_month_range(-1)),
s as (
  select case when x.shadow then 'shadow' when x.holdout then 'holdout' else 'applied' end as grp, x.reached_goal
  from p, public.nq_session_summary(p.t0, p.t1) x
)
select case when grouping(grp) = 1 then '(全体)' else grp end as grp,
       count(*) as sessions,
       count(*) filter (where reached_goal) as reached_goal,
       round(count(*) filter (where reached_goal)::numeric / nullif(count(*), 0), 4) as goal_rate
from s
group by grouping sets ((grp), ())
order by grouping(grp) desc, 1;

-- ゴールの種類別（セッション数）。
with p as (select * from public.nq_month_range(-1))
select ev.goal, count(distinct ev.session_id) as sessions
from public.nq_events ev, p
where ev.created_at >= p.t0 and ev.created_at < p.t1 and ev.type = 'goal'
group by ev.goal
order by sessions desc;


-- ---------- K4. other・低確信率 ----------
-- 判定が「出さない」（どのルールにも当たらずデフォルト）だった割合。候補ブロック不足の検知に使う。
-- ホールドアウトとシャドーの判定も数える（slots には「出していたら何だったか」が残っている）。
-- モデルの失敗・タイムアウト（answers が null）は別に数える。軸ごとの内訳は上の 8。
-- latency_p90_ms は Jev の呼び出しだけの時間（model_timeout_ms = 900 で頭打ち）。関数の起動待ち・ログ書き込み・
-- 往復の通信を含まないので、必ず 1200 未満になる。訪問者から見た応答時間は下の K5。
with p as (select * from public.nq_month_range(-1)),
d as (
  select dd.* from public.nq_decisions dd, p
  where dd.created_at >= p.t0 and dd.created_at < p.t1
)
select case when grouping(trigger) = 1 then '(全体)' else trigger end as trigger,
       count(*) as decisions,
       count(*) filter (where answers is null) as model_failed,
       round(count(*) filter (where answers is null)::numeric / nullif(count(*), 0), 4) as model_failed_rate,
       count(*) filter (where answers is not null and (slots is null or slots = '{}'::jsonb)) as judged_default,
       round(count(*) filter (where answers is not null and (slots is null or slots = '{}'::jsonb))::numeric
             / nullif(count(*) filter (where answers is not null), 0), 4) as other_or_low_rate,
       round((percentile_cont(0.9) within group (order by latency_ms))::numeric, 0) as latency_p90_ms
from d
group by grouping sets ((trigger), ())
order by grouping(trigger) desc, 1;


-- ---------- K5. /api/suggest の応答が間に合った割合（フェーズ1の完了条件） ----------
-- ブラウザが /api/suggest を呼んだ回のうち、採用できる応答が client_timeout_ms（1.2秒）以内に届いた割合。
-- 設計書13章のフェーズ1の完了条件「応答の9割が1.2秒以内」は、within_1200_rate が 0.9 以上かで判定する。
-- もとは nq_events の type = 'decide'（ブラウザが呼び出し1回につき必ず1行送る。config.events_api が true のとき）。
--   ok      採用できる応答が届いた（ホールドアウト・シャドー・確信不足の default:true も ok。間に合ったかだけを見る）
--   timeout 1.2秒で打ち切った。関数の起動待ち（コールドスタート）・Jev の遅さ・回線の遅さを区別しない
--   http / format / network  HTTP エラー・JSON でない応答・通信の失敗
-- どの回も、ok 以外は訪問者にデフォルトが出ている。latency_ms はブラウザで測った往復時間で、K4 の latency_p90_ms
-- （Jev の呼び出しだけ）とは別物。ok_p50_ms / ok_p90_ms は間に合った回だけの分布なので、1200 を超えない。
-- ページを閉じて応答を待たなかった回は、どの result にもならず行が無い（分子にも分母にも入らない）。
-- timeout_rate が高いのに K4 の model_failed_rate が低ければ、遅いのは Jev ではなく関数の起動か回線。
-- 期間を変えるときは p を置き換える（フェーズ1の1週間なら冒頭の「4週間単位」の書き方で t0 / t1 を直に書く）。
with p as (select * from public.nq_month_range(-1)),
c as (
  select ev.page_url, ev.result, ev.latency_ms
  from public.nq_events ev, p
  where ev.created_at >= p.t0 and ev.created_at < p.t1 and ev.type = 'decide' and ev.result is not null
)
select case when grouping(public.nq_page_group(page_url)) = 1 then '(全体)' else coalesce(public.nq_page_group(page_url), '(不明)') end as page_group,
       count(*) as calls,
       count(*) filter (where result = 'ok' and coalesce(latency_ms, 0) <= 1200) as within_1200,
       round(count(*) filter (where result = 'ok' and coalesce(latency_ms, 0) <= 1200)::numeric / nullif(count(*), 0), 4) as within_1200_rate,
       count(*) filter (where result = 'timeout') as timeout,
       round(count(*) filter (where result = 'timeout')::numeric / nullif(count(*), 0), 4) as timeout_rate,
       count(*) filter (where result in ('http', 'format', 'network')) as other_fail,
       round((percentile_cont(0.5) within group (order by latency_ms) filter (where result = 'ok'))::numeric, 0) as ok_p50_ms,
       round((percentile_cont(0.9) within group (order by latency_ms) filter (where result = 'ok'))::numeric, 0) as ok_p90_ms,
       case when count(*) < 100 then '件数不足（目安100）' else '' end as note
from c
group by grouping sets ((public.nq_page_group(page_url)), ())
order by grouping(public.nq_page_group(page_url)) desc, calls desc;

-- 突き合わせ: サーバは判定を記録したのに、ブラウザは待ちきれなかった回（= 判定ログには served と残るが、訪問者には
-- デフォルトが出た回）。decide の行は打ち切った回の decision_id を持たないので、セッションと時刻の近さで数える。
-- フェーズ2以降にこの数が多いと、適用群の実質の個別化率が判定ログの見かけより低い。
with p as (select * from public.nq_month_range(-1))
select count(*) as timeouts,
       count(*) filter (where exists (
         select 1 from public.nq_decisions d
         where d.session_id = ev.session_id and d.page_url is not distinct from ev.page_url
           and d.created_at between ev.created_at - interval '10 seconds' and ev.created_at + interval '10 seconds'
       )) as server_logged_anyway,
       count(*) filter (where exists (
         select 1 from public.nq_decisions d
         where d.session_id = ev.session_id and d.page_url is not distinct from ev.page_url and d.is_default is false
           and d.created_at between ev.created_at - interval '10 seconds' and ev.created_at + interval '10 seconds'
       )) as served_but_not_seen
from public.nq_events ev, p
where ev.created_at >= p.t0 and ev.created_at < p.t1 and ev.type = 'decide' and ev.result = 'timeout';


-- =====================================================================
-- 付録
-- =====================================================================

-- 13か月より前の月（生ログは消えている）。nq_monthly の件数から主な割合を出す。
-- answers の中は件数が1件以上あったラベルだけがキーになる（nq_snapshot_month の jsonb_object_agg）。
-- 0件のラベルはキーごと無いので、両方とも coalesce で 0 にしてから足す（片方でも null だと和が null になる）。
-- 判定が0件の月（sessions_judged = 0）は nullif で null のまま。
select to_char(month, 'YYYY-MM') as month,
       (metrics ->> 'sessions')::int as sessions,
       round((coalesce((metrics -> 'answers' -> 'visitor_type' ->> '発注検討中の事業者')::numeric, 0)
              + coalesce((metrics -> 'answers' -> 'visitor_type' ->> '情報収集中の事業者')::numeric, 0))
             / nullif((metrics ->> 'sessions_judged')::numeric, 0), 4) as prospect_rate,
       round((metrics -> 'holdout_compare' -> 'applied' ->> 'reached_service')::numeric
             / nullif((metrics -> 'holdout_compare' -> 'applied' ->> 'article_sessions')::numeric, 0), 4) as service_rate_applied,
       round((metrics -> 'holdout_compare' -> 'holdout' ->> 'reached_service')::numeric
             / nullif((metrics -> 'holdout_compare' -> 'holdout' ->> 'article_sessions')::numeric, 0), 4) as service_rate_holdout,
       round((metrics ->> 'sessions_goal')::numeric / nullif((metrics ->> 'sessions')::numeric, 0), 4) as goal_rate,
       round((metrics ->> 'judged_default')::numeric / nullif((metrics ->> 'judged')::numeric, 0), 4) as other_or_low_rate
from public.nq_monthly
order by month desc;

-- 遷移表の上位（夜間バッチが作り直した最新のもの）。どの記事からどこへ進んでいるか。
select from_url, to_url, count, goal_count,
       round(goal_count::numeric / nullif(count, 0), 3) as goal_share
from public.nq_transitions
where to_url not in ('(exit)')
order by count desc
limit 50;

-- V(ページ) の上位（最新のモデルの aux から）。ゴールに近いページがどこか。
select v.key as url, v.value::numeric as v
from (select aux from public.nq_model order by created_at desc limit 1) m,
     jsonb_each_text(m.aux -> 'V') as v(key, value)
order by v.value::numeric desc
limit 30;
