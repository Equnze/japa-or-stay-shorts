// Named scene components for each location. Each is PixelArtEnvironment with the right set and sensible
// defaults; pass children (PixelArtCharacter) to put the cast in it. The Episode composition uses the
// generic PixelArtEnvironment directly, driven by each scene's SceneEnvironment config.
import React from 'react';
import { PixelArtEnvironment } from './PixelArtEnvironment';
import type { CameraKey, SceneEnvironment } from '../engine/types';

type Props = { camera: CameraKey; t: number; width?: number; children?: React.ReactNode } & Partial<Omit<SceneEnvironment, 'type'>>;
const make = (type: SceneEnvironment['type'], defaults: Partial<SceneEnvironment>) => {
  const C: React.FC<Props> = ({ camera, t, width, children, ...env }) => (
    <PixelArtEnvironment env={{ type, ...defaults, ...env }} camera={camera} t={t} width={width}>
      {children}
    </PixelArtEnvironment>
  );
  C.displayName = type;
  return C;
};

export const LagosStreetScene = make('lagosStreet', { timeOfDay: 'day' });
export const LondonStreetScene = make('londonStreet', { timeOfDay: 'day', weather: 'rain' });
export const UKApartmentScene = make('ukApartment', { timeOfDay: 'evening', weather: 'rain' });
export const AirportScene = make('airport', { timeOfDay: 'day' });
export const NigerianHomeScene = make('nigerianHome', { timeOfDay: 'day' });
export const UKWorkplaceScene = make('ukWorkplace', { timeOfDay: 'day' });
