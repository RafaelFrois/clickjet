// Pooled pixel particles. Each particle is a 1-3px square with optional
// color ramp over its life, drag and gravity. Two layers: under / over.

import { Pool } from '../util/pool.js';

export class Particles {
  constructor(max = 520) {
    this.pool = new Pool(() => ({}), 200, max);
  }

  /** Spawn one particle. `ramp` = array of colors hot->cold (optional). */
  add(x, y, vx, vy, life, color, size = 1, opts = {}) {
    const p = this.pool.obtain();
    if (!p) return null;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.max = life;
    p.color = color;
    p.ramp = opts.ramp || null;
    p.size = size;
    p.drag = opts.drag ?? 2;
    p.grav = opts.grav ?? 0;
    p.over = opts.over ?? true;
    p.shrink = opts.shrink ?? false;
    p.blink = opts.blink ?? false;
    return p;
  }

  burst(x, y, n, speed, life, colors, size = 1, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      const col = Array.isArray(colors) ? colors[(Math.random() * colors.length) | 0] : colors;
      this.add(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.4), col, size, opts);
    }
  }

  /** Expanding ring of particles (pickup / power-up). */
  ring(x, y, n, speed, life, colors, size = 1, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const col = Array.isArray(colors) ? colors[i % colors.length] : colors;
      this.add(x, y, Math.cos(a) * speed, Math.sin(a) * speed, life, col, size, { drag: 3, ...opts });
    }
  }

  update(dt) {
    for (const p of this.pool.active) {
      p.life -= dt;
      if (p.life <= 0) {
        p.dead = true;
        continue;
      }
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.pool.sweep();
  }

  draw(ctx, over) {
    for (const p of this.pool.active) {
      if (p.over !== over) continue;
      const f = p.life / p.max;
      if (p.blink && f < 0.35 && ((p.life * 30) | 0) % 2) continue;
      if (p.ramp) p.color = p.ramp[Math.min(p.ramp.length - 1, Math.floor((1 - f) * p.ramp.length))];
      const s = p.shrink ? Math.max(1, Math.round(p.size * (0.4 + f * 0.6))) : p.size;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
  }

  clear() {
    this.pool.clear();
  }

  get count() {
    return this.pool.size;
  }
}
