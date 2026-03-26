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

const ListeningNewsItemTest: React.FC<Props> = ({ scenario, onBack, onComplete }) => {
  const [phase, setPhase] = useState<TestPhase>('instructions');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioUrl = scenario.sections?.[0]?.audioUrl || scenario.uploadedFiles?.sectionAudios?.[0]?.storageUrl || scenario.uploadedFiles?.sectionAudios?.[0]?.data;
  const transcript = scenario.sections?.[0]?.transcript || '';
  const allQuestions = scenario.sections?.flatMap(s => s.questions) || [];
  const totalQuestions = allQuestions.length || 5;
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (phase === 'questions' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(p => p <= 1 ? (handleComplete(), 0) : p - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [phase, timeLeft]);

  useEffect(() => { if (phase === 'questions' && !testStartTime) setTestStartTime(Date.now()); }, [phase]);

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const togglePlayPause = () => { if (audioRef.current && !hasPlayedAudio) { isPlaying ? audioRef.current.pause() : audioRef.current.play(); setIsPlaying(!isPlaying); } };
  const handleTimeUpdate = () => { if (audioRef.current?.duration && isFinite(audioRef.current.duration)) { setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100); setAudioCurrentTime(audioRef.current.currentTime); } };
  const handleLoadedMetadata = () => { if (audioRef.current?.duration) setAudioDuration(Math.floor(audioRef.current.duration)); };
  const handleAudioEnded = () => { setIsPlaying(false); setHasPlayedAudio(true); setTimeout(() => setPhase('questions'), 500); };
  const handleAnswerSelect = (qId: string, aId: string) => setAnswers(p => ({...p, [qId]: aId}));

  const handleNext = () => {
    if (phase === 'instructions') setPhase('listening');
    else if (phase === 'listening') { if (audioRef.current) audioRef.current.pause(); setIsPlaying(false); setHasPlayedAudio(true); setPhase('questions'); }
    else if (phase === 'questions') handleComplete();
  };

  const handleBack = () => {
    if (phase === 'listening') setPhase('instructions');
    else if (phase === 'questions') { setPhase('listening'); setHasPlayedAudio(false); }
    else if (phase === 'results' || phase === 'answerKey') setPhase('results');
  };

  const handleComplete = () => {
    const correctCount = allQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
    setTestResults({ scenarioId: scenario.id, answers, score: correctCount, totalQuestions, timeSpent: Math.floor((Date.now() - (testStartTime ?? Date.now())) / 1000) });
    setPhase('results');
  };

  const resetTest = () => { setPhase('instructions'); setAnswers({}); setHasPlayedAudio(false); setAudioProgress(0); setAudioCurrentTime(0); setTimeLeft(300); setShowTranscript(false); setTestStartTime(null); setIsPlaying(false); };
  const progressPercentage = (answeredCount / totalQuestions) * 100;

  const renderInstructions = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-xl"><Headphones className="w-10 h-10 text-white" /></div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Listening to a News Item</h2>
        <p className="text-slate-500 text-lg">{scenario.title?.replace(/_/g, ' ')}</p>
      </div>
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-8 border border-slate-200/80">
        <h3 className="font-semibold text-slate-900 mb-5 flex items-center gap-2 text-lg"><div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><Info className="w-4 h-4 text-blue-600" /></div>Instructions</h3>
        <div className="space-y-3">
          {['You will hear a news item. You will hear it only once.', `After the news item, you will answer ${totalQuestions} questions using dropdown menus.`, 'Choose the best answer to each question from the drop-down menu.'].map((text, i) => (
            <div key={i} className="flex items-start gap-4"><span className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-lg">{i+1}</span><p className="text-slate-700 pt-1">{text}</p></div>
          ))}
        </div>
      </div>
      <button onClick={handleNext} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold text-lg hover:shadow-xl flex items-center justify-center gap-3">Continue <ArrowRight className="w-5 h-5" /></button>
    </div>
  );

  const renderListening = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-5 border border-slate-200/80">
        <div className="flex items-center justify-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Info className="w-5 h-5 text-blue-600" /></div><p className="text-xl text-slate-700">Listen to the news item. You will hear it only <span className="text-orange-500 font-bold">once</span>.</p></div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4"><span className="font-semibold text-slate-900 text-lg">News Item Audio</span><span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{totalQuestions} questions follow</span></div>
          <div className="flex items-center gap-4 mb-6">
            <button onClick={togglePlayPause} disabled={hasPlayedAudio} className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${hasPlayedAudio ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105'}`}>{isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}</button>
            <div className="flex-1 flex items-center gap-3"><span className="text-sm text-slate-500 font-mono w-12">{formatTime(Math.floor(audioCurrentTime))}</span><div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{width:`${audioProgress}%`}} /></div><span className="text-sm text-slate-500 font-mono w-12">{formatTime(audioDuration)}</span></div>
            <Volume2 className="w-5 h-5 text-slate-500" />
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50"><p className="text-sm text-amber-800"><span className="font-bold">Tip:</span> focus on main idea, key details, numbers, and names.</p></div>
        </div>
        {audioUrl && <audio ref={audioRef} src={audioUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleAudioEnded} />}
        {transcript && (<><button onClick={() => setShowTranscript(!showTranscript)} className="mt-6 w-full py-4 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50">{showTranscript ? 'Hide Transcript' : 'Show Transcript'}</button>{showTranscript && <div className="mt-4 bg-white rounded-xl p-4 border border-slate-200 text-left text-sm text-slate-700 max-h-48 overflow-y-auto whitespace-pre-line">{transcript}</div>}</>)}
      </div>
      <p className="text-sm text-slate-400 mb-6 text-center">In the real test, the audio plays once and no transcript is available.</p>
      <div className="flex gap-4"><button onClick={handleBack} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 flex items-center justify-center gap-2"><ArrowLeft className="w-5 h-5" /> Back</button><button onClick={handleNext} className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl flex items-center justify-center gap-3">Next <ArrowRight className="w-5 h-5" /></button></div>
    </div>
  );

  const renderQuestions = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-xl font-bold text-slate-900">{scenario.title?.replace(/_/g, ' ')} - Listening Part 4: Listening to a News Item</h2><p className="text-slate-500 text-sm mt-1">Choose the best answer to each question from the drop-down menu (▼).</p></div>
        <div className="flex items-center gap-3"><div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}><Clock className="w-4 h-4" /><span className="font-medium">Time remaining: {formatTime(timeLeft)}</span></div><button onClick={handleNext} disabled={answeredCount < totalQuestions} className={`px-6 py-2 rounded-lg font-semibold ${answeredCount >= totalQuestions ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>NEXT</button></div>
      </div>
      <div className="space-y-4 divide-y divide-slate-100">
        {allQuestions.map((q, idx) => (
          <div key={q.id} className="pt-4 first:pt-0"><div className="flex items-center gap-4 flex-wrap"><span className="text-slate-700 font-medium">{idx+1}. {q.questionText}</span><div className="relative inline-block"><select value={answers[q.id] || ''} onChange={(e) => handleAnswerSelect(q.id, e.target.value)} className={`appearance-none bg-white border rounded-lg px-4 py-2 pr-8 font-medium cursor-pointer min-w-[200px] ${answers[q.id] ? 'border-blue-500 text-slate-900' : 'border-slate-300 text-slate-500'}`}><option value="" disabled>Select an answer...</option>{q.options.map((opt, i) => <option key={opt.id} value={opt.id}>{String.fromCharCode(65+i)}. {opt.text}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" /></div></div></div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200"><button onClick={() => setPhase('answerKey')} className="px-6 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50">Answer Key</button><span className="text-slate-500">Answered: <span className="font-semibold text-slate-700">{answeredCount}</span> / {totalQuestions}</span><button onClick={handleBack} className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600">BACK</button></div>
    </div>
  );

  const renderAnswerKey = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-slate-900">Answer Key</h2><button onClick={() => setPhase('questions')} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-6 h-6 text-slate-500" /></button></div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {allQuestions.map((q, idx) => { const isCorrect = answers[q.id] === q.correctAnswer; const userAnswer = q.options.find(o => o.id === answers[q.id]); const correctAnswer = q.options.find(o => o.id === q.correctAnswer); const uIdx = q.options.findIndex(o => o.id === answers[q.id]); const cIdx = q.options.findIndex(o => o.id === q.correctAnswer);
          return (<div key={q.id} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}><div className="flex items-start gap-3"><div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>{isCorrect ? <CheckCircle className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}</div><div className="flex-1"><p className="font-semibold text-slate-900 text-sm mb-1">Q{idx+1}: {q.questionText}</p><p className="text-sm text-slate-600">Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer ? `${String.fromCharCode(65+uIdx)}. ${userAnswer.text}` : 'Not answered'}</span></p>{!isCorrect && correctAnswer && <p className="text-sm text-green-600 font-medium">Correct: {String.fromCharCode(65+cIdx)}. {correctAnswer.text}</p>}</div></div></div>);
        })}
      </div>
      <button onClick={() => setPhase('questions')} className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold">Back to Questions</button>
    </div>
  );

  const renderResults = () => { const correctCount = allQuestions.filter(q => answers[q.id] === q.correctAnswer).length; const pct = Math.round((correctCount / totalQuestions) * 100);
    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
        <div className="text-center mb-8"><div className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6 shadow-xl ${pct >= 70 ? 'bg-gradient-to-br from-green-400 to-emerald-500' : pct >= 50 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-red-400 to-rose-500'}`}>{pct >= 70 ? <CheckCircle className="w-12 h-12 text-white" /> : <AlertCircle className="w-12 h-12 text-white" />}</div><h2 className="text-3xl font-bold text-slate-900 mb-2">Test Complete!</h2><p className="text-slate-500 text-lg">News Item - {scenario.title?.replace(/_/g, ' ')}</p></div>
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-8 mb-8 border border-slate-200/80"><div className="grid grid-cols-3 gap-8 text-center"><div><p className="text-sm text-slate-500 mb-2">Score</p><p className="text-5xl font-bold text-slate-900">{correctCount}<span className="text-2xl text-slate-400">/{totalQuestions}</span></p></div><div><p className="text-sm text-slate-500 mb-2">Accuracy</p><p className={`text-5xl font-bold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</p></div><div><p className="text-sm text-slate-500 mb-2">Time</p><p className="text-5xl font-bold text-slate-900">{formatTime(testResults?.timeSpent || 0)}</p></div></div></div>
        <div className="mb-8"><h3 className="font-bold text-slate-900 text-lg mb-4">Question Review</h3><div className="space-y-3 max-h-64 overflow-y-auto">{allQuestions.map((q, idx) => { const isCorrect = answers[q.id] === q.correctAnswer; const userAnswer = q.options.find(o => o.id === answers[q.id]); const correctAnswer = q.options.find(o => o.id === q.correctAnswer); const uIdx = q.options.findIndex(o => o.id === answers[q.id]); const cIdx = q.options.findIndex(o => o.id === q.correctAnswer); return (<div key={q.id} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}><div className="flex items-start gap-3"><div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>{isCorrect ? <CheckCircle className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}</div><div className="flex-1"><p className="font-semibold text-slate-900 text-sm mb-1">Q{idx+1}: {q.questionText}</p><p className="text-sm text-slate-600">Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer ? `${String.fromCharCode(65+uIdx)}. ${userAnswer.text}` : 'Not answered'}</span></p>{!isCorrect && correctAnswer && <p className="text-sm text-green-600 font-medium">Correct: {String.fromCharCode(65+cIdx)}. {correctAnswer.text}</p>}</div></div></div>); })}</div></div>
        <div className="flex gap-4"><button onClick={resetTest} className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 flex items-center justify-center gap-2"><RotateCcw className="w-5 h-5" /> Try Again</button><button onClick={() => setPhase('answerKey')} className="px-6 py-4 rounded-2xl bg-white border-2 border-slate-200 font-semibold hover:bg-slate-50">Answer Key</button><button onClick={() => testResults ? onComplete(testResults) : onBack()} className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl flex items-center justify-center gap-3">Finish <ArrowRight className="w-5 h-5" /></button></div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50"><div className="max-w-6xl mx-auto px-6 py-4"><div className="flex items-center justify-between"><div className="flex items-center gap-6"><button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium"><ArrowLeft className="w-5 h-5" /> Exit</button><span className="font-bold text-slate-900 text-lg">Listening • News Item</span>{phase === 'questions' && (<div className="hidden md:flex items-center gap-3 flex-1 max-w-sm"><div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{width:`${progressPercentage}%`}} /></div><span className="text-sm text-slate-500">{Math.round(progressPercentage)}%</span></div>)}</div><div className="flex items-center gap-4"><span className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-full">{phase === 'instructions' ? 'Introduction' : phase === 'listening' ? 'Listening' : phase === 'questions' ? 'Question' : 'Results'}</span>{phase === 'questions' && (<div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}><Clock className="w-4 h-4" /><span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span></div>)}</div></div></div></header>
      <main className="max-w-6xl mx-auto px-6 py-6">{phase === 'instructions' && renderInstructions()}{phase === 'listening' && renderListening()}{phase === 'questions' && renderQuestions()}{phase === 'results' && renderResults()}{phase === 'answerKey' && renderAnswerKey()}</main>
    </div>
  );
};

export default ListeningNewsItemTest;
