import { useState, type ReactNode, type FormEvent, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRefresh } from "../context/RefreshContext";
import { useNotifications } from "../context/NotificationContext";
import { NotificationStack } from "./NotificationStack";
import { api } from "../api/client";
import { DashboardPage } from "../pages/DashboardPage";
import { VideosPage } from "../pages/VideosPage";
import { FlompselsPage } from "../pages/FlompselsPage";
import { UsersPage } from "../pages/UsersPage";
import { SettingsPage } from "../pages/SettingsPage";
import { VisitorIpsPage } from "../pages/VisitorIpsPage";
import { StatistiekenPage } from "../pages/StatistiekenPage";
import { useAppUpdate } from "../context/UpdateContext";
import { useAppAbout, useAppVersion } from "../context/AppVersionContext";
import { AboutModal } from "./AboutModal";
import { UserAvatar } from "./UserAvatar";
import { UserProfileOverlay } from "../pages/UserProfilePage";
import { UsernameLink } from "./UsernameLink";

type Page = "dashboard" | "videos" | "flompsels" | "users" | "settings" | "visitorIps" | "statistieken";

const nav: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Dashboard" }, { id: "videos", label: "Video's" },
  { id: "flompsels", label: "Flompsels" }, { id: "users", label: "Gebruikers" },
  { id: "settings", label: "Instellingen" },
  { id: "visitorIps", label: "Bezoeker IP's" },
  { id: "statistieken", label: "Statistieken" },
];

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
};

const ADMIN_ONLY_PAGES: Page[] = ["settings", "visitorIps", "statistieken"];

function isAdminRole(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function PagePanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div style={{ display: active ? "block" : "none" }}>{children}</div>;
}

function RefreshStatus() {
  const { autoInterval } = useRefresh();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (autoInterval <= 0) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    setElapsed(0);
    return () => clearInterval(t);
  }, [autoInterval]);

  if (autoInterval <= 0) return null;

  const next = autoInterval - (elapsed % autoInterval);

  return (
    <div
      style={{
        marginTop: 10,
        padding: "6px 8px",
        borderRadius: 6,
        background: "var(--accent-bg)",
        fontSize: 10,
        color: "var(--accent)",
        textAlign: "center",
        opacity: 0.8,
      }}
    >
      Auto-refresh: {autoInterval}s
      <br />
      Volgende over {next}s
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }
    if (newPassword.length < 6) {
      setError("Nieuw wachtwoord moet minimaal 6 tekens zijn");
      return;
    }

    setSending(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wachtwoord wijzigen mislukt");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
        padding: 28, width: 380, maxWidth: "90vw",
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>
          Wachtwoord wijzigen
        </h2>
        {success ? (
          <p style={{ color: "var(--accent)", fontSize: 14, padding: "16px 0" }}>
            Wachtwoord succesvol gewijzigd!
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Huidig wachtwoord</span>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Nieuw wachtwoord</span>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Bevestig nieuw wachtwoord</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 14 }}
              />
            </label>
            {error && <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, padding: "10px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                  background: "var(--surface-hover)", color: "var(--muted)", border: "none", cursor: "pointer",
                }}
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={sending}
                style={{
                  flex: 1, padding: "10px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                  background: "var(--accent)", color: "#000", border: "none", cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? "Bezig..." : "Opslaan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function Layout() {
  const { user, logout, refreshSession } = useAuth();
  const { refreshAll, refreshing, setAutoInterval } = useRefresh();
  const { notifications, dismissNotification } = useNotifications();
  const { updateAvailable } = useAppUpdate();
  const { about, loading: aboutLoading, refreshAbout } = useAppAbout();
  const flompanageVersion = useAppVersion();
  const [page, setPage] = useState<Page>("dashboard");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => setAutoInterval(s.autoRefreshInterval)).catch(() => {});
  }, [setAutoInterval]);

  useEffect(() => {
    if (user && !isAdminRole(user.role) && ADMIN_ONLY_PAGES.includes(page)) {
      setPage("dashboard");
    }
  }, [user, page]);

  const visibleNav = nav.filter(
    (item) => !ADMIN_ONLY_PAGES.includes(item.id) || (user && isAdminRole(user.role)),
  );

  const handleRefreshAll = async () => {
    await Promise.all([refreshAll(), refreshSession()]);
  };

  const roleLabel = user ? (roleLabels[user.role] || user.role) : "";

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 220, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src="/logo.png" alt="Flompert.TV" style={{ width: 120, height: "auto", marginBottom: 12, display: "block" }} />
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.5px" }}>Flompanage</h1>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Flompert.TV Beheer</p>
        </div>

        {/* Ingelogd als — prominent user display */}
        <div style={{
          padding: "14px 16px", borderBottom: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>
            Ingelogd als
          </span>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <UserAvatar username={user?.username ?? ""} avatarPath={user?.avatarPath} size={30} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user ? (
                  <UsernameLink userId={user.id} username={user.username} style={{ fontWeight: 700, color: "var(--text)", textDecoration: "none" }} />
                ) : null}
              </p>
              <p style={{ fontSize: 11, color: "var(--accent)" }}>
                {roleLabel}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button
              onClick={() => setShowPasswordModal(true)}
              style={{
                flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: "var(--surface-hover)", color: "var(--muted)", border: "none", cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Wachtwoord wijzigen
            </button>
            <button
              onClick={logout}
              style={{
                padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: "var(--surface-hover)", color: "var(--muted)", border: "none", cursor: "pointer",
              }}
            >
              Uitloggen
            </button>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {visibleNav.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              textAlign: "left", padding: "10px 12px", borderRadius: 6, fontSize: 13,
              fontWeight: page === item.id ? 700 : 500,
              background: page === item.id ? "var(--accent-bg)" : "transparent",
              color: page === item.id ? "var(--accent)" : "var(--muted)", transition: "all 0.15s",
            }}>{item.label}</button>
          ))}
        </nav>
        <div style={{ padding: "0 16px 12px" }}>
          <button
            className="btn-ghost"
            onClick={handleRefreshAll}
            disabled={refreshing}
            style={{ width: "100%", fontSize: 12, justifyContent: "center" }}
          >
            {refreshing ? "Bezig..." : "\u21bb Alles vernieuwen"}
          </button>
          <RefreshStatus />
          <button
            className="btn-ghost"
            onClick={() => setShowAboutModal(true)}
            style={{ width: "100%", fontSize: 11, justifyContent: "center", marginTop: 8, opacity: 0.7 }}
          >
            Over Flompanage
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: "auto", padding: 32, minWidth: 0, position: "relative" }}>
        <PagePanel active={page === "dashboard"}><DashboardPage /></PagePanel>
        <PagePanel active={page === "videos"}><VideosPage /></PagePanel>
        <PagePanel active={page === "flompsels"}><FlompselsPage /></PagePanel>
        <PagePanel active={page === "users"}><UsersPage /></PagePanel>
        <PagePanel active={page === "settings"}><SettingsPage /></PagePanel>
        <PagePanel active={page === "visitorIps"}><VisitorIpsPage /></PagePanel>
        <PagePanel active={page === "statistieken"}><StatistiekenPage /></PagePanel>
        <UserProfileOverlay />
      </main>

      {/* Version stamp — subtle, bottom-right */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          padding: "3px 8px",
          fontSize: 10,
          color: updateAvailable ? "var(--accent)" : "var(--muted)",
          opacity: updateAvailable ? 0.9 : 0.35,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setShowAboutModal(true)}
          title="Over Flompanage"
          style={{
            background: "transparent",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            padding: 0,
            fontSize: "inherit",
          }}
        >
          Flompanage v{flompanageVersion}
          {updateAvailable ? " · update beschikbaar" : ""}
        </button>
      </div>

      {showAboutModal && (
        <AboutModal
          about={about}
          loading={aboutLoading}
          onClose={() => setShowAboutModal(false)}
          onRefresh={refreshAbout}
        />
      )}

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      <NotificationStack notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}
