// AI在庫登録システム (iPadアプリ) のカバー画像。
// 公開サイトが無い案件なので、他案件の写真を流用せず専用のカバーを描く。
import sharp from 'sharp';

const hLines = Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 50}" x2="1280" y2="${i * 50}"/>`).join('');
const vLines = Array.from({ length: 26 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="800"/>`).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#12161C"/><stop offset="100%" stop-color="#1E2530"/>
    </linearGradient>
    <linearGradient id="ac" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#E5484D"/><stop offset="100%" stop-color="#FF7A5C"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bg)"/>
  <g opacity="0.09" stroke="#FFFFFF" stroke-width="1">${hLines}${vLines}</g>
  <rect x="300" y="140" width="680" height="500" rx="26" fill="#0C0F14" stroke="#333B47" stroke-width="2"/>
  <rect x="330" y="176" width="620" height="300" rx="12" fill="#171C24"/>
  <circle cx="640" cy="326" r="68" fill="none" stroke="url(#ac)" stroke-width="5"/>
  <path d="M604 326 l24 26 l48 -54" fill="none" stroke="url(#ac)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="330" y="500" width="300" height="16" rx="8" fill="#2A323D"/>
  <rect x="330" y="534" width="210" height="16" rx="8" fill="#222932"/>
  <rect x="700" y="498" width="250" height="52" rx="10" fill="url(#ac)"/>
  <text x="825" y="531" font-family="sans-serif" font-size="20" font-weight="700" fill="#FFFFFF" text-anchor="middle">登録する</text>
  <text x="100" y="706" font-family="sans-serif" font-size="34" font-weight="800" fill="#FFFFFF">AI 在庫登録システム</text>
  <text x="100" y="748" font-family="sans-serif" font-size="19" fill="#8C97A6">iPad アプリ / 画像から商品を同定 / スマレジ連携</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('assets/work-taketora-ai.png');
console.log('assets/work-taketora-ai.png を作成');
