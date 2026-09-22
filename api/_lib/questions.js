// 次ページ提案（nq）— モデルへの質問を組み立てる（設計書6章「質問」・7章「1. 候補を絞る」「2. 関連度を採点する」・13章「記事が増えても回る設計」）。
//
//   buildQuestions({ passed, currentUrl, viewedUrls }) -> { questions, candidates, related_candidates }
//
// 1回の呼び出しに全部入れる（質問は並列に評価されるので、数を増やしても応答時間は
// ほとんど変わらない）。指示文と選択肢の説明は data/nq-labels.json の語をそのまま使う。
// catalog・blocks・月次レポートと同じ語でないと、集計のときに突き合わせられなくなる。
// type は Jev の公式リファレンスに合わせて小文字（choice / score / noul）。
//
// 質問の並び（2026-09-21 決定 2章・5章）:
//   visitor_type（5ラベル）・industry・need（Choice）、stage（Score、新しい文）、intent_compare・intent_contact（Noul。
//   行6の mode=noul 用。Score と並べて常に両方聞く。評価で両方を比べるため）、rel_<block_id>（カード ≤13）、
//   rel_article_<slug>（関連記事の候補 ≤12。現在のページが記事のときだけ）、concern_×5、cta_ok。
//   合計は最大 37 で、40 を超えないことを assert する（記事が 1,000 本になっても 1 回の質問数は固定）。
//
// 提案カードは「どれが最も合うか」を1問で選ばせず、カードごとに関連度（rel_<block_id>、Noul）を
// 1問ずつ聞く。順位をつけるのは recommend.js で、ここはどのカードについて聞くか（candidates）を
// 決めるだけ。候補の絞り込みは学習させず、ルールで固定する。
// 関連記事も同じで、候補（catalog の related。ビルド時に記事ごと最大12本）の各記事に関連度を聞き、
// 3本を選ぶのは rules.js（rl-related を出す場面）。

const assert = require('node:assert');
const data = require('./data');

const CONCERNS = ['cost', 'schedule', 'trust', 'ai_quality', 'scope'];
const REL_PREFIX = 'rel_';
const REL_ARTICLE_PREFIX = 'rel_article_';
// 依頼意向の Noul 2問。キーがそのまま answers のキーになる（rules.js の行6 mode=noul が読む）。
const INTENT_KEYS = ['intent_compare', 'intent_contact'];
// {audience} はブロックの audience（肯定文1文）。Jev は文字どおりに読むので、言い回しを足さない。
const REL_INSTRUCTIONS = 'この訪問者は次の説明に当てはまる：{audience}';
// {title} は関連記事の title、{audience} はその記事の対象読者（列挙値）。対象が無い記事は括弧ごと省く。
const REL_ARTICLE_INSTRUCTIONS = 'この訪問者は次の記事を読むと役に立つ：{title}（{audience}）';
// data/nq-labels.json に intents が無いときの文（オーナー決定の語そのまま）。
const INTENT_DEFAULTS = {
  intent_compare: 'この訪問者は依頼先の候補を探している',
  intent_contact: 'この訪問者はすぐに相談や見積もりを依頼したい',
};
// 1回の呼び出しの質問数の上限（設計書13章）。6 + カード 13 + 関連記事 12 + 不安 5 + cta_ok 1 = 37。
const MAX_QUESTIONS = 40;

const relKey = (blockId) => REL_PREFIX + blockId;
const relArticleKey = (slug) => REL_ARTICLE_PREFIX + slug;

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// このカードの行き先になりうる URL のうち、いま配信できるもの（トップレベル ＋ 業種版）。
function deliverableTargets(block) {
  const out = [];
  if (block.target_url && data.deliverable(block, 'default')) out.push(block.target_url);
  const by = block.by_industry || {};
  for (const ind of Object.keys(by)) {
    const t = data.targetOf(block, ind);
    if (t && data.deliverable(block, 'default', ind)) out.push(t);
  }
  return out;
}

// 関連度を聞くカード（block_id の配列）。
//  - selectable:true（sg-guidebook のような既定専用のカードは選ばせない）
//  - 承認済みの行き先が少なくとも1つある（未承認のカードを聞いても配信できない）
//  - passed（表示したがクリックされなかったカード）を除く
//  - 行き先が、いま見ているページか、すでに読んだページしか無いカードを除く
// 業種で行き先が変わるカード（sg-solution / sg-works）は、行き先が1つでも残っていれば聞く。
// どの行き先になるかは業種の判定が返ってから決まるので、recommend.js がもう一度確かめる。
function pickCandidates({ passed, currentUrl, viewedUrls } = {}) {
  const skip = new Set(Array.isArray(passed) ? passed : []);
  const seen = new Set(Array.isArray(viewedUrls) ? viewedUrls : []);
  if (currentUrl) seen.add(currentUrl);
  const out = [];
  for (const b of data.blocks) {
    if (!b || b.kind !== 'suggest' || b.selectable !== true) continue;
    if (!String(b.audience || '').trim()) continue;
    if (skip.has(b.block_id)) continue;
    if (!deliverableTargets(b).some((t) => !seen.has(t))) continue;
    out.push(b.block_id);
  }
  return out;
}

// 関連記事の候補（slug の配列。catalog の related の並びのまま）。現在のページが記事のときだけ。
//  - catalog の related（ビルド時に最大12本。data.relatedSlugs が上限と形を確かめる）から
//  - すでに読んだ記事（viewedUrls）を除く
//  - catalog に無い記事（title を引けないので質問文が作れない）を除く
// rules.js が rl-related の3本を選ぶときも同じ関数で候補を出す（質問した記事と選ぶ記事をそろえるため）。
function pickRelated({ currentUrl, viewedUrls } = {}) {
  if (typeof currentUrl !== 'string' || !currentUrl.startsWith(data.ARTICLE_PREFIX)) return [];
  const seen = new Set(Array.isArray(viewedUrls) ? viewedUrls : []);
  const cat = data.catalog || {};
  const out = [];
  for (const slug of data.relatedSlugs(currentUrl)) {
    const url = data.ARTICLE_PREFIX + slug;
    if (seen.has(url)) continue;
    const page = hasOwn(cat, url) ? cat[url] : null;
    if (!page || page.type !== 'article' || !String(page.title || '').trim()) continue;
    out.push(slug);
  }
  return out;
}

// 指示文のテンプレート。labels に在り、必要な差し込み語を含むときだけそれを使う。
function template(entry, placeholder, fallback) {
  const s = entry && typeof entry.instructions === 'string' ? entry.instructions : null;
  return s && s.includes(placeholder) ? s : fallback;
}

function intentInstructions(L, key) {
  const it = L.intents && L.intents[key];
  if (typeof it === 'string' && it.trim()) return it;
  if (it && typeof it.instructions === 'string' && it.instructions.trim()) return it.instructions;
  return INTENT_DEFAULTS[key];
}

function buildQuestions({ passed, currentUrl, viewedUrls } = {}) {
  const L = data.labels || {};
  const choice = (key) => ({
    type: 'choice',
    instructions: (L[key] && L[key].instructions) || '',
    criteria: Object.assign({}, (L[key] && L[key].criteria) || {}),
  });

  const q = {
    visitor_type: choice('visitor_type'),
    industry: choice('industry'),
    need: choice('need'),
    // stage は data/nq-labels.json の stage だけを使う（stage_legacy は評価の記録用で、ここでは読まない）。
    stage: {
      type: 'score',
      instructions: (L.stage && L.stage.instructions) || '',
      criteria: ((L.stage && L.stage.criteria) || []).slice(),
    },
  };
  for (const key of INTENT_KEYS) q[key] = { type: 'noul', instructions: intentInstructions(L, key) };

  const candidates = pickCandidates({ passed, currentUrl, viewedUrls });
  // 説明は業種に依らずブロックの audience を使う（sg-solution / sg-works も1問ずつ）。
  const relTemplate = template(L.rel, '{audience}', REL_INSTRUCTIONS);
  for (const id of candidates) {
    const audience = String(data.getBlock(id).audience).trim();
    q[relKey(id)] = { type: 'noul', instructions: relTemplate.replace('{audience}', audience) };
  }

  // 関連記事の候補。文は catalog の title と audience（列挙値）だけで組む（訪問者由来の文字列は入らない）。
  const related_candidates = pickRelated({ currentUrl, viewedUrls });
  const artTemplate = template(L.rel_article, '{title}', REL_ARTICLE_INSTRUCTIONS);
  for (const slug of related_candidates) {
    const page = data.catalog[data.ARTICLE_PREFIX + slug];
    const aud = data.articleAudience(page);
    const text = artTemplate
      .replace('{title}', String(page.title).trim())
      .replace(aud ? '{audience}' : /（\{audience\}）|\{audience\}/, aud || '');
    q[relArticleKey(slug)] = { type: 'noul', instructions: text };
  }

  for (const c of CONCERNS) {
    q['concern_' + c] = { type: 'noul', instructions: (L.concerns && L.concerns[c]) || '' };
  }
  q.cta_ok = { type: 'noul', instructions: (L.cta_ok && L.cta_ok.instructions) || '' };

  // 設計書13章: 記事が増えても質問数は増えない。ここを超えるのは blocks.json の selectable なカードが
  // 増えたか、catalog の related が上限を破ったかで、どちらも設計の前提が崩れている。
  // throw は api/suggest.js の外側の try が拾ってデフォルトに倒す（訪問者には何も出ない）。
  const n = Object.keys(q).length;
  assert.ok(n <= MAX_QUESTIONS, `nq_questions_over_limit: ${n} > ${MAX_QUESTIONS}`);

  return { questions: q, candidates, related_candidates };
}

module.exports = { buildQuestions, pickRelated, relKey, relArticleKey, CONCERNS, INTENT_KEYS, REL_PREFIX, REL_ARTICLE_PREFIX, MAX_QUESTIONS };
