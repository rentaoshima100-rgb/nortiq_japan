/* ひと業務AI LP (/automation) — 30秒業務診断・概算・フォームへの引き継ぎ
 * 送信なし (結果はこのページ内で出す)。GA4 と フォーム送信は lp.js が担当。
 * 料金の数字はここが唯一の出典 (LP 本文と同じ値にそろえる)。
 */
(function () {
  'use strict';

  var MENUS = {
    inquiry: { name: '問い合わせ一次対応', price: 20000, period: '2〜3週間', limit: 500, unit: '件', limitText: '月500件まで',
      fit: '返信が翌日以降になっている会社に向いています。フォーム・LINE・メールの一次返信と、緊急度・担当の振り分けをAIが下書きし、人が承認して送ります。' },
    quote: { name: '見積書・請求書の自動作成', price: 30000, period: '3〜4週間', limit: 100, unit: '通', limitText: '月100通まで',
      fit: '見積に1件1時間以上かかっている会社に向いています。ヒアリング内容や単価表から見積PDFを生成し、請求書への変換と送付文の下書きまで行います。' },
    site: { name: 'LINEでサイト更新', price: 20000, period: '2〜3週間', limit: 30, unit: '投稿', limitText: '月30投稿まで',
      fit: 'サイトが半年以上更新されていない会社に向いています。写真と一言をLINEで送ると、お知らせ・施工事例・ブログにAIが文章化して反映します。' },
    gbp: { name: 'Googleビジネスプロフィール運用 ライト', price: 12000, period: '1〜2週間', limit: 4, unit: '投稿', limitText: '月4回の投稿（承認制）',
      fit: '店舗を1つ構える個店に向いています。月4回のAI投稿と口コミ返信の下書き、月次レポート、順位計測を月額内で行います。' }
  };
  var GBP_OPTION = 5000;
  var SECOND_RATE = 0.8;

  var WHO = {
    owner: '代表ご自身がやっている業務は、最初に手放す業務として最適です。デモで「任せても大丈夫か」をご確認ください。',
    staff: '事務スタッフの方の作業時間が減ります。承認は引き続きスタッフの方にお願いできます。',
    vendor: '外注に出している分を月額内に置き換えられます。修正の回数制限はありません。',
    none: '誰も手が回っていない業務は、AIが下書きを出すだけで動き始めます。承認だけお願いします。'
  };

  function yen(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function track(name, params) {
    try { if (typeof window.gtag === 'function') window.gtag('event', name, Object.assign({ lp: 'automation' }, params || {})); } catch (_) {}
  }

  // ---------- フォームへの引き継ぎ ----------
  var fMenu = document.getElementById('f-menu');
  var fDiag = document.getElementById('f-diag');
  function handoff(menuKey, summary) {
    if (fMenu && menuKey && MENUS[menuKey]) fMenu.value = menuKey;
    if (fDiag && summary) fDiag.value = summary.slice(0, 68);
  }
  // メニューカードの「この業務で相談する」
  document.querySelectorAll('[data-menu]').forEach(function (a) {
    a.addEventListener('click', function () { handoff(a.dataset.menu, ''); });
  });

  // ---------- 30秒業務診断 ----------
  var form = document.getElementById('diag-form');
  var result = document.getElementById('diag-result');
  var status = document.getElementById('diag-status');
  var lastSummary = '';

  function pick(name) {
    var el = form ? form.querySelector('input[name="' + name + '"]:checked') : null;
    return el ? el.value : '';
  }
  function labelOf(name, value) {
    var el = form ? form.querySelector('input[name="' + name + '"][value="' + value + '"]') : null;
    var span = el ? el.parentNode.querySelector('span') : null;
    return span ? span.textContent : value;
  }

  function render(q1, q2, q3) {
    var m = MENUS[q1];
    if (!m) return;
    var vol = parseInt(q2, 10) || 0;
    var note = m.fit;
    if (q3 && WHO[q3]) note += ' ' + WHO[q3];
    var over = '';
    if (q1 !== 'gbp' && vol > m.limit) {
      over = ' 月' + m.limit + m.unit + 'の上限を超える分は、翌月にAPIの実費だけを請求します（事前にお知らせします）。件数が多い場合は、上限の引き上げか一括請負（30万円〜）も相談のときにご提案します。';
    }
    document.getElementById('dr-menu').textContent = m.name;
    document.getElementById('dr-price').textContent = yen(m.price) + '円';
    document.getElementById('dr-period').textContent = m.period;
    document.getElementById('dr-limit').textContent = m.limitText;
    document.getElementById('dr-note').textContent = note + over;
    lastSummary = '診断: ' + m.name + ' / ' + labelOf('q2', q2) + ' / ' + labelOf('q3', q3);
    handoff(q1, lastSummary);
    result.hidden = false;
    result.setAttribute('tabindex', '-1');
  }

  if (form && result) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q1 = pick('q1'), q2 = pick('q2'), q3 = pick('q3');
      var missing = false;
      [['q1', q1], ['q2', q2], ['q3', q3]].forEach(function (p) {
        var fs = form.querySelector('input[name="' + p[0] + '"]').closest('fieldset');
        if (fs) fs.classList.toggle('is-invalid', !p[1]);
        if (!p[1]) missing = true;
      });
      if (missing) {
        status.textContent = '3つの質問すべてにお答えください。';
        status.classList.add('form__status--error');
        status.hidden = false;
        return;
      }
      status.hidden = true;
      render(q1, q2, q3);
      try { history.replaceState(null, '', location.pathname + '?q1=' + q1 + '&q2=' + q2 + '&q3=' + q3 + '#diagnosis'); } catch (_) {}
      track('diagnosis_result', { menu: q1, volume: q2, who: q3 });
      result.focus();
    });
    form.querySelectorAll('input[type=radio]').forEach(function (r) {
      r.addEventListener('change', function () {
        var fs = r.closest('fieldset');
        if (fs) fs.classList.remove('is-invalid');
      });
    });

    // URL パラメータから復元 (結果の共有用)
    try {
      var sp = new URLSearchParams(location.search);
      var q1 = sp.get('q1'), q2 = sp.get('q2'), q3 = sp.get('q3');
      if (q1 && MENUS[q1] && q2 && q3) {
        [['q1', q1], ['q2', q2], ['q3', q3]].forEach(function (p) {
          var el = form.querySelector('input[name="' + p[0] + '"][value="' + p[1] + '"]');
          if (el) el.checked = true;
        });
        render(q1, q2, q3);
      }
    } catch (_) {}

    var copyBtn = document.getElementById('dr-copy');
    var copied = document.getElementById('dr-copied');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var url = location.href;
        var done = function () { if (copied) { copied.hidden = false; setTimeout(function () { copied.hidden = true; }, 2500); } };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done, function () { window.prompt('このURLをコピーしてください', url); });
        } else {
          window.prompt('このURLをコピーしてください', url);
        }
        track('diagnosis_share', {});
      });
    }
  }

  // ---------- 概算 ----------
  var estMenu = document.getElementById('est-menu');
  var estCount = document.getElementById('est-count');
  var estCountLabel = document.getElementById('est-count-label');
  var estGbpWrap = document.getElementById('est-gbp-wrap');
  var estGbp = document.getElementById('est-gbp');
  var estSecond = document.getElementById('est-second');
  var estPrice = document.getElementById('est-price');
  var estLimit = document.getElementById('est-limit');
  var estOver = document.getElementById('est-over');
  var estCta = document.getElementById('est-cta');

  function estimate() {
    if (!estMenu) return;
    var key = estMenu.value;
    var m = MENUS[key];
    if (!m) return;
    var isGbp = key === 'gbp';
    // スライダーの範囲はメニューの上限の2倍まで
    estCount.max = String(isGbp ? 12 : m.limit * 2);
    estCount.step = String(isGbp ? 1 : (m.limit >= 500 ? 10 : (m.limit >= 100 ? 5 : 1)));
    var count = Math.min(parseInt(estCount.value, 10) || 0, parseInt(estCount.max, 10));
    estCount.value = String(count);
    estCountLabel.textContent = '— ' + count + m.unit + '／月';

    if (estGbpWrap) estGbpWrap.hidden = key !== 'site';
    var price = m.price;
    if (key === 'site' && estGbp && estGbp.checked) price += GBP_OPTION;
    if (estSecond && estSecond.checked) price = Math.round(price * SECOND_RATE);
    estPrice.textContent = yen(price);

    if (isGbp) {
      estLimit.textContent = '月額に含むもの：月4回の投稿（承認制）、口コミ返信の下書き、月次レポート、順位計測。';
      if (count > 4) {
        estOver.hidden = false;
        estOver.textContent = '月' + count + '回の投稿をご希望なら、写真追加・FAQ・構造化データ・四半期ミーティングを含むスタンダード（月3万円）をご案内します。';
      } else { estOver.hidden = true; }
    } else {
      estLimit.textContent = '月額に含む上限：' + m.limitText + '。構築期間 ' + m.period + '。';
      if (count > m.limit) {
        estOver.hidden = false;
        estOver.textContent = '上限を ' + (count - m.limit) + m.unit + ' 超えています。超えた分は翌月にAPIの実費だけを請求します（事前にお知らせします）。件数が多い場合は、上限の引き上げか一括請負もご提案します。';
      } else { estOver.hidden = true; }
    }
    if (estCta) {
      estCta.onclick = function () {
        handoff(key, '概算: ' + m.name + ' ' + count + m.unit + '/月 → ' + yen(price) + '円/月' + (estSecond && estSecond.checked ? '（2つ目）' : ''));
      };
    }
  }
  if (estMenu && estCount) {
    [estMenu, estCount, estGbp, estSecond].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', estimate);
      el.addEventListener('change', estimate);
    });
    estimate();
  }
})();
