// London street with a bus stop: brick terraces with sash windows and chimney pots, a glass bus shelter,
// a generic red double-decker, lamppost, wet pavement with puddles and rain. No landmark postcards.
import { shade, rng } from '../engine/pixel';
import { EnvDef, WORLD_H, bricks, doubleDecker, extra, rain, splashes, isNight } from './common';

const W = 260;
const ROAD_TOP = 200, KERB = 234;

export const londonStreet: EnvDef = {
  id: 'londonStreet',
  name: 'London street / bus stop',
  worldW: W,
  floorY: 262,
  layers: {
    sky: {
      depth: 0.08,
      draw: (p, env) => {
        const night = isNight(env);
        p.gradV(0, 0, W, WORLD_H, night ? ['#0d1322', '#1b2740', '#33405c'] : ['#7f8996', '#a3abb6', '#c3c8ce']);
        // low clouds
        const r = rng(4);
        for (let i = 0; i < 9; i++) p.ellipse(r() * W, 20 + r() * 70, 30 + r() * 30, 6 + r() * 6, night ? '#202b44' : '#8a939f');
      },
    },
    distant: {
      depth: 0.38,
      blur: 2,
      draw: (p, env) => {
        const night = isNight(env), r = rng((env.seed ?? 3) + 1);
        // far blocks (hazy)
        for (let x = 0; x < W; x += 22) {
          const h = 50 + r() * 50;
          p.rect(x, 190 - h, 20, h + 10, night ? '#1f2a40' : '#8f97a1');
          for (let wy = 190 - h + 4; wy < 186; wy += 6) for (let wx = x + 2; wx < x + 18; wx += 4) if (r() > 0.5) p.px(wx, wy, night ? '#e8c070' : '#7c858f');
        }
        p.rect(170, 70, 2, 60, night ? '#1a2236' : '#7a828c'); // crane
        p.rect(140, 70, 50, 2, night ? '#1a2236' : '#7a828c');
        if (night) p.px(190, 69, '#ff4040');
        p.dither(0, 90, W, 110, night ? '#1b2740' : '#b8bec6', 0.5);
      },
    },
    mid: {
      depth: 1,
      draw: (p, env) => {
        const night = isNight(env), dim = night ? -0.5 : -0.05, r = rng((env.seed ?? 3) + 9);
        // terrace of brick houses
        for (let hx = 0; hx < W; hx += 44) {
          const base = ['#8a4a3a', '#7d4536', '#94533f', '#6f3f33'][Math.floor(r() * 4)];
          bricks(p, hx, 104, 44, ROAD_TOP - 104, shade(base, dim), hx + 3);
          // slate roof and chimney pots
          p.poly([[hx - 2, 104], [hx + 46, 104], [hx + 40, 92], [hx + 4, 92]], shade('#3f4550', dim));
          p.rect(hx + 30, 82, 8, 10, shade('#7a4030', dim));
          p.rect(hx + 31, 79, 2, 3, shade('#b0603a', dim));
          p.rect(hx + 35, 79, 2, 3, shade('#b0603a', dim));
          // sash windows, two floors
          for (const wy of [112, 146]) for (const wx of [hx + 6, hx + 26]) {
            p.rect(wx - 1, wy - 1, 14, 22, shade('#eeeae2', dim));
            const lit = night ? r() > 0.35 : false;
            p.rect(wx, wy, 12, 20, lit ? '#ffcf7a' : shade('#45505c', dim));
            p.rect(wx, wy + 9, 12, 1, shade('#eeeae2', dim));
            p.rect(wx + 6, wy, 1, 20, shade('#eeeae2', dim));
            if (!lit) p.px(wx + 2, wy + 2, shade('#9aa6b2', dim));
            p.rect(wx - 1, wy + 21, 14, 2, shade('#d8d2c6', dim));
          }
          // front door
          const door = ['#1f3a5f', '#2d5a3d', '#7a1f2b', '#1a1a1a'][Math.floor(r() * 4)];
          p.rect(hx + 18, 176, 8, 24, shade(door, dim));
          p.rect(hx + 17, 174, 10, 2, shade('#eeeae2', dim));
          p.px(hx + 24, 188, '#d4af37');
        }
        // road
        p.rect(0, ROAD_TOP, W, KERB - ROAD_TOP, shade('#3a3d42', dim));
        for (let lx = 4; lx < W; lx += 24) p.rect(lx, 216, 12, 1, shade('#d8d8d0', dim));
        p.rect(0, ROAD_TOP + 2, W, 1, shade('#e8d36a', dim)); // double yellow lines
        p.rect(0, ROAD_TOP + 4, W, 1, shade('#e8d36a', dim));
        // kerb + wet pavement slabs
        p.rect(0, KERB, W, 3, shade('#9a9a96', dim));
        p.rect(0, KERB + 3, W, WORLD_H - KERB, shade('#6e7176', dim));
        for (let j = KERB + 3; j < WORLD_H; j += 14) p.hline(0, j, W, shade('#5a5d62', dim));
        for (let i = 0; i < W; i += 18) p.vline(i + ((Math.floor(i / 18) % 2) * 9), KERB + 3, WORLD_H, shade('#5a5d62', dim));
        // puddles reflecting the sky/lamps
        for (const [px, py, pw] of [[30, 280, 26], [150, 296, 34], [210, 270, 18]] as const) {
          p.ellipse(px, py, pw / 2, 3, shade(night ? '#2b3a58' : '#9aa6b4', 0));
          p.hline(px - pw / 4, py, pw / 3, night ? '#ffcf7a' : '#d6dde4');
        }
        // lamppost
        p.rect(30, 120, 2, KERB + 6 - 120, '#1d2024');
        p.rect(26, 116, 10, 4, '#1d2024');
        p.rect(27, 120, 8, 3, night ? '#ffe2a0' : '#d8d2c0');
        if (night) p.glow(31, 124, 34, '#ffcf7a', 0.35, 60);
        // bus shelter (glass + steel), bench, timetable panel
        const sx = 128, sw = 64;
        p.rect(sx, 196, sw, 3, '#2a2d31'); // roof
        p.rect(sx, 199, 1, 57, '#3a3d42');
        p.rect(sx + sw - 1, 199, 1, 57, '#3a3d42');
        p.dither(sx + 1, 200, sw - 2, 54, night ? '#5a6f8a' : '#cfe0ea', 0.12); // glass
        p.line(sx + 4, 226, sx + 20, 202, night ? '#8aa0c0' : '#ffffff'); // glint
        p.hline(sx + 1, 228, sw - 2, '#3a3d42');
        p.rect(sx + 40, 206, 14, 18, night ? '#f4f0dc' : '#e8e4d4'); // timetable / ad panel (blank)
        p.rect(sx + 41, 207, 12, 3, '#c8102e');
        p.text('BUS', sx + 41, 212, '#1a1a1a');
        p.rect(sx + 6, 244, 30, 2, '#5a5d62'); // bench
        p.rect(sx + 8, 246, 1, 8, '#3a3d42');
        p.rect(sx + 33, 246, 1, 8, '#3a3d42');
        // bus stop pole + flag (generic)
        p.rect(sx + sw + 10, 180, 2, 76, '#4a4d52');
        p.box(sx + sw + 4, 176, 15, 13, '#c8102e', '#7a0a1a');
        p.text('BUS', sx + sw + 6, 178, '#ffffff');
        p.text('STOP', sx + sw + 4, 184, '#ffffff');
        // post box (generic red pillar)
        p.rect(72, 238, 9, 18, shade('#b8141e', dim + 0.05));
        p.rect(71, 236, 11, 3, shade('#8a0f17', dim));
        p.rect(74, 244, 5, 1, '#1a1a1a');
      },
      anim: (p, t, env) => {
        const night = isNight(env), props = env.props ?? [];
        // walkers with umbrellas on the far pavement
        for (let k = 0; k < 4; k++) {
          const x = ((k * 71 + (k % 2 ? 1 : -1) * t * 8) % (W + 20) + W + 20) % (W + 20) - 10;
          extra(p, x, ROAD_TOP, 200 + k, t, true, night ? -0.5 : -0.1);
          p.rect(x - 3, ROAD_TOP - 16, 11, 2, ['#1a1a1a', '#2e86c1', '#7a1f2b', '#1a1a1a'][k]);
          p.px(x + 2, ROAD_TOP - 17, '#1a1a1a');
        }
        // the bus: drives past, or pulls in and leaves
        if (props.includes('busPass') || props.includes('splash')) {
          const bx = W + 20 - ((t - 1.2) * 150);
          if (bx > -80 && bx < W + 30) doubleDecker(p, bx, 228, night);
        } else if (props.includes('busArrives')) {
          const bx = t < 2 ? W + 20 - t * 70 : t < 5 ? 120 : 120 - (t - 5) * 90;
          doubleDecker(p, bx, 228, night);
        } else {
          const bx = ((W + 80) - (t * 40) % (W + 160));
          doubleDecker(p, bx, 228, night);
        }
      },
    },
    fg: {
      depth: 1.3,
      blur: 3,
      draw: (p) => {
        // black railing close to the lens
        p.rect(0, 300, W, 2, '#121417');
        for (let x = 0; x < W; x += 6) p.rect(x, 300, 1, 40, '#121417');
        for (let x = 0; x < W; x += 6) p.px(x, 299, '#121417');
      },
    },
    fx: {
      depth: 1,
      anim: (p, t, env) => {
        const w = env.weather ?? 'rain';
        if (w === 'rain' || w === 'overcast') {
          const heavy = w === 'rain';
          rain(p, t, W, WORLD_H, 21, heavy ? 150 : 40, 6, isNight(env) ? 'rgba(200,215,255,0.55)' : 'rgba(225,235,245,0.65)');
          splashes(p, t, 0, W, 262, 5, heavy ? 30 : 6, 'rgba(230,240,250,0.8)');
        }
        // the splash gag: water arcs off the road onto the pavement as the bus passes
        if ((env.props ?? []).includes('splash')) {
          const k = (t - 2.25) / 0.6;
          if (k > 0 && k < 1) {
            for (let i = 0; i < 40; i++) {
              const a = (i / 40) * Math.PI * 0.9 + 0.1, v = 40 + (i % 5) * 9;
              const x = 160 + Math.cos(a) * v * k * 1.4 - 20, y = 236 - Math.sin(a) * v * k * 1.2 + 60 * k * k;
              p.rect(x, y, 2, 2, 'rgba(170,200,230,0.9)');
            }
          }
        }
      },
    },
  },
  grade: (env) =>
    isNight(env)
      ? { top: '#0a1430', bottom: '#101828', opacity: 0.4, vignette: 0.6, glow: { x: 0.17, y: 0.42, color: 'rgba(255,200,110,0.35)', size: 0.45 } }
      : { top: '#5a6f8a', bottom: '#30363e', opacity: 0.28, vignette: 0.45 },
};
