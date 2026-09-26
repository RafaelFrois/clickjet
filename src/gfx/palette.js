// ClickJet palette — derived from the original game's screenshots:
// pure black space, white stars, saturated blue UI plaques, yellow/orange
// accents, red GAME OVER, green + purple aliens, brown rocks, blue rocket.

export const C = {
  black: '#000000',
  white: '#ffffff',
  offWhite: '#e8ecff',
  grey: '#9aa0b8',
  greyDark: '#4a4f66',
  greyDeep: '#23263a',

  // UI plaques (the "blue board" look of the original HUD / menu)
  uiBlue: '#1a1aee',
  uiBlueHi: '#2e2eff',
  uiLight: '#5d5dff',
  uiLighter: '#8f8fff',
  uiDark: '#0c0c96',
  uiDeep: '#070760',
  uiNavy: '#04042e',

  yellow: '#ffe81a',
  yellowDark: '#c9a800',
  orange: '#ffa31a',
  orangeDark: '#b86a00',
  red: '#ff2020',
  redDark: '#9a0c0c',
  cyan: '#5ef2ff',
  pink: '#ff5ccf',

  // rocket
  rOut: '#0d1a44',
  rDark: '#2a4a9e',
  rBody: '#4a7ddc',
  rLight: '#8cbcff',
  rGlass: '#6fe0ff',
  rGlint: '#f2ffff',
  rNozzle: '#5a6078',

  // engine flame
  fWhite: '#fffbd6',
  fYellow: '#ffd83a',
  fOrange: '#ff8a1c',
  fRed: '#e2401a',
  fDark: '#6e1c0c',

  // coin
  cOut: '#8a4800',
  cDark: '#d27e00',
  cMid: '#ffbd14',
  cLight: '#fff09a',

  // green alien
  gOut: '#0a3a12',
  gDark: '#1c8a2a',
  gMid: '#3edc48',
  gLight: '#a6ff90',

  // purple chaser
  pOut: '#1e0736',
  pDark: '#5a1b9e',
  pMid: '#9544e6',
  pLight: '#d49bff',
  pEye: '#ff3a6a',

  // rocks
  kOut: '#26170c',
  kDark: '#553820',
  kMid: '#805b38',
  kLight: '#ad8757',
  kCrater: '#3f2716',

  // meteor fire (orange, like the original fireball)
  mDark: '#7a2408',
  mRed: '#d8400e',
  mOrange: '#ff7a14',
  mYellow: '#ffb830',
  mLight: '#ffe38a',
};

export const RAINBOW = ['#ff3b3b', '#ff9a1f', '#ffe53b', '#4dff6a', '#3bc8ff', '#7d5bff', '#ff4fd8'];

/** Flame particle ramp, hot -> cold. */
export const FIRE_RAMP = [C.fWhite, C.fYellow, C.fOrange, C.fRed, C.fDark];

/** Combo multiplier colors for score popups (x1..x4). */
export const COMBO_COLORS = [C.yellow, C.orange, C.pink, C.cyan];
