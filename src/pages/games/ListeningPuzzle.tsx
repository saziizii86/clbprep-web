// src/pages/games/ListeningPuzzle.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ArrowLeft, Play, RefreshCw, Trophy, Clock, Volume2, ChevronRight, Loader2 } from "lucide-react";
import { getAPISettings } from "../../services/settingsService";
import { generateGameContent } from "./gameAI";

interface GameConfig { topic: string; difficulty: string; duration: number; }
interface Props { config: GameConfig; onBack: () => void; }
interface Puzzle { sentence: string; words: string[]; hint: string; }

// Most natural OpenAI voices — shimmer (female, clean) and onyx (male, clear)
const VOICE_BY_GENDER: Record<"female"|"male", string> = {
  female: "shimmer", // Clean, clear female voice with minimal reverb
  male:   "onyx",    // Deep, authoritative male voice — clear sound
};

function shuffle<T>(a: T[]): T[] { return [...a].sort(() => Math.random() - 0.5); }

const ALL_PUZZLES: Record<string, Record<string, Puzzle[]>> = {
  "Daily Life": {
    beginner: [
      { sentence:"I wake up at seven every morning.", words:["I","wake","up","at","seven","every","morning"], hint:"morning routine" },
      { sentence:"She drinks tea before bed.", words:["She","drinks","tea","before","bed"], hint:"evening habit" },
      { sentence:"We go to the park on weekends.", words:["We","go","to","the","park","on","weekends"], hint:"weekend activity" },
      { sentence:"He takes the bus to work.", words:["He","takes","the","bus","to","work"], hint:"commute" },
      { sentence:"I brush my teeth every morning and night.", words:["I","brush","my","teeth","every","morning","and","night"], hint:"hygiene" },
      { sentence:"They eat dinner together as a family.", words:["They","eat","dinner","together","as","a","family"], hint:"family meal" },
      { sentence:"She cleans the house on Saturday morning.", words:["She","cleans","the","house","on","Saturday","morning"], hint:"chores" },
      { sentence:"He walks the dog after dinner.", words:["He","walks","the","dog","after","dinner"], hint:"pet care" },
    ],
    intermediate: [
      { sentence:"I usually make a grocery list before shopping.", words:["I","usually","make","a","grocery","list","before","shopping"], hint:"shopping habit" },
      { sentence:"She prefers cooking at home to eating out.", words:["She","prefers","cooking","at","home","to","eating","out"], hint:"food preference" },
      { sentence:"They spend their evenings watching movies together.", words:["They","spend","their","evenings","watching","movies","together"], hint:"family time" },
      { sentence:"He has been living in this neighbourhood for ten years.", words:["He","has","been","living","in","this","neighbourhood","for","ten","years"], hint:"duration of residence" },
      { sentence:"She forgot to pay the electricity bill last month.", words:["She","forgot","to","pay","the","electricity","bill","last","month"], hint:"bills" },
      { sentence:"We are saving money to renovate the kitchen.", words:["We","are","saving","money","to","renovate","the","kitchen"], hint:"home plans" },
      { sentence:"I take the subway every morning to avoid traffic.", words:["I","take","the","subway","every","morning","to","avoid","traffic"], hint:"commute choice" },
      { sentence:"She called the landlord about the broken heater.", words:["She","called","the","landlord","about","the","broken","heater"], hint:"home issue" },
    ],
    advanced: [
      { sentence:"Maintaining a daily schedule helps you stay productive and focused.", words:["Maintaining","a","daily","schedule","helps","you","stay","productive","and","focused"], hint:"productivity tip" },
      { sentence:"Despite the heavy traffic she managed to arrive on time.", words:["Despite","the","heavy","traffic","she","managed","to","arrive","on","time"], hint:"overcoming obstacles" },
      { sentence:"Having lived alone for several years she had become very independent.", words:["Having","lived","alone","for","several","years","she","had","become","very","independent"], hint:"personal growth" },
      { sentence:"Balancing work and family responsibilities is one of the greatest modern challenges.", words:["Balancing","work","and","family","responsibilities","is","one","of","the","greatest","modern","challenges"], hint:"work-life balance" },
      { sentence:"The landlord agreed to reduce the rent in exchange for an earlier move-in date.", words:["The","landlord","agreed","to","reduce","the","rent","in","exchange","for","an","earlier","move-in","date"], hint:"negotiation" },
    ],
  },
  "Work": {
    beginner: [
      { sentence:"The meeting starts at nine o'clock.", words:["The","meeting","starts","at","nine","o'clock"], hint:"schedule" },
      { sentence:"Please send me the report by Friday.", words:["Please","send","me","the","report","by","Friday"], hint:"work request" },
      { sentence:"She answered all her emails this morning.", words:["She","answered","all","her","emails","this","morning"], hint:"communication" },
      { sentence:"He forgot about the meeting yesterday.", words:["He","forgot","about","the","meeting","yesterday"], hint:"work mistake" },
    ],
    intermediate: [
      { sentence:"Could you review my proposal before the presentation?", words:["Could","you","review","my","proposal","before","the","presentation"], hint:"work request" },
      { sentence:"The deadline for the project has been moved to Monday.", words:["The","deadline","for","the","project","has","been","moved","to","Monday"], hint:"schedule change" },
      { sentence:"She has been working on this report since early morning.", words:["She","has","been","working","on","this","report","since","early","morning"], hint:"ongoing task" },
      { sentence:"I would like to discuss my performance review with you.", words:["I","would","like","to","discuss","my","performance","review","with","you"], hint:"HR conversation" },
      { sentence:"He sent a follow-up email to the client after the meeting.", words:["He","sent","a","follow-up","email","to","the","client","after","the","meeting"], hint:"professional communication" },
      { sentence:"The team completed the project two days ahead of schedule.", words:["The","team","completed","the","project","two","days","ahead","of","schedule"], hint:"achievement" },
    ],
    advanced: [
      { sentence:"Following the stakeholder meeting we completely revised our strategic approach.", words:["Following","the","stakeholder","meeting","we","completely","revised","our","strategic","approach"], hint:"business decision" },
      { sentence:"The quarterly sales results significantly exceeded the projections we had set.", words:["The","quarterly","sales","results","significantly","exceeded","the","projections","we","had","set"], hint:"performance" },
      { sentence:"She was promoted to senior manager after demonstrating exceptional leadership skills over three years.", words:["She","was","promoted","to","senior","manager","after","demonstrating","exceptional","leadership","skills","over","three","years"], hint:"career advancement" },
      { sentence:"Effective communication between departments is essential for the success of any large organization.", words:["Effective","communication","between","departments","is","essential","for","the","success","of","any","large","organization"], hint:"organizational insight" },
    ],
  },
  "Travel": {
    beginner: [
      { sentence:"My flight departs at six in the morning.", words:["My","flight","departs","at","six","in","the","morning"], hint:"travel schedule" },
      { sentence:"Please have your passport ready at the border.", words:["Please","have","your","passport","ready","at","the","border"], hint:"border crossing" },
      { sentence:"She packed her suitcase the night before.", words:["She","packed","her","suitcase","the","night","before"], hint:"travel preparation" },
    ],
    intermediate: [
      { sentence:"I would like to book a room for three nights.", words:["I","would","like","to","book","a","room","for","three","nights"], hint:"hotel booking" },
      { sentence:"Is there a direct flight from Vancouver to Calgary?", words:["Is","there","a","direct","flight","from","Vancouver","to","Calgary"], hint:"flight inquiry" },
      { sentence:"She lost her luggage and had to file a claim at the airport.", words:["She","lost","her","luggage","and","had","to","file","a","claim","at","the","airport"], hint:"travel problem" },
      { sentence:"We exchanged currency before leaving for the trip.", words:["We","exchanged","currency","before","leaving","for","the","trip"], hint:"travel prep" },
      { sentence:"The hotel provides complimentary breakfast for all guests.", words:["The","hotel","provides","complimentary","breakfast","for","all","guests"], hint:"hotel amenity" },
    ],
    advanced: [
      { sentence:"Travellers are strongly advised to purchase comprehensive travel insurance before departure.", words:["Travellers","are","strongly","advised","to","purchase","comprehensive","travel","insurance","before","departure"], hint:"travel advice" },
      { sentence:"Having missed her connecting flight she was rebooked on the next available service.", words:["Having","missed","her","connecting","flight","she","was","rebooked","on","the","next","available","service"], hint:"travel disruption" },
      { sentence:"The visa application process required extensive documentation and took several weeks to complete.", words:["The","visa","application","process","required","extensive","documentation","and","took","several","weeks","to","complete"], hint:"visa process" },
    ],
  },
  "Education": {
    beginner: [
      { sentence:"Students must submit their work by the deadline.", words:["Students","must","submit","their","work","by","the","deadline"], hint:"academic rule" },
      { sentence:"She studied at the library for three hours.", words:["She","studied","at","the","library","for","three","hours"], hint:"study session" },
      { sentence:"He failed the test because he did not study.", words:["He","failed","the","test","because","he","did","not","study"], hint:"consequence" },
    ],
    intermediate: [
      { sentence:"He applied for a scholarship to study abroad next year.", words:["He","applied","for","a","scholarship","to","study","abroad","next","year"], hint:"academic opportunity" },
      { sentence:"The professor encouraged students to ask questions in class.", words:["The","professor","encouraged","students","to","ask","questions","in","class"], hint:"classroom engagement" },
      { sentence:"She joined a study group to prepare for the midterm examinations.", words:["She","joined","a","study","group","to","prepare","for","the","midterm","examinations"], hint:"exam prep" },
      { sentence:"He revised his essay three times before submitting the final draft.", words:["He","revised","his","essay","three","times","before","submitting","the","final","draft"], hint:"writing process" },
    ],
    advanced: [
      { sentence:"Critical thinking is an essential skill for academic and professional success in any field.", words:["Critical","thinking","is","an","essential","skill","for","academic","and","professional","success","in","any","field"], hint:"academic advice" },
      { sentence:"The university requires all graduate students to complete an independent research project.", words:["The","university","requires","all","graduate","students","to","complete","an","independent","research","project"], hint:"graduate requirements" },
      { sentence:"Academic integrity is fundamental to the credibility of any institution and its graduates.", words:["Academic","integrity","is","fundamental","to","the","credibility","of","any","institution","and","its","graduates"], hint:"academic values" },
    ],
  },
  "Health": {
    beginner: [
      { sentence:"You should drink eight glasses of water every day.", words:["You","should","drink","eight","glasses","of","water","every","day"], hint:"health advice" },
      { sentence:"She takes her medicine twice a day.", words:["She","takes","her","medicine","twice","a","day"], hint:"medication routine" },
      { sentence:"He went to the clinic because he had a fever.", words:["He","went","to","the","clinic","because","he","had","a","fever"], hint:"medical visit" },
    ],
    intermediate: [
      { sentence:"Regular exercise reduces the risk of heart disease and improves mental health.", words:["Regular","exercise","reduces","the","risk","of","heart","disease","and","improves","mental","health"], hint:"health benefit" },
      { sentence:"I have an appointment with my doctor on Thursday afternoon.", words:["I","have","an","appointment","with","my","doctor","on","Thursday","afternoon"], hint:"medical visit" },
      { sentence:"She was prescribed a two-week course of antibiotics for the infection.", words:["She","was","prescribed","a","two-week","course","of","antibiotics","for","the","infection"], hint:"medical treatment" },
      { sentence:"He decided to cut back on sugar and processed food to lose weight.", words:["He","decided","to","cut","back","on","sugar","and","processed","food","to","lose","weight"], hint:"lifestyle change" },
    ],
    advanced: [
      { sentence:"A balanced diet combined with regular physical activity promotes long-term health and wellbeing.", words:["A","balanced","diet","combined","with","regular","physical","activity","promotes","long-term","health","and","wellbeing"], hint:"health principle" },
      { sentence:"Mental health should be given the same priority as physical health in modern healthcare systems.", words:["Mental","health","should","be","given","the","same","priority","as","physical","health","in","modern","healthcare","systems"], hint:"mental health" },
      { sentence:"Early detection of chronic conditions significantly improves treatment outcomes and quality of life.", words:["Early","detection","of","chronic","conditions","significantly","improves","treatment","outcomes","and","quality","of","life"], hint:"medical fact" },
    ],
  },
  "Food & Cooking": {
    beginner: [
      { sentence:"Add a pinch of salt to the soup.", words:["Add","a","pinch","of","salt","to","the","soup"], hint:"cooking instruction" },
      { sentence:"Wash the vegetables before you cook them.", words:["Wash","the","vegetables","before","you","cook","them"], hint:"food prep" },
      { sentence:"She baked a chocolate cake for the birthday party.", words:["She","baked","a","chocolate","cake","for","the","birthday","party"], hint:"baking" },
    ],
    intermediate: [
      { sentence:"Marinate the chicken for at least two hours before grilling.", words:["Marinate","the","chicken","for","at","least","two","hours","before","grilling"], hint:"cooking technique" },
      { sentence:"Simmer the sauce over low heat for twenty minutes until it thickens.", words:["Simmer","the","sauce","over","low","heat","for","twenty","minutes","until","it","thickens"], hint:"cooking method" },
      { sentence:"She prefers using fresh herbs rather than dried spices.", words:["She","prefers","using","fresh","herbs","rather","than","dried","spices"], hint:"cooking preference" },
      { sentence:"He reduced the sauce until it coated the back of a spoon.", words:["He","reduced","the","sauce","until","it","coated","the","back","of","a","spoon"], hint:"sauce technique" },
    ],
    advanced: [
      { sentence:"The garnish enhances both the presentation and the overall flavour of the dish.", words:["The","garnish","enhances","both","the","presentation","and","the","overall","flavour","of","the","dish"], hint:"culinary technique" },
      { sentence:"Fermentation has been used for thousands of years to preserve food and develop complex flavours.", words:["Fermentation","has","been","used","for","thousands","of","years","to","preserve","food","and","develop","complex","flavours"], hint:"food preservation" },
    ],
  },
  "Shopping":    { beginner:[{sentence:"Can I get a refund for this item?",words:["Can","I","get","a","refund","for","this","item"],hint:"customer service"},{sentence:"This shirt is on sale this week.",words:["This","shirt","is","on","sale","this","week"],hint:"sale"},{sentence:"I need to find a medium size.",words:["I","need","to","find","a","medium","size"],hint:"shopping"}], intermediate:[{sentence:"The store offers a thirty-day money-back guarantee on all products.",words:["The","store","offers","a","thirty-day","money-back","guarantee","on","all","products"],hint:"store policy"},{sentence:"I am looking for a gift for my mother's birthday.",words:["I","am","looking","for","a","gift","for","my","mother's","birthday"],hint:"gift shopping"},{sentence:"Could you gift wrap this for me please?",words:["Could","you","gift","wrap","this","for","me","please"],hint:"gift wrapping"},{sentence:"She returned the jacket because it was the wrong size.",words:["She","returned","the","jacket","because","it","was","the","wrong","size"],hint:"return"}], advanced:[{sentence:"Consumers are increasingly choosing sustainable and ethically produced products over cheaper alternatives.",words:["Consumers","are","increasingly","choosing","sustainable","and","ethically","produced","products","over","cheaper","alternatives"],hint:"consumer trend"}] },
  "Technology":  { beginner:[{sentence:"Please restart your computer to apply the update.",words:["Please","restart","your","computer","to","apply","the","update"],hint:"tech support"},{sentence:"I forgot my password and had to reset it.",words:["I","forgot","my","password","and","had","to","reset","it"],hint:"login issue"}], intermediate:[{sentence:"Your data is securely stored in the cloud and backed up daily.",words:["Your","data","is","securely","stored","in","the","cloud","and","backed","up","daily"],hint:"cloud storage"},{sentence:"She enabled two-factor authentication to protect her online accounts.",words:["She","enabled","two-factor","authentication","to","protect","her","online","accounts"],hint:"online security"},{sentence:"Download the latest update to fix the security vulnerabilities in the software.",words:["Download","the","latest","update","to","fix","the","security","vulnerabilities","in","the","software"],hint:"software update"}], advanced:[{sentence:"The algorithm uses machine learning to continuously improve its search recommendations over time.",words:["The","algorithm","uses","machine","learning","to","continuously","improve","its","search","recommendations","over","time"],hint:"AI technology"},{sentence:"End-to-end encryption ensures that only the intended recipient can access the message content.",words:["End-to-end","encryption","ensures","that","only","the","intended","recipient","can","access","the","message","content"],hint:"cybersecurity"}] },
  "Environment": { beginner:[{sentence:"Please recycle your plastic bottles and cardboard.",words:["Please","recycle","your","plastic","bottles","and","cardboard"],hint:"eco tip"},{sentence:"We should walk or cycle instead of driving short distances.",words:["We","should","walk","or","cycle","instead","of","driving","short","distances"],hint:"reduce emissions"}], intermediate:[{sentence:"Carbon emissions have been rising steadily since the beginning of the industrial revolution.",words:["Carbon","emissions","have","been","rising","steadily","since","the","beginning","of","the","industrial","revolution"],hint:"environmental fact"},{sentence:"Installing solar panels at home can significantly reduce your monthly electricity bill.",words:["Installing","solar","panels","at","home","can","significantly","reduce","your","monthly","electricity","bill"],hint:"renewable energy"},{sentence:"The company committed to reducing its carbon footprint by fifty percent within ten years.",words:["The","company","committed","to","reducing","its","carbon","footprint","by","fifty","percent","within","ten","years"],hint:"corporate sustainability"}], advanced:[{sentence:"Deforestation has accelerated the rate of climate change by releasing vast amounts of stored carbon.",words:["Deforestation","has","accelerated","the","rate","of","climate","change","by","releasing","vast","amounts","of","stored","carbon"],hint:"environmental science"},{sentence:"Governments must adopt ambitious and binding policies to achieve the targets set in international climate agreements.",words:["Governments","must","adopt","ambitious","and","binding","policies","to","achieve","the","targets","set","in","international","climate","agreements"],hint:"climate policy"}] },
  "Immigration": { beginner:[{sentence:"I need to apply for a work permit.",words:["I","need","to","apply","for","a","work","permit"],hint:"immigration step"},{sentence:"She became a Canadian citizen after five years.",words:["She","became","a","Canadian","citizen","after","five","years"],hint:"citizenship milestone"}], intermediate:[{sentence:"You must provide all required documents with your permanent residency application.",words:["You","must","provide","all","required","documents","with","your","permanent","residency","application"],hint:"application process"},{sentence:"He sponsored his parents and they received their permanent residency within a year.",words:["He","sponsored","his","parents","and","they","received","their","permanent","residency","within","a","year"],hint:"family sponsorship"},{sentence:"The biometrics appointment is a mandatory step for all immigration applications.",words:["The","biometrics","appointment","is","a","mandatory","step","for","all","immigration","applications"],hint:"application requirement"}], advanced:[{sentence:"The applicant must demonstrate sufficient financial means to support their family members throughout the settlement period.",words:["The","applicant","must","demonstrate","sufficient","financial","means","to","support","their","family","members","throughout","the","settlement","period"],hint:"immigration requirement"},{sentence:"Successful integration into Canadian society requires both language proficiency and an understanding of cultural norms.",words:["Successful","integration","into","Canadian","society","requires","both","language","proficiency","and","an","understanding","of","cultural","norms"],hint:"settlement advice"}] },
};

function getPuzzles(topic: string, difficulty: string, count: number): Puzzle[] {
  const t = ALL_PUZZLES[topic] || ALL_PUZZLES["Daily Life"];
  const pool = t[difficulty] || t["beginner"];
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

const CLB: Record<string,string> = { beginner:"CLB 4-5", intermediate:"CLB 6-7", advanced:"CLB 8+" };
const WORDS_RANGE: Record<string,string> = { beginner:"5-8 words, simple vocabulary", intermediate:"8-13 words, varied tenses", advanced:"12-18 words, complex grammar" };

function ListeningPuzzleInner({ config, onBack, onReset, voiceGender }: { config: GameConfig; onBack:()=>void; onReset:()=>void; voiceGender: "female"|"male" }) {
  const staticFallback = getPuzzles(config.topic, config.difficulty, 5);

  const [isGenerating, setIsGenerating] = useState(true);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [idx, setIdx] = useState(0);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct"|"wrong"|null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [gameOver, setGameOver] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const voice = VOICE_BY_GENDER[voiceGender];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const prompt = `Generate exactly 7 natural English sentences about "${config.topic}" at ${config.difficulty} level (${CLB[config.difficulty]}) for a listening puzzle game.
Rules: ${WORDS_RANGE[config.difficulty]}. Must sound completely natural when spoken aloud. Each sentence should be self-contained and meaningful.
Return ONLY a JSON array: [{"sentence":"I wake up at seven every morning.","hint":"morning routine"}]`;
      const generated = await generateGameContent<Array<{sentence:string;hint:string}>>(prompt, []);
      const valid: Puzzle[] = generated.filter(s => s?.sentence && s?.hint).map(s => ({
        sentence: s.sentence,
        hint: s.hint,
        words: shuffle(s.sentence.replace(/[.!?]$/, "").split(" ").filter(Boolean)),
      }));
      const final = valid.length >= 3 ? shuffle(valid).slice(0, 5) : staticFallback;
      setPuzzles(final);
      setWordPool(shuffle(final[0].words));
      setIsGenerating(false);
    }
    load();
  }, []);

  const current = isGenerating ? null : puzzles[idx];
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  useEffect(() => {
    if (gameOver || isGenerating) return;
    if (timeLeft <= 0) { setGameOver(true); return; }
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, gameOver, isGenerating]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = "";   // detach source so browser releases it fully
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setIsLoading(false);
  };

  const speak = useCallback(async () => {
    if (isSpeaking || isLoading || !current) return;
    stopAudio();
    setIsLoading(true);

    try {
      const settings = await getAPISettings();
      // Use whatever key is stored — try OpenAI TTS directly; falls back if it fails
      const apiKey: string = settings?.openAIKey || settings?.key || settings?.apiKey || settings?.openaiKey || "";

      if (apiKey) {
        if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }

        const speed = config.difficulty === "beginner" ? 0.85 : config.difficulty === "intermediate" ? 0.95 : 1.0;

        const res = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "tts-1-hd", input: current.sentence, voice, speed }),
        });

        if (!res.ok) throw new Error("OpenAI TTS failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        setIsLoading(false);
        setIsSpeaking(true);
        audio.onended = () => { setIsSpeaking(false); };
        audio.onerror = () => { setIsSpeaking(false); setIsLoading(false); };
        audio.play();
        return;
      }
    } catch (err) {
      console.warn("OpenAI TTS failed, falling back to browser TTS:", err);
    }

    // Fallback: browser TTS
    setIsLoading(false);
    if (!window.speechSynthesis) { setIsLoading(false); return; }
    const utter = new SpeechSynthesisUtterance(current.sentence);
    utter.lang = "en-CA";
    utter.rate = config.difficulty === "beginner" ? 0.8 : config.difficulty === "intermediate" ? 0.9 : 1.0;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => { setIsSpeaking(false); };
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [current?.sentence, isSpeaking, isLoading, voice, config.difficulty]);

  const addWord = (w: string, i: number) => {
    if (feedback) return;
    const np = [...wordPool]; np.splice(i, 1);
    setWordPool(np); setAnswer(p => [...p, w]);
  };

  const removeWord = (i: number) => {
    if (feedback) return;
    const w = answer[i]; const na = [...answer]; na.splice(i, 1);
    setAnswer(na); setWordPool(p => [...p, w]);
  };

  const check = () => {
    const ua = answer.join(" ");
    const ok = ua.toLowerCase() === current.sentence.toLowerCase();
    setFeedback(ok ? "correct" : "wrong");
    if (ok) setScore(s => s + 1);
  };

  const next = () => {
    stopAudio();
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    const ni = idx + 1;
    if (ni >= puzzles.length) { setGameOver(true); return; }
    setIdx(ni);
    setWordPool(shuffle(puzzles[ni].words));
    setAnswer([]);
    setFeedback(null);
  };



  if (isGenerating) return (
    <div className="min-h-screen bg-teal-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-lg max-w-xs w-full mx-4">
        <Loader2 className="w-12 h-12 text-teal-500 animate-spin mx-auto mb-4"/>
        <p className="text-gray-700 font-semibold">Generating AI sentences…</p>
        <p className="text-gray-400 text-sm mt-1">Every session is unique!</p>
      </div>
    </div>
  );

  if (gameOver) {
    stopAudio();
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-teal-50">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Listening Complete! 🎉</h2>
          <p className="text-gray-500 mb-6">{score} of {puzzles.length} correct</p>
          <div className="text-5xl font-black text-teal-600 mb-6">{Math.round(score/puzzles.length*100)}%</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onBack} className="py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm">Exit</button>
            <button onClick={onReset} className="py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Game</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-50 pb-8">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm font-medium"><ArrowLeft className="w-4 h-4"/>Back</button>
        <div className="flex items-center gap-4">
          <span className="text-teal-600 font-semibold text-sm">{idx+1}/{puzzles.length}</span>
          <span className={`flex items-center gap-1 font-semibold text-sm ${timeLeft<30?"text-red-500":"text-gray-700"}`}><Clock className="w-4 h-4"/>{fmt(timeLeft)}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-gray-800">Listening Puzzle — {config.topic}</h1>

        </div>
        <p className="text-sm text-gray-500 mb-1">Listen, then arrange the words in the correct order.</p>
        <p className="text-xs text-gray-400 italic mb-4">💡 {current.hint}</p>

        {/* Listen button */}
        <div className="bg-white rounded-2xl border border-teal-200 p-5 mb-5 flex flex-col items-center shadow-sm">
          <button onClick={isSpeaking ? stopAudio : speak} disabled={isLoading}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition mb-3
              ${isLoading ? "bg-teal-300 cursor-wait" : isSpeaking ? "bg-teal-500 hover:bg-teal-600 cursor-pointer" : "bg-teal-600 hover:bg-teal-700 cursor-pointer"}`}>
            {isLoading ? <Loader2 className="w-9 h-9 text-white animate-spin"/> :
             isSpeaking ? <Volume2 className="w-9 h-9 text-white animate-pulse"/> :
             <Play className="w-9 h-9 text-white"/>}
          </button>
          <p className="text-sm text-gray-500">
            {isLoading ? "Loading AI voice…" : isSpeaking ? "Playing… tap to stop" : "Tap to listen"}
          </p>
        </div>

        {/* Answer zone */}
        <div className={`min-h-[70px] rounded-2xl border-2 border-dashed p-4 mb-4 flex flex-wrap gap-2 items-start transition
          ${feedback==="correct"?"bg-green-100 border-green-400":feedback==="wrong"?"bg-red-50 border-red-300":"bg-white border-gray-300"}`}>
          {answer.length===0
            ? <span className="text-gray-300 text-sm">Tap words below to build the sentence…</span>
            : answer.map((w,i)=><button key={`a${i}`} onClick={()=>removeWord(i)} className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-sm font-semibold shadow-sm hover:bg-teal-700">{w} ×</button>)}
        </div>

        {feedback && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium ${feedback==="correct"?"bg-green-100 text-green-800":"bg-red-50 text-red-700"}`}>
            {feedback==="correct" ? "✓ Perfect! You heard it correctly!" : `✗ Correct: "${current.sentence}"`}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {wordPool.map((w,i)=><button key={`p${i}`} onClick={()=>addWord(w,i)} className="px-3 py-1.5 rounded-xl bg-white border-2 border-teal-200 text-teal-800 text-sm font-semibold hover:bg-teal-50 transition shadow-sm">{w}</button>)}
        </div>

        <div className="flex gap-3">
          {!feedback ? (
            <>
              <button onClick={() => { stopAudio(); onReset(); }} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Session</button>
              <button onClick={check} disabled={answer.length===0} className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm disabled:opacity-50 hover:bg-teal-700">Check Answer</button>
            </>
          ) : (
            <button onClick={next} className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 flex items-center justify-center gap-2">
              {idx+1<puzzles.length?"Next Puzzle":"See Results"} <ChevronRight className="w-4 h-4"/>
            </button>
          )}
        </div>
        <p className="text-center mt-3 text-xs text-gray-500">Score: <span className="font-bold text-teal-600">{score}/{idx+(feedback?1:0)}</span></p>
      </div>
    </div>
  );
}

export default function ListeningPuzzle({ config, onBack }: Props) {
  const [key, setKey] = useState(0);
  // Start with a random gender, then alternate on every reset
  const [voiceGender, setVoiceGender] = useState<"female"|"male">(
    Math.random() < 0.5 ? "female" : "male"
  );

  const handleReset = () => {
    setVoiceGender(g => g === "female" ? "male" : "female");
    setKey(k => k + 1);
  };

  return (
    <ListeningPuzzleInner
      key={key}
      config={config}
      onBack={onBack}
      onReset={handleReset}
      voiceGender={voiceGender}
    />
  );
}
