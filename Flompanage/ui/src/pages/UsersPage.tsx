import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { AdminUserRow } from "../api/types";
import { useRegisterRefresh } from "../hooks/useRegisterRefresh";
import { UserEmailPanel } from "../components/UserEmailPanel";
import { UserKudosPanel } from "../components/UserKudosPanel";
import { BanDurationFields } from "../components/BanDurationFields";
import { parseBanDurationDays } from "../lib/ban-duration";
import { MIN_MODERATION_REASON_LENGTH } from "../lib/moderation-reason";
import { UserAvatar } from "../components/UserAvatar";
import { UsernameLink } from "../components/UsernameLink";
import { UsernameLink } from "../components/UsernameLink";

export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banForm, setBanForm] = useState<{
    userId: string;
    reason: string;
    daysSelect: string;
    customDays: string;
  } | null>(null);
  const [pwForm, setPwForm] = useState<{ userId: string; password: string; confirm: string; notify: boolean } | null>(null);
  const [emailFormUserId, setEmailFormUserId] = useState<string | null>(null);
  const [kudosFormUserId, setKudosFormUserId] = useState<string | null>(null);
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [create, setCreate] = useState({ email: "", username: "", password: "", role: "MODERATOR" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => { setLoading(true); setError(""); try { setUsers(await api.getUsers()); } catch (err) { setError(err instanceof Error ? err.message : ""); } setLoading(false); }, []);
  useRegisterRefresh(load);
  useEffect(() => { load(); }, [load]);
  const changeRole = async (id: string, role: string, previousRole: string) => {
    if (!confirm(`Rol wijzigen naar ${role}?`)) return;
    try {
      await api.updateUserRole(id, role);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Rol wijzigen mislukt");
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: previousRole as AdminUserRow["role"] } : u)),
      );
    }
  };
  const ban = async () => {
    if (!banForm) return;
    const days = parseBanDurationDays(banForm.daysSelect, banForm.customDays);
    if (banForm.daysSelect === "custom" && days === null) {
      alert("Voer een geldig aantal dagen in.");
      return;
    }
    if (banForm.reason.trim().length < MIN_MODERATION_REASON_LENGTH) {
      alert(`Reden is verplicht (minimaal ${MIN_MODERATION_REASON_LENGTH} tekens).`);
      return;
    }
    await api.banUser(banForm.userId, banForm.reason.trim(), days);
    setBanForm(null);
    load();
  };
  const unban = async (id: string) => { if (!confirm("Unbannen?")) return; await api.unbanUser(id); load(); };
  const verifyEmail = async (id: string, username: string) => {
    if (!confirm(`E-mailadres handmatig verifiëren voor ${username}? De gebruiker ontvangt een bevestigingsmail.`)) return;
    try {
      await api.verifyUserEmail(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verifiëren mislukt");
    }
  };
  const deleteUser = async (id: string, username: string, targetRole: string) => {
    if (!canDeleteUser(id, targetRole)) {
      alert("Alleen admins mogen accounts permanent verwijderen.");
      return;
    }
    const typed = prompt(
      `Account "${username}" permanent verwijderen?\n\nAlle video's en flompsels worden ook verwijderd.\n\nTyp de gebruikersnaam "${username}" om te bevestigen:`,
    );
    if (typed !== username) {
      if (typed !== null) alert("Verwijderen geannuleerd — gebruikersnaam kwam niet overeen.");
      return;
    }
    try {
      await api.deleteUser(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verwijderen mislukt");
    }
  };
  const toggleStats = async (id: string, username: string, current: boolean) => {
    try {
      const result = await api.toggleShowInStats(id);
      alert(
        result.showInStats
          ? `${username} is nu zichtbaar in statistieken`
          : `${username} is nu verborgen in statistieken`,
      );
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Wijzigen mislukt");
    }
  };
  const resetPw = async (id: string, username: string) => {
    if (!confirm(`Willekeurig wachtwoord genereren voor ${username}? Er wordt ook een e-mail verstuurd.`)) return;
    const result = await api.resetUserPassword(id);
    alert(`Nieuw wachtwoord voor ${username}:\n\n${result.newPassword}\n\n(Ook per e-mail verstuurd)`);
  };
  const savePassword = async (userId: string, username: string) => {
    if (!pwForm || pwForm.userId !== userId) return;
    setPwError("");
    if (pwForm.password.length < 8) {
      setPwError("Wachtwoord moet minstens 8 tekens zijn");
      return;
    }
    if (pwForm.password !== pwForm.confirm) {
      setPwError("Wachtwoorden komen niet overeen");
      return;
    }
    setPwSaving(true);
    try {
      await api.setUserPassword(userId, pwForm.password, pwForm.notify);
      setPwForm(null);
      alert(`Wachtwoord voor ${username} is ingesteld.${pwForm.notify ? " De gebruiker is per e-mail geïnformeerd." : ""}`);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Opslaan mislukt");
    }
    setPwSaving(false);
  };
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateError(""); setCreating(true);
    try {
      await api.createUser(create);
      setShowCreate(false);
      setCreate({ email: "", username: "", password: "", role: "MODERATOR" });
      load();
    } catch (err) { setCreateError(err instanceof Error ? err.message : "Aanmaken mislukt"); }
    setCreating(false);
  };
  const fd = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  const fdt = (d: string | null | undefined): string => {
    if (!d) return "Nooit";
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Zojuist";
    if (diffMin < 60) return `${diffMin}m geleden`;
    if (diffHrs < 24) return `${diffHrs}u geleden`;
    if (diffDays < 7) return `${diffDays}d geleden`;
    return fd(d);
  };
  const rc = (r: string) => { switch (r) { case "SUPER_ADMIN": return "var(--accent)"; case "ADMIN": return "var(--warning)"; case "MODERATOR": return "var(--success)"; default: return "var(--muted)"; } };
  const canSendEmail = !!me;
  const canManage = (targetRole: string) => {
    if (!me) return false;
    if (me.role === "SUPER_ADMIN") return targetRole !== "SUPER_ADMIN";
    if (me.role === "ADMIN" || me.role === "MODERATOR") {
      return targetRole !== "SUPER_ADMIN" && targetRole !== "ADMIN";
    }
    return false;
  };
  const canDeleteUser = (targetId: string, targetRole: string) => {
    if (!me || me.id === targetId) return false;
    if (me.role === "SUPER_ADMIN") return targetRole !== "SUPER_ADMIN";
    if (me.role === "ADMIN") return targetRole !== "SUPER_ADMIN" && targetRole !== "ADMIN";
    return false;
  };
  const canChangeRole = (u: AdminUserRow) => {
    if (!me || u.id === me.id) return false;
    if (u.role === "SUPER_ADMIN") return false;
    if (u.role === "ADMIN") return me.role === "SUPER_ADMIN" || me.role === "ADMIN";
    return me.role === "ADMIN" || me.role === "SUPER_ADMIN" || me.role === "MODERATOR";
  };
  const roleOptionsFor = (targetRole: string): string[] => {
    if (me?.role === "SUPER_ADMIN") {
      if (targetRole === "SUPER_ADMIN") return ["SUPER_ADMIN"];
      return ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
    }
    if (me?.role === "ADMIN" || me?.role === "MODERATOR") return ["USER", "MODERATOR"];
    return [];
  };

  // Available roles for creation based on current user's role
  const availableRoles = me?.role === "SUPER_ADMIN"
    ? ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"]
    : me?.role === "ADMIN" || me?.role === "MODERATOR"
      ? ["USER", "MODERATOR"]
      : [];

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Laden...</p>;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Gebruikers ({filteredUsers.length}{filteredUsers.length !== users.length ? ` van ${users.length}` : ""})</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            placeholder="Zoek gebruiker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200, fontSize: 13, padding: "6px 10px" }}
          />
          {availableRoles.length > 0 && (
            <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? "Sluiten" : "+ Nieuwe gebruiker"}
            </button>
          )}
          <button className="btn-ghost" onClick={load}>&#x21bb;</button>
        </div>
      </div>

      {showCreate && (
        <div className="card" style={{ padding: 20, marginBottom: 24, borderLeft: "3px solid var(--accent)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Nieuwe gebruiker aanmaken</h2>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Maak een nieuw admin-, moderator- of gebruikersaccount aan. De gebruiker kan direct inloggen.</p>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>E-mailadres</label>
                <input type="email" value={create.email} onChange={e => setCreate({ ...create, email: e.target.value })} placeholder="gebruiker@flompert.tv" style={{ width: "100%" }} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Gebruikersnaam</label>
                <input type="text" value={create.username} onChange={e => setCreate({ ...create, username: e.target.value })} placeholder="gebruikersnaam" style={{ width: "100%" }} required minLength={3} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Wachtwoord</label>
                <input type="password" value={create.password} onChange={e => setCreate({ ...create, password: e.target.value })} placeholder="Minimaal 8 tekens" style={{ width: "100%" }} required minLength={8} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Rol / Permissieniveau</label>
                <select value={create.role} onChange={e => setCreate({ ...create, role: e.target.value })} style={{ width: "100%" }}>
                  {availableRoles.map(r => <option key={r} value={r}>{r === "SUPER_ADMIN" ? "Super Admin (alles)" : r === "ADMIN" ? "Admin (beheer)" : r === "MODERATOR" ? "Moderator (video's & flompsels)" : "Gebruiker (geen beheer)"}</option>)}
                </select>
              </div>
            </div>
            {createError && <p style={{ fontSize: 12, color: "var(--danger)", background: "var(--danger-bg)", padding: "8px 12px", borderRadius: 6 }}>{createError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn-success" disabled={creating}>{creating ? "Bezig..." : "Aanmaken"}</button>
              <button type="button" className="btn-ghost" onClick={() => { setShowCreate(false); setCreateError(""); }}>Annuleren</button>
            </div>
          </form>
        </div>
      )}

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {filteredUsers.length === 0 && search.trim() && (
        <p style={{ color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>
          Geen gebruikers gevonden voor "{search}".
        </p>
      )}
      {filteredUsers.map(u => {
        const banned = u.isBanned;
        const manage = canManage(u.role);
        return <div key={u.id} className="card" style={{ padding: 16, marginBottom: 10, opacity: banned ? 0.7 : 1, borderColor: banned ? "rgba(239,68,68,.3)" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <UserAvatar username={u.username} avatarPath={u.avatarPath} size={28} />
                <UsernameLink userId={u.id} username={u.username} style={{ fontWeight: 700, fontSize: 15 }} />
                <span className="badge" style={{ background: "var(--accent-bg)", color: rc(u.role) }}>{u.role}</span>
                {banned && <span className="badge" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>BANNED</span>}
                {u.id === me?.id && <span className="badge" style={{ background: "var(--surface-hover)", color: "var(--muted)" }}>JIJ</span>}
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>{u.email} · {u._count.videos} video's · {u._count.comments} flompsels · sinds {fd(u.createdAt)} · {u.showInStats ? "Zichtbaar in stats" : "Verborgen in stats"}</p>
              <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: u.emailVerified ? "var(--success)" : "var(--warning)" }}>
                  {u.emailVerified ? "✓ Geverifieerd" : "✗ Niet geverifieerd"}
                </span>
                {manage && u.id !== me?.id && !u.emailVerified && (
                  <button
                    type="button"
                    className="btn-success btn-sm"
                    style={{ fontSize: 10, padding: "2px 8px" }}
                    onClick={() => verifyEmail(u.id, u.username)}
                  >
                    Handmatig verifiëren
                  </button>
                )}
                <span>Laatst ingelogd: {fdt(u.lastLogin)}</span>
                <span>Laatst actief: {fdt(u.lastActiveAt)}</span>
              </p>
              {banned && u.banReason && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 2 }}>Verbannen: {u.banReason}{u.bannedUntil ? ` (tot ${fd(u.bannedUntil)})` : ""}</p>}
            </div>
            {(manage || canChangeRole(u)) && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {canChangeRole(u) && (
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value, u.role)}
                  style={{ fontSize: 12, padding: "4px 8px" }}
                >
                  {roleOptionsFor(u.role).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
              {manage && <>
              {u.id !== me?.id && !u.emailVerified && (
                <button className="btn-success btn-sm" onClick={() => verifyEmail(u.id, u.username)}>
                  E-mail verifiëren
                </button>
              )}
              {u.id !== me?.id && (banned ? <button className="btn-success btn-sm" onClick={() => unban(u.id)}>Unbannen</button> : <button className="btn-warning btn-sm" onClick={() => { setPwForm(null); setEmailFormUserId(null); setPwError(""); setBanForm({ userId: u.id, reason: "", daysSelect: "7", customDays: "" }); }}>Bannen</button>)}
              {canDeleteUser(u.id, u.role) && (
                <button className="btn-danger btn-sm" onClick={() => deleteUser(u.id, u.username, u.role)}>
                  Verwijderen
                </button>
              )}
              {u.id !== me?.id && (
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setBanForm(null);
                    setPwForm(null);
                    setEmailFormUserId(null);
                    setPwError("");
                    setKudosFormUserId(kudosFormUserId === u.id ? null : u.id);
                  }}
                >
                  {kudosFormUserId === u.id ? "Kudo's sluiten" : "Kudo's"}
                </button>
              )}
              {u.id !== me?.id && canSendEmail && (
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setBanForm(null);
                    setPwForm(null);
                    setKudosFormUserId(null);
                    setPwError("");
                    setEmailFormUserId(emailFormUserId === u.id ? null : u.id);
                  }}
                >
                  {emailFormUserId === u.id ? "E-mail sluiten" : "E-mail sturen"}
                </button>
              )}
              {u.id !== me?.id && u.role !== "SUPER_ADMIN" && (
                <button className="btn-secondary btn-sm" onClick={() => toggleStats(u.id, u.username, u.showInStats)}>
                  {u.showInStats ? "Verberg in stats" : "Toon in stats"}
                </button>
              )}
              {u.id !== me?.id && <button className="btn-ghost btn-sm" onClick={() => { setBanForm(null); setEmailFormUserId(null); setPwError(""); setPwForm({ userId: u.id, password: "", confirm: "", notify: true }); }}>Ww instellen</button>}
              {u.id !== me?.id && <button className="btn-ghost btn-sm" onClick={() => resetPw(u.id, u.username)}>Reset ww</button>}
              </>}
            </div>}
          </div>
          {banForm?.userId === u.id && (
            <div style={{ marginTop: 12, padding: 12, background: "var(--surface-hover)", borderRadius: 8 }}>
              <BanDurationFields
                reason={banForm.reason}
                daysSelect={banForm.daysSelect}
                customDays={banForm.customDays}
                onReasonChange={(reason) => setBanForm({ ...banForm, reason })}
                onDaysSelectChange={(daysSelect) => setBanForm({ ...banForm, daysSelect })}
                onCustomDaysChange={(customDays) => setBanForm({ ...banForm, customDays })}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="btn-danger btn-sm"
                  disabled={banForm.reason.trim().length < MIN_MODERATION_REASON_LENGTH}
                  onClick={() => void ban()}
                >
                  Bevestigen
                </button>
                <button className="btn-ghost btn-sm" onClick={() => setBanForm(null)}>Annuleren</button>
              </div>
            </div>
          )}
          {kudosFormUserId === u.id && (
            <UserKudosPanel
              userId={u.id}
              username={u.username}
              onClose={() => setKudosFormUserId(null)}
            />
          )}
          {emailFormUserId === u.id && canSendEmail && (
            <UserEmailPanel
              username={u.username}
              banned={banned}
              onSend={async (subject, message, type) => {
                await api.sendUserEmail(u.id, subject, message, type);
                alert(`E-mail verstuurd naar ${u.email}`);
              }}
              onResendBanEmail={banned ? async () => {
                await api.resendBanEmail(u.id);
                alert(`Ban-melding opnieuw verstuurd naar ${u.email}`);
              } : undefined}
            />
          )}
          {pwForm?.userId === u.id && <div style={{ marginTop: 12, padding: 12, background: "var(--surface-hover)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>Nieuw wachtwoord instellen voor <strong>{u.username}</strong></p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input type="password" placeholder="Nieuw wachtwoord" value={pwForm.password} onChange={e => setPwForm({ ...pwForm, password: e.target.value })} style={{ width: "100%" }} minLength={8} />
              <input type="password" placeholder="Herhaal wachtwoord" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} style={{ width: "100%" }} minLength={8} />
            </div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={pwForm.notify} onChange={e => setPwForm({ ...pwForm, notify: e.target.checked })} />
              Gebruiker per e-mail informeren
            </label>
            {pwError && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{pwError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary btn-sm" onClick={() => savePassword(u.id, u.username)} disabled={pwSaving}>{pwSaving ? "Opslaan..." : "Opslaan"}</button>
              <button className="btn-ghost btn-sm" onClick={() => { setPwForm(null); setPwError(""); }}>Annuleren</button>
            </div>
          </div>}
        </div>;
      })}
    </div>
  );
}
