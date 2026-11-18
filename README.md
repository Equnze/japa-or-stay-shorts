# Japa or Stay: Shorts Studio

A code-driven studio for animated 2.5D pixel-art YouTube Shorts for the **Japa or Stay** channel
(game: https://japa-or-stay.pages.dev · socials: @japaor_stay).

You write an episode as a JSON script (scenes, lines, cast, camera, game UI). The studio voices it, builds the timeline,
composes an original soundtrack, and renders a 1080×1920, 30 fps MP4 with Remotion. All pictures and music are drawn
and synthesized in code. There are no sprite sheets, stock loops or copyrighted assets.

```
episodes/ep01/episode.json  ──voice.py──▶  public/episodes/ep01/vo/*.wav (+ word timings)
                            ──build-timeline──▶ public/episodes/ep01/timeline.json
                            ──audio.mjs──▶  public/episodes/ep01/mix.wav (music + SFX + ambience + voices, ducked)
                            ──render.mjs──▶ out/ep01/ep01.mp4, .srt, poster.jpg, frames/, contact-sheet.jpg
```

## Setup (once)

Needs Node 18+ (tested on Node 26), Python 3 with `edge-tts`, and ffmpeg on PATH.

```bash
npm install
```

```bash
python -m pip install --user edge-tts
```

On first render Remotion downloads its own headless Chrome. If that fails, uncomment the `setBrowserExecutable`
line in `remotion.config.ts` to use the system Chrome.

## Make the next Short

1. **Pick an idea** from `ideas/SHORTS_IDEAS.md` (30 ranked ideas, each already mapped to sets and cast).
2. **Scaffold it:**
   ```bash
   npm run new -- ep02 "His First UK Salary Lasted 9 Days"
   ```
   This writes `episodes/ep02/episode.json` (a 4-beat template: hook, problem, twist, decision) and `publishing.md`.
3. **Write the script** in `episode.json`: replace every `REPLACE`. Keep it 20–40 s: about 60–80 spoken words.
   Structure: hook (0–3 s) → setup → problem → twist → decision ending
   "If na you, wetin you go do? JAPA or STAY?" + "Comment A or B! Follow for Part 2!".
4. **Check it:**
   ```bash
   npm run validate -- ep02
   ```
   It checks the environments, cast, poses, cue references, the decision ending, the link, and (after a build)
   the 20–40 s runtime and the hook timing. It warns when a scene label doesn't mention its location, so
   backgrounds stay matched to the story.
5. **Build everything** (voices → timeline → soundtrack → validate → render):
   ```bash
   npm run episode -- ep02
   ```
   Add `--no-render` to stop before the video and preview it live instead:
   ```bash
   npm run studio
   ```
   In the Studio, pick the **Episode** composition and set `episodeId` to `ep02` in the props panel.
6. **Look at it**: open `out/ep02/contact-sheet.jpg` (hook, every scene, the decision, the end screen) and watch the MP4.
   For a fast look without a full render: `npm run stills -- ep02`.
7. **Publish**: fill in `episodes/ep02/publishing.md` (title, description with https://japa-or-stay.pages.dev,
   hashtags, pinned comment, thumbnail concept, Part 2) and upload by hand.

Re-running is cheap: voice lines are cached and only re-fetched when their text, voice, rate or pitch changes.

## The episode file

```jsonc
{
  "id": "ep02", "title": "…", "hook": "…", "disclaimer": "All money figures are fictional game values.",
  "voices": { "narrator": { "voice": "en-NG-AbeoNeural", "rate": "+10%", "pitch": "-6Hz" }, "mama": { … }, … },
  "scenes": [{
    "id": "s1-airport",
    "label": "Lagos airport, departures hall",          // the story location (validated against the set)
    "environment": { "type": "airport", "timeOfDay": "day", "weather": "clear", "props": ["plane"], "seed": 3 },
    "split": { "type": "lagosStreet", "label": "LAGOS", "cast": [ … ] },   // optional right half
    "camera": { "from": { "x": 118, "y": 214, "zoom": 1.75 }, "to": { … }, "ease": "out", "shakeAt": [2.3] },
    "splitCamera": { … },                                 // optional, for the right half
    "cast": [{ "who": "chinedu", "x": 120, "facing": "left", "pose": "happy",
               "poses": [{ "at": "c1", "pose": "wave" }], "walkTo": 150 }],
    "lines": [{ "id": "c1", "speaker": "chinedu", "text": "Lagos, bye-bye!", "say": "how the voice reads it",
                "highlight": ["Lagos,"], "holdAfter": 0.1, "bubble": false }],
    "ui": [ { "kind": "title", … }, { "kind": "money", … }, … ],
    "music": "lagos | london | tension | decision",
    "ambience": "airport | rain | room | street | office | home",
    "transition": "cut | pixelWipe | flash | slide",
    "lead": 0.15, "tail": 0.35, "minDuration": 6
  }],
  "endScreen": { "headline": "JAPA OR STAY", "cta": "Play the free game",
                 "link": "https://japa-or-stay.pages.dev", "handle": "@japaor_stay", "seconds": 2.6 }
}
```

Times in `at` are seconds into the scene, or a line id (= when that line starts).

**Environments** (`environment.type`), each with 7 layers (sky, distant, midground, characters, effects,
foreground, UI on top) and its own parallax depth, colour grade and light:

| type | what's in it | props |
|---|---|---|
| `lagosStreet` | haze, rooftop water tanks, painted shop boards, poles with tangled cables, market umbrellas, danfo, keke, hawkers, palms | `timeOfDay: night` |
| `londonStreet` | brick terraces, sash windows, chimney pots, glass bus shelter, bus stop flag, red double-decker (no logos), lamppost, puddles, rain | `busArrives`, `busPass`, `splash` |
| `ukApartment` | magnolia walls, damp corner, rain on the window, radiator, bills on the table, clothes airer, laminate floor | |
| `airport` | glass curtain wall, departures board, check-in counters, queue barriers, travellers with suitcases, luggage belt, plane | `plane` (takes off) |
| `nigerianHome` | lace curtains, burglar-proof bars, family photos, ceiling fan, TV on a cabinet, sofa with crochet covers, tiled floor | `blackout` |
| `ukWorkplace` | open-plan office, desks and monitors, whiteboard with sticky notes, colleagues, city view | |

`seed` varies shop colours, windows and extras. `timeOfDay`: morning, day, evening, night. `weather`: clear, haze, overcast, rain.

**Characters** (`src/characters/cast.ts`, looks only, no story): `chinedu`, `amaka`, `tunde`, `ada`, `mama`.
Poses: `idle walk talk happy sad shocked thinking phone wave sit`. Everyone blinks on their own rhythm; mouths
open with the actual loudness of their voice line. Add a character by adding an entry to `CAST` and a voice.

**UI cues** (`ui[]`): `title` (hook card), `money` (counter, optional bill `steps`, always labelled
"FICTIONAL GAME VALUE"), `stats` (game bars like HAPPY/STRESS), `phone` (incoming call → answered call with a talking
portrait), `reaction` (`! ? !! sweat …` over a head), `decision` (A/B cards + CTA), `sfx` (`chime splash pop whoosh coin stamp click blip`).

## Folder structure

```
src/
  engine/        pixel.ts (low-res painter, dithering, 3x5 sign font), types.ts, fonts.ts
  environments/  lagosStreet.ts, londonStreet.ts, interiors.ts (ukApartment, airport, nigerianHome, ukWorkplace), common.ts
  characters/    cast.ts (looks), draw.ts (pixel drawing + poses + faces)
  components/    PixelArtEnvironment, PixelArtCharacter, CameraController, scenes.tsx (LagosStreetScene, LondonStreetScene,
                 UKApartmentScene, AirportScene, NigerianHomeScene, UKWorkplaceScene), ui.tsx (AnimatedCaptions,
                 DialogueBubble, MoneyCounter, GameStats, PhoneCallOverlay, CharacterReaction, HookTitle,
                 DecisionScreen, SceneTransition, EndScreen)
  compositions/  Episode.tsx (any episode), SceneLibrary.tsx (all sets), CastSheet.tsx (all poses)
scripts/         new-episode, validate, voice.py, build-timeline, audio, render, episode (all steps), stills
episodes/<id>/   episode.json + publishing.md (the only files you edit per episode)
public/          fonts (OFL) + built voices, timelines and mixes
ideas/           SHORTS_IDEAS.md
out/<id>/        the MP4, .srt, poster, frames, contact sheet, audio stems
```

## Rendering on this PC

The machine has about 6 GB of RAM, so everything runs lean: Remotion renders with one browser tab
(`Config.setConcurrency(1)` in `remotion.config.ts`), JPEG frames, and the audio is mixed in plain Node.
A 36 s episode takes roughly 10–15 minutes. Close Chrome tabs while rendering. If you have more memory,
`node scripts/render.mjs ep02 --concurrency=2` is faster.

## Sound

- **Voices**: Microsoft edge-tts neural voices (en-NG Abeo and Ezinne), online. Pauses inside a line are capped
  at 0.28 s so the pace stays Shorts-fast. Check Microsoft's terms before monetising. To use real voice actors,
  drop `<lineId>.wav` files into `public/episodes/<id>/vo/` and run `python scripts/voice.py <id> --import`
  (captions are then spread evenly across each line).
- **Music**: an original Afrobeats-style groove (104 BPM, Am–F–C–G, marimba hook, shaker, talking-drum fills)
  synthesized in `scripts/audio.mjs`, with a mood per scene: warm `lagos`, cold filtered `london`, pulsing
  `tension`, building `decision`. No samples or licensed loops.
- **SFX and ambience** are synthesized too and cued from the UI events (ticks and a coin on money up, a thud per bill,
  a phone ring until the call is answered, bus rumble and splash, riser and stamp on the decision).
- **Ducking**: an envelope follower on the voices pulls the music down ~8 dB under dialogue.
  The mix lands around −16 LUFS; stems are in `out/<id>/stems/`.

## Licences

Fonts in `public/fonts` are SIL Open Font License (Anton, Press Start 2P, Cinzel, Cormorant Garamond; licence
files alongside). All art and music are generated by this code. Characters and stories are fictional.
