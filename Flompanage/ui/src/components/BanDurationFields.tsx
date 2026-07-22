import { BAN_DURATION_PRESETS } from "../lib/ban-duration";
import { MIN_MODERATION_REASON_LENGTH } from "../lib/moderation-reason";

type Props = {
  reason: string;
  daysSelect: string;
  customDays: string;
  onReasonChange: (value: string) => void;
  onDaysSelectChange: (value: string) => void;
  onCustomDaysChange: (value: string) => void;
  hint?: string;
};

export function BanDurationFields({
  reason,
  daysSelect,
  customDays,
  onReasonChange,
  onDaysSelectChange,
  onCustomDaysChange,
  hint = 'De reden wordt meegestuurd in de ban-melding naar de gebruiker. Het flompsel wordt "-weggeflompt-".',
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        placeholder="Reden voor ban (wordt naar de gebruiker gestuurd)"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        minLength={MIN_MODERATION_REASON_LENGTH}
        required
        style={{ width: "100%" }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={daysSelect}
          onChange={(e) => onDaysSelectChange(e.target.value)}
          style={{ flex: 1, minWidth: 140, fontSize: 13 }}
        >
          {BAN_DURATION_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        {daysSelect === "custom" && (
          <input
            type="number"
            min={1}
            placeholder="Dagen"
            value={customDays}
            onChange={(e) => onCustomDaysChange(e.target.value)}
            style={{ width: 100 }}
          />
        )}
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>{hint}</p>
    </div>
  );
}
