import { api } from "../api/client";

type UserAvatarProps = {
  username: string;
  avatarPath?: string | null;
  size?: number;
};

export function UserAvatar({ username, avatarPath, size = 24 }: UserAvatarProps) {
  const src = avatarPath ? api.mediaUrl(avatarPath) : null;
  const initial = username.charAt(0).toUpperCase();

  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--surface-hover)",
        border: "1px solid var(--border)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        fontSize: Math.max(10, Math.round(size * 0.42)),
        fontWeight: 700,
        color: "var(--muted)",
      }}
      title={username}
      aria-hidden={!!src}
    >
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initial
      )}
    </span>
  );
}
