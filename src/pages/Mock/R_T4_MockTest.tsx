// D:\projects\celpip-master\src\pages\Mock\R_T4_MockTest.tsx
// Reading Part 4 (Reading for Viewpoints - Article + Comment with Blanks)
// This is an INDEPENDENT practice application NOT affiliated with, endorsed by, or connected to any official testing organization.
// All content, design, and functionality are original creations for educational practice purposes only.

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AlertCircle, Clock, Info, X } from "lucide-react";
import { getMaterials, getMaterialById } from "../../services/materialsService";
import { isSkipPopupDisabled } from "../../config/mockToggles";
import { saveReadingPartAnswersDB } from "../../services/mockTestAnswersService";

// Constants for Part 4
const TOP_QUESTIONS_COUNT = 5; // Q1 - Q5 (dropdown questions)
const BLANKS_COUNT = 5; // Q6 - Q10 (paragraph blanks)

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

  // Admin saves Part 4 reading passage here (base64 text file)
  sectionTranscripts?: Array<{ data?: string; name?: string } | string>;

  // Sometimes saved here too
  readingPassage?: { data?: string; name?: string } | string;
  articleText?: string;

  // Question texts for Q1-Q5
  questionTexts?: string[];

  // Question answers array - rows for Q1-Q10
  // Format: [question, opt1, opt2, opt3, opt4, correct]
  questionAnswers?: any[][];

  // Paragraph text with blanks {6} {7} {8} {9} {10}
  paragraphText?: string;
  commentText?: string;

  // Options for paragraph blanks Q6-Q10
  paragraphBlanks?: string[][];

  // Correct answers
  correctAnswers?: (string | number)[];
  answers?: (string | number)[];
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
  articleText?: string;
  questionTexts?: string[];
  questionAnswers?: any[][];
  paragraphText?: string;
  commentText?: string;
  paragraphBlanks?: string[][];
  correctAnswers?: (string | number)[];
  answers?: (string | number)[];
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

// Check if string is likely base64
function isLikelyBase64(s: string) {
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith("data:")) return true;
  return /^[A-Za-z0-9+/=\s]+$/.test(t) && t.length > 200;
}

// Decode base64 content
function decodeBase64Maybe(input: string): string {
  const t = (input || "").trim();
  if (!t) return "";

  // data:text/plain;base64,....
  if (t.startsWith("data:")) {
    const comma = t.indexOf(",");
    if (comma !== -1) {
      const b64 = t.slice(comma + 1);
      try {
        return atob(b64);
      } catch {
        return input;
      }
    }
    return input;
  }

  // raw base64
  if (isLikelyBase64(t)) {
    try {
      return atob(t.replace(/\s/g, ""));
    } catch {
      return input;
    }
  }

  return input;
}

// Extract text from various DB formats
function extractTextFlexible(...candidates: any[]): string {
  for (const c of candidates) {
    if (!c) continue;

    // string
    if (typeof c === "string" && c.trim()) return decodeBase64Maybe(c);

    // object forms
    if (typeof c === "object") {
      const maybe =
        c.text ??
        c.content ??
        c.data ??
        c.value ??
        c.body ??
        c.readingPassage ??
        c.articleText;
      if (typeof maybe === "string" && maybe.trim())
        return decodeBase64Maybe(maybe);

      // array of lines
      if (Array.isArray(c) && c.length) {
        const joined = c.map(String).join("\n");
        if (joined.trim()) return joined;
      }
    }

    // array of strings
    if (Array.isArray(c) && c.length) {
      const joined = c.map(String).join("\n");
      if (joined.trim()) return joined;
    }
  }
  return "";
}

// Normalize inline whitespace
function normalizeInline(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

// Extract dropdown options from a row
function extractOptionsFromRow(row: any[]): string[] {
  if (!Array.isArray(row)) return [];

  // common admin format: [question, A, B, C, D, correct]
  const raw = row
    .slice(1)
    .filter((x) => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);

  // If the last value looks like a letter key (A-E), it's probably NOT an option
  const last = raw[raw.length - 1];
  const maybeKey = typeof last === "string" && /^[A-E]$/i.test(last);
  const cleaned = maybeKey ? raw.slice(0, -1) : raw;

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const opt of cleaned) {
    if (!seen.has(opt)) {
      seen.add(opt);
      out.push(opt);
    }
  }
  return out;
}

// Convert correct answer to option index
function correctToIndex(correct: any, options: string[]): number | null {
  if (!options.length) return null;

  if (typeof correct === "number" && Number.isFinite(correct)) {
    const idx = Math.trunc(correct);
    if (idx >= 0 && idx < options.length) return idx;
  }

  if (typeof correct === "string") {
    const c = correct.trim();

    // If correct is a letter A-E, map to 0..4
    if (/^[A-E]$/i.test(c)) {
      const idx = c.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
      if (idx >= 0 && idx < options.length) return idx;
    }

    // Otherwise match the option text
    const idx = options.findIndex((o) => o.trim() === c);
    if (idx !== -1) return idx;
  }

  return null;
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


function isPart4ReadingMock(m: Partial<MaterialDoc>) {
  const task = String(m.taskId ?? "").toLowerCase();
  const title = String(m.title ?? "").toLowerCase();

  return (
    task.includes("r_t4") ||
    task.includes("reading_t4") ||
    task.includes("part 4") ||
    task.includes("part4") ||
    task.includes("viewpoint") ||
    title.includes("r_t4") ||
    title.includes("reading_t4") ||
    title.includes("part 4") ||
    title.includes("part4") ||
    title.includes("viewpoint") ||
    title.includes("reading for viewpoints")
  );
}

export default function R_T4_MockTest({
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

  // Reading Part 4: 12-13 minutes (using 12)
  const QUESTION_TIME_SECONDS = 12 * 60;
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);

  // Selected option index for Q1..Q10 (0-based)
  const [selected, setSelected] = useState<(number | null)[]>(
    Array(10).fill(null)
  );

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
          articleText: doc.articleText ?? null,
          questionTexts: doc.questionTexts ?? null,
          questionAnswers: doc.questionAnswers ?? null,
          paragraphText: doc.paragraphText ?? null,
          commentText: doc.commentText ?? null,
          paragraphBlanks: doc.paragraphBlanks ?? null,
          correctAnswers: doc.correctAnswers ?? null,
          answers: doc.answers ?? null,
        }));

        const wantedId =
          materialIdFromParam || materialIdFromState || materialIdFromStorage;

        let picked: MaterialDoc | null =
          (wantedId
            ? formatted.find((m) => String(m.id) === String(wantedId))
            : null) ?? null;

        if (picked && !isPart4ReadingMock(picked)) picked = null;

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
                isPart4ReadingMock(m)
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
                isPart4ReadingMock(m)
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

  // ✅ Get article passage from DB
  const articleText = useMemo(() => {
    const raw =
      uploaded?.sectionTranscripts?.[0] ||
      uploaded?.readingPassage ||
      uploaded?.articleText ||
      material?.readingPassage ||
      material?.articleText ||
      material?.description ||
      "";

    return extractTextFlexible(raw).trim();
  }, [uploaded, material]);

  // Clean article text (remove instruction-like first line if present)
  const cleanedArticleText = useMemo(() => {
    const t = (articleText || "").trimStart();
    if (!t) return "";

    const firstLine = t.split(/\r?\n/, 1)[0] || "";
    const looksLikeInstruction =
      /^(read\s+the\s+following|read\s+this\s+article|read\s+the\s+article)/i.test(
        firstLine.trim()
      );

    if (!looksLikeInstruction) return articleText;

    // Remove just the first line + following blank lines
    return t.replace(/^.*\r?\n+/, "").trimStart();
  }, [articleText]);

  // ✅ Question answers array
  const questionAnswers = useMemo(() => {
    const qa =
      uploaded?.questionAnswers || material?.questionAnswers || [];
    return Array.isArray(qa) ? qa : [];
  }, [uploaded, material]);

  // ✅ Q1 - Q5 question texts
  const topQuestionTexts: string[] = useMemo(() => {
    const fromDB = uploaded?.questionTexts;
    if (Array.isArray(fromDB) && fromDB.length) {
      return fromDB
        .slice(0, TOP_QUESTIONS_COUNT)
        .map((s) => normalizeInline(String(s)));
    }

    if (Array.isArray(questionAnswers) && questionAnswers.length) {
      const mapped = questionAnswers
        .slice(0, TOP_QUESTIONS_COUNT)
        .map((row: any) =>
          Array.isArray(row) ? normalizeInline(String(row[0] ?? "")) : ""
        )
        .filter(Boolean);

      if (mapped.length) return mapped;
    }

    // Fallback generic questions
    return [
      "This article is about",
      "The main idea of the passage is",
      "According to the article,",
      "The author suggests that",
      "At the end of the passage,",
    ];
  }, [uploaded, questionAnswers]);

  // ✅ Q1 - Q5 options
  const topOptions: string[][] = useMemo(() => {
    if (Array.isArray(questionAnswers) && questionAnswers.length) {
      return questionAnswers
        .slice(0, TOP_QUESTIONS_COUNT)
        .map((row: any) => extractOptionsFromRow(row));
    }
    return Array.from({ length: TOP_QUESTIONS_COUNT }, () => [
      "Option A",
      "Option B",
      "Option C",
      "Option D",
    ]);
  }, [questionAnswers]);

  // ✅ Comment paragraph with blanks {6}..{10}
  const commentParagraphText: string = useMemo(() => {
    return extractTextFlexible(
      uploaded?.paragraphText,
      material?.paragraphText,
      uploaded?.commentText,
      material?.commentText
    );
  }, [uploaded, material]);

  // ✅ Options for blanks Q6 - Q10
  const blankOptions: string[][] = useMemo(() => {
    const fromDB = uploaded?.paragraphBlanks || material?.paragraphBlanks;
    if (Array.isArray(fromDB) && fromDB.length) {
      return fromDB
        .slice(0, BLANKS_COUNT)
        .map((row: any) => (Array.isArray(row) ? row.map(String) : []))
        .map((arr: string[]) => arr.map((s) => s.trim()).filter(Boolean));
    }

    // Fallback: questionAnswers rows 5-9 (Q6-Q10)
    if (
      Array.isArray(questionAnswers) &&
      questionAnswers.length >= TOP_QUESTIONS_COUNT + BLANKS_COUNT
    ) {
      return questionAnswers
        .slice(TOP_QUESTIONS_COUNT, TOP_QUESTIONS_COUNT + BLANKS_COUNT)
        .map((row: any) => extractOptionsFromRow(row));
    }

    return Array.from({ length: BLANKS_COUNT }, () => [
      "Option A",
      "Option B",
      "Option C",
      "Option D",
    ]);
  }, [uploaded, material, questionAnswers]);

  // ✅ Correct answers
  const correctRaw: any[] = useMemo(() => {
    const direct =
      uploaded?.correctAnswers ||
      material?.correctAnswers ||
      uploaded?.answers ||
      material?.answers;

    if (Array.isArray(direct) && direct.length) return direct;

    // Fallback: take last element of each questionAnswers row if it looks like correct
    if (Array.isArray(questionAnswers) && questionAnswers.length) {
      const inferred: any[] = [];
      for (let i = 0; i < Math.min(10, questionAnswers.length); i++) {
        const row = questionAnswers[i];
        if (Array.isArray(row) && row.length >= 6)
          inferred.push(row[row.length - 1]);
        else inferred.push(undefined);
      }
      return inferred;
    }

    return [];
  }, [uploaded, material, questionAnswers]);

  const setAnswer = (qIndex0: number, optionIndex: number | null) => {
    setSelected((prev) => {
      const next = [...prev];
      next[qIndex0] = optionIndex;
      return next;
    });
  };

  // ✅ Render comment paragraph with embedded dropdowns
  const renderedComment = useMemo(() => {
    const text = commentParagraphText || "";
    const re = /(\{(\d+)\}|\[(\d+)\])/g;

    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;

      if (start > last) {
        parts.push(<span key={`t-${start}`}>{text.slice(last, start)}</span>);
      }

      const qNum = parseInt(m[2] || m[3] || "", 10); // 6..10
      const qIndex0 = qNum - 1; // 0-based in selected array
      const blankIndex = qNum - 6; // 0..4

      if (qNum >= 6 && qNum <= 10 && blankOptions[blankIndex]) {
        const opts = blankOptions[blankIndex];

        parts.push(
          <select
            key={`s-${qNum}-${start}`}
            value={selected[qIndex0] ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? null : Number(e.target.value);
              setAnswer(qIndex0, v);
            }}
            aria-label={`Blank ${qNum} answer`}
            className="mx-1 inline-block align-baseline border border-gray-300 rounded px-2 py-1 text-sm bg-white min-w-[140px]"
          >
            <option value="" disabled hidden />
            {opts.map((opt, idx) => (
              <option key={idx} value={idx}>
                {opt}
              </option>
            ))}
          </select>
        );
      } else {
        parts.push(
          <span
            key={`missing-${qNum}-${start}`}
            className="inline-block w-24 border-b border-gray-400 mx-1 align-baseline"
          />
        );
      }

      last = end;
    }

    if (last < text.length) {
      parts.push(<span key="t-end">{text.slice(last)}</span>);
    }
    return parts;
  }, [commentParagraphText, blankOptions, selected]);

  const handleSubmit = async () => {
    // Save answers to localStorage
    const mockSet = localStorage.getItem("activeMockSet") || "1";

    const userAnswersMap: Record<number, number | null> = {};
    selected.forEach((ans, idx) => {
      userAnswersMap[idx] = ans;
    });

    // Compute correct answers indices
    const correctAnswersMap: Record<number, number | null> = {};
    for (let i = 0; i < 10; i++) {
      const correctVal = correctRaw[i];
      if (i < TOP_QUESTIONS_COUNT) {
        correctAnswersMap[i] = correctToIndex(correctVal, topOptions[i] || []);
      } else {
        const blankIndex = i - TOP_QUESTIONS_COUNT;
        correctAnswersMap[i] = correctToIndex(
          correctVal,
          blankOptions[blankIndex] || []
        );
      }
    }

    await saveReadingPartAnswersDB(
      4,
      userAnswersMap,
      correctAnswersMap,
      [...topQuestionTexts],
      parseInt(mockSet, 10)
    );

    if (onComplete) onComplete();
  };

  const validateAllAnswered = () => {
    const missing: number[] = [];

    selected.forEach((ans, idx) => {
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
    return `Practice Test A - Reading Part 4: Reading for Viewpoints`;
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
            Could not load a Reading mock for Part 4 (Reading for Viewpoints).
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
                Reading Part 4 Instructions
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="text-sm text-gray-700 leading-7 space-y-4">
                  <p>
                    <span className="font-semibold">1.</span> You will read an
                    article from a website on the left side of the screen.
                  </p>
                  <p>
                    <span className="font-semibold">2.</span> On the right side,
                    answer questions about the article using dropdown menus.
                  </p>
                  <p>
                    <span className="font-semibold">3.</span> Then complete a
                    visitor's comment by filling in the blanks with the most
                    appropriate options.
                  </p>
                  <p>
                    <span className="font-semibold">4.</span> You will have
                    about 12 minutes to complete this section.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step.kind === "reading-questions" ? (
          <div className="flex h-full">
            {/* Left Panel - Article */}
            <div className="w-1/2 border-r border-gray-200 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="p-6">
                <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                  <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                  <span>Read the following article from a website.</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  {cleanedArticleText ? (
                    <div
                      className="text-sm text-gray-800 leading-7 whitespace-pre-line text-justify"
                      style={{ lineHeight: "1.8" }}
                    >
                      {cleanedArticleText}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      Article text not found in database. Admin usually saves
                      this in <b>uploadedFiles.sectionTranscripts[0]</b> or{" "}
                      <b>uploadedFiles.readingPassage</b>.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Questions + Comment */}
            <div className="w-1/2 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div className="p-6 space-y-6">
                {/* Section 1: Dropdown Questions Q1-Q5 */}
                <div>
                  <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                    <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                    <span>
                      Select the{" "}
                      <span className="text-blue-600 underline">
                        most appropriate
                      </span>{" "}
                      answer from each dropdown (
                      <span className="text-blue-600">▼</span>) based on the
                      article.
                    </span>
                  </div>

<div className="bg-white border border-gray-200 rounded-lg p-5">
  <div className="space-y-4">
    {topQuestionTexts.slice(0, TOP_QUESTIONS_COUNT).map((q, i) => (
      <div key={i} className="text-sm text-gray-900 leading-7">
        <div className="flex items-start gap-3">
          <span className="font-semibold text-gray-700 shrink-0 w-6 text-right">
            {i + 1}.
          </span>

          <div className="min-w-0 flex-1">
            <div className="text-justify">{q}</div>

            <div className="mt-2">
              <select
                aria-label={`Question ${i + 1} answer`}
                className="w-full max-w-[520px] border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
                value={selected[i] ?? ""}
                onChange={(e) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setAnswer(i, v);
                }}
              >
                <option value="" disabled hidden />
                {(topOptions[i] || []).map((opt, idx) => (
                  <option key={idx} value={idx}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>

                </div>

                {/* Section 2: Comment with Blanks Q6-Q10 */}
                {commentParagraphText && (
                  <div>
                    <div className="flex items-start gap-2 text-sm font-semibold text-blue-800 mb-4">
                      <Info className="w-4 h-4 mt-[2px] text-blue-600" />
                      <span>
                        Complete the section by selecting the{" "}
                        <span className="text-blue-600 underline">
                          most suitable
                        </span>{" "}
                        option for each blank.
                      </span>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div
                        className="text-sm text-gray-800 whitespace-pre-wrap"
                        style={{ lineHeight: "2" }}
                      >
                        {renderedComment}
                      </div>
                    </div>
                  </div>
                )}

                {!cleanedArticleText && !commentParagraphText && (
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
