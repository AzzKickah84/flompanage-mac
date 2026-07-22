import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api, getSession, clearSession } from "../api/client";
import type { AdminUser } from "../api/types";

type Ctx = {
  user: AdminUser | null; loading: boolean;
  login: (baseUrl: string, loginStr: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
};
const AuthContext = createContext<Ctx>({ user: null, loading: true, login: async () => {}, logout: () => {}, refreshSession: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    const s = getSession();
    if (!s) { setUser(null); setLoading(false); return; }
    try { const me = await api.me(); setUser(me); } catch { clearSession(); setUser(null); }
    setLoading(false);
  }, []);
  useEffect(() => { check(); }, [check]);

  const login = useCallback(async (baseUrl: string, loginStr: string, password: string) => {
    const u = await api.login(baseUrl, loginStr, password); setUser(u);
  }, []);
  const logout = useCallback(() => { api.logout(); setUser(null); }, []);

  const refreshSession = useCallback(async () => {
    const s = getSession();
    if (!s) return;
    try { const me = await api.me(); setUser(me); } catch { clearSession(); setUser(null); }
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshSession }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
