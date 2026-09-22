// テスト共通の下ごしらえ。data/*.json と api/_data/catalog.json が無くても（あるいは
// 中身が変わっても）テストが同じ結果になるよう、fixture を data.js に差し込む。
// labels / rules も fixture にしてある（2026-09-21 の5ラベル化で、データ担当が data/*.json を
// 直している最中でも API のテストが同じ結果になるように）。

const data = require('../data');

const clone = (v) => JSON.parse(JSON.stringify(v));

// mutate(blocks 配列) で、承認を外すなどの加工をしてから差し込める。
// opts:
//   includeUnapproved:true  未承認も承認済みとして扱う（評価ランナーと同じ経路の確認用）
//   rules(rules)            しきい値・スイッチを書き換える関数（例: rel_floor や cta.mode を変える）
//   labels(labels)          ラベルを書き換える関数
//   catalog(pages)          catalog（{ url: page } の形）を書き換える関数
function useFixtures(mutate, opts) {
  const o = opts || {};
  const blocks = clone(require('./blocks.json')).blocks;
  const catalog = clone(require('./catalog.json'));
  const labels = clone(require('./labels.json'));
  const rules = clone(require('./rules.json'));
  if (typeof mutate === 'function') mutate(blocks);
  if (typeof o.rules === 'function') o.rules(rules);
  if (typeof o.labels === 'function') o.labels(labels);
  if (typeof o.catalog === 'function') o.catalog(catalog.pages);
  // includeUnapproved は前のテストの値が残らないよう、毎回明示して上書きする。
  data.__setForTest({ blocks, catalog, labels, rules, includeUnapproved: Boolean(o.includeUnapproved) });
  return { blocks, catalog: catalog.pages, labels, rules };
}

// 正規化形の answers を短く書くためのもの。指定しない軸は「低確信」で埋める。
// rel は { block_id: 関連度 }。指定しないカードの rel_* は入れない（＝聞いていないのと同じ）。
// relArticles は { slug: 関連度 }（rel_article_<slug>）。intents は { compare, contact }（intent_compare / intent_contact）。
function answers(o = {}) {
  const choice = (pair) => ({ choice: pair[0], confidence: pair[1], probabilities: { [pair[0]]: pair[1] } });
  const c = o.concerns || {};
  const it = o.intents || {};
  const out = {
    visitor_type: choice(o.vt || ['事業者', 0.5]),
    industry: choice(o.ind || ['不明・その他', 0.4]),
    need: choice(o.need || ['other', 0.3]),
    stage: { score: o.stage == null ? 0.8 : o.stage, confidence: 0.5, probabilities: {} },
    intent_compare: { noul: it.compare == null ? 0.1 : it.compare },
    intent_contact: { noul: it.contact == null ? 0.1 : it.contact },
  };
  for (const id of Object.keys(o.rel || {})) out['rel_' + id] = { noul: o.rel[id] };
  for (const slug of Object.keys(o.relArticles || {})) out['rel_article_' + slug] = { noul: o.relArticles[slug] };
  Object.assign(out, {
    concern_cost: { noul: c.cost || 0.1 },
    concern_schedule: { noul: c.schedule || 0.1 },
    concern_trust: { noul: c.trust || 0.1 },
    concern_ai_quality: { noul: c.ai_quality || 0.1 },
    concern_scope: { noul: c.scope || 0.1 },
    cta_ok: { noul: o.cta == null ? 0.2 : o.cta },
  });
  return out;
}

// rules.js のテスト用: recommend() を通さずに picks を手で書く。
//   picks({ 'slot-mid': 'sg-web', 'slot-end': ['sg-pricing', 0.31] })
function picks(o = {}) {
  const out = {};
  for (const slot of Object.keys(o)) {
    const v = Array.isArray(o[slot]) ? o[slot] : [o[slot], 0.9625];
    out[slot] = { block_id: v[0], propensity: v[1] };
  }
  return out;
}

// 決まった値を順に返す rng。尽きたら最後の値を返し続ける。
function fixedRng(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

module.exports = { useFixtures, answers, picks, fixedRng, clone };
