// InputManager: unifies mouse, touch, keyboard and gamepad.
//  - Gameplay reads a movement *intent* each frame (see getIntent()).
//  - UI reads a queue of discrete events (pointer down/up/move, nav keys).
// Mouse: the rocket follows the cursor. Touch: relative drag anywhere on the
// screen (the thumb never covers the rocket). Keys: WASD / arrows.

import { PLAYER } from '../config.js';

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};

export class InputManager {
  constructor(display) {
    this.display = display;
    this.keys = new Set();
    this.queue = [];          // UI events
    this.mouse = { x: 160, y: 100, inside: false, seen: false };
    this.lastDevice = 'mouse'; // 'mouse' | 'touch' | 'keys' | 'pad'
    this.drag = { id: null, dx: 0, dy: 0 };
    this.touchUI = false;      // a touch that started on a UI button
    this.pad = { ax: 0, ay: 0, connected: false, prevButtons: [] };
    this.onGesture = null;
    this.gestured = false;
    this.gameplayActive = false; // set by Game: route touches to drag
    this.uiHitTest = null;       // (x, y) => bool, UI element under pointer?
    this.bind();
  }

  bind() {
    const c = this.display.canvas;
    // Every gesture is offered to the audio unlock (iOS only unlocks audio
    // inside some gesture types, e.g. touchend rather than touchstart).
    const gesture = () => {
      this.gestured = true;
      if (this.onGesture) this.onGesture();
    };

    const onDown = (e) => {
      gesture();
      this.display.updateRect();
      const [x, y] = this.display.toLogical(e.clientX, e.clientY);
      const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
      this.lastDevice = touch ? 'touch' : 'mouse';
      if (!touch) Object.assign(this.mouse, { x, y, inside: true, seen: true });
      const onUI = this.uiHitTest ? this.uiHitTest(x, y) : false;
      if (touch && this.gameplayActive && !onUI && this.drag.id === null) {
        this.drag.id = e.pointerId;
        this.drag.lx = e.clientX;
        this.drag.ly = e.clientY;
      }
      this.queue.push({ type: 'down', x, y, id: e.pointerId, touch });
      try { c.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      e.preventDefault();
    };
    const onMove = (e) => {
      const [x, y] = this.display.toLogical(e.clientX, e.clientY);
      const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (!touch) {
        const moved = Math.abs(x - this.mouse.x) + Math.abs(y - this.mouse.y) > 0.5;
        Object.assign(this.mouse, { x, y, inside: true, seen: true });
        if (moved && this.lastDevice !== 'touch') this.lastDevice = 'mouse';
      }
      if (touch && e.pointerId === this.drag.id) {
        const k = PLAYER.touchSensitivity / this.display.pxPerUnit;
        this.drag.dx += (e.clientX - this.drag.lx) * k;
        this.drag.dy += (e.clientY - this.drag.ly) * k;
        this.drag.lx = e.clientX;
        this.drag.ly = e.clientY;
      }
      this.queue.push({ type: 'move', x, y, id: e.pointerId, touch });
    };
    const onUp = (e) => {
      gesture();
      const [x, y] = this.display.toLogical(e.clientX, e.clientY);
      const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
      if (e.pointerId === this.drag.id) this.drag.id = null;
      this.queue.push({ type: e.type === 'pointercancel' ? 'cancel' : 'up', x, y, id: e.pointerId, touch });
    };

    c.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    c.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') this.mouse.inside = false;
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    // stop iOS double-tap zoom / scroll bounce
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      gesture();
      if (e.repeat && !MOVE_KEYS[e.code]) {
        // allow repeat for menu navigation only
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) return;
      }
      if (!e.repeat) this.keys.add(e.code);
      if (MOVE_KEYS[e.code]) this.lastDevice = 'keys';
      const nav = keyToNav(e.code);
      if (nav) this.queue.push({ type: 'nav', nav, code: e.code, repeat: e.repeat });
      if (MOVE_KEYS[e.code] || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.drag.id = null;
    });
  }

  /** Poll gamepad (call once per frame). Emits nav events for UI. */
  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && [...pads].find((p) => p && p.connected);
    this.pad.connected = !!gp;
    if (!gp) return;
    let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    if (btn(14)) ax = -1;
    if (btn(15)) ax = 1;
    if (btn(12)) ay = -1;
    if (btn(13)) ay = 1;
    const mag = Math.hypot(ax, ay);
    if (mag < 0.2) ax = ay = 0;
    else if (mag > 1) { ax /= mag; ay /= mag; }
    if (ax || ay) this.lastDevice = 'pad';
    // UI navigation edges
    const prev = this.pad.prevButtons;
    const edge = (i) => btn(i) && !prev[i];
    const nav = [];
    if (edge(0)) nav.push('confirm');
    if (edge(1)) nav.push('back');
    if (edge(9)) nav.push('pause');
    if (edge(12)) nav.push('up');
    if (edge(13)) nav.push('down');
    if (edge(14)) nav.push('left');
    if (edge(15)) nav.push('right');
    const stickY = gp.axes[1] || 0, stickX = gp.axes[0] || 0;
    const prevAy = this.pad.stickY || 0, prevAx = this.pad.stickX || 0;
    if (stickY < -0.6 && prevAy >= -0.6) nav.push('up');
    if (stickY > 0.6 && prevAy <= 0.6) nav.push('down');
    if (stickX < -0.6 && prevAx >= -0.6) nav.push('left');
    if (stickX > 0.6 && prevAx <= 0.6) nav.push('right');
    this.pad.stickY = stickY;
    this.pad.stickX = stickX;
    for (const n of nav) {
      this.queue.push({ type: 'nav', nav: n, pad: true });
      if (n === 'confirm') {
        this.gestured = true;
        if (this.onGesture) this.onGesture();
      }
    }
    this.pad.prevButtons = gp.buttons.map((b) => b.pressed);
    this.pad.ax = ax;
    this.pad.ay = ay;
  }

  /** Movement intent for the rocket this frame. Consumes touch drag delta. */
  getIntent() {
    let kx = 0, ky = 0;
    for (const code of this.keys) {
      const v = MOVE_KEYS[code];
      if (v) {
        kx += v[0];
        ky += v[1];
      }
    }
    if (kx || ky) {
      const n = Math.hypot(kx, ky);
      return { mode: 'keys', ax: kx / n, ay: ky / n };
    }
    if (this.pad.ax || this.pad.ay) return { mode: 'keys', ax: this.pad.ax, ay: this.pad.ay };
    if (this.lastDevice === 'touch') {
      const dx = this.drag.dx, dy = this.drag.dy;
      this.drag.dx = this.drag.dy = 0;
      return { mode: 'drag', dx, dy };
    }
    if (this.lastDevice === 'mouse' && this.mouse.seen) return { mode: 'point', x: this.mouse.x, y: this.mouse.y };
    return { mode: 'none' };
  }

  resetDrag() {
    this.drag.dx = this.drag.dy = 0;
  }

  drainQueue() {
    const q = this.queue;
    this.queue = [];
    return q;
  }

  get isTouch() {
    return this.lastDevice === 'touch';
  }
}

function keyToNav(code) {
  switch (code) {
    case 'ArrowUp': case 'KeyW': return 'up';
    case 'ArrowDown': case 'KeyS': return 'down';
    case 'ArrowLeft': case 'KeyA': return 'left';
    case 'ArrowRight': case 'KeyD': return 'right';
    case 'Enter': case 'Space': case 'NumpadEnter': return 'confirm';
    case 'Escape': case 'Backspace': return 'back';
    case 'KeyP': return 'pause';
    case 'KeyM': return 'mute';
    case 'KeyR': return 'restart';
    case 'Tab': return 'next';
    default: return null;
  }
}
