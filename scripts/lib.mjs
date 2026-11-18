// Small helpers shared by the pipeline scripts (no dependencies beyond Node).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const epDir = (id) => path.join(ROOT, 'episodes', id);
export const epPublic = (id) => {
  const p = path.join(ROOT, 'public', 'episodes', id);
  fs.mkdirSync(p, { recursive: true });
  return p;
};
export const readEpisode = (id) => {
  const p = path.join(epDir(id), 'episode.json');
  if (!fs.existsSync(p)) throw new Error(`No episode at ${p}. Create one with: npm run new -- ${id} "Title"`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};
export const isMain = (metaUrl) => path.resolve(process.argv[1] ?? '') === fileURLToPath(metaUrl);

// 16-bit PCM WAV reader -> Float32 mono samples
export const readWav = (file) => {
  const b = fs.readFileSync(file);
  let p = 12, fmt = null, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') { data = b.subarray(p + 8, p + 8 + size); break; }
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error(`Unsupported WAV ${file}`);
  const n = Math.floor(data.length / 2 / fmt.ch), samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < fmt.ch; c++) s += data.readInt16LE((i * fmt.ch + c) * 2);
    samples[i] = s / fmt.ch / 32768;
  }
  return { samples, sr: fmt.sr };
};

// Float32 stereo (L, R) -> 16-bit WAV
export const writeWav = (file, L, R, sr = 44100) => {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(sr, 24);
  b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
    b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
  }
  fs.writeFileSync(file, b);
};
