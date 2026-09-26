// Bot players used by the balance simulation and browser soak tests.
import { FIXED_DT, VIEW_W, VIEW_H } from '../src/config.js';

/** Bot strategies. `skill` controls how far ahead it looks for danger. */
export function makeBot(kind) {
  if (kind === 'idle') return () => ({ mode: 'none' });
  if (kind === 'random') {
    let tx = VIEW_W / 2, ty = VIEW_H / 2, t = 0;
    return (w) => {
      t -= FIXED_DT;
      if (t <= 0) { t = 0.8; tx = w.rng.range(20, VIEW_W - 20); ty = w.rng.range(30, VIEW_H - 20); }
      return { mode: 'point', x: tx, y: ty };
    };
  }
  // 'dodger': potential-field bot — repelled by hazards, attracted to coins.
  const skill = kind === 'expert' ? 1.0 : 0.6;
  return (w) => {
    const p = w.player;
    let fx = 0, fy = 0;
    const repel = (x, y, r, strength, look) => {
      const dx = p.x - x, dy = p.y - y;
      const d = Math.hypot(dx, dy) - r;
      if (d > look) return;
      const k = strength / Math.max(4, d) ** 2;
      const n = Math.hypot(dx, dy) || 1;
      fx += (dx / n) * k; fy += (dy / n) * k;
    };
    const look = 40 * skill + 10;
    for (const m of w.spawner.meteors.active) {
      if (m.kind !== 'fire') continue;
      if (m.warn > 0) { repel(m.ex, m.ey, 6, 300 * skill, 30); continue; }
      // predict position slightly ahead
      for (const s of [0, 0.15, 0.3]) repel(m.x + m.vx * s * skill, m.y + m.vy * s * skill, m.r + 5, 900, look);
    }
    for (const r of w.spawner.rocks.active) repel(r.x, r.y, r.r + 5, 900, look);
    for (const g of w.enemies.greens.active) repel(g.x + g.vx * 0.2, g.y + g.bobY + g.vy * 0.2, 10, 1200, look + 10);
    const c = w.enemies.chaser;
    if (c.state === 'hunt' || c.state === 'stun' || c.state === 'leave') {
      const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1;
      if (kind === 'expert' && c.state === 'hunt' && d < 55) {
        // juke: sidestep perpendicular to the hunter's approach, toward open space
        let px = -dy / d, py = dx / d;
        const cx = VIEW_W / 2 - p.x, cy = VIEW_H / 2 - p.y;
        if (px * cx + py * cy < 0) { px = -px; py = -py; }
        fx += px * 6 + (dx / d) * 2; fy += py * 6 + (dy / d) * 2;
      } else repel(c.x, c.y, 8, 2600 * skill, 90);
    }
    // walls
    fx += 300 / Math.max(3, p.x) ** 2 - 300 / Math.max(3, VIEW_W - p.x) ** 2;
    fy += 300 / Math.max(3, p.y) ** 2 - 300 / Math.max(3, VIEW_H - p.y) ** 2;
    // nearest coin / rainbow meteor
    let best = null, bd = 1e9;
    for (const co of w.spawner.coins.active) {
      if (co.delay > 0) continue;
      const d = Math.hypot(co.x - p.x, co.y - p.y) - (co.kind ? 20 : 0);
      if (d < bd) { bd = d; best = co; }
    }
    for (const m of w.spawner.meteors.active) if (m.kind !== 'fire' && m.warn <= 0) {
      const d = Math.hypot(m.x - p.x, m.y - p.y) - 60;
      if (d < bd) { bd = d; best = m; }
    }
    if (best) {
      const dx = best.x - p.x, dy = best.y - p.y, n = Math.hypot(dx, dy) || 1;
      fx += (dx / n) * 0.8; fy += (dy / n) * 0.8;
    }
    const n = Math.hypot(fx, fy);
    if (n < 1e-6) return { mode: 'none' };
    return { mode: 'keys', ax: fx / Math.max(n, 1), ay: fy / Math.max(n, 1) };
  };
}


/**
 * 'planner' bot: samples candidate directions, rolls every hazard forward
 * ~0.5s and picks the move with the best clearance (plus coin greed).
 * Approximates a good human player with ~0.1s reaction.
 */
export function makePlanner(opts = {}) {
  const H = opts.horizon ?? 0.5, STEP = 0.05, greed = opts.greed ?? 1;
  const dirs = [[0, 0]];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    dirs.push([Math.cos(a), Math.sin(a)], [Math.cos(a) * 0.45, Math.sin(a) * 0.45]);
  }
  let choice = { mode: 'none' }, think = 0;
  return (w) => {
    think -= FIXED_DT;
    if (think > 0) return choice;
    think = opts.think ?? 0.06;
    const p = w.player, sp = 158;
    const haz = [];
    for (const m of w.spawner.meteors.active) if (m.kind === 'fire') haz.push({ x: m.x, y: m.y, vx: m.vx, vy: m.vy, r: m.r + 1.5, delay: Math.max(0, m.warn) });
    for (const r of w.spawner.rocks.active) haz.push({ x: r.x, y: r.y, vx: r.vx, vy: r.vy, r: r.r + 1.5, delay: 0 });
    for (const g of w.enemies.greens.active) {
      let vx = g.vx, vy = g.vy;
      if (g.state === 'telegraph') { const dx = p.x - g.x, dy = p.y - g.y, n = Math.hypot(dx, dy) || 1; vx = dx / n * 118; vy = dy / n * 118; }
      haz.push({ x: g.x, y: g.y + g.bobY - 1, vx, vy, r: 9.5, delay: 0 });
    }
    const c = w.enemies.chaser, d = w.difficulty.p;
    const chaserOn = c.state === 'hunt' || c.state === 'stun' || c.state === 'leave';
    let best = -1e9, bestDir = dirs[0];
    for (const [ux, uy] of dirs) {
      let px = p.x, py = p.y, clear = 1e9;
      let cx = c.x, cy = c.y, ch = c.heading, cs = c.speed;
      for (let t = STEP; t <= H + 1e-6; t += STEP) {
        px = Math.min(315, Math.max(5, px + ux * sp * STEP));
        py = Math.min(175, Math.max(5, py + uy * sp * STEP));
        for (const h of haz) {
          const tt = t - h.delay;
          if (tt < 0) continue;
          const hx = h.x + h.vx * (h.delay > 0 ? tt : t), hy = h.y + h.vy * (h.delay > 0 ? tt : t);
          const dd = Math.hypot(hx - px, hy - py) - h.r - 4.2;
          if (dd < clear) clear = dd;
        }
        if (chaserOn) {
          if (c.state === 'hunt') {
            const want = Math.atan2(py - cy, px - cx);
            let diff = Math.atan2(Math.sin(want - ch), Math.cos(want - ch));
            const mx = d.chaserTurn * STEP;
            ch += Math.max(-mx, Math.min(mx, diff));
            cs = Math.min(d.chaserSpeed * sp, cs + 150 * STEP);
          }
          cx += Math.cos(ch) * cs * STEP; cy += Math.sin(ch) * cs * STEP;
          const dd = Math.hypot(cx - px, cy - py) - 9.5 - 4.2;
          if (dd < clear) clear = dd;
        }
      }
      let score = clear < 0 ? -1000 + clear : Math.min(clear, 18);
      // prefer open space (away from walls / corners)
      score -= (Math.max(0, 22 - px) + Math.max(0, px - 298) + Math.max(0, 30 - py) + Math.max(0, py - 158)) * 0.4;
      if (chaserOn) score += Math.min(60, Math.hypot(cx - px, cy - py)) * 0.08;
      // greed: distance to nearest coin after the move
      let bd = 1e9;
      for (const co of w.spawner.coins.active) if (co.delay <= 0) bd = Math.min(bd, Math.hypot(co.x - px, co.y - py) - (co.kind ? 12 : 0));
      for (const m of w.spawner.meteors.active) if (m.kind !== 'fire' && m.warn <= 0) bd = Math.min(bd, Math.hypot(m.x - px, m.y - py) - 40);
      if (bd < 1e9) score -= bd * 0.05 * greed;
      if (score > best) { best = score; bestDir = [ux, uy]; }
    }
    choice = bestDir[0] === 0 && bestDir[1] === 0 ? { mode: 'none' } : { mode: 'keys', ax: bestDir[0], ay: bestDir[1] };
    return choice;
  };
}

