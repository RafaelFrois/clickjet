// ScoreManager: score, combo multiplier and high-score tracking for a run.

import { SCORE } from '../config.js';

export class ScoreManager {
  constructor(world, highScore = 0) {
    this.world = world;
    this.reset(highScore);
  }

  reset(highScore) {
    this.score = 0;
    this.best = highScore;
    this.beatBest = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.mult = 1;
    this.maxMult = 1;
    this.coins = 0;
    this.rainbowCoins = 0;
    this.bonusPoints = 0;
    this.chains = 0;
  }

  add(amount) {
    this.score += amount;
    if (!this.beatBest && this.best > 0 && this.score > this.best) {
      this.beatBest = true;
      this.world.emit('newHighScore', { score: this.score });
    }
  }

  collectCoin(kind, x, y) {
    this.combo++;
    this.comboTimer = SCORE.comboWindow;
    const mult = Math.min(1 + Math.floor(this.combo / SCORE.comboStep), SCORE.comboMaxMult);
    if (mult > this.mult) this.world.emit('comboUp', { mult, x, y });
    this.mult = mult;
    this.maxMult = Math.max(this.maxMult, mult);
    const amount = (kind === 1 ? SCORE.rainbowCoin : SCORE.coin) * mult;
    if (kind === 1) this.rainbowCoins++;
    else this.coins++;
    this.add(amount);
    this.world.emit('coin', { x, y, kind, amount, mult, combo: this.combo });
    return amount;
  }

  update(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        if (this.mult > 1) this.world.emit('comboLost', { mult: this.mult });
        this.combo = 0;
        this.mult = 1;
        this.comboTimer = 0;
      }
    }
  }

  /** 0..1 remaining combo window (for the HUD bar). */
  get comboFrac() {
    return this.comboTimer / SCORE.comboWindow;
  }
}
