// Screenshots a screen of the web preview in a phone-sized Chrome window, for checking layout.
// Needs: `npm run web -- --port 8099` running, and `npm i --no-save playwright-core` (uses installed Chrome).
// Usage: node scripts/screenshot.mjs <path> <out.png> [action ...]
// Actions: wait:ms  down:x,y  move:x,y[,steps]  up  tap:x,y  shot:name.png  eval:js
import { chromium } from 'playwright-core';
const [, , path, out, ...actions] = process.argv;
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:8099${path}`, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(1500);
for (const a of actions) {
  const [kind, arg = ''] = a.split(/:(.*)/s);
  const n = arg.split(',').map(Number);
  if (kind === 'wait') await page.waitForTimeout(n[0]);
  else if (kind === 'down') { await page.mouse.move(n[0], n[1]); await page.mouse.down(); }
  else if (kind === 'move') await page.mouse.move(n[0], n[1], { steps: n[2] || 10 });
  else if (kind === 'up') await page.mouse.up();
  else if (kind === 'tap') { await page.mouse.click(n[0], n[1]); }
  else if (kind === 'shot') await page.screenshot({ path: arg });
  else if (kind === 'eval') console.log(await page.evaluate(arg));
  else if (kind === 'peel') {
    // Find a flake (outlined polygon) away from the screen edges, catch it, and pull it by dx,dy.
    const target = await page.evaluate(() => {
      const rects = [...document.querySelectorAll('polygon[stroke]')].map(p => p.getBoundingClientRect())
        .filter(r => r.width > 18 && r.x > 60 && r.x < 280 && r.y > 150 && r.y < 600);
      const r = rects[0];
      return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    });
    console.log('flake at', JSON.stringify(target));
    if (target) {
      await page.mouse.move(target.x, target.y);
      await page.mouse.down();
      await page.waitForTimeout(120);
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(target.x + (n[0] * i) / steps, target.y + (n[1] * i) / steps);
        await page.waitForTimeout(30);
        if (i === Math.round(steps * 0.5)) await page.screenshot({ path: 'pick-peeling.png' });
      }
      await page.waitForTimeout(120);
      await page.screenshot({ path: 'pick-detached.png' });
      await page.mouse.up();
    }
  }
}
await page.screenshot({ path: out });
if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].slice(0, 15).join('\n'));
await browser.close();
