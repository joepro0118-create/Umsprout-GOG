import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../config";
import { INTER_FONT_FAMILY } from "../fonts";
import { CaptionBar, SceneFade, SceneHeader } from "../components/SceneChrome";

const STATUS_ITEMS = [
  {
    color: COLORS.red,
    label: "Gap",
    detail: "Missing required credential from confirmed company profile",
  },
  {
    color: COLORS.amber,
    label: "Needs review",
    detail: "Manual check with optional supporting PDF attestation",
  },
  {
    color: COLORS.green,
    label: "Rule-checked",
    detail: "Deterministic match backed by company certificate",
  },
] as const;

export const Scene2Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [6, Math.round(0.8 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const titleY = interpolate(frame, [6, Math.round(0.8 * fps)], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const legendOpacity = interpolate(
    frame,
    [Math.round(1.1 * fps), Math.round(1.9 * fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  return (
    <SceneFade fadeInFrames={10} fadeOutFrames={10}>
      <SceneHeader step="02" title="TenderMate" accentColor={COLORS.blue} />

      <div
        style={{
          position: "absolute",
          left: 140,
          right: 180,
          top: 195,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          fontFamily: INTER_FONT_FAMILY,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
            opacity: titleOpacity,
          }}
        >
          <span
            style={{
              color: COLORS.white,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            TenderMate
          </span>
          <span
            style={{
              color: COLORS.textMuted,
              fontSize: 24,
              fontWeight: 400,
            }}
          >
            · Preliminary readiness assessment
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            color: COLORS.white,
            fontSize: 58,
            fontWeight: 600,
            lineHeight: 1.22,
            letterSpacing: "-0.02em",
            maxWidth: 1460,
            opacity: titleOpacity,
            translate: `0px ${titleY}px`,
          }}
        >
          TenderMate checks a tender against your company profile and shows what
          could disqualify you, with page citations.
        </h1>

        <div
          style={{
            marginTop: 58,
            display: "flex",
            flexDirection: "column",
            gap: 22,
            opacity: legendOpacity,
          }}
        >
          {STATUS_ITEMS.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  backgroundColor: item.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: COLORS.white,
                  fontSize: 26,
                  fontWeight: 600,
                  minWidth: 190,
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 25,
                  fontWeight: 400,
                }}
              >
                {item.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      <CaptionBar
        text="A preliminary readiness assessment against your company profile, with citations."
        accentColor={COLORS.blue}
      />
    </SceneFade>
  );
};
