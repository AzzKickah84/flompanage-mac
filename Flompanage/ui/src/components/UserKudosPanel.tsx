import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { UserKudoAdminInfo } from "../api/types";

type UserKudosPanelProps = {
  userId: string;
  username: string;
  onClose?: () => void;
  embedded?: boolean;
};

export function UserKudosPanel({ userId, username, onClose, embedded = false }: UserKudosPanelProps) {
  const [info, setInfo] = useState<UserKudoAdminInfo | null>(null);
  const [customScore, setCustomScore] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getUserKudos(userId);
      setInfo(data);
      setCustomScore(String(data.kudoScore));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden mislukt");
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [userId]);

  const apply = async (action: () => Promise<UserKudoAdminInfo>) => {
    setSaving(true);
    setError("");
    try {
      const data = await action();
      setInfo(data);
      setCustomScore(String(data.kudoScore));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    }
    setSaving(false);
  };

  return (
    <div style={embedded ? undefined : { marginTop: 12, padding: 12, background: "var(--surface-hover)", borderRadius: 8 }}>
      {!embedded && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            Kudo&apos;s voor <strong>{username}</strong>
          </p>
          {onClose && (
            <button type="button" className="btn-ghost btn-sm" onClick={onClose}>
              Sluiten
            </button>
          )}
        </div>
      )}

      {loading && <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Laden...</p>}
      {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 8px" }}>{error}</p>}

      {info && !loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: "var(--muted)" }}>Berekend</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{info.computedScore}</div>
            </div>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: "var(--muted)" }}>Aanpassing</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: info.adjustment === 0 ? "var(--muted)" : "var(--warning)" }}>
                {info.adjustment > 0 ? `+${info.adjustment}` : info.adjustment}
              </div>
            </div>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: "var(--muted)" }}>Totaal</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "var(--accent)" }}>{info.kudoScore}</div>
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 10px" }}>
            {info.plusFlompsOnComments} plus · {info.minFlompsOnComments} min op flompsels
          </p>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="number"
              min={0}
              step={1}
              value={customScore}
              onChange={(e) => setCustomScore(e.target.value)}
              placeholder="Aangepast aantal"
              style={{ width: 120, fontSize: 13 }}
            />
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={saving}
              onClick={() => {
                const value = Number(customScore);
                if (!Number.isInteger(value) || value < 0) {
                  setError("Voer een geheel getal van 0 of hoger in");
                  return;
                }
                void apply(() => api.setUserKudoScore(userId, value));
              }}
            >
              Instellen
            </button>
            <button
              type="button"
              className="btn-warning btn-sm"
              disabled={saving}
              onClick={() => {
                if (!confirm(`Kudo's van ${username} op 0 zetten?`)) return;
                void apply(() => api.resetUserKudosToZero(userId));
              }}
            >
              Reset naar 0
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={saving || info.adjustment === 0}
              onClick={() => {
                if (!confirm(`Berekende kudo-score herstellen voor ${username}?`)) return;
                void apply(() => api.restoreUserKudos(userId));
              }}
            >
              Herstel berekend
            </button>
          </div>
        </>
      )}
    </div>
  );
}
