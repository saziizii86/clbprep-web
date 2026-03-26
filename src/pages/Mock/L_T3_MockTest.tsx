// D:\projects\celpip-master\src\pages\Mock\L_T3_MockTest.tsx
// An English Proficiency Listening Practice Tool - Part 3: Listening for Information
// This is an INDEPENDENT practice application NOT affiliated with, endorsed by, or connected to any official testing organization.
// All content, design, and functionality are original creations for educational practice purposes only.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Info, Clock, Volume2, X, FileText, Headphones, AlertCircle } from "lucide-react";
import { getMaterials } from "../../services/materialsService";
import { isSkipPopupDisabled } from "../../config/mockToggles";

import { 
  buildQuestionDataArray 
} from "../../utils/mockTestAnswers";
import { saveListeningPartAnswersDB } from "../../services/mockTestAnswersService";

type SerializedFile =
  | {
      name?: string;
      size?: string;
      type?: string;
      storageId?: string;
      storageUrl?: string;
      data?: string | null;
    }
  | null
  | undefined;

type UploadedFiles = {
  instructions?: string;
  contextImage?: SerializedFile;
  answerKey?: SerializedFile;
  sectionAudios?: SerializedFile[];
  sectionTranscripts?: SerializedFile[];
  questionAudios?: SerializedFile[];
  questionTranscripts?: SerializedFile[];
  questionAnswers?: string[][];
};

type MaterialDoc = {
  id: string;
  title?: string;
  skill?: string;
  taskId?: string;
  isMock?: boolean;
  mockSet?: number | null;
  mockOrder?: number | null;
  description?: string;
  uploadedFiles?: UploadedFiles;
};

// Part 3 flow: overview -> audio -> questions
type Step =
  | { kind: "intro-general" }
  | { kind: "intro-instructions-text" }
  | { kind: "part-overview" }
  | { kind: "conversation-audio" }
  | { kind: "question"; questionIndex: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

// ✅ ADD THIS RIGHT HERE (between isNonEmptyString and useFileUrl)
function isPart3ListeningMock(m: Partial<MaterialDoc>) {
  const task = String(m.taskId ?? "").toLowerCase();
  const title = String(m.title ?? "").toLowerCase();

  return (
    task.includes("part 3") ||        // ✅ DB usually has "Part 3: ..."
    task.includes("part3")  ||        // fallback
    task.includes("information") ||
    title.includes("information") ||
    task.includes("t3") || title.includes("t3")
  );
}
function useFileUrl(file: SerializedFile) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    const toUrl = async () => {
      if (!file) {
        setUrl(null);
        return;
      }

      const f: any = file;

      if (isNonEmptyString(f.storageUrl)) {
        setUrl(f.storageUrl);
        return;
      }

      if (isNonEmptyString(f.data)) {
        try {
          const mime = isNonEmptyString(f.type) ? f.type : "application/octet-stream";
          const base64 = f.data.includes("base64,") ? f.data.split("base64,")[1] : f.data;
          const byteChars = atob(base64);
          const byteNumbers = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
          const blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
          return;
        } catch {
          setUrl(null);
          return;
        }
      }

      setUrl(null);
    };

    toUrl();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return url;
}

function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[min(680px,92vw)] rounded-lg bg-white shadow-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="font-semibold text-gray-900">{title ?? "Notice"}</div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 text-gray-800">{children}</div>
        {footer ? <div className="px-5 py-4 border-t border-gray-200">{footer}</div> : null}
      </div>
    </div>
  );
}

// Frame with purple/indigo gradient styling
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
      {/* Frame matching original 1080px width */}
      <div className="mx-auto w-[min(1080px,95vw)] bg-white border border-gray-300 shadow-sm">
        {/* Header bar - Purple/Indigo gradient like Mock Exams page */}
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

        {/* Body - Same min-height as original (620px) */}
        <div className="min-h-[620px]">{children}</div>

        {/* Footer bar - Light gray with visible BACK button */}
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

export default function L_T3_MockTest({ 
  material: passedMaterial, 
  onBack: onBackToPart2,
  onComplete 
}: { 
  material?: any; 
  onBack?: () => void;
  onComplete?: () => void;
}) {
  const params = useParams() as any;
  const location = useLocation() as any;

  const materialIdFromParam = params?.materialId || params?.id || null;
  const materialIdFromState = location?.state?.materialId || location?.state?.id || null;
  const materialIdFromStorage = typeof window !== "undefined" ? localStorage.getItem("activeMockMaterialId") : null;

  const [material, setMaterial] = useState<MaterialDoc | null>(passedMaterial || null);
  const [loading, setLoading] = useState(!passedMaterial);

  const [stepIndex, setStepIndex] = useState(2); // Start at part-overview
  const [questionLeft, setQuestionLeft] = useState(35);

  const [answers, setAnswers] = useState<Record<number, string>>({});

  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  const conversationPlayedRef = useRef<boolean>(false);
  const questionPlayedRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
  // ✅ If we already received the Part 3 material from userHome, do NOT fetch
  if (passedMaterial) {
    setMaterial(passedMaterial as MaterialDoc);
    setLoading(false);
    return;
  }

  const run = async () => {
    try {
      setLoading(true);

      const all = (await getMaterials()) as any[];
      const formatted: MaterialDoc[] = (all || []).map((doc: any) => ({
        id: doc.$id ?? doc.id,
        title: doc.title,
        skill: doc.skill,
        taskId: doc.taskId,
        isMock: doc.isMock === true,
        mockSet: doc.mockSet ?? null,
        mockOrder: doc.mockOrder ?? null,
        description: doc.description ?? "",
        uploadedFiles: doc.uploadedFiles
          ? typeof doc.uploadedFiles === "string"
            ? JSON.parse(doc.uploadedFiles)
            : doc.uploadedFiles
          : {},
      }));

      const activeSet =
        (typeof window !== "undefined" ? localStorage.getItem("activeMockSet") : null) ?? null;

      // 1) Prefer: Part 3 in the SAME mockSet (if we have it)
      let picked: MaterialDoc | null =
        activeSet != null
          ? formatted.find(
              (m) =>
                m.isMock === true &&
                String(m.skill || "").toLowerCase() === "listening" &&
                String(m.mockSet ?? "") === String(activeSet) &&
                isPart3ListeningMock(m)
            ) ?? null
          : null;

      // 2) Fallback: only accept wantedId if it ALSO looks like Part 3
      if (!picked) {
        const wantedId = materialIdFromParam || materialIdFromState || materialIdFromStorage;
        const byId =
          (wantedId ? formatted.find((m) => String(m.id) === String(wantedId)) : null) ?? null;

        if (byId && isPart3ListeningMock(byId)) picked = byId;
      }

      // 3) Final fallback: any Part 3 listening mock
      if (!picked) {
        picked =
          formatted.find(
            (m) =>
              m.isMock === true &&
              String(m.skill || "").toLowerCase() === "listening" &&
              isPart3ListeningMock(m)
          ) ??
          formatted.find((m) => m.isMock === true && String(m.skill || "").toLowerCase() === "listening") ??
          null;
      }

      setMaterial(picked);
    } catch (e) {
      console.error(e);
      setMaterial(null);
    } finally {
      setLoading(false);
    }
  };

  run();
}, [passedMaterial, materialIdFromParam, materialIdFromState, materialIdFromStorage]);


  const uploaded = (material?.uploadedFiles ?? {}) as UploadedFiles;

  // Part 3 uses a single audio (first sectionAudio)
  const conversationAudio = (uploaded.sectionAudios ?? [])[0] ?? null;
  const questionAudios = (uploaded.questionAudios ?? []).filter(Boolean) as SerializedFile[];
  const questionAnswersRaw = Array.isArray(uploaded.questionAnswers) ? uploaded.questionAnswers : [];

  // Part 3 typically has 6 questions
  const totalQuestions = Math.max(questionAudios.length, questionAnswersRaw.length, 6);

  // Part 3 flow: overview -> conversation audio -> questions
  const steps: Step[] = useMemo(() => {
    const s: Step[] = [];
    s.push({ kind: "intro-general" });
    s.push({ kind: "intro-instructions-text" });
    s.push({ kind: "part-overview" });
    s.push({ kind: "conversation-audio" });

    // Questions after conversation audio
    for (let q = 0; q < totalQuestions; q++) {
      s.push({ kind: "question", questionIndex: q });
    }

    return s;
  }, [totalQuestions]);

  const step = steps[clamp(stepIndex, 0, steps.length - 1)];
  const isLastStep = stepIndex >= steps.length - 1;

  useEffect(() => {
    if (!step) return;
    if (step.kind === "question") setQuestionLeft(35);
  }, [stepIndex]);

  useEffect(() => {
    if (step?.kind !== "question") return;
    const t = window.setInterval(() => setQuestionLeft((v) => v - 1), 1000);
    return () => window.clearInterval(t);
  }, [step?.kind]);

useEffect(() => {
  if (step?.kind !== "question") return;

  if (questionLeft <= 0) {
    // ✅ If timer ends on last question, finish -> Part 4
    if (stepIndex >= steps.length - 1) {
      onComplete?.();
      return;
    }

    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }
}, [questionLeft, step?.kind, stepIndex, steps.length, onComplete]);


  const getOptions = (qIndex: number) => {
    const raw = questionAnswersRaw?.[qIndex] ?? [];
    const cleaned = raw.filter(isNonEmptyString).map((s) => s.trim());

    const isLetter = (s: string) => /^[A-E]$/i.test(s);

    if (cleaned.length >= 6 && isLetter(cleaned[5])) {
      return cleaned.slice(1, 5);
    }

    if (cleaned.length >= 5 && isLetter(cleaned[4])) {
      return cleaned.slice(0, 4);
    }

    const nonLetter = cleaned.filter((s) => !isLetter(s));
    return nonLetter.length >= 4 ? nonLetter.slice(0, 4) : ["Choice A", "Choice B", "Choice C", "Choice D"];
  };

  const answerKeyUrl = useFileUrl(uploaded.answerKey);
  const conversationAudioUrl = useFileUrl(conversationAudio);

  const currentQuestionAudio = step?.kind === "question" ? questionAudios?.[step.questionIndex] : null;
  const currentQuestionAudioUrl = useFileUrl(currentQuestionAudio);

  // Generic header title - copyright safe
  const headerTitle = useMemo(() => {
    const base = material?.title?.trim() ? material.title!.trim() : "Listening Practice";
    const part = "Section C — Listening for Information";
    return `${base} · ${part}`;
  }, [material?.title]);

  const goBack = () => {
    setShowSkipModal(false);
    setShowAnswerKey(false);
    // If on first step and onBackToPart2 exists, go back to Part 2
    if (stepIndex === 2 && onBackToPart2) {
      onBackToPart2();
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  };

const goNext = async () => {
  if (step?.kind === "question") {
    const selected = answers[step.questionIndex];
    if (!selected && !isSkipPopupDisabled()) {
      setShowSkipModal(true);
      return;
    }
  }

  // If on last step, save answers and go to Part 4
  // If on last step, save answers and go to Part 4
  if (isLastStep) {
    const mockSet = localStorage.getItem("activeMockSet") || "1";

    try {
      const questions = buildQuestionDataArray(
        answers,
        questionAnswersRaw,
        totalQuestions
      );

      const correctAnswers: Record<number, string> = {};
      questions.forEach((q, i) => {
        correctAnswers[i] = q.correctAnswer;
      });

      await saveListeningPartAnswersDB(
        3, // Part 3
        answers,
        correctAnswers,
        questions,
        parseInt(mockSet, 10)
      );
    } catch (err) {
      console.error("saveListeningPartAnswersDB failed (Part 3):", err);
    } finally {
      if (onComplete) onComplete();
      else setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }

    return;
  }

  
  setStepIndex((i) => Math.min(i + 1, steps.length - 1));
};

  const onTryPlayConversation = (audioEl: HTMLAudioElement | null) => {
    if (!audioEl) return;
    if (conversationPlayedRef.current && audioEl.currentTime === 0) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
  };

  const onTryPlayQuestion = (q: number, audioEl: HTMLAudioElement | null) => {
    if (!audioEl) return;
    if (questionPlayedRef.current[q] && audioEl.currentTime === 0) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
  };

  // Timer status - visible in header
  const rightStatus = useMemo(() => {
    if (step?.kind === "question") {
      const timeLeft = clamp(questionLeft, 0, 35);
      const isLow = timeLeft <= 10;
      return (
        <div className={`text-xs font-semibold ${isLow ? "text-yellow-300" : "text-white"}`}>
          Time remaining: <span className={isLow ? "text-yellow-300" : "text-white"}>{timeLeft} seconds</span>
        </div>
      );
    }
    return null;
  }, [questionLeft, step?.kind]);

  const footerLeft = useMemo(() => {
    if (answerKeyUrl) {
      return (
        <button
          onClick={() => setShowAnswerKey(true)}
          className="h-7 px-3 text-xs font-semibold rounded border border-slate-400 bg-white hover:bg-slate-50 flex items-center gap-2 text-slate-700"
        >
          <FileText className="w-4 h-4" />
          Answer Key
        </button>
      );
    }
    return null;
  }, [answerKeyUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm text-gray-700">
          Loading practice session…
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-xl w-full">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <div className="font-bold text-gray-900">Practice material not found</div>
          </div>
          <div className="text-gray-600 text-sm">
            Unable to locate the listening practice material for Part 3. Please ensure you have a published 
            listening practice set (Listening for Information) in your database, then open this page with the correct material ID.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <PracticeFrame
        headerTitle={headerTitle}
        rightStatus={rightStatus}
        onNext={goNext}
        onBack={stepIndex > 0 || onBackToPart2 ? goBack : undefined}
        nextDisabled={false}
        nextLabel="NEXT"
        footerLeft={footerLeft}
      >
        {/* PART OVERVIEW */}
        {step.kind === "part-overview" ? (
          <div className="p-6">
            <div className="text-lg font-bold text-gray-900 mb-3">Listening for Information</div>
            <div className="text-sm text-indigo-700 space-y-3 max-w-3xl">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>You will hear a recording followed by {totalQuestions} questions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Listen carefully for specific details and information.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Select the most appropriate answer for each question.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : null}

        {/* CONVERSATION AUDIO */}
        {step.kind === "conversation-audio" ? (
          <div className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="mt-1 text-indigo-600">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-sm text-gray-700">
                Listen to the recording. It will be played once in this practice.
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-[min(560px,92vw)] rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 p-6 border border-indigo-200">
                <div className="flex items-center gap-3 mb-3 text-gray-700">
                  <Volume2 className="w-5 h-5 text-indigo-600" />
                  <div className="text-sm font-semibold">Information Recording</div>
                </div>

                {conversationAudioUrl ? (
                  <audio
                    key={conversationAudioUrl}
                    controls
                    autoPlay
                    className="w-full"
                    onPlay={(e) => onTryPlayConversation(e.currentTarget)}
                    onEnded={() => {
                      conversationPlayedRef.current = true;
                    }}
                  >
                    <source src={conversationAudioUrl} />
                  </audio>
                ) : (
                  <div className="bg-white border border-gray-300 rounded p-4 text-sm text-gray-600">
                    No recording audio uploaded (uploadedFiles.sectionAudios[0]).
                  </div>
                )}

                <div className="mt-4 border border-indigo-200 bg-white p-3 text-xs text-gray-700 rounded">
                  Note: The audio player UI is shown here only for practice. Your real exam interface may differ.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* QUESTION */}
        {step.kind === "question" ? (
          <div className="h-full">
            <div className="grid grid-cols-2 min-h-[620px]">
              {/* Left: audio */}
              <div className="p-6 border-r border-gray-300">
                <div className="flex items-start gap-3 mb-4">
                  <div className="mt-1 text-indigo-600">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="text-sm text-gray-700">
                    Listen to the question prompt. It will play once in this practice.
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="w-[min(520px,92vw)] rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 p-6 border border-indigo-200">
                    <div className="flex items-center gap-3 mb-3 text-gray-700">
                      <Volume2 className="w-5 h-5 text-indigo-600" />
                      <div className="text-sm font-semibold">Question Audio</div>
                    </div>

                    {currentQuestionAudioUrl ? (
                      <audio
                        key={currentQuestionAudioUrl}
                        controls
                        autoPlay
                        className="w-full"
                        onPlay={(e) => onTryPlayQuestion(step.questionIndex, e.currentTarget)}
                        onEnded={() => {
                          questionPlayedRef.current[step.questionIndex] = true;
                        }}
                      >
                        <source src={currentQuestionAudioUrl} />
                      </audio>
                    ) : (
                      <div className="bg-white border border-gray-300 rounded p-4 text-sm text-gray-600">
                        No question audio uploaded (uploadedFiles.questionAudios[{step.questionIndex}]).
                      </div>
                    )}

                    <div className="mt-4 border border-indigo-200 bg-white p-3 text-xs text-gray-700 rounded">
                      Note: The audio player UI is shown here only for practice. Your real exam interface may differ.
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: options - purple tinted background */}
              <div className="p-6 bg-gradient-to-br from-indigo-50/80 to-purple-50/80">
                <div className="text-xs text-gray-700 mb-2">
                  Question <b>{step.questionIndex + 1}</b> of <b>{totalQuestions}</b>
                </div>
                <div className="flex items-start gap-2 text-sm font-semibold text-gray-800 mb-4">
                  <Info className="w-4 h-4 mt-[2px] text-indigo-600" />
                  Choose the best answer.
                </div>

                <div className="space-y-3">
                  {getOptions(step.questionIndex).map((opt) => {
                    const selected = answers[step.questionIndex] === opt;
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                          selected 
                            ? "border-indigo-400 bg-white shadow-sm" 
                            : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${step.questionIndex}`}
                          checked={selected}
                          onChange={() => setAnswers((a) => ({ ...a, [step.questionIndex]: opt }))}
                          className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-800">{opt}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-8 text-xs text-gray-500">
                  You can change your choice until you move on or the timer ends.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Skip-without-answer modal */}
        <Modal
          open={showSkipModal}
          title="No answer selected"
          onClose={() => setShowSkipModal(false)}
          footer={
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowSkipModal(false)}
                className="h-9 px-4 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
              >
                Keep working on this question
              </button>
              <button
                onClick={() => {
                  setShowSkipModal(false);
                  if (isLastStep && onComplete) {
                    onComplete();
                  } else {
                    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
                  }
                }}
                className="h-9 px-4 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 text-sm font-semibold"
              >
                Skip and continue
              </button>
            </div>
          }
        >
          <div className="text-sm text-gray-700 leading-6">
            You haven't chosen an answer. If you continue, you may not be able to return to this question in a real exam setting.
          </div>
        </Modal>

        {/* Answer key modal */}
        <Modal
          open={showAnswerKey}
          title="Answer Key"
          onClose={() => setShowAnswerKey(false)}
          footer={
            <div className="flex justify-end">
              <button
                onClick={() => setShowAnswerKey(false)}
                className="h-9 px-4 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
              >
                Close
              </button>
            </div>
          }
        >
          {answerKeyUrl ? (
            <div className="text-sm text-gray-700">
              <div className="mb-2">
                If your answer key is a PDF/image, open it in a new tab:
              </div>
              <a
                href={answerKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 underline"
              >
                Open Answer Key
              </a>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No answer key uploaded for this practice.</div>
          )}
        </Modal>
      </PracticeFrame>

      {/* Developer hint */}
      <div className="mx-auto w-[min(1080px,95vw)] mt-3 text-[11px] text-gray-500">
        Loaded material: <span className="font-mono">{material.id}</span>
        {material.title ? <span> · {material.title}</span> : null}
      </div>
    </div>
  );
}
