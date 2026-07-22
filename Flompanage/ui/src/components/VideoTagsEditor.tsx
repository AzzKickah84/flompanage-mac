import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { api } from "../api/client";

const MAX_TAGS = 15;

function normalizeTag(raw: string): string | null {
  const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (tag.length < 2 || tag.length > 32) return null;
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(tag)) return null;
  return tag;
}

function tagsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((tag, index) => tag === b[index]);
}

export type VideoTagsEditorHandle = {
  getTags: () => string[];
  isDirty: () => boolean;
  saveIfDirty: () => Promise<boolean>;
};

export const VideoTagsEditor = forwardRef<
  VideoTagsEditorHandle,
  {
    videoId: string;
    initialTags: string[];
    onSaved?: () => void;
    showSaveButton?: boolean;
    highlight?: boolean;
    hint?: string;
  }
>(function VideoTagsEditor(
  { videoId, initialTags, onSaved, showSaveButton = true, highlight = false, hint },
  ref,
) {
  const [tags, setTags] = useState(initialTags);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTags(initialTags);
    setInput("");
    setError("");
  }, [initialTags, videoId]);

  const isDirty = () => !tagsEqual(tags, initialTags);

  const save = async (nextTags = tags) => {
    setSaving(true);
    setError("");
    try {
      await api.setVideoTags(videoId, nextTags);
      onSaved?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    getTags: () => tags,
    isDirty,
    saveIfDirty: async () => {
      if (!isDirty()) return true;
      return save();
    },
  }));

  const addTag = () => {
    const normalized = normalizeTag(input);
    if (!normalized) {
      setError("Ongeldige tag (2-32 tekens, letters/cijfers/-/_)");
      return;
    }
    if (tags.includes(normalized)) {
      setInput("");
      setError("");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setError(`Maximaal ${MAX_TAGS} tags`);
      return;
    }
    setTags([...tags, normalized]);
    setInput("");
    setError("");
  };

  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        borderRadius: 8,
        background: highlight ? "var(--warning-bg)" : "var(--surface-hover)",
        border: highlight ? "1px solid rgba(245,158,11,.35)" : "1px solid var(--border)",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: highlight ? "var(--warning)" : "var(--muted)", marginBottom: 6 }}>
        {highlight ? "Tags (door uploader)" : "Tags"}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--accent-bg)",
              border: "1px solid rgba(255,140,0,.3)",
              color: "var(--accent)",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => setTags(tags.filter((t) => t !== tag))}
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && <span style={{ fontSize: 11, color: "var(--muted)" }}>Nog geen tags</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Nieuwe tag..."
          style={{ fontSize: 12, flex: 1, minWidth: 120 }}
          maxLength={32}
        />
        <button type="button" className="btn-ghost btn-sm" onClick={addTag}>
          Toevoegen
        </button>
        {showSaveButton && (
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => void save()}
            disabled={saving || !isDirty()}
          >
            {saving ? "Opslaan..." : "Tags opslaan"}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>{error}</p>}
      <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 6, marginBottom: 0 }}>
        {hint ??
          "Tags zijn zichtbaar op de videopagina en doorzoekbaar op de site. Gebruik kleine letters; spaties worden streepjes."}
      </p>
    </div>
  );
});
