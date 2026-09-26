// Production build: bundles + minifies the game into dist/ with the script
// and CSS inlined into index.html, so dist/index.html also runs straight
// from disk (file://) — no server needed. Static assets are copied along
// for hosting as an installable PWA.     npm run build
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  legalComments: 'none',
  define: { __VERSION__: JSON.stringify(pkg.version) },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('css/style.css', 'utf8');
let html = readFileSync('index.html', 'utf8');
html = html.replace('<link rel="stylesheet" href="css/style.css">', `<style>${css}</style>`);
html = html.replace('<script type="module" src="src/main.js"></script>', () => `<script>${js}</script>`);
writeFileSync('dist/index.html', html);

for (const f of ['manifest.webmanifest', 'sw.js', 'icons', 'LICENSE']) cpSync(f, `dist/${f}`, { recursive: true });
if (existsSync('assets')) cpSync('assets', 'dist/assets', { recursive: true });
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`dist/index.html  ${kb} KB (single file, works offline and from file://)`);
