// src/pages/Mock/S_T7_MockTest.tsx  –  Speaking Task 7: Expressing Opinions
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Mic, Clock, CheckCircle } from "lucide-react";
import { getMaterials, getMaterialById } from "../../services/materialsService";
import { getAPISettings } from "../../services/settingsService";
import { saveSpeakingTaskToDB } from "../../services/mockTestAnswersService";

const norm = (v: any) => { const s = String(v ?? "").trim(); const m = s.match(/\d+/); return m ? m[0] : s.toLowerCase(); };
const parse = (r: any) => { try { return r ? (typeof r === "string" ? JSON.parse(r) : r) : null; } catch { return r; } };
const txt = (...a: any[]) => { for (const x of a) { if (!x) continue; if (typeof x === "string" && x.trim()) return x.trim(); if (typeof x === "object") { for (const k of ["speakingPrompt","instructions","prompt","text","content","body"]) if (typeof x[k]==="string"&&x[k].trim()) return x[k].trim(); } } return ""; };
const imgSrc = (i: any) => (!i ? "" : typeof i === "string" ? i : i.data || i.storageUrl || i.url || "");

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


const TASK = 7, TASK_ID = "part7", PREP_TIME = 30;
const TASK_LABEL = "Speaking Task 7: Expressing Opinions";
const NEXT_ROUTE = "/speaking/8";

export default function S_T7_MockTest({ material: pre, mockSet: preSet, onComplete, onBack }: {
  material?: any; mockSet?: any; onComplete?: () => void; onBack?: () => void;
} = {}) {
  const nav = useNavigate(), loc = useLocation(), par = useParams();
  const setNum = Number(norm((par as any).setKey || (loc.state as any)?.mockSet || preSet || localStorage.getItem("activeMockSet") || "1")) || 1;

  const [loading, setLoading] = useState(!pre);
  const [f, setF] = useState<any>({});
  const [mat, setMat] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiOk, setApiOk] = useState(false);

  const [phase, setPhase] = useState<"prep" | "recording" | "transcribing" | "done">("prep");
  const [countdown, setCountdown] = useState(PREP_TIME);
  const [recTime, setRecTime] = useState(0);

  const prepRef = useRef<any>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const recTimerRef = useRef<any>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const stopResolveRef = useRef<(() => void) | null>(null);

  useEffect(() => { 
    (async () => { 
      try { 
        const s = await getAPISettings(); 
        setApiOk(s?.isConnected || false); 
        setApiKey(s?.openaiKey || s?.openAIKey || s?.apiKey || ""); 
      } catch (e) {
        console.warn("[Speaking T" + TASK + "] Failed to load API settings:", e);
      } 
    })(); 
  }, []);

const apply = useCallback(async (doc: any) => {
    // ✅ Only fetch full doc if uploadedFiles is missing/empty
    // (userHome already pre-fetches it — avoid double DB call)
    const existing = parse(doc?.uploadedFiles);
    const hasContent = existing && (
      existing.speakingPrompt || existing.instructions ||
      existing.prompt || existing.speakingImages?.length
    );

    if (!hasContent) {
      const docId = doc?.$id ?? doc?.id;
      if (docId) {
        try {
          const full = await getMaterialById(docId);
          if (full) {
            let f = (full as any).uploadedFiles;
            if (typeof f === "string") { try { f = JSON.parse(f); } catch { f = {}; } }
            doc = { ...doc, ...(full as any), uploadedFiles: f || {} };
          }
        } catch { /* keep original doc */ }
      }
    }
    setMat(doc); 
    const u = parse(doc?.uploadedFiles);
    const prompt = txt(u?.speakingPrompt, u?.instructions, u?.prompt, doc?.description);
    const images = (Array.isArray(u?.speakingImages) ? u.speakingImages : []).map(imgSrc).filter(Boolean);
    const maxRec = parseInt(u?.recordingTime) || 90;
    setF({ prompt, images, maxRec });

    localStorage.setItem("activeMockSet", String(setNum));
    localStorage.setItem(`mockSpeaking_T${TASK}_prompt_set${setNum}`, prompt);
    localStorage.setItem(`mockSpeaking_T${TASK}_materialId_set${setNum}`, doc?.$id || doc?.id || "");

    saveSpeakingTaskToDB(TASK, setNum, {
      prompt,
      transcript: "",
      materialId: doc?.$id || doc?.id || "",
    }).catch((e) => console.warn("[Speaking T" + TASK + "] DB save prompt failed:", e));

    setLoading(false);
  }, [setNum]);

  useEffect(() => { if (pre) void apply(pre); }, [pre, apply]);

  useEffect(() => {
    if (pre) return;
    let cancelled = false;
    (async () => {
      try {
        const all = (await getMaterials()) as any[];
        const d = all.find((x: any) => 
          String(x.skill || "").toLowerCase() === "speaking" && 
          x.isMock === true && 
          norm(x.mockSet) === norm(setNum) && 
          (x.taskId === TASK_ID || Number(x.mockOrder) === TASK)
        );
        if (cancelled) return;
        if (d) apply(d);
        else setLoading(false);
      } catch (e) {
        console.warn("[Speaking T" + TASK + "] Failed to load material:", e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setNum, pre, apply]);

  const maxRec = f.maxRec || 90;

  useEffect(() => {
    if (phase !== "prep") return;
    setCountdown(PREP_TIME);
    prepRef.current = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) {
          clearInterval(prepRef.current);
          startRecording();
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(prepRef.current);
  }, [phase]);

  const transcribeAndSave = async (blob: Blob, mime: string) => {
    if (!apiOk || !apiKey) {
      console.warn("[Speaking T" + TASK + "] API not connected, skipping transcription");
      return;
    }
    if (blob.size < 500) {
      console.warn("[Speaking T" + TASK + "] Audio too small, skipping transcription");
      return;
    }

    setPhase("transcribing");

    try {
      const fd = new FormData();
      const ext = mime.includes("webm") ? "webm" : "mp4";
      fd.append("file", blob, `speaking_task${TASK}.${ext}`);
      fd.append("model", "whisper-1");
      fd.append("language", "en");

      console.log("[Speaking T" + TASK + "] Sending audio to Whisper API...");

      const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fd,
      });

      if (r.ok) {
        const d = await r.json();
        if (d.text) {
          console.log("[Speaking T" + TASK + "] Transcription received:", d.text.substring(0, 100) + "...");
          localStorage.setItem(`mockSpeaking_T${TASK}_transcript_set${setNum}`, d.text);
          await saveSpeakingTaskToDB(TASK, setNum, { transcript: d.text });
          console.log("[Speaking T" + TASK + "] Transcript saved successfully");
        }
      } else {
        const errText = await r.text();
        console.error("[Speaking T" + TASK + "] Whisper API error:", r.status, errText);
      }
    } catch (err) {
      console.error("[Speaking T" + TASK + "] Transcription error:", err);
    }
  };

  const startRecording = async () => {
    setPhase("recording");
    setRecTime(0);

    let resolve: () => void;
    stopPromiseRef.current = new Promise<void>(r => { resolve = r; });
    stopResolveRef.current = () => resolve();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
      });
      
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      
      rec.ondataavailable = e => {
        if (e.data?.size > 0) chunks.push(e.data);
      };
      
      rec.onstop = async () => {
        clearInterval(recTimerRef.current);
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mime });
        console.log("[Speaking T" + TASK + "] Recording stopped, blob size:", blob.size);
        await transcribeAndSave(blob, mime);
        setPhase("done");
        if (stopResolveRef.current) stopResolveRef.current();
      };
      
      recRef.current = rec;
      rec.start(1000);
      
      recTimerRef.current = setInterval(() => {
        setRecTime(p => {
          if (p >= maxRec - 1) {
            clearInterval(recTimerRef.current);
            if (recRef.current?.state === "recording") recRef.current.stop();
            return maxRec;
          }
          return p + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("[Speaking T" + TASK + "] Recording error:", err);
      setPhase("done");
      if (stopResolveRef.current) stopResolveRef.current();
    }
  };

  const skipPrep = () => {
    clearInterval(prepRef.current);
    startRecording();
  };

  const handleNext = async () => {
    if (phase === "prep") {
      clearInterval(prepRef.current);
      if (onComplete) onComplete();
      else nav(`/mock/${setNum}${NEXT_ROUTE}`, { state: { mockSet: setNum } });
      return;
    }
    if (recRef.current?.state === "recording") {
      recRef.current.stop();
    }
    if (stopPromiseRef.current) {
      await stopPromiseRef.current;
    }
    if (onComplete) onComplete();
    else nav(`/mock/${setNum}${NEXT_ROUTE}`, { state: { mockSet: setNum } });
  };

  const handleBack = () => {
    if (onBack) onBack();
    else nav(-1);
  };

  const hasImages = f.images?.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-6">
      <PracticeFrame
        headerTitle={TASK_LABEL}
        rightStatus={<span className="text-xs text-white/80">Preparation: <b>30s</b> &nbsp; Recording: <b>{maxRec}s</b></span>}
        onNext={handleNext}
        onBack={handleBack}
        nextLabel={phase === "transcribing" ? "Saving…" : "NEXT"}
      >
        <div className="p-6 space-y-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Mic className="w-5 h-5 text-blue-600" />
              Speaking Prompt
            </h3>
            <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {loading ? "Loading…" : f.prompt || "No speaking prompt available."}
              </p>
            </div>
          </div>

          {/* ✅ Image + Timer layout (timer on the RIGHT on desktop) */}
<div className={hasImages ? "grid grid-cols-1 md:grid-cols-3 gap-6 items-start" : ""}>
  {/* LEFT: Image(s) */}
  {hasImages && (
    <div className="md:col-span-2 flex justify-center">
      <div className={`${f.images.length > 1 ? "grid grid-cols-2 gap-3 max-w-2xl" : "max-w-lg"}`}>
        {f.images.map((s: string, i: number) => (
          <img key={i} src={s} alt={`Context ${i + 1}`} className="w-full rounded-lg border shadow-sm" />
        ))}
      </div>
    </div>
  )}

  {/* RIGHT: Timer panel - Compact Version */}
  <div className={`${hasImages ? "md:col-span-1 flex justify-end" : "flex justify-center"}`}>
    {phase === "prep" ? (
      <div className="bg-slate-50 rounded-lg border shadow-sm p-3 w-[240px] text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-blue-500" />
          <h4 className="font-bold text-sm text-gray-900">Preparation Time</h4>
        </div>
        <div className="text-3xl font-bold text-blue-600 mb-1">{countdown}</div>
        <button onClick={skipPrep} className="text-[10px] text-blue-600 hover:text-blue-800 underline">
          Skip & Start Recording
        </button>
      </div>
    ) : phase === "recording" ? (
      <div className="bg-red-50 rounded-lg border border-red-200 shadow-sm p-3 w-[240px] text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Mic className="w-4 h-4 text-red-600 animate-pulse" />
          <h4 className="font-bold text-sm text-gray-900">Recording…</h4>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
          <div className="bg-red-500 h-full transition-all" style={{ width: `${(recTime / maxRec) * 100}%` }} />
        </div>
        <p className="text-[10px] text-gray-600 font-medium">
          {recTime}s / {maxRec}s
        </p>
      </div>
    ) : phase === "transcribing" ? (
      <div className="bg-blue-50 rounded-lg border border-blue-200 shadow-sm p-3 w-[240px] text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <h4 className="font-bold text-sm text-gray-900">Transcribing…</h4>
        </div>
      </div>
    ) : (
      <div className="bg-green-50 rounded-lg border border-green-200 shadow-sm p-3 w-[240px] text-center flex items-center justify-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <h4 className="font-bold text-sm text-gray-900">Recording Complete</h4>
      </div>
    )}
  </div>
</div>

        </div>
      </PracticeFrame>
    </div>
  );
}
