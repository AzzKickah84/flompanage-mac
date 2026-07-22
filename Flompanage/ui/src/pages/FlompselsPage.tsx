import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api/client";
import type { AdminComment } from "../api/types";
import { useRegisterRefresh } from "../hooks/useRegisterRefresh";
import { CommentModerationList } from "../components/CommentModerationList";
import { BulkApproveButton } from "../components/BulkApproveButton";

type ViewMode = "pending" | "recent" | "approved" | "declined";

const RECENT_FLOMPSEL_LIMIT = 25;
const HISTORY_STATUS_LIMIT = 50;

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: "pending", label: "Wachtrij" },
  { id: "recent", label: `Laatste ${RECENT_FLOMPSEL_LIMIT}` },
  { id: "approved", label: "Goedgekeurd" },
  { id: "declined", label: "Weggeflompt" },
];

const VIEW_HINTS: Record<ViewMode, string> = {
  pending:
    "Alleen flompsels van gebruikers die op goedkeuring wachten. Flompsels van moderators en admins zijn automatisch goedgekeurd en staan niet in deze wachtrij.",
  recent: `De ${RECENT_FLOMPSEL_LIMIT} meest recent geplaatste flompsels, ongeacht status.`,
  approved: `De ${HISTORY_STATUS_LIMIT} meest recent goedgekeurde flompsels, inclusief direct goedgekeurde flompsels van teamleden.`,
  declined: `De ${HISTORY_STATUS_LIMIT} meest recent weggeflompte flompsels.`,
};

export function FlompselsPage() {
  const [mode, setMode] = useState<ViewMode>("pending");
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let data: AdminComment[];
      switch (mode) {
        case "pending":
          data = await api.getComments("ACTIVE");
          break;
        case "recent":
          data = await api.getRecentComments(RECENT_FLOMPSEL_LIMIT);
          break;
        case "approved":
          data = (await api.getComments("APPROVED")).slice(0, HISTORY_STATUS_LIMIT);
          break;
        case "declined":
          data = (await api.getComments("DECLINED")).slice(0, HISTORY_STATUS_LIMIT);
          break;
      }
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden mislukt");
    }
    setLoading(false);
  }, [mode]);

  useRegisterRefresh(load);
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearch("");
  }, [mode]);

  const filteredComments = useMemo(() => {
    if (mode !== "approved") return comments;
    const q = search.trim().toLowerCase();
    if (!q) return comments;
    return comments.filter((c) => c.user.username.toLowerCase().includes(q));
  }, [comments, search, mode]);

  const approvedCountLabel =
    mode === "approved" && search.trim() && filteredComments.length !== comments.length
      ? `${filteredComments.length} van ${comments.length}`
      : String(comments.length);

  const titleByMode: Record<ViewMode, string> = {
    pending: `Flompsels — wachtrij (${comments.length})`,
    recent: `Flompsels — laatste ${RECENT_FLOMPSEL_LIMIT}`,
    approved: `Flompsels — goedgekeurd (${approvedCountLabel})`,
    declined: `Flompsels — weggeflompt (${comments.length})`,
  };

  const emptyByMode: Record<ViewMode, string> = {
    pending: "Geen flompsels in de wachtrij.",
    recent: "Nog geen flompsels geplaatst.",
    approved: "Nog geen goedgekeurde flompsels.",
    declined: "Nog geen weggeflompte flompsels.",
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{titleByMode[mode]}</h1>

          <div className="view-tabs" role="tablist" aria-label="Flompsel-weergaven">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                className={`view-tab ${mode === tab.id ? "view-tab-active" : ""}`}
                onClick={() => setMode(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          {mode === "pending" && (
            <BulkApproveButton
              label="Alles goedkeuren"
              count={comments.length}
              confirmMessage={`Alle ${comments.length} flompsels in de wachtrij in één keer goedkeuren?`}
              onApprove={() => api.approveAllComments()}
              onDone={() => void load()}
            />
          )}
          <button className="btn-ghost" onClick={() => void load()} disabled={loading} aria-label="Vernieuwen">
            &#x21bb;
          </button>
        </div>
      </div>

      {mode === "approved" && (
        <input
          type="search"
          placeholder="Zoek op gebruikersnaam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 360, fontSize: 13, padding: "8px 12px", marginBottom: 16, display: "block" }}
        />
      )}

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
        {VIEW_HINTS[mode]}
      </p>

      {loading ? (
        <p style={{ color: "var(--muted)" }}>Laden...</p>
      ) : error ? (
        <p style={{ color: "var(--danger)" }}>
          {error}{" "}
          <button className="btn-ghost" onClick={() => void load()}>
            Opnieuw
          </button>
        </p>
      ) : (
        <CommentModerationList
          comments={mode === "approved" ? filteredComments : comments}
          showVideo
          pendingOnly={mode === "pending"}
          chronological={mode !== "pending"}
          onChanged={load}
          emptyMessage={
            mode === "approved" && search.trim()
              ? `Geen goedgekeurde flompsels van gebruiker "${search.trim()}".`
              : emptyByMode[mode]
          }
        />
      )}
    </div>
  );
}
