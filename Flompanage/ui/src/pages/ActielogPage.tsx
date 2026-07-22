import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { StaffActionLogEntry } from "../api/types";
import { useRegisterRefresh } from "../hooks/useRegisterRefresh";
import { UsernameLink } from "../components/UsernameLink";

const TARGET_FILTERS = [
  { value: "", label: "Alle doelen" },
  { value: "VIDEO", label: "Video's" },
  { value: "COMMENT", label: "Flompsels" },
  { value: "USER", label: "Gebruikers" },
  { value: "SITE", label: "Site" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  USER: "Gebruiker",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function targetTypeLabel(targetType: StaffActionLogEntry["targetType"]) {
  switch (targetType) {
    case "VIDEO":
      return "Video";
    case "COMMENT":
      return "Flompsel";
    case "USER":
      return "Gebruiker";
    case "SITE":
      return "Site";
    default:
      return targetType;
  }
}

const PREFERENCE_FIELD_LABELS: Record<string, string> = {
  showNsfw: "NSFW tonen",
  showInStats: "Zichtbaar in statistieken",
  emailOnVideoApproved: "Mail bij goedgekeurde video",
  emailOnVideoRejected: "Mail bij afgewezen video",
  emailOnVideoShared: "Mail bij gedeelde video",
  emailOnFlompselOnMyVideo: "Mail bij flompsel op eigen video",
  emailOnFlompselReply: "Mail bij reactie op flompsel",
};

function describeDetails(metadata: Record<string, unknown> | null): string[] {
  if (!metadata) return [];
  const lines: string[] = [];
  const previousEmail = typeof metadata.previousEmail === "string" ? metadata.previousEmail : null;
  const newEmail = typeof metadata.newEmail === "string" ? metadata.newEmail : null;
  const mode = typeof metadata.mode === "string" ? metadata.mode : null;
  const changedFields = metadata.changedFields;

  if (previousEmail && newEmail) lines.push(`${previousEmail} → ${newEmail}`);
  if (mode === "upload") lines.push("Nieuwe profielfoto geüpload");
  if (mode === "reset_default") lines.push("Standaard profielfoto hersteld");
  if (Array.isArray(changedFields) && changedFields.length > 0) {
    const labels = changedFields.map(
      (field) => PREFERENCE_FIELD_LABELS[String(field)] ?? String(field),
    );
    lines.push(`Gewijzigd: ${labels.join(", ")}`);
  }
  if (metadata.selfService === true) lines.push("Door gebruiker zelf");
  return lines;
}

export function ActielogPage() {
  const [entries, setEntries] = useState<StaffActionLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [targetType, setTargetType] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (offset = 0, append = false) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        const page = await api.getStaffActionLog({
          targetType: targetType
            ? (targetType as StaffActionLogEntry["targetType"])
            : undefined,
          offset,
          limit: 50,
        });
        setEntries((current) => (append ? [...current, ...page.entries] : page.entries));
        setTotal(page.total);
        setHasMore(page.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Laden mislukt");
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [targetType],
  );

  useRegisterRefresh(() => load(0, false));
  useEffect(() => {
    void load(0, false);
  }, [load]);

  const countLabel = useMemo(
    () => `${entries.length.toLocaleString("nl-NL")} van ${total.toLocaleString("nl-NL")} acties`,
    [entries.length, total],
  );

  if (loading && entries.length === 0) {
    return <p style={{ color: "var(--muted)" }}>Laden...</p>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Actielog</h1>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
        Moderator-, admin- en gebruikersacties: goedkeuringen, accountwijzigingen en instellingen.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span style={{ color: "var(--muted)" }}>Filter op type</span>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            style={{ minWidth: 180 }}
          >
            {TARGET_FILTERS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-secondary btn-sm" onClick={() => void load(0, false)}>
          Filter toepassen
        </button>
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: "auto" }}>{countLabel}</span>
      </div>

      {error && (
        <p style={{ color: "var(--danger)", marginBottom: 12 }}>
          {error}{" "}
          <button className="btn-ghost" onClick={() => void load(0, false)}>
            Opnieuw
          </button>
        </p>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {entries.length === 0 ? (
          <p style={{ padding: 20, color: "var(--muted)", margin: 0 }}>Nog geen acties geregistreerd.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.2)", color: "var(--muted)", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px" }}>Wanneer</th>
                  <th style={{ padding: "10px 12px" }}>Wie</th>
                  <th style={{ padding: "10px 12px" }}>Actie</th>
                  <th style={{ padding: "10px 12px" }}>Doel</th>
                  <th style={{ padding: "10px 12px" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const details = describeDetails(entry.metadata);
                  return (
                    <tr key={entry.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: "var(--muted)" }}>
                        {formatWhen(entry.createdAt)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <UsernameLink
                          userId={entry.actor.id}
                          username={entry.actor.username}
                          style={{ color: "var(--accent)", fontWeight: 600 }}
                        />
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          {ROLE_LABELS[entry.actor.role] || entry.actor.role}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{entry.actionLabel}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          {targetTypeLabel(entry.targetType)}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{entry.summary}</td>
                      <td style={{ padding: "10px 12px", color: "var(--muted)", maxWidth: 280 }}>
                        {entry.reason && <div>Reden: {entry.reason}</div>}
                        {details.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                        {!entry.reason && details.length === 0 && "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
          <button
            className="btn-secondary btn-sm"
            disabled={loadingMore}
            onClick={() => void load(entries.length, true)}
          >
            {loadingMore ? "Laden..." : "Meer laden"}
          </button>
        </div>
      )}
    </div>
  );
}
