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

export const Scene4Review: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const clipSrc = findClipFile(CLIP_BASE_NAMES.scene4Review);

  // Proportional split across the 4 review views synced with voiceover (sums to 100% of Scene 4)
  const topFrames = Math.round(durationInFrames * 0.35);
  const tableFrames = Math.round(durationInFrames * 0.13);
  const gapFrames = Math.round(durationInFrames * 0.26);
  const ruleCheckedFrames =
    durationInFrames - topFrames - tableFrames - gapFrames;

  const reviewTopSrc = findScreenshot("03_review_top.png");
  const reviewTableSrc = findScreenshot("04_review_table.png");
  const gapExpandedSrc = findScreenshot("05_gap_expanded.png");
  const ruleCheckedSrc = findScreenshot("07_rule_checked_expanded.png");

  return (
    <SceneFade fadeInFrames={10} fadeOutFrames={10}>
      <SceneHeader
        step="04"
        title="Review findings & audit trail"
        rightNote="MBI S0175/26 · 20 extracted requirements"
        accentColor={COLORS.red}
      />

      {clipSrc ? (
        <>
          <ClipViewport src={clipSrc} />
          <CaptionBar
            text="20 requirements: 1 disqualifying gap, 17 need review, 2 rule-checked."
            accentColor={COLORS.red}
          />
        </>
      ) : (
        <>
          {/* 4A: Summary bar & red disqualifying gap callout */}
          <Sequence durationInFrames={topFrames}>
            <ScreenshotStage
              src={reviewTopSrc}
              fallbackLabel="03_review_top.png — Summary bar and red disqualifying gap"
              startScale={1.0}
              endScale={1.09}
              startX={0}
              endX={-45}
              startY={0}
              endY={45}
              highlights={[
                {
                  leftPct: 18.6,
                  topPct: 36.8,
                  widthPct: 78.4,
                  heightPct: 5.8,
                  color: COLORS.red,
                  startFrame: 20,
                },
              ]}
            />
            <CaptionBar
              text="20 requirements: 1 disqualifying gap, 17 need review, 2 rule-checked."
              accentColor={COLORS.red}
            />
          </Sequence>

          {/* 4B: Requirements table sorted gaps first + E11 subcontractor as Needs review */}
          <Sequence from={topFrames} durationInFrames={tableFrames}>
            <ScreenshotStage
              src={reviewTableSrc}
              fallbackLabel="04_review_table.png — Requirements table sorted gaps first"
              startScale={1.02}
              endScale={1.06}
              startX={-20}
              endX={-35}
              startY={12}
              endY={-16}
              highlights={[
                {
                  leftPct: 17.8,
                  topPct: 10.2,
                  widthPct: 80.2,
                  heightPct: 5.5,
                  color: COLORS.red,
                  startFrame: 10,
                },
                {
                  leftPct: 17.8,
                  topPct: 55.2,
                  widthPct: 80.2,
                  heightPct: 5.0,
                  color: COLORS.amber,
                  startFrame: Math.round(tableFrames * 0.45),
                },
              ]}
            />
            <CaptionBar
              text="Gaps sort to the top; subcontractor clauses stay under Needs review."
              accentColor={COLORS.amber}
            />
          </Sequence>

          {/* 4C: Expanded gap audit trail (rule, comparison, evidence) */}
          <Sequence
            from={topFrames + tableFrames}
            durationInFrames={gapFrames}
          >
            <ScreenshotStage
              src={gapExpandedSrc}
              fallbackLabel="05_gap_expanded.png — REQ-003 expanded audit trail"
              startScale={1.05}
              endScale={1.14}
              startX={-40}
              endX={-85}
              startY={35}
              endY={90}
              highlights={[
                {
                  leftPct: 17.8,
                  topPct: 10.0,
                  widthPct: 80.2,
                  heightPct: 28.6,
                  color: COLORS.red,
                  startFrame: 12,
                },
              ]}
            />
            <CaptionBar
              text="Audit trail shows the rule, comparison, and company certificate behind the gap."
              accentColor={COLORS.red}
            />
          </Sequence>

          {/* 4D: Rule-checked matches expanded */}
          <Sequence
            from={topFrames + tableFrames + gapFrames}
            durationInFrames={ruleCheckedFrames}
          >
            <ScreenshotStage
              src={ruleCheckedSrc}
              fallbackLabel="07_rule_checked_expanded.png — Expanded Rule-checked group"
              startScale={1.04}
              endScale={1.11}
              startX={-35}
              endX={-65}
              startY={-45}
              endY={-95}
              highlights={[
                {
                  leftPct: 17.8,
                  topPct: 40.2,
                  widthPct: 80.2,
                  heightPct: 52.5,
                  color: COLORS.green,
                  startFrame: 10,
                },
              ]}
            />
            <CaptionBar
              text="Rule-checked rows confirm active MOF and SSM registrations with evidence."
              accentColor={COLORS.green}
            />
          </Sequence>
        </>
      )}
    </SceneFade>
  );
};
