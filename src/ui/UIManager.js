// UIManager: a stack of screens (top one is interactive), buttons that work
// with mouse, touch, keyboard and gamepad, focus navigation, and the pixel
// block transition used between states.

import { VIEW_W, VIEW_H } from '../config.js';
import { C } from '../gfx/palette.js';
import { plaque, brackets, THEMES } from '../gfx/draw.js';
import { drawText, FONT_B, FONT_M } from '../gfx/font.js';

export class Button {
  constructor(o) {
    Object.assign(this, {
      id: '', x: 0, y: 0, w: 40, h: 16, label: '', font: FONT_B, scale: 1, theme: 'navy',
      textColor: '#ffffff', icon: null, onClick: null, visible: true, enabled: true, pad: 3,
      render: null, hover: false, pressed: false, bob: 0,
    }, o);
  }

  contains(x, y, pad = this.pad) {
    return x >= this.x - pad && x < this.x + this.w + pad && y >= this.y - pad && y < this.y + this.h + pad;
  }

  draw(ctx, ui, focused) {
    if (!this.visible) return;
    if (this.render) {
      this.render(ctx, this, focused);
    } else {
      const down = this.pressed && this.hover ? 1 : 0;
      const hot = this.hover || focused;
      const theme = THEMES[hot ? `${this.theme}Hover` : this.theme] || THEMES[this.theme];
      plaque(ctx, this.x, this.y + down, this.w, this.h, theme);
      let tx = this.x + this.w / 2;
      const th = this.font.h * this.scale;
      const ty = this.y + down + Math.round((this.h - th) / 2);
      if (this.icon) {
        const iw = this.icon.width;
        const lw = this.label ? drawTextWidth(this.font, this.label, this.scale) : 0;
        const total = iw + (lw ? 4 + lw : 0);
        const ix = Math.round(this.x + (this.w - total) / 2);
        ctx.drawImage(this.icon, ix, Math.round(this.y + down + (this.h - this.icon.height) / 2));
        tx = ix + iw + 4 + lw / 2;
      }
      if (this.label) drawText(ctx, this.font, this.label, tx, ty, this.textColor, { scale: this.scale, align: 'center' });
    }
    if (focused && ui.keyboardMode && ((ui.time * 4) | 0) % 2 === 0) brackets(ctx, this.x, this.y, this.w, this.h, C.yellow, 3);
  }
}

function drawTextWidth(font, text, scale) {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    const g = font.glyphs[text[i]] || font.glyphs[text[i].toUpperCase()];
    if (g) w += g.w + (i < text.length - 1 ? font.spacing : 0);
  }
  return w * scale;
}

export class Screen {
  constructor(game) {
    this.game = game;
    this.buttons = [];
    this.focus = 0;
    this.t = 0;
    this.modal = false;
    this.inputDelay = 0;
  }
  enter() {
    this.t = 0;
  }
  exit() {}
  update(dt) {
    this.t += dt;
    if (this.inputDelay > 0) this.inputDelay -= dt;
  }
  draw() {}
  /** Return true when the nav event was consumed. */
  onNav() {
    return false;
  }
  onBack() {}
  get acceptsInput() {
    return this.inputDelay <= 0;
  }
  focusables() {
    return this.buttons.filter((b) => b.visible && b.enabled);
  }
}

export class UIManager {
  constructor(game) {
    this.game = game;
    this.stack = [];
    this.keyboardMode = false;
    this.time = 0;
    this.transition = null;
    this.captured = null; // button pressed by a pointer
  }

  get top() {
    return this.stack[this.stack.length - 1] || null;
  }

  set(screen) {
    for (const s of this.stack) s.exit();
    this.stack = [screen];
    screen.enter();
    this.resetFocus(screen);
  }

  push(screen) {
    this.stack.push(screen);
    screen.enter();
    this.resetFocus(screen);
  }

  pop() {
    const s = this.stack.pop();
    if (s) s.exit();
    return s;
  }

  resetFocus(screen) {
    const f = screen.focusables();
    const def = f.findIndex((b) => b.default);
    screen.focus = def >= 0 ? def : 0;
    this.captured = null;
  }

  hitTest(x, y) {
    const s = this.top;
    if (!s) return false;
    return s.buttons.some((b) => b.visible && b.enabled && b.contains(x, y));
  }

  /** Run `mid` halfway through a quick pixel wipe. */
  wipe(mid, dur = 0.16) {
    if (this.transition) {
      // collapse overlapping transitions: finish the previous one immediately
      const prev = this.transition;
      this.transition = null;
      if (!prev.fired) prev.mid();
    }
    this.transition = { t: 0, dur, mid, fired: false };
  }

  handle(events) {
    const s = this.top;
    for (const e of events) {
      if (e.type === 'nav') this.handleNav(e, s);
      else this.handlePointer(e, s);
    }
  }

  handlePointer(e, s) {
    if (!s) return;
    if (e.type === 'move' && !e.touch) {
      if (Math.abs(e.x - (this.lastMx ?? e.x)) + Math.abs(e.y - (this.lastMy ?? e.y)) > 1) this.keyboardMode = false;
      this.lastMx = e.x;
      this.lastMy = e.y;
    }
    if (this.transition) return;
    const btns = s.buttons.filter((b) => b.visible && b.enabled);
    if (e.type === 'move') {
      if (e.touch && !this.captured) return;
      for (const b of btns) {
        const was = b.hover;
        b.hover = b.contains(e.x, e.y, e.touch ? b.pad + 4 : 0);
        if (b.hover && !was && !e.touch && !b.silentHover) this.game.audio.sfx('hover');
      }
      return;
    }
    if (e.type === 'down') {
      for (const b of btns) b.hover = b.contains(e.x, e.y, e.touch ? b.pad + 4 : 0);
      const hit = btns.find((b) => b.contains(e.x, e.y, e.touch ? b.pad + 4 : b.pad));
      if (hit && s.acceptsInput) {
        hit.pressed = true;
        hit.hover = true;
        this.captured = hit;
        if (hit.onDrag) hit.onDrag(e.x, e.y, true);
      }
      return;
    }
    if (e.type === 'up' || e.type === 'cancel') {
      const b = this.captured;
      this.captured = null;
      if (!b) return;
      b.pressed = false;
      if (e.touch) b.hover = false;
      if (e.type === 'up' && b.contains(e.x, e.y, e.touch ? b.pad + 8 : b.pad) && s.acceptsInput && !b.onDrag) this.activate(b);
    }
  }

  dragMove(x, y) {
    const b = this.captured;
    if (b && b.onDrag) b.onDrag(x, y, false);
  }

  handleNav(e, s) {
    const g = this.game;
    // global shortcuts
    if (e.nav === 'mute') {
      g.toggleMute();
      return;
    }
    if (!s || this.transition) return;
    if (s.onNav(e.nav, e)) return;
    const f = s.focusables();
    if (!f.length) {
      if (e.nav === 'back') s.onBack();
      return;
    }
    if (['up', 'down', 'left', 'right', 'next'].includes(e.nav)) {
      if (!this.keyboardMode) {
        this.keyboardMode = true;
        return;
      }
      const step = e.nav === 'up' || e.nav === 'left' ? -1 : 1;
      s.focus = (s.focus + step + f.length) % f.length;
      g.audio.sfx('hover');
    } else if (e.nav === 'confirm') {
      if (!s.acceptsInput) return;
      const b = f[Math.min(s.focus, f.length - 1)];
      if (b) this.activate(b);
    } else if (e.nav === 'back') {
      s.onBack();
    }
  }

  activate(b) {
    if (b.onClick) b.onClick(b);
  }

  update(dt) {
    this.time += dt;
    for (const s of this.stack) s.update(dt);
    const tr = this.transition;
    if (tr) {
      tr.t += dt;
      if (!tr.fired && tr.t >= tr.dur) {
        tr.fired = true;
        tr.mid();
      }
      if (tr.t >= tr.dur * 2) this.transition = null;
    }
  }

  draw(ctx) {
    for (const s of this.stack) {
      s.draw(ctx);
      const f = s.focusables();
      for (let i = 0; i < s.buttons.length; i++) {
        const b = s.buttons[i];
        b.draw(ctx, this, s === this.top && f[s.focus] === b);
      }
      if (s.drawOver) s.drawOver(ctx);
    }
    this.drawTransition(ctx);
  }

  drawTransition(ctx) {
    const tr = this.transition;
    if (!tr) return;
    const B = 10;
    const cols = Math.ceil(VIEW_W / B), rows = Math.ceil(VIEW_H / B);
    const cover = tr.t < tr.dur;
    const p = cover ? tr.t / tr.dur : 1 - (tr.t - tr.dur) / tr.dur;
    const span = cols + rows;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const th = (i + j) / span;
        const local = (p * 1.35 - th) / 0.35; // 0..1 across the wipe edge
        if (local <= 0) continue;
        const size = Math.min(B, Math.ceil(local * B));
        ctx.fillStyle = local < 0.5 ? C.uiDark : '#000000';
        const o = (B - size) >> 1;
        ctx.fillRect(i * B + o, j * B + o, size, size);
      }
  }
}

/** Shared title helper: chunky block text with a hard pixel shadow. */
export function title(ctx, text, x, y, color, scale, shadow = '#000000', opts = {}) {
  drawText(ctx, FONT_B, text, x + (opts.sdx ?? 1), y + (opts.sdy ?? 1) * Math.max(1, scale >> 1), shadow, { scale, align: opts.align || 'center' });
  drawText(ctx, FONT_B, text, x, y, color, { scale, align: opts.align || 'center', wave: opts.wave });
}

export { FONT_M };
