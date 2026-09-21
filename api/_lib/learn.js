// 次ページ提案（nq）— 夜間バッチの数学（設計書7章「3. 特徴量」の V と cov、「4. モデル」、「6. 評価」）。
//
// ここに置くのは純関数だけ。Supabase の読み書きは api/nq-train.js が行い、ここには配列で渡す。
// 外部を呼ばず、時刻も乱数も引数でもらうので、合成データのテスト（learn.test.js）でそのまま確かめられる。
//
//   1. fitLogistic / fitModel   ガウス事前分布つきロジスティック回帰の MAP（ニュートン法）と、
//                               ヘッセ行列の逆行列の対角（ラプラス近似の分散）
//   2. buildTrainingRows        nq_decisions と nq_events を突き合わせ、表示されたカードごとに1行
//   3. sessionPaths / buildTransitions / solveValues / buildCov
//                               閲覧履歴 → 遷移表 → 吸収マルコフ連鎖の V(ページ) と、遷移割合の対数比
//   4. evaluatePolicies         選択確率の逆数で重みづけしたオフポリシー評価（IPS / 自己正規化 IPS）。
//                               比べるのは1枚目のスロットの行だけ（slot-end は参考値として by_slot に分ける）
//
// 重みは23個前後（共有10 ＋ カード別）しかないので、行列は素の配列で解く。
// 重みの名前と特徴量の並びは features.js が正（FEATURES と 'card:<block_id>'）。

const { FEATURES, cardKey, linearScore } = require('./features');

const GOAL = '(goal)'; // 遷移表の吸収状態。URL は必ず '/' で始まるので衝突しない
const EXIT = '(exit)';
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOT_END = FEATURES.indexOf('slot_end');
const SLOT_NEXT = FEATURES.indexOf('slot_next');

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const fin = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round = (v, digits) => { const m = 10 ** digits; return Math.round(v * m) / m; };
const timeOf = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? t : null; };

// ---------- 1. ロジスティック回帰の MAP ----------

// 対称正定値行列のコレスキー分解 A = L·Lᵀ。正定値でなければ null。
function cholesky(A) {
  const n = A.length;
  const L = A.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (!(s > 0)) return null;
        L[i][i] = Math.sqrt(s);
      } else {
        L[i][j] = s / L[j][j];
      }
    }
  }
  return L;
}

// L·Lᵀ·x = b を解く（前進代入 → 後退代入）。
function cholSolve(L, b) {
  const n = L.length;
  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k];
    y[i] = s / L[i][i];
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

// (L·Lᵀ)⁻¹ の対角。M = L⁻¹ とすると逆行列は Mᵀ·M なので、対角は M の列ごとの二乗和。
function cholInverseDiag(L) {
  const n = L.length;
  const diag = new Array(n).fill(0);
  for (let c = 0; c < n; c++) {
    // M の c 列目を、L·m = e_c の前進代入で求める（c より上の行は 0）。
    const m = new Array(n).fill(0);
    for (let i = c; i < n; i++) {
      let s = i === c ? 1 : 0;
      for (let k = c; k < i; k++) s -= L[i][k] * m[k];
      m[i] = s / L[i][i];
      diag[c] += m[i] * m[i];
    }
  }
  return diag;
}

// log(1 + e^z) を桁あふれさせずに計算する。
const softplus = (z) => (z > 0 ? z + Math.log1p(Math.exp(-z)) : Math.log1p(Math.exp(z)));
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

// ガウス事前分布 N(priorMean, diag(priorVar)) つきロジスティック回帰の MAP 推定。
//   rows: [{ x: number[K], y: 0|1, weight }]
//   -> { mean: number[K], variance: number[K], iterations, converged, n }
// 最小化するのは  Σ weight·( log(1+e^z) − y·z ) + ½·Σ (θ−μ)²/s²  （z = θ·x）。
// 事前分布の項があるので狭義の凸で、ヘッセ行列は必ず正定値になる。カード別の補正と切片は
// データだけでは分けられない（ワンホットの和が切片と同じ）が、事前分布が分け方を決める。
// 行が0件なら事前分布をそのまま返す（「データが0件の日、順位は関連度の順と一致する」の根拠）。
function fitLogistic({ rows, priorMean, priorVar, maxIter, tol } = {}) {
  const K = priorMean.length;
  const data = (Array.isArray(rows) ? rows : []).filter((r) => r && Array.isArray(r.x) && r.x.length === K && fin(r.weight) != null && r.weight > 0);
  if (!data.length) return { mean: priorMean.slice(), variance: priorVar.slice(), iterations: 0, converged: true, n: 0 };

  const limit = maxIter > 0 ? maxIter : 50;
  const eps = tol > 0 ? tol : 1e-8;
  const prec = priorVar.map((v) => 1 / v);
  const dot = (t, x) => { let z = 0; for (let k = 0; k < K; k++) if (x[k] !== 0) z += t[k] * x[k]; return z; };

  const objective = (t) => {
    let f = 0;
    for (const r of data) { const z = dot(t, r.x); f += r.weight * (softplus(z) - (r.y ? z : 0)); }
    for (let k = 0; k < K; k++) f += 0.5 * prec[k] * (t[k] - priorMean[k]) ** 2;
    return f;
  };
  // 勾配とヘッセ行列。x はワンホットでほとんど 0 なので、0 の要素は飛ばす。
  const derivatives = (t) => {
    const g = new Array(K).fill(0);
    const H = Array.from({ length: K }, () => new Array(K).fill(0));
    for (const r of data) {
      const p = sigmoid(dot(t, r.x));
      const gi = r.weight * (p - (r.y ? 1 : 0));
      const hi = r.weight * p * (1 - p);
      for (let a = 0; a < K; a++) {
        const xa = r.x[a];
        if (xa === 0) continue;
        g[a] += gi * xa;
        for (let b = 0; b <= a; b++) if (r.x[b] !== 0) H[a][b] += hi * xa * r.x[b];
      }
    }
    for (let a = 0; a < K; a++) {
      g[a] += prec[a] * (t[a] - priorMean[a]);
      H[a][a] += prec[a];
      for (let b = 0; b < a; b++) H[b][a] = H[a][b];
    }
    return { g, H };
  };
  // 数値誤差で分解に失敗したときだけ、対角をわずかに持ち上げてやり直す。
  const factor = (H) => {
    let L = cholesky(H);
    for (let bump = 1e-10; !L && bump < 1; bump *= 100) {
      L = cholesky(H.map((row, i) => row.map((v, j) => (i === j ? v + bump : v))));
    }
    if (!L) throw new Error('hessian_not_positive_definite');
    return L;
  };

  let theta = priorMean.slice();
  let f = objective(theta);
  let iterations = 0;
  let converged = false;
  while (iterations < limit && !converged) {
    iterations++;
    const { g, H } = derivatives(theta);
    const step = cholSolve(factor(H), g);
    if (Math.max(...step.map(Math.abs)) < eps) { converged = true; break; }
    const slope = g.reduce((s, gk, k) => s + gk * step[k], 0);
    // ニュートン法の1歩が行き過ぎたら半分ずつ縮める（成果がまれなデータでは最初の数歩が大きくなりやすい）。
    let a = 1;
    let next = theta.map((t, k) => t - step[k]);
    let fNext = objective(next);
    while (fNext > f - 1e-4 * a * slope && a > 1e-8) {
      a /= 2;
      next = theta.map((t, k) => t - a * step[k]);
      fNext = objective(next);
    }
    const moved = Math.max(...step.map((s) => Math.abs(a * s)));
    if (fNext <= f) { theta = next; f = fNext; }
    if (moved < eps) converged = true;
  }

  const variance = cholInverseDiag(factor(derivatives(theta).H));
  return { mean: theta, variance, iterations, converged, n: data.length };
}

// 学習行（buildTrainingRows の戻り値）→ 事後分布。重みは「名前 → 数値」で受けて返す。
//   prior: features.priorModel(cardIds) の { mean, variance }。名前の集合がそのまま重みの集合になる。
// ログにしか残っていないカード（blocks.json から外したカード）の補正も学習したければ、
// 呼び出し側が priorModel に渡す cardIds に足しておく。prior に無いカードの行は、補正なしで学習に使う。
function fitModel({ rows, prior, maxIter, tol } = {}) {
  const keys = Object.keys(prior.mean);
  const index = {};
  keys.forEach((k, i) => { index[k] = i; });
  const design = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || !Array.isArray(r.features) || r.features.length !== FEATURES.length) continue;
    const x = new Array(keys.length).fill(0);
    FEATURES.forEach((name, i) => { if (has(index, name)) x[index[name]] = r.features[i]; });
    const ck = cardKey(r.block_id);
    if (has(index, ck)) x[index[ck]] = 1;
    design.push({ x, y: r.y ? 1 : 0, weight: r.weight });
  }
  const fit = fitLogistic({
    rows: design,
    priorMean: keys.map((k) => prior.mean[k]),
    priorVar: keys.map((k) => prior.variance[k]),
    maxIter,
    tol,
  });
  const mean = {};
  const variance = {};
  keys.forEach((k, i) => {
    // 0件のときは事前分布と1ビットも違わない値を返したいので、丸めない。
    mean[k] = fit.n ? round(fit.mean[i], 6) : fit.mean[i];
    variance[k] = fit.n ? Math.max(round(fit.variance[i], 8), 1e-8) : fit.variance[i];
  });
  return { mean, variance, n_impressions: fit.n, n_positive: design.filter((d) => d.y === 1).length, iterations: fit.iterations, converged: fit.converged };
}

// ---------- 2. 学習行の組み立て ----------

// ログの features は1枚目のスロット（slots[0]）での値。スロットで変わるのは slot_end / slot_next の
// 2つだけなので、実際に表示されたスロットの値に置き直す。
function featuresForSlot(features, slot) {
  const x = features.slice();
  if (SLOT_END >= 0) x[SLOT_END] = slot === 'slot-end' ? 1 : 0;
  if (SLOT_NEXT >= 0) x[SLOT_NEXT] = slot === 'slot-next' ? 1 : 0;
  return x;
}

const validFeatures = (f) => Array.isArray(f) && f.length === FEATURES.length && f.every((v) => fin(v) != null);
const basePolicy = (p) => (typeof p === 'string' ? p.split('+')[0] : null);

// 表示されたカードごとに1行。
//   decisions: nq_decisions の行（decision_id, created_at, session_id, candidates, slots, policy,
//              is_default / holdout / shadow）
//   events:    nq_events の行（created_at, decision_id, session_id, type, slot, block_id）
//   policies:  学習に混ぜてよい方策のバージョン（'+explore' を除いた文字列）。FEATURES の並びを
//              変えたらバージョンが上がるので、古い並びの features を混ぜずに済む
//   -> [{ decision_id, session_id, slot, block_id, features, y, goal, weight, propensity, pool, age_days }]
//
// 対象は、推薦アルゴリズムが選び（slots に propensity が付いている）、画面に入った（shown）カードだけ。
// ルールが直接置いたカード（sg-recruit、rs-*）や、ホールドアウト・シャドー・デフォルトの判定は入れない。
// 成果 y は「クリック後に engaged」で 1。クリックしたあと同じセッションでゴールに着いた場合も 1 とし、
// その行の重みを goalWeight 倍にする（設計書7章「4. モデル」の「ゴール到達は3倍の重みで数える」）。
// 重みには半減期 halfLifeDays の時間減衰を掛ける。
// pool は「そのスロットで選択肢だったカード」。オフポリシー評価が別の方策の選択を再現するのに使う。
function buildTrainingRows({ decisions, events, now, halfLifeDays, goalWeight, policies } = {}) {
  const halfLife = halfLifeDays > 0 ? halfLifeDays : 60;
  const gw = goalWeight > 0 ? goalWeight : 3;
  const nowMs = fin(now) != null ? now : Date.now();
  const allow = Array.isArray(policies) && policies.length ? new Set(policies) : null;

  // decision_id → { shown: Set('slot|block'), click: {block: 最初の時刻}, engaged: {block: 最初の時刻} }
  const byDecision = new Map();
  const goalTimes = new Map(); // session_id → [時刻]
  for (const e of Array.isArray(events) ? events : []) {
    if (!isObj(e)) continue;
    const t = timeOf(e.created_at);
    if (e.type === 'goal') {
      if (typeof e.session_id === 'string' && t != null) {
        if (!goalTimes.has(e.session_id)) goalTimes.set(e.session_id, []);
        goalTimes.get(e.session_id).push(t);
      }
      continue;
    }
    if (typeof e.decision_id !== 'string' || typeof e.block_id !== 'string') continue;
    if (!byDecision.has(e.decision_id)) byDecision.set(e.decision_id, { shown: new Set(), click: {}, engaged: {} });
    const rec = byDecision.get(e.decision_id);
    if (e.type === 'shown' && typeof e.slot === 'string') rec.shown.add(e.slot + '|' + e.block_id);
    if ((e.type === 'click' || e.type === 'engaged') && t != null) {
      const at = rec[e.type];
      if (!has(at, e.block_id) || t < at[e.block_id]) at[e.block_id] = t;
    }
  }

  const rows = [];
  const seen = new Set();
  for (const d of Array.isArray(decisions) ? decisions : []) {
    if (!isObj(d) || typeof d.decision_id !== 'string' || seen.has(d.decision_id)) continue;
    seen.add(d.decision_id);
    if (d.is_default === true || d.holdout === true || d.shadow === true) continue;
    if (allow && !allow.has(basePolicy(d.policy))) continue;
    if (!Array.isArray(d.candidates) || !isObj(d.slots)) continue;
    const ev = byDecision.get(d.decision_id);
    const at = timeOf(d.created_at);
    if (!ev || at == null) continue;

    for (const slot of Object.keys(d.slots)) {
      const placed = d.slots[slot];
      if (!isObj(placed) || typeof placed.block_id !== 'string' || fin(placed.propensity) == null) continue;
      const cand = d.candidates.find((c) => isObj(c) && c.block_id === placed.block_id && c.picked === slot);
      if (!cand || !validFeatures(cand.features)) continue;
      if (!ev.shown.has(slot + '|' + placed.block_id)) continue;

      const logged = isObj(cand.propensity) ? fin(cand.propensity[slot]) : null;
      const propensity = logged != null ? logged : placed.propensity;
      if (!(propensity > 0 && propensity <= 1)) continue;

      const id = placed.block_id;
      const clickAt = has(ev.click, id) ? ev.click[id] : null;
      const engagedAt = has(ev.engaged, id) ? ev.engaged[id] : null;
      // engaged はクリックした先でしか送られない。クリックの送信だけ落ちていても成果として数える。
      const from = clickAt != null ? clickAt : engagedAt;
      const goal = from != null && (goalTimes.get(d.session_id) || []).some((t) => t >= from);
      const y = engagedAt != null || goal ? 1 : 0;
      const ageDays = Math.max(0, (nowMs - at) / DAY_MS);

      const pool = d.candidates
        .filter((c) => isObj(c) && !c.excluded && typeof c.block_id === 'string' && validFeatures(c.features)
          && isObj(c.propensity) && fin(c.propensity[slot]) != null)
        .map((c) => ({ block_id: c.block_id, rel: fin(c.rel) == null ? 0 : c.rel, features: featuresForSlot(c.features, slot) }));

      rows.push({
        decision_id: d.decision_id,
        session_id: d.session_id,
        slot,
        block_id: id,
        features: featuresForSlot(cand.features, slot),
        y,
        goal,
        weight: 0.5 ** (ageDays / halfLife) * (goal ? gw : 1),
        propensity,
        pool,
        age_days: round(ageDays, 2),
      });
    }
  }
  return rows;
}

// ---------- 3. 遷移表・V(ページ)・cov ----------

// セッションごとの閲覧の道筋。
//   decisions: nq_decisions の行（session_id, created_at, page_url と、history か state）。
//              history は state の「閲覧履歴」（[{ title, type, 読み方 }]）。
//   events:    nq_events の行（session_id, created_at, type, page_url）
//   titleToUrl: catalog の title → URL
//   -> [{ session_id, path: [url, ...], goal: boolean }]
//
// 同じセッションは最後の判定だけ使う（閲覧履歴は積み上がるので、最後の1件が前の判定のぶんを含む）。
// ログの state には URL が無い（モデルに渡す文章だけを残している）ので、title から catalog を逆引きする。
// 逆引きできないページ（catalog の再生成より先に公開された記事、改題された記事）は飛ばす。
// 最後の判定より後のページは、イベントの page_url でつなぐ。ゴールに着いたセッションは、
// ゴールのイベントが起きたページで道筋を打ち切る（その先の回遊は「ゴール到達後」なので V に入れない）。
function sessionPaths({ decisions, events, titleToUrl } = {}) {
  const lookup = isObj(titleToUrl) ? titleToUrl : {};
  const last = new Map();
  for (const d of Array.isArray(decisions) ? decisions : []) {
    if (!isObj(d) || typeof d.session_id !== 'string') continue;
    const t = timeOf(d.created_at);
    if (t == null) continue;
    const cur = last.get(d.session_id);
    if (!cur || t >= cur.t) last.set(d.session_id, { t, d });
  }
  const later = new Map(); // session_id → [{ t, type, url }]
  for (const e of Array.isArray(events) ? events : []) {
    if (!isObj(e) || !last.has(e.session_id)) continue;
    const t = timeOf(e.created_at);
    if (t == null) continue;
    if (!later.has(e.session_id)) later.set(e.session_id, []);
    later.get(e.session_id).push({ t, type: e.type, url: typeof e.page_url === 'string' && e.page_url[0] === '/' ? e.page_url : null });
  }

  const out = [];
  for (const [session_id, { t, d }] of last) {
    const path = [];
    const push = (u) => { if (u && path[path.length - 1] !== u) path.push(u); };
    const history = Array.isArray(d.history) ? d.history : (isObj(d.state) && Array.isArray(d.state['閲覧履歴']) ? d.state['閲覧履歴'] : []);
    for (const h of history) {
      if (isObj(h) && typeof h.title === 'string' && has(lookup, h.title)) push(lookup[h.title]);
    }
    if (typeof d.page_url === 'string' && d.page_url[0] === '/') push(d.page_url);

    const evs = (later.get(session_id) || []).sort((a, b) => a.t - b.t);
    const goalEv = evs.find((e) => e.type === 'goal') || null;
    for (const e of evs) {
      if (e.t < t) continue;
      if (goalEv && e.t > goalEv.t) break;
      push(e.url);
    }
    if (goalEv && goalEv.url) {
      const at = path.lastIndexOf(goalEv.url);
      if (at >= 0) path.length = at + 1; else push(goalEv.url);
    }
    if (path.length) out.push({ session_id, path, goal: Boolean(goalEv) });
  }
  return out;
}

// 道筋 → 遷移表（nq_transitions の行）。最後のページからは、ゴールに着いたセッションなら
// GOAL へ、そうでなければ EXIT へ1回遷移したものとして数える。
// goal_count は、その遷移のあとでゴールに着いたセッションの数。
function buildTransitions(paths) {
  const table = new Map();
  const add = (from, to, goal) => {
    const key = from + '\n' + to;
    if (!table.has(key)) table.set(key, { from_url: from, to_url: to, count: 0, goal_count: 0 });
    const row = table.get(key);
    row.count += 1;
    if (goal) row.goal_count += 1;
  };
  for (const p of Array.isArray(paths) ? paths : []) {
    if (!isObj(p) || !Array.isArray(p.path) || !p.path.length) continue;
    for (let i = 0; i + 1 < p.path.length; i++) add(p.path[i], p.path[i + 1], p.goal);
    add(p.path[p.path.length - 1], p.goal ? GOAL : EXIT, p.goal);
  }
  return Array.from(table.values()).sort((a, b) => b.count - a.count || (a.from_url + a.to_url < b.from_url + b.to_url ? -1 : 1));
}

// 遷移表の from ごとの合計と、行き先ごとの回数。
function outgoing(transitions) {
  const out = new Map(); // from → { total, to: Map(to → count) }
  for (const r of Array.isArray(transitions) ? transitions : []) {
    if (!isObj(r) || typeof r.from_url !== 'string' || typeof r.to_url !== 'string' || !(r.count > 0)) continue;
    if (r.from_url === r.to_url) continue;
    if (!out.has(r.from_url)) out.set(r.from_url, { total: 0, to: new Map() });
    const o = out.get(r.from_url);
    o.total += r.count;
    o.to.set(r.to_url, (o.to.get(r.to_url) || 0) + r.count);
  }
  return out;
}

const defaultTypeOf = (url) => (/^\/article-/.test(url) ? 'article' : 'other');

// V(ページ) = そのページを見たセッションが最終的にゴールへ着く確率。
// 遷移表を吸収マルコフ連鎖（吸収状態は GOAL と EXIT）とみなし、V = P·V を反復法で解く。
//   opts.typeOf(url) → ページ群。opts.shrink: 縮約の強さ（疑似件数）。
//   -> { V: {url: 値}, V_type: {type: 値}, raw: {url: 値}, visits: {url: 件数}, iterations }
// 件数の少ないページは、ページ群の平均（件数で重みづけ）へ寄せる:
//   V = (件数·raw + shrink·V_type) / (件数 + shrink)
// 数件しか見られていない記事の V は 0 か 1 に振れやすく、そのまま dv に入れると順位を乱す。
function solveValues(transitions, opts) {
  const o = opts || {};
  const typeOf = typeof o.typeOf === 'function' ? o.typeOf : defaultTypeOf;
  const shrink = fin(o.shrink) != null && o.shrink >= 0 ? o.shrink : 20;
  const tol = o.tol > 0 ? o.tol : 1e-10;
  const maxIter = o.maxIter > 0 ? o.maxIter : 2000;

  const out = outgoing(transitions);
  const raw = {};
  for (const from of out.keys()) raw[from] = 0;
  let iterations = 0;
  for (let delta = Infinity; iterations < maxIter && delta > tol;) {
    iterations++;
    delta = 0;
    for (const [from, row] of out) {
      let v = 0;
      // 行き先が遷移表の from に一度も出てこないページは、そこで離脱したものとして 0 で数える。
      for (const [to, count] of row.to) v += (count / row.total) * (to === GOAL ? 1 : to === EXIT ? 0 : (has(raw, to) ? raw[to] : 0));
      delta = Math.max(delta, Math.abs(v - raw[from]));
      raw[from] = v; // ガウス＝ザイデル法: 更新した値をその回のうちに使う
    }
  }

  const sums = {}; // type → { n, v }
  const visits = {};
  for (const [from, row] of out) {
    visits[from] = row.total;
    const type = typeOf(from) || 'other';
    if (!has(sums, type)) sums[type] = { n: 0, v: 0 };
    sums[type].n += row.total;
    sums[type].v += row.total * raw[from];
  }
  const V_type = {};
  for (const type of Object.keys(sums)) V_type[type] = round(sums[type].v / sums[type].n, 4);
  const V = {};
  for (const from of Object.keys(raw)) {
    const type = typeOf(from) || 'other';
    const n = visits[from];
    V[from] = round((n * raw[from] + shrink * (sums[type].v / sums[type].n)) / (n + shrink), 4);
  }
  return { V, V_type, raw, visits, iterations };
}

// cov[from][to] = log( P(to | from) / P(to) )。「現在のページから提案先へ実際に進んだ割合」を、
// サイト全体でそのページへ進む割合と比べた対数比。0 なら平均なみ、正ならこのページからよく進む。
//   opts.targets: 提案先になりうる URL。渡すと、その URL への cov だけを作る（aux を小さく保つ）。
//                 一度も進んでいない提案先にも、同じ式の値 log(smooth / (件数 + smooth)) を入れる
//   opts.smooth:  P(to) に寄せる疑似件数。件数の少ない from の値が極端にならないようにする
// 「進んでいない」の値を from の件数で入れたり入れなかったりしてはいけない。進んだ提案先には件数に
// よらず値が入るので、入れない側（features.js では 0）が「進んだが平均より少ない」（負の値）より上に
// なり、順序が逆になる。同じ式なら (回数 + smooth·P) > smooth·P なので、進んだ回数の多い提案先が
// 必ず上に来る。件数の少ない from では、平滑化で自然に 0 へ寄る（5件なら −0.22）。
function buildCov(transitions, opts) {
  const o = opts || {};
  const targets = Array.isArray(o.targets) ? new Set(o.targets) : null;
  const smooth = fin(o.smooth) != null && o.smooth >= 0 ? o.smooth : 20;

  const out = outgoing(transitions);
  let total = 0;
  const into = new Map();
  for (const row of out.values()) {
    total += row.total;
    for (const [to, count] of row.to) if (to !== GOAL && to !== EXIT) into.set(to, (into.get(to) || 0) + count);
  }
  const cov = {};
  if (!total) return cov;
  const value = (count, fromTotal, base) => round(Math.log(((count + smooth * base) / (fromTotal + smooth)) / base), 4);
  for (const [from, row] of out) {
    const line = {};
    for (const [to, count] of row.to) {
      if (to === GOAL || to === EXIT || (targets && !targets.has(to))) continue;
      line[to] = value(count, row.total, into.get(to) / total);
    }
    if (targets && smooth > 0) {
      for (const to of targets) {
        if (to === from || has(line, to) || !into.has(to)) continue;
        line[to] = value(0, row.total, into.get(to) / total);
      }
    }
    if (Object.keys(line).length) cov[from] = line;
  }
  return cov;
}

// ---------- 4. オフポリシー評価 ----------

// 関連度だけの順位（フェーズ1〜2 の方策が探索なしで選ぶカード）。同点は候補の並びで先の方。
function pickByRel(pool) {
  let best = 0;
  for (let i = 1; i < pool.length; i++) if (pool[i].rel > pool[best].rel) best = i;
  return pool[best].block_id;
}

// 重み（名前 → 数値）での期待値が最大のカード。同点の決め方は recommend.js の argmax と同じ。
function pickByWeights(pool, weights) {
  const scores = pool.map((c) => linearScore(weights, c.features, c.block_id));
  let best = 0;
  for (let i = 1; i < pool.length; i++) {
    if (scores[i] > scores[best] || (scores[i] === scores[best] && pool[i].rel > pool[best].rel)) best = i;
  }
  return pool[best].block_id;
}

// 決定的な方策 1つぶんの集計。ログのカードと方策の選択が一致した行だけが、1/選択確率 の重みで効く。
//
// clipped は、一致した行のうち重みが cap で打ち切られた行の数。prior-v1 のログでは、探索で選ばれた
// 「最大でないカード」の選択確率は 0.05/候補数 なので、重み（20×候補数）は候補が2枚以上なら必ず
// cap=20 に掛かる。学習後の順位が関連度の順位と食い違う行は探索行にしか無いから、その文脈の価値は
// 1/候補数 倍に縮み、ips は「学習後の順位」の下限にしかならない（真の改善がプラスでも、関連度だけの
// 順位との差は負に出る）。ess は打ち切り後の重みで計算するので、この偏りは ess では見えない。
// clipped が 0 でない ips は、方策どうしの比較に使ってはいけない。snips は符号を保つ。
function ipsAccumulator(cap) {
  let n = 0;
  let matched = 0;
  let clipped = 0;
  let sw = 0;
  let swy = 0;
  let sw2 = 0;
  return {
    add(row, chosen) {
      n++;
      if (chosen !== row.block_id) return;
      matched++;
      if (1 / row.propensity > cap) clipped++;
      const w = Math.min(1 / row.propensity, cap);
      sw += w;
      swy += w * (row.y ? 1 : 0);
      sw2 += w * w;
    },
    result() {
      return {
        matched,
        clipped,
        ips: n ? round(swy / n, 6) : null,
        snips: sw > 0 ? round(swy / sw, 6) : null,
        // 有効サンプル数。これが小さいうちは推定値を信用しない。
        ess: sw2 > 0 ? round((sw * sw) / sw2, 1) : 0,
      };
    },
  };
}

// 方策 choose(pool, row) → block_id の推定成果率。rows は buildTrainingRows の戻り値。
function offPolicyValue(rows, choose, cap) {
  const acc = ipsAccumulator(cap > 0 ? cap : 20);
  for (const r of rows) if (Array.isArray(r.pool) && r.pool.length) acc.add(r, choose(r.pool, r));
  return acc.result();
}

// 文字列 → 0 以上の整数（FNV-1a）。セッションを決定的に分けるためだけに使う。
function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

// 「関連度だけの順位」と「学習後の順位（事後平均）」の推定成果率。トラフィックは分けず、
// 記録した選択確率の逆数（cap で打ち切り）で重みづけして推定する。
//   -> { n, cap, folds, in_sample, logged: { rate }, rel_only: {...}, learned: {...}, lift_ips, lift_snips,
//        by_slot: { 'slot-end': { n, logged: { rate }, rel_only: {...}, learned: {...} } } }
//      rel_only / learned は { matched, clipped, ips, snips, ess }（ipsAccumulator）
//
// 学習後の順位を、その学習に使ったのと同じ行で評価すると、必ず実力より良く見える。そこでセッション単位で
// folds 個に分け、各行は「その行の組を除いて学習した重み」で評価する（全行を評価に使える）。
// セッションが少なくて分けられないときだけ全行で学習した重みを使い、in_sample: true を立てる。
//
// トップレベルの推定値と lift は、1枚目のスロット（slot-mid / slot-next）の行だけで計算する。
// slot-end 行の pool と選択確率は「ログの1枚目を所与とした」条件つきのもの。評価する方策の1枚目が
// ログと違えば、その方策が実際に向き合う2枚目の pool は別物になる（ログで2枚目だったカードを1枚目に
// 上げた方策は、同じカードを2スロットに置いたことになってしまう）。しかも slot-end は成果率の水準が
// 違うので、同じ自己正規化の母数に混ぜると、1枚目の不一致で落ちた行のぶんだけ見かけの改善幅が出る。
// slot-end は by_slot に「1枚目はログのまま、2枚目だけ替えたら」の参考値として別に出し、lift には入れない。
// 学習（fold ごとの fitModel）には、従来どおり全スロットの行を使う。
//
// lift_ips は、どちらの方策にも打ち切られた行が無く、一致した行が在るときだけ出す（それ以外は null）。打ち切りが掛かった
// ips は下限でしかなく、差の符号が逆に出る（ipsAccumulator のコメント）。判断には lift_snips を使う。
function evaluatePolicies({ rows, prior, cap, folds } = {}) {
  const limit = cap > 0 ? cap : 20;
  const usable = (Array.isArray(rows) ? rows : []).filter((r) => r && Array.isArray(r.pool) && r.pool.length && r.propensity > 0);
  const k = folds >= 2 ? Math.floor(folds) : 5;
  const isEnd = (r) => r.slot === 'slot-end';
  const firstRows = usable.filter((r) => !isEnd(r));
  const endRows = usable.filter(isEnd);
  const out = { n: firstRows.length, cap: limit, folds: k, in_sample: false, logged: { rate: null }, rel_only: null, learned: null, lift_ips: null, lift_snips: null, by_slot: {} };
  if (!usable.length) return out;

  const rate = (list) => round(list.filter((r) => r.y).length / list.length, 6);
  const first = { rel: ipsAccumulator(limit), learned: ipsAccumulator(limit) };
  const second = { rel: ipsAccumulator(limit), learned: ipsAccumulator(limit) };
  const accOf = (r) => (isEnd(r) ? second : first);
  for (const r of usable) accOf(r).rel.add(r, pickByRel(r.pool));

  const foldOf = (r) => hash32(String(r.session_id || r.decision_id || '')) % k;
  const sessions = new Set(usable.map((r) => String(r.session_id || r.decision_id || '')));
  if (sessions.size < k * 2) {
    out.in_sample = true;
    const w = fitModel({ rows: usable, prior }).mean;
    for (const r of usable) accOf(r).learned.add(r, pickByWeights(r.pool, w));
  } else {
    for (let f = 0; f < k; f++) {
      const held = usable.filter((r) => foldOf(r) === f);
      if (!held.length) continue;
      const w = fitModel({ rows: usable.filter((r) => foldOf(r) !== f), prior }).mean;
      for (const r of held) accOf(r).learned.add(r, pickByWeights(r.pool, w));
    }
  }

  if (endRows.length) {
    out.by_slot['slot-end'] = { n: endRows.length, logged: { rate: rate(endRows) }, rel_only: second.rel.result(), learned: second.learned.result() };
  }
  if (!firstRows.length) return out;
  out.logged.rate = rate(firstRows);
  out.rel_only = first.rel.result();
  out.learned = first.learned.result();
  // 一致した行が1件も無い方策の ips（0）は「証拠が無い」だけなので、これも比べない。
  const comparable = out.learned.clipped === 0 && out.rel_only.clipped === 0 && out.learned.matched > 0 && out.rel_only.matched > 0;
  if (comparable && out.learned.ips != null && out.rel_only.ips != null) out.lift_ips = round(out.learned.ips - out.rel_only.ips, 6);
  if (out.learned.snips != null && out.rel_only.snips != null) out.lift_snips = round(out.learned.snips - out.rel_only.snips, 6);
  return out;
}

module.exports = {
  GOAL,
  EXIT,
  fitLogistic,
  fitModel,
  buildTrainingRows,
  featuresForSlot,
  sessionPaths,
  buildTransitions,
  solveValues,
  buildCov,
  offPolicyValue,
  evaluatePolicies,
  pickByRel,
  pickByWeights,
  cholesky,
  cholSolve,
  cholInverseDiag,
};
