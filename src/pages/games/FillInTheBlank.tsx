// src/pages/games/FillInTheBlank.tsx
import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, RefreshCw, Trophy, Clock, ChevronRight, Loader2 } from "lucide-react";
import { generateGameContent } from "./gameAI";
import { startSession, stopSession } from "./sessionTracker";
interface GameConfig { topic: string; difficulty: string; duration: number; }
interface Props { config: GameConfig; onBack: () => void; }
interface Question { sentence: string; options: string[]; correct: string; explanation: string; }

const CLB: Record<string,string> = { beginner:"CLB 4-5", intermediate:"CLB 6-7", advanced:"CLB 8+" };
const GRAMMAR_FOCUS: Record<string,string> = {
  beginner: "simple present, past tense, basic prepositions, articles",
  intermediate: "present perfect, continuous tenses, modal verbs, phrasal verbs",
  advanced: "past perfect, conditionals, passive voice, complex grammar structures",
};

function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }


function FillInBlankInner({ config, onBack, onReset }: { config: GameConfig; onBack:()=>void; onReset:()=>void }) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [genError, setGenError] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string|null>(null);
  const [feedback, setFeedback] = useState<"correct"|"wrong"|null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<"correct"|"wrong"|null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const seed = Math.floor(Math.random() * 100000);
        const prompt = `Generate exactly 7 fill-in-the-blank English grammar questions related to "${config.topic}" at ${config.difficulty} level (${CLB[config.difficulty]}). Session seed: ${seed}.
Grammar focus: ${GRAMMAR_FOCUS[config.difficulty]}.
Each question must have exactly 4 options (only ONE is correct), and a brief explanation.
Make the distractors plausible (not obviously wrong).
Return ONLY a JSON array:
[{"sentence":"She ___ to work every day.","options":["go","goes","went","going"],"correct":"goes","explanation":"Third person singular uses -s in simple present"}]`;
        const generated = await generateGameContent<Question[]>(prompt, []);
        const valid = generated.filter(q => q?.sentence && q?.options?.length === 4 && q?.correct && q?.explanation
          && q.options.includes(q.correct) && q.sentence.includes("___"));
        if (valid.length < 3) { setGenError(true); return; }
        setQuestions(shuffle(valid).slice(0, 5));
      } catch {
        setGenError(true);
      } finally {
        setIsGenerating(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (gameOver || isGenerating) return;
    if (timeLeft <= 0) { setGameOver(true); return; }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, gameOver, isGenerating]);
  
  // ── Session tracking ──────────────────────────
  useEffect(() => {
    if (!isGenerating && !genError) {
      startSession("fb", "Fill in the Blank", "grammar", config.topic, config.difficulty);
    }
    return () => stopSession();
  }, [isGenerating, genError]);

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const current = questions[idx];
  const shuffledOpts = useMemo(() => current ? shuffle([...current.options]) : [], [idx, questions.length]);

  const handleSelect = (opt: string) => {
    if (!current) return;
    // During correction: show result immediately, don't allow re-picking
    if (correcting && !correctionResult) {
      setSelected(opt);
      const ok = opt === current.correct;
      setCorrectionResult(ok ? "correct" : "wrong");
      return;
    }
    // Normal first attempt
    if (feedback) return;
    setSelected(opt);
    const ok = opt === current.correct;
    setFeedback(ok ? "correct" : "wrong");
    if (ok) setScore(s => s + 1);
  };

  const startCorrection = () => {
    setFeedback(null);
    setCorrecting(true);
    setCorrectionResult(null);
    setSelected(null);
  };

  const next = () => {
    if (idx + 1 >= questions.length) { setGameOver(true); return; }
    setIdx(i => i + 1);
    setSelected(null);
    setFeedback(null);
    setCorrecting(false);
    setCorrectionResult(null);
  };

  const renderSentence = () => {
    if (!current) return null;
    const parts = current.sentence.split("___");
    const displayWord = selected || "___";
    const fillColor = correctionResult === "correct" ? "bg-green-100 text-green-800 border-green-500"
      : correctionResult === "wrong" ? "bg-red-50 text-red-700 border-red-400"
      : correcting && !selected ? "bg-amber-50 text-amber-600 border-amber-400"
      : feedback === "correct" ? "bg-green-100 text-green-800 border-green-500"
      : feedback === "wrong" ? "bg-red-50 text-red-700 border-red-400"
      : selected ? "bg-orange-50 text-orange-700 border-orange-400"
      : "bg-gray-100 text-gray-400 border-gray-400";
    return (
      <span>
        {parts[0]}
        <span className={`inline-block min-w-[90px] px-3 py-0.5 mx-1 rounded-lg font-bold border-b-2 text-center ${fillColor}`}>
          {displayWord}
        </span>
        {parts[1]}
      </span>
    );
  };

  // Option button styling
  const optionStyle = (opt: string) => {
    const isCorrect = opt === current?.correct;
    const isSel = opt === selected;

    // After correction attempt: reveal correct/wrong
    if (correctionResult) {
      if (isCorrect) return "bg-green-100 border-green-500 text-green-800";
      if (isSel && !isCorrect) return "bg-red-100 border-red-400 text-red-700";
      return "bg-gray-50 border-gray-200 text-gray-400";
    }
    // During correction mode (before picking): show as fresh options
    if (correcting) {
      return "bg-white border-orange-200 text-orange-800 hover:bg-orange-50 hover:border-orange-400 cursor-pointer";
    }
    // After first attempt: reveal
    if (feedback) {
      if (isCorrect) return "bg-green-100 border-green-500 text-green-800";
      if (isSel) return "bg-red-100 border-red-400 text-red-700";
      return "bg-gray-50 border-gray-200 text-gray-400";
    }
    // Default (no feedback yet)
    return "bg-white border-orange-200 text-orange-800 hover:bg-orange-50 hover:border-orange-400 cursor-pointer";
  };

  if (isGenerating) return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-xs w-full mx-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4"/>
        <p className="text-gray-700 font-semibold">Generating AI grammar questions…</p>
        <p className="text-gray-400 text-sm mt-1">Every session is unique!</p>
      </div>
    </div>
  );

  if (genError) return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-xs w-full mx-4">
        <p className="text-gray-700 font-semibold mb-2">Could not generate questions</p>
        <p className="text-gray-400 text-sm mb-5">Please make sure an AI provider is connected in settings.</p>
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Back</button>
          <button onClick={onReset} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-1"><RefreshCw className="w-4 h-4"/>Retry</button>
        </div>
      </div>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-orange-50">
      <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4"/>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Complete! 🎉</h2>
        <p className="text-gray-500 mb-6">{score} of {questions.length} correct</p>
        <div className="text-5xl font-black text-orange-500 mb-6">{Math.round(score/questions.length*100)}%</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack} className="py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Exit</button>
          <button onClick={onReset} className="py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Quiz</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-orange-50 pb-8">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium"><ArrowLeft className="w-4 h-4"/>Back</button>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">{questions.map((_,i)=><div key={i} className={`w-2 h-2 rounded-full ${i<idx?"bg-orange-400":i===idx?"bg-orange-600":"bg-gray-200"}`}/>)}</div>
          <span className={`flex items-center gap-1 font-semibold text-sm ${timeLeft<30?"text-red-500":"text-gray-700"}`}><Clock className="w-4 h-4"/>{fmt(timeLeft)}</span>
        </div>
      </div>
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="text-xs text-orange-500 font-semibold uppercase tracking-wide mb-1">Question {idx+1} of {questions.length}</div>
        <h1 className="text-lg font-bold text-gray-800 mb-6">Fill in the Blank — {config.topic}</h1>
        <div className="bg-white rounded-2xl border border-orange-200 p-6 mb-6 shadow-sm">
          <p className="text-xl text-gray-800 font-medium leading-relaxed text-center">{renderSentence()}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {shuffledOpts.map(opt => (
            <button key={opt}
              onClick={() => handleSelect(opt)}
              disabled={!!feedback && !correcting || !!correctionResult}
              className={`py-4 px-3 rounded-2xl border-2 text-sm font-semibold transition text-center ${optionStyle(opt)}`}>
              {opt}
            </button>
          ))}
        </div>

        {/* Feedback / correction banners */}
        {feedback && !correcting && (
          <div className={`rounded-xl px-4 py-3 mb-5 text-sm ${feedback==="correct"?"bg-green-100 text-green-800":"bg-red-50 text-red-700"}`}>
            {feedback==="correct"
              ? <><strong>✓ Correct!</strong> {current?.explanation}</>
              : <><strong>✗ Incorrect.</strong> Answer: "<strong>{current?.correct}</strong>". {current?.explanation}</>}
          </div>
        )}
        {correcting && !correctionResult && (
          <div className="rounded-xl px-4 py-3 mb-5 text-sm font-medium bg-amber-50 text-amber-700">
            ✏️ Select the correct answer from the options above
          </div>
        )}
        {correcting && correctionResult && (
          <div className={`rounded-xl px-4 py-3 mb-5 text-sm ${correctionResult==="correct"?"bg-green-100 text-green-800":"bg-red-50 text-red-700"}`}>
            {correctionResult==="correct"
              ? <><strong>✓ Well corrected!</strong> {current?.explanation}</>
              : <><strong>✗ Not quite.</strong> Answer: "<strong>{current?.correct}</strong>". {current?.explanation}</>}
          </div>
        )}

        <div className="flex gap-3">
          {correcting ? (
            correctionResult ? (
              <button onClick={next} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 flex items-center justify-center gap-2">
                {idx+1<questions.length?"Next Question":"See Results"} <ChevronRight className="w-4 h-4"/>
              </button>
            ) : (
              <button onClick={next} className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Skip</button>
            )
          ) : !feedback ? (
            <button onClick={onReset} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Session</button>
          ) : feedback==="correct" ? (
            <button onClick={next} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 flex items-center justify-center gap-2">
              {idx+1<questions.length?"Next Question":"See Results"} <ChevronRight className="w-4 h-4"/>
            </button>
          ) : (
            <>
              <button onClick={startCorrection} className="flex-1 py-3 rounded-xl border-2 border-orange-500 text-orange-500 font-semibold text-sm hover:bg-orange-50 transition">✏️ Try to Correct</button>
              <button onClick={next} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 flex items-center justify-center gap-2">
                {idx+1<questions.length?"Next Question":"See Results"} <ChevronRight className="w-4 h-4"/>
              </button>
            </>
          )}
        </div>
        <p className="text-center mt-3 text-xs text-gray-500">Score: <span className="font-bold text-orange-600">{score}/{idx+(feedback||correctionResult?1:0)}</span></p>
      </div>
    </div>
  );
}

export default function FillInTheBlank({ config, onBack }: Props) {
  const [key, setKey] = useState(0);
  return <FillInBlankInner key={key} config={config} onBack={onBack} onReset={() => setKey(k => k + 1)} />;
}
