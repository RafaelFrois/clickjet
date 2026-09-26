// Pixel-art toolkit: sprites are authored as rows of characters mapped to a
// palette, converted to packed RGBA buffers, and turned into canvases.
// Rotations use a RotSprite-style pipeline (Scale2x upsampling + nearest
// sampling) so rotated sprites keep clean, chunky pixels.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** '#rrggbb' -> packed ABGR (little-endian ImageData layout). */
export function hexToPacked(hex, alpha = 255) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return ((alpha << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export class Img {
  constructor(w, h, data) {
    this.w = w;
    this.h = h;
    this.data = data || new Uint32Array(w * h);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x];
  }
  set(x, y, v) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = v;
  }
  clone() {
    return new Img(this.w, this.h, this.data.slice());
  }
}

/**
 * Build an Img from text rows. `pal` maps a character to '#rrggbb';
 * '.' and ' ' are transparent. Throws on ragged rows / unknown chars so
 * authoring mistakes surface immediately.
 */
export function imgFromRows(rows, pal, name = 'sprite') {
  const h = rows.length;
  const w = rows[0].length;
  const img = new Img(w, h);
  const cache = {};
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    if (row.length !== w) throw new Error(`${name}: row ${y} has length ${row.length}, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      let v = cache[ch];
      if (v === undefined) {
        if (!(ch in pal)) throw new Error(`${name}: unknown palette key '${ch}'`);
        v = cache[ch] = hexToPacked(pal[ch]);
      }
      img.data[y * w + x] = v;
    }
  }
  return img;
}

export function imgToCanvas(img) {
  const c = makeCanvas(img.w, img.h);
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(img.w, img.h);
  new Uint32Array(id.data.buffer).set(img.data);
  ctx.putImageData(id, 0, 0);
  return c;
}

/** Replace colors: map of '#from' -> '#to'. */
export function recolor(img, map) {
  const packed = new Map();
  for (const k in map) packed.set(hexToPacked(k), hexToPacked(map[k]));
  const out = img.clone();
  const d = out.data;
  for (let i = 0; i < d.length; i++) {
    const v = packed.get(d[i]);
    if (v !== undefined) d[i] = v;
  }
  return out;
}

export function flipX(img) {
  const out = new Img(img.w, img.h);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) out.data[y * img.w + (img.w - 1 - x)] = img.data[y * img.w + x];
  return out;
}

/** Paste `src` onto `dst` at (ox, oy), skipping transparent pixels. */
export function blit(dst, src, ox, oy) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const v = src.data[y * src.w + x];
      if (v) dst.set(x + ox, y + oy, v);
    }
  return dst;
}

/** Add a 1px outline of `color` around opaque pixels (4-neighbourhood). */
export function outline(img, hex) {
  const col = hexToPacked(hex);
  const out = new Img(img.w + 2, img.h + 2);
  blit(out, img, 1, 1);
  const src = out.clone();
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      if (src.get(x, y)) continue;
      if (src.get(x - 1, y) || src.get(x + 1, y) || src.get(x, y - 1) || src.get(x, y + 1)) out.set(x, y, col);
    }
  return out;
}

/** Scale2x / EPX upsampling. */
export function scale2x(img) {
  const w = img.w, h = img.h;
  const out = new Img(w * 2, h * 2);
  const o = out.data, W = w * 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = img.get(x, y);
      const A = img.get(x, y - 1), B = img.get(x + 1, y), C = img.get(x - 1, y), D = img.get(x, y + 1);
      let p1 = P, p2 = P, p3 = P, p4 = P;
      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;
      const i = y * 2 * W + x * 2;
      o[i] = p1;
      o[i + 1] = p2;
      o[i + W] = p3;
      o[i + W + 1] = p4;
    }
  }
  return out;
}

/**
 * Rotate `img` by `angle` around (px, py) into an `outW`x`outH` image whose
 * pivot sits at (opx, opy). RotSprite-lite: 8x EPX upscale, then sample.
 */
export function rotateImg(img, angle, px, py, outW, outH, opx, opy, up = null) {
  const S = 8;
  up = up || scale2x(scale2x(scale2x(img)));
  const out = new Img(outW, outH);
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const dx = ox + 0.5 - opx, dy = oy + 0.5 - opy;
      const sx = dx * cos - dy * sin + px;
      const sy = dx * sin + dy * cos + py;
      const ux = Math.floor(sx * S), uy = Math.floor(sy * S);
      if (ux < 0 || uy < 0 || ux >= up.w || uy >= up.h) continue;
      out.data[oy * outW + ox] = up.data[uy * up.w + ux];
    }
  }
  return out;
}

/**
 * Pre-render `count` evenly spaced rotations of `img` as canvases.
 * Returns { frames, size, half } where frames[i] is at angle i*2PI/count.
 */
export function buildRotations(img, count, px = img.w / 2, py = img.h / 2) {
  let rad = 0;
  for (const [cx, cy] of [[0, 0], [img.w, 0], [0, img.h], [img.w, img.h]])
    rad = Math.max(rad, Math.hypot(cx - px, cy - py));
  const size = Math.ceil(rad * 2) + 2;
  const half = size / 2;
  const up = scale2x(scale2x(scale2x(img)));
  const frames = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    frames.push(imgToCanvas(rotateImg(img, a, px, py, size, size, half, half, up)));
  }
  return { frames, size, half, count };
}

/** Index of the pre-rendered rotation closest to `angle`. */
export function rotIndex(angle, count) {
  const step = (Math.PI * 2) / count;
  let i = Math.round(angle / step) % count;
  if (i < 0) i += count;
  return i;
}
