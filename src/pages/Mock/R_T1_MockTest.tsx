// D:\projects\celpip-master\src\pages\Mock\R_T1_MockTest.tsx
// Reading Part 1 (Reading Correspondence - Dropdown Questions)
// This is an INDEPENDENT practice application NOT affiliated with, endorsed by, or connected to any official testing organization.
// All content, design, and functionality are original creations for educational practice purposes only.

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AlertCircle, Clock, Info, X } from "lucide-react";
import { getMaterials, getMaterialById } from "../../services/materialsService";
import { isSkipPopupDisabled } from "../../config/mockToggles";

import {
  buildQuestionDataArray,
} from "../../utils/mockTestAnswers";
import { saveReadingPartAnswersDB } from "../../services/mockTestAnswersService";

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
  paragraphText?: string; // Admin saves paragraph/response text here

  // Reading passage text (the main message/correspondence)
  passageText?: string;
  passageTitle?: string;

  // Response passage (the reply message for Part 1)
  responseText?: string;
  responseTitle?: string;

  // For images if needed
  contextImage?: SerializedFile;

  // Part 1 questions for the main message:
  // Format: [stem, optA, optB, optC, optD, correctLetter]
  questionAnswers?: string[][];

  // Correct answers array (can be number indices or letter strings)
  correctAnswers?: (number | string)[];

  // Part 1 questions for the response message / paragraph blanks:
  // Format: [stem, optA, optB, optC, optD, correctLetter]
  responseQuestionAnswers?: string[][];
  paragraphBlanks?: string[][];

  // Question texts for display
  questionTexts?: string[];

  // Admin saves reading passage upload here
  sectionTranscripts?: (SerializedFile | string)[];
  readingPassage?: { data: string; name: string };
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
  | { kind: "reading-questions" };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function normalizeMockSet(v: any): string {
  const s = String(v ?? "").trim();
  const m = s.match(/\d+/);
  return m ? m[0] : s.toLowerCase();
}

function decodeTextDataUrl(dataUrl: string): string | null {
  if (!dataUrl.startsWith("data:")) return null;

  const isText =
    dataUrl.startsWith("data:text/") ||
    dataUrl.startsWith("data:application/octet-stream");

  if (!isText) return null;

  const base64Marker = ";base64,";
  const idx = dataUrl.indexOf(base64Marker);
  if (idx === -1) return null;

  const base64 = dataUrl.slice(idx + base64Marker.length);
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
}

// ✅ Helper to decode base64 content from DB (matches ReadingCorrespondenceTest)
function decodeBase64Content(data: string): string {
  try {
    if (data.includes(",")) {
      return atob(data.split(",")[1]);
    }
    return atob(data);
  } catch {
    return data;
  }
}

function isNonEmptyString(x: any): x is string {
  return typeof x === "string" && x.trim().length > 0;
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


function isPart1ReadingMock(m: Partial<MaterialDoc>) {
  const task = String((m as any)?.taskId ?? (m as any)?.task ?? "").toLowerCase();
  const title = String(m.title ?? "").toLowerCase();

  return (
    task.includes("r_t1") ||
    task.includes("reading_t1") ||
    task.includes("part 1") ||
    task.includes("part1") ||
    task.includes("correspondence") ||
    title.includes("r_t1") ||
    title.includes("reading_t1") ||
    title.includes("correspondence")
  );
}


export default function R_T1_MockTest({
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
    const fullMaterialFromState = location?.state?.material || null;
  const materialIdFromState =
    location?.state?.materialId || location?.state?.id || null;
  const materialIdFromStorage =
    typeof window !== "undefined"
      ? localStorage.getItem("activeMockMaterialId")
      : null;

  const [material, setMaterial] = useState<MaterialDoc | null>(
    passedMaterial || fullMaterialFromState || null
  );
  const [loading, setLoading] = useState(
    !(passedMaterial || fullMaterialFromState)
  );

  const steps: Step[] = useMemo(
    () => [
      { kind: "intro-bullets" },
      { kind: "intro-instructions" },
      { kind: "reading-questions" },
    ],
    []
  );

  const [stepIndex, setStepIndex] = useState(0);

  // Reading Part 1: 10 minutes to read and answer questions
  const QUESTION_TIME_SECONDS = 10 * 60;
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);

  // ✅ Updated: Using array of (number | null) like ReadingCorrespondenceTest
  // for 11 questions total (Q1-Q6 main, Q7-Q11 paragraph blanks)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    Array(11).fill(null)
  );

  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingIndices, setMissingIndices] = useState<number[]>([]);

useEffect(() => {
  const source = passedMaterial || fullMaterialFromState;
  if (source) {
    const hasFiles =
      source.uploadedFiles &&
      typeof source.uploadedFiles === 'object' &&
      Object.keys(source.uploadedFiles).length > 0;

    if (hasFiles) {
      // Already fully loaded — use directly, no DB call
      setMaterial(source as MaterialDoc);
      setLoading(false);
      return;
    }
  // Has id but empty uploadedFiles — fetch it directly by ID (fast, single DB call)
    if (source?.id || source?.$id) {
      const directFetch = async () => {
        setLoading(true);
        try {
          const docId = source.id ?? source.$id;
          const full = await getMaterialById(docId);
          if (full) {
            let files = (full as any).uploadedFiles;
            if (typeof files === "string") {
              try { files = JSON.parse(files); } catch { files = {}; }
            }
            setMaterial({ ...source, ...full, uploadedFiles: files || {} } as MaterialDoc);
          } else {
            setMaterial(source as MaterialDoc);
          }
        } catch (e) {
          console.error(e);
          setMaterial(source as MaterialDoc);
        } finally {
          setLoading(false);
        }
      };
      directFetch();
      return;
    }
  }

  // No passedMaterial at all — search DB by mockSet
  const run = async () => {
    try {
      setLoading(true);
      const mockSet = localStorage.getItem("activeMockSet");
      if (!mockSet) { setMaterial(null); return; }

      // ✅ Use getMaterials (already in memory from userHome) to find the right ID
      // then getMaterialById for the full document — avoids double-fetch
      const all = (await getMaterials()) as any[];
      const targetSet = normalizeMockSet(mockSet);

      const picked = all.find((m: any) =>
        m.isMock === true &&
        String(m.skill || "").toLowerCase() === "reading" &&
        normalizeMockSet(m.mockSet) === targetSet &&
        isPart1ReadingMock(m)
      ) ?? all.find((m: any) =>
        m.isMock === true &&
        String(m.skill || "").toLowerCase() === "reading" &&
        isPart1ReadingMock(m)
      ) ?? null;

      if (picked?.id || picked?.$id) {
        const docId = picked.id ?? picked.$id;
        const full = await getMaterialById(docId);
        if (full) {
          let files = (full as any).uploadedFiles;
          if (typeof files === "string") {
            try { files = JSON.parse(files); } catch { files = {}; }
          }
          setMaterial({ ...picked, ...full, uploadedFiles: files || {} } as MaterialDoc);
        } else {
          setMaterial(null);
        }
      } else {
        setMaterial(null);
      }
    } catch (e) {
      console.error(e);
      setMaterial(null);
    } finally {
      setLoading(false);
    }
  };

  run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passedMaterial, fullMaterialFromState]);

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

  // ✅ Get reading passage from sectionTranscripts[0] (how admin stores it)
  // Matches ReadingCorrespondenceTest logic
const getPassageContent = (): string => {
    const transcripts = uploaded?.sectionTranscripts;
    if (transcripts && transcripts[0]) {
      const transcript = transcripts[0];
      if (typeof transcript === "object") {
        // ✅ Decoded plain text (already decoded by fetchFull in userHome)
        if (transcript?.data && !transcript.data.startsWith("data:")) {
          return transcript.data; // Already decoded plain text
        }
        // ✅ Still-encoded base64 data URL
        if (transcript?.data) {
          return decodeBase64Content(transcript.data);
        }
        // ✅ File is in Appwrite Storage — return URL so it can be fetched
        if ((transcript as any)?.storageUrl) {
          return (transcript as any).storageUrl; // Will show as URL; fetching async is needed
        }
      }
      if (typeof transcript === "string") {
        return decodeBase64Content(transcript);
      }
    }

    // Fallback to readingPassage
    if (uploaded?.readingPassage?.data) {
      return decodeBase64Content(uploaded.readingPassage.data);
    }

    // Fallback to passageText or paragraphText
    if (uploaded?.passageText) {
      return uploaded.passageText;
    }

    if (uploaded?.paragraphText) {
      return uploaded.paragraphText;
    }

    return material?.description || "No reading passage available.";
  };

  // ✅ Get dropdown questions (Q1-Q6) from DB questionAnswers format
  // Matches ReadingCorrespondenceTest logic
  const getDropdownQuestions = () => {
    const questionTexts = uploaded?.questionTexts || [];
    const questionAnswers = uploaded?.questionAnswers || [];

    const questions = [];
    for (let i = 0; i < 6; i++) {
      const row = questionAnswers[i] || [];

      // DB format: [questionText, A, B, C, D, correct]
      const text = questionTexts[i] || row[0] || `Question ${i + 1}`;

      const options =
        row.length >= 5
          ? row.slice(1, 5).filter(Boolean)
          : row.length
          ? row
          : ["Option A", "Option B", "Option C", "Option D"];

      questions.push({ text, options });
    }

    return questions;
  };

  // ✅ Get paragraph blanks (Q7-Q11) from DB
  // Matches ReadingCorrespondenceTest logic
  const getParagraphBlanks = (): string[][] => {
    const blanks = uploaded?.paragraphBlanks || [];
    const questionAnswers = uploaded?.questionAnswers || [];

    // If paragraphBlanks exists already, use it
    if (blanks.length >= 5) return blanks;

    // Otherwise, extract from questionAnswers[6..10]
    const fallbackBlanks: string[][] = [];
    for (let i = 6; i < 11; i++) {
      const raw = questionAnswers?.[i] || [];

      const hasAdminFormat = Array.isArray(raw) && raw.length >= 5;

      const options = hasAdminFormat
        ? raw.slice(1, 5).filter(Boolean) // Only A-D
        : raw.length
        ? raw
        : ["Option A", "Option B", "Option C", "Option D"];

      fallbackBlanks.push(options);
    }

    return fallbackBlanks;
  };

  // ✅ Get paragraph text for fill-in-the-blanks section
  const getParagraphText = (): string | null => {
    return uploaded?.paragraphText || null;
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[questionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmit = async () => {
     const qa = (uploaded as any)?.questionAnswers;
     const correctAnswers =
       Array.isArray(qa) && Array.isArray(qa[0])
         ? qa.map((row: any[]) => row?.[row.length - 1])
         : (uploaded as any)?.correctAnswers || (uploaded as any)?.answerKey || [];


    let correct = 0;

    selectedAnswers.forEach((answer, index) => {
      const correctRaw = correctAnswers[index];

      const correctIndex =
        typeof correctRaw === "number"
          ? correctRaw
          : ["a", "b", "c", "d"].indexOf(
              String(correctRaw || "")
                .trim()
                .toLowerCase()
            );

      if (answer !== null && answer === correctIndex) {
        correct++;
      }
    });

    // Save answers to localStorage
    const mockSet = localStorage.getItem("activeMockSet") || "1";
    const allAnswers: Record<number, string> = {};
    selectedAnswers.forEach((ans, idx) => {
      if (ans !== null) {
        allAnswers[idx] = String(ans);
      }
    });

    const correctAnswersMap: Record<number, string> = {};
    correctAnswers.forEach((ans, idx) => {
      correctAnswersMap[idx] = String(ans);
    });
	
const qa2 = (uploaded as any)?.questionAnswers;
     const questionTexts =
       Array.isArray(qa2) && Array.isArray(qa2[0])
         ? qa2.map((row: any[], idx: number) => String(row?.[0] ?? "").trim() || `Question ${idx + 1}`)
         : (uploaded as any)?.questionTexts || [];

    await saveReadingPartAnswersDB(
      1,
      allAnswers,
      correctAnswersMap,
      questionTexts,
      parseInt(mockSet, 10)
    );

    if (onComplete) onComplete();
  };

  const validateAllAnswered = () => {
    const missing: number[] = [];

    selectedAnswers.forEach((ans, idx) => {
      if (ans === null) missing.push(idx + 1);
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
    return `Practice Test A - Reading Part 1: Reading Correspondence`;
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

  const dropdownQuestions = getDropdownQuestions();
  const paragraphBlanks = getParagraphBlanks();
  const paragraphText = getParagraphText();

  // ✅ Render paragraphText from DB with {6} {7} {8} {9} {10} placeholders
  // Matches ReadingCorrespondenceTest logic
  const renderParagraphFromDB = () => {
    if (!paragraphText) return null;

    const lines = paragraphText.split("\n");

    return (
      <div className="space-y-3">
        {lines.map((line, lineIdx) => {
          const parts = line.split(/(\{\d+\})/g);

          return (
            <p key={lineIdx} className="leading-7">
              {parts.map((part, idx) => {
  const match = part.match(/^\{(\d+)\}$/);

  // Normal text
  if (!match) return <span key={idx}>{part}</span>;

  const tokenNum = parseInt(match[1], 10);

  /**
   * Support BOTH placeholder styles:
   *  A) {6}..{10}  -> zero-based questionIndex = 6..10 (Q7..Q11)
   *  B) {7}..{11}  -> one-based questionNumber = 7..11 => questionIndex = 6..10
   */
  let questionIndex: number | null = null; // index in selectedAnswers (0..10)
  let blankIndex: number | null = null;    // index in paragraphBlanks (0..4)
  let questionNumberForLabel: number | null = null; // human Q number (1..11)

  if (tokenNum >= 6 && tokenNum <= 10) {
    // Style A
    questionIndex = tokenNum;        // 6..10
    blankIndex = tokenNum - 6;       // 0..4
    questionNumberForLabel = tokenNum + 1; // 7..11
  } else if (tokenNum >= 7 && tokenNum <= 11) {
    // Style B
    questionIndex = tokenNum - 1;    // 6..10
    blankIndex = tokenNum - 7;       // 0..4
    questionNumberForLabel = tokenNum; // 7..11
  }

  // If token not in supported range, show it as text (safe fallback)
  if (questionIndex === null || blankIndex === null || questionNumberForLabel === null) {
    return <span key={idx}>{part}</span>;
  }

  return (
    <select
      key={idx}
      value={selectedAnswers[questionIndex] ?? ""}
      onChange={(e) => handleAnswerSelect(questionIndex!, parseInt(e.target.value, 10))}
      aria-label={`Question ${questionNumberForLabel} answer`}
      className="inline-block min-w-[180px] max-w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white align-middle mx-1"
    >
      <option value="" disabled hidden />
      {(paragraphBlanks[blankIndex] || []).map((opt, i) => (
        <option key={i} value={i}>
          {opt}
        </option>
      ))}
    </select>
  );
})}

            </p>
          );
        })}
      </div>
    );
  };



  if (!material && !loading) {
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
            Could not load a Reading mock for Part 1 (Reading Correspondence).
            Please check your database record.
          </div>
        </div>
      </div>
    );
  }

  const passageText = getPassageContent();

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
        {loading || !material ? (
          <div className="p-10">
            <div className="mx-auto max-w-3xl">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-700 shadow-sm">
                Loading Reading Part 1...
              </div>
            </div>
          </div>
        ) : step.kind === "intro-bullets" ? (
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
                Reading Test Instructions
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="text-sm text-gray-700 leading-7 space-y-4">
                  <p>
                    <span className="font-semibold">1.</span> The Reading Test
                    is about 55 minutes.
                  </p>
                  <p>
                    <span className="font-semibold">2.</span> There are 4 parts
                    in the Reading Test.
                  </p>
                  <p>
                    <span className="font-semibold">3.</span> You will have
                    about 10 minutes to read each passage and answer the
                    questions.
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
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-4">
                  <Info className="w-4 h-4 text-blue-600" />
                  Read the following message.
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div
                    className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap"
                    style={{ lineHeight: "1.8" }}
                  >
                    {passageText}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Questions */}
            <div className="w-1/2 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="p-6">
                {/* Section 1: Main Message Questions (Q1-Q6) */}
                <div className="mb-8">
                  <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                    <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                    <span>
                      Select the most appropriate answer from each dropdown (
                      <span className="text-blue-600">▼</span>) based on the{" "}
                      <span className="text-blue-600 underline">content</span>{" "}
                      of the message above.
                    </span>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="space-y-4">
                      {dropdownQuestions.map((question, qIndex) => (
                        <div
                          key={qIndex}
                          className="text-sm text-gray-900 leading-7"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
                            <span className="font-semibold text-gray-700 shrink-0">
                              {qIndex + 1}.
                            </span>
                            <span className="min-w-0">{question.text}</span>

                            <select
                              aria-label={`Question ${qIndex + 1} answer`}
                              className="inline-block min-w-[180px] max-w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white align-middle"
                              value={selectedAnswers[qIndex] ?? ""}
                              onChange={(e) =>
                                handleAnswerSelect(
                                  qIndex,
                                  parseInt(e.target.value)
                                )
                              }
                            >
                              <option value="" disabled hidden />
                              {question.options.map((opt, oIdx) => (
                                <option key={oIdx} value={oIdx}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Section 2: Response Message / Paragraph Blanks (Q7-Q11) */}
                {paragraphText && (
                  <div>
                    <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                      <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                      <span>
                        Below is a reply to the message. Fill in each blank by
                        selecting the{" "}
                        <span className="text-blue-600 underline">
                          most suitable
                        </span>{" "}
                        option from the dropdown (
                        <span className="text-blue-600">▼</span>).
                      </span>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div
                        className="text-sm text-gray-800"
                        style={{ lineHeight: "2" }}
                      >
                        {renderParagraphFromDB()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback: If no paragraphText, show Q7-Q11 as regular questions */}
                {!paragraphText && paragraphBlanks.length > 0 && (
                  <div>
                    <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                      <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                      <span>
                        Fill in the blanks by selecting the{" "}
                        <span className="text-blue-600 underline">
                          most suitable
                        </span>{" "}
                        option from each dropdown (
                        <span className="text-blue-600">▼</span>).
                      </span>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="space-y-4">
                        {paragraphBlanks.map((options, idx) => {
                          const questionNum = 6 + idx + 1; // Q7-Q11
                          return (
                            <div
                              key={idx}
                              className="text-sm text-gray-900 leading-7"
                            >
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
                                <span className="font-semibold text-gray-700 shrink-0">
                                  {questionNum}.
                                </span>
                                <span className="min-w-0">Question {questionNum}</span>

                                <select
                                  aria-label={`Question ${questionNum} answer`}
                                  className="inline-block min-w-[180px] max-w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white align-middle"
                                  value={selectedAnswers[6 + idx] ?? ""}
                                  onChange={(e) =>
                                    handleAnswerSelect(
                                      6 + idx,
                                      parseInt(e.target.value)
                                    )
                                  }
                                >
                                  <option value="" disabled hidden />
                                  {options.map((opt, oIdx) => (
                                    <option key={oIdx} value={oIdx}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {dropdownQuestions.length === 0 && paragraphBlanks.length === 0 && (
                  <div className="bg-white border border-gray-300 rounded p-4 text-sm text-gray-600">
                    No questions found. Please check uploadedFiles.questionAnswers
                    in your DB for this material.
                  </div>
                )}
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
