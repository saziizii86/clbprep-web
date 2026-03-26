// src/services/mockTestAnswersService.ts
// Service for saving and loading mock test answers to/from Appwrite Database
// Replaces localStorage-based answer storage with persistent DB storage

import { databases, account, DATABASE_ID } from "../appwrite";
import { Query, ID } from "appwrite";

// Collection ID for mock test answers
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

  // Use a deterministic document ID based on user+skill+part+set
  // This avoids needing composite indexes for lookups
  const docId = `${userId}_${skill}_p${partNumber}_s${mockSet}`;
  // Appwrite doc IDs: max 36 chars, alphanumeric + hyphen/underscore/period
  const safeDocId = docId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);

  try {
    // Try to update existing document first
    await databases.updateDocument(
      DATABASE_ID,
      MOCK_ANSWERS_COLLECTION_ID,
      safeDocId,
      docData
    );
    console.log(`[MockAnswers] Updated ${skill} part ${partNumber} set ${mockSet}`);
  } catch (updateErr: any) {
    // If document doesn't exist (404), create it
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

  // Also keep localStorage as a fast cache
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
// We reuse the same collection/table: MOCK_ANSWERS_COLLECTION_ID ("mock_test_answers")

export type SavedSpeakingTask = {
  id?: string;
  userId: string;
  skill: "speaking";
  taskNumber: number; // 1..8
  mockSet: number;
  prompt: string;
  transcript: string;
  materialId?: string;
  timestamp: string;
};

function makeSpeakingDocId(userId: string, taskNumber: number, mockSet: number) {
  // Keep it short so it never gets truncated/collides
  const shortUser = String(userId).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 16);
  return `sp_${shortUser}_${taskNumber}_${mockSet}`; // <= 36 chars
}

/**
 * Save (create/update) speaking prompt+transcript into mock_test_answers table.
 * Maps to your schema:
 * - skill = "speaking"
 * - partNumber = taskNumber
 * - questions = JSON({prompt, materialId})
 * - userAnswers = JSON({transcript})
 * - correctAnswers empty JSON
 */
export async function saveSpeakingTaskToDB(
  taskNumber: number,
  mockSet: number,
  data: { prompt?: string; transcript?: string; materialId?: string }
): Promise<void> {
  const userId = await getCurrentUserId();
  const timestamp = new Date().toISOString();

  // Merge with local cache so saving transcript doesn't wipe prompt
  const cacheKey = `mockSpeaking_T${taskNumber}_set${mockSet}`;
  const cached = safeParseJSON(localStorage.getItem(cacheKey)) || {};

  const prompt = data.prompt ?? cached.prompt ?? "";
  const transcript = data.transcript ?? cached.transcript ?? "";
  const materialId = data.materialId ?? cached.materialId ?? "";

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
  } catch (updateErr: any) {
    try {
      await databases.createDocument(DATABASE_ID, MOCK_ANSWERS_COLLECTION_ID, docId, docData);
    } catch (createErr: any) {
      // IMPORTANT: do not crash UI if permissions are wrong
      console.warn("[Speaking] DB save failed:", createErr);
    }
  }

  localStorage.setItem(cacheKey, JSON.stringify({ userId, skill: "speaking", taskNumber, mockSet, prompt, transcript, materialId, timestamp }));
}

export async function loadSpeakingTaskFromDB(
  taskNumber: number,
  mockSet: number
): Promise<SavedSpeakingTask | null> {
  const userId = await getCurrentUserId();
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
  } catch (err: any) {
    // fallback to localStorage
    const cacheKey = `mockSpeaking_T${taskNumber}_set${mockSet}`;
    const cached = safeParseJSON(localStorage.getItem(cacheKey));
    if (cached) {
      return {
        userId: cached.userId || userId,
        skill: "speaking",
        taskNumber,
        mockSet,
        prompt: cached.prompt || "",
        transcript: cached.transcript || "",
        materialId: cached.materialId || "",
        timestamp: cached.timestamp || "",
      };
    }
    return null;
  }
}

export async function loadAllSpeakingTasksFromDB(mockSet: number): Promise<SavedSpeakingTask[]> {
  const out: SavedSpeakingTask[] = [];
  for (let t = 1; t <= 8; t++) {
    const doc = await loadSpeakingTaskFromDB(t, mockSet);
    if (doc) out.push(doc);
  }
  return out;
}


// ─── Load All Parts for Results ──────────────────────────────────────

/**
 * Load all part answers for a given skill and mockSet from the database.
 * Uses deterministic document IDs for direct lookups (no index needed).
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
    console.warn("[MockAnswers] Cannot get userId, falling back to localStorage");
    return loadAllPartsFromLocalStorage(skill, mockSet);
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
    } catch (err: any) {
      // Document doesn't exist for this part - try localStorage fallback
      const localData = loadPartFromLocalStorage(skill, partNum, mockSet);
      results.push(localData);
    }
  }

  return results;
}

/**
 * Load a single part from localStorage
 */
function loadPartFromLocalStorage(
  skill: "listening" | "reading",
  partNum: number,
  mockSet: number
): SavedPartAnswers {
  const localKey =
    skill === "listening"
      ? `mockListening_part${partNum}_answers_set${mockSet}`
      : `mockTest_reading_part${partNum}_set${mockSet}`;
  const raw = localStorage.getItem(localKey);
  const data = safeParseJSON(raw);

  if (data) {
    return {
      userId: data.userId || "",
      skill,
      partNumber: partNum,
      mockSet,
      userAnswers: data.userAnswers || data.answers || {},
      correctAnswers: data.correctAnswers || {},
      questions: data.questions || [],
      totalQuestions:
        data.totalQuestions ||
        (data.questions || []).length ||
        Object.keys(data.correctAnswers || {}).length,
      correctCount:
        data.correctCount ??
        computeCorrectCount(
          data.userAnswers || data.answers || {},
          data.correctAnswers || {},
          data.questions || []
        ),
      timestamp: data.timestamp || "",
    };
  }

  return {
    userId: "",
    skill,
    partNumber: partNum,
    mockSet,
    userAnswers: {},
    correctAnswers: {},
    questions: [],
    totalQuestions: 0,
    correctCount: 0,
    timestamp: "",
  };
}

/**
 * Fallback: load all parts from localStorage
 */
function loadAllPartsFromLocalStorage(
  skill: "listening" | "reading",
  mockSet: number
): SavedPartAnswers[] {
  const maxParts = skill === "listening" ? 6 : 4;
  const results: SavedPartAnswers[] = [];
  for (let partNum = 1; partNum <= maxParts; partNum++) {
    results.push(loadPartFromLocalStorage(skill, partNum, mockSet));
  }
  return results;
}

// ─── Convenience wrappers (drop-in replacements) ─────────────────────

/**
 * Drop-in replacement for saveListeningPartAnswers
 */
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

/**
 * Drop-in replacement for saveReadingPartAnswers
 */
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
