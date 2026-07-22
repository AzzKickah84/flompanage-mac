import { useState } from "react";
import { api } from "../api/client";
import type { ModerationLogEntry } from "../api/types";
import { UsernameLink } from "./UsernameLink";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ModerationHistory({
  targetType,
  targetId,
}: {
  targetType: "VIDEO" | "COMMENT";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ModerationLogEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!entries) {
      setLoading(true);
      try {
        const data = await api.getModerationLog(targetType, targetId);
        setEntries(data);
      } catch {
        setEntries([]);
      }
      setLoading(false);
    }
    setOpen(true);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        className="btn-ghost"
        style={{ fontSize: 11, padding: "2px 0" }}
        onClick={toggle}
        disabled={loading}
      >
        {loading ? "Geschiedenis laden..." : open ? "Geschiedenis verbergen" : "Geschiedenis"}
      </button>
      {open && entries && (
        <ul style={{ margin: "6px 0 0", paddingLeft: 14, fontSize: 11, color: "var(--muted)" }}>
          {entries.length === 0 ? (
            <li>Nog geen moderatie-acties geregistreerd.</li>
          ) : (
            entries.map((entry) => (
              <li key={entry.id} style={{ marginBottom: 4 }}>
                <span style={{ color: "var(--text)" }}>{entry.actionLabel}</span>
                {" door "}
                <UsernameLink userId={entry.actor.id} username={entry.actor.username} />
                {" · "}
                {formatWhen(entry.createdAt)}
                {entry.reason && (
                  <div style={{ marginTop: 2, opacity: 0.85 }}>Reden: {entry.reason}</div>
                )}
                {entry.metadata?.isNsfw !== undefined && (
                  <div style={{ marginTop: 2, opacity: 0.85 }}>
                    NSFW: {entry.metadata.isNsfw ? "aan" : "uit"}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
