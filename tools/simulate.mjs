// Headless balance simulation: runs many games with simple bots and prints
// survival / score statistics plus fairness checks.
//   npm run sim            (default 200 runs per bot)
//   RUNS=50 npm run sim
import { World } from '../src/game/World.js';
import { FIXED_DT } from '../src/config.js';
import { makeBot, makePlanner } from './bots.mjs';

const RUNS = Number(process.env.RUNS || 200);
const MAX_T = Number(process.env.MAX_T || 400);

export function runGame(seed, botKind, maxT = MAX_T) {
  const w = new World({ seed, highScore: 0 });
  const bot = botKind === 'planner' ? makePlanner() : botKind === 'cautious' ? makePlanner({ greed: 0.2 }) : makeBot(botKind);
  const fair = { nearSpawns: 0, meteorWarnNear: 0 };
  const maxPool = { coins: 0, meteors: 0, rocks: 0, greens: 0 };
  while (w.state === 'playing' && w.t < maxT) {
    w.step(FIXED_DT, bot(w));
    for (const e of w.drainEvents()) {
      if (e.type === 'meteorWarn' && Math.hypot(e.x - w.player.x, e.y - w.player.y) < 55) fair.meteorWarnNear++;
    }
    maxPool.coins = Math.max(maxPool.coins, w.spawner.coins.size);
    maxPool.meteors = Math.max(maxPool.meteors, w.spawner.meteors.size);
    maxPool.rocks = Math.max(maxPool.rocks, w.spawner.rocks.size);
    maxPool.greens = Math.max(maxPool.greens, w.enemies.greens.size);
  }
  return {
    t: w.t, score: w.score.score, cause: w.death?.cause || 'timeout', fair, maxPool,
    events: w.director.count, chains: w.score.chains, maxMult: w.score.maxMult, bonus: w.score.bonusPoints,
  };
}

function pct(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const bot of (process.env.BOTS || 'idle,random,dodger,expert').split(',')) {
    const res = [];
    const t0 = Date.now();
    for (let i = 0; i < RUNS; i++) res.push(runGame(1000 + i, bot));
    const times = res.map((r) => r.t), scores = res.map((r) => r.score);
    const causes = {};
    for (const r of res) causes[r.cause] = (causes[r.cause] || 0) + 1;
    const pools = res.reduce((a, r) => { for (const k in r.maxPool) a[k] = Math.max(a[k] || 0, r.maxPool[k]); return a; }, {});
    const near = res.reduce((a, r) => a + r.fair.meteorWarnNear, 0);
    console.log(`\n[${bot}] ${RUNS} runs in ${Date.now() - t0}ms`);
    console.log(`  survival s  p10=${pct(times, 0.1).toFixed(1)} p50=${pct(times, 0.5).toFixed(1)} p90=${pct(times, 0.9).toFixed(1)} max=${Math.max(...times).toFixed(1)}`);
    console.log(`  score       p10=${pct(scores, 0.1)} p50=${pct(scores, 0.5)} p90=${pct(scores, 0.9)} max=${Math.max(...scores)}`);
    console.log(`  deaths      ${JSON.stringify(causes)}`);
    console.log(`  peak pools  ${JSON.stringify(pools)}  meteor warnings <55px from rocket: ${near}`);
  }
}
