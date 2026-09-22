// ============================================================
// Nortiq Labs — 次ページ提案 (nq)
// 情報設計書「Jevによる次ページ提案 v1.0」/ docs/nq/implementation-contract.md 4章
// (関連記事の候補と決定は docs/nq/decisions-2026-09-21.md 5章1 が優先)
//
//  1. window.NQ  … React に依存しない単一ストア (セッションログ / トリガー / 計測 / 決定の配布)
//  2. <NqSlot/>  … slot-mid / slot-end / slot-next の差し込み口
//
// 大原則:
//  - 画面に出る文章は、ビルド時に承認済みのものだけ (window.NORTIQ_NQ.blocks)。
//    承認済みの default が無いスロットは null を返し、サイトの見た目は 1px も変わらない。
//  - 初回描画は必ずデフォルト (同期)。プリレンダのスナップショットにもデフォルトが焼き込まれる。
//  - プリレンダ・bot・Storage 不可の環境では「デフォルトを描くだけ」で、Storage・API・計測・
//    DOM 属性の書き換えを一切しない (NQ.inert)。
//  - App は <div key={route}> でページを遷移ごとに再マウントする。決定結果・seen・shown 送信済みは
//    React state に置くと消えるので、NQ ストア側で「ページ表示 (pageView) 単位」に持つ。
// ============================================================

const NQ = (function () {
  const STORE_KEY = 'nq_s';   // sessionStorage: セッションログ (assets/lp/common/lp.js も同じ形式で追記する)
  const VISIT_KEY = 'nq_v';   // localStorage: 再訪フラグ '1' のみ。ID は持たない
  const MAX_PAGES = 30;       // 履歴の保持上限。API にもこの件数まで送る (モデルに渡す直近5件への絞り込みはサーバ側)
  const MAX_PASSED = 20;
  // 関連記事 (rl-related) の候補の上限。ビルド時に記事ごと最大 12 本 (NORTIQ_ARTICLES[slug].related) を結び付け、
  // 実行時はその中から選ぶ (設計書13章「実行時に Jev へ渡す候補の数を固定する」/ docs/nq/decisions-2026-09-21.md 5章1)。
  // 画面に出す本数 (3) は表示側の NQ_RELATED_SHOW。
  const RELATED_MAX = 12;
  const GOALS = ['diagnostic', 'guidebook', 'contact'];
  const TRIGGER_SLOTS = { T1: ['slot-mid', 'slot-end'], T2: ['slot-next', 'slot-bar'] };
  // /api/nq-event に流す種別。nq_decide / nq_decide_fail は、どちらも type "decide" の1行になる
  // (result = ok / timeout / http / format / network と、ブラウザで測った往復時間 latency_ms)。
  // サーバが nq_decisions に残す latency_ms は Jev の呼び出しだけの時間で、関数の起動待ち・ログ書き込み・
  // 通信を含まず、打ち切った回はそもそも行が無いことがある。「応答が client_timeout_ms に間に合った割合」は
  // ブラウザからしか測れない。
  const BEACON_TYPES = { nq_shown: 'shown', nq_click: 'click', nq_engaged: 'engaged', nq_dismiss: 'dismiss', nq_goal: 'goal',
                         nq_decide: 'decide', nq_decide_fail: 'decide' };

  const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|bingpreview|inspectiontool|googleother|mediapartners|feedfetcher|facebookexternalhit|embedly|ia_archiver|yeti|ahrefs|semrush|prerender|phantomjs|puppeteer|playwright/i;
  const AI_HOSTS = ['chatgpt.com', 'chat.openai.com', 'openai.com', 'perplexity.ai', 'gemini.google.com', 'bard.google.com', 'copilot.microsoft.com', 'claude.ai', 'felo.ai', 'genspark.ai', 'you.com', 'phind.com', 'deepseek.com', 'grok.com'];
  const SNS_HOSTS = ['t.co', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'lnkd.in', 'line.me', 'youtube.com', 'youtu.be', 'tiktok.com', 'threads.net', 'threads.com', 'note.com', 'hatena.ne.jp', 'pinterest.com', 'bsky.app'];
  const AI_SRC_RE = /chatgpt|openai|perplexity|gemini|copilot|claude|felo|genspark/;
  const SNS_SRC_RE = /^(twitter|x|facebook|fb|instagram|ig|linkedin|line|youtube|tiktok|threads|note|hatena|sns|social)$/;

  // ---------- 配信データ ----------
  // window.NORTIQ_NQ は build.js が app.bundle.js の先頭に入れる。開発用 HTML や古いキャッシュでは
  // 未定義になりうるので、必ずここを通して読む (未定義なら「無効」として静かに何もしない)。
  function data() { return (typeof window !== 'undefined' && window.NORTIQ_NQ) || {}; }
  function cfg() { return data().config || {}; }
  function rule(name, fallback) {
    const r = data().rules || {};
    return typeof r[name] === 'number' ? r[name] : fallback;
  }

  // ---------- inert 判定 (コントラクト 0章3) ----------
  // Storage は「オブジェクトが取れるか」だけで確かめる (ブロックされた環境では、この参照自体が
  // SecurityError を投げる)。キーの読み書きはしない。書いて確かめると、プリレンダ (Playwright は
  // page を使い回す) の後続ルートに状態が漏れるうえ、config.session_log が false の間は
  // Storage に一切触れない取り決めにも反する。
  function detectInert() {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') return true;
      if (window.__NORTIQ_PRERENDER__) return true;
      const nav = window.navigator || {};
      if (nav.webdriver) return true;
      if (BOT_RE.test(String(nav.userAgent || ''))) return true;
      if (!window.sessionStorage || !window.localStorage) return true;
      return false;
    } catch (_) {
      return true; // Storage へのアクセス自体が SecurityError になる環境
    }
  }
  const inert = detectInert();
  // ランタイムを動かしてよいか。セッション・スクロール監視・通信・計測は、すべてこの1か所の判定を通る。
  // 配信できるブロック (= ビルド時に承認済みのもの) が1つも無ければ、何もしない。スロットは null、
  // StickyCTA は既定の文言のままで、差し替えも比較も起こりえない。その間に nq_goal / nq_dismiss だけを
  // GA4 へ送ると「承認前は何も通信しない」が崩れ、表示を始めた日より前の値がベースラインに混ざる。
  function active() {
    if (inert || cfg().enabled !== true) return false;
    const b = data().blocks;
    return !!b && typeof b === 'object' && Object.keys(b).length > 0;
  }

  // ---------- 小物 ----------
  function normPath(p) {
    let s = String(p || '/').split(/[?#]/)[0];
    if (s.length > 1) s = s.replace(/\/+$/, '');
    return s || '/';
  }
  function curPath() { return normPath(window.location.pathname); }
  function isPc() {
    // SPA のブレークポイントに合わせる (1024px 以下は SPBottomNav が出る = スマホ・タブレット扱い)
    try { return window.matchMedia('(min-width: 1025px)').matches; } catch (_) { return true; }
  }
  function clampPct(n) { return Math.max(0, Math.min(100, n)); }
  function hashOf(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function randomId() {
    // /api/suggest の検証 (/^r_[a-z0-9]{6,16}$/) に合わせた乱数。個人や端末には結び付かない。
    const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    try {
      const buf = new Uint8Array(10);
      window.crypto.getRandomValues(buf);
      for (let i = 0; i < buf.length; i++) out += abc[buf[i] % 36];
    } catch (_) {
      while (out.length < 10) out += abc[Math.floor(Math.random() * 36)];
    }
    return 'r_' + out;
  }
  // 記事 slug の配列 (決定の related)。文字列以外・重複・上限超えを落とし、空なら null。
  // 実在するかは描画側 (nqRelatedArticles) が NORTIQ_ARTICLES で確かめる。
  function slugList(v) {
    if (!Array.isArray(v)) return null;
    const out = [];
    v.forEach((s) => {
      if (typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s) && out.indexOf(s) < 0 && out.length < RELATED_MAX) out.push(s);
    });
    return out.length ? out : null;
  }
  // ストアが持つ決定の形 { block_id, variant, industry, related }。resolve() の結果や画面に出した中身から
  // この4つだけを写す (文言はここに持たない)。related は関連記事の slug 配列で、無ければ null。
  function decisionOf(d) {
    return { block_id: d.block_id, variant: d.variant, industry: d.industry || null, related: slugList(d.related) };
  }

  // 流入元。リファラのドメインと utm_source だけを見る (検索語は取れない)。
  // gemini.google.com を Google 検索と取り違えないよう、AI を先に判定する。
  function classifyRef() {
    let src = '';
    let host = '';
    try { src = String(new URLSearchParams(window.location.search).get('utm_source') || '').toLowerCase(); } catch (_) {}
    try { if (document.referrer) host = new URL(document.referrer).hostname.toLowerCase(); } catch (_) {}
    // 本文内リンクや LP との行き来はフルリロードになり、リファラが自サイトになる。流入元ではない。
    if (host && host === window.location.hostname) host = '';
    const hit = (list) => list.some((d) => host === d || host.endsWith('.' + d));
    if ((host && hit(AI_HOSTS)) || AI_SRC_RE.test(src)) return 'ai';
    if (/(^|\.)google\.[a-z.]+$/.test(host) || src === 'google') return 'google';
    if (/(^|\.)yahoo\.(co\.jp|com)$/.test(host) || src === 'yahoo') return 'yahoo';
    if ((host && hit(SNS_HOSTS)) || SNS_SRC_RE.test(src)) return 'sns';
    if (!host && !src) return 'direct';
    return 'other';
  }

  // ---------- セッション ----------
  // { sid, pages:[{u,t,sc,dw}], calls, hash, last, shown:{id:n}, passed:[], bar:0|1, goals:[] }
  // + ref / land / v (流入元・着地ページ・初回/再訪)。着地時にしか分からない値なので、ここに持つ。
  // + did (直近の decision_id。nq_goal に付ける) / eng (押したカードの控え。nq_engaged の精算用)。
  // + ga / ev (config.ga_events / events_api の控え 0|1。save() が書く。静的LPの lp.js が読む)。
  // config.session_log が false の間は Storage に触れず、このメモリ上のオブジェクトだけで動く
  // (フルリロードで消える簡易状態)。
  let S = null;
  let visitMarked = false;

  function validSession(o) {
    return !!o && typeof o === 'object' && /^r_[a-z0-9]{6,16}$/.test(String(o.sid || '')) && Array.isArray(o.pages);
  }
  function newSession() {
    let v = 'first';
    if (cfg().session_log) {
      try { if (window.localStorage.getItem(VISIT_KEY) === '1') v = 'return'; } catch (_) {}
    }
    return { sid: randomId(), pages: [], calls: 0, hash: '', last: null, shown: {}, passed: [], bar: 0, goals: [],
             ref: classifyRef(), land: curPath(), v, did: null, eng: null };
  }
  function session() {
    if (S) return S;
    if (cfg().session_log) {
      try {
        const raw = window.sessionStorage.getItem(STORE_KEY);
        const o = raw ? JSON.parse(raw) : null;
        if (validSession(o)) {
          o.calls = typeof o.calls === 'number' ? o.calls : 0;
          o.shown = (o.shown && typeof o.shown === 'object') ? o.shown : {};
          o.passed = Array.isArray(o.passed) ? o.passed : [];
          o.goals = Array.isArray(o.goals) ? o.goals : [];
          o.bar = o.bar ? 1 : 0;
          o.did = typeof o.did === 'string' ? o.did : null;
          o.eng = (o.eng && typeof o.eng === 'object' && typeof o.eng.u === 'string') ? o.eng : null;
          S = o;
        }
      } catch (_) { /* 壊れたログは捨てて作り直す */ }
    }
    if (!S) S = newSession();
    return S;
  }
  function save() {
    if (!S || !cfg().session_log) return;
    // 静的LP (/service/*) の lp.js は nq-config.json を読めない。LP のフォーム送信を nq_goal として
    // GA4 / /api/nq-event に送ってよいかは、ここに控えたフラグで判断させる (設定で止めたら LP 側も止まる)。
    S.ga = cfg().ga_events ? 1 : 0;
    S.ev = cfg().events_api ? 1 : 0;
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(S));
      if (!visitMarked) { window.localStorage.setItem(VISIT_KEY, '1'); visitMarked = true; }
    } catch (_) { /* 容量超過・プライベートモード。メモリ上の状態で動き続ける */ }
  }

  // ---------- 読み方・到達 (数値はそのまま送らず、列挙値に変換する) ----------
  function estReadSec(path) {
    const m = /^\/article-(.+)$/.exec(path);
    const a = m && window.NORTIQ_ARTICLES ? window.NORTIQ_ARTICLES[m[1]] : null;
    return a && a.est_read_sec > 0 ? a.est_read_sec : 60; // 記事以外は 60 秒とみなす
  }
  function readLabel(e) {
    const sc = e.sc || 0;
    if (sc < 50) return 'bounce';
    if ((e.dw || 0) >= estReadSec(e.u) * 0.5 && sc >= 75) return 'deep';
    return 'skim';
  }
  function reachLabel(sc) { return sc >= 90 ? 'end' : sc >= 50 ? 'half' : 'top'; }

  // ---------- ページ表示 (pageView) 単位の状態 ----------
  // decisions: API が決めた中身 / fixed: 一度画面に入って固定した中身 (null = デフォルトで固定) /
  // did: スロットごとの decision_id / shown: nq_shown 送信済み / blocks: 表示→クリックの有無
  let pv = null;
  let listening = false;
  const subs = [];

  function notify() {
    subs.slice().forEach((fn) => { try { fn(); } catch (_) {} });
  }

  function tickDwell() {
    if (!pv || !pv.since) return;
    const now = Date.now();
    pv.dwMs += now - pv.since;
    pv.since = now;
    pv.entry.dw = Math.round(pv.dwMs / 1000);
  }
  // final: ページを離れるとき。表示したのにクリックされなかったブロックを passed (見送った提案) に移す。
  function flush(final) {
    if (!pv) return;
    tickDwell();
    if (final) {
      const s = session();
      Object.keys(pv.blocks).forEach((id) => {
        if (pv.blocks[id] === 'shown' && s.passed.indexOf(id) < 0) s.passed.push(id);
      });
      if (s.passed.length > MAX_PASSED) s.passed = s.passed.slice(-MAX_PASSED);
    }
    save();
  }

  // ---------- nq_engaged (設計書10章) ----------
  // カードを押して移動した先のページを、途中離脱せずに読んだか。読み方が決まるのはそのページを
  // 離れるときなので、クリック時に s.eng = { d: decision_id, b: block_id, u: 提案先, t: 押した時刻,
  // on: 提案先に着いたか } を控えておき、離れる側 (次の pageView か pagehide) で精算する。
  // 送るのは1回だけ。bounce なら送らない。
  // next: 次に表示する SPA のページ。pagehide から呼ぶときは null (行き先が分からない)。
  function settleEngaged(next) {
    const s = session();
    const g = s.eng;
    if (!g) return;
    let entry = (g.on && pv && pv.path === g.u) ? pv.entry : null;
    if (!entry) {
      // 提案先が静的LP (/service/*) のとき、SPA はそのページ表示を見ていない。
      // lp.js が同じ形式で追記した履歴から拾う (session_log が有効なときだけ残っている)。
      for (let i = s.pages.length - 1; i >= 0 && !entry; i--) {
        if (s.pages[i].u === g.u && s.pages[i].t >= g.t) entry = s.pages[i];
      }
    }
    if (!entry) {
      // まだ提案先に着いていない。これから着くなら待つ (LP へはフルリロードで向かう)。
      if (next === null || next === g.u) return;
      s.eng = null; // 別のページへ行った (別タブで開いた等)
      save();
      return;
    }
    s.eng = null;
    save();
    const read = readLabel(entry);
    if (read !== 'bounce') track('nq_engaged', { decision_id: g.d || null, block_id: g.b || null, read, page_url: g.u });
  }

  function scrollPct(el) {
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    // 記事は本文コンテナ基準で測る。文書全体だと関連記事・赤帯・フッターが分母に入り、
    // 本文を読み終えても 75% に届かない。
    if (el && el.isConnected !== false && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      if (r.height > 0) return clampPct(((vh - r.top) / r.height) * 100);
    }
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    return max > 0 ? clampPct(((window.scrollY || window.pageYOffset || 0) / max) * 100) : 100;
  }

  let ticking = false;
  function measure() {
    ticking = false;
    if (!pv || pv.path !== curPath()) return;
    // ルート切替時の window.scrollTo(0) でも scroll イベントは飛ぶ。実際に読み進めた分だけ数える。
    if ((window.scrollY || window.pageYOffset || 0) <= 0) return;
    // 記事は本文コンテナが入るまで読了率を記録しない。「本文を読み込んでいます…」の間は文書が短く、
    // 文書全体基準だと少しのスクロールで 50% を超える。sc は最大値しか残さないので、本文が届いた後に
    // ほとんど読まずに離れても read が "skim" になり、nq_engaged (学習の正例) まで送られてしまう。
    if (/^\/article-/.test(pv.path) && !pv.el) return;
    const sc = Math.round(scrollPct(pv.el));
    if (sc > pv.entry.sc) pv.entry.sc = sc;
    // T1: 実際の scroll イベント・scrollY>0・本文の 25% 通過。本文が DOM に入る前 (pv.el が無い間) は
    // 高さが小さく誤判定するので仕掛けない。JS を実行するクローラが API を叩かないための条件でもある。
    if (pv.el && !pv.t1 && sc >= 25) {
      pv.t1 = true;
      trigger('T1');
    }
    // T3 (最後までスクロールして 20 秒とどまった → slot-bar のみ) は第2段階で導入する。
    // 入れるならここ: sc >= 90 になった時点でタイマーを張り、20 秒後も同じ pv なら trigger('T3')。
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    if (window.requestAnimationFrame) window.requestAnimationFrame(measure); else setTimeout(measure, 100);
  }
  function listen() {
    if (listening) return;
    listening = true;
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!pv) return;
      if (document.hidden) { flush(false); pv.since = 0; } else { pv.since = Date.now(); }
    });
    // フルリロード (本文内リンク・LP への遷移) でページを離れるとき
    window.addEventListener('pagehide', () => { flush(true); settleEngaged(null); });
    // bfcache から戻ったとき。LP (lp.js) がその間に履歴を追記しているので、Storage から読み直す。
    // 画面に出ている中身は固定のまま保つため、pv の決定・seen は引き継ぐ。
    window.addEventListener('pageshow', (e) => {
      if (!e.persisted || !pv || !cfg().session_log) return;
      S = null;
      const entry = { u: pv.path, t: Date.now(), sc: pv.entry.sc, dw: 0 };
      session().pages.push(entry);
      pv.entry = entry;
      pv.dwMs = 0;
      pv.since = Date.now();
      save();
    });
  }

  function beginPage(path) {
    const p = normPath(path || window.location.pathname);
    if (pv && pv.path === p) return; // 同じページ表示の二重呼び出し (子の effect が先に ensurePage した場合)
    flush(true);
    settleEngaged(p); // 前のページが「カードを押して来た先」だったなら、ここで読み方を精算する
    const s = session();
    const entry = { u: p, t: Date.now(), sc: 0, dw: 0 };
    s.pages.push(entry);
    if (s.pages.length > MAX_PAGES) s.pages = s.pages.slice(-MAX_PAGES);
    if (s.eng && !s.eng.on && s.eng.u === p) s.eng.on = 1; // 押したカードの提案先に着いた
    pv = { path: p, entry, el: null, t1: false, since: document.hidden ? 0 : Date.now(), dwMs: 0,
           decisions: {}, fixed: {}, did: {}, shown: {}, blocks: {} };
    save();
    listen();
    // ゴール到達。直接着地も数える (フォーム送信は sendInquiry から NQ.goal('contact'))。
    if (p === '/diagnostic') goal('diagnostic');
    else if (p === '/guidebook') goal('guidebook');
    notify(); // 前のページの決定を捨てたことを購読者 (StickyCTA など遷移で残る部品) へ知らせる
    // T2: セッション2ページ目以降
    if (s.pages.length >= 2) trigger('T2');
  }
  // React は子の effect を親 (App) より先に走らせる。ArticleDetailPage の articleReady が
  // App の pageView より前に来るので、ストア側でも URL の変化を見てページ表示を切り替える。
  function ensurePage() {
    if (!pv || pv.path !== curPath()) beginPage(curPath());
  }

  // ---------- ブロックの解決 ----------
  // ref は「ブロックID」または「ブロックID@業種」(sg-solution / sg-works のデフォルト表示用)。
  // 記事の業種をクライアントは持たないので、build 側が nq_block / pages.next にこの形式で渡す。
  // API の決定はオブジェクト { block_id, variant, industry, related }。related は rl-related のときだけ、
  // サーバが記事の候補から関連度の高い順に選んだ slug の配列 (コントラクト 6.1 / decisions-2026-09-21.md 5章1)。
  function parseRef(ref) {
    if (!ref) return null;
    if (typeof ref === 'object') return ref.block_id ? ref : null;
    const s = String(ref);
    const at = s.indexOf('@');
    return at < 0 ? { block_id: s } : { block_id: s.slice(0, at), industry: s.slice(at + 1) || null };
  }
  // 承認済みの文言まで引けたものだけ返す。引けなければ null (= 描画しない / 決定を採用しない)。
  function resolve(ref) {
    const d = parseRef(ref);
    if (!d || cfg().enabled !== true) return null;
    const b = (data().blocks || {})[d.block_id];
    if (!b) return null;
    const base = b.kind === 'cta' ? 'weak' : 'default';
    const pick = (src) => {
      const vs = (src && src.variants) || {};
      const name = d.variant && vs[d.variant] ? d.variant : base; // 指定の文言が無ければ default
      return vs[name] ? { name, copy: vs[name] } : null;
    };
    let src = d.industry && b.by_industry ? b.by_industry[d.industry] : null;
    let hit = src ? pick(src) : null;
    // 業種版が無い (未承認で配信から落ちた等) ならトップレベルへ。sg-solution はトップレベルが空なので null になる。
    if (!hit) { src = null; hit = pick(b); }
    if (!hit) return null;
    const target = (src && src.target_url) || b.target_url || null;
    if (!target && b.action !== 'contact' && b.kind !== 'related') return null;
    // related (記事 slug の配列) は関連記事ブロックにだけ意味がある。他の種類に付いていても捨てる。
    return { block_id: d.block_id, variant: hit.name, industry: src ? d.industry : null,
             related: b.kind === 'related' ? slugList(d.related) : null,
             kind: b.kind, action: b.action || null, target_url: target, copy: hit.copy };
  }
  // slot-next のデフォルト。出してよいのは中間ページ (service / feature / solution / works / trust) だけ。
  // 記事・トップ・対象外ページは pages に next が無く、RedCTAStrip から呼ばれても何も出ない。
  const NEXT_TYPES = ['service', 'feature', 'solution', 'works', 'trust'];
  function nextFor(path) {
    const pg = (data().pages || {})[normPath(path)];
    if (!pg || !pg.next) return null;
    if (pg.type && NEXT_TYPES.indexOf(pg.type) < 0) return null;
    return pg.next;
  }

  // ---------- /api/suggest ----------
  function slotOpen(slot) {
    if (!pv || Object.prototype.hasOwnProperty.call(pv.fixed, slot)) return false;
    if (slot === 'slot-bar') {
      // StickyCTA は PC だけ。閉じた訪問者にはそのセッション中は出さない。
      return !session().bar && barLive();
    }
    return !!document.querySelector('.nq-slot[data-slot="' + slot + '"]');
  }
  function buildRequest(t) {
    const s = session();
    tickDwell();
    // クライアントが送るのは URL と列挙値だけ。タイトルなどの文章はサーバが catalog から引き直す。
    // 閲覧履歴は「いまのページより前」に見たページ。いまのページは current で別に伝える。
    // 履歴に入れると、読んでいる最中のページに必ず bounce (途中離脱) が付いてしまう (T1 は 25% 地点で走る)。
    // 件数は絞らずに送る。サーバは全件を「すでに読んだページ」として提案の候補から外すのに使い
    // (設計書7章)、モデルに渡すのは直近 rules.history_pages 件だけにする (api/_lib/state.js)。
    const history = s.pages.filter((e) => e !== pv.entry).slice(-MAX_PAGES)
      .map((e) => ({ url: e.u, read: readLabel(e) }));
    return {
      session_id: s.sid, trigger: t, page_url: pv.path,
      state: {
        ref: s.ref || 'other', landing: s.land || pv.path, history,
        current: { url: pv.path, reach: reachLabel(pv.entry.sc) },
        visit: s.v === 'return' ? 'return' : 'first',
        device: isPc() ? 'pc' : 'sp',
        passed: s.passed.slice(-MAX_PASSED),
      },
    };
  }
  function applyResponse(cur, out, t) {
    if (cur !== pv) return; // 応答を待つ間に別のページへ移った
    const s = session();
    const maxShows = rule('max_shows_per_block', 2);
    let changed = false;
    (TRIGGER_SLOTS[t] || []).forEach((slot) => {
      if (Object.prototype.hasOwnProperty.call(pv.fixed, slot)) return; // もう画面に入った。変えない
      pv.did[slot] = out.decision_id || null; // ホールドアウト・シャドーでも分母をそろえるため ID は持つ
      if (out.default) return;
      const r = resolve(out.slots && out.slots[slot]);
      if (!r) return;
      if ((slot === 'slot-bar') !== (r.kind === 'cta')) return; // カードの枠に CTA、バーにカードは入れない
      if ((s.shown[r.block_id] || 0) >= maxShows) return;        // 同じブロックは1セッション2回まで
      pv.decisions[slot] = decisionOf(r);
      changed = true;
    });
    if (changed) notify();
  }
  function trigger(t) {
    // config.api が false の間は 1 バイトも通信しない。
    if (!active() || cfg().api !== true || !pv || typeof window.fetch !== 'function') return;
    if (!(TRIGGER_SLOTS[t] || []).some(slotOpen)) return; // 差し替える先が無いなら聞かない
    const s = session();
    const cur = pv;
    const body = buildRequest(t);
    const h = hashOf(JSON.stringify([body.trigger, body.page_url, body.state]));
    // 状態が前回と同じなら、呼ばずに前回の結果を使う
    if (s.hash === h && s.last) { applyResponse(cur, s.last, t); return; }
    if (s.calls >= rule('max_calls_per_session', 3)) return;
    s.calls += 1; s.hash = h; s.last = null;
    save();
    const t0 = Date.now();
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    let late = false;
    let reported = false;
    // 呼び出し1回につき、結果を必ず1件だけ数える (フェーズ1の完了条件「応答の9割が1.2秒以内」の分子と分母)。
    // 採用できた応答は nq_decide、捨てた回 (打ち切り・HTTP エラー・JSON でない応答・通信の失敗) は nq_decide_fail。
    // 設計書10章の nq_decide は「/api/suggest が応答した」ときのイベントなので、捨てた回は名前を分ける。
    // latency_ms はブラウザで測った往復時間。page_url は呼んだときのページ (応答を待つ間に遷移していても変えない)。
    const report = (reason, extra) => {
      if (reported) return;
      reported = true;
      const p = Object.assign({ trigger: t, latency_ms: Date.now() - t0, page_url: body.page_url }, extra || {});
      if (reason) p.reason = reason;
      track(reason ? 'nq_decide_fail' : 'nq_decide', p);
    };
    const failed = (reason) => { const e = new Error('nq_default'); e.nq = reason; return e; };
    // 打ち切りはタイマーの中で数える。AbortController の無いブラウザでは fetch が返ってこないことがあり、
    // catch を待つと「1.2秒を超えた回」が1件も残らない。
    const timer = setTimeout(() => { late = true; if (ctrl) ctrl.abort(); report('timeout'); }, rule('client_timeout_ms', 1200));
    window.fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined,
    }).then((res) => {
      // プリレンダ用サーバや SPA フォールバックは HTML を 200 で返す。JSON 以外はデフォルト扱い。
      const ct = String(res.headers.get('content-type') || '');
      if (!res.ok) throw failed('http');
      if (ct.indexOf('json') < 0) throw failed('format');
      return res.json().catch(() => { throw failed('format'); });
    }).then((out) => {
      if (late) return; // 打ち切ったあとに届いた応答は使わない (タイマーの側で timeout として数えてある)
      if (!out || typeof out !== 'object') { report('format'); return; }
      // 応答の policy (方策のバージョン) と各スロットの propensity (選択確率) は、サーバが nq_decisions に
      // 残す学習用の値。クライアントの表示には使わない。policy だけ nq_decide の計測に載せる。
      const keep = {
        decision_id: typeof out.decision_id === 'string' ? out.decision_id : null,
        default: out.default !== false,
        slots: (out.slots && typeof out.slots === 'object') ? out.slots : {},
      };
      s.last = keep;
      if (keep.decision_id) s.did = keep.decision_id;
      save();
      const policy = typeof out.policy === 'string' && /^[\w.+-]{1,32}$/.test(out.policy) ? out.policy : null;
      report(null, { decision_id: keep.decision_id, is_default: keep.default, policy });
      applyResponse(cur, keep, t);
    }).catch((e) => {
      // タイムアウト・エラーはすべてデフォルトのまま。表示は変えず、結果だけ数える。
      report(late ? 'timeout' : ((e && e.nq) || 'network'));
    }).then(() => clearTimeout(timer));
  }

  // ---------- 計測 ----------
  function track(name, params) {
    if (!active()) return;
    const p = params || {};
    const c = cfg();
    if (c.ga_events && typeof window.nqTrack === 'function') window.nqTrack(name, p);
    // /api/nq-event は、ブロックを特定できない shown / click を捨てる。既定の文言のままの slot-bar
    // (ブロックではない既存の部品) がこれに当たるので、GA4 だけに送り、受け口には投げない。
    const typed = BEACON_TYPES[name];
    const droppable = (typed === 'shown' || typed === 'click') && !p.block_id;
    if (c.events_api && typed && !droppable && window.navigator && typeof window.navigator.sendBeacon === 'function') {
      // クリック直後の遷移でも落ちにくい sendBeacon。文字列ボディ (text/plain) で送る。
      const payload = {
        session_id: session().sid, decision_id: p.decision_id || null, type: typed,
        slot: p.slot || null, block_id: p.block_id || null, variant: p.variant || null,
        page_url: p.page_url || (pv ? pv.path : curPath()), goal: p.goal || null, read: p.read || null,
      };
      // decide だけが持つ2項目。ほかの種別のボディは変えない。
      if (typed === 'decide') { payload.result = p.reason || 'ok'; payload.latency_ms = p.latency_ms; }
      window.navigator.sendBeacon('/api/nq-event', JSON.stringify(payload));
    }
  }
  function eventParams(slot, info) {
    const i = info || {};
    return { decision_id: (pv && pv.did[slot]) || null, slot, block_id: i.block_id || null,
             variant: i.variant || null, is_default: i.is_default !== false };
  }
  function goal(kind) {
    if (!active() || GOALS.indexOf(kind) < 0) return;
    const s = session();
    if (s.goals.indexOf(kind) >= 0) return; // goal 種別ごとに1セッション1回
    s.goals.push(kind);
    save();
    // 付けるのは「直近の decision_id」。s.last は次の呼び出しを始めた時点で空になるので、別に持つ s.did を使う。
    track('nq_goal', { decision_id: s.did || null, goal: kind });
  }
  // slot-bar (StickyCTA) の計測をしてよいか。StickyCTA は承認に関係なく常に出ている既存の部品なので、
  // 強い CTA が1つも配信されていない間 (= 差し替えが起こりえない間) は何も送らない。
  // SP では CSS で非表示 (下部固定ナビと重なるため) なので、出ていないものを「表示した」と数えない。
  function barLive() {
    if (!isPc()) return false;
    const bs = data().blocks || {};
    return Object.keys(bs).some((id) => bs[id].kind === 'cta' && bs[id].variants && bs[id].variants.strong);
  }

  // 公開する関数は UI に例外を漏らさない (analytics must never throw into the UI)
  const safe = (fn, fallback) => function () {
    try { return fn.apply(null, arguments); } catch (_) { return fallback; }
  };

  return {
    inert,
    path: safe(curPath, '/'),
    resolve: safe(resolve, null),
    nextFor: safe(nextFor, null),

    // このセッションで開いたページのパス (いまのページを含む)。関連記事から既読を外すのに使う。
    // 動いていない間 (inert・無効・配信ブロックなし) は Storage に触れないよう、セッションを作らずに空を返す。
    viewed: safe(() => (active() ? session().pages.map((e) => e.u) : []), []),

    pageView: safe((path) => { if (active()) beginPage(path); }),

    // 記事本文が DOM に入った後に呼ぶ。el は本文コンテナ (T1 の 25% と読了率の基準)。
    articleReady: safe((slug, el) => {
      if (!active() || !el) return;
      ensurePage();
      pv.el = el;
    }),

    // 返す形は { block_id, variant, industry, related }。related は rl-related の決定にだけ入る slug の配列 (無ければ null)。
    get: safe((slot) => {
      if (!active() || !pv || pv.path !== curPath()) return null;
      const d = Object.prototype.hasOwnProperty.call(pv.fixed, slot) ? pv.fixed[slot] : pv.decisions[slot];
      return d ? decisionOf(d) : null;
    }, null),

    subscribe: (fn) => {
      if (typeof fn !== 'function') return () => {};
      subs.push(fn);
      return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
    },

    // スロットが一度画面に入ったら、そのページでは中身を固定する。
    // shown を渡すと「いま実際に描画している中身」で固定する (null = デフォルト)。
    // 省略時はストアの決定で固定する。関連記事は slug の配列 (related) ごと固定するので、並びも変わらない。
    markSeen: safe(function (slot, shown) {
      if (!active()) return;
      ensurePage();
      if (Object.prototype.hasOwnProperty.call(pv.fixed, slot)) return;
      const d = arguments.length > 1 ? shown : pv.decisions[slot];
      pv.fixed[slot] = d && d.block_id ? decisionOf(d) : null;
    }),

    // nq_shown はページ表示ごと・スロットごとに1回。デフォルト表示でも送る (比較の分母をそろえる)。
    shown: safe((slot, info) => {
      if (!active() || (slot === 'slot-bar' && !barLive())) return;
      ensurePage();
      if (pv.shown[slot]) return;
      pv.shown[slot] = true;
      const id = info && info.block_id;
      if (id) {
        const s = session();
        s.shown[id] = (s.shown[id] || 0) + 1;
        if (!pv.blocks[id]) pv.blocks[id] = 'shown';
        save();
      }
      track('nq_shown', eventParams(slot, info));
    }),

    // target: 押したリンクの行き先 (パス)。渡すと nq_engaged の判定を仕掛ける。
    // モーダルを開くだけのリンク (action:"contact") は行き先が無いので渡さない。
    click: safe((slot, info, target) => {
      if (!active() || (slot === 'slot-bar' && !barLive())) return;
      ensurePage();
      if (info && info.block_id) pv.blocks[info.block_id] = 'clicked';
      const params = eventParams(slot, info);
      track('nq_click', params);
      if (target && info && info.block_id) {
        const u = normPath(target);
        // いまのページ自体が「前に押したカードの提案先」なら、上書きする前にここまでの読み方で精算する
        tickDwell();
        settleEngaged(u);
        session().eng = { d: params.decision_id, b: info.block_id, u, t: Date.now(), on: 0 };
        save();
      }
    }),

    track: safe(track),
    goal: safe(goal),

    dismissBar: safe(() => {
      if (!active()) return;
      // 閉じた状態の保持は計測と別の話なので、barLive() に関係なく残す (StickyCTA が barDismissed() で読む)。
      session().bar = 1;
      save();
      // 計測は shown / click と同じ条件。強い CTA が配信されていない間に送ると、分母 (nq_shown) の無い
      // nq_dismiss だけが GA4 と nq_events に溜まる。
      if (barLive()) track('nq_dismiss', { decision_id: (pv && pv.did['slot-bar']) || null, slot: 'slot-bar' });
    }),
    barDismissed: safe(() => active() && session().bar === 1, false),
  };
})();

// ============================================================
// 表示コンポーネント
// マークアップは設計書8章 (デザインシステム) のとおり。クラス名は styles.css 末尾の nq ブロックと対。.fadein は付けない (useFadeIn が画面外で一旦隠すため、
// 「画面に入る前に差し替えを終える」と干渉する)。inline style の grid も使わない。
// ============================================================

// リンク先が SPA の ROUTES に在るページだけ navProps (実 href + クライアント遷移)。
// /service/* の静的LPは ROUTES に無く、navProps に渡すと handleNavigate の else 分岐で
// 資料請求モーダルが開いてしまうので、素の href で通常遷移させる。
function nqHrefProps(url, onNavigate) {
  const id = typeof idFromPath === 'function' ? idFromPath(url) : null;
  if (id && typeof onNavigate === 'function' && typeof navProps === 'function'
      && typeof ROUTES !== 'undefined' && ROUTES[id]) {
    return navProps(id, onNavigate);
  }
  return { href: url };
}

// ブロックのリンク。action:"contact" (資料請求) は URL を持たないので onContact でモーダルを開く。
function nqBlockLinkProps(r, onNavigate, onContact, onClick) {
  const base = r.action === 'contact'
    ? { href: '#', role: 'button', onClick: (e) => { e.preventDefault(); onContact(); } }
    : nqHrefProps(r.target_url, onNavigate);
  const orig = base.onClick;
  return { ...base, onClick: (e) => { onClick(); if (orig) orig(e); } };
}

// rl-related の3本 (設計書13章 / docs/nq/decisions-2026-09-21.md 5章1)。
// 候補の出どころは3段階。前の段から順に採り、3本に届かなければ次の段で埋める。
//   1. 決定の related: サーバが記事の候補 (≤12本) から関連度の高い順に選んだ slug (行4、rl-related を出す場面)
//   2. NORTIQ_ARTICLES[slug].related: build.js が記事ごとに結び付けた候補 (≤12本)。先頭から
//   3. 従来の並び: 同カテゴリの新着 → 全カテゴリの新着 (related を持たない古い articles.js のため)
// このセッションですでに読んだ記事は除く (設計書7章「すでに読んだページを除く」。既読は NQ.viewed())。
// ただし未読で3本に届かないときだけ、同じ順で既読を足して3本にする (RelatedList は3本・固定の高さが前提。
// 候補が記事ごと最大12本あるので、既読で埋まるのは実際には読み尽くしたときだけ)。
// 既読の一覧が変わるのはページ遷移のときだけなので、同じページ表示の間に描き直しても並びは変わらない。
// session_log が false の間はフルリロードで既読が消え、候補の先頭からの並びに戻る。
// related: 決定の slug 配列 (NQ.resolve の結果の related)。デフォルト表示や旧形式の応答では null。
const NQ_RELATED_SHOW = 3;
function nqRelatedArticles(related) {
  const store = (typeof window !== 'undefined' && window.NORTIQ_ARTICLES) || {};
  const m = /^\/article-(.+)$/.exec(NQ.path());
  const curSlug = m ? m[1] : null;
  const cur = curSlug ? store[curSlug] : null;
  // 出せる記事だけ。一覧に出ない noindex (下書き) と自分自身は、どの段でも除く
  // (components.jsx の listedArticles() と同じ条件。slug は同じオブジェクトに引けるので重複は indexOf で弾ける)。
  const listed = (a) => !!a && typeof a === 'object' && !a.noindex && a.slug !== curSlug;
  const own = (s) => Object.prototype.hasOwnProperty.call(store, s); // 'constructor' のような継承プロパティを記事と取り違えない
  const bySlug = (slugs) => (Array.isArray(slugs) ? slugs : []).map((s) => (own(s) ? store[s] : null)).filter(listed);
  // date は 'YYYY.MM.DD' 固定なので文字列比較で足りる。同日は一覧の並び (新着順) を保つ。
  const newest = Object.keys(store).map((s) => store[s]).filter(listed)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const sameCat = (a) => !!cur && a.category === cur.category;
  const sources = [bySlug(related), bySlug(cur && cur.related), newest.filter(sameCat), newest];
  const seen = new Set(NQ.viewed());
  const unread = (a) => !seen.has('/article-' + a.slug);
  const picked = [];
  [unread, () => true].forEach((ok) => {
    sources.forEach((list) => {
      list.forEach((a) => { if (picked.length < NQ_RELATED_SHOW && picked.indexOf(a) < 0 && ok(a)) picked.push(a); });
    });
  });
  return picked;
}

// このスロットで描けるブロックか。CTA (ct-*) は slot-bar 専用で、カードの枠には入れない。
function nqCardOk(r, onContact) {
  if (!r) return false;
  if (r.kind !== 'suggest' && r.kind !== 'reassure' && r.kind !== 'related') return false;
  if (r.action === 'contact' && typeof onContact !== 'function') return false;
  return true;
}

// スロットの aside に付ける名前。名前つきの aside は complementary ランドマークになるので、同じページに
// 並ぶスロットどうしは名前を変える (記事ページは slot-mid と slot-end の両方が出る。同名だと
// スクリーンリーダーのランドマーク一覧で、本文中のカードと本文後のカードを区別できない)。
// slot-end は記事だけ、slot-next は記事以外だけに出るので、この2つは同じ名前でも重ならない。
const NQ_SLOT_LABEL = { 'slot-mid': 'おすすめのページ', 'slot-end': '次に読むページ', 'slot-next': '次に読むページ' };

function nqReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return true; }
}

// 提案カード。リンクは見出しの <a> 1つだけ (CSS の ::after でカード全面に広げる)。
// cta は飾りなので aria-hidden。矢印は表示側で付ける (blocks.json には入れない)。
// swapping: 差し替え中。styles.css の .nq-suggest.is-swapping { opacity: 0 } に任せる (3部品とも同じ)。
function NqSuggestCard({ r, link, swapping }) {
  const c = r.copy;
  return (
    <div className={'nq-suggest' + (swapping ? ' is-swapping' : '')} data-block={r.block_id} data-variant={r.variant}>
      {c.eyebrow && <p className="nq-suggest__eyebrow">{c.eyebrow}</p>}
      <h3 className="nq-suggest__title"><a {...link}>{c.title}</a></h3>
      {c.body && <p className="nq-suggest__body">{c.body}</p>}
      {c.cta && <span className="nq-suggest__cta" aria-hidden="true">{c.cta} →</span>}
    </div>
  );
}

// 不安解消ブロック。開閉せず常に見える短文。リンク文言だけで行き先が分かるようにする。
function NqReassureBlock({ r, link, swapping }) {
  const c = r.copy;
  return (
    <div className={'nq-reassure' + (swapping ? ' is-swapping' : '')} data-block={r.block_id} data-variant={r.variant}>
      <span className="nq-reassure__mark" aria-hidden="true"><Icon name="check" size={16} stroke={2}/></span>
      <p className="nq-reassure__answer">{c.answer}</p>
      {c.note && <p className="nq-reassure__note">{c.note}</p>}
      {c.cta && <a className="nq-reassure__link" {...link}>{c.cta}</a>}
    </div>
  );
}

// 関連記事。営業系を出さない相手 (同業者・学習者) への代替。
// onClick には押した記事のパスを渡す (nq_engaged の判定先になる)。
function NqRelatedList({ r, items, onNavigate, onClick, swapping }) {
  return (
    <nav className={'nq-related' + (swapping ? ' is-swapping' : '')} aria-label="関連記事" data-block={r.block_id} data-variant={r.variant}>
      {r.copy.eyebrow && <p className="nq-related__label">{r.copy.eyebrow}</p>}
      <ul className="nq-related__list">
        {items.map((a) => {
          const url = '/article-' + a.slug;
          const base = nqHrefProps(url, onNavigate);
          const orig = base.onClick;
          return (
            <li key={a.slug} className="nq-related__item">
              <a {...base} onClick={(e) => { onClick(url); if (orig) orig(e); }}>{a.title}</a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// <NqSlot slot="slot-mid|slot-end|slot-next" defaultBlock={id} onNavigate={fn} onContact={fn}/>
//  - defaultBlock は「ブロックID」または「ブロックID@業種」。slot-next は渡さなくてよい
//    (window.NORTIQ_NQ.pages[pathname].next を自分で引く)。
//  - 承認済みの default が無ければ null。下書きのまま本番に出ても何も描画されない。
function NqSlot({ slot, defaultBlock, onNavigate, onContact }) {
  const found = NQ.resolve(slot === 'slot-next' ? NQ.nextFor(NQ.path()) : defaultBlock);
  const def = nqCardOk(found, onContact) ? found : null;
  const hasDef = !!def;

  // 決定 (差し替え後の中身)。初回描画は必ず null = デフォルト。プリレンダと同じ DOM から始める。
  // App は <div key={route}> でページを作り直すので、この state は遷移のたびに初期値へ戻る。
  const [dec, setDec] = React.useState(null);
  const [swapping, setSwapping] = React.useState(false);
  const elRef = React.useRef(null);
  const decRef = React.useRef(null);
  const shownRef = React.useRef(null);  // いま描画している中身 (observer とクリックから読む)
  const settleRef = React.useRef(null); // フェードの待ちを打ち切る関数 (observer から呼ぶ)

  // ストアの決定を購読する。差し替えてよいか (まだ画面に入っていないか) はストアが判断し、
  // 一度画面に入った後の NQ.get は固定した中身しか返さない。
  // 差し替えの手順は styles.css の取り決めどおり:
  //   is-swapping を付ける → 150ms 待つ (フェードアウト) → 中身を入れ替える → is-swapping を外す (フェードイン)
  React.useEffect(() => {
    if (!hasDef || NQ.inert) return;
    const SWAP_MS = 150; // styles.css の --nq-dur-swap と同じ値
    let tOut = null;
    let tIn = null;
    // 関連記事は slug の並び (related) まで同じときだけ「同じ決定」。デフォルトも rl-related のページで、
    // サーバが選んだ3本が届いたときに、ブロックが同じという理由で差し替えを見送らないため。
    const sameList = (a, b) => (a || []).join(',') === (b || []).join(',');
    const same = (p, d) => (!p && !d) || (!!p && !!d && p.block_id === d.block_id && p.variant === d.variant && p.industry === d.industry
                                          && sameList(p.related, d.related));
    const commit = () => {
      if (tOut) { clearTimeout(tOut); tOut = null; }
      // 待っている間に画面へ入って固定されていれば、ここで返るのは固定した中身 (= いまの表示)。
      const d = NQ.get(slot);
      decRef.current = d;
      setDec(d);
      // 外すのは入れ替えの次の描画。ブロックの種類が変わると中の要素は作り直されるので、
      // 同じ描画で外すと opacity:0 の状態を経ず、フェードインにならない。
      tIn = setTimeout(() => { tIn = null; setSwapping(false); }, 30);
    };
    const sync = () => {
      if (tOut) return; // フェードアウト中。終わったところで最新の決定を読み直す
      const d = NQ.get(slot);
      if (same(decRef.current, d)) return;
      if (nqReducedMotion()) { decRef.current = d; setDec(d); return; } // 即時に差し替える
      if (tIn) { clearTimeout(tIn); tIn = null; }
      setSwapping(true);
      tOut = setTimeout(commit, SWAP_MS);
    };
    settleRef.current = () => { if (tOut) commit(); };
    sync();
    const off = NQ.subscribe(sync);
    return () => {
      off();
      settleRef.current = null;
      if (tOut) clearTimeout(tOut);
      if (tIn) clearTimeout(tIn);
    };
  }, [slot, hasDef]);

  // 画面に入った瞬間に中身を固定し、50% 見えたら nq_shown (ページ表示ごとに1回。重複はストアが弾く)。
  React.useEffect(() => {
    const el = elRef.current;
    if (!hasDef || NQ.inert || !el || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const cur = shownRef.current;
        NQ.markSeen(slot, cur && !cur.is_default ? cur : null);
        // フェードアウトの途中で画面に入った。いまの中身で固定したので、待ちを打ち切って元に戻す。
        if (settleRef.current) settleRef.current();
        if (e.intersectionRatio >= 0.5) NQ.shown(slot, cur);
      });
    }, { threshold: [0, 0.5] });
    io.observe(el);
    return () => io.disconnect();
  }, [slot, hasDef]);

  if (!hasDef) return null;

  const picked = dec ? NQ.resolve(dec) : null;
  let r = nqCardOk(picked, onContact) ? picked : def;
  let items = null;
  if (r.kind === 'related') {
    // 決定に related (サーバが選んだ slug) があればそれを先に、無ければ記事の候補 (build.js の related) の先頭から
    items = nqRelatedArticles(r.related);
    if (!items.length) {
      if (r === def) return null;
      r = def; // 記事が1本も無ければ関連記事は出せない。デフォルトに戻す
      if (r.kind === 'related') return null;
    }
  }
  // related も持たせる。画面に入ったときの markSeen がこの中身で固定するので、並びまで変わらない。
  shownRef.current = { block_id: r.block_id, variant: r.variant, industry: r.industry, related: r.related || null, is_default: r === def };

  const onClick = (target) => NQ.click(slot, shownRef.current, target);
  const link = r.kind === 'related' ? null
    : nqBlockLinkProps(r, onNavigate, onContact, () => onClick(r.action === 'contact' ? null : r.target_url));
  const inner = r.kind === 'related'
    ? <NqRelatedList r={r} items={items} onNavigate={onNavigate} onClick={onClick} swapping={swapping}/>
    : r.kind === 'reassure'
      ? <NqReassureBlock r={r} link={link} swapping={swapping}/>
      : <NqSuggestCard r={r} link={link} swapping={swapping}/>;

  // slot-next は <main> の直下 (赤帯の直前) に置かれるが、.container では包まない。
  // 幅と左右の余白は styles.css の .nq-slot[data-slot="slot-next"] が自分で持っている。
  return (
    <aside className="nq-slot" data-slot={slot} aria-label={NQ_SLOT_LABEL[slot] || 'おすすめのページ'} ref={elRef}>
      {inner}
    </aside>
  );
}

Object.assign(window, { NqSlot, NQ });
