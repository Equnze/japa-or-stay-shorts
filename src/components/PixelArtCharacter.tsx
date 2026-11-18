// A cast member placed in world coordinates inside PixelArtEnvironment's characters layer.
// Handles blinking, mouth movement from voice loudness, facing, and a soft contact shadow.
import React, { useLayoutEffect, useRef } from 'react';
import { SCALE, paint } from '../engine/pixel';
import type { CharacterId, Pose } from '../engine/types';
import { CAST } from '../characters/cast';
import { CHAR_H, CHAR_W, FEET_Y, drawCharacter } from '../characters/draw';

const SEEDS: Record<CharacterId, number> = { chinedu: 0, amaka: 41, tunde: 77, ada: 23, mama: 59 };

export const isBlinking = (frame: number, who: CharacterId) => {
  const k = (frame + SEEDS[who] * 7) % 113;
  return k < 4 || (who === 'mama' && (frame + 50) % 151 < 3);
};

export const PixelArtCharacter: React.FC<{
  who: CharacterId;
  pose: Pose;
  x: number; // world x of the feet
  floorY: number;
  frame: number;
  t: number;
  facing?: 'left' | 'right';
  scale?: number;
  mouthAmp?: number;
  dim?: number; // 0..1 darken for night scenes
}> = ({ who, pose, x, floorY, frame, t, facing = 'right', scale = 1, mouthAmp = 0, dim = 0 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const look = CAST[who];
  const sc = scale * look.height;
  useLayoutEffect(() => {
    paint(ref.current, CHAR_W, CHAR_H, (p) => drawCharacter(p, look, { pose, t, mouthAmp, blink: isBlinking(frame, who) }));
  });
  const w = CHAR_W * SCALE * sc, h = CHAR_H * SCALE * sc;
  const left = (x - (CHAR_W / 2) * sc) * SCALE;
  const top = (floorY - FEET_Y * sc) * SCALE;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: (x - 11 * sc) * SCALE,
          top: (floorY - 2.5 * sc) * SCALE,
          width: 22 * sc * SCALE,
          height: 5 * sc * SCALE,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.45), rgba(0,0,0,0) 70%)',
        }}
      />
      <canvas
        ref={ref}
        style={{
          position: 'absolute',
          left,
          top,
          width: w,
          height: h,
          imageRendering: 'pixelated',
          transform: facing === 'left' ? 'scaleX(-1)' : undefined,
          filter: dim ? `brightness(${1 - dim * 0.5}) saturate(${1 - dim * 0.3})` : undefined,
        }}
      />
    </>
  );
};
