// WorldRenderer: draws the simulation state (coins, rocks, meteors with edge
// warnings, aliens, hunter, rocket) in the right order. Pure drawing — no
// gameplay decisions happen here.

import { VIEW_W, VIEW_H } from '../config.js';
import { C, RAINBOW } from '../gfx/palette.js';
import { rotIndex } from '../gfx/pixel.js';
import { drawText, FONT_S, FONT_M } from '../gfx/font.js';
import { pxRing } from '../gfx/draw.js';
import { clamp } from '../util/math.js';

export class WorldRenderer {
  constructor(sprites) {
    this.s = sprites;
    this.time = 0;
  }

  draw(ctx, world, fx, time) {
    this.time = time;
    const s = this.s;

    this.drawCoins(ctx, world);
    fx.particles.draw(ctx, false); // under-layer: trails, engine embers

    for (const r of world.spawner.rocks.active) {
      const set = s.rocks[r.size][r.variant];
      const f = set.frames[rotIndex(r.rot, set.count)];
      ctx.drawImage(f, Math.round(r.x - set.half), Math.round(r.y - set.half));
    }

    for (const m of world.spawner.meteors.active) {
      if (m.warn > 0) continue;
      let set;
      if (m.kind === 'fire') set = s.meteors.fire[m.size][((time * 12) | 0) % 2];
      else if (m.kind === 'super') set = s.meteors.superRainbow[((time * 10) | 0) % 3];
      else set = s.meteors.rainbow[((time * 10) | 0) % 3];
      const f = set.frames[rotIndex(m.angle, set.count)];
      if (m.kind !== 'fire') {
        const r = m.r + 3 + Math.round(Math.sin(time * 10));
        pxRing(ctx, m.x, m.y, r, RAINBOW[((time * 14) | 0) % RAINBOW.length], 2, (time * 20) | 0);
      }
      ctx.drawImage(f, Math.round(m.x - set.half), Math.round(m.y - set.half));
      if (m.tut) this.tag(ctx, m.x, m.y + m.r + 8, 'BONUS!', 'rainbow');
    }

    this.drawGreens(ctx, world);
    this.drawChaser(ctx, world);
    this.drawPlayer(ctx, world);
  }

  drawCoins(ctx, world) {
    const s = this.s;
    for (const c of world.spawner.coins.active) {
      if (c.delay > 0) continue;
      if (c.life < 2 && ((c.life * 10) | 0) % 2 === 0) continue;
      const bob = Math.round(Math.sin(c.age * 3 + c.phase));
      if (c.age < 0.12) {
        // pop-in sparkle
        ctx.fillStyle = c.kind ? '#ffffff' : C.cLight;
        ctx.fillRect(Math.round(c.x) - 2, Math.round(c.y), 5, 1);
        ctx.fillRect(Math.round(c.x), Math.round(c.y) - 2, 1, 5);
        continue;
      }
      if (c.kind === 1) {
        const f = s.rainbowCoin[(((this.time * 10) | 0) + (c.phase * 3) | 0) % s.rainbowCoin.length];
        ctx.drawImage(f, Math.round(c.x) - 4, Math.round(c.y) - 4 + bob);
        if (c.tut) this.tag(ctx, c.x, c.y + 9, '+10', 'rainbow');
      } else {
        const f = s.coin[(((this.time * 8) + c.phase * 1.3) | 0) % s.coin.length];
        ctx.drawImage(f, Math.round(c.x) - 3, Math.round(c.y) - 3 + bob);
      }
    }
  }

  drawGreens(ctx, world) {
    const s = this.s;
    for (const g of world.enemies.greens.active) {
      const tf = ((g.anim * 5) | 0) % 2;
      let set = s.green.idle;
      if (g.state === 'telegraph' || g.state === 'lunge') set = s.green.angry;
      else if (g.blink < 0) set = s.green.blink;
      let x = Math.round(g.x - 10), y = Math.round(g.y + g.bobY - 11);
      if (g.shake) x += ((this.time * 40) | 0) % 2 ? 1 : -1;
      ctx.drawImage(set[tf], x, y);
      if (g.state === 'telegraph' && ((this.time * 16) | 0) % 2) {
        drawText(ctx, FONT_M, '!', g.x, y - 9, C.red, { align: 'center', shadow: '#000' });
      }
    }
  }

  drawChaser(ctx, world) {
    const c = world.enemies.chaser;
    const s = this.s;
    if (c.state === 'idle' || c.state === 'warn') return;
    const tf = ((c.anim * (c.state === 'hunt' ? 8 : 5)) | 0) % 2;
    // afterimages
    for (let i = 2; i < c.trail.length; i += 2) {
      const a = 0.45 - i * 0.05;
      if (a <= 0) break;
      ctx.globalAlpha = a;
      ctx.drawImage(s.purple.ghost[tf], Math.round(c.trail[i] - 8), Math.round(c.trail[i + 1] - 9));
    }
    ctx.globalAlpha = 1;
    const stunFlash = c.state === 'stun' && ((this.time * 16) | 0) % 2;
    ctx.drawImage(stunFlash ? s.purple.flash[tf] : s.purple.idle[tf], Math.round(c.x - 8), Math.round(c.y - 9));
    if (c.state === 'stun') {
      for (let i = 0; i < 3; i++) {
        const a = c.spin + (i * Math.PI * 2) / 3;
        ctx.fillStyle = i % 2 ? C.yellow : '#ffffff';
        ctx.fillRect(Math.round(c.x + Math.cos(a) * 8), Math.round(c.y - 11 + Math.sin(a) * 2), 1, 1);
      }
    }
    if (c.tut && c.state === 'hunt') this.tag(ctx, c.x, c.y + 13, 'HUNTER! RUN!', C.pLight);
  }

  drawPlayer(ctx, world) {
    const p = world.player;
    if (!p.alive) return;
    if (p.grace > 0 && ((p.grace * 14) | 0) % 2 === 0) return;
    const s = this.s;
    const moving = p.thrust > 0.28;
    const flick = ((this.time * 18) | 0) % 2;
    const set = s.rocket.flames[(moving ? 2 : 0) + flick];
    const f = set.frames[rotIndex(p.angle, set.count)];
    if (world.power.active) {
      const blink = world.power.timeLeft < 1.6 && ((this.time * 10) | 0) % 2;
      if (!blink) {
        const col = RAINBOW[((this.time * 14) | 0) % RAINBOW.length];
        pxRing(ctx, p.x, p.y, 12 + Math.round(Math.sin(this.time * 8)), col, 3, (this.time * 24) | 0);
        pxRing(ctx, p.x, p.y, 10, RAINBOW[((this.time * 14 + 3) | 0) % RAINBOW.length], 1, (this.time * 30) | 0);
      }
    }
    ctx.drawImage(f, Math.round(p.x - set.half), Math.round(p.y - set.half));
  }

  /** Edge markers for everything that is about to enter the screen. */
  drawWarnings(ctx, world) {
    const t = this.time;
    for (const m of world.spawner.meteors.active) {
      if (m.warn <= 0) continue;
      const frac = m.warn / m.warnMax;
      const rate = frac < 0.4 ? 20 : 11;
      if (((t * rate) | 0) % 2) continue;
      const color = m.kind === 'fire' ? (m.size === 2 ? '#ff5a1a' : C.red) : RAINBOW[((t * 14) | 0) % RAINBOW.length];
      this.marker(ctx, m.ex, m.ey, color, m.kind === 'fire' ? m.size : 2, m.kind !== 'fire' ? '+' : '!');
    }
    const c = world.enemies.chaser;
    if (c.state === 'warn' && ((t * 9) | 0) % 2 === 0) this.marker(ctx, c.wx, c.wy, C.pMid, 2, '!', true);
  }

  marker(ctx, ex, ey, color, size, glyph, hunter = false) {
    const x = clamp(Math.round(ex), 5, VIEW_W - 6);
    const y = clamp(Math.round(ey), 5, VIEW_H - 6);
    // triangle pointing into the screen
    let dx = 0, dy = 0;
    if (ex <= 1) dx = 1;
    else if (ex >= VIEW_W - 1) dx = -1;
    else if (ey <= 1) dy = 1;
    else dy = -1;
    const L = 3 + size;
    ctx.fillStyle = color;
    for (let i = 0; i < L; i++) {
      const w = L - i;
      if (dx) ctx.fillRect(x + (dx > 0 ? i : -i) - (dx > 0 ? 3 : -3), y - w + 1, 1, w * 2 - 1);
      else ctx.fillRect(x - w + 1, y + (dy > 0 ? i : -i) - (dy > 0 ? 3 : -3), w * 2 - 1, 1);
    }
    const gx = x + dx * (L + 3), gy = y + dy * (L + 4) - 3;
    if (hunter) {
      drawText(ctx, FONT_S, '!!', gx, gy, C.pLight, { align: 'center', shadow: '#000' });
    } else {
      drawText(ctx, FONT_S, glyph, gx, gy, color, { align: 'center', shadow: '#000' });
    }
  }

  tag(ctx, x, y, text, color) {
    if (((this.time * 4) | 0) % 4 === 3) return;
    const col = color === 'rainbow' ? (i) => RAINBOW[(i + ((this.time * 10) | 0)) % RAINBOW.length] : color;
    drawText(ctx, FONT_S, text, clamp(x, 20, VIEW_W - 20), Math.round(y), col, { align: 'center', shadow: '#000' });
  }
}
