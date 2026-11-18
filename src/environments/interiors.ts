// Interiors: UK apartment, Lagos airport departures, Nigerian family living room, UK workplace.
// Windows are cut out of the wall layer so the outside (a deeper layer) parallaxes behind them.
import { shade, rng } from '../engine/pixel';
import type { Painter } from '../engine/pixel';
import { EnvDef, WORLD_H, bricks, cut, rain, motes, extra, isNight, palm } from './common';

// ---------------------------------------------------------------- UK apartment
const AW = 220;
export const ukApartment: EnvDef = {
  id: 'ukApartment',
  name: 'UK apartment (rented room)',
  worldW: AW,
  floorY: 262,
  layers: {
    sky: {
      depth: 0.15,
      draw: (p, env) => {
        const night = isNight(env);
        p.gradV(0, 0, AW, WORLD_H, night ? ['#0e1424', '#1e2a42'] : ['#7d8794', '#aab2bc']);
        // terraced rooftops opposite
        for (let x = 0; x < AW; x += 30) {
          p.poly([[x, 180], [x + 30, 180], [x + 26, 160], [x + 4, 160]], night ? '#1a2030' : '#4a505b');
          p.rect(x + 18, 150, 6, 10, night ? '#2a1c18' : '#6a3a2c');
          bricks(p, x, 180, 30, 80, night ? '#2c1a16' : '#7a4434', x);
          p.rect(x + 8, 192, 8, 12, night ? '#ffcf7a' : '#3a4250');
        }
      },
    },
    mid: {
      depth: 1,
      draw: (p, env) => {
        const night = isNight(env);
        const wall = night ? '#7d745f' : '#d8ceb4'; // magnolia, the colour of every UK rental
        p.rect(0, 0, AW, 236, wall);
        p.speckle(0, 0, AW, 236, shade(wall, -0.05), 700, 2);
        // damp/mould creeping from the ceiling corner
        p.glow(214, 0, 34, '#5c6a4a', 0.7, 26);
        p.glow(220, 0, 18, '#3e4a34', 0.8, 12);
        // window
        const wx = 40, wy = 70, ww = 70, wh = 96;
        p.rect(wx - 4, wy - 4, ww + 8, wh + 8, '#f2f0ea');
        cut(p, wx, wy, ww, wh);
        p.rect(wx + ww / 2 - 1, wy, 2, wh, '#f2f0ea');
        p.rect(wx, wy + 40, ww, 2, '#f2f0ea');
        p.rect(wx - 6, wy + wh + 4, ww + 12, 3, '#e6e2d8'); // sill
        // curtains
        p.rect(wx - 14, wy - 8, 10, wh + 20, '#6b7f9a');
        p.rect(wx + ww + 4, wy - 8, 10, wh + 20, '#6b7f9a');
        for (let k = 0; k < wh + 20; k += 3) { p.px(wx - 11, wy - 8 + k, '#56698a'); p.px(wx + ww + 7, wy - 8 + k, '#56698a'); }
        p.rect(wx - 18, wy - 10, ww + 36, 2, '#4a4a4a');
        // radiator under the window
        p.rect(wx - 2, 186, ww + 4, 30, '#efefea');
        for (let k = 0; k < ww; k += 4) p.vline(wx + k, 188, 26, '#cfcfc8');
        p.rect(wx + ww + 2, 206, 4, 3, '#b0b0a8');
        // pinned calendar + light switch + socket with too many adapters
        p.box(140, 60, 22, 28, '#ffffff', '#9a9a9a');
        p.rect(141, 61, 20, 6, '#c8102e');
        for (let r2 = 0; r2 < 4; r2++) for (let c = 0; c < 5; c++) p.px(143 + c * 4, 70 + r2 * 4, '#555');
        p.rect(170, 120, 6, 8, '#f6f4ee');
        p.rect(186, 222, 10, 7, '#f6f4ee');
        p.rect(188, 229, 3, 5, '#2a2a2a');
        p.rect(192, 229, 3, 5, '#2a2a2a');
        // skirting + laminate floor + rug
        p.rect(0, 234, AW, 3, '#f4f2ec');
        p.rect(0, 237, AW, WORLD_H - 237, '#a9845e');
        for (let y = 237; y < WORLD_H; y += 7) p.hline(0, y, AW, '#8f6c49');
        for (let y = 237, k = 0; y < WORLD_H; y += 7, k++) for (let x = (k % 3) * 13; x < AW; x += 40) p.vline(x, y, 7, '#8f6c49');
        p.ellipse(110, 290, 70, 22, '#6b4a5a');
        p.ellipse(110, 290, 62, 18, '#7d5a6a');
        // small table with the bills
        p.rect(140, 220, 46, 4, '#6b4a30');
        p.rect(144, 224, 3, 30, '#5a3c26');
        p.rect(179, 224, 3, 30, '#5a3c26');
        p.rect(146, 214, 10, 6, '#f8f6f0'); // envelopes
        p.rect(150, 211, 10, 6, '#ffffff');
        p.rect(152, 212, 6, 1, '#c8102e');
        p.rect(162, 213, 12, 7, '#f8e6e6');
        p.text('£', 165, 214, '#c8102e');
        p.rect(178, 212, 5, 8, '#e8e4dc'); // mug
        p.rect(183, 214, 2, 3, '#e8e4dc');
        // ceiling bulb
        p.rect(110, 0, 1, 20, '#333');
        p.disc(110, 22, 3, night ? '#fff3c0' : '#f0ecd8');
        if (night) p.glow(110, 22, 50, '#fff3c0', 0.3);
      },
      anim: (p, t, env) => {
        // rain running down the window glass
        const wx = 40, wy = 70, ww = 70, wh = 96;
        if ((env.weather ?? 'rain') !== 'clear') {
          const r = rng(5);
          for (let i = 0; i < 26; i++) {
            const x = wx + 1 + Math.floor(r() * (ww - 2)), sp = 10 + r() * 30;
            const y = wy + ((r() * wh + t * sp) % wh);
            p.px(x, y, 'rgba(220,235,250,0.85)');
            p.px(x, y - 1, 'rgba(220,235,250,0.4)');
          }
          p.ctx.save();
          p.ctx.beginPath();
          p.ctx.rect(wx, wy, ww, wh);
          p.ctx.clip();
          rain(p, t, AW, WORLD_H, 8, 60, 4, 'rgba(210,225,240,0.35)', 200);
          p.ctx.restore();
        }
        // steam from the mug
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.6 + i / 3) % 1;
          p.px(180 + Math.sin(k * 6 + i) * 1.5, 210 - k * 14, `rgba(255,255,255,${0.6 * (1 - k)})`);
        }
      },
    },
    fg: {
      depth: 1.35,
      blur: 3,
      draw: (p) => {
        // clothes airer drying laundry indoors
        p.rect(4, 200, 1, 70, '#9a9a9a');
        p.rect(40, 200, 1, 70, '#9a9a9a');
        for (let k = 0; k < 3; k++) p.hline(0, 204 + k * 6, 46, '#b0b0b0');
        p.rect(6, 205, 10, 16, '#2e86c1');
        p.rect(20, 205, 8, 12, '#ecf0f1');
        p.rect(30, 211, 9, 14, '#16a266');
      },
    },
  },
  grade: (env) =>
    isNight(env)
      ? { top: '#18203a', bottom: '#2a1a10', opacity: 0.35, vignette: 0.6, glow: { x: 0.5, y: 0.05, color: 'rgba(255,230,160,0.35)', size: 0.5 } }
      : { top: '#7f95b0', bottom: '#3a3530', opacity: 0.25, vignette: 0.5, glow: { x: 0.33, y: 0.33, color: 'rgba(200,220,240,0.35)', size: 0.5 } },
};

// ---------------------------------------------------------------- Airport (Lagos departures)
const PW = 260;
const departureBoard = (p: Painter, x: number, y: number, t: number, arrivals = false) => {
  p.box(x, y, 92, 50, '#0c0c10', '#3a3a44');
  p.text(arrivals ? 'ARRIVALS' : 'DEPARTURES', x + 4, y + 3, '#f2b705');
  const rows = arrivals
    ? [['LONDON', 'LANDED'], ['DUBAI', 'ON TIME'], ['ACCRA', 'DELAYED'], ['ABUJA', 'LANDED'], ['TORONTO', 'ON TIME']]
    : [['LONDON', 'BOARDING'], ['DUBAI', 'ON TIME'], ['ACCRA', 'DELAYED'], ['ABUJA', 'ON TIME'], ['TORONTO', 'ON TIME']];
  rows.forEach(([city, st], i) => {
    const yy = y + 11 + i * 7;
    p.text(city, x + 4, yy, '#ffd27a');
    const blink = i === 0 && Math.floor(t * 2) % 2 === 0;
    p.text(st, x + 52, yy, blink ? '#0c0c10' : st === 'DELAYED' ? '#ff6b5a' : i === 0 || st === 'LANDED' ? '#5ad381' : '#ffd27a');
  });
};
export const airport: EnvDef = {
  id: 'airport',
  name: 'Lagos airport departures',
  worldW: PW,
  floorY: 262,
  layers: {
    sky: {
      depth: 0.12,
      draw: (p, env) => {
        p.gradV(0, 0, PW, WORLD_H, isNight(env) ? ['#0f1630', '#263a60'] : ['#8fc3e8', '#cfe6f2', '#f2ecd8']);
        p.disc(60, 50, 9, isNight(env) ? '#f0ecd8' : '#fff8dc');
      },
    },
    distant: {
      depth: 0.35,
      blur: 1.5,
      draw: (p, env) => {
        const night = isNight(env);
        p.rect(0, 150, PW, 60, night ? '#2a3040' : '#8a8f86'); // tarmac
        for (let x = 0; x < PW; x += 20) p.rect(x, 168, 10, 1, '#e8e2c0');
        p.rect(200, 92, 8, 58, night ? '#3a4050' : '#c8c4b8'); // tower
        p.rect(194, 84, 20, 10, night ? '#4a6080' : '#6a8aa0');
        palm(p, 20, 150, 30, '#6f5a3e', '#4f7a3c');
        palm(p, 240, 150, 34, '#6f5a3e', '#4f7a3c');
      },
      anim: (p, t, env) => {
        // a generic airliner (no airline livery): taxis, or takes off if the scene asks for it
        const takeoff = (env.props ?? []).includes('plane');
        const x = takeoff ? 40 + t * 22 : 70, y = takeoff ? 150 - Math.max(0, t - 2.5) * Math.max(0, t - 2.5) * 6 : 150;
        const body = '#f4f4f0';
        p.rect(x, y - 10, 70, 8, body);
        p.ellipse(x + 70, y - 6, 6, 4, body);
        p.poly([[x, y - 10], [x + 8, y - 10], [x + 2, y - 24]], '#16a266'); // tail, in the brand green
        p.poly([[x + 28, y - 4], [x + 44, y - 4], [x + 30, y + 6]], '#d8d8d4');
        for (let i = 0; i < 12; i++) p.px(x + 12 + i * 4, y - 8, '#3a4a5a');
        p.rect(x + 34, y - 3, 6, 3, '#9a9a96');
      },
    },
    mid: {
      depth: 1,
      draw: (p, env) => {
        const night = isNight(env);
        // terminal hall: ceiling, curtain wall of glass, floor
        p.rect(0, 0, PW, WORLD_H, '#d9d6cc');
        p.rect(0, 0, PW, 40, '#bdb8aa');
        for (let x = 6; x < PW; x += 24) p.rect(x, 34, 12, 2, '#fff8e0'); // ceiling lights
        cut(p, 0, 52, PW, 150);
        for (let x = 0; x <= PW; x += 32) p.rect(x, 52, 3, 150, '#5a6068'); // mullions
        p.rect(0, 50, PW, 3, '#5a6068');
        p.rect(0, 120, PW, 2, '#5a6068');
        // floor: polished tiles with reflections
        p.rect(0, 202, PW, WORLD_H - 202, '#cfc8b8');
        for (let y = 202; y < WORLD_H; y += 10) p.hline(0, y, PW, '#bdb5a2');
        for (let x = 0; x < PW; x += 20) p.vline(x, 202, WORLD_H, '#bdb5a2');
        p.dither(0, 204, PW, 30, '#ffffff', 0.12);
        // check-in counters
        for (let i = 0; i < 4; i++) {
          const cx = 10 + i * 64;
          p.rect(cx, 210, 40, 22, '#3a5a7a');
          p.rect(cx, 208, 40, 3, '#e8e4da');
          p.box(cx + 12, 186, 16, 9, '#16a266', '#0e6a43');
          p.text(String(i + 1), cx + 19, 188, '#ffffff');
        }
        // the queue barrier posts and belts
        for (let x = 0; x < PW; x += 30) {
          p.rect(x + 4, 238, 2, 18, '#9a9a9a');
          p.rect(x + 3, 254, 4, 2, '#7a7a7a');
          p.rect(x + 6, 241, 24, 2, '#2e3b7a');
        }
        // night: lit glass
        if (night) p.dither(0, 52, PW, 150, '#ffd27a', 0.04);
      },
      anim: (p, t, env) => {
        departureBoard(p, 150, 60, t, (env.props ?? []).includes('arrivals'));
        // travellers queueing with suitcases
        for (let k = 0; k < 7; k++) {
          const x = 8 + k * 17 + Math.sin(t * 0.8 + k) * 0.6;
          extra(p, x, 236, 300 + k, t, false);
          p.rect(x + 6, 229, 5, 7, ['#c0392b', '#1a1a1a', '#2e86c1', '#8e44ad', '#e8a317', '#1a1a1a', '#16a266'][k]);
          p.rect(x + 7, 227, 3, 2, '#333');
        }
        // luggage on the belt behind the counters, moving
        for (let k = 0; k < 4; k++) {
          const x = ((k * 18 + t * 12) % 70) + 150;
          p.rect(x, 202, 8, 6, ['#c0392b', '#2e86c1', '#16a266', '#e8a317'][k]);
        }
      },
    },
    fg: {
      depth: 1.3,
      blur: 3,
      draw: (p) => {
        // a luggage trolley edge and a planter close to the lens
        p.rect(PW - 34, 266, 30, 3, '#8a8a8a');
        p.rect(PW - 30, 236, 2, 32, '#8a8a8a');
        p.rect(PW - 30, 250, 22, 16, '#2a2a2a');
        p.rect(PW - 28, 236, 18, 14, '#7a1f2b');
        p.rect(0, 270, 26, 30, '#5a4a3a');
        for (let k = 0; k < 8; k++) p.line(12, 270, k * 4 - 4, 236 + (k % 3) * 6, '#2f6a2a');
      },
    },
    fx: {
      depth: 1,
      anim: (p, t) => {
        // sun shafts through the glass
        for (let k = 0; k < 4; k++) p.alpha(0.1, () => p.poly([[20 + k * 64, 52], [40 + k * 64, 52], [80 + k * 64, 260], [50 + k * 64, 260]], '#fff6d0'));
        motes(p, t, PW, 250, 3, 30, '#fffbe6');
      },
    },
  },
  grade: (env) =>
    isNight(env)
      ? { top: '#1a2850', bottom: '#2a2018', opacity: 0.3, vignette: 0.5 }
      : { top: '#ffe2a8', bottom: '#6a5030', opacity: 0.15, vignette: 0.35, glow: { x: 0.2, y: 0.1, color: 'rgba(255,240,190,0.45)', size: 0.6 } },
};

// ---------------------------------------------------------------- Nigerian family home (living room)
const HW = 220;
export const nigerianHome: EnvDef = {
  id: 'nigerianHome',
  name: 'Nigerian family living room',
  worldW: HW,
  floorY: 262,
  layers: {
    sky: {
      depth: 0.15,
      draw: (p, env) => {
        const night = isNight(env);
        p.gradV(0, 0, HW, WORLD_H, night ? ['#101830', '#24304e'] : ['#9fd0f0', '#f4e6c0']);
        // compound wall, mango tree
        p.rect(0, 150, HW, 60, night ? '#3a3a40' : '#d8c8a8');
        for (let x = 0; x < HW; x += 6) p.px(x, 149, '#6a6a6a');
        p.disc(160, 110, 30, night ? '#14301e' : '#3f7a34');
        p.disc(140, 125, 22, night ? '#10281a' : '#356a2c');
        p.rect(155, 130, 5, 30, '#5a3c26');
      },
    },
    mid: {
      depth: 1,
      draw: (p, env) => {
        const night = isNight(env), props = env.props ?? [];
        const wall = night ? '#6a8a7a' : '#bfe0d0';
        p.rect(0, 0, HW, 236, wall);
        p.speckle(0, 0, HW, 236, shade(wall, -0.06), 600, 4);
        // window with burglary-proof bars and lace curtain
        const wx = 120, wy = 70, ww = 64, wh = 70;
        p.rect(wx - 3, wy - 3, ww + 6, wh + 6, '#7a5230');
        cut(p, wx, wy, ww, wh);
        for (let k = 4; k < ww; k += 8) p.rect(wx + k, wy, 1, wh, '#3a3a3a');
        p.rect(wx, wy + 34, ww, 1, '#3a3a3a');
        p.dither(wx - 8, wy - 6, 18, wh + 14, '#ffffff', 0.55);
        p.dither(wx + ww - 10, wy - 6, 18, wh + 14, '#ffffff', 0.55);
        // framed family photos and a wall clock
        for (let k = 0; k < 3; k++) {
          const fx = 14 + k * 26, fy = 64 + (k % 2) * 6;
          p.box(fx, fy, 20, 24, '#e8d8b0', '#6b4a20');
          p.rect(fx + 3, fy + 3, 14, 18, ['#c9a070', '#b0c0d0', '#d8b0a0'][k]);
          p.disc(fx + 10, fy + 9, 3, '#5e3422');
          p.rect(fx + 6, fy + 13, 8, 8, ['#16a266', '#8e44ad', '#e8a317'][k]);
        }
        p.disc(100, 40, 8, '#f6f2e6');
        p.disc(100, 40, 7, '#ffffff');
        p.line(100, 40, 100, 35, '#1a1a1a');
        p.line(100, 40, 104, 40, '#1a1a1a');
        // tiled floor
        p.rect(0, 236, HW, WORLD_H - 236, '#c8b89a');
        for (let y = 236; y < WORLD_H; y += 12) p.hline(0, y, HW, '#a89878');
        for (let x = 0; x < HW; x += 16) p.vline(x, 236, WORLD_H, '#a89878');
        p.ellipse(110, 286, 80, 24, '#8a2a2a'); // patterned rug
        p.ellipse(110, 286, 70, 19, '#b84a2a');
        for (let k = 0; k < 10; k++) p.px(50 + k * 12, 286, '#f2b705');
        // sofa with white crochet head-rest covers
        p.rect(4, 196, 80, 40, '#6b2a3a');
        p.rect(4, 188, 80, 12, '#7d3446');
        p.rect(0, 200, 8, 36, '#5a2030');
        p.rect(80, 200, 8, 36, '#5a2030');
        for (let k = 0; k < 3; k++) p.dither(10 + k * 25, 186, 18, 8, '#ffffff', 0.8);
        // TV on a wooden cabinet
        p.rect(140, 196, 60, 40, '#6b4a30');
        p.rect(142, 200, 26, 30, '#5a3c26');
        p.rect(172, 200, 26, 30, '#5a3c26');
        p.rect(146, 160, 50, 34, '#1a1a1a');
        p.rect(166, 194, 10, 3, '#2a2a2a');
        // a standing fan
        p.rect(206, 200, 2, 36, '#e8e8e8');
        p.disc(207, 196, 8, '#d8e8f0');
        if (props.includes('blackout')) { p.alpha(0.72, () => p.rect(0, 0, HW, WORLD_H, '#05070d')); p.glow(152, 96, 46, '#3a5a8a', 0.35); }
      },
      anim: (p, t, env) => {
        const props = env.props ?? [];
        // TV news flicker
        const on = !props.includes('blackout');
        p.rect(148, 162, 46, 30, on ? (Math.floor(t * 3) % 2 ? '#3a6a9a' : '#4a7aaa') : '#0a0a0a');
        if (on) {
          p.rect(148, 184, 46, 6, '#c0392b');
          p.text('NEWS', 150, 185, '#ffffff');
          p.disc(171, 172, 5, '#5e3422');
        }
        // ceiling fan spinning
        const a = on ? t * 9 : t * 0.6;
        p.rect(100, 0, 2, 16, '#3a3a3a');
        p.disc(101, 17, 3, '#e8e8e8');
        for (let k = 0; k < 3; k++) {
          const ang = a + (k * Math.PI * 2) / 3, len = 26;
          const ex = 101 + Math.cos(ang) * len, ey = 17 + Math.sin(ang) * len * 0.18;
          p.line(101, 17, ex, ey, '#d8d0b8');
          p.line(101, 18, ex, ey + 1, '#b8b098');
        }
      },
    },
    fg: {
      depth: 1.35,
      blur: 3,
      draw: (p) => {
        p.rect(HW - 40, 250, 50, 60, '#5a2030');
        p.rect(HW - 44, 244, 54, 10, '#6b2a3a');
        p.dither(HW - 38, 244, 30, 6, '#ffffff', 0.7);
      },
    },
    fx: { depth: 1, anim: (p, t) => motes(p, t, HW, 240, 9, 25, '#fff6d8') },
  },
  grade: (env) =>
    (env.props ?? []).includes('blackout') || isNight(env)
      ? { top: '#101830', bottom: '#2a1808', opacity: 0.4, vignette: 0.65, glow: { x: 0.5, y: 0.6, color: 'rgba(255,170,80,0.25)', size: 0.4 } }
      : { top: '#ffe0a0', bottom: '#5a3a20', opacity: 0.15, vignette: 0.35, glow: { x: 0.7, y: 0.3, color: 'rgba(255,240,200,0.45)', size: 0.5 } },
};

// ---------------------------------------------------------------- UK workplace (modern open-plan office)
const OW = 240;
export const ukWorkplace: EnvDef = {
  id: 'ukWorkplace',
  name: 'UK workplace (open-plan office)',
  worldW: OW,
  floorY: 262,
  layers: {
    sky: {
      depth: 0.12,
      draw: (p, env) => {
        p.gradV(0, 0, OW, WORLD_H, isNight(env) ? ['#0e1426', '#2a3550'] : ['#9aa6b4', '#c8ced4']);
        const r = rng(2);
        for (let x = 0; x < OW; x += 26) {
          const h = 60 + r() * 80;
          p.rect(x, 200 - h, 22, h + 20, isNight(env) ? '#1e2638' : '#7c8794');
          for (let wy = 204 - h; wy < 196; wy += 5) p.hline(x + 2, wy, 18, isNight(env) ? '#e8c070' : '#9aa6b2');
        }
      },
    },
    mid: {
      depth: 1,
      draw: (p) => {
        p.rect(0, 0, OW, WORLD_H, '#e8e6e0');
        p.rect(0, 0, OW, 30, '#d0cec6');
        for (let x = 10; x < OW; x += 40) p.rect(x, 26, 24, 2, '#ffffff');
        cut(p, 0, 44, OW, 120);
        for (let x = 0; x <= OW; x += 40) p.rect(x, 44, 2, 120, '#4a4f56');
        p.rect(0, 42, OW, 2, '#4a4f56');
        // whiteboard with sticky notes, plants
        p.box(14, 120, 50, 34, '#ffffff', '#8a8a8a');
        const notes = ['#f7dc6f', '#82e0aa', '#f5b7b1', '#85c1e9'];
        for (let k = 0; k < 8; k++) p.rect(18 + (k % 4) * 11, 124 + Math.floor(k / 4) * 12, 8, 8, notes[k % 4]);
        // carpet tiles
        p.rect(0, 236, OW, WORLD_H - 236, '#5a6070');
        for (let y = 236; y < WORLD_H; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < OW; x += 16) p.rect(x, y, 8, 16, '#545a6a');
        // desks with monitors
        for (let i = 0; i < 3; i++) {
          const dx = 70 + i * 58;
          p.rect(dx, 206, 50, 4, '#f4f2ee');
          p.rect(dx + 2, 210, 2, 26, '#9a9a9a');
          p.rect(dx + 46, 210, 2, 26, '#9a9a9a');
          p.rect(dx + 14, 186, 22, 15, '#1e2228');
          p.rect(dx + 24, 201, 2, 5, '#3a3a3a');
          p.rect(dx + 10, 204, 12, 2, '#d8d8d8');
        }
        // plant + coffee point
        p.rect(222, 216, 12, 20, '#c8b8a0');
        for (let k = 0; k < 7; k++) p.line(228, 216, 216 + k * 4, 190 + (k % 3) * 5, '#2f6a2a');
      },
      anim: (p, t) => {
        // colleagues at desks (diverse, ordinary office life)
        for (let i = 0; i < 3; i++) {
          const dx = 70 + i * 58;
          p.rect(dx + 16, 188, 18, 11, Math.floor(t * 2 + i) % 3 ? '#3a6a9a' : '#2a5a8a'); // screen glow
          extra(p, dx + 30, 236, 400 + i, t, false);
        }
      },
    },
    fg: {
      depth: 1.3,
      blur: 3,
      draw: (p) => {
        p.rect(0, 250, 40, 6, '#f4f2ee');
        p.rect(4, 230, 18, 20, '#1e2228');
        p.rect(26, 244, 8, 6, '#ffffff');
      },
    },
  },
  grade: () => ({ top: '#c8d8e8', bottom: '#2a3040', opacity: 0.18, vignette: 0.4, glow: { x: 0.5, y: 0.2, color: 'rgba(230,240,255,0.35)', size: 0.6 } }),
};
