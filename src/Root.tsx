import React from 'react';
import { Composition } from 'remotion';
import { loadFonts } from './engine/fonts';
import { SceneLibrary, LIBRARY } from './compositions/SceneLibrary';
import { CastSheet } from './compositions/CastSheet';
import { Episode, calculateEpisodeMetadata } from './compositions/Episode';

loadFonts();

export const RemotionRoot: React.FC = () => (
  <>
    {/* Any episode: npx remotion render Episode out/x.mp4 --props='{"episodeId":"ep02"}' */}
    <Composition
      id="Episode"
      component={Episode}
      durationInFrames={30 * 30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ episodeId: 'ep01', timeline: null }}
      calculateMetadata={calculateEpisodeMetadata}
    />
    <Composition id="SceneLibrary" component={SceneLibrary} durationInFrames={LIBRARY.length * 60} fps={30} width={1080} height={1920} />
    <Composition id="CastSheet" component={CastSheet} durationInFrames={90} fps={30} width={1080} height={1920} />
  </>
);
