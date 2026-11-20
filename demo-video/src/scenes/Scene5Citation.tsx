import React from "react";
import { findClipFile, findScreenshot } from "../assets";
import { CLIP_BASE_NAMES, COLORS } from "../config";
import {
  CaptionBar,
  ClipViewport,
  SceneFade,
  SceneHeader,
  ScreenshotStage,
} from "../components/SceneChrome";

export const Scene5Citation: React.FC = () => {
  const clipSrc = findClipFile(CLIP_BASE_NAMES.scene5Citation);
  const citationSrc = findScreenshot("09_citation_pdf_page.png");

  return (
    <SceneFade fadeInFrames={10} fadeOutFrames={10}>
      <SceneHeader
        step="05"
        title="Source PDF page citation"
        rightNote="MBI_462325MEJA.pdf · Page 2 / 29"
        accentColor={COLORS.blue}
      />

      {clipSrc ? (
        <ClipViewport src={clipSrc} />
      ) : (
        <ScreenshotStage
          src={citationSrc}
          fallbackLabel="09_citation_pdf_page.png — Source PDF opened directly at page 2 / 29"
          startScale={1.0}
          endScale={1.08}
          startX={0}
          endX={-32}
          startY={0}
          endY={34}
          highlights={[
            {
              leftPct: 35.3,
              topPct: 0.9,
              widthPct: 5.2,
              heightPct: 3.8,
              color: COLORS.blue,
              startFrame: 12,
            },
            {
              leftPct: 38.4,
              topPct: 48.0,
              widthPct: 30.0,
              heightPct: 5.8,
              color: COLORS.red,
              startFrame: 34,
            },
          ]}
        />
      )}

      <CaptionBar
        text="Clicking a page citation opens page 2 of the tender PDF."
        accentColor={COLORS.blue}
      />
    </SceneFade>
  );
};
