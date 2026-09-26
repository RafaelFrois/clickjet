// DifficultyManager: interpolates the keyframe table in config.js for the
// current survival time. Every spawner/enemy reads its knobs from `p`.

import { DIFFICULTY_KEYS, DIFFICULTY_FIELDS } from '../config.js';
import { clamp } from '../util/math.js';

export function sampleDifficulty(t, out = {}) {
  const K = DIFFICULTY_KEYS;
  let i = 0;
  while (i < K.length - 1 && K[i + 1][0] <= t) i++;
  const a = K[i];
  const b = K[Math.min(i + 1, K.length - 1)];
  const f = b === a ? 0 : clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  for (let j = 0; j < DIFFICULTY_FIELDS.length; j++) out[DIFFICULTY_FIELDS[j]] = a[j] + (b[j] - a[j]) * f;
  out.t = t;
  out.greenMax = Math.floor(out.greenMax + 1e-6);
  out.rockMax = Math.floor(out.rockMax + 1e-6);
  out.level = clamp(t / K[K.length - 1][0], 0, 1);
  return out;
}

export class DifficultyManager {
  constructor() {
    this.p = sampleDifficulty(0);
  }
  update(t) {
    sampleDifficulty(t, this.p);
  }
}
