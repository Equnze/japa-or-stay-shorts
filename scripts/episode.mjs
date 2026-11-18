// One command for a whole episode: validate -> voices -> timeline -> soundtrack -> validate -> render.
//   npm run episode -- ep02            (everything)
//   npm run episode -- ep02 --no-render  (stop before the video, e.g. to preview in `npm run studio`)
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';
import { validate } from './validate.mjs';
import { buildTimeline } from './build-timeline.mjs';
import { buildAudio } from './audio.mjs';
import { render } from './render.mjs';

const id = process.argv[2];
if (!id) { console.error('usage: npm run episode -- <episodeId> [--no-render]'); process.exit(1); }
const check = (stage) => {
  const { errors, warnings } = validate(id);
  warnings.forEach((w) => console.log(`  warn  ${w}`));
  if (errors.length) { errors.forEach((e) => console.log(`  ERROR ${e}`)); console.log(`stopped at ${stage}`); process.exit(1); }
};
console.log('1/5 validate script'); check('validation');
console.log('2/5 voices (edge-tts)');
const py = process.env.PYTHON ?? 'python';
const v = spawnSync(py, ['scripts/voice.py', id], { cwd: ROOT, stdio: 'inherit' });
if (v.status !== 0) { console.log('voice step failed (internet? pip install edge-tts?)'); process.exit(1); }
console.log('3/5 timeline'); let tl = buildTimeline(id); console.log(`   ${tl.seconds}s`);
console.log('4/5 soundtrack'); buildAudio(id); tl = buildTimeline(id);
check('post-build validation');
if (process.argv.includes('--no-render')) { console.log('built; preview with: npm run studio'); process.exit(0); }
console.log('5/5 render'); console.log(`done: ${render(id, 1)}`);
