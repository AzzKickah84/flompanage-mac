import { useState } from "react";

export type BulkApproveSummary = {
  approved: number;
  failed: number;
  skipped: number;
  errors: string[];
};

export function BulkApproveButton({
  label,
  count,
  confirmMessage,
  onApprove,
  onDone,
}: {
  label: string;
  count: number;
  confirmMessage: string;
  onApprove: () => Promise<BulkApproveSummary>;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (count === 0) return null;

  const handleClick = async () => {
    if (!window.confirm(confirmMessage)) return;

    setBusy(true);
    setFeedback("");
    try {
      const result = await onApprove();
      const parts = [`${result.approved} goedgekeurd`];
      if (result.failed > 0) parts.push(`${result.failed} mislukt`);
      setFeedback(parts.join(" · "));
      if (result.errors.length > 0) {
        console.warn("Bulk approve errors:", result.errors);
      }
      onDone();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Goedkeuren mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
      <button type="button" className="btn-success btn-sm" onClick={() => void handleClick()} disabled={busy}>
        {busy ? "Bezig..." : `${label} (${count})`}
      </button>
      {feedback && (
        <span style={{ fontSize: 12, color: feedback.includes("mislukt") ? "var(--warning)" : "var(--accent)" }}>
          {feedback}
        </span>
      )}
    </div>
  );
}
