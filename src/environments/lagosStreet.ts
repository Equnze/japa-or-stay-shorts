// Lagos street: warm haze, rooftop water tanks, two-storey shops with painted boards, electric poles with
// tangled cables, market umbrellas, a yellow danfo and a keke on the road, hawkers on the far kerb.
import { shade, rng } from '../engine/pixel';
import { EnvDef, WORLD_H, palm, pole, danfo, keke, extra, motes, isNight } from './common';

const W = 260;
const ROAD_TOP = 206, KERB = 232;

const SKY: Record<string, string[]> = {
  morning: ['#f7d29a', '#f9e2b4', '#f4ead0'],
  day: ['#f3b96a', '#f6d49a', '#f2e4c4'],
  evening: ['#d8693e', '#f0a052', '#f7cf8a'],
  night: ['#121429', '#2a2548', '#4a3550'],
};
const SHOPS = [
  { wall: '#e8b48a', board: '#16a266', text: 'PROVISIONS', ink: '#fff6d8' },
  { wall: '#bfe0cf', board: '#c0392b', text: 'PHONES', ink: '#ffffff' },
  { wall: '#f1e3b0', board: '#2e86c1', text: 'BARBING', ink: '#fff6d8' },
  { wall: '#d9b8d8', board: '#e8a317', text: 'POS', ink: '#1a1a1a' },
  { wall: '#c9d6e8', board: '#8e44ad', text: 'CHOPS', ink: '#fff6d8' },
  { wall: '#efc59a', board: '#1a1a1a', text: 'FASHION', ink: '#f2b705' },
];

export const lagosStreet: EnvDef = {
  id: 'lagosStreet',
  name: 'Lagos street',
  worldW: W,
  floorY: 262,
  layers: {
    sky: {
      depth: 0.08,
      draw: (p, env) => {
        const tod = env.timeOfDay ?? 'day';
        p.gradV(0, 0, W, WORLD_H, SKY[tod]);
        if (tod === 'night') {
          p.speckle(0, 0, W, 120, '#e9e2ff', 40, 7);
          p.disc(190, 50, 6, '#f3efd8');
        } else {
          const sx = tod === 'evening' ? 70 : 170, sy = tod === 'evening' ? 150 : 58;
          p.glow(sx, sy, 40, '#fff3cf', 0.6);
          p.disc(sx, sy, 13, '#fff1c2');
          p.disc(sx, sy, 10, '#fffbe8');
        }
      },
    },
    distant: {
      depth: 0.4,
      blur: 2,
      draw: (p, env) => {
        const r = rng(env.seed ?? 11), night = isNight(env);
        let x = -4;
        while (x < W) {
          const bw = 14 + Math.floor(r() * 18), bh = 40 + Math.floor(r() * 70), top = 200 - bh;
          const col = night ? shade('#2b2440', r() * 0.1) : shade('#c99d78', (r() - 0.5) * 0.15);
          p.rect(x, top, bw, bh + 10, col);
          for (let wy = top + 4; wy < 196; wy += 6)
            for (let wx = x + 2; wx < x + bw - 2; wx += 4) p.px(wx, wy, night ? (r() > 0.6 ? '#ffcf6a' : '#3b3355') : shade(col, -0.22));
          if (r() > 0.4) { p.rect(x + 3, top - 4, 5, 4, '#2a2a2a'); p.px(x + 5, top - 5, '#2a2a2a'); } // water tank
          x += bw + Math.floor(r() * 3);
        }
        palm(p, 22, 204, 46, '#6f5a3e', night ? '#1d3326' : '#4f7a3c');
        palm(p, 200, 204, 54, '#6f5a3e', night ? '#1d3326' : '#4f7a3c');
        // haze between far and near
        p.dither(0, 120, W, 90, night ? '#2a2548' : '#f2d9b0', 0.45);
      },
    },
    mid: {
      depth: 1,
      draw: (p, env) => {
        const r = rng((env.seed ?? 11) + 5), night = isNight(env);
        const dim = night ? -0.45 : 0;
        // far kerb and shop row
        let x = 0, i = 0;
        while (x < W) {
          const s = SHOPS[(i + (env.seed ?? 0)) % SHOPS.length], bw = 40 + Math.floor(r() * 8);
          const top = 128 + Math.floor(r() * 10);
          p.rect(x, top, bw, ROAD_TOP - top, shade(s.wall, dim));
          p.rect(x, top, bw, 2, shade(s.wall, dim - 0.15));
          // upstairs windows with burglar-proof bars and a balcony
          for (let k = 0; k < 2; k++) {
            const wx = x + 6 + k * 18;
            p.rect(wx, top + 8, 10, 12, night ? '#ffd27a' : '#3c3f4a');
            for (let b = 1; b < 10; b += 3) p.rect(wx + b, top + 8, 1, 12, shade('#6b6b6b', dim));
          }
          p.rect(x + 2, top + 22, bw - 4, 2, shade('#8a8a8a', dim));
          // painted signboard
          p.box(x + 3, top + 28, bw - 6, 10, shade(s.board, dim), shade(s.board, dim - 0.3));
          p.text(s.text.slice(0, Math.floor((bw - 10) / 4)), x + 6, top + 31, shade(s.ink, dim));
          // shop opening and goods
          p.rect(x + 5, top + 41, bw - 10, ROAD_TOP - top - 41, shade('#3a2c22', dim));
          for (let g = 0; g < 6; g++) p.rect(x + 7 + g * 5, ROAD_TOP - 8 - (g % 2) * 3, 4, 4 + (g % 2) * 3, shade(['#e74c3c', '#f1c40f', '#3498db', '#ecf0f1'][g % 4], dim - 0.1));
          x += bw;
          i++;
        }
        // road
        p.rect(0, ROAD_TOP, W, KERB - ROAD_TOP, shade('#6d655c', dim));
        p.speckle(0, ROAD_TOP, W, KERB - ROAD_TOP, shade('#5a524a', dim), 220, 3);
        for (let lx = 6; lx < W; lx += 26) p.rect(lx, 219, 12, 1, shade('#d8cfae', dim));
        // gutter and near sidewalk
        p.rect(0, KERB, W, 2, shade('#3d342b', dim));
        p.rect(0, KERB + 2, W, WORLD_H - KERB, shade('#b39b7c', dim));
        p.speckle(0, KERB + 2, W, WORLD_H - KERB, shade('#9c8466', dim), 500, 9);
        for (let tx = 0; tx < W; tx += 16) p.vline(tx, KERB + 2, 30, shade('#a08868', dim));
        // poles + cables (top of frame, in front of the shops)
        const poles = [34, 128, 222];
        poles.forEach((px) => pole(p, px, 70, KERB + 4, shade('#5b4b3c', dim)));
        for (let k = 0; k < poles.length - 1; k++)
          for (let c = 0; c < 5; c++) p.cable(poles[k], 73 + c * 2 + (c > 2 ? 3 : 0), poles[k + 1], 74 + c * 2, 8 + c * 2, '#1d1a18');
        p.cable(0, 80, poles[0], 74, 6, '#1d1a18');
        p.cable(poles[2], 76, W, 84, 6, '#1d1a18');
        // market umbrellas with stalls on the near sidewalk
        const umb = (ux: number, c1: string, c2: string) => {
          p.rect(ux + 11, 224, 1, 26, '#3d3d3d');
          for (let k = 0; k < 24; k += 4) p.poly([[ux + k, 226], [ux + k + 4, 226], [ux + 12, 214]], shade(k % 8 ? c1 : c2, dim));
          p.rect(ux + 2, 242, 20, 3, shade('#7a5230', dim));
          for (let k = 0; k < 6; k++) p.disc(ux + 5 + k * 3, 241, 1.5, shade(k % 2 ? '#d63a2a' : '#f39c12', dim));
          p.rect(ux + 4, 245, 2, 8, shade('#5a3c20', dim));
          p.rect(ux + 18, 245, 2, 8, shade('#5a3c20', dim));
        };
        umb(2, '#c0392b', '#f4f1e8');
        umb(214, '#2e86c1', '#f2b705');
      },
      anim: (p, t, env) => {
        const night = isNight(env);
        // hawkers and walkers on the far kerb
        for (let k = 0; k < 6; k++) {
          const dir = k % 2 ? 1 : -1;
          const x = ((k * 47 + dir * t * 9) % (W + 20) + W + 20) % (W + 20) - 10;
          extra(p, x, ROAD_TOP + 1, 30 + k, t, true, night ? -0.45 : 0);
        }
        // a hawker with a tray on her head
        const hx = 150 + Math.sin(t * 0.6) * 6;
        extra(p, hx, ROAD_TOP + 1, 99, t, true, night ? -0.4 : 0);
        p.rect(hx - 2, ROAD_TOP - 15, 9, 2, '#a8763e');
        p.rect(hx - 1, ROAD_TOP - 17, 2, 2, '#e74c3c');
        p.rect(hx + 3, ROAD_TOP - 17, 2, 2, '#f1c40f');
        // traffic (slow, of course)
        const crawl = (x0: number, sp: number) => ((x0 + t * sp) % (W + 80) + W + 80) % (W + 80) - 40;
        danfo(p, crawl(20, -14), 228, t);
        keke(p, crawl(150, 22), 230, t);
        danfo(p, crawl(190, -14), 228, t + 0.3);
      },
    },
    fg: {
      depth: 1.3,
      blur: 3,
      draw: (p, env) => {
        const night = isNight(env);
        palm(p, -6, WORLD_H, 120, '#4a3a28', night ? '#10241a' : '#2f5a2a', 6);
        p.cable(0, 30, W, 44, 10, '#141210');
        p.cable(0, 36, W, 38, 14, '#141210');
      },
    },
    fx: {
      depth: 1,
      anim: (p, t, env) => motes(p, t, W, 260, (env.seed ?? 1) + 77, 40, isNight(env) ? '#ffd27a' : '#fff4d0'),
    },
  },
  grade: (env) =>
    isNight(env)
      ? { top: '#1a1440', bottom: '#3a1c10', opacity: 0.35, vignette: 0.55, glow: { x: 0.5, y: 0.55, color: 'rgba(255,190,90,0.25)', size: 0.6 } }
      : { top: '#ffb35c', bottom: '#7a3a10', opacity: 0.18, vignette: 0.35, glow: { x: 0.85, y: 0.12, color: 'rgba(255,230,160,0.55)', size: 0.7 } },
};
