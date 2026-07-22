import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  createContext,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { NotificationPollSnapshot } from "../api/types";
import { useAuth } from "./AuthContext";
import { showDesktopNotification } from "../lib/native-bridge";
import { playNotificationSound } from "../lib/notification-sound";

export type Notification = {
  id: string;
  type: "video" | "flompsel" | "user";
  message: string;
  timestamp: number;
};

type Ctx = {
  notifications: Notification[];
  dismissNotification: (id: string) => void;
  showTestNotification: () => void;
  pollStatus: "ok" | "error" | "idle";
  lastPollAt: number | null;
};

const NotificationContext = createContext<Ctx | null>(null);

let _nextId = 0;

type LastSeen = {
  videoId: string | null;
  flompselId: string | null;
  userId: string | null;
  videoAt: string | null;
  flompselAt: string | null;
  userAt: string | null;
  videoCount: number;
  flompselCount: number;
  userCount: number;
};

function notificationTitle(type: Notification["type"]): string {
  if (type === "video") return "Nieuwe video";
  if (type === "user") return "Nieuwe registratie";
  return "Nieuw flompsel";
}

function pushNotification(
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>,
  notification: Omit<Notification, "id"> & { idPrefix: string },
) {
  setNotifications((prev) => [
    {
      id: `${notification.idPrefix}-${++_nextId}`,
      type: notification.type,
      message: notification.message,
      timestamp: notification.timestamp,
    },
    ...prev.slice(0, 4),
  ]);
  playNotificationSound();
  showDesktopNotification(notificationTitle(notification.type), notification.message);
}

function hasNewTimestamp(next: string | null, prev: string | null): boolean {
  if (!next) return false;
  if (!prev) return true;
  return next > prev;
}

function hasNewId(next: string | null | undefined, prev: string | null): boolean {
  if (!next) return false;
  if (!prev) return false;
  return next !== prev;
}

function flompselNotificationMessage(diff: number): string {
  if (diff > 1) return `${diff} nieuwe flompsels wachten op moderatie!`;
  return "Nieuw flompsel wacht op moderatie!";
}

function applySnapshot(
  snapshot: NotificationPollSnapshot,
  initialized: boolean,
  lastSeen: LastSeen,
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>,
): { pollIntervalMs: number } {
  const { settings } = snapshot;
  const notificationsOn = settings.notificationsEnabled !== false;

  if (initialized && notificationsOn) {
    const videoById = hasNewId(snapshot.latestVideoId, lastSeen.videoId);
    const videoByTime =
      !videoById &&
      snapshot.latestVideoAt != null &&
      hasNewTimestamp(snapshot.latestVideoAt, lastSeen.videoAt);
    const videoByCount = snapshot.videoCount > lastSeen.videoCount;

    if (settings.notifyNewVideo !== false && (videoById || videoByTime || videoByCount)) {
      const diff = videoByCount ? Math.max(1, snapshot.videoCount - lastSeen.videoCount) : 1;
      pushNotification(setNotifications, {
        idPrefix: "video",
        type: "video",
        message:
          diff === 1
            ? settings.requireApproval !== false
              ? "Nieuwe video klaar voor goedkeuring!"
              : "Nieuwe video op de site!"
            : `${diff} nieuwe video's klaar voor goedkeuring!`,
        timestamp: Date.now(),
      });
    }

    const flompselById = hasNewId(snapshot.latestFlompselId, lastSeen.flompselId);
    const flompselByTime =
      !flompselById &&
      snapshot.latestFlompselAt != null &&
      hasNewTimestamp(snapshot.latestFlompselAt, lastSeen.flompselAt);
    const flompselByCount = snapshot.flompselCount > lastSeen.flompselCount;

    if (settings.notifyNewFlompsel !== false && (flompselById || flompselByTime || flompselByCount)) {
      const diff = flompselByCount ? Math.max(1, snapshot.flompselCount - lastSeen.flompselCount) : 1;
      pushNotification(setNotifications, {
        idPrefix: "flompsel",
        type: "flompsel",
        message: flompselNotificationMessage(diff),
        timestamp: Date.now(),
      });
    }

    const userById = hasNewId(snapshot.latestUserId, lastSeen.userId);
    const userByTime =
      !userById &&
      snapshot.latestUserAt != null &&
      hasNewTimestamp(snapshot.latestUserAt, lastSeen.userAt);
    const userByCount = snapshot.registeredUserCount > lastSeen.userCount;

    if (settings.notifyNewUser !== false && (userById || userByTime || userByCount)) {
      const diff = userByCount ? Math.max(1, snapshot.registeredUserCount - lastSeen.userCount) : 1;
      const username = snapshot.latestRegisteredUsername;
      pushNotification(setNotifications, {
        idPrefix: "user",
        type: "user",
        message:
          diff === 1 && username
            ? `Nieuw account geregistreerd: ${username}`
            : diff === 1
              ? "Nieuw account geregistreerd!"
              : `${diff} nieuwe accounts geregistreerd!`,
        timestamp: Date.now(),
      });
    }
  }

  lastSeen.videoId = snapshot.latestVideoId ?? null;
  lastSeen.flompselId = snapshot.latestFlompselId ?? null;
  lastSeen.userId = snapshot.latestUserId ?? null;
  lastSeen.videoAt = snapshot.latestVideoAt;
  lastSeen.flompselAt = snapshot.latestFlompselAt;
  lastSeen.userAt = snapshot.latestUserAt;
  lastSeen.videoCount = snapshot.videoCount;
  lastSeen.flompselCount = snapshot.flompselCount;
  lastSeen.userCount = snapshot.registeredUserCount;

  return {
    pollIntervalMs: Math.max(5, settings.notificationPollInterval || 15) * 1000,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pollStatus, setPollStatus] = useState<"ok" | "error" | "idle">("idle");
  const [lastPollAt, setLastPollAt] = useState<number | null>(null);
  const lastSeen = useRef<LastSeen>({
    videoId: null,
    flompselId: null,
    userId: null,
    videoAt: null,
    flompselAt: null,
    userAt: null,
    videoCount: 0,
    flompselCount: 0,
    userCount: 0,
  });
  const initialized = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalMs = useRef(15_000);
  const pollInFlight = useRef(false);

  const clearPollInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tickRef = useRef<() => Promise<void>>(async () => {});

  const startInterval = useCallback(() => {
    clearPollInterval();
    intervalRef.current = setInterval(() => {
      void tickRef.current();
    }, pollIntervalMs.current);
  }, [clearPollInterval]);

  const tick = useCallback(async () => {
    if (pollInFlight.current) return;
    pollInFlight.current = true;

    try {
      const snapshot = await api.getNotificationPoll();
      const result = applySnapshot(
        snapshot,
        initialized.current,
        lastSeen.current,
        setNotifications,
      );

      initialized.current = true;
      setPollStatus("ok");
      setLastPollAt(Date.now());

      const intervalChanged = result.pollIntervalMs !== pollIntervalMs.current;
      pollIntervalMs.current = result.pollIntervalMs;
      if (intervalChanged || !intervalRef.current) {
        startInterval();
      }
    } catch {
      setPollStatus("error");
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          void tickRef.current();
        }, initialized.current ? 30_000 : 5_000);
      }
    } finally {
      pollInFlight.current = false;
    }
  }, [startInterval]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      clearPollInterval();
      initialized.current = false;
      lastSeen.current = {
        videoId: null,
        flompselId: null,
        userId: null,
        videoAt: null,
        flompselAt: null,
        userAt: null,
        videoCount: 0,
        flompselCount: 0,
        userCount: 0,
      };
      setNotifications([]);
      setPollStatus("idle");
      setLastPollAt(null);
      return;
    }

    void tickRef.current();

    const onFocus = () => {
      void tickRef.current();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearPollInterval();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user, loading, clearPollInterval]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showTestNotification = useCallback(() => {
    pushNotification(setNotifications, {
      idPrefix: "test",
      type: "video",
      message: "Testnotificatie — pop-ups werken!",
      timestamp: Date.now(),
    });
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, dismissNotification, showTestNotification, pollStatus, lastPollAt }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
