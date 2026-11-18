// Scaffolds a new episode from the 4-beat template (hook -> setup/problem -> twist -> decision).
//   npm run new -- ep02 "Mama Wants Him Back Home"
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const [id, ...titleParts] = process.argv.slice(2);
if (!id || !/^[a-z0-9-]+$/.test(id)) { console.error('usage: npm run new -- <id, e.g. ep02> "Title"'); process.exit(1); }
const dir = path.join(ROOT, 'episodes', id);
if (fs.existsSync(path.join(dir, 'episode.json'))) { console.error(`${id} already exists`); process.exit(1); }
const title = titleParts.join(' ') || 'New Episode';
const voices = JSON.parse(fs.readFileSync(path.join(ROOT, 'episodes', 'ep01', 'episode.json'), 'utf8')).voices;
const ep = {
  id, title,
  hook: 'REPLACE: the one line that lands in the first 3 seconds',
  disclaimer: 'All money figures are fictional game values.',
  voices,
  scenes: [
    {
      id: 's1-hook', label: 'REPLACE: Lagos street (where the hook happens)', music: 'lagos', ambience: 'street', transition: 'cut', lead: 0.15, tail: 0.3,
      environment: { type: 'lagosStreet', timeOfDay: 'day', seed: 1 },
      camera: { from: { x: 130, y: 214, zoom: 1.7 }, to: { x: 130, y: 198, zoom: 1.3 }, ease: 'out' },
      cast: [{ who: 'chinedu', x: 130, facing: 'right', pose: 'shocked' }],
      lines: [{ id: 'l1', speaker: 'narrator', text: 'REPLACE hook line!', highlight: [] }],
      ui: [{ kind: 'title', text: 'REPLACE HOOK!', sub: 'LAGOS', at: 0, dur: 2.3 }],
    },
    {
      id: 's2-problem', label: 'REPLACE: UK apartment', music: 'london', ambience: 'rain', transition: 'pixelWipe', lead: 0.25, tail: 0.4,
      environment: { type: 'ukApartment', timeOfDay: 'evening', weather: 'rain', seed: 2 },
      camera: { from: { x: 128, y: 196, zoom: 1.3 }, to: { x: 136, y: 212, zoom: 1.7 }, ease: 'inOut' },
      cast: [{ who: 'chinedu', x: 124, facing: 'right', pose: 'idle', poses: [{ at: 'l3', pose: 'sad' }] }],
      lines: [
        { id: 'l2', speaker: 'narrator', text: 'REPLACE setup line.' },
        { id: 'l3', speaker: 'chinedu', text: 'REPLACE problem line!', emotion: 'sad' },
      ],
      ui: [{ kind: 'stats', at: 0.6, dur: 3, stats: [{ label: 'HAPPY', from: 80, to: 40, color: '#16A266' }, { label: 'STRESS', from: 20, to: 75, color: '#E8473A' }] }],
    },
    {
      id: 's3-twist', label: 'REPLACE: London bus stop', music: 'tension', ambience: 'rain', transition: 'flash', lead: 0.4, tail: 0.3,
      environment: { type: 'londonStreet', timeOfDay: 'evening', weather: 'rain', seed: 3 },
      camera: { from: { x: 150, y: 196, zoom: 1.25 }, to: { x: 156, y: 214, zoom: 1.6 }, ease: 'inOut' },
      cast: [{ who: 'chinedu', x: 156, facing: 'left', pose: 'phone' }],
      lines: [{ id: 'l4', speaker: 'mama', text: 'REPLACE twist line!' }, { id: 'l5', speaker: 'chinedu', text: 'REPLACE reaction!', emotion: 'shocked' }],
      ui: [{ kind: 'phone', caller: 'MAMA', at: 0, answerAt: 'l4', dur: 2 }],
    },
    {
      id: 's4-decision', label: 'Split screen: London or Lagos', music: 'decision', ambience: 'street', transition: 'slide', lead: 0.2, tail: 2.0,
      environment: { type: 'londonStreet', timeOfDay: 'evening', weather: 'rain', seed: 3 },
      split: { type: 'lagosStreet', timeOfDay: 'day', seed: 1, label: 'LAGOS', cast: [{ who: 'chinedu', x: 122, facing: 'right', pose: 'happy' }] },
      camera: { from: { x: 146, y: 200, zoom: 1.45 }, to: { x: 146, y: 208, zoom: 1.6 }, ease: 'inOut' },
      splitCamera: { from: { x: 132, y: 200, zoom: 1.45 }, to: { x: 132, y: 208, zoom: 1.6 }, ease: 'inOut' },
      cast: [{ who: 'chinedu', x: 150, facing: 'left', pose: 'thinking' }],
      lines: [
        { id: 'l6', speaker: 'narrator', text: 'If na you, wetin you go do? JAPA or STAY?', say: 'If na you, wetin you go do? Japa... or stay?', highlight: ['JAPA', 'STAY?'] },
        { id: 'l7', speaker: 'narrator', text: 'Comment A or B! Subscribe for Part 2!', highlight: ['A', 'B!', 'Part', '2!'] },
      ],
      ui: [{ kind: 'decision', question: 'JAPA or STAY?', a: 'JAPA: REPLACE option A', b: 'STAY: REPLACE option B', at: 'l6', cta: 'COMMENT A OR B! SUBSCRIBE FOR PART 2!' }],
    },
  ],
  endScreen: { headline: 'JAPA OR STAY', cta: 'Play the free game', link: 'https://japa-or-stay.pages.dev', handle: '@japaor_stay', seconds: 0 }, // 0 = no end screen: the Short ends, and loops, on the A/B card; the link goes in the pinned comment
};
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'episode.json'), JSON.stringify(ep, null, 2));
fs.writeFileSync(path.join(dir, 'publishing.md'), `# ${title}: publishing pack\n\n## Title\n\n## Description\n\nPlay the free game: https://japa-or-stay.pages.dev\nSubscribe @japaor_stay for Part 2.\n\n## Hashtags\n\n#japa #naija #lagos #london #shorts\n\n## Pinned comment (post and pin within an hour)\n\nA: ... / B: ... Which one? A or B + tell us why 👇\nPlay the free game: https://japa-or-stay.pages.dev\n\n## Thumbnail concept\n\n## Part 2\n`);
console.log(`created episodes/${id}/episode.json and publishing.md\nnext: edit the REPLACE lines, then npm run validate -- ${id} and npm run episode -- ${id}`);
