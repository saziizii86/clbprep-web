// src/pages/Mock/S_Results_MockTest.tsx
// Speaking Mock Test — Results (all 8 tasks)
// Independent practice tool — not affiliated with any official testing organization.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BarChart3, Sparkles, RefreshCw, AlertTriangle, CheckCircle, Trophy } from "lucide-react";
import { loadAllSpeakingTasksFromDB } from "../../services/mockTestAnswersService";
import { getAPISettings } from "../../services/settingsService";
import Final_Score_MockTest from "./Final_Score_MockTest";

function normalizeMockSet(v: any): string {
  const s = String(v ?? "").trim();
  const m = s.match(/\d+/);
  return m ? m[0] : s.toLowerCase();
}

const DEFAULT_SPEAKING_SYSTEM_PROMPT = `You are a speaking examiner. Evaluate 8 speaking tasks based on TRANSCRIPTS ONLY (no audio). Use a 0-12 scale.

Criteria (transcript-based):
- Content/Coherence
- Vocabulary
- Grammar/Readability
- Task Fulfillment

Return STRICT JSON only (no extra text).
{
  "overallScore": <number 0-12>,
  "task1": {"score":<0-12>, "strengths":["..."], "improvements":["..."], "detailedFeedback":"..."},
  "task2": {...},
  "task3": {...},
  "task4": {...},
  "task5": {...},
  "task6": {...},
  "task7": {...},
  "task8": {...}
}`;

type TaskEval = {
  score: number;
  strengths?: string[];
  improvements?: string[];
  detailedFeedback?: string;
};

type SpeakingEvaluation =
  | {
      overallScore: number;
      task1?: TaskEval;
      task2?: TaskEval;
      task3?: TaskEval;
      task4?: TaskEval;
      task5?: TaskEval;
      task6?: TaskEval;
      task7?: TaskEval;
      task8?: TaskEval;
      error?: false;
    }
  | { error: true; message: string };

function safeNumber(n: any, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function scoreColor(score: number) {
  if (score >= 10) return "text-emerald-600";
  if (score >= 8) return "text-blue-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}
function scoreBg(score: number) {
  if (score >= 10) return "bg-emerald-50 border-emerald-200";
  if (score >= 8) return "bg-blue-50 border-blue-200";
  if (score >= 6) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

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


export default function S_Results_MockTest({ 
  onBack,
  onFinalResults,
  mockSet: propMockSet,
}: { 
  onBack?: () => void;
  onFinalResults?: () => void;
  mockSet?: number | string;
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const setKey = propMockSet || (params as any).setKey || (location.state as any)?.mockSet || localStorage.getItem("activeMockSet") || "1";
  const setNumber = Number(normalizeMockSet(setKey) || "1") || 1;

  // State to toggle between Speaking Results and Final Score view
  const [showFinalScore, setShowFinalScore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [apiConnected, setApiConnected] = useState(false);
  const [openAIKey, setOpenAIKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SPEAKING_SYSTEM_PROMPT);

  const [prompts, setPrompts] = useState<string[]>(Array(8).fill(""));
  const [transcripts, setTranscripts] = useState<string[]>(Array(8).fill(""));

  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);

  const overallScore = useMemo(() => {
    if (!evaluation || (evaluation as any).error) return 0;
    return clamp(safeNumber((evaluation as any).overallScore, 0), 0, 12);
  }, [evaluation]);

  // Load data from DB with localStorage fallback
  const loadData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Try to load from DB first (it includes localStorage fallback internally)
      const rows = await loadAllSpeakingTasksFromDB(setNumber);
      
      const p = Array(8).fill("");
      const t = Array(8).fill("");

      for (const r of rows) {
        const idx = (Number(r.taskNumber) || 1) - 1;
        if (idx >= 0 && idx < 8) {
          if (r.prompt) p[idx] = r.prompt;
          if (r.transcript) t[idx] = r.transcript;
        }
      }

      setPrompts(p);
      setTranscripts(t);
      
      console.log("[Speaking Results] Loaded data:", {
        prompts: p.filter(Boolean).length,
        transcripts: t.filter(Boolean).length,
      });
    } catch (e) {
      console.warn("[Speaking Results] DB load failed, falling back to localStorage", e);

      // Pure localStorage fallback
      const p = Array.from({ length: 8 }, (_, i) =>
        localStorage.getItem(`mockSpeaking_T${i + 1}_prompt_set${setNumber}`) || ""
      );
      const t = Array.from({ length: 8 }, (_, i) =>
        localStorage.getItem(`mockSpeaking_T${i + 1}_transcript_set${setNumber}`) || ""
      );
      setPrompts(p);
      setTranscripts(t);
    }

    setLoading(false);
  }, [setNumber]);

  // Load API settings
  const loadAPISettings = useCallback(async () => {
    try {
      const settings = await getAPISettings();
      if (settings?.openAIKey && settings?.isConnected) {
        setOpenAIKey(settings.openAIKey);
        setApiConnected(true);
      }
      if (settings?.speakingSystemPrompt) {
        setSystemPrompt(settings.speakingSystemPrompt);
      }
    } catch (e) {
      console.warn("[Speaking Results] Failed to load API settings:", e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await loadData();
      await loadAPISettings();
    };

    init();

    return () => {
      mounted = false;
    };
  }, [loadData, loadAPISettings]);

  const evaluateNow = async () => {
    setIsEvaluating(true);
    setEvaluation(null);

    try {
      if (!apiConnected || !openAIKey) {
        throw new Error("OpenAI API is not connected. Please connect it in Admin (API Settings).");
      }

      // Check if there are any transcripts to evaluate
      const hasTranscripts = transcripts.some((t) => t.trim().length > 0);
      if (!hasTranscripts) {
        throw new Error("No transcripts found. Please complete the speaking tasks first.");
      }

      const userPrompt = `Evaluate 8 speaking tasks based on transcript only.

Task 1 Prompt:
${prompts[0] || "No prompt available"}
Task 1 Transcript:
${transcripts[0] || "No response recorded"}

---

Task 2 Prompt:
${prompts[1] || "No prompt available"}
Task 2 Transcript:
${transcripts[1] || "No response recorded"}

---

Task 3 Prompt:
${prompts[2] || "No prompt available"}
Task 3 Transcript:
${transcripts[2] || "No response recorded"}

---

Task 4 Prompt:
${prompts[3] || "No prompt available"}
Task 4 Transcript:
${transcripts[3] || "No response recorded"}

---

Task 5 Prompt:
${prompts[4] || "No prompt available"}
Task 5 Transcript:
${transcripts[4] || "No response recorded"}

---

Task 6 Prompt:
${prompts[5] || "No prompt available"}
Task 6 Transcript:
${transcripts[5] || "No response recorded"}

---

Task 7 Prompt:
${prompts[6] || "No prompt available"}
Task 7 Transcript:
${transcripts[6] || "No response recorded"}

---

Task 8 Prompt:
${prompts[7] || "No prompt available"}
Task 8 Transcript:
${transcripts[7] || "No response recorded"}

Return STRICT JSON only in the exact format described in the system prompt.`;

      const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAIKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt || DEFAULT_SPEAKING_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2500,
        }),
      });

      if (!apiResponse.ok) {
        const err = await apiResponse.json().catch(() => null);
        throw new Error(err?.error?.message || "OpenAI request failed");
      }

      const data = await apiResponse.json();
      const content = data?.choices?.[0]?.message?.content || "";
      const jsonMatch = String(content).match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse evaluation JSON");
      const parsed = JSON.parse(jsonMatch[0]);

      setEvaluation(parsed);

      localStorage.setItem(`mockSpeaking_eval_done_set${setNumber}`, "true");
      localStorage.setItem(
        `mockSpeaking_score_set${setNumber}`,
        String(clamp(safeNumber(parsed?.overallScore, 0), 0, 12))
      );
    } catch (e: any) {
      setEvaluation({ error: true, message: e?.message || "Failed to evaluate speaking" });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const handleFinalResults = () => {
    if (onFinalResults) {
      onFinalResults();
    } else {
      // Show the Final Score component inline
      setShowFinalScore(true);
    }
  };

  const handleBackFromFinalScore = () => {
    setShowFinalScore(false);
  };

  // Count how many transcripts exist
  const transcriptCount = transcripts.filter((t) => t.trim().length > 0).length;

  // If showing Final Score, render that component instead
  if (showFinalScore) {
    return (
      <Final_Score_MockTest 
        onBack={handleBackFromFinalScore}
        mockSet={setNumber}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-6">
      <PracticeFrame
        headerTitle="Speaking Results"
        onBack={handleBack}
        rightStatus={
          <div className="flex items-center gap-2">
            {/* Evaluate Button */}
            <button
              onClick={evaluateNow}
              disabled={loading || isEvaluating || transcriptCount === 0}
              className={`h-7 px-3 text-xs font-semibold rounded border ${
                loading || isEvaluating || transcriptCount === 0
                  ? "bg-blue-300 border-blue-400 text-white/80 cursor-not-allowed"
                  : "bg-white border-white text-blue-700 hover:bg-blue-50"
              }`}
            >
              {isEvaluating ? (
                <span className="inline-flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Evaluating…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Evaluate
                </span>
              )}
            </button>

            {/* Final Results Button */}
            <button
              onClick={handleFinalResults}
              disabled={loading || isEvaluating}
className={`h-7 px-3 text-xs font-semibold rounded border ${
  loading || isEvaluating
    ? "bg-indigo-300 border-indigo-400 text-white/80 cursor-not-allowed"
    : "bg-white border-white text-indigo-700 hover:bg-indigo-50"
}`}

            >
              <span className="inline-flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Final Results
              </span>
            </button>
          </div>
        }
      >
        <div className="p-8" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Overview */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Overall Score</div>
                  <div className="text-xs text-gray-500">Based on transcripts only</div>
                </div>
              </div>
              <div className={`text-3xl font-extrabold ${scoreColor(overallScore)}`}>
  {!evaluation || (evaluation as any).error
    ? "—"
    : overallScore < 3
    ? "M"
    : `${Math.round(overallScore)}/12`}
</div>
            </div>

            {/* Transcript count info */}
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${
              transcriptCount === 8 
                ? "bg-green-50 border-green-200" 
                : transcriptCount > 0 
                ? "bg-amber-50 border-amber-200" 
                : "bg-red-50 border-red-200"
            }`}>
              {transcriptCount === 8 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <div className="text-sm">
                <span className="font-medium">
                  {transcriptCount} of 8 transcripts recorded
                </span>
                {transcriptCount < 8 && (
                  <span className="text-gray-600 ml-2">
                    (Complete all tasks for full evaluation)
                  </span>
                )}
              </div>
            </div>

            {/* Error */}
            {evaluation && (evaluation as any).error ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <div className="font-semibold">Evaluation failed</div>
                  <div className="mt-1 whitespace-pre-wrap">{(evaluation as any).message}</div>
                </div>
              </div>
            ) : null}

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600">Loading results...</span>
              </div>
            )}

            {/* Tasks */}
            {!loading && Array.from({ length: 8 }, (_, i) => {
              const taskKey = `task${i + 1}` as keyof SpeakingEvaluation;
              const t = (evaluation && !(evaluation as any).error ? (evaluation as any)[taskKey] : null) as TaskEval | null;
              const score = clamp(safeNumber(t?.score, 0), 0, 12);
              const hasTranscript = transcripts[i]?.trim().length > 0;

              return (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Task {i + 1}</div>
                    <div className={`px-3 py-1 rounded-full border text-xs font-semibold ${scoreBg(score)} ${scoreColor(score)}`}>
                      {t ? (score < 3 ? "M" : `${Math.round(score)}/12`) : "Not evaluated"}
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Prompt</div>
                      <div className="text-sm whitespace-pre-wrap text-gray-800">{prompts[i] || "—"}</div>
                    </div>

                    <div className={`rounded-xl border p-4 ${
                      hasTranscript 
                        ? "border-gray-200 bg-white" 
                        : "border-amber-200 bg-amber-50"
                    }`}>
                      <div className="text-xs font-semibold text-gray-700 mb-2">Transcript</div>
                      <div className={`text-sm whitespace-pre-wrap ${
                        hasTranscript ? "text-gray-800" : "text-amber-600 italic"
                      }`}>
                        {transcripts[i] || "No recording transcribed"}
                      </div>
                    </div>

                    {t ? (
                      <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="text-xs font-semibold text-emerald-900 mb-2">Strengths</div>
                          <ul className="text-sm text-emerald-900 list-disc pl-5 space-y-1">
                            {(t.strengths || []).slice(0, 6).map((x, idx) => (
                              <li key={idx}>{x}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <div className="text-xs font-semibold text-amber-900 mb-2">Improvements</div>
                          <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
                            {(t.improvements || []).slice(0, 6).map((x, idx) => (
                              <li key={idx}>{x}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Detailed Feedback</div>
                          <div className="text-sm whitespace-pre-wrap text-gray-800">{t.detailedFeedback || "—"}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PracticeFrame>
    </div>
  );
}
