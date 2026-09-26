// FxDirector: turns simulation events into game feel — particles, popups,
// screen shake, flashes, hit-stop and sound effects. Also emits continuous
// particles (engine embers, meteor fire trails, rainbow sparkles).

import { C, RAINBOW, FIRE_RAMP, COMBO_COLORS } from '../gfx/palette.js';
import { Particles } from './Particles.js';
import { FloatingText } from './FloatingText.js';

const DEBRIS = [C.rBody, C.rLight, C.rDark, C.rGlass, '#ffffff'];

export class FxDirector {
  constructor(audio) {
    this.audio = audio;
    this.particles = new Particles();
    this.texts = new FloatingText();
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flash = 0;
    this.flashColor = '#ffffff';
    this.hitstop = 0;
    this.banners = [];
    this.emberT = 0;
    this.trailT = 0;
    this.hudPulse = { score: 0, bonus: 0, combo: 0, time: 0 };
    this.lastWarnSfx = 0;
    this.clock = 0;
  }

  reset() {
    this.particles.clear();
    this.texts.clear();
    this.shake = 0;
    this.flash = 0;
    this.hitstop = 0;
    this.banners.length = 0;
  }

  addShake(amount) {
    this.shake = Math.min(1, this.shake + amount);
  }

  banner(text, color, opts = {}) {
    // replace a banner with the same text instead of stacking duplicates
    this.banners = this.banners.filter((b) => b.text !== text);
    this.banners.push({ text, color, t: 0, life: opts.life || 1.9, y: opts.y ?? 44, scale: opts.scale || 2, sub: opts.sub || null });
    if (this.banners.length > 2) this.banners.shift();
  }

  handle(events, world) {
    const P = this.particles, T = this.texts, A = this.audio;
    for (const e of events) {
      switch (e.type) {
        case 'coin': {
          const rainbow = e.kind === 1;
          const col = COMBO_COLORS[Math.min(3, e.mult - 1)];
          if (rainbow) {
            P.ring(e.x, e.y, 12, 55, 0.4, RAINBOW, 1);
            P.burst(e.x, e.y, 8, 40, 0.5, RAINBOW, 1, { blink: true });
            T.add(e.x, e.y - 7, `+${e.amount}`, 'rainbow', { font: e.amount >= 20 ? 'm' : 's' });
          } else {
            P.burst(e.x, e.y, 6, 45, 0.35, [C.cLight, C.cMid, '#ffffff'], 1);
            T.add(e.x, e.y - 6, `+${e.amount}`, col, { font: e.amount >= 20 ? 'm' : 's' });
          }
          this.hudPulse.score = 1;
          A.sfx(rainbow ? 'rainbowCoin' : 'coin', { combo: e.combo, mult: e.mult });
          break;
        }
        case 'comboUp': {
          const col = COMBO_COLORS[Math.min(3, e.mult - 1)];
          T.add(world.player.x, world.player.y - 14, `x${e.mult}!`, col, { font: 'm', life: 0.9, vy: -18 });
          this.hudPulse.combo = 1;
          A.sfx('comboUp', { mult: e.mult });
          break;
        }
        case 'comboLost':
          A.sfx('comboLost');
          break;
        case 'chain':
          T.add(e.x, e.y - 14, `CHAIN +${e.amount}`, C.cyan, { font: 's', life: 1.1, vy: -16 });
          P.ring(e.x, e.y, 16, 70, 0.45, [C.cyan, '#ffffff'], 1);
          A.sfx('chain');
          break;
        case 'formation':
          A.sfx('formation');
          break;
        case 'coinExpire':
          P.burst(e.x, e.y, 3, 14, 0.3, e.kind ? RAINBOW : [C.cDark, C.greyDark], 1);
          break;
        case 'bonusStart': {
          P.ring(e.x, e.y, 24, 95, 0.5, RAINBOW, 2);
          P.burst(e.x, e.y, 26, 90, 0.8, RAINBOW, 1, { blink: true });
          this.flash = 0.35;
          this.flashColor = '#ffffff';
          this.addShake(0.25);
          T.add(world.player.x, world.player.y - 16, e.super ? 'SUPER BONUS!' : 'BONUS!', 'rainbow', { font: 'm', life: 1.1, vy: -14 });
          this.hudPulse.bonus = 1;
          A.sfx(e.super ? 'superBonus' : 'powerUp');
          break;
        }
        case 'bonusTick':
          T.add(e.x + (Math.random() * 10 - 5), e.y - 10, `+${e.amount}`, 'rainbow', { font: 's', life: 0.7 });
          this.hudPulse.bonus = 0.6;
          this.hudPulse.score = 1;
          A.sfx('bonusTick');
          break;
        case 'bonusWarn':
          A.sfx('bonusWarn');
          break;
        case 'bonusEnd':
          A.sfx('bonusEnd');
          break;
        case 'meteorWarn':
          if (this.clock - this.lastWarnSfx > 0.25) {
            this.lastWarnSfx = this.clock;
            A.sfx(e.kind === 'fire' ? 'warn' : 'rainbowWarn');
          }
          break;
        case 'meteorEnter':
          if (e.kind === 'fire' && e.size === 2) A.sfx('whoosh');
          break;
        case 'chaserWarn':
          A.sfx('hunterWarn');
          break;
        case 'chaserEnter':
          this.addShake(0.12);
          break;
        case 'chaserStun':
          P.burst(e.mx, e.my, 16, 80, 0.5, FIRE_RAMP, 2, { shrink: true });
          P.burst(e.x, e.y, 10, 60, 0.5, [C.pLight, C.pMid, '#ffffff'], 1);
          T.add(e.x, e.y - 16, 'BONK!', C.pLight, { font: 'm', life: 0.8 });
          this.addShake(0.3);
          A.sfx('stun');
          break;
        case 'lungeTelegraph':
          A.sfx('growl');
          break;
        case 'lunge':
          A.sfx('lunge');
          break;
        case 'event': {
          const colors = { coinRush: C.yellow, meteorShower: '#ff5a1a', invasion: C.gMid, superBonus: 'rainbow', luckyStreak: 'rainbow' };
          this.banner(e.label, colors[e.id] || '#ffffff');
          A.sfx(e.id === 'meteorShower' || e.id === 'invasion' ? 'alarm' : 'eventGood');
          break;
        }
        case 'newHighScore':
          this.banner('NEW HIGH SCORE!', 'rainbow', { y: 60 });
          this.hudPulse.score = 1;
          A.sfx('record');
          break;
        case 'death': {
          this.hitstop = 0.09;
          this.flash = 0.8;
          this.flashColor = '#ffffff';
          this.shake = 1;
          P.burst(e.x, e.y, 34, 120, 0.9, FIRE_RAMP, 2, { shrink: true, drag: 3 });
          P.burst(e.x, e.y, 22, 150, 0.7, [C.fWhite, C.fYellow], 1, { drag: 2.5 });
          // hull debris keeps some of the rocket's momentum
          for (let i = 0; i < 16; i++) {
            const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 90;
            P.add(e.x, e.y, Math.cos(a) * s + e.vx * 0.3, Math.sin(a) * s + e.vy * 0.3, 1 + Math.random() * 0.8,
              DEBRIS[i % DEBRIS.length], Math.random() < 0.4 ? 2 : 1, { drag: 1.2, blink: true });
          }
          P.ring(e.x, e.y, 20, 110, 0.35, ['#ffffff', C.fYellow], 1);
          A.sfx('explosion');
          break;
        }
      }
    }
  }

  /** Continuous effects driven by world state. */
  ambient(dt, world) {
    const P = this.particles;
    const p = world.player;
    this.emberT -= dt;
    if (p.alive && this.emberT <= 0) {
      this.emberT = p.thrust > 0.3 ? 0.018 : 0.06;
      const bx = p.x - Math.cos(p.angle) * 10, by = p.y - Math.sin(p.angle) * 10;
      const back = 30 + p.thrust * 60;
      const sp = (Math.random() - 0.5) * 18;
      P.add(bx, by, -Math.cos(p.angle) * back - Math.sin(p.angle) * sp, -Math.sin(p.angle) * back + Math.cos(p.angle) * sp,
        0.18 + Math.random() * 0.2, C.fYellow, 1, { ramp: FIRE_RAMP, over: false, drag: 4 });
      if (world.power.active && Math.random() < 0.6) {
        const a = Math.random() * Math.PI * 2;
        P.add(p.x + Math.cos(a) * 11, p.y + Math.sin(a) * 11, 0, -8, 0.5, RAINBOW[(Math.random() * 7) | 0], 1, { over: true, blink: true });
      }
    }
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.03;
      for (const m of world.spawner.meteors.active) {
        if (m.warn > 0) continue;
        const len = Math.hypot(m.vx, m.vy) || 1;
        const tx = m.x - (m.vx / len) * m.r, ty = m.y - (m.vy / len) * m.r;
        if (m.kind === 'fire') {
          P.add(tx + (Math.random() - 0.5) * m.r, ty + (Math.random() - 0.5) * m.r, -m.vx * 0.15, -m.vy * 0.15,
            0.25 + m.size * 0.08, C.mYellow, m.size === 2 ? 2 : 1, { ramp: [C.mLight, C.mYellow, C.mOrange, C.mRed, C.mDark], over: false, drag: 3 });
        } else {
          P.add(tx + (Math.random() - 0.5) * 6, ty + (Math.random() - 0.5) * 6, -m.vx * 0.1, -m.vy * 0.1, 0.5,
            RAINBOW[(Math.random() * 7) | 0], 1, { over: false, blink: true, drag: 2 });
        }
      }
      for (const c of world.spawner.coins.active) {
        if (c.kind === 1 && c.delay <= 0 && Math.random() < 0.12) {
          P.add(c.x + (Math.random() - 0.5) * 10, c.y + (Math.random() - 0.5) * 10, 0, -6, 0.4, '#ffffff', 1, { over: false, blink: true });
        }
      }
      const ch = world.enemies.chaser;
      if ((ch.state === 'hunt' || ch.state === 'leave') && Math.random() < 0.5) {
        P.add(ch.x + (Math.random() - 0.5) * 10, ch.y + 8, -ch.vx * 0.1, -ch.vy * 0.1 + 6, 0.4, C.pDark, 1, { over: false });
      }
    }
  }

  update(dt) {
    this.clock += dt;
    this.particles.update(dt);
    this.texts.update(dt);
    // trauma-style shake: offset ~ shake^2
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const mag = this.shake * this.shake * 5;
    this.shakeX = Math.round((Math.random() * 2 - 1) * mag);
    this.shakeY = Math.round((Math.random() * 2 - 1) * mag);
    this.flash = Math.max(0, this.flash - dt * 3.2);
    for (const k in this.hudPulse) this.hudPulse[k] = Math.max(0, this.hudPulse[k] - dt * 5);
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter((b) => b.t < b.life);
  }
}
