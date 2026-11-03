/* /tools/manual-cost — 手作業コスト計算機
 * 年間コスト = 月の件数 × 1件の分数 ÷ 60 × 時給 × 12。自動化率は業務ごとの標準値 (幅)。
 */
(function () {
  'use strict';
  var T = window.NTOOLS, $ = T.$, fmt = T.fmt;

  var PRESETS = [
    { n: 'FAX注文の転記（注文書→システム）', c: 300, m: 4, r: [0.70, 0.85] },
    { n: '請求書の作成・送付', c: 100, m: 8, r: [0.60, 0.80] },
    { n: '入金の確認・消し込み', c: 120, m: 5, r: [0.50, 0.75] },
    { n: '在庫の突き合わせ・発注', c: 200, m: 3, r: [0.60, 0.80] }];
  var RATE_BY_NAME = [
    [/FAX|転記|入力|注文書|伝票/, [0.70, 0.85]], [/請求|見積/, [0.60, 0.80]], [/入金|消し込|照合/, [0.50, 0.75]],
    [/在庫|発注/, [0.60, 0.80]], [/日報|写真|報告/, [0.60, 0.80]], [/電話|問い合わせ|問合せ|メール/, [0.40, 0.70]], [/.*/, [0.50, 0.75]]];
  function rateFor(name) { for (var i = 0; i < RATE_BY_NAME.length; i++) if (RATE_BY_NAME[i][0].test(name)) return RATE_BY_NAME[i][1]; return [0.5, 0.75]; }

  var rowsEl = $('#rows');
  function addRow(p) {
    if (rowsEl.children.length >= 5) return;
    var row = T.el('div', 'calc-row');
    row.innerHTML = '<div><label>業務</label><input type="text" data-k="n" value="' + T.esc(p ? p.n : '') + '" placeholder="例：日報の入力" maxlength="40"></div>' +
      '<div><label>月の件数</label><input type="number" data-k="c" min="0" step="1" value="' + (p ? p.c : 50) + '" inputmode="numeric"></div>' +
      '<div><label>1件あたり（分）</label><input type="number" data-k="m" min="0" step="0.5" value="' + (p ? p.m : 5) + '" inputmode="decimal"></div>' +
      '<button type="button" class="del" aria-label="この行を削除">✕</button>';
    row.querySelector('.del').addEventListener('click', function () { row.remove(); calc(); });
    row.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', calc); });
    rowsEl.appendChild(row);
  }
  PRESETS.forEach(addRow);
  $('#addRow').addEventListener('click', function () { addRow(); calc(); });
  ['#wage', '#setup', '#mode'].forEach(function (s) { $(s).addEventListener('input', calc); $(s).addEventListener('change', calc); });

  function calc() {
    var wage = Math.max(0, Number($('#wage').value) || 0);
    var setup = Math.max(0, Number($('#setup').value) || 0);
    var mode = $('#mode').value;
    var items = [];
    rowsEl.querySelectorAll('.calc-row').forEach(function (row) {
      var n = row.querySelector('[data-k="n"]').value.trim(); var c = Number(row.querySelector('[data-k="c"]').value) || 0; var m = Number(row.querySelector('[data-k="m"]').value) || 0;
      if (!n || !c || !m) return;
      var hoursY = c * m / 60 * 12; var costY = hoursY * wage; var r = rateFor(n);
      items.push({ n: n, c: c, m: m, hoursY: hoursY, costY: costY, saveLo: costY * r[0], saveHi: costY * r[1], r: r });
    });
    var el = $('#result');
    if (!items.length) { el.innerHTML = '<div class="tool-card" style="margin-top:16px;color:var(--text-3)">業務名・件数・分数を入れると、ここに年間コストが出ます。</div>'; return; }
    var hoursY = items.reduce(function (a, x) { return a + x.hoursY; }, 0), costY = items.reduce(function (a, x) { return a + x.costY; }, 0);
    var saveLo = items.reduce(function (a, x) { return a + x.saveLo; }, 0), saveHi = items.reduce(function (a, x) { return a + x.saveHi; }, 0);
    var setupTotal = setup * 10000 * items.length;
    var payLo = saveHi > 0 ? Math.ceil(setupTotal / (saveHi / 12)) : 0, payHi = saveLo > 0 ? Math.ceil(setupTotal / (saveLo / 12)) : 0;
    var monthlyFee = 12000 + (items.length - 1) * 10000; // ひと業務AIの目安: 1.2万〜 + 2つ目以降1万
    var maxCost = Math.max.apply(null, items.map(function (x) { return x.costY; }));
    var d = T.today();
    var fte = (hoursY / 1900).toFixed(1);
    el.innerHTML =
      '<div class="res-title"><h2>手作業の年間コスト</h2><p class="sub">' + d + '　時給' + fmt(wage) + '円・' + items.length + '業務</p></div>' +
      '<div class="res-stats"><div class="res-stat"><div class="big">' + fmt(Math.round(costY / 10000)) + '<small>万円/年</small></div><div class="lab">手作業に払っている人件費</div></div>' +
      '<div class="res-stat"><div class="big">' + fmt(Math.round(hoursY)) + '<small>時間/年</small></div><div class="lab">約' + fte + '人分の労働時間</div></div>' +
      '<div class="res-stat"><div class="big">' + fmt(Math.round(saveLo / 10000)) + '<small>〜</small>' + fmt(Math.round(saveHi / 10000)) + '<small>万円</small></div><div class="lab">自動化で減らせる年間コスト</div></div></div>' +
      '<div class="sheet"><div class="sheet-head"><span class="k">Cost Sheet</span><span class="d">' + d + '</span></div><div class="section-h">業務ごとの内訳</div><div class="chart">' +
      items.map(function (x) { return '<div class="cr"><span>' + T.esc(x.n) + '</span><div class="b" aria-hidden="true"><i style="width:' + Math.max(3, Math.round(x.costY / maxCost * 100)) + '%"></i></div><span class="v">' + fmt(Math.round(x.costY / 10000)) + '万円 <small style="font-family:var(--font-jp);font-weight:400;color:var(--text-3)">' + fmt(Math.round(x.hoursY)) + 'h・自動化' + Math.round(x.r[0] * 100) + '〜' + Math.round(x.r[1] * 100) + '%</small></span></div>'; }).join('') + '</div>' +
      (mode === 'once'
        ? '<div class="min"><b>一括で導入した場合（1業務' + fmt(setup) + '万円 × ' + items.length + '＝' + fmt(setup * items.length) + '万円）</b>回収の目安は <b style="display:inline;color:var(--accent)">' + (payLo || '—') + '〜' + (payHi || '—') + 'か月</b>。2年目以降は削減額がそのまま残ります。</div>'
        : '<div class="min"><b>月額で導入した場合（ひと業務AI：月' + fmt(monthlyFee) + '円の目安）</b>年間の月額 ' + fmt(monthlyFee * 12 / 10000) + '万円 に対して、削減 ' + fmt(Math.round(saveLo / 10000)) + '〜' + fmt(Math.round(saveHi / 10000)) + '万円。初期費用0円・構築中は0円・動いてから課金です。</div>') +
      '<div class="note-red"><b>注意</b>自動化率は標準値です。例外処理・確認の時間は残ります。削減した時間を何に使うか（売上を作る仕事に回すか、残業を減らすか）で、実際の効果は変わります。</div></div>' +
      '<div class="res-title"><h2>次にできること</h2><p class="sub">どれを選んでも営業電話はしません</p></div>' +
      '<div class="tool-card" style="margin-bottom:12px"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><a class="btn btn--primary btn--sm" href="/tools/estimate?c=auto&s=' + (items.length >= 4 ? 'l' : items.length >= 2 ? 'm' : 's') + '&m=paper">この業務の概算見積を出す →</a><a class="btn btn--outline btn--sm" href="/automation">月額プラン（ひと業務AI）を見る</a></div></div>' +
      '<div class="ctas" id="ctas"></div>';
    var memo = ['【手作業コスト計算】Nortiq Labs　' + d, '時給：' + fmt(wage) + '円', '',
      '■ 業務ごとの年間コスト'].concat(items.map(function (x) { return '・' + x.n + '：月' + x.c + '件×' + x.m + '分 → 年' + fmt(Math.round(x.hoursY)) + '時間・' + fmt(Math.round(x.costY / 10000)) + '万円（自動化' + Math.round(x.r[0] * 100) + '〜' + Math.round(x.r[1] * 100) + '%）'; }))
      .concat(['', '合計：年' + fmt(Math.round(hoursY)) + '時間・' + fmt(Math.round(costY / 10000)) + '万円（約' + fte + '人分）', '自動化で減らせる額：年' + fmt(Math.round(saveLo / 10000)) + '〜' + fmt(Math.round(saveHi / 10000)) + '万円',
        mode === 'once' ? '一括導入（' + fmt(setup * items.length) + '万円）の回収目安：' + (payLo || '—') + '〜' + (payHi || '—') + 'か月' : '月額導入（月' + fmt(monthlyFee) + '円の目安）：年' + fmt(monthlyFee * 12 / 10000) + '万円',
        '', '※ 自動化率は標準値。例外処理と確認の時間は残ります。']).join('\n');
    T.renderCtas($('#ctas'), { memo: memo, kind: 'tools-manual-cost', memoLabel: '計算結果をコピー', shareTitle: '結果を社長・上司に共有する', shareDesc: '「年間いくら払っているか」の数字は、稟議の一行目に使えます。',
      quoteTitle: 'この業務を無料で試算し直してもらう', quoteDesc: '実際の帳票と件数を見せていただければ、自動化率と費用を業務ごとに出し直します。', quoteBtn: '試算を依頼する →', lineUrl: T.LINE_URL,
      extraFields: [['年間コスト', fmt(Math.round(costY / 10000)) + '万円'], ['削減額', fmt(Math.round(saveLo / 10000)) + '〜' + fmt(Math.round(saveHi / 10000)) + '万円'], ['業務', items.map(function (x) { return x.n; }).join('・')]] });
  }
  calc();
})();
