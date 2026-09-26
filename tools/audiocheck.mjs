// Renders every music track (first ~12s) and every SFX offline in Chromium
// and reports loudness, so audio regressions (silence, NaN, clipping) are
// caught without speakers.  node tools/audiocheck.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { startServer } from './serve.mjs';

const server = await startServer(8126);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:8126/tools/preview.html');
const report = await page.evaluate(async () => {
  const { Synth, midiToFreq } = await import('/src/audio/Synth.js');
  const { TRACKS, compileTrack } = await import('/src/audio/tracks.js');
  const { SFX } = await import('/src/audio/sfx.js');
  const stats = (buf) => {
    const d = buf.getChannelData(0);
    let sum = 0, peak = 0, nan = 0;
    for (let i = 0; i < d.length; i++) {
      const v = d[i];
      if (!Number.isFinite(v)) { nan++; continue; }
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    return { rms: +Math.sqrt(sum / d.length).toFixed(4), peak: +peak.toFixed(3), nan };
  };
  const out = { tracks: {}, sfx: {} };
  for (const tr of TRACKS) {
    const c = compileTrack(tr);
    const secs = 12;
    const ctx = new OfflineAudioContext(1, 44100 * secs, 44100);
    const s = new Synth(ctx);
    const bus = ctx.createGain();
    bus.gain.value = 0.8 * 0.7;
    bus.connect(ctx.destination);
    const stepDur = 60 / c.bpm / 4;
    for (const e of c.events) {
      const t = 0.05 + e.step * stepDur;
      if (t > secs - 0.5) break;
      const T = tr;
      if (e.ch === 'lead') s.tone(bus, t, midiToFreq(e.midi), e.dur * stepDur * 0.92, { wave: T.lead.wave, vol: T.lead.vol });
      else if (e.ch === 'bass') s.tone(bus, t, midiToFreq(e.midi), e.dur * stepDur * 0.85, { wave: T.bassInst.wave, vol: T.bassInst.vol });
      else if (e.ch === 'arp') s.tone(bus, t, midiToFreq(e.midi), stepDur * 0.8, { wave: T.arpInst.wave, vol: T.arpInst.vol });
      else if (e.ch === 'kick') s.kick(bus, t, 0.55);
      else if (e.ch === 'snare') s.snare(bus, t, 0.2 * (e.vol || 1));
      else if (e.ch === 'hat') s.hat(bus, t, 0.06 * (e.vol || 1));
    }
    const buf = await ctx.startRendering();
    out.tracks[tr.id] = { ...stats(buf), bars: c.length / 16, seconds: +(c.length * stepDur).toFixed(1), notes: c.events.length };
  }
  for (const name of Object.keys(SFX)) {
    const ctx = new OfflineAudioContext(1, 44100 * 2, 44100);
    const s = new Synth(ctx);
    const bus = ctx.createGain();
    bus.gain.value = 0.8;
    bus.connect(ctx.destination);
    SFX[name](s, bus, 0.01, { combo: 3, mult: 2, v: 0.5 });
    out.sfx[name] = stats(await ctx.startRendering());
  }
  return out;
});
console.log('TRACKS');
for (const [k, v] of Object.entries(report.tracks)) console.log(' ', k.padEnd(10), JSON.stringify(v));
console.log('SFX');
const bad = [];
for (const [k, v] of Object.entries(report.sfx)) {
  console.log(' ', k.padEnd(12), JSON.stringify(v));
  if (v.nan || v.rms < 0.0005 || v.peak > 1.0) bad.push(k);
}
for (const [k, v] of Object.entries(report.tracks)) if (v.nan || v.rms < 0.01 || v.peak > 1.0) bad.push(k);
console.log(bad.length ? `PROBLEMS: ${bad.join(', ')}` : 'audio OK');
await browser.close();
server.close();
process.exit(bad.length ? 1 : 0);
