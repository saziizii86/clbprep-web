import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ID, Query } from "appwrite";
import {
  account,
  databases,
  DATABASE_ID,
  USERS_COLLECTION_ID,
  functions,
} from "../appwrite";
import { loadSessionsFromDB } from "../services/progressService";
import type { SessionRecord } from "./games/sessionTracker";
import {
  getContractByOrgId,
  createContractRequest,
  parseContractFormData,
  contractStatusLabel,
  contractStatusColor,
} from "../services/contractsService";
import type { OrgContract, OrgContractRequestData } from "../services/contractsService";
import ContractTemplate from "./ContractTemplate";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  ChevronLeft,
  Download,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Gamepad2,
  Loader2,
  Trash2,
  Upload,
  Users,
  UserPlus,
  FileCheck,
  FileText,
  X,
} from "lucide-react";

const PARTNER_ELIGIBILITY_COLLECTION_ID =
  (import.meta.env.VITE_PARTNER_ELIGIBILITY_COLLECTION_ID || "partner_eligibility").trim();
const PARTNER_GROUPS_COLLECTION_ID =
  (import.meta.env.VITE_PARTNER_GROUPS_COLLECTION_ID || "partner_groups").trim();
const ORG_CONTRACTS_COLLECTION_ID =
  (import.meta.env.VITE_ORG_CONTRACTS_COLLECTION_ID || "org_contracts").trim();

type Page = "dashboard" | "groups" | "learners" | "eligible" | "contract";
type AddMode = "single" | "bulk";
type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
type Meridiem = "AM" | "PM";

interface Group {
  $id: string;
  name: string;
  emoji: string;
  color: string;
  schedule: string;
  seats: number;
  desc?: string;
}

interface EligibleUser {
  $id: string;
  email: string;
  name?: string;
  status: "approved" | "claimed" | "inactive";
  groupId?: string;
  groupName?: string;
  addedAt?: string;
  claimedByUserId?: string;
  claimedAt?: string;
  lastLoginAt?: string;
  sessionCountMonth?: number;
}

interface Learner {
  $id: string;
  name?: string;
  email: string;
  partnerName?: string;
  groupName?: string;
  lastLoginAt?: string;
  sessionCountMonth?: number;
  subscriptionStatus?: string;
}

interface DayConfig {
  enabled: boolean;
  startHour: string;
  startMinute: string;
  startMeridiem: Meridiem;
  endHour: string;
  endMinute: string;
  endMeridiem: Meridiem;
}

const S = {
  navy: "#071b3a",
  navy2: "#0f2a52",
  navy3: "#173c72",
  blue: "#4a7cf3",
  indigo: "#5b56f0",
  green: "#22b15d",
  amber: "#f5a623",
  red: "#ef5350",
  violet: "#8a63f6",
  pink: "#eb4aa8",
  orange: "#f38a22",
  border: "#e7edf5",
  borderSoft: "#eef3f8",
  bg: "#f5f7fb",
  card: "#ffffff",
  text: "#132238",
  textSoft: "#6f7b8f",
  textFaint: "#9aa7b8",
  blueSoft: "#edf3ff",
  greenSoft: "#eafaf0",
  amberSoft: "#fff6dd",
  redSoft: "#fff0f0",
  violetSoft: "#f3eeff",
  pinkSoft: "#fff0f8",
  shadow: "0 8px 24px rgba(15,31,53,0.06)",
} as const;

const DAYS: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];
const GROUP_COLORS = ["#4a7cf3", "#8a63f6", "#22b15d", "#f59e0b", "#eb4aa8", "#ef6a3a"];
const EMOJIS = ["🏠", "📚", "☀️", "🌍", "💬", "🎯", "🏆", "🌱", "🤝", "⏰", "🌞", "🌙", "💻", "📖", "🎓"];
const titleFont = "'Sora', 'DM Sans', sans-serif";

const shellCard: React.CSSProperties = {
  background: S.card,
  border: `1px solid ${S.border}`,
  borderRadius: 18,
  boxShadow: S.shadow,
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  background: S.indigo,
  color: "#fff",
  fontSize: 13,
  fontWeight: 800,
  fontFamily: "inherit",
  cursor: "pointer",
};

const btnOutline: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 12,
  border: `1px solid ${S.border}`,
  background: "#fff",
  color: S.text,
  fontSize: 13,
  fontWeight: 800,
  fontFamily: "inherit",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: `1px solid ${S.border}`,
  outline: "none",
  background: "#fff",
  color: S.text,
  fontSize: 13,
  fontFamily: "inherit",
};

const textAreaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 90,
  padding: "12px 14px",
  borderRadius: 12,
  border: `1px solid ${S.border}`,
  outline: "none",
  background: "#fff",
  color: S.text,
  fontSize: 13,
  fontFamily: "inherit",
  resize: "vertical",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: S.text,
  marginBottom: 8,
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

function formatContractDate(value?: string): string {
  if (!value) return "—";
  const trimmed = String(value).trim();
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const t = new Date(trimmed).getTime();
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-CA", { timeZone: "UTC" });
}

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const safeNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const daysAgo = (iso?: string): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
};

const formatAgo = (iso?: string) => {
  const d = daysAgo(iso);
  if (d === null) return "—";
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
};

const initials = (name?: string, email?: string) => {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const makeDefaultDayConfigs = (): Record<DayKey, DayConfig> => ({
  Mon: { enabled: false, startHour: "6", startMinute: "00", startMeridiem: "PM", endHour: "8", endMinute: "00", endMeridiem: "PM" },
  Tue: { enabled: false, startHour: "6", startMinute: "00", startMeridiem: "PM", endHour: "8", endMinute: "00", endMeridiem: "PM" },
  Wed: { enabled: false, startHour: "6", startMinute: "00", startMeridiem: "PM", endHour: "8", endMinute: "00", endMeridiem: "PM" },
  Thu: { enabled: false, startHour: "6", startMinute: "00", startMeridiem: "PM", endHour: "8", endMinute: "00", endMeridiem: "PM" },
  Fri: { enabled: false, startHour: "6", startMinute: "00", startMeridiem: "PM", endHour: "8", endMinute: "00", endMeridiem: "PM" },
  Sat: { enabled: false, startHour: "6", startMinute: "00", startMeridiem: "PM", endHour: "8", endMinute: "00", endMeridiem: "PM" },
  Sun: { enabled: false, startHour: "6", startMinute: "00", startMeridiem: "PM", endHour: "8", endMinute: "00", endMeridiem: "PM" },
});

const formatClock = (hour: string, minute: string, meridiem: Meridiem) => `${hour}:${minute} ${meridiem}`;

const buildScheduleString = (configs: Record<DayKey, DayConfig>, note: string) => {
  const activeDays = DAYS.filter((day) => configs[day].enabled);
  const rows = activeDays.map((day) => {
    const row = configs[day];
    return `${day} ${formatClock(row.startHour, row.startMinute, row.startMeridiem)}–${formatClock(row.endHour, row.endMinute, row.endMeridiem)}`;
  });
  const summary = rows.join(" • ");
  const cleanNote = note.trim();
  if (summary && cleanNote) return `${summary} • ${cleanNote}`;
  if (summary) return summary;
  if (cleanNote) return cleanNote;
  return "Flexible";
};

const activityMeta = (iso?: string) => {
  const d = daysAgo(iso);
  if (d === null) return { label: "Unknown", dot: "#cbd5e1", bg: "#f8fafc", color: "#64748b" };
  if (d <= 2) return { label: "Active", dot: S.green, bg: S.greenSoft, color: "#1b8d4b" };
  if (d <= 6) return { label: "Warm", dot: S.blue, bg: S.blueSoft, color: "#325fd0" };
  return { label: "7d quiet", dot: S.amber, bg: S.amberSoft, color: "#b67c0d" };
};

const groupPill = (label?: string, color = S.blue) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, background: `${color}18`, color, border: `1px solid ${color}33` }}>
    <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: "inline-block" }} />
    {label || "No group"}
  </span>
);


type Range = "biweekly" | "monthly" | "yearly";

const DAILY_GOAL = 5;
const SKILLS = [
  { id: "listening", label: "Listening", color: "#3b82f6", icon: "🎧" },
  { id: "speaking", label: "Speaking", color: "#f97316", icon: "🗣️" },
  { id: "reading", label: "Reading", color: "#10b981", icon: "📖" },
  { id: "writing", label: "Writing", color: "#8b5cf6", icon: "✍️" },
  { id: "vocabulary", label: "Vocabulary", color: "#ec4899", icon: "📚" },
  { id: "grammar", label: "Grammar", color: "#f59e0b", icon: "📝" },
] as const;

const ACTIVITY_SKILL: Record<string, string> = {
  ws: "vocabulary", mg: "vocabulary", sb: "grammar", fb: "grammar",
  lp: "listening", dc: "speaking",
  listening: "listening", speaking: "speaking", reading: "reading",
  writing: "writing", vocabulary: "vocabulary", grammar: "grammar",
  pronunciation: "speaking", conversation: "speaking", "mistake-review": "grammar",
};

const ACTIVITY_COLORS: Record<string, string> = {
  ws: "#3b82f6", mg: "#9333ea", sb: "#16a34a", fb: "#f59e0b",
  lp: "#0d9488", dc: "#f43f5e",
  listening: "#3b82f6", speaking: "#f97316", reading: "#10b981",
  writing: "#8b5cf6", vocabulary: "#ec4899", grammar: "#d97706",
  pronunciation: "#ea580c", conversation: "#c2410c", "mistake-review": "#64748b",
};

const ACTIVITY_LABELS: Record<string, { label: string; type: "Game" | "Builder" }> = {
  ws: { label: "Word Search", type: "Game" }, mg: { label: "Matching Game", type: "Game" },
  sb: { label: "Sentence Builder", type: "Game" }, fb: { label: "Fill in the Blank", type: "Game" },
  lp: { label: "Listening Puzzle", type: "Game" }, dc: { label: "Dialogue", type: "Game" },
  listening: { label: "Listening Builder", type: "Builder" }, speaking: { label: "Speaking Builder", type: "Builder" },
  reading: { label: "Reading Builder", type: "Builder" }, writing: { label: "Writing Builder", type: "Builder" },
  vocabulary: { label: "Vocabulary Builder", type: "Builder" }, grammar: { label: "Grammar Builder", type: "Builder" },
  pronunciation: { label: "Pronunciation", type: "Builder" }, conversation: { label: "Conversation", type: "Builder" },
  "mistake-review": { label: "Mistake Review", type: "Builder" },
};


function activitySkillColor(activityId: string) {
  const skillId = ACTIVITY_SKILL[activityId] || activityId;
  return SKILLS.find((s) => s.id === skillId)?.color || ACTIVITY_COLORS[activityId] || "#94a3b8";
}

interface SkillMins { [key: string]: number }
interface ActMins { [key: string]: number }
interface BarEntry {
  label: string;
  isToday: boolean;
  sessions: number;
  skillMins: SkillMins;
  actMins: ActMins;
  actSessions: Record<string, number>;
  totalMins: number;
}

function localDateStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dateLabel(str: string, fmt: "short" | "week" | "month" = "short"): string {
  const d = new Date(`${str}T12:00:00`);
  if (fmt === "week") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (fmt === "month") return d.toLocaleDateString("en-US", { month: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function addDaysDate(base: string, n: number): string {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function calcSkillMins(recs: SessionRecord[]): SkillMins {
  const out: SkillMins = {};
  SKILLS.forEach((s) => { out[s.id] = 0; });
  recs.forEach((r: any) => {
    const sk = ACTIVITY_SKILL[r.activityId] ?? r.skill;
    if (sk in out) out[sk] += Math.round((Number(r.durationSeconds) || 0) / 60);
  });
  return out;
}
function calcActData(recs: SessionRecord[]): { actMins: ActMins; actSessions: Record<string, number> } {
  const actMins: ActMins = {};
  const actSessions: Record<string, number> = {};
  recs.forEach((r: any) => {
    const mins = Math.round((Number(r.durationSeconds) || 0) / 60);
    actMins[r.activityId] = (actMins[r.activityId] ?? 0) + mins;
    actSessions[r.activityId] = (actSessions[r.activityId] ?? 0) + 1;
  });
  return { actMins, actSessions };
}
function totalSkillMins(sm: SkillMins) {
  return Object.values(sm).reduce((a, b) => a + b, 0);
}
function buildBiweeklyBars(sessions: SessionRecord[]): BarEntry[] {
  const today = localDateStr();
  const byDate: Record<string, SessionRecord[]> = {};
  sessions.forEach((s: any) => { (byDate[s.date] = byDate[s.date] ?? []).push(s); });
  return Array.from({ length: 14 }, (_, i) => {
    const dt = addDaysDate(today, i - 13);
    const recs = byDate[dt] ?? [];
    const skillMins = calcSkillMins(recs);
    const { actMins, actSessions } = calcActData(recs);
    return { label: dateLabel(dt), isToday: dt === today, sessions: recs.length, skillMins, actMins, actSessions, totalMins: totalSkillMins(skillMins) };
  });
}
function buildWeeklyBars(sessions: SessionRecord[]): BarEntry[] {
  const today = localDateStr();
  const dow = new Date(`${today}T12:00:00`).getDay();
  const ws = addDaysDate(today, -(dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 5 }, (_, w) => {
    const start = addDaysDate(ws, -(4 - w) * 7);
    const end = addDaysDate(start, 6);
    const recs = sessions.filter((s: any) => s.date >= start && s.date <= end);
    const skillMins = calcSkillMins(recs);
    const { actMins, actSessions } = calcActData(recs);
    return { label: `${dateLabel(start, "week")}–${dateLabel(end, "week")}`, isToday: w === 4, sessions: recs.length, skillMins, actMins, actSessions, totalMins: totalSkillMins(skillMins) };
  });
}
function buildMonthlyBars(sessions: SessionRecord[]): BarEntry[] {
  const d = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const m = 11 - i;
    const dt = new Date(d.getFullYear(), d.getMonth() - m, 1);
    const yr = dt.getFullYear();
    const mo = dt.getMonth();
    const start = `${yr}-${String(mo + 1).padStart(2, "0")}-01`;
    const end = localDateStr(new Date(yr, mo + 1, 0));
    const recs = sessions.filter((s: any) => s.date >= start && s.date <= end);
    const skillMins = calcSkillMins(recs);
    const { actMins, actSessions } = calcActData(recs);
    return { label: dt.toLocaleDateString("en-US", { month: "short" }), isToday: m === 0, sessions: recs.length, skillMins, actMins, actSessions, totalMins: totalSkillMins(skillMins) };
  });
}
function arcPath(cx: number, cy: number, r: number, s: number, e: number): string {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(s));
  const y1 = cy + r * Math.sin(rad(s));
  const x2 = cx + r * Math.cos(rad(e));
  const y2 = cy + r * Math.sin(rad(e));
  return `M ${x1} ${y1} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}
function DonutChart({ sm }: { sm: SkillMins }) {
  const t = Object.values(sm).reduce((a, b) => a + b, 0);
  const S2 = 152, R = 54;
  if (t === 0) return (<svg width={S2} height={S2} viewBox={`0 0 ${S2} ${S2}`}><circle cx={S2/2} cy={S2/2} r={R} fill="none" stroke="#e5e7eb" strokeWidth="16" /><text x={S2/2} y={S2/2+5} textAnchor="middle" fontSize="12" fill="#9ca3af" fontWeight="600">No data</text></svg>);
  let start = 0;
  const slices = SKILLS.map((sk) => {
    const pct = (sm[sk.id] ?? 0) / t;
    const sweep = pct * 360;
    const path = sweep > 0.5 ? arcPath(S2/2, S2/2, R, start, start + sweep) : null;
    start += sweep;
    return { ...sk, pct, path };
  }).filter((s) => s.path);
  return (<svg width={S2} height={S2} viewBox={`0 0 ${S2} ${S2}`}>{slices.map((s) => (<path key={s.id} d={s.path!} fill="none" stroke={s.color} strokeWidth="16" strokeLinecap="butt"><title>{s.label}: {Math.round(sm[s.id] ?? 0)} min</title></path>))}<text x={S2/2} y={S2/2-4} textAnchor="middle" fontSize="18" fontWeight="900" fill="#1e293b">{t}</text><text x={S2/2} y={S2/2+15} textAnchor="middle" fontSize="12" fontWeight="600" fill="#64748b">min</text></svg>);
}
function StackedBarChart({ bars, colorKey, showActivityDetailsInSkillTooltip = false }: { bars: BarEntry[]; colorKey: "skill" | "activity"; showActivityDetailsInSkillTooltip?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ bar: BarEntry; x: number; y: number } | null>(null);
  const W = 640, H = 250;
  const maxTotal = Math.max(...bars.map((b) => b.totalMins), 1);
  const activities = useMemo(() => {
    const ids = new Set<string>();
    bars.forEach((b) => Object.keys(b.actMins).forEach((id) => ids.add(id)));
    return Array.from(ids);
  }, [bars]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = "100%"; canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
    const n = bars.length, padL = 12, padR = 12;
    const chartW = W - padL - padR, barW = Math.max(10, (chartW / n) * 0.6), gap = chartW / n, chartH = H - 42;
    bars.forEach((bar, i) => {
      const x = padL + i * gap + (gap - barW) / 2; let y = chartH;
      if (colorKey === "skill") {
        SKILLS.forEach((sk) => {
          const m = bar.skillMins[sk.id] ?? 0; if (!m) return;
          const bh = (m / maxTotal) * chartH; y -= bh; ctx.fillStyle = sk.color; ctx.beginPath();
          // @ts-ignore
          ctx.roundRect(x, y, barW, bh, [3,3,0,0]); ctx.fill();
        });
      } else {
        activities.forEach((aid) => {
          const m = bar.actMins[aid] ?? 0; if (!m) return;
          const bh = (m / maxTotal) * chartH; y -= bh; ctx.fillStyle = ACTIVITY_COLORS[aid] ?? "#94a3b8"; ctx.beginPath();
          // @ts-ignore
          ctx.roundRect(x, y, barW, bh, [3,3,0,0]); ctx.fill();
        });
      }
      if (bar.isToday) { ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 1.5; ctx.setLineDash([3,2]); ctx.strokeRect(x - 2, 2, barW + 4, chartH - 4); ctx.setLineDash([]); }
      if (bar.totalMins > 0) { const topY = chartH - (bar.totalMins / maxTotal) * chartH - 5; ctx.fillStyle = bar.isToday ? "#4f46e5" : "#64748b"; ctx.font = `${bar.isToday ? "700" : "600"} 10px system-ui`; ctx.textAlign = "center"; ctx.fillText(`${bar.totalMins}m`, x + barW / 2, Math.max(13, topY)); }
      ctx.fillStyle = bar.isToday ? "#4f46e5" : "#94a3b8"; ctx.font = `${bar.isToday ? "700" : "500"} 10px system-ui`; ctx.textAlign = "center"; ctx.fillText(bar.label, x + barW / 2, H - 10);
    });
    if (colorKey === "skill" && bars.length === 14) {
      ctx.beginPath(); ctx.strokeStyle = "rgba(99,102,241,0.55)"; ctx.lineWidth = 2; let started = false;
      bars.forEach((bar, i) => { if (i < 6) return; const avg = bars.slice(i-6, i+1).reduce((a, b) => a + b.totalMins, 0) / 7; const cx2 = padL + i * gap + gap / 2; const cy2 = chartH - (avg / maxTotal) * chartH; if (!started) { ctx.moveTo(cx2, cy2); started = true; } else ctx.lineTo(cx2, cy2); });
      ctx.stroke();
    }
  }, [bars, colorKey, activities, maxTotal]);

  const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); const mx = (e.clientX - rect.left) * (W / rect.width);
    const gap = (W - 24) / bars.length; const idx = Math.floor((mx - 12) / gap);
    if (idx < 0 || idx >= bars.length) { setTooltip(null); return; }
    setTooltip({ bar: bars[idx], x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 14 });
  }, [bars]);

  const tip = tooltip?.bar ?? null;
  const tipGames = tip ? activities.filter((a) => (tip.actMins[a] ?? 0) > 0 && ACTIVITY_LABELS[a]?.type === "Game") : [];
  const tipBldrs = tip ? activities.filter((a) => (tip.actMins[a] ?? 0) > 0 && ACTIVITY_LABELS[a]?.type === "Builder") : [];

  return (
    <div className="relative">
      <canvas ref={canvasRef} onMouseMove={handleMove} onMouseLeave={() => setTooltip(null)} style={{ cursor: "crosshair" }} />
      {tip && (
        <div
          className="pointer-events-none absolute z-20 text-white"
          style={{
            left: tooltip!.x,
            top: tooltip!.y,
            maxWidth: 320,
            minWidth: 250,
            fontSize: 12,
            background: "#07162f",
            borderRadius: 24,
            padding: "18px 20px",
            boxShadow: "0 18px 40px rgba(2,10,30,0.36)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 14, letterSpacing: "-0.01em" }}>
            {tip.label} — {tip.totalMins}m / {tip.sessions} session{tip.sessions !== 1 ? "s" : ""}
          </div>
          {colorKey === "skill" ? (
            showActivityDetailsInSkillTooltip ? (
              <>
                {tipGames.length > 0 && <>
                  <div className="text-white/40 text-[12px] font-black uppercase tracking-widest mb-2">Games used</div>
                  {tipGames.map((a) => (<div key={a} className="flex items-center gap-3 mb-2"><span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: activitySkillColor(a) }} /><span className="text-white flex-1">{ACTIVITY_LABELS[a]?.label ?? a}:</span><span className="font-extrabold">{tip.actSessions?.[a] ?? 1} · {tip.actMins[a]}m</span></div>))}
                </>}
                {tipBldrs.length > 0 && <>
                  <div className="text-white/40 text-[12px] font-black uppercase tracking-widest mt-4 mb-2">AI builders used</div>
                  {tipBldrs.map((a) => (<div key={a} className="flex items-center gap-3 mb-2"><span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: activitySkillColor(a) }} /><span className="text-white flex-1">{ACTIVITY_LABELS[a]?.label ?? a}:</span><span className="font-extrabold">{tip.actSessions?.[a] ?? 1} · {tip.actMins[a]}m</span></div>))}
                </>}
                {tipGames.length === 0 && tipBldrs.length === 0 && (
                  <div className="text-white/75">No game or AI builder details for this period.</div>
                )}
              </>
            ) : (
              <>
                {SKILLS.filter((s) => (tip.skillMins[s.id] ?? 0) > 0).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 mb-2"><span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: s.color }} /><span className="text-white flex-1">{s.label}:</span><span className="font-extrabold">{tip.skillMins[s.id]} min</span></div>
                ))}
              </>
            )
          ) : (
            <>
              {tipGames.length > 0 && <>
                <div className="text-white/40 text-[12px] font-black uppercase tracking-widest mb-2">Games</div>
                {tipGames.map((a) => (<div key={a} className="flex items-center gap-3 mb-2"><span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: activitySkillColor(a) }} /><span className="text-white flex-1">{ACTIVITY_LABELS[a]?.label ?? a}:</span><span className="font-extrabold">{tip.actSessions?.[a] ?? 1} · {tip.actMins[a]}m</span></div>))}
              </>}
              {tipBldrs.length > 0 && <>
                <div className="text-white/40 text-[12px] font-black uppercase tracking-widest mt-4 mb-2">Builders</div>
                {tipBldrs.map((a) => (<div key={a} className="flex items-center gap-3 mb-2"><span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: activitySkillColor(a) }} /><span className="text-white flex-1">{ACTIVITY_LABELS[a]?.label ?? a}:</span><span className="font-extrabold">{tip.actSessions?.[a] ?? 1} · {tip.actMins[a]}m</span></div>))}
              </>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
function LearnerRangeToggle({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (<div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">{(["biweekly", "monthly", "yearly"] as Range[]).map((r) => (<button key={r} onClick={() => onChange(r)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${value === r ? "bg-white shadow text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>{r === "biweekly" ? "Bi-weekly" : r === "monthly" ? "Monthly" : "Yearly"}</button>))}</div>);
}

/* ══════════════════════════════════════════════════════════════
   ContractRequestFlow — Quote → Register → Submit
   Rendered inside OrgPartnerAdmin when no contract exists yet
══════════════════════════════════════════════════════════════ */
const QUOTE_PLANS = [
  { key: "20",  label: "20 seats",  price: 240 },
  { key: "50",  label: "50 seats",  price: 525 },
  { key: "75",  label: "75 seats",  price: 750 },
  { key: "100", label: "100 seats", price: 999 },
];
const QUOTE_MONTHS = [
  { value: 1,  label: "1 month"  },
  { value: 3,  label: "3 months", discount: "Save 5%" },
  { value: 6,  label: "6 months", discount: "Save 8%" },
  { value: 12, label: "12 months",discount: "Save 12%" },
];
const DISCOUNT: Record<number, number> = { 1: 0, 3: 5, 6: 8, 12: 12 };

// Price per seat per month based on volume
// 15–49: $12.00 | 50–74: $10.50 | 75–99: $10.00 | 100+: $9.99
function pricePerSeat(seats: number): number {
  if (seats >= 100) return 9.99;
  if (seats >= 75)  return 10.00;
  if (seats >= 50)  return 10.50;
  return 12.00; // 15–49 seats
}

function calcMonthlyPrice(seats: number): number {
  return Math.round(pricePerSeat(seats) * seats);
}

function ContractRequestFlow({
  partnerName, orgUserId, adminName, onSubmitted,
  S, titleFont, inputStyle, btnPrimary, btnOutline,
}: {
  partnerName: string; orgUserId: string; adminName: string;
  onSubmitted: () => void;
  S: any; titleFont: string; inputStyle: any; btnPrimary: any; btnOutline: any;
}) {
  const [step, setStep] = React.useState<"quote" | "register">("quote");

  // Quote state
  const [plan,           setPlan]           = React.useState("20");
  const [customSeats,    setCustomSeats]    = React.useState<number | "">(20);
  const [months,         setMonths]         = React.useState(1);
  const [customDaysMode, setCustomDaysMode] = React.useState(false);
  const [customDays,     setCustomDays]     = React.useState<number | "">(30);
  const [seatsErr,       setSeatsErr]       = React.useState("");

  // Effective seat count — custom input overrides preset buttons
  const effectiveSeats = typeof customSeats === "number" && customSeats >= 15 ? customSeats : 25;
  // Snap plan key for downstream use
  const planKey = String(effectiveSeats);

  // Register state
  const [orgName,      setOrgName]      = React.useState(partnerName || "");
  const [orgAddress,   setOrgAddress]   = React.useState("");
  const [billingName,  setBillingName]  = React.useState(adminName || "");
  const [billingEmail, setBillingEmail] = React.useState("");
  const [invoiceEmail, setInvoiceEmail] = React.useState("");
  const [adminEmail,   setAdminEmail]   = React.useState("");
  const [startDate,    setStartDate]    = React.useState("");
  const [effectiveDate,setEffectiveDate]= React.useState("");
  const [term,         setTerm]         = React.useState("Monthly");
  const [autoRenew,    setAutoRenew]    = React.useState(false);
  const [billing,      setBilling]      = React.useState("Stripe invoice");
  const [notes,        setNotes]        = React.useState("");
  const [agreed,       setAgreed]       = React.useState(false);
  const [signerName,   setSignerName]   = React.useState(adminName || "");
  const [signerTitle,  setSignerTitle]  = React.useState("");
  const [signature,    setSignature]    = React.useState("");
  const [signedDate,   setSignedDate]   = React.useState("");
  const [submitting,   setSubmitting]   = React.useState(false);
  const [submitErr,    setSubmitErr]    = React.useState("");

  const disc        = customDaysMode ? 0 : (DISCOUNT[months] || 0);
  const baseMonthly = calcMonthlyPrice(effectiveSeats);
  const discounted  = Math.round(baseMonthly * (1 - disc / 100));
  const effectiveDays = customDaysMode ? (typeof customDays === "number" && customDays >= 1 ? customDays : 30) : months * 30;
  const dailyRate   = discounted / 30;
  const total       = customDaysMode
    ? Math.round(dailyRate * effectiveDays)
    : discounted * months;

  const handleSubmit = async () => {
    if (!agreed) { setSubmitErr("Please read and agree to the terms."); return; }
    if (!signerName.trim() || !signerTitle.trim() || !signature.trim() || !signedDate) {
      setSubmitErr("Please fill in all signature fields."); return;
    }
    if (!startDate) { setSubmitErr("Please set a start date."); return; }
    setSubmitting(true);
    setSubmitErr("");
    try {
      const termMonths = customDaysMode ? Math.ceil(effectiveDays / 30) : months;
      const termLabel  = customDaysMode ? `${effectiveDays} days` : (months === 1 ? "Monthly" : `${months} months`);
      const formData: OrgContractRequestData = {
        selectedPlan: planKey,
        selectedPlanPrice: discounted,
        months: termMonths,
        totalPrice: total,
        organizationName: orgName,
        organizationAddress: orgAddress,
        billingContactName: billingName,
        billingEmail,
        invoiceEmail: invoiceEmail || billingEmail,
        primaryAdminName: signerName,
        primaryAdminEmail: adminEmail || billingEmail,
        startDate,
        effectiveDate: effectiveDate || startDate,
        initialTerm: termLabel,
        autoRenew,
        billingMethod: billing,
        specialNotes: notes,
        orgSignedAt: signedDate,
        ...(customDaysMode ? { customDays: effectiveDays } : {}),
      } as OrgContractRequestData & { orgSignedAt: string; customDays?: number };
      await createContractRequest(orgUserId, orgName, formData, signerName, signerTitle, signature, signedDate);
      // Notify owner by email without blocking the submit flow
      try {
        void functions.createExecution(
          "69ae201700398cefccd9",
          JSON.stringify({
            to: "support@clbprep.com",
            name: "Soheila Azizi",
            email: "support@clbprep.com",
            feedbackType: `New Contract Request — ${orgName}`,
            message: [
              `Hello Soheila,`,
              ``,
              `A new contract request has been submitted by ${orgName}.`,
              ``,
              `Details:`,
              `  Organization: ${orgName}`,
              `  Plan: ${plan} seats — CAD $${discounted}/month`,
              `  Duration: ${months} month${months > 1 ? "s" : ""}`,
              `  Total: CAD $${total}`,
              `  Start Date: ${startDate}`,
              `  Signed by: ${signerName} (${signerTitle})`,
              ``,
              `Please log into your admin dashboard and review the contract under the Contracts tab.`,
              ``,
              `CLBPrep System`,
            ].join("\n"),
            attachments: "None",
          }),
          true
        ).catch((e) => console.warn("Email failed:", e));
      } catch (e) {
        console.warn("Email setup failed:", e);
      }

      await Promise.resolve(onSubmitted());
    } catch (e: any) {
      setSubmitErr(e?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Step 1: Quote ── */
  if (step === "quote") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#12284b)", borderRadius: 16, padding: "16px 22px", color: "white", display: "flex", alignItems: "center", gap: 14 }}>
        <FileCheck size={22} style={{ flexShrink: 0, opacity: 0.8 }} />
        <div>
          <div style={{ fontFamily: titleFont, fontSize: 14, fontWeight: 800, marginBottom: 3 }}>Request a Quote</div>
          <div style={{ fontSize: 11, opacity: .8, lineHeight: 1.6 }}>Select your seat plan and contract duration to see your pricing. If you're happy with the quote, you can proceed to register your contract.</div>
        </div>
      </div>

      {/* Plan selector */}
      <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, background: "#f8fafc" }}>
          <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text }}>1. Select Seats</div>
          <div style={{ fontSize: 11, color: S.textSoft, marginTop: 2 }}>Choose a common plan or enter any number (minimum 15)</div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          {/* Quick-select preset buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
            {QUOTE_PLANS.map(p => {
              const active = effectiveSeats === Number(p.key);
              return (
                <button key={p.key}
                  onClick={() => { setCustomSeats(Number(p.key)); setSeatsErr(""); }}
                  style={{
                    border: `2px solid ${active ? "#6366f1" : S.border}`,
                    borderRadius: 12, padding: "10px 8px", background: active ? "#eef2ff" : "#fff",
                    cursor: "pointer", textAlign: "center", transition: "all .15s",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14, color: active ? "#4338ca" : S.text }}>{p.key}</div>
                  <div style={{ fontSize: 10, color: S.textSoft, marginTop: 1 }}>seats</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: active ? "#4338ca" : S.text, marginTop: 4 }}>
                    ${p.price}<span style={{ fontSize: 10, fontWeight: 400, color: S.textSoft }}>/mo</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom seat input */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f8fafc", borderRadius: 12, border: `1px solid ${seatsErr ? "#fca5a5" : S.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.text, flexShrink: 0 }}>Custom seats:</div>
            <input
              type="number"
              min={15}
              max={10000}
              value={customSeats}
              onChange={e => {
                const val = e.target.value === "" ? "" : parseInt(e.target.value);
                setCustomSeats(val as number | "");
                if (typeof val === "number" && val < 15) {
                  setSeatsErr("Minimum 15 seats required");
                } else {
                  setSeatsErr("");
                }
              }}
              placeholder="e.g. 75"
              style={{ ...inputStyle, width: 100, textAlign: "center", fontWeight: 800, fontSize: 16 }}
            />
            <div style={{ fontSize: 12, color: S.textSoft }}>
              {typeof customSeats === "number" && customSeats >= 15
                ? <span style={{ color: "#16a34a", fontWeight: 700 }}>
                    ${pricePerSeat(customSeats).toFixed(2)}/seat · CAD ${calcMonthlyPrice(customSeats)}/month
                  </span>
                : <span style={{ color: S.textSoft }}>Enter a number ≥ 15</span>
              }
            </div>
          </div>
          {seatsErr && (
            <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, marginTop: 6, paddingLeft: 4 }}>⚠ {seatsErr}</div>
          )}

          {/* Pricing tiers info */}
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#f1f5f9", borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: S.textSoft, marginBottom: 6, letterSpacing: ".06em" }}>VOLUME PRICING</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11 }}>
              {[
                ["15–49",  "$12.00/seat"],
                ["50–74",  "$10.50/seat"],
                ["75–99",  "$10.00/seat"],
                ["100+",   "$9.99/seat"],
              ].map(([range, price]) => (
                <div key={range} style={{ color: S.textSoft }}>
                  <strong style={{ color: S.text }}>{range}</strong> · {price}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Duration selector */}
      <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, background: "#f8fafc" }}>
          <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text }}>2. Select Duration</div>
          <div style={{ fontSize: 11, color: S.textSoft, marginTop: 2 }}>Longer commitments get a discount</div>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
          {QUOTE_MONTHS.map(m => (
            <button key={m.value} onClick={() => { setMonths(m.value); setCustomDaysMode(false); }}
              style={{
                border: `2px solid ${!customDaysMode && months === m.value ? "#6366f1" : S.border}`,
                borderRadius: 14, padding: "12px 16px", background: !customDaysMode && months === m.value ? "#eef2ff" : "#fff",
                cursor: "pointer", textAlign: "left", transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: S.text }}>{m.label}</div>
              {m.discount && (
                <div style={{ fontSize: 10, fontWeight: 800, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 999 }}>{m.discount}</div>
              )}
            </button>
          ))}
          {/* Custom days button */}
          <button
            onClick={() => setCustomDaysMode(true)}
            style={{
              border: `2px solid ${customDaysMode ? "#6366f1" : S.border}`,
              borderRadius: 14, padding: "12px 16px", background: customDaysMode ? "#eef2ff" : "#fff",
              cursor: "pointer", textAlign: "left", transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "space-between",
              gridColumn: "1 / -1",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: S.text }}>Custom days</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", background: "#eef2ff", padding: "2px 8px", borderRadius: 999 }}>Flexible</div>
          </button>
          {customDaysMode && (
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 12, border: `1px solid ${S.border}` }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: S.text, whiteSpace: "nowrap" }}>Number of days:</label>
              <input
                type="number"
                min={1}
                max={730}
                value={customDays}
                onChange={e => setCustomDays(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))}
                style={{ ...inputStyle, width: 90, textAlign: "center", fontWeight: 700 }}
              />
              <span style={{ fontSize: 12, color: S.textSoft }}>
                ≈ {typeof customDays === "number" ? (customDays / 30).toFixed(1) : "—"} months · CAD ${typeof customDays === "number" ? Math.round(discounted / 30 * customDays) : 0} total
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quote summary */}
      <div style={{ background: "linear-gradient(135deg,#eef2ff,#f5f3ff)", border: "2px solid #c7d2fe", borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: "#3730a3", marginBottom: 14 }}>YOUR QUOTE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 0", fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 800, marginBottom: 3 }}>PLAN</div>
            <div style={{ fontWeight: 700, color: S.text }}>{effectiveSeats} seats</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 800, marginBottom: 3 }}>MONTHLY</div>
            <div style={{ fontWeight: 700, color: S.text }}>
              CAD ${discounted}
              {disc > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "#16a34a", fontWeight: 800 }}>({disc}% off)</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 800, marginBottom: 3 }}>DURATION</div>
            <div style={{ fontWeight: 700, color: S.text }}>{customDaysMode ? `${effectiveDays} days` : `${months} month${months > 1 ? "s" : ""}`}</div>
          </div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #c7d2fe", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 800 }}>TOTAL</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#3730a3" }}>CAD ${total}</div>
            <div style={{ fontSize: 11, color: "#6366f1" }}>for {customDaysMode ? `${effectiveDays} days` : `${months} month${months > 1 ? "s" : ""}`} · {effectiveSeats} seats</div>
          </div>
          <button
            onClick={() => {
              if (typeof customSeats !== "number" || customSeats < 15) {
                setSeatsErr("Minimum 15 seats required");
                return;
              }
              setStep("register");
            }}
            style={{ ...btnPrimary, padding: "14px 28px", fontSize: 14 }}
          >
            Proceed with this quote →
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Step 2: Register contract ── */
  const templateData = {
    organizationName: orgName, organizationAddress: orgAddress,
    billingContactName: billingName, billingEmail, invoiceEmail: invoiceEmail || billingEmail,
    primaryAdminName: signerName, primaryAdminEmail: adminEmail || billingEmail,
    selectedPlan: planKey, selectedPlanPrice: discounted,
    startDate, effectiveDate: effectiveDate || startDate,
    initialTerm: months === 1 ? "Monthly" : `${months} months`,
    autoRenew, billingMethod: billing,
    clbprepSignerName: "Soheila Azizi", clbprepSignerTitle: "Azizi Online Learning Services",
    specialNotes: notes,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Back to quote */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setStep("quote")} style={{ ...btnOutline, padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          ← Back to Quote
        </button>
        <div style={{ fontSize: 12, color: S.textSoft }}>
          Quote: <strong>{effectiveSeats} seats · {months} month{months > 1 ? "s" : ""} · CAD ${total}</strong>
        </div>
      </div>

      {/* Org info */}
      <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, background: "#f8fafc" }}>
          <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text }}>Organization Information</div>
          <div style={{ fontSize: 11, color: S.textSoft, marginTop: 2 }}>Fill in your organization's details for the contract</div>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { label: "Organization Legal Name *", val: orgName,      set: setOrgName,      span: 2 },
            { label: "Organization Address",       val: orgAddress,   set: setOrgAddress,   span: 2 },
            { label: "Billing Contact Name *",     val: billingName,  set: setBillingName   },
            { label: "Billing Email *",             val: billingEmail, set: setBillingEmail, type: "email" },
            { label: "Invoice Email",               val: invoiceEmail, set: setInvoiceEmail, type: "email" },
            { label: "Admin Email",                 val: adminEmail,   set: setAdminEmail,   type: "email" },
            { label: "Start Date *",                val: startDate,    set: setStartDate,    type: "date" },
            { label: "Effective Date",              val: effectiveDate,set: setEffectiveDate,type: "date" },
          ].map(({ label, val, set, span, type }) => (
            <div key={label} style={{ gridColumn: span === 2 ? "1 / -1" : undefined }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: S.text, display: "block", marginBottom: 5 }}>{label}</label>
              <input type={type || "text"} value={val} onChange={e => set(e.target.value)}
                style={{ ...inputStyle, width: "100%" }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: S.text, display: "block", marginBottom: 5 }}>Billing Method</label>
            <select value={billing} onChange={e => setBilling(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
              <option>Stripe invoice</option>
              <option>Stripe payment link</option>
              <option>Bank transfer</option>
              <option>Other</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
            <input type="checkbox" id="crf-autorenew" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)}
              style={{ accentColor: S.blue, width: 15, height: 15 }} />
            <label htmlFor="crf-autorenew" style={{ fontSize: 12, color: S.text, cursor: "pointer" }}>Auto-renew at end of term</label>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: S.text, display: "block", marginBottom: 5 }}>Special Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Any additional requests or notes…"
              style={{ ...inputStyle, width: "100%", resize: "vertical" }} />
          </div>
        </div>
      </div>

      {/* Full contract to read */}
      <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, background: "#f8fafc" }}>
          <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text }}>Service Agreement</div>
          <div style={{ fontSize: 11, color: S.textSoft, marginTop: 2 }}>Read the full contract below before agreeing and signing</div>
        </div>
        <div style={{ padding: "24px 28px", maxHeight: 500, overflowY: "auto", borderBottom: `1px solid ${S.border}` }}>
          <ContractTemplate
            data={templateData}
            mode="preview"
            orgSignerName={signerName}
            orgSignerTitle={signerTitle}
            orgSignature={signature}
            orgSignedAt={signedDate}
          />
        </div>

        {/* Agreement checkbox */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}` }}>
          <label style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "14px 16px",
            background: agreed ? "#f0fdf4" : "#f8fafc",
            border: `2px solid ${agreed ? "#4ade80" : S.border}`,
            borderRadius: 12, cursor: "pointer", transition: "all .15s",
          }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, accentColor: "#16a34a", width: 16, height: 16, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: S.text, marginBottom: 3 }}>
                I have read and agree to the full Service Agreement above
              </div>
              <div style={{ fontSize: 12, color: S.textSoft, lineHeight: 1.6 }}>
                I confirm I am authorized to enter into this agreement on behalf of <strong>{orgName || "my organization"}</strong> and accept all terms including payment obligations and cancellation policy.
              </div>
            </div>
          </label>
        </div>

        {/* Signature — visible only after agreeing */}
        {agreed && (
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text, marginBottom: 14 }}>Your Signature</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[
                { label: "Full Name *",              val: signerName,   set: setSignerName },
                { label: "Title / Role *",            val: signerTitle,  set: setSignerTitle },
                { label: "Electronic Signature *",    val: signature,    set: setSignature,  italic: true },
                { label: "Date *",                    val: signedDate,   set: setSignedDate, type: "date" },
              ].map(({ label, val, set, type, italic }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: S.text, display: "block", marginBottom: 5 }}>{label}</label>
                  <input type={type || "text"} value={val} onChange={e => set(e.target.value)}
                    placeholder={label.includes("Signature") ? "Type your full legal name" : undefined}
                    style={{ ...inputStyle, width: "100%", ...(italic ? { fontStyle: "italic", fontFamily: "Georgia, serif" } : {}) }} />
                </div>
              ))}
            </div>

            {submitErr && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, fontSize: 12, color: "#dc2626", fontWeight: 600, marginBottom: 14 }}>
                ⚠ {submitErr}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ ...btnPrimary, opacity: submitting ? 0.7 : 1, padding: "12px 28px", fontSize: 13 }}>
                {submitting ? "Submitting…" : "Submit Contract to CLBPrep →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrgPartnerAdmin() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [adminName, setAdminName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [contractSeats, setContractSeats] = useState(0);
  const [orgUserId, setOrgUserId] = useState("");
  const [contract,        setContract]        = useState<OrgContract | null>(null);
  const [pendingRenewal,  setPendingRenewal]  = useState<OrgContract | null>(null);
  const [allContracts,    setAllContracts]    = useState<OrgContract[]>([]);
  const [contractLoading, setContractLoading] = useState(false);
  const [showContractRequestFlow, setShowContractRequestFlow] = useState(false);
  const contractPdfRef = useRef<HTMLDivElement>(null);
  const [authErr, setAuthErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState<Page>("dashboard");
  const [groups, setGroups] = useState<Group[]>([]);
  const [eligible, setEligible] = useState<EligibleUser[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [selectedLearnerSessions, setSelectedLearnerSessions] = useState<SessionRecord[]>([]);
  const [selectedLearnerSessionsLoading, setSelectedLearnerSessionsLoading] = useState(false);
  const [learnerSkillRange, setLearnerSkillRange] = useState<Range>("biweekly");
  const [learnerActivityRange, setLearnerActivityRange] = useState<Range>("biweekly");
  const [selectedEligible, setSelectedEligible] = useState<EligibleUser | null>(null);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [showAssign, setShowAssign] = useState<EligibleUser | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const [formErr, setFormErr] = useState("");
  const [addMode, setAddMode] = useState<AddMode>("single");
  const [addEmail, setAddEmail] = useState("");
  const [addBulk, setAddBulk] = useState("");
  const [addName, setAddName] = useState("");
  const [addGroupId, setAddGroupId] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [assignGroupId, setAssignGroupId] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupEmoji, setNewGroupEmoji] = useState("🏠");
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [newGroupSeats, setNewGroupSeats] = useState(20);
  const [newGroupScheduleNote, setNewGroupScheduleNote] = useState("");
  const [newGroupDays, setNewGroupDays] = useState<Record<DayKey, DayConfig>>(makeDefaultDayConfigs());

  useEffect(() => {
    (async () => {
      try {
        const me = await account.get();
        const userRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
          Query.equal("email", me.email.toLowerCase()),
          Query.limit(1),
        ]);
        if (!userRes.documents.length) throw new Error("User record not found.");
        const doc = userRes.documents[0] as any;
        if (doc.role !== "partner_org_admin") throw new Error("Access denied.");
        if (!doc.partnerName) throw new Error("No partnerName assigned to this account.");
        setAdminName(doc.name || me.name || "Partner Admin");
        setPartnerName(doc.partnerName);
        setContractSeats(safeNumber(doc.contractSeats ?? doc.seatLimit ?? doc.partnerSeats ?? 0));
        setOrgUserId(doc.$id || me.$id);
      } catch (e: any) {
        setAuthErr(e?.message || "Unauthorized");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadGroups = useCallback(async () => {
    if (!partnerName) return;
    const res = await databases.listDocuments(DATABASE_ID, PARTNER_GROUPS_COLLECTION_ID, [
      Query.equal("partnerName", partnerName),
      Query.limit(500),
    ]);
    setGroups(res.documents as unknown as Group[]);
  }, [partnerName]);

  const loadEligible = useCallback(async () => {
    if (!partnerName) return;
    const res = await databases.listDocuments(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, [
      Query.equal("partnerName", partnerName),
      Query.limit(1000),
    ]);
    setEligible(res.documents as unknown as EligibleUser[]);
  }, [partnerName]);

  const loadLearners = useCallback(async () => {
    if (!partnerName) return;

    const claimedEligible = eligible.filter((u) => u.status === "claimed" && u.email);
    const claimedEmails = Array.from(
      new Set(
        claimedEligible
          .map((u) => normalizeEmail(u.email || ""))
          .filter(Boolean)
      )
    );

    if (!claimedEmails.length) {
      setLearners([]);
      return;
    }

    const eligibleByEmail = new Map(
      claimedEligible.map((u) => [normalizeEmail(u.email || ""), u])
    );

    const chunks: string[][] = [];
    for (let i = 0; i < claimedEmails.length; i += 100) {
      chunks.push(claimedEmails.slice(i, i + 100));
    }

    const docs: any[] = [];
    for (const chunk of chunks) {
      const res = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
        Query.equal("email", chunk),
        Query.limit(1000),
      ]);
      docs.push(...res.documents);
    }

    const onlyLearners = docs
      .filter((u: any) => {
        const role = String(u.role || "").toLowerCase();
        return !["admin", "partner_admin", "partner_org_admin"].includes(role);
      })
      .map((u: any) => {
        const emailKey = normalizeEmail(u.email || "");
        const elig = eligibleByEmail.get(emailKey);
        return {
          ...u,
          groupName: elig?.groupName || u.groupName || "",
          partnerName: partnerName,
        };
      });

    setLearners(onlyLearners as unknown as Learner[]);
  }, [partnerName, eligible]);

  const loadContractRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!partnerName || !orgUserId) return;
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    setPage("contract");

    if (checkout === "success") {
      const sessionId = searchParams.get("session_id") || "";
      const STRIPE_FUNCTION_ID = (import.meta.env.VITE_APPWRITE_STRIPE_FUNCTION_ID || "").trim();

      (async () => {
        if (sessionId && STRIPE_FUNCTION_ID) {
          try {
            await functions.createExecution(
              STRIPE_FUNCTION_ID,
              JSON.stringify({ sessionId }),
              false,
              "/verify-org-payment",
              "POST"
            );
          } catch (e) {
            console.error("verify-org-payment failed:", e);
          }
        }
        await loadContractRef.current();
      })();
    }
  }, [partnerName, orgUserId, searchParams]);

  useEffect(() => {
    if (!partnerName) return;
    loadGroups();
    loadEligible();
  }, [partnerName, loadGroups, loadEligible]);

  useEffect(() => {
    if (!partnerName) return;
    loadLearners();
  }, [partnerName, eligible, loadLearners]);

  const exportCSV = (headers: string[], rows: string[][], filename: string) => {
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    showToast("CSV downloaded.");
  };

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 3200);
  };

  const refreshAll = async () => {
    try {
      const jobs: Promise<any>[] = [loadGroups(), loadEligible(), loadLearners()];
      if (orgUserId) jobs.push(loadContract());
      await Promise.all(jobs);
      showToast("Refreshed.");
    } catch (e: any) {
      showToast(e?.message || "Refresh failed.", false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    try {
      // Remove groupName from all eligible users in this group
      const members = eligible.filter(u => u.groupName === group.name);
      await Promise.all(members.map(u =>
        databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, u.$id, {
          groupName: null,
          updatedAt: new Date().toISOString(),
        })
      ));
      // Delete the group document
      await databases.deleteDocument(DATABASE_ID, PARTNER_GROUPS_COLLECTION_ID, group.$id);
      await Promise.all([loadGroups(), loadEligible()]);
      setGroupToDelete(null);
      setSelectedGroup(null);
      showToast(`Group "${group.name}" deleted.`);
    } catch (e: any) {
      showToast(e?.message || "Failed to delete group.", false);
    }
  };

  const handleChangePassword = async () => {
    setPwErr("");
    if (!pwCurrent || !pwNew) { setPwErr("Please fill in all fields."); return; }
    if (pwNew.length < 8) { setPwErr("New password must be at least 8 characters."); return; }
    if (pwNew !== pwConfirm) { setPwErr("New passwords don't match."); return; }
    setPwLoading(true);
    try {
      await account.updatePassword(pwNew, pwCurrent);
      setShowChangePassword(false);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      showToast("Password updated successfully.");
    } catch (e: any) {
      setPwErr(e?.message || "Failed to update password. Check your current password.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = async () => {
    await account.deleteSession("current").catch(() => undefined);
    nav("/");
  };

  const resetCreateForm = () => {
    setNewGroupName("");
    setNewGroupDesc("");
    setNewGroupEmoji("🏠");
    setNewGroupColor(GROUP_COLORS[0]);
    setNewGroupSeats(20);
    setNewGroupScheduleNote("");
    setNewGroupDays(makeDefaultDayConfigs());
    setFormErr("");
  };

  const openAddModal = (presetGroupId: string | null = null) => {
    setShowAddEmail(true);
    setAddMode("single");
    setAddEmail("");
    setAddBulk("");
    setAddName("");
    setAddGroupId(presetGroupId);
    setFormErr("");
  };

  const handleCreateGroup = async () => {
    setFormErr("");
    if (!newGroupName.trim()) {
      setFormErr("Group name is required.");
      return;
    }

    const currentReservedSeats = groups.reduce((sum, g) => sum + safeNumber(g.seats), 0);
    if (contractSeats > 0 && currentReservedSeats + safeNumber(newGroupSeats) > contractSeats) {
      setFormErr(`This group would exceed the contract. Available seats left: ${Math.max(contractSeats - currentReservedSeats, 0)}.`);
      return;
    }

    const schedule = buildScheduleString(newGroupDays, newGroupScheduleNote);

    try {
      await databases.createDocument(DATABASE_ID, PARTNER_GROUPS_COLLECTION_ID, ID.unique(), {
        partnerName,
        name: newGroupName.trim(),
        desc: newGroupDesc.trim() || "",
        emoji: newGroupEmoji,
        color: newGroupColor,
        seats: newGroupSeats,
        schedule,
        updatedAt: new Date().toISOString(),
      });
      await loadGroups();
      setShowCreateGroup(false);
      resetCreateForm();
      showToast("Group created.");
    } catch (e: any) {
      setFormErr(e?.message || "Failed to create group.");
    }
  };

  const getExistingUserByEmail = async (email: string) => {
    const userRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
      Query.equal("email", email),
      Query.limit(1),
    ]);
    return (userRes.documents[0] as any) || null;
  };

  const activateExistingUser = async (existingUser: any, groupName?: string | null) => {
    await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, existingUser.$id, {
      subscriptionStatus: "active",
      subscriptionPlan: "partner",
      subscriptionSource: "partner",
      partnerName,
    });
  };

  const parseBulkEmails = (raw: string) =>
    raw
      .split(/[\n,;]+/)
      .map(normalizeEmail)
      .filter(Boolean);

  const handleAddEmails = async () => {
    setFormErr("");
    setAddLoading(true);
    try {
      const emails = addMode === "single" ? [normalizeEmail(addEmail)].filter(Boolean) : parseBulkEmails(addBulk);
      if (!emails.length) {
        setFormErr("No valid emails found.");
        setAddLoading(false);
        return;
      }

      const selectedGroup = addGroupId ? groups.find((g) => g.$id === addGroupId) || null : null;
      let added = 0;
      let reactivated = 0;
      let skipped = 0;
      let invalid = 0;

      for (const email of emails) {
        if (!emailRegex.test(email)) {
          invalid += 1;
          continue;
        }

        const existingEligible = eligible.find((u) => normalizeEmail(u.email || "") === email);
        const existingUser = await getExistingUserByEmail(email);
        const nameValue = addMode === "single" ? addName.trim() || null : null;

        if (existingEligible && existingEligible.status !== "inactive") {
          skipped += 1;
          continue;
        }

        if (existingEligible && existingEligible.status === "inactive") {
          await databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, existingEligible.$id, {
            status: existingUser ? "claimed" : "approved",
            groupName: selectedGroup?.name || null,
            claimedByUserId: existingUser?.$id || null,
            claimedAt: existingUser ? new Date().toISOString() : null,
            updatedAt: new Date().toISOString(),
          });

          if (existingUser) {
            await activateExistingUser(existingUser, selectedGroup?.name || null);
          }

          reactivated += 1;
          continue;
        }

        await databases.createDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, ID.unique(), {
          partnerName,
          email,
          status: existingUser ? "claimed" : "approved",
          groupName: selectedGroup?.name || null,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          claimedByUserId: existingUser?.$id || null,
          claimedAt: existingUser ? new Date().toISOString() : null,
        });

        if (existingUser) {
          await activateExistingUser(existingUser, selectedGroup?.name || null);
        }

        added += 1;
      }

      await Promise.all([loadEligible(), loadLearners()]);
      setShowAddEmail(false);
      setAddEmail("");
      setAddBulk("");
      setAddName("");
      setAddGroupId(null);

      const parts = [
        added ? `${added} added` : "",
        reactivated ? `${reactivated} reactivated` : "",
        skipped ? `${skipped} skipped` : "",
        invalid ? `${invalid} invalid` : "",
      ].filter(Boolean);

      showToast(parts.length ? parts.join(" • ") : "Nothing changed.");
    } catch (e: any) {
      setFormErr(e?.message || "Failed to add email(s).");
    } finally {
      setAddLoading(false);
    }
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = String(ev.target?.result || "");
      const emails = parseBulkEmails(raw).filter((x) => x.includes("@"));
      setAddMode("bulk");
      setAddBulk(emails.join("\n"));
      setShowAddEmail(true);
      setFormErr("");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAssignGroup = async () => {
    if (!showAssign) return;
    try {
      const group = assignGroupId ? groups.find((g) => g.$id === assignGroupId) || null : null;
      await databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, showAssign.$id, {
        groupName: group?.name || null,
        updatedAt: new Date().toISOString(),
      });
      const learnerRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
        Query.equal("email", showAssign.email),
        Query.limit(1),
      ]);
      // groupName is tracked in partner_eligibility only (Users collection has no groupName column yet)
      await Promise.all([loadEligible(), loadLearners()]);
      setShowAssign(null);
      showToast("Group assignment saved.");
    } catch (e: any) {
      showToast(e?.message || "Failed to assign group.", false);
    }
  };

  const handleDeactivate = async (u: EligibleUser) => {
    if (!window.confirm(`Deactivate ${u.email}? Access will be removed immediately.`)) return;
    try {
      await databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, u.$id, {
        status: "inactive",
        groupName: null,
        updatedAt: new Date().toISOString(),
      });
      const learnerRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
        Query.equal("email", u.email),
        Query.limit(1),
      ]);
      if (learnerRes.documents.length) {
        await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, learnerRes.documents[0].$id, {
          subscriptionStatus: "inactive",
          subscriptionPlan: "basic",
          subscriptionSource: null,
        });
      }
      await Promise.all([loadEligible(), loadLearners()]);
      showToast(`${u.email} deactivated.`);
    } catch (e: any) {
      showToast(e?.message || "Failed to deactivate.", false);
    }
  };

  const handleReactivate = async (u: EligibleUser) => {
    try {
      const existingUser = await getExistingUserByEmail(normalizeEmail(u.email));
      await databases.updateDocument(DATABASE_ID, PARTNER_ELIGIBILITY_COLLECTION_ID, u.$id, {
        status: existingUser ? "claimed" : "approved",
        claimedByUserId: existingUser?.$id || null,
        claimedAt: existingUser ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      });
      if (existingUser) await activateExistingUser(existingUser, u.groupName || null);
      await Promise.all([loadEligible(), loadLearners()]);
      showToast("Learner reactivated.");
    } catch (e: any) {
      showToast(e?.message || "Failed to reactivate.", false);
    }
  };

  const loadContract = useCallback(async () => {
    if (!orgUserId) return;
    setContractLoading(true);
    try {
      // Fetch ALL contracts for this org and pick by priority:
      // paid > pending_payment > pending_admin > pending_org > expired > cancelled
      const STATUS_PRIORITY: Record<string, number> = {
        paid:            0,
        pending_payment: 1,
        pending_admin:   2,
        pending_org:     3,
        expired:         4,
        cancelled:       5,
      };
      let docs: any[] = [];

      // Try by orgId first
      const byOrgId = await databases.listDocuments(DATABASE_ID, ORG_CONTRACTS_COLLECTION_ID, [
        Query.equal("orgId", orgUserId),
        Query.orderDesc("$createdAt"),
        Query.limit(50),
      ]);
      docs = byOrgId.documents;

      // Fallback: query by partnerName if orgId returned nothing
      if (!docs.length && partnerName) {
        const byPartner = await databases.listDocuments(DATABASE_ID, ORG_CONTRACTS_COLLECTION_ID, [
          Query.equal("orgName", partnerName),
          Query.orderDesc("$createdAt"),
          Query.limit(50),
        ]);
        docs = byPartner.documents;
      }

      const res = { documents: docs };
      if (!res.documents.length) {
        setContract(null);
        return;
      }
      const sorted = [...res.documents].sort((a: any, b: any) => {
        const pa = STATUS_PRIORITY[a.status] ?? 99;
        const pb = STATUS_PRIORITY[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
        // Same priority → newest first
        return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
      });
      setContract(sorted[0] as unknown as OrgContract);
      setAllContracts(sorted as unknown as OrgContract[]);

      // If the top contract is paid, check if there's also a pending renewal
      const top = sorted[0] as any;
      if (top.status === "paid") {
        const renewal = sorted.find((c: any) =>
          ["pending_admin", "pending_org", "pending_payment"].includes(c.status)
        );
        setPendingRenewal(renewal ? renewal as unknown as OrgContract : null);
      } else {
        setPendingRenewal(null);
      }
    } catch (e) {
      console.error("Failed to load contract:", e);
      // Fallback to contractsService if direct query fails
      try {
        const doc = await getContractByOrgId(orgUserId);
        setContract(doc);
        setAllContracts(doc ? [doc] : []);
      } catch {}
    } finally {
      setContractLoading(false);
    }
  }, [orgUserId]);

  // Keep ref in sync so the checkout useEffect (defined earlier) can call it safely
  useEffect(() => { loadContractRef.current = loadContract; }, [loadContract]);

  useEffect(() => {
    if (orgUserId) loadContract();
  }, [orgUserId, loadContract]);

  useEffect(() => {
    if (!contract) {
      return;
    }
    setShowContractRequestFlow(false);
    if (contract.status !== "pending_payment") {
    }
  }, [contract?.$id, contract?.status, contract]);

  const openContractPdfWindow = useCallback((autoPrint = false) => {
    const html = contractPdfRef.current?.innerHTML;
    if (!html) {
      window.alert("Contract preview is not ready yet.");
      return;
    }

    const fullHtml = `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>CLBPrep Organization Contract</title>
          <style>
            html, body { margin: 0; padding: 0; background: #ffffff; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #132238; }
            * { box-sizing: border-box; }
            @page { size: auto; margin: 18mm; }
            @media print {
              html, body { background: #ffffff; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>${html}</body>
      </html>`;

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "width=1100,height=900");

    if (!win) {
      URL.revokeObjectURL(url);
      window.alert("Please allow pop-ups to open the contract PDF view.");
      return;
    }

    const cleanup = () => {
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    };

    if (autoPrint) {
      const tryPrint = () => {
        try {
          win.focus();
          win.print();
        } finally {
          cleanup();
        }
      };

      win.addEventListener("load", tryPrint, { once: true });
      window.setTimeout(tryPrint, 900);
      return;
    }

    cleanup();
  }, []);

  const startStripeCheckout = useCallback(async (currentContract: OrgContract) => {
    try {
      const currentFd = parseContractFormData(currentContract);
      const STRIPE_FUNCTION_ID = (import.meta.env.VITE_APPWRITE_STRIPE_FUNCTION_ID || "").trim();

      if (!STRIPE_FUNCTION_ID) {
        window.alert("Stripe function ID is missing in your production environment.");
        return;
      }

      const execution = await functions.createExecution(
        STRIPE_FUNCTION_ID,
        JSON.stringify({
          contractId: currentContract.$id,
          orgId: orgUserId,
          orgName: currentFd?.organizationName || partnerName,
          seats: currentFd?.selectedPlan,
          totalPrice: currentFd?.totalPrice,
          months: currentFd?.months || 1,
          email: currentFd?.primaryAdminEmail || currentFd?.billingEmail || "",
        }),
        false,
        "/create-org-checkout",
        "POST"
      );

      let result: any = {};
      try {
        result = JSON.parse(execution.responseBody || "{}");
      } catch {
        result = {};
      }

      if (result.url) {
        window.location.assign(result.url);
        return;
      }

      console.error("Stripe checkout did not return a URL.", {
        responseStatusCode: execution.responseStatusCode,
        responseBody: execution.responseBody,
      });
      window.alert("Could not start checkout. The Stripe function did not return a checkout URL.");
    } catch (e: any) {
      console.error("Stripe checkout error:", e);
      window.alert("Checkout failed: " + (e?.message || "Please try again."));
    }
  }, [orgUserId, partnerName]);

  const renderContractDocumentPanel = useCallback((currentContract: OrgContract, options?: {
    title?: string;
    note?: string;
    previewLabel?: string;
  }) => {
    const currentFd = parseContractFormData(currentContract);
    const templateData = {
      ...currentFd,
      clbprepSignerName: currentContract.adminSignerName || "Soheila Azizi",
      clbprepSignerTitle: currentContract.adminSignerTitle || "Owner",
    };

    return (
      <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${S.border}`, background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text }}>
              {options?.title || "Contract Document"}
            </div>
            <div style={{ fontSize: 11, color: S.textSoft, marginTop: 3 }}>
              {options?.note || "Open the contract in a PDF-style window or print/save it as PDF."}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => openContractPdfWindow(false)} style={btnOutline}>
              <FolderOpen size={14} /> {options?.previewLabel || "View PDF"}
            </button>
            <button type="button" onClick={() => openContractPdfWindow(true)} style={btnPrimary}>
              <Download size={14} /> Download / Print PDF
            </button>
          </div>
        </div>
        <div style={{ maxHeight: 560, overflowY: "auto", padding: "24px 28px" }}>
          <div ref={contractPdfRef}>
            <ContractTemplate
              data={templateData as any}
              mode="signed"
              orgSignerName={currentContract.orgSignerName}
              orgSignerTitle={currentContract.orgSignerTitle}
              orgSignature={currentContract.orgSignature}
              orgSignedAt={currentContract.orgSignedAt}
              adminSignerName={currentContract.adminSignerName || "Soheila Azizi"}
              adminSignerTitle={currentContract.adminSignerTitle || "Owner"}
              adminApprovedAt={currentContract.adminApprovedAt}
            />
          </div>
        </div>
      </div>
    );
  }, [btnOutline, btnPrimary, openContractPdfWindow]);

  const openPage = (next: Page) => {
    setPage(next);
    setSearch("");
    setStatusFilter("all");
    setGroupFilter("all");
    if (next !== "groups") setSelectedGroup(null);
    if (next !== "learners") setSelectedLearner(null);
    if (next !== "eligible") setSelectedEligible(null);
  };

  const activeEligibleCount = useMemo(() => eligible.filter((u) => u.status !== "inactive").length, [eligible]);

  const stats = useMemo(() => {
    const activeThisWeek = learners.filter((u) => {
      const d = daysAgo(u.lastLoginAt);
      return d !== null && d <= 6;
    }).length;

    const lessActive = learners.filter((u) => {
      const d = daysAgo(u.lastLoginAt);
      return d !== null && d >= 7;
    }).length;

    const totalSessions = learners.reduce((sum, u) => sum + safeNumber(u.sessionCountMonth), 0);
    const avgSessions = learners.length ? Number((totalSessions / learners.length).toFixed(1)) : 0;
    const reservedSeats = groups.reduce((sum, g) => sum + safeNumber(g.seats), 0);
    const availableSeats = Math.max(contractSeats - reservedSeats, 0);
    const activeClaimedSeats = eligible.filter((u) => u.status === "claimed").length;
    const seatUtilization = contractSeats ? Math.round((reservedSeats / contractSeats) * 100) : 0;

    return {
      activeThisWeek,
      lessActive,
      totalSessions,
      avgSessions,
      reservedSeats,
      availableSeats,
      activeClaimedSeats,
      seatUtilization,
    };
  }, [contractSeats, eligible, groups, learners]);

  const groupCards = useMemo(() => {
    return groups.map((g) => {
      const members = eligible.filter((u) => u.groupName === g.name && u.status !== "inactive");
      const learnerRows = learners.filter((u) => u.groupName === g.name);
      const activeThisWeek = learnerRows.filter((u) => {
        const d = daysAgo(u.lastLoginAt);
        return d !== null && d <= 6;
      }).length;
      const lessActive = learnerRows.filter((u) => {
        const d = daysAgo(u.lastLoginAt);
        return d !== null && d >= 7;
      }).length;
      const totalSessions = learnerRows.reduce((sum, row) => sum + safeNumber(row.sessionCountMonth), 0);
      const pct = g.seats ? Math.min(100, Math.round((members.length / g.seats) * 100)) : 0;
      return { group: g, members, learnerRows, activeThisWeek, lessActive, totalSessions, pct };
    });
  }, [eligible, groups, learners]);

  const selectedGroupCard = useMemo(() => {
    if (!selectedGroup) return null;
    return groupCards.find((x) => x.group.$id === selectedGroup.$id) || null;
  }, [groupCards, selectedGroup]);

  const sortedLearners = useMemo(() => {
    return [...learners].sort((a, b) => (daysAgo(a.lastLoginAt) ?? 999) - (daysAgo(b.lastLoginAt) ?? 999));
  }, [learners]);

  const attentionLearners = useMemo(() => sortedLearners.filter((u) => (daysAgo(u.lastLoginAt) ?? -1) >= 7).slice(0, 6), [sortedLearners]);

  const filteredLearners = useMemo(() => {
    return learners.filter((u) => {
      const query = search.trim().toLowerCase();
      if (query) {
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        if (!name.includes(query) && !email.includes(query)) return false;
      }
      if (statusFilter === "active") {
        const d = daysAgo(u.lastLoginAt);
        if (d === null || d > 6) return false;
      }
      if (statusFilter === "less-active") {
        const d = daysAgo(u.lastLoginAt);
        if (d === null || d < 7) return false;
      }
      if (groupFilter !== "all") {
        if (groupFilter === "none") return !u.groupName;
        const g = groups.find((x) => x.$id === groupFilter);
        if (g && u.groupName !== g.name) return false;
      }
      return true;
    });
  }, [groups, groupFilter, learners, search, statusFilter]);

  const filteredEligible = useMemo(() => {
    return eligible.filter((u) => {
      const query = search.trim().toLowerCase();
      if (query) {
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        if (!name.includes(query) && !email.includes(query)) return false;
      }
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (groupFilter !== "all") {
        if (groupFilter === "none") return !u.groupName;
        const fg = groups.find((g) => g.$id === groupFilter);
        return fg ? u.groupName === fg.name : false;
      }
      return true;
    });
  }, [eligible, groupFilter, search, statusFilter]);

  const selectedEligibleRegisteredUser = useMemo(() => {
    if (!selectedEligible) return null;
    return learners.find((u) => normalizeEmail(u.email || "") === normalizeEmail(selectedEligible.email || "")) || null;
  }, [learners, selectedEligible]);

  const selectedEligibleGroupColor = useMemo(() => {
    if (!selectedEligible?.groupName) return S.blue;
    return groups.find((g) => g.name === selectedEligible.groupName)?.color || S.blue;
  }, [groups, selectedEligible]);

  const selectedLearnerGroupColor = useMemo(() => {
    if (!selectedLearner?.groupName) return S.blue;
    return groups.find((g) => g.name === selectedLearner.groupName)?.color || S.blue;
  }, [groups, selectedLearner]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedLearner?.$id) {
        setSelectedLearnerSessions([]);
        return;
      }
      setSelectedLearnerSessionsLoading(true);
      setLearnerSkillRange("biweekly");
      setLearnerActivityRange("biweekly");
      try {
        const dbSessions = await loadSessionsFromDB(selectedLearner.$id);
        if (!cancelled) setSelectedLearnerSessions(Array.isArray(dbSessions) ? dbSessions : []);
      } catch {
        if (!cancelled) setSelectedLearnerSessions([]);
      } finally {
        if (!cancelled) setSelectedLearnerSessionsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [selectedLearner?.$id]);

  const learnerToday = useMemo(() => localDateStr(), []);
  const learnerYesterday = useMemo(() => addDaysDate(localDateStr(), -1), []);
  const selectedTodayRecs = useMemo(() => selectedLearnerSessions.filter((s: any) => s.date === learnerToday), [selectedLearnerSessions, learnerToday]);
  const selectedYesterdayRecs = useMemo(() => selectedLearnerSessions.filter((s: any) => s.date === learnerYesterday), [selectedLearnerSessions, learnerYesterday]);
  const selectedTodaySkillMins = useMemo(() => calcSkillMins(selectedTodayRecs), [selectedTodayRecs]);
  const selectedYesterdaySkillMins = useMemo(() => calcSkillMins(selectedYesterdayRecs), [selectedYesterdayRecs]);
  const selectedTodayTotalMins = useMemo(() => totalSkillMins(selectedTodaySkillMins), [selectedTodaySkillMins]);
  const selectedTodaySessionCount = useMemo(() => selectedTodayRecs.length, [selectedTodayRecs]);
  const selectedBiweeklyBars = useMemo(() => buildBiweeklyBars(selectedLearnerSessions), [selectedLearnerSessions]);
  const selectedWeeklyBars = useMemo(() => buildWeeklyBars(selectedLearnerSessions), [selectedLearnerSessions]);
  const selectedMonthlyBars = useMemo(() => buildMonthlyBars(selectedLearnerSessions), [selectedLearnerSessions]);
  const selectedSkillBars = useMemo(() => learnerSkillRange === "biweekly" ? selectedBiweeklyBars : learnerSkillRange === "monthly" ? selectedWeeklyBars : selectedMonthlyBars, [learnerSkillRange, selectedBiweeklyBars, selectedWeeklyBars, selectedMonthlyBars]);
  const selectedActivityBars = useMemo(() => learnerActivityRange === "biweekly" ? selectedBiweeklyBars : learnerActivityRange === "monthly" ? selectedWeeklyBars : selectedMonthlyBars, [learnerActivityRange, selectedBiweeklyBars, selectedWeeklyBars, selectedMonthlyBars]);
  const selectedActiveActivities = useMemo(() => {
    const ids = new Set<string>();
    selectedLearnerSessions.forEach((s: any) => ids.add(s.activityId));
    return Array.from(ids);
  }, [selectedLearnerSessions]);
  const selectedTotalSessionsAllTime = useMemo(() => selectedLearnerSessions.length, [selectedLearnerSessions]);
  const selectedThisWeekSessions = useMemo(() => {
    const today = localDateStr();
    const start = addDaysDate(today, -6);
    return selectedLearnerSessions.filter((s: any) => s.date >= start && s.date <= today).length;
  }, [selectedLearnerSessions]);
  const selectedThisMonthMins = useMemo(() => {
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    return selectedLearnerSessions.filter((s: any) => s.date >= start).reduce((sum: number, s: any) => sum + Math.round((Number(s.durationSeconds) || 0) / 60), 0);
  }, [selectedLearnerSessions]);
  const cohortAvgMinutes = useMemo(() => {
    const vals = learners.map((u) => safeNumber(u.sessionCountMonth));
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [learners]);
  const ringCirc = useMemo(() => 2 * Math.PI * 32, []);
  const ringOffset = useMemo(() => ringCirc * (1 - Math.min(selectedTodaySessionCount / DAILY_GOAL, 1)), [ringCirc, selectedTodaySessionCount]);

  const cohortMaxMonthlySessions = useMemo(
    () => learners.reduce((max, u) => Math.max(max, safeNumber(u.sessionCountMonth)), 0),
    [learners]
  );

  const cohortAvgMonthlySessions = useMemo(
    () => (learners.length ? Number((learners.reduce((sum, u) => sum + safeNumber(u.sessionCountMonth), 0) / learners.length).toFixed(1)) : 0),
    [learners]
  );

  const selectedDays = useMemo(() => DAYS.filter((day) => newGroupDays[day].enabled), [newGroupDays]);
  const schedulePreview = useMemo(() => buildScheduleString(newGroupDays, newGroupScheduleNote), [newGroupDays, newGroupScheduleNote]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: S.bg }}>
        <div style={{ width: 42, height: 42, borderRadius: 999, border: `4px solid ${S.blueSoft}`, borderTopColor: S.blue, animation: "spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin {to {transform: rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (authErr) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: S.bg, padding: 24 }}>
        <div style={{ ...shellCard, width: "100%", maxWidth: 460, padding: 28, textAlign: "center" }}>
          <AlertCircle style={{ width: 40, height: 40, color: S.red, margin: "0 auto 12px" }} />
          <div style={{ fontFamily: titleFont, fontSize: 22, fontWeight: 900, color: S.text, marginBottom: 8 }}>Access error</div>
          <div style={{ fontSize: 14, color: S.textSoft, lineHeight: 1.7 }}>{authErr}</div>
          <div style={{ marginTop: 18 }}>
            <button onClick={() => nav("/")} style={btnPrimary}>Back to login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", color: S.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Sora:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        .opa-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .opa-scroll::-webkit-scrollbar-thumb { background: #dbe3ef; border-radius: 99px; }
        .opa-hover-card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .opa-hover-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(15,31,53,0.09); border-color: #d5dfee; }
        .opa-nav:hover { background: rgba(255,255,255,.07) !important; color: rgba(255,255,255,.96) !important; }
      `}</style>

      <aside style={{ width: 212, background: S.navy, color: "#fff", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "22px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontFamily: titleFont, fontSize: 20, fontWeight: 900, marginBottom: 8 }}>CLBPrep</div>
          <span style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, color: "#9cd2ff", background: "rgba(74,124,243,.18)" }}>
            {partnerName || "Partner"}
          </span>
        </div>

        <div style={{ padding: "18px 10px", display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", opacity: 0.3, padding: "0 8px 8px" }}>ANALYTICS</div>
          {[
            { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
            { id: "groups", label: "Groups", icon: <FolderOpen size={16} /> },
            { id: "learners", label: "All Learners", icon: <Users size={16} /> },
          ].map((item) => {
            const active = page === item.id || (item.id === "groups" && !!selectedGroup && page === "groups") || (item.id === "learners" && !!selectedLearner && page === "learners");
            return (
              <button
                key={item.id}
                onClick={() => openPage(item.id as Page)}
                className="opa-nav"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "none",
                  background: active ? "rgba(74,124,243,.22)" : "transparent",
                  color: active ? "#beddff" : "rgba(255,255,255,.62)",
                  borderRadius: 12,
                  padding: "11px 12px",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ width: 18, display: "inline-flex", justifyContent: "center" }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", opacity: 0.3, padding: "16px 8px 8px" }}>ACCESS</div>
          <button
            onClick={() => openPage("eligible")}
            className="opa-nav"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "none",
              background: page === "eligible" ? "rgba(74,124,243,.22)" : "transparent",
              color: page === "eligible" ? "#beddff" : "rgba(255,255,255,.62)",
              borderRadius: 12,
              padding: "11px 12px",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ width: 18, display: "inline-flex", justifyContent: "center" }}><Mail size={16} /></span>
            Eligible Users
          </button>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", opacity: 0.3, padding: "16px 8px 8px" }}>CONTRACT</div>
          <button
            onClick={() => openPage("contract")}
            className="opa-nav"
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              border: "none",
              background: page === "contract" ? "rgba(74,124,243,.22)" : "transparent",
              color: page === "contract" ? "#beddff" : "rgba(255,255,255,.62)",
              borderRadius: 12, padding: "11px 12px", fontSize: 14, fontWeight: 700,
              fontFamily: "inherit", cursor: "pointer", textAlign: "left", position: "relative",
            }}
          >
            <span style={{ width: 18, display: "inline-flex", justifyContent: "center" }}><FileCheck size={16} /></span>
            Contract
            {contract?.status === "pending_org" && (
              <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
            )}
          </button>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", opacity: 0.3, padding: "16px 8px 8px" }}>REPORTS</div>
          <button
            onClick={() => setPage("reports" as any)}
            className="opa-nav"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "none",
              background: page === "reports" ? "rgba(99,102,241,.22)" : "transparent",
              color: page === "reports" ? "#a5b4fc" : "rgba(255,255,255,.62)",
              borderRadius: 12,
              padding: "11px 12px",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ width: 18, display: "inline-flex", justifyContent: "center" }}><FileText size={16} /></span>
            Export Reports
          </button>
        </div>

        <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 999, background: S.blue, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 900 }}>{initials(adminName)}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,.92)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adminName}</div>
              <div style={{ fontSize: 11, opacity: 0.42 }}>Partner Admin</div>
            </div>
          </div>
          <button onClick={() => { setPwErr(""); setPwCurrent(""); setPwNew(""); setPwConfirm(""); setShowChangePassword(true); }} className="opa-nav" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", color: "rgba(255,255,255,.5)", borderRadius: 12, padding: "9px 12px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
            🔑 Change password
          </button>
          <button onClick={handleLogout} className="opa-nav" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", color: "rgba(255,255,255,.62)", borderRadius: 12, padding: "11px 12px", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto" }}>
        <div style={{ background: "#fff", borderBottom: `1px solid ${S.border}`, padding: "16px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {page === "groups" && selectedGroup && <button onClick={() => setSelectedGroup(null)} style={{ ...btnOutline, padding: "8px 12px" }}><ChevronLeft size={15} /> Back</button>}
            {page === "learners" && selectedLearner && <button onClick={() => setSelectedLearner(null)} style={{ ...btnOutline, padding: "8px 12px" }}><ChevronLeft size={15} /> Back</button>}
            {page === "eligible" && selectedEligible && <button onClick={() => setSelectedEligible(null)} style={{ ...btnOutline, padding: "8px 12px" }}><ChevronLeft size={15} /> Back</button>}
            <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 800, color: S.text }}>
              {page === "dashboard" && "Partner Dashboard"}
              {page === "groups" && !selectedGroup && "Groups"}
              {page === "groups" && selectedGroup && selectedGroup.name}
              {page === "learners" && !selectedLearner && "Learner Activity"}
              {page === "learners" && selectedLearner && (selectedLearner.name || selectedLearner.email)}
              {page === "eligible" && !selectedEligible && "Eligible Users"}
              {page === "eligible" && selectedEligible && (selectedEligible.name || selectedEligible.email)}
              {(page as any) === "reports" && "Export Reports"}
              {page === "contract" && "Organization Contract"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={refreshAll} style={btnOutline}><RefreshCw size={15} /> Refresh</button>
            {(page === "eligible" || page === "dashboard") && <button onClick={() => fileInputRef.current?.click()} style={btnOutline}><Upload size={15} /> Import CSV</button>}
            {page === "groups" && !selectedGroup && <button onClick={() => { setShowCreateGroup(true); setFormErr(""); }} style={btnPrimary}><Plus size={15} /> New Group</button>}
            {page === "groups" && selectedGroup && <button onClick={() => openAddModal(selectedGroup.$id)} style={btnPrimary}><Plus size={15} /> Add Learners</button>}
            {page === "learners" && <button onClick={() => openAddModal(selectedLearner?.groupName ? groups.find((g) => g.name === selectedLearner.groupName)?.$id || null : null)} style={btnPrimary}><Plus size={15} /> Add Learner</button>}
            {page === "eligible" && <button onClick={() => openAddModal(null)} style={btnPrimary}><Plus size={15} /> Add Email</button>}
          </div>
        </div>

        <div style={{ padding: 24, display: "grid", gap: 20 }}>
          {page === "dashboard" && (
            <>
              <div style={{ ...shellCard, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, background: "linear-gradient(135deg,#203d66,#12284b)", color: "#fff", border: "none" }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>🏢</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: titleFont, fontSize: 14, fontWeight: 800, marginBottom: 3 }}>Organizational billing is active</div>
                  <div style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.84 }}>
                    {partnerName} pays for seats at the partner level. Contract seats come from the partner_org_admin user record, while reserved seats come from the sum of group seat allocations.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10, marginTop: 12 }}>
                    {[
                      { label: "Contracted", value: contractSeats || 0 },
                      { label: "Reserved", value: stats.reservedSeats || 0 },
                      { label: "Available", value: stats.availableSeats || 0 },
                      { label: "Active Claimed", value: stats.activeClaimedSeats || 0 },
                    ].map((item) => (
                      <div key={item.label} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.72, textTransform: "uppercase", letterSpacing: ".06em" }}>{item.label}</div>
                        <div style={{ fontFamily: titleFont, fontSize: 22, fontWeight: 900, marginTop: 4 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
                {[
                  { label: "Active This Week", value: stats.activeThisWeek, color: S.green },
                  { label: "Less Active", value: stats.lessActive, color: S.red },
                  { label: "Reserved Seats", value: stats.reservedSeats, color: S.blue },
                  { label: "Available Seats", value: stats.availableSeats, color: S.violet },
                ].map((item) => (
                  <div key={item.label} style={{ ...shellCard, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", insetInline: 0, top: 0, height: 4, background: item.color }} />
                    <div style={{ fontSize: 11, fontWeight: 800, color: S.textSoft, marginBottom: 8 }}>{item.label}</div>
                    <div style={{ fontFamily: titleFont, fontSize: 30, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.35fr .95fr", gap: 18 }}>
                <div style={{ ...shellCard, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>Groups Overview</div>
                      <div style={{ fontSize: 12, color: S.textSoft, marginTop: 4 }}>Live member counts, seats, and activity from your org collections.</div>
                    </div>
                    <button onClick={() => openPage("groups")} style={{ ...btnOutline, padding: "8px 12px" }}>Open groups</button>
                  </div>

                  {!groupCards.length ? (
                    <div style={{ padding: 24, borderRadius: 16, border: `1px dashed ${S.border}`, textAlign: "center", color: S.textSoft }}>
                      No groups yet. Create your first group to organize learners.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
                      {groupCards.map(({ group, members, activeThisWeek, lessActive, pct }) => (
                        <div key={group.$id} style={{ position: "relative" }}>
                          <button
                            onClick={() => { setSelectedGroup(group); setPage("groups"); }}
                            className="opa-hover-card"
                            style={{ ...shellCard, padding: 16, textAlign: "left", cursor: "pointer", fontFamily: "inherit", position: "relative", overflow: "hidden", width: "100%" }}
                          >
                            <div style={{ position: "absolute", insetInline: 0, top: 0, height: 4, background: group.color }} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${group.color}18`, color: group.color, display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>{group.emoji}</div>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 900, color: group.color }}>{members.length}/{group.seats}</div>
                                  <div style={{ fontSize: 10, color: S.textSoft, fontWeight: 700 }}>seats used</div>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setGroupToDelete(group); }}
                                  style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#fee2e2", color: S.red, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 2 }}
                                  title="Delete group"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>{group.name}</div>
                            <div style={{ fontSize: 12, color: S.textSoft, lineHeight: 1.5, marginTop: 6 }}>{group.desc || "No description"}</div>
                            <div style={{ fontSize: 12, color: group.color, fontWeight: 700, marginTop: 6 }}>{group.schedule}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
                              {[
                                { label: "Active", value: activeThisWeek, color: S.green },
                                { label: "Less active", value: lessActive, color: lessActive ? S.red : S.green },
                                { label: "Fill", value: `${pct}%`, color: group.color },
                              ].map((stat) => (
                                <div key={stat.label} style={{ background: "#f8fbff", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                                  <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                                  <div style={{ fontSize: 10, color: S.textSoft, fontWeight: 700, marginTop: 2 }}>{stat.label}</div>
                                </div>
                              ))}
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ ...shellCard, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>Attention Needed</div>
                      <div style={{ fontSize: 12, color: S.textSoft, marginTop: 4 }}>Learners with no activity for 7 days or more.</div>
                    </div>
                  </div>

                  {!attentionLearners.length ? (
                    <div style={{ padding: 24, borderRadius: 16, background: S.greenSoft, color: "#1b8d4b", fontWeight: 700, fontSize: 13 }}>All current learners are active within the last 7 days.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {attentionLearners.map((learner) => {
                        const meta = activityMeta(learner.lastLoginAt);
                        return (
                          <button key={learner.$id} onClick={() => { setSelectedLearner(learner); setPage("learners"); }} style={{ background: "#fffdf5", border: `1px solid #f5deb1`, borderRadius: 16, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 999, background: S.violet, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 12 }}>{initials(learner.name, learner.email)}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: S.text }}>{learner.name || learner.email}</div>
                                <div style={{ fontSize: 12, color: S.textSoft }}>{formatAgo(learner.lastLoginAt)} • {safeNumber(learner.sessionCountMonth)} sessions this month</div>
                              </div>
                            </div>
                            <span style={{ padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 800, fontSize: 11 }}>{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ ...shellCard, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>All Learners — Live Activity View</div>
                    <div style={{ fontSize: 12, color: S.textSoft, marginTop: 4 }}>This table uses real learner fields only: email, groupName, lastLoginAt, sessionCountMonth, and subscriptionStatus.</div>
                  </div>
                  <button onClick={() => openPage("learners")} style={{ ...btnOutline, padding: "8px 12px" }}>Open learner page</button>
                </div>
                <div style={{ overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#fafcff" }}>
                        {["Learner", "Engagement", "Group", "Sessions (month)", "Last Active", "Subscription"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: S.textSoft, letterSpacing: ".05em", textTransform: "uppercase", fontWeight: 800, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!sortedLearners.length && <tr><td colSpan={6} style={{ padding: 28, textAlign: "center", color: S.textSoft }}>No learners found yet.</td></tr>}
                      {sortedLearners.slice(0, 10).map((learner) => (
                        <tr key={learner.$id} style={{ borderBottom: `1px solid ${S.borderSoft}` }}>
                          <td style={{ padding: "12px 14px" }}>
                            <button onClick={() => { setSelectedLearner(learner); setPage("learners"); }} style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", cursor: "pointer", padding: 0, fontFamily: "inherit", textAlign: "left" }}>
                              <div style={{ width: 34, height: 34, borderRadius: 999, background: S.blue, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 12 }}>{initials(learner.name, learner.email)}</div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: S.text }}>{learner.name || "—"}</div>
                                <div style={{ fontSize: 12, color: S.textSoft }}>{learner.email}</div>
                              </div>
                            </button>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            {(() => {
                              const meta = activityMeta(learner.lastLoginAt);
                              return <span style={{ padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 800, fontSize: 11 }}>{meta.label}</span>;
                            })()}
                          </td>
                          <td style={{ padding: "12px 14px" }}>{learner.groupName ? groupPill(learner.groupName, groups.find((g) => g.name === learner.groupName)?.color || S.blue) : <span style={{ fontSize: 12, color: S.textSoft }}>—</span>}</td>
                          <td style={{ padding: "12px 14px", fontWeight: 800 }}>{safeNumber(learner.sessionCountMonth)}</td>
                          <td style={{ padding: "12px 14px", color: S.textSoft }}>{formatAgo(learner.lastLoginAt)}</td>
                          <td style={{ padding: "12px 14px", color: S.textSoft }}>{learner.subscriptionStatus || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {page === "groups" && !selectedGroup && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
                {[
                  { label: "Total Groups", value: groups.length, color: S.blue },
                  { label: "Total Learners", value: activeEligibleCount, color: S.violet },
                  { label: "Active This Week", value: stats.activeThisWeek, color: S.green },
                  { label: "Less Active", value: stats.lessActive, color: S.red },
                ].map((item) => (
                  <div key={item.label} style={{ ...shellCard, padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: S.textSoft, marginBottom: 8 }}>{item.label}</div>
                    <div style={{ fontFamily: titleFont, fontSize: 32, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 18 }}>
                {groupCards.map(({ group, members, activeThisWeek, lessActive, totalSessions, pct }) => (
                  <button
                    key={group.$id}
                    onClick={() => setSelectedGroup(group)}
                    className="opa-hover-card"
                    style={{ ...shellCard, padding: 20, textAlign: "left", cursor: "pointer", fontFamily: "inherit", position: "relative", overflow: "hidden" }}
                  >
                    <div style={{ position: "absolute", insetInline: 0, top: 0, height: 4, background: group.color }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: `${group.color}18`, color: group.color, display: "grid", placeItems: "center", fontSize: 22 }}>{group.emoji}</div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: titleFont, fontSize: 22, fontWeight: 900, color: group.color }}>{members.length}/{group.seats}</div>
                        <div style={{ fontSize: 10, color: S.textSoft, fontWeight: 700 }}>seats used</div>
                        <div style={{ fontSize: 11, color: group.color, fontWeight: 800, marginTop: 2 }}>{pct}% full</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 800 }}>{group.name}</div>
                    <div style={{ fontSize: 13, color: S.textSoft, lineHeight: 1.55, marginTop: 6 }}>{group.desc || "No description"}</div>
                    <div style={{ fontSize: 12, color: group.color, fontWeight: 800, marginTop: 8 }}>{group.schedule}</div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 16 }}>
                      {[
                        { label: "Active", value: activeThisWeek, color: S.green },
                        { label: "Less active", value: lessActive, color: lessActive ? S.red : S.green },
                        { label: "Sessions", value: totalSessions, color: S.blue },
                      ].map((item) => (
                        <div key={item.label} style={{ background: "#f8fbff", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                          <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 900, color: item.color }}>{item.value}</div>
                          <div style={{ fontSize: 10, color: S.textSoft, fontWeight: 700, marginTop: 2 }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}

                <button onClick={() => { setShowCreateGroup(true); setFormErr(""); }} className="opa-hover-card" style={{ ...shellCard, border: `1.5px dashed ${S.border}`, padding: 20, minHeight: 244, display: "grid", placeItems: "center", textAlign: "center", cursor: "pointer", fontFamily: "inherit" }}>
                  <div>
                    <div style={{ fontSize: 42, color: S.textFaint, lineHeight: 1, marginBottom: 10 }}>＋</div>
                    <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Create New Group</div>
                    <div style={{ fontSize: 13, color: S.textSoft, lineHeight: 1.6, maxWidth: 220 }}>Organize learners into morning class, evening class, online, or custom groups.</div>
                  </div>
                </button>
              </div>
            </>
          )}

          {page === "groups" && selectedGroupCard && (
            <>
              <div style={{ ...shellCard, padding: 22, background: "linear-gradient(135deg,#223f69,#173357)", color: "#fff", border: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 62, height: 62, borderRadius: 18, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", fontSize: 32 }}>{selectedGroupCard.group.emoji}</div>
                    <div>
                      <div style={{ fontFamily: titleFont, fontSize: 28, fontWeight: 900 }}>{selectedGroupCard.group.name}</div>
                      <div style={{ fontSize: 13, opacity: 0.82, marginTop: 6 }}>{selectedGroupCard.group.desc || "No description"}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                        <span style={{ padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.12)", fontSize: 12, fontWeight: 800 }}>{selectedGroupCard.group.schedule}</span>
                        <span style={{ padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.12)", fontSize: 12, fontWeight: 800 }}>{selectedGroupCard.members.length} / {selectedGroupCard.group.seats} seats learners</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => openAddModal(selectedGroupCard.group.$id)} style={{ ...btnOutline, background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.18)" }}><Plus size={15} /> Add Learners</button>
                    <button onClick={() => setGroupToDelete(selectedGroupCard.group)} style={{ ...btnOutline, background: "rgba(239,68,68,.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.25)" }}><Trash2 size={15} /> Delete Group</button>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
                {[
                  { label: "Active This Week", value: selectedGroupCard.activeThisWeek, color: S.green },
                  { label: "Less Active", value: selectedGroupCard.lessActive, color: S.red },
                  { label: "Sessions This Month", value: selectedGroupCard.totalSessions, color: S.blue },
                  { label: "Seat Fill", value: `${selectedGroupCard.pct}%`, color: selectedGroupCard.group.color },
                ].map((item) => (
                  <div key={item.label} style={{ ...shellCard, padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: S.textSoft, marginBottom: 8 }}>{item.label}</div>
                    <div style={{ fontFamily: titleFont, fontSize: 30, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...shellCard, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>Learners in this Group</div>
                    <div style={{ fontSize: 12, color: S.textSoft, marginTop: 4 }}>No hardcoded skill or recent-session data here — only real learner fields from the org database.</div>
                  </div>
                </div>
                <div style={{ overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#fafcff" }}>
                        {["Learner", "Status", "Sessions (month)", "Last Active", "Subscription"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: S.textSoft, letterSpacing: ".05em", textTransform: "uppercase", fontWeight: 800, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedGroupCard.members.length && <tr><td colSpan={5} style={{ padding: 28, textAlign: "center", color: S.textSoft }}>No learners are assigned to this group yet.</td></tr>}
                      {selectedGroupCard.members.map((member) => {
                        // Find matching user doc for activity data (may be null if not registered)
                        const learner = learners.find((u) => u.email === member.email);
                        const meta = activityMeta(learner?.lastLoginAt);
                        return (
                          <tr key={member.$id} style={{ borderBottom: `1px solid ${S.borderSoft}` }}>
                            <td style={{ padding: "12px 14px" }}>
                              <button onClick={() => { if (learner) { setSelectedLearner(learner); setPage("learners"); } }} style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", cursor: learner ? "pointer" : "default", padding: 0, fontFamily: "inherit", textAlign: "left" }}>
                                <div style={{ width: 34, height: 34, borderRadius: 999, background: selectedGroupCard.group.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 12 }}>{initials(learner?.name || "", member.email)}</div>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: 13, color: S.text }}>{learner?.name || member.email}</div>
                                  <div style={{ fontSize: 12, color: S.textSoft }}>{member.email}</div>
                                </div>
                              </button>
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              {learner
                                ? <span style={{ padding: "4px 10px", borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 800, fontSize: 11 }}>{meta.label}</span>
                                : <span style={{ padding: "4px 10px", borderRadius: 999, background: "#f1f5f9", color: "#64748b", fontWeight: 800, fontSize: 11 }}>Not registered</span>}
                            </td>
                            <td style={{ padding: "12px 14px", fontWeight: 800 }}>{safeNumber(learner?.sessionCountMonth)}</td>
                            <td style={{ padding: "12px 14px", color: S.textSoft }}>{formatAgo(learner?.lastLoginAt)}</td>
                            <td style={{ padding: "12px 14px", color: S.textSoft }}>{learner?.subscriptionStatus || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {page === "learners" && (
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, minHeight: "calc(100vh - 170px)" }}>
              <div style={{ ...shellCard, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: 16, borderBottom: `1px solid ${S.border}` }}>
                  <div style={{ position: "relative", marginBottom: 10 }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: 13, color: S.textFaint }} />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search learner..." style={{ ...inputStyle, paddingLeft: 36, background: "#f8fbff" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                    {[
                      ["all", "All"],
                      ["active", "Active"],
                      ["less-active", "Less active"],
                    ].map(([value, label]) => (
                      <button key={value} onClick={() => setStatusFilter(value)} style={{ height: 34, borderRadius: 10, border: "none", background: statusFilter === value ? S.violetSoft : "transparent", color: statusFilter === value ? S.indigo : S.textSoft, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>{label}</button>
                    ))}
                  </div>
                  <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={{ ...inputStyle, marginTop: 10, cursor: "pointer" }}>
                    <option value="all">All groups</option>
                    {groups.map((g) => <option key={g.$id} value={g.$id}>{g.name}</option>)}
                    <option value="none">No group</option>
                  </select>
                </div>

                <div className="opa-scroll" style={{ overflow: "auto", flex: 1 }}>
                  {!filteredLearners.length && <div style={{ padding: 22, color: S.textSoft, textAlign: "center" }}>No learners found.</div>}
                  {filteredLearners.map((learner) => {
                    const active = selectedLearner?.$id === learner.$id;
                    const meta = activityMeta(learner.lastLoginAt);
                    const groupColor = groups.find((g) => g.name === learner.groupName)?.color || S.blue;
                    return (
                      <button
                        key={learner.$id}
                        onClick={() => setSelectedLearner(learner)}
                        style={{
                          width: "100%",
                          border: "none",
                          background: active ? "#eef4ff" : "transparent",
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          cursor: "pointer",
                          borderBottom: `1px solid ${S.borderSoft}`,
                          fontFamily: "inherit",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: 999, background: groupColor, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{initials(learner.name, learner.email)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: active ? S.blue : S.text }}>{learner.name || learner.email}</div>
                          <div style={{ fontSize: 12, color: S.textSoft, marginTop: 3 }}>{safeNumber(learner.sessionCountMonth)} sessions • {formatAgo(learner.lastLoginAt)}</div>
                          {learner.groupName && <div style={{ marginTop: 5 }}>{groupPill(learner.groupName, groupColor)}</div>}
                        </div>
                        <span style={{ padding: "4px 8px", borderRadius: 999, background: meta.bg, color: meta.color, fontWeight: 800, fontSize: 10 }}>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ ...shellCard, overflow: "hidden", background: S.bg, border: `1px solid ${S.border}` }}>
                {!selectedLearner ? (
                  <div style={{ height: "100%", minHeight: 420, display: "grid", placeItems: "center", textAlign: "center", color: S.textSoft, padding: 30 }}>
                    <div>
                      <div style={{ fontSize: 40, opacity: 0.35, marginBottom: 10 }}>👤</div>
                      <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 800, color: S.text, marginBottom: 6 }}>Select a learner</div>
                      <div style={{ fontSize: 13, lineHeight: 1.7 }}>Choose a learner to load their real progress data from your project.</div>
                    </div>
                  </div>
                ) : (
                  <div className="opa-scroll" style={{ overflow: "auto", padding: 22, display: "grid", gap: 18 }}>
                    <div style={{ ...shellCard, padding: 22, background: "linear-gradient(135deg,#223f69,#173357)", color: "#fff", border: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 62, height: 62, borderRadius: 999, background: selectedLearnerGroupColor, color: "#fff", display: "grid", placeItems: "center", fontFamily: titleFont, fontWeight: 900, fontSize: 24 }}>{initials(selectedLearner.name, selectedLearner.email)}</div>
                          <div>
                            <div style={{ fontFamily: titleFont, fontSize: 28, fontWeight: 900 }}>{selectedLearner.name || "—"}</div>
                            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>{selectedLearner.email}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                              {selectedLearner.groupName && groupPill(selectedLearner.groupName, selectedLearnerGroupColor)}
                              <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: 11, fontWeight: 800 }}>{activityMeta(selectedLearner.lastLoginAt).label}</span>
                              <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: 11, fontWeight: 800 }}>Last active {formatAgo(selectedLearner.lastLoginAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => openAddModal(selectedLearner.groupName ? groups.find((g) => g.name === selectedLearner.groupName)?.$id || null : null)} style={{ ...btnOutline, background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.18)" }}><Plus size={15} /> Add Learner</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
                      {[
                        { label: "Total Sessions", value: selectedTotalSessionsAllTime, color: S.blue, sub: "since joining" },
                        { label: "This Week", value: selectedThisWeekSessions, color: S.blue, sub: "valid sessions" },
                        { label: "Active Minutes", value: `${selectedThisMonthMins}m`, color: S.text, sub: "this month" },
                        { label: "Last Active", value: formatAgo(selectedLearner.lastLoginAt), color: S.text, sub: selectedLearner.lastLoginAt ? "" : "no signal" },
                      ].map((item) => (
                        <div key={item.label} style={{ ...shellCard, padding: "16px 18px" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: S.textSoft, marginBottom: 8 }}>{item.label}</div>
                          <div style={{ fontFamily: titleFont, fontSize: 28, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
                          {item.sub && <div style={{ fontSize: 11, color: S.textSoft, marginTop: 6 }}>{item.sub}</div>}
                        </div>
                      ))}
                    </div>

                    {selectedLearnerSessionsLoading ? (
                      <div style={{ ...shellCard, padding: 42, textAlign: "center" }}>
                        <Loader2 size={30} className="animate-spin" style={{ margin: "0 auto 10px", color: S.blue }} />
                        <div style={{ fontSize: 13, color: S.textSoft }}>Loading learner progress…</div>
                      </div>
                    ) : (() => {
                      const learnerMeta = activityMeta(selectedLearner.lastLoginAt);
                      const learnerGroup = selectedLearner.groupName ? groups.find((g) => g.name === selectedLearner.groupName) || null : null;
                      const now = new Date();
                      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
                      const monthlySessions = selectedLearnerSessions.filter((s: any) => s.date >= monthStart);
                      const monthSkillMins = calcSkillMins(monthlySessions);
                      const maxSkillMins = Math.max(...SKILLS.map((sk) => monthSkillMins[sk.id] ?? 0), 1);
                      const last8Bars = selectedBiweeklyBars.slice(-8);
                      const maxDayMins = Math.max(...last8Bars.map((bar) => bar.totalMins), 1);
                      const dayLabel = (label: string, isToday: boolean) => {
                        if (isToday) return "Today";
                        const match = label.match(/(\d{1,2})$/);
                        return match ? match[1] : label;
                      };
                      const sessionSortKey = (s: any) => {
                        const candidates = [s.completedAt, s.updatedAt, s.createdAt, s.startedAt, s.timestamp];
                        for (const value of candidates) {
                          const t = Date.parse(String(value || ""));
                          if (Number.isFinite(t)) return t;
                        }
                        return Date.parse(`${s.date}T12:00:00`);
                      };
                      const recentSessions = [...selectedLearnerSessions]
                        .sort((a: any, b: any) => sessionSortKey(b) - sessionSortKey(a))
                        .slice(0, 6);
                      const formatSessionWhen = (s: any) => {
                        if (!s?.date) return "—";
                        if (s.date === learnerToday) return "Today";
                        if (s.date === learnerYesterday) return "Yesterday";
                        return fmtDate(s.date);
                      };

                      const periodLabel = (range: Range) => range === "biweekly" ? "last 14 days" : range === "monthly" ? "last 5 weeks" : "last 12 months";
                      const selectedSkillTotals = SKILLS.reduce((acc, sk) => {
                        acc[sk.id] = selectedSkillBars.reduce((sum, bar) => sum + (bar.skillMins[sk.id] ?? 0), 0);
                        return acc;
                      }, {} as Record<string, number>);
                      const selectedSkillMax = Math.max(...SKILLS.map((sk) => selectedSkillTotals[sk.id] ?? 0), 1);
                      const selectedSkillTotalMins = SKILLS.reduce((sum, sk) => sum + (selectedSkillTotals[sk.id] ?? 0), 0);
                      const activityGames = selectedActiveActivities.filter((id) => ACTIVITY_LABELS[id]?.type === "Game");
                      const activityBuilders = selectedActiveActivities.filter((id) => ACTIVITY_LABELS[id]?.type === "Builder");

                      return (
                        <div style={{ display: "grid", gap: 18 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18 }}>
                            <div style={{ ...shellCard, padding: 20 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                                <div>
                                  <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>Daily Activity</div>
                                  <div style={{ fontSize: 12, color: S.textSoft, marginTop: 4 }}>Bar height = active minutes. Colours = skill mix. Hover a bar to see which games and AI builders were used.</div>
                                </div>
                                <div style={{ fontSize: 11, color: S.textSoft, fontWeight: 800 }}>{periodLabel(learnerSkillRange)}</div>
                              </div>
                              <LearnerRangeToggle value={learnerSkillRange} onChange={setLearnerSkillRange} />
                              <div style={{ marginTop: 8 }}>
                                <StackedBarChart bars={selectedSkillBars} colorKey="skill" showActivityDetailsInSkillTooltip />
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10, justifyContent: "center" }}>
                                {SKILLS.map((sk) => (
                                  <div key={sk.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: S.textSoft }}>
                                    <span style={{ width: 10, height: 10, borderRadius: 3, background: sk.color, display: "inline-block" }} />
                                    {sk.label}
                                  </div>
                                ))}
                              </div>
                              <div style={{ marginTop: 12, borderRadius: 14, background: selectedTodaySessionCount > 0 ? S.greenSoft : "#f8fbff", color: selectedTodaySessionCount > 0 ? "#1b8d4b" : S.textSoft, padding: "12px 14px", fontSize: 12, fontWeight: 800 }}>
                                {selectedTodaySessionCount > 0
                                  ? `${selectedTodaySessionCount} tracked session${selectedTodaySessionCount !== 1 ? "s" : ""} today • ${selectedTodayTotalMins} active minute${selectedTodayTotalMins !== 1 ? "s" : ""}`
                                  : "No tracked sessions today yet."}
                              </div>
                            </div>

                            <div style={{ ...shellCard, padding: 20 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                                <div>
                                  <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>Skill Breakdown — Active Minutes</div>
                                  <div style={{ fontSize: 12, color: S.textSoft, marginTop: 4 }}>Total active minutes by skill for the selected time range.</div>
                                </div>
                                <div style={{ fontSize: 11, color: S.textSoft, fontWeight: 800 }}>{selectedSkillTotalMins}m total</div>
                              </div>

                              <div style={{ display: "grid", gap: 10 }}>
                                {SKILLS.map((sk) => {
                                  const mins = selectedSkillTotals[sk.id] ?? 0;
                                  const widthPct = mins > 0 ? Math.max(6, Math.round((mins / selectedSkillMax) * 100)) : 0;
                                  return (
                                    <div key={sk.id} style={{ display: "grid", gridTemplateColumns: "84px 1fr 48px", gap: 12, alignItems: "center" }}>
                                      <div style={{ fontSize: 13, fontWeight: 800, color: S.text }}>{sk.label}</div>
                                      <div style={{ height: 10, borderRadius: 999, background: "#ecf2fb", overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${widthPct}%`, borderRadius: 999, background: sk.color }} />
                                      </div>
                                      <div style={{ fontSize: 12, fontWeight: 800, color: mins ? sk.color : S.textFaint, textAlign: "right" }}>{mins}m</div>
                                    </div>
                                  );
                                })}
                              </div>

                              {!selectedLearnerSessions.length && (
                                <div style={{ marginTop: 14, borderRadius: 14, background: "#f8fbff", color: S.textSoft, padding: "12px 14px", fontSize: 12, fontWeight: 700 }}>
                                  No real session history has been saved for this learner yet.
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ ...shellCard, padding: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
                              <div>
                                <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>Recent Sessions</div>
                                <div style={{ fontSize: 12, color: S.textSoft, marginTop: 4 }}>Latest real games and builders this learner actually used.</div>
                              </div>
                              <div style={{ fontSize: 11, color: S.textSoft, fontWeight: 800 }}>{recentSessions.length} recent item{recentSessions.length !== 1 ? "s" : ""}</div>
                            </div>

                            {!recentSessions.length ? (
                              <div style={{ borderRadius: 16, border: `1px dashed ${S.border}`, padding: 26, textAlign: "center", color: S.textSoft, fontSize: 13 }}>
                                This learner has no saved recent sessions yet.
                              </div>
                            ) : (
                              <div style={{ display: "grid", gap: 10 }}>
                                {recentSessions.map((session: any, idx: number) => {
                                  const activityId = String(session.activityId || session.skill || "").toLowerCase();
                                  const activity = ACTIVITY_LABELS[activityId] || { label: activityId || "Session", type: "Builder" as const };
                                  const skillId = ACTIVITY_SKILL[activityId] || session.skill || "";
                                  const skillMeta = SKILLS.find((sk) => sk.id === skillId) || null;
                                  const mins = Math.max(1, Math.round((Number(session.durationSeconds) || 0) / 60));
                                  const dot = ACTIVITY_COLORS[activityId] || (skillMeta ? skillMeta.color : S.blue);
                                  return (
                                    <div key={`${activityId}-${session.date}-${idx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, borderRadius: 16, border: `1px solid ${S.borderSoft}`, padding: "14px 16px", background: idx % 2 === 0 ? "#fff" : "#fbfdff" }}>
                                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: 1 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: 999, background: dot, marginTop: 8, flexShrink: 0 }} />
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                            <div style={{ fontSize: 14, fontWeight: 800, color: S.text }}>{activity.label}</div>
                                            <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 7px", borderRadius: 999, background: S.blueSoft, color: S.blue }}>{activity.type}</span>
                                            {skillMeta && <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 7px", borderRadius: 999, background: `${skillMeta.color}18`, color: skillMeta.color }}>{skillMeta.label}</span>}
                                          </div>
                                          <div style={{ fontSize: 12, color: S.textSoft, marginTop: 5 }}>{formatSessionWhen(session)}</div>
                                        </div>
                                      </div>
                                      <span style={{ padding: "6px 10px", borderRadius: 999, background: "#f6f8fc", color: dot, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{mins}m</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {page === "eligible" && !selectedEligible && (
            <>
              <div style={{ ...shellCard, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg,#203d66,#12284b)", color: "#fff", border: "none" }}>
                <span style={{ fontSize: 22 }}>🏢</span>
                <div style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.88 }}>
                  Organizational billing is active. Add one email or many emails. Existing registered users get activated immediately. New users become eligible and are activated when they register with the same email.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
                {[
                  { label: "Total Eligible", value: eligible.filter((u) => u.status !== "inactive").length, color: S.violet },
                  { label: "Active (registered)", value: eligible.filter((u) => u.status === "claimed").length, color: S.green },
                  { label: "Pending", value: eligible.filter((u) => u.status === "approved").length, color: S.blue },
                  { label: "Inactive", value: eligible.filter((u) => u.status === "inactive").length, color: S.textFaint },
                ].map((item) => (
                  <div key={item.label} style={{ ...shellCard, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", insetInline: 0, top: 0, height: 4, background: item.color }} />
                    <div style={{ fontFamily: titleFont, fontSize: 30, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: S.textSoft, marginTop: 8 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...shellCard, overflow: "hidden" }}>
                <div style={{ padding: 18, borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>All Eligible Emails</div>
                    <div style={{ fontSize: 12, color: S.textSoft, marginTop: 4 }}>Use the add modal to paste a list of emails or import a CSV.</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ position: "relative" }}>
                      <Search size={15} style={{ position: "absolute", left: 12, top: 13, color: S.textFaint }} />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email or name..." style={{ ...inputStyle, width: 240, paddingLeft: 36 }} />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 140, cursor: "pointer" }}>
                      <option value="all">All statuses</option>
                      <option value="claimed">Active</option>
                      <option value="approved">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={{ ...inputStyle, width: 170, cursor: "pointer" }}>
                      <option value="all">All groups</option>
                      {groups.map((g) => <option key={g.$id} value={g.$id}>{g.name}</option>)}
                      <option value="none">No group</option>
                    </select>
                  </div>
                </div>

                <div style={{ overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#fafcff" }}>
                        {["Email", "Name", "Status", "Group", "Added", "Last Active", "Actions"].map((h) => (
                          <th key={h} style={{ textAlign: h === "Actions" ? "right" : "left", padding: "12px 14px", fontSize: 11, color: S.textSoft, letterSpacing: ".05em", textTransform: "uppercase", fontWeight: 800, borderBottom: `1px solid ${S.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!filteredEligible.length && <tr><td colSpan={7} style={{ padding: 34, textAlign: "center", color: S.textSoft }}>No users found.</td></tr>}
                      {filteredEligible.map((u) => {
                        const group = groups.find((g) => g.name === u.groupName) || null;
                        const registeredUser = learners.find((l) => l.email === u.email);
                        const displayName = registeredUser?.name || u.name || null;
                        return (
                          <tr key={u.$id} style={{ borderBottom: `1px solid ${S.borderSoft}` }}>
                            <td style={{ padding: "12px 14px", fontWeight: 800, color: S.text }}><button onClick={() => setSelectedEligible(u)} style={{ border: "none", background: "transparent", padding: 0, color: S.text, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{u.email}</button></td>
                            <td style={{ padding: "12px 14px", color: S.textSoft }}><button onClick={() => setSelectedEligible(u)} style={{ border: "none", background: "transparent", padding: 0, color: S.textSoft, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>{displayName || <span style={{ color: S.textFaint, fontStyle: "italic" }}>Not registered</span>}</button></td>
                            <td style={{ padding: "12px 14px" }}>
                              {u.status === "claimed" && <span style={{ padding: "4px 10px", borderRadius: 999, background: S.greenSoft, color: "#1b8d4b", fontWeight: 800, fontSize: 11 }}>● Active</span>}
                              {u.status === "approved" && <span style={{ padding: "4px 10px", borderRadius: 999, background: S.blueSoft, color: "#325fd0", fontWeight: 800, fontSize: 11 }}>● Pending</span>}
                              {u.status === "inactive" && <span style={{ padding: "4px 10px", borderRadius: 999, background: "#f3f5f9", color: S.textSoft, fontWeight: 800, fontSize: 11 }}>● Inactive</span>}
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              {group ? (
                                <button onClick={() => { setShowAssign(u); setAssignGroupId(groups.find((g) => g.name === u.groupName)?.$id || null); }} style={{ border: `1px solid ${group.color}33`, background: `${group.color}18`, color: group.color, borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{group.emoji} {group.name}</button>
                              ) : (
                                <button onClick={() => { setShowAssign(u); setAssignGroupId(null); }} style={{ border: "none", background: "transparent", color: S.blue, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Assign group</button>
                              )}
                            </td>
                            <td style={{ padding: "12px 14px", color: S.textSoft }}>{fmtDate(u.addedAt)}</td>
                            <td style={{ padding: "12px 14px", color: S.textSoft }}>{registeredUser?.lastLoginAt ? formatAgo(registeredUser.lastLoginAt) : "—"}</td>
                            <td style={{ padding: "12px 14px", textAlign: "right" }}>
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                                {u.status !== "inactive" ? (
                                  <button onClick={() => handleDeactivate(u)} style={{ padding: "6px 10px", borderRadius: 10, border: "none", background: S.redSoft, color: S.red, fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Deactivate</button>
                                ) : (
                                  <button onClick={() => handleReactivate(u)} style={{ padding: "6px 10px", borderRadius: 10, border: "none", background: S.greenSoft, color: "#1b8d4b", fontWeight: 800, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Reactivate</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: "12px 14px", borderTop: `1px solid ${S.borderSoft}`, fontSize: 11, color: S.textSoft, fontWeight: 700 }}>
                  Showing {filteredEligible.length} of {eligible.length} users
                </div>
              </div>
            </>
          )}

          {page === "eligible" && selectedEligible && (
            <>
              <div style={{ ...shellCard, padding: 22, background: "linear-gradient(135deg,#223f69,#173357)", color: "#fff", border: "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ width: 62, height: 62, borderRadius: 999, background: selectedEligibleGroupColor, color: "#fff", display: "grid", placeItems: "center", fontFamily: titleFont, fontWeight: 900, fontSize: 24 }}>{initials(selectedEligible.name || selectedEligibleRegisteredUser?.name, selectedEligible.email)}</div>
                    <div>
                      <div style={{ fontFamily: titleFont, fontSize: 28, fontWeight: 900 }}>{selectedEligible.name || selectedEligibleRegisteredUser?.name || selectedEligible.email}</div>
                      <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>{selectedEligible.email}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                        {selectedEligible.groupName && groupPill(selectedEligible.groupName, selectedEligibleGroupColor)}
                        {selectedEligible.status === "claimed" && <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: 11, fontWeight: 800 }}>claimed</span>}
                        {selectedEligible.status === "approved" && <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: 11, fontWeight: 800 }}>pending</span>}
                        {selectedEligible.status === "inactive" && <span style={{ padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", fontSize: 11, fontWeight: 800 }}>inactive</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => { setShowAssign(selectedEligible); setAssignGroupId(groups.find((g) => g.name === selectedEligible.groupName)?.$id || null); }} style={{ ...btnOutline, background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.18)" }}>Assign group</button>
                    {selectedEligible.status !== "inactive" ? (
                      <button onClick={() => handleDeactivate(selectedEligible)} style={{ ...btnOutline, background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.18)" }}>Deactivate</button>
                    ) : (
                      <button onClick={() => handleReactivate(selectedEligible)} style={{ ...btnOutline, background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.18)" }}>Reactivate</button>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14 }}>
                {[
                  { label: "Eligibility Status", value: selectedEligible.status, color: selectedEligible.status === "claimed" ? S.green : selectedEligible.status === "approved" ? S.blue : S.textFaint },
                  { label: "Group", value: selectedEligible.groupName || "—", color: selectedEligibleGroupColor },
                  { label: "Added", value: fmtDate(selectedEligible.addedAt), color: S.violet },
                  { label: "Last Active", value: selectedEligibleRegisteredUser?.lastLoginAt ? formatAgo(selectedEligibleRegisteredUser.lastLoginAt) : "—", color: S.green },
                ].map((item) => (
                  <div key={item.label} style={{ ...shellCard, padding: "16px 18px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: S.textSoft, marginBottom: 8 }}>{item.label}</div>
                    <div style={{ fontFamily: titleFont, fontSize: 28, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div style={{ ...shellCard, padding: 18 }}>
                  <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Eligibility record</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      ["Email", selectedEligible.email],
                      ["Name", selectedEligible.name || selectedEligibleRegisteredUser?.name || "—"],
                      ["Status", selectedEligible.status],
                      ["Group", selectedEligible.groupName || "—"],
                      ["Added at", fmtDate(selectedEligible.addedAt)],
                      ["Claimed at", fmtDate(selectedEligible.claimedAt)],
                      ["Claimed user id", selectedEligible.claimedByUserId || "—"],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 12px", borderRadius: 12, background: "#f8fbff" }}>
                        <div style={{ fontSize: 12, color: S.textSoft, fontWeight: 700 }}>{label}</div>
                        <div style={{ fontSize: 13, color: S.text, fontWeight: 800, textAlign: "right" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ ...shellCard, padding: 18 }}>
                  <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Linked learner</div>
                  {!selectedEligibleRegisteredUser ? (
                    <div style={{ padding: 18, borderRadius: 14, background: S.blueSoft, color: S.blue, fontSize: 13, lineHeight: 1.7 }}>
                      This email has not been registered yet, so there is no linked learner activity record.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {[
                        ["Learner name", selectedEligibleRegisteredUser.name || "—"],
                        ["Email", selectedEligibleRegisteredUser.email],
                        ["Last active", formatAgo(selectedEligibleRegisteredUser.lastLoginAt)],
                        ["Sessions this month", String(safeNumber(selectedEligibleRegisteredUser.sessionCountMonth))],
                        ["Subscription", selectedEligibleRegisteredUser.subscriptionStatus || "—"],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "10px 12px", borderRadius: 12, background: "#f8fbff" }}>
                          <div style={{ fontSize: 12, color: S.textSoft, fontWeight: 700 }}>{label}</div>
                          <div style={{ fontSize: 13, color: S.text, fontWeight: 800, textAlign: "right" }}>{value}</div>
                        </div>
                      ))}
                      <div>
                        <button onClick={() => { if (selectedEligibleRegisteredUser) { setSelectedLearner(selectedEligibleRegisteredUser); setSelectedEligible(null); setPage("learners"); } }} style={btnOutline}>Open in All Learners</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {/* ══ CONTRACT ══ */}
          {page === "contract" && (() => {
            const fd = contract ? parseContractFormData(contract) : null;

            // ── Loading ──
            if (contractLoading) return (
              <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", border: `1px solid ${S.border}` }}>
                <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: S.blue, margin: "0 auto 10px" }} />
                <div style={{ fontSize: 13, color: S.textSoft }}>Loading…</div>
              </div>
            );

            // ── Already signed / paid / cancelled ──
            if (contract && contract.status === "pending_payment") return (
              <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
                <CheckCircle size={36} style={{ color: S.blue, margin: "0 auto 12px" }} />
                <div style={{ fontFamily: titleFont, fontSize: 15, fontWeight: 800, color: S.text, marginBottom: 6 }}>Approved — Awaiting Payment</div>
                <div style={{ fontSize: 12, color: S.textSoft, lineHeight: 1.6, marginBottom: 20 }}>
                  CLBPrep has reviewed and approved your contract.<br />
                  Please review the agreement below, then continue to Stripe to complete payment and activate your seats.
                </div>
                <div style={{ marginBottom: 16, padding: "12px 20px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, display: "inline-flex", flexDirection: "column", gap: 4, textAlign: "left" }}>
                  {[
                    ["Plan", `${fd?.selectedPlan} seats — CAD $${fd?.selectedPlanPrice}/month`],
                    ["Term", `${fd?.months} month${(fd?.months || 1) > 1 ? "s" : ""}`],
                    ["Start", fd?.startDate || "—"],
                    ["Total", `CAD $${fd?.totalPrice}`],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", gap: 16, fontSize: 12 }}>
                      <span style={{ color: S.textSoft, width: 60 }}>{l}</span>
                      <span style={{ fontWeight: 700, color: S.text }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => startStripeCheckout(contract)}
                    style={{ ...btnPrimary, padding: "12px 28px", fontSize: 13 }}
                  >
                    Proceed to Payment →
                  </button>
                </div>
              </div>
            );

            if (contract && contract.status === "paid") return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Hidden contract template kept in DOM so contractPdfRef is populated */}
                <div style={{ display: "none" }}>
                  <div ref={contractPdfRef}>
                    <ContractTemplate
                      data={{ ...parseContractFormData(contract), clbprepSignerName: contract.adminSignerName || "Soheila Azizi", clbprepSignerTitle: contract.adminSignerTitle || "Owner" } as any}
                      mode="signed"
                      orgSignerName={contract.orgSignerName}
                      orgSignerTitle={contract.orgSignerTitle}
                      orgSignature={contract.orgSignature}
                      orgSignedAt={contract.orgSignedAt}
                      adminSignerName={contract.adminSignerName || "Soheila Azizi"}
                      adminSignerTitle={contract.adminSignerTitle || "Owner"}
                      adminApprovedAt={contract.adminApprovedAt}
                    />
                  </div>
                </div>
                <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
                  <CheckCircle size={36} style={{ color: S.green, margin: "0 auto 12px" }} />
                  <div style={{ fontFamily: titleFont, fontSize: 15, fontWeight: 800, color: S.text, marginBottom: 6 }}>Contract Active</div>
                  <div style={{ fontSize: 12, color: S.textSoft, lineHeight: 1.6 }}>
                    Your contract is active and your {fd?.selectedPlan} seats are enabled.<br />
                    Approved by <strong>{contract.adminSignerName || "Soheila Azizi"}</strong> on {formatContractDate(contract.adminApprovedAt)}<br />
                    Signed by <strong>{contract.orgSignerName}</strong> on {formatContractDate(contract.orgSignedAt)}<br />
                    {(fd?.effectiveDate || fd?.startDate) && <>Service starts <strong>{formatContractDate(fd?.effectiveDate || fd?.startDate)}</strong><br /></>}
                    {(() => {
                      const start = fd?.effectiveDate || fd?.startDate;
                      const months = Number(fd?.months) || 1;
                      if (!start) return null;
                      const d = new Date(start);
                      d.setUTCMonth(d.getUTCMonth() + months);
                      const expiry = d.toLocaleDateString("en-CA", { timeZone: "UTC" });
                      const today = new Date();
                      today.setUTCHours(0, 0, 0, 0);
                      const daysLeft = Math.max(0, Math.ceil((d.getTime() - today.getTime()) / 86400000));
                      return <>Expires <strong>{expiry}</strong> ({daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining)</>;
                    })()}
                  </div>
                  {/* PDF actions */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                    <button type="button" onClick={() => openContractPdfWindow(false)} style={btnOutline}>
                      <FolderOpen size={14} /> View PDF
                    </button>
                    <button type="button" onClick={() => openContractPdfWindow(true)} style={btnPrimary}>
                      <Download size={14} /> Download / Print PDF
                    </button>
                  </div>
                </div>

                {/* ── Pending renewal notice (shown when a new contract is under review) ── */}
                {pendingRenewal && (
                  <div style={{ background: pendingRenewal.status === "pending_payment" ? "#f0fdf4" : "#fffbeb", border: `1px solid ${pendingRenewal.status === "pending_payment" ? "#86efac" : "#fde68a"}`, borderRadius: 16, padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {pendingRenewal.status === "pending_payment"
                        ? <CheckCircle size={16} style={{ color: "#16a34a", flexShrink: 0, marginTop: 2 }} />
                        : <AlertCircle size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: 2 }} />
                      }
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: pendingRenewal.status === "pending_payment" ? "#14532d" : "#92400e", marginBottom: 3 }}>
                          {pendingRenewal.status === "pending_payment"
                            ? "🎉 New contract approved — payment required"
                            : "New contract request in progress"
                          }
                        </div>
                        <div style={{ fontSize: 12, color: pendingRenewal.status === "pending_payment" ? "#15803d" : "#92400e", lineHeight: 1.6 }}>
                          {pendingRenewal.status === "pending_payment" && (
                            <>CLBPrep has approved your new contract. Complete payment to activate your new seats.<br />Your current contract remains active until the new one is paid.</>
                          )}
                          {pendingRenewal.status === "pending_admin" && (
                            <>Your renewal request is under review by CLBPrep. Your current contract remains active in the meantime.</>
                          )}
                          {pendingRenewal.status === "pending_org" && (
                            <>Your renewal contract is awaiting your signature. Your current contract remains active in the meantime.</>
                          )}
                        </div>
                        {pendingRenewal.status === "pending_payment" && (
                          <div style={{ marginTop: 14 }}>
                            <button
                              type="button"
                              onClick={() => startStripeCheckout(pendingRenewal)}
                              style={{ ...btnPrimary, background: "linear-gradient(135deg,#16a34a,#15803d)", padding: "10px 24px", fontSize: 13 }}
                            >
                              Proceed to Payment →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── New contract / more seats ── */}
                <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text, marginBottom: 2 }}>Need more seats or a new term?</div>
                    <div style={{ fontSize: 12, color: S.textSoft }}>
                      Request a new quote and sign a new contract to adjust your plan.
                    </div>
                  </div>
                  {!pendingRenewal && (
                    <button
                      type="button"
                      onClick={() => setShowContractRequestFlow((prev) => !prev)}
                      style={showContractRequestFlow ? btnOutline : btnPrimary}
                    >
                      {showContractRequestFlow ? "Hide Quote Form" : "Request New Contract"}
                    </button>
                  )}
                </div>

                {showContractRequestFlow && (
                  <ContractRequestFlow
                    partnerName={partnerName}
                    orgUserId={orgUserId}
                    adminName={adminName}
                    onSubmitted={() => {
                      setShowContractRequestFlow(false);
                      loadContract();
                    }}
                    S={S}
                    titleFont={titleFont}
                    inputStyle={inputStyle}
                    btnPrimary={btnPrimary}
                    btnOutline={btnOutline}
                  />
                )}

                {/* ── All contracts history ── */}
                {allContracts.length > 1 && (
                  <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, background: "#f8fafc" }}>
                      <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text }}>All Contracts</div>
                      <div style={{ fontSize: 11, color: S.textSoft, marginTop: 2 }}>All contract requests for your organization</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {allContracts.map((c: any, i: number) => {
                        const cfd = parseContractFormData(c);
                        const isActive = c.$id === contract?.$id;
                        const statusColors: Record<string, { bg: string; text: string; label: string }> = {
                          paid:            { bg: "#dcfce7", text: "#15803d", label: "Active" },
                          pending_payment: { bg: "#fef9c3", text: "#854d0e", label: "Awaiting Payment" },
                          pending_admin:   { bg: "#dbeafe", text: "#1d4ed8", label: "Under Review" },
                          pending_org:     { bg: "#fef3c7", text: "#92400e", label: "Awaiting Signature" },
                          expired:         { bg: "#fee2e2", text: "#b91c1c", label: "Expired" },
                          cancelled:       { bg: "#f3f4f6", text: "#6b7280", label: "Cancelled" },
                        };
                        const sc = statusColors[c.status] || { bg: "#f3f4f6", text: "#6b7280", label: c.status };
                        return (
                          <div key={c.$id} style={{ padding: "14px 20px", borderBottom: i < allContracts.length - 1 ? `1px solid ${S.border}` : "none", background: isActive ? "#f0fdf4" : "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: S.text }}>{cfd?.selectedPlan} seats — CAD ${cfd?.totalPrice}</span>
                                {isActive && <span style={{ fontSize: 10, fontWeight: 800, color: "#15803d", background: "#dcfce7", padding: "1px 7px", borderRadius: 999 }}>CURRENT</span>}
                              </div>
                              <div style={{ fontSize: 11, color: S.textSoft }}>
                                {cfd?.initialTerm || `${cfd?.months} month`} · Start: {formatContractDate(cfd?.effectiveDate || cfd?.startDate)} · Submitted: {formatContractDate(c.$createdAt)}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: sc.text, background: sc.bg, padding: "3px 10px", borderRadius: 999 }}>{sc.label}</span>
                              {c.status === "pending_payment" && (
                                <button type="button" onClick={() => startStripeCheckout(c)} style={{ ...btnPrimary, padding: "6px 14px", fontSize: 11 }}>
                                  Pay Now →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );

            if (contract && contract.status === "expired") {
              // Calculate expiry date for display
              const expiredStart = fd?.effectiveDate || fd?.startDate;
              const expiredMonths = Number(fd?.months) || 1;
              let expiryDisplay = "—";
              if (expiredStart) {
                const d = new Date(expiredStart);
                d.setUTCMonth(d.getUTCMonth() + expiredMonths);
                expiryDisplay = d.toLocaleDateString("en-CA", { timeZone: "UTC" });
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* ── Expired notice ── */}
                  <div style={{ background: "#fff", border: `1px solid ${S.red}22`, borderRadius: 16, padding: "28px 24px", textAlign: "center" }}>
                    <AlertCircle size={36} style={{ color: S.red, margin: "0 auto 12px" }} />
                    <div style={{ fontFamily: titleFont, fontSize: 15, fontWeight: 800, color: S.text, marginBottom: 6 }}>
                      Contract Expired
                    </div>
                    <div style={{ fontSize: 12, color: S.textSoft, lineHeight: 1.8 }}>
                      Your contract expired on <strong>{expiryDisplay}</strong>.<br />
                      All learner access has been deactivated.<br />
                      Please request a new contract to restore access.
                    </div>
                    {/* PDF access still available */}
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                      <div style={{ display: "none" }}>
                        <div ref={contractPdfRef}>
                          <ContractTemplate
                            data={{ ...parseContractFormData(contract), clbprepSignerName: contract.adminSignerName || "Soheila Azizi", clbprepSignerTitle: contract.adminSignerTitle || "Owner" } as any}
                            mode="signed"
                            orgSignerName={contract.orgSignerName}
                            orgSignerTitle={contract.orgSignerTitle}
                            orgSignature={contract.orgSignature}
                            orgSignedAt={contract.orgSignedAt}
                            adminSignerName={contract.adminSignerName || "Soheila Azizi"}
                            adminSignerTitle={contract.adminSignerTitle || "Owner"}
                            adminApprovedAt={contract.adminApprovedAt}
                          />
                        </div>
                      </div>
                      <button type="button" onClick={() => openContractPdfWindow(false)} style={btnOutline}>
                        <FolderOpen size={14} /> View Expired Contract
                      </button>
                    </div>
                  </div>

                  {/* ── Request new contract ── */}
                  <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text, marginBottom: 2 }}>Renew or upgrade your plan</div>
                      <div style={{ fontSize: 12, color: S.textSoft }}>
                        Request a new quote to restore learner access. Contact <a href="mailto:support@clbprep.com" style={{ color: S.blue }}>support@clbprep.com</a> if you have questions.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowContractRequestFlow((prev) => !prev)}
                      style={showContractRequestFlow ? btnOutline : btnPrimary}
                    >
                      {showContractRequestFlow ? "Hide Quote Form" : "Request New Contract"}
                    </button>
                  </div>

                  {showContractRequestFlow && (
                    <ContractRequestFlow
                      partnerName={partnerName}
                      orgUserId={orgUserId}
                      adminName={adminName}
                      onSubmitted={() => {
                        setShowContractRequestFlow(false);
                        loadContract();
                      }}
                      S={S}
                      titleFont={titleFont}
                      inputStyle={inputStyle}
                      btnPrimary={btnPrimary}
                      btnOutline={btnOutline}
                    />
                  )}
                </div>
              );
            }

            if (contract && contract.status === "cancelled") return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <AlertCircle size={20} style={{ color: S.red, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text, marginBottom: 2 }}>Previous contract was cancelled</div>
                      <div style={{ fontSize: 12, color: S.textSoft }}>
                        You can request a new quote below. Contact <a href="mailto:support@clbprep.com" style={{ color: S.blue }}>support@clbprep.com</a> if you have questions.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContractRequestFlow((prev) => !prev)}
                    style={showContractRequestFlow ? btnOutline : btnPrimary}
                  >
                    {showContractRequestFlow ? "Hide Quote Form" : "Request New Quote"}
                  </button>
                </div>

                {showContractRequestFlow && (
                  <ContractRequestFlow
                    partnerName={partnerName}
                    orgUserId={orgUserId}
                    adminName={adminName}
                    onSubmitted={() => {
                      setShowContractRequestFlow(false);
                      loadContract();
                    }}
                    S={S}
                    titleFont={titleFont}
                    inputStyle={inputStyle}
                    btnPrimary={btnPrimary}
                    btnOutline={btnOutline}
                  />
                )}
              </div>
            );

            // ── Pending admin review ──
            if (contract && contract.status === "pending_admin") return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", background: "#fffbeb", borderBottom: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 10 }}>
                    <AlertCircle size={16} style={{ color: "#d97706", flexShrink: 0 }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                      Your contract request has been submitted and is under review by CLBPrep. We'll notify you by email once it's approved.
                    </div>
                  </div>
                  <div style={{ padding: "20px 24px" }}>
                    <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text, marginBottom: 14 }}>Submission Summary</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", fontSize: 12 }}>
                      {[
                        ["Organization", fd?.organizationName],
                        ["Plan", `${fd?.selectedPlan} seats — CAD $${fd?.selectedPlanPrice}/mo`],
                        ["Duration", `${fd?.months} month${(fd?.months || 1) > 1 ? "s" : ""}`],
                        ["Total", `CAD $${fd?.totalPrice}`],
                        ["Start Date", fd?.startDate],
                        ["Submitted", new Date(contract.createdAt).toLocaleDateString("en-CA")],
                        ["Signed By", contract.orgSignerName],
                      ].map(([l, v]) => (
                        <div key={l}>
                          <div style={{ color: S.textSoft, fontSize: 10, fontWeight: 800, letterSpacing: ".06em", marginBottom: 2 }}>{l}</div>
                          <div style={{ fontWeight: 600, color: S.text }}>{v || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: "20px 24px", textAlign: "center" }}>
                  <div style={{ fontFamily: titleFont, fontSize: 14, fontWeight: 800, color: S.text, marginBottom: 6 }}>
                    Contract Preview Locked
                  </div>
                  <div style={{ fontSize: 12, color: S.textSoft, lineHeight: 1.6 }}>
                    The contract PDF and full contract preview will become available only after CLBPrep approves the request and payment is completed.
                  </div>
                </div>
              </div>
            );

            // ── No contract yet — show Request New Quote first ──
            if (!showContractRequestFlow) {
              return (
                <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: "26px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontFamily: titleFont, fontSize: 15, fontWeight: 800, color: S.text, marginBottom: 6 }}>No contract on file yet</div>
                    <div style={{ fontSize: 12, color: S.textSoft, lineHeight: 1.6 }}>
                      Start by requesting a new quote. The contract PDF will stay locked until CLBPrep approves the request and payment is completed.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContractRequestFlow(true)}
                    style={btnPrimary}
                  >
                    Request New Quote
                  </button>
                </div>
              );
            }

            return <ContractRequestFlow
              partnerName={partnerName}
              orgUserId={orgUserId}
              adminName={adminName}
              onSubmitted={() => {
                setShowContractRequestFlow(false);
                loadContract();
              }}
              S={S}
              titleFont={titleFont}
              inputStyle={inputStyle}
              btnPrimary={btnPrimary}
              btnOutline={btnOutline}
            />;
          })()}

          {/* ══ REPORTS ══ */}
          {(page as any) === "reports" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ background: "linear-gradient(135deg,#1e3a5f,#1e3352)", borderRadius: 16, padding: "16px 22px", color: "white", display: "flex", alignItems: "center", gap: 14 }}>
                <FileText size={24} style={{ flexShrink: 0, opacity: 0.8 }} />
                <div>
                  <div style={{ fontFamily: titleFont, fontSize: 14, fontWeight: 800, marginBottom: 3 }}>Export Reports</div>
                  <div style={{ fontSize: 11, opacity: .75, lineHeight: 1.6 }}>Download CSV reports for your groups and learners. Use these for funder reporting, attendance records, or organizational reviews.</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>

                {/* All eligible users */}
                <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "#ede9fe", display: "grid", placeItems: "center" }}>
                      <Users size={18} style={{ color: "#7c3aed" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text }}>All Eligible Users</div>
                      <div style={{ fontSize: 11, color: S.textSoft }}>{eligible.length} users total</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: S.textSoft, marginBottom: 14, lineHeight: 1.5 }}>Email, status, group assignment, date added and last active for all eligible users.</div>
                  <button onClick={() => exportCSV(
                    ["Email", "Status", "Group", "Added", "Last Active"],
                    eligible.map(u => {
                      const lu = learners.find(l => l.email === u.email);
                      return [u.email, u.status, u.groupName || "—", u.addedAt ? new Date(u.addedAt).toLocaleDateString("en-CA") : "—", lu?.lastLoginAt ? new Date(lu.lastLoginAt).toLocaleDateString("en-CA") : "—"];
                    }),
                    `${partnerName}_eligible_users`
                  )} style={{ ...btnPrimary, width: "100%", justifyContent: "center" }}>
                    <Download size={14} /> Download CSV
                  </button>
                </div>

                {/* Per-group reports */}
                {groups.map(g => {
                  const members = eligible.filter(u => u.groupName === g.name && u.status !== "inactive");
                  return (
                    <div key={g.$id} style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: 20, borderTop: `4px solid ${g.color}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: g.color + "18", display: "grid", placeItems: "center", fontSize: 20 }}>{g.emoji}</div>
                        <div>
                          <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text }}>{g.name}</div>
                          <div style={{ fontSize: 11, color: S.textSoft }}>{members.length} learners · {g.schedule}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: S.textSoft, marginBottom: 14, lineHeight: 1.5 }}>Email, name, engagement, sessions this month, last active and subscription status.</div>
                      <button onClick={() => exportCSV(
                        ["Email", "Name", "Engagement", "Sessions (month)", "Last Active", "Subscription"],
                        members.map(u => {
                          const lu = learners.find(l => l.email === u.email);
                          const d = lu?.lastLoginAt ? Math.floor((Date.now() - new Date(lu.lastLoginAt).getTime()) / 86400000) : null;
                          const eng = d === null ? "Not registered" : d <= 3 ? "Active" : d >= 7 ? "Less active" : "7d quiet";
                          return [u.email, lu?.name || "—", eng, String(lu?.sessionCountMonth || 0), lu?.lastLoginAt ? new Date(lu.lastLoginAt).toLocaleDateString("en-CA") : "—", lu?.subscriptionStatus || "—"];
                        }),
                        `${partnerName}_${g.name.replace(/\s+/g, "_")}_report`
                      )} style={{ ...btnPrimary, width: "100%", justifyContent: "center", background: g.color }}>
                        <Download size={14} /> Download {g.name} CSV
                      </button>
                    </div>
                  );
                })}

                {/* Full partner summary */}
                <div style={{ background: "#fff", border: `1px solid ${S.border}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fef3c7", display: "grid", placeItems: "center" }}>
                      <FileText size={18} style={{ color: "#d97706" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: titleFont, fontSize: 13, fontWeight: 800, color: S.text }}>Full Partner Summary</div>
                      <div style={{ fontSize: 11, color: S.textSoft }}>{partnerName} · all groups combined</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: S.textSoft, marginBottom: 14, lineHeight: 1.5 }}>All learners across all groups with group, activity, and subscription status.</div>
                  <button onClick={() => exportCSV(
                    ["Email", "Name", "Group", "Engagement", "Sessions (month)", "Last Active", "Subscription"],
                    learners.map(u => {
                      const d = u.lastLoginAt ? Math.floor((Date.now() - new Date(u.lastLoginAt).getTime()) / 86400000) : null;
                      const eng = d === null ? "Never logged in" : d <= 3 ? "Active" : d >= 7 ? "Less active" : "7d quiet";
                      return [u.email, u.name || "—", u.groupName || "—", eng, String(u.sessionCountMonth || 0), u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-CA") : "—", u.subscriptionStatus || "—"];
                    }),
                    `${partnerName}_full_summary`
                  )} style={{ ...btnPrimary, width: "100%", justifyContent: "center", background: "#d97706" }}>
                    <Download size={14} /> Download Full Summary
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {showCreateGroup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,18,33,.38)", display: "grid", placeItems: "center", padding: 20, zIndex: 200 }}>
          <div style={{ width: "100%", maxWidth: 680, background: "#fff", borderRadius: 24, border: `1px solid ${S.border}`, boxShadow: "0 30px 70px rgba(10,18,33,.22)", overflow: "hidden" }}>
            <div style={{ padding: "22px 22px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 800 }}>Create New Group</div>
              <button onClick={() => { setShowCreateGroup(false); resetCreateForm(); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: S.textSoft }}><X size={20} /></button>
            </div>

            <div className="opa-scroll" style={{ padding: 22, display: "grid", gap: 16, maxHeight: "74vh", overflow: "auto" }}>
              <div>
                <label style={labelStyle}>Group Name</label>
                <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Tuesday Evening Class" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Description (optional)</label>
                <textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="e.g. Newcomers program, spring 2026" style={textAreaStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Seats <span style={{ color: S.textSoft, fontWeight: 600 }}>— max learners allowed in this group</span></label>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <button onClick={() => setNewGroupSeats((v) => Math.max(1, v - 1))} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${S.border}`, background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 800 }}>−</button>
                    <div style={{ fontFamily: titleFont, fontSize: 34, fontWeight: 900 }}>{newGroupSeats}</div>
                    <button onClick={() => setNewGroupSeats((v) => Math.min(200, v + 1))} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${S.border}`, background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 800 }}>+</button>
                    <div style={{ fontSize: 13, color: S.textSoft }}>seats</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[10, 15, 20, 30, 50].map((n) => (
                      <button key={n} onClick={() => setNewGroupSeats(n)} style={{ padding: "6px 12px", borderRadius: 10, border: `1px solid ${newGroupSeats === n ? S.indigo : S.border}`, background: newGroupSeats === n ? S.violetSoft : "#fff", color: newGroupSeats === n ? S.indigo : S.textSoft, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{n}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Schedule note (optional)</label>
                  <input value={newGroupScheduleNote} onChange={(e) => setNewGroupScheduleNote(e.target.value)} placeholder="e.g. Online with flexible homework" style={inputStyle} />
                  <div style={{ marginTop: 12 }}>
                    <label style={labelStyle}>Color</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {GROUP_COLORS.map((color) => (
                        <button key={color} onClick={() => setNewGroupColor(color)} style={{ width: 26, height: 26, borderRadius: 999, border: `3px solid ${newGroupColor === color ? S.text : "transparent"}`, background: color, cursor: "pointer" }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Session Days <span style={{ color: S.textSoft, fontWeight: 600 }}>— click a day to show its time setup</span></label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                  {DAYS.map((day) => {
                    const active = newGroupDays[day].enabled;
                    return (
                      <button
                        key={day}
                        onClick={() => setNewGroupDays((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], enabled: !prev[day].enabled },
                        }))}
                        style={{ height: 42, borderRadius: 12, border: `1px solid ${active ? S.blue : S.border}`, background: active ? S.blueSoft : "#fff", color: active ? S.blue : S.textSoft, fontWeight: 800, fontSize: 12, cursor: "pointer" }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDays.length > 0 && (
                <div style={{ display: "grid", gap: 12 }}>
                  {selectedDays.map((day) => {
                    const row = newGroupDays[day];
                    return (
                      <div key={day} style={{ border: `1px solid ${S.border}`, borderRadius: 16, padding: 14, background: "#fafcff" }}>
                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: S.text }}>{day}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: S.textSoft, fontWeight: 700, marginBottom: 6 }}>Start time on {day}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 84px 84px", gap: 8 }}>
                              <select value={row.startHour} onChange={(e) => setNewGroupDays((prev) => ({ ...prev, [day]: { ...prev[day], startHour: e.target.value } }))} style={{ ...inputStyle, cursor: "pointer" }}>{HOURS.map((x) => <option key={x} value={x}>{x} PM</option>)}</select>
                              <select value={row.startMinute} onChange={(e) => setNewGroupDays((prev) => ({ ...prev, [day]: { ...prev[day], startMinute: e.target.value } }))} style={{ ...inputStyle, cursor: "pointer" }}>{MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
                              <select value={row.startMeridiem} onChange={(e) => setNewGroupDays((prev) => ({ ...prev, [day]: { ...prev[day], startMeridiem: e.target.value as Meridiem } }))} style={{ ...inputStyle, cursor: "pointer" }}><option value="AM">AM</option><option value="PM">PM</option></select>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: S.textSoft, fontWeight: 700, marginBottom: 6 }}>End time on {day}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 84px 84px", gap: 8 }}>
                              <select value={row.endHour} onChange={(e) => setNewGroupDays((prev) => ({ ...prev, [day]: { ...prev[day], endHour: e.target.value } }))} style={{ ...inputStyle, cursor: "pointer" }}>{HOURS.map((x) => <option key={x} value={x}>{x} PM</option>)}</select>
                              <select value={row.endMinute} onChange={(e) => setNewGroupDays((prev) => ({ ...prev, [day]: { ...prev[day], endMinute: e.target.value } }))} style={{ ...inputStyle, cursor: "pointer" }}>{MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
                              <select value={row.endMeridiem} onChange={(e) => setNewGroupDays((prev) => ({ ...prev, [day]: { ...prev[day], endMeridiem: e.target.value as Meridiem } }))} style={{ ...inputStyle, cursor: "pointer" }}><option value="AM">AM</option><option value="PM">PM</option></select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ borderRadius: 14, background: S.violetSoft, border: `1px solid #d9d0ff`, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: S.indigo, marginBottom: 6 }}>Schedule preview</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>{schedulePreview}</div>
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Emoji / Icon</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {EMOJIS.map((emoji) => {
                    const active = newGroupEmoji === emoji;
                    return (
                      <button key={emoji} onClick={() => setNewGroupEmoji(emoji)} style={{ width: 46, height: 46, borderRadius: 14, border: `2px solid ${active ? S.blue : S.border}`, background: active ? S.blueSoft : "#fff", cursor: "pointer", fontSize: 24 }}>{emoji}</button>
                    );
                  })}
                </div>
              </div>

              {formErr && <div style={{ padding: "10px 12px", borderRadius: 12, background: S.redSoft, color: S.red, fontSize: 12, fontWeight: 700 }}>{formErr}</div>}
            </div>

            <div style={{ padding: 18, borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => { setShowCreateGroup(false); resetCreateForm(); }} style={btnOutline}>Cancel</button>
              <button onClick={handleCreateGroup} style={btnPrimary}>Create Group</button>
            </div>
          </div>
        </div>
      )}

      {showAddEmail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,18,33,.38)", display: "grid", placeItems: "center", padding: 20, zIndex: 220 }}>
          <div style={{ width: "100%", maxWidth: 580, background: "#fff", borderRadius: 24, border: `1px solid ${S.border}`, boxShadow: "0 30px 70px rgba(10,18,33,.22)", overflow: "hidden" }}>
            <div style={{ padding: "22px 22px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 800 }}>Add Eligible Email(s)</div>
              <button onClick={() => { setShowAddEmail(false); setFormErr(""); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: S.textSoft }}><X size={20} /></button>
            </div>

            <div className="opa-scroll" style={{ padding: 22, display: "grid", gap: 16, maxHeight: "74vh", overflow: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => setAddMode("single")} style={{ height: 38, borderRadius: 12, border: `1px solid ${addMode === "single" ? S.blue : S.border}`, background: addMode === "single" ? S.blueSoft : "#fff", color: addMode === "single" ? S.blue : S.textSoft, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Single</button>
                <button onClick={() => setAddMode("bulk")} style={{ height: 38, borderRadius: 12, border: `1px solid ${addMode === "bulk" ? S.blue : S.border}`, background: addMode === "bulk" ? S.blueSoft : "#fff", color: addMode === "bulk" ? S.blue : S.textSoft, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Bulk list</button>
              </div>

              {addMode === "single" ? (
                <>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} type="email" placeholder="participant@email.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Name (optional)</label>
                    <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" style={inputStyle} />
                  </div>
                </>
              ) : (
                <div>
                  <label style={labelStyle}>Email list</label>
                  <textarea value={addBulk} onChange={(e) => setAddBulk(e.target.value)} placeholder={"Paste one email per line, or comma-separated\nuser1@email.com\nuser2@email.com"} style={{ ...textAreaStyle, minHeight: 150 }} />
                  <div style={{ fontSize: 12, color: S.textSoft, marginTop: 8 }}>You can also import CSV from the top bar.</div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Assign to group</label>
                <div style={{ display: "grid", gap: 8 }}>
                  {[{ $id: "none", name: "No group", emoji: "➖", color: "#94a3b8", schedule: "Assign later", seats: 0 } as unknown as Group, ...groups].map((g) => {
                    const targetId = g.$id === "none" ? null : g.$id;
                    const active = addGroupId === targetId;
                    const count = g.$id === "none" ? 0 : eligible.filter((u) => u.groupName === g.name && u.status !== "inactive").length;
                    return (
                      <button key={g.$id} onClick={() => setAddGroupId(targetId)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, border: `1px solid ${active ? S.blue : S.border}`, background: active ? S.blueSoft : "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: g.$id === "none" ? "#f3f5f9" : `${g.color}18`, color: g.$id === "none" ? S.textSoft : g.color, display: "grid", placeItems: "center", fontSize: 22 }}>{g.emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 800 }}>{g.name}</div>
                          <div style={{ fontSize: 12, color: S.textSoft }}>{g.$id === "none" ? "Assign later" : `${count}/${g.seats} seats • ${g.schedule}`}</div>
                        </div>
                        {active && <div style={{ color: S.blue, fontWeight: 900 }}>✓</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formErr && <div style={{ padding: "10px 12px", borderRadius: 12, background: S.redSoft, color: S.red, fontSize: 12, fontWeight: 700 }}>{formErr}</div>}
              <div style={{ padding: 12, borderRadius: 14, background: "#f8fbff", fontSize: 12, color: S.textSoft, lineHeight: 1.7 }}>
                Existing registered users will be activated immediately. New users will stay pending until they register with the same email. This modal works for one email or many emails.
              </div>
            </div>

            <div style={{ padding: 18, borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAddEmail(false)} style={btnOutline}>Cancel</button>
              <button onClick={handleAddEmails} style={{ ...btnPrimary, opacity: addLoading ? 0.72 : 1 }} disabled={addLoading}>{addLoading ? "Adding..." : "Add"}</button>
            </div>
          </div>
        </div>
      )}

      {showAssign && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,18,33,.38)", display: "grid", placeItems: "center", padding: 20, zIndex: 230 }}>
          <div style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 24, border: `1px solid ${S.border}`, boxShadow: "0 30px 70px rgba(10,18,33,.22)", overflow: "hidden" }}>
            <div style={{ padding: "22px 22px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${S.border}` }}>
              <div style={{ fontFamily: titleFont, fontSize: 18, fontWeight: 800 }}>Assign to Group</div>
              <button onClick={() => setShowAssign(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: S.textSoft }}><X size={20} /></button>
            </div>
            <div className="opa-scroll" style={{ padding: 22, display: "grid", gap: 10, maxHeight: "72vh", overflow: "auto" }}>
              <div style={{ padding: "12px 14px", borderRadius: 14, background: "#f8fbff", fontSize: 13, color: S.text }}>{showAssign.email}{showAssign.name ? ` • ${showAssign.name}` : ""}</div>
              {[{ $id: "none", name: "No group", emoji: "➖", color: "#94a3b8", schedule: "Assign later", seats: 0 } as unknown as Group, ...groups].map((g) => {
                const targetId = g.$id === "none" ? null : g.$id;
                const active = assignGroupId === targetId;
                const count = g.$id === "none" ? 0 : eligible.filter((u) => u.groupName === g.name && u.status !== "inactive").length;
                return (
                  <button key={g.$id} onClick={() => setAssignGroupId(targetId)} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, border: `1px solid ${active ? S.blue : S.border}`, background: active ? S.blueSoft : "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: g.$id === "none" ? "#f3f5f9" : `${g.color}18`, color: g.$id === "none" ? S.textSoft : g.color, display: "grid", placeItems: "center", fontSize: 22 }}>{g.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: S.textSoft }}>{g.$id === "none" ? "Assign later" : `${count}/${g.seats} seats • ${g.schedule}`}</div>
                    </div>
                    {active && <div style={{ color: S.blue, fontWeight: 900 }}>✓</div>}
                  </button>
                );
              })}
            </div>
            <div style={{ padding: 18, borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAssign(null)} style={btnOutline}>Cancel</button>
              <button onClick={handleAssignGroup} style={btnPrimary}>Save</button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleCSV} style={{ display: "none" }} />

      {/* ── DELETE GROUP CONFIRM MODAL ── */}
      {groupToDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,18,33,.45)", display: "grid", placeItems: "center", zIndex: 300, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 400, boxShadow: "0 30px 70px rgba(0,0,0,.2)", padding: 28, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <Trash2 size={24} color={S.red} />
            </div>
            <div style={{ fontFamily: titleFont, fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Delete "{groupToDelete.name}"?</div>
            <div style={{ fontSize: 12, color: S.textSoft, lineHeight: 1.6, marginBottom: 22 }}>
              This will permanently delete the group and remove all learners from it. Learners will remain in Eligible Users but will have no group assigned.
              {eligible.filter(u => u.groupName === groupToDelete.name).length > 0 && (
                <span style={{ display: "block", marginTop: 8, fontWeight: 700, color: S.red }}>
                  ⚠ {eligible.filter(u => u.groupName === groupToDelete.name).length} learner(s) will be unassigned.
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setGroupToDelete(null)} style={{ ...btnOutline, padding: "10px 20px" }}>Cancel</button>
              <button onClick={() => handleDeleteGroup(groupToDelete)} style={{ ...btnPrimary, background: S.red, padding: "10px 20px" }}>Delete Group</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGE PASSWORD MODAL ── */}
      {showChangePassword && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,18,33,.45)", display: "grid", placeItems: "center", zIndex: 300, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 30px 70px rgba(0,0,0,.2)", overflow: "hidden" }}>
            <div style={{ padding: "20px 22px 16px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: titleFont, fontSize: 16, fontWeight: 800 }}>Change Password</div>
              <button onClick={() => setShowChangePassword(false)} style={{ border: "none", background: "none", cursor: "pointer", color: S.textSoft }}><X size={20} /></button>
            </div>
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: S.text, display: "block", marginBottom: 5 }}>Current Password</label>
                <input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="Enter current password" style={{ ...inputStyle, width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: S.text, display: "block", marginBottom: 5 }}>New Password</label>
                <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="Min. 8 characters" style={{ ...inputStyle, width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: S.text, display: "block", marginBottom: 5 }}>Confirm New Password</label>
                <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Repeat new password" style={{ ...inputStyle, width: "100%" }} />
              </div>
              {pwErr && <div style={{ fontSize: 12, color: S.red, fontWeight: 600 }}>⚠ {pwErr}</div>}
            </div>
            <div style={{ padding: "14px 22px", borderTop: `1px solid ${S.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowChangePassword(false)} style={btnOutline}>Cancel</button>
              <button onClick={handleChangePassword} disabled={pwLoading} style={{ ...btnPrimary, opacity: pwLoading ? 0.7 : 1 }}>
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", right: 22, bottom: 22, zIndex: 260, padding: "12px 16px", borderRadius: 14, background: toast.ok ? S.green : S.red, color: "#fff", fontWeight: 800, boxShadow: "0 20px 50px rgba(0,0,0,.18)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}