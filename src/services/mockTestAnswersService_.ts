// ─── FIX: Add this MISSING export to your mockTestAnswersService.ts ───
// The error is: L_T1_MockTest.tsx imports 'saveListeningPartAnswersDB' 
// but it doesn't exist in mockTestAnswersService.ts
//
// ADD THIS FUNCTION to your existing mockTestAnswersService.ts file
// (anywhere — top or bottom, doesn't matter)

/**
 * Save listening part answers to the database.
 * Used by L_T1_MockTest through L_T6_MockTest.
 */
 
 import { databases, account } from "../appwrite";
import { Query } from "appwrite";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

// IMPORTANT:
// Put your real env var here (the collection that stores mock answers/results)
const MOCK_ANSWERS_COLLECTION_ID =
  import.meta.env.VITE_APPWRITE_MOCK_RESULTS_COLLECTION_ID ||
  import.meta.env.VITE_APPWRITE_MOCK_ANSWERS_COLLECTION_ID;

async function getCurrentUserId(): Promise<string> {
  const user = await account.get();
  return user.$id;
}

/**
 * ✅ This is the missing export your console complains about.
 * Loads all saved parts for Listening mock from DB for the current user.
 */
export async function loadAllPartsFromDB(params: {
  mockSet: number;
  skill?: "listening" | "reading" | "writing" | "speaking";
}): Promise<Record<number, any>> {
  const { mockSet, skill = "listening" } = params;

  const userId = await getCurrentUserId();

  const res = await databases.listDocuments(DATABASE_ID, MOCK_ANSWERS_COLLECTION_ID, [
    Query.equal("userId", userId),
    Query.equal("mockSet", mockSet),
    Query.equal("skill", skill),
    Query.limit(100),
  ]);

  // Return: { 1: doc, 2: doc, ... }
  const parts: Record<number, any> = {};
  for (const doc of res.documents) {
    const partNumber = Number(doc.partNumber);
    if (!Number.isNaN(partNumber)) parts[partNumber] = doc;
  }

  return parts;
}

export async function saveListeningPartAnswersDB(params: {
  mockSet: number;
  partNumber: number;
  userAnswers: any;
  correctAnswers: any;
  questions: any;
  totalQuestions: number;
  correctCount: number;
  materialId?: string | null;
}): Promise<void> {
  const { mockSet, partNumber, userAnswers, correctAnswers, questions, totalQuestions, correctCount, materialId } = params;
  
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    console.warn("[MockAnswers] No user session — saving to localStorage only");
    return;
  }

  const timestamp = new Date().toISOString();

  const docData: Record<string, any> = {
    userId,
    skill: "listening",
    partNumber,
    mockSet,
    userAnswers: typeof userAnswers === "string" ? userAnswers : JSON.stringify(userAnswers),
    correctAnswers: typeof correctAnswers === "string" ? correctAnswers : JSON.stringify(correctAnswers),
    questions: typeof questions === "string" ? questions : JSON.stringify(questions),
    totalQuestions,
    correctCount,
    timestamp,
  };

  const docId = `${userId}_listening_p${partNumber}_s${mockSet}`;
  const safeDocId = docId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);

  try {
    await databases.updateDocument(
      DATABASE_ID,
      MOCK_ANSWERS_COLLECTION_ID,
      safeDocId,
      docData
    );
    console.log(`[MockAnswers] Updated listening part ${partNumber} set ${mockSet}`);
  } catch (updateErr: any) {
    if (updateErr?.code === 404 || updateErr?.type === "document_not_found") {
      try {
        await databases.createDocument(
          DATABASE_ID,
          MOCK_ANSWERS_COLLECTION_ID,
          safeDocId,
          docData
        );
        console.log(`[MockAnswers] Created listening part ${partNumber} set ${mockSet}`);
      } catch (createErr) {
        console.error(`[MockAnswers] Failed to create listening doc:`, createErr);
      }
    } else {
      console.error(`[MockAnswers] Failed to update listening doc:`, updateErr);
    }
  }
}
