// Sound effect recipes. Each takes (synth, destination, time, opts).

const N = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const SFX = {
  coin(s, d, t, o) {
    const up = Math.min(o.combo || 0, 14) * 0.5; // pitch climbs with the combo
    s.tone(d, t, N(83 + up), 0.045, { wave: 'square', vol: 0.14, decay: 0.02, sustain: 0.6, release: 0.02 });
    s.tone(d, t + 0.045, N(88 + up), 0.09, { wave: 'square', vol: 0.14, decay: 0.05, sustain: 0.4, release: 0.05 });
  },
  rainbowCoin(s, d, t) {
    [84, 88, 91, 96, 100].forEach((m, i) =>
      s.tone(d, t + i * 0.035, N(m), 0.05, { wave: i % 2 ? 'triangle' : 'pulse25', vol: 0.14, release: 0.05 }));
  },
  comboUp(s, d, t, o) {
    const base = 72 + (o.mult || 2) * 2;
    s.tone(d, t, N(base), 0.12, { wave: 'pulse25', vol: 0.1, slide: N(base + 12), slideTime: 0.1 });
    s.tone(d, t + 0.1, N(base + 12), 0.12, { wave: 'square', vol: 0.07, release: 0.1 });
    s.tone(d, t + 0.1, N(base + 16), 0.12, { wave: 'triangle', vol: 0.1, release: 0.1 });
  },
  comboLost(s, d, t) {
    s.tone(d, t, N(69), 0.14, { wave: 'triangle', vol: 0.09, slide: N(57), slideTime: 0.14 });
  },
  chain(s, d, t) {
    [79, 83, 86, 91].forEach((m, i) => s.tone(d, t + i * 0.055, N(m), 0.07, { wave: 'square', vol: 0.07, release: 0.06 }));
  },
  formation(s, d, t) {
    s.tone(d, t, N(96), 0.04, { wave: 'pulse12', vol: 0.06 });
    s.tone(d, t + 0.05, N(100), 0.06, { wave: 'pulse12', vol: 0.05 });
  },
  powerUp(s, d, t) {
    s.tone(d, t, N(57), 0.32, { wave: 'square', vol: 0.08, slide: N(93), slideTime: 0.3 });
    [81, 85, 88, 93, 97].forEach((m, i) =>
      s.tone(d, t + 0.28 + i * 0.045, N(m), 0.07, { wave: 'pulse25', vol: 0.09, release: 0.08 }));
  },
  superBonus(s, d, t) {
    s.tone(d, t, N(45), 0.4, { wave: 'sawtooth', vol: 0.06, slide: N(93), slideTime: 0.38 });
    s.tone(d, t, N(52), 0.4, { wave: 'square', vol: 0.05, slide: N(100), slideTime: 0.38 });
    [81, 85, 88, 93, 97, 100, 105].forEach((m, i) =>
      s.tone(d, t + 0.36 + i * 0.04, N(m), 0.08, { wave: 'pulse25', vol: 0.09, release: 0.1 }));
  },
  bonusTick(s, d, t) {
    s.tone(d, t, N(91), 0.03, { wave: 'pulse12', vol: 0.1 });
    s.tone(d, t + 0.03, N(98), 0.04, { wave: 'pulse12', vol: 0.08 });
  },
  bonusWarn(s, d, t) {
    for (let i = 0; i < 3; i++) s.tone(d, t + i * 0.13, N(84), 0.05, { wave: 'pulse25', vol: 0.06 });
  },
  bonusEnd(s, d, t) {
    [88, 84, 79].forEach((m, i) => s.tone(d, t + i * 0.06, N(m), 0.06, { wave: 'triangle', vol: 0.1 }));
  },
  warn(s, d, t) {
    s.tone(d, t, N(81), 0.04, { wave: 'pulse25', vol: 0.06 });
    s.tone(d, t + 0.07, N(81), 0.04, { wave: 'pulse25', vol: 0.05 });
  },
  rainbowWarn(s, d, t) {
    [88, 92, 95].forEach((m, i) => s.tone(d, t + i * 0.05, N(m), 0.05, { wave: 'triangle', vol: 0.07 }));
  },
  whoosh(s, d, t) {
    s.noise(d, t, 0.45, { type: 'bandpass', freq: 500, freqEnd: 2600, q: 1.2, vol: 0.16, attack: 0.08 });
  },
  hunterWarn(s, d, t) {
    // "wub-wub" + eerie high tone: the purple hunter is coming
    s.tone(d, t, N(40), 0.16, { wave: 'square', vol: 0.09, slide: N(36), slideTime: 0.16 });
    s.tone(d, t + 0.2, N(40), 0.2, { wave: 'square', vol: 0.09, slide: N(34), slideTime: 0.2 });
    s.tone(d, t, N(88), 0.5, { wave: 'triangle', vol: 0.035, vib: 18, vibRate: 9, delayVib: 0.01 });
  },
  stun(s, d, t) {
    s.tone(d, t, N(84), 0.12, { wave: 'triangle', vol: 0.14, slide: N(60), slideTime: 0.12 });
    s.noise(d, t, 0.12, { type: 'lowpass', freq: 1800, vol: 0.12 });
  },
  growl(s, d, t) {
    s.tone(d, t, N(38), 0.22, { wave: 'square', vol: 0.05, vib: 6, vibRate: 22, delayVib: 0.01 });
  },
  lunge(s, d, t) {
    s.noise(d, t, 0.22, { type: 'bandpass', freq: 900, freqEnd: 300, q: 1, vol: 0.16 });
  },
  alarm(s, d, t) {
    for (let i = 0; i < 3; i++) {
      s.tone(d, t + i * 0.2, N(76), 0.09, { wave: 'square', vol: 0.06 });
      s.tone(d, t + i * 0.2 + 0.1, N(81), 0.09, { wave: 'square', vol: 0.06 });
    }
  },
  eventGood(s, d, t) {
    [79, 84, 88, 91].forEach((m, i) => s.tone(d, t + i * 0.06, N(m), 0.08, { wave: 'pulse25', vol: 0.08 }));
  },
  record(s, d, t) {
    const notes = [72, 76, 79, 84, 79, 84];
    const lens = [0.08, 0.08, 0.08, 0.2, 0.08, 0.35];
    let tt = t;
    notes.forEach((m, i) => {
      s.tone(d, tt, N(m), lens[i], { wave: 'square', vol: 0.08, release: 0.06 });
      s.tone(d, tt, N(m - 12), lens[i], { wave: 'triangle', vol: 0.1, release: 0.06 });
      tt += lens[i] + 0.02;
    });
  },
  explosion(s, d, t) {
    s.noise(d, t, 0.8, { type: 'lowpass', freq: 3200, freqEnd: 120, q: 0.7, vol: 0.4 });
    s.noise(d, t + 0.05, 0.4, { type: 'bandpass', freq: 900, freqEnd: 200, q: 2, vol: 0.18 });
    const o = s.ctx.createOscillator();
    const g = s.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.5);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(d);
    o.start(t);
    o.stop(t + 0.6);
  },
  gameOver(s, d, t) {
    const seq = [[67, 0.14], [64, 0.14], [60, 0.14], [55, 0.4]];
    let tt = t;
    for (const [m, len] of seq) {
      s.tone(d, tt, N(m), len, { wave: 'square', vol: 0.07, release: 0.08, vib: len > 0.3 ? 5 : 0, delayVib: 0.1 });
      s.tone(d, tt, N(m - 12), len, { wave: 'triangle', vol: 0.12, release: 0.08 });
      tt += len + 0.03;
    }
  },
  start(s, d, t) {
    [72, 79, 84].forEach((m, i) => s.tone(d, t + i * 0.06, N(m), 0.07, { wave: 'pulse25', vol: 0.09 }));
    s.tone(d, t, N(48), 0.25, { wave: 'triangle', vol: 0.12, slide: N(60), slideTime: 0.2 });
  },
  click(s, d, t) {
    s.tone(d, t, N(84), 0.03, { wave: 'pulse12', vol: 0.1 });
    s.tone(d, t + 0.03, N(91), 0.03, { wave: 'pulse12', vol: 0.09 });
  },
  hover(s, d, t) {
    s.tone(d, t, N(88), 0.02, { wave: 'pulse12', vol: 0.045 });
  },
  back(s, d, t) {
    s.tone(d, t, N(79), 0.03, { wave: 'pulse12', vol: 0.06 });
    s.tone(d, t + 0.035, N(72), 0.04, { wave: 'pulse12', vol: 0.05 });
  },
  pause(s, d, t) {
    s.tone(d, t, N(79), 0.05, { wave: 'square', vol: 0.06 });
    s.tone(d, t + 0.06, N(72), 0.08, { wave: 'square', vol: 0.06 });
  },
  unpause(s, d, t) {
    s.tone(d, t, N(72), 0.05, { wave: 'square', vol: 0.06 });
    s.tone(d, t + 0.06, N(79), 0.08, { wave: 'square', vol: 0.06 });
  },
  tick(s, d, t) {
    s.tone(d, t, N(76), 0.05, { wave: 'pulse25', vol: 0.07 });
  },
  go(s, d, t) {
    s.tone(d, t, N(88), 0.12, { wave: 'pulse25', vol: 0.08 });
  },
  slider(s, d, t, o) {
    s.tone(d, t, N(72 + Math.round((o.v || 0) * 12)), 0.03, { wave: 'pulse12', vol: 0.06 });
  },
  tally(s, d, t) {
    s.tone(d, t, N(96), 0.015, { wave: 'pulse12', vol: 0.045 });
  },
};

// minimum seconds between two plays of the same effect (avoids stacking)
export const SFX_COOLDOWN = {
  coin: 0.02, bonusTick: 0.05, warn: 0.12, hover: 0.05, tally: 0.03, rainbowWarn: 0.2, whoosh: 0.15, growl: 0.2,
};
