import { useState } from "react";
import { api } from "../api/client";
import type { AdminComment } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { BanDurationFields } from "./BanDurationFields";
import { parseBanDurationDays } from "../lib/ban-duration";
import { MIN_MODERATION_REASON_LENGTH } from "../lib/moderation-reason";
import { ModerationHistory } from "./ModerationHistory";
import { CommentModerationNote } from "./CommentModerationNote";
import { UserAvatar } from "./UserAvatar";
import { UsernameLink } from "./UsernameLink";

function kudos(c: AdminComment) {
  const plus = c.votes.filter((v) => v.value > 0).length;
  const min = c.votes.filter((v) => v.value < 0).length;
  return { plus, min };
}

function fd(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(s: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: "var(--warning-bg)", color: "var(--warning)", label: "Nieuw" },
    APPROVED: { bg: "var(--accent-bg)", color: "var(--accent)", label: "Goedgekeurd" },
    DECLINED: { bg: "var(--danger-bg)", color: "var(--danger)", label: "Weggeflompt" },
  };
  const st = map[s] || map.ACTIVE;
  return (
    <span className="badge" style={{ background: st.bg, color: st.color, fontSize: 11 }}>
      {st.label}
    </span>
  );
}

function CommentRow({
  comment,
  showVideo,
  onChanged,
  canBanUser,
}: {
  comment: AdminComment;
  showVideo: boolean;
  onChanged: () => void;
  canBanUser: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showBanForm, setShowBanForm] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [banDaysSelect, setBanDaysSelect] = useState("7");
  const [banCustomDays, setBanCustomDays] = useState("");

  const submitDecline = async () => {
    if (declineReason.trim().length < 3) {
      alert("Reden is verplicht (minimaal 3 tekens).");
      return;
    }
    await api.declineComment(comment.id, declineReason.trim());
    setShowDeclineForm(false);
    setDeclineReason("");
    onChanged();
  };
  const approve = async (id: string) => {
    await api.approveComment(id);
    onChanged();
  };
  const banAndDecline = async () => {
    const days = parseBanDurationDays(banDaysSelect, banCustomDays);
    if (banDaysSelect === "custom" && days === null) {
      alert("Voer een geldig aantal dagen in.");
      return;
    }
    if (banReason.trim().length < MIN_MODERATION_REASON_LENGTH) {
      alert(`Reden is verplicht (minimaal ${MIN_MODERATION_REASON_LENGTH} tekens).`);
      return;
    }
    if (!confirm(`${comment.user.username} bannen en flompsel wegflompen?`)) return;
    await api.banUserFromComment(comment.id, banReason, days);
    setShowBanForm(false);
    setBanReason("");
    setBanDaysSelect("7");
    setBanCustomDays("");
    onChanged();
  };
  const del = async (id: string) => {
    if (!confirm("Verwijderen?")) return;
    await api.deleteComment(id);
    onChanged();
  };
  const saveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    await api.editComment(id, editContent.trim());
    setEditingId(null);
    onChanged();
  };

  const isActive = comment.status === "ACTIVE";
  const isDeclined = comment.status === "DECLINED";
  const { plus, min } = kudos(comment);

  return (
    <div
      className="card"
      style={{
        padding: isActive ? 14 : "10px 14px",
        marginBottom: isActive ? 10 : 6,
        borderLeft: isActive ? "3px solid var(--warning)" : undefined,
        borderColor: isDeclined ? "rgba(239,68,68,.3)" : undefined,
        opacity: isActive ? 1 : 0.85,
      }}
    >
      <div style={{ display: "flex", gap: 6, fontSize: 12, marginBottom: isActive || isDeclined ? 6 : 0, flexWrap: "wrap", alignItems: "center" }}>
        <UserAvatar username={comment.user.username} avatarPath={comment.user.avatarPath} size={22} />
        <UsernameLink userId={comment.user.id} username={comment.user.username} style={{ fontWeight: 700 }} />
        {showVideo && (
          <>
            <span style={{ color: "var(--muted)" }}>op</span>
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>{comment.video.title}</span>
          </>
        )}
        {statusBadge(comment.status || "ACTIVE")}
        <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>+{plus}</span>
        <span style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600 }}>−{min}</span>
        <span style={{ color: "var(--muted)", marginLeft: "auto" }}>{fd(comment.createdAt)}</span>
      </div>

      {editingId === comment.id ? (
        <div>
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} style={{ width: "100%" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button className="btn-primary btn-sm" onClick={() => saveEdit(comment.id)}>
              Opslaan
            </button>
            <button
              className="btn-ghost btn-sm"
              onClick={() => {
                setEditingId(null);
                setEditContent("");
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <p
          style={{
            fontSize: 13,
            marginTop: isActive || isDeclined ? 0 : 2,
            color: isDeclined ? "rgba(239,68,68,.6)" : undefined,
            fontStyle: isDeclined ? "italic" : undefined,
            textDecoration: isDeclined ? "line-through" : undefined,
          }}
        >
          {comment.content}
        </p>
      )}

      {comment.originalContent && isDeclined && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Oorspronkelijk: {comment.originalContent}</p>
      )}

      {comment.declineReason && isDeclined && (
        <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 4, opacity: 0.85 }}>
          Reden: {comment.declineReason}
        </p>
      )}

      <CommentModerationNote info={comment.moderationInfo} />

      {showDeclineForm && (
        <div style={{ marginTop: 10, padding: 12, background: "var(--surface-hover)", borderRadius: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>Wegflompen</p>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reden (alleen zichtbaar voor staff)"
            rows={3}
            style={{ width: "100%" }}
          />
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
            De reden is alleen zichtbaar voor admins en moderators.
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button className="btn-danger btn-sm" onClick={() => void submitDecline()}>
              Wegflompen bevestigen
            </button>
            <button
              className="btn-ghost btn-sm"
              onClick={() => {
                setShowDeclineForm(false);
                setDeclineReason("");
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {showBanForm && (
        <div style={{ marginTop: 10, padding: 12, background: "var(--surface-hover)", borderRadius: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}>Ban + wegflompen</p>
          <BanDurationFields
            reason={banReason}
            daysSelect={banDaysSelect}
            customDays={banCustomDays}
            onReasonChange={setBanReason}
            onDaysSelectChange={setBanDaysSelect}
            onCustomDaysChange={setBanCustomDays}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              className="btn-danger btn-sm"
              disabled={banReason.trim().length < MIN_MODERATION_REASON_LENGTH}
              onClick={() => void banAndDecline()}
            >
              Ban bevestigen
            </button>
            <button className="btn-ghost btn-sm" onClick={() => setShowBanForm(false)}>
              Annuleren
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: isActive ? 10 : 8, flexWrap: "wrap" }}>
        {isActive && (
          <>
            <button className="btn-success btn-sm" onClick={() => approve(comment.id)}>
              ✓ Goedkeuren
            </button>
            <button className="btn-danger btn-sm" onClick={() => setShowDeclineForm(true)}>
              ✕ Wegflompen
            </button>
            {canBanUser && (
              <button className="btn-warning btn-sm" onClick={() => setShowBanForm(true)}>
                Ban + wegflompen
              </button>
            )}
          </>
        )}
        {isDeclined && (
          <button className="btn-success btn-sm" onClick={() => approve(comment.id)}>
            Herstellen
          </button>
        )}
        {!isActive && !isDeclined && canBanUser && (
          <button className="btn-warning btn-sm" onClick={() => setShowBanForm(true)}>
            Ban + wegflompen
          </button>
        )}
        {editingId !== comment.id && (
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              setEditingId(comment.id);
              setEditContent(comment.content);
            }}
          >
            Bewerken
          </button>
        )}
        <button className="btn-danger btn-sm" onClick={() => del(comment.id)} style={{ marginLeft: isActive ? "auto" : undefined }}>
          Verwijderen
        </button>
      </div>
      <ModerationHistory targetType="COMMENT" targetId={comment.id} />
    </div>
  );
}

export function CommentModerationList({
  comments,
  showVideo = true,
  pendingOnly = false,
  chronological = false,
  onChanged,
  emptyMessage = "Geen flompsels.",
}: {
  comments: AdminComment[];
  showVideo?: boolean;
  pendingOnly?: boolean;
  chronological?: boolean;
  onChanged: () => void;
  emptyMessage?: string;
}) {
  const { user: me } = useAuth();
  const canBanUser = !!me;

  if (comments.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>{emptyMessage}</p>;
  }

  if (pendingOnly || chronological) {
    return (
      <div>
        {comments.map((c) => (
          <CommentRow key={c.id} comment={c} showVideo={showVideo} onChanged={onChanged} canBanUser={canBanUser} />
        ))}
      </div>
    );
  }

  const active = comments.filter((c) => c.status === "ACTIVE");
  const approved = comments.filter((c) => c.status === "APPROVED");
  const declined = comments.filter((c) => c.status === "DECLINED");

  return (
    <div>
      {active.map((c) => (
        <CommentRow key={c.id} comment={c} showVideo={showVideo} onChanged={onChanged} canBanUser={canBanUser} />
      ))}

      {approved.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: active.length ? 16 : 0, marginBottom: 8, color: "var(--accent)" }}>
            Goedgekeurd ({approved.length})
          </h3>
          {approved.map((c) => (
            <CommentRow key={c.id} comment={c} showVideo={showVideo} onChanged={onChanged} canBanUser={canBanUser} />
          ))}
        </>
      )}

      {declined.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--danger)" }}>
            Weggeflompt ({declined.length})
          </h3>
          {declined.map((c) => (
            <CommentRow key={c.id} comment={c} showVideo={showVideo} onChanged={onChanged} canBanUser={canBanUser} />
          ))}
        </>
      )}
    </div>
  );
}
