// Shared types: the episode file (episodes/<id>/episode.json) and the built timeline
// (public/episodes/<id>/timeline.json) both follow these shapes.

export type EnvironmentType =
  | 'lagosStreet'
  | 'londonStreet'
  | 'ukApartment'
  | 'airport'
  | 'nigerianHome'
  | 'ukWorkplace';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';
export type Weather = 'clear' | 'haze' | 'overcast' | 'rain';

// What a scene's background is. Every scene must name one, and it must match the story location.
export interface SceneEnvironment {
  type: EnvironmentType;
  timeOfDay?: TimeOfDay;
  weather?: Weather;
  seed?: number; // varies shop colours, windows, extras
  props?: string[]; // optional set dressing switches, e.g. "bills", "busArrives", "splash", "plane"
}

export type CharacterId = 'chinedu' | 'amaka' | 'tunde' | 'ada' | 'mama';
export type Pose = 'idle' | 'walk' | 'talk' | 'happy' | 'sad' | 'shocked' | 'thinking' | 'phone' | 'wave' | 'sit';
export type SpeakerId = CharacterId | 'narrator';

export interface CameraKey {
  x: number; // world x the camera centres on (logical px)
  y: number; // world y (160 = middle of the frame)
  zoom: number; // 1 = full 180x320 view
}

export interface CastMember {
  who: CharacterId;
  x: number; // world x of the feet
  facing?: 'left' | 'right';
  pose: Pose;
  scale?: number; // 1 = 48 px tall figure
  walkTo?: number; // walks from x to walkTo across the scene
  poses?: { at: number | string; pose: Pose }[]; // pose changes: seconds into scene, or a line id
  hidden?: boolean;
}

export interface Line {
  id: string;
  speaker: SpeakerId;
  text: string; // shown in captions
  say?: string; // what the voice reads (numbers spelled out etc.)
  emotion?: Pose;
  rate?: string;
  pitch?: string;
  highlight?: string[]; // words to colour gold in captions
  holdAfter?: number; // silence after the line (s)
  bubble?: boolean; // show a dialogue bubble over the speaker
}

export type UIEvent =
  | { kind: 'title'; text: string; sub?: string; at: number | string; dur?: number }
  | { kind: 'money'; label: string; from: number; to: number; currency: string; at: number | string; dur?: number; steps?: { label: string; amount: number }[] }
  | { kind: 'stats'; at: number | string; dur?: number; stats: { label: string; from: number; to: number; color: string }[] }
  | { kind: 'phone'; caller: string; at: number | string; dur?: number; answerAt?: number | string }
  | { kind: 'reaction'; who: CharacterId; symbol: '!' | '?' | '!!' | 'sweat' | 'heart' | 'rain' | '...'; at: number | string; dur?: number }
  | { kind: 'decision'; question: string; a: string; b: string; at: number | string; cta?: string }
  | { kind: 'sfx'; name: string; at: number | string };

export interface CameraMove {
  from: CameraKey;
  to: CameraKey;
  ease?: 'inOut' | 'out' | 'in' | 'linear';
  shakeAt?: (number | string)[];
}

export interface SceneDef {
  id: string;
  label: string; // story location, e.g. "Lagos airport, departures"
  environment: SceneEnvironment;
  split?: SceneEnvironment & { label?: string; cast?: CastMember[] }; // right half for split-screen scenes
  cast: CastMember[];
  camera: CameraMove;
  splitCamera?: CameraMove; // camera for the right half of a split screen
  leftLabel?: string; // place tag on the left half of a split screen (default from the environment)
  lines: Line[];
  ui?: UIEvent[];
  lead?: number; // seconds before the first line
  tail?: number; // seconds after the last line
  minDuration?: number;
  transition?: 'cut' | 'pixelWipe' | 'flash' | 'slide';
  music?: 'lagos' | 'london' | 'tension' | 'decision';
  ambience?: 'airport' | 'rain' | 'room' | 'street' | 'office' | 'home';
}

export interface Episode {
  id: string;
  title: string;
  hook: string;
  voices: Record<SpeakerId, { voice: string; rate?: string; pitch?: string }>;
  scenes: SceneDef[];
  endScreen: { headline: string; cta: string; link: string; handle: string; seconds: number };
  disclaimer?: string;
}

// ---- built timeline (written by scripts/build-timeline.mjs) ----
export interface TimedWord {
  w: string;
  start: number; // frame (absolute)
  end: number;
  hi?: boolean;
}
export interface TimedLine {
  id: string;
  scene: string;
  speaker: SpeakerId;
  text: string;
  emotion?: Pose;
  bubble?: boolean;
  start: number; // frame
  end: number;
  audio: string; // public path
  words: TimedWord[];
  mouth: number[]; // 0..1 openness per frame from the voice loudness
}
export interface TimedScene {
  id: string;
  start: number;
  end: number;
  lineIds: string[];
}
export interface Timeline {
  episodeId: string;
  fps: number;
  durationInFrames: number;
  scenes: TimedScene[];
  lines: TimedLine[];
  endScreen: { start: number; end: number };
  mix: string | null; // public path of the mixed soundtrack, if built
}
