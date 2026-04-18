// src/pages/games/MatchingGame.tsx
import React, { useState, useCallback, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, Clock, Eye, Loader2 } from "lucide-react";
import { generateGameContent } from "./gameAI";
import { startSession, stopSession } from "./sessionTracker";
interface GameConfig { topic: string; difficulty: string; duration: number; }
interface Props { config: GameConfig; onBack: () => void; }
interface Pair { word: string; definition: string; }

const CLB: Record<string, string> = { beginner: "CLB 4-5", intermediate: "CLB 6-7", advanced: "CLB 8+" };
const PAIR_COUNT: Record<string, number> = { beginner: 8, intermediate: 12, advanced: 16 };


function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }

interface Card { id: string; value: string; pairId: string; type: "word"|"definition"; flipped: boolean; matched: boolean; revealed: boolean; }

function buildCards(pairs: Pair[]): Card[] {
  const cards: Card[] = [];
  pairs.forEach((p, i) => {
    const pid = String(i);
    cards.push({ id:`w${i}`, value:p.word, pairId:pid, type:"word", flipped:false, matched:false, revealed:false });
    cards.push({ id:`d${i}`, value:p.definition, pairId:pid, type:"definition", flipped:false, matched:false, revealed:false });
  });
  return shuffle(cards);
}

function MatchingInner({ config, onBack, onReset }: { config: GameConfig; onBack:()=>void; onReset:()=>void }) {
  const pairCount = PAIR_COUNT[config.difficulty] || 8;

  const [isGenerating, setIsGenerating] = useState(true);
  const [genError, setGenError] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matches, setMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [gameOver, setGameOver] = useState(false);
  const [shakeIds, setShakeIds] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const seed = Math.floor(Math.random() * 100000);
        const prompt = `Generate exactly ${pairCount + 4} unique word-definition pairs for an English matching game about "${config.topic}" at ${config.difficulty} level (${CLB[config.difficulty]}). Session seed: ${seed}.
Rules: definitions must be 4-7 words max, no duplicate words, varied interesting vocabulary beyond the obvious.
Return ONLY a JSON array: [{"word":"vocabulary","definition":"range of known words"}]`;
        const generated = await generateGameContent<Pair[]>(prompt, []);
        const valid = generated.filter(p => p?.word && p?.definition).slice(0, pairCount);
        if (valid.length < pairCount) { setGenError(true); return; }
        setCards(buildCards(valid));
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
    startSession("mg", "Matching Game", "vocabulary", config.topic, config.difficulty);
  }
  return () => stopSession();
}, [isGenerating, genError]);

  useEffect(() => { if (matches === pairCount && pairCount > 0) setGameOver(true); }, [matches, pairCount]);

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  const handleClick = useCallback((id: string) => {
    if (gameOver || selected.length === 2 || checked) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.matched || card.flipped) return;
    const newSel = [...selected, id];
    setCards(prev => prev.map(c => c.id===id ? {...c, flipped:true} : c));
    setSelected(newSel);
    if (newSel.length === 2) {
      setAttempts(a => a + 1);
      const [a, b] = newSel;
      const ca = cards.find(c => c.id===a)!, cb = cards.find(c => c.id===b)!;
      if (ca.pairId === cb.pairId) {
        setTimeout(() => { setCards(prev => prev.map(c => newSel.includes(c.id) ? {...c, matched:true} : c)); setMatches(m => m+1); setSelected([]); }, 500);
      } else {
        setShakeIds(newSel);
        setTimeout(() => { setCards(prev => prev.map(c => newSel.includes(c.id) ? {...c, flipped:false} : c)); setSelected([]); setShakeIds([]); }, 900);
      }
    }
  }, [selected, cards, gameOver, checked]);

  if (isGenerating) return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-xs w-full mx-4">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4"/>
        <p className="text-gray-700 font-semibold">Generating AI word pairs…</p>
        <p className="text-gray-400 text-sm mt-1">Every session is unique!</p>
      </div>
    </div>
  );

  if (genError) return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-xs w-full mx-4">
        <p className="text-gray-700 font-semibold mb-2">Could not generate word pairs</p>
        <p className="text-gray-400 text-sm mb-5">Please make sure an AI provider is connected in settings.</p>
        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Back</button>
          <button onClick={onReset} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-1"><RefreshCw className="w-4 h-4"/>Retry</button>
        </div>
      </div>
    </div>
  );

  if (gameOver) {
    const acc = attempts > 0 ? Math.round((matches/attempts)*100) : 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-purple-50">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{matches===pairCount?"Perfect Match! 🎉":"Game Over!"}</h2>
          <p className="text-gray-500 mb-4">{matches}/{pairCount} pairs matched</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-purple-50 rounded-xl p-3"><div className="text-2xl font-black text-purple-600">{acc}%</div><div className="text-xs text-gray-500">Accuracy</div></div>
            <div className="bg-purple-50 rounded-xl p-3"><div className="text-2xl font-black text-purple-600">{attempts}</div><div className="text-xs text-gray-500">Attempts</div></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onBack} className="py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Exit</button>
            <button onClick={onReset} className="py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Game</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 pb-8">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium"><ArrowLeft className="w-4 h-4"/>Back</button>
        <div className="flex items-center gap-4">
          <span className="text-purple-600 font-semibold text-sm">{matches}/{pairCount} matched</span>
          <span className={`flex items-center gap-1 font-semibold text-sm ${timeLeft<30?"text-red-500":"text-gray-700"}`}><Clock className="w-4 h-4"/>{fmt(timeLeft)}</span>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-3 py-4">
        <h1 className="text-lg font-bold text-gray-800 mb-1">Matching Game — {config.topic}</h1>
        <p className="text-sm text-gray-500 mb-4">Click a word, then click its matching definition.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {cards.map(card => (
            <button key={card.id} onClick={() => handleClick(card.id)} disabled={card.matched || card.flipped}
              className={`relative min-h-[90px] rounded-2xl border-2 p-3 text-sm font-medium transition flex items-center justify-center text-center leading-snug
                ${shakeIds.includes(card.id) ? "animate-pulse" : ""}
                ${card.matched ? "bg-purple-100 border-purple-300 text-purple-700 opacity-70 cursor-default"
                  : card.revealed ? "bg-gray-100 border-gray-300 text-gray-500 cursor-default"
                  : card.flipped ? card.type==="word" ? "bg-purple-600 border-purple-600 text-white shadow-md" : "bg-indigo-100 border-indigo-300 text-indigo-800 shadow-md"
                  : "bg-white border-gray-200 text-gray-800 hover:border-purple-300 hover:shadow-sm cursor-pointer"}`}>
              {card.flipped||card.matched||card.revealed ? <span className="px-0.5">{card.value}</span> : <span className="text-gray-200 text-2xl font-black">?</span>}
              {card.matched && <span className="absolute top-0.5 right-1 text-purple-500 text-[10px]">✓</span>}
              {card.revealed && !card.matched && <span className="absolute top-0.5 right-1 text-gray-400 text-[10px]">👁</span>}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setCards(prev => prev.map(c => c.matched ? c : {...c, flipped:true, revealed:true})); setChecked(true); setTimeout(() => setGameOver(true), 2500); }} disabled={checked}
            className="py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-40">
            <Eye className="w-4 h-4"/>Check Answer
          </button>
          <button onClick={onReset} className="py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4"/>New Pairs
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MatchingGame({ config, onBack }: Props) {
  const [key, setKey] = useState(0);
  return <MatchingInner key={key} config={config} onBack={onBack} onReset={() => setKey(k => k + 1)} />;
}
