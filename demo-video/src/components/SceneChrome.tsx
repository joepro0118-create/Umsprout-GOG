import React from "react";
import { Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../config";
import { INTER_FONT_FAMILY } from "../fonts";

export const VIEWPORT_WIDTH = 1376;
export const VIEWPORT_HEIGHT = 860; // Exact 16:10 ratio matching 2880x1800 screenshots

/**
 * Gentle fade-in and fade-out envelope at scene boundaries.
 */
export const SceneFade: React.FC<{
  readonly children: React.ReactNode;
  readonly fadeInFrames?: number;
  readonly fadeOutFrames?: number;
}> = ({ children, fadeInFrames = 10, fadeOutFrames = 10 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn =
    fadeInFrames > 0
      ? interpolate(frame, [0, fadeInFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })
      : 1;

  const fadeOut =
    fadeOutFrames > 0
      ? interpolate(
          frame,
          [durationInFrames - fadeOutFrames, durationInFrames],
          [1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.in(Easing.cubic),
          },
        )
      : 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.navy,
        fontFamily: INTER_FONT_FAMILY,
        opacity: Math.min(fadeIn, fadeOut),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Minimal top bar showing scene step and optional context note (e.g., sample demo data).
 */
export const SceneHeader: React.FC<{
  readonly step: string;
  readonly title: string;
  readonly rightNote?: string;
  readonly accentColor?: string;
}> = ({ step, title, rightNote, accentColor = COLORS.blue }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 22,
        left: 96,
        right: 96,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: INTER_FONT_FAMILY,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: accentColor,
          }}
        />
        <span
          style={{
            color: COLORS.textMuted,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {step}
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.28)",
            fontSize: 20,
          }}
        >
          /
        </span>
        <span
          style={{
            color: COLORS.white,
            fontSize: 20,
            fontWeight: 500,
          }}
        >
          {title}
        </span>
      </div>

      {rightNote ? (
        <div
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            color: COLORS.textSecondary,
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          {rightNote}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Readable 1080p bottom-left caption bar shown on every scene.
 * Positioned safely inside the bottom margin (y = 956..1040) so it never overlaps app UI.
 */
export const CaptionBar: React.FC<{
  readonly text: string;
  readonly accentColor?: string;
}> = ({ text, accentColor = COLORS.blue }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [4, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        right: 96,
        bottom: 36,
        display: "flex",
        alignItems: "center",
        opacity,
        fontFamily: INTER_FONT_FAMILY,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          backgroundColor: "rgba(11, 27, 51, 0.94)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          borderLeft: `5px solid ${accentColor}`,
          borderRadius: 8,
          padding: "16px 26px",
          maxWidth: 1500,
          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.32)",
        }}
      >
        <span
          style={{
            color: COLORS.white,
            fontSize: 31,
            fontWeight: 500,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

/**
 * Fallback card shown only if a required screenshot or clip is missing.
 */
export const PlaceholderCard: React.FC<{
  readonly whatToRecord: string;
}> = ({ whatToRecord }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: COLORS.navySurface,
        border: `2px dashed ${COLORS.amber}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 80,
        boxSizing: "border-box",
        fontFamily: INTER_FONT_FAMILY,
      }}
    >
      <div
        style={{
          color: COLORS.amber,
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        [INSERT CLIP: {whatToRecord}]
      </div>
      <div
        style={{
          color: COLORS.textSecondary,
          fontSize: 22,
          lineHeight: 1.5,
        }}
      >
        Add the real screenshot or screen recording to demo-video/public/clips/
        and re-render.
      </div>
    </div>
  );
};

export type HighlightSpec = {
  readonly leftPct: number;
  readonly topPct: number;
  readonly widthPct: number;
  readonly heightPct: number;
  readonly color: string;
  readonly label?: string;
  readonly startFrame?: number;
  readonly endFrame?: number;
};

/**
 * Subtle outline locked to percentage coordinates inside a real screenshot.
 */
export const HighlightBox: React.FC<{
  readonly spec: HighlightSpec;
}> = ({ spec }) => {
  const frame = useCurrentFrame();
  const start = spec.startFrame ?? 12;
  const fadeIn = interpolate(frame, [start, start + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const fadeOut =
    spec.endFrame !== undefined
      ? interpolate(frame, [spec.endFrame - 10, spec.endFrame], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        position: "absolute",
        left: `${spec.leftPct}%`,
        top: `${spec.topPct}%`,
        width: `${spec.widthPct}%`,
        height: `${spec.heightPct}%`,
        border: `3px solid ${spec.color}`,
        borderRadius: 8,
        backgroundColor: `${spec.color}12`,
        boxSizing: "border-box",
        opacity,
        pointerEvents: "none",
      }}
    >
      {spec.label ? (
        <div
          style={{
            position: "absolute",
            top: -32,
            left: 0,
            backgroundColor: spec.color,
            color: spec.color === COLORS.amber ? COLORS.navy : COLORS.white,
            fontSize: 16,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 5,
            whiteSpace: "nowrap",
            fontFamily: INTER_FONT_FAMILY,
          }}
        >
          {spec.label}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Framed 16:10 container for real app screenshots with smooth zoom/pan and locked highlights.
 */
export const ScreenshotStage: React.FC<{
  readonly src: string | null;
  readonly fallbackLabel: string;
  readonly startScale?: number;
  readonly endScale?: number;
  readonly startX?: number;
  readonly endX?: number;
  readonly startY?: number;
  readonly endY?: number;
  readonly highlights?: readonly HighlightSpec[];
}> = ({
  src,
  fallbackLabel,
  startScale = 1,
  endScale = 1.04,
  startX = 0,
  endX = 0,
  startY = 0,
  endY = 0,
  highlights = [],
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  const currentScale = startScale + (endScale - startScale) * progress;
  const maxX = Math.max(0, ((currentScale - 1) / 2) * VIEWPORT_WIDTH);
  const maxY = Math.max(0, ((currentScale - 1) / 2) * VIEWPORT_HEIGHT);
  const rawX = startX + (endX - startX) * progress;
  const rawY = startY + (endY - startY) * progress;
  const currentX = Math.max(-maxX, Math.min(maxX, rawX));
  const currentY = Math.max(-maxY, Math.min(maxY, rawY));

  return (
    <div
      style={{
        position: "absolute",
        left: (1920 - VIEWPORT_WIDTH) / 2,
        top: 74,
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        border: `1px solid ${COLORS.navyBorder}`,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.42)",
      }}
    >
      {src ? (
        <div
          style={{
            position: "relative",
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            scale: String(currentScale),
            translate: `${currentX}px ${currentY}px`,
            transformOrigin: "50% 50%",
          }}
        >
          <Img
            src={src}
            style={{
              width: VIEWPORT_WIDTH,
              height: VIEWPORT_HEIGHT,
              display: "block",
              objectFit: "contain",
            }}
          />
          {highlights.map((spec, idx) => (
            <HighlightBox key={idx} spec={spec} />
          ))}
        </div>
      ) : (
        <PlaceholderCard whatToRecord={fallbackLabel} />
      )}
    </div>
  );
};

/**
 * Plays a real screen-recording clip inside the standard framed viewport.
 */
export const ClipViewport: React.FC<{
  readonly src: string;
}> = ({ src }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: (1920 - VIEWPORT_WIDTH) / 2,
        top: 74,
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#000000",
        border: `1px solid ${COLORS.navyBorder}`,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.42)",
      }}
    >
      <Video
        src={src}
        muted
        objectFit="contain"
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};
