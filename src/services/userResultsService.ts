// src/services/userResultsService.ts
// Service for saving USER test results (aggregated scores) to the database
// Uses simplified schema with combined JSON fields for efficiency
// Works alongside mockTestAnswersService.ts (which stores detailed answers)

import { ID, Query } from "appwrite";
import { account, databases, DATABASE_ID } from "../appwrite";

// ============================================================
// COLLECTION ID
// ============================================================
export const USER_RESULTS_COLLECTION_ID = "user_results";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface TestResult {
  id?: string;
  
  // Required fields
  userId: string;
  testType: "mock" | "practice";
  skill: "listening" | "reading" | "writing" | "speaking";
  celpipScore: number;
  
  // Optional identification
  taskId?: string;
  materialId?: string;
  mockSet?: number;
  
  // Optional score details
  totalQuestions?: number;
  correctCount?: number;
  duration?: number;
  
  // JSON data fields
  breakdown?: string;        // JSON: part-by-part scores
  responseData?: string;     // JSON: writing response + wordCount
  evaluationData?: string;   // JSON: AI evaluation results
  transcriptData?: string;   // JSON: speaking transcripts
  
  // Auto-generated
  createdAt?: string;
}

// Parsed versions for easier use
export interface ParsedTestResult extends Omit<TestResult, 'breakdown' | 'responseData' | 'evaluationData' | 'transcriptData'> {
  breakdown?: PartBreakdown[];
  responseData?: ResponseData;
  evaluationData?: EvaluationData;
  transcriptData?: TranscriptData[];
}

export interface PartBreakdown {
  partNumber: number;
  partName: string;
  correct: number;
  total: number;
  percentage?: number;
}

export interface ResponseData {
  response: string;
  wordCount: number;
  prompt?: string;
}

export interface EvaluationData {
  overallScore: number;
  // Writing specific
  contentCoherence?: number;
  vocabulary?: number;
  readability?: number;
  taskFulfillment?: number;
  // Speaking specific
  fluency?: number;
  pronunciation?: number;
  coherence?: number;
  // Common
  strengths?: string[];
  improvements?: string[];
  feedback?: string;
}

export interface TranscriptData {
  taskNumber: number;
  prompt?: string;
  transcript?: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get current logged-in user info
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  email: string;
  name: string;
} | null> {
  try {
    const user = await account.get();
    return {
      userId: user.$id,
      email: user.email || "",
      name: user.name || user.email?.split("@")[0] || "User",
    };
  } catch (error) {
    console.warn("[userResultsService] No active user session");
    return null;
  }
}

/**
 * Calculate CELPIP score from percentage
 */
export function calculateCelpipScore(correctCount: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 3;
  
  const percentage = (correctCount / totalQuestions) * 100;
  
  if (percentage >= 97) return 12;
  if (percentage >= 93) return 11;
  if (percentage >= 88) return 10;
  if (percentage >= 82) return 9;
  if (percentage >= 75) return 8;
  if (percentage >= 67) return 7;
  if (percentage >= 58) return 6;
  if (percentage >= 48) return 5;
  if (percentage >= 38) return 4;
  return 3;
}

/**
 * Safely stringify data
 */
function safeStringify(data: any): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data);
  } catch {
    return "";
  }
}

/**
 * Safely parse JSON
 */
function safeParse<T>(str: string | null | undefined): T | null {
  if (!str) return null;
  if (typeof str === "object") return str as T;
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

// ============================================================
// MAIN SAVE FUNCTION
// ============================================================

/**
 * Save a test result to the database
 */
export async function saveTestResult(result: Omit<TestResult, "userId" | "id" | "createdAt">): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.warn("[userResultsService] No user logged in. Saving to localStorage.");
      const localKey = `result_${result.testType}_${result.skill}_${Date.now()}`;
      localStorage.setItem(localKey, JSON.stringify({ ...result, savedLocally: true }));
      return localKey;
    }
    
    // Build document data matching simplified schema
    const docData: Record<string, any> = {
      userId: user.userId,
      testType: result.testType,
      skill: result.skill,
      celpipScore: result.celpipScore || 0,
    };
    
    // Optional fields - only include if they have values
    if (result.taskId) docData.taskId = result.taskId;
    if (result.materialId) docData.materialId = result.materialId;
    if (result.mockSet !== undefined && result.mockSet !== null) docData.mockSet = result.mockSet;
    if (result.totalQuestions !== undefined) docData.totalQuestions = result.totalQuestions;
    if (result.correctCount !== undefined) docData.correctCount = result.correctCount;
    if (result.duration !== undefined) docData.duration = result.duration;
    
    // JSON fields - only include if not empty
    if (result.breakdown) docData.breakdown = safeStringify(result.breakdown);
    if (result.responseData) docData.responseData = safeStringify(result.responseData);
    if (result.evaluationData) docData.evaluationData = safeStringify(result.evaluationData);
    if (result.transcriptData) docData.transcriptData = safeStringify(result.transcriptData);
    
    // Create the document
    const doc = await databases.createDocument(
      DATABASE_ID,
      USER_RESULTS_COLLECTION_ID,
      ID.unique(),
      docData
    );
    
    console.log("[userResultsService] ✓ Saved result to DB:", doc.$id);
    return doc.$id;
    
  } catch (error: any) {
    console.error("[userResultsService] Failed to save result:", error?.message || error);
    
    // Fallback to localStorage
    const localKey = `result_${result.testType}_${result.skill}_${Date.now()}`;
    localStorage.setItem(localKey, JSON.stringify({ ...result, savedLocally: true }));
    return localKey;
  }
}

// ============================================================
// SKILL-SPECIFIC SAVE FUNCTIONS
// ============================================================

/**
 * Save Listening test result
 */
export async function saveListeningResult(params: {
  testType: "mock" | "practice";
  mockSet?: number;
  materialId?: string;
  taskId?: string;
  parts?: PartBreakdown[];
  totalCorrect: number;
  totalQuestions: number;
  celpipScore: number;
  duration?: number;
}): Promise<string | null> {
  return saveTestResult({
    testType: params.testType,
    skill: "listening",
    taskId: params.taskId,
    mockSet: params.mockSet,
    materialId: params.materialId,
    celpipScore: params.celpipScore,
    totalQuestions: params.totalQuestions,
    correctCount: params.totalCorrect,
    duration: params.duration,
    breakdown: params.parts ? safeStringify(params.parts) : undefined,
  });
}

/**
 * Save Reading test result
 */
export async function saveReadingResult(params: {
  testType: "mock" | "practice";
  taskId?: string;
  mockSet?: number;
  materialId?: string;
  parts?: PartBreakdown[];
  totalCorrect: number;
  totalQuestions: number;
  celpipScore?: number;
  duration?: number;
}): Promise<string | null> {
  const celpipScore = params.celpipScore || calculateCelpipScore(params.totalCorrect, params.totalQuestions);
  
  return saveTestResult({
    testType: params.testType,
    skill: "reading",
    taskId: params.taskId,
    mockSet: params.mockSet,
    materialId: params.materialId,
    celpipScore: celpipScore,
    totalQuestions: params.totalQuestions,
    correctCount: params.totalCorrect,
    duration: params.duration,
    breakdown: params.parts ? safeStringify(params.parts) : undefined,
  });
}

/**
 * Save Writing test result
 */
export async function saveWritingResult(params: {
  testType: "mock" | "practice";
  taskId?: string;
  mockSet?: number;
  materialId?: string;
  prompt?: string;
  response: string;
  wordCount: number;
  evaluation?: EvaluationData;
  duration?: number;
}): Promise<string | null> {
  const responseData: ResponseData = {
    response: params.response,
    wordCount: params.wordCount,
    prompt: params.prompt,
  };
  
  return saveTestResult({
    testType: params.testType,
    skill: "writing",
    taskId: params.taskId,
    mockSet: params.mockSet,
    materialId: params.materialId,
    celpipScore: params.evaluation?.overallScore || 0,
    duration: params.duration,
    responseData: safeStringify(responseData),
    evaluationData: params.evaluation ? safeStringify(params.evaluation) : undefined,
  });
}

/**
 * Save Speaking test result
 */
export async function saveSpeakingResult(params: {
  testType: "mock" | "practice";
  mockSet?: number;
  materialId?: string;
  tasks: TranscriptData[];
  evaluation?: EvaluationData;
  duration?: number;
}): Promise<string | null> {
  return saveTestResult({
    testType: params.testType,
    skill: "speaking",
    mockSet: params.mockSet,
    materialId: params.materialId,
    celpipScore: params.evaluation?.overallScore || 0,
    duration: params.duration,
    transcriptData: safeStringify(params.tasks),
    evaluationData: params.evaluation ? safeStringify(params.evaluation) : undefined,
  });
}

// ============================================================
// RETRIEVE FUNCTIONS
// ============================================================

/**
 * Get all test results for the current user (raw format)
 */
export async function getUserResults(filters?: {
  skill?: string;
  testType?: "mock" | "practice";
  limit?: number;
}): Promise<TestResult[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    
    const queries = [Query.equal("userId", user.userId)];
    
    if (filters?.skill) {
      queries.push(Query.equal("skill", filters.skill));
    }
    if (filters?.testType) {
      queries.push(Query.equal("testType", filters.testType));
    }
    
    queries.push(Query.orderDesc("$createdAt"));
    
    if (filters?.limit) {
      queries.push(Query.limit(filters.limit));
    }
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      USER_RESULTS_COLLECTION_ID,
      queries
    );
    
    return response.documents.map((doc: any) => ({
      id: doc.$id,
      userId: doc.userId,
      testType: doc.testType,
      skill: doc.skill,
      celpipScore: doc.celpipScore,
      taskId: doc.taskId,
      materialId: doc.materialId,
      mockSet: doc.mockSet,
      totalQuestions: doc.totalQuestions,
      correctCount: doc.correctCount,
      duration: doc.duration,
      breakdown: doc.breakdown,
      responseData: doc.responseData,
      evaluationData: doc.evaluationData,
      transcriptData: doc.transcriptData,
      createdAt: doc.$createdAt,
    }));
  } catch (error) {
    console.error("[userResultsService] Failed to get results:", error);
    return [];
  }
}

/**
 * Get all test results for the current user (parsed format)
 */
export async function getUserResultsParsed(filters?: {
  skill?: string;
  testType?: "mock" | "practice";
  limit?: number;
}): Promise<ParsedTestResult[]> {
  const results = await getUserResults(filters);
  
  return results.map(r => ({
    ...r,
    breakdown: safeParse<PartBreakdown[]>(r.breakdown) || undefined,
    responseData: safeParse<ResponseData>(r.responseData) || undefined,
    evaluationData: safeParse<EvaluationData>(r.evaluationData) || undefined,
    transcriptData: safeParse<TranscriptData[]>(r.transcriptData) || undefined,
  }));
}

/**
 * Get a single result by ID
 */
export async function getResultById(resultId: string): Promise<ParsedTestResult | null> {
  try {
    const doc = await databases.getDocument(
      DATABASE_ID,
      USER_RESULTS_COLLECTION_ID,
      resultId
    ) as any;
    
    return {
      id: doc.$id,
      userId: doc.userId,
      testType: doc.testType,
      skill: doc.skill,
      celpipScore: doc.celpipScore,
      taskId: doc.taskId,
      materialId: doc.materialId,
      mockSet: doc.mockSet,
      totalQuestions: doc.totalQuestions,
      correctCount: doc.correctCount,
      duration: doc.duration,
      breakdown: safeParse<PartBreakdown[]>(doc.breakdown) || undefined,
      responseData: safeParse<ResponseData>(doc.responseData) || undefined,
      evaluationData: safeParse<EvaluationData>(doc.evaluationData) || undefined,
      transcriptData: safeParse<TranscriptData[]>(doc.transcriptData) || undefined,
      createdAt: doc.$createdAt,
    };
  } catch (error) {
    console.error("[userResultsService] Failed to get result:", error);
    return null;
  }
}

/**
 * Get dashboard stats for the current user
 */
export async function getDashboardStats(): Promise<{
  totalTests: number;
  averageScore: number;
  bestScore: number;
  skillStats: {
    skill: string;
    tests: number;
    average: number;
    best: number;
    lastDate?: string;
  }[];
  recentResults: ParsedTestResult[];
}> {
  try {
    const results = await getUserResultsParsed({ limit: 100 });
    
    if (results.length === 0) {
      return {
        totalTests: 0,
        averageScore: 0,
        bestScore: 0,
        skillStats: [],
        recentResults: [],
      };
    }
    
    // Calculate totals
    const totalTests = results.length;
    const scores = results.map(r => r.celpipScore || 0).filter(s => s > 0);
    const averageScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : 0;
    const bestScore = Math.max(...scores, 0);
    
    // Calculate per-skill stats
    const skillGroups: Record<string, ParsedTestResult[]> = {};
    results.forEach(r => {
      if (!skillGroups[r.skill]) skillGroups[r.skill] = [];
      skillGroups[r.skill].push(r);
    });
    
    const skillStats = Object.entries(skillGroups).map(([skill, skillResults]) => {
      const skillScores = skillResults.map(r => r.celpipScore || 0).filter(s => s > 0);
      const sortedByDate = [...skillResults].sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      
      return {
        skill,
        tests: skillResults.length,
        average: skillScores.length > 0 
          ? Math.round(skillScores.reduce((a, b) => a + b, 0) / skillScores.length)
          : 0,
        best: Math.max(...skillScores, 0),
        lastDate: sortedByDate[0]?.createdAt,
      };
    });
    
    return {
      totalTests,
      averageScore,
      bestScore,
      skillStats,
      recentResults: results.slice(0, 5),
    };
  } catch (error) {
    console.error("[userResultsService] Failed to get dashboard stats:", error);
    return {
      totalTests: 0,
      averageScore: 0,
      bestScore: 0,
      skillStats: [],
      recentResults: [],
    };
  }
}

/**
 * Get score history for a specific skill (for charts/trends)
 */
export async function getSkillHistory(skill: string, limit: number = 10): Promise<{
  date: string;
  score: number;
  testType: string;
}[]> {
  try {
    const results = await getUserResults({ skill, limit });
    
    return results.map(r => ({
      date: r.createdAt || new Date().toISOString(),
      score: r.celpipScore || 0,
      testType: r.testType,
    }));
  } catch (error) {
    console.error("[userResultsService] Failed to get skill history:", error);
    return [];
  }
}

// ============================================================
// DELETE FUNCTION
// ============================================================

/**
 * Delete a test result
 */
export async function deleteTestResult(resultId: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    // Verify ownership
    const doc = await databases.getDocument(
      DATABASE_ID,
      USER_RESULTS_COLLECTION_ID,
      resultId
    ) as any;
    
    if (doc.userId !== user.userId) {
      console.warn("[userResultsService] Cannot delete: not owner");
      return false;
    }
    
    await databases.deleteDocument(
      DATABASE_ID,
      USER_RESULTS_COLLECTION_ID,
      resultId
    );
    
    console.log("[userResultsService] ✓ Deleted result:", resultId);
    return true;
  } catch (error) {
    console.error("[userResultsService] Failed to delete result:", error);
    return false;
  }
}

// ============================================================
// SYNC LOCAL RESULTS TO DB
// ============================================================

/**
 * Sync any results saved in localStorage to the database
 * Call this after user logs in
 */
export async function syncLocalResultsToDb(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  
  let synced = 0;
  const keysToRemove: string[] = [];
  
  // Find all locally saved results
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("result_")) continue;
    
    try {
      const data = localStorage.getItem(key);
      if (!data) continue;
      
      const result = JSON.parse(data);
      if (!result.savedLocally) continue;
      
      // Remove local flags and save to DB
      delete result.savedLocally;
      delete result.error;
      
      const savedId = await saveTestResult(result);
      if (savedId && !savedId.startsWith("result_")) {
        keysToRemove.push(key);
        synced++;
      }
    } catch (e) {
      console.warn("[userResultsService] Failed to sync local result:", key, e);
    }
  }
  
  // Clean up localStorage
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  if (synced > 0) {
    console.log(`[userResultsService] ✓ Synced ${synced} local results to database`);
  }
  
  return synced;
}
