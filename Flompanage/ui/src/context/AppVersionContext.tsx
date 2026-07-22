import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { BUILD_VERSION } from "../lib/update-config";
import type { FlompanageAboutInfo } from "../lib/flompanage-about";

type AppVersionCtx = {
  version: string;
  about: FlompanageAboutInfo | null;
  loading: boolean;
  refreshAbout: () => Promise<void>;
};

const AppVersionContext = createContext<AppVersionCtx>({
  version: BUILD_VERSION,
  about: null,
  loading: true,
  refreshAbout: async () => {},
});

export function useAppVersion() {
  return useContext(AppVersionContext).version;
}

export function useAppAbout() {
  return useContext(AppVersionContext);
}

export function AppVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(BUILD_VERSION);
  const [about, setAbout] = useState<FlompanageAboutInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAbout = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/flompanage/about");
      if (!res.ok) return;
      const data = (await res.json()) as FlompanageAboutInfo;
      setAbout(data);
      if (data.version?.trim()) setVersion(data.version.trim());
    } catch {
      // Desktop shell API unavailable (e.g. Vite dev in browser).
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAbout();
  }, [refreshAbout]);

  return (
    <AppVersionContext.Provider value={{ version, about, loading, refreshAbout }}>
      {children}
    </AppVersionContext.Provider>
  );
}
