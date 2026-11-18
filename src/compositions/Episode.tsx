// The Episode composition: reads public/episodes/<id>/timeline.json (built by the pipeline) and plays
// every scene with its environment, cast, camera, captions, game UI, transitions, audio and end screen.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from 'remotion';
import type { CameraMove, CastMember, CharacterId, Pose, SceneDef, SceneEnvironment, TimedLine } from '../engine/types';
import { PixelArtEnvironment, envFloorY, envWidth, layerTransform } from '../components/PixelArtEnvironment';
import { PixelArtCharacter } from '../components/PixelArtCharacter';
import { cameraAt, shakeAt } from '../components/CameraController';
import { SCALE } from '../engine/pixel';
import { CAST } from '../characters/cast';
import { FONT } from '../engine/fonts';
import {
  AnimatedCaptions, BRAND, CharacterReaction, DecisionScreen, DialogueBubble, EndScreen, GameStats, HookTitle, MoneyCounter, PhoneCallOverlay, SceneTransition,
} from '../components/ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface BuiltTimeline {
  episodeId: string;
  fps: number;
  durationInFrames: number;
  episode: { title: string; scenes: (SceneDef & { splitCamera?: CameraMove })[]; endScreen: { headline: string; cta: string; link: string; handle: string }; disclaimer?: string };
  scenes: { id: string; start: number; end: number }[];
  lines: (TimedLine & { words: (TimedLine['words'][number] & { page: number })[] })[];
  ui: any[];
  poses: { scene: string; side: 'main' | 'split'; who: CharacterId; changes: { frame: number; pose: Pose }[] }[];
  endScreen: { start: number; end: number };
  mix: string | null;
}
export interface EpisodeProps {
  episodeId: string;
  timeline?: BuiltTimeline | null;
  [key: string]: unknown;
}

export const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = async ({ props }) => {
  const res = await fetch(staticFile(`episodes/${props.episodeId}/timeline.json`));
  if (!res.ok) throw new Error(`No timeline for ${props.episodeId}. Run: npm run episode -- ${props.episodeId}`);
  const timeline = (await res.json()) as BuiltTimeline;
  return { durationInFrames: timeline.durationInFrames, fps: timeline.fps, props: { ...props, timeline } };
};

const poseAt = (tl: BuiltTimeline, sceneId: string, side: 'main' | 'split', c: CastMember, frame: number): Pose => {
  const entry = tl.poses.find((p) => p.scene === sceneId && p.side === side && p.who === c.who);
  let pose = c.pose;
  for (const ch of entry?.changes ?? []) if (ch.frame <= frame) pose = ch.pose;
  return pose;
};

const speakingAmp = (lines: BuiltTimeline['lines'], who: CharacterId, frame: number) => {
  const l = lines.find((x) => x.speaker === who && frame >= x.start && frame < x.end);
  return l ? l.mouth[frame - l.start] ?? 0 : 0;
};

const isDim = (env: SceneEnvironment) => ((env.props ?? []).includes('blackout') ? 0.9 : env.timeOfDay === 'night' ? 0.5 : env.timeOfDay === 'evening' && env.type.startsWith('london') ? 0.25 : 0);

// One half (or the whole) of a scene: environment + its cast
const World: React.FC<{
  tl: BuiltTimeline; sceneId: string; env: SceneEnvironment; cast: CastMember[]; move: CameraMove; side: 'main' | 'split';
  frame: number; start: number; end: number; width: number; shakeCues: number[]; onScreenPos?: (who: CharacterId, x: number, y: number) => void;
}> = ({ tl, sceneId, env, cast, move, side, frame, start, end, width, shakeCues }) => {
  const { fps } = useVideoConfig();
  const local = frame - start;
  const W = envWidth(env.type);
  const cam = cameraAt(move, local / Math.max(1, end - start), W, width);
  const floor = envFloorY(env.type);
  return (
    <PixelArtEnvironment env={env} camera={cam} t={local / fps} width={width} shake={shakeAt(frame, shakeCues)}>
      {cast.filter((c) => !c.hidden).map((c) => {
        let pose = poseAt(tl, sceneId, side, c, frame);
        const amp = speakingAmp(tl.lines, c.who, frame);
        if (amp > 0 && pose === 'idle') pose = 'talk';
        const x = c.walkTo != null ? c.x + (c.walkTo - c.x) * Math.min(1, local / (end - start)) : c.x;
        if (c.walkTo != null && local < end - start) pose = 'walk';
        return <PixelArtCharacter key={c.who} who={c.who} pose={pose} x={x} floorY={floor} frame={frame} t={local / fps} facing={c.facing} scale={c.scale ?? 1} mouthAmp={amp} dim={isDim(env)} />;
      })}
    </PixelArtEnvironment>
  );
};

const PLACE: Record<string, string> = { lagosStreet: 'LAGOS', londonStreet: 'LONDON', ukApartment: 'UK', airport: 'AIRPORT', nigerianHome: 'HOME', ukWorkplace: 'UK WORK' };
const placeName = (env: SceneEnvironment) => PLACE[env.type] ?? env.type.toUpperCase();

// screen position (px) of a character's head for emotes and bubbles
const headScreen = (env: SceneEnvironment, move: CameraMove, progress: number, x: number, width: number, who: CharacterId) => {
  const W = envWidth(env.type);
  const cam = cameraAt(move, progress, W, width);
  const z = layerTransform(cam, 1, W, width, 1920).z;
  const cx = W / 2 + (cam.x - W / 2), cy = 180 + (cam.y - 180);
  const sx = width / 2 + (x - cx) * z * SCALE;
  const sy = 1920 / 2 + (envFloorY(env.type) - 64 * CAST[who].height - cy) * z * SCALE;
  return { sx, sy };
};

export const Episode: React.FC<EpisodeProps> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!timeline) return <AbsoluteFill style={{ background: BRAND.night }} />;
  const tl = timeline;
  const sceneIdx = tl.scenes.findIndex((s) => frame >= s.start && frame < s.end);
  const timed = tl.scenes[sceneIdx];
  const def = timed ? tl.episode.scenes.find((s) => s.id === timed.id)! : null;
  const ui = tl.ui.filter((u) => timed && u.scene === timed.id);
  const shakeCues = ui.filter((u) => u.kind === 'shake').map((u) => u.frame);

  let body: React.ReactNode = null;
  if (timed && def) {
    const local = frame - timed.start;
    const progress = local / Math.max(1, timed.end - timed.start);
    const slideIn = def.transition === 'slide' ? Math.max(0, 1 - local / 10) : 0;
    const split = def.split;
    const decision = ui.find((u) => u.kind === 'decision');
    const deciding = !!decision && frame >= decision.frame;
    body = (
      <AbsoluteFill style={{ transform: slideIn ? `translateX(${slideIn * slideIn * 1080}px)` : undefined }}>
        {split ? (
          <>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 540, height: 1920, overflow: 'hidden' }}>
              <World tl={tl} sceneId={def.id} env={def.environment} cast={def.cast} move={def.camera} side="main" frame={frame} start={timed.start} end={timed.end} width={540} shakeCues={shakeCues} />
            </div>
            <div style={{ position: 'absolute', left: 540, top: 0, width: 540, height: 1920, overflow: 'hidden' }}>
              <World tl={tl} sceneId={def.id} env={split} cast={split.cast ?? []} move={def.splitCamera ?? def.camera} side="split" frame={frame} start={timed.start} end={timed.end} width={540} shakeCues={shakeCues} />
            </div>
            <div style={{ position: 'absolute', left: 534, top: 0, width: 12, height: 1920, background: BRAND.gold, boxShadow: '0 0 30px rgba(232,163,23,0.7)' }} />
            {[
              { label: def.leftLabel ?? placeName(def.environment), x: 270, c: BRAND.blue },
              { label: split.label ?? placeName(split), x: 810, c: BRAND.green },
            ].map((h, i) => (
              <div key={i} style={{ position: 'absolute', top: 560, opacity: deciding ? 0 : 1, left: h.x, transform: 'translateX(-50%)', fontFamily: FONT.pixel, fontSize: 34, color: '#fff', background: h.c, border: '5px solid #000', padding: '12px 18px' }}>
                {h.label}
              </div>
            ))}
          </>
        ) : (
          <World tl={tl} sceneId={def.id} env={def.environment} cast={def.cast} move={def.camera} side="main" frame={frame} start={timed.start} end={timed.end} width={1080} shakeCues={shakeCues} />
        )}
        {/* UI cues for this scene */}
        {ui.map((u, i) => {
          switch (u.kind) {
            case 'title':
              return <HookTitle key={i} text={u.text} sub={u.sub} frame={frame} start={u.frame} end={u.endFrame ?? u.frame + 60} />;
            case 'money':
              return <MoneyCounter key={i} label={u.label} currency={u.currency} from={u.from} to={u.to} steps={u.steps} frame={frame} start={u.frame} end={u.endFrame ?? timed.end} />;
            case 'stats':
              return <GameStats key={i} stats={u.stats} frame={frame} start={u.frame} end={u.endFrame ?? timed.end} />;
            case 'phone': {
              const callerId = (Object.keys(CAST) as CharacterId[]).find((k) => CAST[k].name.toUpperCase().startsWith(u.caller.split(' ')[0])) ?? 'mama';
              const amp = speakingAmp(tl.lines, callerId, frame);
              return <PhoneCallOverlay key={i} caller={callerId} label={u.caller} frame={frame} start={u.frame} answer={u.answerFrame ?? u.frame + 30} end={timed.end - 6} talkingAmp={amp} talking={amp > 0} />;
            }
            case 'reaction': {
              const c = def.cast.find((m) => m.who === u.who);
              if (!c) return null;
              const pos = headScreen(def.environment, def.camera, progress, c.x, 1080, u.who);
              return <CharacterReaction key={i} symbol={u.symbol} x={pos.sx + 40} y={pos.sy - 10} frame={frame} start={u.frame} end={u.endFrame ?? u.frame + 40} />;
            }
            case 'decision':
              return <DecisionScreen key={i} question={u.question} a={u.a} b={u.b} cta={u.cta} frame={frame} start={u.frame} />;
            default:
              return null;
          }
        })}
        {/* short on-screen lines as dialogue bubbles */}
        {tl.lines.filter((l) => l.scene === def.id && l.bubble && l.speaker !== 'narrator').map((l) => {
          const c = def.cast.find((m) => m.who === l.speaker);
          if (!c) return null;
          const pos = headScreen(def.environment, def.camera, progress, c.x, 1080, c.who);
          return <DialogueBubble key={l.id} text={l.text} speaker={c.who} x={pos.sx} y={pos.sy - 20} frame={frame} start={l.start} end={l.end} />;
        })}
        <AnimatedCaptions lines={tl.lines.filter((l) => l.scene === def.id)} frame={frame} y={deciding ? 520 : split ? 700 : 640} />
        <SceneTransition kind={sceneIdx > 0 ? def.transition : undefined} local={local} />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: BRAND.night }}>
      {body}
      {tl.endScreen.end > tl.endScreen.start && frame >= tl.endScreen.start ? (
        <EndScreen {...tl.episode.endScreen} frame={frame} start={tl.endScreen.start} />
      ) : null}
      {/* soundtrack: the mixed track if built, otherwise the raw voice lines */}
      {tl.mix ? (
        <Audio src={staticFile(tl.mix)} />
      ) : (
        tl.lines.map((l) => (
          <Sequence key={l.id} from={l.start} durationInFrames={l.end - l.start + fps}>
            <Audio src={staticFile(l.audio)} />
          </Sequence>
        ))
      )}
    </AbsoluteFill>
  );
};
