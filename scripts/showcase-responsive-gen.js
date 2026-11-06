// 実績ショーケースの全幅対応 CSS を生成する。
//
//   node scripts/showcase-responsive-gen.js [slug ...]
//
// 実績サイトは Claude Design の書き出しで、レイアウトがすべてインライン style に
// 入っていて class がない。一方、描画後の要素には data-dc-tpl="<番号>" が付く。
// そこで原本を幅1440pxで実際に描画し、要素ごとの style と寸法から
// 「狭い画面でどう変えるか」を決めて、[data-dc-tpl="<番号>"] を指す CSS を書き出す。
//
// 出力: showcase/_responsive/generated/<slug>.css (手で編集しない)
// 手直しは showcase/_responsive/<slug>.css に書く。読み込み順は build.js を参照。
// Claude Design から書き出し直したら、このスクリプトを流し直すこと。
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOWCASE = path.join(ROOT, 'showcase');
const OUT = path.join(SHOWCASE, '_responsive', 'generated');

function loadPlaywright() {
  const cands = [process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright', 'playwright'].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (e) { /* 次の候補へ */ } }
  throw new Error('playwright が見つからない');
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ブラウザ内で動く。tier ごとに { id: { prop: value } } を返す
function analyze() {
  const out = { t1279: {}, t1100: {}, t900: {}, p600: {} };
  const add = (tier, id, props) => { out[tier][id] = Object.assign(out[tier][id] || {}, props); };
  const px = (v) => { const m = /^(-?[\d.]+)px$/.exec(String(v).trim()); return m ? parseFloat(m[1]) : null; };
  const r2 = (n) => Math.round(n);

  // 列定義を「列のリスト」に展開する
  const splitTop = (s) => {
    const parts = []; let depth = 0; let cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ' ' && depth === 0) { if (cur) parts.push(cur); cur = ''; } else cur += ch;
    }
    if (cur) parts.push(cur);
    return parts;
  };
  const tracksOf = (s) => {
    const list = [];
    let fluid = 0;
    for (const t of splitTop(s)) {
      const m = /^repeat\((\d+|auto-fit|auto-fill),\s*(.+)\)$/.exec(t);
      if (m) {
        if (/auto/.test(m[1])) { const mm = /minmax\(([\d.]+)px/.exec(m[2]); fluid = mm ? parseFloat(mm[1]) : 1; } else for (let i = 0; i < +m[1]; i++) list.push(m[2]);
      } else list.push(t);
    }
    return { list, fluid };
  };

  const visibleKids = (el) => [...el.children].filter((c) => {
    if (/^(SCRIPT|STYLE)$/.test(c.tagName)) return false;
    const cs = getComputedStyle(c);
    if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') return false;
    const r = c.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  });
  const textLen = (el) => (el.innerText || el.textContent || '').trim().length;
  const hasMedia = (el) => !!el.querySelector('img,video,canvas,image-slot,input,select,textarea') || /^(IMG|IMAGE-SLOT|INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
  const isCompact = (kids, limit) => kids.length > 0 && kids.every((k) => textLen(k) <= limit && !hasMedia(k) && k.getBoundingClientRect().height < 200);

  for (const el of document.querySelectorAll('[data-dc-tpl]')) {
    if (el.closest('svg')) continue;
    const id = el.getAttribute('data-dc-tpl');
    const s = el.style;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const inHeader = !!el.closest('header');
    const parent = el.parentElement;
    const parentCs = parent ? getComputedStyle(parent) : null;
    // 横スクロールで見せる列 (カルーセル) は、狭い画面でも横並びのまま
    let inScroller = false;
    for (let a = el; a && a !== document.body; a = a.parentElement) { if (/auto|scroll/.test(getComputedStyle(a).overflowX)) { inScroller = true; break; } }

    // ---- 最低幅 (ページ全体を固定幅にしている原因) ----
    const minW = px(s.minWidth);
    if (minW !== null && minW >= 900) add('t1279', id, { 'min-width': '0' });
    else if (minW !== null && minW >= 240) add('t900', id, { 'min-width': '0' });

    // ---- 文字サイズ ----
    const fs = px(s.fontSize);
    if (fs !== null) {
      // 大見出しは 1280px を基準に幅に比例させる (段組みの幅が減った分だけ小さくする)
      if (fs >= 40) add('t1279', id, { 'font-size': `min(${fs}px,${(fs / 12.8).toFixed(2)}vw)` });
      if (fs >= 22) {
        const hi = r2(17 + (fs - 17) * 0.52);
        const lo = r2(hi * 0.8);
        add('p600', id, { 'font-size': `clamp(${lo}px,${(hi / 3.9).toFixed(2)}vw,${hi}px)` });
        if (fs >= 48) add('t900', id, { 'font-size': `${r2(fs * 0.78)}px` });
      } else if (fs < 11) add('p600', id, { 'font-size': '11px' });
    }

    // ---- 字間: 広すぎる字間はスマホで長い行が収まらない ----
    const ls = /^([\d.]+)em$/.exec(s.letterSpacing || '');
    if (ls && parseFloat(ls[1]) >= 0.16 && textLen(el) > 10) add('p600', id, { 'letter-spacing': '0.08em' });

    // ---- 余白 ----
    const pt = px(s.paddingTop); const pb = px(s.paddingBottom);
    const pl = px(s.paddingLeft); const pr = px(s.paddingRight);
    const isBox = rect.width >= 560;
    const padP = {}; const padT = {};
    if (pt !== null && pt >= 36) padP['padding-top'] = `${Math.max(28, r2(pt * 0.58))}px`;
    if (pb !== null && pb >= 36) padP['padding-bottom'] = `${Math.max(28, r2(pb * 0.58))}px`;
    if (pl !== null && pl >= 16) padP['padding-left'] = isBox ? '20px' : (pl >= 28 ? `${Math.max(16, r2(pl * 0.62))}px` : `${pl}px`);
    if (pr !== null && pr >= 16) padP['padding-right'] = isBox ? '20px' : (pr >= 28 ? `${Math.max(16, r2(pr * 0.62))}px` : `${pr}px`);
    if (pl !== null && pl >= 48) padT['padding-left'] = '32px';
    if (pr !== null && pr >= 48) padT['padding-right'] = '32px';
    if (pt !== null && pt >= 96) padT['padding-top'] = `${r2(pt * 0.78)}px`;
    if (pb !== null && pb >= 96) padT['padding-bottom'] = `${r2(pb * 0.78)}px`;
    if (Object.keys(padP).length) add('p600', id, padP);
    if (Object.keys(padT).length) add('t900', id, padT);

    // ---- 外余白 ----
    const mt = px(s.marginTop); const mb = px(s.marginBottom);
    const ml = px(s.marginLeft); const mr = px(s.marginRight);
    const mar = {};
    if (mt !== null && mt >= 36) mar['margin-top'] = `${r2(mt * 0.6)}px`;
    if (mb !== null && mb >= 36) mar['margin-bottom'] = `${r2(mb * 0.6)}px`;
    if (mt !== null && mt <= -16) mar['margin-top'] = '0';
    if (mb !== null && mb <= -16) mar['margin-bottom'] = '0';
    if (ml !== null && Math.abs(ml) >= 24) mar['margin-left'] = ml > 0 ? `${r2(ml * 0.3)}px` : '0';
    if (mr !== null && Math.abs(mr) >= 24) mar['margin-right'] = mr > 0 ? `${r2(mr * 0.3)}px` : '0';
    if (Object.keys(mar).length) add('p600', id, mar);

    // ---- 間隔 ----
    const rg = px(s.rowGap); const cg = px(s.columnGap);
    const gapP = {}; const gapT = {};
    if (rg !== null && rg >= 24) gapP['row-gap'] = `${Math.max(16, r2(rg * 0.55))}px`;
    if (cg !== null && cg >= 24) gapP['column-gap'] = `${Math.max(14, r2(cg * 0.5))}px`;
    if (cg !== null && cg >= 48) gapT['column-gap'] = `${r2(cg * 0.6)}px`;
    if (Object.keys(gapP).length) add('p600', id, gapP);
    if (Object.keys(gapT).length) add('t900', id, gapT);

    // ---- 固定の幅・高さ ----
    const w = px(s.width);
    if (w !== null && w >= 240 && !/^(IMG|SVG)$/i.test(el.tagName)) {
      add('p600', id, { width: '100%', 'max-width': `${w}px` });
      if (w >= 420) add('t900', id, { width: '100%', 'max-width': `${w}px` });
    }
    const h = px(s.height);
    if (h !== null && h >= 280) add('p600', id, { height: `${r2(h * 0.62)}px` });
    const minH = px(s.minHeight);
    if (minH !== null && minH >= 320) add('p600', id, { 'min-height': `${r2(minH * 0.6)}px` });
    if (/vh$/.test(s.minHeight || '') || /vh$/.test(s.height || '')) {
      // 中身が絶対配置だけの器は auto にすると高さが 0 になって消える
      if (visibleKids(el).length) add('p600', id, /vh$/.test(s.height || '') ? { height: 'auto', 'min-height': '0' } : { 'min-height': '0' });
      else add('p600', id, /vh$/.test(s.height || '') ? { height: 'min(78svh,620px)' } : { 'min-height': 'min(78svh,620px)' });
    }

    // ---- 折り返し禁止 ----
    if (s.whiteSpace === 'nowrap' && textLen(el) >= 14 && !cs.animationName.includes('marquee')) {
      add('p600', id, { 'white-space': 'normal' });
    }

    // ---- 段組み (grid) ----
    const gtc = s.gridTemplateColumns;
    if (gtc && gtc !== 'none') {
      const { list, fluid } = tracksOf(gtc);
      const kids = visibleKids(el);
      const n = list.length;
      const anyLong = kids.some((k) => textLen(k) > 90 || hasMedia(k));
      const fixed = list.map((t) => px(t)).filter((v) => v !== null);
      const minTrack = list.map((t) => { const m = /^minmax\(([\d.]+)px/.exec(t); return m ? parseFloat(m[1]) : null; }).filter((v) => v !== null);
      const bigFixed = [...fixed, ...minTrack].some((v) => v >= 180);
      const smallFixedOnly = fixed.length > 0 && !bigFixed;
      const ONE = 'minmax(0,1fr)';
      if (fluid) {
        if (fluid >= 200) add('p600', id, { 'grid-template-columns': ONE });
        if (fluid >= 340) add('t900', id, { 'grid-template-columns': ONE });
      } else if (n >= 7 && fixed.length >= 3) {
        // 表のような行: 幅を保ったまま親で横スクロールさせる
        const sum = fixed.reduce((a, b) => a + b, 0) + 240;
        add('t900', id, { 'min-width': `${sum}px` });
      } else if (n === 12) {
        add('t900', id, { 'grid-template-columns': 'repeat(6,minmax(0,1fr))' });
        add('p600', id, { 'grid-template-columns': ONE });
      } else if (smallFixedOnly && n <= 3 && !anyLong) {
        // ラベル + 値 の行はそのまま。固定列だけ少し詰める
        add('p600', id, { 'grid-template-columns': list.map((t) => { const v = px(t); return v !== null && v >= 100 ? `${r2(v * 0.72)}px` : t; }).join(' ') });
      } else if (smallFixedOnly && n <= 3) {
        // 見出し列 + 長い本文: 固定列が大きいときは縦に積む
        if (fixed[0] >= 96) add('p600', id, { 'grid-template-columns': ONE });
        else add('p600', id, { 'grid-template-columns': list.map((t) => { const v = px(t); return v !== null && v >= 72 ? `${r2(v * 0.68)}px` : t; }).join(' ') });
      } else if (n >= 2) {
        const wide = rect.width >= 700;
        if (n === 2) {
          if (wide || bigFixed) add('t900', id, { 'grid-template-columns': ONE });
          if (!isCompact(kids, 28)) add('p600', id, { 'grid-template-columns': ONE });
        } else if (n === 3) {
          if (bigFixed) add('t900', id, { 'grid-template-columns': ONE });
          if (isCompact(kids, 18)) add('p600', id, { 'grid-template-columns': list.map(() => ONE).join(' ') });
          else add('p600', id, { 'grid-template-columns': ONE });
        } else if (n === 4) {
          add('t900', id, { 'grid-template-columns': 'repeat(2,minmax(0,1fr))' });
          add('p600', id, { 'grid-template-columns': isCompact(kids, 44) ? 'repeat(2,minmax(0,1fr))' : ONE });
        } else {
          add('t900', id, { 'grid-template-columns': 'repeat(3,minmax(0,1fr))' });
          add('p600', id, { 'grid-template-columns': isCompact(kids, 44) ? 'repeat(2,minmax(0,1fr))' : ONE });
        }
      }
      if (!gtc.includes('auto-')) {
        for (const k of kids) {
          const kid = k.getAttribute('data-dc-tpl');
          if (!kid) continue;
          const col = k.style.gridColumn || k.style.gridColumnStart;
          const row = k.style.gridRow || k.style.gridRowStart;
          if (col && !/-1/.test(col)) add('p600', kid, { 'grid-column': 'auto' });
          if (row) add('p600', kid, { 'grid-row': 'auto' });
        }
      }
    }

    // ---- 子要素の固定幅 ----
    const fb = px(s.flexBasis);
    if (fb !== null && fb >= 220 && !inScroller) add('t900', id, { flex: '1 1 100%', 'max-width': '100%' });
    if (s.flexShrink === '0' && rect.width >= 240 && !inScroller && parentCs && /flex/.test(parentCs.display) && parentCs.flexDirection === 'row') {
      add('p600', id, { 'flex-shrink': '1', 'min-width': '0' });
    }

    // ---- 横並び (flex) ----
    if (/flex/.test(cs.display) && cs.flexDirection === 'row' && s.display && !inScroller) {
      const kids = visibleKids(el);
      if (kids.length >= 2 && !inHeader) {
        const big = kids.filter((k) => k.getBoundingClientRect().width >= 260);
        const sum = kids.reduce((a, k) => a + k.getBoundingClientRect().width, 0) + (cg || 0) * (kids.length - 1);
        const ALLCOL = { 'flex-direction': 'column', 'align-items': 'stretch' };
        const icon = kids.length === 2 ? kids.find((k) => k.getBoundingClientRect().width <= 64) : null;
        if (big.length >= 2) {
          add(sum >= 860 ? 't900' : 'p600', id, ALLCOL);
          for (const k of big) { const kid = k.getAttribute('data-dc-tpl'); if (kid) add(sum >= 860 ? 't900' : 'p600', kid, { flex: '0 1 auto', width: '100%', 'max-width': '100%', 'min-width': '0' }); }
        } else if (icon) {
          // アイコン + 文章 の行は折り返さず、文章側を縮める
          const text = kids.find((k) => k !== icon);
          const tid = text.getAttribute('data-dc-tpl');
          add('p600', id, { 'flex-wrap': 'nowrap' });
          if (tid) add('p600', tid, { 'min-width': '0', 'white-space': 'normal' });
        } else if (sum > 320) {
          add('p600', id, { 'flex-wrap': 'wrap' });
        }
      }
    }

    // ---- 追従する横の列: 1段になった画面では追従させない ----
    if (s.position === 'sticky' && !inHeader && rect.height > 200 && rect.width < 700) add('t900', id, { position: 'static' });
  }

  // ---- ヘッダー: スマホではロゴと主ボタンだけ残す ----
  const header = document.querySelector('header')
    || [...document.querySelectorAll('#dc-root [data-dc-tpl]')].find((e) => /fixed|sticky/.test(getComputedStyle(e).position) && e.getBoundingClientRect().top <= 1 && e.getBoundingClientRect().height < 160 && e.getBoundingClientRect().width >= 700);
  if (header) {
    const rows = [header, ...header.querySelectorAll('div')].filter((e) => /flex|grid/.test(getComputedStyle(e).display) && e.children.length >= 2 && e.getBoundingClientRect().width >= 700);
    const row = rows[rows.length - 1] && rows.find((e) => e.querySelector('a,button'));
    if (row) {
      const rowId = row.getAttribute('data-dc-tpl');
      if (rowId) {
        add('t900', rowId, { gap: '16px', 'flex-wrap': 'nowrap', 'grid-template-columns': 'auto auto', 'justify-content': 'space-between' });
        add('p600', rowId, { 'padding-left': '16px', 'padding-right': '16px', gap: '10px', height: 'auto', 'min-height': '56px' });
      }
      const kids = [...row.children].filter((k) => getComputedStyle(k).display !== 'none');
      // 主ボタン = 背景色か枠のある、いちばん最後のリンク/ボタン
      const links = [...row.querySelectorAll('a,button')].filter((a) => a.getBoundingClientRect().width > 0);
      const painted = (a) => { const c = getComputedStyle(a); return (c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent') || parseFloat(c.borderTopWidth) > 0; };
      const cta = [...links].reverse().find(painted) || (kids.length > 1 ? links[links.length - 1] : null);
      kids.forEach((k, i) => {
        const kid = k.getAttribute('data-dc-tpl');
        if (!kid || i === 0) return;
        if (cta && (k === cta || k.contains(cta))) {
          add('p600', kid, { 'flex-shrink': '0', 'margin-left': 'auto' });
          // ボタンを包む箱の中の電話番号などは隠す
          if (k !== cta) for (const inner of k.children) { if (inner !== cta && !inner.contains(cta)) { const iid = inner.getAttribute('data-dc-tpl'); if (iid) add('p600', iid, { display: 'none' }); } }
        } else if (k.tagName !== 'NAV') add('p600', kid, { display: 'none' });
      });
      const first = kids[0] && kids[0].getAttribute('data-dc-tpl');
      if (first) add('p600', first, { 'min-width': '0', 'flex-shrink': '1' });
      if (cta) {
        const cid = cta.getAttribute('data-dc-tpl');
        const cs = getComputedStyle(cta);
        if (cid && parseFloat(cs.paddingLeft) >= 10) add('p600', cid, { padding: '8px 12px', 'font-size': '12.5px', 'white-space': 'nowrap', 'letter-spacing': '0.02em' });
        else if (cid) add('p600', cid, { 'white-space': 'nowrap' });
      }
    }
    // ヘッダーの中身が多いページは、早めの幅でナビを畳む
    const rowUsed = row ? [...row.children].reduce((a, k) => a + k.getBoundingClientRect().width, 0) : 0;
    const navTier = rowUsed > 820 ? 't1100' : 't900';
    for (const nav of header.querySelectorAll('nav')) {
      const nid = nav.getAttribute('data-dc-tpl');
      if (nid && nav.querySelectorAll('a').length >= 2 && !(nav.contains(header) )) {
        // ボタンまで nav に入っている場合は、ボタン以外のリンクだけ隠す
        const ctaInNav = [...nav.querySelectorAll('a,button')].reverse().find((a) => { const c = getComputedStyle(a); return (c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'transparent') || parseFloat(c.borderTopWidth) > 0; });
        if (ctaInNav) {
          for (const a of nav.children) { if (a !== ctaInNav && !a.contains(ctaInNav)) { const aid = a.getAttribute('data-dc-tpl'); if (aid) add(navTier, aid, { display: 'none' }); } }
        } else add(navTier, nid, { display: 'none' });
      }
    }
  }
  return out;
}

const MEDIA = { t1279: 1279.98, t1100: 1100, t900: 960, p600: 760 };
function toCss(res) {
  const lines = [];
  for (const tier of Object.keys(MEDIA)) {
    const ids = Object.keys(res[tier]);
    if (!ids.length) continue;
    lines.push(`@media (max-width:${MEDIA[tier]}px){`);
    ids.sort((a, b) => +a - +b);
    for (const id of ids) {
      const props = Object.entries(res[tier][id]).map(([k, v]) => `${k}:${v}!important`).join(';');
      lines.push(`[data-dc-tpl="${id}"]{${props}}`);
    }
    lines.push('}');
  }
  return lines.join('\n') + '\n';
}

(async () => {
  const { chromium } = loadPlaywright();
  const argv = process.argv.slice(2);
  const slugs = argv.length ? argv : fs.readdirSync(SHOWCASE, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && fs.existsSync(path.join(SHOWCASE, e.name, 'index.html')))
    .map((e) => e.name);
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  for (const slug of slugs) {
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/showcase/${slug}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#dc-root [data-dc-tpl]', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(1500);
    const res = await page.evaluate(analyze);
    const css = `/* 生成物: scripts/showcase-responsive-gen.js が出力。手で編集しない。 */\n${toCss(res)}`;
    fs.writeFileSync(path.join(OUT, `${slug}.css`), css);
    console.log(slug.padEnd(14), `${(css.length / 1024).toFixed(1)} KB`);
    await page.close();
  }
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
