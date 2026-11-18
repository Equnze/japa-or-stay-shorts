// Camera moves between two keys over a scene with easing, keeps the view inside the set,
// and adds a short decaying shake on impact cues.
import { Easing, interpolate } from 'remotion';
import type { CameraKey, CameraMove } from '../engine/types';
import { SCALE, VIEW_H } from '../engine/pixel';
import { WORLD_H } from '../environments/common';

const EASE = {
  inOut: Easing.inOut(Easing.cubic),
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  linear: (x: number) => x,
};

export const cameraAt = (move: CameraMove, progress: number, worldW: number, viewW = 1080): CameraKey => {
  const e = EASE[move.ease ?? 'inOut'](Math.max(0, Math.min(1, progress)));
  const lerp = (a: number, b: number) => a + (b - a) * e;
  const zoom = lerp(move.from.zoom, move.to.zoom);
  const halfW = viewW / SCALE / zoom / 2, halfH = VIEW_H / zoom / 2;
  const x = Math.max(halfW, Math.min(worldW - halfW, lerp(move.from.x, move.to.x)));
  const y = Math.max(halfH, Math.min(WORLD_H - halfH, lerp(move.from.y, move.to.y)));
  return { x, y, zoom };
};

// shake offset in screen px for the frames after each cue
export const shakeAt = (frame: number, cues: number[]): [number, number] => {
  let sx = 0, sy = 0;
  for (const c of cues) {
    const d = frame - c;
    if (d < 0 || d > 12) continue;
    const a = interpolate(d, [0, 12], [22, 0]);
    sx += Math.sin(d * 2.7) * a;
    sy += Math.cos(d * 3.3) * a * 0.6;
  }
  return [sx, sy];
};
