// D:\projects\celpip-master\src\pages\Mock\L_T6_MockTest.tsx
// Listening Part 6 (Viewpoints - Audio + Dropdown Questions on one page)
// Independent practice UI (not affiliated with any official testing organization).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AlertCircle, Clock, FileText, Info, Volume2, X } from "lucide-react";
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

  // Optional attachments
  answerKey?: SerializedFile;

  // Part 6: audio
  audioFile?: SerializedFile;
  sectionAudios?: SerializedFile[];
  audioUrl?: string;

  // Part 6 questions:
  // recommended: [stem, optA, optB, optC, optD, correctLetter]
  // fallback:    [optA, optB, optC, optD, correctLetter]
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
  uploadedFiles?: UploadedFiles | string;
};

type Step =
  | { kind: "intro-bullets" }
  | { kind: "intro-instructions" }
  | { kind: "audio" }
  | { kind: "questions-all" };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
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

// ✅ Frame styled SAME as L_T5 (matching header, footer, colors)
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
      <div className="mx-auto w-[min(1080px,95vw)] bg-white border border-gray-300 shadow-sm">
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

        <div className="min-h-[620px]">{children}</div>

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

function isPart6Mock(m: Partial<MaterialDoc>) {
  const task = String(m.taskId ?? "").toLowerCase();
  const title = String(m.title ?? "").toLowerCase();

  return (
    task.includes("l_t6") ||
    task.includes("t6") ||
    task.includes("part 6") ||
    task.includes("part6") ||
    task.includes("viewpoints") ||
    title.includes("l_t6") ||
    title.includes("t6") ||
    title.includes("part 6") ||
    title.includes("part6") ||
    title.includes("viewpoints")
  );
}

function formatTimeMMSS(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

export default function L_T6_MockTest({
  onComplete,
  onBack,
  material: passedMaterial,
}: {
  onComplete?: () => void;
  onBack?: () => void;
  material?: any;
}) {
  const params = useParams() as any;
  const location = useLocation() as any;

  const materialIdFromParam = params?.materialId || params?.id || null;
  const materialIdFromState = location?.state?.materialId || location?.state?.id || null;
  const materialIdFromStorage =
    typeof window !== "undefined" ? localStorage.getItem("activeMockMaterialId") : null;

  // ✅ FIX: If passedMaterial exists, use it directly without loading
// ✅ Only trust passedMaterial if it's truly Part 6
// ✅ FIX: If passedMaterial exists, use it directly without loading
// Trust the passed material from userHome - it's already the correct Part 6 material
const [material, setMaterial] = useState<MaterialDoc | null>(passedMaterial || null);
const [loading, setLoading] = useState(!passedMaterial);


  const steps: Step[] = useMemo(
    () => [
      { kind: "intro-bullets" },
      { kind: "intro-instructions" },
      { kind: "audio" },
      { kind: "questions-all" },
    ],
    []
  );

  const [stepIndex, setStepIndex] = useState(0);

  // Part 6: all dropdown questions on one page with a timer.
  const QUESTION_TIME_SECONDS = 3 * 60;
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingIndices, setMissingIndices] = useState<number[]>([]);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  // "Play once" behavior: if user tries to replay after ended, we reset to start and pause.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedOnceRef = useRef(false);

  // ✅ FIX: Only fetch if no passedMaterial
useEffect(() => {
  // If material was passed as prop, use it directly - no need to fetch
  if (passedMaterial) {
    setMaterial(passedMaterial);
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

const wantedId = materialIdFromParam || materialIdFromState || materialIdFromStorage;

// 1) Try wantedId BUT only keep it if it's actually Part 6
let picked: MaterialDoc | null =
  (wantedId ? formatted.find((m) => String(m.id) === String(wantedId)) : null) ?? null;

if (picked && !isPart6Mock(picked)) {
  // ✅ activeMockMaterialId usually points to Part 1; ignore it for Part 6
  picked = null;
}

// 2) BEST: use activeMockSet + mockOrder=6 to get the correct Part 6 for the SAME mock test
if (!picked) {
  const setKey =
    typeof window !== "undefined" ? localStorage.getItem("activeMockSet") : null;

  if (setKey) {
    picked =
      formatted.find(
        (m) =>
          m.isMock === true &&
          String(m.skill || "").toLowerCase() === "listening" &&
          Number(m.mockSet) === Number(setKey) &&
          Number(m.mockOrder) === 6
      ) ?? null;
  }
}

// 3) Final fallback: any listening Part 6
if (!picked) {
  picked =
    formatted.find(
      (m) =>
        m.isMock === true &&
        String(m.skill || "").toLowerCase() === "listening" &&
        isPart6Mock(m)
    ) ?? null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passedMaterial]);

  const uploaded: UploadedFiles = useMemo(() => {
    const raw = material?.uploadedFiles ?? {};
    return typeof raw === "string" ? (JSON.parse(raw) as any) : (raw as any);
  }, [material?.uploadedFiles]);

  const questionAnswersRaw = Array.isArray(uploaded.questionAnswers) ? uploaded.questionAnswers : [];
  const totalQuestions = questionAnswersRaw.length;

  const sectionAudios = (uploaded.sectionAudios ?? []).filter(Boolean) as SerializedFile[];

  // ✅ Prefer admin's uploadedFiles.audioFile, else fall back to sectionAudios[0]
  const audioFile = (uploaded.audioFile ?? sectionAudios?.[0] ?? null) as SerializedFile;

  const audioFileUrl = useFileUrl(audioFile);

  const audioUrl = useMemo(() => {
    // Prefer a direct hosted URL if provided, otherwise use the serialized file URL (data/storageUrl)
    const direct = typeof uploaded.audioUrl === "string" ? uploaded.audioUrl.trim() : "";
    return direct || audioFileUrl || null;
  }, [uploaded.audioUrl, audioFileUrl]);

  const answerKeyUrl = useFileUrl(uploaded.answerKey);

  const step = steps[clamp(stepIndex, 0, steps.length - 1)];

  // Reset timer when entering question page
  useEffect(() => {
    if (step.kind === "questions-all") {
      setTimeLeft(QUESTION_TIME_SECONDS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  useEffect(() => {
    if (step.kind !== "questions-all") return;

    const t = window.setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearInterval(t);
  }, [step.kind]);

  useEffect(() => {
    if (step.kind !== "questions-all") return;
    if (timeLeft > 0) return;

    if (onComplete) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, step.kind]);

  const headerTitle = useMemo(() => {
    const base = material?.title?.trim() ? material.title!.trim() : "Listening Practice";
    return `${base} · Part 6 — Viewpoints`;
  }, [material?.title]);

  const footerLeft = useMemo(() => {
    if (!answerKeyUrl) return null;
    return (
      <button
        onClick={() => setShowAnswerKey(true)}
        className="h-7 px-3 text-xs font-semibold rounded border border-indigo-500 bg-indigo-700 hover:bg-indigo-600 flex items-center gap-2 text-white"
      >
        <FileText className="w-4 h-4" />
        Answer Key
      </button>
    );
  }, [answerKeyUrl]);

  const rightStatus = useMemo(() => {
    if (step.kind === "questions-all") {
      return (
        <div className="text-xs font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Time remaining: <span className="text-yellow-300">{formatTimeMMSS(timeLeft)}</span>
        </div>
      );
    }
    return null;
  }, [step.kind, timeLeft]);

  // ✅ FIX: Better logic to extract stem and options, filtering out answer letters
  const getQuestionStemAndOptions = (qIndex: number) => {
    const raw = questionAnswersRaw?.[qIndex] ?? [];
    const cleaned = raw.filter(isNonEmptyString).map((s) => s.trim());

    // Check if a string is just a single letter A-E (answer key)
    const isAnswerLetter = (s: string) => /^[A-E]$/i.test(s);

    let stem = "";
    let options: string[] = [];

    // Filter out any single-letter answer keys from the array
    const withoutAnswerLetters = cleaned.filter((s) => !isAnswerLetter(s));

    if (withoutAnswerLetters.length >= 5) {
      // Format: [stem, optA, optB, optC, optD]
      stem = withoutAnswerLetters[0];
      options = withoutAnswerLetters.slice(1, 5);
    } else if (withoutAnswerLetters.length >= 4) {
      // Format: [optA, optB, optC, optD] - no stem
      stem = `Question ${qIndex + 1}`;
      options = withoutAnswerLetters.slice(0, 4);
    } else {
      // Fallback
      stem = `Question ${qIndex + 1}`;
      options = withoutAnswerLetters.length > 0 
        ? withoutAnswerLetters 
        : ["Choice A", "Choice B", "Choice C", "Choice D"];
    }

    // Ensure we have valid data
    if (!isNonEmptyString(stem) || stem.length < 3) {
      stem = `Question ${qIndex + 1}`;
    }
    if (!options || options.length < 2) {
      options = ["Choice A", "Choice B", "Choice C", "Choice D"];
    }

    return { stem, options };
  };

  const validateAllAnswered = () => {
    const missing: number[] = [];
    for (let i = 0; i < totalQuestions; i++) {
      if (!answers[i]) missing.push(i);
    }
    setMissingIndices(missing);
    return missing.length === 0;
  };

  const goBack = () => {
    setShowMissingModal(false);
    setShowAnswerKey(false);

    if (stepIndex <= 0) {
      if (onBack) onBack();
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  };

const goNext = async () => {
  if (step.kind === "questions-all") {
    // Save answers before completing
    const mockSet = localStorage.getItem("activeMockSet") || "1";
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
      6, // Part number
      answers,
      correctAnswers,
      questions,
      parseInt(mockSet, 10)
    );
    
    if (!validateAllAnswered()) {
      if (!isSkipPopupDisabled()) {
        setShowMissingModal(true);
        return;
      }
      // popup disabled => finish even if missing
      if (onComplete) onComplete();
      return;
    }
    if (onComplete) onComplete();
    return;
  }

  setStepIndex((i) => Math.min(i + 1, steps.length - 1));
};

  const handleAudioPlay = () => {
    const a = audioRef.current;
    if (!a) return;

    // If user tries to replay from start after it ended, prevent looping.
    if (playedOnceRef.current && a.currentTime === 0) {
      a.pause();
    }
  };

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
            <div className="text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-lg font-semibold text-gray-900">Material not found</div>
          </div>
          <div className="text-sm text-gray-700 leading-6">
            Could not load a Listening mock for Part 6 (Viewpoints). Please check your database record.
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
        onBack={goBack}
        nextLabel={step.kind === "questions-all" ? "FINISH" : "NEXT"}
        footerLeft={footerLeft}
      >
        {step.kind === "intro-bullets" ? (
          <div className="p-10">
            <div className="mx-auto max-w-3xl">
              <div className="text-lg font-semibold text-gray-900 mb-4">Listening for Viewpoints</div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <ul className="text-sm text-gray-700 leading-7 list-disc pl-5 space-y-3">
                  <li>You will hear a discussion. It appears only once in this practice.</li>
                  <li>After the audio, all questions will appear on one page.</li>
                  <li>Select the best completion for each statement using the dropdown menu.</li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {step.kind === "intro-instructions" ? (
          <div className="p-10">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <Info className="w-4 h-4 text-indigo-600" />
                Instructions
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-700 leading-7">
                {uploaded.instructions?.trim()
                  ? uploaded.instructions
                  : "Listen to the audio once. Then answer the questions by choosing options from the dropdown menus."}
              </div>
            </div>
          </div>
        ) : null}

        {step.kind === "audio" ? (
          <div className="p-10">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
                <Volume2 className="w-5 h-5 text-indigo-600" />
                Listen to the viewpoints (once)
              </div>

              <div className="flex justify-center">
                <div className="w-[min(620px,92vw)] rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 p-6 border border-indigo-200">
                  {audioUrl ? (
                    <audio
                      ref={audioRef}
                      key={audioUrl}
                      controls
                      autoPlay
                      className="w-full"
                      onPlay={handleAudioPlay}
                      onEnded={() => {
                        playedOnceRef.current = true;
                        // Keep at end, but prevent restart from 0 by pausing.
                        const a = audioRef.current;
                        if (a) a.pause();
                      }}
                    >
                      <source src={audioUrl} />
                    </audio>
                  ) : (
                    <div className="bg-white border border-gray-300 rounded p-4 text-sm text-gray-600">
                      No audio uploaded. Please set uploadedFiles.audioUrl OR uploadedFiles.sectionAudios[0].
                    </div>
                  )}

                  <div className="mt-4 border border-indigo-200 bg-white p-3 text-xs text-gray-700 rounded">
                    Practice note: this player is shown here for practice convenience.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step.kind === "questions-all" ? (
          <div className="p-10">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-start gap-2 text-sm font-semibold text-gray-900 mb-4">
                <Info className="w-4 h-4 mt-[2px] text-indigo-600" />
                Complete each statement using the dropdown menu.
              </div>

              {totalQuestions <= 0 ? (
                <div className="bg-white border border-gray-300 rounded p-4 text-sm text-gray-600">
                  No questions found. Please check uploadedFiles.questionAnswers in your DB for this material.
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="space-y-4">
                    {Array.from({ length: totalQuestions }).map((_, idx) => {
                      const { stem, options } = getQuestionStemAndOptions(idx);

                      return (
                        <div key={idx} className="text-sm text-gray-900 leading-7">
                          {/* number + sentence on SAME line */}
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
                            <span className="font-semibold text-gray-700 shrink-0">{idx + 1}.</span>
                            <span className="min-w-0">{stem}</span>

                            <select
                              aria-label={`Question ${idx + 1} answer`}
                              className="inline-block min-w-[220px] max-w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white align-middle appearance-none"
                              value={answers[idx] ?? ""}
                              onChange={(e) => setAnswers((a) => ({ ...a, [idx]: e.target.value }))}
                            >
                              {/* blank default (shows empty), NOT in the dropdown list */}
                              <option value="" disabled hidden />
                              {options.map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 text-xs text-gray-500">
                    Tip: Make sure every dropdown has a selection before clicking FINISH.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <Modal
          open={showMissingModal}
          title="Answers missing"
          onClose={() => setShowMissingModal(false)}
          footer={
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowMissingModal(false)}
                className="h-9 px-4 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
              >
                Keep working
              </button>

              <button
                onClick={() => {
                  setShowMissingModal(false);
                  if (onComplete) onComplete();
                }}
                className="h-9 px-4 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 text-sm font-semibold"
              >
                Skip and continue
              </button>
            </div>
          }
        >
          <div className="text-sm text-gray-700 leading-6">
            You haven't answered all questions yet.
            {missingIndices.length > 0 ? (
              <div className="mt-2">
                Missing: <span className="font-semibold">{missingIndices.map((i) => i + 1).join(", ")}</span>
              </div>
            ) : null}
          </div>
        </Modal>

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
              <div className="mb-2">Open the answer key in a new tab:</div>
              <a href={answerKeyUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                Open Answer Key
              </a>
            </div>
          ) : (
            <div className="text-sm text-gray-600">No answer key uploaded for this practice.</div>
          )}
        </Modal>
      </PracticeFrame>
    </div>
  );
}
