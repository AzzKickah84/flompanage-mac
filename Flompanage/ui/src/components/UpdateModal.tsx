import type { AppUpdateInfo } from "../lib/fetch-app-update";
import { useAppVersion } from "../context/AppVersionContext";
import { openExternalUrl } from "../lib/native-bridge";

export function UpdateModal({
  update,
  onDismiss,
}: {
  update: AppUpdateInfo;
  onDismiss: () => void;
}) {
  const currentVersion = useAppVersion();
  const notes = update.notes?.trim();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 24,
      }}
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-labelledby="update-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <h2 id="update-title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Update beschikbaar
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
          Er is een nieuwere versie van Flompanage beschikbaar. Je gebruikt nu{" "}
          <strong style={{ color: "var(--text)" }}>v{currentVersion}</strong>; de nieuwste versie is{" "}
          <strong style={{ color: "var(--accent)" }}>v{update.version}</strong>.
        </p>

        {notes && (
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              maxHeight: 140,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {notes}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => openExternalUrl(update.downloadUrl)}
          >
            Download installer
          </button>
          {update.releasePageUrl && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => openExternalUrl(update.releasePageUrl!)}
            >
              Release-pagina
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onDismiss}>
            Later
          </button>
        </div>

        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 14, lineHeight: 1.45 }}>
          Sluit Flompanage af en voer de nieuwe installer uit om bij te werken.
        </p>
      </div>
    </div>
  );
}
