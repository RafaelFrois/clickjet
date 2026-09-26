// ClickJet — central tuning. Everything balance-related lives here so it can
// be tweaked (and simulated with `npm run sim`) without touching the systems.

export const VIEW_W = 320;
export const VIEW_H = 180;

export const FIXED_DT = 1 / 120;
export const MAX_STEPS_PER_FRAME = 10;

// Area where coins/formations may appear (keeps them away from the HUD row).
export const PLAY_AREA = { x0: 10, y0: 28, x1: VIEW_W - 10, y1: VIEW_H - 8 };

export const PLAYER = {
  radius: 4.2,            // hitbox (sprite is ~20x13): a bit smaller than the hull
  pickupRadius: 9,        // coin pickup distance from the rocket center
  magnetRadius: 16,       // coins inside this get gently pulled in
  maxSpeed: 158,          // px/s (logical)
  followGain: 12,         // pointer follow: desired vel = distance * gain
  response: 32,           // velocity smoothing rate (higher = snappier)
  turnRate: 16,           // rad/s, visual rotation of the sprite
  touchSensitivity: 1.35, // relative drag multiplier on touch screens
  margin: 5,
  spawnGrace: 1.1,
};

export const SCORE = {
  coin: 5,
  rainbowCoin: 10,
  comboWindow: 2.6,     // seconds without collecting before the combo drops
  comboStep: 5,         // coins per multiplier level
  comboMaxMult: 4,
  sequenceBonus: 20,    // collecting a whole coin formation
  bonusRate: 10,        // power-up: points per second
  bonusDuration: 6,
  superBonusRate: 20,
  superBonusDuration: 8,
};

export const COINS = {
  targetCount: 7,
  spawnEvery: 0.55,
  life: [9, 12],
  rainbowLife: 6.5,
  formationLife: 8,
  rainbowChance: 0.11,
  riskyChance: 0.28,
  rainbowRiskyChance: 0.6,
  formationEvery: [7, 11],
  pathCoinsChance: 0.3,   // coins placed on an incoming meteor's path
  minDistFromPlayer: 20,
};

export const METEOR = {
  sizes: [
    { r: 3.4, speed: [115, 185], weight: 0.45 },  // small
    { r: 5.0, speed: [90, 150], weight: 0.38 },   // medium
    { r: 7.2, speed: [70, 115], weight: 0.17 },   // large
  ],
  minEntryDistFromPlayer: 60,
  rainbowEvery: [13, 20],
  rainbowFirst: 11,
  rainbowSpeed: [58, 78],
  rainbowRadius: 6,
  volleySpacing: 42,
};

export const ROCK = {
  sizes: [
    { px: 14, r: 5.2, weight: 0.35 },
    { px: 19, r: 7.2, weight: 0.42 },
    { px: 25, r: 9.6, weight: 0.23 },
  ],
  speed: [4, 11],
  minSpawnDistFromPlayer: 70,
};

export const GREEN = {
  headR: 7.2, headDY: -3,
  tentR: 5.2, tentDY: 5,
  speed: [20, 36],
  life: [16, 28],
  telegraph: 0.65,
  lungeTime: 0.85,
  lungeSpeed: 118,
  minSpawnDistFromPlayer: 80,
};

export const CHASER = {
  headR: 5.6, headDY: -2,
  tentR: 4.2, tentDY: 4,
  warnTime: 1.15,
  firstHuntAt: 10,
  stunTime: 1.5,
  historySeconds: 0.6,
};

// Difficulty keyframes: every system reads its parameters from the interpolated
// row for the current survival time. The curve flattens after ~3 minutes.
export const DIFFICULTY_KEYS = [
  //  t   meteorInt spd  aim   volley warn  greens gSpd  lunge rocks cCool hunt cSpd  turn react lead  drift
  [   0,  4.2,  0.85, 0.12, 0.00, 1.00, 1,  1.00, 0.00, 2,  11.0, 5.5, 0.60, 2.0, 0.45, 0.00, 14 ],
  [  10,  3.3,  0.90, 0.22, 0.00, 0.95, 2,  1.05, 0.00, 3,  11.0, 6.0, 0.62, 2.2, 0.42, 0.00, 16 ],
  [  20,  2.5,  0.98, 0.32, 0.05, 0.90, 2,  1.10, 0.10, 3,  10.0, 7.0, 0.66, 2.5, 0.38, 0.05, 18 ],
  [  35,  1.9,  1.04, 0.40, 0.12, 0.85, 3,  1.16, 0.20, 4,   8.5, 8.0, 0.70, 2.8, 0.33, 0.10, 20 ],
  [  50,  1.5,  1.10, 0.47, 0.20, 0.80, 3,  1.22, 0.30, 4,   7.0, 9.0, 0.74, 3.1, 0.28, 0.15, 22 ],
  [  70,  1.2,  1.17, 0.53, 0.27, 0.75, 4,  1.30, 0.40, 5,   6.0, 10.0, 0.78, 3.5, 0.24, 0.20, 25 ],
  [  95,  0.98, 1.24, 0.58, 0.33, 0.70, 4,  1.38, 0.48, 5,   5.2, 11.0, 0.82, 3.9, 0.21, 0.25, 28 ],
  [ 130,  0.82, 1.30, 0.61, 0.38, 0.66, 5,  1.46, 0.55, 6,   4.6, 12.0, 0.86, 4.3, 0.18, 0.30, 31 ],
  [ 180,  0.72, 1.36, 0.64, 0.42, 0.62, 5,  1.52, 0.60, 6,   4.2, 13.0, 0.89, 4.6, 0.16, 0.34, 34 ],
];
export const DIFFICULTY_FIELDS = [
  't', 'meteorInterval', 'meteorSpeed', 'aimChance', 'volleyChance', 'warnTime',
  'greenMax', 'greenSpeed', 'lungeChance', 'rockMax', 'chaserCooldown', 'huntDuration',
  'chaserSpeed', 'chaserTurn', 'chaserReaction', 'chaserLead', 'drift',
];

export const EVENTS = {
  firstAt: [24, 32],
  gap: [22, 34],
  defs: [
    { id: 'coinRush', minT: 15, weight: 3 },
    { id: 'meteorShower', minT: 28, weight: 3 },
    { id: 'invasion', minT: 38, weight: 2 },
    { id: 'superBonus', minT: 30, weight: 1.4 },
    { id: 'luckyStreak', minT: 20, weight: 1.2 },
  ],
};

export const SAVE_KEY = 'clickjet.save.v1';
