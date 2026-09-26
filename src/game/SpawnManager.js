// SpawnManager: coins (singles, formations, risky placements), rocks and
// meteors (with edge warnings and volleys) plus the rainbow power-up meteor.
// Fairness rules live here: nothing hazardous appears near the rocket,
// meteors always telegraph their entry, and power-ups cross reachable space.

import { VIEW_W, VIEW_H, PLAY_AREA, COINS, METEOR, ROCK, SCORE } from '../config.js';
import { Pool } from '../util/pool.js';
import { clamp, dist, dist2, TAU } from '../util/math.js';

const EDGE_WEIGHTS = [
  { edge: 'top', weight: 0.38 },
  { edge: 'right', weight: 0.32 },
  { edge: 'left', weight: 0.15 },
  { edge: 'bottom', weight: 0.15 },
];

export class SpawnManager {
  constructor(world) {
    this.world = world;
    this.rng = world.rng;
    this.coins = new Pool(() => ({}), 40, 90);
    this.rocks = new Pool(() => ({}), 8, 12);
    this.meteors = new Pool(() => ({}), 16, 40);
    this.formations = new Map();
    this.nextFormationId = 1;
    this.coinTimer = 0;
    this.formationTimer = this.rng.pickRange(COINS.formationEvery) * 0.6;
    this.meteorTimer = 2.2;
    this.rockTimer = 3;
    this.rainbowAt = METEOR.rainbowFirst;
    this.pauseMeteors = 0;
    this.rockUid = 0;
  }

  // ------------------------------------------------------------------ setup
  initial() {
    const p = this.world.player;
    // two rocks already drifting, far from the rocket
    for (let i = 0; i < 2; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const x = this.rng.range(30, VIEW_W - 30), y = this.rng.range(34, VIEW_H - 20);
        if (dist(x, y, p.x, p.y) < 95) continue;
        if (this.rocks.active.some((r) => dist(r.x, r.y, x, y) < 50)) continue;
        this.addRock(x, y, this.rng.range(-6, 6), this.rng.range(-4, 4), this.pickRockSize(0));
        break;
      }
    }
    for (let i = 0; i < 5; i++) this.spawnSingleCoin(false);
  }

  // ------------------------------------------------------------------ coins
  addCoin(x, y, kind, life, formation = 0, delay = 0, risky = false) {
    const c = this.coins.obtain();
    if (!c) return null;
    c.x = x;
    c.y = y;
    c.kind = kind;
    c.life = life;
    c.maxLife = life;
    c.age = 0;
    c.delay = delay;
    c.formation = formation;
    c.phase = this.rng.range(0, TAU);
    c.risky = risky;
    c.anchor = null;
    c.tut = false;
    if (kind === 1 && this.world.tutorial && !this.world.seen.rainbowCoin) {
      this.world.seen.rainbowCoin = true;
      c.tut = true;
    }
    return c;
  }

  /** Make a coin ride along with a (drifting) rock, orbiting slowly. */
  anchorCoin(c, rock, orbitW = 0) {
    c.anchor = rock;
    c.anchorUid = rock.uid;
    c.orbitA = Math.atan2(c.y - rock.y, c.x - rock.x);
    c.orbitR = Math.hypot(c.x - rock.x, c.y - rock.y);
    c.orbitW = orbitW;
  }

  coinSpotOk(x, y, minPlayer, ignoreRocks = false) {
    const A = PLAY_AREA;
    if (x < A.x0 || x > A.x1 || y < A.y0 || y > A.y1) return false;
    const p = this.world.player;
    if (dist2(x, y, p.x, p.y) < minPlayer * minPlayer) return false;
    if (!ignoreRocks) for (const r of this.rocks.active) if (dist2(x, y, r.x, r.y) < (r.r + 6) ** 2) return false;
    for (const c of this.coins.active) if (dist2(x, y, c.x, c.y) < 64) return false;
    for (const g of this.world.enemies.greens.active) if (dist2(x, y, g.x, g.y) < 14 * 14) return false;
    return true;
  }

  randomCoinSpot(minPlayer = COINS.minDistFromPlayer) {
    const A = PLAY_AREA;
    for (let i = 0; i < 14; i++) {
      const x = this.rng.range(A.x0, A.x1), y = this.rng.range(A.y0, A.y1);
      if (this.coinSpotOk(x, y, minPlayer)) return [x, y];
    }
    return null;
  }

  /** A spot right next to a hazard — worth more thought. */
  riskySpot() {
    const rocks = this.rocks.active;
    const greens = this.world.enemies.greens.active.filter((g) => g.state === 'wander' || g.state === 'hover');
    const useRock = rocks.length && (!greens.length || this.rng.chance(0.65));
    for (let i = 0; i < 8; i++) {
      let x, y, r = null;
      if (useRock) {
        r = this.rng.pick(rocks);
        const a = this.rng.range(0, TAU), d = r.r + this.rng.range(6.5, 9);
        x = r.x + Math.cos(a) * d;
        y = r.y + Math.sin(a) * d;
      } else if (greens.length) {
        const g = this.rng.pick(greens);
        const a = this.rng.range(0, TAU), d = this.rng.range(16, 22);
        x = g.wx + Math.cos(a) * d;
        y = g.wy + Math.sin(a) * d;
      } else return null;
      if (this.coinSpotOk(x, y, 26, true)) return [x, y, useRock ? r : null];
    }
    return null;
  }

  spawnSingleCoin(allowRisky = true) {
    const rainbow = this.rng.chance(COINS.rainbowChance);
    let spot = null, risky = false;
    const riskyChance = rainbow ? COINS.rainbowRiskyChance : COINS.riskyChance;
    if (allowRisky && this.rng.chance(riskyChance)) {
      spot = this.riskySpot();
      risky = !!spot;
    }
    if (!spot) spot = this.randomCoinSpot();
    if (!spot) return null;
    const life = rainbow ? COINS.rainbowLife : this.rng.pickRange(COINS.life);
    const c = this.addCoin(spot[0], spot[1], rainbow ? 1 : 0, life, 0, 0, risky);
    if (c && spot[2]) this.anchorCoin(c, spot[2], this.rng.range(-0.5, 0.5));
    return c;
  }

  /** Build a coin formation. Returns number of coins placed. */
  spawnFormation(kind = null, opts = {}) {
    const shapes = ['line', 'arc', 'wave', 'ring', 'zigzag', 'rockRing'];
    const shape = kind || this.rng.pick(shapes);
    const pts = [];
    const p = this.world.player;
    const A = PLAY_AREA;
    let cx = 0, cy = 0, ringRock = null;

    const pickCenter = (rx, ry) => {
      for (let i = 0; i < 20; i++) {
        const x = this.rng.range(A.x0 + rx, A.x1 - rx), y = this.rng.range(A.y0 + ry, A.y1 - ry);
        if (dist(x, y, p.x, p.y) < Math.max(rx, ry) + 26) continue;
        return [x, y];
      }
      return null;
    };

    if (shape === 'rockRing') {
      const rocks = this.rocks.active.filter((r) => r.x > A.x0 + 24 && r.x < A.x1 - 24 && r.y > A.y0 + 24 && r.y < A.y1 - 24 && dist(r.x, r.y, p.x, p.y) > 50);
      if (!rocks.length) return this.spawnFormation('ring', opts);
      const r = this.rng.pick(rocks);
      ringRock = r;
      const n = 8, rad = r.r + 10;
      const a0 = this.rng.range(0, TAU);
      for (let i = 0; i < n; i++) pts.push([r.x + Math.cos(a0 + (i / n) * TAU) * rad, r.y + Math.sin(a0 + (i / n) * TAU) * rad]);
      cx = r.x;
      cy = r.y;
    } else if (shape === 'line') {
      const n = this.rng.int(5, 7), sp = 11;
      const ang = this.rng.pick([0, 0, Math.PI / 2, 0.45, -0.45]);
      const half = ((n - 1) * sp) / 2;
      const c = pickCenter(Math.abs(Math.cos(ang)) * half + 4, Math.abs(Math.sin(ang)) * half + 4);
      if (!c) return 0;
      [cx, cy] = c;
      for (let i = 0; i < n; i++) {
        const d = -half + i * sp;
        pts.push([cx + Math.cos(ang) * d, cy + Math.sin(ang) * d]);
      }
    } else if (shape === 'arc') {
      const n = 6, rad = this.rng.range(26, 34);
      const c = pickCenter(rad, rad * 0.6);
      if (!c) return 0;
      [cx, cy] = c;
      const up = this.rng.chance(0.5) ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.15 + (0.7 * i) / (n - 1));
        pts.push([cx - Math.cos(a) * rad, cy + up * (Math.sin(a) * rad * 0.6 - rad * 0.3)]);
      }
    } else if (shape === 'wave') {
      const n = 8, sp = 12, amp = 10;
      const c = pickCenter(((n - 1) * sp) / 2 + 4, amp + 4);
      if (!c) return 0;
      [cx, cy] = c;
      for (let i = 0; i < n; i++) pts.push([cx - ((n - 1) * sp) / 2 + i * sp, cy + Math.sin(i * 0.9) * amp]);
    } else if (shape === 'zigzag') {
      const n = 7, sp = 11;
      const c = pickCenter(((n - 1) * sp) / 2 + 4, 12);
      if (!c) return 0;
      [cx, cy] = c;
      for (let i = 0; i < n; i++) pts.push([cx - ((n - 1) * sp) / 2 + i * sp, cy + (i % 2 ? -7 : 7)]);
    } else if (shape === 'ring' || shape === 'rush') {
      const n = shape === 'rush' ? 14 : 8;
      const rad = shape === 'rush' ? 30 : this.rng.range(16, 20);
      const c = pickCenter(rad + 4, rad + 4);
      if (!c) return 0;
      [cx, cy] = c;
      for (let i = 0; i < n; i++) pts.push([cx + Math.cos((i / n) * TAU) * rad, cy + Math.sin((i / n) * TAU) * rad * (shape === 'rush' ? 0.8 : 1)]);
      if (shape === 'rush') {
        // inner ring
        for (let i = 0; i < 6; i++) pts.push([cx + Math.cos((i / 6) * TAU + 0.5) * 13, cy + Math.sin((i / 6) * TAU + 0.5) * 11]);
      }
    } else if (shape === 'lucky') {
      const n = 6, sp = 14;
      const c = pickCenter(((n - 1) * sp) / 2 + 6, 16);
      if (!c) return 0;
      [cx, cy] = c;
      for (let i = 0; i < n; i++) pts.push([cx - ((n - 1) * sp) / 2 + i * sp, cy + Math.sin(i * 1.1) * 12]);
    }

    const valid = pts.filter(([x, y]) => this.coinSpotOk(x, y, 16, shape === 'rockRing'));
    if (valid.length < 4) return 0;
    const id = this.nextFormationId++;
    const life = opts.life || (shape === 'rush' ? 7 : shape === 'lucky' ? 5.5 : COINS.formationLife);
    const rainbowLast = shape !== 'rush' && shape !== 'lucky' && this.rng.chance(0.35);
    let placed = 0;
    valid.forEach(([x, y], i) => {
      let kind = shape === 'lucky' ? 1 : 0;
      if (rainbowLast && i === valid.length - 1) kind = 1;
      if (shape === 'rush' && (i === 3 || i === 10)) kind = 1;
      const c = this.addCoin(x, y, kind, life, id, i * 0.05, shape === 'rockRing');
      if (!c) return;
      placed++;
      if (ringRock) this.anchorCoin(c, ringRock, 0.7);
    });
    if (!placed) return 0;
    this.formations.set(id, { total: placed, got: 0, left: placed, failed: false, shape });
    this.world.emit('formation', { x: cx, y: cy, shape, count: placed });
    return placed;
  }

  /** A short line of coins along an incoming meteor path (risk vs reward). */
  pathCoins(m) {
    const len = Math.hypot(m.vx, m.vy);
    const dx = m.vx / len, dy = m.vy / len;
    let placed = 0;
    for (let d = 46; d < 400 && placed < 4; d += 13) {
      const x = m.ex + dx * d, y = m.ey + dy * d;
      if (x < PLAY_AREA.x0 || x > PLAY_AREA.x1 || y < PLAY_AREA.y0 || y > PLAY_AREA.y1) {
        if (placed) break;
        continue;
      }
      if (!this.coinSpotOk(x, y, 30)) continue;
      this.addCoin(x, y, 0, 6.5, 0, placed * 0.05, true);
      placed++;
    }
  }

  updateCoins(dt, collect) {
    const p = this.world.player;
    const pr2 = 81; // pickup radius^2 (9px)
    for (const c of this.coins.active) {
      if (c.dead) continue;
      if (c.delay > 0) {
        c.delay -= dt;
        continue;
      }
      c.age += dt;
      c.life -= dt;
      if (c.anchor) {
        const a = c.anchor;
        if (a.dead || a.uid !== c.anchorUid) c.anchor = null;
        else {
          c.orbitA += c.orbitW * dt;
          c.x = a.x + Math.cos(c.orbitA) * c.orbitR;
          c.y = a.y + Math.sin(c.orbitA) * c.orbitR;
        }
      } else {
        // drifting rocks nudge loose coins aside instead of swallowing them
        for (const r of this.rocks.active) {
          const min = r.r + 5;
          const dx = c.x - r.x, dy = c.y - r.y;
          const d2r = dx * dx + dy * dy;
          if (d2r < min * min) {
            const d = Math.sqrt(d2r) || 1;
            c.x = r.x + (dx / d) * min;
            c.y = r.y + (dy / d) * min;
          }
        }
      }
      if (collect && p.alive) {
        const d2 = dist2(c.x, c.y, p.x, p.y);
        if (d2 < 16 * 16 && !c.anchor) {
          // gentle magnet so near-misses still count
          const d = Math.sqrt(d2) || 1;
          const pull = 110 * dt;
          c.x += ((p.x - c.x) / d) * Math.min(pull, d);
          c.y += ((p.y - c.y) / d) * Math.min(pull, d);
        }
        if (dist2(c.x, c.y, p.x, p.y) < pr2) {
          c.dead = true;
          this.world.score.collectCoin(c.kind, c.x, c.y);
          if (c.formation) this.formationProgress(c.formation, c.x, c.y);
          continue;
        }
      }
      if (c.life <= 0) {
        c.dead = true;
        if (c.formation) this.formationLost(c.formation);
        this.world.emit('coinExpire', { x: c.x, y: c.y, kind: c.kind });
      }
    }
    this.coins.sweep();
  }

  formationProgress(id, x, y) {
    const f = this.formations.get(id);
    if (!f) return;
    f.got++;
    f.left--;
    if (f.left <= 0) {
      this.formations.delete(id);
      if (!f.failed && f.got >= f.total) {
        this.world.score.add(SCORE.sequenceBonus);
        this.world.score.chains++;
        this.world.emit('chain', { x, y, amount: SCORE.sequenceBonus });
      }
    }
  }

  /** A formation coin expired: no chain bonus, forget it once all are gone. */
  formationLost(id) {
    const f = this.formations.get(id);
    if (!f) return;
    f.failed = true;
    f.left--;
    if (f.left <= 0) this.formations.delete(id);
  }

  // ------------------------------------------------------------------ rocks
  pickRockSize(level) {
    const sizes = ROCK.sizes.map((s, i) => ({ i, weight: s.weight * (i === 2 ? 0.6 + level : 1) }));
    return this.rng.weighted(sizes).i;
  }

  addRock(x, y, vx, vy, sizeIdx) {
    const r = this.rocks.obtain();
    if (!r) return null;
    const def = ROCK.sizes[sizeIdx];
    r.x = x;
    r.y = y;
    r.vx = vx;
    r.vy = vy;
    r.size = sizeIdx;
    r.px = def.px;
    r.r = def.r;
    r.variant = this.rng.int(0, 2);
    r.rot = this.rng.range(0, TAU);
    r.vrot = this.rng.range(-0.8, 0.8);
    r.uid = ++this.rockUid;
    return r;
  }

  spawnRockFromEdge() {
    const p = this.world.player;
    const d = this.world.difficulty.p;
    for (let tries = 0; tries < 8; tries++) {
      const sizeIdx = this.pickRockSize(d.level);
      const half = ROCK.sizes[sizeIdx].px / 2 + 2;
      const edge = this.rng.weighted([
        { e: 'right', weight: 0.45 }, { e: 'top', weight: 0.2 }, { e: 'bottom', weight: 0.2 }, { e: 'left', weight: 0.15 },
      ]).e;
      let x, y;
      if (edge === 'right') [x, y] = [VIEW_W + half, this.rng.range(30, VIEW_H - 16)];
      else if (edge === 'left') [x, y] = [-half, this.rng.range(30, VIEW_H - 16)];
      else if (edge === 'top') [x, y] = [this.rng.range(30, VIEW_W - 30), -half];
      else [x, y] = [this.rng.range(30, VIEW_W - 30), VIEW_H + half];
      if (dist(x, y, p.x, p.y) < ROCK.minSpawnDistFromPlayer) continue;
      if (this.rocks.active.some((r) => dist(r.x, r.y, x, y) < r.r + half + 18)) continue;
      // aim loosely through the arena
      const tx = this.rng.range(60, VIEW_W - 60), ty = this.rng.range(50, VIEW_H - 40);
      const sp = this.rng.pickRange(ROCK.speed) * (1 + d.level * 0.5);
      const len = Math.hypot(tx - x, ty - y);
      this.addRock(x, y, ((tx - x) / len) * sp, ((ty - y) / len) * sp, sizeIdx);
      return true;
    }
    return false;
  }

  updateRocks(dt) {
    const rocks = this.rocks.active;
    for (const r of rocks) {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.rot += r.vrot * dt;
      const m = r.px;
      if (r.x < -m - 4 || r.x > VIEW_W + m + 4 || r.y < -m - 4 || r.y > VIEW_H + m + 4) {
        // only despawn if it is moving away
        const out = (r.x < 0 && r.vx <= 0) || (r.x > VIEW_W && r.vx >= 0) || (r.y < 0 && r.vy <= 0) || (r.y > VIEW_H && r.vy >= 0);
        if (out) r.dead = true;
      }
    }
    // gentle elastic bounce between rocks so they never overlap
    for (let i = 0; i < rocks.length; i++)
      for (let j = i + 1; j < rocks.length; j++) {
        const a = rocks[i], b = rocks[j];
        const min = a.r + b.r + 1.5;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const push = (min - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          a.vx += rel * nx;
          a.vy += rel * ny;
          b.vx -= rel * nx;
          b.vy -= rel * ny;
          a.vrot = -a.vrot;
        }
      }
    this.rocks.sweep();
  }

  // ---------------------------------------------------------------- meteors
  edgePoint(edge, pad) {
    if (edge === 'top') return [this.rng.range(10, VIEW_W - 10), -pad];
    if (edge === 'bottom') return [this.rng.range(10, VIEW_W - 10), VIEW_H + pad];
    if (edge === 'left') return [-pad, this.rng.range(26, VIEW_H - 10)];
    return [VIEW_W + pad, this.rng.range(26, VIEW_H - 10)];
  }

  /**
   * Create a meteor with a warning phase. `kind`: 'fire' | 'rainbow' | 'super'.
   * Returns the meteor or null when no fair entry point was found.
   */
  spawnMeteor(kind = 'fire', opts = {}) {
    const p = this.world.player;
    const d = this.world.difficulty.p;
    let sizeIdx = 1, r, speed;
    if (kind === 'fire') {
      sizeIdx = opts.size ?? this.rng.weighted(METEOR.sizes.map((s, i) => ({ i, weight: s.weight }))).i;
      const def = METEOR.sizes[sizeIdx];
      r = def.r;
      speed = this.rng.pickRange(def.speed) * d.meteorSpeed * (opts.speedMul || 1);
    } else {
      r = kind === 'super' ? METEOR.rainbowRadius + 2.5 : METEOR.rainbowRadius;
      speed = this.rng.pickRange(METEOR.rainbowSpeed) * (kind === 'super' ? 0.85 : 1);
    }

    const attempts = opts.entry ? 1 : 10;
    for (let tries = 0; tries < attempts; tries++) {
      const edge = opts.edge || this.rng.weighted(EDGE_WEIGHTS).edge;
      const [ex, ey] = opts.entry || this.edgePoint(edge, 0);
      // entry marker must not be right next to the rocket
      if (dist(ex, ey, p.x, p.y) < METEOR.minEntryDistFromPlayer) continue;
      let ax, ay;
      if (opts.dir) {
        ax = ex + opts.dir[0] * 100;
        ay = ey + opts.dir[1] * 100;
      } else if (kind !== 'fire') {
        ax = this.rng.range(90, VIEW_W - 90);
        ay = this.rng.range(55, VIEW_H - 40);
      } else if (this.rng.chance(d.aimChance)) {
        ax = p.x + this.rng.range(-16, 16);
        ay = p.y + this.rng.range(-16, 16);
      } else {
        ax = this.rng.range(40, VIEW_W - 40);
        ay = this.rng.range(34, VIEW_H - 24);
      }
      let dx = ax - ex, dy = ay - ey;
      const len = Math.hypot(dx, dy);
      if (len < 20) continue;
      dx /= len;
      dy /= len;
      const m = this.meteors.obtain();
      if (!m) return null;
      m.kind = kind;
      m.size = sizeIdx;
      m.r = r;
      m.vx = dx * speed;
      m.vy = dy * speed;
      m.angle = Math.atan2(dy, dx);
      m.ex = ex;
      m.ey = ey;
      m.x = ex - dx * (r + 14);
      m.y = ey - dy * (r + 14);
      m.warn = opts.warn ?? (kind === 'fire' ? d.warnTime : 1.15);
      m.warnMax = m.warn;
      m.age = 0;
      m.entered = false;
      m.tut = false;
      if (kind !== 'fire' && this.world.tutorial && !this.world.seen.rainbowMeteor) {
        this.world.seen.rainbowMeteor = true;
        m.tut = true;
      }
      this.world.emit('meteorWarn', { x: ex, y: ey, kind, size: sizeIdx });
      return m;
    }
    return null;
  }

  spawnMeteorWave() {
    const d = this.world.difficulty.p;
    const first = this.spawnMeteor('fire');
    if (!first) return;
    if (this.world.t > 6 && this.rng.chance(COINS.pathCoinsChance * (0.6 + d.level))) this.pathCoins(first);
    if (this.rng.chance(d.volleyChance)) {
      const extra = this.rng.chance(0.35 + d.level * 0.3) ? 2 : 1;
      const len = Math.hypot(first.vx, first.vy);
      const nx = -first.vy / len, ny = first.vx / len;
      for (let i = 1; i <= extra; i++) {
        const side = i % 2 ? 1 : -1;
        const off = METEOR.volleySpacing * Math.ceil(i / 2) * side;
        const ex = first.ex + nx * off, ey = first.ey + ny * off;
        if (ex < -4 || ex > VIEW_W + 4 || ey < -4 || ey > VIEW_H + 4) continue;
        this.spawnMeteor('fire', {
          entry: [ex, ey], dir: [first.vx / len, first.vy / len], size: Math.min(first.size, 1),
          warn: first.warn + 0.12 * i, speedMul: 1,
        });
      }
    }
  }

  updateMeteors(dt, checkEnemies = true) {
    const W = VIEW_W, H = VIEW_H;
    for (const m of this.meteors.active) {
      if (m.warn > 0) {
        m.warn -= dt;
        if (m.warn <= 0) this.world.emit('meteorEnter', { x: m.ex, y: m.ey, kind: m.kind, size: m.size });
        continue;
      }
      m.age += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (!m.entered && m.x > -m.r && m.x < W + m.r && m.y > -m.r && m.y < H + m.r) m.entered = true;
      const pad = 48;
      if (m.age > 0.5 && (m.x < -pad || m.x > W + pad || m.y < -pad || m.y > H + pad)) m.dead = true;
      if (checkEnemies && m.kind === 'fire') this.world.enemies.meteorHits(m);
    }
    this.meteors.sweep();
  }

  // ------------------------------------------------------------------ tick
  update(dt) {
    const w = this.world;
    const d = w.difficulty.p;

    // coins
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      this.coinTimer = COINS.spawnEvery;
      const singles = this.coins.active.filter((c) => !c.formation).length;
      if (singles < COINS.targetCount) this.spawnSingleCoin(true);
    }
    this.formationTimer -= dt;
    if (this.formationTimer <= 0) {
      this.formationTimer = this.rng.pickRange(COINS.formationEvery);
      this.spawnFormation();
    }
    this.updateCoins(dt, true);

    // rocks
    this.rockTimer -= dt;
    if (this.rockTimer <= 0) {
      this.rockTimer = this.rng.range(2.5, 5);
      if (this.rocks.size < d.rockMax) this.spawnRockFromEdge();
    }
    this.updateRocks(dt);

    // meteors
    if (this.pauseMeteors > 0) this.pauseMeteors -= dt;
    else {
      this.meteorTimer -= dt;
      if (this.meteorTimer <= 0) {
        this.meteorTimer = d.meteorInterval * this.rng.range(0.75, 1.25);
        const live = this.meteors.active.filter((m) => m.kind === 'fire').length;
        if (live < 3 + Math.round(d.level * 6)) this.spawnMeteorWave();
      }
    }
    if (w.t >= this.rainbowAt) {
      const hasRainbow = this.meteors.active.some((m) => m.kind !== 'fire');
      if (w.power.active || hasRainbow) this.rainbowAt = w.t + 3;
      else {
        this.spawnMeteor('rainbow');
        this.rainbowAt = w.t + this.rng.pickRange(METEOR.rainbowEvery);
      }
    }
    this.updateMeteors(dt, true);
  }

  /** After death: things keep drifting behind the Game Over panel. */
  updateAmbient(dt) {
    this.updateCoins(dt, false);
    this.updateRocks(dt);
    for (const m of this.meteors.active) if (m.warn > 0) m.dead = true;
    this.meteors.sweep();
    this.updateMeteors(dt, false);
  }

  clampToArena(x, y) {
    return [clamp(x, PLAY_AREA.x0, PLAY_AREA.x1), clamp(y, PLAY_AREA.y0, PLAY_AREA.y1)];
  }
}
