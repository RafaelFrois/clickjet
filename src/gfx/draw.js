// Pixel UI primitives: stepped "blue board" plaques (the original HUD look),
// big bevelled panels, pixel circles and small helpers. All drawing snaps to
// the 320x180 grid.

import { C } from './palette.js';

/** Filled rectangle whose corners are cut by `steps` (insets from the edge). */
export function steppedRect(ctx, x, y, w, h, steps, color) {
  ctx.fillStyle = color;
  x = Math.round(x);
  y = Math.round(y);
  for (let r = 0; r < h; r++) {
    const k = Math.min(r, h - 1 - r);
    const inset = k < steps.length ? steps[k] : 0;
    ctx.fillRect(x + inset, y + r, w - inset * 2, 1);
  }
}

export const THEMES = {
  blue: { out: C.uiNavy, dark: C.uiDark, base: C.uiBlue, light: C.uiLight, shine: C.uiLighter },
  blueHover: { out: C.uiNavy, dark: C.uiDark, base: C.uiBlueHi, light: C.uiLighter, shine: '#c0c0ff' },
  navy: { out: C.uiLight, dark: C.uiNavy, base: C.uiDeep, light: C.uiDark, shine: C.uiLight },
  navyHover: { out: C.uiLighter, dark: C.uiDeep, base: C.uiDark, light: C.uiLight, shine: C.uiLighter },
  gold: { out: '#3a2400', dark: C.orangeDark, base: C.orange, light: C.yellow, shine: '#fffbd0' },
  rainbow: { out: '#2a0f4a', dark: '#5a1b9e', base: '#7d2bd0', light: '#c080ff', shine: '#ffffff' },
  red: { out: '#2a0000', dark: C.redDark, base: '#d01818', light: '#ff6a6a', shine: '#ffc0c0' },
};

/**
 * The pill-shaped pixel plaque of the original HUD / PLAY button: stepped
 * corners, light bevel on the top-left, dark bevel on the bottom-right.
 */
export function plaque(ctx, x, y, w, h, theme = THEMES.blue, opts = {}) {
  const steps = opts.steps || (h >= 20 ? [4, 2, 1, 1] : h >= 12 ? [3, 1, 1] : [2, 1]);
  x = Math.round(x);
  y = Math.round(y);
  if (opts.outline !== false) steppedRect(ctx, x - 1, y - 1, w + 2, h + 2, steps.map((s) => s), theme.out);
  steppedRect(ctx, x, y, w, h, steps, theme.dark);
  steppedRect(ctx, x, y, w - 1, h - 2, steps, theme.light);
  steppedRect(ctx, x + 1, y + 2, w - 3, h - 4, steps.map((s) => Math.max(0, s - 1)), theme.base);
  // glossy highlight dashes (top-left), like the original plaques
  ctx.fillStyle = theme.shine;
  const sx = x + (steps[0] || 0) + 2;
  ctx.fillRect(sx, y + 1, Math.min(10, Math.max(3, w * 0.18)) | 0, 1);
  ctx.fillRect(sx - 1, y + 2, 2, 1);
}

/** Large panel with a thick stepped bevel (the Game Over board). */
export function panel(ctx, x, y, w, h, opts = {}) {
  const steps = opts.steps || [7, 5, 3, 2, 1, 1, 1];
  const bevel = opts.bevel || 4;
  x = Math.round(x);
  y = Math.round(y);
  steppedRect(ctx, x - 1, y - 1, w + 2, h + 2, steps, opts.out || C.uiNavy);
  steppedRect(ctx, x, y, w, h, steps, opts.dark || C.uiDark);
  steppedRect(ctx, x, y, w - bevel, h - bevel, steps, opts.light || C.uiLight);
  steppedRect(ctx, x + bevel, y + bevel, w - bevel * 2, h - bevel * 2, steps.map((s) => Math.max(0, s - 2)), opts.base || C.uiBlue);
  // stair-step shading in the bottom-right corner (original's detail)
  ctx.fillStyle = opts.dark || C.uiDark;
  for (let i = 0; i < 6; i++) ctx.fillRect(x + w - bevel - 6 + i, y + h - bevel - 1 - i, 6 - i, 1);
}

export function pxCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  cx = Math.round(cx);
  cy = Math.round(cy);
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
    ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

/** 1px ring (midpoint-ish), optional dash pattern for animated auras. */
export function pxRing(ctx, cx, cy, r, color, dash = 0, phase = 0) {
  ctx.fillStyle = color;
  cx = Math.round(cx);
  cy = Math.round(cy);
  const n = Math.max(8, Math.round(r * 6.4));
  let lastX = null, lastY = null;
  for (let i = 0; i < n; i++) {
    if (dash && ((i + phase) % (dash * 2)) >= dash) continue;
    const a = (i / n) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
    if (x === lastX && y === lastY) continue;
    lastX = x;
    lastY = y;
    ctx.fillRect(x, y, 1, 1);
  }
}

/** Dithered darkening overlay (retro 50% checker) + solid alpha fallback. */
export function dimScreen(ctx, alpha = 0.55, w = 320, h = 180) {
  ctx.fillStyle = `rgba(0,0,12,${alpha})`;
  ctx.fillRect(0, 0, w, h);
}

/** Pixel bracket corners (focus indicator). */
export function brackets(ctx, x, y, w, h, color, gap = 2) {
  ctx.fillStyle = color;
  const L = 4;
  const x0 = x - gap, y0 = y - gap, x1 = x + w + gap - 1, y1 = y + h + gap - 1;
  ctx.fillRect(x0, y0, L, 1); ctx.fillRect(x0, y0, 1, L);
  ctx.fillRect(x1 - L + 1, y0, L, 1); ctx.fillRect(x1, y0, 1, L);
  ctx.fillRect(x0, y1, L, 1); ctx.fillRect(x0, y1 - L + 1, 1, L);
  ctx.fillRect(x1 - L + 1, y1, L, 1); ctx.fillRect(x1, y1 - L + 1, 1, L);
}

/** Pixel outline rounded box (original's bottom-right button frame). */
export function outlineBox(ctx, x, y, w, h, color, thick = 1) {
  ctx.fillStyle = color;
  x = Math.round(x);
  y = Math.round(y);
  for (let t = 0; t < thick; t++) {
    ctx.fillRect(x + 2, y + t, w - 4, 1);
    ctx.fillRect(x + 2, y + h - 1 - t, w - 4, 1);
    ctx.fillRect(x + t, y + 2, 1, h - 4);
    ctx.fillRect(x + w - 1 - t, y + 2, 1, h - 4);
  }
  ctx.fillRect(x + 1, y + 1, 1, 1);
  ctx.fillRect(x + w - 2, y + 1, 1, 1);
  ctx.fillRect(x + 1, y + h - 2, 1, 1);
  ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
}
