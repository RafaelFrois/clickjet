// Object pool: gameplay objects and particles are recycled instead of being
// allocated every frame. `active` keeps insertion order (stable draw order).

export class Pool {
  constructor(factory, prealloc = 0, max = Infinity) {
    this.factory = factory;
    this.max = max;
    this.free = [];
    this.active = [];
    for (let i = 0; i < prealloc; i++) this.free.push(factory());
  }

  get size() {
    return this.active.length;
  }

  /** Returns a recycled object (caller must initialise it) or null when full. */
  obtain() {
    if (this.active.length >= this.max) return null;
    const o = this.free.length ? this.free.pop() : this.factory();
    o.dead = false;
    this.active.push(o);
    return o;
  }

  /** Remove every object flagged `dead`, preserving order of the rest. */
  sweep() {
    const a = this.active;
    let w = 0;
    for (let r = 0; r < a.length; r++) {
      const o = a[r];
      if (o.dead) this.free.push(o);
      else a[w++] = o;
    }
    a.length = w;
  }

  clear() {
    while (this.active.length) {
      const o = this.active.pop();
      o.dead = true;
      this.free.push(o);
    }
  }

  /** Total objects ever allocated (active + free) — used by leak tests. */
  get allocated() {
    return this.active.length + this.free.length;
  }
}
