// EventManager: rare, short surprises that break the rhythm of a run —
// meteor shower, coin rush, alien invasion, super bonus, lucky streak.
// At most one runs at a time, with a long gap between them.

import { EVENTS, VIEW_W, VIEW_H } from '../config.js';

export const EVENT_LABELS = {
  coinRush: 'COIN RUSH!',
  meteorShower: 'METEOR SHOWER!',
  invasion: 'INVASION!',
  superBonus: 'SUPER BONUS!',
  luckyStreak: 'LUCKY STREAK!',
};

export class EventManager {
  constructor(world) {
    this.world = world;
    this.rng = world.rng;
    this.nextAt = this.rng.pickRange(EVENTS.firstAt);
    this.active = null;
    this.last = null;
    this.count = 0;
  }

  update(dt) {
    const w = this.world;
    if (this.active) {
      this.active.t += dt;
      this.tickActive(dt);
      if (this.active.t >= this.active.duration) {
        this.active = null;
        this.nextAt = w.t + this.rng.pickRange(EVENTS.gap);
      }
      return;
    }
    if (w.t < this.nextAt) return;
    const pool = EVENTS.defs.filter((d) => d.minT <= w.t && d.id !== this.last);
    if (!pool.length) {
      this.nextAt = w.t + 5;
      return;
    }
    this.start(this.rng.weighted(pool).id);
  }

  start(id) {
    const w = this.world;
    this.last = id;
    this.count++;
    this.active = { id, t: 0, duration: 1, waveT: 0.9, waves: 0 };
    w.emit('event', { id, label: EVENT_LABELS[id] });
    switch (id) {
      case 'coinRush':
        w.spawner.spawnFormation('rush');
        break;
      case 'luckyStreak':
        w.spawner.spawnFormation('lucky');
        break;
      case 'invasion':
        w.enemies.spawnInvasion();
        this.active.duration = 3;
        break;
      case 'superBonus':
        w.spawner.spawnMeteor('super');
        break;
      case 'meteorShower':
        this.active.duration = 5.2;
        this.active.side = this.rng.pick(['top', 'right']);
        this.active.offset = this.rng.range(0, 1);
        w.spawner.pauseMeteors = 6;
        break;
    }
  }

  tickActive(dt) {
    const a = this.active;
    if (a.id !== 'meteorShower') return;
    a.waveT -= dt;
    if (a.waveT > 0 || a.t > 4.2) return;
    a.waveT = 0.55;
    a.waves++;
    // Lanes across the shower side; every wave leaves at least two lanes free
    // and alternates which lanes are used so there is always a way through.
    const sp = this.world.spawner;
    const across = a.side === 'top' ? VIEW_W : VIEW_H - 24;
    const lanes = Math.floor(across / 44);
    const laneW = across / lanes;
    const dir = a.side === 'top' ? [0.28, 1] : [-1, 0.22];
    const len = Math.hypot(dir[0], dir[1]);
    const used = [];
    for (let i = 0; i < lanes; i++) if ((i + a.waves) % 2 === 0 && this.rng.chance(0.8)) used.push(i);
    while (used.length > lanes - 2) used.pop();
    for (const i of used) {
      const pos = laneW * (i + 0.5) + this.rng.range(-6, 6);
      const entry = a.side === 'top' ? [pos - 30, 0] : [VIEW_W, 24 + pos];
      sp.spawnMeteor('fire', {
        entry, dir: [dir[0] / len, dir[1] / len], size: this.rng.chance(0.7) ? 0 : 1, warn: 0.85, speedMul: 0.9,
      });
    }
  }
}
