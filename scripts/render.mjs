// Renders an episode to MP4 (1080x1920, 30 fps, H.264 + AAC) and writes the review pack:
// subtitles (.srt), a poster frame, representative frames and a contact sheet.
//   node scripts/render.mjs ep01 [--concurrency=1]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, epPublic, isMain } from './lib.mjs';

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed (${r.status})`);
};
const ts = (f, fps) => {
  const s = f / fps, h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.round((s % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
};

export const writeSrt = (tl, file) => {
  const out = tl.lines.map((l, i) => {
    const who = l.speaker === 'narrator' ? '' : `${l.speaker[0].toUpperCase()}${l.speaker.slice(1)}: `;
    return `${i + 1}\n${ts(l.start, tl.fps)} --> ${ts(l.end, tl.fps)}\n${who}${l.text}\n`;
  });
  fs.writeFileSync(file, out.join('\n'));
};

export const render = (id, concurrency = 1) => {
  const tl = JSON.parse(fs.readFileSync(path.join(epPublic(id), 'timeline.json'), 'utf8'));
  const outDir = path.join(ROOT, 'out', id);
  fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });
  const mp4 = path.join(outDir, `${id}.mp4`);
  const props = path.join(outDir, 'props.json');
  fs.writeFileSync(props, JSON.stringify({ episodeId: id }));
  run('npx', ['remotion', 'render', 'Episode', mp4, `--props=${props}`, `--concurrency=${concurrency}`, '--audio-codec=aac', '--audio-bitrate=192k']);
  writeSrt(tl, path.join(outDir, `${id}.srt`));
  // representative frames: hook, middle of every scene, the decision, the end screen
  const picks = [{ name: '00-hook', f: 30 }];
  tl.scenes.forEach((s, i) => picks.push({ name: `${String(i + 1).padStart(2, '0')}-${s.id}`, f: Math.round((s.start + s.end) / 2) }));
  const dec = tl.ui.find((u) => u.kind === 'decision');
  if (dec) picks.push({ name: '90-decision', f: dec.frame + 45 });
  if (tl.endScreen.end > tl.endScreen.start) picks.push({ name: '99-end', f: tl.endScreen.start + 40 });
  for (const p of picks) run('ffmpeg', ['-v', 'error', '-y', '-ss', (p.f / tl.fps).toFixed(3), '-i', mp4, '-frames:v', '1', '-q:v', '3', path.join(outDir, 'frames', `${p.name}.jpg`)]);
  const frames = picks.map((p) => path.join(outDir, 'frames', `${p.name}.jpg`));
  run('ffmpeg', ['-v', 'error', '-y', ...frames.flatMap((f) => ['-i', f]), '-filter_complex', `${frames.map((_, i) => `[${i}]scale=270:480[s${i}]`).join(';')};${frames.map((_, i) => `[s${i}]`).join('')}hstack=${frames.length}`, path.join(outDir, 'contact-sheet.jpg')]);
  // poster for the thumbnail concept: the decision moment
  if (dec) run('ffmpeg', ['-v', 'error', '-y', '-ss', ((dec.frame + 45) / tl.fps).toFixed(3), '-i', mp4, '-frames:v', '1', '-q:v', '2', path.join(outDir, 'poster.jpg')]);
  return mp4;
};

if (isMain(import.meta.url)) {
  const id = process.argv[2];
  const c = Number((process.argv.find((a) => a.startsWith('--concurrency=')) ?? '--concurrency=1').split('=')[1]);
  if (!id) { console.error('usage: node scripts/render.mjs <episodeId> [--concurrency=1]'); process.exit(1); }
  console.log(`rendered: ${render(id, c)}`);
}
