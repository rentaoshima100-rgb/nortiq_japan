/* 蓄電池の見積もり診断 (lp/shindan/battery) — 3つの質問から、相場の目安・見積もりとの差・補助金の目安を出す。
 * 計算はすべてこの場 (ブラウザ) で行い、サーバーには何も送らない (「結果まで連絡先なし」の約束)。
 * 施工店の紹介・結果のメールを希望したときだけ、下の #contact-form (assets/lp/common/lp.js が
 * /api/contact へ送る) に回答と結果を写して送る。
 *
 * 数字の出典 (本文 S3 / S7 と同じ。変えるときは本文と説明図 assets/lp/shindan-battery/figures も合わせる):
 *  - 相場: EcoFlow「蓄電池の価格相場」(2025-11-24) 1kWh あたり 15〜22万円 (工事費込み)。
 *    5kWh 80〜110万円・10kWh 150〜200万円は本文 S3 の数字、7kWh はその間 (110〜150万円)。
 *  - 国 (DR補助金、令和7年度補正): 補助金ポータル (2026-04-20) 3.45万円/kWh、設備費＋工事費の 3/10 以内、
 *    上限 60万円、設備費＋工事費が目標価格 12.5万円/kWh (税抜) 以下であること。
 *  - 京都府 (令和8年度): 蓄電池 1万円/kWh (上限 5万円)、太陽光と同時導入の場合のみ。
 */
(function () {
  'use strict';

  var form = document.getElementById('shindan-form');
  var result = document.getElementById('shindan-result');
  var lead = document.getElementById('contact-form');
  if (!form || !result) return;

  var LP = document.body.dataset.lp || '';
  function track(name, params) {
    try {
      if (typeof window.gtag === 'function') window.gtag('event', name, Object.assign({ lp: LP }, params || {}));
    } catch (_) { /* 計測の失敗で診断を止めない */ }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- 数字 (万円) ----------
  var RANGE = { 5: [80, 110], 7: [110, 150], 10: [150, 200] };
  var PER_KWH = [15, 22];
  var DR = { perKwh: 3.45, rate: 0.3, cap: 60, target: 12.5 }; // 国。target は税抜の目標価格 (万円/kWh)
  var KYOTO = { perKwh: 1, cap: 5 };
  var TAX = 1.1;
  var SRC = '出典：EcoFlow（2025年11月24日）、補助金ポータル（2026年4月20日）、京都府（2026年7月1日）';

  var AREA = { '京都': '京都府', '大阪': '大阪府', '兵庫': '兵庫県', '滋賀': '滋賀県', '奈良': '奈良県', '和歌山': '和歌山県', 'その他': '関西以外' };
  var SOLAR = { '卒FIT済み': '太陽光あり（卒FIT済み）', '買取期間中': '太陽光あり（買取期間中）', 'ない': '太陽光なし（新設も検討）' };
  var BILL = { 'lt10k': '1万円未満', '10-20k': '1〜2万円', '20-30k': '2〜3万円', 'gt30k': '3万円以上' };

  function diagnose(a) {
    var kwh = RANGE[a.capacity] ? Number(a.capacity) : null;
    var q = a.quote > 0 ? a.quote : null;
    var r = { label: '', advice: '', range: {}, diff: {}, subsidy: {}, kyoto: '', summary: {} };

    var parts = [AREA[a.area] || a.area, SOLAR[a.solar] || a.solar, kwh ? '蓄電池 ' + kwh + 'kWh前後' : '容量は未定', q ? 'お手元の見積もり ' + q + '万円' : '見積もりなし'];
    if (BILL[a.bill]) parts.push('月の電気代 ' + BILL[a.bill]);
    r.label = parts.join('／');

    if (a.solar === '卒FIT済み') r.advice = '卒FIT後は、売る電気（関西電力は1kWhあたり8円）より買う電気（30円以上）のほうが高いので、ためて自分で使う蓄電池の効果が出やすい状況です。';
    else if (a.solar === '買取期間中') r.advice = '買取期間中は売電単価が高いので、卒FITの時期に合わせて導入するのも選択肢です。見積もりは今のうちに相場と比べておきましょう。';
    else r.advice = '太陽光と蓄電池を同時に導入する場合は、京都府など自治体の補助金の対象になることがあります。';

    // 1. 相場の目安
    var lo, hi;
    if (kwh) {
      lo = RANGE[kwh][0]; hi = RANGE[kwh][1];
      r.range = { title: lo + '〜' + hi + '万円', note: kwh + 'kWh前後・工事費込み（1kWhあたり' + PER_KWH[0] + '〜' + PER_KWH[1] + '万円。出典：EcoFlow 2025年11月）' };
    } else {
      r.range = { title: PER_KWH[0] + '〜' + PER_KWH[1] + '万円/kWh', note: '5kWh前後 80〜110万円、7kWh前後 110〜150万円、10kWh前後 150〜200万円（工事費込み。出典：EcoFlow 2025年11月）' };
    }

    // 2. 見積もりとの差
    if (!q) {
      r.diff = { verdict: 'none', hot: false, title: '見積もりの金額を入れると、相場との差が出ます', note: '訪問販売などでもらった見積もりがあれば、もう一度診断で「手元の見積もり金額」を入れてください。' };
    } else if (kwh) {
      if (q > hi) r.diff = { verdict: 'over', hot: true, title: '相場の上限を約' + (q - hi) + '万円上回っています', note: '見積もり' + q + '万円 − 相場上限' + hi + '万円。屋根や配線の条件で変わるため、目安としてご覧ください。' };
      else if (q < lo) r.diff = { verdict: 'under', hot: false, title: '相場の下限を約' + (lo - q) + '万円下回っています', note: '安い理由（機器のグレード、保証年数、既設の太陽光との接続工事が含まれているか）を確認しましょう。' };
      else r.diff = { verdict: 'in', hot: false, title: '相場の範囲内です（上限まで約' + (hi - q) + '万円）', note: '見積もり' + q + '万円は相場' + lo + '〜' + hi + '万円の中に入っています。内容と保証を確認して進めて大丈夫です。' };
    } else if (q > RANGE[10][1]) {
      r.diff = { verdict: 'over', hot: true, title: '10kWh前後の相場の上限も約' + (q - RANGE[10][1]) + '万円上回っています', note: '容量が分かると、より正確に比べられます。見積書の「○kWh」を確認してください。' };
    } else {
      r.diff = { verdict: 'unknown', hot: false, title: '容量が分かると、相場との差が出ます', note: '見積書には「○kWh」と容量が書かれています。もう一度診断で容量を選んでください。' };
    }

    // 3. 補助金の目安 (国 DR補助金)
    if (kwh) {
      var base = Math.round(Math.min(DR.perKwh * kwh, DR.cap));
      var targetTaxIn = Math.round(DR.target * kwh * TAX);
      var cond = '設備費＋工事費が目標価格12.5万円/kWh（税抜。' + kwh + 'kWhなら税込で約' + targetTaxIn + '万円）以下などの条件があります。';
      if (q) {
        var eligible = (q / TAX / kwh) <= DR.target;
        if (eligible) {
          var amt = Math.round(Math.min(base, DR.rate * q / TAX));
          r.subsidy = { title: '国の補助金で最大' + amt + '万円程度（計算例）', note: '3.45万円×' + kwh + 'kWh。設備費＋工事費の3/10まで、上限60万円。交付決定前に契約・発注すると対象外になります。' };
        } else {
          r.subsidy = { title: 'お手元の見積もりでは、国の補助金は対象外の見込み', note: '国のDR補助金は' + cond + '対象になる価格で出し直せるかは、施工店に相談を。対象なら最大' + base + '万円程度です。' };
        }
      } else {
        r.subsidy = { title: '国の補助金で最大' + base + '万円程度（計算例）', note: '3.45万円×' + kwh + 'kWh。' + cond + '交付決定前に契約・発注すると対象外になります。' };
      }
    } else {
      r.subsidy = { title: '国の補助金は3.45万円/kWh（上限60万円）', note: '5kWhで約17万円、10kWhで約35万円の計算例。設備費＋工事費が目標価格12.5万円/kWh（税抜）以下などの条件があります。' };
    }
    if (a.area === '京都') {
      r.kyoto = a.solar === 'ない'
        ? '京都府：太陽光と同時に導入する場合、蓄電池分は最大' + KYOTO.cap + '万円（' + KYOTO.perKwh + '万円/kWh。お住まいの市町村を通じて申請）。'
        : '京都府の補助金は太陽光との同時導入が条件のため、蓄電池の後付けだけでは対象外の見込みです。市町村独自の補助金は施工店が確認します。';
    } else {
      r.kyoto = 'お住まいの府県・市町村の補助金は、ご紹介する施工店が確認し、申請を代行します。';
    }

    r.summary = { range: r.range.title, diff: r.diff.title, subsidy: r.subsidy.title };
    return r;
  }

  // ---------- 表示 ----------
  var CARD = 'border:1px solid #DDDDDD;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:4px';
  var CARD_HOT = 'border:1px solid #E60012;background:#FFE5E7;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:4px';
  var BTN = 'display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:16px 28px;border-radius:30px;font-size:15px;font-weight:600;letter-spacing:0.04em;line-height:1.3;cursor:pointer;font-family:inherit;text-align:center;box-sizing:border-box';

  function render(r) {
    result.innerHTML =
      '<div style="max-width:880px;margin:0 auto;width:100%;background:#FFFFFF;border:1px solid #DDDDDD;border-radius:16px;box-shadow:0 2px 6px rgba(17,17,17,0.07),0 18px 48px rgba(17,17,17,0.14);padding:clamp(24px,4vw,44px);box-sizing:border-box;display:flex;flex-direction:column;gap:18px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><h3 id="shindan-result-title" tabindex="-1" style="margin:0;font-size:22px;font-weight:700;color:#111111;outline:none">診断結果（目安）</h3><span style="display:inline-flex;padding:4px 10px;border-radius:4px;background:#F5F5F5;border:1px solid #DDDDDD;color:#6B6B6B;font-size:11px;font-weight:700;letter-spacing:0.04em">無料・連絡先なし</span></div>'
      + '<div style="font-size:13px;color:#6B6B6B;line-height:1.7">' + esc(r.label) + '</div>'
      + (r.advice ? '<p style="margin:0;font-size:14px;color:#333333;line-height:1.8">' + esc(r.advice) + '</p>' : '')
      + '<div style="display:flex;flex-direction:column;gap:12px">'
      + '<div style="' + CARD + '"><span style="font-size:12px;font-weight:700;color:#B8000E;letter-spacing:0.06em">1. 相場の目安</span><span style="font-family:\'Space Grotesk\',\'Century Gothic\',sans-serif;font-weight:700;font-size:30px;line-height:1.1;color:#111111">' + esc(r.range.title) + '</span><span style="font-size:12px;color:#6B6B6B;line-height:1.7">' + esc(r.range.note) + '</span></div>'
      + '<div style="' + (r.diff.hot ? CARD_HOT : CARD) + '"><span style="font-size:12px;font-weight:700;color:#B8000E;letter-spacing:0.06em">2. 見積もりとの差</span><span style="font-size:17px;font-weight:700;color:#111111;line-height:1.5">' + esc(r.diff.title) + '</span><span style="font-size:12px;color:#333333;line-height:1.7">' + esc(r.diff.note) + '</span></div>'
      + '<div style="' + CARD + '"><span style="font-size:12px;font-weight:700;color:#B8000E;letter-spacing:0.06em">3. 補助金の目安</span><span style="font-size:17px;font-weight:700;color:#111111;line-height:1.5">' + esc(r.subsidy.title) + '</span><span style="font-size:12px;color:#333333;line-height:1.7">' + esc(r.subsidy.note) + '</span><span style="font-size:12px;color:#333333;line-height:1.7">' + esc(r.kyoto) + '</span></div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:10px;padding-top:12px;border-top:1px solid #DDDDDD">'
      + '<button type="button" id="shindan-refer" class="btn-primary" data-ga="shindan_lead_open" data-ga-location="refer" style="' + BTN + ';background:#E60012;color:#FFFFFF;border:2px solid #E60012;box-shadow:0 10px 24px rgba(230,0,18,0.22)">施工店からの連絡を希望する →</button>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" id="shindan-mail" class="btn-ghost" data-ga="shindan_lead_open" data-ga-location="mail" style="' + BTN + ';flex:1 1 200px;padding:12px 16px;font-size:13px;background:#FFFFFF;color:#E60012;border:2px solid #E60012">結果をメールで受け取る</button><button type="button" id="shindan-again" style="' + BTN + ';flex:1 1 140px;padding:12px 16px;font-size:13px;background:#FFFFFF;color:#333333;border:1px solid #CCCCCC">もう一度診断する</button></div>'
      + '<p style="margin:0;font-size:12px;color:#6B6B6B;line-height:1.7">紹介は、希望した方にだけ、お住まいのエリアを担当する施工店1社だけです。紹介のあとでも断れます。</p>'
      + '</div>'
      + '<p style="margin:0;font-size:12px;color:#6B6B6B;line-height:1.7">結果は目安です。屋根や配線、分電盤の状況で変わるため、正確な金額は現地調査で決まります。' + esc(SRC) + '。</p>'
      + '</div>';
  }

  function readAnswers() {
    var fd = new FormData(form);
    var quote = parseInt(String(fd.get('quote') || '').replace(/[^\d]/g, ''), 10);
    return {
      area: String(fd.get('area') || ''),
      solar: String(fd.get('solar') || ''),
      capacity: String(fd.get('capacity') || ''),
      quote: isFinite(quote) && quote > 0 ? Math.min(quote, 9999) : 0,
      bill: String(fd.get('bill') || '')
    };
  }

  // 診断フォームの必須: Q1 (select) と Q2 / Q3 (radio 群 = data-required-group)
  var status = document.getElementById('shindan-status');
  function setStatus(msg) {
    if (!status) return;
    status.textContent = msg || '';
    status.className = 'form__status' + (msg ? ' form__status--error' : '');
    status.hidden = !msg;
  }
  function validate() {
    var ok = true;
    var first = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var bad = !String(el.value || '').trim();
      var field = el.closest('.field');
      if (field) field.classList.toggle('is-invalid', bad);
      if (bad) { ok = false; if (!first) first = el; }
    });
    form.querySelectorAll('[data-required-group]').forEach(function (group) {
      var inputs = group.querySelectorAll('input[type="radio"],input[type="checkbox"]');
      var any = false;
      inputs.forEach(function (i) { if (i.checked) any = true; });
      group.classList.toggle('is-invalid', !any);
      if (!any) { ok = false; if (!first && inputs[0]) first = inputs[0]; }
    });
    if (first) first.focus();
    return ok;
  }
  form.querySelectorAll('input,select').forEach(function (el) {
    el.addEventListener('change', function () { var f = el.closest('.field'); if (f) f.classList.remove('is-invalid'); });
    el.addEventListener('input', function () { var f = el.closest('.field'); if (f) f.classList.remove('is-invalid'); });
  });

  var current = null;
  var answers = null;

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function focusInto(id) {
    var el = document.getElementById(id);
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { el.scrollIntoView(); }
    try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) { setStatus('Q1〜Q3 は必須です。赤枠の項目をご確認ください。'); return; }
    setStatus('');
    answers = readAnswers();
    current = diagnose(answers);
    render(current);
    fillLead();
    hide(form);
    hide(lead);
    var done = document.getElementById('form-done');
    hide(done);
    show(result);
    focusInto('shindan-result-title');
    track('shindan_result', { area: answers.area, solar: answers.solar, capacity: answers.capacity, has_quote: answers.quote ? 1 : 0, verdict: current.diff.verdict });
  });

  // ---------- 紹介希望・結果メールのフォーム (#contact-form は lp.js が送る) ----------
  var DONE_TEXT = {
    refer: '営業日24時間以内に、info@nortiqlab.com から担当がメールで一次返信し、お住まいのエリアを担当する施工店1社からの連絡の時期をお知らせします。紹介のあとでも断れます。',
    mail: '営業日24時間以内に、診断結果（相場の目安・見積もりとの差・補助金の目安）を info@nortiqlab.com からメールでお送りします。施工店の紹介はしません（希望した場合だけです）。'
  };
  function wishValue() {
    var w = lead ? lead.querySelector('[name="wish"]:checked') : null;
    return w ? w.value : 'refer';
  }
  function syncWish() {
    if (!lead) return;
    var w = wishValue();
    var title = document.getElementById('lead-title');
    var note = document.getElementById('lead-note');
    var doneText = document.getElementById('done-text');
    if (title) title.textContent = w === 'mail' ? '診断結果をメールで受け取る' : '施工店からの連絡を希望する';
    if (note) note.textContent = w === 'mail' ? '送信後、営業日24時間以内に担当から診断結果をメールでお送りします。施工店の紹介はしません。' : '送信後、営業日24時間以内に担当からメールで一次返信し、施工店からの連絡の時期をお知らせします。';
    if (doneText) doneText.textContent = DONE_TEXT[w] || DONE_TEXT.refer;
  }
  function fillLead() {
    if (!lead || !current || !answers) return;
    var set = function (name, v) { var el = lead.querySelector('[name="' + name + '"]'); if (el) el.value = v || ''; };
    set('dx_area', AREA[answers.area] || answers.area);
    set('dx_solar', SOLAR[answers.solar] || answers.solar);
    set('dx_capacity', RANGE[answers.capacity] ? answers.capacity + 'kWh前後' : '分からない');
    set('dx_quote', answers.quote ? answers.quote + '万円（税込）' : '');
    set('dx_bill', BILL[answers.bill] || '');
    set('dx_r1', current.summary.range);
    set('dx_r2', current.summary.diff);
    set('dx_r3', current.summary.subsidy);
  }
  function openLead(wish) {
    if (!lead) return;
    var radio = lead.querySelector('[name="wish"][value="' + wish + '"]');
    if (radio) radio.checked = true;
    syncWish();
    show(lead);
    focusInto('lead-title');
  }
  if (lead) {
    lead.querySelectorAll('[name="wish"]').forEach(function (r) { r.addEventListener('change', syncWish); });
    syncWish();
  }

  result.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.id === 'shindan-refer') openLead('refer');
    else if (t.id === 'shindan-mail') openLead('mail');
    else if (t.id === 'shindan-again') {
      hide(result); hide(lead);
      show(form);
      focusInto('shindan');
      track('shindan_again', {});
    }
  });
})();
