// src/pages/games/MatchingGame.tsx
import React, { useState, useCallback, useEffect } from "react";
import { ArrowLeft, RefreshCw, Trophy, Clock, Eye, Loader2 } from "lucide-react";
import { generateGameContent } from "./gameAI";

interface GameConfig { topic: string; difficulty: string; duration: number; }
interface Props { config: GameConfig; onBack: () => void; }
interface Pair { word: string; definition: string; }

const CLB: Record<string, string> = { beginner: "CLB 4-5", intermediate: "CLB 6-7", advanced: "CLB 8+" };
const PAIR_COUNT: Record<string, number> = { beginner: 8, intermediate: 12, advanced: 16 };

const STATIC_PAIRS: Record<string, Pair[]> = {
  "Daily Life":    [{word:"commute",definition:"travel to work daily"},{word:"groceries",definition:"food bought from a store"},{word:"chores",definition:"household tasks to complete"},{word:"routine",definition:"regular daily habits"},{word:"budget",definition:"plan for spending money"},{word:"leisure",definition:"free time for enjoyment"},{word:"appliance",definition:"household electrical device"},{word:"maintenance",definition:"keeping in good condition"},{word:"neighbourhood",definition:"area where you live"},{word:"utilities",definition:"electricity, gas, water bills"},{word:"errand",definition:"short task outside home"},{word:"tenant",definition:"person who rents a home"},{word:"landlord",definition:"owner who rents property"},{word:"mortgage",definition:"loan used to buy a home"},{word:"renovation",definition:"improving a building's condition"},{word:"insurance",definition:"protection against financial loss"},{word:"subscription",definition:"regular payment for a service"},{word:"declutter",definition:"remove unnecessary items"},{word:"amenity",definition:"useful feature of a place"},{word:"convenience",definition:"ease and lack of difficulty"}],
  "Work":          [{word:"agenda",definition:"list of meeting topics"},{word:"deadline",definition:"final date to complete task"},{word:"colleague",definition:"person you work with"},{word:"promote",definition:"give a higher job position"},{word:"resign",definition:"quit a job voluntarily"},{word:"evaluate",definition:"assess performance or quality"},{word:"negotiate",definition:"discuss to reach agreement"},{word:"delegate",definition:"assign work to others"},{word:"overtime",definition:"working extra hours"},{word:"invoice",definition:"bill sent for payment"},{word:"benefits",definition:"extra pay from employer"},{word:"performance",definition:"how well work is done"},{word:"recruitment",definition:"process of hiring new staff"},{word:"appraisal",definition:"formal assessment of work"},{word:"probation",definition:"trial period for new employee"},{word:"redundancy",definition:"job loss from company changes"},{word:"portfolio",definition:"collection of work samples"},{word:"outsource",definition:"hire external company for task"},{word:"incentive",definition:"reward to motivate performance"},{word:"compliance",definition:"following rules and regulations"}],
  "Travel":        [{word:"itinerary",definition:"plan for a trip"},{word:"currency",definition:"money used in a country"},{word:"layover",definition:"stop between flights"},{word:"customs",definition:"border entry inspection"},{word:"boarding",definition:"getting onto a plane"},{word:"terminal",definition:"airport building section"},{word:"reservation",definition:"booking in advance"},{word:"departure",definition:"leaving a place"},{word:"visa",definition:"permit to enter a country"},{word:"transit",definition:"passing through on the way"},{word:"souvenir",definition:"item bought as travel memory"},{word:"jet lag",definition:"tiredness from time zone change"},{word:"passport",definition:"official travel identity document"},{word:"luggage",definition:"bags taken on a trip"},{word:"check-in",definition:"registering at hotel or airport"},{word:"excursion",definition:"short trip from main destination"},{word:"accommodation",definition:"place to stay while travelling"},{word:"turbulence",definition:"rough movement during flight"},{word:"tariff",definition:"charge for a service"},{word:"embarkation",definition:"process of boarding a vessel"}],
  "Education":     [{word:"curriculum",definition:"subjects taught in school"},{word:"semester",definition:"half of the school year"},{word:"thesis",definition:"long research paper"},{word:"enroll",definition:"register for a course"},{word:"lecture",definition:"formal educational talk"},{word:"assignment",definition:"task given by a teacher"},{word:"scholarship",definition:"money to pay for education"},{word:"graduate",definition:"finish a degree program"},{word:"plagiarism",definition:"copying someone's work dishonestly"},{word:"tuition",definition:"fee paid for education"},{word:"syllabus",definition:"outline of a course"},{word:"prerequisite",definition:"requirement before a course"},{word:"transcript",definition:"official record of grades"},{word:"accreditation",definition:"official approval of a program"},{word:"internship",definition:"temporary work for learning"},{word:"dissertation",definition:"extended piece of academic writing"},{word:"elective",definition:"optional course chosen freely"},{word:"faculty",definition:"teaching staff of a university"},{word:"pedagogy",definition:"theory and practice of teaching"},{word:"alumni",definition:"graduates of an institution"}],
  "Health":        [{word:"symptom",definition:"sign of a health problem"},{word:"diagnosis",definition:"identifying a disease"},{word:"prescription",definition:"doctor's medicine order"},{word:"nutrition",definition:"what you eat for health"},{word:"chronic",definition:"lasting a long time"},{word:"therapy",definition:"treatment to improve health"},{word:"recovery",definition:"return to good health"},{word:"immunity",definition:"body's disease resistance"},{word:"preventive",definition:"stopping illness before it starts"},{word:"hydration",definition:"drinking enough water"},{word:"sedentary",definition:"involving little physical activity"},{word:"metabolism",definition:"how the body uses energy"},{word:"allergy",definition:"immune reaction to a substance"},{word:"inflammation",definition:"body's response to injury"},{word:"dosage",definition:"amount of medicine to take"},{word:"antibiotics",definition:"drugs used to treat infections"},{word:"obesity",definition:"excess body weight condition"},{word:"rehabilitation",definition:"recovery through guided treatment"},{word:"prognosis",definition:"predicted outcome of illness"},{word:"epidemic",definition:"widespread disease in a region"}],
  "Food & Cooking":[{word:"simmer",definition:"cook just below boiling"},{word:"marinate",definition:"soak food in seasoned liquid"},{word:"garnish",definition:"decoration added to a dish"},{word:"portion",definition:"a serving size of food"},{word:"cuisine",definition:"style of cooking from region"},{word:"recipe",definition:"instructions for cooking a dish"},{word:"ingredient",definition:"item used to make a dish"},{word:"appetizer",definition:"small dish served before main"},{word:"blanch",definition:"briefly boil then cool food"},{word:"ferment",definition:"preserve food using bacteria"},{word:"braise",definition:"cook slowly in liquid"},{word:"caramelise",definition:"heat sugar until it browns"},{word:"emulsify",definition:"blend oil and water together"},{word:"reduction",definition:"sauce thickened by boiling"},{word:"umami",definition:"the fifth savoury taste"},{word:"poach",definition:"cook gently in simmering liquid"},{word:"julienne",definition:"cut food into thin strips"},{word:"al dente",definition:"pasta cooked to slight firmness"},{word:"roux",definition:"flour and fat mixture for sauces"},{word:"gluten",definition:"protein found in wheat"}],
  "Shopping":      [{word:"refund",definition:"money returned for a purchase"},{word:"discount",definition:"reduction in original price"},{word:"receipt",definition:"proof of a purchase"},{word:"warranty",definition:"promise to fix or replace"},{word:"wholesale",definition:"buying in large quantities"},{word:"retail",definition:"selling directly to consumers"},{word:"bargain",definition:"a very good deal"},{word:"checkout",definition:"place to pay for items"},{word:"inventory",definition:"total stock of goods"},{word:"markup",definition:"amount added to cost price"},{word:"clearance",definition:"sale to remove remaining stock"},{word:"counterfeit",definition:"fake copy of a product"},{word:"premium",definition:"extra cost for higher quality"},{word:"rebate",definition:"partial refund after purchase"},{word:"vendor",definition:"seller of goods or services"},{word:"surplus",definition:"excess stock above demand"},{word:"impulse buy",definition:"unplanned purchase on the spot"},{word:"loyalty card",definition:"card rewarding repeat customers"},{word:"consignment",definition:"goods sold on behalf of owner"},{word:"layaway",definition:"pay installments to reserve item"}],
  "Technology":    [{word:"bandwidth",definition:"speed of data transfer"},{word:"encrypt",definition:"convert data for security"},{word:"browser",definition:"app to access the internet"},{word:"firewall",definition:"software that blocks threats"},{word:"server",definition:"computer that stores data"},{word:"streaming",definition:"watching media online in real time"},{word:"algorithm",definition:"set of rules for problem-solving"},{word:"cache",definition:"temporary stored data for speed"},{word:"phishing",definition:"fraudulent attempt to steal info"},{word:"cloud",definition:"remote internet-based storage"},{word:"latency",definition:"delay in data transmission"},{word:"API",definition:"interface for software communication"},{word:"malware",definition:"software designed to cause harm"},{word:"debug",definition:"find and fix errors in code"},{word:"backup",definition:"copy of data for safety"},{word:"protocol",definition:"rules for data communication"},{word:"interface",definition:"point of interaction with system"},{word:"byte",definition:"unit of digital information"},{word:"upload",definition:"send files to the internet"},{word:"download",definition:"receive files from internet"}],
  "Environment":   [{word:"emissions",definition:"gases released into the air"},{word:"renewable",definition:"energy source that refills naturally"},{word:"ecosystem",definition:"community of living things"},{word:"conserve",definition:"protect and save resources"},{word:"pollution",definition:"harmful substances in environment"},{word:"biodiversity",definition:"variety of life on Earth"},{word:"landfill",definition:"site for disposing waste"},{word:"sustainable",definition:"able to continue long term"},{word:"erosion",definition:"gradual wearing away of land"},{word:"compost",definition:"decomposed organic matter for soil"},{word:"deforestation",definition:"clearing of forest land"},{word:"carbon offset",definition:"reducing emissions to compensate"},{word:"habitat",definition:"natural environment of an organism"},{word:"fossil fuel",definition:"non-renewable energy from ancient life"},{word:"ozone layer",definition:"atmospheric shield from UV rays"},{word:"reforestation",definition:"replanting trees in cleared areas"},{word:"runoff",definition:"water draining off land into rivers"},{word:"ecotourism",definition:"responsible travel to natural areas"},{word:"permafrost",definition:"permanently frozen ground layer"},{word:"acidification",definition:"increase of acid in oceans"}],
  "Immigration":   [{word:"residency",definition:"right to live in a country"},{word:"sponsor",definition:"person who supports an application"},{word:"refugee",definition:"person fleeing danger"},{word:"citizenship",definition:"legal membership in a country"},{word:"work permit",definition:"authorization to work legally"},{word:"dependant",definition:"family member in an application"},{word:"landing",definition:"arriving as a permanent resident"},{word:"naturalize",definition:"become a citizen of a country"},{word:"settlement",definition:"establishing in a new country"},{word:"inadmissible",definition:"not allowed to enter a country"},{word:"biometrics",definition:"fingerprints and photo for ID"},{word:"PR card",definition:"proof of permanent residency"},{word:"asylum",definition:"protection given to refugees"},{word:"deportation",definition:"forced removal from a country"},{word:"quota",definition:"limit on number of immigrants"},{word:"LMIA",definition:"Labour Market Impact Assessment"},{word:"Express Entry",definition:"points-based immigration system"},{word:"bridging visa",definition:"permit while main visa is processed"},{word:"sponsorship",definition:"supporting someone's immigration"},{word:"NOC code",definition:"National Occupation Classification"}],
};

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
  const staticFallback = shuffle(STATIC_PAIRS[config.topic] || STATIC_PAIRS["Daily Life"]).slice(0, pairCount);

  const [isGenerating, setIsGenerating] = useState(true);
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
      const prompt = `Generate exactly ${pairCount + 4} unique word-definition pairs for an English matching game about "${config.topic}" at ${config.difficulty} level (${CLB[config.difficulty]}).
Rules: definitions must be 4-7 words max, no duplicate words, varied interesting vocabulary beyond the obvious.
Return ONLY a JSON array: [{"word":"vocabulary","definition":"range of known words"}]`;
      const generated = await generateGameContent<Pair[]>(prompt, staticFallback);
      const valid = generated.filter(p => p?.word && p?.definition).slice(0, pairCount);
      const final = valid.length >= pairCount ? valid : staticFallback;
      setCards(buildCards(final));
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
