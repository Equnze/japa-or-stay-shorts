// Checks an episode before (and after) building: structure, locations, cast, cues, the 20-40 s rule,
// the hook, the decision ending and the brand link.   node scripts/validate.mjs ep01
import fs from 'node:fs';
import path from 'node:path';
import { readEpisode, epPublic, isMain } from './lib.mjs';

const ENVS = ['lagosStreet', 'londonStreet', 'ukApartment', 'airport', 'nigerianHome', 'ukWorkplace'];
const WHO = ['chinedu', 'amaka', 'tunde', 'ada', 'mama'];
const POSES = ['idle', 'walk', 'talk', 'happy', 'sad', 'shocked', 'thinking', 'phone', 'wave', 'sit'];
const UI = ['title', 'money', 'stats', 'phone', 'reaction', 'decision', 'sfx'];
const SFX = ['chime', 'splash', 'pop', 'whoosh', 'coin', 'stamp', 'click', 'blip'];
// words a scene label should contain for its environment (keeps backgrounds matched to the story)
const PLACE_WORDS = {
  lagosStreet: ['lagos', 'street', 'market', 'naija', 'nigeria'],
  londonStreet: ['london', 'bus', 'street', 'uk'],
  ukApartment: ['room', 'flat', 'apartment', 'uk', 'london', 'home'],
  airport: ['airport', 'departure', 'arrival', 'terminal'],
  nigerianHome: ['home', 'house', 'parlour', 'living', 'lagos', 'village', 'mama'],
  ukWorkplace: ['work', 'office', 'job', 'shift', 'uk'],
};
export const LINK = 'https://japa-or-stay.pages.dev';

export const validate = (id, { requireBuild = false } = {}) => {
  const errors = [], warnings = [];
  const ep = readEpisode(id);
  const E = (m) => errors.push(m), W = (m) => warnings.push(m);
  if (!ep.title) E('missing title');
  const left = (JSON.stringify(ep).match(/REPLACE[^"]*/g) ?? []);
  if (left.length) E(`${left.length} placeholder(s) still say REPLACE, e.g. "${left[0]}"`);
  if (!ep.scenes?.length) E('no scenes');
  if ((ep.scenes?.length ?? 0) > 6) W('more than 6 scenes is a lot for a 20-40 s Short');
  const lineIds = new Set();
  const speakers = new Set();
  for (const sc of ep.scenes ?? []) {
    const where = `scene ${sc.id}`;
    if (!ENVS.includes(sc.environment?.type)) E(`${where}: unknown environment "${sc.environment?.type}" (use one of ${ENVS.join(', ')})`);
    if (sc.split && !ENVS.includes(sc.split.type)) E(`${where}: unknown split environment "${sc.split.type}"`);
    const words = PLACE_WORDS[sc.environment?.type] ?? [];
    if (sc.label && words.length && !words.some((w) => sc.label.toLowerCase().includes(w)) && !sc.split)
      W(`${where}: label "${sc.label}" doesn't mention its location (${sc.environment.type}); check the background matches the story`);
    for (const c of [...(sc.cast ?? []), ...(sc.split?.cast ?? [])]) {
      if (!WHO.includes(c.who)) E(`${where}: unknown character "${c.who}"`);
      if (!POSES.includes(c.pose)) E(`${where}: ${c.who} has unknown pose "${c.pose}"`);
      for (const p of c.poses ?? []) if (!POSES.includes(p.pose)) E(`${where}: unknown pose "${p.pose}"`);
    }
    if (!sc.camera?.from || !sc.camera?.to) E(`${where}: camera needs from and to`);
    const ids = new Set();
    for (const l of sc.lines ?? []) {
      if (lineIds.has(l.id)) E(`duplicate line id ${l.id}`);
      lineIds.add(l.id); ids.add(l.id); speakers.add(l.speaker);
      if (l.speaker !== 'narrator' && !WHO.includes(l.speaker)) E(`${where}: unknown speaker "${l.speaker}"`);
      if (l.speaker !== 'narrator' && !l.bubble && !(sc.cast ?? []).some((c) => c.who === l.speaker) && !(sc.ui ?? []).some((u) => u.kind === 'phone'))
        W(`${where}: ${l.speaker} speaks but is not in the scene (fine for off-screen/phone voices)`);
      if (l.text.split(/\s+/).length > 16) W(`${where}: line ${l.id} is long (${l.text.split(/\s+/).length} words); split it for pace`);
    }
    for (const u of sc.ui ?? []) {
      if (!UI.includes(u.kind)) E(`${where}: unknown ui kind "${u.kind}"`);
      for (const k of ['at', 'answerAt']) if (typeof u[k] === 'string' && !ids.has(u[k])) E(`${where}: ui ${u.kind} refers to unknown line "${u[k]}"`);
      if (u.kind === 'sfx' && !SFX.includes(u.name)) W(`${where}: sfx "${u.name}" has no sound yet (known: ${SFX.join(', ')})`);
      if (u.kind === 'money' && !ep.disclaimer) W('money on screen: add a "disclaimer" saying figures are fictional game values');
    }
    for (const c of [...(sc.cast ?? []), ...(sc.split?.cast ?? [])]) for (const p of c.poses ?? []) if (typeof p.at === 'string' && !ids.has(p.at)) E(`${where}: pose change refers to unknown line "${p.at}"`);
  }
  for (const s of speakers) if (!ep.voices?.[s]) E(`no voice set for speaker "${s}"`);
  // ending
  const last = ep.scenes?.at(-1);
  if (!last?.ui?.some((u) => u.kind === 'decision')) E('the last scene must contain a decision screen (A or B)');
  const allText = (ep.scenes ?? []).flatMap((s) => s.lines.map((l) => l.text.toLowerCase())).join(' ');
  if (!/japa or stay/.test(allText)) W('the ending should ask "JAPA or STAY?"');
  if (!/comment a or b/.test(allText) && !last?.ui?.some((u) => /comment a or b/i.test(u.cta ?? ''))) W('add the CTA "COMMENT A OR B! SUBSCRIBE FOR PART 2!"');
  if (ep.endScreen?.link !== LINK) E(`endScreen.link must be the full ${LINK}`);
  // built checks
  const tlPath = path.join(epPublic(id), 'timeline.json');
  if (fs.existsSync(tlPath)) {
    const tl = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
    if (tl.seconds < 20 || tl.seconds > 40) E(`runtime ${tl.seconds}s is outside 20-40 s`);
    const first = tl.lines[0];
    if (first && first.start / tl.fps > 1.0) W(`first line starts at ${(first.start / tl.fps).toFixed(2)} s; the hook should land in the first second`);
    const hookEnd = tl.lines.filter((l) => l.end / tl.fps <= 3.2);
    if (!hookEnd.length && !tl.ui.some((u) => u.kind === 'title' && u.frame / tl.fps < 1)) W('nothing lands in the first 3 s (no line finishes and no hook title)');
    if (!tl.mix) W('no mixed soundtrack yet (run npm run audio)');
  } else if (requireBuild) E('not built yet');
  return { errors, warnings, ep };
};

if (isMain(import.meta.url)) {
  const id = process.argv[2];
  if (!id) { console.error('usage: node scripts/validate.mjs <episodeId>'); process.exit(1); }
  const { errors, warnings } = validate(id);
  warnings.forEach((w) => console.log(`  warn  ${w}`));
  errors.forEach((e) => console.log(`  ERROR ${e}`));
  console.log(errors.length ? `validate: ${errors.length} error(s)` : `validate: ok (${warnings.length} warning(s))`);
  process.exit(errors.length ? 1 : 0);
}
