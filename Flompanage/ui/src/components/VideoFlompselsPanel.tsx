import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AdminComment } from "../api/types";
import { CommentModerationList } from "./CommentModerationList";

export function VideoFlompselsPanel({
  videoId,
  onCountChange,
  onModerated,
}: {
  videoId: string;
  onCountChange?: (count: number) => void;
  onModerated?: () => void;
}) {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getComments("ACTIVE", videoId);
      setComments(data);
      onCountChange?.(data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flompsels laden mislukt");
    }
    setLoading(false);
  }, [videoId, onCountChange]);

  const handleModerated = useCallback(async () => {
    await refresh();
    onModerated?.();
  }, [refresh, onModerated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>Flompsels laden...</p>;
  if (error) {
    return (
      <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>
        {error}{" "}
        <button className="btn-ghost btn-sm" onClick={refresh}>
          Opnieuw
        </button>
      </p>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "rgba(0,0,0,.15)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
          Te beoordelen ({comments.length})
        </h4>
        <button className="btn-ghost btn-sm" onClick={refresh}>
          Vernieuwen
        </button>
      </div>
      <CommentModerationList
        comments={comments}
        showVideo={false}
        pendingOnly
        onChanged={handleModerated}
        emptyMessage="Geen flompsels die wachten op goedkeuring."
      />
    </div>
  );
}
