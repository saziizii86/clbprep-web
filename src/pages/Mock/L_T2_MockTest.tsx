// D:\projects\celpip-master\src\pages\Mock\L_T2_MockTest.tsx
// An English Proficiency Listening Practice Tool - Part 2: Daily Life Conversation
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

// Part 2 has simpler flow: intro -> context -> single audio -> all questions
type Step =
  | { kind: "intro-general" }
  | { kind: "intro-instructions-text" }
  | { kind: "part-overview" }
  | { kind: "context-intro" }
  | { kind: "conversation-audio" }
  | { kind: "question"; questionIndex: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

// ✅ Part 2 identification: in your DB, taskId is like "Part 2: Daily Life Conversation"
function isPart2ListeningMock(m: Partial<MaterialDoc>) {
  const task = String(m.taskId ?? "").toLowerCase();
  const title = String(m.title ?? "").toLowerCase();

  return (
    task.includes("part 2") ||
    task.includes("daily life") ||
    task.includes("daily life conversation") ||
    // optional fallbacks if you label tasks like L_T2, T2, etc.
    task.includes("t2") ||
    title.includes("t2") ||
    title.includes("daily life")
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
  children,
  footerLeft,
}: {
  headerTitle: string;
  rightStatus?: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
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
                NEXT
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

// Added onComplete prop to allow navigation to Part 3 (L_T3_MockTest) when Section B finishes
export default function L_T2_MockTest({ material: passedMaterial, onBack: onBackToPart1, onComplete }: { material?: any; onBack?: () => void; onComplete?: () => void }) {
  const params = useParams() as any;
  const location = useLocation() as any;

  const materialIdFromParam = params?.materialId || params?.id || null;
  const materialIdFromState = location?.state?.materialId || location?.state?.id || null;
  // Part 2 should NOT read Part 1's storage key (it points to Section A)
const materialIdFromStorage =
  typeof window !== "undefined" ? localStorage.getItem("activeMockMaterialId_T2") : null;



// ⚠️ Do NOT hydrate Part 2 UI from the passed material (Part 1 sends its own doc).
// We only use passedMaterial as a hint (mockSet) to locate the correct Part 2 doc in DB.
// ✅ If userHome passes the Part 2 doc, use it immediately (prevents loading screen flash)
const [material, setMaterial] = useState<MaterialDoc | null>(
  (passedMaterial as MaterialDoc) ?? null
);
const [loading, setLoading] = useState<boolean>(!passedMaterial);



const [stepIndex, setStepIndex] = useState(2); // Start at part-overview (one intro page)
const [questionLeft, setQuestionLeft] = useState(35);
const [answers, setAnswers] = useState<Record<number, string>>({});

const [showSkipModal, setShowSkipModal] = useState(false);
const [showAnswerKey, setShowAnswerKey] = useState(false);

const conversationPlayedRef = useRef<boolean>(false);
const questionPlayedRef = useRef<Record<number, boolean>>({});

// ✅ NEW: controls when NEXT becomes enabled on the conversation audio step
const [conversationDone, setConversationDone] = useState(false);


useEffect(() => {
  // ✅ If we already received the Part 2 material from userHome, do NOT fetch.
  // This prevents the "Loading practice session..." screen from flashing.
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

      const passedSet = passedMaterial?.mockSet ?? null;

      // 1) BEST: pick Part 2 from the SAME mockSet (if we had it)
      let picked: MaterialDoc | null =
        passedSet != null
          ? formatted.find(
              (m) =>
                m.isMock === true &&
                String(m.skill || "").toLowerCase() === "listening" &&
                m.mockSet === passedSet &&
                isPart2ListeningMock(m)
            ) ?? null
          : null;

      // 2) Fallback: by ID, but ONLY accept if it is actually Part 2
      if (!picked) {
        const wantedId = materialIdFromParam || materialIdFromState || materialIdFromStorage;
        if (wantedId) {
          const byId = formatted.find((m) => String(m.id) === String(wantedId)) ?? null;
          if (byId && isPart2ListeningMock(byId)) {
            picked = byId;
          }
        }
      }

      // 3) Final fallback: any Part 2 listening mock
      if (!picked) {
        picked =
          formatted.find(
            (m) =>
              m.isMock === true &&
              String(m.skill || "").toLowerCase() === "listening" &&
              isPart2ListeningMock(m)
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

  // Part 2 uses a single conversation audio (first sectionAudio or dedicated audio)
  const conversationAudio = (uploaded.sectionAudios ?? [])[0] ?? null;
  const questionAudios = (uploaded.questionAudios ?? []).filter(Boolean) as SerializedFile[];
  const questionAnswersRaw = Array.isArray(uploaded.questionAnswers) ? uploaded.questionAnswers : [];

  // Part 2 typically has 5 questions
  // Part 2 has 5 questions - use database answers as source of truth, fallback to 5
// Changed from Math.max to use questionAnswersRaw.length as primary source
// This ensures question count matches what's actually in the database
// Part 2 has exactly 5 questions - cap at 5 even if more audios exist
// Using Math.min to ensure we never exceed 5 questions for Section B
const totalQuestions = Math.min(
  Math.max(questionAudios.length, questionAnswersRaw.length, 5),
  5 // Maximum 5 questions for Section B
);  // Part 2 flow: intro -> instructions -> overview -> context -> single audio -> all questions
// Part 2 flow: overview -> questions (no context page, no conversation audio page)
// Part 2 flow: intro -> context -> audio -> questions
const steps: Step[] = useMemo(() => {
  const s: Step[] = [];
  s.push({ kind: "intro-general" });
  s.push({ kind: "intro-instructions-text" });
  s.push({ kind: "part-overview" });
  s.push({ kind: "context-intro" });  // ✅ ADD THIS
  s.push({ kind: "conversation-audio" });  // ✅ ADD THIS

  // Questions after conversation audio
  for (let q = 0; q < totalQuestions; q++) {
    s.push({ kind: "question", questionIndex: q });
  }

  return s;
}, [totalQuestions]);

  const step = steps[clamp(stepIndex, 0, steps.length - 1)];

  useEffect(() => {
    if (!step) return;
    if (step.kind === "question") setQuestionLeft(35);
  }, [stepIndex]);

useEffect(() => {
  if (step?.kind !== "question") return;
  if (questionLeft > 0) return;

  const isLast = stepIndex >= steps.length - 1;

  // ✅ If time ended on the LAST question, end Part 3 (finish the mock)
  if (isLast) {
    onComplete?.();
    return;
  }

  setStepIndex((i) => Math.min(i + 1, steps.length - 1));
}, [questionLeft, step?.kind, stepIndex, steps.length, onComplete]);


useEffect(() => {
  if (step?.kind !== "question") return;
  if (questionLeft > 0) return;

  const isLast = stepIndex >= steps.length - 1;

  // ✅ If time ended on the LAST question, finish Part 2 → go to Part 3
  if (isLast) {
    onComplete?.();
    return;
  }

  // Otherwise, go to next step
  setStepIndex((i) => Math.min(i + 1, steps.length - 1));
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

  const contextImageUrl = useFileUrl(uploaded.contextImage);
  const answerKeyUrl = useFileUrl(uploaded.answerKey);
  const conversationAudioUrl = useFileUrl(conversationAudio);

  const currentQuestionAudio = step?.kind === "question" ? questionAudios?.[step.questionIndex] : null;
  const currentQuestionAudioUrl = useFileUrl(currentQuestionAudio);

  // Generic header title - copyright safe
  const headerTitle = useMemo(() => {
    const base = material?.title?.trim() ? material.title!.trim() : "Listening Practice";
    const part = "Section B — Daily Life Conversation";
    return `${base} · ${part}`;
  }, [material?.title]);

const goBack = () => {
    setShowSkipModal(false);
    setShowAnswerKey(false);
    // If on first step and onBackToPart1 exists, go back to Part 1
    if (stepIndex === 2 && onBackToPart1) {
      onBackToPart1();
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  };

const goNext = async () => {
  // If on audio page, just move to next (questions)
  if (step?.kind === "conversation-audio") {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    return;
  }

  // If on question page, check if answer selected
  if (step?.kind === "question") {
    const selected = answers[step.questionIndex];
    if (!selected && !isSkipPopupDisabled()) {
      setShowSkipModal(true);
      return;
    }
  }

  // If on last question, save answers and navigate to Part 3
  if (stepIndex >= steps.length - 1) {
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
      2, // Part 2
      answers,
      correctAnswers,
      questions,
      parseInt(mockSet, 10)
    );

    if (onComplete) {
      onComplete();
    }
    return;
  }

  // Otherwise, go to next step
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
            Unable to locate the listening practice material for Part 2. Please ensure you have a published 
            listening practice set (Daily Life Conversation) in your database, then open this page with the correct material ID.
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
  onBack={stepIndex > 0 || onBackToPart1 ? goBack : undefined}
  nextDisabled={false} // ✅ never grey; user can skip any step
  nextLabel={stepIndex >= steps.length - 1 ? "COMPLETE SECTION" : "NEXT"}
  footerLeft={footerLeft}
>

        {/* INTRO - GENERAL */}
        {step.kind === "intro-general" ? (
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-indigo-600">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 mb-2">Listening Practice — General Instructions</div>
                <div className="text-sm text-gray-700 space-y-3 max-w-3xl">
                  <p>
                    This is a practice environment that simulates exam timing and navigation. All content is user-provided or generated.
                  </p>
                  <ul className="list-disc ml-5 space-y-2">
                    <li>Audio is intended to be played one time. Try not to replay it, just like in a real test.</li>
                    <li>For each multiple-choice question, you have <b>35 seconds</b> to choose an answer.</li>
                    <li>If you click <b>NEXT</b> without selecting an answer, you will see a confirmation pop-up.</li>
                  </ul>
                  <div className="text-xs text-gray-500 pt-2">
                    Tip: Use headphones if possible. Keep your volume at a comfortable level.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* INTRO - INSTRUCTIONS TEXT */}
        {step.kind === "intro-instructions-text" ? (
          <div className="p-6">
            <div className="text-sm font-semibold text-gray-700 mb-4">Listening Instructions (Text)</div>

            <div className="border border-gray-300 rounded bg-white p-6 max-w-3xl mx-auto">
              <div className="text-xl font-bold text-gray-900 mb-3">How this practice works</div>
              <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-2">
                <li>You will listen to a conversation about a daily life situation.</li>
                <li>The conversation will be played once; pay close attention to the details.</li>
                <li>After the conversation, you will answer questions about what you heard.</li>
                <li>For each question, select the best answer before the timer ends.</li>
              </ol>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
                  className="h-9 px-6 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                >
                  Skip (Text Only)
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-500 text-center">
                (In official tests, this part may appear as a video. Here it is shown as text.)
              </div>
            </div>
          </div>
        ) : null}

        {/* PART OVERVIEW */}
{/* PART OVERVIEW */}
        {step.kind === "part-overview" ? (
          <div className="p-6">
            <div className="text-lg font-bold text-gray-900 mb-3">Listening to Daily Life Conversation</div>
            <div className="text-sm text-indigo-700 space-y-3 max-w-3xl">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>You will hear a dialogue followed by {totalQuestions} questions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Pay attention to each question. The audio will play only once.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Select the most appropriate answer for each question.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : null}

        {/* CONTEXT INTRO */}
        {step.kind === "context-intro" ? (
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="mt-1 text-indigo-600">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-sm text-gray-700">
                <div className="font-semibold text-gray-900 mb-1">Instructions</div>
                <div>
                  Read the situation below. Then you will listen to the complete conversation.
                </div>
              </div>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="text-sm text-gray-800 mb-4 leading-6">
                {isNonEmptyString(uploaded.instructions)
                  ? uploaded.instructions
                  : "You will hear a conversation between two people discussing an everyday situation. Listen carefully for the main topic and specific details mentioned."}
              </div>


            </div>
          </div>
        ) : null}

        {/* CONVERSATION AUDIO - Single audio for Part 2 */}
        {step.kind === "conversation-audio" ? (
          <div className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="mt-1 text-indigo-600">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-sm text-gray-700">
                Listen to the complete conversation. It will be played once in this practice.
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-[min(560px,92vw)] rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 p-6 border border-indigo-200">
                <div className="flex items-center gap-3 mb-3 text-gray-700">
                  <Volume2 className="w-5 h-5 text-indigo-600" />
                  <div className="text-sm font-semibold">Conversation Audio</div>
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
                    No conversation audio uploaded (uploadedFiles.sectionAudios[0]).
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

          // ✅ If user is skipping on the LAST question, go to Part 3
          if (stepIndex >= steps.length - 1) {
            if (onComplete) onComplete();
            return;
          }

          // ✅ Otherwise, just go to next step normally
          setStepIndex((i) => Math.min(i + 1, steps.length - 1));
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


    </div>
  );
}
