// Builds the soundtrack for an episode from its timeline: an original synthesized score (no samples,
// no licensed loops), sound effects cued from the UI events, room/street ambience, and the voice lines,
// with the music ducked under dialogue. Writes public/episodes/<id>/mix.wav plus stems in out/<id>/.
//   node scripts/audio.mjs ep01
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, epPublic, readWav, writeWav, isMain } from './lib.mjs';

const SR = 44100;
const TAU = Math.PI * 2;

let seed = 1234567;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;

const track = (n) => ({ L: new Float32Array(n), R: new Float32Array(n) });
const add = (tr, t0, buf, gain = 1, pan = 0) => {
  const s0 = Math.round(t0 * SR), gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < buf.length; i++) {
    const k = s0 + i;
    if (k < 0 || k >= tr.L.length) continue;
    tr.L[k] += buf[i] * gl;
    tr.R[k] += buf[i] * gr;
  }
};
const gen = (dur, fn) => {
  const n = Math.max(1, Math.round(dur * SR)), b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = fn(i / SR, i);
  return b;
};
const lowpass = (buf, cutoff) => {
  const a = 1 - Math.exp((-TAU * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) buf[i] = y += a * (buf[i] - y);
  return buf;
};
const highpass = (buf, cutoff) => {
  const a = 1 - Math.exp((-TAU * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = buf[i] - y; }
  return buf;
};
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------------- instruments
const kick = (g = 1) => gen(0.32, (t) => Math.sin(TAU * (45 * t + (75 / 18) * (1 - Math.exp(-18 * t)))) * Math.exp(-9 * t) * g);
const clap = (g = 1) => highpass(gen(0.18, (t) => rnd() * (Math.exp(-28 * t) + 0.6 * Math.exp(-50 * Math.abs(t - 0.012))) * g), 900);
const shaker = (g = 1) => highpass(gen(0.06, (t) => rnd() * Math.exp(-70 * t) * g), 5000);
const hat = (g = 1) => highpass(gen(0.04, (t) => rnd() * Math.exp(-110 * t) * g), 7000);
const bass = (f, d, g = 1) => gen(d, (t) => Math.tanh(1.6 * Math.sin(TAU * f * t * (1 + 0.02 * Math.exp(-30 * t)))) * Math.min(1, t * 200) * Math.exp(-2.2 * t) * g);
const marimba = (f, g = 1) => gen(0.5, (t) => (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 4 * t) * Math.exp(-30 * t)) * Math.exp(-7 * t) * Math.min(1, t * 400) * g);
const pluck = (f, g = 1) => lowpass(gen(0.7, (t) => (((f * t) % 1) * 2 - 1) * Math.exp(-5 * t) * g), 1800);
const pad = (fs, d, g = 1) => lowpass(gen(d, (t) => fs.reduce((a, f) => a + Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.005 * t), 0) / fs.length * Math.min(1, t / 0.4) * Math.min(1, (d - t) / 0.4) * g), 1200);
const talkingDrum = (f, g = 1) => gen(0.3, (t) => Math.sin(TAU * f * t * (1 + 0.5 * Math.exp(-14 * t))) * Math.exp(-10 * t) * g);

// ---------------------------------------------------------------- score
const BPM = 104, BEAT = 60 / BPM, STEP = BEAT / 4;
const CHORDS = [ // Am F C G (vi IV I V), as MIDI roots + triads
  { root: 45, tri: [57, 60, 64] }, { root: 41, tri: [57, 60, 65] }, { root: 48, tri: [55, 60, 64] }, { root: 43, tri: [55, 59, 62] },
];
const HOOK = [69, -1, 72, 74, -1, 72, 69, -1, 76, -1, 74, 72, -1, 69, 67, -1]; // A minor pentatonic riff

const writeScore = (music, sections, total) => {
  for (const sec of sections) {
    const { mood, t0, t1 } = sec;
    const firstStep = Math.ceil(t0 / STEP), lastStep = Math.floor(t1 / STEP);
    for (let k = firstStep; k < lastStep; k++) {
      const t = k * STEP, inBar = k % 16, bar = Math.floor(k / 16), ch = CHORDS[bar % 4];
      if (mood === 'lagos' || mood === 'end') {
        if ([0, 6, 8, 11].includes(inBar)) add(music, t, kick(0.9));
        if ([4, 12].includes(inBar)) add(music, t, clap(0.45), 0, 0.1);
        add(music, t, shaker(inBar % 4 === 2 ? 0.28 : 0.14), 0, 0.35);
        if ([0, 3, 6, 10, 14].includes(inBar)) add(music, t, bass(midi(ch.root), STEP * 2.6, 0.55));
        const n = HOOK[inBar];
        if (n > 0) add(music, t, marimba(midi(n), 0.3), 0, -0.25);
        if (inBar === 15 && bar % 2) add(music, t, talkingDrum(220, 0.35), 0, 0.2);
        if (inBar === 0) add(music, t, pad(ch.tri.map(midi), BEAT * 4, 0.1));
      } else if (mood === 'london') {
        // the same tune, cold: half-time kick, no clap, plucks low-passed, a grey pad
        if (inBar === 0) add(music, t, kick(0.6));
        if (inBar === 0) add(music, t, pad(ch.tri.map((m) => midi(m - 12)), BEAT * 4, 0.16));
        if (inBar % 4 === 2) add(music, t, hat(0.1), 0, 0.3);
        const n = HOOK[inBar];
        if (n > 0 && inBar % 2 === 0) add(music, t, lowpass(pluck(midi(n - 12), 0.22), 900), 0, -0.2);
        if (inBar === 0 || inBar === 10) add(music, t, bass(midi(ch.root), BEAT * 2, 0.35));
      } else if (mood === 'tension') {
        if (inBar % 2 === 0) add(music, t, bass(midi(45), STEP * 1.6, 0.32));
        if (inBar % 4 === 0) add(music, t, kick(0.45));
        add(music, t, hat(inBar % 4 === 2 ? 0.12 : 0.05), 0, 0.3);
        if (inBar === 0) add(music, t, pad([midi(57), midi(60), midi(63)], BEAT * 4, 0.12));
      } else if (mood === 'decision') {
        const prog = (t - t0) / Math.max(0.1, t1 - t0);
        if (inBar % 4 === 0) add(music, t, kick(0.8));
        if (prog > 0.5 && inBar % 2 === 0) add(music, t, clap(0.18 + 0.3 * prog));
        add(music, t, shaker(0.12), 0, 0.3);
        if (inBar % 4 === 0) add(music, t, bass(midi(ch.root), BEAT, 0.45));
        if (inBar === 0) add(music, t, pad(ch.tri.map(midi), BEAT * 4, 0.14));
      }
    }
  }
  // final chord ring-out
  add(music, total - 2.4, pad([midi(57), midi(60), midi(64), midi(69)], 2.3, 0.3));
  [69, 72, 76, 81].forEach((m, i) => add(music, total - 2.4 + i * 0.09, marimba(midi(m), 0.35)));
};

// ---------------------------------------------------------------- sound effects
const SFX = {
  pop: () => gen(0.09, (t) => Math.sin(TAU * (520 * t + 2200 * t * t)) * Math.exp(-35 * t) * 0.6),
  blip: () => gen(0.06, (t) => Math.sign(Math.sin(TAU * 880 * t)) * Math.exp(-40 * t) * 0.25),
  whoosh: () => { const b = gen(0.45, (t) => rnd() * Math.sin((Math.PI * t) / 0.45) ** 2 * 0.5); return highpass(lowpass(b, 2500), 300); },
  chime: () => { const a = gen(1.3, (t) => (Math.sin(TAU * 659.25 * t) * Math.exp(-3 * t)) * 0.4), b = gen(1.3, (t) => (Math.sin(TAU * 523.25 * t) * Math.exp(-3 * t)) * 0.4); const o = new Float32Array(a.length + SR * 0.45); a.forEach((v, i) => (o[i] += v)); b.forEach((v, i) => (o[i + Math.round(SR * 0.45)] += v)); return o; },
  coin: () => gen(0.25, (t) => (Math.sin(TAU * 1975 * t) + Math.sin(TAU * 2637 * t) * (t > 0.06 ? 1 : 0)) * Math.exp(-12 * t) * 0.25),
  tick: () => gen(0.03, (t) => Math.sin(TAU * 2400 * t) * Math.exp(-120 * t) * 0.25),
  lose: () => { const b = gen(0.32, (t) => Math.sign(Math.sin(TAU * (700 * t - 700 * t * t))) * Math.exp(-6 * t) * 0.2); const k = kick(0.7); k.forEach((v, i) => (b[i] += v)); return lowpass(b, 3000); },
  ring: (dur) => gen(dur, (t) => { const cyc = t % 2.0, on = (cyc < 0.4 || (cyc > 0.6 && cyc < 1.0)) ? 1 : 0; return on * (Math.sin(TAU * 440 * t) + Math.sin(TAU * 480 * t)) * 0.16; }),
  click: () => gen(0.05, (t) => rnd() * Math.exp(-90 * t) * 0.5),
  splash: () => lowpass(gen(0.9, (t) => rnd() * Math.exp(-4.5 * t) * Math.min(1, t * 60) * 0.9), 2200),
  bus: () => lowpass(gen(2.0, (t) => (rnd() * 0.6 + Math.sin(TAU * 55 * t) * 0.5) * Math.sin((Math.PI * t) / 2.0) ** 2 * 0.55), 500),
  stamp: () => { const k = kick(1.1), n = highpass(gen(0.6, (t) => rnd() * Math.exp(-7 * t) * 0.35), 4000); k.forEach((v, i) => (n[i] += v)); return n; },
  riser: (dur) => highpass(gen(dur, (t) => rnd() * (t / dur) ** 2 * 0.35), 1200),
};

// ---------------------------------------------------------------- ambience
const ambience = (kind, dur) => {
  if (kind === 'rain') { const b = lowpass(highpass(gen(dur, () => rnd() * 0.5), 400), 5000); for (let i = 0; i < dur * 30; i++) { const p = Math.floor(Math.random() * b.length); for (let k = 0; k < 200 && p + k < b.length; k++) b[p + k] += rnd() * Math.exp(-k / 30) * 0.3; } return b; }
  if (kind === 'airport' || kind === 'office') return lowpass(gen(dur, (t) => rnd() * (0.6 + 0.4 * Math.sin(t * 1.3) * Math.sin(t * 0.7))), 700);
  if (kind === 'street' || kind === 'home') { const b = lowpass(gen(dur, () => rnd() * 0.5), 900); return b; }
  return lowpass(gen(dur, () => rnd() * 0.3), 400);
};

export const buildAudio = (id) => {
  const pub = epPublic(id);
  const tl = JSON.parse(fs.readFileSync(path.join(pub, 'timeline.json'), 'utf8'));
  const fps = tl.fps, total = tl.durationInFrames / fps, N = Math.ceil(total * SR) + SR;
  const sec = (f) => f / fps;
  const music = track(N), sfx = track(N), amb = track(N), vo = track(N);

  // score sections follow the scenes' moods, then the end screen
  const sections = tl.scenes.map((s) => ({ mood: tl.episode.scenes.find((d) => d.id === s.id).music ?? 'lagos', t0: sec(s.start), t1: sec(s.end) }));
  const hasEnd = tl.endScreen.end > tl.endScreen.start; // endScreen.seconds 0 = no end screen, the Short ends on the decision
  if (hasEnd) sections.push({ mood: 'end', t0: sec(tl.endScreen.start), t1: sec(tl.endScreen.end) - 2.2 });
  writeScore(music, sections, total);

  // ambience per scene with short crossfades
  tl.scenes.forEach((s) => {
    const def = tl.episode.scenes.find((d) => d.id === s.id);
    const d = sec(s.end - s.start);
    const b = ambience(def.ambience ?? 'room', d);
    for (let i = 0; i < b.length; i++) b[i] *= Math.min(1, i / (0.15 * SR), (b.length - i) / (0.15 * SR));
    add(amb, sec(s.start), b, def.ambience === 'rain' ? 0.32 : 0.22);
    if (s !== tl.scenes[0] && def.transition !== 'cut') add(sfx, sec(s.start) - 0.12, SFX.whoosh(), 0.8);
  });

  // effects from UI cues
  for (const u of tl.ui) {
    const t = sec(u.frame);
    if (u.kind === 'title') add(sfx, t, SFX.pop(), 0.9);
    if (u.kind === 'reaction') { add(sfx, t, SFX.blip(), 0.8); add(sfx, t + 0.08, SFX.blip(), 0.8); }
    if (u.kind === 'stats') add(sfx, t, SFX.pop(), 0.5);
    if (u.kind === 'money') {
      const span = (u.endFrame ?? u.frame + 90) - u.frame;
      add(sfx, t, SFX.pop(), 0.6);
      if (u.steps?.length) u.steps.forEach((_, i) => { const sf = Math.round(10 + i * ((span * 0.78) / u.steps.length)); add(sfx, sec(u.frame + sf), SFX.whoosh(), 0.35); add(sfx, sec(u.frame + sf + 6), SFX.lose(), 0.9); });
      else { for (let k = 8; k < Math.min(span - 10, 50); k += 3) add(sfx, sec(u.frame + k), SFX.tick(), 0.8); add(sfx, sec(u.frame + Math.min(span - 10, 50)), SFX.coin(), 1); }
    }
    if (u.kind === 'phone') { const ans = sec(u.answerFrame ?? u.frame + 30); add(sfx, t, SFX.ring(Math.max(0.2, ans - t)), 0.9); add(sfx, ans, SFX.click(), 0.8); }
    if (u.kind === 'decision') { add(sfx, t - 1.2, SFX.riser(1.2), 0.8); add(sfx, t, SFX.stamp(), 1); add(sfx, t + 10 / fps, SFX.pop(), 0.7, -0.4); add(sfx, t + 16 / fps, SFX.pop(), 0.7, 0.4); add(sfx, t + 34 / fps, SFX.coin(), 0.8); }
    if (u.kind === 'sfx') {
      if (u.name === 'splash') { add(sfx, t - 1.1, SFX.bus(), 0.9, 0.2); add(sfx, t, SFX.splash(), 1); }
      else if (SFX[u.name]) add(sfx, t, SFX[u.name](1), 0.9);
    }
  }
  if (hasEnd) add(sfx, sec(tl.endScreen.start), SFX.stamp(), 0.7);

  // voices
  for (const l of tl.lines) {
    const { samples } = readWav(path.join(ROOT, 'public', l.audio));
    add(vo, sec(l.start), samples, 1.0);
  }

  // duck: envelope follower on the voice drives the music + ambience down
  const att = 1 - Math.exp(-1 / (0.012 * SR)), rel = 1 - Math.exp(-1 / (0.28 * SR));
  let env = 0;
  const OUT = track(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const v = Math.abs(vo.L[i]);
    env += (v > env ? att : rel) * (v - env);
    const duck = 1 - 0.62 * Math.min(1, env * 6);
    for (const ch of ['L', 'R']) {
      const x = vo[ch][i] * 1.0 + music[ch][i] * 0.42 * duck + amb[ch][i] * 0.35 * (0.6 + 0.4 * duck) + sfx[ch][i] * 0.55;
      OUT[ch][i] = x;
      peak = Math.max(peak, Math.abs(x));
    }
  }
  // normalise, soft limit, short fade out
  const g = 0.95 / Math.max(peak, 1e-6) * 1.25;
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (0.4 * SR));
    OUT.L[i] = Math.tanh(OUT.L[i] * g) * 0.92 * fade;
    OUT.R[i] = Math.tanh(OUT.R[i] * g) * 0.92 * fade;
  }
  const stems = path.join(ROOT, 'out', id, 'stems');
  fs.mkdirSync(stems, { recursive: true });
  writeWav(path.join(stems, 'music.wav'), music.L, music.R);
  writeWav(path.join(stems, 'sfx.wav'), sfx.L, sfx.R);
  writeWav(path.join(stems, 'ambience.wav'), amb.L, amb.R);
  writeWav(path.join(pub, 'mix.wav'), OUT.L, OUT.R);
  return { seconds: N / SR, mix: path.join(pub, 'mix.wav') };
};

if (isMain(import.meta.url)) {
  const id = process.argv[2];
  if (!id) { console.error('usage: node scripts/audio.mjs <episodeId>'); process.exit(1); }
  const r = buildAudio(id);
  console.log(`audio: ${r.seconds.toFixed(1)}s mix -> ${r.mix} (stems in out/${id}/stems)`);
}
