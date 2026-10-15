#!/usr/bin/env node
// scripts/make-ads.js — ads/mapping.csv と ads/rsa.csv を data/lp/*.json と下の広告文データから生成する。
//   node scripts/make-ads.js && node scripts/validate-ads.js
// 広告文の文字数は validate-ads.js で検証する (見出し 全角15字 / 説明文 全角45字 / パス 半角15字)。
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = 'https://nortiqlab.com';

const CAMPAIGN = { system: '検索_業務システム開発', renewal: '検索_HPリニューアル' };
const PATHS = {
  system: { gaichu: ['システム開発', '外注'], 'gyomu-gaichu': ['業務システム', '外注'], 'gyomu-irai': ['業務システム', '依頼'], 'app-irai': ['業務アプリ', '依頼'], hiyou: ['業務システム', '費用'] },
  renewal: { irai: ['リニューアル', '依頼'], gaichu: ['リニューアル', '外注'], site: ['サイト刷新', '依頼'], corporate: ['コーポレート', '刷新'], hiyou: ['リニューアル', '費用'] },
};
// 固定見出し (位置1、広告グループごとに2本)
const PINNED = {
  'SD_外注': ['システム開発の外注なら', 'システム開発を外注する'],
  'SD_業務外注': ['業務システム開発の外注', '業務システム開発を外注'],
  'SD_業務依頼': ['業務システム開発を依頼', '業務システム開発のご依頼'],
  'SD_アプリ依頼': ['業務アプリ開発を依頼', '業務アプリ開発のご依頼'],
  'SD_費用': ['業務システムの開発費用', '業務システム開発の費用'],
  'RN_依頼': ['ホームページリニューアル依頼', 'ホームページの作り直しを依頼'],
  'RN_外注': ['ホームページリニューアル外注', 'HPリニューアルを外注'],
  'RN_サイト': ['サイトリニューアルを依頼', 'サイトリニューアルのご依頼'],
  'RN_コーポ': ['コーポレートサイトリニューアル', 'コーポレートサイト刷新'],
  'RN_費用': ['ホームページリニューアル費用', 'リニューアル費用は税別で明示'],
};
const COMMON_H = {
  system: ['PoC 50万円から（税別）', '無料要件整理30分オンライン', '開発費用を事前に明示', '小さく作って確かめる', '要件が曖昧でも相談可', '見積前に要件を整理', '全国対応・オンライン完結', '京都の開発会社Nortiq Labs', '中小企業の業務改善に', '開発担当者と直接相談', 'ソースコードも全て納品', 'まずは無料で要件整理', '料金は税別で明示'],
  renewal: ['作り直し案を無料で確認', 'トップページ案を無料作成', '無料モックアップで比較', '見てから決められる', '料金は税別で事前に明示', '全国対応・オンライン完結', '京都の制作会社Nortiq Labs', '古いサイトを今の基準に', 'スマホ対応・表示速度改善', '中小企業・団体のサイトに', '更新しやすいサイトへ', '検索評価を引き継いで刷新', '30万円から（税別）'],
};
// D1 はグループごと (キーワードの語を入れる)。D2〜D4 は共通。
const D1 = {
  'SD_外注': 'システム開発の外注は、PoC 50万円（税別）から。まず小さく作って効果を確かめられます。',
  'SD_業務外注': '業務システム開発の外注は、PoC 50万円（税別）から。まず小さく作って効果を確かめられます。',
  'SD_業務依頼': '業務システム開発のご依頼は、無料要件整理から。作る範囲と費用の目安を整理してお渡しします。',
  'SD_アプリ依頼': '業務アプリ開発のご依頼は、PoC 50万円（税別）から。現場で使えるかを小さく作って確かめます。',
  'SD_費用': '業務システム開発の費用は、PoC 50万円・本実装200万円〜（税別）。含む内容を料金表で明示。',
  'RN_依頼': 'ホームページのリニューアル依頼は、作り直し案（トップページ）を無料で見てから決められます。',
  'RN_外注': 'ホームページのリニューアル外注は、作り直し案を無料で見てから。他社制作のサイトも対応。',
  'RN_サイト': 'サイトリニューアルのご依頼は、今のサイトと無料モックアップを見比べてから決められます。',
  'RN_コーポ': 'コーポレートサイトのリニューアルは、トップ案を無料で見てから。301で検索評価を引き継ぎ。',
  'RN_費用': 'ホームページリニューアルの費用は30万円〜（税別）。含む内容と別途の費用を料金表で明示。',
};
const COMMON_D = {
  system: ['無料要件整理（30分・オンライン）で、作るべき機能と概算費用を整理します。全国対応。', '料金は税別で明示。業務アプリ・社内システムの開発を、京都から全国の中小企業へ。', 'ソースコード・設計書・手順書と成果物の権利をすべてお渡しします。要件が曖昧でも相談可。'],
  renewal: ['無料トップページ・モックアップを作成。現状サイトとの違いを見比べてからご判断ください。', 'ライト30万円〜・スタンダード60万円〜・プレミアム120万円〜（税別）。全国オンライン対応。', '301リダイレクトで今の検索評価を引き継ぎます。WordPress対応、保守は月2万円から（税別）。'],
};

const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const csv = (rows) => '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';

const mapRows = [['campaign', 'ad_group', 'keyword', 'match_type', 'final_url', 'h1', 'pinned_headline_1', 'pinned_headline_2', 'path1', 'path2', 'lp_variant']];
const rsaHead = ['Campaign', 'Ad group', 'Ad type', 'Status', 'Final URL', 'Path 1', 'Path 2'];
for (let i = 1; i <= 15; i++) rsaHead.push(`Headline ${i}`, `Headline ${i} position`);
for (let i = 1; i <= 4; i++) rsaHead.push(`Description ${i}`, `Description ${i} position`);
const rsaRows = [rsaHead];

for (const field of ['system', 'renewal']) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/lp', field + '.json'), 'utf8'));
  for (const v of d.variants) {
    const url = `${SITE}/${d.route}/${v.slug}`;
    const pin = PINNED[v.adgroup]; if (!pin) throw new Error('固定見出しがありません: ' + v.adgroup);
    const [p1, p2] = PATHS[field][v.slug];
    const h1 = v.h1.replace(/<[^>]+>/g, '').replace(/{{pricenum:dx\.poc}}/g, '50');
    mapRows.push([CAMPAIGN[field], v.adgroup, v.keyword, '完全一致', url, h1, pin[0], pin[1], p1, p2, v.slug]);
    const row = [CAMPAIGN[field], v.adgroup, 'Responsive search ad', 'Paused', url, p1, p2];
    const heads = [...pin, ...COMMON_H[field]];
    heads.forEach((h, i) => row.push(h, i < 2 ? '1' : ''));
    const descs = [D1[v.adgroup], ...COMMON_D[field]];
    descs.forEach((t, i) => row.push(t, i === 0 ? '1' : ''));
    rsaRows.push(row);
  }
}
fs.mkdirSync(path.join(ROOT, 'ads'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'ads/mapping.csv'), csv(mapRows));
fs.writeFileSync(path.join(ROOT, 'ads/rsa.csv'), csv(rsaRows));
console.log(`ads/mapping.csv (${mapRows.length - 1} 行), ads/rsa.csv (${rsaRows.length - 1} 広告グループ) を書き出しました`);
