import type { EnvironmentType } from '../engine/types';
import type { EnvDef } from './common';
import { lagosStreet } from './lagosStreet';
import { londonStreet } from './londonStreet';
import { ukApartment, airport, nigerianHome, ukWorkplace } from './interiors';

export const ENVIRONMENTS: Record<EnvironmentType, EnvDef> = {
  lagosStreet,
  londonStreet,
  ukApartment,
  airport,
  nigerianHome,
  ukWorkplace,
};

export type { EnvDef } from './common';
