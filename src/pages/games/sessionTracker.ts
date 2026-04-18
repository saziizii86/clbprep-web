// src/pages/games/sessionTracker.ts
// Tracks time spent in games and AI Skill Builder sessions.
// Saves to localStorage (fast/offline) AND Appwrite DB (persistent across devices).
// Only saves sessions ≥ 1 minute. Handles tab-switch pausing and 5-min away-timeout.

import { saveSessionToDB } from "../../services/progressService";

export interface SessionRecord {
  id: string;
  activityId: string;
  activityLabel: string;
  skill: string;
  topic: string;
  difficulty: string;
  durationSeconds: number;
  date: string;       // YYYY-MM-DD (local)
  timestamp: number;  // epoch ms
}

const STORAGE_KEY       = "clbprep_sessions";
const MIN_VALID_SECONDS = 60;
const AWAY_TIMEOUT_MS   = 5 * 60 * 1000; // 5 minutes

interface ActiveSession {
  activityId: string;
  activityLabel: string;
  skill: string;
  topic: string;
  difficulty: string;
  activeStartMs: number;
  accumulatedMs: number;
  isPaused: boolean;
}

let active: ActiveSession | null = null;
let awayTimer: ReturnType<typeof setTimeout> | null = null;
let _userId: string | null = null;

/** Call this once when the user logs in. Required for DB saving. */
export function setTrackerUserId(userId: string): void {
  _userId = userId;
}

function handleVisibility(): void {
  if (!active) return;
  if (document.hidden) {
    if (!active.isPaused) {
      active.accumulatedMs += Date.now() - active.activeStartMs;
      active.isPaused = true;
    }
    if (awayTimer) clearTimeout(awayTimer);
    awayTimer = setTimeout(() => {
      persist();
      active    = null;
      awayTimer = null;
      document.removeEventListener("visibilitychange", handleVisibility);
    }, AWAY_TIMEOUT_MS);
  } else {
    if (awayTimer) { clearTimeout(awayTimer); awayTimer = null; }
    if (active && active.isPaused) {
      active.activeStartMs = Date.now();
      active.isPaused      = false;
    }
  }
}

function getTotalSeconds(): number {
  if (!active) return 0;
  let ms = active.accumulatedMs;
  if (!active.isPaused) ms += Date.now() - active.activeStartMs;
  return Math.floor(ms / 1000);
}

function persist(): void {
  if (!active) return;
  const seconds = getTotalSeconds();
  if (seconds < MIN_VALID_SECONDS) return;

  const now  = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const record: SessionRecord = {
    id:              `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    activityId:      active.activityId,
    activityLabel:   active.activityLabel,
    skill:           active.skill,
    topic:           active.topic,
    difficulty:      active.difficulty,
    durationSeconds: seconds,
    date,
    timestamp: Date.now(),
  };

  // 1. Save to localStorage (instant, works offline)
  try {
    const existing: SessionRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    existing.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn("[sessionTracker] localStorage save failed:", e);
  }

  // 2. Save to Appwrite DB (async, requires login)
  if (_userId) {
    saveSessionToDB(_userId, record).catch((e) =>
      console.warn("[sessionTracker] DB save failed:", e),
    );
  }
}

export function startSession(
  activityId: string,
  activityLabel: string,
  skill: string,
  topic: string,
  difficulty: string,
): void {
  stopSession();
  active = {
    activityId,
    activityLabel,
    skill,
    topic,
    difficulty,
    activeStartMs: Date.now(),
    accumulatedMs: 0,
    isPaused: document.hidden,
  };
  document.addEventListener("visibilitychange", handleVisibility);
}

export function stopSession(): void {
  if (!active) return;
  document.removeEventListener("visibilitychange", handleVisibility);
  if (awayTimer) { clearTimeout(awayTimer); awayTimer = null; }
  persist();
  active = null;
}

export function getSessions(): SessionRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearLocalSessions(): void {
  localStorage.removeItem(STORAGE_KEY);
}
