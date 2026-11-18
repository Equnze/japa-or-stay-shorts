// The UI layer: everything drawn on top of the pixel world in crisp vector type.
// AnimatedCaptions, DialogueBubble, MoneyCounter, GameStats, PhoneCallOverlay, CharacterReaction,
// HookTitle, DecisionScreen, SceneTransition, EndScreen.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, interpolate, spring, useVideoConfig } from 'remotion';
import { FONT } from '../engine/fonts';
import { paint } from '../engine/pixel';
import type { CharacterId, SpeakerId, TimedLine } from '../engine/types';
import { CAST } from '../characters/cast';
import { CHAR_H, CHAR_W, drawCharacter } from '../characters/draw';

export const BRAND = { green: '#16A266', blue: '#6577E8', gold: '#E8A317', night: '#0A100D', red: '#E8473A', cream: '#FFF6E0' };

const outline = (px: number, color = '#000') => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: 'stroke fill' as const,
});
const pixelPanel = (border = BRAND.gold): React.CSSProperties => ({
  background: 'rgba(10,16,13,0.88)',
  border: `6px solid ${border}`,
  boxShadow: `0 0 0 6px rgba(0,0,0,0.85), 10px 10px 0 6px rgba(0,0,0,0.45)`,
  imageRendering: 'pixelated',
});

// ---------------------------------------------------------------- captions
const speakerColor = (s: SpeakerId) => (s === 'narrator' ? BRAND.cream : CAST[s].captionColor);
const speakerName = (s: SpeakerId) => (s === 'narrator' ? null : CAST[s].name.toUpperCase());

export const AnimatedCaptions: React.FC<{ lines: TimedLine[]; frame: number; y?: number }> = ({ lines, frame, y = 600 }) => {
  const { fps } = useVideoConfig();
  const line = lines.find((l) => !l.bubble && frame >= l.start - 2 && frame < l.end + 10);
  if (!line) return null;
  const started = line.words.filter((w) => w.start <= frame);
  const page = started.length ? (started[started.length - 1] as { page?: number }).page ?? 0 : 0;
  const words = line.words.filter((w) => ((w as { page?: number }).page ?? 0) === page);
  const name = speakerName(line.speaker);
  const fadeOut = interpolate(frame, [line.end + 4, line.end + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ top: y, height: 360, alignItems: 'center', justifyContent: 'flex-start', opacity: fadeOut }}>
      {name ? (
        <div style={{ fontFamily: FONT.pixel, fontSize: 30, color: speakerColor(line.speaker), ...outline(8), marginBottom: 18, letterSpacing: 2 }}>
          {name}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 26px', width: 920 }}>
        {words.map((w, i) => {
          const s = spring({ frame: frame - w.start, fps, config: { damping: 11, stiffness: 220, mass: 0.6 } });
          const shown = frame >= w.start;
          const color = w.hi ? BRAND.gold : line.speaker === 'narrator' ? '#FFFFFF' : speakerColor(line.speaker);
          return (
            <span
              key={i}
              style={{
                fontFamily: FONT.caption,
                fontSize: w.hi ? 118 : 104,
                lineHeight: 1.12,
                textTransform: 'uppercase',
                color,
                ...outline(16),
                textShadow: '0 10px 0 rgba(0,0,0,0.55)',
                opacity: shown ? 1 : 0,
                transform: `translateY(${(1 - s) * 40}px) scale(${0.6 + 0.4 * s}) rotate(${w.hi ? (1 - s) * -6 : 0}deg)`,
                display: 'inline-block',
              }}
            >
              {w.w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- dialogue bubble (for short lines said on screen)
export const DialogueBubble: React.FC<{ text: string; speaker: CharacterId; x: number; y: number; frame: number; start: number; end: number }> = ({ text, speaker, x, y, frame, start, end }) => {
  const { fps } = useVideoConfig();
  if (frame < start || frame > end + 8) return null;
  const s = spring({ frame: frame - start, fps, config: { damping: 12, stiffness: 200 } });
  const out = interpolate(frame, [end, end + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -100%) scale(${s * out})`, transformOrigin: '50% 100%' }}>
      <div style={{ ...pixelPanel(CAST[speaker].captionColor), background: '#FFF6E0', padding: '22px 30px', fontFamily: FONT.caption, fontSize: 64, color: '#1a1016', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {text}
      </div>
      <div style={{ width: 0, height: 0, margin: '0 auto', borderLeft: '22px solid transparent', borderRight: '22px solid transparent', borderTop: `28px solid ${CAST[speaker].captionColor}` }} />
    </div>
  );
};

// ---------------------------------------------------------------- game HUD: money counter with bill steps
export const MoneyCounter: React.FC<{
  label: string; currency: string; from: number; to: number; frame: number; start: number; end: number;
  steps?: { label: string; amount: number }[];
}> = ({ label, currency, from, to, frame, start, end, steps }) => {
  const { fps } = useVideoConfig();
  if (frame < start || frame > end + 10) return null;
  const local = frame - start, span = end - start;
  const enter = spring({ frame: local, fps, config: { damping: 14 } });
  const exit = interpolate(frame, [end, end + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  let value: number, hitFrame = -999, activeStep = -1;
  if (steps?.length) {
    const stepGap = (span * 0.78) / steps.length;
    value = from;
    steps.forEach((st, i) => {
      const sf = Math.round(10 + i * stepGap);
      if (local >= sf) { activeStep = i; hitFrame = sf; }
      const k = interpolate(local, [sf + 6, sf + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      value += st.amount * k;
    });
  } else {
    value = interpolate(local, [8, Math.min(span - 10, 50)], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => 1 - Math.pow(1 - x, 3) });
  }
  const hit = local - hitFrame;
  const shake = hit >= 6 && hit < 16 ? Math.sin(hit * 3) * 10 : 0;
  const flash = hit >= 6 && hit < 18 ? 1 - (hit - 6) / 12 : 0;
  const goingDown = to < from;
  return (
    <div style={{ position: 'absolute', left: 60, top: 250, opacity: exit, transform: `translateX(${(1 - enter) * -700 + shake}px)` }}>
      <div style={{ ...pixelPanel(goingDown ? BRAND.red : BRAND.gold), padding: '22px 30px 18px', minWidth: 470 }}>
        <div style={{ fontFamily: FONT.pixel, fontSize: 24, color: BRAND.gold, letterSpacing: 2 }}>{label}</div>
        <div style={{ fontFamily: FONT.pixel, fontSize: 58, color: flash > 0 ? `rgb(255,${Math.round(246 - 160 * flash)},${Math.round(224 - 170 * flash)})` : BRAND.cream, marginTop: 14 }}>
          {currency}
          {Math.round(value).toLocaleString('en-GB')}
        </div>
        <div style={{ fontFamily: FONT.pixel, fontSize: 14, color: 'rgba(255,246,224,0.6)', marginTop: 12 }}>FICTIONAL GAME VALUE</div>
      </div>
      {steps?.map((st, i) => {
        const sf = Math.round(10 + i * ((span * 0.78) / steps.length));
        if (local < sf || i < activeStep) return null;
        const s = spring({ frame: local - sf, fps, config: { damping: 20, stiffness: 170 } });
        const fade = 1;
        return (
          <div key={i} style={{ marginTop: 14, opacity: fade, transform: `translateX(${(1 - s) * 900}px)` }}>
            <div style={{ ...pixelPanel(BRAND.red), display: 'inline-block', padding: '12px 22px', fontFamily: FONT.pixel, fontSize: 26, color: '#FFFFFF' }}>
              {st.label} <span style={{ color: '#FF8A7A' }}>-{currency}{Math.abs(st.amount).toLocaleString('en-GB')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const GameStats: React.FC<{ stats: { label: string; from: number; to: number; color: string }[]; frame: number; start: number; end: number }> = ({ stats, frame, start, end }) => {
  const { fps } = useVideoConfig();
  if (frame < start || frame > end + 10) return null;
  const enter = spring({ frame: frame - start, fps, config: { damping: 14 } });
  const exit = interpolate(frame, [end, end + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', right: 60, top: 250, opacity: exit, transform: `translateX(${(1 - enter) * 700}px)` }}>
      <div style={{ ...pixelPanel(BRAND.gold), padding: '20px 24px', width: 380 }}>
        {stats.map((st) => {
          const v = interpolate(frame - start, [8, 40], [st.from, st.to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={st.label} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: FONT.pixel, fontSize: 20, color: BRAND.cream, marginBottom: 8 }}>{st.label}</div>
              <div style={{ height: 30, background: '#1d2622', border: '4px solid #000', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${v}%`, background: st.color, boxShadow: 'inset 0 -8px 0 rgba(0,0,0,0.25)' }} />
                {Array.from({ length: 9 }).map((_, k) => (
                  <div key={k} style={{ position: 'absolute', left: `${(k + 1) * 10}%`, top: 0, bottom: 0, width: 4, background: 'rgba(0,0,0,0.6)' }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- portrait (pixel head-and-shoulders of a cast member)
export const Portrait: React.FC<{ who: CharacterId; size: number; frame: number; mouthAmp?: number; pose?: 'talk' | 'idle' | 'happy' }> = ({ who, size, frame, mouthAmp = 0, pose = 'talk' }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    paint(ref.current, CHAR_W, CHAR_H, (p) => drawCharacter(p, CAST[who], { pose, t: frame / 30, mouthAmp, blink: (frame + 20) % 97 < 4 }));
  });
  // show the top 34 rows (head + shoulders)
  const scale = size / 28;
  return (
    <div style={{ width: size, height: size, overflow: 'hidden', position: 'relative' }}>
      <canvas ref={ref} style={{ position: 'absolute', left: -6 * scale, top: -2 * scale, width: CHAR_W * scale, height: CHAR_H * scale, imageRendering: 'pixelated' }} />
    </div>
  );
};

// ---------------------------------------------------------------- phone call
export const PhoneCallOverlay: React.FC<{ caller: CharacterId; label: string; frame: number; start: number; answer: number; end: number; talkingAmp: number; talking: boolean }> = ({
  caller, label, frame, start, answer, end, talkingAmp, talking,
}) => {
  const { fps } = useVideoConfig();
  if (frame < start || frame > end + 12) return null;
  const ringing = frame < answer;
  const s = spring({ frame: frame - start, fps, config: { damping: 13 } });
  const out = interpolate(frame, [end, end + 12], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shrink = spring({ frame: frame - answer, fps, config: { damping: 15 } });
  const jiggle = ringing ? Math.sin(frame * 1.9) * 7 : 0;
  // ringing: big phone centre-top; answered: compact call bubble top-right
  const scale = ringing ? 1 : 1 - 0.42 * shrink;
  const x = ringing ? 540 : 540 + 250 * shrink;
  const y = ringing ? 300 : 300 - 40 * shrink;
  const secs = Math.max(0, Math.floor((frame - answer) / fps));
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, 0) scale(${s * scale * out}) rotate(${jiggle * 0.3}deg)`, transformOrigin: '50% 0' }}>
      <div style={{ ...pixelPanel(BRAND.green), width: 440, padding: '26px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(#18301f, #0A100D)' }}>
        <div style={{ fontFamily: FONT.pixel, fontSize: 20, color: 'rgba(255,246,224,0.75)' }}>{ringing ? 'INCOMING CALL' : `ON CALL 0:${String(secs).padStart(2, '0')}`}</div>
        <div style={{ margin: '18px 0', border: `6px solid ${talking ? BRAND.gold : '#000'}`, background: '#d8a060' }}>
          <Portrait who={caller} size={190} frame={frame} mouthAmp={talkingAmp} />
        </div>
        <div style={{ fontFamily: FONT.caption, fontSize: 64, color: '#FFF', letterSpacing: 2 }}>{label} ❤</div>
        {ringing ? (
          <div style={{ display: 'flex', gap: 60, marginTop: 18 }}>
            <div style={{ width: 84, height: 84, borderRadius: 42, background: BRAND.red, border: '5px solid #000' }} />
            <div style={{ width: 84, height: 84, borderRadius: 42, background: BRAND.green, border: '5px solid #000', transform: `scale(${1 + Math.abs(Math.sin(frame * 0.4)) * 0.15})` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- reaction emote over a character's head
export const CharacterReaction: React.FC<{ symbol: string; x: number; y: number; frame: number; start: number; end: number }> = ({ symbol, x, y, frame, start, end }) => {
  const { fps } = useVideoConfig();
  if (frame < start || frame > end) return null;
  const s = spring({ frame: frame - start, fps, config: { damping: 8, stiffness: 260 } });
  const bob = Math.sin((frame - start) * 0.35) * 8;
  const content =
    symbol === 'sweat' ? (
      <div style={{ width: 54, height: 74, background: '#7ad0ff', borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%', border: '6px solid #000', transform: 'rotate(18deg)' }} />
    ) : (
      <div style={{ ...pixelPanel('#000'), background: '#FFF6E0', padding: '8px 22px', fontFamily: FONT.caption, fontSize: 86, color: symbol.includes('!') ? BRAND.red : '#1a1016', lineHeight: 1 }}>
        {symbol}
      </div>
    );
  return <div style={{ position: 'absolute', left: x, top: y + bob, transform: `translate(-50%, -100%) scale(${s})`, transformOrigin: '50% 100%' }}>{content}</div>;
};

// ---------------------------------------------------------------- hook title (first 3 seconds)
export const HookTitle: React.FC<{ text: string; sub?: string; frame: number; start: number; end: number }> = ({ text, sub, frame, start, end }) => {
  const { fps } = useVideoConfig();
  if (frame < start || frame > end + 10) return null;
  const s = spring({ frame: frame - start, fps, config: { damping: 9, stiffness: 180 } });
  const out = interpolate(frame, [end, end + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ top: 250, height: 400, alignItems: 'center', opacity: out }}>
      <div style={{ transform: `scale(${0.3 + 0.7 * s}) rotate(${(1 - s) * -8 - 3}deg)`, background: BRAND.gold, border: '8px solid #000', boxShadow: '14px 14px 0 #000', padding: '18px 40px' }}>
        <div style={{ fontFamily: FONT.caption, fontSize: Math.min(120, Math.round((120 * 16) / Math.max(16, text.length))), color: '#0A100D', lineHeight: 1, whiteSpace: 'nowrap' }}>{text}</div>
      </div>
      {sub ? (
        <div style={{ marginTop: 34, fontFamily: FONT.pixel, fontSize: 38, color: '#fff', ...outline(10), opacity: interpolate(frame - start, [8, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>{sub}</div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- decision screen
export const DecisionScreen: React.FC<{ question: string; a: string; b: string; cta?: string; frame: number; start: number }> = ({ question, a, b, cta, frame, start }) => {
  const { fps } = useVideoConfig();
  if (frame < start) return null;
  const local = frame - start;
  const q = spring({ frame: local, fps, config: { damping: 10, stiffness: 160 } });
  const ca = spring({ frame: local - 10, fps, config: { damping: 11 } });
  const cb = spring({ frame: local - 16, fps, config: { damping: 11 } });
  const ctaIn = spring({ frame: local - 34, fps, config: { damping: 12 } });
  const pulse = 1 + Math.max(0, Math.sin(local * 0.32)) * 0.05;
  const [qa, qb] = question.split(/\s+or\s+/i);
  const qSize = Math.min(150, Math.round((150 * 14) / Math.max(14, question.length)));
  const card = (letter: string, text: string, color: string, k: number, side: 1 | -1) => (
    <div style={{ width: 470, transform: `translateY(${(1 - k) * 600}px) rotate(${side * (1 - k) * 12}deg)`, ...pixelPanel(color), padding: '22px 22px 26px', textAlign: 'center' }}>
      <div style={{ width: 110, height: 110, margin: '0 auto 14px', background: color, border: '6px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.caption, fontSize: 92, color: '#fff', ...outline(10) }}>{letter}</div>
      <div style={{ fontFamily: FONT.caption, fontSize: 50, lineHeight: 1.08, color: '#fff', textTransform: 'uppercase' }}>{text}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(10,16,13,0.85) 0%, rgba(10,16,13,0.55) 40%, rgba(10,16,13,0) 58%)', opacity: q }} />
      <AbsoluteFill style={{ top: 190, height: 200, alignItems: 'center' }}>
        <div style={{ transform: `scale(${q})`, fontFamily: FONT.caption, fontSize: qSize, lineHeight: 1, ...outline(18), textShadow: '0 12px 0 rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
          <span style={{ color: BRAND.blue }}>{qa?.toUpperCase()}</span>
          <span style={{ color: '#fff', fontSize: Math.round(qSize * 0.67) }}> OR </span>
          <span style={{ color: BRAND.green }}>{(qb ?? '').toUpperCase()}</span>
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 40 }}>
        {card('A', a, BRAND.blue, ca, -1)}
        {card('B', b, BRAND.green, cb, 1)}
      </div>
      {cta ? (
        <AbsoluteFill style={{ top: 375, height: 120, alignItems: 'center' }}>
          <div style={{ transform: `scale(${ctaIn * pulse})`, background: BRAND.gold, border: '7px solid #000', boxShadow: '10px 10px 0 #000', padding: '14px 30px', fontFamily: FONT.caption, fontSize: 56, color: '#0A100D', whiteSpace: 'nowrap' }}>
            {cta}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene transitions (played at the start of a scene)
export const SceneTransition: React.FC<{ kind?: string; local: number }> = ({ kind, local }) => {
  if (!kind || kind === 'cut' || kind === 'slide' || local > 14) return null;
  if (kind === 'flash') {
    const o = interpolate(local, [0, 10], [0.95, 0], { extrapolateRight: 'clamp' });
    return <AbsoluteFill style={{ background: '#fff', opacity: o }} />;
  }
  // pixel wipe: big pixel blocks vanish in a diagonal sweep
  const N = 9, M = 16, size = 1080 / N;
  const cells = [];
  for (let j = 0; j < M; j++)
    for (let i = 0; i < N; i++) {
      const order = (i + j) / (N + M - 2);
      if (local / 12 < order) cells.push(<div key={`${i}-${j}`} style={{ position: 'absolute', left: i * size, top: j * 120, width: size + 1, height: 121, background: BRAND.night }} />);
    }
  return <AbsoluteFill>{cells}</AbsoluteFill>;
};

// ---------------------------------------------------------------- end screen
export const EndScreen: React.FC<{ headline: string; cta: string; link: string; handle: string; frame: number; start: number }> = ({ headline, cta, link, handle, frame, start }) => {
  const { fps } = useVideoConfig();
  const local = frame - start;
  if (local < 0) return null;
  const s = spring({ frame: local, fps, config: { damping: 12 } });
  const s2 = spring({ frame: local - 8, fps, config: { damping: 12 } });
  const [w1, w2] = headline.split(/\s+OR\s+/i);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, #1d3a2a 0%, ${BRAND.night} 65%)`, alignItems: 'center' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', left: (i * 263) % 1080, top: (i * 431) % 1300, width: 8, height: 8, background: i % 3 ? BRAND.gold : '#fff', opacity: 0.3 + 0.5 * Math.abs(Math.sin(local * 0.15 + i)) }} />
      ))}
      <div style={{ marginTop: 300, transform: `scale(${s})`, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT.title, fontWeight: 700, fontSize: 170, lineHeight: 0.95, color: BRAND.gold, textShadow: '0 0 40px rgba(232,163,23,0.45), 0 8px 0 #000' }}>{w1}</div>
        <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 90, color: BRAND.cream, lineHeight: 1 }}>or</div>
        <div style={{ fontFamily: FONT.title, fontWeight: 700, fontSize: 170, lineHeight: 0.95, color: BRAND.gold, textShadow: '0 0 40px rgba(232,163,23,0.45), 0 8px 0 #000' }}>{w2}</div>
      </div>
      <div style={{ marginTop: 50, transform: `translateY(${(1 - s2) * 200}px)`, opacity: s2, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT.caption, fontSize: 64, color: '#fff', textTransform: 'uppercase' }}>{cta}</div>
        <div style={{ ...pixelPanel(BRAND.green), marginTop: 22, padding: '18px 26px', fontFamily: FONT.pixel, fontSize: 30, color: BRAND.cream }}>{link}</div>
        <div style={{ marginTop: 34, fontFamily: FONT.caption, fontSize: 58, color: BRAND.gold }}>FOLLOW {handle} FOR PART 2</div>
      </div>
    </AbsoluteFill>
  );
};
