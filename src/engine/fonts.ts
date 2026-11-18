// Loads the studio's OFL fonts from public/fonts before any frame is captured.
import { continueRender, delayRender, staticFile } from 'remotion';

const FONTS: [string, string, FontFaceDescriptors?][] = [
  ['Anton', 'fonts/Anton.ttf'],
  ['Press Start 2P', 'fonts/PressStart2P.ttf'],
  ['Cinzel', 'fonts/Cinzel.ttf', { weight: '400 900' }],
  ['Cormorant Garamond', 'fonts/CormorantGaramond.ttf', { weight: '300 700' }],
  ['Cormorant Garamond', 'fonts/CormorantGaramond-Italic.ttf', { weight: '300 700', style: 'italic' }],
];

let started = false;
export const loadFonts = () => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Loading fonts');
  Promise.all(
    FONTS.map(([family, file, desc]) => {
      const face = new FontFace(family, `url(${staticFile(file)})`, desc);
      return face.load().then((f) => document.fonts.add(f));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error('Font load failed', e);
      continueRender(handle);
    });
};

export const FONT = {
  caption: 'Anton, Impact, sans-serif',
  pixel: '"Press Start 2P", monospace',
  title: 'Cinzel, serif',
  serif: '"Cormorant Garamond", serif',
};
