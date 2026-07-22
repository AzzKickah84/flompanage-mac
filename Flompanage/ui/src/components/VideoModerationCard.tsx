import { useRef, useState } from "react";
import { api, sitePageUrl } from "../api/client";
import type { AdminVideo } from "../api/types";
import { ModerationHistory } from "./ModerationHistory";
import { VideoFlompselsPanel } from "./VideoFlompselsPanel";
import { VideoTagsEditor, type VideoTagsEditorHandle } from "./VideoTagsEditor";
import { VideoTagChips } from "./VideoTagChips";
import { UsernameLink } from "./UsernameLink";

function dur(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function fd(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: "var(--warning-bg)", color: "var(--warning)", label: "WACHTEND" },
    PROCESSING: { bg: "var(--accent-bg)", color: "var(--accent)", label: "VERWERKEN" },
    APPROVED: { bg: "var(--accent-bg)", color: "var(--accent)", label: "LIVE" },
    REJECTED: { bg: "var(--danger-bg)", color: "var(--danger)", label: "AFGEWEZEN" },
  };
  const st = map[status] || map.PENDING;
  return (
    <span className="badge" style={{ background: st.bg, color: st.color }}>
      {st.label}
    </span>
  );
}

export function VideoModerationCard({
  video,
  onChanged,
  showModerationActions = true,
  compact = false,
}: {
  video: AdminVideo;
  onChanged: (soft?: boolean) => void;
  showModerationActions?: boolean;
  compact?: boolean;
}) {
  const tagsEditorRef = useRef<VideoTagsEditorHandle>(null);
  const [playing, setPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(video.title);
  const [editDescription, setEditDescription] = useState(video.description || "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [flompselsOpen, setFlompselsOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const isPending = video.status === "PENDING";
  const isProcessing = video.status === "PROCESSING";
  const tags = video.tags ?? [];
  const isImage = video.mediaType === "IMAGE";
  const isYoutube = video.mediaType === "YOUTUBE";
  const youtubeId = video.youtubeVideoId ?? null;
  const showTagsEditor = isPending || tagsOpen;

  const flompselsLabel = () => {
    const total = video.commentCount ?? 0;
    const pending = video.pendingCommentCount ?? 0;
    if (flompselsOpen) return "Flompsels verbergen";
    if (total === 0) return "Flompsels";
    if (pending > 0) return `Flompsels (${total}, ${pending} nieuw)`;
    return `Flompsels (${total})`;
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      setAutoplay(false);
    } else {
      setPlaying(true);
      setAutoplay(true);
      setFlompselsOpen(true);
    }
  };

  const startEdit = () => {
    setEditing(true);
    setEditTitle(video.title);
    setEditDescription(video.description || "");
  };

  const saveEdit = async () => {
    if (editTitle.trim().length < 3) return;
    setSavingEdit(true);
    try {
      await api.editVideo(video.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bewerken mislukt");
    }
    setSavingEdit(false);
  };

  const saveTagsBeforeAction = async () => {
    if (!tagsEditorRef.current) return true;
    return tagsEditorRef.current.saveIfDirty();
  };

  const handleApprove = async () => {
    setActing(true);
    try {
      if (!(await saveTagsBeforeAction())) return;
      await api.approveVideo(video.id);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Goedkeuren mislukt");
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      if (!(await saveTagsBeforeAction())) return;
      await api.rejectVideo(video.id, rejectReason || undefined);
      setRejecting(false);
      setRejectReason("");
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Afwijzen mislukt");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="card" style={{ padding: compact ? 14 : 16 }}>
      <div style={{ display: "flex", gap: compact ? 12 : 16, flexDirection: compact ? "column" : "row" }}>
        {!compact && (
          <div
            onClick={togglePlay}
            style={{
              width: 180,
              height: 101,
              borderRadius: 8,
              overflow: "hidden",
              background: "#1a1a1a",
              cursor: "pointer",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {video.thumbnailPath ? (
              <img
                src={api.mediaUrl(video.thumbnailPath)}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: video.isNsfw ? "blur(12px)" : undefined,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--muted)",
                  fontSize: 12,
                }}
              >
                Geen thumbnail
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: 6,
                right: 6,
                background: "rgba(0,0,0,.8)",
                color: "white",
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {dur(video.duration)}
            </div>
            {playing && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 36,
                }}
              >
                ▶
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
            {editing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ fontSize: 15, fontWeight: 700, flex: 1, minWidth: 200 }}
                placeholder="Titel"
                maxLength={120}
              />
            ) : (
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{video.title}</h3>
            )}
            {statusBadge(video.status)}
            {isImage && (
              <span className="badge" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                PICA
              </span>
            )}
            {isYoutube && (
              <span className="badge" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
                YOUTUBE
              </span>
            )}
            {video.isNsfw && (
              <span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                NSFW
              </span>
            )}
          </div>

          {editing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              style={{
                fontSize: 12,
                color: "var(--muted)",
                marginBottom: 4,
                width: "100%",
                resize: "vertical",
                minHeight: 60,
              }}
              placeholder="Beschrijving"
              maxLength={500}
            />
          ) : (
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
              {video.description || "Geen beschrijving"}
            </p>
          )}

          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
            door <UsernameLink userId={video.user.id} username={video.user.username} /> · {video.views.toLocaleString("nl-NL")} views · {fd(video.createdAt)}
          </p>

          {video.rejectReason && (
            <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 4 }}>
              Afwijzingsreden: {video.rejectReason}
            </p>
          )}

          {!showTagsEditor && <VideoTagChips tags={tags} />}

          {isPending && (
            <VideoTagsEditor
              ref={tagsEditorRef}
              videoId={video.id}
              initialTags={tags}
              onSaved={() => onChanged(false)}
              showSaveButton
              highlight
              hint="Tags door de uploader — verwijder ongepaste tags met × vóór goedkeuring. Worden automatisch opgeslagen bij Goedkeuren/Afwijzen."
            />
          )}

          {!isPending && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setTagsOpen((open) => !open)}
              >
                {tagsOpen ? "Tags verbergen" : tags.length > 0 ? `Tags beheren (${tags.length})` : "Tags toevoegen"}
              </button>
            </div>
          )}

          {!isPending && showTagsEditor && (
            <VideoTagsEditor
              ref={tagsEditorRef}
              videoId={video.id}
              initialTags={tags}
              onSaved={() => onChanged(false)}
            />
          )}

          <ModerationHistory targetType="VIDEO" targetId={video.id} />

          {showModerationActions && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {editing ? (
                <>
                  <button
                    className="btn-success btn-sm"
                    onClick={() => void saveEdit()}
                    disabled={savingEdit || editTitle.trim().length < 3}
                  >
                    {savingEdit ? "Opslaan..." : "Opslaan"}
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => setEditing(false)}>
                    Annuleren
                  </button>
                </>
              ) : (
                <>
                  {!compact && (
                    <button className="btn-secondary btn-sm" onClick={startEdit}>
                      Bewerken
                    </button>
                  )}
                  {!compact && (
                    <button
                      className={
                        flompselsOpen
                          ? "btn-primary btn-sm"
                          : (video.pendingCommentCount ?? 0) > 0
                            ? "btn-warning btn-sm"
                            : "btn-secondary btn-sm"
                      }
                      onClick={() => setFlompselsOpen((open) => !open)}
                    >
                      {flompselsLabel()}
                    </button>
                  )}
                  {isProcessing && (
                    <span style={{ fontSize: 12, color: "var(--accent)", alignSelf: "center" }}>
                      Video wordt nog verwerkt...
                    </span>
                  )}
                  {isPending && (
                    <>
                      <button
                        className="btn-success btn-sm"
                        onClick={() => void handleApprove()}
                        disabled={acting}
                      >
                        {acting ? "Bezig..." : "Goedkeuren"}
                      </button>
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => {
                          setRejecting(true);
                          setRejectReason("");
                        }}
                        disabled={acting}
                      >
                        Afwijzen
                      </button>
                    </>
                  )}
                  {video.status === "REJECTED" && (
                    <button
                      className="btn-success btn-sm"
                      onClick={() => void handleApprove()}
                      disabled={acting}
                    >
                      Herstellen
                    </button>
                  )}
                  {!compact && (
                    <>
                      <button
                        className="btn-warning btn-sm"
                        onClick={async () => {
                          await api.toggleNsfw(video.id);
                          onChanged();
                        }}
                      >
                        {video.isNsfw ? "NSFW uit" : "NSFW aan"}
                      </button>
                      <button
                        className="btn-danger btn-sm"
                        onClick={async () => {
                          if (!confirm("Definitief verwijderen?")) return;
                          await api.deleteVideo(video.id);
                          onChanged();
                        }}
                      >
                        Verwijderen
                      </button>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => window.open(sitePageUrl(`/video/${video.id}`), "_blank")}
                      >
                        Op site bekijken
                      </button>
                    </>
                  )}
                  {compact && (
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => window.open(sitePageUrl(`/video/${video.id}`), "_blank")}
                    >
                      Op site bekijken
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {rejecting && (
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <input
                placeholder="Reden (optioneel)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <button className="btn-danger btn-sm" onClick={() => void handleReject()} disabled={acting}>
                {acting ? "Bezig..." : "Bevestigen"}
              </button>
              <button className="btn-ghost btn-sm" onClick={() => setRejecting(false)} disabled={acting}>
                Annuleren
              </button>
            </div>
          )}

          {playing && isImage && (
            <div style={{ marginTop: 12, borderRadius: 8, overflow: "hidden", background: "#000", maxWidth: 640 }}>
              <img
                src={api.mediaUrl(video.thumbnailPath || video.videoPath)}
                alt={video.title}
                style={{ width: "100%", maxHeight: 480, display: "block", objectFit: "contain" }}
              />
            </div>
          )}

          {playing && isYoutube && youtubeId && (
            <div style={{ marginTop: 12, borderRadius: 8, overflow: "hidden", background: "#000", maxWidth: 640, aspectRatio: "16/9" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                style={{ width: "100%", height: "100%", border: 0, display: "block" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}

          {playing && !isImage && !isYoutube && (
            <div style={{ marginTop: 12, borderRadius: 8, overflow: "hidden", background: "#000", maxWidth: 640 }}>
              <video
                src={api.mediaUrl(video.videoPath)}
                controls
                autoPlay={autoplay}
                style={{ width: "100%", maxHeight: 360, display: "block" }}
              />
              <div style={{ padding: 8, display: "flex", gap: 8, background: "#111" }}>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => window.open(api.mediaUrl(video.videoPath), "_blank")}
                >
                  Openen in browser
                </button>
              </div>
            </div>
          )}

          {flompselsOpen && (
            <VideoFlompselsPanel videoId={video.id} onModerated={() => onChanged(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
