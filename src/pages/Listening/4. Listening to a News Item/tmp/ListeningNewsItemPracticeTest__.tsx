// src/pages/Listening/4. Listening to a News Item/ListeningNewsItemPracticeTest.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Info,
  Headphones,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  X,
  Volume2,
} from "lucide-react";

import { saveListeningResult, calculateCelpipScore } from '../../../services/userResultsService';

// ===================== Types =====================
interface QuestionOption {
  id: string; // a/b/c/d
  text?: string;
}

interface Question {
  id: string;
  questionText: string;
  type: string; // "multiple-choice"
  options: QuestionOption[];
  correctAnswer: string; // a/b/c/d
}

interface Section {
  id: string;
  title: string;
  audioUrl?: string;
  transcript?: string;
  questions: Question[];
}

interface Scenario {
  id: string;
  title: string;
  skill: string;
  taskName: string;
  taskType: string;
  totalTime: number;
  instructions?: string;
  contextDescription?: string;
  sections: Section[];
  uploadedFiles?: any;
}

interface TestResults {
  scenarioId: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  timeSpent: number;
}

interface Props {
  scenario: Scenario;
  onBack: () => void;
  onComplete: (results: TestResults) => void;
}

type Phase = "instructions" | "media" | "question" | "results" | "answerKey";

// ===================== Component =====================
const ListeningNewsItemPracticeTest: React.FC<Props> = ({ scenario, onBack, onComplete }) => {
  const [phase, setPhase] = useState<Phase>("instructions");

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes like CELPIP Part 4
  const [testStartTime, setTestStartTime] = useState<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);

  const [mediaProgress, setMediaProgress] = useState(0);
  const [mediaCurrentTime, setMediaCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);


  const [testResults, setTestResults] = useState<TestResults | null>(null);

  // ✅ NEW: Save status states
  const [isSaving, setIsSaving] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  // ✅ Get Audio URL (from scenario section or uploaded files)
  const audioUrl =
    scenario.sections?.[0]?.audioUrl ||
    scenario.uploadedFiles?.sectionAudios?.[0]?.storageUrl ||
    scenario.uploadedFiles?.sectionAudios?.[0]?.data ||
    null;

  // ✅ Get all questions (Part 4 is typically one section)
  const allQuestions = useMemo(() => {
    return scenario.sections?.flatMap((s) => s.questions) || [];
  }, [scenario.sections]);

  const totalQuestions = allQuestions.length || 5;

  const answeredCount = allQuestions.filter((q) => answers[q.id]).length;
  const progressPercentage =
    phase === "question" ? (answeredCount / totalQuestions) * 100 : 0;

  // ✅ Instructions text (from DB)
  const instructionsText =
    scenario.instructions ||
    scenario.contextDescription ||
    "You will hear a news item about a unique medical procedure.";

  // ===================== Timer =====================
  useEffect(() => {
    if (phase !== "question") return;
    if (timeLeft <= 0) return;

    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase === "question" && !testStartTime) {
      setTestStartTime(Date.now());
    }
  }, [phase, testStartTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ===================== Media Controls =====================
  const handleLoadedMetadata = () => {
    if (audioRef.current?.duration) {
      setMediaDuration(Math.floor(audioRef.current.duration));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    if (isSeeking) return; // ✅ don't fight the slider while user is dragging

    const duration = audioRef.current.duration;
    if (duration && isFinite(duration)) {
      setMediaProgress((audioRef.current.currentTime / duration) * 100);
      setMediaCurrentTime(audioRef.current.currentTime);
    }
  };


  const handleMediaEnded = () => {
    setIsPlaying(false);
    setHasPlayedAudio(true);
    setTimeout(() => setPhase("question"), 400);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (hasPlayedAudio) return; // ✅ only once like CELPIP

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };


  const handleSeek = (pct: number) => {
    if (!audioRef.current) return;

    const duration = audioRef.current.duration || mediaDuration;
    if (!duration || !isFinite(duration)) return;

    const clamped = Math.max(0, Math.min(100, pct));
    const newTime = (clamped / 100) * duration;

    audioRef.current.currentTime = newTime;
    setMediaCurrentTime(newTime);
    setMediaProgress(clamped);
  };





  // ===================== Answer Logic =====================
  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));
  };

  // ===================== Navigation =====================
  const handleNext = () => {
    if (phase === "instructions") {
      setPhase("media");

      // ✅ Auto play audio after Continue
      setTimeout(() => {
        if (!audioRef.current || !audioUrl) return;

        audioRef.current.currentTime = 0;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Autoplay blocked:", err);
          });
      }, 150);
      return;
    }

    if (phase === "media") {
      // Skip media
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      setHasPlayedAudio(true);
      setPhase("question");
      return;
    }

    if (phase === "question") {
      handleComplete();
      return;
    }
  };

  const handleBack = () => {
    if (phase === "media") {
      setPhase("instructions");
      setHasPlayedAudio(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    if (phase === "question") {
      // Back to media screen (optional)
      setPhase("media");
      return;
    }

    if (phase === "answerKey") {
      setPhase("results");
      return;
    }
  };

  // ✅ UPDATED: handleComplete with DB save
  const handleComplete = async () => {
    let correctCount = 0;
    allQuestions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) correctCount++;
    });

    const timeSpent = Math.floor((Date.now() - (testStartTime ?? Date.now())) / 1000);
    const celpipScore = calculateCelpipScore(correctCount, totalQuestions);

    const results: TestResults = {
      scenarioId: scenario.id,
      answers,
      score: correctCount,
      totalQuestions,
      timeSpent,
    };

    setTestResults(results);
    setPhase("results");

    // ✅ Save to database
    setIsSaving(true);
    try {
      const resultId = await saveListeningResult({
        testType: "practice",
        taskId: scenario.taskType || "part4",
        materialId: scenario.id,
        totalCorrect: correctCount,
        totalQuestions: totalQuestions,
        celpipScore: celpipScore,
        duration: timeSpent,
      });

      if (resultId) {
        setSavedToDb(true);
        console.log("[ListeningNewsItemPracticeTest] ✓ Saved to DB:", resultId);
      }
    } catch (error) {
      console.error("[ListeningNewsItemPracticeTest] Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetTest = () => {
    setPhase("instructions");
    setAnswers({});
    setTimeLeft(180);
    setTestStartTime(null);
    setHasPlayedAudio(false);
    setMediaProgress(0);
    setMediaCurrentTime(0);
    setIsPlaying(false);
    setTestResults(null);
    // ✅ Reset save status
    setSavedToDb(false);
    setIsSaving(false);
  };

  // ===================== Render Functions =====================
  const renderHeader = () => (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Exit
            </button>
            <span className="font-bold text-slate-900 text-lg">
              Listening • News Item
            </span>

            {phase === "question" && (
              <div className="hidden md:flex items-center gap-3 flex-1 max-w-sm">
                <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="text-sm text-slate-500">{Math.round(progressPercentage)}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-full font-medium">
              {phase === "instructions"
                ? "Introduction"
                : phase === "media"
                ? "Listening"
                : phase === "question"
                ? "Question"
                : "Results"}
            </span>

            {phase === "question" && (
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  timeLeft < 60
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-blue-50 border-blue-200 text-blue-600"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  const renderInstructions = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/25">
          <Headphones className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Listening to a News Item</h2>
        <p className="text-slate-500 text-lg">{scenario.title?.replace(/_/g, " ")}</p>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-8 border border-slate-200/80">
        <h3 className="font-semibold text-slate-900 mb-5 flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          Instructions
        </h3>

        <p className="text-slate-700 leading-relaxed mb-4">{instructionsText}</p>

        <div className="space-y-3">
          {[
            "You will hear a news item only once.",
            "After listening, you will answer questions based on the content.",
            "Choose the best answer from the drop-down menu.",
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-4 group">
              <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-lg">
                {i + 1}
              </span>
              <p className="text-slate-700 leading-relaxed pt-1">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
      >
        Continue
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );

  const renderMedia = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Listen to the News Item</h2>
        <p className="text-slate-500">The audio will play automatically. Listen carefully.</p>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-6 border border-slate-200/80">
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleMediaEnded}
          />
        )}

        {audioUrl ? (
          <>





            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={togglePlayPause}
                disabled={hasPlayedAudio}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                  hasPlayedAudio
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105"
                }`}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 font-mono w-12">
                    {formatTime(Math.floor(mediaCurrentTime))}
                  </span>

<div className="flex-1">
  <input
    type="range"
    min={0}
    max={100}
    step={0.1}
    value={mediaProgress}
    onInput={(e) => handleSeek(Number((e.target as HTMLInputElement).value))} // ✅ live dragging
    onPointerDown={() => setIsSeeking(true)}
    onPointerUp={() => setIsSeeking(false)}
    onMouseDown={() => setIsSeeking(true)}   // ✅ fallback for older browsers
    onMouseUp={() => setIsSeeking(false)}
    className="w-full accent-indigo-600 cursor-pointer"
    aria-label="Audio progress"
  />
</div>


                  <span className="text-sm text-slate-500 font-mono w-12">
                    {formatTime(mediaDuration || 0)}
                  </span>
                </div>
              </div>

              <button type="button" className="p-3 hover:bg-slate-100 rounded-xl transition">
                <Volume2 className="w-5 h-5 text-slate-500" />
              </button>
            </div>




            {hasPlayedAudio && (
              <div className="mt-4 text-sm text-slate-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Audio completed. Moving to questions...
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-slate-500 py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <p>No audio file available for this news item.</p>
            <button
              onClick={() => setPhase("question")}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold"
            >
              Skip to Questions
            </button>
          </div>
        )}
      </div>

      {/* Back button */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleBack}
          className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleNext}
          className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          Skip to Questions
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderQuestion = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          Choose the best way to complete each statement from the drop-down menu (▼).
        </h2>
      </div>

      <div className="space-y-3">
        {allQuestions.map((q, idx) => {
          const selectedValue = answers[q.id] || "";

          return (
            <div key={q.id} className="border-b border-slate-100 pb-3">
              {/* ✅ CELPIP style: select comes AFTER the question (not on far right) */}
              <div className="flex flex-wrap items-center gap-2 text-slate-900 text-sm font-medium">
                <span className="font-semibold">{idx + 1}.</span>

                <span className="text-slate-900">
                  {q.questionText || `Question ${idx + 1}`}
                </span>

                <select
                  value={selectedValue}
                  onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                  className="w-[200px] px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Select an answer...
                  </option>

                  {(q.options || []).map((opt, optIdx) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.text || `Option ${["A", "B", "C", "D"][optIdx]}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setPhase("answerKey")}
          className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all"
        >
          Answer Key
        </button>

        <span className="text-sm text-slate-500 font-medium">
          Answered: {answeredCount} / {totalQuestions}
        </span>

        <button
          onClick={handleNext}
          disabled={answeredCount < totalQuestions}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${
            answeredCount >= totalQuestions
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          Submit
        </button>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!testResults) return null;

    const percent = Math.round((testResults.score / testResults.totalQuestions) * 100);
    const celpipScore = calculateCelpipScore(testResults.score, testResults.totalQuestions);

    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-xl ${
            percent >= 70 ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-green-500/25' : 
            percent >= 50 ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25' : 
            'bg-gradient-to-br from-red-400 to-rose-500 shadow-red-500/25'
          }`}>
            {percent >= 70 ? <CheckCircle className="w-10 h-10 text-white" /> : <AlertCircle className="w-10 h-10 text-white" />}
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Test Complete!</h2>
          <p className="text-slate-500 mt-2">News Item - {scenario.title?.replace(/_/g, ' ')}</p>
          
          {/* ✅ CELPIP Score */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full">
            <span className="text-indigo-700 font-medium">Estimated CELPIP Score:</span>
            <span className="text-2xl font-bold text-indigo-600">{celpipScore}</span>
          </div>
          
          {/* ✅ Save Status */}
          <div className="mt-3 text-sm">
            {isSaving ? (
              <span className="text-blue-600 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Saving your results...
              </span>
            ) : savedToDb ? (
              <span className="text-green-600 flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Results saved to your account
              </span>
            ) : (
              <span className="text-amber-600">Results saved locally</span>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-8 border border-slate-200/80">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-slate-500 text-sm font-semibold">Score</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">
                {testResults.score} / {testResults.totalQuestions}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-sm font-semibold">Accuracy</div>
              <div className={`text-3xl font-bold mt-1 ${
                percent >= 70 ? 'text-green-600' : percent >= 50 ? 'text-amber-600' : 'text-red-600'
              }`}>{percent}%</div>
            </div>
            <div>
              <div className="text-slate-500 text-sm font-semibold">Time</div>
              <div className="text-3xl font-bold text-slate-900 mt-1">{formatTime(testResults.timeSpent)}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setPhase("answerKey")}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all"
          >
            View Answer Key
          </button>
          <button
            onClick={resetTest}
            className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Retry
          </button>
        </div>

        <button
          onClick={() => testResults ? onComplete(testResults) : onBack()}
          className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          Finish
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  const renderAnswerKey = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Answer Key</h2>
        <button onClick={() => setPhase(testResults ? "results" : "question")} className="p-2 hover:bg-slate-100 rounded-lg">
          <X className="w-6 h-6 text-slate-500" />
        </button>
      </div>

      <div className="space-y-4">
        {allQuestions.map((q, idx) => {
          const correct = q.correctAnswer;
          const selected = answers[q.id];
          const isCorrect = selected === correct;
          const correctOpt = q.options.find(o => o.id === correct);
          const selectedOpt = q.options.find(o => o.id === selected);

          return (
            <div key={q.id} className={`p-5 rounded-2xl border-2 ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                  {isCorrect ? <CheckCircle className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 mb-2">
                    {idx + 1}. {q.questionText}
                  </div>

                  <div className="text-sm text-slate-700">
                    Correct answer:{" "}
                    <span className="font-bold text-green-700">{correctOpt?.text || correct}</span>
                  </div>

                  {selected && (
                    <div className="text-sm mt-1">
                      Your answer:{" "}
                      <span className={`font-bold ${isCorrect ? "text-green-700" : "text-red-600"}`}>
                        {selectedOpt?.text || selected}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setPhase(testResults ? "results" : "question")}
          className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all"
        >
          Back to {testResults ? "Results" : "Questions"}
        </button>

        <button
          onClick={onBack}
          className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all"
        >
          Exit
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {renderHeader()}

      <main className="max-w-6xl mx-auto px-6 py-6">
        {phase === "instructions" && renderInstructions()}
        {phase === "media" && renderMedia()}
        {phase === "question" && renderQuestion()}
        {phase === "results" && renderResults()}
        {phase === "answerKey" && renderAnswerKey()}
      </main>
    </div>
  );
};

export default ListeningNewsItemPracticeTest;
