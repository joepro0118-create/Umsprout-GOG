import React from "react";
import { Audio } from "@remotion/media";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { findPublicFile } from "../assets";
import { AUDIO_FILES, AUDIO_SETTINGS } from "../config";

const MusicTrack: React.FC<{ readonly src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeInFrames = Math.max(1, Math.round(AUDIO_SETTINGS.musicFadeInSec * fps));
  const fadeOutFrames = Math.max(1, Math.round(AUDIO_SETTINGS.musicFadeOutSec * fps));
  const fadeOutStart = Math.max(fadeInFrames + 1, durationInFrames - fadeOutFrames);

  const volume = interpolate(
    frame,
    [0, fadeInFrames, fadeOutStart, durationInFrames],
    [0, AUDIO_SETTINGS.musicVolume, AUDIO_SETTINGS.musicVolume, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return <Audio src={src} loop volume={volume} />;
};

/**
 * Renders optional voiceover.mp3 (100% volume) and music.mp3 (12% volume with fade in/out).
 * If either file is not present in demo-video/public/, it is silently omitted so build/render succeeds.
 */
export const AudioTracks: React.FC = () => {
  const voiceoverSrc = findPublicFile(AUDIO_FILES.voiceover);
  const musicSrc = findPublicFile(AUDIO_FILES.music);

  return (
    <>
      {voiceoverSrc ? (
        <Audio src={voiceoverSrc} volume={AUDIO_SETTINGS.voiceoverVolume} />
      ) : null}
      {musicSrc ? <MusicTrack src={musicSrc} /> : null}
    </>
  );
};
