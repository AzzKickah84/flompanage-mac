import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import type { FullStatistics, MonthActivity, KudoEntry, RoleCount, StatusCount } from "../api/types";
import { useRegisterRefresh } from "../hooks/useRegisterRefresh";
import { UsernameLink } from "../components/UsernameLink";

function formatNum(n: number) { return n.toLocaleString("nl-NL"); }
function shorten(s: string, max: number) { return s.length > max ? s.slice(0, max - 1) + "\u2026" : s; }

const COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#6366f1",
];
const LABELS: Record<string, string> = {
  USER: "Gebruiker", MODERATOR: "Moderator", ADMIN: "Admin", SUPER_ADMIN: "Super Admin",
  ACTIVE: "Actief", APPROVED: "Goedgekeurd", DECLINED: "Afgewezen",
};
const MONTH_NAMES = ["","Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];

export function StatistiekenPage() {
  const [data, setData] = useState<FullStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await api.getFullStatistics()); }
    catch (err) { setError(err instanceof Error ? err.message : "Laden mislukt"); }
    setLoading(false);
  }, []);
  useRegisterRefresh(load);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Laden...</p>;
  if (!data) return <p style={{ color: "var(--danger)" }}>{error || "Geen data."}</p>;

  const { stats, roleDistribution, activity, leaderboard, topVideos, topFlompselers, topUploaders, flompselStatus } = data;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Statistieken</h1>
        <button className="btn-ghost" onClick={load}>&#x21bb; Vernieuwen</button>
      </div>
      {error && <p style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</p>}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
        <StatCard label="Video's" value={formatNum(stats.totalVideos)} color="#3b82f6" />
        <StatCard label="Totaal views" value={formatNum(stats.totalViews)} color="#22c55e" />
        <StatCard label="Gebruikers" value={formatNum(stats.totalUsers)} color="#8b5cf6" />
        <StatCard label="Flompsels" value={formatNum(stats.totalFlompsels)} color="#f59e0b" />
        <StatCard label="Stemmen" value={formatNum(stats.totalVotes)} color="#ec4899" />
        <StatCard label="Wachtrij" value={formatNum(stats.pendingVideos)} color="#ef4444" />
      </div>

      {/* Row 1: Activity + Role */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <ChartCard title="Maandelijkse activiteit">
          <AreaChart data={activity} />
        </ChartCard>
        <ChartCard title="Rollen">
          <PieChart data={roleDistribution} nameKey="role" valueKey="count" />
        </ChartCard>
      </div>

      {/* Row 2: Kudo leaderboard */}
      <div style={{ marginBottom: 24 }}>
        <ChartCard title="Kudo-ranglijst (top 15)">
          <BarChart data={leaderboard.slice(0, 15).map(u => ({ name: u.username, value: u.kudoScore }))} color="#3b82f6" />
        </ChartCard>
      </div>

      {/* Row 3: Top videos + Top flompselers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <ChartCard title="Meest bekeken video's">
          <BarChart data={topVideos.slice(0, 8).map(v => ({ name: shorten(v.title, 30), value: v.views, sub: v.user.username }))} color="#22c55e" />
        </ChartCard>
        <ChartCard title="Top flompselaars">
          <BarChart data={topFlompselers.slice(0, 8).map(u => ({ name: u.username, value: u.flompsels }))} color="#f59e0b" />
        </ChartCard>
      </div>

      {/* Row 4: Top uploaders + Flompsel status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <ChartCard title="Top uploaders">
          <BarChart data={topUploaders.slice(0, 8).map(u => ({ name: u.username, value: u.videos }))} color="#3b82f6" />
        </ChartCard>
        <ChartCard title="Flompsel status">
          <PieChart data={flompselStatus} nameKey="status" valueKey="count" />
        </ChartCard>
      </div>

      {/* Full leaderboard table */}
      <ChartCard title="Volledige kudo-ranglijst">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <Th>#</Th><Th>Gebruiker</Th><Th style={{ textAlign: "right" }}>Kudo's</Th>
                <Th style={{ textAlign: "right" }}>+</Th><Th style={{ textAlign: "right" }}>−</Th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((u, i) => (
                <tr key={u.userId} style={{ borderBottom: "1px solid var(--border)" }}>
                  <Td style={{ fontWeight: 700, color: i < 3 ? "var(--accent)" : "var(--muted)" }}>{i + 1}</Td>
                  <Td style={{ fontWeight: 600 }}>
                    <UsernameLink userId={u.userId} username={u.username} />
                  </Td>
                  <Td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{u.kudoScore}</Td>
                  <Td style={{ textAlign: "right", color: "var(--success)" }}>{u.plusFlompsReceived}</Td>
                  <Td style={{ textAlign: "right", color: "var(--danger)" }}>{u.minFlompsReceived}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

// ===== Pure SVG Charts =====

type ChartDatum = { name: string; value: number; sub?: string };

function BarChart({ data, color }: { data: ChartDatum[]; color: string }) {
  const h = 260; const pad = { top: 10, right: 20, bottom: 20, left: 100 };
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barH = Math.max(8, Math.min(28, (h - pad.top - pad.bottom) / data.length - 4));
  const chartH = data.length * (barH + 4) + pad.top + pad.bottom;

  return (
    <svg width="100%" height={chartH} viewBox={`0 0 ${600} ${chartH}`} preserveAspectRatio="xMidYMid meet">
      {/* Gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const x = pad.left + (600 - pad.left - pad.right) * pct;
        return <line key={pct} x1={x} y1={pad.top} x2={x} y2={chartH - pad.bottom} stroke="var(--border)" strokeWidth={0.5} />;
      })}
      {data.map((d, i) => {
        const y = pad.top + i * (barH + 4);
        const w = ((600 - pad.left - pad.right) * d.value) / maxVal;
        return (
          <g key={i}>
            <rect x={pad.left} y={y} width={w} height={barH} fill={color} rx={3} opacity={0.85} />
            <text x={pad.left - 8} y={y + barH / 2 + 4} textAnchor="end" fill="var(--muted)" fontSize={11}>{shorten(d.name, 13)}</text>
            <text x={pad.left + w + 6} y={y + barH / 2 + 4} fill="var(--text)" fontSize={10} fontWeight={600}>{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function AreaChart({ data }: { data: MonthActivity[] }) {
  const h = 260; const pad = { top: 15, right: 15, bottom: 30, left: 45 };
  const w = 600;
  const keys = ["videos", "users", "flompsels"] as const;
  const colors = { videos: "#3b82f6", users: "#8b5cf6", flompsels: "#f59e0b" };
  const labels = { videos: "Video's", users: "Gebruikers", flompsels: "Flompsels" };

  const allVals = data.flatMap(d => keys.map(k => d[k]));
  const maxVal = Math.max(...allVals, 1);

  const toX = (i: number) => pad.left + ((w - pad.left - pad.right) * i) / (data.length - 1 || 1);
  const toY = (v: number) => h - pad.bottom - ((h - pad.top - pad.bottom) * v) / maxVal;

  const buildPath = (key: typeof keys[number]) => {
    let d = `M${toX(0)},${toY(data[0][key])}`;
    for (let i = 1; i < data.length; i++) d += ` L${toX(i)},${toY(data[i][key])}`;
    return d;
  };
  const buildArea = (key: typeof keys[number]) => buildPath(key) + ` L${toX(data.length - 1)},${h - pad.bottom} L${toX(0)},${h - pad.bottom} Z`;

  return (
    <div style={{ position: "relative" }}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = h - pad.bottom - (h - pad.top - pad.bottom) * pct;
          return (
            <g key={pct}>
              <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="var(--border)" strokeWidth={0.5} />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize={9}>{Math.round(maxVal * pct)}</text>
            </g>
          );
        })}
        {/* Month labels */}
        {data.map((d, i) => {
          const [y, m] = d.month.split("-");
          return <text key={i} x={toX(i)} y={h - 6} textAnchor="middle" fill="var(--muted)" fontSize={9}>{MONTH_NAMES[parseInt(m)]}</text>;
        })}
        {/* Lines */}
        {keys.map((k, i) => (
          <g key={k}>
            <path d={buildArea(k)} fill={colors[k]} fillOpacity={0.08} />
            <path d={buildPath(k)} fill="none" stroke={colors[k]} strokeWidth={2} />
            {/* Dots */}
            {data.map((d, j) => (
              <circle key={j} cx={toX(j)} cy={toY(d[k])} r={3} fill={colors[k]} stroke="var(--bg)" strokeWidth={1} />
            ))}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4 }}>
        {keys.map(k => (
          <span key={k} style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[k], display: "inline-block" }} />
            {labels[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

function PieChart({ data, nameKey, valueKey }: { data: (RoleCount | StatusCount)[]; nameKey: string; valueKey: string }) {
  const total = data.reduce((s, d) => s + (d as Record<string, number>)[valueKey], 0);
  if (total === 0) return <p style={{ color: "var(--muted)", padding: 40, textAlign: "center" }}>Geen data</p>;

  const size = 200; const cx = size / 2; const cy = size / 2; const r = 80;
  let angle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const val = (d as Record<string, number>)[valueKey];
    const pct = val / total;
    const sweep = pct * Math.PI * 2;
    const startAngle = angle;
    angle += sweep;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(startAngle + sweep);
    const y2 = cy + r * Math.sin(startAngle + sweep);
    const large = sweep > Math.PI ? 1 : 0;

    return { d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`, name: (d as Record<string, string>)[nameKey], val, pct, color: COLORS[i % COLORS.length], i };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map(s => (
          <path key={s.i} d={s.d} fill={s.color} stroke="var(--bg)" strokeWidth={2} />
        ))}
        <circle cx={cx} cy={cy} r={40} fill="var(--bg)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)" fontSize={16} fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--muted)" fontSize={10}>totaal</text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", justifyContent: "center", marginTop: 10 }}>
        {slices.map(s => (
          <span key={s.i} style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block", flexShrink: 0 }} />
            {LABELS[s.name] || s.name} ({s.val})
          </span>
        ))}
      </div>
    </div>
  );
}

// ===== Shared components =====

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" }}>
      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px 20px" }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</h3>
      {children}
    </div>
  );
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", ...style }}>{children}</th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "8px 12px", color: "var(--text)", ...style }}>{children}</td>;
}
