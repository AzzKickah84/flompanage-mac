"use client";

import { useState } from "react";
import { ADMIN_EMAIL_PRESETS, ADMIN_EMAIL_SENDER } from "../lib/admin-email-presets";

type Props = {
  username: string;
  onSend: (subject: string, message: string, type: "warning" | "info" | "notification") => Promise<void>;
  onResendBanEmail?: () => Promise<void>;
  banned?: boolean;
  pending?: boolean;
};

export function UserEmailPanel({
  username,
  onSend,
  onResendBanEmail,
  banned,
  pending,
}: Props) {
  const [presetIndex, setPresetIndex] = useState(0);
  const [subject, setSubject] = useState(ADMIN_EMAIL_PRESETS[0].subject);
  const [message, setMessage] = useState(ADMIN_EMAIL_PRESETS[0].message);
  const [error, setError] = useState("");

  const applyPreset = (index: number) => {
    setPresetIndex(index);
    const preset = ADMIN_EMAIL_PRESETS[index];
    setSubject(preset.subject);
    setMessage(preset.message);
    setError("");
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      setError("Onderwerp en bericht zijn verplicht");
      return;
    }
    setError("");
    try {
      const preset = ADMIN_EMAIL_PRESETS[presetIndex];
      await onSend(subject.trim(), message.trim(), preset.type);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Versturen mislukt");
    }
  };

  return (
    <div style={{ marginTop: 12, padding: 12, background: "var(--surface-hover)", borderRadius: 8 }}>
      <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 8px" }}>
        E-mail sturen naar {username}
      </p>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 10px" }}>
        Afzender: {ADMIN_EMAIL_SENDER} (Flomp.TV)
      </p>

      {banned && onResendBanEmail && (
        <button
          className="btn-warning btn-sm"
          style={{ marginBottom: 10 }}
          disabled={pending}
          onClick={() => onResendBanEmail()}
        >
          Ban-melding opnieuw versturen
        </button>
      )}

      <select
        value={presetIndex}
        onChange={(e) => applyPreset(Number(e.target.value))}
        style={{ width: "100%", fontSize: 13, marginBottom: 8 }}
      >
        {ADMIN_EMAIL_PRESETS.map((preset, index) => (
          <option key={preset.label} value={index}>
            {preset.label}
          </option>
        ))}
      </select>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Onderwerp"
        style={{ width: "100%", marginBottom: 8 }}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Bericht"
        rows={5}
        style={{ width: "100%", resize: "vertical", marginBottom: 8 }}
      />
      {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 8px" }}>{error}</p>}
      <button className="btn-primary btn-sm" onClick={handleSend} disabled={pending}>
        {pending ? "Versturen..." : "E-mail versturen"}
      </button>
    </div>
  );
}
