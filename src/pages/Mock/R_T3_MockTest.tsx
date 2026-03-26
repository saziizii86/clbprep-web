// D:\projects\celpip-master\src\pages\Mock\R_T3_MockTest.tsx
// Reading Part 3 (Reading for Information - Paragraph Matching A/B/C/D/E)
// This is an INDEPENDENT practice application NOT affiliated with, endorsed by, or connected to any official testing organization.
// All content, design, and functionality are original creations for educational practice purposes only.

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AlertCircle, Clock, Info, X } from "lucide-react";
import { getMaterials, getMaterialById } from "../../services/materialsService";
import { isSkipPopupDisabled } from "../../config/mockToggles";
import { saveReadingPartAnswersDB } from "../../services/mockTestAnswersService";

// Fixed options for Part 3 (paragraph labels + not given)
const FIXED_OPTIONS = ["A", "B", "C", "D", "E"];

// Helper function to save reading part answers
// Reading part answers are now saved to DB via mockTestAnswersService

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

  // Admin saves Part 3 reading passage here (base64 text file)
  sectionTranscripts?: Array<{ data?: string; name?: string } | string>;

  // Sometimes saved here too
  readingPassage?: { data?: string; name?: string } | string;

  // Question texts array
  questionTexts?: string[];

  // Admin saves QUESTIONS textarea here (paragraphText with questions)
  paragraphText?: string;

  // Answer key - can be letters (A/B/C/D/E) or numbers (0-4)
  correctAnswers?: (string | number)[];
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
  // Fallback support
  readingPassage?: any;
  questionTexts?: string[];
  correctAnswers?: (string | number)[];
  questionAnswers?: any[];
};

type Step =
  | { kind: "intro-bullets" }
  | { kind: "intro-instructions" }
  | { kind: "reading-questions" };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function normalizeMockSet(v: any): string {
  const s = String(v ?? "").trim();
  const m = s.match(/\d+/);
  return m ? m[0] : s.toLowerCase();
}

// Decode base64 content from DB
function decodeBase64Maybe(value: any): string {
  if (!value) return "";

  // object {data, name}
  if (typeof value === "object" && value.data) {
    const raw = value.data;
    try {
      if (raw.includes(",")) return atob(raw.split(",")[1]);
      return atob(raw);
    } catch {
      return raw;
    }
  }

  // string base64 or normal string
  if (typeof value === "string") {
    try {
      if (value.includes(",")) return atob(value.split(",")[1]);
      return atob(value);
    } catch {
      return value;
    }
  }

  return "";
}

// Normalize answer to A/B/C/D/E format
function normalizeAnswer(ans: any): string {
  if (ans === null || ans === undefined) return "";
  // if number 0..4 -> A..E
  if (typeof ans === "number") {
    return FIXED_OPTIONS[ans] || "";
  }
  const s = String(ans).trim().toUpperCase();
  // if "1..5" sometimes happens -> map to A..E
  if (["1", "2", "3", "4", "5"].includes(s)) {
    return FIXED_OPTIONS[parseInt(s, 10) - 1] || "";
  }
  return s;
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
        {footer ? (
          <div className="px-5 py-4 border-t border-gray-200">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

// Frame with blue gradient styling for Reading section
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


function isPart3ReadingMock(m: Partial<MaterialDoc>) {
  const task = String((m as any)?.taskId ?? (m as any)?.task ?? "").toLowerCase();
  const title = String(m.title ?? "").toLowerCase();

  return (
    task.includes("r_t3") ||
    task.includes("reading_t3") ||
    task.includes("part 3") ||
    task.includes("part3") ||
    task.includes("information") ||
    title.includes("r_t3") ||
    title.includes("reading_t3") ||
    title.includes("part 3") ||
    title.includes("part3") ||
    title.includes("information") ||
    title.includes("reading for information")
  );
}

export default function R_T3_MockTest({
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
  const materialIdFromState =
    location?.state?.materialId || location?.state?.id || null;
  const materialIdFromStorage =
    typeof window !== "undefined"
      ? localStorage.getItem("activeMockMaterialId")
      : null;

  const [material, setMaterial] = useState<MaterialDoc | null>(
    passedMaterial || null
  );
  const [loading, setLoading] = useState(!passedMaterial);

  const steps: Step[] = useMemo(
    () => [
      { kind: "intro-bullets" },
      { kind: "intro-instructions" },
      { kind: "reading-questions" },
    ],
    []
  );

  const [stepIndex, setStepIndex] = useState(0);

  // Reading Part 3: 9 minutes
  const QUESTION_TIME_SECONDS = 9 * 60;
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);

  // Answers array for each question (A/B/C/D/E strings)
  const [answers, setAnswers] = useState<string[]>([]);

  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingIndices, setMissingIndices] = useState<number[]>([]);

 useEffect(() => {
    const loadFull = async (m: any) => {
      const docId = m?.id ?? m?.$id;
      if (!docId) return m;
      try {
        const full = await getMaterialById(docId);
        if (!full) return m;
        let f = (full as any).uploadedFiles;
        if (typeof f === "string") { try { f = JSON.parse(f); } catch { f = {}; } }
        return { ...m, ...full, uploadedFiles: f || {} };
      } catch { return m; }
    };

if (passedMaterial) {
  const hasFiles =
    passedMaterial.uploadedFiles &&
    typeof passedMaterial.uploadedFiles === 'object' &&
    Object.keys(passedMaterial.uploadedFiles).length > 0;

  if (hasFiles) {
    // Already fully loaded from pre-fetch — instant, no DB call
    setMaterial(passedMaterial);
    setLoading(false);
    return;
  }

  // uploadedFiles empty — fetch full doc from DB
  const refetch = async () => {
    setLoading(true);
    const full = await loadFull(passedMaterial);
    setMaterial(full);
    setLoading(false);
  };
  refetch();
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
          taskId: doc.taskId ?? doc.task ?? doc.taskID ?? doc.task_id,
          isMock: doc.isMock === true,
          mockSet: doc.mockSet ?? null,
          mockOrder: doc.mockOrder ?? null,
          description: doc.description ?? "",
          uploadedFiles: {},
          readingPassage: doc.readingPassage ?? null,
          questionTexts: doc.questionTexts ?? null,
          correctAnswers: doc.correctAnswers ?? null,
          questionAnswers: doc.questionAnswers ?? null,
        }));

        const wantedId =
          materialIdFromParam || materialIdFromState || materialIdFromStorage;

        let picked: MaterialDoc | null =
          (wantedId
            ? formatted.find((m) => String(m.id) === String(wantedId))
            : null) ?? null;

        if (picked && !isPart3ReadingMock(picked)) picked = null;

        if (!picked) {
          const setKey =
            typeof window !== "undefined"
              ? localStorage.getItem("activeMockSet")
              : null;
          if (setKey) {
            const targetSet = normalizeMockSet(setKey);
            const candidates = formatted.filter(
              (m) =>
                m.isMock === true &&
                String(m.skill || "").toLowerCase() === "reading" &&
                normalizeMockSet(m.mockSet) === targetSet &&
                isPart3ReadingMock(m)
            );
            picked =
              candidates.sort(
                (a, b) =>
                  Number(a.mockOrder ?? 9999) - Number(b.mockOrder ?? 9999)
              )[0] ?? null;
          }
        }

        if (!picked) {
          picked =
            formatted.find(
              (m) =>
                m.isMock === true &&
                String(m.skill || "").toLowerCase() === "reading" &&
                isPart3ReadingMock(m)
            ) ?? null;
        }

        // ✅ Fetch full doc with uploadedFiles
        if (picked) {
          picked = await loadFull(picked);
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

  const step = steps[clamp(stepIndex, 0, steps.length - 1)];

  // Reset timer when entering reading-questions step
  useEffect(() => {
    if (step.kind === "reading-questions") {
      setTimeLeft(QUESTION_TIME_SECONDS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  useEffect(() => {
    if (step.kind !== "reading-questions") return;

    const t = window.setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearInterval(t);
  }, [step.kind]);

  useEffect(() => {
    if (step.kind !== "reading-questions") return;
    if (timeLeft > 0) return;

    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, step.kind]);

  // ✅ Get passage from sectionTranscripts[0] (like Part 1)
  const passageRaw = useMemo(() => {
    const transcripts = uploaded?.sectionTranscripts;
    if (transcripts && transcripts[0]) {
      return decodeBase64Maybe(transcripts[0]);
    }

    // Fallback 2: readingPassage in uploadedFiles
    if (uploaded?.readingPassage) {
      return decodeBase64Maybe(uploaded.readingPassage);
    }

    // Fallback 3: material level readingPassage
    if (material?.readingPassage) {
      return decodeBase64Maybe(material.readingPassage);
    }

    return material?.description || "";
  }, [uploaded, material]);

  // ✅ Parse passage into A/B/C/D blocks
  const parsedParagraphs = useMemo(() => {
    const raw = (passageRaw || "").trim();
    if (!raw) return [];

    // Expects "A. ... B. ... C. ... D. ..."
    const parts = raw.split(/\n(?=[A-D]\.)/g);

    return parts
      .map((p) => p.trim())
      .filter(Boolean)
      .map((block) => {
        const label = block.slice(0, 2); // "A."
        const text = block.slice(2).trim();
        return { label, text };
      });
  }, [passageRaw]);

  // ✅ Extract questions for Part 3
  const questionTexts: string[] = useMemo(() => {
    // Priority 1: uploadedFiles.questionTexts
    const fromUploaded = uploaded?.questionTexts;
    if (Array.isArray(fromUploaded) && fromUploaded.length > 0)
      return fromUploaded;

    // Priority 2: parse uploadedFiles.paragraphText (Admin big textarea)
    const paragraphText = uploaded?.paragraphText;
    if (typeof paragraphText === "string" && paragraphText.trim().length > 0) {
      const lines = paragraphText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      // Extract lines like: "1. Which paragraph ...?"
      const extracted: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip answer lines and header
        if (/^answer\s*:/i.test(line)) continue;
        if (/^QUESTIONS$/i.test(line)) continue;

        const match = line.match(/^(\d+)\.\s*(.+)$/);
        if (match) {
          extracted.push(match[2].trim());
        }
      }

      if (extracted.length > 0) return extracted;
    }

    // Fallback 3: material level questionTexts
    if (
      Array.isArray(material?.questionTexts) &&
      material.questionTexts.length > 0
    ) {
      return material.questionTexts;
    }

    // Fallback 4: questionAnswers row[0]
    if (
      Array.isArray(material?.questionAnswers) &&
      material.questionAnswers.length > 0
    ) {
      const extracted = material.questionAnswers
        .map((row: any) => (Array.isArray(row) ? row[0] : null))
        .filter((x: any) => typeof x === "string" && x.trim().length > 0);

      if (extracted.length > 0) return extracted;
    }

    return [];
  }, [uploaded, material]);

// ✅ Correct answers from DB (A/B/C/D/E)
const correctAnswers: string[] = useMemo(() => {
  // Admin saves answer key as uploadedFiles.questionAnswers (not correctAnswers)
   // ✅ If Admin saved questionAnswers rows, last column is the correct choice (A/B/C/D)
   const qa =
     (uploaded as any)?.questionAnswers ??
     (material as any)?.questionAnswers ??
     null;
 
   if (Array.isArray(qa) && Array.isArray(qa[0])) {
     return qa.map((row: any[]) => normalizeAnswer(row?.[row.length - 1]));
   }
 
  const raw =
     (uploaded as any)?.correctAnswers ??
     (material as any)?.correctAnswers ??
     [];
 
  if (!Array.isArray(raw)) return [];
   return raw.map((x) => normalizeAnswer(x));

}, [uploaded, material]);



  // ✅ Initialize answers array when questions load
  useEffect(() => {
    if (!questionTexts || questionTexts.length === 0) return;
    setAnswers(Array(questionTexts.length).fill(""));
  }, [questionTexts.length]);

  const handleSelect = (index: number, value: string) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    // Save answers to localStorage
    const mockSet = localStorage.getItem("activeMockSet") || "1";

    const userAnswersMap: Record<number, string> = {};
    answers.forEach((ans, idx) => {
      userAnswersMap[idx] = ans;
    });

    const correctAnswersMap: Record<number, string> = {};
    correctAnswers.forEach((ans, idx) => {
      correctAnswersMap[idx] = ans;
    });

    await saveReadingPartAnswersDB(
      3,
      userAnswersMap,
      correctAnswersMap,
      questionTexts,
      parseInt(mockSet, 10)
    );

    if (onComplete) onComplete();
  };

  const validateAllAnswered = () => {
    const missing: number[] = [];

    answers.forEach((ans, idx) => {
      if (!ans) missing.push(idx + 1);
    });

    setMissingIndices(missing);
    return missing.length === 0;
  };

  const goBack = () => {
    setShowMissingModal(false);

    if (stepIndex <= 0) {
      if (onBack) onBack();
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    if (step.kind === "reading-questions") {
      if (!validateAllAnswered()) {
        if (!isSkipPopupDisabled()) {
          setShowMissingModal(true);
          return;
        }
        handleSubmit();
        return;
      }
      handleSubmit();
      return;
    }

    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const headerTitle = useMemo(() => {
    return `Practice Test A - Reading Part 3: Reading for Information`;
  }, []);

  const rightStatus = useMemo(() => {
    if (step.kind === "reading-questions") {
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      const timeDisplay =
        mins > 0
          ? `${mins} minute${mins !== 1 ? "s" : ""}`
          : `${secs} second${secs !== 1 ? "s" : ""}`;
      return (
        <div className="text-xs font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Time remaining:{" "}
          <span className="text-yellow-300">{timeDisplay}</span>
        </div>
      );
    }
    return null;
  }, [step.kind, timeLeft]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm text-gray-700">
          Loading practice session…
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-xl w-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-lg font-semibold text-gray-900">
              Material not found
            </div>
          </div>
          <div className="text-sm text-gray-700 leading-6">
            Could not load a Reading mock for Part 3 (Reading for Information).
            Please check your database record.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6">
      <PracticeFrame
        headerTitle={headerTitle}
        rightStatus={rightStatus}
        onNext={goNext}
        onBack={goBack}
        nextLabel="NEXT"
        footerLeft={null}
      >
        {step.kind === "intro-bullets" ? (
          <div className="p-10">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2 text-lg font-semibold text-blue-800 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                Reading Test Instructions
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <ul className="text-sm text-gray-700 leading-7 list-disc pl-5 space-y-3">
                  <li>
                    On the official test, once you leave a page, you cannot go
                    back to it to change your answers. However, in this sample
                    test, you can.
                  </li>
                  <li>
                    Watch the timer in the top right corner to make sure that
                    you complete the Reading Test before the time is up.
                  </li>
                  <li>
                    This Reading Test is identical in format to the official
                    test except that the Reading section of the official test
                    may be slightly longer as it might contain additional
                    questions included for research and development purposes.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {step.kind === "intro-instructions" ? (
          <div className="p-10">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-2 text-lg font-semibold text-blue-800 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                Reading Part 3 Instructions
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="text-sm text-gray-700 leading-7 space-y-4">
                  <p>
                    <span className="font-semibold">1.</span> You will read a
                    passage with four paragraphs labeled A, B, C, and D.
                  </p>
                  <p>
                    <span className="font-semibold">2.</span> For each question,
                    decide which paragraph contains the information described.
                  </p>
                  <p>
                    <span className="font-semibold">3.</span> Select E if the
                    information is not given in any of the paragraphs.
                  </p>
                  <p>
                    <span className="font-semibold">4.</span> You will have
                    about 9 minutes to complete this section.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step.kind === "reading-questions" ? (
          <div className="flex h-full">
            {/* Left Panel - Reading Passage */}
            <div className="w-1/2 border-r border-gray-200 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="p-6">
                <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                  <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                  <span>Read the following passage.</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  {!passageRaw ? (
                    <div className="text-gray-500 text-sm">
                      Reading passage not found in database.
                    </div>
                  ) : (
                    <div className="space-y-5 text-sm leading-7 text-gray-800">
                      {parsedParagraphs.length > 0 ? (
                        parsedParagraphs.map((p, idx) => (
                          <div key={idx} className="leading-7">
                            <span className="font-bold mr-2">{p.label}</span>
                            <span className="whitespace-pre-line">{p.text}</span>
                          </div>
                        ))
                      ) : (
                        <div className="whitespace-pre-line">{passageRaw}</div>
                      )}

                      {/* E option explanation */}
                      <div className="pt-4 border-t border-gray-100">
                        <span className="font-bold">E.</span>{" "}
                        <span className="italic text-gray-600">
                          Not given in any of the above paragraphs.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Questions */}
            <div className="w-1/2 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="p-6">
                <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                  <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                  <span>
                    Identify which paragraph (A, B, C, or D) contains the
                    information in each statement. Select{" "}
                    <span className="text-blue-600 underline">E</span> if the
                    information is not provided in any paragraph.
                  </span>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  {questionTexts.length === 0 ? (
                    <div className="text-gray-500 text-sm">
                      Questions are not loaded from database.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questionTexts.map((q, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 text-sm text-gray-900"
                        >
                          <select
                            className="min-w-[70px] border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                            value={answers[i] || ""}
                            onChange={(e) => handleSelect(i, e.target.value)}
                            aria-label={`Question ${i + 1} answer`}
                          >
                            <option value="" disabled hidden>
                              —
                            </option>
                            {FIXED_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>

                          <div className="leading-6">
                            <span className="font-semibold mr-1">
                              - {i + 1}.
                            </span>
                            {q}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                className="h-9 px-4 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
              >
                Keep working
              </button>

              <button
                onClick={() => {
                  setShowMissingModal(false);
                  handleSubmit();
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
                Missing:{" "}
                <span className="font-semibold">
                  {missingIndices.join(", ")}
                </span>
              </div>
            ) : null}
          </div>
        </Modal>
      </PracticeFrame>
    </div>
  );
}
