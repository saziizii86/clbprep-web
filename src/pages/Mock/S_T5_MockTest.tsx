// src/pages/Mock/S_T5_MockTest.tsx  –  Speaking Task 5: Comparing and Persuading
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Mic, Clock, CheckCircle } from "lucide-react";
import { getMaterials, getMaterialById } from "../../services/materialsService";
import { getAPISettings } from "../../services/settingsService";
import { saveSpeakingTaskToDB } from "../../services/mockTestAnswersService";

const norm = (v: any) => { const s = String(v ?? "").trim(); const m = s.match(/\d+/); return m ? m[0] : s.toLowerCase(); };
const parse = (r: any) => { try { return r ? (typeof r === "string" ? JSON.parse(r) : r) : null; } catch { return r; } };
const txt = (...a: any[]) => { for (const x of a) { if (!x) continue; if (typeof x === "string" && x.trim()) return x.trim(); if (typeof x === "object") { for (const k of ["selectionPrompt","speakingPrompt","instructions","prompt","text","content","body"]) if (typeof x[k]==="string"&&x[k].trim()) return x[k].trim(); } } return ""; };
const imgSrc = (i: any) => (!i ? "" : typeof i === "string" ? i : i.data || i.storageUrl || i.url || "");

// Time card
const TimeCard = ({ phase, countdown, recTime, maxRec, onSkip }: any) => {
  const config: any = {
    selection: { label: "Selection Time", sub: "Choose one option", color: "text-blue-600", icon: <Clock className="w-5 h-5" /> },
    prep: { label: "Preparation Time", sub: "Prepare your response", color: "text-blue-600", icon: <Clock className="w-5 h-5" /> },
    recording: { label: "Recording...", sub: "Speak now", color: "text-red-600", icon: <Mic className="w-5 h-5" /> },
    transcribing: { label: "Transcribing...", sub: "Saving audio", color: "text-gray-600", icon: <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> },
    done: { label: "Complete", sub: "Response saved", color: "text-green-600", icon: <CheckCircle className="w-5 h-5" /> }
  };

  const current = config[phase];
  const timeDisplay = phase === "recording" ? `${recTime}s` : `${countdown}s`;

  return (
    <div className="flex justify-center mt-6">
      <div className="bg-white rounded-xl border shadow-sm w-full max-w-md px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-slate-50 border flex items-center justify-center ${phase === 'recording' ? 'animate-pulse' : ''}`}>
            <span className={current.color}>{current.icon}</span>
          </div>
          <div>
            <div className={`font-bold leading-tight ${current.color}`}>{current.label}</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{current.sub}</div>
          </div>
        </div>
        <div className={`text-3xl font-black tabular-nums ${current.color}`}>{timeDisplay}</div>
        {(phase === "selection" || phase === "prep") && (
          <button onClick={onSkip} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors">SKIP</button>
        )}
      </div>
    </div>
  );
};

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


const TASK = 5, TASK_ID = "part5", PREP_TIME = 60;
const TASK_LABEL = "Speaking Task 5: Comparing and Persuading";
const NEXT_ROUTE = "/speaking/6";

export default function S_T5_MockTest({ material: pre, mockSet: preSet, onComplete, onBack }: {
  material?: any; mockSet?: any; onComplete?: () => void; onBack?: () => void;
} = {}) {
  const nav = useNavigate(), loc = useLocation(), par = useParams();
  const setNum = Number(norm((par as any).setKey || (loc.state as any)?.mockSet || preSet || localStorage.getItem("activeMockSet") || "1")) || 1;

  const [loading, setLoading] = useState(!pre);
  const [f, setF] = useState<any>({});
  const [mat, setMat] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiOk, setApiOk] = useState(false);

  const [stage, setStage] = useState<1|2|3>(1);
  const [selected, setSelected] = useState<"A"|"B"|null>(null);
  const [phase, setPhase] = useState<"prep"|"recording"|"transcribing"|"done">("prep");
  const [countdown, setCountdown] = useState(PREP_TIME);
  const [recTime, setRecTime] = useState(0);

  const prepRef = useRef<any>(null);
  const recRef = useRef<MediaRecorder|null>(null);
  const recTimerRef = useRef<any>(null);
  const stopPromiseRef = useRef<Promise<void>|null>(null);
  const stopResolveRef = useRef<(()=>void)|null>(null);

  useEffect(() => { 
    (async () => { 
      try { 
        const s = await getAPISettings(); 
        setApiOk(s?.isConnected||false); 
        setApiKey(s?.openaiKey||s?.openAIKey||s?.apiKey||""); 
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
    const imgs = (Array.isArray(u?.speakingImages)?u.speakingImages:[]).map(imgSrc).filter(Boolean);
    const selectionPrompt = u?.selectionPrompt||u?.speakingPrompt||u?.instructions||u?.prompt||doc?.description||"";
    const comparisonPrompt = u?.comparisonPrompt||"";
    const prompt = selectionPrompt + (comparisonPrompt ? "\n\n" + comparisonPrompt : "");
    
    setF({
      selectionPrompt, comparisonPrompt,
      images: imgs, maxRec: parseInt(u?.recordingTime)||60,
      optionATitle: u?.optionATitle||"Option A", optionADetails: u?.optionADetails||"",
      optionBTitle: u?.optionBTitle||"Option B", optionBDetails: u?.optionBDetails||"",
      optionCTitle: u?.optionCTitle||"", optionCDetails: u?.optionCDetails||"",
      optionCLabel: u?.optionCLabel||"Your Family",
    });

    // Save prompt to localStorage and DB
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
    if (pre) return; let c = true;
    (async () => { 
      try { 
        const all = (await getMaterials()) as any[]; 
        const d = all.find((x: any) => String(x.skill||"").toLowerCase()==="speaking" && x.isMock===true && norm(x.mockSet)===norm(setNum) && (x.taskId===TASK_ID||Number(x.mockOrder)===TASK)); 
        if (c&&d) apply(d); else if(c) setLoading(false); 
      } catch { if (c) setLoading(false); } 
    })();
    return () => { c = false; };
  }, [setNum, pre, apply]);

  const maxRec = f.maxRec || 60;
  const imgs = f.images || [];

  // Stage 2 countdown (selection time)
  useEffect(() => {
    if (stage !== 2) return;
    setCountdown(PREP_TIME); setPhase("prep");
    prepRef.current = setInterval(() => {
      setCountdown(p => { if (p<=1) { clearInterval(prepRef.current); if (!selected) setSelected("A"); setStage(3); return 0; } return p-1; });
    }, 1000);
    return () => clearInterval(prepRef.current);
  }, [stage]);

  // Stage 3 prep → recording
  useEffect(() => {
    if (stage !== 3 || phase !== "prep") return;
    setCountdown(PREP_TIME);
    prepRef.current = setInterval(() => {
      setCountdown(p => { if (p<=1) { clearInterval(prepRef.current); startRecording(); return 0; } return p-1; });
    }, 1000);
    return () => clearInterval(prepRef.current);
  }, [stage, phase]);

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
    setPhase("recording"); setRecTime(0);

    let resolve: () => void;
    stopPromiseRef.current = new Promise<void>(r => { resolve = r; });
    stopResolveRef.current = () => resolve();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
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

  const skipPrep = () => { clearInterval(prepRef.current); if (stage===2) { if (!selected) setSelected("A"); setStage(3); } else { startRecording(); } };

  const handleNext = async () => {
    if (stage===1) { setStage(2); return; }
    if (stage===2) { if (!selected) setSelected("A"); clearInterval(prepRef.current); setStage(3); return; }
    // Stage 3: stop recording, wait for Whisper, then navigate
    if (recRef.current?.state==="recording") recRef.current.stop();
    if (stopPromiseRef.current) await stopPromiseRef.current;
    if (onComplete) onComplete(); else nav(`/mock/${setNum}${NEXT_ROUTE}`, { state: { mockSet: setNum } });
  };

  const handleBack = () => {
    if (stage===3 && phase==="prep") { setStage(2); return; }
    if (stage===2) { setStage(1); clearInterval(prepRef.current); return; }
    if (onBack) onBack(); else nav(-1);
  };

  const headerRight = stage===2
    ? <span className="text-xs text-white/80">Selection: <b>60s</b></span>
    : stage===3
    ? <span className="text-xs text-white/80">Preparation: <b>60s</b> &nbsp; Recording: <b>{maxRec}s</b></span>
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-6">
      <PracticeFrame headerTitle={TASK_LABEL} rightStatus={headerRight}
        onNext={handleNext} onBack={handleBack} nextLabel={phase==="transcribing"?"Saving…":"NEXT"}>
        <div className="p-6 space-y-6">

          {stage === 1 && (
            <div className="bg-white rounded-xl border shadow-sm p-8">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Mic className="w-5 h-5 text-blue-600" /> Instructions</h3>
              <div className="text-gray-700 space-y-3 ml-1">
                <p>This task is made up of <strong>three</strong> parts:</p>
                <div className="ml-4 space-y-1"><p>1. Choose an option</p><p>2. Preparation time</p><p>3. Speaking</p></div>
                <p className="mt-4">Click <strong>NEXT</strong> to continue.</p>
              </div>
            </div>
          )}

          {stage === 2 && (
            <>
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Mic className="w-5 h-5 text-blue-600" /> Choose an Option</h3>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-5">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{f.selectionPrompt||"Choose one of the two options below."}</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div onClick={()=>setSelected("A")} className={`rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${selected==="A"?"border-blue-500 bg-blue-50 shadow-lg":"border-gray-200 hover:border-blue-300"}`}>
                    {imgs[0]&&<img src={imgs[0]} alt="Option A" className="w-full h-48 object-cover"/>}
                    <div className="p-4"><h4 className="font-bold text-lg mb-2">{f.optionATitle}</h4><div className="text-sm text-gray-600 whitespace-pre-wrap">{f.optionADetails||"—"}</div></div>
                    {selected==="A"&&<div className="bg-blue-500 text-white text-center py-1.5 text-sm font-medium">✓ Selected</div>}
                  </div>
                  <div onClick={()=>setSelected("B")} className={`rounded-xl border-2 cursor-pointer transition-all overflow-hidden ${selected==="B"?"border-green-500 bg-green-50 shadow-lg":"border-gray-200 hover:border-green-300"}`}>
                    {imgs[1]&&<img src={imgs[1]} alt="Option B" className="w-full h-48 object-cover"/>}
                    <div className="p-4"><h4 className="font-bold text-lg mb-2">{f.optionBTitle}</h4><div className="text-sm text-gray-600 whitespace-pre-wrap">{f.optionBDetails||"—"}</div></div>
                    {selected==="B"&&<div className="bg-green-500 text-white text-center py-1.5 text-sm font-medium">✓ Selected</div>}
                  </div>
                </div>
              </div>
<div className="flex justify-center">
  <div className="bg-slate-50 rounded-xl border shadow-sm w-full max-w-lg px-6 py-4">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
          <Clock className="w-5 h-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 leading-tight">Selection Time</div>
          <div className="text-xs text-gray-500 truncate">Choose one option to continue</div>
        </div>
      </div>

      <div className="text-4xl font-bold text-blue-600 leading-none tabular-nums">
        {countdown}
      </div>

      <button
        onClick={skipPrep}
        className="text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
      >
        Skip & Continue
      </button>
    </div>
  </div>
</div>


            </>
          )}

          {stage === 3 && (
            <>
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Mic className="w-5 h-5 text-blue-600" /> Speaking Prompt</h3>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-5">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{f.comparisonPrompt||"Persuade that your choice is more suitable by comparing the two."}</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-yellow-50 rounded-xl border border-yellow-200 overflow-hidden">
                    <div className="bg-yellow-100 px-4 py-2 text-center"><span className="font-medium text-yellow-800">{f.optionCLabel||"Your Family"}'s Choice</span></div>
                    {(imgs[2]||imgs[selected==="A"?1:0])&&<img src={imgs[2]||imgs[selected==="A"?1:0]} alt="Their choice" className="w-full h-40 object-cover"/>}
                    <div className="p-4"><h4 className="font-bold mb-2">{f.optionCTitle||(selected==="A"?f.optionBTitle:f.optionATitle)}</h4><div className="text-sm text-gray-600 whitespace-pre-wrap">{f.optionCDetails||(selected==="A"?f.optionBDetails:f.optionADetails)}</div></div>
                  </div>
                  <div className="bg-green-50 rounded-xl border border-green-200 overflow-hidden">
                    <div className="bg-green-100 px-4 py-2 text-center"><span className="font-medium text-green-800">Your Choice</span></div>
                    {imgs[selected==="A"?0:1]&&<img src={imgs[selected==="A"?0:1]} alt="Your choice" className="w-full h-40 object-cover"/>}
                    <div className="p-4"><h4 className="font-bold mb-2">{selected==="A"?f.optionATitle:f.optionBTitle}</h4><div className="text-sm text-gray-600 whitespace-pre-wrap">{selected==="A"?f.optionADetails:f.optionBDetails}</div></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center mt-6">
                <div className="bg-slate-50 rounded-xl border shadow-sm w-full max-w-lg px-6 py-4">
                  {phase === "prep" ? (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 leading-tight">Preparation Time</div>
                          <div className="text-xs text-gray-500 truncate">Read the prompt and prepare your response</div>
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-blue-600 leading-none tabular-nums">
                        {countdown}
                      </div>
                      <button onClick={skipPrep} className="text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap">
                        Skip & Start Recording
                      </button>
                    </div>
                  ) : phase === "recording" ? (
                    <div className="flex items-center justify-between gap-4">
                       <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center animate-pulse">
                          <Mic className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-red-600 leading-tight">Recording...</div>
                          <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div className="bg-red-500 h-full transition-all" style={{ width: `${(recTime / maxRec) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-4xl font-bold text-red-600 leading-none tabular-nums">
                        {recTime}s
                      </div>
                      <div className="text-xs text-gray-400 font-medium">Max: {maxRec}s</div>
                    </div>
                  ) : phase === "transcribing" ? (
                    <div className="flex items-center justify-center gap-4 py-1">
                      <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold text-gray-700">Transcribing your response...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                          <div className="font-semibold text-gray-900 leading-tight">Recording Complete</div>
                          <div className="text-xs text-gray-500">Your response has been saved</div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">READY</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </PracticeFrame>
    </div>
  );
}
