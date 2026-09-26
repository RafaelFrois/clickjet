// Generates the app icons (PWA / favicon / apple-touch) from the game's own
// pixel sprites, rendered in Chromium.   node tools/make-icons.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('icons', { recursive: true });
const server = await startServer(8128);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:8128/tools/preview.html');
const icons = await page.evaluate(async () => {
  const { buildSprites } = await import('/src/gfx/sprites.js');
  const { rotIndex } = await import('/src/gfx/pixel.js');
  const s = buildSprites();
  // 32x32 pixel master, then nearest-neighbour upscale
  const master = (padded) => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#000';
    x.fillRect(0, 0, 32, 32);
    // blue plaque ring
    const inset = padded ? 3 : 0;
    x.fillStyle = '#1a1aee';
    x.fillRect(inset + 2, inset, 32 - inset * 2 - 4, 32 - inset * 2);
    x.fillRect(inset, inset + 2, 32 - inset * 2, 32 - inset * 2 - 4);
    x.fillRect(inset + 1, inset + 1, 32 - inset * 2 - 2, 32 - inset * 2 - 2);
    x.fillStyle = '#000';
    x.fillRect(inset + 2, inset + 2, 32 - inset * 2 - 4, 32 - inset * 2 - 4);
    // stars
    x.fillStyle = '#fff';
    for (const [sx, sy] of [[7, 8], [24, 6], [9, 24], [26, 22], [16, 5]]) x.fillRect(sx + (padded ? 0 : 0), sy, 1, 1);
    // rocket heading up-right with thrust flame
    const set = s.rocket.flames[2];
    const f = set.frames[rotIndex(-Math.PI / 4, set.count)];
    x.drawImage(f, Math.round(16 - set.half), Math.round(16 - set.half));
    return c;
  };
  const up = (src, size) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, size, size);
    return c.toDataURL('image/png');
  };
  const m = master(false), mp = master(true);
  return {
    'icon-192.png': up(m, 192),
    'icon-512.png': up(m, 512),
    'icon-maskable-512.png': up(mp, 512),
    'apple-touch-icon.png': up(m, 192).length && up(mp, 180),
    'favicon.png': up(m, 64),
  };
});
for (const [name, url] of Object.entries(icons)) {
  writeFileSync(`icons/${name}`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote icons/' + name);
}
await browser.close();
server.close();
