/* /tools/estimate — 概算見積 (6問・連絡先なし)
 * 単価表 CATS は公開価格 (Web 30/60/120万〜, AI 10/25/50万〜, PoC 50万〜) に合わせる。変えたら pricing-check も見る。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, fmt = T.fmt;

  var CATS = {
    auto: {
      label: '業務自動化（FAX・電話注文の入力、請求書、在庫）', short: '業務自動化',
      intro: '転記・照合・請求などの手作業を減らす。FAXはそのままで構いません',
      scaleQ: '自動化したい業務はいくつありますか？', scaleHelp: '例：FAX注文の転記、請求書づくり、入金の消し込み、在庫の突き合わせ、日報の整理。',
      scales: [
        { id: 's', t: '1業務', s: 'まず1つ試したい', base: [25, 50], weeks: [3, 5], plan: 'AI活用スタンダード' },
        { id: 'm', t: '2〜3業務', s: '部署内の流れをまとめて', base: [50, 120], weeks: [5, 8], plan: 'AI活用プレミアム〜PoC' },
        { id: 'l', t: '4業務以上', s: '会社全体の業務を見直す', base: [120, 250], weeks: [8, 12], plan: 'PoC〜本実装' }],
      methodQ: '今はどうやって処理していますか？', methodHelp: '読み取りや連携の難しさが変わります。',
      methods: [
        { id: 'paper', t: '紙・FAX・手書き', s: '読み取り（AI-OCR）が必要', k: [0.15, 0.25] },
        { id: 'excel', t: 'Excel・スプレッドシート', s: 'データはある', k: [0, 0] },
        { id: 'saas', t: 'kintone・freee等のSaaS', s: 'API連携が中心', k: [0.08, 0.12] },
        { id: 'line', t: 'LINE・メールで受けている', s: '受信の自動化から', k: [0.08, 0.12] }],
      integQ: 'つなぎたいソフトはありますか？', integHelp: '複数選べます。',
      integs: [
        { id: 'acct', t: '会計ソフト（freee・マネーフォワード）', s: '仕訳・請求の連携', add: [8, 15] },
        { id: 'sales', t: '販売管理・在庫システム', s: '受注データの出し入れ', add: [10, 20] },
        { id: 'line', t: 'LINE', s: '通知・受付', add: [5, 10] },
        { id: 'none', t: 'なし', s: 'Excelに入れば十分', add: [0, 0] }],
      breakdown: [['要件整理・現状の棚卸し', .15], ['開発（AI読み取り・連携）', .55], ['テスト・精度調整', .20], ['導入・操作説明・引き継ぎ', .10]],
      up: ['帳票の種類が想定より多い（手書き・書式がバラバラ）', 'つなぎ先にAPIがない、または制限がある', '承認の流れが複雑で、例外処理が多い'],
      minimum: ['1業務だけ（例：FAX注文書を読み取ってExcelに転記）', '10万円〜。効果を見てから次の業務へ広げられます'],
      monthly: '初期費用0円・月額1.2万円〜で使う「ひと業務AI」もあります（/automation）。',
      sample: '在庫管理アプリ（小売）、経費精算の写真自動登録など', demo: '/tools/document-demo'
    },
    web: {
      label: 'ホームページ制作・リニューアル', short: 'ホームページ',
      intro: '新規・リニューアル・採用サイト・EC',
      scaleQ: 'ページ数はどれくらいですか？', scaleHelp: '会社案内・サービス・実績・お問い合わせ…で数えてください。迷ったら少なめで大丈夫です。',
      scales: [
        { id: 's', t: '1〜5ページ', s: '会社案内・LP・小規模', base: [30, 55], weeks: [4, 5], plan: 'ライト' },
        { id: 'm', t: '6〜15ページ', s: '一般的なコーポレートサイト', base: [60, 110], weeks: [6, 8], plan: 'スタンダード' },
        { id: 'l', t: '16ページ以上', s: '採用サイト・多拠点・多言語', base: [120, 200], weeks: [8, 12], plan: 'プレミアム' }],
      methodQ: '今、会社の情報はどこにありますか？', methodHelp: '原稿づくりの手間が変わります。',
      methods: [
        { id: 'paper', t: '紙のパンフ・FAX中心', s: '原稿のデジタル化から', k: [0.05, 0.08] },
        { id: 'excel', t: 'Word・Excel・PDF', s: '原稿は手元にある', k: [0, 0] },
        { id: 'saas', t: '既存サイトあり（Wix・ペライチ・WordPress等）', s: '移行と整理が必要', k: [0.05, 0.10] },
        { id: 'line', t: 'LINE・SNSだけ', s: 'サイトはまだない', k: [0, 0.03] }],
      integQ: 'つなぎたい仕組みはありますか？', integHelp: '複数選べます。なければ「なし」を。',
      integs: [
        { id: 'resv', t: '予約・来店受付', s: '予約システム連携', add: [8, 15] },
        { id: 'line', t: 'LINE公式アカウント', s: '友だち追加・通知', add: [3, 8] },
        { id: 'ai', t: '問い合わせの一次返信AI', s: '24時間の自動応答', add: [10, 25] },
        { id: 'none', t: 'なし', s: 'まずはサイトだけ', add: [0, 0] }],
      breakdown: [['要件整理・構成案', .15], ['デザイン', .30], ['実装・コーディング', .40], ['テスト・公開・引き継ぎ', .15]],
      up: ['原稿や写真が揃っていない（ライティング・撮影が追加になります）', '制作途中でページ数が増える', '予約・多言語・会員機能など、後から機能が増える'],
      minimum: ['トップページ＋お問い合わせの2ページ構成', '30万円〜・約4週間。あとからページを足せます'],
      monthly: '公開後の保守（SSL更新・バックアップ・月2回の修正）は月2万円〜。任意です。',
      sample: 'ゴルフリゾート、工法協会、美容クリニックのサイトなど', demo: '/works'
    },
    chat: {
      label: 'AIチャット・問い合わせ対応', short: '問い合わせ対応AI',
      intro: 'サイト・LINEでの一次対応を24時間に',
      scaleQ: 'どこまで任せたいですか？', scaleHelp: '範囲が広いほど、つなぐ仕組みが増えます。',
      scales: [
        { id: 's', t: 'よくある質問に答える', s: '営業時間・料金・アクセスなど', base: [10, 25], weeks: [2, 3], plan: 'AI活用ライト' },
        { id: 'm', t: '予約・受付まで', s: '日程候補の提示・仮予約', base: [25, 50], weeks: [3, 5], plan: 'AI活用スタンダード' },
        { id: 'l', t: '社内データを見て答える', s: '在庫・納期・見積の目安まで', base: [50, 100], weeks: [5, 8], plan: 'AI活用プレミアム' }],
      methodQ: '今の問い合わせ対応は？', methodHelp: '答えの元になる情報の整い方が変わります。',
      methods: [
        { id: 'paper', t: '電話が中心', s: 'よくある質問を書き起こすところから', k: [0.05, 0.10] },
        { id: 'excel', t: 'メール・フォーム', s: '過去の回答が残っている', k: [0, 0] },
        { id: 'saas', t: 'LINE公式アカウント', s: 'LINE上で返す', k: [0.03, 0.08] },
        { id: 'line', t: '対応しきれていない', s: '取りこぼしを減らしたい', k: [0, 0.05] }],
      integQ: 'つなぎたい仕組みはありますか？', integHelp: '複数選べます。',
      integs: [
        { id: 'resv', t: '予約システム', s: '空き枠の確認・仮予約', add: [10, 20] },
        { id: 'line', t: 'LINE', s: 'LINEで会話', add: [5, 10] },
        { id: 'doc', t: '社内資料・FAQ', s: 'PDF・マニュアルを読ませる', add: [5, 15] },
        { id: 'none', t: 'なし', s: 'サイトに置くだけ', add: [0, 0] }],
      breakdown: [['回答データの整理', .25], ['AI設定・画面の組み込み', .45], ['テスト・回答精度の調整', .20], ['公開・運用ルールの説明', .10]],
      up: ['回答に使う資料が整っていない（整理から始める）', '予約システムなど、つなぎ先の仕様が複雑', '多言語で対応したい'],
      minimum: ['よくある質問だけに答えるチャット', '10万円〜・約2週間'],
      monthly: '月額はAI利用料（実費）＋管理費2万円。利用が少ない月はその分だけ下がります。',
      sample: '協同組合サイトのAIチャットボットなど', demo: '/chatbot'
    },
    sec: {
      label: '社内AIのセキュリティ・利用ルール', short: 'AIセキュリティ',
      intro: '社内のChatGPT利用のルールと入力チェック',
      scaleQ: 'AIを使う人数は？', scaleHelp: '部署をまたぐほど、ルールと設定の手間が増えます。',
      scales: [
        { id: 's', t: '〜10人', s: '1部署・小規模', base: [10, 25], weeks: [2, 3], plan: 'ルール策定' },
        { id: 'm', t: '11〜30人', s: '複数部署', base: [25, 60], weeks: [3, 5], plan: 'ルール＋入力チェック' },
        { id: 'l', t: '31人以上', s: '全社', base: [60, 120], weeks: [5, 8], plan: '全社導入' }],
      methodQ: '今のAI利用はどんな状態ですか？', methodHelp: '現状把握の手間が変わります。',
      methods: [
        { id: 'paper', t: '各自が個人アカウントで使っている', s: '何を入力しているか不明', k: [0.05, 0.10] },
        { id: 'excel', t: '会社でChatGPT等を契約済み', s: '使う人は決まっている', k: [0, 0] },
        { id: 'saas', t: '禁止している', s: '安全に解禁したい', k: [0, 0.05] },
        { id: 'line', t: '把握できていない', s: 'まず現状を知りたい', k: [0.05, 0.10] }],
      integQ: '合わせて整えたいものはありますか？', integHelp: '複数選べます。',
      integs: [
        { id: 'chat', t: 'Slack・Teamsでの利用', s: '社内チャットからのAI利用', add: [5, 10] },
        { id: 'rule', t: '既存の情報セキュリティ規程', s: '整合を取る', add: [3, 8] },
        { id: 'ws', t: 'Microsoft 365・Google Workspace', s: '管理設定', add: [5, 10] },
        { id: 'none', t: 'なし', s: 'AI利用ルールだけ', add: [0, 0] }],
      breakdown: [['現状調査・リスクの洗い出し', .25], ['利用ルール・ガイドライン作成', .30], ['入力チェック・管理設定', .30], ['説明会・引き継ぎ', .15]],
      up: ['使っているAIツールの種類が多い', '部署ごとに運用ルールが違う', '個人情報・取引先情報の扱いに法令対応が絡む'],
      minimum: ['AI利用ルール（ガイドライン）の策定だけ', '10万円〜・約2週間。雛形ではなく自社の業務に合わせます'],
      monthly: '入力内容を自動でチェックし続ける月額の監視サービスは、規模により相談。',
      sample: '生成AIの利用ルール策定、入力チェックの仕組み（VetoNet）など', demo: '/tools/ai-risk'
    }
  };
  var URG = [
    { id: 'fast', t: '1か月以内', s: '特急。順番を優先します', k: 0.15 },
    { id: 'q', t: '3か月くらい', s: '通常のペース', k: 0 },
    { id: 'tbd', t: '未定', s: 'まず金額を知りたい', k: 0 }];
  var BUD = [
    { id: 'b30', t: '〜30万円', s: '小さく始めたい', cap: 30 },
    { id: 'b100', t: '〜100万円', s: 'ひとまとまり任せたい', cap: 100 },
    { id: 'monthly', t: '月額で払いたい', s: '初期費用を抑えたい', cap: null },
    { id: 'unknown', t: '分からない', s: '相場を知りたい', cap: null }];
  var STEP_LABELS = ['作りたいもの', '規模', '今のやり方', '連携', '急ぎ度', '予算感'];

  var state = { step: 0, cat: null, scale: null, method: null, integs: [], urg: null, bud: null };

  // ?c=auto&s=s&m=paper&i=acct,line&u=q&b=b30 で復元 (ai-fit からの引き継ぎ・共有用)
  (function restore() {
    var p = new URLSearchParams(location.search);
    if (!p.get('c') || !CATS[p.get('c')]) return;
    state.cat = p.get('c');
    var c = CATS[state.cat];
    if (c.scales.some(function (x) { return x.id === p.get('s'); })) state.scale = p.get('s');
    if (c.methods.some(function (x) { return x.id === p.get('m'); })) state.method = p.get('m');
    var ii = String(p.get('i') || '').split(',').filter(function (x) { return c.integs.some(function (y) { return y.id === x; }); });
    if (ii.length) state.integs = ii;
    if (URG.some(function (x) { return x.id === p.get('u'); })) state.urg = p.get('u');
    if (BUD.some(function (x) { return x.id === p.get('b'); })) state.bud = p.get('b');
    state.step = [state.cat, state.scale, state.method, state.integs.length, state.urg, state.bud].findIndex(function (v) { return !v; });
    if (state.step < 0) state.step = 6;
  })();

  function answered(i) { return !![state.cat, state.scale, state.method, state.integs.length > 0, state.urg, state.bud][i]; }

  function renderStepper() {
    var el = $('#stepper'); el.innerHTML = '';
    STEP_LABELS.forEach(function (l, i) {
      var b = document.createElement('button'); b.type = 'button';
      var done = answered(i);
      b.className = (done && i !== state.step ? 'done ' : '') + (i === state.step ? 'cur' : '');
      b.innerHTML = '<span class="seg"></span><span class="lbl">' + (i + 1) + '. ' + l + '</span>';
      b.setAttribute('aria-label', '質問' + (i + 1) + ' ' + l + (done ? '（回答済み）' : ''));
      b.disabled = !(i <= state.step || done);
      b.addEventListener('click', function () { state.step = i; showQuestion(); });
      el.appendChild(b);
    });
  }

  function showQuestion() {
    $('#result').hidden = true; $('#branch').hidden = true; $('#qcard').hidden = false; $('#stepper').hidden = false;
    renderStepper();
    var c = state.cat ? CATS[state.cat] : null;
    var card = $('#qcard'); card.innerHTML = '';
    var q, help, opts, multi = false, key;
    switch (state.step) {
      case 0: q = '作りたいのはどれですか？'; help = '1つ選んでください。あとで変えられます。';
        opts = Object.keys(CATS).map(function (id) { return { id: id, t: CATS[id].label, s: CATS[id].intro }; })
          .concat([{ id: 'undecided', t: 'まだ分からない', s: '何から手を付けるべきか知りたい' }]); key = 'cat'; break;
      case 1: q = c.scaleQ; help = c.scaleHelp; opts = c.scales; key = 'scale'; break;
      case 2: q = c.methodQ; help = c.methodHelp; opts = c.methods; key = 'method'; break;
      case 3: q = c.integQ; help = c.integHelp; opts = c.integs; key = 'integs'; multi = true; break;
      case 4: q = 'いつ頃までに必要ですか？'; help = '1か月以内は特急扱いで15%上乗せになります。'; opts = URG; key = 'urg'; break;
      case 5: q = '予算の感覚はありますか？'; help = '金額は変わりません。結果の見せ方を合わせるためだけに使います。'; opts = BUD; key = 'bud'; break;
      default: showResult(); return;
    }
    card.innerHTML = '<div class="qnum">Question ' + (state.step + 1) + ' / 6</div><h2 class="q">' + q + '</h2><p class="qhelp">' + help + '</p><div class="opts" id="opts" role="group"></div>' +
      '<div class="tool-nav"><button type="button" class="btn btn--ghost" id="back" ' + (state.step === 0 ? 'disabled' : '') + '>← 戻る</button><button type="button" class="btn btn--primary btn--sm" id="next" ' + (multi ? '' : 'hidden') + '>次へ →</button></div>' +
      (state.step === 0 ? '<p class="tool-sample">試しに見るなら <a href="#" id="sampleLink">サンプル（食品卸・FAX注文の転記を自動化）の結果</a></p>' : '');
    var wrap = $('#opts');
    opts.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.id = 'opt-' + key + '-' + o.id;
      if (multi) b.dataset.multi = '1';
      var sel = multi ? state.integs.indexOf(o.id) >= 0 : state[key] === o.id;
      b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      b.innerHTML = '<span class="t">' + T.esc(o.t) + '</span><span class="s">' + T.esc(o.s || '') + '</span>';
      b.addEventListener('click', function () {
        if (multi) {
          if (o.id === 'none') state.integs = ['none'];
          else {
            state.integs = state.integs.filter(function (x) { return x !== 'none'; });
            var at = state.integs.indexOf(o.id);
            if (at >= 0) state.integs.splice(at, 1); else state.integs.push(o.id);
          }
          wrap.querySelectorAll('.opt').forEach(function (x) { x.setAttribute('aria-pressed', state.integs.indexOf(x.id.split('-').pop()) >= 0 ? 'true' : 'false'); });
          $('#next').disabled = state.integs.length === 0;
          return;
        }
        if (key === 'cat') {
          if (o.id === 'undecided') { showBranch(); return; }
          if (state.cat !== o.id) { state.scale = null; state.method = null; state.integs = []; }
        }
        state[key] = o.id;
        T.track('tool_step', { kind: 'estimate', step: state.step + 1, value: o.id });
        if (state.step < 5) { state.step++; showQuestion(); } else showResult();
      });
      wrap.appendChild(b);
    });
    if (multi) $('#next').disabled = state.integs.length === 0;
    $('#back').addEventListener('click', function () { if (state.step > 0) { state.step--; showQuestion(); } });
    var nx = $('#next'); if (nx && !nx.hidden) nx.addEventListener('click', function () { state.step++; showQuestion(); });
    var sl = $('#sampleLink'); if (sl) sl.addEventListener('click', function (e) { e.preventDefault(); state = { step: 6, cat: 'auto', scale: 's', method: 'paper', integs: ['sales'], urg: 'q', bud: 'b30' }; showResult(); });
  }

  function showBranch() {
    $('#qcard').hidden = true; $('#result').hidden = true;
    var b = $('#branch'); b.hidden = false;
    b.innerHTML = '<div class="qnum">まだ決まっていなくて大丈夫です</div><h2 class="q">「何から手を付けるか」で止まっている会社がいちばん多いです</h2>' +
      '<p class="qhelp">業種と困っている業務を選ぶだけの30秒診断で、AIが効く業務の上位5つと費用の目安を出します。</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn--primary btn--sm" href="/tools/ai-fit">「AIで何ができる？」30秒診断へ →</a><button type="button" class="btn btn--sm" style="border-color:var(--text)" id="branchBack">やっぱり自分で選ぶ</button></div>' +
      '<p class="tool-sample">目安だけ先に知りたい場合：<b>ホームページ 30万円〜</b>／<b>業務自動化 10万円〜（1業務）</b>／<b>問い合わせAI 10万円〜</b>／<b>AI利用ルール 10万円〜</b>（税別）</p>';
    $('#branchBack').addEventListener('click', showQuestion);
  }

  function round5(n) { return Math.round(n / 5) * 5; }
  function calc() {
    var c = CATS[state.cat];
    var sc = c.scales.filter(function (s) { return s.id === state.scale; })[0];
    var me = c.methods.filter(function (m) { return m.id === state.method; })[0];
    var ur = URG.filter(function (u) { return u.id === state.urg; })[0];
    var bd = BUD.filter(function (b) { return b.id === state.bud; })[0];
    var integs = c.integs.filter(function (i) { return state.integs.indexOf(i.id) >= 0 && i.id !== 'none'; });
    var addLo = integs.reduce(function (a, i) { return a + i.add[0]; }, 0), addHi = integs.reduce(function (a, i) { return a + i.add[1]; }, 0);
    var baseLo = sc.base[0], baseHi = sc.base[1];
    var methLo = baseLo * me.k[0], methHi = baseHi * me.k[1];
    var urgLo = (baseLo + methLo + addLo) * ur.k, urgHi = (baseHi + methHi + addHi) * ur.k;
    var lo = round5(baseLo + methLo + addLo + urgLo), hi = round5(baseHi + methHi + addHi + urgHi);
    var wk = [sc.weeks[0] + (integs.length ? 1 : 0), sc.weeks[1] + (integs.length ? 2 : 0) + (me.k[1] >= 0.15 ? 1 : 0)];
    return { c: c, sc: sc, me: me, ur: ur, bd: bd, integs: integs, baseLo: baseLo, baseHi: baseHi, methLo: methLo, methHi: methHi, urgLo: urgLo, urgHi: urgHi, lo: lo, hi: hi, wk: wk };
  }

  function showResult() {
    $('#qcard').hidden = true; $('#branch').hidden = true; $('#stepper').hidden = true;
    var r = calc(); var el = $('#result'); el.hidden = false;
    var d = T.today();
    var condText = r.c.short + '（' + r.sc.t + '／' + r.me.t + (r.integs.length ? '／' + r.integs.map(function (i) { return i.t; }).join('・') : '') + (r.ur.id === 'fast' ? '／特急' : '') + '）';
    var rows = [];
    r.c.breakdown.forEach(function (b) { rows.push({ n: b[0], lo: round5(r.baseLo * b[1]), hi: round5(r.baseHi * b[1]) }); });
    if (r.methLo || r.methHi) rows.push({ n: '現状対応の調整', e: r.me.s, lo: round5(r.methLo), hi: round5(r.methHi) });
    r.integs.forEach(function (i) { rows.push({ n: '連携：' + i.t, e: i.s, lo: i.add[0], hi: i.add[1] }); });
    if (r.ur.k) rows.push({ n: '特急対応（+15%）', e: '1か月以内の納品', lo: round5(r.urgLo), hi: round5(r.urgHi) });
    var maxHi = Math.max.apply(null, rows.map(function (x) { return x.hi; }).concat([1]));
    var budgetNote;
    if (r.bd.cap !== null && r.lo > r.bd.cap) budgetNote = '<div class="note-red"><b>ご予算（' + r.bd.t + '）に収めるなら</b>下の「小さく始めるなら」の形が現実的です。範囲を絞れば、先に効果の出る部分だけを' + r.bd.t + '以内で進められます。</div>';
    else if (r.bd.cap !== null) budgetNote = '<div class="note-red"><b>ご予算（' + r.bd.t + '）の範囲内です</b>下限〜上限のどこに落ち着くかは、上振れ条件に当てはまるかで決まります。</div>';
    else if (r.bd.id === 'monthly') budgetNote = '<div class="note-red"><b>月額で払いたい場合</b>' + r.c.monthly + '</div>';
    else budgetNote = '<div class="note-red"><b>相場の感覚として</b>同じ内容を制作会社に頼むと、見積りは10万〜300万円超まで幅があります。この概算は「AIで作る分、人件費を乗せない」前提の金額です。</div>';

    var share = location.pathname + '?c=' + state.cat + '&s=' + state.scale + '&m=' + state.method + '&i=' + state.integs.join(',') + '&u=' + state.urg + '&b=' + state.bud;
    try { history.replaceState(null, '', share); } catch (_) {}

    el.innerHTML =
      '<div class="res-title"><h2>概算の結果</h2><p class="sub">' + d + '　税別・目安　No. ' + state.cat.toUpperCase() + '-' + r.sc.id.toUpperCase() + '</p></div>' +
      '<div class="res-stats">' +
      '<div class="res-stat"><div class="big">' + fmt(r.lo) + '<small>万</small>〜' + fmt(r.hi) + '<small>万円</small></div><div class="lab">概算金額</div></div>' +
      '<div class="res-stat"><div class="big">' + r.wk[0] + '〜' + r.wk[1] + '<small>週間</small></div><div class="lab">ご契約から稼働まで</div></div>' +
      '<div class="res-stat"><div class="big txt">' + T.esc(r.sc.plan) + '</div><div class="lab">プラン目安</div></div></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Estimate Sheet</span><span class="d">' + d + '</span></div>' +
      '<div class="conds">対象：<b>' + T.esc(condText) + '</b>' + (state.cat === 'auto' && state.method === 'paper' ? '<br><span style="color:var(--text)">今のFAX・紙はそのままで構いません。届いた帳票をAIが読み取って入力する部分だけを自動化します。</span>' : '') + '</div>' +
      '<div class="section-h">内訳</div><div class="rows">' +
      rows.map(function (x) { return '<div class="row"><div class="n">' + T.esc(x.n) + (x.e ? '<em>' + T.esc(x.e) + '</em>' : '') + '</div><div class="v">' + (x.lo === x.hi ? fmt(x.hi) : fmt(x.lo) + '〜' + fmt(x.hi)) + '<small>万</small></div><div class="bar" aria-hidden="true"><i style="width:' + Math.max(4, Math.round(x.hi / maxHi * 100)) + '%"></i></div></div>'; }).join('') +
      '<div class="row"><div class="n"><b>合計</b></div><div class="v">' + fmt(r.lo) + '〜' + fmt(r.hi) + '<small>万円</small></div></div></div>' +
      '<div class="section-h">この金額が上振れする3つの条件</div><ul class="list">' + r.c.up.map(function (u, i) { return '<li><span class="m">0' + (i + 1) + '</span><span>' + T.esc(u) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="min"><b>小さく始めるなら：' + T.esc(r.c.minimum[0]) + '</b>' + T.esc(r.c.minimum[1]) + '</div>' + budgetNote + '</div>' +
      '<div class="res-title"><h2>次にできること</h2><p class="sub">どれを選んでも営業電話はしません</p></div>' +
      '<div class="ctas" id="ctas"></div>' +
      '<div class="again"><button type="button" class="btn btn--ghost" id="editBtn">← 条件を変える</button><span>実績：' + T.esc(r.c.sample) + '。<a href="' + r.c.demo + '">関連ページを見る</a></span></div>';

    var memo = ['【概算見積メモ】Nortiq Labs（nortiqlab.com）　' + d, '対象：' + condText,
      '概算金額：' + fmt(r.lo) + '〜' + fmt(r.hi) + '万円（税別）　期間：' + r.wk[0] + '〜' + r.wk[1] + '週間', 'プラン目安：' + r.sc.plan, '',
      '■ 内訳'].concat(rows.map(function (x) { return '・' + x.n + '：' + (x.lo === x.hi ? fmt(x.hi) : fmt(x.lo) + '〜' + fmt(x.hi)) + '万円'; }))
      .concat(['', '■ 上振れする条件']).concat(r.c.up.map(function (u, i) { return (i + 1) + '. ' + u; }))
      .concat(['', '■ 小さく始めるなら：' + r.c.minimum[0] + '（' + r.c.minimum[1] + '）', '■ 月額について：' + r.c.monthly, '',
        '※ 連絡先の入力なしで出した目安です。正式見積りは内容確認のうえ作成し、概算を超える場合は理由を先にお伝えします。',
        'この結果のURL：https://nortiqlab.com' + share]).join('\n');

    T.renderCtas($('#ctas'), {
      memo: memo, kind: 'tools-estimate', memoLabel: '見積メモをコピー',
      quoteTitle: 'この内容で正式見積りを依頼する',
      quoteDesc: '上の条件をそのまま引き継ぎます。概算を超える場合は、理由を先にお伝えします。営業日なら24時間以内に一次返信、ホームページなら無料でトップページのモックアップもお出しします。',
      quoteBtn: '正式見積りを依頼する →', lineUrl: T.LINE_URL,
      extraFields: [['対象', condText], ['概算', fmt(r.lo) + '〜' + fmt(r.hi) + '万円'], ['期間', r.wk[0] + '〜' + r.wk[1] + '週間'], ['予算感', r.bd.t], ['結果URL', share]]
    });
    $('#editBtn').addEventListener('click', function () { state.step = 0; showQuestion(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    T.track('tool_result', { kind: 'estimate', cat: state.cat, lo: r.lo, hi: r.hi });
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  if (state.step >= 6) showResult(); else showQuestion();
})();
