import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../api/client";
import type { VisitorIpEntry } from "../api/types";
import { useRegisterRefresh } from "../hooks/useRegisterRefresh";

type SortKey = "ip" | "firstSeen" | "lastSeen" | "visitCount";

const referrerLabels: Record<string, string> = {
  direct: "Direct (URL / bladwijzer)",
  google: "Google (zoekopdracht)",
  bing: "Bing (zoekopdracht)",
  duckduckgo: "DuckDuckGo (zoekopdracht)",
  yandex: "Yandex (zoekopdracht)",
  twitter: "Twitter / X",
  facebook: "Facebook",
  reddit: "Reddit",
  discord: "Discord",
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  flompert: "Flompert (interne link)",
  external: "Andere website",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function formatCount(n: number) {
  return n.toLocaleString("nl-NL");
}

export function VisitorIpsPage() {
  const [entries, setEntries] = useState<VisitorIpEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("lastSeen");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [resolving, setResolving] = useState(false);
  const [resolveMsg, setResolveMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getVisitorIps();
      setEntries(data.entries);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden mislukt");
    }
    setLoading(false);
  }, []);

  useRegisterRefresh(load);
  useEffect(() => { load(); }, [load]);

  const resolveAll = async () => {
    setResolving(true);
    setResolveMsg("");
    try {
      const result = await api.resolveHostnames();
      setResolveMsg(`${result.resolved} hostname(s) opgelost`);
      await load();
    } catch (err) {
      setResolveMsg(err instanceof Error ? err.message : "Resolven mislukt");
    }
    setResolving(false);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "visitCount" ? "desc" : "asc");
    }
  };

  const refSummary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (e.referrers) {
        for (const [src, count] of Object.entries(e.referrers)) {
          map[src] = (map[src] || 0) + count;
        }
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [entries]);

  const filtered = useMemo(() => {
    let list = [...entries];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.ip.toLowerCase().includes(q) || (e.hostname && e.hostname.toLowerCase().includes(q)));
    }
    list.sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "ip") {
        av = a.ip; bv = b.ip;
      } else if (sortKey === "visitCount") {
        av = a.visitCount; bv = b.visitCount;
      } else {
        av = new Date(a[sortKey]).getTime();
        bv = new Date(b[sortKey]).getTime();
        if (isNaN(av as number)) return 0;
        if (isNaN(bv as number)) return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [entries, search, sortKey, sortDir]);

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return <span style={{ color: "var(--border)", marginLeft: 4 }}>&#x2195;</span>;
    return <span style={{ color: "var(--accent)", marginLeft: 4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>;
  };

  function formatReferrers(refs?: Record<string, number>) {
    if (!refs) return "—";
    const parts = Object.entries(refs)
      .sort((a, b) => b[1] - a[1])
      .map(([src, n]) => `${referrerLabels[src] || src}: ${n}`);
    return parts.join(", ");
  }

  function hostnameDisplay(e: VisitorIpEntry) {
    if (e.hostname) return e.hostname;
    if (!e._hostnameResolved) return <span style={{ color: "var(--muted)", fontStyle: "italic" }}>oplossend...</span>;
    return "—";
  }

  if (loading && entries.length === 0) {
    return <p style={{ color: "var(--muted)" }}>Laden...</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Bezoeker IP's</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {resolveMsg && <span style={{ fontSize: 12, color: "var(--accent)" }}>{resolveMsg}</span>}
          <button className="btn-ghost" onClick={resolveAll} disabled={resolving}>
            {resolving ? "Bezig..." : "🌐 Herresolveer hostnames"}
          </button>
          <button className="btn-ghost" onClick={load}>&#x21bb; Vernieuwen</button>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "8px 12px", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
        Telt alleen eerste bezoeken aan flompert.nl per browsersessie (±30 min). Klikken tussen pagina&apos;s, prefetch en Flompanage tellen niet mee.
      </p>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Initiële bezoeken" value={formatCount(totalCount)} color="var(--accent)" />
        <StatCard label="Unieke IP's" value={formatCount(entries.length)} />
        <StatCard label="Gemiddeld per IP" value={entries.length ? Math.round(totalCount / entries.length).toString() : "—"} />
      </div>

      {/* Referrer summary */}
      {refSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 24, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            Bron bij eerste bezoek
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {refSummary.map(([src, cnt]) => (
              <div key={src} style={{
                background: "var(--surface-hover)", borderRadius: 8, padding: "8px 14px",
                display: "flex", alignItems: "center", gap: 8, fontSize: 13,
              }}>
                <span style={{ color: "var(--text)" }}>{referrerLabels[src] || src}</span>
                <span style={{ fontWeight: 700, color: "var(--accent)" }}>{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {filtered.length} unieke IP{filtered.length !== 1 ? "'s" : ""}
          {search.trim() && ` gevonden`}
          {!search.trim() && ` van ${entries.length} totaal`}
        </div>
        <input
          placeholder="Zoek op IP of hostname..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260, fontSize: 13, padding: "6px 10px" }}
        />
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>Geen IP's gevonden.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <Th onClick={() => toggleSort("ip")}>
                  IP {sortArrow("ip")}
                </Th>
                <Th style={{ cursor: "default" }}>Hostname</Th>
                <Th onClick={() => toggleSort("firstSeen")}>
                  Eerste bezoek {sortArrow("firstSeen")}
                </Th>
                <Th onClick={() => toggleSort("lastSeen")}>
                  Laatste bezoek {sortArrow("lastSeen")}
                </Th>
                <Th onClick={() => toggleSort("visitCount")}>
                  Sessies {sortArrow("visitCount")}
                </Th>
                <Th style={{ cursor: "default" }}>Bron</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.ip} style={{ borderBottom: "1px solid var(--border)" }}>
                  <Td>
                    <code style={{ background: "var(--surface)", padding: "1px 6px", borderRadius: 3, fontSize: 12 }}>
                      {e.ip}
                    </code>
                  </Td>
                  <Td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {hostnameDisplay(e)}
                  </Td>
                  <Td>{formatDate(e.firstSeen)}</Td>
                  <Td>{formatDate(e.lastSeen)}</Td>
                  <Td style={{ fontWeight: 600, color: "var(--accent)" }}>{e.visitCount}</Td>
                  <Td style={{ fontSize: 12, color: "var(--muted)" }}>{formatReferrers(e.referrers)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px" }}>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color: color || "var(--text)", lineHeight: 1.1 }}>{value}</p>
    </div>
  );
}

function Th({ onClick, children, style }: { onClick?: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "10px 12px",
        color: "var(--muted)",
        fontWeight: 600,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "10px 12px", color: "var(--text)", ...style }}>
      {children}
    </td>
  );
}
