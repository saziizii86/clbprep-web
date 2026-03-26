// src/pages/Problem Solving/ListeningPracticeTest.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, Clock, Volume2, 
  Play, Pause, CheckCircle, Info, Headphones,
  AlertCircle, RotateCcw, X
} from 'lucide-react';

// Types
interface QuestionOption {
  id: string;
  text?: string;
  imageUrl?: string;
}

interface Question {
  id: string;
  questionText: string;
  type: 'multiple-choice' | 'image-choice' | 'dropdown';
  options: QuestionOption[];
  correctAnswer: string;

  // ✅ FROM DATABASE
  audioUrl?: string | null;
  transcript?: string | null;

  tip?: string;
}



interface Section {
  id: string;
  title: string;
  audioUrl?: string;
  audioDuration: number;
  transcript?: string;
  questions: Question[];
  preparationTime?: number;
}

interface Scenario {
  id: string;
  title: string;
  skill: string;
  taskName: string;
  taskType: string;
  totalTime: number;
  instructions?: string;
  contextImage?: string;
  contextDescription?: string;
  sections: Section[];
}

interface TestResults {
  scenarioId: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  timeSpent: number;
}

interface ListeningPracticeTestProps {
  scenario: Scenario;
  onBack: () => void;
  onComplete: (results: TestResults) => void;
}

type TestPhase =
  | "instructions"
  | "context"
  | "listening"
  | "preparation"
  | "question"
  | "results"
  | "answerKey";


// DEFAULT SAMPLE DATA - Used when no sections provided from database
const getDefaultSections = (): Section[] => [
  {
    id: 'section-1',
    title: 'Section 1',
    audioDuration: 47,
    transcript: `MAN: Excuse me, before I leave, could you take a look at my account and see how many cardio classes I have left?

WOMAN: Sure. Do you have your membership card?

MAN: Here it is. I joined this health club a couple of months ago, but haven't been keeping track of how often I come.

WOMAN: No worries, I can look it up. Let's see... You have 5 classes left. Did you know we have a special promotion this month? If you buy a 20-class package, you get a 10% discount.

MAN: Hmm. I already get a 15% student discount. Can I add it on to that?

WOMAN: Oh, no, sorry, the current promotion can't be combined with any other discounts.

MAN: Oh, well. Thanks and have a great day!`,
    questions: [
      {
        id: 'q1',
        questionText: 'What does the man want?',
        type: 'multiple-choice',
        options: [
          { id: 'a', text: 'to get a membership' },
          { id: 'b', text: 'to receive a discount' },
          { id: 'c', text: 'to check his account' },
          { id: 'd', text: 'to take a cardio class' }
        ],
        correctAnswer: 'c',
        tip: 'Focus on keywords (numbers, dates, reasons, next steps).'
      },
      {
        id: 'q2',
        questionText: 'What discount does the woman offer the man?',
        type: 'multiple-choice',
        options: [
          { id: 'a', text: '10%' },
          { id: 'b', text: '15%' },
          { id: 'c', text: '20%' },
          { id: 'd', text: '50%' }
        ],
        correctAnswer: 'a',
        tip: 'Focus on keywords (numbers, dates, reasons, next steps).'
      }
    ]
  },
  {
    id: 'section-2',
    title: 'Section 2',
    audioDuration: 60,
    preparationTime: 10,
    transcript: `MAN: Hi again. Hey, I must be having bad luck. I was on my way home and once it started raining I discovered that I'd forgotten my umbrella. Do you have a lost and found bin? I think I might have left my umbrella in the locker room.

WOMAN: Sure, we have a lost and found. What does your umbrella look like?

MAN: It's black, the kind where the stem collapses and it becomes really small. The handle is wooden. It's the Bay brand. It might have the brand logo on the handle, I don't remember.

WOMAN: Let me check... Wow, umbrellas seem to be a commonly forgotten item! But I think I found yours!

MAN: Oh that's great! Thank you!

WOMAN: You're welcome! See you next time!`,
    questions: [
      {
        id: 'q3',
        questionText: 'Why does the man return to the health club?',
        type: 'multiple-choice',
        options: [
          { id: 'a', text: 'to wait until it stops raining outside' },
          { id: 'b', text: 'to look for something in his locker' },
          { id: 'c', text: 'to return something that wasn\'t his' },
          { id: 'd', text: 'to get back a missing personal item' }
        ],
        correctAnswer: 'd'
      },
      {
        id: 'q4',
        questionText: 'Which statement is most likely true?',
        type: 'multiple-choice',
        options: [
          { id: 'a', text: 'The man was walking home from the gym.' },
          { id: 'b', text: 'The man should have received a discount.' },
          { id: 'c', text: 'The gym\'s clients rarely carry umbrellas.' },
          { id: 'd', text: 'The gym\'s clients don\'t use the lockers.' }
        ],
        correctAnswer: 'a'
      },
      {
        id: 'q5',
        questionText: 'What color is the man\'s umbrella?',
        type: 'multiple-choice',
        options: [
          { id: 'a', text: 'Yellow' },
          { id: 'b', text: 'Blue' },
          { id: 'c', text: 'Black' },
          { id: 'd', text: 'Red' }
        ],
        correctAnswer: 'c'
      }
    ]
  },
  {
    id: 'section-3',
    title: 'Section 3',
    audioDuration: 55,
    preparationTime: 10,
    transcript: `MAN: Hey, it's me again. Sorry, I see you're closing in a few minutes!

WOMAN: No worries. It always takes a while for the last class to leave, and it takes an hour to clean-up after that. What can I do for you?

MAN: Sorry, but I think I took the wrong umbrella!

WOMAN: What? Really?

MAN: Yeah! Are you sure there weren't two black Bay umbrellas in the lost and found? Mine has a rip in the fabric, near the top. But the one you gave me doesn't have a rip. Here, see? I don't feel right taking it.

WOMAN: Wow, what are the chances of that happening? Okay, let me go check the lost and found again.

MAN: Yeah, if you could check that would be fantastic.

WOMAN: One second... Wow, you're right! I can't believe there were two umbrellas exactly the same. Let's open this one. Yep, it's got a rip at the top!

MAN: That's the one! Here, I'll trade you.

WOMAN: It's a deal. See you next time! Just press the buzzer to unlock the door on your way out.`,
    questions: [
      {
        id: 'q6',
        questionText: 'Why does the man apologize to the woman?',
        type: 'multiple-choice',
        options: [
          { id: 'a', text: 'He interrupted her clean-up routine.' },
          { id: 'b', text: 'He made her re-open the health club.' },
          { id: 'c', text: 'He thinks he is bothering the woman.' },
          { id: 'd', text: 'He is making the woman work late.' }
        ],
        correctAnswer: 'c'
      },
      {
        id: 'q7',
        questionText: 'Why does the man return the item?',
        type: 'multiple-choice',
        options: [
          { id: 'a', text: 'It belonged to someone else.' },
          { id: 'b', text: 'He wanted to make a deal.' },
          { id: 'c', text: 'It was the wrong type of fabric.' },
          { id: 'd', text: 'He found a small rip at the top.' }
        ],
        correctAnswer: 'a'
      },
      {
        id: 'q8',
        questionText: 'What will most likely happen next?',
        type: 'multiple-choice',
        options: [
          { id: 'a', text: 'The woman will apologize to the man.' },
          { id: 'b', text: 'The man will need help getting out.' },
          { id: 'c', text: 'The man will buy a better umbrella.' },
          { id: 'd', text: 'The woman will begin her chores.' }
        ],
        correctAnswer: 'd'
      }
    ]
  }
];

// Format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Main Component
const ListeningPracticeTest: React.FC<ListeningPracticeTestProps> = ({
  scenario,
  onBack,
  onComplete
}) => {
  // USE DEFAULT SECTIONS IF NONE PROVIDED
  const sections = scenario.sections && scenario.sections.length > 0 
    ? scenario.sections 
    : getDefaultSections();
  
  const contextDescription =
  (scenario as any)?.instructions ||
  scenario.contextDescription ||
  (scenario as any)?.description ||
  ' Instructions are not loaded from DB';

  // State
  const [phase, setPhase] = useState<TestPhase>('instructions');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(scenario.totalTime || 90);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

  const [preparationTimeLeft, setPreparationTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [realAudioDuration, setRealAudioDuration] = useState(0);

  const [showTranscript, setShowTranscript] = useState(false);
  //const [testStartTime] = useState(Date.now());
  const [testStartTime, setTestStartTime] = useState<number | null>(null);

  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [autoPlayRequested, setAutoPlayRequested] = useState(false);

  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
	  // ✅ Question Audio (plays after listening page)
	const questionAudioRef = useRef<HTMLAudioElement | null>(null);
	const [autoPlayQuestionRequested, setAutoPlayQuestionRequested] = useState(false);


	  // Current section and question - NOW USING LOCAL sections VARIABLE
	  const currentSection = sections[currentSectionIndex];
	  const allQuestions = sections.flatMap(s => s.questions);
	  const totalQuestions = allQuestions.length;
	  
	  const getAbsoluteQuestionIndex = () => {
		let count = 0;
		for (let i = 0; i < currentSectionIndex; i++) {
		  count += sections[i].questions.length;
		}
		return count + currentQuestionIndex;
	  };

	  const currentQuestion = currentSection?.questions[currentQuestionIndex];
			// ✅ Extract transcript text safely (supports string OR file objects OR base64)
			const extractTranscriptText = (value: any): string => {
			  if (!value) return "";

			  // if already plain text
			  if (typeof value === "string") return value;

			  // some dashboards save it like { content: "..." }
			  if (typeof value?.content === "string") return value.content;

			  // some dashboards save it like { text: "..." }
			  if (typeof value?.text === "string") return value.text;

			  // some dashboards save it like { data: "base64..." }
			  if (typeof value?.data === "string") {
				try {
				  return atob(value.data);
				} catch {
				  return value.data;
				}
			  }

			  return "";
			};

			// ✅ Get Question Transcript from DB (supports uploadedFiles storage)
			const getQuestionTranscriptFromDB = () => {
			  // 1) direct field on question
			  if (currentQuestion?.transcript) return currentQuestion.transcript;

			  // 2) fallback: uploadedFiles.questionTranscripts (saved in admin)
			  const uploaded = (scenario as any)?.uploadedFiles;
			  const qt = uploaded?.questionTranscripts;

			  if (!qt) return "";

			  // ✅ if saved as [ [q1,q2,...], [q1,q2,...] ] (per section)
			  if (Array.isArray(qt[currentSectionIndex])) {
				return extractTranscriptText(qt[currentSectionIndex]?.[currentQuestionIndex]);
			  }

			  // ✅ if saved as flat list [q1,q2,q3...]
			  return extractTranscriptText(qt[currentQuestionIndex]);
			};

			const questionTranscriptText = getQuestionTranscriptFromDB();

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    //if (phase === 'question' || phase === 'listening') {
		if (phase === 'question') {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase]);

  // Preparation countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'preparation' && preparationTimeLeft > 0) {
      timer = setInterval(() => {
        setPreparationTimeLeft(prev => {
		if (prev <= 1) {
		  // ✅ reset listening audio states for the new section
		  setAudioProgress(0);
		  setAudioCurrentTime(0);
		  setHasPlayedAudio(false);
		  setIsPlaying(false);

		  // ✅ go to listening and request autoplay
		  setPhase("listening");
		  setAutoPlayRequested(true);

		  return 0;
		}


          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase, preparationTimeLeft]);

  // Cleanup audio interval on unmount
  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  // Audio playback (simulated when no real audio URL)
  const togglePlayPause = async () => {
	  if (currentSection.audioUrl && audioRef.current) {
		try {
		  if (audioRef.current.paused) {
			await audioRef.current.play();
			setIsPlaying(true);
		  } else {
			audioRef.current.pause();
			setIsPlaying(false);
		  }
		} catch (err) {
		  console.warn("Play blocked:", err);
		  setIsPlaying(false);
		}
		return;
	  }

	  // Simulated audio playback
	  if (isPlaying) {
		if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
		setIsPlaying(false);
	  } else {
		setIsPlaying(true);
		const duration = currentSection.audioDuration || 60;

		audioIntervalRef.current = setInterval(() => {
		  setAudioCurrentTime(prev => {
			const newTime = prev + 0.1;
			const newProgress = (newTime / duration) * 100;
			setAudioProgress(newProgress);

			if (newTime >= duration) {
			  if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
			  setIsPlaying(false);
			  setHasPlayedAudio(true);
			  setTimeout(() => setPhase('question'), 500);
			  return duration;
			}
			return newTime;
		  });
		}, 100);
	  }
	};

		useEffect(() => {
		  if (!autoPlayRequested) return;
		  if (phase !== "listening") return;

		  const el = audioRef.current;
		  if (!el) {
			setAutoPlayRequested(false);
			return;
		  }

		  // ✅ Only autoplay if real audio URL exists
		  if (!currentSection?.audioUrl) {
			setAutoPlayRequested(false);
			return;
		  }

		  const playNow = async () => {
			try {
			  el.currentTime = 0;
			  await el.play();
			  setIsPlaying(true);
			} catch (err) {
			  console.warn("Autoplay blocked by browser:", err);
			} finally {
			  setAutoPlayRequested(false);
			}
		  };

		  // ✅ wait until audio is ready
		  if (el.readyState >= 2) {
			playNow();
		  } else {
			const onCanPlay = () => playNow();
			el.addEventListener("canplay", onCanPlay, { once: true });
			return () => el.removeEventListener("canplay", onCanPlay);
		  }
		}, [phase, autoPlayRequested, currentSection?.audioUrl]);


		useEffect(() => {
		  if (!autoPlayQuestionRequested) return;
		  if (phase !== "question") return;

		  const el = questionAudioRef.current;
		  const url = currentQuestion?.audioUrl;

		  if (!el || !url) {
			setAutoPlayQuestionRequested(false);
			return;
		  }

		  const playNow = async () => {
			try {
			  el.currentTime = 0;
			  await el.play();
			} catch (err) {
			  console.warn("Question autoplay blocked:", err);
			} finally {
			  setAutoPlayQuestionRequested(false);
			}
		  };

		  if (el.readyState >= 2) {
			playNow();
		  } else {
			const onCanPlay = () => playNow();
			el.addEventListener("canplay", onCanPlay, { once: true });
			return () => el.removeEventListener("canplay", onCanPlay);
		  }
		}, [phase, autoPlayQuestionRequested, currentQuestion?.id, currentQuestion?.audioUrl]);



	const handleNext = () => {
	  if (phase === "instructions") {
		setPhase("context");
		return;
	  }

	if (phase === "context") {
	  // ✅ START TIMER HERE (real start of test)
	  setTestStartTime(Date.now());

	  // reset audio state (new listening)
	  setAudioProgress(0);
	  setAudioCurrentTime(0);
	  setHasPlayedAudio(false);
	  setIsPlaying(false);

	  // request autoplay on listening page
	  setAutoPlayRequested(true);
	  setPhase("listening");
	  return;
	}


	  if (phase === "listening") {
		// stop listening audio if it's playing
		if (audioRef.current) {
		  audioRef.current.pause();
		  audioRef.current.currentTime = 0;
		}

		setIsPlaying(false);
		setHasPlayedAudio(true);

		// ✅ go to question page and autoplay question audio
		setPhase("question");
		setAutoPlayQuestionRequested(true);
		setShowTranscript(false);
		return;
	  }

		if (phase === "question") {
		  // ✅ stop current question audio (important)
		  if (questionAudioRef.current) {
			questionAudioRef.current.pause();
			questionAudioRef.current.currentTime = 0;
		  }

		  if (currentQuestionIndex < currentSection.questions.length - 1) {
			setCurrentQuestionIndex((prev) => prev + 1);

			setShowTranscript(false);

			// ✅ THIS is the missing line
			setAutoPlayQuestionRequested(true);

		  } else if (currentSectionIndex < sections.length - 1) {
			setCurrentSectionIndex((prev) => prev + 1);
			setCurrentQuestionIndex(0);

			setHasPlayedAudio(false);
			setAudioProgress(0);
			setAudioCurrentTime(0);

			const nextSection = sections[currentSectionIndex + 1];
			if (nextSection.preparationTime) {
			  setPreparationTimeLeft(nextSection.preparationTime);
			  setPhase("preparation");
			} else {
			  setPhase("listening");
			  setAutoPlayRequested(true);
			}
		  } else {
			handleComplete();
		  }
		}

	};


		const handleBackNavigation = () => {
			// ✅ If we are on Answer Key screen, go back to Results
		if (phase === "answerKey") {
		  setPhase("results");
		  return;
		}


	  // ✅ PREPARATION screen (Section 2 or 3)
	  if (phase === "preparation") {
		if (currentSectionIndex > 0) {
		  const prevSectionIndex = currentSectionIndex - 1;
		  const prevSection = sections[prevSectionIndex];

		  setCurrentSectionIndex(prevSectionIndex);
		  setCurrentQuestionIndex(
			Math.max(0, (prevSection?.questions?.length || 1) - 1)
		  );

		  setPhase("question");
		  setShowTranscript(false);
		  setAutoPlayQuestionRequested(true);
		  return;
		}

		setPhase("context");
		return;
	  }

	  // ✅ LISTENING screen
	  if (phase === "listening") {
		// stop listening audio if playing
		if (audioRef.current) {
		  audioRef.current.pause();
		  audioRef.current.currentTime = 0;
		}

		setIsPlaying(false);

		// ✅ If we are in section 2 or 3 → go back to last question of previous section
		if (currentSectionIndex > 0) {
		  const prevSectionIndex = currentSectionIndex - 1;
		  const prevSection = sections[prevSectionIndex];

		  setCurrentSectionIndex(prevSectionIndex);
		  setCurrentQuestionIndex(
			Math.max(0, (prevSection?.questions?.length || 1) - 1)
		  );

		  setPhase("question");
		  setShowTranscript(false);
		  setAutoPlayQuestionRequested(true);
		  return;
		}

		// ✅ If we are in section 1 listening → go back to context
		setPhase("context");
		return;
	  }

	  // ✅ QUESTION screen
	  if (phase === "question") {
		// go to previous question inside same section
		if (currentQuestionIndex > 0) {
		  setCurrentQuestionIndex((prev) => prev - 1);
		  setShowTranscript(false);
		  setAutoPlayQuestionRequested(true);
		  return;
		}

		// ✅ if first question of ANY section → go back to that section listening page
		//    and autoplay listening audio again
		if (questionAudioRef.current) {
		  questionAudioRef.current.pause();
		  questionAudioRef.current.currentTime = 0;
		}

		setPhase("listening");
		setShowTranscript(false);

		// ✅ reset listening audio state so play button is NOT gray
		setHasPlayedAudio(false);
		setIsPlaying(false);
		setAudioProgress(0);
		setAudioCurrentTime(0);

		// ✅ autoplay listening audio
		setAutoPlayRequested(true);

		return;



		// first question of first section → go back to listening
		setPhase("listening");
		setShowTranscript(false);
		return;
	  }

	  // fallback
	  setPhase("context");
	};





	const handleComplete = () => {
	  let correctCount = 0;

	  allQuestions.forEach((q) => {
		if (answers[q.id] === q.correctAnswer) {
		  correctCount++;
		}
	  });

	  const results: TestResults = {
		scenarioId: scenario.id,
		answers,
		score: correctCount,
		totalQuestions,
		//timeSpent: Math.floor((Date.now() - testStartTime) / 1000),
		timeSpent: Math.floor((Date.now() - (testStartTime ?? Date.now())) / 1000),

	  };

	  // ✅ IMPORTANT: keep results INSIDE this page
	  setTestResults(results);
	  setPhase("results");

	  // ❌ DO NOT call onComplete here, because it sends user back to main page
	  // onComplete(results);
	};


  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

const resetTest = () => {
  setPhase('instructions');
  setCurrentSectionIndex(0);
  setCurrentQuestionIndex(0);
  setAnswers({});
  setHasPlayedAudio(false);
  setAudioProgress(0);
  setAudioCurrentTime(0);
  setTimeLeft(scenario.totalTime || 90);
  setShowTranscript(false);

  // ✅ reset real test timer
  setTestStartTime(null);
};


  //const progressPercentage = ((getAbsoluteQuestionIndex() + 1) / totalQuestions) * 100;
  const progressPercentage =
  phase === "question"
    ? ((getAbsoluteQuestionIndex() + 1) / totalQuestions) * 100
    : 0;


  // ============== RENDER FUNCTIONS ==============

  // ============== RENDER FUNCTIONS ==============
  const PANEL_CLASS =
    "bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-6xl mx-auto min-h-[620px]";

  const renderInstructions = () => (
    <div className={PANEL_CLASS}>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/25">
          <Headphones className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">{scenario.taskName || 'Problem Solving'}</h2>
        <p className="text-slate-500 text-lg">{scenario.title?.replace(/_/g, ' ') || 'Listening Practice'}</p>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-8 border border-slate-200/80">
        <h3 className="font-semibold text-slate-900 mb-5 flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          Instructions
        </h3>
        <div className="space-y-3">
          {[
            'You will hear a conversation in 3 sections. You will hear each section only once.',
            'After each section, you will hear 2 or 3 questions. You will hear the questions only once.',
            'Choose the best answer to each question.'
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-4 group">
              <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                {i + 1}
              </span>
              <p className="text-slate-700 leading-relaxed pt-1">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
      >
        Continue
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );

  const renderContext = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
      <div className="text-left mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Instructions</h2>
      </div>


      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-8 mb-6 border border-slate-200/80">
        <p className="text-slate-700 leading-relaxed text-lg text-justify">

          {contextDescription}
        </p>
      </div>

      {scenario.contextImage && (
        <div className="mb-8 rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-200 h-72 flex items-center justify-center">
          <img
            src={scenario.contextImage}
            alt={scenario.title}
            className="w-full h-full object-contain"
          />
        </div>
      )}



      <div className="flex gap-4">
        <button
          onClick={handleBackNavigation}
          className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
        >
          Start Listening
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderPreparation = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
      <div className="text-left">



        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-8 mb-8 border border-slate-200/80">
          <div className="flex items-center justify-start gap-3 mb-8">

            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xl text-slate-700">
              You will hear the <span className="font-semibold text-blue-600">{currentSectionIndex === 1 ? 'second' : 'third'}</span> section of the conversation shortly.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-10 shadow-inner border border-slate-200">
            <p className="text-slate-500 mb-4 font-medium text-lg">Preparation Time</p>
            <div className="flex items-center justify-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Clock className="w-10 h-10 text-slate-400" />
              </div>
              <span className="text-8xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {preparationTimeLeft}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleBackNavigation}
            className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
			onClick={() => {
			  setPreparationTimeLeft(0);

			  setAudioProgress(0);
			  setAudioCurrentTime(0);
			  setHasPlayedAudio(false);
			  setIsPlaying(false);

			  setPhase("listening");
			  setAutoPlayRequested(true);
			}}

            className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderListening = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
      <div className="text-center">


        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-5 border border-slate-200/80">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xl text-slate-700">
              Listen to the conversation. You will hear it only <span className="text-orange-500 font-bold">once</span>.
            </p>
          </div>

          {/* Audio Player */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-slate-900 text-lg">Audio</span>
              <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {currentSection.questions.length} questions follow
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={togglePlayPause}
                disabled={hasPlayedAudio}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                  hasPlayedAudio 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105'
                }`}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 font-mono w-12">
                    {formatTime(Math.floor(audioCurrentTime))}
                  </span>
                  <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all rounded-full"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500 font-mono w-12">
                    {formatTime(realAudioDuration || currentSection.audioDuration || 60)}

                  </span>
                </div>
              </div>

              <button className="p-3 hover:bg-slate-100 rounded-xl transition">
                <Volume2 className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Tip */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
              <p className="text-sm text-amber-800">
                <span className="font-bold">Tip:</span> focus on keywords (numbers, dates, reasons, next steps).
              </p>
            </div>
          </div>

          {/* Transcript Toggle */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="mt-6 w-full py-4 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
          </button>

			{showTranscript && currentSection?.transcript && (
			  <div className="mt-4 bg-white rounded-xl p-4 border border-slate-200 text-left text-sm text-slate-700 max-h-32 overflow-y-auto leading-relaxed whitespace-pre-line">
				{currentSection.transcript}
			  </div>
			)}



        </div>

        <p className="text-sm text-slate-400 mb-6">
          In the real test, the audio plays once and no transcript is available.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleBackNavigation}
            className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
			  onClick={() => {
				  if (audioRef.current) {
					audioRef.current.pause();
					audioRef.current.currentTime = 0;
				  }

				  setIsPlaying(false);
				  setHasPlayedAudio(true);

				  setPhase("question");
				  setAutoPlayQuestionRequested(true); // ✅ THIS makes question audio autoplay
				  setShowTranscript(false);
				}}

			  className="flex-1 py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5"
			>
			  Next
			  <ArrowRight className="w-5 h-5" />
			</button>

        </div>
      </div>

      {currentSection.audioUrl && (
        <audio
          ref={audioRef}
          src={currentSection.audioUrl}
			onTimeUpdate={() => {
			  if (!audioRef.current) return;

			  const duration = audioRef.current.duration;
			  if (!duration || !isFinite(duration)) return;

			  const progress = (audioRef.current.currentTime / duration) * 100;
			  setAudioProgress(progress);
			  setAudioCurrentTime(audioRef.current.currentTime);
			}}

          onEnded={() => {
            setIsPlaying(false);
            setHasPlayedAudio(true);
            setTimeout(() => setPhase('question'), 500);
          }}
		  
		  onLoadedMetadata={() => {
			  if (audioRef.current?.duration) {
				setRealAudioDuration(Math.floor(audioRef.current.duration));
			  }
			}}
        />
      )}
    </div>
  );

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    const absoluteIndex = getAbsoluteQuestionIndex();
    const selectedAnswer = answers[currentQuestion.id];
	
	console.log("CURRENT QUESTION:", currentQuestion);

    return (
	  <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-6xl mx-auto">

        <div className="mb-6">
          <span className="text-lg text-slate-500 font-medium">
            Question {absoluteIndex + 1} of {totalQuestions}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side */}
<div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-5 border border-slate-200/80 flex flex-col h-[460px] overflow-hidden">

  <h3 className="font-bold text-slate-900 text-xl mb-2">
    {currentSection.title}
  </h3>

  <p className="text-slate-500 mb-4">
    Answer the question based on what you heard.
  </p>

  {/* ✅ Question Audio (plays once) */}
  {currentQuestion?.audioUrl ? (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
      <p className="text-sm text-slate-600 font-medium mb-2">
        Listen to the question (plays once)
      </p>

      <audio
        ref={questionAudioRef}
        key={currentQuestion.audioUrl}
        src={currentQuestion.audioUrl}
        controls
        className="w-full"
      />
    </div>
  ) : (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-slate-500 text-sm">
      No question audio found in database.
    </div>
  )}

  {/* ✅ Transcript Button JUST under the player */}
  <button
    onClick={() => setShowTranscript(!showTranscript)}
    className="mt-4 w-full py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition"
  >
    {showTranscript ? "Hide Transcript" : "Show Transcript"}
  </button>

  {/* ✅ Transcript Box (scroll inside, same fixed page size always) */}
  {showTranscript && (
    <div className="mt-3 bg-white rounded-xl p-4 border border-slate-200 text-left text-sm text-slate-700 overflow-y-auto leading-relaxed whitespace-pre-line flex-1">
      {questionTranscriptText?.trim()
        ? questionTranscriptText
        : "No question transcript found in database."}
    </div>
  )}

  {/* ✅ Tip always stays at bottom */}
  {currentQuestion.tip && (
    <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
      <p className="text-sm text-amber-800">
        <span className="font-bold">Tip:</span> {currentQuestion.tip}
      </p>
    </div>
  )}
</div>




          {/* Right Side - Answers */}
		  <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-5 border border-slate-200/80 flex flex-col h-[460px] overflow-hidden">

		  


            <h3 className="font-bold text-slate-900 text-xl mb-2">Choose the best answer</h3>
            <p className="text-slate-500 mb-6">
              Select one option. You can change your answer before moving on.
            </p>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">

{currentQuestion.options.map((option) => (
  <button
    key={option.id}
    type="button"
    onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
    className={`w-full text-left rounded-xl border transition-all p-3 flex items-center gap-4
      ${
        answers[currentQuestion.id] === option.id
          ? "border-indigo-500 bg-indigo-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
  >
				  <div
					className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0
					  ${
						answers[currentQuestion.id] === option.id
						  ? "border-indigo-500 bg-indigo-500"
						  : "border-slate-300"
					  }`}
				  >
					{answers[currentQuestion.id] === option.id && (
					  <div className="w-2.5 h-2.5 rounded-full bg-white" />
					)}
				  </div>

				  <p className="text-slate-800 text-sm leading-relaxed font-medium">
					{option.text}
				  </p>
				</button>

              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-400 text-center mt-8">
          In the real test, the audio plays once and no transcript is available.
        </p>

        <div className="flex gap-4 mt-6">
			<button
			  onClick={handleBackNavigation}
			  className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
			>
			  <ArrowLeft className="w-5 h-5" />
			  Back
			</button>

			<button
			  onClick={handleNext}
			  className="flex-1 py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5"
			>
			  Next
			  <ArrowRight className="w-5 h-5" />
			</button>

        </div>
      </div>
    );
  };

const renderAnswerKey = () => {
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Answer Key</h2>
            <p className="text-slate-500 text-sm">Questions & Answers</p>
          </div>
        </div>

        <button
          onClick={() => setPhase("results")}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
        >
          Back to Results
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Q#</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Option A</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Option B</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Option C</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Option D</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Correct</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Your Answer</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Result</th>
            </tr>
          </thead>

          <tbody>
            {allQuestions.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;

              const getText = (optId: string) =>
                q.options?.find((o) => o.id === optId)?.text || "-";

              const highlightIfCorrect = (optId: string) =>
                q.correctAnswer === optId ? "bg-green-50 text-green-700 font-semibold" : "";

              return (
                <tr key={q.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-700 font-medium">{idx + 1}</td>

                  <td className={`px-4 py-3 ${highlightIfCorrect("a")}`}>{getText("a")}</td>
                  <td className={`px-4 py-3 ${highlightIfCorrect("b")}`}>{getText("b")}</td>
                  <td className={`px-4 py-3 ${highlightIfCorrect("c")}`}>{getText("c")}</td>
                  <td className={`px-4 py-3 ${highlightIfCorrect("d")}`}>{getText("d")}</td>

                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-green-100 text-green-700 font-bold">
                      {q.correctAnswer?.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {userAnswer ? userAnswer.toUpperCase() : "-"}
                  </td>

                  <td className="px-4 py-3">
                    {userAnswer ? (
                      isCorrect ? (
                        <span className="text-green-700 font-semibold">✔ Correct</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✘ Wrong</span>
                      )
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => setPhase("results")}
          className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <button
          onClick={onBack}
          className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
        >
          Back to Scenarios
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};


  const renderResults = () => {
    const correctCount = allQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
	
    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-6 shadow-xl ${
            percentage >= 70 ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-green-500/25' : 
            percentage >= 50 ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25' : 
            'bg-gradient-to-br from-red-400 to-rose-500 shadow-red-500/25'
          }`}>
            {percentage >= 70 ? (
              <CheckCircle className="w-12 h-12 text-white" />
            ) : (
              <AlertCircle className="w-12 h-12 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Test Complete!</h2>
          <p className="text-slate-500 text-lg">{scenario.taskName} - {scenario.title?.replace(/_/g, ' ')}</p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-8 mb-8 border border-slate-200/80">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-sm text-slate-500 mb-2 font-medium">Score</p>
              <p className="text-5xl font-bold text-slate-900">{correctCount}<span className="text-2xl text-slate-400">/{totalQuestions}</span></p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-2 font-medium">Accuracy</p>
              <p className={`text-5xl font-bold ${
                percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-600'
              }`}>{percentage}%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-2 font-medium">Time Spent</p>
              <p className="text-5xl font-bold text-slate-900">
                {formatTime(Math.floor((Date.now() - testStartTime) / 1000))}
              </p>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="mb-8">
          <h3 className="font-bold text-slate-900 text-lg mb-4">Question Review</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {allQuestions.map((q, idx) => {
              const isCorrect = answers[q.id] === q.correctAnswer;
              const userAnswer = q.options.find(o => o.id === answers[q.id]);
              const correctAnswer = q.options.find(o => o.id === q.correctAnswer);
              
              return (
                <div 
                  key={q.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isCorrect ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <X className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 text-sm mb-1">
                        Q{idx + 1}: {q.questionText}
                      </p>
                      <p className="text-sm text-slate-600">
                        Your answer: <span className={`font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {userAnswer?.text || 'Not answered'}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-green-600 font-medium">
                          Correct: {correctAnswer?.text}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={resetTest}
            className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
          >
            Back to Scenarios
            <ArrowRight className="w-5 h-5" />
          </button>
		  
		  <button
	  onClick={() => setPhase("answerKey")}
	  className="px-6 py-3 rounded-xl bg-white border border-slate-200 font-semibold"
		>
		  Answer Key
		</button>

		<button
		  onClick={() => {
			// ✅ now we exit only when user clicks Finish
			if (testResults) onComplete(testResults);
			else onBack();
		  }}
		  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
		>
		  Finish
		</button>


        </div>
      </div>
    );
  };

  // ============== MAIN RENDER ==============

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition"
              >
                <ArrowLeft className="w-5 h-5" />
                Exit
              </button>
              <span className="font-bold text-slate-900 text-lg">
                Listening • {scenario.taskName || 'Problem Solving'}
              </span>
              
              {/* Progress Bar */}
              {(phase === 'question' || phase === 'listening' || phase === 'preparation') && (
                <div className="hidden md:flex items-center gap-3 flex-1 max-w-sm">
                  <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-500 font-medium">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-full font-medium">
                {phase === 'instructions' || phase === 'context' ? 'Introduction' : 
                 phase === 'preparation' ? 'Preparation' :
                 phase === 'listening' ? 'Listening' : 
                 phase === 'question' ? 'Question' : 'Results'}
              </span>
              
              {/* Timer */}
              {(phase === 'question' || phase === 'listening') && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-200">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-mono font-bold text-blue-600 text-lg">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
	  <main className="max-w-6xl mx-auto px-6 py-6">

        {phase === 'instructions' && renderInstructions()}
        {phase === 'context' && renderContext()}
        {phase === 'preparation' && renderPreparation()}
        {phase === 'listening' && renderListening()}
        {phase === 'question' && renderQuestion()}
        {phase === 'results' && renderResults()}
		{phase === "answerKey" && renderAnswerKey()}

      </main>
    </div>
  );
};

export default ListeningPracticeTest;
