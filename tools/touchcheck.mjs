// Mobile check: landscape phone viewport with real touch events.
// Verifies relative-drag steering, tap UI (play / pause / continue) and the
// portrait "rotate" hint.   node tools/touchcheck.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.OUT || 'smoke-shots';
mkdirSync(OUT, { recursive: true });
const server = await startServer(8127);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:8127/');
await page.waitForFunction(() => window.__clickjet && window.__clickjet.state === 'MENU');
await page.waitForTimeout(400);
const cdp = await ctx.newCDPSession(page);
const box = await page.locator('#game').boundingBox();
const at = (x, y) => ({ x: box.x + (x / 320) * box.width, y: box.y + (y / 180) * box.height });
const touch = async (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x, y: p.y, id: 1 }] });
const tap = async (x, y) => { const p = at(x, y); await touch('touchStart', p); await page.waitForTimeout(40); await touch('touchEnd', p); await page.waitForTimeout(80); };

await page.screenshot({ path: `${OUT}/m1-menu.png` });
await tap(160, 68);
await page.waitForFunction(() => window.__clickjet.state === 'PLAYING', null, { timeout: 3000 });
await page.evaluate(() => { window.__clickjet.world.player.grace = 60; });
await page.waitForTimeout(300);
const before = await page.evaluate(() => ({ x: window.__clickjet.world.player.x, y: window.__clickjet.world.player.y }));
// drag from the lower-left area (thumb) 60 logical px to the right and 20 up
const start = at(60, 150);
await touch('touchStart', start);
for (let i = 1; i <= 12; i++) {
  await touch('touchMove', at(60 + i * 5, 150 - i * (20 / 12)));
  await page.waitForTimeout(16);
}
await page.waitForTimeout(500);
const after = await page.evaluate(() => ({ x: window.__clickjet.world.player.x, y: window.__clickjet.world.player.y, dev: window.__clickjet.input.lastDevice }));
await touch('touchEnd', at(120, 130));
await page.screenshot({ path: `${OUT}/m2-play.png` });
// pause with the HUD button, then continue
await tap(310, 9);
await page.waitForTimeout(250);
const paused = await page.evaluate(() => window.__clickjet.state);
await page.screenshot({ path: `${OUT}/m3-pause.png` });
await tap(160, 85);
await page.waitForTimeout(1300);
const resumed = await page.evaluate(() => window.__clickjet.state);
// portrait: rotate hint must show
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const rotateVisible = await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');
const stateAfterRotate = await page.evaluate(() => window.__clickjet.state);
await page.screenshot({ path: `${OUT}/m4-portrait.png` });
const dx = after.x - before.x, dy = after.y - before.y;
const res = { dx: +dx.toFixed(1), dy: +dy.toFixed(1), device: after.dev, paused, resumed, rotateVisible, stateAfterRotate, errors };
console.log(JSON.stringify(res, null, 1));
await browser.close();
server.close();
const ok = dx > 60 && dy < -15 && paused === 'PAUSED' && resumed === 'PLAYING' && rotateVisible && stateAfterRotate === 'PAUSED' && !errors.length;
process.exit(ok ? 0 : 1);
