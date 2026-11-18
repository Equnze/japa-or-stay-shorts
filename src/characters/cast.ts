// The recurring cast. Looks only; no story lives here. Add a character by adding an entry.
import type { CharacterId } from '../engine/types';

export type HairStyle = 'fade' | 'braids' | 'low' | 'puff' | 'gele';
export interface CharacterLook {
  name: string;
  role: string;
  skin: string;
  hair: HairStyle;
  hairColor: string;
  top: string; // shirt / blouse
  topPattern?: string; // second colour for ankara-style print
  bottom: string; // trousers / skirt / wrapper
  longSkirt?: boolean;
  shoes: string;
  height: number; // 1 = 48 px figure
  build: number; // 0 slim .. 1 broad
  accessory?: 'earrings' | 'glasses' | 'watch' | 'beads';
  captionColor: string; // speaker colour in captions
}

export const CAST: Record<CharacterId, CharacterLook> = {
  chinedu: {
    name: 'Chinedu',
    role: 'Our hero, 26, finally japa-ing to London',
    skin: '#7c4a2e',
    hair: 'fade',
    hairColor: '#141010',
    top: '#16A266', // stay green, the hero's colour
    bottom: '#1e2438',
    shoes: '#f2f2f2',
    height: 1,
    build: 0.3,
    accessory: 'watch',
    captionColor: '#5AD381',
  },
  amaka: {
    name: 'Amaka',
    role: "Chinedu's sharp, funny best friend in Lagos",
    skin: '#925a36',
    hair: 'braids',
    hairColor: '#1a1212',
    top: '#E8A317',
    bottom: '#2d4a7a',
    shoes: '#c0392b',
    height: 0.96,
    build: 0.2,
    accessory: 'earrings',
    captionColor: '#F7C04A',
  },
  tunde: {
    name: 'Tunde',
    role: 'Cousin who stayed and is building a business in Lagos',
    skin: '#5e3422',
    hair: 'low',
    hairColor: '#0e0b0b',
    top: '#6577E8', // japa blue
    bottom: '#8a7a5a',
    shoes: '#3a2a1a',
    height: 1.06,
    build: 0.6,
    captionColor: '#9BA7FF',
  },
  ada: {
    name: 'Ada',
    role: 'Nurse already living in the UK, the voice of experience',
    skin: '#b07246',
    hair: 'puff',
    hairColor: '#1a1414',
    top: '#8e2c6a',
    bottom: '#2a2a3a',
    shoes: '#1a1a1a',
    height: 0.98,
    build: 0.25,
    accessory: 'glasses',
    captionColor: '#F08BC8',
  },
  mama: {
    name: 'Mama Chinedu',
    role: "Chinedu's loving, very direct mother in Lagos",
    skin: '#7a4630',
    hair: 'gele',
    hairColor: '#D35400',
    top: '#D35400',
    topPattern: '#F2B705',
    bottom: '#D35400',
    longSkirt: true,
    shoes: '#5a2a1a',
    height: 0.93,
    build: 0.8,
    accessory: 'beads',
    captionColor: '#FFB27A',
  },
};
