import { getStaticFiles } from "remotion";

const normalizePath = (p: string): string =>
  p.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();

/**
 * Finds an asset in demo-video/public/ without failing when missing.
 * Returns the Remotion-ready src URL or null if the file is not present.
 */
export const findPublicFile = (relativePath: string): string | null => {
  const target = normalizePath(relativePath);
  const files = getStaticFiles();
  const match = files.find((file) => normalizePath(file.name) === target);
  return match ? match.src : null;
};

/**
 * Checks whether a real screen-recording clip exists in demo-video/public/clips/.
 * Supports .mp4, .mov, or .webm using the scene base name (e.g. clips/scene3_upload).
 */
export const findClipFile = (clipBaseName: string): string | null => {
  const extensions = [".mp4", ".mov", ".webm"];
  for (const ext of extensions) {
    const found = findPublicFile(`${clipBaseName}${ext}`);
    if (found) {
      return found;
    }
  }
  return null;
};

/**
 * Resolves a screenshot copied into demo-video/public/screenshots/.
 */
export const findScreenshot = (filename: string): string | null =>
  findPublicFile(`screenshots/${filename}`);
