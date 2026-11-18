// Renders a SceneEnvironment as 7 stacked layers: sky, distant, midground, characters, effects, foreground
// (+ the colour grade), each with its own parallax depth, all scaled up with nearest-neighbour pixels.
// The UI layer (captions, counters) is drawn on top by the composition, outside this component.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import { SCALE, paint } from '../engine/pixel';
import type { CameraKey, SceneEnvironment } from '../engine/types';
import { ENVIRONMENTS } from '../environments';
import { WORLD_H, type EnvLayer, type LayerName } from '../environments/common';

const ORDER: LayerName[] = ['sky', 'distant', 'mid'];
const FRONT: LayerName[] = ['fx', 'fg'];

export interface LayerTransform {
  transform: string;
  z: number;
}

// Where a layer sits on screen for a camera position. depth 1 = the characters' plane.
export const layerTransform = (cam: CameraKey, depth: number, worldW: number, vw: number, vh: number, shake = [0, 0]): LayerTransform => {
  const z = 1 + (cam.zoom - 1) * depth;
  const cx = worldW / 2 + (cam.x - worldW / 2) * depth;
  const cy = 180 + (cam.y - 180) * depth;
  const X = vw / 2 - cx * z * SCALE + shake[0] * depth;
  const Y = vh / 2 - cy * z * SCALE + shake[1] * depth;
  return { transform: `translate(${X}px, ${Y}px) scale(${z})`, z };
};

const pixelCanvas: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  imageRendering: 'pixelated',
};

const Layer: React.FC<{
  name: LayerName;
  layer: EnvLayer;
  env: SceneEnvironment;
  envKey: string;
  t: number;
  worldW: number;
  cam: CameraKey;
  vw: number;
  vh: number;
  shake: number[];
}> = ({ layer, env, envKey, t, worldW, cam, vw, vh, shake }) => {
  const staticRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (layer.draw) paint(staticRef.current, worldW, WORLD_H, (p) => layer.draw!(p, env));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envKey]);
  useLayoutEffect(() => {
    if (layer.anim) paint(animRef.current, worldW, WORLD_H, (p) => layer.anim!(p, t, env));
  });
  const { transform } = layerTransform(cam, layer.depth, worldW, vw, vh, shake);
  const size = { width: worldW * SCALE, height: WORLD_H * SCALE };
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, ...size, transform, transformOrigin: '0 0', filter: layer.blur ? `blur(${layer.blur}px)` : undefined }}>
      {layer.draw ? <canvas ref={staticRef} style={{ ...pixelCanvas, ...size }} /> : null}
      {layer.anim ? <canvas ref={animRef} style={{ ...pixelCanvas, ...size }} /> : null}
    </div>
  );
};

export const PixelArtEnvironment: React.FC<{
  env: SceneEnvironment;
  camera: CameraKey;
  t: number; // seconds since the scene started
  width?: number; // viewport in screen px (540 for one half of a split screen)
  height?: number;
  shake?: number[];
  children?: React.ReactNode; // the characters layer, positioned in world coordinates
}> = ({ env, camera, t, width = 1080, height = 1920, shake = [0, 0], children }) => {
  const def = ENVIRONMENTS[env.type];
  if (!def) throw new Error(`Unknown environment "${env.type}"`);
  const envKey = JSON.stringify(env);
  const grade = def.grade(env);
  const common = { env, envKey, t, worldW: def.worldW, cam: camera, vw: width, vh: height, shake };
  const charT = layerTransform(camera, 1, def.worldW, width, height, shake);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', width, height, backgroundColor: '#0A100D' }}>
      {ORDER.map((n) => (def.layers[n] ? <Layer key={n} name={n} layer={def.layers[n]!} {...common} /> : null))}
      {/* characters layer (depth 1, same plane as the midground floor) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: def.worldW * SCALE, height: WORLD_H * SCALE, transform: charT.transform, transformOrigin: '0 0' }}>
        {children}
      </div>
      {FRONT.map((n) => (def.layers[n] ? <Layer key={n} name={n} layer={def.layers[n]!} {...common} /> : null))}
      {/* colour grade, light glow and vignette: the "2.5D" lighting pass */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${grade.top}, transparent 45%, ${grade.bottom})`, opacity: grade.opacity, mixBlendMode: 'soft-light' }} />
      {grade.glow ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at ${grade.glow.x * 100}% ${grade.glow.y * 100}%, ${grade.glow.color}, transparent ${grade.glow.size * 100}%)`,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,${grade.vignette}) 100%)` }} />
    </AbsoluteFill>
  );
};

export const envFloorY = (type: SceneEnvironment['type']) => ENVIRONMENTS[type].floorY;
export const envWidth = (type: SceneEnvironment['type']) => ENVIRONMENTS[type].worldW;
