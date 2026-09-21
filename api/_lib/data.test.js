// data.js のテスト。承認（キルスイッチ）の判定（data.deliverable が「出してよい」と答える条件）と、catalog の代替読み込み。
const test = require('node:test');
const assert = require('node:assert');
const data = require('./data');

test.afterEach(() => { data.__resetForTest(); });

const block = (approved_by, variant) => ({
  block_id: 'sg-x', kind: 'suggest', target_url: '/x', selectable: true, approved_by,
  variants: { default: Object.assign({ title: 't' }, variant) },
});
const ok = (b) => { data.__setForTest({ blocks: [b], includeUnapproved: false }); return data.deliverable(data.getBlock('sg-x'), 'default'); };

test('承認は空でない文字列だけ: false / 0 / true / {} / [] / null / 空白は未承認のまま', () => {
  // 未承認のつもりで approved_by: false と書いても、配信物に入らない（build.js の nqFilled と同じ条件）。
  for (const v of [false, 0, 1, true, {}, [], ['oshima'], null, undefined, '', '  ']) {
    assert.strictEqual(ok(block(v)), false, `approved_by=${JSON.stringify(v)}`);
  }
  assert.strictEqual(ok(block('oshima')), true);
});

test('variant 単位・業種単位の承認も、文字列以外は承認にならない', () => {
  assert.strictEqual(ok(block('', { approved_by: true })), false);
  assert.strictEqual(ok(block('', { approved_by: 0 })), false);
  assert.strictEqual(ok(block('', { approved_by: 'oshima' })), true);

  const byIndustry = (entryApproved) => ({
    block_id: 'sg-x', kind: 'suggest', target_url: null, selectable: true, approved_by: '', variants: {},
    by_industry: { '不動産': { target_url: '/x-realty', approved_by: entryApproved, variants: { default: { title: 't' } } } },
  });
  const okInd = (b) => { data.__setForTest({ blocks: [b], includeUnapproved: false }); return data.deliverable(data.getBlock('sg-x'), 'default', '不動産'); };
  assert.strictEqual(okInd(byIndustry(false)), false);
  assert.strictEqual(okInd(byIndustry({})), false);
  assert.strictEqual(okInd(byIndustry('oshima')), true);
});

test('catalog.json が同梱されていないとき: catalog-pages.json に落ちて動き、Vercel の上でだけ警告を1回出す', () => {
  // data.js を「api/_data/catalog.json が無い配置」に写して、別プロセスで読み込む
  // （このプロセスでは require のキャッシュに本物の catalog.json が載っているので再現できない）。
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nq-data-'));
  try {
    fs.mkdirSync(path.join(root, 'api', '_lib'), { recursive: true });
    fs.mkdirSync(path.join(root, 'data'));
    fs.copyFileSync(path.join(__dirname, 'data.js'), path.join(root, 'api', '_lib', 'data.js'));
    fs.writeFileSync(path.join(root, 'data', 'catalog-pages.json'), JSON.stringify({ pages: [{ url: '/web', type: 'service', title: 'Web制作' }] }));
    const run = (env) => spawnSync(process.execPath, ['-e', "const d = require('./api/_lib/data.js'); process.stdout.write(JSON.stringify(Object.keys(d.catalog)));"],
      { cwd: root, env: Object.assign({}, process.env, { VERCEL: '' }, env), encoding: 'utf8' });
    const onVercel = run({ VERCEL: '1' });
    assert.strictEqual(onVercel.stdout, '["/web"]');
    assert.strictEqual(onVercel.stderr.split('[nq] api/_data/catalog.json not bundled').length - 1, 1);
    const local = run({});
    assert.strictEqual(local.stdout, '["/web"]');
    assert.strictEqual(local.stderr.includes('[nq]'), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
