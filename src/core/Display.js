// Display: a fixed 320x180 low-res canvas, scaled up with nearest-neighbour
// filtering (CSS `image-rendering: pixelated`). Integer scale factors are
// preferred when they cost little screen space, so every art pixel is the
// same size on screen. Letterbox bars are plain black (space).

import { VIEW_W, VIEW_H } from '../config.js';

export class Display {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.cssScale = 1;
    this.rect = { left: 0, top: 0, width: VIEW_W, height: VIEW_H };
    this.portrait = false;
    this.onResize = null;
    const resize = () => this.resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    this.resize();
  }

  resize() {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const devW = vw * dpr, devH = vh * dpr;
    let s = Math.min(devW / VIEW_W, devH / VIEW_H);
    const si = Math.floor(s);
    if (si >= 2 && si / s >= 0.86) s = si; // crisp integer scaling when cheap
    const cssW = (VIEW_W * s) / dpr, cssH = (VIEW_H * s) / dpr;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.cssScale = cssW / VIEW_W;
    this.portrait = vh > vw * 1.05;
    this.updateRect();
    if (this.onResize) this.onResize();
  }

  updateRect() {
    const r = this.canvas.getBoundingClientRect();
    this.rect = { left: r.left, top: r.top, width: r.width || 1, height: r.height || 1 };
  }

  /** Client (CSS px) -> logical game coordinates. */
  toLogical(clientX, clientY) {
    const r = this.rect;
    return [((clientX - r.left) / r.width) * VIEW_W, ((clientY - r.top) / r.height) * VIEW_H];
  }

  /** CSS pixels per logical pixel (used to scale touch drags). */
  get pxPerUnit() {
    return this.rect.width / VIEW_W;
  }
}
