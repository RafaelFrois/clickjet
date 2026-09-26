// Music sequencer + playlist. Look-ahead scheduling on the AudioContext
// clock; tracks are compiled note lists (see tracks.js). The gameplay
// playlist is shuffled and never repeats the previous track back-to-back.

import { TRACKS, compileTrack } from './tracks.js';
import { midiToFreq } from './Synth.js';

const LOOKAHEAD = 0.12;
const TICK_MS = 25;

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.ctx = audio.ctx;
    this.synth = audio.synth;
    this.bus = audio.musicBus;
    this.compiled = TRACKS.map(compileTrack);
    this.menuTrack = this.compiled.find((t) => t.track.menu);
    this.gameTracks = this.compiled.filter((t) => !t.track.menu);
    this.current = null;
    this.mode = null; // 'menu' | 'game'
    this.lastGameId = null;
    this.bag = [];
    this.stepIdx = 0;
    this.evIdx = 0;
    this.nextTime = 0;
    this.playing = false;
    this.paused = false;
    this.timer = null;
    // Graph: voices -> fade -> music bus; lead also feeds a soft echo.
    const ctx = this.ctx;
    this.fade = ctx.createGain();
    this.fade.connect(this.bus);
    this.out = this.fade;
    this.leadIn = ctx.createGain();
    this.leadIn.connect(this.fade);
    this.delay = ctx.createDelay(1);
    this.fb = ctx.createGain();
    this.fb.gain.value = 0.28;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.35;
    this.leadIn.connect(this.delay);
    this.delay.connect(this.fb).connect(this.delay);
    this.delay.connect(this.wet).connect(this.fade);
  }

  nextGameTrack() {
    if (!this.bag.length) {
      this.bag = this.gameTracks.slice();
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag.length > 1 && this.bag[this.bag.length - 1].id === this.lastGameId) {
        [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
      }
    }
    const t = this.bag.pop();
    this.lastGameId = t.id;
    return t;
  }

  playMenu() {
    if (this.mode === 'menu' && this.playing && !this.paused) return;
    this.mode = 'menu';
    this.start(this.menuTrack);
  }

  playGame() {
    this.mode = 'game';
    this.start(this.nextGameTrack());
  }

  start(track) {
    const ctx = this.ctx;
    this.current = track;
    this.stepIdx = 0;
    this.evIdx = 0;
    this.nextTime = ctx.currentTime + 0.06;
    this.playing = true;
    this.paused = false;
    const g = this.fade.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(0.0001, ctx.currentTime);
    g.exponentialRampToValueAtTime(1, ctx.currentTime + 0.25);
    this.delay.delayTime.value = (60 / track.bpm) * 0.75;
    this.ensureTimer();
    if (this.onTrack) this.onTrack(track);
  }

  ensureTimer() {
    if (!this.timer) this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop(fade = 0.4) {
    if (!this.playing) return;
    const ctx = this.ctx;
    const g = this.fade.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(0.0001, g.value), ctx.currentTime);
    g.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fade);
    this.playing = false;
    this.paused = false;
    this.mode = null;
  }

  pause() {
    if (!this.playing || this.paused) return;
    this.paused = true;
    const ctx = this.ctx;
    const g = this.fade.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(0.0001, g.value), ctx.currentTime);
    g.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
  }

  resume() {
    if (!this.playing || !this.paused) return;
    const ctx = this.ctx;
    this.paused = false;
    this.nextTime = ctx.currentTime + 0.1;
    const g = this.fade.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(0.0001, ctx.currentTime);
    g.exponentialRampToValueAtTime(1, ctx.currentTime + 0.3);
  }

  tick() {
    if (!this.playing || this.paused || !this.current) return;
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    // after long stalls (tab throttled), jump ahead instead of bursting notes
    if (this.nextTime < ctx.currentTime - 0.25) this.nextTime = ctx.currentTime + 0.05;
    const tr = this.current;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      const ev = tr.events;
      while (this.evIdx < ev.length && ev[this.evIdx].step === this.stepIdx) {
        this.playEvent(ev[this.evIdx], this.nextTime, stepDur);
        this.evIdx++;
      }
      this.stepIdx++;
      this.nextTime += stepDur;
      if (this.stepIdx >= tr.length) {
        // song finished: menu loops, gameplay moves on to a different track
        const next = this.mode === 'game' ? this.nextGameTrack() : tr;
        this.current = next;
        this.stepIdx = 0;
        this.evIdx = 0;
        this.delay.delayTime.setValueAtTime((60 / next.bpm) * 0.75, this.nextTime);
        if (next !== tr && this.onTrack) this.onTrack(next);
        return;
      }
    }
  }

  playEvent(e, t, stepDur) {
    const s = this.synth, tr = this.current.track, out = this.out;
    switch (e.ch) {
      case 'lead': {
        const d = e.dur * stepDur * 0.92;
        s.tone(this.leadIn, t, midiToFreq(e.midi), d, {
          wave: tr.lead.wave, vol: tr.lead.vol, decay: 0.08, sustain: 0.75, release: 0.06,
          vib: d > 0.3 ? tr.lead.vib : 0, vibRate: 5.5, delayVib: 0.18,
        });
        break;
      }
      case 'bass':
        s.tone(out, t, midiToFreq(e.midi), e.dur * stepDur * 0.85, {
          wave: tr.bassInst.wave, vol: tr.bassInst.vol, decay: 0.05, sustain: 0.8, release: 0.03,
        });
        break;
      case 'arp':
        s.tone(out, t, midiToFreq(e.midi), Math.min(e.dur, 1) * stepDur * 0.8, {
          wave: tr.arpInst.wave, vol: tr.arpInst.vol, decay: 0.04, sustain: 0.5, release: 0.02,
        });
        break;
      case 'kick':
        s.kick(out, t, 0.55);
        break;
      case 'snare':
        s.snare(out, t, 0.2 * (e.vol || 1));
        break;
      case 'hat':
        s.hat(out, t, 0.06 * (e.vol || 1));
        break;
    }
  }
}
