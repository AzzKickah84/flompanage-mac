import type { CommentModerationInfo } from "../api/types";
import { UsernameLink } from "./UsernameLink";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "super admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
};

function formatRelativeDate(date: string) {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "zojuist";
  if (diffMin < 60) return `${diffMin} min geleden`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} uur geleden`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} dag${diffDays === 1 ? "" : "en"} geleden`;
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CommentModerationNote({ info }: { info?: CommentModerationInfo | null }) {
  if (!info) return null;

  const verb = info.action === "COMMENT_APPROVE" ? "Goedgekeurd" : "Weggeflompt";

  return (
    <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
      {verb} door{" "}
      <UsernameLink userId={info.actor.id} username={info.actor.username} />
      <span style={{ opacity: 0.8 }}> ({roleLabels[info.actor.role] || info.actor.role})</span>
      {" · "}
      <span title={new Date(info.createdAt).toLocaleString("nl-NL")}>
        {formatRelativeDate(info.createdAt)}
      </span>
      {info.reason && (
        <span style={{ display: "block", opacity: 0.8, marginTop: 2 }}>Reden: {info.reason}</span>
      )}
    </p>
  );
}
