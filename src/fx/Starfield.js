// Parallax starfield: far dim stars, mid white pixels, near 2x2 stars (the
// original's look), plus fast "space dust" streaks and rare far decor.
// Everything drifts left (the rocket flies through space) and shifts a bit
// opposite to the rocket's position for depth.

import { VIEW_W, VIEW_H } from '../config.js';
import { Rng } from '../util/rng.js';

const LAYERS = [
  { n: 70, speed: 0.22, size: 1, colors: ['#2c3150', '#3a4166', '#4a5178'], par: 0.02 },
  { n: 34, speed: 0.55, size: 1, colors: ['#9aa3c8', '#c8d0ff', '#ffffff'], par: 0.05 },
  { n: 13, speed: 1.0, size: 2, colors: ['#ffffff', '#e6ecff'], par: 0.1 },
];

export class Starfield {
  constructor(seed = 7) {
    const rng = (this.rng = new Rng(seed));
    this.layers = LAYERS.map((L) => ({
      ...L,
      stars: Array.from({ length: L.n }, () => ({
        x: rng.range(0, VIEW_W), y: rng.range(0, VIEW_H), c: rng.pick(L.colors),
        tw: rng.chance(0.25) ? rng.range(0, 6.28) : -1,
      })),
    }));
    this.dust = [];
    this.dustT = 0;
    this.decor = { x: rng.range(40, VIEW_W - 40), y: rng.range(40, VIEW_H - 50), kind: 0 };
    this.time = 0;
    this.px = 0;
    this.py = 0;
  }

  /** drift: px/s at "near" depth; (fx, fy) focus point for parallax. */
  update(dt, drift, fx = VIEW_W / 2, fy = VIEW_H / 2, dirX = -1, dirY = 0) {
    this.time += dt;
    this.px += ((fx - VIEW_W / 2) - this.px) * Math.min(1, dt * 3);
    this.py += ((fy - VIEW_H / 2) - this.py) * Math.min(1, dt * 3);
    for (const L of this.layers) {
      const vx = dirX * drift * L.speed, vy = dirY * drift * L.speed;
      for (const s of L.stars) {
        s.x += vx * dt;
        s.y += vy * dt;
        if (s.x < -4) { s.x += VIEW_W + 8; s.y = this.rng.range(0, VIEW_H); }
        else if (s.x > VIEW_W + 4) { s.x -= VIEW_W + 8; s.y = this.rng.range(0, VIEW_H); }
        if (s.y < -4) s.y += VIEW_H + 8;
        else if (s.y > VIEW_H + 4) s.y -= VIEW_H + 8;
      }
    }
    // far decor planet drifts very slowly and loops
    this.decor.x += dirX * drift * 0.1 * dt;
    if (this.decor.x < -40) {
      this.decor.x = VIEW_W + 40;
      this.decor.y = this.rng.range(30, VIEW_H - 50);
      this.decor.kind = (this.decor.kind + 1) % 2;
    }
    // dust streaks (closest layer)
    this.dustT -= dt;
    if (this.dustT <= 0) {
      this.dustT = this.rng.range(0.15, 0.5) * (18 / Math.max(10, drift));
      if (this.dust.length < 8)
        this.dust.push({ x: dirX < 0 ? VIEW_W + 4 : -4, y: this.rng.range(0, VIEW_H), len: this.rng.int(2, 5), sp: this.rng.range(2.6, 4) });
    }
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const d = this.dust[i];
      d.x += dirX * drift * d.sp * dt;
      if (d.x < -10 || d.x > VIEW_W + 10) this.dust.splice(i, 1);
    }
  }

  draw(ctx, sprites, shakeX = 0, shakeY = 0) {
    const planet = sprites.decor.planets[this.decor.kind];
    ctx.globalAlpha = 0.55;
    ctx.drawImage(planet, Math.round(this.decor.x - this.px * 0.01), Math.round(this.decor.y - this.py * 0.01));
    ctx.globalAlpha = 1;
    for (const L of this.layers) {
      const ox = -this.px * L.par + shakeX * L.par * 4, oy = -this.py * L.par + shakeY * L.par * 4;
      for (const s of L.stars) {
        if (s.tw >= 0 && Math.sin(this.time * 3 + s.tw) < -0.6) continue;
        let x = Math.round(s.x + ox), y = Math.round(s.y + oy);
        if (x < -2) x += VIEW_W + 4; else if (x > VIEW_W + 2) x -= VIEW_W + 4;
        if (y < -2) y += VIEW_H + 4; else if (y > VIEW_H + 2) y -= VIEW_H + 4;
        ctx.fillStyle = s.c;
        ctx.fillRect(x, y, L.size, L.size);
      }
    }
    ctx.fillStyle = '#5a628a';
    for (const d of this.dust) ctx.fillRect(Math.round(d.x), Math.round(d.y), d.len, 1);
  }
}
