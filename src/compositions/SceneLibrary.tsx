// Preview of every environment with the cast standing in it (2 s each). Use it to check new art.
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { PixelArtEnvironment, envFloorY, envWidth } from '../components/PixelArtEnvironment';
import { PixelArtCharacter } from '../components/PixelArtCharacter';
import type { CharacterId, EnvironmentType, Pose, SceneEnvironment } from '../engine/types';
import { ENVIRONMENTS } from '../environments';
import { FONT } from '../engine/fonts';

export const LIBRARY: SceneEnvironment[] = [
  { type: 'lagosStreet', timeOfDay: 'day' },
  { type: 'londonStreet', timeOfDay: 'day', weather: 'rain' },
  { type: 'ukApartment', timeOfDay: 'evening', weather: 'rain' },
  { type: 'airport', timeOfDay: 'day', props: ['plane'] },
  { type: 'nigerianHome', timeOfDay: 'day' },
  { type: 'ukWorkplace', timeOfDay: 'day' },
  { type: 'lagosStreet', timeOfDay: 'night' },
  { type: 'londonStreet', timeOfDay: 'night', weather: 'rain', props: ['busArrives'] },
];
const CAST_ROW: { who: CharacterId; pose: Pose }[] = [
  { who: 'mama', pose: 'talk' },
  { who: 'amaka', pose: 'happy' },
  { who: 'chinedu', pose: 'shocked' },
  { who: 'tunde', pose: 'thinking' },
  { who: 'ada', pose: 'phone' },
];

const One: React.FC<{ env: SceneEnvironment }> = ({ env }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const W = envWidth(env.type);
  const cam = { x: W / 2 + Math.sin(t * 0.8) * 20, y: 180, zoom: 1 };
  return (
    <PixelArtEnvironment env={env} camera={cam} t={t}>
      {CAST_ROW.map((c, i) => (
        <PixelArtCharacter key={c.who} who={c.who} pose={c.pose} x={W / 2 - 64 + i * 32} floorY={envFloorY(env.type)} frame={frame} t={t} facing={i < 2 ? 'right' : 'left'} mouthAmp={c.pose === 'talk' ? (Math.sin(t * 14) + 1) / 2 : 0} />
      ))}
      <div style={{ position: 'absolute', left: 0, top: 0 }} />
    </PixelArtEnvironment>
  );
};

export const SceneLibrary: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {LIBRARY.map((env, i) => (
        <Sequence key={i} from={i * 2 * fps} durationInFrames={2 * fps}>
          <One env={env} />
          <AbsoluteFill style={{ top: 260, height: 120, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: FONT.pixel, fontSize: 30, color: '#fff', background: 'rgba(10,16,13,0.75)', padding: '18px 26px', border: '4px solid #E8A317' }}>
              {ENVIRONMENTS[env.type as EnvironmentType].name}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
