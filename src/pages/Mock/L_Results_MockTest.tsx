// D:\projects\celpip-master\src\pages\Mock\L_Results_MockTest.tsx
// Listening Mock Test Results Page
// Shows user's score on CELPIP scale after completing all 6 listening parts
// Independent practice UI (not affiliated with any official testing organization).

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Award,
  TrendingUp,
  BarChart3,
  ChevronRight,
  RefreshCw,
  FileText,
  Headphones,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  loadAllPartsFromDB,
} from "../../services/mockTestAnswersService";

// Types for answers stored in localStorage
type QuestionDetail = {
  questionIndex: number;
  questionText: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  correctLetter: string;
  userAnswerLetter: string;
  isCorrect: boolean;
};

type PartAnswers = {
  partNumber: number;
  partName: string;
  totalQuestions: number;
  answers: Record<number, string>;
  correctAnswers: Record<number, string>;
  questions: QuestionDetail[];
};

type ListeningResults = {
  mockSet: number;
  completedAt: string;
  parts: PartAnswers[];
};

// CELPIP Listening Score Conversion
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

// Part names mapping
const PART_NAMES: Record<number, string> = {
  1: "Problem Solving",
  2: "Daily Life Conversation",
  3: "Information",
  4: "News Item",
  5: "Discussion",
  6: "Viewpoints",
};

// Expected questions per part
const QUESTIONS_PER_PART: Record<number, number> = {
  1: 8,
  2: 5,
  3: 6,
  4: 5,
  5: 8,
  6: 6,
};

// Frame Component (matching other mock test pages)
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
      <div className="mx-auto w-full max-w-[1080px] bg-white border border-gray-300 shadow-sm">
        {/* Header bar - Purple/Indigo gradient */}
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

        {/* Body */}
        <div className="min-h-[min(620px,calc(100vh-9rem))]">{children}</div>

        {/* Footer bar */}
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

// Answer Key Table Component (like the image)
function AnswerKeyTable({ questions, partNumber }: { questions: QuestionDetail[]; partNumber: number }) {
  if (!questions || questions.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-6 bg-slate-50 rounded-lg">
        Detailed question data not available for this part.
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-xl border border-green-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b border-green-200">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <span className="font-semibold text-green-800">Answer Key</span>
      </div>

      {/* Sub-header: Questions & Answers */}
      <div className="px-4 py-2 bg-green-100/50">
        <span className="text-sm font-semibold text-green-700">Questions & Answers</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-green-100/30 border-b border-green-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700 w-12">Q#</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 min-w-[180px]">Question</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Option A</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Option B</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Option C</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Option D</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Correct</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 w-24">Your Answer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-100">
            {questions.map((q, idx) => {
              const isCorrect = q.isCorrect;
              const correctLetter = q.correctLetter || "—";
              const userLetter = q.userAnswerLetter || "—";

              return (
                <tr key={idx} className={`${isCorrect ? "bg-white" : "bg-red-50/30"}`}>
                  <td className="px-3 py-3 font-semibold text-gray-700">{idx + 1}</td>
                  <td className="px-3 py-3 text-gray-800">
                    <div className="max-w-[200px] truncate" title={q.questionText}>
                      {q.questionText || `Question ${idx + 1}`}
                    </div>
                  </td>
                  <td className={`px-3 py-3 ${correctLetter === "A" ? "text-green-700 font-semibold" : "text-gray-600"}`}>
                    {q.options?.[0] || "—"}
                  </td>
                  <td className={`px-3 py-3 ${correctLetter === "B" ? "text-green-700 font-semibold" : "text-gray-600"}`}>
                    {q.options?.[1] || "—"}
                  </td>
                  <td className={`px-3 py-3 ${correctLetter === "C" ? "text-green-700 font-semibold" : "text-gray-600"}`}>
                    {q.options?.[2] || "—"}
                  </td>
                  <td className={`px-3 py-3 ${correctLetter === "D" ? "text-green-700 font-semibold" : "text-gray-600"}`}>
                    {q.options?.[3] || "—"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 font-bold">
                      {correctLetter}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {userLetter === "—" ? (
                      <span className="text-gray-400">—</span>
                    ) : isCorrect ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-500 text-white font-bold">
                        {userLetter}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600 font-bold">
                        {userLetter}
                      </span>
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

export default function L_Results_MockTest({
  onComplete,
  onBack,
  onRetry,
}: {
  onComplete?: () => void;
  onBack?: () => void;
  onRetry?: () => void;
}) {
  const [results, setResults] = useState<ListeningResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPart, setExpandedPart] = useState<number | null>(null);

  // Load results from Appwrite Database (with localStorage fallback)
useEffect(() => {
  const loadResults = async () => {
    try {
      setLoading(true);

      const mockSet = localStorage.getItem("activeMockSet");
      const setNumber = mockSet ? parseInt(mockSet, 10) : 1;

      // ✅ Load from DB — do NOT fall back to localStorage.
      // Old localStorage data from a previous run would corrupt results.
      const dbParts = await loadAllPartsFromDB("listening", setNumber);

      const parts: PartAnswers[] = [];

      for (let partNum = 1; partNum <= 6; partNum++) {
        const dbData = dbParts.find((p) => p.partNumber === partNum);

        // ✅ Only accept DB data that has a timestamp from THIS session.
        // An empty questions array means the part was never saved this run.
        const hasRealData =
          dbData &&
          Array.isArray(dbData.questions) &&
          dbData.questions.length > 0;

        if (hasRealData) {
          parts.push({
            partNumber: partNum,
            partName: PART_NAMES[partNum],
            totalQuestions:
              dbData.questions.length || QUESTIONS_PER_PART[partNum],
            answers: dbData.userAnswers || {},
            correctAnswers: dbData.correctAnswers || {},
            questions: dbData.questions,
          });
        } else {
          // Part not completed this run — show as 0 correct
          parts.push(createEmptyPart(partNum));
        }
      }

      setResults({
        mockSet: setNumber,
        completedAt: new Date().toISOString(),
        parts,
      });
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoading(false);
    }
  };

  loadResults();
}, []);

  function createEmptyPart(partNum: number): PartAnswers {
    return {
      partNumber: partNum,
      partName: PART_NAMES[partNum],
      totalQuestions: QUESTIONS_PER_PART[partNum],
      answers: {},
      correctAnswers: {},
      questions: [],
    };
  }

  // Calculate totals
  const totals = useMemo(() => {
    if (!results) return { correct: 0, total: 0, percentage: 0 };
    
    let correct = 0;
    let total = 0;
    
    results.parts.forEach((part) => {
      if (part.questions && part.questions.length > 0) {
        // Use questions array if available
        part.questions.forEach((q) => {
          total++;
          if (q.isCorrect) correct++;
        });
      } else {
        // Fallback: use totalQuestions count
        total += part.totalQuestions;
      }
    });
    
    // Fallback if no data at all
    if (total === 0) {
      total = Object.values(QUESTIONS_PER_PART).reduce((a, b) => a + b, 0);
    }
    
    return {
      correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  }, [results]);

  const celpipScore = calculateCelpipScore(totals.correct, totals.total);
  const levelDescription = getCelpipLevelDescription(celpipScore);

  // Calculate per-part scores
  const partScores = useMemo(() => {
    if (!results) return [];
    
    return results.parts.map((part) => {
      let correct = 0;
      let total = part.totalQuestions;
      
      if (part.questions && part.questions.length > 0) {
        total = part.questions.length;
        correct = part.questions.filter((q) => q.isCorrect).length;
      }
      
      return {
        partNumber: part.partNumber,
        partName: part.partName,
        correct,
        total,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
        questions: part.questions || [],
      };
    });
  }, [results]);

  const handleNextToReading = () => {
    // Save completion status
    const mockSet = localStorage.getItem("activeMockSet") || "1";
    localStorage.setItem(`mockListening_completed_set${mockSet}`, "true");
    localStorage.setItem(`mockListening_score_set${mockSet}`, String(celpipScore));
    
    if (onComplete) onComplete();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm text-gray-700">
          Loading results…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <PracticeFrame
        headerTitle="Listening Test Results"
        onNext={handleNextToReading}
        onBack={onBack}
        nextLabel="NEXT → Reading"
      >
        <div className="p-8 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {/* Overall Score Card */}
          <div className="max-w-4xl mx-auto">
            {/* Main Score Display */}
            <div className={`rounded-2xl border-2 p-8 mb-8 ${getScoreBgColor(celpipScore)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <Headphones className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Listening Score</h2>
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
              
              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Questions Answered</span>
                  <span className="font-semibold">
                    {totals.correct} / {totals.total} correct ({totals.percentage}%)
                  </span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${totals.percentage}%` }}
                  />
                </div>
              </div>
              
              {/* Score Scale Reference */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-3">CELPIP Score Scale Reference:</div>
                <div className="flex items-center gap-1">
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                    <div
                      key={s}
                      className={`flex-1 h-8 flex items-center justify-center text-xs font-medium rounded ${
                        s === celpipScore
                          ? "bg-indigo-600 text-white ring-2 ring-indigo-300"
                          : s < celpipScore
                          ? "bg-indigo-100 text-indigo-600"
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
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">Part-by-Part Results</h3>
                </div>
              </div>
              
              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Part
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Task Type
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Correct
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {partScores.map((part) => (
                      <React.Fragment key={part.partNumber}>
                        <tr
                          className={`hover:bg-gray-50 transition-colors ${
                            expandedPart === part.partNumber ? "bg-indigo-50" : ""
                          }`}
                        >
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                              {part.partNumber}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{part.partName}</div>
                            <div className="text-xs text-gray-500">
                              {part.total} questions
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-semibold text-gray-900">
                              {part.correct} / {part.total}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <div
                                className={`w-12 h-2 rounded-full overflow-hidden ${
                                  part.percentage >= 80
                                    ? "bg-emerald-100"
                                    : part.percentage >= 60
                                    ? "bg-amber-100"
                                    : "bg-red-100"
                                }`}
                              >
                                <div
                                  className={`h-full ${
                                    part.percentage >= 80
                                      ? "bg-emerald-500"
                                      : part.percentage >= 60
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${part.percentage}%` }}
                                />
                              </div>
                              <span
                                className={`text-sm font-medium ${
                                  part.percentage >= 80
                                    ? "text-emerald-600"
                                    : part.percentage >= 60
                                    ? "text-amber-600"
                                    : "text-red-600"
                                }`}
                              >
                                {part.percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                setExpandedPart(
                                  expandedPart === part.partNumber ? null : part.partNumber
                                )
                              }
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              {expandedPart === part.partNumber ? (
                                <>
                                  Hide
                                  <ChevronUp className="w-4 h-4" />
                                </>
                              ) : (
                                <>
                                  View
                                  <ChevronDown className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded Answer Key Table */}
                        {expandedPart === part.partNumber && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-slate-50">
                              <AnswerKeyTable 
                                questions={part.questions} 
                                partNumber={part.partNumber} 
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  
                  {/* Total Row */}
                  <tfoot>
                    <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-200">
                      <td className="px-6 py-4" colSpan={2}>
                        <span className="font-bold text-gray-900">Total Score</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-gray-900">
                          {totals.correct} / {totals.total}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-bold ${getScoreColor(celpipScore)}`}>
                          {totals.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xl font-bold ${getScoreColor(celpipScore)}`}>
                          CELPIP {celpipScore}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex items-center justify-center gap-4">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Retry Listening Test
                </button>
              )}
              <button
                onClick={handleNextToReading}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg"
              >
                Continue to Reading
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Note */}
            <div className="mt-6 text-center text-xs text-gray-500">
              Note: This is an independent practice tool. CELPIP scores shown are estimates
              based on your performance and may differ from official test results.
            </div>
          </div>
        </div>
      </PracticeFrame>
    </div>
  );
}
