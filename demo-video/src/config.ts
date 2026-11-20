export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;

/**
 * Single source of truth for scene durations (in seconds).
 * Total must equal 120 seconds (2:00).
 * Adjust values here to retime both standalone scene compositions and the main video.
 */
export const SCENE_DURATIONS_SEC = {
  scene1Problem: 12,  // 0:00 - 0:12
  scene2Solution: 10, // 0:12 - 0:22
  scene3Upload: 16,   // 0:22 - 0:38
  scene4Review: 27,   // 0:38 - 1:05
  scene5Citation: 13, // 1:05 - 1:18
  scene6Resolve: 15,  // 1:18 - 1:33
  scene7Export: 12,   // 1:33 - 1:45
  scene8Close: 15,    // 1:45 - 2:00
} as const;

export type SceneKey = keyof typeof SCENE_DURATIONS_SEC;

export const TOTAL_DURATION_SEC =
  SCENE_DURATIONS_SEC.scene1Problem +
  SCENE_DURATIONS_SEC.scene2Solution +
  SCENE_DURATIONS_SEC.scene3Upload +
  SCENE_DURATIONS_SEC.scene4Review +
  SCENE_DURATIONS_SEC.scene5Citation +
  SCENE_DURATIONS_SEC.scene6Resolve +
  SCENE_DURATIONS_SEC.scene7Export +
  SCENE_DURATIONS_SEC.scene8Close;

export const secToFrames = (seconds: number, fps: number = VIDEO_FPS): number =>
  Math.round(seconds * fps);

export const SCENE_STARTS_SEC = {
  scene1Problem: 0,
  scene2Solution: SCENE_DURATIONS_SEC.scene1Problem,
  scene3Upload:
    SCENE_DURATIONS_SEC.scene1Problem + SCENE_DURATIONS_SEC.scene2Solution,
  scene4Review:
    SCENE_DURATIONS_SEC.scene1Problem +
    SCENE_DURATIONS_SEC.scene2Solution +
    SCENE_DURATIONS_SEC.scene3Upload,
  scene5Citation:
    SCENE_DURATIONS_SEC.scene1Problem +
    SCENE_DURATIONS_SEC.scene2Solution +
    SCENE_DURATIONS_SEC.scene3Upload +
    SCENE_DURATIONS_SEC.scene4Review,
  scene6Resolve:
    SCENE_DURATIONS_SEC.scene1Problem +
    SCENE_DURATIONS_SEC.scene2Solution +
    SCENE_DURATIONS_SEC.scene3Upload +
    SCENE_DURATIONS_SEC.scene4Review +
    SCENE_DURATIONS_SEC.scene5Citation,
  scene7Export:
    SCENE_DURATIONS_SEC.scene1Problem +
    SCENE_DURATIONS_SEC.scene2Solution +
    SCENE_DURATIONS_SEC.scene3Upload +
    SCENE_DURATIONS_SEC.scene4Review +
    SCENE_DURATIONS_SEC.scene5Citation +
    SCENE_DURATIONS_SEC.scene6Resolve,
  scene8Close:
    SCENE_DURATIONS_SEC.scene1Problem +
    SCENE_DURATIONS_SEC.scene2Solution +
    SCENE_DURATIONS_SEC.scene3Upload +
    SCENE_DURATIONS_SEC.scene4Review +
    SCENE_DURATIONS_SEC.scene5Citation +
    SCENE_DURATIONS_SEC.scene6Resolve +
    SCENE_DURATIONS_SEC.scene7Export,
} as const;

export const COLORS = {
  navy: "#0B1B33",
  navySurface: "#122645",
  navyBorder: "rgba(255, 255, 255, 0.14)",
  blue: "#2457D6",
  red: "#C0261A",
  amber: "#F5B544",
  green: "#12805C",
  white: "#FFFFFF",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
} as const;

/**
 * Optional real screen recording clips in demo-video/public/clips/.
 * When present, a matching clip automatically replaces screenshots for that scene.
 */
export const CLIP_BASE_NAMES = {
  scene3Upload: "clips/scene3_upload",
  scene4Review: "clips/scene4_review",
  scene5Citation: "clips/scene5_citation",
  scene6Resolve: "clips/scene6_resolve",
  scene7Export: "clips/scene7_export",
} as const;

export const AUDIO_FILES = {
  voiceover: "voiceover.mp3",
  music: "music.mp3",
} as const;

export const AUDIO_SETTINGS = {
  voiceoverVolume: 1.0,
  musicVolume: 0.06, // subtle background bed
  musicFadeInSec: 1.5,
  musicFadeOutSec: 2.5,
} as const;
