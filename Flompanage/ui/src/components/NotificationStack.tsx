import { useEffect, useState } from "react";
import type { Notification } from "../context/NotificationContext";

type Props = {
  notification: Notification;
  onDismiss: () => void;
};

export function NotificationToast({ notification, onDismiss }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleClick = () => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  const isVideo = notification.type === "video";
  const isUser = notification.type === "user";
  const icon = isVideo ? "\u25b6" : isUser ? "\u263a" : "\u270e";
  const bg = isVideo
    ? "rgba(59,130,246,0.15)"
    : isUser
      ? "rgba(255,92,0,0.15)"
      : "rgba(34,197,94,0.15)";
  const borderColor = isVideo
    ? "rgba(59,130,246,0.4)"
    : isUser
      ? "rgba(255,92,0,0.4)"
      : "rgba(34,197,94,0.4)";
  const iconBg = isVideo
    ? "rgba(59,130,246,0.25)"
    : isUser
      ? "rgba(255,92,0,0.25)"
      : "rgba(34,197,94,0.25)";
  const label = isVideo ? "Nieuwe video" : isUser ? "Nieuwe registratie" : "Nieuw flompsel";

  return (
    <div
      onClick={handleClick}
      style={{
        background: "var(--surface)",
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        cursor: "pointer",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        minWidth: 280,
        maxWidth: 360,
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateX(120%)" : "translateX(0)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text)",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {notification.message}
        </p>
        <p style={{ fontSize: 10, color: "var(--muted)", margin: "3px 0 0" }}>
          {label} &middot; Klik om te sluiten
        </p>
      </div>
    </div>
  );
}

export function NotificationStack({ notifications, onDismiss }: { notifications: Notification[]; onDismiss: (id: string) => void }) {
  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 10,
      }}
    >
      {notifications.map((n) => (
        <NotificationToast
          key={n.id}
          notification={n}
          onDismiss={() => onDismiss(n.id)}
        />
      ))}
    </div>
  );
}
