// Quick look without a full render: one still per scene (middle frame) + the decision, as a contact sheet.
//   node scripts/stills.mjs ep01
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, epPublic } from './lib.mjs';

const id = process.argv[2];
if (!id) { console.error('usage: node scripts/stills.mjs <episodeId>'); process.exit(1); }
const tl = JSON.parse(fs.readFileSync(path.join(epPublic(id), 'timeline.json'), 'utf8'));
const dir = path.join(ROOT, 'out', id, 'stills');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'props.json'), JSON.stringify({ episodeId: id }));
const frames = [30, ...tl.scenes.map((s) => Math.round((s.start + s.end) / 2)), ...(tl.endScreen.end > tl.endScreen.start ? [tl.endScreen.start + 30] : [tl.durationInFrames - 1])];
const files = frames.map((f) => {
  const file = path.join(dir, `f${String(f).padStart(5, '0')}.jpg`);
  spawnSync('npx', ['remotion', 'still', 'Episode', file, `--frame=${f}`, `--props=${path.join(dir, 'props.json')}`, '--image-format=jpeg', '--log=error'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  return file;
});
spawnSync('ffmpeg', ['-v', 'error', '-y', ...files.flatMap((f) => ['-i', f]), '-filter_complex', `${files.map((_, i) => `[${i}]scale=270:480[s${i}]`).join(';')};${files.map((_, i) => `[s${i}]`).join('')}hstack=${files.length}`, path.join(dir, 'sheet.jpg')], { stdio: 'inherit' });
console.log('stills: ' + path.join(dir, 'sheet.jpg'));
