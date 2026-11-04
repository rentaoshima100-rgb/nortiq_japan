/* /tools/ai-risk — 社内AI利用リスク診断 (12問) + 生成AI利用ルール雛形
 * 加点方式。はい/いいえ/分からない。risk: 「はい」で加点する問 (yes:true) と「いいえ」で加点する問 (yes:false)。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$;

  var QS = [
    { id: 'personal', t: '個人アカウントで業務の文章を扱っている', q: '社員が個人のアカウント（無料版ChatGPTなど）で業務の文章を扱っていますか？', yes: true, w: 3, fix: '会社のアカウントまたは法人プランに切り替え、個人アカウントでの業務利用を止める。' },
    { id: 'pii', t: '顧客・取引先の個人情報をAIに入力している', q: '顧客・取引先の個人情報（氏名・住所・電話・カルテ等）をAIに入力したことがありますか？', yes: true, w: 4, fix: '個人情報は入力禁止にするか、入力前に匿名化する。入力を自動で止める仕組み（入力チェック）を入れる。' },
    { id: 'secret', t: '社外秘の資料をAIに読ませている', q: '見積・原価・契約書など社外秘の資料をAIに読ませていますか？', yes: true, w: 3, fix: '社外秘は「学習に使われない設定」のサービスだけに限定し、対象を文書で決める。' },
    { id: 'rule', t: 'AI利用のルールが文書で決まっていない', q: 'AI利用のルール（何を入れてよいか・いけないか）が文書で決まっていますか？', yes: false, w: 3, fix: '下の雛形を元に、A4・2枚のルールを作って全員に配る。' },
    { id: 'who', t: '誰が何のAIを使っているか把握できていない', q: '誰がどのAIサービスを使っているか、会社として把握していますか？', yes: false, w: 2, fix: '利用しているサービスと担当者の一覧を作る（5分で済みます）。' },
    { id: 'check', t: 'AIの出力を人が確認する決まりがない', q: 'AIの出力（文章・数字・コード）を、人が確認してから使う決まりがありますか？', yes: false, w: 2, fix: '「AIが下書き、人が承認」を原則にする。対外文書は必ず人が確認。' },
    { id: 'train', t: '「学習に使わない設定」を確認していない', q: '使っているAIサービスが「入力内容を学習に使わない設定」になっているか確認しましたか？', yes: false, w: 2, fix: '各サービスの設定・規約を確認し、オプトアウトできるものは切る。' },
    { id: 'share', t: '会話ログやアカウントを複数人で共有している', q: 'AIの会話ログやアカウントを複数人で共有していますか？', yes: true, w: 2, fix: 'アカウントは1人1つ。共有はやめ、退職時に停止する手順を決める。' },
    { id: 'edu', t: '社員向けの説明を行っていない', q: '社員向けにAIの使い方・注意点の説明を1回でも行いましたか？', yes: false, w: 1, fix: '30分の説明会を1回。ルールと「迷ったら聞く先」を伝える。' },
    { id: 'incident', t: '誤入力時の報告先・手順が決まっていない', q: 'AIに入れてはいけない情報を入れてしまった時の報告先・手順が決まっていますか？', yes: false, w: 2, fix: '報告先（担当者）と初動（該当会話の削除・影響範囲の確認）を1枚にまとめる。' },
    { id: 'external', t: 'AIの文章を確認せずに顧客へ送ったことがある', q: 'AIが作った文章を、確認せずにそのまま顧客に送ったことがありますか？', yes: true, w: 2, fix: '対外文書は送信前に人が読む。定型の一次返信は、テンプレートを決めてから自動化する。' },
    { id: 'vendor', t: '契約に「第三者（AI）に渡さない」条項がある', q: '取引先・顧客との契約に「情報を第三者（AI含む）に渡さない」条項が含まれていますか？', yes: true, w: 2, fix: '契約上の制約がある情報は入力対象から外す。必要なら取引先に利用方針を説明する。' }];
  var IND_W = { med: 1.3, fin: 1.3, other: 1, mfg: 1, retail: 1, it: 1 };

  var qs = $('#qs'); var ans = {};
  QS.forEach(function (q, i) {
    var w = T.el('div', 'tool-card', '<div class="qnum">Q' + (i + 1) + '</div><p style="font-weight:700;color:var(--text);margin:4px 0 10px">' + T.esc(q.q) + '</p><div class="yn" role="group"></div>');
    w.style.boxShadow = 'none'; w.style.marginTop = '10px';
    var g = w.querySelector('.yn');
    [['yes', 'はい'], ['no', 'いいえ'], ['dk', '分からない']].forEach(function (o) {
      var b = T.el('button', 'opt', '<span class="t">' + o[1] + '</span>'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { ans[q.id] = o[0]; g.querySelectorAll('.opt').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); });
      g.appendChild(b);
    });
    qs.appendChild(w);
  });

  $('#run').addEventListener('click', function () {
    var missing = QS.filter(function (q) { return !ans[q.id]; });
    if (missing.length) { alertMissing(missing.length); return; }
    var ind = $('#industry').value; var co = $('#coname').value.trim() || '当社';
    var score = 0, max = 0, hits = [];
    QS.forEach(function (q) {
      max += q.w;
      var a = ans[q.id];
      var risky = a === 'dk' ? 0.6 : ((q.yes && a === 'yes') || (!q.yes && a === 'no')) ? 1 : 0;
      if (risky) { score += q.w * risky; hits.push({ q: q, dk: a === 'dk' }); }
    });
    var pct = Math.round(score / max * 100 * (IND_W[ind] || 1));
    pct = Math.min(100, pct);
    var level = pct >= 60 ? ['■', '要対応', 'すぐに手を付けるべき状態です。個人情報・社外秘の入力が止まっていない可能性があります。'] :
      pct >= 40 ? ['▲', '高', '使い方が個人任せで、会社として把握できていません。ルールと入力チェックを先に。'] :
      pct >= 20 ? ['△', '中', '基本はできています。文書化と確認の決まりを足せば十分です。'] : ['◇', '低', '整っています。年1回の見直しと、新しいツールを入れる時の確認だけ続けてください。'];
    hits.sort(function (a, b) { return b.q.w - a.q.w; });
    var d = T.today();
    var el = $('#result'); el.hidden = false;
    var tmpl = template(co, ind);
    el.innerHTML =
      '<div class="res-title"><h2>診断結果</h2><p class="sub">' + d + '　' + T.esc(co) + '</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big txt"><span class="level"><span class="sym">' + level[0] + '</span>' + level[1] + '</span></div><div class="lab">リスクレベル（' + pct + '点/100）</div></div>' +
      '<div class="res-stat"><div class="big">' + hits.length + '<small>項目</small></div><div class="lab">対策が必要な項目</div></div>' +
      '<div class="res-stat"><div class="big">' + hits.filter(function (h) { return h.dk; }).length + '<small>項目</small></div><div class="lab">「分からない」＝把握できていない</div></div></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">AI Risk Result</span><span class="d">' + d + '</span></div><div class="conds">' + level[2] + (ind === 'med' ? '<br><b>医療・福祉</b>は、生成AIの利用率が8割超なのにルール整備が5%未満という調査があり、要配慮個人情報を扱うため加重しています。' : ind === 'fin' ? '<br><b>金融・士業</b>は個人情報と守秘義務の両方が絡むため加重しています。' : '') + '</div>' +
      '<div class="section-h">優先順の対策</div><div class="rows">' + (hits.length ? hits.map(function (h, i) { return '<div class="rec"><span class="m">0' + (i + 1) + '</span><div><b style="color:var(--text)">' + T.esc(h.q.t) + '</b>' + (h.dk ? '<span style="font-size:11px;color:var(--accent);margin-left:6px">把握できていない</span>' : '') + '<br><span style="font-size:14px">' + T.esc(h.q.fix) + '</span></div></div>'; }).join('') : '<div class="rec"><span class="m">—</span><div>対策が必要な項目はありません。</div></div>') + '</div>' +
      '<div class="min"><b>生成AI利用ルール 雛形（A4・2枚）</b>下のテキストを社内の書式に貼って使ってください。業種固有の法令と、使っているサービスの規約に合わせて調整が必要です。</div>' +
      '<div style="padding:0 clamp(18px,4vw,26px) 18px"><div class="copybox" id="tmpl" style="max-height:320px">' + T.esc(tmpl) + '</div><div class="ctl" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="btn btn--outline btn--sm" id="copyTmpl">雛形をコピー</button><button type="button" class="btn btn--sm" style="border-color:var(--text)" id="dlTmpl">テキストでダウンロード</button></div></div></div>' +
      '<div class="res-title"><h2>次にできること</h2><p class="sub">どれを選んでも営業電話はしません</p></div>' +
      '<div class="tool-card" style="margin-bottom:12px"><p style="font-size:14px;margin-bottom:10px"><b>入力を自動でチェックする仕組み（VetoNet）</b>：社員がAIに送る前に、個人情報・社外秘が含まれていないかを自動で止めます。ルールを「守ってもらう」から「守られる」に変えます。</p><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn--primary btn--sm" href="/tools/estimate?c=sec&s=' + (ind === 'med' || ind === 'fin' ? 'm' : 's') + '&m=paper">ルール策定＋入力チェックの概算を出す →</a><a class="btn btn--outline btn--sm" href="/product-vetonet">VetoNetを見る</a></div></div>' +
      '<div class="ctas" id="ctas"></div>';
    $('#copyTmpl').addEventListener('click', function () { T.copyText(tmpl, $('#copyTmpl'), $('#tmpl')); });
    $('#dlTmpl').addEventListener('click', function () { if (!T.download('生成AI利用ルール_' + co + '.txt', tmpl)) T.copyText(tmpl, $('#dlTmpl'), $('#tmpl')); });
    var memo = ['【社内AI利用リスク診断】Nortiq Labs　' + d, '会社：' + co + '　リスクレベル：' + level[1] + '（' + pct + '点/100）', level[2], '', '■ 優先順の対策'].concat(hits.map(function (h, i) { return (i + 1) + '. ' + h.q.fix; })).concat(['', '■ 雛形は別途（画面からコピー・ダウンロード）']).join('\n');
    T.renderCtas($('#ctas'), { memo: memo, kind: 'tools-ai-risk', askExamples: '「うちの規模でもルールは要る？」「雛形のここはどう直す？」', memoLabel: '診断結果をコピー', shareTitle: '結果と雛形を社内で共有する', shareDesc: 'メールを入れると、診断結果と雛形（Word形式）をお送りします（任意）。',
      quoteTitle: '自社の業務に合わせたルールを作ってもらう', quoteDesc: '雛形を業種・業務・使っているサービスに合わせて仕上げます（10万円〜・約2週間）。入力チェックの仕組みまで含める場合も相談できます。', quoteBtn: '相談を依頼する →', lineUrl: T.LINE_URL,
      extraFields: [['リスクレベル', level[1] + '（' + pct + '点）'], ['業種', ind], ['要対策', hits.length + '項目']] });
    T.track('tool_result', { kind: 'ai-risk', level: level[1], pct: pct });
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  function alertMissing(n) {
    var m = $('#qcard').querySelector('.msg') || T.el('div', 'msg err');
    m.className = 'msg err'; m.textContent = '未回答が' + n + '問あります。「分からない」でも構いませんので、すべて選んでください。';
    $('#qcard').appendChild(m);
  }

  function template(co, ind) {
    var extra = ind === 'med' ? '\n・患者・利用者の氏名、生年月日、診療・介護記録、画像（マスキング済みを除く）' : ind === 'fin' ? '\n・顧客の資産・取引・信用に関する情報、依頼内容の個別事実' : '';
    return [co + ' 生成AI利用ルール（第1版）', '制定日：' + T.today().replace(/\./g, '/') + '　管理責任者：＿＿＿＿', '',
      '1. 目的', '生成AI（ChatGPT、Gemini、Claude など）を業務で安全に使うための最低限の決まりを定める。', '',
      '2. 使ってよいサービス', '・会社が契約・承認したサービスのみ（一覧は別紙）。個人アカウントでの業務利用は禁止。', '・新しいサービスを使いたい場合は、管理責任者に申請する。', '',
      '3. 入力してはいけない情報', '・顧客・取引先・社員の個人情報（氏名、住所、電話、メール、生年月日、口座 など）', '・社外秘（見積・原価・契約書・未公開の計画・技術情報）', '・取引先との契約で第三者提供が禁じられている情報', '・パスワード、APIキー、認証情報' + extra, '・迷ったら入力しない。匿名化（氏名→A社、金額→概数）してから使う。', '',
      '4. 出力の扱い', '・AIの出力は下書き。社外に出す文書・数字・法的内容は、必ず人が確認してから使う。', '・事実の根拠が必要な内容は、出典を確認する。', '・著作権・肖像権に関わる生成物（画像・文章）は、公開前に管理責任者に相談する。', '',
      '5. アカウントとログ', '・アカウントは1人1つ。共有しない。', '・退職・異動時は、管理責任者がアカウントを停止する。', '・「入力内容を学習に使わない」設定ができるサービスは、必ず設定する。', '',
      '6. 事故が起きたとき', '・入力してはいけない情報を入れた場合は、すぐに管理責任者に報告する（叱責しない）。', '・該当する会話・データの削除、影響範囲の確認、必要なら取引先への連絡を管理責任者が判断する。', '',
      '7. 見直し', '・年1回、および新しいサービスを導入する時に見直す。', '',
      '以上。不明点は管理責任者まで。', '', '（この雛形は nortiqlab.com/tools/ai-risk で生成したたたき台です。業種固有の法令・各サービスの規約に合わせて調整してください）'].join('\n');
  }
})();
