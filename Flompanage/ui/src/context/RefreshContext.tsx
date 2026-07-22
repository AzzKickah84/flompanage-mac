import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type RefreshFn = () => void | Promise<void>;

type Ctx = {
  registerRefresh: (fn: RefreshFn) => void;
  unregisterRefresh: (fn: RefreshFn) => void;
  refreshAll: () => Promise<void>;
  refreshing: boolean;
  autoInterval: number;
  setAutoInterval: (seconds: number) => void;
};

const RefreshContext = createContext<Ctx | null>(null);

export function RefreshProvider({
  intervalSeconds = 0,
  children,
}: {
  intervalSeconds?: number;
  children: ReactNode;
}) {
  const refreshes = useRef(new Set<RefreshFn>());
  const [refreshing, setRefreshing] = useState(false);
  const [autoInterval, setAutoInterval] = useState(intervalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshingRef = useRef(false);

  // Stable callback — uses ref for the concurrency guard so setInterval never
  // captures a stale closure. Wraps each fn() in try/catch so one failing page
  // doesn't prevent other pages from refreshing.
  const refreshAll = useCallback(async () => {
    if (refreshingRef.current) return;
    if (refreshes.current.size === 0) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await Promise.all(
        [...refreshes.current].map((fn) => {
          try {
            return fn();
          } catch {
            // Silently continue — other refreshes should still run
          }
        })
      );
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, []);

  const registerRefresh = useCallback((fn: RefreshFn) => {
    refreshes.current.add(fn);
  }, []);

  const unregisterRefresh = useCallback((fn: RefreshFn) => {
    refreshes.current.delete(fn);
  }, []);

  // Sync intervalSeconds prop
  useEffect(() => {
    setAutoInterval(intervalSeconds);
  }, [intervalSeconds]);

  // Auto-refresh timer — only recreated when autoInterval changes.
  // refreshAll is stable so it never triggers a re-create.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoInterval > 0) {
      intervalRef.current = setInterval(() => {
        refreshAll();
      }, autoInterval * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoInterval, refreshAll]);

  return (
    <RefreshContext.Provider
      value={{ registerRefresh, unregisterRefresh, refreshAll, refreshing, autoInterval, setAutoInterval }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error("useRefresh must be used within RefreshProvider");
  return ctx;
}
