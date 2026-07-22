import { version as pkgVersion } from "../../package.json";

/** Build-time fallback when the desktop shell API is unavailable. */
export const BUILD_VERSION =
  import.meta.env.VITE_FLOMPANAGE_VERSION || pkgVersion;

/** @deprecated Prefer useAppVersion() — reads the real installed version from the shell. */
export const CURRENT_VERSION = BUILD_VERSION;

/** Default update channel when build-time env vars are missing. */
export const DEFAULT_GITHUB_REPO = "AzzKickah84/flompanage";

/** GitHub repo as `owner/name` — set in Flompanage/update-channel.json at build time. */
export const GITHUB_REPO =
  import.meta.env.VITE_FLOMPANAGE_GITHUB_REPO?.trim() || DEFAULT_GITHUB_REPO;

/** Optional static JSON manifest URL (overrides GitHub API when set). */
export const MANIFEST_URL = import.meta.env.VITE_FLOMPANAGE_MANIFEST_URL?.trim() || "";

/** How often to check for updates (5 minutes). */
export const UPDATE_CHECK_MS = 5 * 60 * 1000;

export const DISMISSED_UPDATE_KEY = "flompanage-dismissed-update";

export function isUpdateCheckAvailable(): boolean {
  return Boolean(GITHUB_REPO || MANIFEST_URL);
}
