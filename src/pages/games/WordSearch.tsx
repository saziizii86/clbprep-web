// src/pages/games/WordSearch.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, RefreshCw, Trophy, Clock, CheckCircle2, Eye, Loader2, Volume2, BookOpen } from "lucide-react";
import { generateGameContent } from "./gameAI";
import { getAPISettings } from "../../services/settingsService";

interface GameConfig { topic: string; difficulty: string; duration: number; }
interface Props { config: GameConfig; onBack: () => void; }

const GRID_SIZE = 14;

const STATIC_WORDS: Record<string, string[]> = {
  "Daily Life":    ["MORNING","COFFEE","SHOWER","GROCERY","COOKING","CLEANING","EVENING","LAUNDRY","COMMUTE","ROUTINE","BUDGET","LEISURE","APPLIANCE","NEIGHBOUR","CHORES","SCHEDULE","WEEKEND","ERRANDS","BEDTIME","RELAXING"],
  "Work":          ["MEETING","PROJECT","DEADLINE","OFFICE","REPORT","SCHEDULE","MANAGER","BUDGET","CLIENT","INVOICE","AGENDA","PROPOSAL","TEAMWORK","STRATEGY","FEEDBACK","PROMOTION","CONTRACT","OVERTIME","WORKLOAD","NEGOTIATE"],
  "Travel":        ["PASSPORT","LUGGAGE","AIRPORT","BOOKING","CUSTOMS","FLIGHT","HOTEL","TOURISM","TICKET","TRANSIT","ITINERARY","CURRENCY","LAYOVER","BOARDING","TERMINAL","DEPARTURE","ARRIVAL","VISA","TRAVEL","JOURNEY"],
  "Education":     ["STUDENT","TEACHER","LIBRARY","READING","WRITING","GRAMMAR","LESSON","COURSE","SCHOOL","LECTURE","SEMESTER","THESIS","ENROLL","HOMEWORK","TEXTBOOK","RESEARCH","CAMPUS","DIPLOMA","TUITION","GRADUATE"],
  "Health":        ["DOCTOR","MEDICINE","EXERCISE","HEALTHY","VITAMIN","HOSPITAL","FITNESS","CLINIC","THERAPY","WELLNESS","SYMPTOM","DIAGNOSIS","NUTRITION","RECOVERY","IMMUNITY","PHARMACY","VACCINE","PROTEIN","HYDRATION","CHECKUP"],
  "Food & Cooking":["KITCHEN","RECIPE","COOKING","DINNER","BREAKFAST","DESSERT","PROTEIN","ORGANIC","BAKING","GRILLING","SIMMER","MARINATE","GARNISH","PORTION","CUISINE","INGREDIENT","APPETIZER","SEASONING","PASTRY","BRUNCH"],
  "Shopping":      ["DISCOUNT","CHECKOUT","RECEIPT","PAYMENT","CASHIER","PRODUCT","BARGAIN","REFUND","VOUCHER","CUSTOMER","WARRANTY","WHOLESALE","RETAIL","EXCHANGE","DELIVERY","PURCHASE","BUDGET","INVOICE","SAVINGS","LOYALTY"],
  "Technology":    ["COMPUTER","INTERNET","PASSWORD","DOWNLOAD","SOFTWARE","DATABASE","NETWORK","WIRELESS","DIGITAL","WEBSITE","BANDWIDTH","ENCRYPT","BROWSER","UPLOAD","FIREWALL","SERVER","STREAMING","SECURITY","STORAGE","UPGRADE"],
  "Environment":   ["CLIMATE","RECYCLE","NATURAL","WILDLIFE","ORGANIC","CARBON","FOREST","ENERGY","PLANET","SUSTAIN","EMISSION","ECOSYSTEM","CONSERVE","POLLUTION","RENEWABLE","LANDFILL","COMPOST","HABITAT","OZONE","EROSION"],
  "Immigration":   ["CITIZEN","RESIDENCY","PASSPORT","SPONSOR","REFUGEE","PERMIT","BORDER","LANDING","DOCUMENT","STATUS","NATURALIZE","APPLICANT","DEPENDENT","INTERVIEW","PERMANENT","SETTLEMENT","ARRIVAL","IDENTITY","COUNTRY","ASYLUM"],
};

const WORD_COUNT: Record<string, number> = { beginner: 8, intermediate: 10, advanced: 10 };
const CLB: Record<string, string> = { beginner: "CLB 4-5", intermediate: "CLB 6-7", advanced: "CLB 8+" };

const FOUND_COLORS = [
  "bg-blue-200 text-blue-900","bg-purple-200 text-purple-900","bg-green-200 text-green-900",
  "bg-orange-200 text-orange-900","bg-pink-200 text-pink-900","bg-teal-200 text-teal-900",
  "bg-red-200 text-red-900","bg-yellow-200 text-yellow-900","bg-indigo-200 text-indigo-900","bg-emerald-200 text-emerald-900",
];
const REVEAL_COLOR = "bg-gray-300 text-gray-600";
type Dir = { dr: number; dc: number };
const DIRS: Dir[] = [{ dr:0,dc:1 },{ dr:1,dc:0 },{ dr:1,dc:1 },{ dr:1,dc:-1 }];

function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }

function canPlace(grid: string[][], word: string, r: number, c: number, d: Dir): boolean {
  for (let i = 0; i < word.length; i++) {
    const nr = r + d.dr * i, nc = c + d.dc * i;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
    if (grid[nr][nc] !== "" && grid[nr][nc] !== word[i]) return false;
  }
  return true;
}
function placeWord(grid: string[][], word: string, r: number, c: number, d: Dir) {
  for (let i = 0; i < word.length; i++) grid[r + d.dr * i][c + d.dc * i] = word[i];
}
type Placement = { row: number; col: number; dir: Dir };
function buildGrid(words: string[]): { grid: string[][]; placements: Record<string, Placement> } {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
  const placements: Record<string, Placement> = {};
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const word of words) {
    let placed = false;
    const dirs = shuffle(DIRS);
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const d = dirs[attempt % dirs.length];
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      if (canPlace(grid, word, r, c, d)) { placeWord(grid, word, r, c, d); placements[word] = { row: r, col: c, dir: d }; placed = true; }
    }
  }
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random() * 26)];
  return { grid, placements };
}
function getCells(word: string, p: Placement): string[] {
  return Array.from({ length: word.length }, (_, i) => `${p.row + p.dir.dr * i}-${p.col + p.dir.dc * i}`);
}

function WordSearchInner({ config, onBack, onReset }: { config: GameConfig; onBack: () => void; onReset: () => void }) {
  const count = WORD_COUNT[config.difficulty] || 10;
  const staticFallback = shuffle(STATIC_WORDS[config.topic] || STATIC_WORDS["Daily Life"]).slice(0, count);

  const [isGenerating, setIsGenerating] = useState(true);
  const [words, setWords] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>([]);
  const [placements, setPlacements] = useState<Record<string, Placement>>({});

  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundCells, setFoundCells] = useState<Record<string, string>>({});
  const [revealedCells, setRevealedCells] = useState<Record<string, boolean>>({});
  const [startCell, setStartCell] = useState<string | null>(null);
  const [hoveredCells, setHoveredCells] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordInfo, setWordInfo] = useState<Record<string, { meaning: string; example: string }>>({});
  const [infoTab, setInfoTab] = useState<"meaning"|"example">("meaning");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const diff = config.difficulty, topic = config.topic;

      // ONE combined call: words + meanings + examples together
      const prompt = `Generate exactly ${count} unique English vocabulary words related to "${topic}" at ${diff} level (${CLB[diff]}).
For each word include a brief meaning (max 6 words) and one short natural example sentence.
Rules: ALL UPPERCASE, no spaces in words, 4-12 letters, no duplicates.
Return ONLY a JSON array: [{"word":"COMMUTE","meaning":"travel to work daily","example":"She commutes to work by train every morning."}]`;

      const generated = await generateGameContent<Array<{word:string;meaning:string;example:string}>>(prompt, []);

      // Extract valid words
      const validItems = generated.filter(item => {
        const w = String(item?.word||"").toUpperCase().replace(/[^A-Z]/g,"");
        return w.length >= 4 && w.length <= 12;
      });

      const wordList = validItems.length >= count
        ? validItems.map(item => String(item.word).toUpperCase().replace(/[^A-Z]/g,"")).slice(0, count)
        : shuffle(staticFallback).slice(0, count);

      // Build info map from the same response
      const infoMap: Record<string, {meaning:string;example:string}> = {};
      validItems.forEach(item => {
        const w = String(item.word||"").toUpperCase().replace(/[^A-Z]/g,"");
        if (w && item.meaning) infoMap[w] = { meaning: item.meaning, example: item.example||"" };
      });

      const { grid: g, placements: p } = buildGrid(wordList);
      setWords(wordList);
      setGrid(g);
      setPlacements(p);
      setWordInfo(infoMap);
      setIsGenerating(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (gameOver || isGenerating) return;
    if (timeLeft <= 0) { setGameOver(true); return; }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, gameOver, isGenerating]);

  useEffect(() => {
    if (foundWords.length === words.length && words.length > 0) setGameOver(true);
  }, [foundWords, words.length]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, []);

  const speakWord = useCallback(async (word: string) => {
    // Stop any current audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    window.speechSynthesis?.cancel();
    setIsSpeaking(true);

    try {
      const settings = await getAPISettings();
      const apiKey: string = settings?.openAIKey || settings?.key || settings?.apiKey || "";
      if (apiKey) {
        const res = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "tts-1-hd", input: word.toLowerCase(), voice: "shimmer", speed: 0.85 }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = () => setIsSpeaking(false);
          audio.play();
          return;
        }
      }
    } catch (_) {}

    // Browser TTS fallback
    const utter = new SpeechSynthesisUtterance(word.toLowerCase());
    utter.lang = "en-CA"; utter.rate = 0.85;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, []);

  // On-demand info loader — fetches meaning + example for any word not already in map
  const loadWordInfo = useCallback(async (word: string) => {
    if (wordInfo[word]) return; // already loaded
    try {
      const prompt = `For the English word "${word}", provide a brief meaning (max 6 words) and one short natural example sentence.
Return ONLY a JSON array with one item: [{"word":"${word}","meaning":"brief definition","example":"A short natural sentence."}]`;
      const result = await generateGameContent<Array<{word:string;meaning:string;example:string}>>(prompt, []);
      if (result.length > 0 && result[0].meaning) {
        setWordInfo(prev => ({ ...prev, [word]: { meaning: result[0].meaning, example: result[0].example || "" } }));
      }
    } catch (_) {}
  }, [wordInfo]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const getBetween = (a: string, b: string): string[] | null => {
    const [r1,c1] = a.split("-").map(Number); const [r2,c2] = b.split("-").map(Number);
    const dr = r2-r1, dc = c2-c1, len = Math.max(Math.abs(dr),Math.abs(dc));
    if (dr!==0 && dc!==0 && Math.abs(dr)!==Math.abs(dc)) return null;
    const sr = dr===0?0:dr/Math.abs(dr), sc = dc===0?0:dc/Math.abs(dc);
    return Array.from({length:len+1},(_,i)=>`${r1+sr*i}-${c1+sc*i}`);
  };

  const handleClick = useCallback((key: string) => {
    if (gameOver || revealed) return;
    if (!startCell) { setStartCell(key); setHoveredCells([key]); return; }
    if (startCell === key) { setStartCell(null); setHoveredCells([]); return; }
    const cells = getBetween(startCell, key);
    if (!cells) { setStartCell(key); setHoveredCells([key]); return; }
    const letters = cells.map(k => { const [r,c]=k.split("-").map(Number); return grid[r][c]; }).join("");
    const rev = letters.split("").reverse().join("");
    const match = words.find(w => w===letters||w===rev);
    if (match && !foundWords.includes(match)) {
      const idx = foundWords.length % FOUND_COLORS.length;
      const newFC = {...foundCells};
      cells.forEach(k => { newFC[k] = FOUND_COLORS[idx]; });
      setFoundCells(newFC); setFoundWords(p => [...p, match]);
      setFlash(match); setTimeout(() => setFlash(null), 1200);
    }
    setStartCell(null); setHoveredCells([]);
  }, [startCell, grid, words, foundWords, foundCells, gameOver, revealed]);

  const handleHover = useCallback((key: string) => {
    if (!startCell || gameOver) return;
    const cells = getBetween(startCell, key);
    setHoveredCells(cells || [startCell]);
  }, [startCell, gameOver]);

  const handleReveal = () => {
    const newRC: Record<string, boolean> = {};
    words.forEach(w => { if (!foundWords.includes(w) && placements[w]) getCells(w, placements[w]).forEach(k => { newRC[k] = true; }); });
    setRevealedCells(newRC); setRevealed(true);
  };

  if (isGenerating) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-xs w-full mx-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4"/>
        <p className="text-gray-700 font-semibold">Generating AI word list…</p>
        <p className="text-gray-400 text-sm mt-1">Every session is unique!</p>
      </div>
    </div>
  );

  if (gameOver) {
    const score = Math.round((foundWords.length / words.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-blue-50">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{foundWords.length===words.length?"Excellent! 🎉":"Time's Up!"}</h2>
          <p className="text-gray-500 mb-6">Found {foundWords.length} of {words.length} words</p>
          <div className="text-5xl font-black text-blue-600 mb-6">{score}%</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onBack} className="py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Exit</button>
            <button onClick={onReset} className="py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Game</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-8">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium"><ArrowLeft className="w-4 h-4"/>Back</button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-sm"><CheckCircle2 className="w-4 h-4"/>{foundWords.length}/{words.length}</div>
          <span className={`flex items-center gap-1 font-semibold text-sm ${timeLeft<30?"text-red-500":"text-gray-700"}`}><Clock className="w-4 h-4"/>{fmt(timeLeft)}</span>
        </div>
      </div>
      <div className="px-3 py-4 max-w-5xl mx-auto">
        <h1 className="text-lg font-bold text-gray-800 mb-0.5">Word Search — {config.topic}</h1>
        <p className="text-sm text-gray-500 mb-3">Click the first letter, then the last letter of a word.</p>
        {flash && <div className="text-center text-green-600 font-bold text-base mb-2 animate-bounce">✓ Found: {flash}!</div>}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="bg-white rounded-2xl border border-blue-200 p-2 sm:p-3 shadow-sm select-none overflow-x-auto"
            onMouseLeave={() => { if (startCell) setHoveredCells([startCell]); }}>
            <div className="grid gap-0.5 min-w-max" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
              {grid.map((row, r) => row.map((letter, c) => {
                const key = `${r}-${c}`;
                return (
                  <button key={key} onClick={() => handleClick(key)} onMouseEnter={() => handleHover(key)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded text-xs sm:text-sm font-bold transition flex items-center justify-center
                      ${revealedCells[key] ? REVEAL_COLOR : foundCells[key] ? foundCells[key] : startCell===key ? "bg-blue-500 text-white" : hoveredCells.includes(key) ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"}`}>
                    {letter}
                  </button>
                );
              }))}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:w-64 shrink-0">
            <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-sm flex-1">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">Find these words:</h3>
              <ul className="space-y-1.5">
                {words.map((w, i) => {
                  const isFound = foundWords.includes(w), isRev = !isFound && revealed;
                  const isSelected = selectedWord === w;
                  return (
                    <li key={w}
                      className={`text-sm font-medium px-2 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-between gap-1
                        ${isSelected ? "ring-2 ring-blue-400" : ""}
                        ${isFound?`${FOUND_COLORS[i%FOUND_COLORS.length]} line-through opacity-70`:isRev?"text-gray-400 line-through bg-gray-100":"text-gray-700 hover:bg-blue-50"}`}
                      onClick={() => { setSelectedWord(w); setInfoTab("meaning"); speakWord(w); loadWordInfo(w); }}>
                      <span>{isFound?"✓ ":isRev?"👁 ":`${i+1}. `}{w}</span>
                      <Volume2 className={`w-3.5 h-3.5 shrink-0 ${isSelected && isSpeaking ? "text-blue-500 animate-pulse" : "text-gray-300"}`} />
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Word info panel with tabs */}
            {selectedWord && (
              <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
                {/* Word header + Hear it */}
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <span className="text-base font-black text-blue-700">{selectedWord}</span>
                  <button onClick={() => speakWord(selectedWord)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition
                      ${isSpeaking ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"}`}>
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? "animate-pulse" : ""}`}/>
                    {isSpeaking ? "Playing…" : "Hear it"}
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                  <button onClick={() => setInfoTab("meaning")}
                    className={`flex-1 py-2 text-sm font-semibold transition border-b-2
                      ${infoTab==="meaning" ? "text-blue-600 border-blue-500 bg-blue-50" : "text-gray-400 border-transparent hover:text-gray-600"}`}>
                    📖 Meaning
                  </button>
                  <button onClick={() => setInfoTab("example")}
                    className={`flex-1 py-2 text-sm font-semibold transition border-b-2
                      ${infoTab==="example" ? "text-blue-600 border-blue-500 bg-blue-50" : "text-gray-400 border-transparent hover:text-gray-600"}`}>
                    💬 Example
                  </button>
                </div>

                {/* Tab content */}
                <div className="px-4 py-3 min-h-[54px]">
                  {wordInfo[selectedWord] ? (
                    infoTab === "meaning"
                      ? <p className="text-sm text-gray-700 leading-relaxed">{wordInfo[selectedWord].meaning}</p>
                      : <p className="text-sm text-gray-600 italic leading-relaxed">"{wordInfo[selectedWord].example}"</p>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin"/>Loading…
                    </div>
                  )}
                </div>
              </div>
            )}

            <button onClick={handleReveal} disabled={revealed} className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-40"><Eye className="w-4 h-4"/>Check Answer</button>
            <button onClick={onReset} className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Words</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WordSearch({ config, onBack }: Props) {
  const [key, setKey] = useState(0);
  return <WordSearchInner key={key} config={config} onBack={onBack} onReset={() => setKey(k => k + 1)} />;
}