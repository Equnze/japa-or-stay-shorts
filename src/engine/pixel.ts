// Tiny pixel-art painter on a low-resolution canvas. Everything in this studio is drawn in "logical pixels"
// (the full 1080x1920 frame is 180x320 of them, so 1 logical pixel = 6 screen pixels) and scaled up with
// nearest-neighbour filtering, so edges stay crisp. All art is original and code-generated.

export const VIEW_W = 180;
export const VIEW_H = 320;
export const SCALE = 6; // 180 * 6 = 1080, 320 * 6 = 1920

export type RGB = [number, number, number];

export const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbToHex = ([r, g, b]: RGB) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a: string, b: string, t: number) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
};
export const shade = (c: string, amt: number) => (amt >= 0 ? mix(c, '#ffffff', amt) : mix(c, '#000000', -amt));

// Deterministic random numbers (mulberry32): the same seed always draws the same street.
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

// 3x5 pixel font for signage (shop boards, departure boards, bus stop flags)
const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001110', ':': '000010000010000', '.': '000000000000010', '-': '000000111000000', '£': '011010111010111',
  '!': '010010010000010', '?': '110001010000010', '/': '001001010100100', '+': '000010111010000', ' ': '000000000000000',
  "'": '010010000000000', '&': '010101010101011', N_: '111101101101101',
};

export class Painter {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  constructor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    ctx.imageSmoothingEnabled = false;
  }
  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }
  alpha(a: number, fn: () => void) {
    const prev = this.ctx.globalAlpha;
    this.ctx.globalAlpha = prev * a;
    fn();
    this.ctx.globalAlpha = prev;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    if (w <= 0 || h <= 0) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  px(x: number, y: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  hline(x: number, y: number, w: number, c: string) {
    this.rect(x, y, w, 1, c);
  }
  vline(x: number, y: number, h: number, c: string) {
    this.rect(x, y, 1, h, c);
  }
  // outlined box: fill + 1px border (classic pixel-art panel)
  box(x: number, y: number, w: number, h: number, fill: string, border: string) {
    this.rect(x, y, w, h, border);
    this.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    this.ctx.fillStyle = c;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const half = rx * Math.sqrt(1 - dy * dy);
      const x0 = Math.round(cx - half), x1 = Math.round(cx + half);
      if (x1 > x0) this.ctx.fillRect(x0, y, x1 - x0, 1);
    }
  }
  disc(cx: number, cy: number, r: number, c: string) {
    this.ellipse(cx, cy, r, r, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.ctx.fillStyle = c;
    for (let i = 0; i < 2000; i++) {
      this.ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // hanging cable between two poles
  cable(x0: number, y0: number, x1: number, y1: number, sag: number, c: string) {
    const n = Math.max(2, Math.ceil(Math.abs(x1 - x0)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag, c);
    }
  }
  poly(pts: [number, number][], c: string) {
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    this.ctx.fillStyle = c;
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.round(xs[k]), b = Math.round(xs[k + 1]);
        if (b > a) this.ctx.fillRect(a, y, b - a, 1);
      }
    }
  }
  // vertical gradient through several colour stops with ordered (Bayer) dithering: the pixel-art sky
  gradV(x: number, y: number, w: number, h: number, stops: string[]) {
    const cols = stops.map(hexToRgb);
    const seg = cols.length - 1;
    for (let j = 0; j < h; j++) {
      const t = (j / Math.max(1, h - 1)) * seg;
      const i = Math.min(seg - 1, Math.floor(t));
      const f = t - i;
      const a = rgbToHex(cols[i]), b = rgbToHex(cols[i + 1]);
      // two-tone band: each row dithers between the stop pair at 4 levels
      const q = Math.floor(f * 4) / 4, fr = (f - q) * 4;
      const c0 = mix(a, b, q), c1 = mix(a, b, Math.min(1, q + 0.25));
      for (let i2 = 0; i2 < w; i2++) {
        const th = BAYER[((y + j) % 4) * 4 + ((x + i2) % 4)];
        this.ctx.fillStyle = fr > th ? c1 : c0;
        this.ctx.fillRect(x + i2, y + j, 1, 1);
      }
    }
  }
  // dither a flat colour over a region at a given density (0..1): fog, shadows, light pools
  dither(x: number, y: number, w: number, h: number, c: string, density: number) {
    this.ctx.fillStyle = c;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++)
        if (density > BAYER[(((y + j) % 4) + 4) % 4 * 4 + ((((x + i) % 4) + 4) % 4)]) this.ctx.fillRect(x + i, y + j, 1, 1);
  }
  // round dithered glow that fades out from the centre (sun haze, lamp light, damp patches)
  glow(cx: number, cy: number, r: number, c: string, max = 0.5, ry = r) {
    this.ctx.fillStyle = c;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot((x - cx) / r, (y - cy) / ry);
        if (d >= 1) continue;
        const dens = max * Math.pow(1 - d, 1.4);
        if (dens > BAYER[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)]) this.ctx.fillRect(x, y, 1, 1);
      }
  }
  speckle(x: number, y: number, w: number, h: number, c: string, count: number, seed: number) {
    const r = rng(seed);
    for (let i = 0; i < count; i++) this.px(x + Math.floor(r() * w), y + Math.floor(r() * h), c);
  }
  text(s: string, x: number, y: number, c: string) {
    let cx = Math.round(x);
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? FONT[' '];
      for (let i = 0; i < 15; i++) if (g[i] === '1') this.px(cx + (i % 3), y + Math.floor(i / 3), c);
      cx += 4;
    }
  }
  textWidth(s: string) {
    return s.length * 4 - 1;
  }
}

// Draw onto a canvas element at logical size (call from useLayoutEffect)
export const paint = (canvas: HTMLCanvasElement | null, w: number, h: number, fn: (p: Painter) => void) => {
  if (!canvas) return;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const p = new Painter(ctx, w, h);
  p.clear();
  fn(p);
};
