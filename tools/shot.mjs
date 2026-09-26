// Screenshot helper: node tools/shot.mjs <url-path> <out.png> [waitMs] [w] [h]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';
const [, , path = '/', out = 'shot.png', wait = '800', w = '1280', h = '720'] = process.argv;
const server = await startServer(8123);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://localhost:8123${path}`);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log('title:', await page.title());
console.log(logs.join('\n'));
await browser.close();
server.close();
