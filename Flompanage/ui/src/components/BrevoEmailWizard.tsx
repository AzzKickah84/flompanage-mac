import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { SiteSettings } from "../api/types";

const STEPS = ["intro", "apikey", "sender", "test", "done"] as const;
const STEP_LABELS = ["Start", "API key", "Afzender", "Testen", "Klaar"];
type Step = (typeof STEPS)[number];

const PREV_STEP: Partial<Record<Step, Step>> = {
  apikey: "intro",
  sender: "apikey",
  test: "sender",
  done: "intro",
};

function parseFrom(from: string): { name: string; email: string } {
  const m = from.trim().match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  if (from.includes("@")) return { name: "Flompert.TV", email: from.trim() };
  return { name: "Flompert.TV", email: "" };
}

export function BrevoEmailWizard({
  settings,
  onUpdated,
}: {
  settings: SiteSettings;
  onUpdated: (s: SiteSettings) => void;
}) {
  const configured =
    settings.smtpEnabled && settings.smtpUseApi && settings.smtpApiKeySet && !!settings.smtpFrom;

  const [step, setStep] = useState<Step>(configured ? "done" : "intro");
  const [apiKey, setApiKey] = useState("");
  const [fromName, setFromName] = useState("Flompert.TV");
  const [fromEmail, setFromEmail] = useState("noreply@flompert.nl");
  const [testEmail, setTestEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [keyOk, setKeyOk] = useState(settings.smtpApiKeySet);
  const [busy, setBusy] = useState(false);
  const [testOk, setTestOk] = useState(false);
  const [testWarning, setTestWarning] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "info">("info");

  useEffect(() => {
    const p = parseFrom(settings.smtpFrom || "");
    setFromName(p.name);
    setFromEmail(p.email);
  }, [settings.smtpFrom]);

  const stepIdx = STEPS.indexOf(step);

  const applySenderFromSettings = () => {
    const p = parseFrom(settings.smtpFrom || "");
    setFromName(p.name);
    setFromEmail(p.email);
  };

  const resetWizardLocal = (options?: { keepKeyOk?: boolean }) => {
    setApiKey("");
    setTestEmail("");
    setMsg("");
    setAccountInfo("");
    setTestOk(false);
    setKeyOk(options?.keepKeyOk ?? settings.smtpApiKeySet);
    applySenderFromSettings();
    setStep("intro");
  };

  const goToStep = (target: Step) => {
    setMsg("");
    setStep(target);
  };

  const goBack = () => {
    const prev = PREV_STEP[step];
    if (prev) goToStep(prev);
  };

  const startOver = () => {
    if (
      step !== "intro" &&
      !confirm("Wizard opnieuw starten? Je ingevulde velden in deze sessie worden gewist.")
    ) {
      return;
    }
    resetWizardLocal();
  };

  const disableEmail = async () => {
    if (
      !confirm(
        "E-mail via Brevo uitschakelen en de opgeslagen API key wissen? Je kunt daarna de wizard opnieuw doorlopen.",
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const updated = await api.clearBrevoEmail();
      onUpdated(updated);
      resetWizardLocal({ keepKeyOk: false });
      setMsg("E-mailinstellingen zijn gewist. Je kunt opnieuw beginnen.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Uitschakelen mislukt");
    } finally {
      setBusy(false);
    }
  };

  const validateKey = async () => {
    setBusy(true);
    setMsg("");
    setAccountInfo("");
    try {
      const key = apiKey.trim();
      if (!key && settings.smtpApiKeySet) {
        setKeyOk(true);
        setMsg("Bestaande API key op de server wordt gebruikt.");
        return;
      }
      if (!key) throw new Error("Plak je Brevo API key (xkeysib-...).");
      const { account } = await api.validateBrevo(key);
      setKeyOk(true);
      setAccountInfo(
        [account.email && `Brevo: ${account.email}`, account.companyName && account.companyName]
          .filter(Boolean)
          .join(" · "),
      );
      setMsg("API key is geldig!");
    } catch (e) {
      setKeyOk(false);
      setMsg(e instanceof Error ? e.message : "Validatie mislukt");
    } finally {
      setBusy(false);
    }
  };

  const saveSender = async () => {
    setBusy(true);
    setMsg("");
    try {
      const from = `${fromName.trim()} <${fromEmail.trim()}>`;
      const payload: Partial<SiteSettings> = {
        smtpEnabled: true,
        smtpUseApi: true,
        smtpFrom: from,
      };
      if (apiKey.trim()) payload.smtpApiKey = apiKey.trim();
      else if (!settings.smtpApiKeySet) throw new Error("Vul je Brevo API key in");
      const updated = await api.updateSettings(payload);
      onUpdated(updated);
      setMsg("Opgeslagen. E-mail staat aan via Brevo API.");
      goToStep("test");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMsg("");
    setTestWarning("");
    setTestOk(false);
    setMsgType("info");
    try {
      const from = `${fromName.trim()} <${fromEmail.trim()}>`;
      const result = await api.testEmail(testEmail, apiKey.trim() || undefined, from);
      setTestOk(true);
      setMsgType("success");
      setTestWarning(result.warning || "");
      const parts = [
        "Testmail verstuurd via Brevo.",
        result.messageId ? `Referentie: ${result.messageId}.` : "",
        result.hint || "Controleer je inbox en spam (kan 1-5 minuten duren).",
      ].filter(Boolean);
      setMsg(parts.join(" "));
    } catch (e) {
      setMsgType("error");
      setMsg(e instanceof Error ? e.message : "Versturen mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>E-mail via Brevo</h2>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0", maxWidth: 520 }}>
            Wizard voor verificatie-e-mails en meldingen. Werkt via HTTPS — geen SMTP-poort nodig.
          </p>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${configured ? "rgba(34,197,94,0.4)" : "rgba(245,158,11,0.4)"}`,
            color: configured ? "#4ade80" : "#fbbf24",
            background: configured ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
          }}
        >
          {configured ? "Actief" : "Nog niet ingesteld"}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {STEP_LABELS.map((label, i) => {
          const clickable = i <= stepIdx;
          const style = {
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 6,
            border: `1px solid ${i === stepIdx ? "var(--accent)" : "var(--border)"}`,
            color: i === stepIdx ? "var(--accent)" : i < stepIdx ? "#4ade80" : "var(--muted)",
            background: i === stepIdx ? "var(--accent-bg)" : "transparent",
            cursor: clickable ? "pointer" : "default",
          } as const;

          if (clickable) {
            return (
              <button
                key={label}
                type="button"
                style={{ ...style, font: "inherit" }}
                onClick={() => goToStep(STEPS[i])}
                title={`Ga naar stap ${i + 1}`}
              >
                {i + 1}. {label}
              </button>
            );
          }

          return (
            <span key={label} style={style}>
              {i + 1}. {label}
            </span>
          );
        })}
      </div>

      {step === "intro" && (
        <Box title="Wat heb je nodig?">
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
            <li>
              Gratis{" "}
              <a href="https://www.brevo.com" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                Brevo-account
              </a>
            </li>
            <li>API key (<code>xkeysib-...</code>) — niet de SMTP key</li>
            <li>Geverifieerd afzenderadres in Brevo</li>
          </ol>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-primary" type="button" onClick={() => goToStep("apikey")}>
              {configured ? "Setup opnieuw doorlopen" : "Setup starten"}
            </button>
            {configured && (
              <>
                <button className="btn-ghost" type="button" onClick={() => goToStep("done")}>
                  Naar overzicht
                </button>
                <button className="btn-ghost" type="button" onClick={() => goToStep("test")}>
                  Opnieuw testen
                </button>
                <button className="btn-ghost" type="button" onClick={() => goToStep("apikey")}>
                  API key wijzigen
                </button>
                <button className="btn-ghost" type="button" onClick={() => goToStep("sender")}>
                  Afzender wijzigen
                </button>
              </>
            )}
          </div>
          {configured && (
            <WizardNav
              step={step}
              configured={configured}
              onBack={goBack}
              onStartOver={startOver}
              onDisable={disableEmail}
              busy={busy}
              showBack={false}
            />
          )}
        </Box>
      )}

      {step === "apikey" && (
        <>
          <Box title="Stap 1 — API key">
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
              <li>
                <a
                  href="https://app.brevo.com/settings/keys/api"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Brevo → SMTP &amp; API → API keys
                </a>
              </li>
              <li>Generate a new API key → kopieer <code>xkeysib-...</code></li>
            </ol>
            <p style={{ fontSize: 11, color: "#fbbf24", marginTop: 10 }}>
              Gebruik geen SMTP key (xsmtpsib-).
            </p>
          </Box>
          <label style={{ fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>Brevo API key</span>
            <input
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setKeyOk(false);
              }}
              placeholder="xkeysib-..."
              style={{ width: "100%", marginTop: 4, fontFamily: "monospace", fontSize: 12 }}
              spellCheck={false}
            />
          </label>
          {settings.smtpApiKeySet && !apiKey && (
            <p style={{ fontSize: 11, color: "var(--muted)" }}>Er staat al een key opgeslagen op de server.</p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-ghost" type="button" onClick={validateKey} disabled={busy}>
              {busy ? "..." : "Key controleren"}
            </button>
            <button
              className="btn-primary"
              type="button"
              disabled={!keyOk && !settings.smtpApiKeySet}
              onClick={() => goToStep("sender")}
            >
              Volgende
            </button>
          </div>
          {accountInfo && <p style={{ fontSize: 11, color: "var(--accent)" }}>{accountInfo}</p>}
          <WizardNav
            step={step}
            configured={configured}
            onBack={goBack}
            onStartOver={startOver}
            onDisable={disableEmail}
            busy={busy}
          />
        </>
      )}

      {step === "sender" && (
        <>
          <Box title="Stap 2 — Afzender">
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 8px" }}>
              Verifieer je adres in{" "}
              <a href="https://app.brevo.com/senders" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                Brevo → Senders
              </a>{" "}
              vóór je test.
            </p>
            {fromEmail.toLowerCase().includes("@hotmail.") || fromEmail.toLowerCase().includes("@outlook.") || fromEmail.toLowerCase().includes("@gmail.") ? (
              <p style={{ fontSize: 11, color: "#fbbf24", margin: 0 }}>
                Gratis e-mailadressen (@hotmail, @gmail) worden vaak geblokkeerd. Gebruik liever noreply@flompert.nl.
              </p>
            ) : null}
          </Box>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>Naam</span>
              <input value={fromName} onChange={(e) => setFromName(e.target.value)} style={{ width: "100%", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>E-mail</span>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" type="button" onClick={saveSender} disabled={busy || !fromEmail.includes("@")}>
              {busy ? "Opslaan..." : "Opslaan & verder"}
            </button>
          </div>
          <WizardNav
            step={step}
            configured={configured}
            onBack={goBack}
            onStartOver={startOver}
            onDisable={disableEmail}
            busy={busy}
          />
        </>
      )}

      {step === "test" && (
        <>
          <Box title="Stap 3 — Testmail">
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Ontvang je de testmail, dan werkt e-mail op de site.
            </p>
          </Box>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="jij@voorbeeld.nl"
              style={{ flex: 1 }}
            />
            <button className="btn-primary" type="button" onClick={sendTest} disabled={busy || !testEmail.includes("@")}>
              {busy ? "..." : "Test versturen"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-ghost" type="button" onClick={() => goToStep("sender")}>
              Afzender aanpassen
            </button>
            <button className="btn-ghost" type="button" onClick={() => goToStep("apikey")}>
              API key aanpassen
            </button>
            {testOk && (
              <button className="btn-primary" type="button" onClick={() => goToStep("done")}>
                Afronden
              </button>
            )}
          </div>
          <WizardNav
            step={step}
            configured={configured}
            onBack={goBack}
            onStartOver={startOver}
            onDisable={disableEmail}
            busy={busy}
          />
        </>
      )}

      {step === "done" && (
        <Box title="E-mail is ingesteld">
          <p style={{ fontSize: 13, color: "#4ade80", margin: 0 }}>
            Brevo API staat aan. Afzender: {settings.smtpFrom || `${fromName} <${fromEmail}>`}
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn-ghost" type="button" onClick={() => goToStep("test")}>
              Opnieuw testen
            </button>
            <button className="btn-ghost" type="button" onClick={() => goToStep("apikey")}>
              API key wijzigen
            </button>
            <button className="btn-ghost" type="button" onClick={() => goToStep("sender")}>
              Afzender wijzigen
            </button>
            <button className="btn-ghost" type="button" onClick={() => goToStep("intro")}>
              Terug naar start
            </button>
          </div>
          <WizardNav
            step={step}
            configured={configured}
            onBack={goBack}
            onStartOver={startOver}
            onDisable={disableEmail}
            busy={busy}
            showStartOver={false}
          />
        </Box>
      )}

      {msg && (
        <p
          style={{
            fontSize: 12,
            color:
              msgType === "error"
                ? "var(--danger)"
                : msgType === "success"
                  ? "var(--green)"
                  : "var(--muted)",
          }}
        >
          {msg}
        </p>
      )}
      {testWarning && (
        <p style={{ fontSize: 12, color: "#fbbf24", margin: 0 }}>
          {testWarning}
        </p>
      )}
    </div>
  );
}

function WizardNav({
  step,
  configured,
  onBack,
  onStartOver,
  onDisable,
  busy,
  showBack = true,
  showStartOver = true,
}: {
  step: Step;
  configured: boolean;
  onBack: () => void;
  onStartOver: () => void;
  onDisable: () => void;
  busy: boolean;
  showBack?: boolean;
  showStartOver?: boolean;
}) {
  const canBack = showBack && step !== "intro" && !!PREV_STEP[step];

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        paddingTop: 10,
        marginTop: 4,
        borderTop: "1px solid var(--border)",
        width: "100%",
      }}
    >
      {canBack && (
        <button className="btn-ghost" type="button" onClick={onBack} disabled={busy}>
          Terug
        </button>
      )}
      {showStartOver && step !== "intro" && (
        <button className="btn-ghost" type="button" onClick={onStartOver} disabled={busy}>
          Opnieuw beginnen
        </button>
      )}
      {configured && (
        <button
          className="btn-ghost"
          type="button"
          onClick={onDisable}
          disabled={busy}
          style={{ color: "#f87171" }}
        >
          E-mail uitschakelen
        </button>
      )}
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 14,
        background: "rgba(0,0,0,0.15)",
      }}
    >
      <p style={{ fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>{title}</p>
      {children}
    </div>
  );
}
