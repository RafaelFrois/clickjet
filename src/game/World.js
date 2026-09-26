// World (GameManager for a single run): owns every gameplay system, steps
// them in a fixed order, resolves collisions and emits events that the
// presentation layer (FX, audio, UI) consumes. No DOM access here, so runs
// can be simulated headlessly (see tools/simulate.mjs and tests/).

import { Rng } from '../util/rng.js';
import { circleHit } from '../util/math.js';
import { Player } from './Player.js';
import { DifficultyManager } from './DifficultyManager.js';
import { ScoreManager } from './ScoreManager.js';
import { PowerUpManager } from './PowerUpManager.js';
import { SpawnManager } from './SpawnManager.js';
import { EnemyManager } from './EnemyManager.js';
import { EventManager } from './EventManager.js';

export class World {
  constructor({ seed, highScore = 0, tutorial = false } = {}) {
    this.rng = new Rng(seed);
    this.events = [];
    this.t = 0;
    this.state = 'playing';
    this.tutorial = tutorial;
    this.seen = { rainbowCoin: false, rainbowMeteor: false, chaser: false };
    this.death = null;
    this.deadTime = 0;
    this.player = new Player();
    this.difficulty = new DifficultyManager();
    this.score = new ScoreManager(this, highScore);
    this.power = new PowerUpManager(this);
    this.enemies = new EnemyManager(this);
    this.spawner = new SpawnManager(this);
    this.director = new EventManager(this);
    this.spawner.initial();
  }

  emit(type, data) {
    data.type = type;
    this.events.push(data);
  }

  /** Hand over and clear the events generated since the last call. */
  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  step(dt, intent) {
    if (this.state === 'playing') {
      this.t += dt;
      this.difficulty.update(this.t);
      this.player.update(dt, intent);
      this.enemies.recordPlayer();
      this.spawner.update(dt);
      this.enemies.update(dt);
      this.director.update(dt);
      this.power.update(dt);
      this.score.update(dt);
      this.collide();
    } else {
      this.deadTime += dt;
      this.spawner.updateAmbient(dt);
      this.enemies.updateAmbient(dt);
    }
  }

  collide() {
    const p = this.player;
    if (!p.alive) return;
    // Power-up meteors are always collectable (even during spawn grace).
    for (const m of this.spawner.meteors.active) {
      if (m.dead || m.warn > 0 || m.kind === 'fire') continue;
      if (circleHit(p.x, p.y, p.r + 2, m.x, m.y, m.r + 1)) {
        m.dead = true;
        this.power.activate(m.kind === 'super', m.x, m.y);
      }
    }
    if (p.grace > 0) return;
    for (const m of this.spawner.meteors.active) {
      if (m.dead || m.warn > 0 || m.kind !== 'fire') continue;
      if (circleHit(p.x, p.y, p.r, m.x, m.y, m.r)) return this.kill('meteor', m.x, m.y);
    }
    for (const r of this.spawner.rocks.active) {
      if (circleHit(p.x, p.y, p.r, r.x, r.y, r.r)) return this.kill('rock', r.x, r.y);
    }
    const hit = this.enemies.hitsPlayer(p.x, p.y, p.r);
    if (hit) return this.kill(hit, p.x, p.y);
  }

  kill(cause, hx, hy) {
    const p = this.player;
    p.alive = false;
    this.state = 'dead';
    const s = this.score;
    const isRecord = s.score > 0 && s.score > s.best;
    this.death = { cause, x: p.x, y: p.y, hx, hy, time: this.t, score: s.score, isRecord };
    if (this.power.active) this.power.active = false;
    this.emit('death', { cause, x: p.x, y: p.y, vx: p.vx, vy: p.vy, angle: p.angle });
  }
}
