// PowerUpManager: the rainbow-meteor bonus — automatic points every second
// for a few seconds. Picking another one refreshes the timer.

import { SCORE } from '../config.js';

export class PowerUpManager {
  constructor(world) {
    this.world = world;
    this.active = false;
    this.rate = 0;
    this.timeLeft = 0;
    this.duration = 0;
    this.tickT = 0;
    this.warned = false;
    this.superMode = false;
  }

  activate(isSuper, x, y) {
    const rate = isSuper ? SCORE.superBonusRate : SCORE.bonusRate;
    const dur = isSuper ? SCORE.superBonusDuration : SCORE.bonusDuration;
    if (this.active) {
      this.rate = Math.max(this.rate, rate);
      this.timeLeft = Math.max(this.timeLeft, dur);
      this.duration = Math.max(this.duration, this.timeLeft);
    } else {
      this.active = true;
      this.rate = rate;
      this.timeLeft = dur;
      this.duration = dur;
      this.tickT = 1;
    }
    this.superMode = this.superMode || isSuper;
    this.warned = false;
    this.world.emit('bonusStart', { x, y, super: isSuper, rate: this.rate });
  }

  update(dt) {
    if (!this.active) return;
    this.timeLeft -= dt;
    this.tickT -= dt;
    if (this.tickT <= 1e-4) {
      this.tickT += 1;
      const p = this.world.player;
      this.world.score.add(this.rate);
      this.world.score.bonusPoints += this.rate;
      this.world.emit('bonusTick', { x: p.x, y: p.y, amount: this.rate });
    }
    if (!this.warned && this.timeLeft < 1.6) {
      this.warned = true;
      this.world.emit('bonusWarn', {});
    }
    if (this.timeLeft <= 1e-4) {
      this.active = false;
      this.superMode = false;
      this.timeLeft = 0;
      this.world.emit('bonusEnd', {});
    }
  }

  get frac() {
    return this.duration > 0 ? this.timeLeft / this.duration : 0;
  }
}
