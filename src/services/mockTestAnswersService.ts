// src/services/mockTestAnswersService.ts
// Service for saving and loading mock test answers to/from Appwrite Database
// Replaces localStorage-based answer storage with persistent DB storage

import { databases, account, DATABASE_ID } from "../appwrite";
import { Query, ID } from "appwrite";

// Collection ID for mock test answers (SAME collection for ALL skills including Speaking)
export const MOCK_ANSWERS_COLLECTION_ID =
  import.meta.env.VITE_APPWRITE_MOCK_ANSWERS_COLLECTION_ID || "mock_test_answers";

// ─── Types ───────────────────────────────────────────────────────────

export type QuestionDetail = {
  questionIndex: number;
  questionText: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  correctLetter: string;
  userAnswerLetter: string;
  isCorrect: boolean;
};

export type SavedPartAnswers = {
  id?: string;
  userId: string;
  skill: "listening" | "reading";
  partNumber: number;
  mockSet: number;
  userAnswers: Record<string, any>;
  correctAnswers: Record<string, any>;
  questions: QuestionDetail[];
  totalQuestions: number;
  correctCount: number;
  timestamp: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string> {
  try {
    const user = await account.get();
    return user.$id;
  } catch (err) {
    console.warn("[MockAnswers] Could not get user ID, using fallback:", err);
    let anonId = localStorage.getItem("anonUserId");
    if (!anonId) {
      anonId = "anon_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      localStorage.setItem("anonUserId", anonId);
    }
    return anonId;
  }
}

function computeCorrectCount(
  userAnswers: Record<string, any>,
  correctAnswers: Record<string, any>,
  questions: QuestionDetail[]
): number {
  if (questions && questions.length > 0) {
    return questions.filter((q) => q.isCorrect).length;
  }
  let count = 0;
  for (const key of Object.keys(correctAnswers)) {
    const ua = String(userAnswers[key] ?? "").trim();
    const ca = String(correctAnswers[key] ?? "").trim();
    if (ua && ua === ca) count++;
  }
  return count;
}

function safeParseJSON(s: any): any | null {
  if (!s) return null;
  if (typeof s === "object") return s;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ─── Save Part Answers ───────────────────────────────────────────────

/**
 * Save answers for a specific part of a mock test to the database.
 * Uses a deterministic document ID so we can directly get/update without needing indexes.
 */
export async function savePartAnswersToDB(
  skill: "listening" | "reading",
  partNumber: number,
  userAnswers: Record<string, any>,
  correctAnswers: Record<string, any>,
  questions: QuestionDetail[],
  mockSet: number
): Promise<void> {
  const userId = await getCurrentUserId();
  const totalQuestions =
    questions.length > 0
      ? questions.length
      : Math.max(
          Object.keys(userAnswers).length,
          Object.keys(correctAnswers).length
        );
  const correctCount = computeCorrectCount(userAnswers, correctAnswers, questions);
  const timestamp = new Date().toISOString();

  const docData: Record<string, any> = {
    userId,
    skill,
    partNumber,
    mockSet,
    userAnswers: JSON.stringify(userAnswers),
    correctAnswers: JSON.stringify(correctAnswers),
    questions: JSON.stringify(questions),
    totalQuestions,
    correctCount,
    timestamp,
  };

  const docId = `${userId}_${skill}_p${partNumber}_s${mockSet}`;
  const safeDocId = docId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);

  try {
    await databases.updateDocument(
      DATABASE_ID,
      MOCK_ANSWERS_COLLECTION_ID,
      safeDocId,
      docData
    );
    console.log(`[MockAnswers] Updated ${skill} part ${partNumber} set ${mockSet}`);
  } catch (updateErr: any) {
    if (updateErr?.code === 404 || updateErr?.type === "document_not_found") {
      try {
        await databases.createDocument(
          DATABASE_ID,
          MOCK_ANSWERS_COLLECTION_ID,
          safeDocId,
          docData
        );
        console.log(`[MockAnswers] Created ${skill} part ${partNumber} set ${mockSet}`);
      } catch (createErr) {
        console.error(`[MockAnswers] Failed to create document:`, createErr);
        throw createErr;
      }
    } else {
      console.error(`[MockAnswers] Failed to update document:`, updateErr);
      throw updateErr;
    }
  }

  // Keep localStorage as a fast cache
  const localKey =
    skill === "listening"
      ? `mockListening_part${partNumber}_answers_set${mockSet}`
      : `mockTest_reading_part${partNumber}_set${mockSet}`;
  localStorage.setItem(
    localKey,
    JSON.stringify({
      userId,
      skill,
      partNumber,
      mockSet,
      userAnswers,
      correctAnswers,
      questions,
      totalQuestions,
      correctCount,
      timestamp,
    })
  );
}


// ─── Speaking (Tasks 1–8) ────────────────────────────────────────────

export type SavedSpeakingTask = {
  id?: string;
  userId: string;
  skill: "speaking";
  taskNumber: number;
  mockSet: number;
  prompt: string;
  transcript: string;
  materialId?: string;
  timestamp: string;
};

function makeSpeakingDocId(userId: string, taskNumber: number, mockSet: number) {
  const shortUser = String(userId).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 16);
  return `sp_${shortUser}_${taskNumber}_${mockSet}`;
}

export async function saveSpeakingTaskToDB(
  taskNumber: number,
  mockSet: number,
  data: { prompt?: string; transcript?: string; materialId?: string }
): Promise<void> {
  const cacheKey = `mockSpeaking_T${taskNumber}_set${mockSet}`;
  const cached = safeParseJSON(localStorage.getItem(cacheKey)) || {};

  const prompt = data.prompt ?? cached.prompt ?? "";
  const transcript = data.transcript ?? cached.transcript ?? "";
  const materialId = data.materialId ?? cached.materialId ?? "";

  if (data.prompt !== undefined)
    localStorage.setItem(`mockSpeaking_T${taskNumber}_prompt_set${mockSet}`, prompt);
  if (data.transcript !== undefined)
    localStorage.setItem(`mockSpeaking_T${taskNumber}_transcript_set${mockSet}`, transcript);
  if (data.materialId !== undefined)
    localStorage.setItem(`mockSpeaking_T${taskNumber}_materialId_set${mockSet}`, materialId);

  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    userId = "anonymous";
  }

  const timestamp = new Date().toISOString();

  localStorage.setItem(cacheKey, JSON.stringify({
    userId, skill: "speaking", taskNumber, mockSet,
    prompt, transcript, materialId, timestamp
  }));

  console.log(`[Speaking T${taskNumber}] Saved to localStorage: prompt=${prompt.length}chars, transcript=${transcript.length}chars`);

  try {
    const docData: Record<string, any> = {
      userId,
      skill: "speaking",
      partNumber: taskNumber,
      mockSet,
      userAnswers: JSON.stringify({ transcript }),
      correctAnswers: JSON.stringify({}),
      questions: JSON.stringify({ prompt, materialId }),
      totalQuestions: 1,
      correctCount: 0,
      timestamp,
    };

    const docId = makeSpeakingDocId(userId, taskNumber, mockSet);

    try {
      await databases.updateDocument(DATABASE_ID, MOCK_ANSWERS_COLLECTION_ID, docId, docData);
      console.log(`[Speaking T${taskNumber}] Updated in DB`);
    } catch (updateErr: any) {
      if (updateErr?.code === 404 || updateErr?.type === "document_not_found") {
        await databases.createDocument(DATABASE_ID, MOCK_ANSWERS_COLLECTION_ID, docId, docData);
        console.log(`[Speaking T${taskNumber}] Created in DB`);
      } else {
        throw updateErr;
      }
    }
  } catch (dbErr: any) {
    console.warn(`[Speaking T${taskNumber}] DB save failed (localStorage OK):`, dbErr?.message || dbErr);
  }
}

export async function loadSpeakingTaskFromDB(
  taskNumber: number,
  mockSet: number
): Promise<SavedSpeakingTask | null> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    userId = "anonymous";
  }

  const docId = makeSpeakingDocId(userId, taskNumber, mockSet);

  try {
    const doc: any = await databases.getDocument(DATABASE_ID, MOCK_ANSWERS_COLLECTION_ID, docId);
    const q = safeParseJSON(doc.questions) || {};
    const ua = safeParseJSON(doc.userAnswers) || {};

    return {
      id: doc.$id,
      userId: doc.userId,
      skill: "speaking",
      taskNumber: Number(doc.partNumber ?? taskNumber),
      mockSet: Number(doc.mockSet ?? mockSet),
      prompt: String(q.prompt || ""),
      transcript: String(ua.transcript || ""),
      materialId: q.materialId ? String(q.materialId) : "",
      timestamp: String(doc.timestamp || ""),
    };
  } catch {
    console.log(`[Speaking T${taskNumber}] DB load failed, trying localStorage`);
  }

  const cacheKey = `mockSpeaking_T${taskNumber}_set${mockSet}`;
  const cached = safeParseJSON(localStorage.getItem(cacheKey));
  const prompt = cached?.prompt || localStorage.getItem(`mockSpeaking_T${taskNumber}_prompt_set${mockSet}`) || "";
  const transcript = cached?.transcript || localStorage.getItem(`mockSpeaking_T${taskNumber}_transcript_set${mockSet}`) || "";
  const materialId = cached?.materialId || localStorage.getItem(`mockSpeaking_T${taskNumber}_materialId_set${mockSet}`) || "";

  if (prompt || transcript) {
    return {
      userId: cached?.userId || userId,
      skill: "speaking",
      taskNumber, mockSet, prompt, transcript, materialId,
      timestamp: cached?.timestamp || "",
    };
  }

  return null;
}

export async function loadAllSpeakingTasksFromDB(mockSet: number): Promise<SavedSpeakingTask[]> {
  const out: SavedSpeakingTask[] = [];

  for (let t = 1; t <= 8; t++) {
    const doc = await loadSpeakingTaskFromDB(t, mockSet);
    out.push(doc ?? {
      userId: "", skill: "speaking", taskNumber: t,
      mockSet, prompt: "", transcript: "", materialId: "", timestamp: "",
    });
  }

  console.log(`[Speaking] Loaded ${out.filter(t => t.prompt || t.transcript).length}/8 tasks for set ${mockSet}`);
  return out;
}


// ─── Load All Parts for Results ──────────────────────────────────────

/**
 * Load all part answers for a given skill and mockSet from the database.
 * ✅ NEVER falls back to localStorage — stale local data would corrupt results.
 * If a DB document doesn't exist, returns a genuinely empty record (questions: []).
 */
export async function loadAllPartsFromDB(
  skill: "listening" | "reading",
  mockSet: number
): Promise<SavedPartAnswers[]> {
  const maxParts = skill === "listening" ? 6 : 4;
  const results: SavedPartAnswers[] = [];

  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    console.warn("[MockAnswers] Cannot get userId — returning empty parts");
    for (let p = 1; p <= maxParts; p++) {
      results.push({
        userId: "", skill, partNumber: p, mockSet,
        userAnswers: {}, correctAnswers: {}, questions: [],
        totalQuestions: 0, correctCount: 0, timestamp: "",
      });
    }
    return results;
  }

  for (let partNum = 1; partNum <= maxParts; partNum++) {
    const docId = `${userId}_${skill}_p${partNum}_s${mockSet}`;
    const safeDocId = docId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);

    try {
      const doc = await databases.getDocument(
        DATABASE_ID,
        MOCK_ANSWERS_COLLECTION_ID,
        safeDocId
      );

      results.push({
        id: doc.$id,
        userId: doc.userId,
        skill: doc.skill,
        partNumber: doc.partNumber,
        mockSet: doc.mockSet,
        userAnswers: safeParseJSON(doc.userAnswers) || {},
        correctAnswers: safeParseJSON(doc.correctAnswers) || {},
        questions: safeParseJSON(doc.questions) || [],
        totalQuestions: doc.totalQuestions || 0,
        correctCount: doc.correctCount || 0,
        timestamp: doc.timestamp || "",
      });
    } catch {
      // 404 = part not saved this run → genuinely empty, NOT localStorage fallback
      results.push({
        userId, skill, partNumber: partNum, mockSet,
        userAnswers: {}, correctAnswers: {}, questions: [],
        totalQuestions: 0, correctCount: 0, timestamp: "",
      });
    }
  }

  return results;
}

// ─── Convenience wrappers ─────────────────────────────────────────────

export async function saveListeningPartAnswersDB(
  partNumber: number,
  userAnswers: Record<number, string>,
  correctAnswers: Record<number, string>,
  questions: any[],
  mockSet: number
): Promise<void> {
  const ua: Record<string, any> = {};
  for (const [k, v] of Object.entries(userAnswers)) ua[String(k)] = v;
  const ca: Record<string, any> = {};
  for (const [k, v] of Object.entries(correctAnswers)) ca[String(k)] = v;
  await savePartAnswersToDB("listening", partNumber, ua, ca, questions, mockSet);
}

export async function saveReadingPartAnswersDB(
  partNumber: number,
  userAnswers: Record<number, any>,
  correctAnswers: Record<number, any>,
  questions: any[],
  mockSet: number
): Promise<void> {
  const ua: Record<string, any> = {};
  for (const [k, v] of Object.entries(userAnswers)) ua[String(k)] = v;
  const ca: Record<string, any> = {};
  for (const [k, v] of Object.entries(correctAnswers)) ca[String(k)] = v;
  await savePartAnswersToDB("reading", partNumber, ua, ca, questions, mockSet);
}

// ─── Legacy aliases ──────────────────────────────────────────────────

export const saveSpeakingTranscriptToDB = saveSpeakingTaskToDB;
export const loadSpeakingTranscriptsFromDB = loadAllSpeakingTasksFromDB;
export const loadMockSpeakingFromDB = loadAllSpeakingTasksFromDB;
export const loadSpeakingTasksFromDB = loadAllSpeakingTasksFromDB;

// ─── Clear Answers on New Test Start ─────────────────────────────────

/**
 * ✅ Resets all answers for a mockSet by writing empty records to DB.
 *
 * WHY UPSERT NOT DELETE:
 * The Appwrite collection permissions deny DELETE (401 Unauthorized).
 * Instead we UPDATE existing docs with empty data. The results pages
 * check questions.length > 0 to detect a completed part — empty records
 * correctly produce 0/N on the results page.
 *
 * If a doc doesn't exist yet (404 on update), we skip it —
 * it will be created fresh when the user completes that part.
 *
 * Also wipes all matching localStorage keys to prevent stale cache leaking.
 *
 * Usage in userHome.tsx > handleStartMockTest(), after the access guard:
 *   import { clearMockAnswersFromDB } from "../services/mockTestAnswersService";
 *   const mockSetNum = parseInt(String(exam?.number ?? exam?.key ?? "1"), 10) || 1;
 *   await clearMockAnswersFromDB(mockSetNum);
 */
export async function clearMockAnswersFromDB(mockSet: number): Promise<void> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    console.warn("[MockAnswers] clearMockAnswersFromDB: no userId — clearing localStorage only");
    clearMockAnswersFromLocalStorage(mockSet);
    return;
  }

  const timestamp = new Date().toISOString();
  const upsertPromises: Promise<any>[] = [];

  // Shared helper: update with empty payload, silently skip 404s
  const resetDoc = async (docId: string, emptyDoc: Record<string, any>) => {
    try {
      await databases.updateDocument(DATABASE_ID, MOCK_ANSWERS_COLLECTION_ID, docId, emptyDoc);
    } catch (err: any) {
      const is404 = err?.code === 404 || err?.type === "document_not_found";
      if (!is404) {
        // Unexpected error — log but don't crash the test start
        console.warn(`[MockAnswers] Could not reset ${docId}:`, err?.message);
      }
      // 404 = doc never existed, nothing to reset — that's fine
    }
  };

  // ── 1. Listening parts 1–6 ──
  for (let p = 1; p <= 6; p++) {
    const safeDocId = `${userId}_listening_p${p}_s${mockSet}`
      .replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);

    upsertPromises.push(resetDoc(safeDocId, {
      userId, skill: "listening", partNumber: p, mockSet,
      userAnswers: JSON.stringify({}),
      correctAnswers: JSON.stringify({}),
      questions: JSON.stringify([]),   // ← empty array signals "not completed"
      totalQuestions: 0,
      correctCount: 0,
      timestamp,
    }));
  }

  // ── 2. Reading parts 1–4 ──
  for (let p = 1; p <= 4; p++) {
    const safeDocId = `${userId}_reading_p${p}_s${mockSet}`
      .replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);

    upsertPromises.push(resetDoc(safeDocId, {
      userId, skill: "reading", partNumber: p, mockSet,
      userAnswers: JSON.stringify({}),
      correctAnswers: JSON.stringify({}),
      questions: JSON.stringify([]),
      totalQuestions: 0,
      correctCount: 0,
      timestamp,
    }));
  }

  // ── 3. Speaking tasks 1–8 ──
  const shortUser = String(userId).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 16);
  for (let t = 1; t <= 8; t++) {
    const speakingDocId = `sp_${shortUser}_${t}_${mockSet}`;

    upsertPromises.push(resetDoc(speakingDocId, {
      userId, skill: "speaking", partNumber: t, mockSet,
      userAnswers: JSON.stringify({ transcript: "" }),
      correctAnswers: JSON.stringify({}),
      questions: JSON.stringify({ prompt: "", materialId: "" }),
      totalQuestions: 1,
      correctCount: 0,
      timestamp,
    }));
  }

  await Promise.all(upsertPromises);

  // ── 4. Wipe matching localStorage keys ──
  clearMockAnswersFromLocalStorage(mockSet);

  console.log(`🧹 [MockAnswers] Reset all answers for mockSet ${mockSet}`);
}

/**
 * Removes all localStorage keys belonging to a given mockSet.
 */
function clearMockAnswersFromLocalStorage(mockSet: number): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.includes(`_set${mockSet}`) || key.includes(`_s${mockSet}`)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((k) => localStorage.removeItem(k));
  console.log(`🧹 [MockAnswers] Cleared ${keysToRemove.length} localStorage keys for set ${mockSet}`);
}
