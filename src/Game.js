// Game: top-level state machine + main loop. Wires together display, input,
// save, audio, simulation (World), FX, rendering and UI screens.
//
// States: LOADING -> MENU -> PLAYING <-> PAUSED (-> RESUMING) -> DYING -> GAME_OVER
// Only the systems that belong to the current state are updated.

import { VIEW_W, VIEW_H, FIXED_DT, MAX_STEPS_PER_FRAME } from './config.js';
import { Display } from './core/Display.js';
import { InputManager } from './core/InputManager.js';
import { SaveManager } from './core/SaveManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { buildSprites } from './gfx/sprites.js';
import { drawText, FONT_S } from './gfx/font.js';
import { World } from './game/World.js';
import { FxDirector } from './fx/FxDirector.js';
import { Starfield } from './fx/Starfield.js';
import { WorldRenderer } from './render/WorldRenderer.js';
import { UIManager } from './ui/UIManager.js';
import { MenuScreen } from './ui/MenuScreen.js';
import { OptionsScreen } from './ui/OptionsScreen.js';
import { PlayScreen, PauseScreen, GameOverScreen } from './ui/PlayScreens.js';

export const STATE = {
  LOADING: 'LOADING', MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED',
  RESUMING: 'RESUMING', DYING: 'DYING', GAME_OVER: 'GAME_OVER',
};

export class Game {
  constructor(canvas) {
    this.state = STATE.LOADING;
    this.display = new Display(canvas);
    this.ctx = this.display.ctx;
    this.save = new SaveManager();
    this.audio = new AudioManager(this.save);
    this.input = new InputManager(this.display);
    this.input.onGesture = () => {
      if (!this.audio.ready) this.audio.unlock();
    };
    this.input.uiHitTest = (x, y) => this.ui.hitTest(x, y);
    this.fx = new FxDirector(this.audio);
    this.starfield = new Starfield();
    this.ui = new UIManager(this);
    this.world = null;
    this.acc = 0;
    this.time = 0;
    this.last = 0;
    this.dyingT = 0;
    this.resumeT = 0;
    this.pausedFrom = null;
    this.frameCount = 0;
    this.drift = 14;
    this.timeScale = 1; // debug fast-forward (tests only)
  }

  // ------------------------------------------------------------- boot
  boot() {
    this.drawLoading();
    // Let the loading frame paint, then bake sprites.
    requestAnimationFrame(() => {
      this.sprites = buildSprites();
      this.renderer = new WorldRenderer(this.sprites);
      this.menu = new MenuScreen(this);
      this.options = new OptionsScreen(this);
      this.hud = new PlayScreen(this);
      this.pauseScreen = new PauseScreen(this);
      this.gameOver = new GameOverScreen(this);
      this.loadBrandLogo();
      this.bindLifecycle();
      this.enterMenu(false);
      this.last = performance.now();
      requestAnimationFrame((t) => this.frame(t));
    });
  }

  /** Optional: drop the original Domus Arcis logo at assets/domus-arcis.png. */
  loadBrandLogo() {
    const img = new Image();
    img.onload = () => {
      this.sprites.domusImage = img;
    };
    img.onerror = () => {};
    img.src = 'assets/domus-arcis.png';
  }

  drawLoading() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawText(ctx, FONT_S, 'LOADING...', VIEW_W / 2, VIEW_H / 2 - 2, '#ffffff', { align: 'center' });
  }

  bindLifecycle() {
    const hide = () => {
      if (this.state === STATE.PLAYING || this.state === STATE.RESUMING) this.pause();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hide();
      this.audio.setSuspended(document.hidden);
    });
    window.addEventListener('blur', hide);
    window.addEventListener('pagehide', hide);
    this.display.onResize = () => {
      if (this.display.portrait && this.isTouchDevice() && this.state === STATE.PLAYING) this.pause();
    };
  }

  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // ------------------------------------------------------ transitions
  enterMenu(wipe = true) {
    const go = () => {
      this.state = STATE.MENU;
      this.world = null;
      this.fx.reset();
      this.ui.set(this.menu);
      this.input.gameplayActive = false;
      this.audio.playMenuMusic();
    };
    if (wipe) this.ui.wipe(go);
    else go();
  }

  startGame() {
    this.audio.sfx('start');
    this.ui.wipe(() => this.beginRun());
  }

  beginRun() {
    const s = this.save;
    this.world = new World({
      seed: (Math.random() * 1e9) | 0,
      highScore: s.get('highScore'),
      tutorial: s.get('gamesPlayed') < 3,
    });
    this.fx.reset();
    this.acc = 0;
    this.state = STATE.PLAYING;
    this.ui.set(this.hud);
    this.input.gameplayActive = true;
    this.input.resetDrag();
    this.audio.playGameMusic();
  }

  restart() {
    this.audio.sfx('start');
    this.ui.wipe(() => this.beginRun(), 0.12);
  }

  toMenu() {
    this.audio.sfx('back');
    this.enterMenu(true);
  }

  pause() {
    if (this.state !== STATE.PLAYING && this.state !== STATE.RESUMING) return;
    this.state = STATE.PAUSED;
    this.input.gameplayActive = false;
    this.audio.pauseMusic();
    this.audio.sfx('pause');
    this.ui.push(this.pauseScreen);
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this.ui.pop();
    this.audio.sfx('unpause');
    this.audio.resumeMusic();
    this.state = STATE.RESUMING;
    this.resumeT = 0.9;
    this.input.gameplayActive = true;
    this.input.resetDrag();
  }

  openOptions() {
    this.audio.sfx('click');
    this.ui.push(this.options);
  }

  closeOptions() {
    this.audio.sfx('back');
    if (this.ui.top === this.options) this.ui.pop();
  }

  toggleMute() {
    const m = this.audio.toggleMute();
    if (!m) this.audio.sfx('click');
  }

  canFullscreen() {
    const el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
  }

  isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  toggleFullscreen() {
    const el = document.documentElement;
    try {
      if (this.isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        const p = req.call(el, { navigationUI: 'hide' });
        if (p && p.then) p.then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
      }
    } catch {
      /* not supported */
    }
  }

  onDeath() {
    this.state = STATE.DYING;
    this.dyingT = 0;
    this.input.gameplayActive = false;
    this.audio.stopMusic(0.35);
    const w = this.world;
    const res = this.save.recordRun(w.score.score, w.t, w.score.coins + w.score.rainbowCoins);
    this.result = {
      score: w.score.score, time: w.t, best: this.save.get('highScore'),
      newHighScore: res.newHighScore, newBestTime: res.newBestTime,
    };
  }

  showGameOver() {
    this.state = STATE.GAME_OVER;
    this.gameOver.setResult(this.result);
    this.ui.push(this.gameOver);
  }

  // ------------------------------------------------------------- loop
  frame(now) {
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000)) * this.timeScale;
    this.last = now;
    this.frameCount++;
    try {
      this.input.pollGamepad();
      const q = this.input.drainQueue();
      for (const e of q) if (e.type === 'move' && this.ui.captured) this.ui.dragMove(e.x, e.y);
      this.ui.handle(q);
      this.update(dt);
      this.render();
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame((t) => this.frame(t));
  }

  update(dt) {
    this.time += dt;
    const S = this.state;
    const w = this.world;
    let starDrift = this.drift;

    if (S === STATE.PLAYING && w) {
      if (this.fx.hitstop > 0) this.fx.hitstop -= dt;
      else {
        this.acc += dt;
        const intent = this.input.getIntent();
        let n = 0;
        while (this.acc >= FIXED_DT && n < MAX_STEPS_PER_FRAME) {
          w.step(FIXED_DT, intent);
          if (intent.mode === 'drag') intent.dx = intent.dy = 0;
          this.acc -= FIXED_DT;
          n++;
          if (w.state !== 'playing') break;
        }
        if (n >= MAX_STEPS_PER_FRAME) this.acc = 0;
        this.fx.handle(w.drainEvents(), w);
        this.fx.ambient(dt, w);
        if (w.state === 'dead') this.onDeath();
      }
      starDrift = w.difficulty.p.drift;
    } else if (S === STATE.RESUMING) {
      this.resumeT -= dt;
      this.input.getIntent(); // swallow drag while counting down
      if (this.resumeT <= 0) {
        this.state = STATE.PLAYING;
        this.acc = 0;
        this.audio.sfx('go');
      } else if (Math.ceil(this.resumeT / 0.3) !== Math.ceil((this.resumeT + dt) / 0.3)) this.audio.sfx('tick');
      starDrift = 0;
    } else if (S === STATE.DYING && w) {
      if (this.fx.hitstop > 0) this.fx.hitstop -= dt;
      else {
        this.dyingT += dt;
        const scale = this.dyingT < 0.55 ? 0.35 : 1; // brief slow motion
        this.stepAmbient(dt * scale);
        this.fx.handle(w.drainEvents(), w);
      }
      starDrift = 6;
      if (this.dyingT > 1.15) this.showGameOver();
    } else if (S === STATE.GAME_OVER && w) {
      this.stepAmbient(dt * 0.6);
      w.drainEvents();
      starDrift = 5;
    } else if (S === STATE.MENU) {
      starDrift = 16;
    }

    if (S !== STATE.PAUSED && S !== STATE.RESUMING) {
      const p = w && w.player.alive ? w.player : null;
      this.starfield.update(dt, starDrift, p ? p.x : VIEW_W / 2, p ? p.y : VIEW_H / 2);
      this.fx.update(dt);
    }
    this.ui.update(dt);
  }

  stepAmbient(dt) {
    const w = this.world;
    this.acc += dt;
    let n = 0;
    while (this.acc >= FIXED_DT && n < MAX_STEPS_PER_FRAME) {
      w.step(FIXED_DT, { mode: 'none' });
      this.acc -= FIXED_DT;
      n++;
    }
    if (n >= MAX_STEPS_PER_FRAME) this.acc = 0;
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const fx = this.fx;
    const shake = this.state !== STATE.PAUSED;
    const sx = shake ? fx.shakeX : 0, sy = shake ? fx.shakeY : 0;

    this.starfield.draw(ctx, this.sprites, sx, sy);
    if (this.world) {
      ctx.save();
      ctx.translate(sx, sy);
      this.renderer.draw(ctx, this.world, fx, this.time);
      fx.particles.draw(ctx, true);
      fx.texts.draw(ctx);
      this.renderer.drawWarnings(ctx, this.world);
      ctx.restore();
    } else {
      fx.particles.draw(ctx, true);
    }

    this.ui.draw(ctx);

    if (fx.flash > 0) {
      ctx.globalAlpha = Math.min(0.85, fx.flash);
      ctx.fillStyle = fx.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }
}
