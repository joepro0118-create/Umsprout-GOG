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

export const Scene6Resolve: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const clipSrc = findClipFile(CLIP_BASE_NAMES.scene6Resolve);

  const formFrames = Math.round(durationInFrames * 0.48);
  const resolvedFrames = durationInFrames - formFrames;

  const needsReviewSrc = findScreenshot("06_needs_review_expanded.png");
  const resolvedSrc = findScreenshot("10_resolved_user_evidenced.png");

  return (
    <SceneFade fadeInFrames={10} fadeOutFrames={10}>
      <SceneHeader
        step="06"
        title="Attach supporting evidence"
        rightNote="REQ-001 · User attestation workflow"
        accentColor={COLORS.amber}
      />

      {clipSrc ? (
        <ClipViewport src={clipSrc} />
      ) : (
        <>
          <Sequence durationInFrames={formFrames}>
            <ScreenshotStage
              src={needsReviewSrc}
              fallbackLabel="06_needs_review_expanded.png — Evidence attestation form on REQ-001"
              startScale={1.02}
              endScale={1.12}
              startX={-20}
              endX={-75}
              startY={20}
              endY={70}
              highlights={[
                {
                  leftPct: 17.8,
                  topPct: 15.6,
                  widthPct: 80.2,
                  heightPct: 34.4,
                  color: COLORS.amber,
                  startFrame: 12,
                },
              ]}
            />
          </Sequence>

          <Sequence from={formFrames} durationInFrames={resolvedFrames}>
            <ScreenshotStage
              src={resolvedSrc}
              fallbackLabel="10_resolved_user_evidenced.png — Updated User-evidenced status"
              startScale={1.03}
              endScale={1.1}
              startX={-25}
              endX={-65}
              startY={-10}
              endY={-45}
              highlights={[
                {
                  leftPct: 38.0,
                  topPct: 21.0,
                  widthPct: 54.0,
                  heightPct: 11.0,
                  color: COLORS.blue,
                  startFrame: 10,
                },
                {
                  leftPct: 30.2,
                  topPct: 72.5,
                  widthPct: 66.5,
                  heightPct: 17.5,
                  color: COLORS.blue,
                  startFrame: 26,
                },
              ]}
            />
          </Sequence>
        </>
      )}

      <CaptionBar
        text="Attached evidence marks an item user-attested, not rule-verified."
        accentColor={COLORS.blue}
      />
    </SceneFade>
  );
};
