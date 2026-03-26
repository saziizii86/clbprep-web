// D:\projects\celpip-master\src\pages\Mock\W_Results_MockTest.tsx
// Writing Mock Test — Results
// - Loads Task 1 & Task 2 responses (DB if available, otherwise localStorage)
// - Runs AI evaluation (OpenAI) using a per-task JSON format
// This is an INDEPENDENT practice application NOT affiliated with any official testing organization.

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BarChart3, FileText, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";

function normalizeMockSet(v: any): string {
  const s = String(v ?? "").trim();
  const m = s.match(/\d+/);
  return m ? m[0] : s.toLowerCase();
}

function countWords(s: string) {
  return (s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
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


// ✅ Updated: per-task scoring + per-task feedback (Task 1 and Task 2)
const DEFAULT_WRITING_SYSTEM_PROMPT = `You are a CELPIP Writing examiner. Evaluate TWO tasks (Task 1 and Task 2) based on CELPIP writing criteria (0-12 scale).

CELPIP Writing Scoring Criteria (0-12 each):
- Content/Coherence (organization, clarity, coherence)
- Vocabulary (range, accuracy, appropriateness)
- Readability (grammar, sentence structure, mechanics)
- Task Fulfillment (meets requirements, follows instructions, word count)

Return STRICT JSON only (no extra text). Use this format:
{
  "overallScore": <number 0-12>,
  "task1": {
    "score": <number 0-12>,
    "breakdown": {
      "contentCoherence": <number 0-12>,
      "vocabulary": <number 0-12>,
      "readability": <number 0-12>,
      "taskFulfillment": <number 0-12>
    },
    "strengths": ["..."],
    "improvements": ["..."],
    "detailedFeedback": "..."
  },
  "task2": {
    "score": <number 0-12>,
    "breakdown": {
      "contentCoherence": <number 0-12>,
      "vocabulary": <number 0-12>,
      "readability": <number 0-12>,
      "taskFulfillment": <number 0-12>
    },
    "strengths": ["..."],
    "improvements": ["..."],
    "detailedFeedback": "..."
  }
}`;

type WritingTaskEval = {
  score: number;
  breakdown?: {
    contentCoherence?: number;
    vocabulary?: number;
    readability?: number;
    taskFulfillment?: number;
  };
  strengths?: string[];
  improvements?: string[];
  detailedFeedback?: string;
};

type WritingEvaluation =
  | {
      overallScore: number;
      task1?: WritingTaskEval;
      task2?: WritingTaskEval;
      // Backward compatibility (older JSON)
      breakdown?: WritingTaskEval["breakdown"];
      strengths?: string[];
      improvements?: string[];
      detailedFeedback?: string;
      error?: false;
    }
  | {
      error: true;
      message: string;
    };

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

export default function W_Results_MockTest({
  onBack,
  onComplete,
}: {
  onBack?: () => void;
  onComplete?: () => void;
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const setKey = (params as any).setKey || (location.state as any)?.mockSet || localStorage.getItem("activeMockSet") || "1";
  const setNumber = Number(normalizeMockSet(setKey) || "1") || 1;

  const [loading, setLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [openAIKey, setOpenAIKey] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_WRITING_SYSTEM_PROMPT);

  const [t1Prompt, setT1Prompt] = useState<string>("");
  const [t1Response, setT1Response] = useState<string>("");
  const [t2Prompt, setT2Prompt] = useState<string>("");
  const [t2Response, setT2Response] = useState<string>("");
  const [t2Option, setT2Option] = useState<"A" | "B" | null>(null);

  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);

  const overallScore = useMemo(() => {
    if (!evaluation || (evaluation as any).error) return 0;
    return clamp(safeNumber((evaluation as any).overallScore, 0), 0, 12);
  }, [evaluation]);

  const task1Score = useMemo(() => {
    if (!evaluation || (evaluation as any).error) return 0;
    const t1 = (evaluation as any).task1;
    if (t1 && typeof t1.score !== "undefined") return clamp(safeNumber(t1.score, 0), 0, 12);
    return overallScore; // fallback
  }, [evaluation, overallScore]);

  const task2Score = useMemo(() => {
    if (!evaluation || (evaluation as any).error) return 0;
    const t2 = (evaluation as any).task2;
    if (t2 && typeof t2.score !== "undefined") return clamp(safeNumber(t2.score, 0), 0, 12);
    return overallScore; // fallback
  }, [evaluation, overallScore]);

  const loadFromLocal = () => {
    setT1Prompt(localStorage.getItem(`mockWriting_T1_prompt_set${setNumber}`) || "");
    setT1Response(localStorage.getItem(`mockWriting_T1_response_set${setNumber}`) || "");
    setT2Prompt(localStorage.getItem(`mockWriting_T2_prompt_set${setNumber}`) || "");
    setT2Response(localStorage.getItem(`mockWriting_T2_response_set${setNumber}`) || "");
    const opt = (localStorage.getItem(`mockWriting_T2_option_set${setNumber}`) || "") as any;
    setT2Option(opt === "A" || opt === "B" ? opt : null);
  };

useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);

        // ✅ Always load from localStorage first (W_T1 and W_T2 save here on Next)
        loadFromLocal();

        // ✅ Load API settings for Evaluate button
        try {
          const mod: any = await import("../../services/settingsService");
          if (typeof mod.getAPISettings === "function") {
            const settings = await mod.getAPISettings();
            if (!mounted) return;
            if (settings?.openAIKey && settings?.isConnected) {
              setOpenAIKey(settings.openAIKey);
              setApiConnected(true);
            }
            if (settings?.writingSystemPrompt) {
              setSystemPrompt(settings.writingSystemPrompt);
            }
          }
        } catch {
          // ignore
        }

        // ✅ Reload localStorage again AFTER setNumber is confirmed
        // (covers edge case where setNumber resolved late)
        if (mounted) {
          const t1p = localStorage.getItem(`mockWriting_T1_prompt_set${setNumber}`) || "";
          const t1r = localStorage.getItem(`mockWriting_T1_response_set${setNumber}`) || "";
          const t2p = localStorage.getItem(`mockWriting_T2_prompt_set${setNumber}`) || "";
          const t2r = localStorage.getItem(`mockWriting_T2_response_set${setNumber}`) || "";
          const opt = (localStorage.getItem(`mockWriting_T2_option_set${setNumber}`) || "") as any;

          if (t1p) setT1Prompt(t1p);
          if (t1r) setT1Response(t1r);
          if (t2p) setT2Prompt(t2p);
          if (t2r) setT2Response(t2r);
          if (opt === "A" || opt === "B") setT2Option(opt);

          // ✅ Debug: log what we found so you can verify keys match
          console.log(`[W_Results] setNumber=${setNumber}`);
          console.log(`[W_Results] T1 prompt: ${t1p ? t1p.slice(0, 60) : "EMPTY"}`);
          console.log(`[W_Results] T1 response: ${t1r ? t1r.slice(0, 60) : "EMPTY"}`);
          console.log(`[W_Results] T2 response: ${t2r ? t2r.slice(0, 60) : "EMPTY"}`);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [setNumber]);

  const evaluateNow = async () => {
    setIsEvaluating(true);
    setEvaluation(null);
    try {
      if (!apiConnected || !openAIKey) {
        throw new Error("OpenAI API is not connected. Please connect it in Admin (API Settings).\n");
      }
      const w1 = countWords(t1Response);
      const w2 = countWords(t2Response);

      const userPrompt = `Evaluate Task 1 and Task 2 separately, then compute an overall score.

Writing Task 1 Prompt:
${t1Prompt}

Task 1 Student Response (${w1} words):
${t1Response}

---

Writing Task 2 Prompt:
${t2Prompt}

Task 2 Student Response (${w2} words):
${t2Response}

${
  t2Option
    ? `\nNote: This is a survey-style question where the student chose to support Option ${t2Option}.
Evaluate whether the student:
1. Clearly stated their chosen option (Option ${t2Option})
2. Provided relevant reasons to support their choice
3. Used appropriate examples or explanations
4. Maintained a clear position throughout the response
`
    : ""
}

Return the STRICT JSON format described in the system prompt.`;

      const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt || DEFAULT_WRITING_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1200,
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
      localStorage.setItem(`mockWriting_eval_done_set${setNumber}`, "true");
      localStorage.setItem(`mockWriting_score_set${setNumber}`, String(clamp(safeNumber(parsed?.overallScore, 0), 0, 12)));
    } catch (e: any) {
      setEvaluation({ error: true, message: e?.message || "Failed to evaluate writing" });
    } finally {
      setIsEvaluating(false);
    }
  };

const handleNext = () => {
    if (onComplete) {
      onComplete();
    } else {
      // Optional: navigate to next section if standalone
      navigate(`/mock/${setNumber}/speaking/1`, { state: { mockSet: setNumber } });
    }
  };

const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(`/mock/${setNumber}/writing/2`, { state: { mockSet: setNumber } });
    }
  };




  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm text-gray-700">
          Loading Writing results…
        </div>
      </div>
    );
  }

  // per-task breakdown (supports new & old formats)
  const t1Eval: WritingTaskEval | null =
    !(evaluation as any)?.error && (evaluation as any)?.task1
      ? (evaluation as any).task1
      : !(evaluation as any)?.error
        ? {
            score: overallScore,
            breakdown: (evaluation as any)?.breakdown,
            strengths: (evaluation as any)?.strengths,
            improvements: (evaluation as any)?.improvements,
            detailedFeedback: (evaluation as any)?.detailedFeedback,
          }
        : null;

  const t2Eval: WritingTaskEval | null =
    !(evaluation as any)?.error && (evaluation as any)?.task2
      ? (evaluation as any).task2
      : !(evaluation as any)?.error
        ? {
            score: overallScore,
            breakdown: (evaluation as any)?.breakdown,
            strengths: (evaluation as any)?.strengths,
            improvements: (evaluation as any)?.improvements,
            detailedFeedback: (evaluation as any)?.detailedFeedback,
          }
        : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-6">
      <PracticeFrame
        headerTitle="Writing Test Results"
        onNext={handleNext}
        onBack={handleBack}
        nextLabel="NEXT"
        rightStatus={
          <button
            onClick={evaluateNow}
            disabled={isEvaluating}
            className="h-7 px-3 text-xs font-semibold rounded border bg-white border-white text-blue-700 hover:bg-blue-50 disabled:opacity-60"
            title={apiConnected ? "Re-evaluate" : "Connect API in Admin"}
          >
            {isEvaluating ? "Evaluating…" : "Evaluate"}
          </button>
        }
      >
        <div className="p-8" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          <div className="max-w-5xl mx-auto">
            {/* Score Card */}
            <div className={`rounded-2xl border-2 p-8 mb-8 ${scoreBg(overallScore)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Writing Score</h2>
                    <p className="text-sm text-gray-600">AI Evaluation</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-6xl font-bold ${scoreColor(overallScore)}`}>
  {!evaluation || (evaluation as any).error ? "—" : overallScore < 3 ? "M" : Math.round(overallScore)}
</div>
                  <div className="text-sm font-medium text-gray-600 mt-1">CELPIP Practice Scale</div>
                </div>
              </div>

              {/* ✅ Header sub-scores per task (no Total words) */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-xs text-gray-500">Task 1 score</div>
                  <div className={`text-lg font-semibold ${scoreColor(task1Score)}`}>
  {!evaluation || (evaluation as any).error ? "—" : task1Score < 3 ? "M" : Math.round(task1Score)}
</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-xs text-gray-500">Task 2 score</div>
                  <div className={`text-lg font-semibold ${scoreColor(task2Score)}`}>
  {!evaluation || (evaluation as any).error ? "—" : task2Score < 3 ? "M" : Math.round(task2Score)}
</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-xs text-gray-500">Task 1 words</div>
                  <div className="text-lg font-semibold text-gray-900">{countWords(t1Response)}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="text-xs text-gray-500">Task 2 words</div>
                  <div className="text-lg font-semibold text-gray-900">{countWords(t2Response)}</div>
                </div>
              </div>

              {!apiConnected ? (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900">AI evaluation is not connected</div>
                    <div className="text-xs text-amber-800 mt-1">
                      Go to Admin → API Settings → connect your OpenAI API key.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* AI Breakdown (per task) */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm mb-8">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-700" />
                  <div className="font-semibold text-gray-900">AI Breakdown</div>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem(`mockWriting_eval_done_set${setNumber}`, "false");
                    setEvaluation(null);
                    loadFromLocal();
                  }}
                  className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>
              <div className="p-6">
                {!evaluation ? (
                  <div className="text-sm text-gray-600">
                    Click <span className="font-semibold">Evaluate</span> to get your score.
                  </div>
                ) : (evaluation as any).error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="text-sm font-semibold text-red-900">Evaluation failed</div>
                    <div className="text-xs text-red-800 mt-1">{(evaluation as any).message}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8">
                    <TaskBreakdownCard title="Task 1" score={task1Score} evalData={t1Eval} />
                    <TaskBreakdownCard
                      title={`Task 2${t2Option ? ` (Option ${t2Option})` : ""}`}
                      score={task2Score}
                      evalData={t2Eval}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Responses (feedback under each response) */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <div className="font-semibold text-gray-900">Your Responses</div>
              </div>
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponseCard title="Task 1" prompt={t1Prompt} response={t1Response} evalData={t1Eval} />
                <ResponseCard
                  title={`Task 2${t2Option ? ` (Option ${t2Option})` : ""}`}
                  prompt={t2Prompt}
                  response={t2Response}
                  evalData={t2Eval}
                />
              </div>
            </div>
          </div>
        </div>
      </PracticeFrame>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-gray-700">{label}</div>
      <div className="font-semibold text-gray-900">{Number.isFinite(Number(value)) ? Number(value) : "—"}</div>
    </div>
  );
}

function ResponseCard({
  title,
  prompt,
  response,
  evalData,
}: {
  title: string;
  prompt: string;
  response: string;
  evalData?: WritingTaskEval | null;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-sm font-semibold text-gray-900 mb-3">{title}</div>
      <div className="text-xs font-semibold text-gray-600">Prompt</div>
      <div className="mt-1 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 whitespace-pre-wrap">

        {prompt || <span className="text-gray-500">—</span>}
      </div>
      <div className="mt-3 text-xs font-semibold text-gray-600">Response</div>
      <div className="mt-1 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 whitespace-pre-wrap">

        {response || <span className="text-gray-500">—</span>}
      </div>


    </div>
  );
}

function TaskBreakdownCard({
  title,
  score,
  evalData,
}: {
  title: string;
  score: number;
  evalData: WritingTaskEval | null;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="font-semibold text-gray-900">{title}</div>
        <div className={`text-xl font-bold ${scoreColor(score)}`}>
  {score < 3 ? "M" : Math.round(score)}
</div>
      </div>
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Scores</div>
          <div className="space-y-2 text-sm">
            <Row label="Content/Coherence" value={evalData?.breakdown?.contentCoherence} />
            <Row label="Vocabulary" value={evalData?.breakdown?.vocabulary} />
            <Row label="Readability" value={evalData?.breakdown?.readability} />
            <Row label="Task Fulfillment" value={evalData?.breakdown?.taskFulfillment} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900 mb-2">Feedback</div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">{evalData?.detailedFeedback || "—"}</div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-600">Strengths</div>
              <ul className="mt-1 list-disc list-inside text-sm text-gray-700">
                {(evalData?.strengths || []).slice(0, 4).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Improvements</div>
              <ul className="mt-1 list-disc list-inside text-sm text-gray-700">
                {(evalData?.improvements || []).slice(0, 4).map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
