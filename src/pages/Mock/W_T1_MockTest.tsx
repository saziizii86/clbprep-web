// D:\projects\celpip-master\src\pages\Mock\W_T1_MockTest.tsx
// Writing Mock Test — Task 1 (Email)
// This is an INDEPENDENT practice application NOT affiliated with any official testing organization.

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Mail, FileText } from "lucide-react";

// Services (dynamic use elsewhere, but getMaterials is expected to exist like Reading pages)
import { getMaterials, getMaterialById } from "../../services/materialsService";

type UploadedFiles = Record<string, any>;

type MaterialDoc = {
  id: string;
  title?: string;
  description?: string;
  skill?: string;
  taskId?: string;
  isMock?: boolean;
  mockSet?: number | null;
  mockOrder?: number | null;
  uploadedFiles?: UploadedFiles | string;
};

function normalizeMockSet(v: any): string {
  const s = String(v ?? "").trim();
  const m = s.match(/\d+/);
  return m ? m[0] : s.toLowerCase();
}

function isLikelyBase64(s: string) {
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith("data:")) return true;
  return /^[A-Za-z0-9+/=\s]+$/.test(t) && t.length > 200;
}

function decodeBase64Maybe(input: string): string {
  const t = (input || "").trim();
  if (!t) return "";

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

  if (isLikelyBase64(t)) {
    try {
      return atob(t.replace(/\s/g, ""));
    } catch {
      return input;
    }
  }

  return input;
}

function extractTextFlexible(...candidates: any[]): string {
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === "string" && c.trim()) return decodeBase64Maybe(c);
    if (typeof c === "object") {
      const maybe =
        c.text ??
        c.content ??
        c.data ??
        c.value ??
        c.body ??
        c.instructions ??
        c.prompt;
      if (typeof maybe === "string" && maybe.trim()) return decodeBase64Maybe(maybe);

      if (Array.isArray(c) && c.length) {
        const joined = c.map(String).join("\n");
        if (joined.trim()) return joined;
      }
    }
  }
  return "";
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


export default function W_T1_MockTest({
  material: prefetchedMaterial,
  mockSet: prefetchedMockSet,
  onComplete,
  onBack,
}: {
  material?: MaterialDoc | null;
  mockSet?: number | string;
  onComplete?: () => void;
  onBack?: () => void;
} = {}) {




  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  // Get set number from localStorage (set by parent component)
  // Get set number from parent/route/localStorage
const setKey =
  (params as any).setKey ||
  (location.state as any)?.mockSet ||
  prefetchedMockSet ||
  localStorage.getItem("activeMockSet") ||
  "1";

const setNumber = Number(normalizeMockSet(setKey) || "1") || 1;


  const [loading, setLoading] = useState(() => !prefetchedMaterial);

  const [material, setMaterial] = useState<MaterialDoc | null>(null);
  const [promptText, setPromptText] = useState<string>("");
  const [response, setResponse] = useState<string>("");


  useEffect(() => {
    const startedKey = `mockWriting_T1_started_set${setNumber}`;
    const savedKey = `mockWriting_T1_response_set${setNumber}`;

    // First time opening this task for this set -> empty
    if (localStorage.getItem(startedKey) !== "1") {
      localStorage.removeItem(savedKey);
      setResponse("");
      return;
    }

    // If already started before, restore draft
    setResponse(localStorage.getItem(savedKey) || "");
  }, [setNumber]);

  
  // ✅ If parent already passed the material, use it immediately (no loading screen)
// ✅ If parent passed the material, use it immediately (no loading screen)
useEffect(() => {
  if (!prefetchedMaterial) return;

  const hydrateFromDoc = (doc: any) => {
    setMaterial(doc);

    const uf: any = doc?.uploadedFiles ?? null;
    const extracted = extractTextFlexible(
      uf?.writingPrompt,
      uf?.instructions,
      uf?.prompt,
      doc?.description,
      uf?.sectionTranscripts?.[0],
      uf?.transcripts?.[0],
      uf?.questionTranscripts?.[0]
    );

    setPromptText(extracted || "");
    setLoading(false);
  };

  const hasUsableUploadedFiles =
    prefetchedMaterial?.uploadedFiles &&
    (
      typeof prefetchedMaterial.uploadedFiles === "object" ||
      (typeof prefetchedMaterial.uploadedFiles === "string" &&
        prefetchedMaterial.uploadedFiles.trim().length > 2)
    );

  if (hasUsableUploadedFiles) {
    hydrateFromDoc(prefetchedMaterial);
    return;
  }

  const refetch = async () => {
    setLoading(true);
    let doc: any = prefetchedMaterial;

    const docId = prefetchedMaterial?.id ?? (prefetchedMaterial as any)?.$id;
    if (docId) {
      try {
        const full = await getMaterialById(docId);
        if (full) {
          let f = (full as any).uploadedFiles;
          if (typeof f === "string") {
            try {
              f = JSON.parse(f);
            } catch {
              f = {};
            }
          }
          doc = { ...prefetchedMaterial, ...(full as any), uploadedFiles: f || {} };
        }
      } catch {
        // keep prefetchedMaterial as fallback
      }
    }

    hydrateFromDoc(doc);
  };

  void refetch();
}, [prefetchedMaterial]);



useEffect(() => {
    if (prefetchedMaterial) return;
    let mounted = true;
    const load = async () => {
      try {
        const all = (await getMaterials()) as MaterialDoc[];

        const isWriting = (m: any) =>
          String(m.skill || "").toLowerCase() === "writing" && m.isMock === true;
        const isThisSet = (m: any) =>
          normalizeMockSet(m.mockSet) === normalizeMockSet(setNumber);
        const isT1 = (m: any) => m.taskId === "part1" || Number(m.mockOrder) === 1;

        const lightweight = all.find((m) => isWriting(m) && isThisSet(m) && isT1(m)) || null;

        if (!mounted) return;

        // ✅ Fetch FULL document so uploadedFiles (writingPrompt etc.) is included
        let doc: MaterialDoc | null = lightweight;
const lightweightId = (lightweight as any)?.$id ?? lightweight?.id;
        if (lightweightId) {
          const full = await getMaterialById(lightweightId);
          if (full) {
            let f = (full as any).uploadedFiles;
            if (typeof f === "string") { try { f = JSON.parse(f); } catch { f = {}; } }
            doc = { ...lightweight, ...(full as any), uploadedFiles: f || {} };
          }
        }

        if (!mounted) return;
        setMaterial(doc);

        const uf: any = doc?.uploadedFiles ?? null;

        const extracted = extractTextFlexible(
          uf?.writingPrompt,
          uf?.instructions,
          uf?.prompt,
          (doc as any)?.description,
          uf?.sectionTranscripts?.[0],
          uf?.transcripts?.[0],
          uf?.questionTranscripts?.[0]
        );

        setPromptText(extracted || "");
      } catch (e) {
        console.error("Failed to load Writing Task 1 material:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [setNumber]);

  const wordCount = useMemo(() => countWords(response), [response]);

  const saveResponse = async () => {
    localStorage.setItem(`mockWriting_T1_started_set${setNumber}`, "1");
    localStorage.setItem(`activeMockSet`, String(setNumber));
    localStorage.setItem(`mockWriting_T1_materialId_set${setNumber}`, material?.id || "");
    localStorage.setItem(`mockWriting_T1_prompt_set${setNumber}`, promptText || "");
    localStorage.setItem(`mockWriting_T1_response_set${setNumber}`, response || "");
    localStorage.setItem(`mockWriting_T1_words_set${setNumber}`, String(wordCount));

    // Optional: save to DB if your service exposes a function.
    // This avoids compile errors if the function doesn't exist.
    try {
      const mod: any = await import("../../services/mockTestAnswersService");
      const fn =
        mod.saveWritingTaskResponseDB ||
        mod.saveWritingAnswersDB ||
        mod.saveMockWritingResponseDB;
      if (typeof fn === "function") {
        await fn({
          mockSet: setNumber,
          task: 1,
          materialId: material?.id || null,
          prompt: promptText,
          response,
          wordCount,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // ignore (localStorage is enough)
    }
  };

  const handleNext = async () => {
    await saveResponse();
    
    // If parent provides onComplete callback, use it
    if (onComplete) {
      onComplete();
    } else {
      // Otherwise use navigation (for standalone route usage)
      navigate(`/mock/${setNumber}/writing/2`, { state: { mockSet: setNumber } });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

// ✅ Do NOT show a full-page loading screen (avoid flicker)
// Just keep rendering the page; prompt area can show a subtle message.


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-6">
      <PracticeFrame
        headerTitle="Writing Task 1"
        onNext={handleNext}
        onBack={handleBack}
        nextLabel="NEXT"
      >
        <div className="p-8" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prompt */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Read the following information.</div>
                  <div className="text-xs text-gray-500">Write about 150–200 words</div>
                </div>
              </div>
              <div className="p-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5 text-sm leading-6 text-gray-800 whitespace-pre-wrap">
{loading ? (
  <span className="text-gray-500">Loading…</span>
) : promptText ? (
  promptText
) : (
  <span className="text-gray-500">
    No prompt loaded. Please upload Writing Task 2 (taskId=part2, skill=writing, isMock=true).
  </span>
)}

                </div>
              </div>
            </div>

            {/* Response */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Write to see your score</div>
                    <div className="text-xs text-gray-500">Your response will be evaluated after Task 2</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">{wordCount} words</div>
              </div>
              <div className="p-6">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response here…"
                  className="w-full min-h-[360px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-blue-200"
                />
                <div className="mt-3 text-xs text-gray-500">
                  Tip: keep your message clear and organized (opening → details → request → closing).
                </div>
              </div>
            </div>
          </div>
        </div>
      </PracticeFrame>
    </div>
  );
}
