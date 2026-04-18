// src/services/progressService.ts
// Saves and loads practice session records in Appwrite DB.
// Used by sessionTracker.ts (write) and ProgressDashboard.tsx (read).

import { databases, DATABASE_ID } from "../appwrite";
import { ID, Query } from "appwrite";

// ─── CREATE THIS COLLECTION IN APPWRITE ────────────────────────────────────
// Collection name : progress_sessions
// Collection ID   : progress_sessions   (or paste your actual ID below)
// Attributes:
//   userId          String  255  required
//   activityId      String  64   required
//   activityLabel   String  128  required
//   skill           String  64   required
//   topic           String  128  required
//   difficulty      String  64   required
//   durationSeconds Integer      required
//   date            String  10   required   (YYYY-MM-DD)
//   timestamp       Integer      required   (epoch ms — use Integer 64-bit)
// Indexes:
//   userId          (key, ASC)  ← required for listing by user
// ───────────────────────────────────────────────────────────────────────────

export const PROGRESS_COLLECTION_ID = "progress_sessions"; // ← change if needed

export interface SessionRecord {
  id: string;
  activityId: string;
  activityLabel: string;
  skill: string;
  topic: string;
  difficulty: string;
  durationSeconds: number;
  date: string;       // YYYY-MM-DD local
  timestamp: number;  // epoch ms
}

/** Save one session record to Appwrite. */
export async function saveSessionToDB(
  userId: string,
  record: SessionRecord,
): Promise<void> {
  try {
    await databases.createDocument(
      DATABASE_ID,
      PROGRESS_COLLECTION_ID,
      ID.unique(),
      {
        userId,
        activityId:      record.activityId,
        activityLabel:   record.activityLabel,
        skill:           record.skill,
        topic:           record.topic,
        difficulty:      record.difficulty,
        durationSeconds: record.durationSeconds,
        date:            record.date,
        timestamp:       record.timestamp,
      },
    );
  } catch (e) {
    console.warn("[progressService] Failed to save session to DB:", e);
  }
}

/** Load all sessions for a user from Appwrite. Returns [] on error. */
export async function loadSessionsFromDB(userId: string): Promise<SessionRecord[]> {
  try {
    const res = await databases.listDocuments(
      DATABASE_ID,
      PROGRESS_COLLECTION_ID,
      [
        Query.equal("userId", userId),
        Query.orderDesc("timestamp"),
        Query.limit(500),
      ],
    );
    return res.documents.map((d) => ({
      id:              d.$id,
      activityId:      d.activityId,
      activityLabel:   d.activityLabel,
      skill:           d.skill,
      topic:           d.topic,
      difficulty:      d.difficulty,
      durationSeconds: d.durationSeconds,
      date:            d.date,
      timestamp:       d.timestamp,
    }));
  } catch (e) {
    console.warn("[progressService] Failed to load sessions from DB:", e);
    return [];
  }
}

/** Delete all sessions for a user (used by the clear history button). */
export async function clearSessionsFromDB(userId: string): Promise<void> {
  try {
    // Appwrite doesn't have bulk delete — fetch IDs then delete in batches
    const res = await databases.listDocuments(
      DATABASE_ID,
      PROGRESS_COLLECTION_ID,
      [Query.equal("userId", userId), Query.limit(500)],
    );
    await Promise.all(
      res.documents.map((d) =>
        databases.deleteDocument(DATABASE_ID, PROGRESS_COLLECTION_ID, d.$id),
      ),
    );
  } catch (e) {
    console.warn("[progressService] Failed to clear sessions:", e);
  }
}
