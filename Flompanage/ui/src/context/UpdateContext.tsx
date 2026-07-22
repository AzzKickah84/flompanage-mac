import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { fetchLatestAppUpdate, type AppUpdateInfo } from "../lib/fetch-app-update";
import { isDesktopShell } from "../lib/native-bridge";
import {
  DISMISSED_UPDATE_KEY,
  isUpdateCheckAvailable,
  UPDATE_CHECK_MS,
} from "../lib/update-config";
import { useAppVersion } from "./AppVersionContext";
import { isNewerVersion } from "../lib/version-compare";
import { UpdateModal } from "../components/UpdateModal";

type UpdateCtx = {
  checkForUpdate: () => Promise<void>;
  updateAvailable: AppUpdateInfo | null;
  updatesEnabled: boolean;
};

const UpdateContext = createContext<UpdateCtx | null>(null);

export function useAppUpdate() {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error("useAppUpdate must be used within UpdateProvider");
  return ctx;
}

function clearStaleDismissal(currentVersion: string) {
  try {
    const dismissed = localStorage.getItem(DISMISSED_UPDATE_KEY);
    if (!dismissed) return;
    if (!isNewerVersion(dismissed, currentVersion)) {
      localStorage.removeItem(DISMISSED_UPDATE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [update, setUpdate] = useState<AppUpdateInfo | null>(null);
  const currentVersion = useAppVersion();
  const updatesEnabled = isDesktopShell() || isUpdateCheckAvailable();

  const checkForUpdate = useCallback(async () => {
    if (!updatesEnabled) return;

    try {
      const latest = await fetchLatestAppUpdate();
      if (!latest) {
        setUpdate(null);
        return;
      }

      if (!isNewerVersion(latest.version, currentVersion)) {
        setUpdate(null);
        return;
      }

      clearStaleDismissal(currentVersion);

      const dismissed = localStorage.getItem(DISMISSED_UPDATE_KEY);
      if (dismissed === latest.version) return;

      setUpdate(latest);
    } catch {
      // Network/GitHub unavailable — try again on next interval.
    }
  }, [currentVersion, updatesEnabled]);

  useEffect(() => {
    if (!updatesEnabled) return;

    clearStaleDismissal(currentVersion);
    void checkForUpdate();

    const interval = window.setInterval(() => {
      void checkForUpdate();
    }, UPDATE_CHECK_MS);

    const onFocus = () => {
      void checkForUpdate();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkForUpdate, currentVersion, updatesEnabled]);

  const dismissUpdate = () => {
    if (update) {
      localStorage.setItem(DISMISSED_UPDATE_KEY, update.version);
    }
    setUpdate(null);
  };

  return (
    <UpdateContext.Provider value={{ checkForUpdate, updateAvailable: update, updatesEnabled }}>
      {children}
      {update && <UpdateModal update={update} onDismiss={dismissUpdate} />}
    </UpdateContext.Provider>
  );
}
