import { GITHUB_REPO, MANIFEST_URL } from "./update-config";

export type AppUpdateInfo = {
  version: string;
  downloadUrl: string;
  releasePageUrl?: string;
  notes?: string;
};

type GitHubRelease = {
  tag_name?: string;
  html_url?: string;
  body?: string;
  assets?: Array<{ name?: string; browser_download_url?: string }>;
};

type Manifest = {
  version?: string;
  downloadUrl?: string;
  releasePageUrl?: string;
  notes?: string;
};

function normalizeVersion(tag: string): string {
  return tag.trim().replace(/^v/i, "");
}

function pickInstallerAsset(release: GitHubRelease): string | null {
  const assets = release.assets ?? [];
  const preferred = assets.find((a) =>
    /^Flompanage-Setup-[\d.]+\.exe$/i.test(a.name ?? ""),
  );
  if (preferred?.browser_download_url) return preferred.browser_download_url;

  const anyExe = assets.find((a) => /\.exe$/i.test(a.name ?? ""));
  return anyExe?.browser_download_url ?? null;
}

async function fetchFromManifest(url: string): Promise<AppUpdateInfo | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as Manifest;
  if (!data.version || !data.downloadUrl) return null;

  return {
    version: normalizeVersion(data.version),
    downloadUrl: data.downloadUrl,
    releasePageUrl: data.releasePageUrl,
    notes: data.notes,
  };
}

async function fetchFromGitHub(repo: string): Promise<AppUpdateInfo | null> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const release = (await res.json()) as GitHubRelease;
  const version = release.tag_name ? normalizeVersion(release.tag_name) : "";
  const downloadUrl = pickInstallerAsset(release);

  if (!version || !downloadUrl) return null;

  return {
    version,
    downloadUrl,
    releasePageUrl: release.html_url,
    notes: release.body?.trim() || undefined,
  };
}

async function fetchFromLocalProxy(): Promise<AppUpdateInfo | null> {
  const res = await fetch("/api/flompanage/update", { cache: "no-store" });
  if (res.status === 204) return null;
  if (!res.ok) return null;

  const data = (await res.json()) as AppUpdateInfo;
  if (!data.version || !data.downloadUrl) return null;

  return {
    version: normalizeVersion(data.version),
    downloadUrl: data.downloadUrl,
    releasePageUrl: data.releasePageUrl,
    notes: data.notes,
  };
}

export async function fetchLatestAppUpdate(): Promise<AppUpdateInfo | null> {
  try {
    const local = await fetchFromLocalProxy();
    if (local) return local;
  } catch {
    // Not running inside the Flompanage desktop shell (e.g. Vite dev in browser).
  }

  if (MANIFEST_URL) {
    return fetchFromManifest(MANIFEST_URL);
  }
  if (GITHUB_REPO) {
    return fetchFromGitHub(GITHUB_REPO);
  }
  return null;
}
