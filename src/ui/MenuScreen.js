// Main menu — same composition as the original: speaker icon top-left,
// CLICKJET logo, blue PLAY button, HIGH SCORE board, Domus Arcis signature
// bottom-left and the outlined button bottom-right (now: options).

import { VIEW_W } from '../config.js';
import { C, RAINBOW } from '../gfx/palette.js';
import { drawText, textWidth, FONT_B, FONT_M, FONT_S, FONT_LOGO } from '../gfx/font.js';
import { plaque, outlineBox, THEMES } from '../gfx/draw.js';
import { Screen, Button } from './UIManager.js';
import { rotIndex } from '../gfx/pixel.js';

export function drawLogo(ctx, cx, y, t, scale = 3) {
  const text = 'CLICKJET';
  const w = textWidth(FONT_LOGO, text, scale);
  const x0 = Math.round(cx - w / 2);
  const h = FONT_LOGO.h * scale;
  const shine = ((t * 0.55) % 1.6) * (w + 60) - 30; // sweeping highlight
  // navy drop shadow for depth
  drawText(ctx, FONT_LOGO, text, x0 + 1, y + 2, C.uiDark, { scale });
  let gx = 0;
  const glyphX = [];
  for (const ch of text) {
    glyphX.push(gx);
    gx += (FONT_LOGO.glyphs[ch].w + 1) * scale;
  }
  drawText(ctx, FONT_LOGO, text, x0, y, (i, row) => {
    const py = row * scale;
    const nearShine = Math.abs(glyphX[i] - shine) < 10;
    if (nearShine) return '#ffffff';
    return py < h * 0.5 ? '#ffffff' : py < h * 0.8 ? '#c9cbe0' : '#8c8fb0';
  }, { scale });
}

export function drawDomus(ctx, sprites, x, y) {
  if (sprites.domusImage) {
    const img = sprites.domusImage;
    const s = Math.min(34 / img.width, 34 / img.height);
    ctx.drawImage(img, x, y, Math.round(img.width * s), Math.round(img.height * s));
    return;
  }
  ctx.globalAlpha = 0.9;
  ctx.drawImage(sprites.domus, x + 9, y);
  drawText(ctx, FONT_S, 'DOMUS', x + 17, y + 19, '#c9cbe0', { align: 'center' });
  drawText(ctx, FONT_S, 'ARCIS', x + 17, y + 26, '#c9cbe0', { align: 'center' });
  ctx.globalAlpha = 1;
}

export class MenuScreen extends Screen {
  constructor(game) {
    super(game);
    const g = game;
    this.fly = null;
    this.flyT = 1.5;

    this.play = new Button({
      id: 'play', x: 117, y: 54, w: 86, h: 28, default: true,
      onClick: () => g.startGame(),
      render: (ctx, b, focused) => this.drawPlay(ctx, b, focused),
    });
    this.mute = new Button({
      id: 'mute', x: 4, y: 4, w: 20, h: 16, pad: 6,
      onClick: () => g.toggleMute(),
      render: (ctx, b) => {
        const icon = g.audio.muted ? g.sprites.speakerOff : g.sprites.speakerOn;
        ctx.globalAlpha = b.hover ? 1 : 0.9;
        ctx.drawImage(icon, b.x + 3 + (b.pressed ? 1 : 0), b.y + 3);
        ctx.globalAlpha = 1;
      },
    });
    this.options = new Button({
      id: 'options', x: 284, y: 152, w: 30, h: 22, pad: 5,
      onClick: () => g.openOptions(),
      render: (ctx, b) => {
        if (b.hover) {
          ctx.fillStyle = C.uiDeep;
          ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        }
        outlineBox(ctx, b.x, b.y + (b.pressed ? 1 : 0), b.w, b.h, '#ffffff', 2);
        const gear = g.sprites.gear;
        ctx.drawImage(gear, b.x + ((b.w - gear.width) >> 1), b.y + ((b.h - gear.height) >> 1) + (b.pressed ? 1 : 0));
      },
    });
    this.buttons = [this.play, this.options, this.mute];
  }

  enter() {
    super.enter();
    this.inputDelay = 0.15;
    this.game.audio.playMenuMusic();
  }

  onNav(nav) {
    if (nav === 'back') return true;
    return false;
  }

  update(dt) {
    super.update(dt);
    // a rocket occasionally zips across the background
    this.flyT -= dt;
    if (!this.fly && this.flyT <= 0) {
      const ltr = Math.random() < 0.5;
      const y = 30 + Math.random() * 120;
      this.fly = { x: ltr ? -20 : VIEW_W + 20, y, vx: ltr ? 120 : -120, vy: (Math.random() - 0.5) * 30, t: 0 };
    }
    if (this.fly) {
      const f = this.fly;
      f.t += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt + Math.sin(f.t * 3) * 0.3;
      const fx = this.game.fx;
      const a = Math.atan2(f.vy, f.vx);
      fx.particles.add(f.x - Math.cos(a) * 10, f.y - Math.sin(a) * 10, -f.vx * 0.3, -f.vy * 0.3 + (Math.random() - 0.5) * 10,
        0.3, C.fYellow, 1, { ramp: [C.fWhite, C.fYellow, C.fOrange, C.fRed, C.fDark], over: false });
      if (f.x < -40 || f.x > VIEW_W + 40) {
        this.fly = null;
        this.flyT = 5 + Math.random() * 6;
      }
    }
  }

  draw(ctx) {
    const g = this.game;
    const t = this.t;
    if (this.fly) {
      const f = this.fly;
      const set = g.sprites.rocket.flames[2 + (((t * 18) | 0) % 2)];
      ctx.drawImage(set.frames[rotIndex(Math.atan2(f.vy, f.vx), set.count)], Math.round(f.x - set.half), Math.round(f.y - set.half));
    }
    g.fx.particles.draw(ctx, false);

    // logo with gentle float
    drawLogo(ctx, VIEW_W / 2, 20 + Math.round(Math.sin(t * 1.6) * 1.2), t);

    // HIGH SCORE board
    const hs = g.save.get('highScore');
    const bx = 125, by = 96, bw = 70, bh = 48;
    plaque(ctx, bx, by, bw, bh, THEMES.blue, { steps: [4, 2, 1, 1] });
    drawText(ctx, FONT_B, 'HIGH', VIEW_W / 2 + 1, by + 6, C.uiDeep, { scale: 2, align: 'center' });
    drawText(ctx, FONT_B, 'HIGH', VIEW_W / 2, by + 5, C.yellow, { scale: 2, align: 'center' });
    drawText(ctx, FONT_B, 'SCORE', VIEW_W / 2 + 1, by + 18, C.uiDeep, { scale: 2, align: 'center' });
    drawText(ctx, FONT_B, 'SCORE', VIEW_W / 2, by + 17, C.yellow, { scale: 2, align: 'center' });
    ctx.fillStyle = C.uiDeep;
    ctx.fillRect(bx + 5, by + 29, bw - 10, 2);
    drawText(ctx, FONT_M, String(hs), VIEW_W / 2, by + 35, '#ffffff', { align: 'center', shadow: C.uiDeep });

    const bt = g.save.get('bestTime');
    if (bt > 0) drawText(ctx, FONT_S, `BEST TIME ${bt.toFixed(1)}S`, VIEW_W / 2, by + bh + 5, C.grey, { align: 'center' });

    // Domus Arcis signature
    drawDomus(ctx, g.sprites, 5, 140);

    // controls hint
    const hint = g.input.isTouch ? 'DRAG ANYWHERE TO FLY' : 'MOUSE OR ARROW KEYS TO FLY';
    if (((t * 1.2) | 0) % 5 !== 4) drawText(ctx, FONT_S, hint, VIEW_W / 2, 171, C.greyDark, { align: 'center' });
  }

  drawPlay(ctx, b, focused) {
    const t = this.t;
    const hot = b.hover || focused;
    const down = b.pressed && b.hover ? 1 : 0;
    const bob = hot ? 0 : Math.round(Math.sin(t * 3) * 0.6);
    const y = b.y + down + bob;
    plaque(ctx, b.x, y, b.w, b.h, hot ? THEMES.blueHover : THEMES.blue, { steps: [5, 3, 2, 1, 1] });
    // black PLAY lettering, like the original
    drawText(ctx, FONT_B, 'PLAY', b.x + b.w / 2 + 1, y + 7, C.uiDark, { scale: 3, align: 'center' });
    drawText(ctx, FONT_B, 'PLAY', b.x + b.w / 2, y + 6, '#000000', { scale: 3, align: 'center' });
    // sparkle pixels
    const sp = ((t * 2) | 0) % 3;
    ctx.fillStyle = '#ffffff';
    if (sp === 0) ctx.fillRect(b.x + 20, y + 4, 1, 1);
    if (sp === 1) ctx.fillRect(b.x + b.w - 14, y + b.h - 6, 1, 1);
    // arrows when hovered
    if (hot) {
      const o = ((t * 6) | 0) % 2;
      drawText(ctx, FONT_M, '>', b.x - 9 + o, y + 10, C.yellow);
      drawText(ctx, FONT_M, '<', b.x + b.w + 5 - o, y + 10, C.yellow);
    }
    if (((t * 3) | 0) % 7 === 0) {
      ctx.fillStyle = RAINBOW[((t * 10) | 0) % RAINBOW.length];
      ctx.fillRect(b.x + 8, y + 3, 1, 1);
    }
  }
}
