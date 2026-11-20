import React from "react";
import {
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../config";
import { INTER_FONT_FAMILY } from "../fonts";
import { CaptionBar, SceneFade, SceneHeader } from "../components/SceneChrome";

const LIMITS = [
  {
    color: COLORS.amber,
    heading: "It can miss clauses",
    body: "Automated extraction can skip routine forms or edge-case phrasing.",
  },
  {
    color: COLORS.amber,
    heading: "Scanned pages rely on OCR",
    body: "Image-based schedules and low-contrast scans can cause reading errors.",
  },
  {
    color: COLORS.red,
    heading: "Always verify against official tender documents",
    body: "Use TenderMate as a preliminary readiness assessment — never as legal sign-off.",
  },
] as const;

const LimitsCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 140,
        right: 180,
        top: 185,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        fontFamily: INTER_FONT_FAMILY,
        opacity: fadeOut,
      }}
    >
      <h1
        style={{
          margin: 0,
          color: COLORS.white,
          fontSize: 60,
          fontWeight: 600,
          lineHeight: 1.18,
          letterSpacing: "-0.02em",
          maxWidth: 1380,
        }}
      >
        Know the limits before you submit.
      </h1>

      <div
        style={{
          marginTop: 52,
          display: "flex",
          flexDirection: "column",
          gap: 32,
          width: "100%",
          maxWidth: 1320,
        }}
      >
        {LIMITS.map((item, idx) => {
          const itemOpacity = interpolate(
            frame,
            [Math.round((0.3 + idx * 0.45) * fps), Math.round((0.8 + idx * 0.45) * fps)],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            },
          );

          return (
            <div
              key={item.heading}
              style={{
                display: "flex",
                flexDirection: "column",
                borderLeft: `4px solid ${item.color}`,
                paddingLeft: 28,
                opacity: itemOpacity,
              }}
            >
              <div
                style={{
                  color: COLORS.white,
                  fontSize: 32,
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}
              >
                {item.heading}
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: COLORS.textSecondary,
                  fontSize: 25,
                  fontWeight: 400,
                  lineHeight: 1.45,
                }}
              >
                {item.body}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, Math.round(0.6 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 140,
        right: 180,
        top: 250,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        fontFamily: INTER_FONT_FAMILY,
        opacity,
      }}
    >
      <div
        style={{
          width: 72,
          height: 5,
          backgroundColor: COLORS.blue,
          borderRadius: 3,
          marginBottom: 34,
        }}
      />

      <h1
        style={{
          margin: 0,
          color: COLORS.white,
          fontSize: 82,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
        }}
      >
        TenderMate
      </h1>

      <p
        style={{
          margin: "22px 0 0 0",
          color: COLORS.textSecondary,
          fontSize: 32,
          fontWeight: 400,
          lineHeight: 1.4,
        }}
      >
        Preliminary readiness assessment for Malaysian tender documents.
      </p>

      <div
        style={{
          marginTop: 52,
          width: 560,
          height: 1,
          backgroundColor: COLORS.navyBorder,
        }}
      />

      <div
        style={{
          marginTop: 32,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            color: COLORS.white,
            fontSize: 28,
            fontWeight: 500,
          }}
        >
          Built by GOG
        </div>
      </div>
    </div>
  );
};

export const Scene8Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const limitsFrames = Math.round(durationInFrames * 0.6);
  const endCardFrames = durationInFrames - limitsFrames;
  const isEndCard = frame >= limitsFrames;

  return (
    <SceneFade fadeInFrames={10} fadeOutFrames={14}>
      <SceneHeader
        step="08"
        title={isEndCard ? "TenderMate" : "Honest limits"}
        accentColor={isEndCard ? COLORS.blue : COLORS.amber}
      />

      <Sequence durationInFrames={limitsFrames}>
        <LimitsCard />
      </Sequence>

      <Sequence from={limitsFrames} durationInFrames={endCardFrames}>
        <EndCard />
      </Sequence>

      <CaptionBar
        text="Preliminary readiness assessment only. Always verify against official tender documents."
        accentColor={COLORS.amber}
      />
    </SceneFade>
  );
};
