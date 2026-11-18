// Shared set pieces for the environments: palms, poles and cables, vehicles, rain, background extras.
import { Painter, shade, rng } from '../engine/pixel';
import type { SceneEnvironment } from '../engine/types';

export const WORLD_H = 340; // every layer is this tall; the camera shows 320 of it
export type LayerName = 'sky' | 'distant' | 'mid' | 'fg' | 'fx';

export interface EnvLayer {
  depth: number; // parallax: 0 = fixed to the camera, 1 = moves with the characters
  blur?: number; // depth-of-field blur in screen px (the tilt-shift look)
  draw?: (p: Painter, env: SceneEnvironment) => void; // static, drawn once
  anim?: (p: Painter, t: number, env: SceneEnvironment) => void; // redrawn every frame (t = seconds into the scene)
}

export interface Grade {
  top: string; // colour wash at the top of the frame
  bottom: string; // colour wash at the bottom
  opacity: number;
  glow?: { x: number; y: number; color: string; size: number }; // light source glow (0..1 frame coords)
  vignette: number;
}

export interface EnvDef {
  id: string;
  name: string;
  worldW: number;
  floorY: number; // world y where characters' feet rest
  layers: Partial<Record<LayerName, EnvLayer>>;
  grade: (env: SceneEnvironment) => Grade;
}

export const isNight = (env: SceneEnvironment) => env.timeOfDay === 'night' || env.timeOfDay === 'evening';

// ---- people in the background (tiny, 5x12 px) ----
const SKINS = ['#5e3422', '#7c4a2e', '#93583c', '#4a2a1a', '#b07246', '#d8a07a', '#f0c8a0'];
const CLOTH = ['#c0392b', '#2e86c1', '#e8a317', '#16a266', '#8e44ad', '#ecf0f1', '#34495e', '#d35400', '#1abc9c', '#7f8c8d'];
export const extra = (p: Painter, x: number, y: number, seed: number, t = 0, walking = false, dim = 0) => {
  const r = rng(seed);
  const skin = shade(SKINS[Math.floor(r() * SKINS.length)], dim);
  const top = shade(CLOTH[Math.floor(r() * CLOTH.length)], dim);
  const bottom = shade(CLOTH[Math.floor(r() * CLOTH.length)], dim - 0.25);
  const tall = r() > 0.5 ? 1 : 0;
  const step = walking ? Math.floor(t * 6 + seed) % 2 : 0;
  const by = walking && step ? -1 : 0;
  const yy = y - 12 - tall + by;
  p.rect(x + 1, yy, 3, 3, skin); // head
  if (r() > 0.6) p.rect(x, yy - 1, 5, 2, shade(CLOTH[Math.floor(r() * CLOTH.length)], dim)); // headwrap / cap
  else p.rect(x + 1, yy - 1, 3, 1, '#1a1414');
  p.rect(x, yy + 3, 5, 5 + tall, top); // body
  p.rect(x + (step ? 0 : 1), yy + 8 + tall, 2, 4 - by, bottom);
  p.rect(x + (step ? 3 : 2), yy + 8 + tall, 2, 4 - by, bottom);
};

// ---- palms ----
export const palm = (p: Painter, x: number, baseY: number, h: number, trunk: string, leaf: string, sway = 0) => {
  for (let i = 0; i < h; i++) {
    const bend = Math.sin((i / h) * 1.4) * 4;
    p.rect(x + bend, baseY - i, 2, 1, i % 3 === 0 ? shade(trunk, -0.2) : trunk);
  }
  const tx = x + Math.sin(1.4) * 4 + 1, ty = baseY - h;
  const fronds: [number, number][] = [[-14, 4], [-10, 9], [14, 5], [10, 10], [-5, -6], [6, -5], [0, 11]];
  fronds.forEach(([dx, dy], k) => {
    const n = 12;
    for (let s = 0; s <= n; s++) {
      const u = s / n;
      const fx = tx + dx * u + sway * u * u, fy = ty + dy * u * u - Math.sin(u * Math.PI) * 3;
      p.px(fx, fy, k % 2 ? leaf : shade(leaf, -0.15));
      if (s > 2 && s % 2 === 0) p.px(fx, fy + 1, shade(leaf, -0.3));
    }
  });
  p.disc(tx, ty + 1, 2, shade(trunk, -0.35));
};

// ---- electricity poles with the famous Lagos cable tangle ----
export const pole = (p: Painter, x: number, topY: number, baseY: number, col = '#5b4b3c') => {
  p.rect(x, topY, 2, baseY - topY, col);
  p.rect(x - 5, topY + 3, 12, 1, shade(col, -0.2));
  p.rect(x - 3, topY + 8, 8, 1, shade(col, -0.2));
  p.rect(x - 2, topY + 12, 3, 4, '#3d3d3d'); // transformer box
};

// ---- vehicles ----
export const danfo = (p: Painter, x: number, y: number, t: number) => {
  // generic yellow minibus with black stripes (y = road contact)
  const bob = Math.floor(t * 8) % 2;
  const Y = y - 16 + bob * 0;
  p.rect(x + 1, Y + 2, 34, 12, '#f2b705');
  p.rect(x + 3, Y, 28, 3, '#f2b705');
  p.rect(x + 1, Y + 9, 34, 1, '#1a1a1a');
  p.rect(x + 1, Y + 11, 34, 1, '#1a1a1a');
  for (let i = 0; i < 5; i++) p.rect(x + 4 + i * 6, Y + 3, 5, 5, '#3c4a57');
  for (let i = 0; i < 5; i++) p.px(x + 5 + i * 6, Y + 4, '#9fb4c4');
  p.rect(x + 31, Y + 3, 4, 5, '#2a3540');
  p.rect(x + 2, Y + 13, 33, 1, shade('#f2b705', -0.4));
  p.rect(x + 34, Y + 10, 2, 2, '#fff3b0');
  p.disc(x + 8, y - 1, 2.6, '#1a1a1a');
  p.disc(x + 28, y - 1, 2.6, '#1a1a1a');
  p.px(x + 8, y - 1, '#777');
  p.px(x + 28, y - 1, '#777');
  // passenger heads
  for (let i = 0; i < 4; i++) p.rect(x + 5 + i * 6, Y + 5, 2, 2, '#4a2a1a');
  // luggage on the roof rack
  p.rect(x + 8, Y - 2, 10, 2, '#7a5230');
  p.rect(x + 20, Y - 3, 6, 3, '#2e86c1');
};

export const keke = (p: Painter, x: number, y: number, t: number) => {
  const Y = y - 13;
  p.rect(x + 2, Y + 1, 14, 2, '#16a266'); // canopy
  p.rect(x + 2, Y + 3, 1, 6, '#1a1a1a');
  p.rect(x + 15, Y + 3, 1, 6, '#1a1a1a');
  p.rect(x + 1, Y + 8, 17, 4, '#f2b705');
  p.rect(x + 3, Y + 4, 3, 4, '#4a2a1a');
  p.disc(x + 4, y - 1, 2, '#1a1a1a');
  p.disc(x + 16, y - 1, 2, '#1a1a1a');
  if (Math.floor(t * 10) % 2) p.px(x + 19, Y + 9, '#888');
};

export const doubleDecker = (p: Painter, x: number, y: number, night: boolean) => {
  // generic red double-deck bus, no logos. y = road contact, 64 px long, 34 tall
  const Y = y - 34, red = '#c8102e', dark = shade(red, -0.35);
  p.rect(x, Y + 2, 64, 30, red);
  p.rect(x + 2, Y, 60, 3, red);
  p.rect(x, Y + 15, 64, 2, dark);
  const win = night ? '#ffd27a' : '#6d7f8f';
  for (let i = 0; i < 6; i++) {
    p.rect(x + 3 + i * 10, Y + 4, 8, 8, win);
    p.rect(x + 3 + i * 10, Y + 18, 8, 7, win);
    if (!night) p.px(x + 4 + i * 10, Y + 5, '#b8c7d4');
  }
  p.rect(x + 2, Y + 18, 7, 12, '#2a2f35'); // door
  p.rect(x + 3, Y + 1, 10, 2, '#1a1a1a'); // destination blind
  p.text('25', x + 5, Y - 5 + 6 - 1, '#ffd27a');
  p.rect(x, Y + 29, 64, 3, dark);
  p.disc(x + 11, y - 1, 3.3, '#151515');
  p.disc(x + 52, y - 1, 3.3, '#151515');
  p.px(x + 11, y - 1, '#888');
  p.px(x + 52, y - 1, '#888');
  p.rect(x - 1, Y + 26, 2, 2, night ? '#fff6cc' : '#e9e2c0');
};

// ---- weather ----
export const rain = (p: Painter, t: number, w: number, h: number, seed: number, count: number, len: number, col: string, speed = 260) => {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x0 = r() * (w + 40), y0 = r() * h, sp = speed * (0.8 + r() * 0.4);
    const y = (y0 + t * sp) % h;
    const x = (x0 - y * 0.18 - t * sp * 0.18) % (w + 40);
    const xx = x < 0 ? x + w + 40 : x;
    for (let k = 0; k < len; k++) p.px(xx - 20 - k * 0.18, y - k, col);
  }
};
export const splashes = (p: Painter, t: number, x0: number, w: number, y: number, seed: number, count: number, col: string) => {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * w, ph = r();
    const k = (t * 3 + ph) % 1;
    if (k < 0.35) {
      const s = Math.floor(k * 8);
      p.px(x - s, y - s, col);
      p.px(x + s, y - s, col);
    }
  }
};
export const motes = (p: Painter, t: number, w: number, h: number, seed: number, count: number, col: string) => {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = (r() * w + Math.sin(t * 0.7 + i) * 6 + t * 3) % w, y = (r() * h + Math.cos(t * 0.5 + i * 2) * 5) % h;
    if (Math.sin(t * 2 + i * 1.7) > -0.2) p.px(x, y, col);
  }
};

// brick wall texture
export const bricks = (p: Painter, x: number, y: number, w: number, h: number, base: string, seed: number) => {
  p.rect(x, y, w, h, base);
  const r = rng(seed), mortar = shade(base, -0.28);
  for (let j = 0; j < h; j += 3) {
    p.hline(x, y + j, w, mortar);
    const off = (j / 3) % 2 ? 3 : 0;
    for (let i = off; i < w; i += 6) {
      p.px(x + i, y + j + 1, mortar);
      p.px(x + i, y + j + 2, mortar);
      if (r() > 0.75) p.rect(x + i + 1, y + j + 1, 5, 2, shade(base, r() > 0.5 ? 0.08 : -0.1));
    }
  }
};

// clear an area of a layer so the layer behind shows through (windows)
export const cut = (p: Painter, x: number, y: number, w: number, h: number) => p.ctx.clearRect(x, y, w, h);
