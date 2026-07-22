import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import type { SiteSettings } from "../api/types";
import { useRegisterRefresh } from "../hooks/useRegisterRefresh";
import { useRefresh } from "../context/RefreshContext";
import { useNotifications } from "../context/NotificationContext";
import { BrevoEmailWizard } from "../components/BrevoEmailWizard";
import { useAppUpdate } from "../context/UpdateContext";
import { useAppAbout, useAppVersion } from "../context/AppVersionContext";
import { AboutModal } from "../components/AboutModal";
import { UPDATE_CHECK_MS } from "../lib/update-config";

type SectionId = "site" | "upload" | "moderation" | "appearance" | "security" | "functionaliteit" | "notifications" | "email";

export function SettingsPage() {
  const [s, setS] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [section, setSection] = useState<SectionId>("site");
  const { setAutoInterval } = useRefresh();
  const { showTestNotification, pollStatus, lastPollAt } = useNotifications();
  const { checkForUpdate, updateAvailable, updatesEnabled } = useAppUpdate();
  const { about, loading: aboutLoading, refreshAbout } = useAppAbout();
  const flompanageVersion = useAppVersion();
  const [showAboutModal, setShowAboutModal] = useState(false);

  const load = useCallback(async () => { setLoading(true); setError(""); try { setS(await api.getSettings()); } catch (err) { setError(err instanceof Error ? err.message : ""); } setLoading(false); }, []);
  useRegisterRefresh(load);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!s) return;
    setSaving(true); setError(""); setOk("");
    try {
      const {
        smtpEnabled: _e,
        smtpUseApi: _u,
        smtpHost: _h,
        smtpPort: _p,
        smtpUser: _su,
        smtpFrom: _f,
        smtpSecure: _sec,
        smtpPass: _pass,
        smtpApiKey: _key,
        smtpPassSet: _ps,
        smtpApiKeySet: _ks,
        ...rest
      } = { ...s };
      const u = await api.updateSettings(rest);
      setS(u);
      setAutoInterval(u.autoRefreshInterval);
      setOk("Opgeslagen!");
      setTimeout(() => setOk(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "");
    }
    setSaving(false);
  };

  const up = (f: keyof SiteSettings, v: string | number | boolean) => { if (!s) return; setS({ ...s, [f]: v }); };

  if (loading) return <p style={{ color: "var(--muted)" }}>Laden...</p>;
  if (!s) return <p style={{ color: "var(--danger)" }}>{error || "Kan niet laden."} <button className="btn-ghost" onClick={load}>Opnieuw</button></p>;

  const tabs: { id: SectionId; label: string; icon: string; desc: string }[] = [
    { id: "site", label: "Algemeen", icon: "🏠", desc: "Site naam, beschrijving, contact" },
    { id: "upload", label: "Uploads", icon: "📤", desc: "Limieten, formaten, goedkeuring" },
    { id: "moderation", label: "Moderatie", icon: "🛡️", desc: "Flompsels, stemmen, veiligheid" },
    { id: "appearance", label: "Weergave", icon: "🎨", desc: "Sortering, watermerk, CSS, banners" },
    { id: "security", label: "Beveiliging", icon: "🔒", desc: "Sessies, wachtwoorden" },
    { id: "email", label: "E-mail", icon: "✉️", desc: "Brevo setup-wizard" },
    { id: "notifications", label: "Notificaties", icon: "🔔", desc: "Flompanage pop-up meldingen" },
    { id: "functionaliteit", label: "Functionaliteit", icon: "⚙️", desc: "Taal en auto-refresh" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Instellingen</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {ok && <span style={{ fontSize: 12, color: "var(--green)" }}>{ok}</span>}
          {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
          <button className="btn-ghost" onClick={load}>&#x21bb;</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Opslaan..." : "Alles opslaan"}</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              borderBottom: section === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              background: "transparent",
              color: section === t.id ? "var(--text)" : "var(--muted)",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color .15s, border-color .15s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>
        {tabs.find(t => t.id === section)?.desc}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600 }}>

        {/* ====== SITE ====== */}
        {section === "site" && <>
          <F label="Site naam" hint="De naam die bovenaan de site en in de browsertab verschijnt.">
            <input value={s.siteName} onChange={e => up("siteName", e.target.value)} style={{ width: "100%" }} />
          </F>
          <F label="Beschrijving" hint="Korte omschrijving voor SEO en social sharing.">
            <textarea value={s.siteDescription} onChange={e => up("siteDescription", e.target.value)} style={{ width: "100%" }} rows={3} />
          </F>
          <F label="Contact e-mailadres" hint="Wordt getoond in de footer en voor systeemmeldingen.">
            <input type="email" value={s.contactEmail} onChange={e => up("contactEmail", e.target.value)} style={{ width: "100%" }} />
          </F>
          <T label="Registraties toestaan" hint="Uit = niemand kan een nieuw account aanmaken." v={s.registrationEnabled} onChange={v => up("registrationEnabled", v)} />
          <T label="Onderhoudsmodus" hint="Toont een onderhoudsbericht aan alle bezoekers." v={s.maintenanceMode} onChange={v => up("maintenanceMode", v)} />
          {s.maintenanceMode && (
            <F label="Onderhoudsbericht">
              <textarea value={s.maintenanceMessage} onChange={e => up("maintenanceMessage", e.target.value)} style={{ width: "100%" }} rows={2} />
            </F>
          )}
        </>}

        {/* ====== UPLOADS ====== */}
        {section === "upload" && <>
          <T label="Uploads vereisen goedkeuring" hint="Uit = nieuwe video's verschijnen direct op de site." v={s.requireApproval} onChange={v => up("requireApproval", v)} />
          <T label="NSFW uploads toestaan" hint="Uit = gebruikers kunnen geen video's als NSFW markeren." v={s.allowNsfwUploads} onChange={v => up("allowNsfwUploads", v)} />
          <F label="Maximale uploadgrootte (MB)" hint="Maximum bestandsgrootte per video (10-2048 MB).">
            <input type="number" min={10} max={2048} value={s.maxUploadSizeMb} onChange={e => up("maxUploadSizeMb", parseInt(e.target.value) || 100)} style={{ width: 120 }} />
          </F>
          <F label="Maximale videoduur (seconden)" hint="Maximum lengte van een video in seconden (10-36000). 600 = 10 minuten.">
            <input type="number" min={10} max={36000} value={s.maxVideoDurationSec} onChange={e => up("maxVideoDurationSec", parseInt(e.target.value) || 600)} style={{ width: 120 }} />
          </F>
          <F label="Maximale titellengte (tekens)" hint="Maximum aantal tekens voor een videotitel (5-500).">
            <input type="number" min={5} max={500} value={s.maxTitleLength} onChange={e => up("maxTitleLength", parseInt(e.target.value) || 100)} style={{ width: 120 }} />
          </F>
          <F label="Toegestane videotypes" hint="Kommagescheiden lijst van extensies (zonder punt).">
            <input value={s.allowedVideoTypes} onChange={e => up("allowedVideoTypes", e.target.value)} style={{ width: "100%" }} />
          </F>
        </>}

        {/* ====== MODERATION ====== */}
        {section === "moderation" && <>
          <T label="Flompsels vereisen goedkeuring" hint="Uit = flompsels zijn direct zichtbaar. Aan = moderatie nodig." v={s.commentApprovalRequired} onChange={v => up("commentApprovalRequired", v)} />
          <F label="Maximale flompsellengte (tekens)" hint="Maximum aantal tekens per flompsel (10-5000).">
            <input type="number" min={10} max={5000} value={s.maxCommentLength} onChange={e => up("maxCommentLength", parseInt(e.target.value) || 500)} style={{ width: 120 }} />
          </F>
          <T label="Stemsysteem (plus/min-flompen)" hint="Uit = geen upvotes/downvotes op video's en flompsels." v={s.enableVoting} onChange={v => up("enableVoting", v)} />
        </>}

        {/* ====== APPEARANCE ====== */}
        {section === "appearance" && <>
          <F label="Standaard sortering" hint="Hoe video's standaard gesorteerd worden op de homepagina.">
            <select value={s.defaultSort} onChange={e => up("defaultSort", e.target.value)} style={{ width: 200 }}>
              <option value="nieuw">Nieuwste eerst</option>
              <option value="toppers">Meeste views</option>
              <option value="top">Hoogste score (plus-flomps)</option>
            </select>
          </F>
          <F label="Video's per pagina" hint="Aantal video's per pagina op de homepagina (4-100).">
            <input type="number" min={4} max={100} value={s.videosPerPage} onChange={e => up("videosPerPage", parseInt(e.target.value) || 30)} style={{ width: 120 }} />
          </F>
          <T label="Watermerk op video's" hint="Toont het Flompert.TV logo in de hoek van elke video." v={s.enableWatermark} onChange={v => up("enableWatermark", v)} />
          <F label="Bannertekst" hint="Optionele aankondiging bovenaan de site. Leeg laten voor geen banner.">
            <input value={s.bannerText} onChange={e => up("bannerText", e.target.value)} style={{ width: "100%" }} placeholder="Bijv: Welkom op de nieuwe Flompert.TV!" />
          </F>
          <F label="Footertekst" hint="Aangepaste tekst onderaan elke pagina. HTML is toegestaan.">
            <textarea value={s.footerText} onChange={e => up("footerText", e.target.value)} style={{ width: "100%" }} rows={2} placeholder="&copy; 2026 Flompert.TV" />
          </F>
          <F label="Aangepaste CSS" hint="Voeg eigen CSS-regels toe om de site te stylen. Wees voorzichtig!">
            <textarea
              value={s.customCss}
              onChange={e => up("customCss", e.target.value)}
              style={{ width: "100%", fontFamily: "monospace", fontSize: 12, minHeight: 120, background: "var(--code-bg, #1e1e1e)", color: "var(--text)" }}
              rows={6}
              placeholder={"/* Voorbeeld */\nbody { --flompert-accent: #ff6600; }"}
              spellCheck={false}
            />
          </F>
        </>}

        {/* ====== SECURITY ====== */}
        {section === "security" && <>
          <F label="Sessieduur (uren)" hint="Hoelang een gebruiker ingelogd blijft voordat opnieuw inloggen nodig is. 168 = 7 dagen.">
            <input type="number" min={1} max={8760} value={s.sessionDurationHours} onChange={e => up("sessionDurationHours", parseInt(e.target.value) || 168)} style={{ width: 120 }} />
          </F>
          <F label="Minimale wachtwoordlengte" hint="Minimum aantal tekens voor wachtwoorden bij registratie (4-128).">
            <input type="number" min={4} max={128} value={s.passwordMinLength} onChange={e => up("passwordMinLength", parseInt(e.target.value) || 8)} style={{ width: 120 }} />
          </F>
        </>}

        {/* ====== EMAIL ====== */}
        {section === "email" && s && (
          <BrevoEmailWizard settings={s} onUpdated={setS} />
        )}

        {/* ====== FUNCTIONALITEIT ====== */}
        {section === "functionaliteit" && <>
          <F label="Website taal" hint="De taal van alle labels en knoppen op de website. Inhoud (video's, flompsels) wordt niet vertaald.">
            <select value={s.language || "nl"} onChange={e => up("language", e.target.value)} style={{ width: 200 }}>
              <option value="nl">Nederlands</option>
              <option value="en">English</option>
            </select>
          </F>
          <F label="Auto-refresh interval (seconden)" hint="0 = uit. Bijv. 30 = elke 30 seconden verversen alle Flompanage-pagina's automatisch.">
            <input
              type="number"
              min={0}
              max={3600}
              step={5}
              value={s.autoRefreshInterval}
              onChange={e => up("autoRefreshInterval", parseInt(e.target.value) || 0)}
              style={{ width: 120 }}
            />
          </F>
          <div style={{ marginTop: 8, padding: 14, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)" }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Flompanage-updates</p>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, lineHeight: 1.5 }}>
              Huidige versie: <strong>v{flompanageVersion}</strong>
              {updatesEnabled
                ? ` · automatische controle elke ${Math.round(UPDATE_CHECK_MS / 60000)} minuten`
                : " · automatische updatecontrole is niet beschikbaar"}
            </p>
            {updateAvailable && (
              <p style={{ fontSize: 12, color: "var(--accent)", marginBottom: 10 }}>
                Update v{updateAvailable.version} is beschikbaar.
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => void checkForUpdate()}
                disabled={!updatesEnabled}
              >
                Nu controleren op updates
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setShowAboutModal(true)}
              >
                Over Flompanage
              </button>
            </div>
          </div>
        </>}

        {/* ====== NOTIFICATIES ====== */}
        {section === "notifications" && <>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 14px" }}>
            Deze instellingen gelden voor alle Flompanage-gebruikers (moderators en admins).
            Meldingen verschijnen als Windows-toast rechtsonder op je scherm (ook als Flompanage op de achtergrond staat).
          </p>

          <T
            label="Notificaties inschakelen"
            hint="Hoofdschakelaar voor alle Flompanage-notificaties."
            v={s.notificationsEnabled !== false}
            onChange={v => up("notificationsEnabled", v)}
          />

          {s.notificationsEnabled !== false && (
            <div style={{ paddingLeft: 12, borderLeft: "2px solid var(--border)", display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <T
                label="Nieuwe video's"
                hint={s.requireApproval
                  ? "Melding bij elke nieuw geüploade video die op goedkeuring wacht."
                  : "Melding bij elke nieuw goedgekeurde video op de site."}
                v={s.notifyNewVideo !== false}
                onChange={v => up("notifyNewVideo", v)}
              />
              <T
                label="Nieuwe flompsels"
                hint="Melding bij elk nieuw flompsel — ook van staff (direct goedgekeurd) en van gebruikers die op moderatie wachten."
                v={s.notifyNewFlompsel !== false}
                onChange={v => up("notifyNewFlompsel", v)}
              />
              <T
                label="Nieuwe registraties"
                hint="Melding wanneer iemand zichzelf een account aanmaakt op de website."
                v={s.notifyNewUser !== false}
                onChange={v => up("notifyNewUser", v)}
              />
              <F label="Controle-interval (seconden)" hint="Hoe vaak wordt gecontroleerd op nieuwe gebeurtenissen. Minimaal 5, maximaal 3600.">
                <input
                  type="number"
                  min={5}
                  max={3600}
                  step={5}
                  value={s.notificationPollInterval ?? 15}
                  onChange={e => up("notificationPollInterval", Math.max(5, parseInt(e.target.value) || 15))}
                  style={{ width: 120 }}
                />
              </F>
              <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: "var(--surface-hover)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px" }}>
                  Status: {pollStatus === "ok" ? "verbonden" : pollStatus === "error" ? "fout bij ophalen" : "wachten..."}
                  {lastPollAt ? ` · laatste check ${new Date(lastPollAt).toLocaleTimeString("nl-NL")}` : ""}
                </p>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={showTestNotification}
                >
                  Testnotificatie tonen
                </button>
              </div>
            </div>
          )}
        </>}
      </div>

      {/* Bottom save */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 600 }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Laatst opgeslagen: {s.updatedAt ? new Date(s.updatedAt).toLocaleString("nl-NL") : "onbekend"}</span>
        <button className="btn-primary" onClick={save} disabled={saving} style={{ padding: "10px 24px" }}>{saving ? "Opslaan..." : "Alles opslaan"}</button>
      </div>

      {showAboutModal && (
        <AboutModal
          about={about}
          loading={aboutLoading}
          onClose={() => setShowAboutModal(false)}
          onRefresh={refreshAbout}
        />
      )}
    </div>
  );
}

/* ===== Reusable form components ===== */

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4, fontWeight: 600 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, opacity: .7 }}>{hint}</p>}
    </div>
  );
}

function T({ label, hint, v, onChange }: { label: string; hint?: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <button
          onClick={() => onChange(!v)}
          style={{
            width: 44, height: 24, borderRadius: 12,
            background: v ? "var(--accent)" : "var(--border)",
            position: "relative", border: "none", cursor: "pointer", padding: 0,
            flexShrink: 0
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: "50%", background: "white",
            position: "absolute", top: 3, left: v ? 23 : 3, transition: "left .2s"
          }} />
        </button>
      </div>
      {hint && <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, opacity: .7 }}>{hint}</p>}
    </div>
  );
}
