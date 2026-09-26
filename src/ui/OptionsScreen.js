// Small options panel: music / effects volume, mute, fullscreen, plus a
// compact "how to play" legend so every object's meaning is clear.

import { VIEW_W } from '../config.js';
import { C, RAINBOW } from '../gfx/palette.js';
import { drawText, FONT_M, FONT_S } from '../gfx/font.js';
import { panel, dimScreen } from '../gfx/draw.js';
import { Screen, Button, title } from './UIManager.js';
import { rotIndex } from '../gfx/pixel.js';

const SEGMENTS = 10;

export class OptionsScreen extends Screen {
  constructor(game) {
    super(game);
    this.modal = true;
    const g = game;
    const px = 50, pw = 220;
    this.px = px;
    this.pw = pw;
    const mkSlider = (id, y, get, set) => new Button({
      id, x: px + 70, y, w: SEGMENTS * 8 + 22, h: 11, pad: 3, silentHover: false,
      get, set,
      onDrag: (x) => {
        const b = this.buttons.find((bb) => bb.id === id);
        const rel = (x - (b.x + 11)) / (SEGMENTS * 8);
        const v = Math.round(Math.min(1, Math.max(0, rel)) * SEGMENTS) / SEGMENTS;
        if (Math.abs(v - get()) > 1e-6) {
          set(v);
          g.audio.sfx('slider', { v });
        }
      },
      render: (ctx, b, focused) => this.drawSlider(ctx, b, focused),
    });
    this.music = mkSlider('music', 42, () => g.audio.musicVolume, (v) => g.audio.setMusicVolume(v));
    this.sfx = mkSlider('sfx', 56, () => g.audio.sfxVolume, (v) => g.audio.setSfxVolume(v));
    this.muteBtn = new Button({
      id: 'mute', x: px + 14, y: 72, w: 92, h: 13, label: '', font: FONT_S, theme: 'navy',
      onClick: () => g.toggleMute(),
    });
    this.fullBtn = new Button({
      id: 'full', x: px + pw - 106, y: 72, w: 92, h: 13, label: 'FULLSCREEN', font: FONT_S, theme: 'navy',
      onClick: () => g.toggleFullscreen(),
    });
    this.close = new Button({
      id: 'close', x: VIEW_W / 2 - 30, y: 151, w: 60, h: 15, label: 'CLOSE', theme: 'blue', default: true,
      onClick: () => g.closeOptions(),
    });
    this.buttons = [this.music, this.sfx, this.muteBtn, this.fullBtn, this.close];
    if (!g.canFullscreen()) this.fullBtn.visible = false;
  }

  enter() {
    super.enter();
    this.inputDelay = 0.1;
  }

  onNav(nav) {
    const f = this.focusables();
    const b = f[this.focus];
    if ((nav === 'left' || nav === 'right') && b && b.get && this.game.ui.keyboardMode) {
      const v = Math.min(1, Math.max(0, b.get() + (nav === 'left' ? -1 : 1) / SEGMENTS));
      b.set(Math.round(v * SEGMENTS) / SEGMENTS);
      this.game.audio.sfx('slider', { v });
      return true;
    }
    if (nav === 'back') {
      this.game.closeOptions();
      return true;
    }
    return false;
  }

  update(dt) {
    super.update(dt);
    this.muteBtn.label = this.game.audio.muted ? 'SOUND: OFF' : 'SOUND: ON';
    this.fullBtn.label = this.game.isFullscreen() ? 'WINDOWED' : 'FULLSCREEN';
  }

  drawSlider(ctx, b, focused) {
    const v = b.get();
    const hot = b.hover || focused;
    drawText(ctx, FONT_M, b.id === 'music' ? 'MUSIC' : 'EFFECTS', this.px + 14, b.y + 2, hot ? C.yellow : '#ffffff');
    // minus / plus caps
    drawText(ctx, FONT_S, '-', b.x + 2, b.y + 3, C.uiLighter);
    drawText(ctx, FONT_S, '+', b.x + b.w - 5, b.y + 3, C.uiLighter);
    const filled = Math.round(v * SEGMENTS);
    for (let i = 0; i < SEGMENTS; i++) {
      const x = b.x + 11 + i * 8, h = 3 + Math.round((i / (SEGMENTS - 1)) * 6);
      const y = b.y + 10 - h;
      ctx.fillStyle = C.uiNavy;
      ctx.fillRect(x, y, 6, h + 1);
      ctx.fillStyle = i < filled ? (hot ? C.yellow : C.uiLighter) : C.uiDark;
      ctx.fillRect(x, y, 6, h);
    }
    drawText(ctx, FONT_S, `${Math.round(v * 100)}`, b.x + b.w + 6, b.y + 3, C.grey);
  }

  draw(ctx) {
    const g = this.game;
    dimScreen(ctx, 0.6);
    const pop = Math.min(1, this.t / 0.14);
    const y0 = Math.round(8 - (1 - pop) * 20);
    panel(ctx, this.px, y0, this.pw, 164);
    title(ctx, 'OPTIONS', VIEW_W / 2, y0 + 10, C.yellow, 2, C.uiDeep);

    // legend
    const ly = 90;
    ctx.fillStyle = C.uiDeep;
    ctx.fillRect(this.px + 10, ly, this.pw - 20, 1);
    drawText(ctx, FONT_S, 'HOW TO PLAY', VIEW_W / 2, ly + 3, C.orange, { align: 'center' });
    const s = g.sprites;
    const t = this.t;
    const col1 = this.px + 16, col2 = this.px + 116;
    const row = (i) => ly + 15 + i * 11;
    ctx.drawImage(s.coin[((t * 8) | 0) % 4], col1, row(0) - 1);
    drawText(ctx, FONT_S, 'COIN +5', col1 + 11, row(0), '#ffffff');
    ctx.drawImage(s.rainbowCoin[((t * 10) | 0) % s.rainbowCoin.length], col1 - 1, row(1) - 2);
    drawText(ctx, FONT_S, 'RAINBOW +10', col1 + 11, row(1), '#ffffff');
    const rm = s.meteors.rainbow[((t * 10) | 0) % 3];
    ctx.save();
    ctx.beginPath();
    ctx.rect(col1 - 6, row(2) - 5, 16, 11);
    ctx.clip();
    ctx.drawImage(rm.frames[rotIndex(0, rm.count)], col1 + 4 - rm.half, row(2) + 2 - rm.half);
    ctx.restore();
    drawText(ctx, FONT_S, 'BONUS +10/S', col1 + 11, row(2), (i) => RAINBOW[(i + ((t * 10) | 0)) % 7]);
    const pf = s.purple.idle[((t * 5) | 0) % 2];
    ctx.drawImage(pf, col2 + 1, row(0) - 4, 8, 10);
    drawText(ctx, FONT_S, 'HUNTER! RUN', col2 + 13, row(0), C.pLight);
    ctx.drawImage(s.green.idle[((t * 5) | 0) % 2], col2, row(1) - 4, 9, 10);
    const rk = s.rocks[0][0];
    ctx.drawImage(rk.frames[0], col2 + 8, row(1) - 4, 9, 9);
    drawText(ctx, FONT_S, 'DANGER', col2 + 21, row(1), C.red);
    const fm = s.meteors.fire[0][0];
    ctx.save();
    ctx.beginPath();
    ctx.rect(col2 - 4, row(2) - 5, 18, 12);
    ctx.clip();
    ctx.drawImage(fm.frames[rotIndex(0, fm.count)], col2 + 8 - fm.half, row(2) + 1 - fm.half);
    ctx.restore();
    drawText(ctx, FONT_S, 'DANGER', col2 + 21, row(2), C.red);
    drawText(ctx, FONT_S, 'CHAIN COINS FOR x2 x3 x4!', VIEW_W / 2, row(3) - 1, C.cyan, { align: 'center' });
  }
}
