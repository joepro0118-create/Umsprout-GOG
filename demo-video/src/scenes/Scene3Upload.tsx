import React from "react";
import { Sequence, useVideoConfig } from "remotion";
import { findClipFile, findScreenshot } from "../assets";
import { CLIP_BASE_NAMES, COLORS } from "../config";
import {
  CaptionBar,
  ClipViewport,
  SceneFade,
  SceneHeader,
  ScreenshotStage,
} from "../components/SceneChrome";

export const Scene3Upload: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const clipSrc = findClipFile(CLIP_BASE_NAMES.scene3Upload);

  const emptyFrames = Math.round(durationInFrames * 0.25);
  const selectedFrames = durationInFrames - emptyFrames;

  const emptySrc = findScreenshot("01_upload_empty.png");
  const selectedSrc = findScreenshot("02_upload_file_selected.png");

  return (
    <SceneFade fadeInFrames={10} fadeOutFrames={10}>
      <SceneHeader
        step="03"
        title="Upload tender PDF"
        rightNote="Company profile shown is sample demo data"
        accentColor={COLORS.blue}
      />

      {clipSrc ? (
        <ClipViewport src={clipSrc} />
      ) : (
        <>
          <Sequence durationInFrames={emptyFrames}>
            <ScreenshotStage
              src={emptySrc}
              fallbackLabel="01_upload_empty.png — Upload screen with empty drop zone"
              startScale={1.0}
              endScale={1.04}
              startX={0}
              endX={14}
              startY={0}
              endY={-8}
              highlights={[
                {
                  leftPct: 0.4,
                  topPct: 89.2,
                  widthPct: 14.8,
                  heightPct: 9.8,
                  color: COLORS.blue,
                  label: "Sample demo profile",
                  startFrame: 18,
                },
              ]}
            />
          </Sequence>

          <Sequence from={emptyFrames} durationInFrames={selectedFrames}>
            <ScreenshotStage
              src={selectedSrc}
              fallbackLabel="02_upload_file_selected.png — MBI_462325MEJA.pdf selected"
              startScale={1.03}
              endScale={1.12}
              startX={25}
              endX={85}
              startY={12}
              endY={45}
              highlights={[
                {
                  leftPct: 19.2,
                  topPct: 27.6,
                  widthPct: 43.2,
                  heightPct: 9.2,
                  color: COLORS.blue,
                  startFrame: 10,
                },
                {
                  leftPct: 53.5,
                  topPct: 49.8,
                  widthPct: 9.6,
                  heightPct: 5.8,
                  color: COLORS.blue,
                  startFrame: 28,
                },
              ]}
            />
          </Sequence>
        </>
      )}

      <CaptionBar
        text="Upload a tender PDF to check against sample company profile data."
        accentColor={COLORS.blue}
      />
    </SceneFade>
  );
};
