// PlayerController: the rocket. Direct, low-latency control — the rocket
// steers toward a target (mouse / touch drag) or moves with keys/gamepad,
// with a very short velocity smoothing so it feels responsive, never heavy.

import { PLAYER, VIEW_W, VIEW_H } from '../config.js';
import { clamp, damp, approachAngle, lerp } from '../util/math.js';

export class Player {
  constructor() {
    this.reset(VIEW_W * 0.5, VIEW_H * 0.56);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.alive = true;
    this.grace = PLAYER.spawnGrace;
    this.tx = x;
    this.ty = y;
    this.thrust = 0;
    this.r = PLAYER.radius;
  }

  /**
   * intent.mode:
   *  'keys'  -> ax, ay in [-1, 1] (analog)
   *  'point' -> x, y absolute target (mouse)
   *  'drag'  -> dx, dy relative target delta (touch)
   *  'none'  -> hold position
   */
  update(dt, intent) {
    const m = PLAYER.margin;
    let dvx = 0, dvy = 0;
    if (intent.mode === 'keys') {
      dvx = intent.ax * PLAYER.maxSpeed;
      dvy = intent.ay * PLAYER.maxSpeed;
      this.tx = this.x;
      this.ty = this.y;
    } else {
      if (intent.mode === 'point') {
        this.tx = intent.x;
        this.ty = intent.y;
      } else if (intent.mode === 'drag') {
        this.tx += intent.dx;
        this.ty += intent.dy;
      }
      this.tx = clamp(this.tx, m, VIEW_W - m);
      this.ty = clamp(this.ty, m, VIEW_H - m);
      dvx = (this.tx - this.x) * PLAYER.followGain;
      dvy = (this.ty - this.y) * PLAYER.followGain;
      const sp = Math.hypot(dvx, dvy);
      if (sp > PLAYER.maxSpeed) {
        dvx *= PLAYER.maxSpeed / sp;
        dvy *= PLAYER.maxSpeed / sp;
      }
    }
    const k = damp(PLAYER.response, dt);
    this.vx += (dvx - this.vx) * k;
    this.vy += (dvy - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < m) { this.x = m; if (this.vx < 0) this.vx = 0; }
    if (this.x > VIEW_W - m) { this.x = VIEW_W - m; if (this.vx > 0) this.vx = 0; }
    if (this.y < m) { this.y = m; if (this.vy < 0) this.vy = 0; }
    if (this.y > VIEW_H - m) { this.y = VIEW_H - m; if (this.vy > 0) this.vy = 0; }

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 16) this.angle = approachAngle(this.angle, Math.atan2(this.vy, this.vx), PLAYER.turnRate * dt);
    this.thrust = lerp(this.thrust, clamp(speed / PLAYER.maxSpeed, 0, 1), damp(12, dt));
    if (this.grace > 0) this.grace -= dt;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }
}
