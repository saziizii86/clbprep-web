// src/pages/games/FillInTheBlank.tsx
import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, RefreshCw, Trophy, Clock, ChevronRight, Loader2 } from "lucide-react";
import { generateGameContent } from "./gameAI";

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

const STATIC_QUESTIONS: Record<string,Record<string,Question[]>> = {
  "Daily Life": {
    beginner:[
      {sentence:"I ___ coffee every morning.",options:["drink","drinks","drank","drinking"],correct:"drink",explanation:"Use 'drink' with 'I' in simple present."},
      {sentence:"She ___ to the store yesterday.",options:["go","goes","went","going"],correct:"went",explanation:"'Went' is the past tense of 'go'."},
      {sentence:"He ___ his keys on the table.",options:["leave","left","leaving","leaves"],correct:"left",explanation:"'Left' is past tense of 'leave'."},
      {sentence:"We usually ___ dinner at seven.",options:["having","had","have","has"],correct:"have",explanation:"Use 'have' with 'we'."},
      {sentence:"She ___ the dishes every night.",options:["wash","washes","washed","washing"],correct:"washes",explanation:"Third person singular needs -s."},
    ],
    intermediate:[
      {sentence:"She ___ the report by the time I arrived.",options:["finished","has finished","had finished","was finishing"],correct:"had finished",explanation:"Past perfect for action completed before another past action."},
      {sentence:"I am looking ___ to the weekend.",options:["up","forward","ahead","after"],correct:"forward",explanation:"'Look forward to' is the correct phrase."},
      {sentence:"He ___ to take the bus when it rains.",options:["tends","tend","tended","tending"],correct:"tends",explanation:"Third person singular: tends."},
      {sentence:"Could you turn ___ the music?",options:["off","down","up","in"],correct:"down",explanation:"'Turn down' means reduce volume."},
      {sentence:"She ___ cooking every Sunday.",options:["enjoys","enjoy","enjoyed","is enjoying"],correct:"enjoys",explanation:"Third person singular + gerund after 'enjoy'."},
    ],
    advanced:[
      {sentence:"Despite ___ hard, he failed the exam.",options:["study","studied","studying","to study"],correct:"studying",explanation:"After 'despite', use the gerund (-ing form)."},
      {sentence:"He is ___ to finishing the project on time.",options:["committed","committing","commit","commits"],correct:"committed",explanation:"'Committed to' is followed by a gerund."},
      {sentence:"The apartment ___ renovated before the tenants moved in.",options:["had been","was being","has been","would be"],correct:"had been",explanation:"Past perfect passive for action completed before a past moment."},
    ],
  },
  "Work": {
    beginner:[{sentence:"The meeting ___ at 9 AM tomorrow.",options:["start","starts","started","starting"],correct:"starts",explanation:"Present simple for scheduled events."},{sentence:"She is ___ on the new project.",options:["work","works","worked","working"],correct:"working",explanation:"Present continuous: is + -ing."},{sentence:"He is responsible ___ managing the budget.",options:["for","to","of","in"],correct:"for",explanation:"'Responsible for' is the correct preposition."}],
    intermediate:[{sentence:"I will ___ the proposal to the client tomorrow.",options:["sending","sent","send","sends"],correct:"send",explanation:"'Will' is followed by the base form."},{sentence:"She is interested ___ the marketing position.",options:["at","on","in","for"],correct:"in",explanation:"'Interested in' uses the preposition 'in'."},{sentence:"He ___ the presentation when the power went out.",options:["was giving","gave","gives","had given"],correct:"was giving",explanation:"Past continuous for interrupted action."}],
    advanced:[{sentence:"Having ___ the data, we are confident in our findings.",options:["analyze","analyzed","analyzing","analyzes"],correct:"analyzed",explanation:"Perfect participle clause uses the past participle."},{sentence:"She would have applied ___ she known about it sooner.",options:["had","if","when","unless"],correct:"had",explanation:"Third conditional inversion: 'Had she known...'"}],
  },
  "Travel":    {beginner:[{sentence:"My passport ___ last month.",options:["expire","expires","expired","expiring"],correct:"expired",explanation:"Simple past for completed event."},{sentence:"We are flying ___ Toronto.",options:["at","in","to","from"],correct:"to",explanation:"'Flying to' shows direction."}],intermediate:[{sentence:"I ___ a window seat when I fly.",options:["prefer","preferred","preferring","prefers"],correct:"prefer",explanation:"Stative verbs use simple present."},{sentence:"The flight was delayed ___ two hours.",options:["for","by","with","at"],correct:"by",explanation:"'Delayed by' shows the amount of delay."}],advanced:[{sentence:"Travellers are advised ___ their belongings unattended.",options:["not leaving","not to leave","to not leave","not leave"],correct:"not to leave",explanation:"Passive advisory: 'advised + not to + infinitive'."}]},
  "Education": {beginner:[{sentence:"Students ___ study for the exam.",options:["can","should","must","would"],correct:"should",explanation:"'Should' gives advice."},{sentence:"She ___ her assignment yesterday.",options:["submit","submits","submitted","submitting"],correct:"submitted",explanation:"Simple past for completed action."}],intermediate:[{sentence:"He finds grammar ___ to understand.",options:["difficulty","difficult","difficultly","difficulties"],correct:"difficult",explanation:"After 'find + object', use an adjective."},{sentence:"The professor asked us ___ our essays by Thursday.",options:["submit","submitting","to submit","submitted"],correct:"to submit",explanation:"After 'asked us', use the full infinitive."}],advanced:[{sentence:"The research ___ that students learn better through practice.",options:["suggest","suggested","suggests","suggesting"],correct:"suggests",explanation:"Academic writing uses simple present for findings."}]},
  "Health":    {beginner:[{sentence:"You ___ see a doctor if you feel worse.",options:["will","should","can","must"],correct:"should",explanation:"'Should' gives health advice."},{sentence:"She ___ medication twice a day.",options:["take","takes","took","taking"],correct:"takes",explanation:"Third person singular."}],intermediate:[{sentence:"He has been ___ from a cold all week.",options:["suffer","suffered","suffers","suffering"],correct:"suffering",explanation:"Present perfect continuous: has been + -ing."},{sentence:"Regular exercise is beneficial ___ your health.",options:["to","for","with","in"],correct:"for",explanation:"'Beneficial for' is the correct collocation."}],advanced:[{sentence:"The doctor recommended ___ red meat to improve cholesterol.",options:["reduce","reduced","to reduce","reducing"],correct:"reducing",explanation:"'Recommend' is followed by a gerund."}]},
  "Food & Cooking":{beginner:[{sentence:"Add a ___ of salt to the pasta.",options:["piece","pinch","cup","slice"],correct:"pinch",explanation:"'A pinch of salt' is the correct collocation."},{sentence:"The recipe ___ two cups of flour.",options:["asks","calls for","needs from","requires for"],correct:"calls for",explanation:"'Calls for' means requires in cooking."}],intermediate:[{sentence:"Let the dough ___ for one hour before baking.",options:["resting","rests","rest","rested"],correct:"rest",explanation:"After 'let', use the base form."},{sentence:"The dish ___ better if you use fresh herbs.",options:["taste","tastes","will taste","tasted"],correct:"will taste",explanation:"First conditional for future result."}],advanced:[{sentence:"The sauce should be reduced ___ it coats the back of a spoon.",options:["while","until","when","once"],correct:"until",explanation:"'Until' shows the endpoint of an ongoing action."}]},
  "Shopping":  {beginner:[{sentence:"Can I ___ a refund?",options:["gets","got","get","getting"],correct:"get",explanation:"Modal 'can' + base verb."},{sentence:"This shirt is ___ sale.",options:["at","for","on","in"],correct:"on",explanation:"'On sale' is the fixed expression."}],intermediate:[{sentence:"I am looking ___ a gift.",options:["at","to","after","for"],correct:"for",explanation:"'Looking for' means searching."},{sentence:"She ___ the item back the next day.",options:["return","returned","returns","returning"],correct:"returned",explanation:"Simple past for completed action."}],advanced:[{sentence:"Consumers are increasingly ___ toward sustainable brands.",options:["gravitate","gravitated","gravitates","gravitating"],correct:"gravitating",explanation:"Present continuous for ongoing trends."}]},
  "Technology":{beginner:[{sentence:"Please ___ your phone before the class.",options:["turn on","turn off","turn down","turn up"],correct:"turn off",explanation:"'Turn off' means switch off a device."},{sentence:"He ___ a new app on his phone.",options:["downloads","downloaded","download","downloading"],correct:"downloaded",explanation:"Simple past for completed action."}],intermediate:[{sentence:"You need to ___ your software to fix the bug.",options:["updating","updated","update","updates"],correct:"update",explanation:"'Need to' + base infinitive."},{sentence:"Your data is stored ___ the cloud.",options:["on","in","at","by"],correct:"in",explanation:"'In the cloud' is the standard expression."}],advanced:[{sentence:"The algorithm ___ machine learning to improve recommendations.",options:["leverage","leverages","leveraged","leveraging"],correct:"leverages",explanation:"Singular subject takes -s."},{sentence:"End-to-end encryption ensures that data ___ intercepted during transmission.",options:["cannot be","can not","is not","will not"],correct:"cannot be",explanation:"Passive modal: cannot + be + past participle."}]},
  "Environment":{beginner:[{sentence:"We should ___ water.",options:["conserve","conserves","conserving","conserved"],correct:"conserve",explanation:"'Should' + base verb form."},{sentence:"Plastic takes hundreds of years to ___.",options:["decompose","decomposes","decomposing","decomposed"],correct:"decompose",explanation:"Infinitive 'to' + base form."}],intermediate:[{sentence:"If we don't act now, the damage ___ irreversible.",options:["becomes","become","will become","becoming"],correct:"will become",explanation:"First conditional: if + present, will + base."},{sentence:"Solar panels ___ energy directly from sunlight.",options:["generate","generates","generated","generating"],correct:"generate",explanation:"Plural subject takes base form."}],advanced:[{sentence:"The policy aims ___ emissions by 40% by 2030.",options:["reducing","to reduce","reduced","reduce"],correct:"to reduce",explanation:"'Aim to' is followed by the full infinitive."}]},
  "Immigration":{beginner:[{sentence:"I need to ___ for a work permit.",options:["apply to","apply at","apply for","apply on"],correct:"apply for",explanation:"'Apply for' is used with permits."},{sentence:"He ___ permanent residency last year.",options:["receive","receives","received","receiving"],correct:"received",explanation:"Simple past for completed event."}],intermediate:[{sentence:"Applicants must provide proof ___ financial support.",options:["for","of","to","in"],correct:"of",explanation:"'Proof of' is the correct preposition."},{sentence:"You ___ submit all documents before the deadline.",options:["must","should","might","can"],correct:"must",explanation:"'Must' expresses mandatory obligation."}],advanced:[{sentence:"The application was ___ due to missing documentation.",options:["rejecting","reject","rejected","to reject"],correct:"rejected",explanation:"Passive voice: was + past participle."},{sentence:"___ the applicant meet all criteria, the visa would be approved.",options:["Should","If","When","Were"],correct:"Should",explanation:"Formal conditional inversion: 'Should + subject + verb'."}]},
};

function FillInBlankInner({ config, onBack, onReset }: { config: GameConfig; onBack:()=>void; onReset:()=>void }) {
  const topicStatic = STATIC_QUESTIONS[config.topic] || STATIC_QUESTIONS["Daily Life"];
  const diffStatic = topicStatic[config.difficulty] || topicStatic["beginner"];
  const staticFallback = shuffle(diffStatic).slice(0, 5);

  const [isGenerating, setIsGenerating] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string|null>(null);
  const [feedback, setFeedback] = useState<"correct"|"wrong"|null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.duration * 60);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    async function load() {
      const prompt = `Generate exactly 7 fill-in-the-blank English grammar questions related to "${config.topic}" at ${config.difficulty} level (${CLB[config.difficulty]}).
Grammar focus: ${GRAMMAR_FOCUS[config.difficulty]}.
Each question must have exactly 4 options (only ONE is correct), and a brief explanation.
Make the distractors plausible (not obviously wrong).
Return ONLY a JSON array:
[{"sentence":"She ___ to work every day.","options":["go","goes","went","going"],"correct":"goes","explanation":"Third person singular uses -s in simple present"}]`;
      const generated = await generateGameContent<Question[]>(prompt, staticFallback);
      const valid = generated.filter(q => q?.sentence && q?.options?.length === 4 && q?.correct && q?.explanation
        && q.options.includes(q.correct) && q.sentence.includes("___"));
      const final = valid.length >= 3 ? shuffle(valid).slice(0, 5) : staticFallback;
      setQuestions(final);
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
  const current = questions[idx];
  const shuffledOpts = useMemo(() => current ? shuffle([...current.options]) : [], [idx, questions.length]);

  const handleSelect = (opt: string) => {
    if (feedback || !current) return;
    setSelected(opt);
    const ok = opt === current.correct;
    setFeedback(ok ? "correct" : "wrong");
    if (ok) setScore(s => s + 1);
  };
  const next = () => {
    if (idx + 1 >= questions.length) { setGameOver(true); return; }
    setIdx(i => i + 1); setSelected(null); setFeedback(null);
  };

  const renderSentence = () => {
    if (!current) return null;
    const parts = current.sentence.split("___");
    return (
      <span>
        {parts[0]}
        <span className={`inline-block min-w-[90px] px-3 py-0.5 mx-1 rounded-lg font-bold border-b-2 text-center
          ${feedback==="correct"?"bg-green-100 text-green-800 border-green-500":feedback==="wrong"?"bg-red-50 text-red-700 border-red-400":selected?"bg-orange-50 text-orange-700 border-orange-400":"bg-gray-100 text-gray-400 border-gray-400"}`}>
          {selected || "___"}
        </span>
        {parts[1]}
      </span>
    );
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
          {shuffledOpts.map(opt => {
            const isCorrect = opt===current?.correct, isSel = opt===selected;
            return (
              <button key={opt} onClick={()=>handleSelect(opt)} disabled={!!feedback}
                className={`py-4 px-3 rounded-2xl border-2 text-sm font-semibold transition text-center
                  ${feedback ? isCorrect?"bg-green-100 border-green-500 text-green-800":isSel?"bg-red-100 border-red-400 text-red-700":"bg-gray-50 border-gray-200 text-gray-400"
                    : "bg-white border-orange-200 text-orange-800 hover:bg-orange-50 hover:border-orange-400 cursor-pointer"}`}>
                {opt}
              </button>
            );
          })}
        </div>
        {feedback && <div className={`rounded-xl px-4 py-3 mb-5 text-sm ${feedback==="correct"?"bg-green-100 text-green-800":"bg-red-50 text-red-700"}`}>
          {feedback==="correct" ? <><strong>✓ Correct!</strong> {current?.explanation}</> : <><strong>✗ Incorrect.</strong> Answer: "<strong>{current?.correct}</strong>". {current?.explanation}</>}
        </div>}
        <div className="flex gap-3">
          {!feedback ? (
            <button onClick={onReset} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4"/>New Session</button>
          ) : (
            <button onClick={next} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 flex items-center justify-center gap-2">
              {idx+1<questions.length?"Next Question":"See Results"} <ChevronRight className="w-4 h-4"/>
            </button>
          )}
        </div>
        <p className="text-center mt-3 text-xs text-gray-500">Score: <span className="font-bold text-orange-600">{score}/{idx+(feedback?1:0)}</span></p>
      </div>
    </div>
  );
}

export default function FillInTheBlank({ config, onBack }: Props) {
  const [key, setKey] = useState(0);
  return <FillInBlankInner key={key} config={config} onBack={onBack} onReset={() => setKey(k => k + 1)} />;
}
