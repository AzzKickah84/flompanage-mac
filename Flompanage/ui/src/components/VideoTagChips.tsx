export function VideoTagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 999,
            background: "var(--surface-hover)",
            border: "1px solid var(--border)",
            color: "var(--muted)",
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
