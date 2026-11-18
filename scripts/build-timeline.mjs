// Turns episodes/<id>/episode.json + the voice files into public/episodes/<id>/timeline.json:
// absolute frames for every scene, line, word (captions), pose change and UI cue, plus a mouth-openness
// envelope per line measured from the voice loudness (lip-sync).
//   node scripts/build-timeline.mjs ep01
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readEpisode, epPublic, readWav, isMain } from './lib.mjs';

export const FPS = 30;
const GAP = 0.12; // default pause between lines (s)

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9£₦]/g, '');

// Match caption words (display text) to the voice's word timings
const alignWords = (display, spoken, dur) => {
  const out = display.map((w) => ({ w, start: null, end: null }));
  let j = 0;
  for (const o of out) {
    const n = norm(o.w);
    if (!n) continue;
    for (let k = j; k < Math.min(spoken.length, j + 4); k++) {
      const m = norm(spoken[k].w);
      if (m === n || (m && n && (m.startsWith(n) || n.startsWith(m)))) {
        o.start = spoken[k].start;
        o.end = spoken[k].end;
        j = k + 1;
        break;
      }
    }
  }
  // fill unmatched by interpolation weighted by length
  const total = display.reduce((a, w) => a + Math.max(2, w.length), 0);
  let acc = 0;
  out.forEach((o) => {
    const t0 = (acc / total) * dur;
    acc += Math.max(2, o.w.length);
    if (o.start == null) {
      o.start = t0;
      o.end = (acc / total) * dur;
    }
  });
  for (let i = 1; i < out.length; i++) if (out[i].start < out[i - 1].start) out[i].start = out[i - 1].start;
  return out;
};

// Caption "pages": up to 3 words / 16 characters, breaking after punctuation
const paginate = (words) => {
  let page = 0, count = 0, chars = 0;
  const out = words.map((w, i) => {
    if (count >= 3 || chars + w.w.length > 16) { page++; count = 0; chars = 0; }
    const r = { ...w, page };
    count++;
    chars += w.w.length + 1;
    if (/[!?.…,]$/.test(w.w) && i < words.length - 1) { page++; count = 0; chars = 0; }
    return r;
  });
  // never leave a short word alone on the last page ("o!")
  const n = out.length;
  if (n > 1 && out[n - 1].page !== out[n - 2].page && out[n - 1].w.length <= 3) out[n - 1].page = out[n - 2].page;
  return out;
};

const mouthEnvelope = (wavPath, frames) => {
  const { samples, sr } = readWav(wavPath);
  const per = sr / FPS, rms = [];
  for (let f = 0; f < frames; f++) {
    let s = 0, n = 0;
    for (let i = Math.floor(f * per); i < Math.min(samples.length, Math.floor((f + 1) * per)); i++) { s += samples[i] * samples[i]; n++; }
    rms.push(n ? Math.sqrt(s / n) : 0);
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * 0.9)] || 1;
  return rms.map((v) => Math.round(Math.min(1, Math.max(0, (v / ref - 0.12) / 0.8)) * 100) / 100);
};

export const buildTimeline = (id) => {
  const ep = readEpisode(id);
  const pub = epPublic(id);
  const f = (s) => Math.round(s * FPS);
  let cursor = 0;
  const scenes = [], lines = [], ui = [], poses = [];
  for (const sc of ep.scenes) {
    const start = cursor;
    let t = sc.lead ?? 0.2;
    const lineStart = {};
    for (const ln of sc.lines) {
      const metaPath = path.join(pub, 'vo', `${ln.id}.json`);
      if (!fs.existsSync(metaPath)) throw new Error(`No voice for line ${ln.id}. Run: npm run voice -- ${id}`);
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const ls = start + f(t);
      const frames = Math.max(1, f(meta.duration));
      lineStart[ln.id] = ls;
      const words = paginate(alignWords(ln.text.split(/\s+/).filter(Boolean), meta.words ?? [], meta.duration)).map((w) => ({
        w: w.w,
        start: ls + f(w.start),
        end: ls + Math.max(f(w.end), f(w.start) + 2),
        page: w.page,
        hi: (ln.highlight ?? []).some((h) => norm(h) === norm(w.w)),
      }));
      lines.push({
        id: ln.id, scene: sc.id, speaker: ln.speaker, text: ln.text, emotion: ln.emotion ?? null, bubble: !!ln.bubble,
        start: ls, end: ls + frames, audio: `episodes/${id}/vo/${ln.id}.wav`, words,
        mouth: mouthEnvelope(path.join(pub, 'vo', `${ln.id}.wav`), frames),
      });
      t += meta.duration + (ln.holdAfter ?? GAP);
    }
    t += (sc.tail ?? 0.4) - (sc.lines.length ? sc.lines.at(-1).holdAfter ?? GAP : 0);
    const dur = Math.max(t, sc.minDuration ?? 0);
    const end = start + f(dur);
    const at = (a) => (typeof a === 'string' ? (lineStart[a] ?? (() => { throw new Error(`Scene ${sc.id}: unknown line id "${a}"`); })()) : start + f(a));
    for (const ev of sc.ui ?? []) {
      const r = { scene: sc.id, ...ev, frame: at(ev.at) };
      if (ev.dur) r.endFrame = r.frame + f(ev.dur);
      if (ev.answerAt != null) r.answerFrame = at(ev.answerAt);
      ui.push(r);
    }
    const castPoses = (cast, side) => cast.forEach((c) => poses.push({ scene: sc.id, side, who: c.who, changes: (c.poses ?? []).map((p) => ({ frame: at(p.at), pose: p.pose })).sort((a, b) => a.frame - b.frame) }));
    castPoses(sc.cast, 'main');
    if (sc.split?.cast) castPoses(sc.split.cast, 'split');
    for (const k of sc.camera.shakeAt ?? []) ui.push({ scene: sc.id, kind: 'shake', frame: at(k) });
    scenes.push({ id: sc.id, start, end, lineIds: sc.lines.map((l) => l.id) });
    cursor = end;
  }
  const endStart = cursor;
  const endEnd = endStart + f(ep.endScreen.seconds);
  const mixRel = `episodes/${id}/mix.wav`;
  const timeline = {
    episodeId: id, fps: FPS, durationInFrames: endEnd, seconds: +(endEnd / FPS).toFixed(2),
    episode: ep, scenes, lines, ui, poses, endScreen: { start: endStart, end: endEnd },
    mix: fs.existsSync(path.join(ROOT, 'public', mixRel)) ? mixRel : null,
  };
  fs.writeFileSync(path.join(pub, 'timeline.json'), JSON.stringify(timeline));
  return timeline;
};

if (isMain(import.meta.url)) {
  const id = process.argv[2];
  if (!id) { console.error('usage: node scripts/build-timeline.mjs <episodeId>'); process.exit(1); }
  const t = buildTimeline(id);
  console.log(`timeline: ${t.seconds}s, ${t.durationInFrames} frames, ${t.scenes.length} scenes, ${t.lines.length} lines`);
  t.scenes.forEach((s) => console.log(`  ${s.id.padEnd(16)} ${(s.start / FPS).toFixed(2).padStart(6)}s -> ${(s.end / FPS).toFixed(2)}s`));
}
