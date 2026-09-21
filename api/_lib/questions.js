// 次ページ提案（nq）— モデルへの質問を組み立てる（設計書6章「質問」・7章「1. 候補を絞る」「2. 関連度を採点する」）。
//
//   buildQuestions({ passed, currentUrl, viewedUrls }) -> { questions, candidates }
//
// 1回の呼び出しに全部入れる（質問は並列に評価されるので、数を増やしても応答時間は
// ほとんど変わらない）。指示文と選択肢の説明は data/nq-labels.json の語をそのまま使う。
// catalog・blocks・月次レポートと同じ語でないと、集計のときに突き合わせられなくなる。
// type は Jev の公式リファレンスに合わせて小文字（choice / score / noul）。
//
// 提案カードは「どれが最も合うか」を1問で選ばせず、カードごとに関連度（rel_<block_id>、Noul）を
// 1問ずつ聞く。順位をつけるのは recommend.js で、ここはどのカードについて聞くか（candidates）を
// 決めるだけ。候補の絞り込みは学習させず、ルールで固定する。

const data = require('./data');

const CONCERNS = ['cost', 'schedule', 'trust', 'ai_quality', 'scope'];
const REL_PREFIX = 'rel_';
// {audience} はブロックの audience（肯定文1文）。Jev は文字どおりに読むので、言い回しを足さない。
const REL_INSTRUCTIONS = 'この訪問者は次の説明に当てはまる：{audience}';

const relKey = (blockId) => REL_PREFIX + blockId;

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
    stage: {
      type: 'score',
      instructions: (L.stage && L.stage.instructions) || '',
      criteria: ((L.stage && L.stage.criteria) || []).slice(),
    },
  };

  const candidates = pickCandidates({ passed, currentUrl, viewedUrls });
  // 説明は業種に依らずブロックの audience を使う（sg-solution / sg-works も1問ずつ）。
  const template = (L.rel && typeof L.rel.instructions === 'string' && L.rel.instructions.includes('{audience}'))
    ? L.rel.instructions : REL_INSTRUCTIONS;
  for (const id of candidates) {
    const audience = String(data.getBlock(id).audience).trim();
    q[relKey(id)] = { type: 'noul', instructions: template.replace('{audience}', audience) };
  }

  for (const c of CONCERNS) {
    q['concern_' + c] = { type: 'noul', instructions: (L.concerns && L.concerns[c]) || '' };
  }
  q.cta_ok = { type: 'noul', instructions: (L.cta_ok && L.cta_ok.instructions) || '' };
  return { questions: q, candidates };
}

module.exports = { buildQuestions, relKey, CONCERNS, REL_PREFIX };
