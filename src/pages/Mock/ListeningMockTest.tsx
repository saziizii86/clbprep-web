import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Info,
} from "lucide-react";

type UploadedFile = {
  name?: string;
  storageUrl?: string; // Appwrite "view" URL that you store
  data?: string;       // base64 (if small file)
  type?: string;
};

type ListeningScenario = {
  skill?: string;            // "listening"
  title?: string;            // scenario title
  taskId?: string;           // "part1"..."part6"
  taskName?: string;         // "News Item", "Discussion", etc.
  taskType?: string;         // sometimes "part4" or "task4" in your code
  uploadedFiles?: {
    instructions?: string;

    // Common in your admin upload structure:
    questionAudios?: UploadedFile[];
    questionTranscripts?: (string | UploadedFile)[]; // optional
    questionAnswers?: string[][]; // options per question
  };
};

type Props = {
  scenario: ListeningScenario;
  onBack: () => void;
  onComplete?: (results: any) => void;
};

function getFileUrl(f?: UploadedFile | null): string | null {
  if (!f) return null;
  if (f.storageUrl) return f.storageUrl;
  if (typeof f.data === "string") return f.data;
  return null;
}

function safeTaskLabel(s: ListeningScenario) {
  const id = (s.taskId || "").toLowerCase();
  const name = (s.taskName || "").trim();
  if (name) return name;
  if (id === "part1") return "Problem Solving";
  if (id === "part2") return "Daily Life Conversation";
  if (id === "part3") return "Information";
  if (id === "part4") return "News Item";
  if (id === "part5") return "Discussion";
  if (id === "part6") return "Viewpoints";
  return "Listening";
}

export default function ListeningMockTest({ scenario, onBack, onComplete }: Props) {
  const [screen, setScreen] = useState<"intro" | "test" | "review">("intro");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);

  const files = scenario.uploadedFiles || {};
  const questionAudios = files.questionAudios || [];
  const questionAnswers = files.questionAnswers || [];

  const totalQuestions = useMemo(() => {
    const byAudio = questionAudios.length;
    const byAnswers = questionAnswers.length;
    const max = Math.max(byAudio, byAnswers);
    // fallback if nothing uploaded yet
    return max > 0 ? max : 8;
  }, [questionAudios.length, questionAnswers.length]);

  const currentAudioUrl = useMemo(() => {
    const f = questionAudios[qIndex];
    return getFileUrl(f) || null;
  }, [questionAudios, qIndex]);

  const currentOptions = useMemo(() => {
    const opts = questionAnswers[qIndex];
    if (opts && Array.isArray(opts) && opts.filter(Boolean).length > 0) return opts;
    // default placeholder options if admin hasn't uploaded answers yet
    return ["Option A", "Option B", "Option C", "Option D"];
  }, [questionAnswers, qIndex]);

  const defaultIntroBullets = useMemo(() => {
    // IMPORTANT: This is intentionally original wording (not copied).
    return [
      "In the official exam, you typically can’t return to earlier pages after moving on. In this practice version, you can review and change answers.",
      "Use this mock to learn the flow and timing. It’s a practice tool — not an official test.",
      "The order and style of question types in the real exam may vary from this mock.",
      "Some official exams include extra experimental questions; your practice set may be shorter.",
    ];
  }, []);

  const introBullets = useMemo(() => {
    const custom = (files.instructions || "").trim();
    if (!custom) return defaultIntroBullets;
    // If you saved a paragraph in DB, split into bullet-ish lines safely:
    const lines = custom
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    return lines.length ? lines : defaultIntroBullets;
  }, [files.instructions, defaultIntroBullets]);

  // Keep audio UI in sync
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => {
      if (!el.duration || Number.isNaN(el.duration)) return;
      setProgress(el.currentTime / el.duration);
      setDuration(el.duration);
    };
    const onEnd = () => setIsPlaying(false);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  // When question changes, stop audio
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [qIndex]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (isPlaying) {
        el.pause();
        setIsPlaying(false);
      } else {
        await el.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error("Audio play error:", e);
      setIsPlaying(false);
    }
  };

  const seekTo = (pct: number) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const clamped = Math.max(0, Math.min(1, pct));
    el.currentTime = clamped * duration;
    setProgress(clamped);
  };

  const goNext = () => {
    if (screen === "intro") {
      setScreen("test");
      return;
    }
    if (screen === "test") {
      if (qIndex < totalQuestions - 1) setQIndex((v) => v + 1);
      else setScreen("review");
      return;
    }
    if (screen === "review") {
      const result = {
        skill: "listening",
        taskId: scenario.taskId,
        taskName: safeTaskLabel(scenario),
        totalQuestions,
        answers,
        completedAt: new Date().toISOString(),
      };
      onComplete?.(result);
      onBack();
    }
  };

  const goBack = () => {
    if (screen === "intro") {
      onBack();
      return;
    }
    if (screen === "test") {
      if (qIndex > 0) setQIndex((v) => v - 1);
      else setScreen("intro");
      return;
    }
    if (screen === "review") {
      setScreen("test");
      return;
    }
  };

  const headerTitle = `Practice Test A - Listening Test`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{headerTitle}</span>
            <span className="text-xs text-slate-500">• {safeTaskLabel(scenario)}</span>
          </div>

          <button
            onClick={goNext}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            NEXT
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-6">
        {screen === "intro" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-800">Listening Test Instructions</h2>
            </div>

            <ul className="space-y-3 text-slate-700">
              {introBullets.map((b, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <p className="leading-relaxed">{b}</p>
                </li>
              ))}
            </ul>

            <div className="mt-6 text-xs text-slate-500">
              Tip: You can store your own instruction text in the database (uploadedFiles.instructions) and it will show here.
            </div>
          </div>
        )}

        {screen === "test" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            {/* Question header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-sm text-slate-500">
                  Question <span className="font-semibold text-slate-700">{qIndex + 1}</span> of{" "}
                  <span className="font-semibold text-slate-700">{totalQuestions}</span>
                </div>
                <div className="text-base font-bold text-slate-800 mt-1">
                  Select the best answer.
                </div>
              </div>

              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-md border hover:bg-slate-50"
              >
                {showTranscript ? "Hide transcript" : "Show transcript"}
              </button>
            </div>

            {/* Audio */}
            <div className="rounded-lg border bg-slate-50 p-4 mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                <div className="flex-1">
                  <div
                    className="h-2 rounded-full bg-slate-200 cursor-pointer"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      seekTo(pct);
                    }}
                  >
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>{Math.round(progress * 100)}%</span>
                    <span>{duration ? `${Math.round(duration)}s` : ""}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMuted((m) => !m);
                    if (audioRef.current) audioRef.current.muted = !muted;
                  }}
                  className="w-10 h-10 rounded-full border bg-white flex items-center justify-center hover:bg-slate-50 transition"
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Hidden native audio element */}
              {currentAudioUrl ? (
                <audio ref={audioRef} src={currentAudioUrl} preload="metadata" />
              ) : (
                <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
                  No audio file found for this question yet. Upload questionAudios in Admin for this task.
                </div>
              )}
            </div>

            {/* Transcript (optional) */}
            {showTranscript && (
              <div className="rounded-lg border p-4 mb-4 bg-white">
                <div className="text-xs font-semibold text-slate-600 mb-2">Transcript (practice mode)</div>
                <div className="text-sm text-slate-700 leading-relaxed">
                  {/* If you later store transcript text per question, show it here. */}
                  Transcript not provided for this question.
                </div>
              </div>
            )}

            {/* Answers */}
            <div className="rounded-lg border p-4">
              <div className="text-sm font-semibold text-slate-700 mb-3">Answer</div>

              <select
                value={answers[qIndex] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [qIndex]: e.target.value }))}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="" disabled>
                  Choose an option…
                </option>
                {currentOptions.map((opt, idx) => (
                  <option key={`${idx}-${opt}`} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <div className="mt-3 text-xs text-slate-500">
                Your selection is saved automatically.
              </div>
            </div>
          </div>
        )}

        {screen === "review" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="text-lg font-bold text-slate-800">Review</div>
            <div className="text-sm text-slate-600 mt-1">
              You answered {Object.keys(answers).length} of {totalQuestions} questions.
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="text-xs text-slate-500">Question {i + 1}</div>
                  <div className="text-sm font-semibold text-slate-800 mt-1">
                    {answers[i] ? answers[i] : <span className="text-amber-700">Not answered</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-xs text-slate-500">
              Click <span className="font-semibold">NEXT</span> to finish (this will call onComplete and return).
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={goBack}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            BACK
          </button>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Mock UI (original design) • {safeTaskLabel(scenario)}
          </div>

          <button
            onClick={goNext}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2"
          >
            {screen === "review" ? "FINISH" : "NEXT"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
