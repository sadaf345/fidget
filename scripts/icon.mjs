// Draws the app icon (a teal pop-it sheet with its corner peeling up) and exports every image app.json uses.
// Needs: `npm i --no-save playwright-core` (renders with the installed Google Chrome).
// Usage: node scripts/icon.mjs            -> assets/images/{icon,splash-icon,adaptive-icon,favicon}.png
//        node scripts/icon.mjs --svg      -> also writes assets/images/icon.svg, for editing in a design tool
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const OUT = new URL('../assets/images/', import.meta.url).pathname;
const TEAL = '#4ECDC4'; // theme.accent

function hex(c) { return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); }
function mix(c, to, t) {
  const a = hex(c), b = hex(to);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const light = (c, t) => mix(c, '#FFFFFF', t);
const dark = (c, t) => mix(c, '#000000', t);
const round = v => Math.round(v * 10) / 10;

/** One pop-it bubble seen from above. Raised: lit top-left. Popped: a dimple, lit bottom-right. */
function bubble(id, cx, cy, r, color, popped) {
  if (popped) {
    return `
    <radialGradient id="${id}" cx="62%" cy="66%" r="70%">
      <stop offset="0%" stop-color="${light(color, 0.12)}"/>
      <stop offset="70%" stop-color="${dark(color, 0.12)}"/>
      <stop offset="100%" stop-color="${dark(color, 0.35)}"/>
    </radialGradient>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark(color, 0.18)}"/>
    <circle cx="${cx}" cy="${cy}" r="${round(r * 0.86)}" fill="url(#${id})"/>
    <circle cx="${cx}" cy="${cy}" r="${round(r * 0.86)}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="${round(r * 0.1)}" filter="url(#soft)"/>`;
  }
  const hx = round(cx - r * 0.34), hy = round(cy - r * 0.38);
  return `
    <radialGradient id="${id}" cx="36%" cy="30%" r="78%">
      <stop offset="0%" stop-color="${light(color, 0.35)}"/>
      <stop offset="55%" stop-color="${color}"/>
      <stop offset="100%" stop-color="${dark(color, 0.28)}"/>
    </radialGradient>
    <circle cx="${cx}" cy="${round(cy + r * 0.08)}" r="${r}" fill="#000" opacity="0.25" filter="url(#soft)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>
    <ellipse cx="${hx}" cy="${hy}" rx="${round(r * 0.3)}" ry="${round(r * 0.19)}" transform="rotate(-38 ${hx} ${hy})" fill="#fff" opacity="0.6" filter="url(#soft)"/>`;
}

/**
 * The icon on a 1024 canvas. `background: false` leaves only the sheet on transparency (splash, Android
 * foreground); `scale` shrinks or grows the sheet around the center.
 */
function iconSvg({ background = true, scale = 1 } = {}) {
  const tilt = -8;
  const lo = 200, hi = 824, corner = 120; // the sheet, before tilting
  const fold = 1360; // the peel folds along x + y = fold...
  const bow = 34; // ...bowed toward the corner, so it curls rather than creases
  const ax = hi, ay = fold - hi, bx = fold - hi, by = hi;
  const mx = (ax + bx) / 2 + bow, my = (ay + by) / 2 + bow;
  const sheet = `M ${lo + corner} ${lo} H ${hi - corner} Q ${hi} ${lo} ${hi} ${lo + corner} V ${ay} Q ${mx} ${my} ${bx} ${by} H ${lo + corner} Q ${lo} ${hi} ${lo} ${hi - corner} V ${lo + corner} Q ${lo} ${lo} ${lo + corner} ${lo} Z`;
  // The peeled flap is the cut-off corner mirrored across the fold: (x, y) -> (fold - y, fold - x).
  const mirror = (x, y) => [fold - y, fold - x];
  const [p1x, p1y] = mirror(hi, hi - corner), [p2x, p2y] = mirror(hi - corner, hi), [qx, qy] = mirror(hi, hi);
  const flap = `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by} L ${p2x} ${p2y} Q ${qx} ${qy} ${p1x} ${p1y} Z`;

  const grid = [318, 512, 706];
  let bubbles = '';
  let n = 0;
  for (const y of grid) for (const x of grid) {
    if (x + y > fold - 40) continue; // under the peel
    bubbles += bubble(`b${n++}`, x, y, 76, light(TEAL, 0.08), x === 512 && y === 318);
  }

  const offset = 512 * (1 - scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#20202E"/>
      <stop offset="100%" stop-color="#0A0A0F"/>
    </radialGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
    <linearGradient id="sheet" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${light(TEAL, 0.12)}"/>
      <stop offset="100%" stop-color="${dark(TEAL, 0.28)}"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="flap" gradientUnits="userSpaceOnUse" x1="${mx}" y1="${my}" x2="${qx}" y2="${qy}">
      <stop offset="0%" stop-color="#9FE3DC"/>
      <stop offset="35%" stop-color="#E4FAF7"/>
      <stop offset="100%" stop-color="#FFFFFF"/>
    </linearGradient>
    <clipPath id="sheetClip"><path d="${sheet}"/></clipPath>
  </defs>
  ${background ? `<rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="540" r="330" fill="${TEAL}" opacity="0.14" filter="url(#glow)"/>` : ''}
  <g transform="translate(${offset} ${offset}) scale(${scale}) rotate(${tilt} 512 512)">
    <path d="${sheet}" transform="translate(0 22)" fill="#000" opacity="${background ? 0.55 : 0.35}" filter="url(#shadow)"/>
    <path d="${sheet}" fill="url(#sheet)"/>
    <g clip-path="url(#sheetClip)">
      <path d="${sheet}" fill="none" stroke="url(#rim)" stroke-width="14"/>
      ${bubbles}
      <path d="${flap}" transform="translate(-18 -18)" fill="#000" opacity="0.5" filter="url(#shadow)"/>
    </g>
    <path d="${flap}" fill="url(#flap)"/>
  </g>
</svg>
`;
}

const exports = [
  // App Store and home screen: opaque, full bleed (iOS rounds the corners itself).
  { file: 'icon.png', size: 1024, svg: iconSvg() },
  // Shown at 200pt on the #0A0A0F splash background (app.json), so just the sheet.
  { file: 'splash-icon.png', size: 1024, svg: iconSvg({ background: false, scale: 1.2 }), transparent: true },
  // Android adaptive foreground: keep the sheet inside the safe circle (66% of the canvas).
  { file: 'adaptive-icon.png', size: 1024, svg: iconSvg({ background: false, scale: 0.76 }), transparent: true },
  { file: 'favicon.png', size: 48, svg: iconSvg() },
];

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
for (const { file, size, svg, transparent } of exports) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const sized = svg.replace('width="1024" height="1024"', `width="${size}" height="${size}"`);
  await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`);
  await page.screenshot({ path: OUT + file, omitBackground: !!transparent });
  await page.close();
  console.log(`assets/images/${file} (${size}x${size}${transparent ? ', transparent' : ''})`);
}
await browser.close();
if (process.argv.includes('--svg')) writeFileSync(OUT + 'icon.svg', iconSvg());
