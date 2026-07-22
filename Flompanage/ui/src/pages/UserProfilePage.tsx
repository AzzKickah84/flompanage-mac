import { useCallback, useEffect, useState } from "react";
import { api, sitePageUrl } from "../api/client";
import type { AdminUserProfile } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { useUserProfile, type UserProfileTarget } from "../context/UserProfileContext";
import { UserAvatar } from "../components/UserAvatar";
import { UserKudosPanel } from "../components/UserKudosPanel";
import { UserEmailPanel } from "../components/UserEmailPanel";
import { BanDurationFields } from "../components/BanDurationFields";
import { parseBanDurationDays } from "../lib/ban-duration";
import { MIN_MODERATION_REASON_LENGTH } from "../lib/moderation-reason";
import {
  canChangeRole,
  canDeleteUser,
  canManageUser,
  canViewSensitiveProfile,
  roleColor,
  roleOptionsFor,
} from "../lib/user-permissions";

function fd(d: string) {
  return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function fdt(d: string | null | undefined): string {
  if (!d) return "Nooit";
  const date = new Date(d);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "Zojuist";
  if (diffMin < 60) return `${diffMin}m geleden`;
  if (diffHrs < 24) return `${diffHrs}u geleden`;
  if (diffDays < 7) return `${diffDays}d geleden`;
  return fd(d);
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  USER: "Gebruiker",
};

export function UserProfilePage({ target, onBack }: { target: UserProfileTarget; onBack: () => void }) {
  const { user: me } = useAuth();
  const { openUserProfile } = useUserProfile();
  const [user, setUser] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banForm, setBanForm] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banDaysSelect, setBanDaysSelect] = useState("7");
  const [banCustomDays, setBanCustomDays] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [kudosOpen, setKudosOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const profile = await api.getUserProfile(target);
      setUser(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profiel laden mislukt");
      setUser(null);
    }
    setLoading(false);
  }, [target]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p style={{ color: "var(--muted)" }}>Profiel laden...</p>;
  }

  if (error || !user) {
    return (
      <div>
        <button type="button" className="btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
          ← Terug
        </button>
        <p style={{ color: "var(--danger)" }}>
          {error || "Gebruiker niet gevonden"}{" "}
          <button type="button" className="btn-ghost" onClick={() => void load()}>
            Opnieuw
          </button>
        </p>
      </div>
    );
  }

  const sensitive = canViewSensitiveProfile(user);
  const manage = canManageUser(me, user.role);
  const isSelf = me?.id === user.id;
  const banned = !!user.isBanned;

  const changeRole = async (role: string, previousRole: string) => {
    if (!confirm(`Rol wijzigen naar ${role}?`)) return;
    try {
      await api.updateUserRole(user.id, role);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Rol wijzigen mislukt");
      setUser((prev) => (prev ? { ...prev, role: previousRole as AdminUserProfile["role"] } : prev));
    }
  };

  const ban = async () => {
    const days = parseBanDurationDays(banDaysSelect, banCustomDays);
    if (banDaysSelect === "custom" && days === null) {
      alert("Voer een geldig aantal dagen in.");
      return;
    }
    if (banReason.trim().length < MIN_MODERATION_REASON_LENGTH) {
      alert(`Reden is verplicht (minimaal ${MIN_MODERATION_REASON_LENGTH} tekens).`);
      return;
    }
    await api.banUser(user.id, banReason.trim(), days);
    setBanForm(false);
    setBanReason("");
    await load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← Terug
        </button>
        <a
          href={sitePageUrl(`/flompert/${encodeURIComponent(user.username)}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn-sm"
          style={{ textDecoration: "none" }}
        >
          Profiel op website ↗
        </a>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <UserAvatar username={user.username} avatarPath={user.avatarPath} size={80} />
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{user.username}</h1>
              <span className="badge" style={{ background: "var(--accent-bg)", color: roleColor(user.role) }}>
                {roleLabels[user.role] || user.role}
              </span>
              {banned && (
                <span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                  BANNED
                </span>
              )}
              {isSelf && (
                <span className="badge" style={{ background: "var(--surface-hover)", color: "var(--muted)" }}>
                  JIJ
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Lid sinds {fd(user.createdAt)} · {user._count.videos} video&apos;s · {user._count.comments} flompsels
            </p>
            {user.limitedProfile && (
              <p style={{ fontSize: 12, color: "var(--warning)", marginTop: 10, marginBottom: 0 }}>
                Beperkt profiel — je hebt geen toegang tot contact- en moderatiegegevens van dit account.
              </p>
            )}
          </div>
        </div>

        {sensitive && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
              Staff-gegevens
            </h2>
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <p style={{ margin: 0 }}>
                <span style={{ color: "var(--muted)" }}>E-mail: </span>
                {user.email}
              </p>
              <p style={{ margin: 0, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: user.emailVerified ? "var(--success)" : "var(--warning)" }}>
                  {user.emailVerified ? "✓ Geverifieerd" : "✗ Niet geverifieerd"}
                </span>
                <span style={{ color: "var(--muted)" }}>Laatst ingelogd: {fdt(user.lastLogin)}</span>
                <span style={{ color: "var(--muted)" }}>Laatst actief: {fdt(user.lastActiveAt)}</span>
              </p>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Statistieken: {user.showInStats ? "Zichtbaar" : "Verborgen"}
              </p>
              {banned && user.banReason && (
                <p style={{ margin: 0, color: "var(--danger)" }}>
                  Verbannen: {user.banReason}
                  {user.bannedUntil ? ` (tot ${fd(user.bannedUntil)})` : ""}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: kudosOpen ? 12 : 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Kudo&apos;s</h2>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setKudosOpen((v) => !v)}>
            {kudosOpen ? "Verbergen" : "Tonen"}
          </button>
        </div>
        {kudosOpen && <UserKudosPanel userId={user.id} username={user.username} onClose={() => setKudosOpen(false)} embedded />}
      </div>

      {(manage || canChangeRole(me, user)) && !isSelf && (
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Moderatie</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canChangeRole(me, user) && (
              <select
                value={user.role}
                onChange={(e) => void changeRole(e.target.value, user.role)}
                style={{ fontSize: 12, padding: "6px 10px" }}
              >
                {roleOptionsFor(me, user.role).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
            {manage && (
              <>
                {!user.emailVerified && sensitive && (
                  <button
                    type="button"
                    className="btn-success btn-sm"
                    onClick={async () => {
                      if (!confirm(`E-mailadres handmatig verifiëren voor ${user.username}?`)) return;
                      await api.verifyUserEmail(user.id);
                      await load();
                    }}
                  >
                    E-mail verifiëren
                  </button>
                )}
                {banned ? (
                  <button
                    type="button"
                    className="btn-success btn-sm"
                    onClick={async () => {
                      if (!confirm("Unbannen?")) return;
                      await api.unbanUser(user.id);
                      await load();
                    }}
                  >
                    Unbannen
                  </button>
                ) : (
                  <button type="button" className="btn-warning btn-sm" onClick={() => setBanForm((v) => !v)}>
                    {banForm ? "Ban annuleren" : "Bannen"}
                  </button>
                )}
                {canDeleteUser(me, user.id, user.role) && (
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    onClick={async () => {
                      const typed = prompt(
                        `Account "${user.username}" permanent verwijderen?\n\nTyp de gebruikersnaam om te bevestigen:`,
                      );
                      if (typed !== user.username) return;
                      await api.deleteUser(user.id);
                      onBack();
                    }}
                  >
                    Verwijderen
                  </button>
                )}
                {user.role !== "SUPER_ADMIN" && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={async () => {
                      const result = await api.toggleShowInStats(user.id);
                      alert(result.showInStats ? "Zichtbaar in statistieken" : "Verborgen in statistieken");
                      await load();
                    }}
                  >
                    {user.showInStats ? "Verberg in stats" : "Toon in stats"}
                  </button>
                )}
                {sensitive && (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setEmailOpen((v) => !v)}>
                    {emailOpen ? "E-mail sluiten" : "E-mail sturen"}
                  </button>
                )}
              </>
            )}
          </div>

          {banForm && manage && (
            <div style={{ marginTop: 12, padding: 12, background: "var(--surface-hover)", borderRadius: 8 }}>
              <BanDurationFields
                reason={banReason}
                daysSelect={banDaysSelect}
                customDays={banCustomDays}
                onReasonChange={setBanReason}
                onDaysSelectChange={setBanDaysSelect}
                onCustomDaysChange={setBanCustomDays}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  disabled={banReason.trim().length < MIN_MODERATION_REASON_LENGTH}
                  onClick={() => void ban()}
                >
                  Bevestigen
                </button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setBanForm(false)}>
                  Annuleren
                </button>
              </div>
            </div>
          )}

          {emailOpen && manage && sensitive && user.email && (
            <UserEmailPanel
              username={user.username}
              banned={banned}
              onSend={async (subject, message, type) => {
                await api.sendUserEmail(user.id, subject, message, type);
                alert(`E-mail verstuurd naar ${user.email}`);
              }}
              onResendBanEmail={
                banned
                  ? async () => {
                      await api.resendBanEmail(user.id);
                      alert(`Ban-melding opnieuw verstuurd naar ${user.email}`);
                    }
                  : undefined
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

export function UserProfileOverlay() {
  const { profileTarget, closeUserProfile } = useUserProfile();
  if (!profileTarget) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        background: "var(--bg)",
        overflow: "auto",
        padding: 32,
      }}
    >
      <UserProfilePage target={profileTarget} onBack={closeUserProfile} />
    </div>
  );
}
