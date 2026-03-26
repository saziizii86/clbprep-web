// D:\projects\celpip-master\src\pages\Mock\R_Results_MockTest.tsx
// Reading Mock Test Results Page
// Loads answers from Appwrite Database (with localStorage fallback)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  loadAllPartsFromDB,
  type SavedPartAnswers,
} from "../../services/mockTestAnswersService";

// ─── Types ───────────────────────────────────────────────────────────

type PartResult = {
  partNumber: number;
  partName: string;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  timestamp?: string;
  userAnswers: Record<string, any>;
  correctAnswers: Record<string, any>;
  questions: any[];
};

type ReadingResults = {
  mockSet: number;
  completedAt: string;
  parts: PartResult[];
};

// ─── Score Helpers ───────────────────────────────────────────────────

function calculateCelpipScore(correctCount: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0; // 0 = "M" (Below Minimum)
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
  if (percentage >= 20) return 3;
  return 0; // Below 20% → "M"
}

function getCelpipLevelDescription(score: number): string {
  switch (score) {
    case 12: return "Expert Proficiency";
    case 11: return "Advanced Proficiency";
    case 10: return "High Advanced";
    case 9: return "High Intermediate";
    case 8: return "Upper Intermediate";
    case 7: return "Intermediate";
    case 6: return "Low Intermediate";
    case 5: return "Basic Proficiency";
    case 4: return "Developing Proficiency";
    case 3: return "Initial Proficiency";
	case 0: return "Below Minimum";
    default: return "Not Rated";
  }
}

function getScoreColor(score: number): string {
  if (score >= 10) return "text-emerald-600";
  if (score >= 8) return "text-blue-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

function getScoreBgColor(score: number): string {
  if (score >= 10) return "bg-emerald-50 border-emerald-200";
  if (score >= 8) return "bg-blue-50 border-blue-200";
  if (score >= 6) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

const PART_NAMES: Record<number, string> = {
  1: "Reading Correspondence",
  2: "Apply a Diagram",
  3: "Reading for Information",
  4: "Reading for Viewpoints",
};

const EXPECTED_TOTALS: Record<number, number> = {
  1: 11,
  2: 8,
  3: 9,
  4: 5,
};

const LETTERS = ["A", "B", "C", "D", "E"];

// ─── Answer comparison helpers ───────────────────────────────────────

/**
 * Convert any answer value to a display string.
 * Handles: numeric index (0→A), letter string ("B"→B), other strings as-is.
 */
function toDisplayValue(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  const s = String(val).trim();
  
  // Already a letter
  if (s.length === 1 && LETTERS.includes(s.toUpperCase())) {
    return s.toUpperCase();
  }
  
  // Numeric index → letter
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0 && n < LETTERS.length) {
    return LETTERS[n];
  }
  
  // Return as-is for other values
  return s;
}

/**
 * Normalize a value to a comparable form.
 * Converts both numeric indices and letters to uppercase letter form.
 */
function normalizeAnswer(val: any): string {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val).trim();
  
  // Already a letter
  if (s.length === 1 && LETTERS.includes(s.toUpperCase())) {
    return s.toUpperCase();
  }
  
  // Numeric index → letter
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0 && n < LETTERS.length) {
    return LETTERS[n];
  }
  
  // Return uppercase for comparison
  return s.toUpperCase();
}

/**
 * Compare user answer vs correct answer, handling mixed formats.
 * Part 1, 2, 4: user answers are numeric indices, correct may be letters or indices
 * Part 3: both are letters (A, B, C, D, E)
 */
function isAnswerCorrect(userVal: any, correctVal: any): boolean {
  const u = normalizeAnswer(userVal);
  const c = normalizeAnswer(correctVal);
  if (!u || !c) return false;
  return u === c;
}

/**
 * Get all unique question keys from both answer maps, sorted numerically.
 */
function getAllKeys(
  userAnswers: Record<string, any>,
  correctAnswers: Record<string, any>
): string[] {
  const keySet = new Set<string>();
  for (const k of Object.keys(userAnswers)) keySet.add(k);
  for (const k of Object.keys(correctAnswers)) keySet.add(k);
  return Array.from(keySet).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });
}

/**
 * Count correct answers from answer maps.
 * Iterates over all keys present in either map.
 */
function countCorrect(
  userAnswers: Record<string, any>,
  correctAnswers: Record<string, any>,
  _total: number
): number {
  const keys = getAllKeys(userAnswers, correctAnswers);
  let correct = 0;
  for (const k of keys) {
    const ua = userAnswers[k];
    const ca = correctAnswers[k];
    if (isAnswerCorrect(ua, ca)) correct++;
  }
  return correct;
}

// ─── Frame Component ─────────────────────────────────────────────────

// ✅ Standard Purple Frame (same as Listening L_T2)
function PracticeFrame({
  headerTitle,
  rightStatus,
  onNext,
  onBack,
  nextDisabled,
  nextLabel = "NEXT",
  children,
  footerLeft,
}: {
  headerTitle: string;
  rightStatus?: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
}) {
  return (
    <div className="w-full">
      {/* ✅ SAME BOX SIZE AS L_T2 */}
      <div className="mx-auto w-[min(1080px,95vw)] bg-white border border-gray-300 shadow-sm">
        {/* ✅ SAME HEADER COLOR AS L_T2 */}
        <div className="h-10 px-4 flex items-center justify-between bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-500 border-b border-indigo-700">
          <div className="text-sm font-semibold text-white">{headerTitle}</div>

          <div className="flex items-center gap-3">
            {rightStatus}

            {onNext ? (
              <button
                onClick={onNext}
                disabled={!!nextDisabled}
                className={`h-7 px-3 text-xs font-semibold rounded border ${
                  nextDisabled
                    ? "bg-indigo-300 border-indigo-400 text-white/80 cursor-not-allowed"
                    : "bg-white border-white text-indigo-700 hover:bg-indigo-50"
                }`}
              >
                {nextLabel}
              </button>
            ) : null}
          </div>
        </div>

        {/* ✅ SAME CONTENT AREA SIZE AS L_T2 */}
        <div className="min-h-[620px]">{children}</div>

        {/* ✅ SAME FOOTER AS L_T2 */}
        <div className="h-11 px-4 flex items-center justify-between bg-slate-100 border-t border-slate-300">
          <div className="flex items-center gap-3">
            {footerLeft}
            <span className="text-[10px] text-slate-500">
              Independent Practice Tool • Not affiliated with any official testing organization
            </span>
          </div>

          {onBack ? (
            <button
              onClick={onBack}
              className="h-7 px-4 text-xs font-semibold rounded bg-slate-600 text-white hover:bg-slate-700"
            >
              BACK
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Answer Key Table ────────────────────────────────────────────────

function AnswerKeyTable({ partData }: { partData: PartResult }) {
  const { userAnswers, correctAnswers, questions, totalQuestions, partNumber } = partData;

  // Get all question keys
  const keys = getAllKeys(userAnswers || {}, correctAnswers || {});
  const total = keys.length || totalQuestions || EXPECTED_TOTALS[partNumber] || 0;

  if (total === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-6 bg-slate-50 rounded-lg">
        Detailed question data not available for this part.
      </div>
    );
  }

  // Build rows from actual keys
  const rows = keys.map((key, displayIdx) => {
    const ua = userAnswers?.[key];
    const ca = correctAnswers?.[key];
    
    const correctDisplay = toDisplayValue(ca);
    const userDisplay = (ua !== undefined && ua !== null && ua !== "") ? toDisplayValue(ua) : "—";
    const correct = isAnswerCorrect(ua, ca);

    // Get question text if available
    const qIdx = Number(key);
    const questionText = questions
      ? (typeof questions[displayIdx] === "string"
          ? questions[displayIdx]
          : typeof questions[qIdx] === "string"
          ? questions[qIdx]
          : null)
      : null;

    return { key, displayIdx, correctDisplay, userDisplay, correct, questionText };
  });

  return (
    <div className="bg-green-50 rounded-xl border border-green-200 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-green-200">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="font-semibold text-green-800">Answer Key</span>
      </div>
      <div className="px-4 py-2 bg-green-100/50">
        <span className="text-sm font-semibold text-green-700">Questions & Answers</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium">Q#</th>
              {rows.some(r => r.questionText) && (
                <th className="text-left py-3 px-4 font-medium">Question</th>
              )}
              <th className="text-left py-3 px-4 font-medium">Option A</th>
              <th className="text-left py-3 px-4 font-medium">Option B</th>
              <th className="text-left py-3 px-4 font-medium">Option C</th>
              <th className="text-left py-3 px-4 font-medium">Option D</th>
              <th className="text-left py-3 px-4 font-medium">Correct</th>
              <th className="text-left py-3 px-4 font-medium">Your Answer</th>
              <th className="text-center py-3 px-4 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isAnswered = r.userDisplay !== "—";
              const bgClass = !isAnswered ? "bg-white" : r.correct ? "bg-white" : "bg-red-50/30";
              
              return (
                <tr key={r.key} className={`border-t hover:bg-gray-50 ${bgClass}`}>
                  <td className="py-3 px-4 font-medium">{r.displayIdx + 1}</td>
                  {rows.some(row => row.questionText) && (
                    <td className="py-3 px-4 max-w-xs truncate" title={r.questionText || ""}>
                      {r.questionText || `Question ${r.displayIdx + 1}`}
                    </td>
                  )}
                  <td className={`py-3 px-4 ${r.correctDisplay === 'A' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                    A
                  </td>
                  <td className={`py-3 px-4 ${r.correctDisplay === 'B' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                    B
                  </td>
                  <td className={`py-3 px-4 ${r.correctDisplay === 'C' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                    C
                  </td>
                  <td className={`py-3 px-4 ${r.correctDisplay === 'D' ? 'bg-green-50 text-green-700 font-medium' : ''}`}>
                    D
                  </td>
                  <td className="py-3 px-4">
                    {r.correctDisplay ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">
                        {r.correctDisplay}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {r.userDisplay === "—" ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className={`px-2 py-1 rounded font-bold ${
                        r.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.userDisplay}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {r.userDisplay === "—" ? (
                      <span className="text-gray-300">—</span>
                    ) : r.correct ? (
                      <span className="text-green-600 font-bold text-xl">✓</span>
                    ) : (
                      <span className="text-red-500 font-bold text-xl">✗</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function R_Results_MockTest({
  onComplete,
  onBack,
  onRetry,
}: {
  onComplete?: () => void;
  onBack?: () => void;
  onRetry?: () => void;
}) {
  const [results, setResults] = useState<ReadingResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPart, setExpandedPart] = useState<number | null>(null);
const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const mockSetRaw = localStorage.getItem("activeMockSet") || "1";
        const setNumber = parseInt(String(mockSetRaw), 10) || 1;

        // Load from Appwrite Database (with localStorage fallback)
        const dbParts = await loadAllPartsFromDB("reading", setNumber);

        const parts: PartResult[] = [];

        for (let partNum = 1; partNum <= 4; partNum++) {
          const dbData = dbParts.find((p) => p.partNumber === partNum);

          if (dbData && (dbData.totalQuestions > 0 || Object.keys(dbData.userAnswers).length > 0 || Object.keys(dbData.correctAnswers).length > 0)) {
            const ua = dbData.userAnswers || {};
            const ca = dbData.correctAnswers || {};

            // Determine total questions from actual keys present
            const actualKeys = getAllKeys(ua, ca);
            let total = actualKeys.length || dbData.totalQuestions || EXPECTED_TOTALS[partNum] || 0;

            // Count correct using our universal comparison
            const correct = countCorrect(ua, ca, total);
            const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

            parts.push({
              partNumber: partNum,
              partName: PART_NAMES[partNum] ?? `Part ${partNum}`,
              totalQuestions: total,
              correctCount: correct,
              percentage,
              timestamp: dbData.timestamp,
              userAnswers: ua,
              correctAnswers: ca,
              questions: dbData.questions || [],
            });
          } else {
            parts.push({
              partNumber: partNum,
              partName: PART_NAMES[partNum] ?? `Part ${partNum}`,
              totalQuestions: EXPECTED_TOTALS[partNum] || 0,
              correctCount: 0,
              percentage: 0,
              userAnswers: {},
              correctAnswers: {},
              questions: [],
            });
          }
        }

        setResults({
          mockSet: setNumber,
          completedAt: new Date().toISOString(),
          parts,
        });
      } catch (error) {
        console.error("Error loading reading results:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totals = useMemo(() => {
    if (!results) return { correct: 0, total: 0, percentage: 0 };
    const total = results.parts.reduce((sum, p) => sum + (p.totalQuestions || 0), 0);
    const correct = results.parts.reduce((sum, p) => sum + (p.correctCount || 0), 0);
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, total, percentage };
  }, [results]);

  const celpipScore = calculateCelpipScore(totals.correct, totals.total);
  const levelDescription = getCelpipLevelDescription(celpipScore);

const handleNext = () => {
  const mockSet = localStorage.getItem("activeMockSet") || "1";
  
  // Store info for parent component
  localStorage.setItem("activeMockSet", String(mockSet));
  localStorage.setItem("mock_next_screen", JSON.stringify({ 
    skill: "writing", 
    task: 1, 
    set: Number(mockSet) 
  }));
  
  // Tell parent component we're done with Reading
  if (onComplete) {
    onComplete();
  }
};



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm text-gray-700">
          Loading results…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-6">
      <PracticeFrame
        headerTitle="Reading Test Results"
        onNext={handleNext}
        onBack={onBack}
        nextLabel="NEXT"
      >
        <div className="p-8 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
          <div className="max-w-4xl mx-auto">
            {/* Overall Score Card */}
            <div className={`rounded-2xl border-2 p-8 mb-8 ${getScoreBgColor(celpipScore)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Reading Score</h2>
                      <p className="text-sm text-gray-600">CELPIP Practice Scale</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-6xl font-bold ${getScoreColor(celpipScore)}`}>
                    {celpipScore === 0 ? "M" : celpipScore}
                  </div>
                  <div className="text-sm font-medium text-gray-600 mt-1">
                    {levelDescription}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Questions Answered</span>
                  <span className="font-semibold">
                    {totals.correct} / {totals.total} correct ({totals.percentage}%)
                  </span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-sky-500 transition-all duration-500"
                    style={{ width: `${totals.percentage}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-3">CELPIP Score Scale Reference:</div>
                <div className="flex items-center gap-1">
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                    <div
                      key={s}
                      className={`flex-1 h-8 flex items-center justify-center text-xs font-medium rounded ${
                        s === celpipScore
                          ? "bg-blue-600 text-white ring-2 ring-blue-300"
                          : s < celpipScore
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {s}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                  <span>Initial</span>
                  <span>Intermediate</span>
                  <span>Advanced</span>
                  <span>Expert</span>
                </div>
              </div>
            </div>

            {/* Part-by-Part Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Part-by-Part Results</h3>
                </div>
              </div>

              <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="w-10">Part</div>
                <div>Task Type</div>
                <div className="w-20 text-center">Correct</div>
                <div className="w-24 text-center">Score</div>
                <div className="w-20 text-center">Details</div>
              </div>

              <div className="divide-y divide-gray-100">
                {(results?.parts || []).map((p) => {
                  const isExpanded = expandedPart === p.partNumber;
                  return (
                    <div key={p.partNumber}>
                      <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
                              {p.partNumber}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{p.partName}</div>
                              <div className="text-xs text-gray-500">{p.totalQuestions} questions</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="text-sm text-gray-700 font-semibold text-right min-w-[90px]">
                              {p.correctCount} / {p.totalQuestions}
                            </div>
                            <div className="min-w-[120px]">
                              <div className="text-xs text-gray-500 mb-1 text-right">{p.percentage}%</div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    p.percentage >= 75
                                      ? "bg-gradient-to-r from-green-400 to-emerald-500"
                                      : p.percentage >= 50
                                      ? "bg-gradient-to-r from-blue-500 to-sky-500"
                                      : p.percentage > 0
                                      ? "bg-gradient-to-r from-amber-400 to-orange-500"
                                      : "bg-gradient-to-r from-red-400 to-rose-500"
                                  }`}
                                  style={{ width: `${Math.max(p.percentage, 2)}%` }}
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => setExpandedPart(isExpanded ? null : p.partNumber)}
                              className="text-blue-600 text-sm font-semibold hover:text-blue-700 inline-flex items-center gap-1 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50"
                            >
                              {isExpanded ? "Hide" : "View"}
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-6 pb-4">
                          <AnswerKeyTable partData={p} />
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="px-6 py-4 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">Total Score</div>
                    <div className="flex items-center gap-8">
                      <div className="text-sm font-semibold text-gray-800 min-w-[90px] text-right">
                        {totals.correct} / {totals.total}
                      </div>
                      <div className="text-sm font-semibold text-red-600 min-w-[120px] text-right">
                        {totals.percentage}%
                      </div>
                      <div className="text-sm font-bold text-blue-700 min-w-[120px] text-right">
                        CELPIP {celpipScore}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={onRetry}
                className="h-10 px-5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Reading Test
              </button>
              <button
                onClick={handleNext}
                className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold inline-flex items-center gap-2"
              >
                Continue
              </button>
            </div>

            <div className="mt-4 text-center text-[10px] text-slate-500">
              Note: Practice scores are estimates based on your performance and may differ from official test results.
            </div>
          </div>
        </div>
      </PracticeFrame>
    </div>
  );
}
