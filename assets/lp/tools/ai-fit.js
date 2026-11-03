/* /tools/ai-fit — AIで何ができる？業種別30秒診断
 * 業種 × 困っている業務 (最大3) × 従業員数 × 今のAI利用 → 効く業務トップ5・削減時間・費用レンジ。
 * USECASES: 効果 (eff 1-5)・導入しやすさ (ease 1-5)・1件あたりの分数 (min)・月の標準件数 (vol)・費用レンジ (cost 万円)。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, fmt = T.fmt;

  var INDUSTRIES = [
    { id: 'food', t: '食品卸・市場・水産', s: 'FAX注文・納品書・在庫' },
    { id: 'logi', t: '物流・運送', s: '配送依頼・日報・請求' },
    { id: 'mfg', t: '製造・部品・資材', s: '受発注・在庫・現場帳票' },
    { id: 'build', t: '建設・設備・工務店', s: '写真・日報・見積' },
    { id: 'med', t: '病院・介護・クリニック', s: '在庫・記録・電話' },
    { id: 'retail', t: '小売・EC・飲食', s: '受注・在庫・予約・口コミ' },
    { id: 'pro', t: '士業・不動産・コンサル', s: '問い合わせ・書類・集客' },
    { id: 'other', t: 'その他', s: '業務だけ選べば判定できます' }];

  var TASKS = [
    { id: 'fax', t: 'FAX・電話で来た注文の入力', s: '転記・手打ち' },
    { id: 'inv', t: '請求書の作成・送付', s: '月末にまとめて' },
    { id: 'pay', t: '入金の確認・消し込み', s: '通帳と突き合わせ' },
    { id: 'stock', t: '在庫の確認・発注', s: '数が合わない' },
    { id: 'quote', t: '見積書の作成', s: 'Excelで手作業' },
    { id: 'daily', t: '日報・現場写真の整理', s: '帰ってから入力' },
    { id: 'tel', t: '電話の問い合わせ対応', s: '同じ質問が多い' },
    { id: 'form', t: 'メール・フォームの返信', s: '返しきれない' },
    { id: 'web', t: 'ホームページ・SNSの更新', s: '更新する人がいない' },
    { id: 'resv', t: '予約の受付・リマインド', s: '無断キャンセル' },
    { id: 'doc', t: '社内マニュアル・資料探し', s: '聞かれるたびに答える' },
    { id: 'recruit', t: '求人票・採用の事務', s: '応募が来ない' }];

  // 業務ごとのユースケース。ind に業種IDがあればその業種で加点。
  var USECASES = {
    fax: { name: 'FAX・注文書のAI読み取り→システム入力', eff: 5, ease: 4, min: 4, vol: 400, cost: [10, 50], ind: ['food', 'mfg', 'logi'], how: '届いたFAX・注文書の画像をAIが読み取り、販売管理やExcelに入力。人は確認だけ。取引先にFAXをやめてもらう必要はありません。' },
    inv: { name: '請求書の自動作成・送付', eff: 4, ease: 4, min: 8, vol: 120, cost: [10, 40], ind: ['logi', 'build', 'pro'], how: '受注データや作業記録から請求書を下書きし、承認後にメール送付。会計ソフトとも連携できます。' },
    pay: { name: '入金消し込みの自動化', eff: 4, ease: 3, min: 5, vol: 150, cost: [15, 45], ind: ['food', 'logi', 'mfg'], how: '銀行明細と請求データを突き合わせて消し込み、差異だけを人に出します。' },
    stock: { name: '在庫の突き合わせ・発注案の自動作成', eff: 4, ease: 3, min: 3, vol: 300, cost: [25, 80], ind: ['med', 'retail', 'mfg', 'food'], how: '在庫数とシステムの差異を自動で検出し、発注点を下回った品目の発注案を作ります。' },
    quote: { name: '見積書の下書きAI', eff: 4, ease: 4, min: 20, vol: 40, cost: [10, 35], ind: ['build', 'mfg', 'pro'], how: 'ヒアリング内容と単価表から見積書を下書き。過去の見積を学習して項目を提案します。' },
    daily: { name: '写真・音声→日報の自動作成', eff: 4, ease: 4, min: 15, vol: 60, cost: [10, 40], ind: ['build', 'logi'], how: '現場写真と一言の音声から、日報や写真台帳を自動で作成。現場から帰ってからの入力をなくします。' },
    tel: { name: '電話の一次対応AI・よくある質問の自動応答', eff: 4, ease: 3, min: 5, vol: 200, cost: [10, 50], ind: ['med', 'retail', 'pro'], how: '営業時間・料金・場所などの定型質問をAIが答え、必要な場合だけ人につなぎます。' },
    form: { name: 'メール・フォームの一次返信AI', eff: 4, ease: 5, min: 10, vol: 80, cost: [10, 25], ind: ['pro', 'retail', 'build'], how: '問い合わせに24時間以内の一次返信を自動で。人は内容を確認して送るだけ。' },
    web: { name: 'LINEで送るだけのサイト・SNS更新', eff: 3, ease: 5, min: 30, vol: 8, cost: [10, 30], ind: ['retail', 'build', 'pro'], how: '写真と一言をLINEで送ると、お知らせ・施工事例・Googleビジネスプロフィールに反映。更新担当がいなくても回ります。' },
    resv: { name: '予約受付とリマインドの自動化', eff: 4, ease: 4, min: 6, vol: 150, cost: [10, 40], ind: ['med', 'retail'], how: 'LINE・Webで予約を受け、前日にリマインド。無断キャンセルを減らします。' },
    doc: { name: '社内マニュアルに答えるAI', eff: 3, ease: 4, min: 10, vol: 60, cost: [10, 40], ind: ['mfg', 'med', 'logi'], how: 'PDFやマニュアルを読ませて、社員の質問にAIが答える。属人化していた知識を共有します。' },
    recruit: { name: '求人票の自動作成・応募者への一次連絡', eff: 3, ease: 4, min: 20, vol: 20, cost: [10, 30], ind: ['build', 'logi', 'med'], how: '求人票の文章をAIが下書きし、応募者への返信と日程調整を自動化。' }
  };
  var SIZE = [
    { id: 's', t: '1〜5人', s: '社長が事務も兼ねている', k: 0.8 },
    { id: 'm', t: '6〜30人', s: '事務担当が1〜2人', k: 1 },
    { id: 'l', t: '31人以上', s: '部署ごとに担当がいる', k: 1.6 }];
  var AI = [
    { id: 'none', t: '使っていない', s: 'これから' },
    { id: 'personal', t: '個人で使っている人がいる', s: 'ルールはない' },
    { id: 'company', t: '会社として使っている', s: '一部の業務で' }];
  var STEP_LABELS = ['業種', '困っている業務', '従業員数', 'AIの利用状況'];
  var state = { step: 0, ind: null, tasks: [], size: null, ai: null };

  function answered(i) { return !![state.ind, state.tasks.length > 0, state.size, state.ai][i]; }
  function renderStepper() {
    var el = $('#stepper'); el.innerHTML = '';
    STEP_LABELS.forEach(function (l, i) {
      var b = document.createElement('button'); b.type = 'button';
      var done = answered(i);
      b.className = (done && i !== state.step ? 'done ' : '') + (i === state.step ? 'cur' : '');
      b.innerHTML = '<span class="seg"></span><span class="lbl">' + (i + 1) + '. ' + l + '</span>';
      b.disabled = !(i <= state.step || done);
      b.addEventListener('click', function () { state.step = i; show(); });
      el.appendChild(b);
    });
  }

  function show() {
    $('#result').hidden = true; $('#qcard').hidden = false; $('#stepper').hidden = false;
    renderStepper();
    var card = $('#qcard'); var q, help, opts, key, multi = false;
    switch (state.step) {
      case 0: q = '業種はどれに近いですか？'; help = '近いものを1つ。なければ「その他」で、次の業務だけで判定します。'; opts = INDUSTRIES; key = 'ind'; break;
      case 1: q = '困っている業務を選んでください（最大3つ）'; help = 'いちばん時間を取られているものから。'; opts = TASKS; key = 'tasks'; multi = true; break;
      case 2: q = '従業員数は？'; help = '削減時間の目安に使います。'; opts = SIZE; key = 'size'; break;
      case 3: q = '今、AIは使っていますか？'; help = '最初の一歩の提案が変わります。'; opts = AI; key = 'ai'; break;
      default: result(); return;
    }
    card.innerHTML = '<div class="qnum">Question ' + (state.step + 1) + ' / 4</div><h2 class="q">' + q + '</h2><p class="qhelp">' + help + '</p><div class="opts" id="opts" role="group"></div>' +
      '<div class="tool-nav"><button type="button" class="btn btn--ghost" id="back" ' + (state.step === 0 ? 'disabled' : '') + '>← 戻る</button><button type="button" class="btn btn--primary btn--sm" id="next" ' + (multi ? '' : 'hidden') + '>次へ →</button></div>';
    var wrap = $('#opts');
    opts.forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; if (multi) b.dataset.multi = '1';
      var sel = multi ? state.tasks.indexOf(o.id) >= 0 : state[key] === o.id;
      b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      b.innerHTML = '<span class="t">' + T.esc(o.t) + '</span><span class="s">' + T.esc(o.s || '') + '</span>';
      b.addEventListener('click', function () {
        if (multi) {
          var at = state.tasks.indexOf(o.id);
          if (at >= 0) state.tasks.splice(at, 1);
          else { if (state.tasks.length >= 3) return; state.tasks.push(o.id); }
          b.setAttribute('aria-pressed', state.tasks.indexOf(o.id) >= 0 ? 'true' : 'false');
          $('#next').disabled = state.tasks.length === 0;
          return;
        }
        state[key] = o.id;
        T.track('tool_step', { kind: 'ai-fit', step: state.step + 1, value: o.id });
        if (state.step < 3) { state.step++; show(); } else result();
      });
      wrap.appendChild(b);
    });
    if (multi) $('#next').disabled = state.tasks.length === 0;
    $('#back').addEventListener('click', function () { if (state.step > 0) { state.step--; show(); } });
    var nx = $('#next'); if (nx && !nx.hidden) nx.addEventListener('click', function () { state.step++; show(); });
  }

  function result() {
    $('#qcard').hidden = true; $('#stepper').hidden = true;
    var size = SIZE.filter(function (s) { return s.id === state.size; })[0];
    var ind = INDUSTRIES.filter(function (i) { return i.id === state.ind; })[0];
    var ai = AI.filter(function (a) { return a.id === state.ai; })[0];
    // スコア: 選んだ業務 +6、業種一致 +2、効果×1、容易さ×0.8
    var scored = Object.keys(USECASES).map(function (id) {
      var u = USECASES[id];
      var s = u.eff * 1 + u.ease * 0.8 + (state.tasks.indexOf(id) >= 0 ? 6 : 0) + (u.ind.indexOf(state.ind) >= 0 ? 2 : 0);
      var hours = Math.round(u.vol * size.k * u.min / 60 * (u.ease >= 4 ? 0.75 : 0.6));
      return { id: id, u: u, s: s, hours: hours, picked: state.tasks.indexOf(id) >= 0 };
    }).sort(function (a, b) { return b.s - a.s; }).slice(0, 5);
    var totalH = scored.filter(function (x) { return x.picked; }).reduce(function (a, x) { return a + x.hours; }, 0) || scored[0].hours;
    var first = scored[0];
    var firstStep = state.ai === 'none' ? '最初の一歩は、1業務だけ・月額から。「' + first.u.name + '」を1か月試して、効果が出たら次へ。'
      : state.ai === 'personal' ? '個人利用が始まっている会社は、先に入力ルール（<a href="/tools/ai-risk">12問のリスク診断</a>）を決めてから「' + first.u.name + '」に進むと安全です。'
      : '会社として使えているなら、業務に組み込む段階です。「' + first.u.name + '」をシステム化して、人の確認だけ残します。';
    var d = T.today();
    var el = $('#result'); el.hidden = false;
    el.innerHTML =
      '<div class="res-title"><h2>AIが効く業務 トップ5</h2><p class="sub">' + T.esc(ind.t) + '・' + T.esc(size.t) + '・' + d + '</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + fmt(totalH) + '<small>時間/月</small></div><div class="lab">選んだ業務の削減時間の目安</div></div>' +
      '<div class="res-stat"><div class="big">' + fmt(first.u.cost[0]) + '<small>万</small>〜' + fmt(first.u.cost[1]) + '<small>万円</small></div><div class="lab">1位の費用レンジ（税別）</div></div>' +
      '<div class="res-stat"><div class="big txt">' + (first.u.ease >= 4 ? '低' : first.u.ease >= 3 ? '中' : '高') + '</div><div class="lab">1位の導入難易度</div></div></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">AI Fit Result</span><span class="d">' + d + '</span></div><div class="rows">' +
      scored.map(function (x, i) {
        return '<div class="row" style="grid-template-columns:28px 1fr auto"><span class="m" style="font-family:var(--font-latin);color:var(--accent);font-weight:700">0' + (i + 1) + '</span><div class="n">' + T.esc(x.u.name) + (x.picked ? ' <span style="font-size:11px;color:var(--accent);border:1px solid var(--accent);border-radius:3px;padding:0 6px">選んだ業務</span>' : '') + '<em>' + T.esc(x.u.how) + '</em></div><div class="v">' + fmt(x.hours) + '<small>時間/月</small><br><small>' + fmt(x.u.cost[0]) + '〜' + fmt(x.u.cost[1]) + '万円・難易度' + (x.u.ease >= 4 ? '低' : x.u.ease >= 3 ? '中' : '高') + '</small></div></div>';
      }).join('') + '</div>' +
      '<div class="min"><b>最初の一歩</b>' + firstStep + '</div></div>' +
      '<div class="res-title"><h2>次にできること</h2><p class="sub">どれを選んでも営業電話はしません</p></div>' +
      '<div class="tool-card" style="margin-bottom:12px"><div class="h" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><a class="btn btn--primary btn--sm" href="/tools/estimate?c=auto&s=' + (state.tasks.length >= 2 ? 'm' : 's') + '&m=paper">この内容で概算見積を出す →</a>' + (first.id === 'fax' ? '<a class="btn btn--outline btn--sm" href="/tools/document-demo">FAX注文書の読み取りを試す</a>' : '') + '<a class="btn btn--outline btn--sm" href="/tools/manual-cost">年間コストを計算する</a></div></div>' +
      '<div class="ctas" id="ctas"></div>' +
      '<div class="again"><button type="button" class="btn btn--ghost" id="editBtn">← 条件を変える</button></div>';

    var memo = ['【AIで何ができる？診断】Nortiq Labs　' + d, '業種：' + ind.t + '　従業員：' + size.t + '　AI利用：' + ai.t,
      '困っている業務：' + state.tasks.map(function (t) { return TASKS.filter(function (x) { return x.id === t; })[0].t; }).join('・'), '',
      '■ AIが効く業務 トップ5'].concat(scored.map(function (x, i) { return (i + 1) + '. ' + x.u.name + '（月' + x.hours + '時間削減の目安／' + x.u.cost[0] + '〜' + x.u.cost[1] + '万円）'; }))
      .concat(['', '■ 最初の一歩：' + firstStep.replace(/<[^>]+>/g, ''), '', '※ 削減時間・費用は目安です。実際の件数と帳票で無料で試算し直します。']).join('\n');
    T.renderCtas($('#ctas'), { memo: memo, kind: 'tools-ai-fit', memoLabel: '診断結果をコピー', shareTitle: '結果を社内で共有する', shareDesc: '社長や上司への説明用テキストです。メールを入れると、費用目安つきの詳細レポートをお送りします（任意）。',
      quoteTitle: 'この業務について相談する', quoteDesc: '上の結果を引き継ぎます。実際の帳票と件数を見せていただければ、無料で試算し直します。', quoteBtn: '相談を依頼する →', lineUrl: T.LINE_URL,
      extraFields: [['業種', ind.t], ['業務', state.tasks.join(',')], ['1位', first.u.name], ['従業員', size.t]] });
    $('#editBtn').addEventListener('click', function () { state.step = 0; show(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    T.track('tool_result', { kind: 'ai-fit', ind: state.ind, first: first.id });
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  show();
})();
