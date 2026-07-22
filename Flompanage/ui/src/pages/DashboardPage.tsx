import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import type { SiteStats, AdminVideo, AdminComment } from "../api/types";
import { useRegisterRefresh } from "../hooks/useRegisterRefresh";
import { CommentModerationList } from "../components/CommentModerationList";
import { VideoModerationCard } from "../components/VideoModerationCard";
import { BulkApproveButton } from "../components/BulkApproveButton";

const DASHBOARD_DECLINED_LIMIT = 10;

export function DashboardPage() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [pending, setPending] = useState<AdminVideo[]>([]);
  const [activeComments, setActiveComments] = useState<AdminComment[]>([]);
  const [pendingFlompselTotal, setPendingFlompselTotal] = useState(0);
  const [declinedComments, setDeclinedComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, p, ac, dc] = await Promise.all([
        api.getStats(),
        api.getVideos("PENDING"),
        api.getComments("ACTIVE"),
        api.getComments("DECLINED", undefined, DASHBOARD_DECLINED_LIMIT),
      ]);
      setStats(s);
      setPending(p);
      setPendingFlompselTotal(ac.length);
      setActiveComments(ac.slice(0, 20));
      setDeclinedComments(dc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden mislukt");
    }
    setLoading(false);
  }, []);

  useRegisterRefresh(load);
  useEffect(() => {
    load();
  }, [load]);

  if (loading && !pending.length && !activeComments.length) {
    return <p style={{ color: "var(--muted)" }}>Laden...</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
        <button className="btn-ghost" onClick={load}>
          &#x21bb; Vernieuwen
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "var(--danger-bg)",
            color: "var(--danger)",
            padding: "8px 12px",
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
        <SC label="Video's" v={stats?.totalVideos ?? 0} />
        <SC label="Views" v={stats?.totalViews ?? 0} />
        <SC label="Gebruikers" v={stats?.totalUsers ?? 0} />
        <SC label="Wachtend" v={stats?.pendingCount ?? 0} hl />
      </div>

      <Section
        title={`Wachtende video's (${pending.length})`}
        action={
          <BulkApproveButton
            label="Alles goedkeuren"
            count={pending.length}
            confirmMessage={`Alle ${pending.length} wachtende video's in één keer goedkeuren?`}
            onApprove={() => api.approveAllVideos()}
            onDone={load}
          />
        }
      >
        {pending.length === 0 && <Muted>Geen wachtende video&apos;s.</Muted>}
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          Tags van de uploader staan in het gele vak. Verwijder of pas ze aan vóór goedkeuring. Meer opties staan onder Video&apos;s.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {pending.map((video) => (
            <VideoModerationCard key={video.id} video={video} onChanged={load} />
          ))}
        </div>
      </Section>

      <Section
        title={`Flompsels (${pendingFlompselTotal})`}
        action={
          <BulkApproveButton
            label="Alles goedkeuren"
            count={pendingFlompselTotal}
            confirmMessage={`Alle ${pendingFlompselTotal} nieuwe flompsels in één keer goedkeuren?`}
            onApprove={() => api.approveAllComments()}
            onDone={load}
          />
        }
      >
        <CommentModerationList
          comments={activeComments}
          showVideo
          pendingOnly
          onChanged={load}
          emptyMessage="Geen flompsels om te beoordelen."
        />
      </Section>

      {declinedComments.length > 0 && (
        <Section title={`Weggeflompt (laatste ${DASHBOARD_DECLINED_LIMIT})`}>
          <CommentModerationList
            comments={declinedComments}
            showVideo
            onChanged={load}
            emptyMessage="Geen weggeflompte flompsels."
          />
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "var(--muted)", fontSize: 13 }}>{children}</p>;
}

function SC({ label, v, hl }: { label: string; v: number; hl?: boolean }) {
  return (
    <div
      className="card"
      style={{
        borderColor: hl ? "rgba(245,158,11,.3)" : undefined,
        background: hl ? "var(--warning-bg)" : undefined,
        padding: 16,
      }}
    >
      <p style={{ fontSize: 28, fontWeight: 800, color: hl ? "var(--warning)" : "var(--text)" }}>
        {v.toLocaleString("nl-NL")}
      </p>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{label}</p>
    </div>
  );
}
