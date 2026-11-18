// Draws one frame of a cast member as original pixel art on a 40x64 logical canvas (feet at y=61).
// Two passes: a 1px dark outline pass (shapes grown by one pixel), then the fills and the face.
import { Painter, shade } from '../engine/pixel';
import type { Pose } from '../engine/types';
import type { CharacterLook } from './cast';

export const CHAR_W = 40;
export const CHAR_H = 64;
export const FEET_Y = 61;
const INK = '#1a1016';

type Pt = [number, number];
interface Face {
  eyes: 'open' | 'blink' | 'wide' | 'happy' | 'down' | 'up';
  brows: 'neutral' | 'worried' | 'raised' | 'think';
  mouth: 'closed' | 'smile' | 'frown' | 'o' | 'grin' | 'small' | 'open';
}
interface Body {
  armL: Pt[]; // elbow, hand (screen-left arm)
  armR: Pt[];
  legs: [number, number]; // y lift of left/right foot (walk)
  stride: [number, number]; // x offset of left/right foot
  bob: number;
  headDy: number;
  jump: number;
  phone?: boolean;
  sit?: boolean;
}

export interface CharFrame {
  pose: Pose;
  t: number; // seconds (for loops)
  mouthAmp: number; // 0..1 loudness while speaking
  blink: boolean;
}

const poseBody = (pose: Pose, t: number, L: number, R: number, cx: number): { body: Body; face: Face } => {
  const breathe = Math.floor(t * 1.6) % 2;
  const down = (x: number): Pt[] => [[x, 36], [x, 42]];
  const base: Body = { armL: down(L - 1), armR: down(R + 1), legs: [0, 0], stride: [0, 0], bob: breathe, headDy: 0, jump: 0 };
  const face: Face = { eyes: 'open', brows: 'neutral', mouth: 'closed' };
  switch (pose) {
    case 'walk': {
      const s = Math.floor(t * 8) % 4;
      const st: [number, number][] = [[-2, 2], [0, 0], [2, -2], [0, 0]];
      base.stride = st[s];
      base.legs = s === 1 ? [1, 0] : s === 3 ? [0, 1] : [0, 0];
      base.bob = s % 2;
      base.armL = [[L - 1 + st[s][1] / 2, 36], [L - 1 + st[s][1], 41]];
      base.armR = [[R + 1 + st[s][0] / 2, 36], [R + 1 + st[s][0], 41]];
      face.mouth = 'smile';
      break;
    }
    case 'talk': {
      const g = Math.sin(t * 5) > 0 ? 1 : 0;
      base.armR = [[R + 3, 35], [R + 6, 31 - g]];
      break;
    }
    case 'happy': {
      const j = Math.abs(Math.sin(t * 7)) * 3;
      base.jump = Math.round(j);
      base.armL = [[L - 4, 25], [L - 6, 18]];
      base.armR = [[R + 4, 25], [R + 6, 18]];
      face.eyes = 'happy';
      face.mouth = 'grin';
      face.brows = 'raised';
      break;
    }
    case 'wave': {
      const a = Math.sin(t * 9) > 0 ? 1 : -1;
      base.armR = [[R + 4, 27], [R + 5 + a * 2, 18]];
      face.mouth = 'smile';
      break;
    }
    case 'sad':
      base.headDy = 1;
      base.bob = 1;
      base.armL = [[L, 37], [L + 1, 43]];
      base.armR = [[R, 37], [R - 1, 43]];
      face.eyes = 'down';
      face.brows = 'worried';
      face.mouth = 'frown';
      break;
    case 'shocked': {
      const jit = t < 0.5 ? (Math.floor(t * 20) % 2 ? 1 : -1) : 0;
      base.jump = t < 0.35 ? 3 : 0;
      base.armL = [[L - 4, 31], [L - 8 + jit, 25]];
      base.armR = [[R + 4, 31], [R + 8 - jit, 25]];
      face.eyes = 'wide';
      face.brows = 'raised';
      face.mouth = 'o';
      break;
    }
    case 'thinking':
      base.armR = [[R + 3, 34], [cx + 5, 28]];
      base.armL = [[L + 2, 37], [R - 3, 38]];
      face.eyes = 'up';
      face.brows = 'think';
      break;
    case 'phone':
      base.armR = [[R + 5, 30], [cx + 8, 21]];
      base.phone = true;
      break;
    case 'sit':
      base.sit = true;
      break;
  }
  return { body: base, face };
};

export const drawCharacter = (p: Painter, look: CharacterLook, f: CharFrame) => {
  const cx = 20;
  const half = 6 + Math.round(look.build * 2);
  const L = cx - half, R = cx + half; // torso edges
  const { body, face } = poseBody(f.pose, f.t, L, R, cx);
  if (f.blink && face.eyes !== 'happy') face.eyes = 'blink';
  // speaking overrides the mouth with an open shape sized by loudness
  if (f.mouthAmp > 0.08) face.mouth = face.mouth === 'grin' ? 'grin' : f.mouthAmp > 0.45 ? 'open' : 'small';
  else if (f.pose === 'talk' || f.pose === 'phone') face.mouth = 'closed';

  const lift = -body.jump + (body.sit ? 6 : 0);
  const by = body.bob + lift; // upper-body offset
  const skin = look.skin, skinD = shade(skin, -0.25), skinL = shade(skin, 0.12);
  const top = look.top, topD = shade(top, -0.25);
  const bottom = look.bottom, bottomD = shade(bottom, -0.3);

  for (const pass of [0, 1] as const) {
    const o = pass === 0 ? 1 : 0;
    const R_ = (x: number, y: number, w: number, h: number, c: string) => p.rect(x - o, y - o, w + 2 * o, h + 2 * o, pass ? c : INK);
    const E = (x: number, y: number, rx: number, ry: number, c: string) => p.ellipse(x, y, rx + o, ry + o, pass ? c : INK);
    const limb = (pts: Pt[], w: number, c: string) => {
      for (let i = 0; i + 1 < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
        for (let k = 0; k <= n; k++) R_(Math.round(x0 + ((x1 - x0) * k) / n) - 1, Math.round(y0 + ((y1 - y0) * k) / n) - 1, w, w, c);
      }
    };
    // ---- legs / skirt
    const legTop = 44 + lift;
    if (look.longSkirt) {
      p.poly(
        [[L - 1 - o, legTop - 2 - o], [R + 1 + o, legTop - 2 - o], [R + 3 + o, FEET_Y - 2 + o], [L - 3 - o, FEET_Y - 2 + o]],
        pass ? bottom : INK,
      );
      if (pass) for (let y = legTop; y < FEET_Y - 2; y += 3) for (let x = L - 1; x < R + 2; x += 3) p.px(x + ((y / 3) % 2), y, look.topPattern ?? bottomD);
      R_(cx - 5, FEET_Y - 2, 4, 2, look.shoes);
      R_(cx + 2, FEET_Y - 2, 4, 2, look.shoes);
    } else if (body.sit) {
      R_(cx - 6, legTop, 12, 4, bottom);
      R_(cx - 6, legTop + 4, 4, 10, bottomD);
      R_(cx + 2, legTop + 4, 4, 10, bottom);
      R_(cx - 7, FEET_Y - 2, 5, 2, look.shoes);
      R_(cx + 2, FEET_Y - 2, 5, 2, look.shoes);
    } else {
      const lx = cx - 5 + body.stride[0], rx = cx + 1 + body.stride[1];
      R_(lx, legTop, 4, FEET_Y - 2 - legTop - body.legs[0], bottomD);
      R_(rx, legTop, 4, FEET_Y - 2 - legTop - body.legs[1], bottom);
      R_(lx - 1, FEET_Y - 2 - body.legs[0], 5, 2, look.shoes);
      R_(rx, FEET_Y - 2 - body.legs[1], 5, 2, look.shoes);
    }
    // ---- back arm (screen-left), torso, front arm
    const shoulderY = 30 + by;
    limb([[L, shoulderY], ...body.armL.map(([x, y]) => [x, y + by] as Pt)], 3, topD);
    const hl = body.armL[body.armL.length - 1];
    R_(hl[0] - 1, hl[1] + by, 3, 3, skinD);
    R_(L, 28 + by, R - L + 1, legTop - 28 - by + 1, top);
    if (pass) {
      p.rect(L, 28 + by, 2, legTop - 28 - by, topD); // shading
      p.rect(cx - 1, 28 + by, 3, 2, skinD); // collar opening
      if (look.topPattern && !look.longSkirt) for (let y = 31 + by; y < legTop; y += 3) for (let x = L + 1; x < R; x += 3) p.px(x + ((y / 3) % 2), y, look.topPattern);
      if (look.topPattern && look.longSkirt) for (let y = 31 + by; y < legTop - 1; y += 3) for (let x = L + 1; x < R; x += 3) p.px(x + ((y / 3) % 2), y, look.topPattern);
      if (!look.longSkirt) p.rect(L, legTop - 1, R - L + 1, 1, bottomD); // belt line
      if (look.accessory === 'beads') for (let x = cx - 3; x <= cx + 3; x += 2) p.px(x, 30 + by, '#c0392b');
    }
    limb([[R, shoulderY], ...body.armR.map(([x, y]) => [x, y + by] as Pt)], 3, top);
    const hr = body.armR[body.armR.length - 1];
    R_(hr[0] - 1, hr[1] + by, 3, 3, skin);
    if (pass && look.accessory === 'watch') p.rect(hr[0] - 1, hr[1] + by - 1, 3, 1, '#d4af37');
    if (body.phone) {
      R_(hr[0] - 1, hr[1] + by - 4, 2, 5, '#202428');
      if (pass) p.px(hr[0] - 1, hr[1] + by - 3, '#6ad0ff');
    }
    // ---- neck + head
    const hy = 19 + by + body.headDy;
    R_(cx - 2, 25 + by, 4, 4, skinD);
    E(cx, hy, 6.5, 7, skin);
    // ears
    R_(cx - 7, hy, 1, 3, skinD);
    R_(cx + 7, hy, 1, 3, skinD);
    // ---- hair
    const hc = look.hairColor;
    if (look.hair === 'fade') {
      E(cx, hy - 4, 6.5, 3.5, hc);
    } else if (look.hair === 'low') {
      E(cx, hy - 5, 6.2, 2.6, hc);
    } else if (look.hair === 'puff') {
      E(cx, hy - 7, 8, 5, hc);
      if (pass) p.speckle(cx - 7, hy - 11, 14, 8, shade(hc, 0.2), 10, 3);
    } else if (look.hair === 'braids') {
      E(cx, hy - 4, 7, 4, hc);
      R_(cx - 8, hy - 3, 3, 16, hc);
      R_(cx + 6, hy - 3, 3, 16, hc);
      if (pass) for (let y = hy - 2; y < hy + 13; y += 2) { p.px(cx - 7, y, shade(hc, 0.25)); p.px(cx + 7, y, shade(hc, 0.25)); }
    } else if (look.hair === 'gele') {
      // the gele: a big folded head-tie with a fan on top
      E(cx, hy - 6, 9, 4.5, hc);
      p.poly(
        [[cx - 9 - o, hy - 6], [cx - 3, hy - 16 - o], [cx + 4, hy - 14 - o], [cx + 11 + o, hy - 7]],
        pass ? shade(hc, 0.1) : INK,
      );
      if (pass) {
        for (let k = -8; k <= 9; k += 3) p.line(cx, hy - 5, cx + k, hy - 12 - Math.abs(k) * 0.2, shade(hc, -0.25));
        p.speckle(cx - 9, hy - 14, 19, 10, look.topPattern ?? '#f2b705', 14, 8);
      }
    }
    if (pass === 0) continue;
    // ---- face (front 3/4: eyes shifted one pixel toward where the character faces)
    p.rect(cx + 5, hy - 2, 1, 5, skinL); // light side of the face
    const ey = hy + 1, lx = cx - 3, rx = cx + 2;
    const eye = (x: number) => {
      switch (face.eyes) {
        case 'blink': p.rect(x, ey + 1, 2, 1, INK); break;
        case 'happy': p.px(x, ey + 1, INK); p.px(x + 1, ey, INK); p.px(x + 2, ey + 1, INK); break;
        case 'wide': p.rect(x - 1, ey - 1, 3, 3, '#fbf7ee'); p.px(x, ey, INK); break;
        case 'down': p.rect(x, ey + 1, 2, 1, INK); p.px(x + 1, ey + 2, INK); break;
        case 'up': p.rect(x, ey - 1, 1, 2, INK); break;
        default: p.rect(x + 1, ey, 1, 2, INK); p.px(x, ey, '#fbf7ee');
      }
    };
    eye(lx);
    eye(rx);
    const brow = (x: number, side: number) => {
      if (face.brows === 'raised') p.rect(x, ey - 3, 2, 1, INK);
      else if (face.brows === 'worried') { p.px(x + (side < 0 ? 1 : 0), ey - 2, INK); p.px(x + (side < 0 ? 0 : 1), ey - 3, INK); }
      else if (face.brows === 'think') p.rect(x, ey - (side > 0 ? 3 : 2), 2, 1, INK);
      else p.rect(x, ey - 2, 2, 1, shade(look.hairColor, 0.1));
    };
    brow(lx, -1);
    brow(rx, 1);
    if (look.accessory === 'glasses') {
      p.rect(lx - 1, ey - 1, 4, 1, '#2a2a2a');
      p.rect(rx - 1, ey - 1, 4, 1, '#2a2a2a');
      p.px(lx - 1, ey, '#2a2a2a'); p.px(rx + 2, ey, '#2a2a2a');
    }
    if (look.accessory === 'earrings' || look.accessory === 'beads') { p.px(cx - 7, hy + 3, '#f2b705'); p.px(cx + 7, hy + 3, '#f2b705'); }
    // nose
    p.px(cx + 1, hy + 3, skinD);
    // mouth
    const my = hy + 5, mx = cx - 1;
    const lip = shade(skin, -0.45);
    switch (face.mouth) {
      case 'smile': p.rect(mx, my + 1, 3, 1, lip); p.px(mx - 1, my, lip); p.px(mx + 3, my, lip); break;
      case 'frown': p.rect(mx, my, 3, 1, lip); p.px(mx - 1, my + 1, lip); p.px(mx + 3, my + 1, lip); break;
      case 'o': p.rect(mx, my - 1, 3, 3, '#3a0e10'); p.px(mx + 1, my, '#7a1f2b'); break;
      case 'grin': p.rect(mx - 1, my, 5, 2, '#3a0e10'); p.rect(mx - 1, my, 5, 1, '#fbf7ee'); break;
      case 'small': p.rect(mx, my, 3, 1, '#3a0e10'); p.px(mx + 1, my + 1, '#7a1f2b'); break;
      case 'open': p.rect(mx, my - 1, 3, 3, '#3a0e10'); p.rect(mx, my - 1, 3, 1, '#fbf7ee'); p.px(mx + 1, my + 1, '#b03040'); break;
      default: p.rect(mx, my, 3, 1, lip);
    }
  }
};
