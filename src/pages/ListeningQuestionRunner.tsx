import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Pause,
  Play,
  Volume2,
} from "lucide-react";
import { getMaterials } from "../services/materialsService";

type UploadedFile = {
  name?: string;
  size?: string;
  type?: string;
  data?: string; // base64 data URL
};

type Material = {
  id: string;
  title: string;
  skill: string;
  task: string;
  taskId: string;
  uploadedFiles?: {
    questionAudios?: UploadedFile[];
    questionAnswers?: string[][];
    questionTranscripts?: UploadedFile[];
  };
};

function decodeTextFromDataUrl(dataUrl?: string) {
  if (!dataUrl) return "";
  try {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return "";
    return decodeURIComponent(
      escape(window.atob(base64))
    );
  } catch {
    return "";
  }
}

export default function ListeningQuestionRunner() {
  const { skill, taskId, materialId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);

  const startAt = (location.state as any)?.startAt ?? 0;

  const [qIndex, setQIndex] = useState<number>(startAt);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getMaterials();

        const found = (data || [])
          .map((doc: any) => ({
            id: doc.$id,
            title: doc.title,
            skill: doc.skill,
            task: doc.task,
            taskId: doc.taskId,
            uploadedFiles: doc.uploadedFiles
              ? JSON.parse(doc.uploadedFiles)
              : {},
          }))
          .find((m: Material) => m.id === materialId);

        setMaterial(found || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [materialId]);

  const questionAudios = material?.uploadedFiles?.questionAudios || [];
  const questionAnswers = material?.uploadedFiles?.questionAnswers || [];
  const questionTranscripts = material?.uploadedFiles?.questionTranscripts || [];

  const totalQuestions = useMemo(() => {
    return Math.max(questionAudios.length, questionAnswers.length, 0);
  }, [questionAudios.length, questionAnswers.length]);

  const currentAudio = questionAudios[qIndex];
  const currentAnswerSet = questionAnswers[qIndex] || [];
  const options = currentAnswerSet.slice(0, 4).filter(Boolean);

  const transcriptText = decodeTextFromDataUrl(questionTranscripts[qIndex]?.data);

  const audioSrc = currentAudio?.data || "";

  useEffect(() => {
    // reset audio UI whenever question changes
    setIsPlaying(false);
    setProgress(0);
    setDuration(1);
    setSelected(answers[qIndex] ?? null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [qIndex]);

  const onPlayPause = async () => {
    if (!audioRef.current) return;

    if (!audioSrc) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime || 0);
  };

  const onLoadedMeta = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 1);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const submitAndNext = () => {
    if (!selected) return;

    setAnswers((prev) => ({ ...prev, [qIndex]: selected }));

    if (qIndex < totalQuestions - 1) {
      setQIndex((v) => v + 1);
    } else {
      // finished
      navigate(`/practice/${skill}/${taskId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-600">
        Loading...
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-600">
        Scenario not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/practice/${skill}/${taskId}`)}
              className="h-10 w-10 rounded-xl border bg-white hover:bg-slate-50 grid place-items-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="text-sm font-semibold text-slate-900">
                {material.title}
              </div>
              <div className="text-xs text-slate-500">
                Question {qIndex + 1} of {Math.max(totalQuestions, 1)}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Progress:{" "}
            <span className="font-semibold text-slate-900">
              {Object.keys(answers).length}/{totalQuestions}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: audio */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Listen to the question
              </div>

              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="text-sm px-3 py-2 rounded-xl border hover:bg-slate-50"
              >
                {showTranscript ? "Hide transcript" : "Show transcript"}
              </button>
            </div>

            <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={onPlayPause}
                  className="h-11 w-11 rounded-xl bg-blue-600 text-white grid place-items-center hover:bg-blue-700 transition"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    value={progress}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      if (audioRef.current) audioRef.current.currentTime = t;
                      setProgress(t);
                    }}
                    className="w-full"
                  />
                </div>

                <div className="h-11 w-11 rounded-xl border bg-white grid place-items-center">
                  <Volume2 className="w-5 h-5 text-slate-700" />
                </div>
              </div>

              {/* real audio element */}
              <audio
                ref={audioRef}
                src={audioSrc}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMeta}
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            {showTranscript && (
              <div className="mt-4 rounded-2xl border bg-white p-4 text-sm text-slate-700 leading-relaxed">
                {transcriptText ? transcriptText : "No transcript available."}
              </div>
            )}

            {!audioSrc && (
              <div className="mt-4 text-sm text-red-500">
                ⚠ No question audio uploaded for this question.
              </div>
            )}
          </div>

          {/* RIGHT: options */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="text-base font-semibold text-slate-900">
              Choose the best answer
            </div>

            <div className="mt-4 space-y-3">
              {options.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No answer options uploaded for this question.
                </div>
              ) : (
                options.map((opt, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition
                    ${
                      selected === opt
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      checked={selected === opt}
                      onChange={() => setSelected(opt)}
                      className="mt-1"
                    />
                    <div className="text-sm text-slate-800">{opt}</div>
                  </label>
                ))
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Tip: play audio once like the real exam.
              </div>

              <button
                onClick={submitAndNext}
                disabled={!selected || options.length === 0}
                className={`px-5 py-3 rounded-xl font-semibold inline-flex items-center gap-2 transition
                ${
                  selected
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                {qIndex < totalQuestions - 1 ? "Submit & Next" : "Finish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
