// src/pages/Mock/speakingMockHelpers.tsx
// Shared helpers and components for Speaking Mock Tests
// Independent practice tool — not affiliated with any official testing organization.

import React, { useEffect, useState, useRef } from "react";
import { Mic, FileText, Image as ImageIcon, Clock, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { getMaterials } from "../../services/materialsService";
import { getAPISettings } from "../../services/settingsService";

/* ───────── types ───────── */
export type UploadedFiles = Record<string, any>;
export type MaterialDoc = {
  id: string; title?: string; description?: string; skill?: string;
  taskId?: string; isMock?: boolean; mockSet?: number | null;
  mockOrder?: number | null; uploadedFiles?: UploadedFiles | string;
};

/* ───────── pure helpers ───────── */
export function normalizeMockSet(v: any): string {
  const s = String(v ?? "").trim();
  const m = s.match(/\d+/);
  return m ? m[0] : s.toLowerCase();
}

export function parseUF(raw: any): any {
  try {
    if (!raw) return null;
    if (typeof raw === "string") return JSON.parse(raw);
    return raw;
  } catch { return raw ?? null; }
}

export function extractText(...candidates: any[]): string {
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "object") {
      const v = c.text ?? c.content ?? c.data ?? c.value ?? c.body ?? c.instructions ?? c.prompt ?? c.speakingPrompt;
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return "";
}

export function getImageSrc(img: any): string {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (typeof img === "object") return img.data || img.storageUrl || img.url || "";
  return "";
}

export function countWords(s: string) {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

/* ───────── PracticeFrame shell ───────── */
export function PracticeFrame({ headerTitle, onNext, onBack, nextLabel = "NEXT", children }: {
  headerTitle: string; onNext?: () => void; onBack?: () => void;
  nextLabel?: string; children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="mx-auto w-[min(1080px,95vw)] bg-white border border-gray-300 shadow-sm">
        <div className="h-10 px-4 flex items-center justify-between bg-gradient-to-r from-blue-600 via-sky-600 to-blue-500 border-b border-blue-700">
          <div className="text-sm font-semibold text-white">{headerTitle}</div>
          <div className="flex items-center gap-3">
            {onNext && (
              <button onClick={onNext}
                className="h-7 px-3 text-xs font-semibold rounded border bg-white border-white text-blue-700 hover:bg-blue-50">
                {nextLabel}
              </button>
            )}
          </div>
        </div>
        <div className="min-h-[620px]">{children}</div>
        <div className="h-11 px-4 flex items-center justify-between bg-slate-100 border-t border-slate-300">
          <span className="text-[10px] text-slate-500">Independent Practice Tool • Not affiliated with any official testing organization</span>
          {onBack ? (
            <button onClick={onBack} className="h-7 px-4 text-xs font-semibold rounded bg-slate-600 text-white hover:bg-slate-700">BACK</button>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}

/* ───────── useApiSettings hook ───────── */
export function useApiSettings() {
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [isAPIConnected, setIsAPIConnected] = useState(false);
  const [openAIKey, setOpenAIKey] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await getAPISettings();
        setApiSettings(s);
        setIsAPIConnected(s?.isConnected || false);
        setOpenAIKey(s?.openaiKey || s?.apiKey || "");
      } catch { /* ignore */ }
    })();
  }, []);

  return { apiSettings, isAPIConnected, openAIKey };
}

/* ───────── useSpeakingMaterial hook ───────── */
export function useSpeakingMaterial(taskNumber: number, taskId: string, setNumber: number, prefetchedMaterial?: MaterialDoc | null) {
  const [loading, setLoading] = useState(() => !prefetchedMaterial);
  const [material, setMaterial] = useState<MaterialDoc | null>(null);
  const [files, setFiles] = useState<any>({});

  const applyMaterial = (doc: MaterialDoc | null) => {
    setMaterial(doc);
    const uf = parseUF(doc?.uploadedFiles);
    setFiles({
      speakingPrompt: extractText(uf?.speakingPrompt, uf?.instructions, uf?.prompt, doc?.description),
      speakingImages: (Array.isArray(uf?.speakingImages) ? uf.speakingImages : []).map(getImageSrc).filter(Boolean),
      recordingTime: uf?.recordingTime || "90",
      speakingSampleBasic: uf?.speakingSampleBasic || "",
      speakingSampleGood: uf?.speakingSampleGood || "",
      speakingSampleExcellent: uf?.speakingSampleExcellent || "",
      // Part 5 specific fields
      selectionPrompt: uf?.selectionPrompt || "",
      comparisonPrompt: uf?.comparisonPrompt || "",
      optionATitle: uf?.optionATitle || "",
      optionADetails: uf?.optionADetails || "",
      optionBTitle: uf?.optionBTitle || "",
      optionBDetails: uf?.optionBDetails || "",
      optionCTitle: uf?.optionCTitle || "",
      optionCDetails: uf?.optionCDetails || "",
      optionCLabel: uf?.optionCLabel || "Your Family",
    });
    setLoading(false);
  };

  useEffect(() => { if (prefetchedMaterial) applyMaterial(prefetchedMaterial); }, [prefetchedMaterial]);

  useEffect(() => {
    if (prefetchedMaterial) return;
    let mounted = true;
    (async () => {
      try {
        const all = (await getMaterials()) as any[];
        const doc = all.find((m: any) =>
          String(m.skill || "").toLowerCase() === "speaking" && m.isMock === true &&
          normalizeMockSet(m.mockSet) === normalizeMockSet(setNumber) &&
          (m.taskId === taskId || Number(m.mockOrder) === taskNumber)
        ) || null;
        if (mounted) applyMaterial(doc);
      } catch (e) { console.error(`Failed to load Speaking Task ${taskNumber} material:`, e); if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [setNumber, prefetchedMaterial, taskId, taskNumber]);

  return { loading, material, files };
}

/* ───────── useRecorder hook ───────── */
export function useRecorder(maxTimeSec: number, isAPIConnected: boolean, openAIKey: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
      });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        stream.getTracks().forEach(t => t.stop());
        if (!chunks.length) { alert("No audio recorded."); setIsRecording(false); return; }
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 1000) { alert("Recording too short."); setIsRecording(false); return; }
        setIsRecording(false);
        setRemainingAttempts(p => p - 1);
        if (isAPIConnected && openAIKey) {
          setIsTranscribing(true);
          try {
            const fd = new FormData();
            fd.append("file", blob, `recording.${mimeType.includes("webm") ? "webm" : "mp4"}`);
            fd.append("model", "whisper-1");
            fd.append("language", "en");
            const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
              method: "POST", headers: { Authorization: `Bearer ${openAIKey}` }, body: fd
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Transcription failed"); }
            const data = await res.json();
            if (data.text) setTranscript(data.text);
            else alert("No speech detected.");
          } catch (e: any) { console.error("Transcription error:", e); alert("Transcription failed: " + e.message); }
          finally { setIsTranscribing(false); }
        } else {
          alert("API not connected. Type your transcript manually or connect the API in admin.");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxTimeSec - 1) {
            clearInterval(timerRef.current!); timerRef.current = null;
            if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
            return maxTimeSec;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) { console.error("Microphone error:", err); alert("Could not access microphone."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const toggleRecording = () => { isRecording ? stopRecording() : (remainingAttempts > 0 && startRecording()); };
  const reRecord = () => { setTranscript(""); };

  return { isRecording, recordingTime, isTranscribing, remainingAttempts, transcript, setTranscript, toggleRecording, reRecord };
}

/* ───────── RecordingPanel component ───────── */
export function RecordingPanel({ maxTime, isAPIConnected, recorder }: {
  maxTime: number; isAPIConnected: boolean;
  recorder: ReturnType<typeof useRecorder>;
}) {
  const { isRecording, recordingTime, isTranscribing, remainingAttempts, transcript, toggleRecording } = recorder;
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 shadow-sm p-6">
      <h3 className="font-bold text-lg text-center mb-5 text-blue-900">Record Your Response</h3>
      <div className="flex flex-col items-center mb-5">
        {!transcript ? (
          <>
            <button onClick={toggleRecording}
              disabled={remainingAttempts === 0 || isTranscribing}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : remainingAttempts > 0 ? "bg-red-500 hover:bg-red-600" : "bg-gray-400 cursor-not-allowed"
              }`}>
              {isTranscribing
                ? <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                : <Mic className="w-9 h-9 text-white" />}
            </button>
            <p className="text-blue-700 font-medium mt-3 text-sm">
              {isTranscribing ? "Transcribing…" : isRecording ? `Recording… ${recordingTime}s / ${maxTime}s` : "Click to Record"}
            </p>
            {isRecording && (
              <div className="w-full mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
                <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${(recordingTime / maxTime) * 100}%` }} />
              </div>
            )}
          </>
        ) : (
          <div className="w-full text-center">
            <div className="bg-green-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-green-700 font-medium text-sm">Recording Complete!</p>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-gray-600 mb-2">
        <strong>{remainingAttempts}</strong> recording attempt{remainingAttempts !== 1 ? "s" : ""} remaining
      </p>
      {!isAPIConnected && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
          API not connected — type your response manually below.
        </p>
      )}
    </div>
  );
}

/* ───────── TranscriptPanel component ───────── */
export function TranscriptPanel({ recorder, tip }: {
  recorder: ReturnType<typeof useRecorder>; tip: string;
}) {
  const { transcript, setTranscript, reRecord } = recorder;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Your Transcript</div>
            <div className="text-xs text-gray-500">Edit or type your response below</div>
          </div>
        </div>
        {transcript && (
          <button onClick={reRecord} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Re-record</button>
        )}
      </div>
      <div className="p-5">
        <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
          placeholder="Your spoken response will appear here after recording, or type directly…"
          className="w-full min-h-[250px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-blue-200 resize-y" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">{countWords(transcript)} words</span>
          <span className="text-xs text-gray-500">{tip}</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── PromptPanel component ───────── */
export function PromptPanel({ loading, files, instruction, subText }: {
  loading: boolean; files: any; instruction: string; subText: string;
}) {
  const [showSamples, setShowSamples] = useState<string | null>(null);
  const maxTime = parseInt(files.recordingTime) || 90;
  const hasSamples = files.speakingSampleBasic || files.speakingSampleGood || files.speakingSampleExcellent;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Mic className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{instruction}</div>
            <div className="text-xs text-gray-500">{subText}</div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-5 text-sm leading-6 text-gray-800 whitespace-pre-wrap">
            {loading ? <span className="text-gray-500">Loading…</span>
              : files.speakingPrompt ? files.speakingPrompt
              : <span className="text-gray-500">No prompt loaded.</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Recording time: <strong>{maxTime}s</strong></span>
          </div>
        </div>
      </div>

      {files.speakingImages?.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
            <ImageIcon className="w-4 h-4" /> <span>Context Image{files.speakingImages.length > 1 ? "s" : ""}</span>
          </div>
          <div className={`grid gap-3 ${files.speakingImages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {files.speakingImages.map((src: string, i: number) => (
              <img key={i} src={src} alt={`Context ${i + 1}`} className="w-full rounded-lg border border-gray-200" />
            ))}
          </div>
        </div>
      )}

      {hasSamples && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sample Responses</h4>
          {[
            { key: "basic", label: "Basic", bg: "bg-orange-50", hover: "hover:bg-orange-100", text: "text-orange-800", content: files.speakingSampleBasic },
            { key: "good", label: "Good", bg: "bg-blue-50", hover: "hover:bg-blue-100", text: "text-blue-800", content: files.speakingSampleGood },
            { key: "excellent", label: "Excellent", bg: "bg-green-50", hover: "hover:bg-green-100", text: "text-green-800", content: files.speakingSampleExcellent },
          ].filter(s => s.content).map(s => (
            <div key={s.key} className="border rounded-lg overflow-hidden">
              <button onClick={() => setShowSamples(showSamples === s.key ? null : s.key)}
                className={`w-full flex items-center justify-between p-3 ${s.bg} ${s.hover} text-left`}>
                <span className={`font-medium ${s.text} text-sm`}>Sample ({s.label})</span>
                {showSamples === s.key ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showSamples === s.key && (
                <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap border-t bg-gray-50/50">{s.content}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── saveTranscriptToStorage helper ───────── */
export async function saveTranscriptToStorage(
  taskNumber: number, setNumber: number, materialId: string, prompt: string, transcript: string
) {
  localStorage.setItem("activeMockSet", String(setNumber));
  localStorage.setItem(`mockSpeaking_T${taskNumber}_materialId_set${setNumber}`, materialId || "");
  localStorage.setItem(`mockSpeaking_T${taskNumber}_prompt_set${setNumber}`, prompt || "");
  localStorage.setItem(`mockSpeaking_T${taskNumber}_transcript_set${setNumber}`, transcript || "");
  try {
    const mod: any = await import("../../services/mockTestAnswersService");
    const fn = mod.saveSpeakingTaskTranscriptDB || mod.saveSpeakingTranscriptDB || mod.saveMockSpeakingTranscriptDB;
    if (typeof fn === "function") await fn({
      mockSet: setNumber, task: taskNumber, materialId: materialId || null,
      prompt, transcript, createdAt: new Date().toISOString()
    });
  } catch { /* ignore */ }
}
