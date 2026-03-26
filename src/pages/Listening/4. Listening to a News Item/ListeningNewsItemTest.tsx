// src/pages/Listening/4. Listening to a News Item/ListeningNewsItemTest.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Clock, Volume2, Play, Pause, CheckCircle, Info, Headphones, AlertCircle, RotateCcw, X, ChevronDown } from 'lucide-react';

interface QuestionOption { id: string; text?: string; }
interface Question { id: string; questionText: string; type: string; options: QuestionOption[]; correctAnswer: string; }
interface Section { id: string; title: string; audioUrl?: string; audioDuration: number; transcript?: string; questions: Question[]; }
interface Scenario { id: string; title: string; skill: string; taskName: string; taskType: string; totalTime: number; instructions?: string; sections: Section[]; uploadedFiles?: any; }
interface TestResults { scenarioId: string; answers: Record<string, string>; score: number; totalQuestions: number; timeSpent: number; }
interface Props { scenario: Scenario; onBack: () => void; onComplete: (results: TestResults) => void; }

type TestPhase = 'instructions' | 'listening' | 'questions' | 'results' | 'answerKey';

	const TranscriptModal = React.memo(function TranscriptModal({
  open,
  title,
  content,
  onClose,
}: {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close transcript"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto overscroll-contain touch-pan-y max-h-[calc(85vh-72px)]">
          <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
});


const ListeningNewsItemTest: React.FC<Props> = ({ scenario, onBack, onComplete }) => {
	
	



  const [phase, setPhase] = useState<TestPhase>('instructions');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [timeLeft, setTimeLeft] = useState(210); // 3:30

  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  
  // ✅ NEW: Auto-play flag
  const [autoPlayRequested, setAutoPlayRequested] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioUrl = scenario.sections?.[0]?.audioUrl || scenario.uploadedFiles?.sectionAudios?.[0]?.storageUrl || scenario.uploadedFiles?.sectionAudios?.[0]?.data;
  const transcript = scenario.sections?.[0]?.transcript || '';
  const allQuestions = scenario.sections?.flatMap(s => s.questions) || [];
  const totalQuestions = allQuestions.length || 5;
  const answeredCount = Object.keys(answers).length;

  // Timer effect
  useEffect(() => {
    if (phase === 'questions' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(p => p <= 1 ? (handleComplete(), 0) : p - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [phase, timeLeft]);

  useEffect(() => { if (phase === 'questions' && !testStartTime) setTestStartTime(Date.now()); }, [phase]);

  // ✅ NEW: Auto-play effect - exactly like ListeningPracticeTest
  useEffect(() => {
    if (!autoPlayRequested) return;
    if (phase !== 'listening') return;

    const el = audioRef.current;
    if (!el) {
      setAutoPlayRequested(false);
      return;
    }

    // Only autoplay if real audio URL exists
    if (!audioUrl) {
      setAutoPlayRequested(false);
      return;
    }

    const playNow = async () => {
      try {
        el.currentTime = 0;
        await el.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn("Autoplay blocked by browser:", err);
      } finally {
        setAutoPlayRequested(false);
      }
    };

    // Wait until audio is ready
    if (el.readyState >= 2) {
      playNow();
    } else {
      const onCanPlay = () => playNow();
      el.addEventListener("canplay", onCanPlay, { once: true });
      return () => el.removeEventListener("canplay", onCanPlay);
    }
  }, [phase, autoPlayRequested, audioUrl]);

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  
  // ✅ UPDATED: togglePlayPause - async like ListeningPracticeTest
  const togglePlayPause = async () => {
    if (audioUrl && audioRef.current) {
      try {
        if (audioRef.current.paused) {
          await audioRef.current.play();
          setIsPlaying(true);
        } else {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      } catch (err) {
        console.warn("Play blocked:", err);
        setIsPlaying(false);
      }
    }
  };

  // ✅ NEW: Seek function - exactly like ListeningPracticeTest
  const seekToPercent = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));

    if (audioRef.current) {
      const dur = audioRef.current.duration;
      if (!dur || !isFinite(dur)) return;

      const t = (clamped / 100) * dur;
      audioRef.current.currentTime = t;

      setAudioCurrentTime(t);
      setAudioProgress(clamped);
    }
  };

  const handleTimeUpdate = () => { 
    if (audioRef.current?.duration && isFinite(audioRef.current.duration)) { 
      setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100); 
      setAudioCurrentTime(audioRef.current.currentTime); 
    } 
  };
  
  const handleLoadedMetadata = () => { 
    if (audioRef.current?.duration) setAudioDuration(Math.floor(audioRef.current.duration)); 
  };
  
  const handleAudioEnded = () => { 
    setIsPlaying(false); 
    setHasPlayedAudio(true); 
    setTimeout(() => setPhase('questions'), 500); 
  };
  
  const handleAnswerSelect = (qId: string, aId: string) => setAnswers(p => ({...p, [qId]: aId}));

  const handleNext = () => {
    if (phase === 'instructions') {
      // ✅ Reset audio state and request autoplay
      setAudioProgress(0);
      setAudioCurrentTime(0);
      setHasPlayedAudio(false);
      setIsPlaying(false);
      setAutoPlayRequested(true);
      setPhase('listening');
    }
    else if (phase === 'listening') { 
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false); 
      setHasPlayedAudio(true); 
      setPhase('questions'); 
    }
    else if (phase === 'questions') handleComplete();
  };

  const handleBack = () => {
    if (phase === 'listening') {
      setPhase('instructions');
      setAutoPlayRequested(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    }
    else if (phase === 'questions') { 
      setPhase('listening'); 
      setHasPlayedAudio(false); 
    }
    else if (phase === 'results' || phase === 'answerKey') setPhase('results');
  };

  const handleComplete = () => {
    const correctCount = allQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
    setTestResults({ scenarioId: scenario.id, answers, score: correctCount, totalQuestions, timeSpent: Math.floor((Date.now() - (testStartTime ?? Date.now())) / 1000) });
    setPhase('results');
  };

  const resetTest = () => { 
    setPhase('instructions'); 
    setAnswers({}); 
    setHasPlayedAudio(false); 
    setAudioProgress(0); 
    setAudioCurrentTime(0); 
    setTimeLeft(210); // 3:30

    setShowTranscript(false); 
    setTestStartTime(null); 
    setIsPlaying(false); 
    setAutoPlayRequested(false);
  };

  // ✅ Close transcript modal on Escape key
  useEffect(() => {
    if (!showTranscript) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowTranscript(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showTranscript]);

  // ✅ Transcript Modal — proper popup (no scroll-jump, correct size)

  
  const progressPercentage = (answeredCount / totalQuestions) * 100;

// ✅ Keep the main white card the SAME size across all phases (like Problem Solving)
const SHELL_BASE =
  "bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl mx-auto";

// Keep this for listening/question screens
const SHELL_FIXED =
  "h-[calc(100dvh-7rem)] max-h-[720px] flex flex-col overflow-hidden";

// Use this for intro/context screens
const SHELL_COMPACT =
  "min-h-[500px] max-h-[620px] flex flex-col overflow-hidden";

const SHELL_PAD = "p-4 sm:p-6";



  const renderInstructions = () => (
    <div className={`${SHELL_BASE} ${SHELL_COMPACT} ${SHELL_PAD}`}>
      <div className={`flex-1 overflow-y-auto`}>
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-xl shadow-blue-500/25">
            <Headphones className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 tracking-tight">
            Listening to a News Item
          </h2>
          <p className="text-slate-500 text-sm sm:text-base">
            {scenario.title?.replace(/_/g, ' ')}
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
          <h3 className="font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            Instructions
          </h3>
          <div className="space-y-2.5">
            {[
              'You will hear a news item. You will hear it only once.',
              `After the news item, you will answer ${totalQuestions} questions using dropdown menus.`,
              'Choose the best answer to each question from the drop-down menu.',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20">
                  {i + 1}
                </span>
                <p className="text-slate-700 leading-relaxed pt-1">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 sm:pt-5">
        <button
          onClick={handleNext}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold text-base hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
        >
          Continue
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderListening = () => (
    <div className={`${SHELL_BASE} ${SHELL_FIXED} ${SHELL_PAD}`}>
      <div className="flex-1 overflow-y-auto flex flex-col">

        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 sm:p-6 mb-5 border border-slate-200/80">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-base sm:text-xl text-slate-700">
              Listen to the news item. You will hear it only <span className="text-orange-500 font-bold">once</span>.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-slate-900 text-base sm:text-lg">News Item Audio</span>
              <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{totalQuestions} questions follow</span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mb-6">
              <button
                onClick={togglePlayPause}
                disabled={hasPlayedAudio}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-all ${
                  hasPlayedAudio
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105'
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-2 sm:gap-3">
                <span className="text-sm text-slate-500 font-mono w-10 sm:w-12 flex-shrink-0">
                  {formatTime(Math.floor(audioCurrentTime))}
                </span>
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={audioProgress}
                    onChange={(e) => seekToPercent(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                    aria-label="Audio progress"
                  />
                </div>
                <span className="text-sm text-slate-500 font-mono w-10 sm:w-12 flex-shrink-0">
                  {formatTime(audioDuration)}
                </span>
              </div>

              <button className="p-2 sm:p-3 hover:bg-slate-100 rounded-xl transition flex-shrink-0">
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
              <p className="text-sm text-amber-800">
                <span className="font-bold">Tip:</span> focus on main idea, key details, numbers, and names.
              </p>
            </div>
          </div>

          {/* Transcript Button - opens modal */}
          <button
            onClick={() => setShowTranscript(true)}
            className="mt-4 sm:mt-6 w-full py-3 sm:py-4 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            Show Transcript
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4 sm:mb-6 text-center">
          In the real test, the audio plays once and no transcript is available.
        </p>

        <div className="flex gap-3 sm:gap-4 mt-auto">
          <button
            onClick={handleBack}
            className="flex-1 py-3 sm:py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
          >
            Next <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
        />
      )}
    </div>
  );

  const renderQuestions = () => (
    <div className={`${SHELL_BASE} ${SHELL_FIXED} ${SHELL_PAD}`}>

      <div className="flex items-start justify-between gap-4 mb-5 sm:mb-6">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
            {scenario.title?.replace(/_/g, " ")} — Listening Part 4: Listening to a News Item
          </h2>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            Choose the best answer to each question from the drop-down menu (▼).
          </p>
        </div>
        <button
          onClick={handleNext}
          className="shrink-0 px-4 sm:px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base"
        >
          NEXT
        </button>
      </div>

      <div className="flex-1 space-y-4 divide-y divide-slate-100 overflow-y-auto pr-1">
        {allQuestions.map((q, idx) => (
          <div key={q.id} className="pt-4 first:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
              <span className="text-slate-700 font-medium text-sm sm:text-base">{idx + 1}. {q.questionText}</span>
              <div className="relative inline-block">
                <select
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                  className={`appearance-none bg-white border rounded-lg px-3 sm:px-4 py-2 pr-8 font-medium cursor-pointer w-full sm:min-w-[200px] text-sm sm:text-base ${answers[q.id] ? 'border-blue-500 text-slate-900' : 'border-slate-300 text-slate-500'}`}
                >
                  <option value="" disabled>Select an answer...</option>
                  {q.options.map((opt, i) => (
                    <option key={opt.id} value={opt.id}>{String.fromCharCode(65 + i)}. {opt.text}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-200 flex justify-end">
        <button
          onClick={handleBack}
          className="px-4 sm:px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 text-sm sm:text-base"
        >
          BACK
        </button>
      </div>
    </div>
  );

  const renderAnswerKey = () => (
    <div className={`${SHELL_BASE} ${SHELL_FIXED} ${SHELL_PAD}`}>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Answer Key</h2>
        <button onClick={() => setPhase('questions')} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-6 h-6 text-slate-500" /></button>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {allQuestions.map((q, idx) => { 
          const isCorrect = answers[q.id] === q.correctAnswer; 
          const userAnswer = q.options.find(o => o.id === answers[q.id]); 
          const correctAnswer = q.options.find(o => o.id === q.correctAnswer); 
          const uIdx = q.options.findIndex(o => o.id === answers[q.id]); 
          const cIdx = q.options.findIndex(o => o.id === q.correctAnswer);
          return (
            <div key={q.id} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                  {isCorrect ? <CheckCircle className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm mb-1">Q{idx+1}: {q.questionText}</p>
                  <p className="text-sm text-slate-600">Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer ? `${String.fromCharCode(65+uIdx)}. ${userAnswer.text}` : 'Not answered'}</span></p>
                  {!isCorrect && correctAnswer && <p className="text-sm text-green-600 font-medium">Correct: {String.fromCharCode(65+cIdx)}. {correctAnswer.text}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => setPhase('questions')} className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold">Back to Questions</button>
    </div>
  );

const renderResults = () => {
  const total = allQuestions.length || totalQuestions;
  const score = allQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  // Message like Problem Solving
  const getMessage = () => {
    if (percentage >= 90) return { text: "Excellent work!", color: "text-emerald-700" };
    if (percentage >= 75) return { text: "Great job!", color: "text-emerald-700" };
    if (percentage >= 50) return { text: "Good effort!", color: "text-amber-700" };
    return { text: "Keep practicing!", color: "text-orange-700" };
  };
  const message = getMessage();

  // Convert optionId -> A/B/C/D
  const toLetter = (q: Question, optionId?: string) => {
    if (!optionId) return "";
    const idx = q.options?.findIndex(o => o.id === optionId) ?? -1;
    return idx >= 0 ? String.fromCharCode(65 + idx) : "";
  };

  return (
    <div className={`${SHELL_BASE} ${SHELL_FIXED} ${SHELL_PAD}`}>
      {/* Score Banner (like Problem Solving) */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl px-6 py-3 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest">CORRECT ANSWERS</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900">{score}</span>
              <span className="text-xl text-slate-400">/ {total}</span>
              
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className={`text-sm font-medium ${message.color}`}>{message.text}</p>
          <p className="text-xs text-slate-500 -mt-0.5">Review your answers below</p>
        </div>
      </div>

      {/* Answer Key Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Answer Key</h3>
            <p className="text-sm text-slate-500">Questions & Answers</p>
          </div>

          <button
            onClick={resetTest}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>

        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Q#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Option A</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Option B</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Option C</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Option D</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Correct</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Your Answer</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {allQuestions.map((q, idx) => {
              const correctLetter = toLetter(q, q.correctAnswer);
              const userLetter = toLetter(q, answers[q.id]);
              const isCorrect = answers[q.id] && answers[q.id] === q.correctAnswer;

              return (
                <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-700">{idx + 1}</td>

                  <td className="px-4 py-3 text-slate-700">{q.options?.[0]?.text ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{q.options?.[1]?.text ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{q.options?.[2]?.text ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{q.options?.[3]?.text ?? "-"}</td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                      {correctLetter || "-"}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {userLetter ? (
                      <span
                        className={`px-2 py-1 rounded-lg font-bold ${
                          isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
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

      {/* Bottom Buttons (like Problem Solving) */}
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"><ArrowLeft className="w-5 h-5" /> Exit</button>
              <span className="font-bold text-slate-900 text-lg">Listening • News Item</span>
              {phase === 'questions' && (
                <div className="hidden md:flex items-center gap-3 flex-1 max-w-sm">
                  <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{width:`${progressPercentage}%`}} />
                  </div>
                  <span className="text-sm text-slate-500">{Math.round(progressPercentage)}%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-full">{phase === 'instructions' ? 'Introduction' : phase === 'listening' ? 'Listening' : phase === 'questions' ? 'Question' : 'Results'}</span>
              {phase === 'questions' && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="px-4 py-6 min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        {phase === 'instructions' && renderInstructions()}
        {phase === 'listening' && renderListening()}
        {phase === 'questions' && renderQuestions()}
        {phase === 'results' && renderResults()}
        {phase === 'answerKey' && renderAnswerKey()}
      </main>

      <TranscriptModal
        open={showTranscript}
        onClose={() => setShowTranscript(false)}
        title="News Item Transcript"
        content={transcript?.trim() || "No transcript found in database."}
      />
    </div>
  );
};

export default ListeningNewsItemTest;
