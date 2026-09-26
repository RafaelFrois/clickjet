// In-game UI: HUD (blue plaques like the original), pause menu and the
// Game Over board.

import { VIEW_W, VIEW_H } from '../config.js';
import { C, RAINBOW, COMBO_COLORS } from '../gfx/palette.js';
import { drawText, FONT_M, FONT_S } from '../gfx/font.js';
import { plaque, panel, dimScreen, THEMES } from '../gfx/draw.js';
import { Screen, Button, title } from './UIManager.js';

const rainbowFn = (t, speed = 12) => (i) => RAINBOW[(i + ((t * speed) | 0)) % RAINBOW.length];
const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// ------------------------------------------------------------------- HUD
export class PlayScreen extends Screen {
  constructor(game) {
    super(game);
    this.pauseBtn = new Button({
      id: 'pause', x: VIEW_W - 17, y: 3, w: 13, h: 13, pad: 7,
      onClick: () => game.pause(),
      render: (ctx, b) => {
        const alpha = this.hudAlpha;
        ctx.globalAlpha = alpha;
        plaque(ctx, b.x, b.y + (b.pressed ? 1 : 0), b.w, b.h, b.hover ? THEMES.blueHover : THEMES.blue, { steps: [2, 1] });
        ctx.drawImage(game.sprites.pause, b.x + 4, b.y + 4 + (b.pressed ? 1 : 0));
        ctx.globalAlpha = 1;
      },
    });
    this.buttons = [this.pauseBtn];
    this.hudAlpha = 1;
    this.bonusSlide = 0;
    this.lastMult = 1;
  }

  focusables() {
    return []; // arrows fly the rocket during play, not the UI
  }

  onNav(nav) {
    if (nav === 'pause' || nav === 'back') {
      this.game.pause();
      return true;
    }
    return true;
  }

  update(dt) {
    super.update(dt);
    const w = this.game.world;
    if (!w) return;
    const p = w.player;
    const under = p.alive && p.y < 34 && (p.x < 232 || p.x > VIEW_W - 60);
    this.hudAlpha += ((under ? 0.35 : 1) - this.hudAlpha) * Math.min(1, dt * 10);
    const target = w.power.active ? 1 : 0;
    this.bonusSlide += (target - this.bonusSlide) * Math.min(1, dt * 12);
  }

  draw(ctx) {
    const g = this.game, w = g.world;
    if (!w) return;
    const fx = g.fx, t = this.t, s = w.score;
    ctx.globalAlpha = this.hudAlpha;

    // score plaque
    const pulse = fx.hudPulse.score;
    const sy = 4 - (pulse > 0.6 ? 1 : 0);
    plaque(ctx, 4, sy, 68, 15, s.beatBest ? THEMES.gold : THEMES.blue);
    drawText(ctx, FONT_M, String(s.score), 10, sy + 4, pulse > 0.3 ? C.yellow : '#ffffff', { shadow: s.beatBest ? C.orangeDark : C.uiDeep });
    ctx.drawImage(g.sprites.coin[((t * 6) | 0) % 4], 60, sy + 4);

    // combo meter
    if (s.combo >= 2) {
      const mult = s.mult;
      const col = COMBO_COLORS[Math.min(3, mult - 1)];
      const pop = fx.hudPulse.combo > 0.4 ? 1 : 0;
      drawText(ctx, FONT_M, `x${mult}`, 6, 22 - pop, col, { shadow: '#000000' });
      const max = mult >= 4;
      for (let i = 0; i < 5; i++) {
        const lit = max || i < s.combo % 5;
        ctx.fillStyle = lit ? col : C.uiDark;
        ctx.fillRect(22 + i * 5, 23, 4, 3);
      }
      const bw = Math.round(44 * s.comboFrac);
      ctx.fillStyle = C.uiDeep;
      ctx.fillRect(22, 27, 44, 1);
      ctx.fillStyle = s.comboFrac < 0.3 && ((t * 12) | 0) % 2 ? C.red : col;
      ctx.fillRect(22, 27, bw, 1);
    }

    // time plaque
    plaque(ctx, 76, 4, 56, 15, THEMES.blue);
    drawText(ctx, FONT_M, w.t.toFixed(1), 82, 8, '#ffffff', { shadow: C.uiDeep });
    ctx.drawImage(g.sprites.clock, 120, 8);
    ctx.drawImage(g.sprites.clockInk, 120, 8);

    // bonus plaque (power-up)
    if (this.bonusSlide > 0.02) {
      const pw = w.power;
      const by = Math.round(4 - (1 - this.bonusSlide) * 24);
      const blink = pw.active && pw.timeLeft < 1.6 && ((t * 10) | 0) % 2;
      if (!blink) {
        const pulseB = fx.hudPulse.bonus > 0.5 ? 1 : 0;
        const bx = 136, bw = 88, yy = by - pulseB;
        plaque(ctx, bx, yy, bw, 15, THEMES.rainbow);
        drawText(ctx, FONT_S, 'BONUS', bx + 5, yy + 6, rainbowFn(t));
        drawText(ctx, FONT_M, `+${pw.rate || 10}`, bx + 28, yy + 4, C.yellow, { shadow: '#2a0f4a' });
        drawText(ctx, FONT_S, '/S', bx + 46, yy + 6, C.yellow);
        drawText(ctx, FONT_M, Math.max(0, pw.timeLeft).toFixed(1), bx + bw - 5, yy + 4, '#ffffff', { align: 'right', shadow: '#2a0f4a' });
        const barW = Math.round((bw - 2) * pw.frac);
        for (let i = 0; i < barW; i++) {
          ctx.fillStyle = RAINBOW[(i + ((t * 20) | 0)) % RAINBOW.length];
          ctx.fillRect(bx + 1 + i, by + 17, 1, 2);
        }
      }
    }

    // high score
    if (s.beatBest) {
      if (((t * 4) | 0) % 4 !== 3) drawText(ctx, FONT_S, 'NEW HI!', VIEW_W - 22, 7, rainbowFn(t), { align: 'right', shadow: '#000' });
    } else if (s.best > 0) {
      drawText(ctx, FONT_S, `HI ${s.best}`, VIEW_W - 22, 7, C.yellow, { align: 'right', shadow: '#000' });
    }
    ctx.globalAlpha = 1;

    // first-run hint
    if (w.tutorial && w.t < 5 && ((t * 2) | 0) % 3 !== 2) {
      const msg = g.input.isTouch ? 'DRAG TO FLY - GRAB COINS - DODGE THE REST' : 'FLY WITH MOUSE OR ARROWS - GRAB COINS - DODGE!';
      drawText(ctx, FONT_S, msg, VIEW_W / 2, VIEW_H - 12, '#ffffff', { align: 'center', shadow: '#000' });
    }

    this.drawBanners(ctx);

    if (g.state === 'RESUMING') {
      const n = Math.ceil(g.resumeT / 0.3);
      if (n > 0) title(ctx, String(n), VIEW_W / 2, 70, C.yellow, 5, C.uiDeep);
    }
  }

  drawBanners(ctx) {
    const fx = this.game.fx;
    for (const b of fx.banners) {
      const inT = Math.min(1, b.t / 0.14);
      const out = b.life - b.t < 0.35;
      if (out && ((b.t * 20) | 0) % 2) continue;
      const x = VIEW_W / 2 + Math.round((1 - inT) * -120);
      const col = b.color === 'rainbow' ? rainbowFn(b.t, 14) : b.color;
      title(ctx, b.text, x, b.y, col, b.scale, '#000000', { wave: (i) => Math.sin(b.t * 10 + i * 0.7) * (inT < 1 ? 2 : 0.6) });
    }
  }
}

// ----------------------------------------------------------------- PAUSE
export class PauseScreen extends Screen {
  constructor(game) {
    super(game);
    this.modal = true;
    const x = VIEW_W / 2 - 55;
    this.cont = new Button({ id: 'continue', x, y: 76, w: 110, h: 18, label: 'CONTINUE', theme: 'blue', default: true, onClick: () => game.resume() });
    this.menu = new Button({ id: 'menu', x, y: 99, w: 110, h: 16, label: 'MENU', onClick: () => game.toMenu() });
    this.mute = new Button({ id: 'mute', x, y: 120, w: 110, h: 16, label: 'SOUND: ON', onClick: () => game.toggleMute() });
    this.buttons = [this.cont, this.menu, this.mute];
  }

  enter() {
    super.enter();
    this.inputDelay = 0.12;
  }

  onNav(nav) {
    if (nav === 'pause' || nav === 'back') {
      this.game.resume();
      return true;
    }
    return false;
  }

  update(dt) {
    super.update(dt);
    this.mute.label = this.game.audio.muted ? 'SOUND: OFF' : 'SOUND: ON';
  }

  draw(ctx) {
    const w = this.game.world;
    dimScreen(ctx, 0.6);
    const pop = Math.min(1, this.t / 0.12);
    const py = Math.round(34 - (1 - pop) * 10);
    panel(ctx, VIEW_W / 2 - 72, py, 144, 116);
    title(ctx, 'PAUSED', VIEW_W / 2, py + 9, C.yellow, 3, C.uiDeep);
    if (w) drawText(ctx, FONT_S, `SCORE ${w.score.score}   TIME ${w.t.toFixed(1)}`, VIEW_W / 2, py + 30, C.uiLighter, { align: 'center' });
  }
}

// ------------------------------------------------------------- GAME OVER
export class GameOverScreen extends Screen {
  constructor(game) {
    super(game);
    this.modal = true;
    this.px = 68;
    this.pw = 184;
    this.ph = 146;
    this.menuBtn = new Button({ id: 'menu', x: 0, y: 0, w: 56, h: 17, label: 'MENU', onClick: () => game.toMenu() });
    this.restartBtn = new Button({
      id: 'restart', x: 0, y: 0, w: 92, h: 17, label: 'RESTART', theme: 'blue', default: true,
      icon: game.sprites.restartWhite, onClick: () => game.restart(),
    });
    this.buttons = [this.menuBtn, this.restartBtn];
  }

  /** result: { score, time, best, newHighScore, newBestTime } */
  setResult(r) {
    this.r = r;
  }

  enter() {
    super.enter();
    this.inputDelay = 0.55;
    this.tallied = 0;
    this.confetti = false;
    this.game.audio.sfx('gameOver');
    this.game.ui.resetFocus(this);
  }

  onNav(nav) {
    if (nav === 'restart') {
      if (this.acceptsInput) this.game.restart();
      return true;
    }
    if (nav === 'back') {
      if (this.acceptsInput) this.game.toMenu();
      return true;
    }
    return false;
  }

  get panelY() {
    const k = Math.min(1, this.t / 0.42);
    return Math.round(-170 + (14 + 170) * easeOutBack(k));
  }

  update(dt) {
    super.update(dt);
    const r = this.r;
    const y = this.panelY;
    this.menuBtn.x = this.px + 14;
    this.menuBtn.y = y + this.ph - 26;
    this.restartBtn.x = this.px + this.pw - 14 - 92;
    this.restartBtn.y = y + this.ph - 26;
    const on = this.t > 0.45;
    this.menuBtn.enabled = this.restartBtn.enabled = on;
    // score tally
    if (this.t > 0.45 && this.tallied < r.score) {
      const step = Math.max(1, Math.ceil(r.score / 30));
      this.tallied = Math.min(r.score, this.tallied + step);
      this.game.audio.sfx('tally');
    }
    if (r.newHighScore && !this.confetti && this.t > 0.5) {
      this.confetti = true;
      const fx = this.game.fx;
      for (let i = 0; i < 70; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const sp = 60 + Math.random() * 110;
        fx.particles.add(VIEW_W / 2 + (Math.random() - 0.5) * 60, y + 104, Math.cos(a) * sp, Math.sin(a) * sp,
          1.4 + Math.random(), RAINBOW[i % RAINBOW.length], Math.random() < 0.3 ? 2 : 1, { grav: 90, drag: 1.2, blink: true });
      }
      fx.flash = 0.4;
      this.game.audio.sfx('record');
    }
  }

  draw(ctx) {
    const r = this.r, t = this.t;
    dimScreen(ctx, 0.45);
    const x = this.px, y = this.panelY, w = this.pw;
    panel(ctx, x, y, w, this.ph);

    // GAME / OVER — big red blocky letters (original layout)
    const wave = (i) => (t < 0.9 ? Math.sin(t * 18 - i * 0.8) * Math.max(0, 1 - t) * 3 : 0);
    title(ctx, 'GAME', x + w / 2, y + 9, C.red, 4, C.redDark, { sdx: 2, sdy: 1, wave });
    title(ctx, 'OVER', x + w / 2, y + 33, C.red, 4, C.redDark, { sdx: 2, sdy: 1, wave: (i) => wave(i + 4) });

    // orange divider + columns
    ctx.fillStyle = C.orange;
    ctx.fillRect(x + 14, y + 58, w - 28, 2);
    ctx.fillRect(x + w / 2 - 1, y + 63, 2, 34);
    const lc = x + w / 4 + 2, rc = x + (w * 3) / 4 - 2;
    title(ctx, 'SCORE', lc, y + 65, C.orange, 2, C.orangeDark);
    drawText(ctx, FONT_M, String(this.tallied), lc, y + 81, '#ffffff', { scale: 2, align: 'center', shadow: C.uiDeep });
    ctx.drawImage(this.game.sprites.clock, rc - 7, y + 64, 14, 14);
    ctx.drawImage(this.game.sprites.clockInk, rc - 7, y + 64, 14, 14);
    drawText(ctx, FONT_M, r.time.toFixed(1), rc, y + 81, '#ffffff', { scale: 2, align: 'center', shadow: C.uiDeep });
    if (r.newBestTime && t > 0.6 && ((t * 3) | 0) % 3 !== 2) drawText(ctx, FONT_S, 'BEST!', rc + 30, y + 67, C.yellow, { align: 'center', shadow: '#000' });

    // record line
    const ry = y + 102;
    if (r.newHighScore) {
      if (t > 0.5) {
        const col = rainbowFn(t, 14);
        title(ctx, 'NEW HIGH SCORE!', x + w / 2, ry, col, 1, '#000000', { wave: (i) => Math.sin(t * 8 + i * 0.6) });
        if (((t * 5) | 0) % 2) {
          ctx.drawImage(this.game.sprites.star, x + 14, ry);
          ctx.drawImage(this.game.sprites.star, x + w - 19, ry);
        }
      }
    } else {
      drawText(ctx, FONT_S, 'HIGH SCORE', x + w / 2 - 4, ry + 1, C.uiLighter, { align: 'right' });
      drawText(ctx, FONT_M, String(r.best), x + w / 2 + 2, ry, C.yellow, { shadow: C.uiDeep });
    }
  }
}
