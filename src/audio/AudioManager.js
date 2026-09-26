// AudioManager: the single owner of all sound — AudioContext lifecycle,
// master/music/sfx buses, mute + volumes (persisted via SaveManager),
// SFX dispatch and the music playlist. Browsers only allow audio after a
// user gesture, so music requests made earlier are remembered and started
// on unlock().

import { Synth } from './Synth.js';
import { Music } from './Music.js';
import { SFX, SFX_COOLDOWN } from './sfx.js';

// music sits under the effects so pickups and warnings always cut through
const MUSIC_TRIM = 0.6;

export class AudioManager {
  constructor(save) {
    this.save = save;
    this.ctx = null;
    this.muted = !!save.get('muted');
    this.musicVolume = save.get('musicVolume');
    this.sfxVolume = save.get('sfxVolume');
    this.wanted = null; // 'menu' | 'game' | null — desired music state
    this.last = {};
    this.music = null;
    this.onTrack = null;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Create / resume the AudioContext. Must be called from a user gesture. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC({ latencyHint: 'interactive' });
      } catch {
        try {
          this.ctx = new AC(); // older Safari: no options argument
        } catch {
          return;
        }
      }
      const ctx = this.ctx;
      this.synth = new Synth(ctx);
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 4;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.musicBus = ctx.createGain();
      this.sfxBus = ctx.createGain();
      this.musicBus.gain.value = this.musicVolume * MUSIC_TRIM;
      this.sfxBus.gain.value = this.sfxVolume;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.comp).connect(ctx.destination);
      this.music = new Music(this);
      this.music.onTrack = (t) => this.onTrack && this.onTrack(t);
    }
    const apply = () => this.applyWanted();
    if (this.ctx.state !== 'running') {
      const p = this.ctx.resume();
      if (p && p.then) p.then(apply, () => {});
    } else apply();
  }

  applyWanted() {
    if (!this.music) return;
    if (this.wanted === 'menu') this.music.playMenu();
    else if (this.wanted === 'game' && (!this.music.playing || this.music.mode !== 'game')) this.music.playGame();
  }

  sfx(name, opts = {}) {
    if (!this.ready || this.muted || this.sfxVolume <= 0) return;
    const fn = SFX[name];
    if (!fn) return;
    const now = this.ctx.currentTime;
    const cd = SFX_COOLDOWN[name] || 0;
    if (cd && this.last[name] && now - this.last[name] < cd) return;
    this.last[name] = now;
    try {
      fn(this.synth, this.sfxBus, now + 0.005, opts);
    } catch {
      /* never let audio break the game */
    }
  }

  // ------------------------------------------------------------- music
  playMenuMusic() {
    this.wanted = 'menu';
    if (this.ready) this.music.playMenu();
  }

  playGameMusic() {
    this.wanted = 'game';
    if (this.ready) this.music.playGame();
  }

  stopMusic(fade = 0.4) {
    this.wanted = null;
    if (this.music) this.music.stop(fade);
  }

  pauseMusic() {
    if (this.music) this.music.pause();
  }

  resumeMusic() {
    if (this.music) this.music.resume();
  }

  // ------------------------------------------------------------ settings
  setMuted(m) {
    this.muted = m;
    this.save.set('muted', m);
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.015);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMusicVolume(v) {
    this.musicVolume = Math.min(1, Math.max(0, v));
    this.save.set('musicVolume', this.musicVolume);
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(this.musicVolume * MUSIC_TRIM, this.ctx.currentTime, 0.02);
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.min(1, Math.max(0, v));
    this.save.set('sfxVolume', this.sfxVolume);
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.02);
  }

  /** Page hidden / shown (mobile app switch, tab change). */
  setSuspended(hidden) {
    if (!this.ctx) return;
    if (hidden) this.ctx.suspend().catch(() => {});
    else this.ctx.resume().catch(() => {});
  }
}
