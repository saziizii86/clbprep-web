// src/pages/Listening/6. View Points/ListeningViewPointsTest.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Clock, Volume2, Play, Pause, CheckCircle, Info, Headphones, AlertCircle, RotateCcw, X, ChevronDown } from 'lucide-react';
import { saveListeningResult, calculateCelpipScore } from '../../../services/userResultsService';

interface QuestionOption { id: string; text?: string; }
interface Question { id: string; questionText: string; type: string; options: QuestionOption[]; correctAnswer: string; }
interface Section { id: string; title: string; audioUrl?: string; audioDuration: number; transcript?: string; questions: Question[]; }
interface Scenario { id: string; title: string; skill: string; taskName: string; taskType: string; totalTime: number; instructions?: string; sections: Section[]; uploadedFiles?: any; }
interface TestResults { scenarioId: string; answers: Record<string, string>; score: number; totalQuestions: number; timeSpent: number; }
interface Props { scenario: Scenario; onBack: () => void; onComplete: (results: TestResults) => void; }

type TestPhase = 'instructions' | 'listening' | 'questions' | 'results';


const TranscriptModal = React.memo(function TranscriptModal({
  open, title, content, onClose,
}: { open: boolean; title: string; content: string; onClose: () => void; }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition" aria-label="Close transcript">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto overscroll-contain touch-pan-y max-h-[calc(85vh-72px)]">
          <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">{content}</div>
        </div>
      </div>
    </div>
  );
});

const ListeningViewPointsTest: React.FC<Props> = ({ scenario, onBack, onComplete }) => {
  const [phase, setPhase] = useState<TestPhase>('instructions');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [timeLeft, setTimeLeft] = useState(260); // 4:20 minutes
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  
  // ✅ NEW: Save status states
  const [isSaving, setIsSaving] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioUrl = scenario.sections?.[0]?.audioUrl || scenario.uploadedFiles?.sectionAudios?.[0]?.storageUrl || scenario.uploadedFiles?.sectionAudios?.[0]?.data;
  const transcript = scenario.sections?.[0]?.transcript || '';
  const allQuestions = scenario.sections?.flatMap(s => s.questions) || [];
  const totalQuestions = allQuestions.length || 6;
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = phase === 'questions' ? (answeredCount / totalQuestions) * 100 : 0;

  useEffect(() => {
    if (phase === 'questions' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(p => p <= 1 ? (handleComplete(), 0) : p - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [phase, timeLeft]);

  useEffect(() => { if (phase === 'questions' && !testStartTime) setTestStartTime(Date.now()); }, [phase]);

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  
  const togglePlayPause = () => { 
    if (audioRef.current && !hasPlayedAudio) { 
      isPlaying ? audioRef.current.pause() : audioRef.current.play(); 
      setIsPlaying(!isPlaying); 
    } 
  };

// ✅ NEW: Seek function - same as NewsItem
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

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
  };

  const handleNext = () => {
    if (phase === 'instructions') {
      setPhase('listening');
      // Auto-play audio
      setTimeout(() => {
        if (audioRef.current && audioUrl) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 150);
    } else if (phase === 'listening') {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      setHasPlayedAudio(true);
      setPhase('questions');
    } else if (phase === 'questions') {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (phase === 'listening') setPhase('instructions');
    else if (phase === 'questions') { setPhase('listening'); setHasPlayedAudio(false); }
  };

  // ✅ UPDATED: handleComplete with DB save
  const handleComplete = async () => {
    let correctCount = 0;
    allQuestions.forEach(q => { if (answers[q.id] === q.correctAnswer) correctCount++; });
    
    const timeSpent = Math.floor((Date.now() - (testStartTime ?? Date.now())) / 1000);
    const celpipScore = calculateCelpipScore(correctCount, totalQuestions);
    
    const results: TestResults = { 
      scenarioId: scenario.id, 
      answers, 
      score: correctCount, 
      totalQuestions, 
      timeSpent 
    };
    
    setTestResults(results);
    setPhase('results');

    // ✅ Save to database
    setIsSaving(true);
    try {
      const resultId = await saveListeningResult({
        testType: "practice",
        taskId: scenario.taskType || "part6",
        materialId: scenario.id,
        totalCorrect: correctCount,
        totalQuestions: totalQuestions,
        celpipScore: celpipScore,
        duration: timeSpent,
      });

      if (resultId) {
        setSavedToDb(true);
        console.log("[ListeningViewPointsTest] ✓ Saved to DB:", resultId);
      }
    } catch (error) {
      console.error("[ListeningViewPointsTest] Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetTest = () => {
    setPhase('instructions');
    setAnswers({});
    setShowTranscript(false);
    setHasPlayedAudio(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setTimeLeft(260);
    setTestStartTime(null);
    setIsPlaying(false);
    // ✅ Reset save status
    setSavedToDb(false);
    setIsSaving(false);
  };


  // Close transcript on Escape
  useEffect(() => {
    if (!showTranscript) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowTranscript(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [showTranscript]);

  // ============== RENDER FUNCTIONS ==============

  const renderInstructions = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl mx-auto min-h-[500px] max-h-[620px] flex flex-col overflow-hidden p-4 sm:p-6">
      <div className="flex-1 overflow-y-auto">
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-xl shadow-blue-500/25">
            <Headphones className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Listening to Viewpoints</h2>
          <p className="text-slate-500 text-sm sm:text-base">{scenario.title?.replace(/_/g, ' ')}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
          <h3 className="font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            Instructions
          </h3>
          <div className="space-y-2.5">
            {['You will hear a discussion where speakers share their viewpoints.', 'Listen carefully to understand each speaker\'s opinion.', 'Answer the questions based on what you heard.'].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20">{i + 1}</span>
                <p className="text-slate-700 leading-relaxed pt-1 text-sm sm:text-base">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pt-4 sm:pt-5">
        <button onClick={handleNext} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold text-base hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
          Continue <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderListening = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl mx-auto h-[calc(100dvh-7rem)] max-h-[720px] flex flex-col overflow-hidden p-4 sm:p-6">

      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 sm:p-6 mb-4 border border-slate-200/80">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-base sm:text-xl text-slate-700">
              Listen to the viewpoints. You will hear them only <span className="text-orange-500 font-bold">once</span>.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-slate-900 text-base sm:text-lg">Viewpoints Audio</span>
              <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{totalQuestions} questions follow</span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <button onClick={togglePlayPause} disabled={hasPlayedAudio}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all ${hasPlayedAudio ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105'}`}>
                {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-2 sm:gap-3">
                <span className="text-sm text-slate-500 font-mono w-10 sm:w-12 flex-shrink-0">{formatTime(Math.floor(audioCurrentTime))}</span>
                <div className="flex-1">
                  <input type="range" min={0} max={100} step={0.1} value={audioProgress}
                    onChange={(e) => seekToPercent(Number(e.target.value))}
                    className="w-full accent-indigo-600" aria-label="Audio progress" />
                </div>
                <span className="text-sm text-slate-500 font-mono w-10 sm:w-12 flex-shrink-0">{formatTime(audioDuration)}</span>
              </div>

              <button className="p-2 sm:p-3 hover:bg-slate-100 rounded-xl transition flex-shrink-0">
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
              </button>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 sm:p-4 border border-amber-200/50">
              <p className="text-sm text-amber-800"><span className="font-bold">Tip:</span> pay attention to different speakers' opinions and their reasons.</p>
            </div>
          </div>

          {/* Transcript button — opens modal */}
          <button
            onClick={() => setShowTranscript(true)}
            className="mt-4 sm:mt-6 w-full py-3 sm:py-4 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            Show Transcript
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4 text-center">In the real test, the audio plays once and no transcript is available.</p>

        <div className="flex gap-3 sm:gap-4 mt-auto">
          <button onClick={handleBack} className="flex-1 py-3 sm:py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <button onClick={handleNext} className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
            Next <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {audioUrl && <audio ref={audioRef} src={audioUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleAudioEnded} />}
    </div>
  );

    const renderQuestions = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl mx-auto h-[calc(100dvh-7rem)] max-h-[720px] flex flex-col overflow-hidden p-4 sm:p-6">

      <div className="flex items-start justify-between gap-3 mb-3 flex-shrink-0">
        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
            {scenario.title?.replace(/_/g, ' ')} — Listening Part 6: Listening to Viewpoints
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Choose the best answer from the drop-down menu (▼).</p>
        </div>
        <button onClick={handleNext}
          className="shrink-0 px-4 sm:px-6 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base">
          NEXT
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 divide-y divide-slate-100 min-h-0">
        {allQuestions.map((q, idx) => (
          <div key={q.id} className="pt-3 first:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-slate-700 font-medium text-sm sm:text-base">{idx+1}. {q.questionText}</span>
              <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                <select value={answers[q.id] || ''} onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                  className={`w-full appearance-none bg-white border rounded-lg px-3 sm:px-4 py-2 pr-8 font-medium cursor-pointer text-sm sm:text-base ${answers[q.id] ? 'border-blue-500 text-slate-900' : 'border-slate-300 text-slate-500'}`}>
                  <option value="" disabled>Select an answer...</option>
                  {q.options.map((opt, i) => <option key={opt.id} value={opt.id}>{String.fromCharCode(65+i)}. {opt.text}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3 border-t border-slate-200 flex items-center justify-end flex-shrink-0">
        <button onClick={handleBack}
          className="px-4 sm:px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 text-sm sm:text-base">
          BACK
        </button>
      </div>
    </div>
  );

    const renderAnswerKey = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl mx-auto min-h-[500px] max-h-[620px] flex flex-col overflow-hidden p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-slate-900">Answer Key</h2><button onClick={() => setPhase(testResults ? 'results' : 'questions')} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-6 h-6 text-slate-500" /></button></div>
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
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>{isCorrect ? <CheckCircle className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}</div>
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
      <button onClick={() => setPhase(testResults ? 'results' : 'questions')} className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold">Back to {testResults ? 'Results' : 'Questions'}</button>
    </div>
  );

const renderResults = () => {
  const total = totalQuestions;
  const score = allQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const celpipScore = calculateCelpipScore(score, total);

  const message =
    percentage >= 75 ? { text: "Great job!", color: "text-emerald-700" } :
    percentage >= 50 ? { text: "Good effort!", color: "text-amber-700" } :
    { text: "Keep practicing!", color: "text-rose-700" };

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl mx-auto h-[calc(100dvh-7rem)] max-h-[720px] flex flex-col overflow-hidden p-4 sm:p-6">

      {/* Top banner */}
      <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
          <div>
            <div className="text-xs font-semibold text-emerald-700 tracking-wide">CORRECT ANSWERS</div>
            <div className="text-xl font-bold text-slate-900">
              {score} / {total} 
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`font-semibold ${message.color}`}>{message.text}</div>
          <div className="text-xs text-slate-500">Review your answers below</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-sm font-semibold">
          Estimated CELPIP Score: {celpipScore}
        </span>

        {savedToDb && (
          <span className="inline-flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Results saved to your account
          </span>
        )}
      </div>

      {/* Table */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Answer Key</h3>
            <p className="text-sm text-slate-500">Questions & Answers</p>
          </div>

          <button
            onClick={resetTest}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Q#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Option A</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Option B</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Option C</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Option D</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Correct</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Your Answer</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {allQuestions.map((q, idx) => {
                const correctIdx = q.options.findIndex(o => o.id === q.correctAnswer);
                const yourIdx = q.options.findIndex(o => o.id === answers[q.id]);

                const correctLetter = correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : "-";
                const yourLetter = yourIdx >= 0 ? String.fromCharCode(65 + yourIdx) : "-";

                return (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">{idx + 1}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{q.options[0]?.text || "-"}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{q.options[1]?.text || "-"}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{q.options[2]?.text || "-"}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{q.options[3]?.text || "-"}</td>

                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                        {correctLetter}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold ${
                          yourLetter === "-" ? "bg-slate-100 text-slate-500" :
                          yourLetter === correctLetter ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {yourLetter}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={resetTest}
          className="flex-1 py-4 bg-slate-50 text-slate-700 rounded-2xl font-semibold hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
        >
          <RotateCcw className="w-5 h-5" />
          Try Again
        </button>

        <button
          onClick={() => {
            if (testResults) onComplete(testResults);
            else onBack();
          }}
          className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
        >
          Finish
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
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-6">
              <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"><ArrowLeft className="w-5 h-5" /> Exit</button>
              <span className="font-bold text-slate-900 text-lg">Listening • Viewpoints</span>
              {phase === 'questions' && (
                <div className="hidden md:flex items-center gap-3 flex-1 max-w-sm">
                  <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{width:`${progressPercentage}%`}} /></div>
                  <span className="text-sm text-slate-500">{Math.round(progressPercentage)}%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-full">{phase === 'instructions' ? 'Introduction' : phase === 'listening' ? 'Listening' : phase === 'questions' ? 'Question' : 'Results'}</span>
              {phase === 'questions' && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}><Clock className="w-4 h-4" /><span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span></div>
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
        title="Viewpoints Transcript"
        content={transcript?.trim() || 'No transcript found in database.'}
      />
    </div>
  );
};

export default ListeningViewPointsTest;
