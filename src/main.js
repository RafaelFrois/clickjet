// ClickJet — entry point.
import { Game } from './Game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.boot();

// Debug / automated-test handle (harmless in production).
window.__clickjet = game;

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
