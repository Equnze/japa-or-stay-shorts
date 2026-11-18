// Every cast member in every pose (frame 0 = still; scrub to see loops, blinks and mouth movement).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { PixelArtCharacter } from '../components/PixelArtCharacter';
import { CAST } from '../characters/cast';
import type { CharacterId, Pose } from '../engine/types';
import { SCALE } from '../engine/pixel';
import { FONT } from '../engine/fonts';

const POSES: Pose[] = ['idle', 'walk', 'talk', 'happy', 'sad', 'shocked', 'thinking', 'phone', 'wave'];
const WHO = Object.keys(CAST) as CharacterId[];

export const CastSheet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // grid in logical px: 5 columns (cast) x 9 rows (poses), each cell 36 x 34 logical at scale .5
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#1b2a22, #0A100D)' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 180 * SCALE, height: 320 * SCALE }}>
        {WHO.map((who, c) =>
          POSES.map((pose, r) => (
            <PixelArtCharacter key={who + pose} who={who} pose={pose} x={22 + c * 34} floorY={38 + r * 33} frame={frame} t={t} scale={0.62} mouthAmp={pose === 'talk' || pose === 'phone' ? (Math.sin(t * 14) + 1) / 2 : 0} />
          )),
        )}
      </div>
      {WHO.map((who, c) => (
        <div key={who} style={{ position: 'absolute', top: 12, left: (5 + c * 34) * SCALE, width: 34 * SCALE, textAlign: 'center', fontFamily: FONT.pixel, fontSize: 16, color: CAST[who].captionColor }}>
          {CAST[who].name.split(' ')[0].toUpperCase()}
        </div>
      ))}
    </AbsoluteFill>
  );
};
