// All pixel-art sprites, authored as character grids and baked into canvases
// at boot. Rotating objects get pre-rendered rotation frames.

import { C } from './palette.js';
import {
  Img, imgFromRows, imgToCanvas, recolor, blit, buildRotations, hexToPacked, outline,
} from './pixel.js';
import { Rng } from '../util/rng.js';

// ---------------------------------------------------------------------------
// Rocket (faces right at angle 0). 22 x 13, hull centred on row 6.
const ROCKET_PAL = {
  o: C.rOut, d: C.rDark, b: C.rBody, l: C.rLight, g: C.rGlass, w: C.rGlint, n: C.rNozzle,
};
const ROCKET = [
  '...ooo................',
  '...oloo...............',
  '....olbo..............',
  '....odlbo.............',
  '..oooooooooooooo......',
  '.nodllllllllllllooo...',
  '.nodbbbbbbbbbgwwbbllo.',
  '.nodbbbbbbbbbgggbbbbbo',
  '.noddddddddddddddddo..',
  '..oooooooooooooooo....',
  '....oddbo.............',
  '...oddoo..............',
  '...ooo................',
];

// Engine flame frames, drawn to the left of the nozzle. 6 x 5.
const FLAME_PAL = { w: C.fWhite, y: C.fYellow, o: C.fOrange, r: C.fRed };
const FLAMES = [
  ['......', '...roo', '..royw', '...roo', '......'],        // idle a
  ['......', '....ro', '...ryw', '....ro', '......'],        // idle b
  ['...rro', '.rrooy', 'rooyyw', '.rrooy', '...rro'],        // thrust a
  ['....ro', '..rroy', '.rooyw', '..rroy', '....ro'],        // thrust b
];

// ---------------------------------------------------------------------------
// Coins
const COIN_PAL = { o: C.cOut, d: C.cDark, m: C.cMid, l: C.cLight };
const COIN_FRAMES = [
  ['..ooo..', '.ommmo.', 'omlmmdo', 'omlmmdo', 'ommmmdo', '.oddmo.', '..ooo..'],
  ['..oo...', '.omdo..', '.olmdo.', '.olmdo.', '.ommdo.', '.oddo..', '..oo...'].map((r) => r),
  ['...o...', '..odo..', '..omo..', '..olo..', '..omo..', '..odo..', '...o...'],
  ['...oo..', '..odmo.', '.odmlo.', '.odmlo.', '.odmmo.', '..oddo.', '...oo..'],
];

// Rainbow coin: rings get their colors swapped per frame (hue cycling).
const RCOIN = [
  '...aaa...',
  '.aabbbaa.',
  '.abcccba.',
  'abcdwdcba',
  'abcwwwcba',
  'abcdwdcba',
  '.abcccba.',
  '.aabbbaa.',
  '...aaa...',
];

// ---------------------------------------------------------------------------
// Green alien (the angry octopus from the original). 20 x 22.
const GREEN_PAL = { o: C.gOut, d: C.gDark, m: C.gMid, l: C.gLight, k: '#000000', w: '#ffffff' };
const GREEN_HEAD = [
  '.......oooooo.......',
  '.....oommmmmmoo.....',
  '....omllllmmmmmo....',
  '...omlllmmmmmmmdo...',
  '..omllmmmmmmmmmmdo..',
  '..omlmmmmmmmmmmmdo..',
  '.omlmkkmmmmmmkkmmdo.',
  '.ommmmkkkmmkkkmmmdo.',
  '.ommmwkkmmmmkkwmmdo.',
  '.ommmkkkmmmmkkkmmdo.',
  '.ommmmmmmmmmmmmmmdo.',
  '.odmmmmmkkkkmmmmddo.',
  '..odmmmkmmmmkmmddo..',
  '..oddmmmmmmmmmmddo..',
];
const GREEN_BLINK_EYES = [
  '.omlmkkmmmmmmkkmmdo.',
  '.ommmmkkkmmkkkmmmdo.',
  '.ommmmmmmmmmmmmmmdo.',
  '.ommmkkkmmmmkkkmmdo.',
];
const GREEN_ANGRY_EYES = [
  '.omlmkkmmmmmmkkmmdo.',
  '.ommmmkkkmmkkkmmmdo.',
  '.ommmrkkmmmmkkrmmdo.',
  '.ommmkkkmmmmkkkmmdo.',
];
const GREEN_TENTACLES = [
  [
    '..odmmmmmmmmmmmmdo..',
    '.omdmdmdmdmmdmdmdmo.',
    '.omdmdmdmdmmdmdmdmo.',
    'omd.omd.omdmo.dmo.dm',
    'om..om..om.om..mo..m',
    'o..om...om..om..mo.o',
    '..om....o....o...mo.',
    '..o...............o.',
  ],
  [
    '..odmmmmmmmmmmmmdo..',
    '.omdmdmdmdmmdmdmdmo.',
    '.omdmdmdmdmmdmdmdmo.',
    '.omd.omdmmdmo.dmo.o.',
    '.om..om.om.om..mo.o.',
    '..mo..mo.om..om.om..',
    '...mo..o..o...o..om.',
    '....o.............o.',
  ],
];

// Purple chaser: smaller, taller head, glowing red eyes, fangs. 16 x 19.
const PURPLE_PAL = { o: C.pOut, d: C.pDark, m: C.pMid, l: C.pLight, k: '#000000', e: C.pEye, w: '#ffffff' };
const PURPLE_HEAD = [
  '.....oooooo.....',
  '...oommmmmmoo...',
  '..omllmmmmmmdo..',
  '.omllmmmmmmmmdo.',
  '.omlmmmmmmmmmdo.',
  'omlmkkmmmmkkmmdo',
  'ommmkekmmkekmmdo',
  'ommmkkkmmkkkmmdo',
  'ommmmmmmmmmmmmdo',
  'odmmkwkwkwkmmddo',
  '.odmmkkkkkkmmdo.',
  '.oddmmmmmmmmddo.',
];
const PURPLE_TENTACLES = [
  [
    '.omdmdmddmdmdmo.',
    '.omdmdmddmdmdmo.',
    'omd.mdo..odm.dmo',
    'om..md....dm..mo',
    'o..om......mo..o',
    '..om........mo..',
    '..o..........o..',
  ],
  [
    '.omdmdmddmdmdmo.',
    '.omdmdmddmdmdmo.',
    '.omd.mdoodm.dmo.',
    '..md..mo.om..dm.',
    '...mo..o.o..om..',
    '....o.......o...',
    '................',
  ],
];

// ---------------------------------------------------------------------------
// Domus Arcis signature logo: a diagonal sword above the name.
const DOMUS_SWORD = [
  '...............w#',
  '..............w#w',
  '.............w#w.',
  '............w#w..',
  '...........w#w...',
  '..........w#w....',
  '.........w#w.....',
  '........w#w......',
  '....#..w#w.......',
  '....##w#w........',
  '.....##w.........',
  '....#w##.........',
  '...#w#..#........',
  '..#w#............',
  '.#w#.............',
  '##...............',
];

// ---------------------------------------------------------------------------
// Builders

function coinFrames() {
  return COIN_FRAMES.map((rows, i) => imgToCanvas(imgFromRows(rows, COIN_PAL, `coin${i}`)));
}

function rainbowCoinFrames() {
  const cycle = ['#ff3b3b', '#ffe53b', '#4dff6a', '#3bc8ff', '#b35bff'];
  const frames = [];
  for (let f = 0; f < cycle.length; f++) {
    const pal = {
      a: '#2a0f4a',
      b: cycle[f % 5],
      c: cycle[(f + 1) % 5],
      d: cycle[(f + 2) % 5],
      w: '#ffffff',
    };
    frames.push(imgToCanvas(imgFromRows(RCOIN, pal, 'rcoin')));
  }
  return frames;
}

function rocketFrames() {
  const body = imgFromRows(ROCKET, ROCKET_PAL, 'rocket');
  const flames = FLAMES.map((f, i) => imgFromRows(f, FLAME_PAL, `flame${i}`));
  // Composite: 5px of flame room on the left of the hull.
  const W = body.w + 5, H = body.h;
  const pivotX = 5 + 11, pivotY = 6.5;
  const sets = [];
  for (const fl of flames) {
    const comp = new Img(W, H);
    blit(comp, fl, 0, 4);
    blit(comp, body, 5, 0);
    sets.push(buildRotations(comp, 32, pivotX, pivotY));
  }
  const plain = new Img(W, H);
  blit(plain, body, 5, 0);
  return { flames: sets, plain: buildRotations(plain, 32, pivotX, pivotY), bodyImg: body };
}

function greenFrames() {
  const make = (eyes, tent) => {
    const head = GREEN_HEAD.slice();
    if (eyes) for (let i = 0; i < 4; i++) head[6 + i] = eyes[i];
    return imgToCanvas(imgFromRows(head.concat(tent), { ...GREEN_PAL, r: C.red }, 'green'));
  };
  return {
    idle: GREEN_TENTACLES.map((t) => make(null, t)),
    blink: GREEN_TENTACLES.map((t) => make(GREEN_BLINK_EYES, t)),
    angry: GREEN_TENTACLES.map((t) => make(GREEN_ANGRY_EYES, t)),
  };
}

function purpleFrames() {
  const frames = PURPLE_TENTACLES.map((t) => imgFromRows(PURPLE_HEAD.concat(t), PURPLE_PAL, 'purple'));
  const ghost = frames.map((f) =>
    imgToCanvas(recolor(f, {
      [C.pOut]: '#3a1266', [C.pDark]: '#5a1b9e', [C.pMid]: '#6a2bb0', [C.pLight]: '#7d3dc8',
      '#000000': '#3a1266', [C.pEye]: '#ff3a6a', '#ffffff': '#7d3dc8',
    })),
  );
  const flash = frames.map((f) =>
    imgToCanvas(recolor(f, {
      [C.pOut]: '#ffffff', [C.pDark]: '#ffffff', [C.pMid]: '#ffffff', [C.pLight]: '#ffffff',
    })),
  );
  return { idle: frames.map(imgToCanvas), ghost, flash };
}

/** Procedural asteroid: lumpy disc, top-left lighting, craters, outline. */
function makeRockImg(size, seed) {
  const rng = new Rng(seed);
  const img = new Img(size, size);
  const c = (size - 1) / 2;
  const R = size / 2 - 0.8;
  const lobes = [];
  for (let i = 0; i < 4; i++) lobes.push([rng.range(0, Math.PI * 2), rng.range(0.04, 0.11), rng.int(2, 4)]);
  const radiusAt = (a) => {
    let r = R;
    for (const [ph, amp, k] of lobes) r -= R * amp * (0.5 + 0.5 * Math.sin(a * k + ph));
    return r;
  };
  const col = {
    out: hexToPacked(C.kOut), dark: hexToPacked(C.kDark), mid: hexToPacked(C.kMid),
    light: hexToPacked(C.kLight), crater: hexToPacked(C.kCrater),
  };
  const inside = (x, y) => {
    const dx = x - c, dy = y - c;
    return Math.hypot(dx, dy) <= radiusAt(Math.atan2(dy, dx));
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!inside(x, y)) continue;
      // light from top-left
      const lx = (x - c) / R, ly = (y - c) / R;
      const shade = -(lx + ly) * 0.7 + rng.range(-0.12, 0.12);
      img.set(x, y, shade > 0.45 ? col.light : shade < -0.45 ? col.dark : col.mid);
    }
  // craters
  const craters = Math.max(1, Math.round(size / 6));
  for (let i = 0; i < craters; i++) {
    const cr = rng.range(1.2, Math.max(1.6, size / 7));
    const a = rng.range(0, Math.PI * 2), d = rng.range(0, R * 0.55);
    const cx = c + Math.cos(a) * d, cy = c + Math.sin(a) * d;
    for (let y = Math.floor(cy - cr - 1); y <= cy + cr + 1; y++)
      for (let x = Math.floor(cx - cr - 1); x <= cx + cr + 1; x++) {
        if (!img.get(x, y)) continue;
        const dd = Math.hypot(x - cx, y - cy);
        if (dd <= cr) img.set(x, y, col.crater);
        else if (dd <= cr + 1 && x - cx > 0 && y - cy > 0) img.set(x, y, col.light);
      }
  }
  // outline (inner edge pixels become outline for a chunky look)
  const src = img.clone();
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!src.get(x, y)) continue;
      if (!src.get(x - 1, y) || !src.get(x + 1, y) || !src.get(x, y - 1) || !src.get(x, y + 1)) img.set(x, y, col.out);
    }
  return img;
}

function rockSets() {
  const sizes = [14, 19, 25];
  const sets = [];
  sizes.forEach((s, si) => {
    const variants = [];
    for (let v = 0; v < 3; v++) variants.push(buildRotations(makeRockImg(s, 1000 + si * 17 + v * 101), 16));
    sets.push(variants);
  });
  return sets;
}

/** Fireball meteor facing +x (travel direction). Trail to the left. */
function makeMeteorImg(coreR, trailLen, palette, seed, flicker) {
  const rng = new Rng(seed);
  const shellR = coreR + 2.2;
  const w = Math.ceil(trailLen + shellR * 2 + 3);
  const h = Math.ceil(shellR * 2 + 5);
  const cx = w - shellR - 2, cy = (h - 1) / 2;
  const img = new Img(w, h);
  const P = palette.map((c) => hexToPacked(c));
  // P: [dark, red, orange, yellow, light, coreOut, coreDark, coreMid, coreLight]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      let v = -1;
      if (dx <= 0) {
        // flame tail: tapered cone with wavy tongues
        const t = -dx / trailLen; // 0 at head, 1 at tail end
        if (t <= 1) {
          const wave = Math.sin(t * 9 + flicker * 2.1 + dy * 0.9) * 0.9;
          const halfW = shellR * (1 - t) ** 1.25 + wave;
          if (Math.abs(dy) <= halfW) {
            const edge = Math.abs(dy) / Math.max(0.5, halfW);
            v = t > 0.75 ? 0 : edge > 0.72 ? (t > 0.45 ? 0 : 1) : t > 0.5 ? 1 : edge > 0.35 ? 2 : 3;
          }
        }
      }
      if (d <= shellR) {
        const e = d / shellR;
        v = Math.max(v, e > 0.85 ? 2 : e > 0.6 ? 3 : 4);
      }
      if (v >= 0) img.set(x, y, P[v]);
    }
  }
  // streak tongues
  for (let i = 0; i < 3; i++) {
    const oy = Math.round(cy + rng.range(-shellR, shellR) * 0.8);
    const len = trailLen * rng.range(0.6, 1.05);
    for (let x = 0; x < len; x++) {
      const px = Math.round(cx - shellR * 0.6 - x);
      if (rng.chance(0.18 + x / len * 0.3)) continue;
      img.set(px, oy, P[x > len * 0.6 ? 0 : x > len * 0.3 ? 1 : 2]);
    }
  }
  // rocky core
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x - cx + 0.6, dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d > coreR) continue;
      const shade = (dx - dy) / coreR;
      let v = d > coreR - 0.9 ? 5 : shade > 0.35 ? 8 : shade < -0.35 ? 6 : 7;
      if (coreR > 3 && rng.chance(0.12) && d < coreR - 1.2) v = 6;
      img.set(x, y, P[v]);
    }
  return { img, pivotX: cx + 0.5, pivotY: cy + 0.5 };
}

const METEOR_FIRE = [C.mDark, C.mRed, C.mOrange, C.mYellow, C.mLight, C.kOut, C.kCrater, C.kDark, C.kMid];
const METEOR_RAINBOW = [
  ['#5b1a9e', '#ff4fd8', '#3bc8ff', '#4dff6a', '#ffffff', '#1c3f8a', '#3bc8ff', '#b8f4ff', '#ffffff'],
  ['#1a4a9e', '#3bc8ff', '#4dff6a', '#ffe53b', '#ffffff', '#6a1c8a', '#ff4fd8', '#ffc4f0', '#ffffff'],
  ['#9e1a4a', '#ffe53b', '#ff9a1f', '#ff4fd8', '#ffffff', '#1c8a4a', '#4dff6a', '#c4ffd0', '#ffffff'],
];

function meteorSets() {
  const defs = [
    { coreR: 2.6, trail: 13 },
    { coreR: 3.8, trail: 19 },
    { coreR: 5.6, trail: 26 },
  ];
  const fire = defs.map((d, i) =>
    [0, 1].map((f) => {
      const m = makeMeteorImg(d.coreR, d.trail, METEOR_FIRE, 77 + i * 13 + f, f);
      return buildRotations(m.img, 32, m.pivotX, m.pivotY);
    }),
  );
  const rainbow = METEOR_RAINBOW.map((pal, f) => {
    const m = makeMeteorImg(4.2, 22, pal, 555 + f, f);
    return buildRotations(m.img, 32, m.pivotX, m.pivotY);
  });
  const superRainbow = METEOR_RAINBOW.map((pal, f) => {
    const m = makeMeteorImg(6.2, 30, pal, 909 + f, f);
    return buildRotations(m.img, 32, m.pivotX, m.pivotY);
  });
  return { fire, rainbow, superRainbow };
}

// Small decor for the far background (low contrast on purpose).
const PLANET = [
  '........oooooo........',
  '......oollllmmoo......',
  '.....ollllmmmmmdo.....',
  'rrr.olllmmmmmmmddo....',
  '..rrrrlmmmmmmmmddo....',
  '...olmrrrrmmmmmdddo...',
  '...ommmmmrrrrrmdddo...',
  '...odmmmmmmmmrrrrrr...',
  '....odmmmmmmmddo..rrrr',
  '....oddmmmmmddo.......',
  '.....odddddddo........',
  '.......oooooo.........',
];

function decorFrames() {
  const p1 = imgToCanvas(imgFromRows(PLANET, { o: '#10122e', l: '#4a4f9a', m: '#30347a', d: '#1c1f50', r: '#6a5a9a' }, 'planet'));
  const p2 = imgToCanvas(imgFromRows(PLANET, { o: '#1e0f1a', l: '#8a4a5a', m: '#5c2c40', d: '#3a1a2a', r: '#4a6a7a' }, 'planet2'));
  return { planets: [p1, p2] };
}

function domusLogo() {
  const img = imgFromRows(DOMUS_SWORD, { '#': '#ffffff', w: '#9aa0b8' }, 'domus');
  return imgToCanvas(img);
}

/** Speaker icon (on / off) in the original's white outline style. 15 x 13 */
const SPEAKER_ON = [
  '.....##......#.',
  '....#.#....#..#',
  '...#..#..#..#.#',
  '####..#...#.#.#',
  '#.....#.#.#.#.#',
  '#.....#.#.#.#.#',
  '#.....#.#.#.#.#',
  '####..#...#.#.#',
  '...#..#..#..#.#',
  '....#.#....#..#',
  '.....##......#.',
];
const SPEAKER_OFF = [
  '.....##........',
  '....#.#........',
  '...#..#........',
  '####..#.#...#..',
  '#.....#..#.#...',
  '#.....#...#....',
  '#.....#..#.#...',
  '####..#.#...#..',
  '...#..#........',
  '....#.#........',
  '.....##........',
];

const ICONS = {
  clock: ['..###..', '.#####.', '##.####', '##.####', '##...##', '.#####.', '..###..'],
  clockInk: ['.......', '.......', '..#....', '..#....', '..###..', '.......', '.......'],
  pause: ['##.##', '##.##', '##.##', '##.##', '##.##'],
  gear: ['..#.#..', '.#####.', '##...##', '.#.#.#.', '##...##', '.#####.', '..#.#..'],
  restart: [
    '..####.#',
    '.#....##',
    '#....###',
    '#.......',
    '#......#',
    '.#....#.',
    '..####..',
  ],
  play: ['#....', '###..', '#####', '###..', '#....'],
  star: ['..#..', '..#..', '#####', '.###.', '.#.#.'],
  coinSmall: ['.##.', '#yy#', '#yy#', '.##.'],
};

function iconCanvas(rows, color, extra = {}) {
  return imgToCanvas(imgFromRows(rows, { '#': color, ...extra }, 'icon'));
}

export function buildSprites() {
  const t0 = performance.now();
  const s = {
    rocket: rocketFrames(),
    coin: coinFrames(),
    rainbowCoin: rainbowCoinFrames(),
    green: greenFrames(),
    purple: purpleFrames(),
    rocks: rockSets(),
    meteors: meteorSets(),
    decor: decorFrames(),
    domus: domusLogo(),
    speakerOn: iconCanvas(SPEAKER_ON, '#ffffff'),
    speakerOff: iconCanvas(SPEAKER_OFF, '#ffffff'),
    clock: iconCanvas(ICONS.clock, '#ffffff'),
    clockInk: iconCanvas(ICONS.clockInk, '#000000'),
    pause: iconCanvas(ICONS.pause, '#ffffff'),
    gear: iconCanvas(ICONS.gear, '#ffffff'),
    restart: iconCanvas(ICONS.restart, C.uiLighter),
    restartWhite: iconCanvas(ICONS.restart, '#ffffff'),
    play: iconCanvas(ICONS.play, '#ffffff'),
    star: iconCanvas(ICONS.star, C.yellow),
    coinIcon: iconCanvas(ICONS.coinSmall, C.cOut, { y: C.cMid }),
    rocketIcon: imgToCanvas(outline(imgFromRows(ROCKET, ROCKET_PAL, 'rocket'), '#000000')),
  };
  s.buildMs = performance.now() - t0;
  return s;
}
