// D:\projects\celpip-master\src\pages\Mock\R_T2_MockTest.tsx
// Reading Part 2 (Reading to Apply a Diagram - Dropdown Questions)
// This is an INDEPENDENT practice application NOT affiliated with, endorsed by, or connected to any official testing organization.
// All content, design, and functionality are original creations for educational practice purposes only.

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AlertCircle, Clock, Info, X } from "lucide-react";
import { getMaterials, getMaterialById } from "../../services/materialsService";
import { isSkipPopupDisabled } from "../../config/mockToggles";
import { saveReadingPartAnswersDB } from "../../services/mockTestAnswersService";

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

  // Diagram image (various formats admin might save)
  contextImage?: SerializedFile | string;
  contextImageUrl?: string;
  diagramImageUrl?: string;
  diagramImage?: string;
  diagramUrl?: string;

  // Paragraph text with blanks like {1} {2} {3} {4} {5}
  paragraphText?: string;
  paragraphTemplate?: string;

  // Blank options for paragraph blanks
  paragraphBlanks?: string[][];

  // Questions and answers array
  // Format: rows 0-4 for blanks, rows 5-7 for MCQ questions
  questionAnswers?: any[][];

  // Question texts for MCQ section
  questionTexts?: string[];

  // Correct answers mapping
  correctAnswers?: Record<number, number | string>;
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
  contextImage?: string | SerializedFile;
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


function isPart2ReadingMock(m: Partial<MaterialDoc>) {
  const task = String((m as any)?.taskId ?? (m as any)?.task ?? "").toLowerCase();
  const title = String(m.title ?? "").toLowerCase();

  return (
    task.includes("r_t2") ||
    task.includes("reading_t2") ||
    task.includes("part 2") ||
    task.includes("part2") ||
    task.includes("diagram") ||
    title.includes("r_t2") ||
    title.includes("reading_t2") ||
    title.includes("part 2") ||
    title.includes("part2") ||
    title.includes("diagram") ||
    title.includes("apply a diagram")
  );
}


export default function R_T2_MockTest({
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

  // Reading Part 2: 10 minutes
  const QUESTION_TIME_SECONDS = 10 * 60;
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);

  // Answers map: questionNumber -> selectedOptionIndex
  // Part 2 has 5 blanks (Q1-Q5) + 3 MCQ questions (Q6-Q8) = 8 total
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(
    {}
  );

  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingIndices, setMissingIndices] = useState<number[]>([]);

  // Number of blanks in the paragraph
  const blankCount = 5;

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
          contextImage: doc.contextImage ?? null,
        }));

        const wantedId =
          materialIdFromParam || materialIdFromState || materialIdFromStorage;

        let picked: MaterialDoc | null =
          (wantedId
            ? formatted.find((m) => String(m.id) === String(wantedId))
            : null) ?? null;

        if (picked && !isPart2ReadingMock(picked)) {
          picked = null;
        }

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
                isPart2ReadingMock(m)
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
                isPart2ReadingMock(m)
            ) ?? null;
        }

        // ✅ Fetch full doc with uploadedFiles before setting material
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

  // ✅ Get diagram image URL (supports ALL admin save formats)
  const getDiagramUrl = (): string | null => {
    // Check material-level contextImage first (set by userHome.tsx)
    if (typeof material?.contextImage === "string" && material?.contextImage) {
      return material.contextImage;
    }
    if (
      typeof material?.contextImage === "object" &&
      material?.contextImage?.data
    ) {
      return material.contextImage.data;
    }
    if (
      typeof material?.contextImage === "object" &&
      material?.contextImage?.storageUrl
    ) {
      return material.contextImage.storageUrl;
    }

    // Check uploadedFiles.contextImage
    if (
      typeof uploaded?.contextImage === "object" &&
      uploaded?.contextImage?.data
    ) {
      return uploaded.contextImage.data;
    }
    if (
      typeof uploaded?.contextImage === "object" &&
      uploaded?.contextImage?.storageUrl
    ) {
      return uploaded.contextImage.storageUrl;
    }
    if (typeof uploaded?.contextImage === "string" && uploaded?.contextImage) {
      return uploaded.contextImage;
    }

    // Other common admin save keys
    return (
      uploaded?.contextImageUrl ||
      uploaded?.diagramImageUrl ||
      uploaded?.diagramImage ||
      uploaded?.diagramUrl ||
      null
    );
  };

  // ✅ Get paragraph text with blanks
  const getParagraphText = (): string => {
    return (
      uploaded?.paragraphText ||
      uploaded?.paragraphTemplate ||
      material?.description ||
      ""
    );
  };

  // ✅ Get blank options for paragraph blanks (Q1-Q5)
  const getBlankOptions = (): string[][] => {
    // First check if paragraphBlanks exists
    if (uploaded?.paragraphBlanks && uploaded.paragraphBlanks.length > 0) {
      return uploaded.paragraphBlanks;
    }

    // Fallback: use questionAnswers rows 0-4 for blanks
    const blankOptionsSource = uploaded?.questionAnswers || [];

    return Array.from({ length: blankCount }, (_, i) => {
      const row = blankOptionsSource?.[i] || [];

      const cleaned = Array.isArray(row)
        ? row
            .filter((x: any) => typeof x === "string" && x.trim().length)
            .filter((x: string) => !/^[A-Da-d]$/i.test(x.trim())) // Remove single letter A/B/C/D
        : [];

      return cleaned.length >= 4 ? cleaned.slice(0, 4) : cleaned;
    });
  };

  // ✅ Parse MCQ questions (Q6-Q8) from DB
  const getMCQQuestions = useMemo(() => {
    const questionTexts: string[] = uploaded?.questionTexts || [];
    const rows: any[] = uploaded?.questionAnswers || [];

    if (!rows || !Array.isArray(rows) || rows.length === 0) return [];

    let mcqRows = rows;

    // If questionAnswers contains extra rows, drop the first blankCount rows
    if (mcqRows.length >= blankCount + 3) {
      mcqRows = mcqRows.slice(blankCount);
    }

    // Part 2 MCQ = 3 questions
    if (mcqRows.length > 3) mcqRows = mcqRows.slice(-3);

    let mcqTexts = questionTexts;
    if (mcqTexts.length > 3) mcqTexts = mcqTexts.slice(-3);

    // If questionTexts exist, treat each row as ONLY options
    if (mcqTexts.length) {
      return mcqRows
        .map((row: any, idx: number) => {
          const options = Array.isArray(row)
            ? row
                .filter((x: any) => typeof x === "string" && x.trim().length)
                .filter((x: string) => !/^[A-Da-d]$/.test(x.trim()))
                .filter((x: string) => x.trim().length > 1)
            : [];

          return {
            text: mcqTexts[idx] || `Question ${blankCount + 1 + idx}`,
            options,
          };
        })
        .filter((q: any) => q.options?.length);
    }

    // Legacy fallback: row[0] = question text, row[1..] = options
    const out: { text: string; options: string[] }[] = [];
    for (let i = 0; i < mcqRows.length; i++) {
      const row = mcqRows[i];
      if (!row) continue;

      const text =
        typeof row[0] === "string" ? row[0] : `Question ${blankCount + 1 + i}`;
      const options = Array.isArray(row)
        ? row
            .slice(1)
            .filter((x: any) => typeof x === "string" && x.trim().length)
            .filter((x: string) => !/^[A-Da-d]$/.test(x.trim()))
            .filter((x: string) => x.trim().length > 1)
        : [];

      if (options.length) out.push({ text, options });
    }
    return out;
  }, [uploaded, blankCount]);

  const handleAnswerSelect = (questionNumber: number, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionNumber]: optionIndex }));
  };

const handleSubmit = async () => {
  // Get the active mock set
  const mockSet = localStorage.getItem("activeMockSet") || "1";
  
  // ✅ Admin stores answer key in uploaded.questionAnswers
     const qa = (uploaded as any)?.questionAnswers;
     const rawCorrect = (uploaded as any)?.correctAnswers ?? (uploaded as any)?.answerKey ?? [];
 
     const letterToIndex = (x: any) => {
       const s = String(x ?? "").trim().toUpperCase();
       if (s === "A") return 0;
       if (s === "B") return 1;
       if (s === "C") return 2;
       if (s === "D") return 3;
       return x; // fallback
     };
 
     const correctAnswersMap: Record<number, any> = {};
 
     // ✅ If Admin saved questionAnswers rows, last column is the correct choice (A/B/C/D)
     if (Array.isArray(qa) && Array.isArray(qa[0])) {
       qa.forEach((row: any[], idx: number) => {
         const c = row?.[row.length - 1];
         correctAnswersMap[idx] = letterToIndex(c);
       });
     } else if (Array.isArray(rawCorrect)) {
       rawCorrect.forEach((ans: any, idx: number) => {
         correctAnswersMap[idx] = letterToIndex(ans);
       });
     }
 
     // ✅ Better question labels for results page
     const questionTexts = [
       ...Array.from({ length: blankCount }, (_, i) => `Blank ${i + 1}`),
       ...getMCQQuestions.map((q, i) => String(q.question ?? "").trim() || `Question ${blankCount + i + 1}`),
     ];


  await saveReadingPartAnswersDB(
    2,
    selectedAnswers as any,          // userAnswers
    correctAnswersMap as any,        // correctAnswers
    questionTexts,                   // questions (for results table)
    parseInt(mockSet, 10)
  );

  if (onComplete) onComplete();
};


  const validateAllAnswered = () => {
    const missing: number[] = [];
    const totalQuestions = blankCount + getMCQQuestions.length;

    // Check blanks (Q1-Q5)
    for (let i = 1; i <= blankCount; i++) {
      if (selectedAnswers[i] === undefined) missing.push(i);
    }

    // Check MCQ questions (Q6-Q8)
    for (let i = 0; i < getMCQQuestions.length; i++) {
      const qNum = blankCount + 1 + i;
      if (selectedAnswers[qNum] === undefined) missing.push(qNum);
    }

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
    return `Practice Test A - Reading Part 2: Reading to Apply a Diagram`;
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

  const diagramUrl = getDiagramUrl();
  const paragraphText = getParagraphText();
  const blankOptions = getBlankOptions();

  // ✅ Render paragraph with blanks from DB
  const renderParagraphFromDB = () => {
    if (!paragraphText?.trim()) return null;

    // Match {1}, {2}, {3}, etc.
    const parts = paragraphText.split(/(\{\d+\})/g);

    return (
      <p className="whitespace-pre-wrap leading-7">
        {parts.map((part, idx) => {
          const match = part.match(/^\{(\d+)\}$/);
          if (!match) return <span key={idx}>{part}</span>;

          const qNum = parseInt(match[1], 10);
          if (Number.isNaN(qNum)) return <span key={idx}>{part}</span>;

          // blank index (supports {1}..{N})
          const blankIndex = qNum - 1;

          return (
            <select
              key={idx}
              value={selectedAnswers[qNum] ?? ""}
              onChange={(e) =>
                handleAnswerSelect(qNum, parseInt(e.target.value))
              }
              aria-label={`Blank ${qNum} answer`}
              className="inline-block min-w-[160px] max-w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white align-middle mx-1"
            >
              <option value="" disabled hidden />
              {(blankOptions[blankIndex] || []).map((opt, i) => (
                <option key={i} value={i}>
                  {opt}
                </option>
              ))}
            </select>
          );
        })}
      </p>
    );
  };

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
            Could not load a Reading mock for Part 2 (Reading to Apply a
            Diagram). Please check your database record.
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
                Reading Part 2 Instructions
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="text-sm text-gray-700 leading-7 space-y-4">
                  <p>
                    <span className="font-semibold">1.</span> You will see a
                    diagram or chart on the left side of the screen.
                  </p>
                  <p>
                    <span className="font-semibold">2.</span> On the right side,
                    there is an email message with blanks to fill in.
                  </p>
                  <p>
                    <span className="font-semibold">3.</span> Use the
                    information from the diagram to complete the email and
                    answer the questions.
                  </p>
                  <p>
                    <span className="font-semibold">4.</span> You will have
                    about 10 minutes to complete this section.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step.kind === "reading-questions" ? (
          <div className="flex h-full">
            {/* Left Panel - Diagram Image */}
            <div className="w-1/2 border-r border-gray-200 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-4">
                  <Info className="w-4 h-4 text-blue-600" />
                  Study the diagram below to answer the questions.
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  {diagramUrl ? (
                    <img
                      src={diagramUrl}
                      alt="Diagram"
                      className="w-full h-auto rounded border border-gray-100"
                    />
                  ) : (
                    <div className="rounded border border-dashed border-gray-300 p-6 text-sm text-gray-500 text-center">
                      Diagram image not found in database.
                      <br />
                      <span className="text-xs">
                        Check uploadedFiles.contextImage or diagramImage
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Email with Blanks + MCQ Questions */}
            <div className="w-1/2 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="p-6 space-y-6">
                {/* Section 1: Email with Blanks (Q1-Q5) */}
                <div>
                  <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                    <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                    <span>
                      Read the email message about the diagram. Fill in each
                      blank by selecting the{" "}
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
                      {renderParagraphFromDB() ?? (
                        <p className="text-gray-500">
                          Paragraph text not found in database.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: MCQ Questions (Q6-Q8) */}
                {getMCQQuestions.length > 0 && (
                  <div>
                    <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                      <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                      <span>
                        Select the{" "}
                        <span className="text-blue-600 underline">
                          most appropriate
                        </span>{" "}
                        answer from each dropdown (
                        <span className="text-blue-600">▼</span>).
                      </span>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="space-y-4">
                        {getMCQQuestions.map((q, idx) => {
                          const qNumber = blankCount + 1 + idx; // Q6, Q7, Q8

                          return (
                            <div
                              key={idx}
                              className="text-sm text-gray-900 leading-7"
                            >
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
                                <span className="font-semibold text-gray-700 shrink-0">
                                  {qNumber}.
                                </span>
                                <span className="min-w-0">{q.text}</span>

                                <select
                                  aria-label={`Question ${qNumber} answer`}
                                  className="inline-block min-w-[180px] max-w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white align-middle"
                                  value={selectedAnswers[qNumber] ?? ""}
                                  onChange={(e) =>
                                    handleAnswerSelect(
                                      qNumber,
                                      parseInt(e.target.value)
                                    )
                                  }
                                >
                                  <option value="" disabled hidden />
                                  {q.options.map((opt, oIdx) => (
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

                {!paragraphText && getMCQQuestions.length === 0 && (
                  <div className="bg-white border border-gray-300 rounded p-4 text-sm text-gray-600">
                    No questions found. Please check uploadedFiles.questionAnswers
                    and paragraphText in your DB for this material.
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
