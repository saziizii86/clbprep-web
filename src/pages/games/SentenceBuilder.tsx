// src/pages/games/SentenceBuilder.tsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, Clock, ChevronRight, Loader2 } from "lucide-react";
import { generateGameContent } from "./gameAI";

interface GameConfig { topic: string; difficulty: string; duration: number; }
interface Props { config: GameConfig; onBack: () => void; }
interface Sentence { words: string[]; correct: string; hint: string; }

const CLB: Record<string,string> = { beginner:"CLB 4-5", intermediate:"CLB 6-7", advanced:"CLB 8+" };
const WORDS_RANGE: Record<string,string> = { beginner:"5-8 words, simple grammar", intermediate:"8-12 words, varied tenses", advanced:"12-18 words, complex grammar and clauses" };

const STATIC: Record<string, Record<string, Sentence[]>> = {
  "Daily Life": {
    beginner:[
      {words:["I","drink","every","morning","coffee"],correct:"I drink coffee every morning",hint:"morning routine"},
      {words:["She","the","dishes","washes","after","dinner"],correct:"She washes the dishes after dinner",hint:"chore"},
      {words:["We","on","go","Sundays","shopping"],correct:"We go shopping on Sundays",hint:"weekly habit"},
      {words:["He","early","wakes","up","every","day"],correct:"He wakes up early every day",hint:"morning"},
      {words:["They","dinner","at","seven","eat"],correct:"They eat dinner at seven",hint:"mealtime"},
    ],
    intermediate:[
      {words:["I","usually","commute","to","work","by","bus"],correct:"I usually commute to work by bus",hint:"transportation"},
      {words:["She","a","is","making","list","grocery"],correct:"She is making a grocery list",hint:"shopping prep"},
      {words:["They","enjoy","spending","quiet","evenings","together"],correct:"They enjoy spending quiet evenings together",hint:"family time"},
      {words:["He","has","been","living","here","for","ten","years"],correct:"He has been living here for ten years",hint:"residence"},
      {words:["She","forgot","to","pay","the","electricity","bill"],correct:"She forgot to pay the electricity bill",hint:"utilities"},
    ],
    advanced:[
      {words:["Maintaining","a","daily","schedule","helps","you","stay","productive","and","focused"],correct:"Maintaining a daily schedule helps you stay productive and focused",hint:"productivity"},
      {words:["Despite","the","heavy","traffic","she","managed","to","arrive","on","time"],correct:"Despite the heavy traffic she managed to arrive on time",hint:"perseverance"},
      {words:["Balancing","work","and","family","life","is","a","significant","modern","challenge"],correct:"Balancing work and family life is a significant modern challenge",hint:"work-life balance"},
    ],
  },
  "Work": {
    beginner:[
      {words:["The","is","at","nine","meeting","o'clock"],correct:"The meeting is at nine o'clock",hint:"schedule"},
      {words:["I","a","report","have","to","write"],correct:"I have to write a report",hint:"work task"},
      {words:["She","her","answered","all","emails"],correct:"She answered all her emails",hint:"communication"},
      {words:["He","on","time","comes","always","to","work"],correct:"He always comes to work on time",hint:"punctuality"},
    ],
    intermediate:[
      {words:["Could","you","review","my","proposal","before","the","presentation"],correct:"Could you review my proposal before the presentation",hint:"work request"},
      {words:["The","deadline","for","the","project","has","been","moved","to","Monday"],correct:"The deadline for the project has been moved to Monday",hint:"deadline"},
      {words:["She","has","been","working","on","this","since","early","morning"],correct:"She has been working on this since early morning",hint:"ongoing task"},
    ],
    advanced:[
      {words:["Following","the","stakeholder","meeting","we","revised","our","strategic","approach"],correct:"Following the stakeholder meeting we revised our strategic approach",hint:"business decision"},
      {words:["The","quarterly","results","significantly","exceeded","the","projections","we","had","set"],correct:"The quarterly results significantly exceeded the projections we had set",hint:"performance"},
    ],
  },
  "Travel":    { beginner:[{words:["My","flight","departs","at","six","in","the","morning"],correct:"My flight departs at six in the morning",hint:"travel schedule"},{words:["Please","have","your","passport","ready","at","the","border"],correct:"Please have your passport ready at the border",hint:"border crossing"}], intermediate:[{words:["I","would","like","to","book","a","room","for","three","nights"],correct:"I would like to book a room for three nights",hint:"hotel booking"},{words:["She","lost","her","luggage","and","had","to","file","a","claim"],correct:"She lost her luggage and had to file a claim",hint:"travel problem"}], advanced:[{words:["Travellers","are","strongly","advised","to","purchase","comprehensive","travel","insurance"],correct:"Travellers are strongly advised to purchase comprehensive travel insurance",hint:"travel advice"}] },
  "Education": { beginner:[{words:["Students","must","submit","their","work","by","the","deadline"],correct:"Students must submit their work by the deadline",hint:"academic rule"},{words:["She","studied","at","the","library","for","three","hours"],correct:"She studied at the library for three hours",hint:"studying"}], intermediate:[{words:["He","applied","for","a","scholarship","to","study","abroad"],correct:"He applied for a scholarship to study abroad",hint:"opportunity"},{words:["The","professor","encouraged","students","to","ask","questions","in","class"],correct:"The professor encouraged students to ask questions in class",hint:"classroom"}], advanced:[{words:["Critical","thinking","is","an","essential","skill","for","academic","and","professional","success"],correct:"Critical thinking is an essential skill for academic and professional success",hint:"academic advice"}] },
  "Health":    { beginner:[{words:["You","should","drink","eight","glasses","of","water","every","day"],correct:"You should drink eight glasses of water every day",hint:"health advice"},{words:["She","takes","her","medicine","twice","a","day"],correct:"She takes her medicine twice a day",hint:"medication"}], intermediate:[{words:["Regular","exercise","reduces","the","risk","of","heart","disease"],correct:"Regular exercise reduces the risk of heart disease",hint:"health benefit"},{words:["She","was","prescribed","a","course","of","antibiotics"],correct:"She was prescribed a course of antibiotics",hint:"treatment"}], advanced:[{words:["Mental","health","should","be","given","the","same","priority","as","physical","health"],correct:"Mental health should be given the same priority as physical health",hint:"wellbeing"}] },
  "Food & Cooking": { beginner:[{words:["Add","a","pinch","of","salt","to","the","soup"],correct:"Add a pinch of salt to the soup",hint:"cooking"},{words:["She","baked","a","chocolate","cake","for","the","party"],correct:"She baked a chocolate cake for the party",hint:"baking"}], intermediate:[{words:["Marinate","the","chicken","for","at","least","two","hours","before","grilling"],correct:"Marinate the chicken for at least two hours before grilling",hint:"cooking technique"},{words:["She","prefers","using","fresh","herbs","rather","than","dried","spices"],correct:"She prefers using fresh herbs rather than dried spices",hint:"cooking preference"}], advanced:[{words:["Fermentation","has","been","used","for","thousands","of","years","to","preserve","food"],correct:"Fermentation has been used for thousands of years to preserve food",hint:"food science"}] },
  "Shopping":  { beginner:[{words:["Can","I","get","a","refund","for","this","item"],correct:"Can I get a refund for this item",hint:"return"},{words:["This","shirt","is","on","sale","this","week"],correct:"This shirt is on sale this week",hint:"shopping"}], intermediate:[{words:["I","am","looking","for","a","gift","for","my","mother's","birthday"],correct:"I am looking for a gift for my mother's birthday",hint:"gift shopping"},{words:["She","returned","the","jacket","because","it","was","the","wrong","size"],correct:"She returned the jacket because it was the wrong size",hint:"exchange"}], advanced:[{words:["Consumers","are","increasingly","choosing","sustainable","and","ethically","produced","products"],correct:"Consumers are increasingly choosing sustainable and ethically produced products",hint:"consumer trend"}] },
  "Technology":{ beginner:[{words:["Please","restart","your","computer","to","apply","the","update"],correct:"Please restart your computer to apply the update",hint:"tech support"},{words:["I","forgot","my","password","and","had","to","reset","it"],correct:"I forgot my password and had to reset it",hint:"login"}], intermediate:[{words:["Your","data","is","securely","stored","in","the","cloud"],correct:"Your data is securely stored in the cloud",hint:"cloud storage"},{words:["She","enabled","two-factor","authentication","to","protect","her","accounts"],correct:"She enabled two-factor authentication to protect her accounts",hint:"security"}], advanced:[{words:["The","algorithm","uses","machine","learning","to","continuously","improve","its","recommendations"],correct:"The algorithm uses machine learning to continuously improve its recommendations",hint:"AI technology"}] },
  "Environment":{ beginner:[{words:["Please","recycle","your","plastic","bottles","and","cardboard"],correct:"Please recycle your plastic bottles and cardboard",hint:"recycling"},{words:["We","should","walk","instead","of","driving","short","distances"],correct:"We should walk instead of driving short distances",hint:"eco tip"}], intermediate:[{words:["Carbon","emissions","have","been","rising","steadily","since","the","industrial","revolution"],correct:"Carbon emissions have been rising steadily since the industrial revolution",hint:"climate fact"},{words:["Installing","solar","panels","can","significantly","reduce","your","electricity","bill"],correct:"Installing solar panels can significantly reduce your electricity bill",hint:"renewable energy"}], advanced:[{words:["Deforestation","has","accelerated","climate","change","by","releasing","stored","carbon","into","the","atmosphere"],correct:"Deforestation has accelerated climate change by releasing stored carbon into the atmosphere",hint:"environmental science"}] },
  "Immigration":{ beginner:[{words:["I","need","to","apply","for","a","work","permit"],correct:"I need to apply for a work permit",hint:"immigration"},{words:["She","became","a","Canadian","citizen","after","five","years"],correct:"She became a Canadian citizen after five years",hint:"citizenship"}], intermediate:[{words:["You","must","provide","all","required","documents","with","your","application"],correct:"You must provide all required documents with your application",hint:"application"},{words:["He","sponsored","his","parents","for","permanent","residency"],correct:"He sponsored his parents for permanent residency",hint:"sponsorship"}], advanced:[{words:["Successful","integration","requires","both","language","proficiency","and","cultural","awareness"],correct:"Successful integration requires both language proficiency and cultural awareness",hint:"settlement"}] },
};

function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }

function SentenceBuilderInner({ config, onBack, onReset }: { config: GameConfig; onBack:()=>void; onReset:()=>void }) {
  const staticFallback = shuffle((STATIC[config.topic]||STATIC["Daily Life"])[config.difficulty]||(STATIC[config.topic]||STATIC["Daily Life"])["beginner"]).slice(0, 5);

  const [isGenerating, setIsGenerating] = useState(true);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [idx, setIdx] = useState(0);
  const [pool, setPool] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct"|"wrong"|null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    async function load() {
      const prompt = `Generate exactly 7 English sentences about "${config.topic}" at ${config.difficulty} level (${CLB[config.difficulty]}) for a word-unscrambling game.
Each sentence: ${WORDS_RANGE[config.difficulty]}. Use natural Canadian English. Vary the grammar structures.
Return ONLY a JSON array: [{"sentence":"Full correct sentence here.","hint":"2-word topic context"}]`;
      const generated = await generateGameContent<Array<{sentence:string;hint:string}>>(prompt, []);
      const valid: Sentence[] = generated.filter(s => s?.sentence && s?.hint).map(s => ({
        sentence: s.sentence,
        hint: s.hint,
        words: shuffle(s.sentence.replace(/\.$/, "").split(" ").filter(Boolean)),
        correct: s.sentence.replace(/\.$/, ""),
      }));
      const final = valid.length >= 3 ? shuffle(valid).slice(0, 5) : staticFallback;
      setSentences(final);
      setPool(shuffle(final[0].words));
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

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const current = sentences[idx];

  const addWord = (w: string, i: number) => {
    if (feedback) return;
    const np = [...pool]; np.splice(i, 1);
    setPool(np); setAnswer(p => [...p, w]);
  };
  const removeWord = (i: number) => {
    if (feedback) return;
    const w = answer[i]; const na = [...answer]; na.splice(i, 1);
    setAnswer(na); setPool(p => [...p, w]);
  };
  const check = () => {
    const ok = answer.join(" ").toLowerCase() === current.correct.toLowerCase();
    setFeedback(ok ? "correct" : "wrong");
    if (ok) setScore(s => s + 1);
  };
  const next = () => {
    if (idx + 1 >= sentences.length) { setGameOver(true); return; }
    const ni = idx + 1;
    setIdx(ni); setPool(shuffle(sentences[ni].words)); setAnswer([]); setFeedback(null);
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
        <div className={`min-h-[80px] rounded-2xl border-2 border-dashed p-4 mb-4 flex flex-wrap gap-2 items-start ${feedback==="correct"?"bg-green-100 border-green-400":feedback==="wrong"?"bg-red-50 border-red-300":"bg-white border-gray-300"}`}>
          {answer.length===0 ? <span className="text-gray-300 text-sm">Tap words below to build your sentence…</span>
            : answer.map((w,i)=><button key={`a${i}`} onClick={()=>removeWord(i)} className="px-3 py-1.5 rounded-xl bg-green-600 text-white text-sm font-semibold shadow-sm hover:bg-green-700">{w} ×</button>)}
        </div>
        {feedback && <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${feedback==="correct"?"bg-green-100 text-green-800":"bg-red-50 text-red-700"}`}>
          {feedback==="correct"?"✓ Correct! Well done!":`✗ Correct sentence: "${current.correct}"`}
        </div>}
        <div className="flex flex-wrap gap-2 mb-6">
          {pool.map((w,i)=><button key={`p${i}`} onClick={()=>addWord(w,i)} className="px-3 py-1.5 rounded-xl bg-white border-2 border-green-200 text-green-800 text-sm font-semibold hover:bg-green-50 transition shadow-sm">{w}</button>)}
        </div>
        <div className="flex gap-3">
          {!feedback ? (
            <>
              <button onClick={onReset} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Session</button>
              <button onClick={check} disabled={answer.length===0} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-50 hover:bg-green-700">Check Answer</button>
            </>
          ) : (
            <button onClick={next} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2">
              {idx+1<sentences.length?"Next Sentence":"See Results"} <ChevronRight className="w-4 h-4"/>
            </button>
          )}
        </div>
        <p className="text-center mt-3 text-xs text-gray-400">Score: <span className="font-bold text-green-600">{score}/{idx+(feedback?1:0)}</span></p>
      </div>
    </div>
  );
}

export default function SentenceBuilder({ config, onBack }: Props) {
  const [key, setKey] = useState(0);
  return <SentenceBuilderInner key={key} config={config} onBack={onBack} onReset={() => setKey(k => k + 1)} />;
}
