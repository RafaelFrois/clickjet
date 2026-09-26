// Browser smoke test (Playwright + Chromium): boots the game, plays through
// menu -> gameplay -> pause -> death -> game over -> restart -> menu,
// saves screenshots and fails on any page error.
//   npm run smoke            (screens saved to ./smoke-shots)
//   OUT=/tmp/x npm run smoke
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.OUT || 'smoke-shots';
mkdirSync(OUT, { recursive: true });
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const server = await startServer(8124);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: !!process.env.TOUCH, isMobile: !!process.env.TOUCH });
const errors = [];
const seen = new Set();
const addErr = (msg) => { if (!seen.has(msg)) { seen.add(msg); errors.push(msg); } };
page.on('pageerror', (e) => addErr(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) addErr(m.text()); });
await page.goto('http://localhost:8124/');
await page.waitForFunction(() => window.__clickjet && window.__clickjet.state === 'MENU');
await page.waitForTimeout(600);

const box = await page.locator('#game').boundingBox();
const at = (x, y) => [box.x + (x / 320) * box.width, box.y + (y / 180) * box.height];
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const state = () => page.evaluate(() => window.__clickjet.state);

await shot('01-menu');
// options panel
await page.mouse.click(...at(299, 163));
await page.waitForTimeout(400);
await shot('02-options');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// start the game
await page.mouse.move(...at(160, 68));
await page.mouse.click(...at(160, 68));
await page.waitForFunction(() => window.__clickjet.state === 'PLAYING');
await page.evaluate(() => { window.__clickjet.world.player.grace = 60; });
// fly around in a figure-eight for a while
const t0 = Date.now();
while (Date.now() - t0 < 6000) {
  const k = (Date.now() - t0) / 1000;
  await page.mouse.move(...at(160 + Math.sin(k * 1.3) * 110, 100 + Math.sin(k * 2.6) * 50));
  await page.waitForTimeout(50);
  if ((await state()) !== 'PLAYING') break;
}
await shot('03-gameplay');
const music = await page.evaluate(() => {
  const m = window.__clickjet.audio.music;
  return m ? { playing: m.playing, mode: m.mode, track: m.current && m.current.id, step: m.stepIdx } : null;
});
// force a bonus + combo for a HUD screenshot (debug)
await page.evaluate(() => {
  const w = window.__clickjet.world;
  if (!w || w.state !== 'playing') return;
  w.player.grace = 30;
  w.power.activate(false, w.player.x, w.player.y);
  for (let i = 0; i < 7; i++) w.score.collectCoin(0, w.player.x, w.player.y);
});
await page.waitForTimeout(700);
await shot('04-bonus-hud');

// pause
await page.keyboard.press('KeyP');
await page.waitForTimeout(300);
const paused = await state();
await shot('05-pause');
await page.keyboard.press('KeyP');
await page.waitForTimeout(1200);
const resumed = await state();

// force a death
await page.evaluate(() => {
  const w = window.__clickjet.world;
  w.player.grace = 0;
  w.kill('meteor', w.player.x, w.player.y);
});
await page.waitForTimeout(250);
await shot('06-explosion');
await page.waitForFunction(() => window.__clickjet.state === 'GAME_OVER', null, { timeout: 5000 });
await page.waitForTimeout(1500);
await shot('07-gameover');

// restart immediately
await page.keyboard.press('KeyR');
await page.waitForFunction(() => window.__clickjet.state === 'PLAYING', null, { timeout: 3000 });
await page.waitForTimeout(500);
const afterRestart = await state();
// back to menu via pause menu
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
const final = await state();
await shot('08-menu-after');

const save = await page.evaluate(() => localStorage.getItem('clickjet.save.v1'));
console.log(JSON.stringify({ paused, resumed, afterRestart, final, music, save, errors }, null, 1));
await browser.close();
server.close();
const musicOk = music && music.playing && music.mode === 'game' && music.step > 0;
if (errors.length || paused !== 'PAUSED' || afterRestart !== 'PLAYING' || final !== 'MENU' || !musicOk) process.exit(1);
