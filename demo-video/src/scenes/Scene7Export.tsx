import React from "react";
import {
  Easing,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { findClipFile, findScreenshot } from "../assets";
import { CLIP_BASE_NAMES, COLORS } from "../config";
import { INTER_FONT_FAMILY } from "../fonts";
import {
  CaptionBar,
  ClipViewport,
  HighlightBox,
  PlaceholderCard,
  SceneFade,
  SceneHeader,
} from "../components/SceneChrome";

const PAGE_W = 556;
const PAGE_H = 786; // Matches 1241x1754 A4 portrait aspect ratio (0.707) with generous margin

export const Scene7Export: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const clipSrc = findClipFile(CLIP_BASE_NAMES.scene7Export);

  const page1Src = findScreenshot("11_report_p1.png");
  const page2Src = findScreenshot("12_report_p2.png");

  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  const stageScale = 1.0 + 0.04 * progress;
  const stageY = 0;

  return (
    <SceneFade fadeInFrames={10} fadeOutFrames={10}>
      <SceneHeader
        step="07"
        title="Export PDF readiness report"
        rightNote="TenderMate_Report_TND-92261513.pdf"
        accentColor={COLORS.blue}
      />

      {clipSrc ? (
        <ClipViewport src={clipSrc} />
      ) : (
        <div
          style={{
            position: "absolute",
            left: 96,
            right: 96,
            top: 78,
            height: 852,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 44,
              scale: String(stageScale),
              translate: `0px ${stageY}px`,
              transformOrigin: "50% 42%",
            }}
          >
            {/* Report Page 1 */}
            <div
              style={{
                position: "relative",
                width: PAGE_W,
                height: PAGE_H,
                backgroundColor: "#FFFFFF",
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "0 20px 44px rgba(0, 0, 0, 0.45)",
                border: `1px solid ${COLORS.navyBorder}`,
              }}
            >
              {page1Src ? (
                <>
                  <Img
                    src={page1Src}
                    style={{
                      width: PAGE_W,
                      height: PAGE_H,
                      display: "block",
                      objectFit: "contain",
                    }}
                  />
                  <HighlightBox
                    spec={{
                      leftPct: 9.0,
                      topPct: 8.6,
                      widthPct: 68.0,
                      heightPct: 2.6,
                      color: COLORS.amber,
                      startFrame: 18,
                    }}
                  />
                  <HighlightBox
                    spec={{
                      leftPct: 8.8,
                      topPct: 94.7,
                      widthPct: 50.0,
                      heightPct: 2.4,
                      color: COLORS.amber,
                      startFrame: 26,
                    }}
                  />
                </>
              ) : (
                <PlaceholderCard whatToRecord="11_report_p1.png — Exported PDF report page 1" />
              )}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 14,
                  backgroundColor: "rgba(11, 27, 51, 0.85)",
                  color: COLORS.white,
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 5,
                  fontFamily: INTER_FONT_FAMILY,
                }}
              >
                Page 1
              </div>
            </div>

            {/* Report Page 2 */}
            <div
              style={{
                position: "relative",
                width: PAGE_W,
                height: PAGE_H,
                backgroundColor: "#FFFFFF",
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "0 20px 44px rgba(0, 0, 0, 0.45)",
                border: `1px solid ${COLORS.navyBorder}`,
              }}
            >
              {page2Src ? (
                <>
                  <Img
                    src={page2Src}
                    style={{
                      width: PAGE_W,
                      height: PAGE_H,
                      display: "block",
                      objectFit: "contain",
                    }}
                  />
                  <HighlightBox
                    spec={{
                      leftPct: 8.8,
                      topPct: 45.0,
                      widthPct: 82.5,
                      heightPct: 33.2,
                      color: COLORS.green,
                      startFrame: 42,
                    }}
                  />
                  <HighlightBox
                    spec={{
                      leftPct: 8.8,
                      topPct: 94.7,
                      widthPct: 50.0,
                      heightPct: 2.4,
                      color: COLORS.amber,
                      startFrame: 26,
                    }}
                  />
                </>
              ) : (
                <PlaceholderCard whatToRecord="12_report_p2.png — Exported PDF report page 2" />
              )}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 14,
                  backgroundColor: "rgba(11, 27, 51, 0.85)",
                  color: COLORS.white,
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 5,
                  fontFamily: INTER_FONT_FAMILY,
                }}
              >
                Page 2
              </div>
            </div>
          </div>
        </div>
      )}

      <CaptionBar
        text="Export a PDF readiness report with full inventory and disclaimer line."
        accentColor={COLORS.amber}
      />
    </SceneFade>
  );
};
