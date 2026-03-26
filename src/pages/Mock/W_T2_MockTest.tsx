// D:\projects\celpip-master\src\pages\Mock\W_T2_MockTest.tsx
// Writing Mock Test — Task 2 (Survey / Choose Option A or B)
// This is an INDEPENDENT practice application NOT affiliated with any official testing organization.

import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FileText, ListChecks } from "lucide-react";

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


export default function W_T2_MockTest({
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
  const [selectedOption, setSelectedOption] = useState<"A" | "B" | null>(null);
  const [response, setResponse] = useState<string>("");

useEffect(() => {
  if (!prefetchedMaterial) return;

  const refetch = async () => {
    setLoading(true);
    let doc: any = prefetchedMaterial;

    // ✅ Always re-fetch full doc — prefetchedMaterial may have empty uploadedFiles
    const docId = prefetchedMaterial?.id ?? (prefetchedMaterial as any)?.$id;
    if (docId) {
      try {
        const full = await getMaterialById(docId);
        if (full) {
          let f = (full as any).uploadedFiles;
          if (typeof f === "string") { try { f = JSON.parse(f); } catch { f = {}; } }
          doc = { ...prefetchedMaterial, ...(full as any), uploadedFiles: f || {} };
        }
      } catch { /* keep prefetchedMaterial */ }
    }

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

  refetch();
}, [prefetchedMaterial]);




  useEffect(() => {
	  if (prefetchedMaterial) return;
    let mounted = true;
    const load = async () => {
      try {
        const all = (await getMaterials()) as MaterialDoc[];
        
        console.log('[W_T2] Total materials loaded:', all.length);
        console.log('[W_T2] Looking for setNumber:', setNumber);
        
        const isWriting = (m: any) =>
          String(m.skill || "").toLowerCase() === "writing" && m.isMock === true;
        const isThisSet = (m: any) =>
          normalizeMockSet(m.mockSet) === normalizeMockSet(setNumber);
        const isT2 = (m: any) => m.taskId === "part2" || Number(m.mockOrder) === 2;


const lightweight = all.find((m) => isWriting(m) && isThisSet(m) && isT2(m)) || null;
        
        console.log('[W_T2] Found material:', lightweight ? lightweight.title : 'NONE');
        
        if (!mounted) return;

        // ✅ Fetch full doc so uploadedFiles.writingPrompt is included
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
  uf?.writingPrompt,      // ✅ IMPORTANT
  uf?.instructions,
  uf?.prompt,
  doc?.description,
  uf?.sectionTranscripts?.[0],
  uf?.transcripts?.[0],
  uf?.questionTranscripts?.[0]
);

        
        console.log('[W_T2] Extracted prompt:', extracted ? extracted.substring(0, 100) + '...' : 'NONE');
        
        setPromptText(extracted || "");
      } catch (e) {
        console.error("Failed to load Writing Task 2 material:", e);
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
	  localStorage.setItem(`mockWriting_T2_started_set${setNumber}`, "1");

    localStorage.setItem(`activeMockSet`, String(setNumber));
    localStorage.setItem(`mockWriting_T2_materialId_set${setNumber}`, material?.id || "");
    localStorage.setItem(`mockWriting_T2_prompt_set${setNumber}`, promptText || "");
    localStorage.setItem(`mockWriting_T2_option_set${setNumber}`, selectedOption || "");
    localStorage.setItem(`mockWriting_T2_response_set${setNumber}`, response || "");
    localStorage.setItem(`mockWriting_T2_words_set${setNumber}`, String(wordCount));

    // Optional DB save
    try {
      const mod: any = await import("../../services/mockTestAnswersService");
      const fn =
        mod.saveWritingTaskResponseDB ||
        mod.saveWritingAnswersDB ||
        mod.saveMockWritingResponseDB;
      if (typeof fn === "function") {
        await fn({
          mockSet: setNumber,
          task: 2,
          materialId: material?.id || null,
          prompt: promptText,
          selectedOption,
          response,
          wordCount,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }
  };

  const handleNext = async () => {
    await saveResponse();
    
    // If parent provides onComplete callback, use it
    if (onComplete) {
      onComplete();
    } else {
      // Otherwise use navigation (for standalone route usage)
      navigate(`/mock/${setNumber}/writing/results`, { state: { mockSet: setNumber } });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(`/mock/${setNumber}/writing/1`, { state: { mockSet: setNumber } });
    }
  };

  const nextDisabled = !selectedOption;



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-6">
      <PracticeFrame
        headerTitle="Writing Task 2"
        onNext={handleNext}
        onBack={handleBack}
        nextLabel="NEXT"
        nextDisabled={nextDisabled}
      >
        <div className="p-8" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prompt */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <ListChecks className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Read the following information.</div>
                  <div className="text-xs text-gray-500">Choose Option A or B, then write 150–200 words</div>
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
                <div>
                  <div className="text-sm font-semibold text-gray-900">Write to see your score</div>
                  <div className="text-xs text-gray-500">Select an option first</div>
                </div>
                <div className="text-xs text-gray-500">{wordCount} words</div>
              </div>

              <div className="p-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="text-xs font-semibold text-blue-800 mb-3">Select the option you want to support:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedOption("A")}
                      className={`rounded-xl border px-4 py-3 text-center transition ${
                        selectedOption === "A"
                          ? "border-blue-500 bg-white shadow-sm"
                          : "border-gray-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900">Option A</div>
                      <div className="text-xs text-gray-500">Support this choice</div>
                    </button>
                    <button
                      onClick={() => setSelectedOption("B")}
                      className={`rounded-xl border px-4 py-3 text-center transition ${
                        selectedOption === "B"
                          ? "border-blue-500 bg-white shadow-sm"
                          : "border-gray-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900">Option B</div>
                      <div className="text-xs text-gray-500">Support this choice</div>
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder={
                      selectedOption
                        ? "Type your response here…"
                        : "Please select Option A or Option B above before writing…"
                    }
                    disabled={!selectedOption}
                    className={`w-full min-h-[300px] rounded-xl border px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-blue-200 ${
                      selectedOption
                        ? "border-gray-200 bg-white"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  />
                  {!selectedOption ? (
                    <div className="mt-2 text-xs text-red-600">Please select Option A or Option B above before submitting</div>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <FileText className="w-4 h-4" />
                  Your answer will be evaluated on the Results page.
                </div>
              </div>
            </div>
          </div>
        </div>
      </PracticeFrame>
    </div>
  );
}
