// Floating score popups ("+5", "x2!", "BONUS!") that rise, pop and blink out.

import { Pool } from '../util/pool.js';
import { drawText, FONT_S, FONT_M, FONT_B } from '../gfx/font.js';
import { RAINBOW } from '../gfx/palette.js';

const FONTS = { s: FONT_S, m: FONT_M, b: FONT_B };

export class FloatingText {
  constructor() {
    this.pool = new Pool(() => ({}), 24, 48);
    this.time = 0;
  }

  add(x, y, text, color = '#ffe81a', opts = {}) {
    const t = this.pool.obtain();
    if (!t) return;
    t.x = x;
    t.y = y;
    t.text = text;
    t.color = color; // string or 'rainbow'
    t.font = FONTS[opts.font || 's'];
    t.scale = opts.scale || 1;
    t.life = opts.life || 0.75;
    t.max = t.life;
    t.vy = opts.vy ?? -26;
    t.shadow = opts.shadow ?? '#000000';
  }

  update(dt) {
    this.time += dt;
    for (const t of this.pool.active) {
      t.life -= dt;
      if (t.life <= 0) t.dead = true;
      t.y += t.vy * dt;
      t.vy *= Math.max(0, 1 - 3 * dt);
    }
    this.pool.sweep();
  }

  draw(ctx) {
    for (const t of this.pool.active) {
      const f = t.life / t.max;
      if (f < 0.3 && ((t.life * 24) | 0) % 2) continue;
      const pop = f > 0.85 ? 1 + (f - 0.85) * 2 : 1; // tiny pop on spawn
      const scale = Math.max(1, Math.round(t.scale * pop));
      const color = t.color === 'rainbow'
        ? (i) => RAINBOW[(i + ((this.time * 12) | 0)) % RAINBOW.length]
        : t.color;
      const x = Math.max(4 + (t.text.length * 2 * scale), Math.min(316 - t.text.length * 2 * scale, t.x));
      drawText(ctx, t.font, t.text, x, Math.round(t.y), color, { scale, align: 'center', shadow: t.shadow });
    }
  }

  clear() {
    this.pool.clear();
  }
}
