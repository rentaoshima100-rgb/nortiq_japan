# Jev (TypeSafe AI System One) API メモ — 2026-09-18 に公式ドキュメントで確認

出典: https://docs.typesafe.ai/api.md （公式・優先）、https://dev.to/valyuai/how-to-use-jev-a-practical-guide-to-typesafes-system-one-model-g5e 、https://vercel.com/ai-gateway/models/jev

## 直接API（公式リファレンス）
```
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer <API_KEY>
Content-Type: application/json
```
リクエスト（top-level）:
- `state` (string | object | array, 必須)
- `model` (string, 必須) — 本番は `jev-1.13.0` のように固定（設計書6章）。`jev-latest` は使わない。
- `questions` (map<string, Question>, 必須)

Question 共通: `type`（**小文字** `"noul"` | `"choice"` | `"score"`）、`instructions`（必須）
- noul: `criteria` 任意 `{"true": "...", "false": "..."}`
- choice: `criteria` 必須 map<option_key, 説明文|null>（最大255択）
- score: `criteria` 必須 array（順序付きレベル説明、2〜10個）

レスポンス:
```json
{
  "model": "jev-1.13.0",
  "answers": {
    "q_choice": { "type": "choice", "choice": "billing", "probabilities": {"billing":0.92,"technical":0.05,"sales":0.03}, "confidence": 0.92 },
    "q_score":  { "type": "score", "score": 1.2, "legend": {...}, "probabilities": {...}, "confidence": 0.70 },
    "q_noul":   { "type": "noul", "noul": 0.95 }
  },
  "usage": { "input_tokens": 0, "output_tokens": 0 }
}
```
注意: DEV記事の例では type が "Choice"/"Score"/"Noul"（先頭大文字）、score の probabilities が配列になっている。公式リファレンスは小文字・map。**実装は公式に従い、レスポンスのパースは配列/マップ両対応にして防御的に書く。**

エラー: 401 / 422 / 429 / 529。429・529 は指数バックオフ推奨だが、当機能は 1.2 秒タイムアウトでデフォルトに落とすのでリトライしない。

制限: 合計64kトークン、state 32k。レート 1,200 req/min。レイテンシ 70〜500ms。料金 入力 $0.042/MTok、出力無料。

## Vercel AI Gateway 経由
- model id: `typesafe-ai/jev`
- AI SDK: `import { experimental_evaluate as evaluate } from 'ai'` → `evaluate({ model: 'typesafe-ai/jev', state, questions })`
- Gateway 経由の質問 type 名やバージョン固定方法は公式ページからは確定できなかった（例では `type: 'boolean'`）。→ 初期実装は直接API（fetch、依存追加なし）を既定とし、Gateway はアダプタ差し替えポイントとしてコメントで残す。

## Jev の苦手（設計に効くもの）
- 文字どおりに読む（否定・含みは誤判定）→ audience は肯定文。
- 数えられない／数値比較・日付計算が苦手 → 秒数やスクロール率はコード側で言葉に変換。
- state が不要情報で埋まると精度低下 → 直近5ページだけ。
- state は敵対的入力に弱い → 訪問者の自由文を入れない。**サーバー側で state を許可語彙（catalog 由来の title/type とコードが付けたラベル）に再構成・検証する**のが安全。
- SDK: `@typesafe-ai/sdk`（Node 20+）。ただし当リポジトリの api/ は依存を増やさない方針が無難（fetch で足りる）。

## 実キーでの疎通確認（2026-09-20、日本のローカルPCから）
- `POST https://api.typesafe.ai/v1/systemone` に `model: "jev-1.13.0"`、`type` 小文字、**日本語ラベルをそのまま choice の criteria キーにした質問**で 200。公式リファレンスどおりの形で返る。
  - choice: `{type, choice, confidence, probabilities:{ラベル: p}}`
  - score: `{type, score, confidence, legend:{"0":…}, probabilities:{"0":p, "1":p, …}}`（**マップ。キーは文字列の段階番号**）
  - noul: `{type, noul}`
  - `usage: {input_tokens, output_tokens}`（5問・設計書6章の例の state で入力 約1,100トークン）
- 設計書6章の例の state（リニューアル費用の記事をじっくり→料金プランを流し見）への回答: visitor_type「情報収集中の事業者」0.65、stage 1.02、concern_cost 0.87、rel_sg-pricing 0.80、rel_sg-recruit 0.03。日本語の状態と指示文で意図どおりに動く。
- レイテンシ（日本から。Vercel の関数からではない）: 新規接続の1回目は 1.6〜4.2 秒、同一プロセスで接続を使い回すと 0.46〜0.9 秒。
  **設計書の「1.2秒以内」は、コールドスタートと新規 TLS 接続が重なると超える。** サーバ側の Jev タイムアウト（`data/nq-rules.json` の `model_timeout_ms` 900）は
  シャドーモードで Vercel からの実測（nq_decisions.latency_ms の分布）を見てから決め直す。関数のリージョンを Jev に近づけるかどうかも同じ実測で判断する。
  - **`nq_decisions.latency_ms` は Jev の呼び出しだけの時間で、`model_timeout_ms` で頭打ちになる。** 関数のコールドスタートと往復の通信を含まないので、
    設計書の完了条件「応答の9割が1.2秒以内」はこの列では判定できない。そちらはブラウザが送る `nq_decide` / `nq_decide_fail`
    （`nq_events` の `type = 'decide'`。`supabase/nq_report.sql` の K5）で測る。この列は「遅い原因が Jev かどうか」の切り分けに使う。
- 範囲外の数値: Jev の応答に 0〜1（score は 0〜段階数−1）の外の数値があると、その値は丸めずに「回答なし」（null）として扱い、
  `[nq] jev out_of_range <個数>` をログに出す（百分率で返るようになった場合に、確信度 1.0 として個別化が出てしまうのを防ぐ）。
  `JEV_MODEL` を変えた直後や、Gateway 経由に切り替えた直後はこの行を確認する。
- キーの置き場: ローカルは `.env.local`（.gitignore 済み）、本番は Vercel の Environment Variables の `JEV_API_KEY`。リポジトリ・ドキュメント・ログには書かない。
