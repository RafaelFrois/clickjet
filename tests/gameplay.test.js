import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/game/World.js';
import { FIXED_DT, SCORE, VIEW_W, VIEW_H, PLAYER, CHASER } from '../src/config.js';
import { makePlanner } from '../tools/bots.mjs';

const idle = { mode: 'none' };
function run(w, seconds, intent = () => idle, onStep) {
  const n = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < n && w.state === 'playing'; i++) {
    w.step(FIXED_DT, intent(w));
    if (onStep) onStep(w);
  }
}

test('coins: +5, rainbow +10, combo multiplier and reset', () => {
  const w = new World({ seed: 1 });
  const s = w.score;
  s.collectCoin(0, 0, 0);
  assert.equal(s.score, 5);
  s.collectCoin(1, 0, 0);
  assert.equal(s.score, 15);
  for (let i = 0; i < 3; i++) s.collectCoin(0, 0, 0); // combo = 5 -> x2
  assert.equal(s.mult, 2);
  assert.equal(s.score, 15 + 5 + 5 + 10);
  s.update(SCORE.comboWindow + 0.01);
  assert.equal(s.mult, 1);
  assert.equal(s.combo, 0);
  for (let i = 0; i < 40; i++) s.collectCoin(0, 0, 0);
  assert.equal(s.mult, SCORE.comboMaxMult, 'multiplier is capped');
});

test('collecting a coin by flying into it', () => {
  const w = new World({ seed: 2 });
  w.spawner.coins.clear();
  w.spawner.addCoin(w.player.x + 30, w.player.y, 0, 10);
  const target = { mode: 'point', x: w.player.x + 30, y: w.player.y };
  run(w, 0.6, () => target);
  assert.equal(w.score.score, 5);
  assert.ok(w.events.some((e) => e.type === 'coin'));
});

test('power-up: +10 per second for its whole duration', () => {
  const w = new World({ seed: 3 });
  w.power.activate(false, 0, 0);
  let t = 0;
  while (w.power.active && t < 20) {
    w.power.update(FIXED_DT);
    t += FIXED_DT;
  }
  assert.equal(w.score.score, SCORE.bonusRate * SCORE.bonusDuration);
  assert.ok(Math.abs(t - SCORE.bonusDuration) < 0.02);
});

test('power-up: rainbow meteor contact activates bonus, never kills', () => {
  const w = new World({ seed: 4 });
  w.player.grace = 0;
  const m = w.spawner.spawnMeteor('rainbow');
  m.warn = 0;
  m.x = w.player.x;
  m.y = w.player.y;
  w.collide();
  assert.equal(w.state, 'playing');
  assert.equal(w.power.active, true);
});

test('hazards kill: meteor, rock, green alien, hunter', () => {
  for (const kind of ['meteor', 'rock', 'alien', 'chaser']) {
    const w = new World({ seed: 5 });
    w.player.grace = 0;
    const p = w.player;
    if (kind === 'meteor') {
      const m = w.spawner.spawnMeteor('fire');
      m.warn = 0; m.x = p.x; m.y = p.y;
    } else if (kind === 'rock') {
      w.spawner.addRock(p.x, p.y, 0, 0, 1);
    } else if (kind === 'alien') {
      const g = w.enemies.newGreen();
      g.x = p.x; g.y = p.y; g.state = 'wander';
    } else {
      const c = w.enemies.chaser;
      c.state = 'hunt'; c.x = p.x; c.y = p.y;
    }
    w.collide();
    assert.equal(w.state, 'dead', kind);
    assert.equal(w.death.cause, kind);
  }
});

test('fair collisions: a near miss outside the hitbox does not kill', () => {
  const w = new World({ seed: 6 });
  w.player.grace = 0;
  const r = w.spawner.addRock(w.player.x + w.player.r + 7.2 + 0.6, w.player.y, 0, 0, 1);
  w.collide();
  assert.equal(w.state, 'playing', `rock r=${r.r}`);
});

test('meteors always telegraph and never warn right next to the rocket', () => {
  for (let seed = 0; seed < 25; seed++) {
    const w = new World({ seed });
    run(w, 120, (ww) => ({ mode: 'point', x: ww.player.x + Math.sin(ww.t) * 60, y: ww.player.y + Math.cos(ww.t * 1.3) * 40 }), (ww) => {
      ww.player.grace = 1; // keep it alive to observe spawns
      for (const e of ww.events) {
        if (e.type === 'meteorWarn') {
          const d = Math.hypot(e.x - ww.player.x, e.y - ww.player.y);
          assert.ok(d >= 55, `warning ${d.toFixed(1)}px from rocket (seed ${seed})`);
        }
      }
      ww.events.length = 0;
      for (const m of ww.spawner.meteors.active) if (m.age === 0 && m.warn <= 0 && !m.warnMax) assert.fail('meteor without warning');
    });
  }
});

test('green aliens and hunter never spawn on top of the rocket', () => {
  for (let seed = 0; seed < 20; seed++) {
    const w = new World({ seed });
    const seen = new Set();
    run(w, 150, (ww) => ({ mode: 'point', x: 60 + (ww.t * 23) % 200, y: 40 + (ww.t * 17) % 110 }), (ww) => {
      ww.player.grace = 1;
      for (const g of ww.enemies.greens.active) {
        if (!seen.has(g) || g.state === 'enter') {
          if (!seen.has(g)) {
            const d = Math.hypot(g.x - ww.player.x, g.y - ww.player.y);
            if (!g.event) assert.ok(d > 60, `green spawned ${d.toFixed(1)}px away`);
            seen.add(g);
          }
        }
      }
      for (const e of ww.events) if (e.type === 'chaserWarn') {
        const c = ww.enemies.chaser;
        assert.ok(Math.hypot(c.wx - ww.player.x, c.wy - ww.player.y) > 60, 'hunter entry too close');
      }
      ww.events.length = 0;
    });
    // objects are pooled and recycled: reset the seen set when objects are reused
    seen.clear();
  }
});

test('hunter is escapable: slower than the rocket at every difficulty', () => {
  const w = new World({ seed: 9 });
  for (const t of [0, 30, 60, 120, 240, 600]) {
    w.difficulty.update(t);
    assert.ok(w.difficulty.p.chaserSpeed * PLAYER.maxSpeed < PLAYER.maxSpeed * 0.95);
  }
  assert.ok(CHASER.warnTime >= 1, 'hunter announces itself');
});

test('an idle player does not survive long (the game pushes you)', () => {
  let total = 0;
  for (let seed = 0; seed < 20; seed++) {
    const w = new World({ seed });
    run(w, 120);
    total += w.t;
  }
  assert.ok(total / 20 < 40, `idle average ${total / 20}`);
});

test('determinism: same seed + inputs = same run', () => {
  const a = new World({ seed: 77 }), b = new World({ seed: 77 });
  const bot = (ww) => ({ mode: 'point', x: 160 + Math.sin(ww.t * 2) * 100, y: 90 + Math.cos(ww.t * 3) * 60 });
  run(a, 60, bot);
  run(b, 60, bot);
  assert.equal(a.t, b.t);
  assert.equal(a.score.score, b.score.score);
  assert.equal(a.player.x, b.player.x);
});

test('long runs: pools stay bounded and nothing leaks', () => {
  const w = new World({ seed: 123 });
  const bot = makePlanner();
  run(w, 400, bot, (ww) => { ww.player.grace = 1; ww.events.length = 0; });
  const sp = w.spawner, en = w.enemies;
  assert.ok(sp.coins.allocated <= 90);
  assert.ok(sp.meteors.allocated <= 40);
  assert.ok(sp.rocks.allocated <= 12);
  assert.ok(en.greens.allocated <= 14);
  assert.ok(sp.formations.size < 12, `formations map grows: ${sp.formations.size}`);
  for (const c of sp.coins.active) {
    assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y));
  }
  const p = w.player;
  assert.ok(p.x >= 0 && p.x <= VIEW_W && p.y >= 0 && p.y <= VIEW_H);
});

test('rare events happen, but rarely', () => {
  let events = 0, time = 0;
  for (let seed = 0; seed < 8; seed++) {
    const w = new World({ seed });
    run(w, 200, () => idle, (ww) => { ww.player.grace = 1; });
    events += w.director.count;
    time += w.t;
  }
  const perMinute = events / (time / 60);
  assert.ok(perMinute > 0.8 && perMinute < 3.5, `events per minute ${perMinute.toFixed(2)}`);
});

test('coin formation: full chain gives the bonus, a missed coin does not', () => {
  const w = new World({ seed: 31 });
  w.spawner.coins.clear();
  w.player.x = 20; w.player.y = 170;
  const n = w.spawner.spawnFormation('line');
  assert.ok(n >= 4);
  const coins = w.spawner.coins.active.slice();
  const before = w.score.score;
  for (const c of coins) { c.delay = 0; w.player.x = c.x; w.player.y = c.y; w.spawner.updateCoins(FIXED_DT, true); }
  assert.equal(w.score.chains, 1);
  assert.ok(w.score.score - before >= SCORE.sequenceBonus + n * SCORE.coin);
  assert.equal(w.spawner.formations.size, 0);

  w.player.x = 20; w.player.y = 170;
  w.spawner.spawnFormation('line');
  const c2 = w.spawner.coins.active.slice();
  c2[0].life = 0; c2[0].delay = 0;
  w.spawner.updateCoins(FIXED_DT, false);
  for (const c of c2.slice(1)) { c.delay = 0; w.player.x = c.x; w.player.y = c.y; w.spawner.updateCoins(FIXED_DT, true); }
  assert.equal(w.score.chains, 1, 'no bonus for an incomplete chain');
  assert.equal(w.spawner.formations.size, 0, 'formation forgotten');
});
