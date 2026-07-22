import { useMemo } from "react";
import type { FlompanageAboutInfo } from "../lib/flompanage-about";
import { BUILD_VERSION } from "../lib/update-config";
import { useAppUpdate } from "../context/UpdateContext";

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "132px 1fr", gap: 10, fontSize: 12, lineHeight: 1.45 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ color: "var(--text)", wordBreak: "break-all", fontFamily: "Consolas, monospace", fontSize: 11 }}>
        {value}
      </span>
    </div>
  );
}

function formatBuiltAt(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("nl-NL");
}

function buildCopyText(about: FlompanageAboutInfo, uiBundleVersion: string) {
  const lines = [
    `Flompanage ${about.version}`,
    `UI-bundle: v${uiBundleVersion}`,
    about.fileVersion ? `Bestandsversie: ${about.fileVersion}` : null,
    about.uiBuiltAt ? `UI gebouwd: ${about.uiBuiltAt}` : null,
    about.uiAsset ? `UI asset: ${about.uiAsset}` : null,
    `Server: ${about.targetServerUrl}`,
    `Lokale server: ${about.localServerUrl}`,
    about.webView2Version ? `WebView2: ${about.webView2Version}` : null,
    `.NET: ${about.dotnetVersion}`,
    `OS: ${about.osVersion}`,
    `Installatie: ${about.installPath}`,
    about.executablePath ? `Executable: ${about.executablePath}` : null,
    `Config: ${about.configPath}`,
    `WebView-data: ${about.webViewDataPath}`,
    about.updateGithubRepo ? `Updates: GitHub ${about.updateGithubRepo}` : null,
    `Proces: ${about.processId}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function AboutModal({
  about,
  loading,
  onClose,
  onRefresh,
}: {
  about: FlompanageAboutInfo | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const { checkForUpdate, updateAvailable, updatesEnabled } = useAppUpdate();
  const uiBundleVersion = BUILD_VERSION;

  const versionMismatch = useMemo(() => {
    if (!about?.version) return false;
    return about.version !== uiBundleVersion;
  }, [about?.version, uiBundleVersion]);

  const rows = about
    ? [
        { label: "Geïnstalleerde versie", value: `v${about.version}` },
        { label: "UI-bundle", value: `v${uiBundleVersion}${versionMismatch ? " (verouderd)" : ""}` },
        ...(about.fileVersion ? [{ label: "Bestandsversie", value: about.fileVersion }] : []),
        ...(about.uiBuiltAt ? [{ label: "UI gebouwd", value: formatBuiltAt(about.uiBuiltAt) }] : []),
        ...(about.uiAsset ? [{ label: "UI asset", value: about.uiAsset }] : []),
        { label: "Flompert-server", value: about.targetServerUrl },
        { label: "Lokale server", value: about.localServerUrl },
        ...(about.webView2Version ? [{ label: "WebView2", value: about.webView2Version }] : []),
        { label: ".NET", value: about.dotnetVersion },
        { label: "Windows", value: about.osVersion },
        { label: "Installatiemap", value: about.installPath },
        ...(about.executablePath ? [{ label: "Executable", value: about.executablePath }] : []),
        { label: "Configuratie", value: about.configPath },
        { label: "Browser-cache", value: about.webViewDataPath },
        ...(about.updateGithubRepo ? [{ label: "Update-kanaal", value: `GitHub ${about.updateGithubRepo}` }] : []),
        { label: "Proces-ID", value: String(about.processId) },
      ]
    : [];

  const copyAll = async () => {
    if (!about) return;
    try {
      await navigator.clipboard.writeText(buildCopyText(about, uiBundleVersion));
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "min(82vh, 720px)",
          overflow: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 22,
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
          <img src="./logo.png" alt="" style={{ width: 44, height: 44, borderRadius: 8 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="about-title" style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
              Over Flompanage
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Beheer-app voor Flompert.TV — moderatie, uploads en site-instellingen.
            </p>
          </div>
        </div>

        {loading && !about ? (
          <p style={{ fontSize: 12, color: "var(--muted)" }}>Informatie laden...</p>
        ) : about ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {versionMismatch && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(250, 204, 21, 0.35)",
                  background: "rgba(250, 204, 21, 0.08)",
                  fontSize: 12,
                  color: "#facc15",
                  lineHeight: 1.45,
                }}
              >
                De geïnstalleerde app is <strong>v{about.version}</strong>, maar de geladen interface is nog{" "}
                <strong>v{uiBundleVersion}</strong>. Sluit Flompanage volledig af en start opnieuw. Blijft dit
                gebeuren? Installeer de nieuwste versie opnieuw.
              </div>
            )}
            {rows.map((row) => (
              <AboutRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            Kon app-informatie niet ophalen. Draait Flompanage in de desktop-app?
          </p>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          {updatesEnabled && (
            <button type="button" className="btn-primary btn-sm" onClick={() => void checkForUpdate()}>
              {updateAvailable ? `Update v${updateAvailable.version}` : "Controleer op updates"}
            </button>
          )}
          <button type="button" className="btn-secondary btn-sm" onClick={() => void onRefresh()}>
            Vernieuwen
          </button>
          {about && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => void copyAll()}>
              Kopieer info
            </button>
          )}
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
