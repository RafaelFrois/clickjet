// Tiny chiptune synth on top of Web Audio: pulse/square/triangle voices with
// ADSR, pitch slides and vibrato, filtered noise, and drum kit voices.

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function makePulseWave(ctx, duty) {
  const n = 64;
  const real = new Float32Array(n), imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
    imag[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
  }
  return ctx.createPeriodicWave(real, imag);
}

export class Synth {
  constructor(ctx) {
    this.ctx = ctx;
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.waves = {
      pulse25: makePulseWave(ctx, 0.25),
      pulse12: makePulseWave(ctx, 0.125),
    };
  }

  osc(wave) {
    const o = this.ctx.createOscillator();
    if (this.waves[wave]) o.setPeriodicWave(this.waves[wave]);
    else o.type = wave || 'square';
    return o;
  }

  /**
   * Play a tone. opts: wave, vol, attack, decay, sustain (0..1 of vol),
   * release, slide (target Hz), slideTime, vib (depth Hz), vibRate, delayVib.
   */
  tone(dest, t, freq, dur, o = {}) {
    const ctx = this.ctx;
    const osc = this.osc(o.wave);
    const g = ctx.createGain();
    const vol = o.vol ?? 0.2;
    const a = o.attack ?? 0.004;
    const dcy = o.decay ?? 0.06;
    const sus = vol * (o.sustain ?? 0.7);
    const rel = o.release ?? 0.04;
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + (o.slideTime ?? dur));
    let lfo = null;
    if (o.vib) {
      lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = o.vibRate || 6;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(o.vib, t + (o.delayVib ?? 0.12));
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + rel + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    const dEnd = Math.min(t + a + dcy, t + Math.max(dur, a + 0.001));
    g.gain.linearRampToValueAtTime(Math.max(0.0001, sus), dEnd);
    g.gain.setValueAtTime(Math.max(0.0001, sus), Math.max(dEnd, t + dur));
    g.gain.exponentialRampToValueAtTime(0.0001, Math.max(dEnd, t + dur) + rel);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(Math.max(dEnd, t + dur) + rel + 0.02);
    return osc;
  }

  /** Filtered noise burst. opts: vol, type (filter), freq, freqEnd, q, attack, decay */
  noise(dest, t, dur, o = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + dur);
    f.Q.value = o.q ?? 0.8;
    const g = ctx.createGain();
    const vol = o.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.attack ?? 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    const off = Math.random() * 0.5;
    src.start(t, off);
    src.stop(t + dur + 0.02);
  }

  kick(dest, t, vol = 0.8) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.22);
  }

  snare(dest, t, vol = 0.45) {
    this.noise(dest, t, 0.16, { type: 'bandpass', freq: 1900, q: 0.7, vol });
    this.tone(dest, t, 185, 0.05, { wave: 'triangle', vol: vol * 0.6, decay: 0.03, sustain: 0.2, release: 0.03 });
  }

  hat(dest, t, vol = 0.14, open = false) {
    this.noise(dest, t, open ? 0.14 : 0.035, { type: 'highpass', freq: 7200, q: 0.5, vol });
  }
}
