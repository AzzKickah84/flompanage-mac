import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api/client";
import type { AdminVideo } from "../api/types";
import { useRegisterRefresh } from "../hooks/useRegisterRefresh";
import { VideoModerationCard } from "../components/VideoModerationCard";
import { BulkApproveButton } from "../components/BulkApproveButton";

type VideoTab = "queue" | "PROCESSING" | "APPROVED" | "REJECTED" | "all";

const tabs: { id: VideoTab; label: string; hint: string }[] = [
  { id: "queue", label: "Wachtend", hint: "Nog goed te keuren uploads — voeg tags toe vóór goedkeuring" },
  { id: "PROCESSING", label: "Verwerken", hint: "Uploads die nog worden verwerkt door de server" },
  { id: "APPROVED", label: "Goedgekeurd", hint: "Live video's — tags beheren" },
  { id: "REJECTED", label: "Afgewezen", hint: "Afgewezen uploads" },
  { id: "all", label: "Alles", hint: "Volledige videolijst" },
];

export function VideosPage() {
  const [tab, setTab] = useState<VideoTab>("queue");
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setError("");
      try {
        const status = tab === "queue" ? "PENDING" : tab;
        setVideos(await api.getVideos(status));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Laden mislukt");
      }
      if (showLoading) setLoading(false);
    },
    [tab],
  );

  useRegisterRefresh(load);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((video) => {
      const haystack = [
        video.title,
        video.description,
        video.user.username,
        ...(video.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [videos, search]);

  const activeTab = tabs.find((t) => t.id === tab)!;

  if (loading) return <p style={{ color: "var(--muted)" }}>Laden...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Video&apos;s</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{activeTab.hint}</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          {tab === "queue" && (
            <BulkApproveButton
              label="Alles goedkeuren"
              count={videos.length}
              confirmMessage={`Alle ${videos.length} wachtende video's in één keer goedkeuren?`}
              onApprove={() => api.approveAllVideos()}
              onDone={() => void load()}
            />
          )}
          <button className="btn-ghost" onClick={() => load()}>
            &#x21bb;
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={tab === item.id ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op titel, beschrijving, uploader of tag..."
          style={{ width: "100%", maxWidth: 420 }}
        />
      </div>

      {error && (
        <p style={{ color: "var(--danger)" }}>
          {error}{" "}
          <button className="btn-ghost" onClick={() => load()}>
            Opnieuw
          </button>
        </p>
      )}

      {!error && filtered.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          {search.trim()
            ? "Geen video's gevonden voor deze zoekopdracht."
            : tab === "queue"
              ? "Geen video's die wachten op goedkeuring."
              : "Geen video's in deze categorie."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((video) => (
          <VideoModerationCard key={video.id} video={video} onChanged={load} />
        ))}
      </div>
    </div>
  );
}
