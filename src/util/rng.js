// Seedable PRNG (mulberry32). Simulation code only draws randomness from here
// so runs can be reproduced in tests and balance simulations.

export class Rng {
  constructor(seed = (Math.random() * 0x7fffffff) | 0) {
    this.seed(seed);
  }

  seed(s) {
    this.s = s >>> 0;
  }

  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a, b) {
    return a + (b - a) * this.next();
  }

  /** Random value inside a [min, max] tuple. */
  pickRange(pair) {
    return this.range(pair[0], pair[1]);
  }

  int(a, b) {
    return a + Math.floor(this.next() * (b - a + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }

  /** Pick from [{weight}, ...]. */
  weighted(items, key = 'weight') {
    let total = 0;
    for (const it of items) total += it[key];
    let r = this.next() * total;
    for (const it of items) {
      r -= it[key];
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
}
