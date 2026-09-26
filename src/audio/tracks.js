// Original chiptune soundtrack for ClickJet, written as data.
//
// Harmony: `prog` lists chord roots as scale degrees (one chord per bar).
// Bass/arp patterns are 16 steps per bar using chord-tone indices
//   0 = root, 1 = third, 2 = fifth, 3 = octave, 4 = tenth; '-' holds, '.' rests.
// Melodies ("phrases") are 2 bars of 8th notes written in scale degrees
//   (0 = tonic, 7 = tonic an octave up, negatives go down); '_' ties, '.' rests.
// Sections combine phrases with the rhythm section; `form` is the song order.

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
};

const GAME_FORM = ['intro', 'A', 'B', 'break', 'A2', 'B'];

export const TRACKS = [
  {
    id: 'hangar',
    title: 'HANGAR LULLABY',
    menu: true,
    bpm: 100,
    key: 60, // C
    scale: 'major',
    prog: [0, 5, 3, 4],
    lead: { wave: 'pulse25', vol: 0.11, octave: 0, vib: 3 },
    bassInst: { wave: 'triangle', vol: 0.22 },
    arpInst: { wave: 'pulse12', vol: 0.05, octave: 1 },
    bass: '0-------2-------',
    arp: '0.2.3.2.1.2.3.2.',
    drums: { kick: 'x.........x.....', snare: '........x.......', hat: 'x...x...x...x...' },
    phrases: {
      p1: '4 _ 7 _ 6 _ 4 _ 5 _ _ _ 2 _ 4 _',
      p2: '3 _ 5 _ 7 _ 5 _ 4 _ _ _ . . 1 2',
      p3: '3 _ 5 _ 7 _ 8 _ 6 _ _ _ 4 _ . .',
      p4: '9 _ 8 7 _ _ 4 _ 7 _ 5 _ 2 _ . .',
      p5: '8 _ 7 5 _ _ 3 _ 4 _ 6 _ 8 _ . .',
      p6: '10 _ 9 7 _ _ 5 _ 4 _ _ _ _ _ . .',
    },
    sections: {
      A: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, arp: true, drums: 'light' },
      B: { bars: 8, lead: ['p4', 'p5', 'p4', 'p6'], bass: true, arp: true, drums: 'full' },
    },
    form: ['A', 'B'],
  },
  {
    id: 'nebula',
    title: 'NEBULA RUN',
    bpm: 144,
    key: 57, // A
    scale: 'minor',
    prog: [0, 5, 2, 6],
    lead: { wave: 'pulse25', vol: 0.1, octave: 0, vib: 4 },
    bassInst: { wave: 'triangle', vol: 0.26 },
    arpInst: { wave: 'pulse12', vol: 0.045, octave: 1 },
    bass: '0.0.0.3.0.0.0.3.',
    arp: '0123212301232123',
    drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    phrases: {
      p1: '7 _ 7 4 7 _ 9 _ 9 _ 7 _ 5 _ 7 _',
      p2: '9 _ 9 6 9 _ 11 _ 10 _ 8 _ 6 _ . .',
      p3: '11 _ 10 9 _ _ 6 _ 8 _ 6 _ 8 _ 10 _',
      p4: '11 _ _ 10 11 _ 12 _ 12 _ 11 _ 9 _ 7 _',
      p5: '9 _ _ 8 9 _ 11 _ 10 _ 8 _ 6 _ 8 _',
      p6: '11 _ 9 _ 6 _ 9 _ 8 _ _ _ 10 _ _ _',
    },
    sections: {
      intro: { bars: 4, bass: true, drums: 'light' },
      A: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, drums: 'full' },
      B: { bars: 8, lead: ['p4', 'p5', 'p4', 'p6'], bass: true, arp: true, drums: 'full' },
      break: { bars: 4, bass: true, arp: true, drums: 'hats' },
      A2: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, arp: true, drums: 'full' },
    },
    form: GAME_FORM,
  },
  {
    id: 'alley',
    title: 'ASTEROID ALLEY',
    bpm: 150,
    key: 50, // D
    scale: 'dorian',
    prog: [0, 3, 0, 6],
    lead: { wave: 'square', vol: 0.075, octave: 1, vib: 3 },
    bassInst: { wave: 'pulse25', vol: 0.12, octave: 0 },
    arpInst: { wave: 'pulse12', vol: 0.045, octave: 2 },
    bass: '0..0..3..0.2.3..',
    arp: '0.2.1.3.0.2.1.3.',
    drums: { kick: 'x..x......x.....', snare: '....x.......x..x', hat: 'x.xxx.xxx.xxx.xx' },
    phrases: {
      p1: '7 _ 9 7 _ 4 _ 5 5 _ 7 _ 3 _ . .',
      p2: '7 _ 9 _ 11 _ 9 7 8 _ 6 _ 10 _ . .',
      p3: '11 _ 10 9 _ 7 _ 9 8 _ _ _ 6 _ _ _',
      p4: '4 4 _ 7 _ 4 6 _ 7 _ 5 _ 3 _ 5 _',
      p5: '4 4 _ 7 _ 4 6 _ 6 _ 8 _ 10 _ 8 _',
      p6: '9 _ 7 _ 4 _ 7 _ 6 _ _ _ . . . .',
    },
    sections: {
      intro: { bars: 4, bass: true, drums: 'full' },
      A: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, drums: 'full' },
      B: { bars: 8, lead: ['p4', 'p5', 'p4', 'p6'], bass: true, arp: true, drums: 'full' },
      break: { bars: 4, bass: true, arp: true, drums: 'light' },
      A2: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, arp: true, drums: 'full' },
    },
    form: GAME_FORM,
  },
  {
    id: 'pursuit',
    title: 'PURPLE PURSUIT',
    bpm: 132,
    key: 52, // E
    scale: 'harmonic',
    prog: [0, 5, 3, 4],
    lead: { wave: 'pulse25', vol: 0.1, octave: 1, vib: 5 },
    bassInst: { wave: 'triangle', vol: 0.26 },
    arpInst: { wave: 'pulse12', vol: 0.05, octave: 1 },
    bass: '0.0.0.0.3.0.0.0.',
    arp: '0.1.2.1.0.1.2.1.',
    drums: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: '..x...x...x...x.' },
    phrases: {
      p1: '7 _ 6 7 9 _ 7 _ 9 _ 7 _ 5 _ . .',
      p2: '10 _ 9 _ 7 _ 5 _ 6 _ _ _ 4 _ 8 _',
      p3: '12 _ 10 _ 7 _ 10 _ 11 _ _ _ 6 _ _ _',
      p4: '4 _ 7 _ 4 _ 9 _ 5 _ 9 _ 5 _ 7 _',
      p5: '3 _ 7 _ 3 _ 10 _ 4 _ 8 _ 6 _ 11 _',
      p6: '12 _ 11 _ 10 _ 9 _ 8 _ 6 _ 4 _ _ _',
    },
    sections: {
      intro: { bars: 4, bass: true, arp: true, drums: 'none' },
      A: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, drums: 'full' },
      B: { bars: 8, lead: ['p4', 'p5', 'p4', 'p6'], bass: true, arp: true, drums: 'full' },
      break: { bars: 4, bass: true, drums: 'light' },
      A2: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, arp: true, drums: 'full' },
    },
    form: GAME_FORM,
  },
  {
    id: 'stardust',
    title: 'STARDUST DASH',
    bpm: 164,
    key: 53, // F
    scale: 'major',
    prog: [0, 3, 5, 4],
    lead: { wave: 'square', vol: 0.075, octave: 1, vib: 3 },
    bassInst: { wave: 'triangle', vol: 0.26 },
    arpInst: { wave: 'pulse12', vol: 0.045, octave: 2 },
    bass: '0.3.0.3.0.3.0.3.',
    arp: '0.1.2.3.2.1.2.3.',
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
    phrases: {
      p1: '4 _ 7 _ 9 7 4 _ 5 _ 7 _ 10 _ 7 _',
      p2: '9 _ 7 _ 5 _ 7 _ 8 _ 6 _ 4 _ . .',
      p3: '9 _ 10 _ 11 _ 9 _ 8 _ _ _ 11 _ _ _',
      p4: '7 7 _ 9 _ 11 _ 9 10 _ 9 _ 7 _ 5 _',
      p5: '9 9 _ 7 _ 5 _ 7 8 _ 6 _ 8 _ 11 _',
      p6: '12 _ 11 _ 9 _ 7 _ 8 _ _ _ 4 _ _ _',
    },
    sections: {
      intro: { bars: 4, bass: true, drums: 'full' },
      A: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, drums: 'full' },
      B: { bars: 8, lead: ['p4', 'p5', 'p4', 'p6'], bass: true, arp: true, drums: 'full' },
      break: { bars: 4, bass: true, arp: true, drums: 'hats' },
      A2: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, arp: true, drums: 'full' },
    },
    form: GAME_FORM,
  },
  {
    id: 'drift',
    title: 'COSMIC DRIFT',
    bpm: 120,
    key: 55, // G
    scale: 'mixolydian',
    prog: [0, 6, 3, 0],
    lead: { wave: 'pulse25', vol: 0.1, octave: 0, vib: 4 },
    bassInst: { wave: 'triangle', vol: 0.26 },
    arpInst: { wave: 'pulse12', vol: 0.045, octave: 1 },
    bass: '0..0.2..0..0.3..',
    arp: '0.2.3.2.0.2.3.2.',
    drums: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    phrases: {
      p1: '4 _ 2 4 _ 7 _ 6 6 _ 8 _ 10 _ 8 _',
      p2: '7 _ 5 _ 3 _ 5 _ 4 _ 2 _ 0 _ . .',
      p3: '10 _ 9 _ 7 _ 5 _ 4 _ _ _ 7 _ _ _',
      p4: '9 _ 11 _ 9 7 _ _ 8 _ 10 _ 8 6 _ _',
      p5: '10 _ 12 _ 10 7 _ _ 9 _ 11 _ 9 7 _ _',
      p6: '10 _ 9 _ 7 _ 5 _ 7 _ _ _ _ _ . .',
    },
    sections: {
      intro: { bars: 4, bass: true, drums: 'hats' },
      A: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, drums: 'full' },
      B: { bars: 8, lead: ['p4', 'p5', 'p4', 'p6'], bass: true, arp: true, drums: 'full' },
      break: { bars: 4, bass: true, arp: true, drums: 'light' },
      A2: { bars: 8, lead: ['p1', 'p2', 'p1', 'p3'], bass: true, arp: true, drums: 'full' },
    },
    form: GAME_FORM,
  },
];

// ---------------------------------------------------------------- compiler

function degreeToMidi(track, deg) {
  const sc = SCALES[track.scale];
  const oct = Math.floor(deg / 7);
  const idx = ((deg % 7) + 7) % 7;
  return track.key + 12 * oct + sc[idx];
}

function chordTones(track, rootDeg) {
  // 0 root, 1 third, 2 fifth, 3 octave, 4 tenth
  return [rootDeg, rootDeg + 2, rootDeg + 4, rootDeg + 7, rootDeg + 9].map((d) => degreeToMidi(track, d));
}

function parsePattern(str) {
  // returns [{ step, len, tone }]
  const notes = [];
  const chars = str.replace(/\s+/g, '');
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch >= '0' && ch <= '9') notes.push({ step: i, len: 1, tone: +ch });
    else if (ch === '-' && notes.length) notes[notes.length - 1].len++;
  }
  return notes;
}

function parsePhrase(str) {
  const tokens = str.trim().split(/\s+/);
  const notes = [];
  tokens.forEach((tk, i) => {
    if (tk === '_') {
      if (notes.length) notes[notes.length - 1].len++;
    } else if (tk !== '.') notes.push({ start: i, len: 1, deg: parseInt(tk, 10) });
    else if (notes.length) notes[notes.length - 1].closed = true;
  });
  return { notes, length: tokens.length };
}

/**
 * Compile a track into a flat, time-sorted list of note events measured in
 * 16th-note steps: { step, dur, ch, midi, vol? }.
 */
export function compileTrack(track) {
  const events = [];
  const bassPat = parsePattern(track.bass);
  const arpPat = parsePattern(track.arp);
  const phrases = {};
  for (const k in track.phrases) phrases[k] = parsePhrase(track.phrases[k]);
  let bar = 0;
  for (const secName of track.form) {
    const sec = track.sections[secName];
    // lead: concatenate phrases for the whole section
    if (sec.lead) {
      let offset8 = 0;
      for (let pi = 0; pi < sec.bars / 2; pi++) {
        const ph = phrases[sec.lead[pi % sec.lead.length]];
        for (const n of ph.notes) {
          events.push({
            step: bar * 16 + (offset8 + n.start) * 2,
            dur: n.len * 2,
            ch: 'lead',
            midi: degreeToMidi(track, n.deg) + 12 * (track.lead.octave || 0),
          });
        }
        offset8 += ph.length;
      }
    }
    for (let b = 0; b < sec.bars; b++) {
      const root = track.prog[b % track.prog.length];
      const tones = chordTones(track, root);
      const base = (bar + b) * 16;
      if (sec.bass) {
        for (const n of bassPat)
          events.push({ step: base + n.step, dur: n.len, ch: 'bass', midi: tones[n.tone] - 12 + 12 * (track.bassInst.octave ?? 0) });
      }
      if (sec.arp) {
        for (const n of arpPat)
          events.push({ step: base + n.step, dur: n.len, ch: 'arp', midi: tones[n.tone] + 12 * (track.arpInst.octave || 0) });
      }
      const dm = sec.drums;
      if (dm && dm !== 'none') {
        const D = track.drums;
        const last = b === sec.bars - 1;
        for (let s = 0; s < 16; s++) {
          const fill = last && dm === 'full' && s >= 12;
          if (dm === 'full' || dm === 'light') {
            if (D.kick[s] === 'x' && (dm === 'full' || s % 8 === 0)) events.push({ step: base + s, ch: 'kick' });
            if (fill) events.push({ step: base + s, ch: 'snare', vol: 0.5 + (s - 12) * 0.12 });
            else if (D.snare[s] === 'x' && dm === 'full') events.push({ step: base + s, ch: 'snare' });
          }
          if (D.hat[s] === 'x') events.push({ step: base + s, ch: 'hat', vol: dm === 'light' ? 0.6 : 1 });
        }
      }
    }
    bar += sec.bars;
  }
  events.sort((a, b) => a.step - b.step);
  return { id: track.id, title: track.title, bpm: track.bpm, events, length: bar * 16, track };
}
