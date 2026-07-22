import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { setServerUrl } from "../api/client";

const DEFAULT_SERVER_URL = "https://www.flompert.nl";

type SavedLogin = { serverUrl: string; loginInput: string };

function normalizeServerUrl(url?: string): string {
  const value = (url || "").trim();
  if (!value || /localhost|127\.0\.0\.1/i.test(value)) return DEFAULT_SERVER_URL;
  return value.replace(/\/$/, "");
}

async function loadSavedLogin(): Promise<SavedLogin> {
  try {
    const res = await fetch("/api/flompanage/config");
    if (res.ok) {
      const data = (await res.json()) as { url?: string; login?: string };
      return {
        serverUrl: normalizeServerUrl(data.url),
        loginInput: data.login?.trim() || "",
      };
    }
  } catch {}
  return { serverUrl: DEFAULT_SERVER_URL, loginInput: "" };
}

async function saveSavedLogin(serverUrl: string, loginInput: string) {
  try {
    await fetch("/api/flompanage/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: serverUrl.replace(/\/$/, ""),
        login: loginInput,
      }),
    });
  } catch {}
}

export function LoginPage() {
  const { login } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [serverUrl, setServerUrlState] = useState("");
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSavedLogin().then((saved) => {
      setServerUrlState(saved.serverUrl);
      setLoginInput(saved.loginInput);
      setServerUrl(saved.serverUrl);
      setMounted(true);
    });
  }, []);

  const handleServerUrlChange = (url: string) => {
    setServerUrlState(url);
    setServerUrl(url);
    if (mounted) saveSavedLogin(url, loginInput);
  };

  const handleLoginInputChange = (val: string) => {
    setLoginInput(val);
    if (mounted) saveSavedLogin(serverUrl, val);
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await saveSavedLogin(serverUrl, loginInput);
      await login(serverUrl, loginInput, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt");
    }
    setLoading(false);
  };

  if (!mounted) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)" }}>Laden...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
      <div style={{ width: 400, maxWidth: "90vw", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src="/logo.png" alt="Flompert.TV" style={{ width: 160, height: "auto", display: "block", margin: "0 auto 16px" }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)", marginBottom: 4 }}>Flompanage</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>Flompert.TV Beheerpaneel</p>
        <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Server URL</label>
            <input type="text" value={serverUrl} onChange={e => handleServerUrlChange(e.target.value)} placeholder="https://www.flompert.nl" style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Gebruikersnaam of e-mail</label>
            <input type="text" value={loginInput} onChange={e => handleLoginInputChange(e.target.value)} placeholder="E-mail of gebruikersnaam" autoFocus style={{ width: "100%" }} required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Wachtwoord</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Wachtwoord" style={{ width: "100%" }} required autoComplete="current-password" />
          </div>
          {error && <p style={{ fontSize: 12, color: "var(--danger)", background: "var(--danger-bg)", padding: "8px 12px", borderRadius: 6 }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: 10, fontSize: 14 }}>{loading ? "Bezig..." : "Inloggen"}</button>
        </form>
      </div>
    </div>
  );
}
