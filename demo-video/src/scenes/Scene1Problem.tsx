import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../config";
import { INTER_FONT_FAMILY } from "../fonts";
import { CaptionBar, SceneFade, SceneHeader } from "../components/SceneChrome";

export const Scene1Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingOpacity = interpolate(frame, [6, Math.round(0.9 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const headingY = interpolate(frame, [6, Math.round(0.9 * fps)], [18, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const bodyOpacity = interpolate(
    frame,
    [Math.round(0.7 * fps), Math.round(1.6 * fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  const metaOpacity = interpolate(
    frame,
    [Math.round(1.6 * fps), Math.round(2.4 * fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  return (
    <SceneFade fadeInFrames={12} fadeOutFrames={12}>
      <SceneHeader step="01" title="The problem" accentColor={COLORS.red} />

      <div
        style={{
          position: "absolute",
          left: 140,
          right: 180,
          top: 210,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          fontFamily: INTER_FONT_FAMILY,
        }}
      >
        <div
          style={{
            width: 72,
            height: 5,
            backgroundColor: COLORS.red,
            borderRadius: 3,
            marginBottom: 40,
            opacity: headingOpacity,
          }}
        />

        <h1
          style={{
            margin: 0,
            color: COLORS.white,
            fontSize: 70,
            fontWeight: 600,
            lineHeight: 1.16,
            letterSpacing: "-0.025em",
            maxWidth: 1420,
            opacity: headingOpacity,
            translate: `0px ${headingY}px`,
          }}
        >
          One missed clause can disqualify a Malaysian SME contractor.
        </h1>

        <p
          style={{
            margin: "38px 0 0 0",
            color: COLORS.textSecondary,
            fontSize: 34,
            fontWeight: 400,
            lineHeight: 1.48,
            maxWidth: 1260,
            opacity: bodyOpacity,
          }}
        >
          Mandatory registration codes, attachments, and submission rules are
          often buried across long Bahasa Malaysia and English tender PDFs —
          including scanned pages.
        </p>

        <div
          style={{
            marginTop: 56,
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            padding: "14px 24px",
            borderRadius: 8,
            backgroundColor: COLORS.navySurface,
            border: `1px solid ${COLORS.navyBorder}`,
            opacity: metaOpacity,
          }}
        >
          <span
            style={{
              color: COLORS.textMuted,
              fontSize: 22,
              fontWeight: 500,
            }}
          >
            Real tender walkthrough:
          </span>
          <span
            style={{
              color: COLORS.white,
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            MBI S0175/26 · 29 pages · Bahasa Malaysia and English
          </span>
        </div>
      </div>

      <CaptionBar
        text="One missed clause can disqualify a Malaysian SME tender bid."
        accentColor={COLORS.red}
      />
    </SceneFade>
  );
};
