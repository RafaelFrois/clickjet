import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager, DEFAULTS } from '../src/core/SaveManager.js';
import { Pool } from '../src/util/pool.js';
import { Rng } from '../src/util/rng.js';
import { sampleDifficulty } from '../src/game/DifficultyManager.js';
import { DIFFICULTY_KEYS, SAVE_KEY } from '../src/config.js';
import { wrapAngle, approachAngle, circleHit } from '../src/util/math.js';

function memStore(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

test('save: defaults when empty, persists and reloads', () => {
  const store = memStore();
  const s = new SaveManager(store);
  assert.deepEqual(s.data, { ...DEFAULTS });
  const r = s.recordRun(120, 33.26, 14);
  assert.equal(r.newHighScore, true);
  assert.equal(r.newBestTime, true);
  s.set('muted', true);
  const again = new SaveManager(store);
  assert.equal(again.get('highScore'), 120);
  assert.equal(again.get('bestTime'), 33.3);
  assert.equal(again.get('gamesPlayed'), 1);
  assert.equal(again.get('muted'), true);
});

test('save: lower score does not overwrite the record', () => {
  const s = new SaveManager(memStore());
  s.recordRun(300, 10);
  const r = s.recordRun(200, 5);
  assert.equal(r.newHighScore, false);
  assert.equal(s.get('highScore'), 300);
  assert.equal(s.get('gamesPlayed'), 2);
});

test('save: zero score is never a record', () => {
  const s = new SaveManager(memStore());
  assert.equal(s.recordRun(0, 3).newHighScore, false);
});

test('save: corrupt / hostile data falls back safely', () => {
  const store = memStore({ [SAVE_KEY]: '{"highScore":"999","musicVolume":7,"muted":1,"sfxVolume":NaN' });
  assert.deepEqual(new SaveManager(store).data, { ...DEFAULTS });
  const store2 = memStore({ [SAVE_KEY]: JSON.stringify({ highScore: 55.7, musicVolume: 3, muted: 'yes' }) });
  const s2 = new SaveManager(store2);
  assert.equal(s2.get('highScore'), 55);
  assert.equal(s2.get('musicVolume'), 1);
  assert.equal(s2.get('muted'), false);
});

test('save: storage that throws does not crash the game', () => {
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  const s = new SaveManager(bad);
  assert.equal(s.get('highScore'), 0);
  assert.equal(s.save(), false);
  s.recordRun(10, 1); // must not throw
});

test('pool: recycles objects and keeps order', () => {
  let made = 0;
  const p = new Pool(() => ({ id: made++ }), 2, 5);
  const a = p.obtain(), b = p.obtain(), c = p.obtain();
  assert.equal(p.size, 3);
  b.dead = true;
  p.sweep();
  assert.deepEqual(p.active, [a, c]);
  const d = p.obtain();
  assert.equal(d, b, 'reuses the freed object');
  for (let i = 0; i < 10; i++) p.obtain();
  assert.equal(p.size, 5, 'respects max');
  assert.equal(p.obtain(), null);
  assert.ok(p.allocated <= 5);
});

test('rng: deterministic for a seed', () => {
  const a = new Rng(42), b = new Rng(42);
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
  const r = new Rng(1);
  for (let i = 0; i < 1000; i++) {
    const v = r.int(3, 7);
    assert.ok(v >= 3 && v <= 7);
  }
});

test('difficulty: monotonic pressure over time', () => {
  let prev = sampleDifficulty(0);
  for (let t = 1; t <= 240; t += 1) {
    const d = sampleDifficulty(t);
    assert.ok(d.meteorInterval <= prev.meteorInterval + 1e-9, `meteor interval grows at ${t}`);
    assert.ok(d.greenMax >= prev.greenMax);
    assert.ok(d.rockMax >= prev.rockMax);
    assert.ok(d.chaserSpeed >= prev.chaserSpeed - 1e-9);
    assert.ok(d.chaserCooldown <= prev.chaserCooldown + 1e-9);
    assert.ok(d.warnTime >= 0.6, 'always a reaction window');
    assert.ok(d.chaserSpeed < 1, 'hunter always slower than the rocket');
    prev = { ...d };
  }
  const last = DIFFICULTY_KEYS[DIFFICULTY_KEYS.length - 1];
  assert.equal(sampleDifficulty(9999).meteorInterval, last[1], 'clamped after last key');
});

test('math helpers', () => {
  assert.ok(Math.abs(Math.abs(wrapAngle(Math.PI * 3)) - Math.PI) < 1e-9);
  assert.ok(Math.abs(wrapAngle(Math.PI * 2 + 0.5) - 0.5) < 1e-9);
  assert.equal(approachAngle(0, 1, 0.25), 0.25);
  assert.ok(Math.abs(approachAngle(3, -3, 10) - -3) < 1e-9);
  assert.ok(circleHit(0, 0, 1, 1.5, 0, 1));
  assert.ok(!circleHit(0, 0, 1, 2.5, 0, 1));
});
