// EnemyManager: green aliens (floating wanderers that occasionally lunge
// after a clear telegraph) and the purple hunter that periodically enters
// to chase the rocket. The hunter is a bit slower than the rocket and turns
// with a limited rate, so sharp dodges always work — for a while.

import { VIEW_W, VIEW_H, GREEN, CHASER, PLAYER, FIXED_DT } from '../config.js';
import { Pool } from '../util/pool.js';
import { clamp, damp, dist, approachAngle, circleHit, TAU } from '../util/math.js';

const MARGIN = 14;

export class EnemyManager {
  constructor(world) {
    this.world = world;
    this.rng = world.rng;
    this.greens = new Pool(() => ({}), 8, 14);
    this.greenTimer = 1.5;
    this.lungeRoll = 1;
    const n = Math.ceil(CHASER.historySeconds / FIXED_DT) + 2;
    this.histX = new Float32Array(n);
    this.histY = new Float32Array(n);
    this.histN = n;
    this.histI = 0;
    this.histFilled = 0;
    this.chaser = {
      state: 'idle', timer: CHASER.firstHuntAt - CHASER.warnTime,
      x: -40, y: -40, vx: 0, vy: 0, heading: 0, speed: 0, huntT: 0, stun: 0, spin: 0,
      wx: 0, wy: 0, trail: [], trailT: 0, anim: 0, tut: false, hunts: 0,
    };
  }

  // -------------------------------------------------------------- history
  recordPlayer() {
    const p = this.world.player;
    this.histX[this.histI] = p.x;
    this.histY[this.histI] = p.y;
    this.histI = (this.histI + 1) % this.histN;
    if (this.histFilled < this.histN) this.histFilled++;
  }

  delayedPlayer(delay) {
    const steps = Math.min(Math.round(delay / FIXED_DT), this.histFilled - 1);
    if (steps < 0) return [this.world.player.x, this.world.player.y];
    const i = (this.histI - 1 - steps + this.histN * 2) % this.histN;
    return [this.histX[i], this.histY[i]];
  }

  // --------------------------------------------------------------- greens
  greenCount() {
    let n = 0;
    for (const g of this.greens.active) if (!g.event && g.state !== 'leave') n++;
    return n;
  }

  newGreen() {
    const g = this.greens.obtain();
    if (!g) return null;
    const d = this.world.difficulty.p;
    g.vx = 0;
    g.vy = 0;
    g.speed = this.rng.pickRange(GREEN.speed) * d.greenSpeed;
    g.bob = this.rng.range(0, TAU);
    g.bobAmp = this.rng.range(1.2, 2.6);
    g.bobSpeed = this.rng.range(2.2, 3.6);
    g.bobY = 0;
    g.state = 'enter';
    g.stateT = 0;
    g.life = this.rng.pickRange(GREEN.life);
    g.anim = this.rng.range(0, 10);
    g.blink = this.rng.range(1, 4);
    g.event = false;
    g.shake = 0;
    g.wx = VIEW_W / 2;
    g.wy = VIEW_H / 2;
    g.wTimer = 4;
    g.baseY = 0;
    g.phase = 0;
    return g;
  }

  spawnGreen() {
    const p = this.world.player;
    for (let tries = 0; tries < 10; tries++) {
      const edge = this.rng.pick(['left', 'right', 'top', 'bottom']);
      let x, y;
      if (edge === 'left') [x, y] = [-MARGIN, this.rng.range(40, VIEW_H - 24)];
      else if (edge === 'right') [x, y] = [VIEW_W + MARGIN, this.rng.range(40, VIEW_H - 24)];
      else if (edge === 'top') [x, y] = [this.rng.range(30, VIEW_W - 30), -MARGIN];
      else [x, y] = [this.rng.range(30, VIEW_W - 30), VIEW_H + MARGIN];
      if (dist(x, y, p.x, p.y) < GREEN.minSpawnDistFromPlayer) continue;
      const g = this.newGreen();
      if (!g) return null;
      g.x = x;
      g.y = y;
      this.pickWaypoint(g, true);
      // first waypoint: just inside the edge it entered from
      g.wx = clamp(x, 30, VIEW_W - 30) + (edge === 'left' ? 30 : edge === 'right' ? -30 : 0);
      g.wy = clamp(y, 40, VIEW_H - 28) + (edge === 'top' ? 26 : edge === 'bottom' ? -26 : 0);
      return g;
    }
    return null;
  }

  pickWaypoint(g, first = false) {
    const p = this.world.player;
    for (let i = 0; i < 8; i++) {
      const x = this.rng.range(24, VIEW_W - 24), y = this.rng.range(36, VIEW_H - 22);
      if (dist(x, y, g.x, g.y) < 30) continue;
      if (!first && dist(x, y, p.x, p.y) < 34) continue;
      g.wx = x;
      g.wy = y;
      g.wTimer = this.rng.range(2.5, 5);
      return;
    }
    g.wx = this.rng.range(40, VIEW_W - 40);
    g.wy = this.rng.range(44, VIEW_H - 30);
    g.wTimer = 3;
  }

  /** Rare event: a staggered line of aliens crossing the screen. */
  spawnInvasion() {
    const fromLeft = this.world.player.x > VIEW_W / 2;
    const n = 5;
    const dir = fromLeft ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const g = this.newGreen();
      if (!g) break;
      g.event = true;
      g.state = 'cross';
      g.x = fromLeft ? -MARGIN - i * 30 : VIEW_W + MARGIN + i * 30;
      g.baseY = 40 + i * ((VIEW_H - 64) / (n - 1));
      g.y = g.baseY;
      g.vx = dir * 30 * this.world.difficulty.p.greenSpeed;
      g.vy = 0;
      g.phase = i * 0.9;
    }
  }

  updateGreens(dt, active) {
    const w = this.world;
    const d = w.difficulty.p;
    const p = w.player;

    if (active) {
      this.greenTimer -= dt;
      if (this.greenTimer <= 0) {
        this.greenTimer = this.rng.range(2.2, 4);
        if (this.greenCount() < d.greenMax) this.spawnGreen();
      }
      this.lungeRoll -= dt;
    }
    const rollLunge = active && this.lungeRoll <= 0;
    if (rollLunge) this.lungeRoll = 1;

    for (const g of this.greens.active) {
      g.anim += dt;
      g.bob += g.bobSpeed * dt;
      g.bobY = Math.sin(g.bob) * g.bobAmp;
      g.blink -= dt;
      if (g.blink < -0.12) g.blink = this.rng.range(1.5, 4.5);
      g.stateT += dt;
      g.shake = 0;

      switch (g.state) {
        case 'enter':
        case 'wander': {
          const dx = g.wx - g.x, dy = g.wy - g.y;
          const dd = Math.hypot(dx, dy) || 1;
          const sp = g.speed * (dd < 12 ? dd / 12 : 1);
          const k = damp(2.4, dt);
          g.vx += ((dx / dd) * sp - g.vx) * k;
          g.vy += ((dy / dd) * sp - g.vy) * k;
          g.wTimer -= dt;
          if (g.state === 'enter' && g.x > 12 && g.x < VIEW_W - 12 && g.y > 14 && g.y < VIEW_H - 12) g.state = 'wander';
          if (g.state === 'wander') {
            if (dd < 5 || g.wTimer <= 0) {
              if (this.rng.chance(0.3)) {
                g.state = 'hover';
                g.stateT = 0;
                g.hoverT = this.rng.range(0.5, 1.2);
              } else this.pickWaypoint(g);
            }
            if (active) {
              g.life -= dt;
              if (g.life <= 0) this.startLeave(g);
              else if (rollLunge && this.rng.chance(d.lungeChance / 7) && dist(g.x, g.y, p.x, p.y) < 130 && p.alive) {
                g.state = 'telegraph';
                g.stateT = 0;
                w.emit('lungeTelegraph', { x: g.x, y: g.y });
              }
            }
          }
          break;
        }
        case 'hover': {
          const k = damp(3, dt);
          g.vx -= g.vx * k;
          g.vy -= g.vy * k;
          if (g.stateT > g.hoverT) {
            g.state = 'wander';
            this.pickWaypoint(g);
          }
          if (active) {
            g.life -= dt;
            if (g.life <= 0) this.startLeave(g);
          }
          break;
        }
        case 'telegraph': {
          const k = damp(8, dt);
          g.vx -= g.vx * k;
          g.vy -= g.vy * k;
          g.shake = 1;
          if (g.stateT >= GREEN.telegraph) {
            const dx = p.x - g.x, dy = p.y - g.y;
            const dd = Math.hypot(dx, dy) || 1;
            const sp = GREEN.lungeSpeed * (0.85 + d.greenSpeed * 0.15);
            g.vx = (dx / dd) * sp;
            g.vy = (dy / dd) * sp;
            g.state = 'lunge';
            g.stateT = 0;
            w.emit('lunge', { x: g.x, y: g.y });
          }
          break;
        }
        case 'lunge': {
          if (g.stateT >= GREEN.lungeTime) {
            g.state = 'hover';
            g.stateT = 0;
            g.hoverT = 0.6;
          }
          break;
        }
        case 'leave': {
          const dx = g.wx - g.x, dy = g.wy - g.y;
          const dd = Math.hypot(dx, dy) || 1;
          const k = damp(2, dt);
          g.vx += ((dx / dd) * g.speed * 1.3 - g.vx) * k;
          g.vy += ((dy / dd) * g.speed * 1.3 - g.vy) * k;
          if (g.x < -20 || g.x > VIEW_W + 20 || g.y < -24 || g.y > VIEW_H + 24) g.dead = true;
          break;
        }
        case 'cross': {
          g.phase += dt * 2.2;
          g.y = g.baseY + Math.sin(g.phase) * 12;
          if ((g.vx > 0 && g.x > VIEW_W + 40) || (g.vx < 0 && g.x < -40)) g.dead = true;
          break;
        }
      }

      g.x += g.vx * dt;
      if (g.state !== 'cross') g.y += g.vy * dt;
      if (g.state === 'lunge' || g.state === 'hover' || g.state === 'telegraph') {
        g.x = clamp(g.x, 10, VIEW_W - 10);
        g.y = clamp(g.y, 14, VIEW_H - 10);
      }
    }
    this.greens.sweep();
  }

  startLeave(g) {
    g.state = 'leave';
    const p = this.world.player;
    // exit through the nearest edge that is not behind the player
    const opts = [
      [-40, g.y], [VIEW_W + 40, g.y], [g.x, -40], [g.x, VIEW_H + 40],
    ].sort((a, b) => dist(a[0], a[1], g.x, g.y) - dist(b[0], b[1], g.x, g.y));
    const pick = opts.find((o) => dist(o[0], o[1], p.x, p.y) > dist(g.x, g.y, p.x, p.y) - 10) || opts[0];
    g.wx = pick[0];
    g.wy = pick[1];
  }

  // --------------------------------------------------------------- chaser
  updateChaser(dt, active) {
    const c = this.chaser;
    const w = this.world;
    const d = w.difficulty.p;
    const p = w.player;
    c.anim += dt;

    // afterimage trail (visual only, sampled at 25 Hz)
    c.trailT -= dt;
    if (c.trailT <= 0) {
      c.trailT = 0.04;
      if (c.state === 'hunt' || c.state === 'leave' || c.state === 'stun') {
        c.trail.unshift(c.x, c.y);
        if (c.trail.length > 8) c.trail.length = 8;
      } else c.trail.length = 0;
    }

    switch (c.state) {
      case 'idle': {
        if (!active) return;
        c.timer -= dt;
        if (c.timer <= 0) this.beginChaserWarning();
        return;
      }
      case 'warn': {
        c.timer -= dt;
        if (c.timer <= 0) {
          if (!active) {
            c.state = 'idle';
            return;
          }
          c.state = 'hunt';
          c.huntT = d.huntDuration;
          c.x = c.wx;
          c.y = c.wy;
          c.heading = Math.atan2(p.y - c.y, p.x - c.x);
          c.speed = d.chaserSpeed * PLAYER.maxSpeed * 0.5;
          c.hunts++;
          w.emit('chaserEnter', { x: c.x, y: c.y });
        }
        return;
      }
      case 'hunt': {
        const [hx, hy] = this.delayedPlayer(d.chaserReaction);
        const tx = hx + p.vx * d.chaserLead, ty = hy + p.vy * d.chaserLead;
        const want = Math.atan2(ty - c.y, tx - c.x);
        c.heading = approachAngle(c.heading, want, d.chaserTurn * dt);
        const top = d.chaserSpeed * PLAYER.maxSpeed;
        c.speed = Math.min(top, c.speed + 150 * dt);
        c.vx = Math.cos(c.heading) * c.speed;
        c.vy = Math.sin(c.heading) * c.speed;
        if (active) {
          c.huntT -= dt;
          if (c.huntT <= 0 || !p.alive) this.chaserLeave();
        } else this.chaserLeave();
        break;
      }
      case 'stun': {
        c.stun -= dt;
        c.spin += dt * 14;
        const k = damp(3.5, dt);
        c.vx -= c.vx * k;
        c.vy -= c.vy * k;
        if (c.stun <= 0) {
          c.state = active && c.huntT > 0 ? 'hunt' : 'leave';
          c.speed = 30;
          c.heading = Math.atan2(p.y - c.y, p.x - c.x);
          if (c.state === 'leave') this.chaserLeave();
        }
        break;
      }
      case 'leave': {
        const want = Math.atan2(c.wy - c.y, c.wx - c.x);
        c.heading = approachAngle(c.heading, want, 5 * dt);
        c.speed = Math.min(PLAYER.maxSpeed * 1.05, c.speed + 120 * dt);
        c.vx = Math.cos(c.heading) * c.speed;
        c.vy = Math.sin(c.heading) * c.speed;
        if (c.x < -24 || c.x > VIEW_W + 24 || c.y < -24 || c.y > VIEW_H + 24) {
          c.state = 'idle';
          c.timer = d.chaserCooldown;
          c.trail.length = 0;
          w.emit('chaserGone', {});
        }
        break;
      }
    }
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (c.state === 'hunt' || c.state === 'stun') {
      // keep it in the arena once it has entered
      if (c.x > 8 && c.x < VIEW_W - 8 && c.y > 8 && c.y < VIEW_H - 8) c.inside = true;
      if (c.inside) {
        c.x = clamp(c.x, 6, VIEW_W - 6);
        c.y = clamp(c.y, 8, VIEW_H - 6);
      }
    }
  }

  beginChaserWarning() {
    const c = this.chaser;
    const p = this.world.player;
    let best = null, bestD = -1;
    const cands = [];
    for (let i = 0; i < 10; i++) {
      const edge = this.rng.pick(['left', 'right', 'top', 'bottom']);
      let x, y;
      if (edge === 'left') [x, y] = [-16, this.rng.range(30, VIEW_H - 20)];
      else if (edge === 'right') [x, y] = [VIEW_W + 16, this.rng.range(30, VIEW_H - 20)];
      else if (edge === 'top') [x, y] = [this.rng.range(20, VIEW_W - 20), -16];
      else [x, y] = [this.rng.range(20, VIEW_W - 20), VIEW_H + 16];
      const dd = dist(x, y, p.x, p.y);
      if (dd > bestD) {
        bestD = dd;
        best = [x, y];
      }
      if (dd > 130) cands.push([x, y]);
    }
    const pick = cands.length ? this.rng.pick(cands) : best;
    c.wx = pick[0];
    c.wy = pick[1];
    c.x = pick[0];
    c.y = pick[1];
    c.vx = c.vy = 0;
    c.inside = false;
    c.state = 'warn';
    c.timer = CHASER.warnTime;
    c.tut = false;
    if (this.world.tutorial && !this.world.seen.chaser) {
      this.world.seen.chaser = true;
      c.tut = true;
    }
    this.world.emit('chaserWarn', { x: clamp(pick[0], 4, VIEW_W - 4), y: clamp(pick[1], 4, VIEW_H - 4) });
  }

  chaserLeave() {
    const c = this.chaser;
    const p = this.world.player;
    c.state = 'leave';
    // head for the edge point farthest from the player among the 4 nearest exits
    const exits = [[-40, c.y], [VIEW_W + 40, c.y], [c.x, -40], [c.x, VIEW_H + 40]];
    exits.sort((a, b) => dist(a[0], a[1], c.x, c.y) - dist(b[0], b[1], c.x, c.y));
    const opts = exits.slice(0, 2).sort((a, b) => dist(b[0], b[1], p.x, p.y) - dist(a[0], a[1], p.x, p.y));
    c.wx = opts[0][0];
    c.wy = opts[0][1];
    c.speed = Math.max(c.speed, 40);
  }

  /** Fire meteors knock the hunter out for a moment — lure it in! */
  meteorHits(m) {
    const c = this.chaser;
    if (c.state !== 'hunt' && c.state !== 'leave') return;
    if (!circleHit(c.x, c.y, CHASER.headR + 1, m.x, m.y, m.r)) return;
    const len = Math.hypot(m.vx, m.vy) || 1;
    c.state = 'stun';
    c.stun = CHASER.stunTime;
    c.vx = (m.vx / len) * 130;
    c.vy = (m.vy / len) * 130;
    m.dead = true;
    this.world.emit('chaserStun', { x: c.x, y: c.y, mx: m.x, my: m.y, size: m.size });
  }

  // --------------------------------------------------------------- update
  update(dt) {
    this.updateGreens(dt, true);
    this.updateChaser(dt, true);
  }

  updateAmbient(dt) {
    this.updateGreens(dt, false);
    this.updateChaser(dt, false);
  }

  /** Returns 'alien' | 'chaser' | null for a rocket at (x, y, r). */
  hitsPlayer(x, y, r) {
    for (const g of this.greens.active) {
      const gy = g.y + g.bobY;
      if (circleHit(x, y, r, g.x, gy + GREEN.headDY, GREEN.headR)) return 'alien';
      if (circleHit(x, y, r, g.x, gy + GREEN.tentDY, GREEN.tentR)) return 'alien';
    }
    const c = this.chaser;
    if (c.state === 'hunt' || c.state === 'leave' || c.state === 'stun') {
      if (circleHit(x, y, r, c.x, c.y + CHASER.headDY, CHASER.headR)) return 'chaser';
      if (circleHit(x, y, r, c.x, c.y + CHASER.tentDY, CHASER.tentR)) return 'chaser';
    }
    return null;
  }
}

