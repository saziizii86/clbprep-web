// src/pages/games/SentenceBuilder.tsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, Clock, ChevronRight, Loader2 } from "lucide-react";
import { generateGameContent } from "./gameAI";
import { startSession, stopSession } from "./sessionTracker";
interface GameConfig { topic: string; difficulty: string; duration: number; }
interface Props { config: GameConfig; onBack: () => void; }
interface Sentence { words: string[]; correct: string; hint: string; }

const CLB: Record<string,string> = { beginner:"CLB 4-5", intermediate:"CLB 6-7", advanced:"CLB 8+" };
const WORDS_RANGE: Record<string,string> = { beginner:"5-8 words, simple grammar", intermediate:"8-12 words, varied tenses", advanced:"12-18 words, complex grammar and clauses" };


function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }

function SentenceBuilderInner({ config, onBack, onReset }: { config: GameConfig; onBack:()=>void; onReset:()=>void }) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [genError, setGenError] = useState(false);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [idx, setIdx] = useState(0);
  const [pool, setPool] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
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
        const prompt = `Generate exactly 7 English sentences about "${config.topic}" at ${config.difficulty} level (${CLB[config.difficulty]}) for a word-unscrambling game. Session seed: ${seed}.
Each sentence: ${WORDS_RANGE[config.difficulty]}. Use natural Canadian English. Vary the grammar structures.
Return ONLY a JSON array: [{"sentence":"Full correct sentence here.","hint":"2-word topic context"}]`;
        const generated = await generateGameContent<Array<{sentence:string;hint:string}>>(prompt, []);
        const valid: Sentence[] = generated.filter(s => s?.sentence && s?.hint).map(s => ({
          sentence: s.sentence,
          hint: s.hint,
          words: shuffle(s.sentence.replace(/\.$/, "").split(" ").filter(Boolean)),
          correct: s.sentence.replace(/\.$/, ""),
        }));
        if (valid.length < 3) { setGenError(true); return; }
        const final = shuffle(valid).slice(0, 5);
        setSentences(final);
        setPool(shuffle(final[0].words));
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
      startSession("sb", "Sentence Builder", "grammar", config.topic, config.difficulty);
    }
    return () => stopSession();
  }, [isGenerating, genError]);

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const current = sentences[idx];

  const addWord = (w: string, i: number) => {
    if ((feedback && !correcting) || correctionResult) return;
    const np = [...pool]; np.splice(i, 1);
    setPool(np); setAnswer(p => [...p, w]);
  };
  const removeWord = (i: number) => {
    if ((feedback && !correcting) || correctionResult) return;
    const w = answer[i]; const na = [...answer]; na.splice(i, 1);
    setAnswer(na); setPool(p => [...p, w]);
  };
  const check = () => {
    const ok = answer.join(" ").toLowerCase() === current.correct.toLowerCase();
    if (correcting) {
      setCorrectionResult(ok ? "correct" : "wrong");
    } else {
      setFeedback(ok ? "correct" : "wrong");
      if (ok) setScore(s => s + 1);
    }
  };
  const startCorrection = () => {
    setFeedback(null);
    setCorrecting(true);
    setCorrectionResult(null);
    setAnswer([]);
    setPool(shuffle(current.words));
  };
  const next = () => {
    if (idx + 1 >= sentences.length) { setGameOver(true); return; }
    const ni = idx + 1;
    setIdx(ni); setPool(shuffle(sentences[ni].words)); setAnswer([]);
    setFeedback(null); setCorrecting(false); setCorrectionResult(null);
  };

  if (isGenerating) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-xs w-full mx-4">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4"/>
        <p className="text-gray-700 font-semibold">Generating AI sentences…</p>
        <p className="text-gray-400 text-sm mt-1">Every session is unique!</p>
      </div>
    </div>
  );

  if (genError) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-xs w-full mx-4">
        <p className="text-gray-700 font-semibold mb-2">Could not generate sentences</p>
        <p className="text-gray-400 text-sm mb-5">Please make sure an AI provider is connected in settings.</p>
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Back</button>
          <button onClick={onReset} className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm flex items-center justify-center gap-1"><RefreshCw className="w-4 h-4"/>Retry</button>
        </div>
      </div>
    </div>
  );

  if (gameOver) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-green-50">
      <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
        <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4"/>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Well Done! 🎉</h2>
        <p className="text-gray-500 mb-6">{score} of {sentences.length} correct</p>
        <div className="text-5xl font-black text-green-600 mb-6">{Math.round(score/sentences.length*100)}%</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onBack} className="py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Exit</button>
          <button onClick={onReset} className="py-3 rounded-xl bg-green-600 text-white font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Game</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-green-50 pb-8">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium"><ArrowLeft className="w-4 h-4"/>Back</button>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">{sentences.map((_,i)=><div key={i} className={`w-2 h-2 rounded-full ${i<idx?"bg-green-400":i===idx?"bg-green-600":"bg-gray-200"}`}/>)}</div>
          <span className={`flex items-center gap-1 font-semibold text-sm ${timeLeft<30?"text-red-500":"text-gray-700"}`}><Clock className="w-4 h-4"/>{fmt(timeLeft)}</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-800">Sentence Builder — {config.topic}</h1>
          <span className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-1 rounded-full">{idx+1} of {sentences.length}</span>
        </div>
        <p className="text-sm text-gray-500 mb-1">Arrange the words to form the correct sentence.</p>
        <p className="text-xs text-gray-400 italic mb-5">💡 {current.hint}</p>

        {/* Answer zone */}
        <div className={`min-h-[80px] rounded-2xl border-2 border-dashed p-4 mb-4 flex flex-wrap gap-2 items-start transition
          ${correctionResult==="correct"?"bg-green-100 border-green-400":correctionResult==="wrong"?"bg-red-50 border-red-300":correcting?"bg-amber-50 border-amber-300":feedback==="correct"?"bg-green-100 border-green-400":feedback==="wrong"?"bg-red-50 border-red-300":"bg-white border-gray-300"}`}>
          {answer.length===0 ? <span className="text-gray-300 text-sm">Tap words below to build your sentence…</span>
            : answer.map((w,i)=><button key={`a${i}`} onClick={()=>removeWord(i)} className="px-3 py-1.5 rounded-xl bg-green-600 text-white text-sm font-semibold shadow-sm hover:bg-green-700">{w} ×</button>)}
        </div>

        {/* Feedback / correction banners */}
        {feedback && !correcting && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${feedback==="correct"?"bg-green-100 text-green-800":"bg-red-50 text-red-700"}`}>
            {feedback==="correct" ? "✓ Correct! Well done!" : `✗ Correct sentence: "${current.correct}"`}
          </div>
        )}
        {correcting && !correctionResult && (
          <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium bg-amber-50 text-amber-700">
            ✏️ Re-arrange the words to form the correct sentence
          </div>
        )}
        {correcting && correctionResult && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${correctionResult==="correct"?"bg-green-100 text-green-800":"bg-red-50 text-red-700"}`}>
            {correctionResult==="correct" ? "✓ Well corrected!" : `✗ Not quite. Correct: "${current.correct}"`}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {pool.map((w,i)=><button key={`p${i}`} onClick={()=>addWord(w,i)} className="px-3 py-1.5 rounded-xl bg-white border-2 border-green-200 text-green-800 text-sm font-semibold hover:bg-green-50 transition shadow-sm">{w}</button>)}
        </div>

        <div className="flex gap-3">
          {correcting ? (
            correctionResult ? (
              <button onClick={next} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2">
                {idx+1<sentences.length?"Next Sentence":"See Results"} <ChevronRight className="w-4 h-4"/>
              </button>
            ) : (
              <>
                <button onClick={next} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Skip</button>
                <button onClick={check} disabled={answer.length===0} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-50 hover:bg-green-700">Check Correction</button>
              </>
            )
          ) : !feedback ? (
            <>
              <button onClick={onReset} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Session</button>
              <button onClick={check} disabled={answer.length===0} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-50 hover:bg-green-700">Check Answer</button>
            </>
          ) : feedback==="correct" ? (
            <button onClick={next} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2">
              {idx+1<sentences.length?"Next Sentence":"See Results"} <ChevronRight className="w-4 h-4"/>
            </button>
          ) : (
            <>
              <button onClick={startCorrection} className="flex-1 py-3 rounded-xl border-2 border-green-600 text-green-600 font-semibold text-sm hover:bg-green-50 transition">✏️ Try to Correct</button>
              <button onClick={next} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2">
                {idx+1<sentences.length?"Next Sentence":"See Results"} <ChevronRight className="w-4 h-4"/>
              </button>
            </>
          )}
        </div>
        <p className="text-center mt-3 text-xs text-gray-400">Score: <span className="font-bold text-green-600">{score}/{idx+(feedback||correctionResult?1:0)}</span></p>
      </div>
    </div>
  );
}

export default function SentenceBuilder({ config, onBack }: Props) {
  const [key, setKey] = useState(0);
  return <SentenceBuilderInner key={key} config={config} onBack={onBack} onReset={() => setKey(k => k + 1)} />;
}
