// src/pages/Listening/5. Discussion/ListeningDiscussionTest.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Play,
  Pause,
  CheckCircle,
  Info,
  Headphones,
  RotateCcw,
  Video,
  ChevronDown,
  Rewind,
  FastForward,
} from 'lucide-react';


import { saveListeningResult, calculateCelpipScore } from '../../../services/userResultsService';

// Types
interface QuestionOption {
  id: string;
  text?: string;
}

interface Question {
  id: string;
  questionText: string;
  type: string;
  options: QuestionOption[];
  correctAnswer: string;
  audioUrl?: string | null;
  transcript?: string | null;
}

interface Section {
  id: string;
  title: string;
  audioUrl?: string;
  audioDuration: number;
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
  contextImage?: string;
  contextDescription?: string;
  videoUrl?: string;
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

interface ListeningDiscussionTestProps {
  scenario: Scenario;
  onBack: () => void;
  onComplete: (results: TestResults) => void;
}

type TestPhase = 'instructions' | 'media' | 'question' | 'results';

const ListeningDiscussionTest: React.FC<ListeningDiscussionTestProps> = ({ 
  scenario, 
  onBack, 
  onComplete 
}) => {
  // State
  const [phase, setPhase] = useState<TestPhase>('instructions');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [mediaCurrentTime, setMediaCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [hasPlayedMedia, setHasPlayedMedia] = useState(false);
  // ✅ Discussion question time: 4 minutes
  const [timeLeft, setTimeLeft] = useState(240);
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  
  // ✅ NEW: Save status states
  const [isSaving, setIsSaving] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get video URL (check multiple possible locations)
  const videoUrl = scenario.videoUrl || 
    scenario.uploadedFiles?.videoFile?.storageUrl || 
    scenario.uploadedFiles?.videoFile?.data;

  // Get audio URL as fallback
  const audioUrl = scenario.sections?.[0]?.audioUrl || 
    scenario.uploadedFiles?.sectionAudios?.[0]?.storageUrl ||
    scenario.uploadedFiles?.sectionAudios?.[0]?.data;

  // Get transcript
  const transcript = scenario.sections?.[0]?.transcript || '';

  // Get all questions from all sections
  const allQuestions = scenario.sections?.flatMap(s => s.questions) || [];
  const totalQuestions = allQuestions.length || 8;
  const currentQuestion = allQuestions[currentQuestionIndex];

  // Determine media type
  const hasVideo = !!videoUrl;
  const hasAudio = !!audioUrl;

  // Instructions from scenario
  const instructionsText = scenario.instructions || 
    scenario.contextDescription || 
    'You will watch a discussion between three coworkers. Listen carefully and answer the questions that follow.';

  // Timer for questions
  useEffect(() => {
    if (phase === 'question' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, timeLeft]);

  // Start test timer when entering questions
  useEffect(() => {
    if (phase === 'question' && !testStartTime) {
      setTestStartTime(Date.now());
    }
  }, [phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    const media = hasVideo ? videoRef.current : audioRef.current;
    if (media && !hasPlayedMedia) {
      if (isPlaying) {
        media.pause();
      } else {
        media.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

// ✅ NEW: Seek helpers (like NewsItem slider)
const seekToPercent = (pct: number) => {
  const media = hasVideo ? videoRef.current : audioRef.current;
  if (!media) return;

  const dur = media.duration;
  if (!dur || !isFinite(dur)) return;

  const clamped = Math.max(0, Math.min(100, pct));
  const t = (clamped / 100) * dur;

  media.currentTime = t;
  setMediaCurrentTime(t);
  setMediaProgress(clamped);
};

const seekBySeconds = (deltaSeconds: number) => {
  const media = hasVideo ? videoRef.current : audioRef.current;
  if (!media) return;

  const dur = media.duration;
  if (!dur || !isFinite(dur)) return;

  const next = Math.max(0, Math.min(dur, media.currentTime + deltaSeconds));
  media.currentTime = next;

  setMediaCurrentTime(next);
  setMediaProgress((next / dur) * 100);
};


  const handleTimeUpdate = () => {
    const media = hasVideo ? videoRef.current : audioRef.current;
    if (media) {
      const duration = media.duration;
      if (duration && isFinite(duration)) {
        const progress = (media.currentTime / duration) * 100;
        setMediaProgress(progress);
        setMediaCurrentTime(media.currentTime);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const media = hasVideo ? videoRef.current : audioRef.current;
    if (media?.duration) {
      setMediaDuration(Math.floor(media.duration));
    }
  };

  const handleMediaEnded = () => {
    setIsPlaying(false);
    setHasPlayedMedia(true);
    setTimeout(() => setPhase('question'), 500);
  };

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
  };

  const handleNext = () => {
    if (phase === "instructions") {
      setPhase("media");

      // ✅ Auto play media when user clicks Continue
      setTimeout(() => {
        const media = hasVideo ? videoRef.current : audioRef.current;
        if (!media) return;

        media.currentTime = 0;
        media
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Autoplay blocked:", err);
          });
      }, 150);
    } else if (phase === 'media') {
      if (hasVideo && videoRef.current) {
        videoRef.current.pause();
      }
      if (hasAudio && audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setHasPlayedMedia(true);
      setPhase('question');
    } else if (phase === 'question') {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (phase === 'media') {
      setPhase('instructions');
    } else if (phase === 'question') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
      } else {
        setPhase('media');
        setHasPlayedMedia(false);
      }
    }
  };

  // ✅ UPDATED: handleComplete with DB save
  const handleComplete = async () => {
    let correctCount = 0;
    allQuestions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
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
    setPhase('results');

    // ✅ Save to database
    setIsSaving(true);
    try {
      const resultId = await saveListeningResult({
        testType: "practice",
        taskId: scenario.taskType || "part5",
        materialId: scenario.id,
        totalCorrect: correctCount,
        totalQuestions: totalQuestions,
        celpipScore: celpipScore,
        duration: timeSpent,
      });

      if (resultId) {
        setSavedToDb(true);
        console.log("[ListeningDiscussionTest] ✓ Saved to DB:", resultId);
      }
    } catch (error) {
      console.error("[ListeningDiscussionTest] Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetTest = () => {
    setPhase('instructions');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setHasPlayedMedia(false);
    setMediaProgress(0);
    setMediaCurrentTime(0);
    setTimeLeft(240);
    setShowTranscript(false);
    setTestStartTime(null);
    setIsPlaying(false);
    // ✅ Reset save status
    setSavedToDb(false);
    setIsSaving(false);
  };

  const answeredCount = allQuestions.filter(q => answers[q.id]).length;
  const progressPercentage = phase === "question"
    ? (answeredCount / totalQuestions) * 100
    : 0;

  // ============== RENDER FUNCTIONS ==============

  // ✅ Match the News Item frame/box sizing
  const SHELL_BASE =
    'bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 max-w-5xl mx-auto';
  const SHELL_FIXED = 'min-h-[700px] flex flex-col';

  const renderInstructions = () => (
    <div className={`${SHELL_BASE} ${SHELL_FIXED} p-8`}>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/25">
          {hasVideo ? <Video className="w-10 h-10 text-white" /> : <Headphones className="w-10 h-10 text-white" />}
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Discussion</h2>
        <p className="text-slate-500 text-lg">{scenario.title?.replace(/_/g, ' ') || 'Listening Practice'}</p>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-8 border border-slate-200/80">
        <h3 className="font-semibold text-slate-900 mb-5 flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          Instructions
        </h3>
        <div className="space-y-3">
          {[
            hasVideo 
              ? 'You will watch a discussion between speakers. You will see it only once.'
              : 'You will hear a discussion between speakers. You will hear it only once.',
            'After the discussion, you will answer 8 questions.',
            'Choose the best answer to each question.'
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-4 group">
              <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
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
    <div className={`${SHELL_BASE} ${SHELL_FIXED} p-8`}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {hasVideo ? 'Watch the Discussion' : 'Listen to the Discussion'}
        </h2>
        <p className="text-slate-500 mt-2">{instructionsText}</p>
      </div>

      {/* Video Player */}
      {hasVideo && (
        <div className="mb-6">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full rounded-2xl bg-black"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleMediaEnded}
            controls={false}
          />
        </div>
      )}

      {/* Audio Player (fallback) */}
      {!hasVideo && hasAudio && (
        <div className="mb-6">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleMediaEnded}
          />
        </div>
      )}

      {/* Play Controls */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={togglePlayPause}
          disabled={hasPlayedMedia}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
            hasPlayedMedia 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25'
          }`}
        >

          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </button>

<div className="flex-1 flex items-center gap-3">
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
      onChange={(e) => seekToPercent(Number(e.target.value))}
      className="w-full accent-indigo-600"
      aria-label={hasVideo ? "Video progress" : "Audio progress"}
      disabled={hasPlayedMedia}
    />
  </div>

  <span className="text-sm text-slate-500 font-mono w-12">
    {formatTime(mediaDuration)}
  </span>
</div>

      </div>

      {hasPlayedMedia && (
        <div className="text-center text-green-600 font-medium mb-6 flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Media completed - moving to questions...
        </div>
      )}

      {/* Transcript Toggle */}
      {transcript && (
        <>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all"
          >
            {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
          </button>
          {showTranscript && (
            <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-700 max-h-48 overflow-y-auto whitespace-pre-line">
              {transcript}
            </div>
          )}
        </>
      )}

      <div className="flex gap-4 mt-6">
        <button
          onClick={handleBack}
          className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-3"
        >
          Skip to Questions
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

const renderQuestion = () => {
  const answeredCount = allQuestions.filter(q => !!answers[q.id]).length;
  const progress = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <div className={`${SHELL_BASE} ${SHELL_FIXED} p-8`}>
      {/* Top row (remove second timer; header timer is enough) */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{scenario.title}</h2>
          <p className="text-slate-600 mt-1">
            Choose the best answer to each question from the drop-down menu (▼).
          </p>
          <p className="text-slate-500 mt-3">
            Answered: <span className="font-semibold text-slate-700">{answeredCount}</span> / {totalQuestions}
          </p>
        </div>

        {/* NEXT should NOT be grayed; always clickable */}
        <button
          onClick={handleComplete}
          className="px-6 py-2 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all"
        >
          NEXT
        </button>
      </div>

      {/* Progress */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Questions list (scrollable) */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 divide-y divide-slate-100">
        {allQuestions.map((q, idx) => (
          <div key={q.id} className="pt-4 first:pt-0">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-slate-700 font-medium">
                {idx + 1}. {q.questionText}
              </span>

              <div className="relative inline-block min-w-[260px]">
                <select
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                  className={`w-full appearance-none bg-white border rounded-xl px-4 py-2 pr-10 font-medium cursor-pointer ${
                    answers[q.id]
                      ? 'border-blue-500 text-slate-900'
                      : 'border-slate-300 text-slate-500'
                  }`}
                >
                  <option value="" disabled>Select an answer...</option>
                  {q.options.map((opt, i) => (
                    <option key={opt.id} value={opt.id}>
                      {String.fromCharCode(65 + i)}. {opt.text}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ Bottom bar pinned (BACK only, bottom-right) */}
      <div className="mt-auto pt-6 border-t border-slate-200 flex items-center justify-end">
        <button
          onClick={() => {
            setPhase('media');
            setHasPlayedMedia(false);
          }}
          className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600"
        >
          BACK
        </button>
      </div>
    </div>
  );
};


  const renderResults = () => {
    const correctCount = allQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
    const percentage = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const celpipScore = calculateCelpipScore(correctCount, totalQuestions);

    const toLetter = (idx: number) => String.fromCharCode(65 + idx);

    return (
      <div className={`${SHELL_BASE} p-8`}>
        {/* Compact banner (like News Item) */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-emerald-700 font-semibold text-sm">YOUR FINAL SCORE</p>
            <p className="text-2xl font-bold text-slate-900">
              {correctCount} <span className="text-slate-400">/ {totalQuestions}</span>
              <span className="text-sm font-medium text-emerald-700 ml-2">({percentage}%)</span>
            </p>
            <p className="text-slate-500 text-sm">
              Estimated CELPIP Score: <span className="font-semibold text-slate-700">{celpipScore}</span>
            </p>
          </div>

          <div className="text-right">
            {isSaving ? (
              <p className="text-blue-600 text-sm font-medium">Saving…</p>
            ) : savedToDb ? (
              <p className="text-emerald-600 text-sm font-medium">Results saved to your account</p>
            ) : (
              <p className="text-amber-600 text-sm font-medium">Results saved locally</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Answer Table</h3>
              <p className="text-sm text-slate-500">Questions & Answers</p>
            </div>
            <button
              onClick={resetTest}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Q#</th>
                  <th className="px-4 py-3 text-left font-semibold">Option A</th>
                  <th className="px-4 py-3 text-left font-semibold">Option B</th>
                  <th className="px-4 py-3 text-left font-semibold">Option C</th>
                  <th className="px-4 py-3 text-left font-semibold">Option D</th>
                  <th className="px-4 py-3 text-left font-semibold">Correct</th>
                  <th className="px-4 py-3 text-left font-semibold">Your Answer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allQuestions.map((q, idx) => {
                  const userId = answers[q.id];
                  const userIdx = q.options.findIndex(o => o.id === userId);
                  const correctIdx = q.options.findIndex(o => o.id === q.correctAnswer);
                  const userLetter = userIdx >= 0 ? toLetter(userIdx) : '';
                  const correctLetter = correctIdx >= 0 ? toLetter(correctIdx) : '';
                  const isCorrect = !!userLetter && userLetter === correctLetter;

                  return (
                    <tr key={q.id} className="text-slate-700 align-top">
                      <td className="px-4 py-3 font-semibold">{idx + 1}</td>
                      <td className="px-4 py-3">{q.options?.[0]?.text || '-'}</td>
                      <td className="px-4 py-3">{q.options?.[1]?.text || '-'}</td>
                      <td className="px-4 py-3">{q.options?.[2]?.text || '-'}</td>
                      <td className="px-4 py-3">{q.options?.[3]?.text || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                          {correctLetter || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {userLetter ? (
                          <span
                            className={`px-2 py-1 rounded-lg font-bold ${
                              isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {userLetter}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={resetTest}
            className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>

          <button
            onClick={onBack}
            className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            Back to Scenarios
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  // ============== MAIN RENDER ==============

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Header */}
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
                Listening • Discussion
              </span>

              {/* Progress Bar */}
              {phase === 'question' && (
                <div className="hidden md:flex items-center gap-3 flex-1 max-w-sm">
                  <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500 font-medium">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-full font-medium">
                {phase === 'instructions' ? 'Introduction' :
                 phase === 'media' ? (hasVideo ? 'Video' : 'Listening') :
                 phase === 'question' ? 'Question' : 'Results'}
              </span>

              {/* Timer */}
              {phase === 'question' && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  timeLeft < 60
                    ? 'bg-red-50 border-red-200 text-red-600' 
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-600'
                }`}>
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-bold text-lg">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {phase === 'instructions' && renderInstructions()}
        {phase === 'media' && renderMedia()}
        {phase === 'question' && renderQuestion()}
        {phase === 'results' && renderResults()}
      </main>
    </div>
  );
};

export default ListeningDiscussionTest;
