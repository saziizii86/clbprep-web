// src/pages/Mock/Final_Score_MockTest.tsx
// Final Mock Test Results — All 4 Skills Combined
// Shows overall score and detailed feedback breakdown for Listening, Reading, Writing, and Speaking
// Independent practice tool — not affiliated with any official testing organization.

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  Trophy,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Target,
  ArrowLeft,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  FileText,
} from "lucide-react";
import { loadAllPartsFromDB, loadAllSpeakingTasksFromDB } from "../../services/mockTestAnswersService";
import { getAPISettings } from "../../services/settingsService";

// ─── Types ───────────────────────────────────────────────────────────────────

type SkillScore = {
  score: number;
  percentage?: number;
  correct?: number;
  total?: number;
  evaluated: boolean;
  error?: string;
};

type WritingTaskEval = {
  score: number;
  breakdown?: {
    contentCoherence?: number;
    vocabulary?: number;
    readability?: number;
    taskFulfillment?: number;
  };
  strengths?: string[];
  improvements?: string[];
  detailedFeedback?: string;
};

type SpeakingTaskEval = {
  score: number;
  strengths?: string[];
  improvements?: string[];
  detailedFeedback?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeMockSet(v: any): string {
  const s = String(v ?? "").trim();
  const m = s.match(/\d+/);
  return m ? m[0] : s.toLowerCase();
}

function safeNumber(n: any, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function calculateCelpipScore(correctCount: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0; // 0 = "M"
  const percentage = (correctCount / totalQuestions) * 100;
  if (percentage >= 97) return 12;
  if (percentage >= 93) return 11;
  if (percentage >= 88) return 10;
  if (percentage >= 82) return 9;
  if (percentage >= 75) return 8;
  if (percentage >= 67) return 7;
  if (percentage >= 58) return 6;
  if (percentage >= 48) return 5;
  if (percentage >= 38) return 4;
  if (percentage >= 20) return 3;
  return 0; // Below 20% → "M"
}

function getCelpipLevelDescription(score: number): string {
  if (score >= 12) return "Expert Proficiency";
  if (score >= 11) return "Advanced Proficiency";
  if (score >= 10) return "High Advanced";
  if (score >= 9) return "High Intermediate";
  if (score >= 8) return "Upper Intermediate";
  if (score >= 7) return "Intermediate";
  if (score >= 6) return "Low Intermediate";
  if (score >= 5) return "Basic Proficiency";
  if (score >= 4) return "Developing Proficiency";
  if (score === 0) return "Below Minimum";
  return "Initial Proficiency";
}

function scoreColor(score: number) {
  if (score >= 10) return "text-emerald-600";
  if (score >= 8) return "text-blue-600";
  if (score >= 6) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number) {
  if (score >= 10) return "bg-emerald-50 border-emerald-200";
  if (score >= 8) return "bg-blue-50 border-blue-200";
  if (score >= 6) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function scoreGradient(score: number) {
  if (score >= 10) return "from-emerald-500 to-green-600";
  if (score >= 8) return "from-blue-500 to-sky-600";
  if (score >= 6) return "from-amber-500 to-orange-600";
  return "from-red-500 to-rose-600";
}

// Listening/Reading feedback based on score
function getListeningFeedback(score: number, percentage: number) {
  if (score >= 10) {
    return {
      strengths: [
        "Excellent comprehension of complex spoken English",
        "Strong ability to identify main ideas and supporting details",
        "Accurately interprets speaker intent and tone",
        "Effective at following multi-speaker conversations"
      ],
      improvements: [
        "Continue challenging yourself with academic lectures",
        "Practice with various English accents",
        "Try faster playback speeds for advanced practice"
      ],
      tips: "You're performing at an advanced level. To maintain this, expose yourself to diverse audio content like podcasts, news, and academic talks."
    };
  } else if (score >= 8) {
    return {
      strengths: [
        "Good understanding of everyday conversations",
        "Can follow most audio content at normal speed",
        "Identifies key information effectively"
      ],
      improvements: [
        "Work on catching subtle details in rapid speech",
        "Practice with more complex vocabulary",
        "Focus on understanding implied meanings",
        "Improve note-taking strategies during listening"
      ],
      tips: "You have solid listening skills. Focus on academic and professional content to reach the next level."
    };
  } else if (score >= 6) {
    return {
      strengths: [
        "Can understand basic conversations",
        "Grasps main ideas in clear speech",
        "Shows foundational listening comprehension"
      ],
      improvements: [
        "Practice active listening daily with English media",
        "Focus on common vocabulary and phrases",
        "Work on understanding connected speech",
        "Use subtitles initially, then gradually remove them",
        "Practice predicting what speakers will say next"
      ],
      tips: "Build your listening stamina by starting with 10-15 minute sessions and gradually increasing duration."
    };
  } else {
    return {
      strengths: [
        "Shows effort in attempting listening tasks",
        "Can recognize some familiar words and phrases"
      ],
      improvements: [
        "Start with slow, clear audio content",
        "Listen to the same content multiple times",
        "Build basic vocabulary through listening",
        "Practice with transcripts available",
        "Focus on high-frequency words first",
        "Use language learning apps with audio components"
      ],
      tips: "Don't be discouraged! Daily practice with beginner-friendly content will help you improve steadily."
    };
  }
}

function getReadingFeedback(score: number, percentage: number) {
  if (score >= 10) {
    return {
      strengths: [
        "Excellent reading comprehension across text types",
        "Strong vocabulary and contextual understanding",
        "Efficiently identifies main ideas and details",
        "Can infer meaning from complex passages"
      ],
      improvements: [
        "Challenge yourself with academic journals",
        "Practice speed reading techniques",
        "Explore diverse genres and writing styles"
      ],
      tips: "Your reading skills are advanced. Maintain them by reading challenging materials daily."
    };
  } else if (score >= 8) {
    return {
      strengths: [
        "Good comprehension of most text types",
        "Can identify main ideas effectively",
        "Understands most vocabulary in context"
      ],
      improvements: [
        "Expand vocabulary through active reading",
        "Practice skimming and scanning techniques",
        "Work on understanding text organization",
        "Improve time management for longer passages"
      ],
      tips: "Read varied content daily - news articles, essays, and reports will help strengthen your skills."
    };
  } else if (score >= 6) {
    return {
      strengths: [
        "Can understand basic written English",
        "Identifies some main ideas correctly",
        "Shows developing comprehension skills"
      ],
      improvements: [
        "Read for 20-30 minutes daily",
        "Keep a vocabulary notebook",
        "Practice identifying topic sentences",
        "Work on understanding text structure",
        "Use context clues for unknown words",
        "Read passages multiple times for deeper understanding"
      ],
      tips: "Start with graded readers at your level and gradually increase difficulty."
    };
  } else {
    return {
      strengths: [
        "Attempting to engage with English texts",
        "Can recognize basic vocabulary"
      ],
      improvements: [
        "Start with simple, short texts",
        "Build foundational vocabulary daily",
        "Practice phonics and word recognition",
        "Read the same text multiple times",
        "Use a dictionary actively while reading",
        "Try reading aloud to improve comprehension"
      ],
      tips: "Focus on building vocabulary first. Use flashcards and apps to learn 5-10 new words daily."
    };
  }
}

// Writing feedback based on score (fallback when no AI eval available)
function getWritingFeedback(score: number) {
  if (score >= 10) {
    return {
      strengths: [
        "Excellent command of written English",
        "Well-organized and coherent responses",
        "Sophisticated vocabulary usage",
        "Strong grammar and sentence variety"
      ],
      improvements: [
        "Experiment with more complex sentence structures",
        "Refine your personal writing style",
        "Practice writing under timed conditions"
      ],
      tips: "Your writing is at an advanced level. Focus on polishing your unique voice and maintaining consistency under pressure."
    };
  } else if (score >= 8) {
    return {
      strengths: [
        "Good organization and logical flow",
        "Appropriate vocabulary for the task",
        "Generally accurate grammar",
        "Addresses task requirements well"
      ],
      improvements: [
        "Expand your range of vocabulary",
        "Work on more complex sentence structures",
        "Strengthen your introductions and conclusions",
        "Practice proofreading for minor errors"
      ],
      tips: "You have solid writing skills. Focus on adding variety to your sentences and expanding vocabulary to reach higher levels."
    };
  } else if (score >= 6) {
    return {
      strengths: [
        "Can communicate basic ideas in writing",
        "Shows understanding of task requirements",
        "Developing paragraph structure"
      ],
      improvements: [
        "Practice writing complete paragraphs with topic sentences",
        "Learn common collocations and phrases",
        "Focus on subject-verb agreement",
        "Work on connecting ideas with transitions",
        "Review punctuation rules",
        "Practice timed writing exercises"
      ],
      tips: "Write something every day, even if it's just a few sentences. Focus on clarity before complexity."
    };
  } else {
    return {
      strengths: [
        "Attempting to express ideas in writing",
        "Shows effort in completing writing tasks"
      ],
      improvements: [
        "Start with simple sentence patterns",
        "Build basic vocabulary for common topics",
        "Practice copying and adapting model sentences",
        "Learn basic punctuation and capitalization",
        "Focus on one paragraph at a time",
        "Use writing templates to structure responses"
      ],
      tips: "Don't worry about perfection. Start with simple sentences and gradually build up. Daily practice with basic writing will help tremendously."
    };
  }
}

// Speaking feedback based on score (fallback when no AI eval or no transcripts)
function getSpeakingFeedback(score: number, hasTranscripts: boolean) {
  if (!hasTranscripts) {
    return {
      strengths: [
        "Taking the initiative to practice speaking"
      ],
      improvements: [
        "Complete all 8 speaking tasks to get a full evaluation",
        "Practice speaking English daily, even for a few minutes",
        "Record yourself and listen back to identify areas to improve",
        "Try shadowing exercises with English audio",
        "Practice with language exchange partners or apps"
      ],
      tips: "Speaking practice is essential! Try to speak English every day, even if it's just talking to yourself or describing your surroundings."
    };
  }
  
  if (score >= 10) {
    return {
      strengths: [
        "Excellent fluency and natural speech patterns",
        "Wide range of vocabulary used appropriately",
        "Clear pronunciation and intonation",
        "Well-organized and coherent responses"
      ],
      improvements: [
        "Continue exposure to various English accents",
        "Practice discussing complex or abstract topics",
        "Refine nuances in tone and emphasis"
      ],
      tips: "Your speaking is at an advanced level. Maintain it by engaging in discussions on diverse topics and listening to varied English content."
    };
  } else if (score >= 8) {
    return {
      strengths: [
        "Good fluency with minor hesitations",
        "Appropriate vocabulary for most situations",
        "Generally clear pronunciation",
        "Logical organization of ideas"
      ],
      improvements: [
        "Work on reducing filler words (um, uh, like)",
        "Expand vocabulary for specific topics",
        "Practice stress and intonation patterns",
        "Develop more detailed responses"
      ],
      tips: "Record yourself regularly and compare with native speakers. Focus on smooth transitions between ideas."
    };
  } else if (score >= 6) {
    return {
      strengths: [
        "Can communicate basic ideas verbally",
        "Shows developing fluency",
        "Attempts to organize responses"
      ],
      improvements: [
        "Practice speaking for longer periods without stopping",
        "Learn common phrases and expressions",
        "Work on pronunciation of difficult sounds",
        "Use preparation time effectively",
        "Practice describing pictures and situations",
        "Record and review your speaking regularly"
      ],
      tips: "Speak English as much as possible, even if you make mistakes. Fluency comes from practice!"
    };
  } else {
    return {
      strengths: [
        "Making an effort to speak in English",
        "Attempting to complete speaking tasks"
      ],
      improvements: [
        "Start with simple, memorized phrases",
        "Practice pronunciation with audio guides",
        "Build confidence with basic conversations",
        "Listen to English daily to improve comprehension",
        "Practice with language learning apps",
        "Focus on high-frequency vocabulary first"
      ],
      tips: "Start small - practice introducing yourself, describing your day, or talking about familiar topics. Every bit of practice helps!"
    };
  }
}

// System prompts for AI evaluation
const WRITING_SYSTEM_PROMPT = `You are a CELPIP Writing examiner. Evaluate TWO tasks (Task 1 and Task 2) based on CELPIP writing criteria (0-12 scale).

CELPIP Writing Scoring Criteria (0-12 each):
- Content/Coherence (organization, clarity, coherence)
- Vocabulary (range, accuracy, appropriateness)
- Readability (grammar, sentence structure, mechanics)
- Task Fulfillment (meets requirements, follows instructions, word count)

Return STRICT JSON only (no extra text). Use this format:
{
  "overallScore": <number 0-12>,
  "task1": {
    "score": <number 0-12>,
    "breakdown": {
      "contentCoherence": <number 0-12>,
      "vocabulary": <number 0-12>,
      "readability": <number 0-12>,
      "taskFulfillment": <number 0-12>
    },
    "strengths": ["...", "...", "..."],
    "improvements": ["...", "...", "..."],
    "detailedFeedback": "2-3 sentences of specific, actionable feedback"
  },
  "task2": {
    "score": <number 0-12>,
    "breakdown": {
      "contentCoherence": <number 0-12>,
      "vocabulary": <number 0-12>,
      "readability": <number 0-12>,
      "taskFulfillment": <number 0-12>
    },
    "strengths": ["...", "...", "..."],
    "improvements": ["...", "...", "..."],
    "detailedFeedback": "2-3 sentences of specific, actionable feedback"
  }
}`;

const SPEAKING_SYSTEM_PROMPT = `You are a CELPIP Speaking examiner. Evaluate 8 speaking tasks based on TRANSCRIPTS ONLY (no audio). Use a 0-12 scale.

Criteria (transcript-based):
- Content/Coherence (organization, relevance, clarity)
- Vocabulary (range, accuracy, appropriateness)
- Grammar/Readability (sentence structure, accuracy)
- Task Fulfillment (addresses prompt, complete response)

Return STRICT JSON only (no extra text).
{
  "overallScore": <number 0-12>,
  "overallStrengths": ["...", "...", "..."],
  "overallImprovements": ["...", "...", "..."],
  "overallFeedback": "2-3 sentences summarizing performance",
  "task1": {"score":<0-12>, "strengths":["..."], "improvements":["..."], "detailedFeedback":"specific feedback"},
  "task2": {"score":<0-12>, "strengths":["..."], "improvements":["..."], "detailedFeedback":"specific feedback"},
  "task3": {"score":<0-12>, "strengths":["..."], "improvements":["..."], "detailedFeedback":"specific feedback"},
  "task4": {"score":<0-12>, "strengths":["..."], "improvements":["..."], "detailedFeedback":"specific feedback"},
  "task5": {"score":<0-12>, "strengths":["..."], "improvements":["..."], "detailedFeedback":"specific feedback"},
  "task6": {"score":<0-12>, "strengths":["..."], "improvements":["..."], "detailedFeedback":"specific feedback"},
  "task7": {"score":<0-12>, "strengths":["..."], "improvements":["..."], "detailedFeedback":"specific feedback"},
  "task8": {"score":<0-12>, "strengths":["..."], "improvements":["..."], "detailedFeedback":"specific feedback"}
}`;

// ─── Frame Component ─────────────────────────────────────────────────────────

function PracticeFrame({
  headerTitle,
  rightStatus,
  onBack,
  children,
}: {
  headerTitle: string;
  rightStatus?: React.ReactNode;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="mx-auto w-[min(1200px,95vw)] bg-white border border-gray-300 shadow-sm">
        <div className="h-12 px-4 flex items-center justify-between bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 border-b border-purple-700">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-300" />
            <div className="text-sm font-semibold text-white">{headerTitle}</div>
          </div>
          <div className="flex items-center gap-3">{rightStatus}</div>
        </div>
        <div className="min-h-[620px]">{children}</div>
        <div className="h-11 px-4 flex items-center justify-between bg-slate-100 border-t border-slate-300">
          <span className="text-[10px] text-slate-500">
            Independent Practice Tool • Not affiliated with any official testing organization
          </span>
          {onBack ? (
            <button
              onClick={onBack}
              className="h-7 px-4 text-xs font-semibold rounded bg-slate-600 text-white hover:bg-slate-700 inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-3 h-3" />
              BACK
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Feedback Section Component ──────────────────────────────────────────────

function FeedbackSection({ 
  strengths, 
  improvements, 
  tips 
}: { 
  strengths: string[]; 
  improvements: string[]; 
  tips?: string;
}) {
  return (
    <div className="space-y-4">
      {/* Strengths */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-emerald-900">Strengths</span>
        </div>
        <ul className="space-y-2">
          {strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
              <span className="text-emerald-500 mt-1">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Areas for Improvement */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-amber-600" />
          <span className="font-semibold text-amber-900">Areas for Improvement</span>
        </div>
        <ul className="space-y-2">
          {improvements.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
              <span className="text-amber-500 mt-1">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tips */}
      {tips && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Pro Tip</span>
          </div>
          <p className="text-sm text-blue-800">{tips}</p>
        </div>
      )}
    </div>
  );
}

// ─── Skill Card Component ────────────────────────────────────────────────────

function SkillCard({
  skill,
  icon: Icon,
  score,
  evaluated,
  percentage,
  correct,
  total,
  error,
  color,
  expanded,
  onToggle,
  children,
}: {
  skill: string;
  icon: React.ElementType;
  score: number;
  evaluated: boolean;
  percentage?: number;
  correct?: number;
  total?: number;
  error?: string;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const colorClasses: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", iconBg: "bg-purple-100" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", iconBg: "bg-blue-100" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", iconBg: "bg-green-100" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", iconBg: "bg-orange-100" },
  };

  const c = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`rounded-2xl border-2 ${c.border} ${c.bg} overflow-hidden transition-all duration-300`}>
      <div
        className="p-5 cursor-pointer hover:bg-white/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${c.text}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{skill}</h3>
              <div className="text-sm text-gray-500">
                {evaluated ? (
                  percentage !== undefined ? (
                    <span>{correct}/{total} correct ({percentage}%)</span>
                  ) : (
                    <span>AI evaluated</span>
                  )
                ) : (
                  <span className="text-amber-600">Not evaluated</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
<div className={`text-4xl font-bold ${evaluated ? scoreColor(score) : "text-gray-300"}`}>
  {evaluated ? (score < 3 ? "M" : Math.round(score)) : "M"}
</div>
<div className="text-xs text-gray-500">/12</div>
            </div>
            <button className="p-2 hover:bg-white rounded-lg transition-colors">
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}
      </div>

      {expanded && children && (
        <div className="px-5 pb-5 border-t border-gray-200 bg-white/60">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Final_Score_MockTest({
  onBack,
  mockSet: propMockSet,
}: {
  onBack?: () => void;
  mockSet?: number | string;
} = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const setKey = propMockSet || (params as any).setKey || (location.state as any)?.mockSet || localStorage.getItem("activeMockSet") || "1";
  const setNumber = Number(normalizeMockSet(setKey) || "1") || 1;

  // Loading states
  const [loading, setLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluatingSkill, setEvaluatingSkill] = useState<string | null>(null);

  // API settings
  const [apiConnected, setApiConnected] = useState(false);
  const [openAIKey, setOpenAIKey] = useState("");

  // Scores for each skill
  const [listeningScore, setListeningScore] = useState<SkillScore>({ score: 0, evaluated: false });
  const [readingScore, setReadingScore] = useState<SkillScore>({ score: 0, evaluated: false });
  const [writingScore, setWritingScore] = useState<SkillScore>({ score: 0, evaluated: false });
  const [speakingScore, setSpeakingScore] = useState<SkillScore>({ score: 0, evaluated: false });

  // Detailed evaluations
  const [writingEval, setWritingEval] = useState<any>(null);
  const [speakingEval, setSpeakingEval] = useState<any>(null);

  // Raw data for writing/speaking
  const [writingData, setWritingData] = useState<{
    t1Prompt: string;
    t1Response: string;
    t2Prompt: string;
    t2Response: string;
    t2Option: "A" | "B" | null;
  }>({ t1Prompt: "", t1Response: "", t2Prompt: "", t2Response: "", t2Option: null });

  const [speakingData, setSpeakingData] = useState<{
    prompts: string[];
    transcripts: string[];
  }>({ prompts: Array(8).fill(""), transcripts: Array(8).fill("") });

  // Expanded sections
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  // ─── Calculate Overall Score ───────────────────────────────────────────────

  const overallScore = useMemo(() => {
    const scores = [
      listeningScore.evaluated ? listeningScore.score : null,
      readingScore.evaluated ? readingScore.score : null,
      writingScore.evaluated ? writingScore.score : null,
      speakingScore.evaluated ? speakingScore.score : null,
    ].filter((s) => s !== null) as number[];

    if (scores.length === 0) return 0;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg);
  }, [listeningScore, readingScore, writingScore, speakingScore]);

  const evaluatedCount = useMemo(() => {
    return [
      listeningScore.evaluated,
      readingScore.evaluated,
      writingScore.evaluated,
      speakingScore.evaluated,
    ].filter(Boolean).length;
  }, [listeningScore, readingScore, writingScore, speakingScore]);

  // ─── Load Data ─────────────────────────────────────────────────────────────

  const loadAllData = useCallback(async () => {
    setLoading(true);

    try {
      const settings = await getAPISettings();
      if (settings?.openAIKey && settings?.isConnected) {
        setOpenAIKey(settings.openAIKey);
        setApiConnected(true);
      }
    } catch (e) {
      console.warn("Failed to load API settings:", e);
    }

    // Load Listening scores
    try {
      const listeningRows = await loadAllPartsFromDB("listening", setNumber);
      if (listeningRows.length > 0) {
        let correct = 0;
        let total = 0;
        for (const row of listeningRows) {
          const userAnswers = row.userAnswers || {};
          const correctAnswers = row.correctAnswers || {};
          for (const key of Object.keys(correctAnswers)) {
            total++;
            if (String(userAnswers[key]).toUpperCase() === String(correctAnswers[key]).toUpperCase()) {
              correct++;
            }
          }
        }
        if (total > 0) {
          const percentage = Math.round((correct / total) * 100);
          const score = calculateCelpipScore(correct, total);
          setListeningScore({ score, percentage, correct, total, evaluated: true });
        }
      } else {
        const storedScore = localStorage.getItem(`mockListening_score_set${setNumber}`);
        if (storedScore) {
          setListeningScore({ score: Number(storedScore), evaluated: true, percentage: 0, correct: 0, total: 38 });
        }
      }
    } catch (e) {
      console.warn("Failed to load listening data:", e);
    }

    // Load Reading scores
    try {
      const readingRows = await loadAllPartsFromDB("reading", setNumber);
      if (readingRows.length > 0) {
        let correct = 0;
        let total = 0;
        for (const row of readingRows) {
          const userAnswers = row.userAnswers || {};
          const correctAnswers = row.correctAnswers || {};
          for (const key of Object.keys(correctAnswers)) {
            total++;
            if (String(userAnswers[key]).toUpperCase() === String(correctAnswers[key]).toUpperCase()) {
              correct++;
            }
          }
        }
        if (total > 0) {
          const percentage = Math.round((correct / total) * 100);
          const score = calculateCelpipScore(correct, total);
          setReadingScore({ score, percentage, correct, total, evaluated: true });
        }
      } else {
        const storedScore = localStorage.getItem(`mockReading_score_set${setNumber}`);
        if (storedScore) {
          setReadingScore({ score: Number(storedScore), evaluated: true, percentage: 0, correct: 0, total: 38 });
        }
      }
    } catch (e) {
      console.warn("Failed to load reading data:", e);
    }

    // Load Writing data
    try {
      const t1Prompt = localStorage.getItem(`mockWriting_T1_prompt_set${setNumber}`) || "";
      const t1Response = localStorage.getItem(`mockWriting_T1_response_set${setNumber}`) || "";
      const t2Prompt = localStorage.getItem(`mockWriting_T2_prompt_set${setNumber}`) || "";
      const t2Response = localStorage.getItem(`mockWriting_T2_response_set${setNumber}`) || "";
      const t2Option = localStorage.getItem(`mockWriting_T2_option_set${setNumber}`) as "A" | "B" | null;
      setWritingData({ t1Prompt, t1Response, t2Prompt, t2Response, t2Option });

      const evalDone = localStorage.getItem(`mockWriting_eval_done_set${setNumber}`);
      const storedScore = localStorage.getItem(`mockWriting_score_set${setNumber}`);
      const storedEval = localStorage.getItem(`mockWriting_eval_data_set${setNumber}`);
      
      if (evalDone === "true" && storedScore) {
        setWritingScore({ score: Number(storedScore), evaluated: true });
        // Load the full evaluation data if available
        if (storedEval) {
          try {
            const parsedEval = JSON.parse(storedEval);
            setWritingEval(parsedEval);
          } catch (e) {
            console.warn("Failed to parse stored writing eval:", e);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load writing data:", e);
    }

    // Load Speaking data
    try {
      const rows = await loadAllSpeakingTasksFromDB(setNumber);
      const prompts = Array(8).fill("");
      const transcripts = Array(8).fill("");

      for (const r of rows) {
        const idx = (Number(r.taskNumber) || 1) - 1;
        if (idx >= 0 && idx < 8) {
          if (r.prompt) prompts[idx] = r.prompt;
          if (r.transcript) transcripts[idx] = r.transcript;
        }
      }
      setSpeakingData({ prompts, transcripts });

      const evalDone = localStorage.getItem(`mockSpeaking_eval_done_set${setNumber}`);
      const storedScore = localStorage.getItem(`mockSpeaking_score_set${setNumber}`);
      const storedEval = localStorage.getItem(`mockSpeaking_eval_data_set${setNumber}`);
      
      if (evalDone === "true" && storedScore) {
        setSpeakingScore({ score: Number(storedScore), evaluated: true });
        // Load the full evaluation data if available
        if (storedEval) {
          try {
            const parsedEval = JSON.parse(storedEval);
            setSpeakingEval(parsedEval);
          } catch (e) {
            console.warn("Failed to parse stored speaking eval:", e);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load speaking data:", e);
      const prompts = Array.from({ length: 8 }, (_, i) =>
        localStorage.getItem(`mockSpeaking_T${i + 1}_prompt_set${setNumber}`) || ""
      );
      const transcripts = Array.from({ length: 8 }, (_, i) =>
        localStorage.getItem(`mockSpeaking_T${i + 1}_transcript_set${setNumber}`) || ""
      );
      setSpeakingData({ prompts, transcripts });
    }

    setLoading(false);
  }, [setNumber]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ─── Evaluate Writing ──────────────────────────────────────────────────────

  const evaluateWriting = async () => {
    if (!apiConnected || !openAIKey) {
      setWritingScore((prev) => ({
        ...prev,
        error: "OpenAI API is not connected. Please connect it in Admin (API Settings).",
      }));
      return;
    }

    const { t1Prompt, t1Response, t2Prompt, t2Response, t2Option } = writingData;
    if (!t1Response.trim() && !t2Response.trim()) {
      setWritingScore((prev) => ({
        ...prev,
        error: "No writing responses found. Please complete the writing tasks first.",
      }));
      return;
    }

    setEvaluatingSkill("writing");

    try {
      const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
      const w1 = countWords(t1Response);
      const w2 = countWords(t2Response);

      const userPrompt = `Evaluate Task 1 and Task 2 separately, then compute an overall score.

Writing Task 1 Prompt:
${t1Prompt}

Task 1 Student Response (${w1} words):
${t1Response}

---

Writing Task 2 Prompt:
${t2Prompt}

Task 2 Student Response (${w2} words):
${t2Response}

${t2Option ? `\nNote: This is a survey-style question where the student chose to support Option ${t2Option}.` : ""}

Return the STRICT JSON format described in the system prompt.`;

      const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: WRITING_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!apiResponse.ok) {
        const err = await apiResponse.json().catch(() => null);
        throw new Error(err?.error?.message || "OpenAI request failed");
      }

      const data = await apiResponse.json();
      const content = data?.choices?.[0]?.message?.content || "";
      const jsonMatch = String(content).match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse evaluation JSON");
      const parsed = JSON.parse(jsonMatch[0]);

      const score = clamp(safeNumber(parsed?.overallScore, 0), 0, 12);
      setWritingEval(parsed);
      setWritingScore({ score, evaluated: true });
      localStorage.setItem(`mockWriting_eval_done_set${setNumber}`, "true");
      localStorage.setItem(`mockWriting_score_set${setNumber}`, String(score));
      // Save full evaluation data for later retrieval
      localStorage.setItem(`mockWriting_eval_data_set${setNumber}`, JSON.stringify(parsed));
    } catch (e: any) {
      setWritingScore((prev) => ({
        ...prev,
        error: e?.message || "Failed to evaluate writing",
      }));
    } finally {
      setEvaluatingSkill(null);
    }
  };

  // ─── Evaluate Speaking ─────────────────────────────────────────────────────

  const evaluateSpeaking = async () => {
    if (!apiConnected || !openAIKey) {
      setSpeakingScore((prev) => ({
        ...prev,
        error: "OpenAI API is not connected. Please connect it in Admin (API Settings).",
      }));
      return;
    }

    const { prompts, transcripts } = speakingData;
    const hasTranscripts = transcripts.some((t) => t.trim().length > 0);
    if (!hasTranscripts) {
      setSpeakingScore((prev) => ({
        ...prev,
        error: "No transcripts found. Please complete the speaking tasks first.",
      }));
      return;
    }

    setEvaluatingSkill("speaking");

    try {
      let userPrompt = "Evaluate 8 speaking tasks based on transcript only.\n\n";
      for (let i = 0; i < 8; i++) {
        userPrompt += `Task ${i + 1} Prompt:\n${prompts[i] || "No prompt available"}\nTask ${i + 1} Transcript:\n${transcripts[i] || "No response recorded"}\n\n---\n\n`;
      }
      userPrompt += "Return STRICT JSON only in the exact format described in the system prompt.";

      const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SPEAKING_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 3000,
        }),
      });

      if (!apiResponse.ok) {
        const err = await apiResponse.json().catch(() => null);
        throw new Error(err?.error?.message || "OpenAI request failed");
      }

      const data = await apiResponse.json();
      const content = data?.choices?.[0]?.message?.content || "";
      const jsonMatch = String(content).match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse evaluation JSON");
      const parsed = JSON.parse(jsonMatch[0]);

      const score = clamp(safeNumber(parsed?.overallScore, 0), 0, 12);
      setSpeakingEval(parsed);
      setSpeakingScore({ score, evaluated: true });
      localStorage.setItem(`mockSpeaking_eval_done_set${setNumber}`, "true");
      localStorage.setItem(`mockSpeaking_score_set${setNumber}`, String(score));
      // Save full evaluation data for later retrieval
      localStorage.setItem(`mockSpeaking_eval_data_set${setNumber}`, JSON.stringify(parsed));
    } catch (e: any) {
      setSpeakingScore((prev) => ({
        ...prev,
        error: e?.message || "Failed to evaluate speaking",
      }));
    } finally {
      setEvaluatingSkill(null);
    }
  };

  // ─── Evaluate All ──────────────────────────────────────────────────────────

  const evaluateAll = async () => {
    setIsEvaluating(true);

    if (!writingScore.evaluated && (writingData.t1Response || writingData.t2Response)) {
      await evaluateWriting();
    }

    if (!speakingScore.evaluated && speakingData.transcripts.some((t) => t.trim())) {
      await evaluateSpeaking();
    }

    setIsEvaluating(false);
  };

  // ─── Handle Back ───────────────────────────────────────────────────────────

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };
  


  const goToMockExams = () => {
  window.location.assign("/userhome");
};

  // Get feedback for listening/reading
  const listeningFeedback = useMemo(() => 
    getListeningFeedback(listeningScore.score, listeningScore.percentage || 0), 
    [listeningScore.score, listeningScore.percentage]
  );
  
  const readingFeedback = useMemo(() => 
    getReadingFeedback(readingScore.score, readingScore.percentage || 0), 
    [readingScore.score, readingScore.percentage]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg px-8 py-6 flex items-center gap-4">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-gray-700 font-medium">Loading your results...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6">
      <PracticeFrame
        headerTitle="Final Mock Test Results"
        onBack={handleBack}
rightStatus={
  <div className="flex items-center gap-2">
    <button
      onClick={evaluateAll}
      disabled={isEvaluating || (writingScore.evaluated && speakingScore.evaluated)}
      className={`h-8 px-4 text-xs font-semibold rounded border inline-flex items-center gap-2 ${
        isEvaluating || (writingScore.evaluated && speakingScore.evaluated)
          ? "bg-purple-300 border-purple-400 text-white/80 cursor-not-allowed"
          : "bg-white border-white text-purple-700 hover:bg-purple-50"
      }`}
    >
      {isEvaluating ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Evaluating {evaluatingSkill}…
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Evaluate All
        </>
      )}
    </button>

    <button
      onClick={goToMockExams}
      className="h-8 px-4 text-xs font-semibold rounded border inline-flex items-center gap-2 bg-white border-white text-gray-700 hover:bg-gray-50"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Mock Exams
    </button>
  </div>
}


      >
        <div className="p-8 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Overall Score Card */}
            <div className={`rounded-3xl border-2 p-8 ${scoreBg(Math.round(overallScore))} shadow-lg`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${scoreGradient(Math.round(overallScore))} flex items-center justify-center shadow-lg`}>
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Overall Score</h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Based on {evaluatedCount} of 4 skills evaluated
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Award className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {getCelpipLevelDescription(Math.round(overallScore))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
<div className={`text-7xl font-bold ${scoreColor(Math.round(overallScore))}`}>
  {evaluatedCount > 0
    ? overallScore < 3
      ? "M"
      : Math.round(overallScore)
    : "M"}
</div>
                  <div className="text-sm text-gray-500 mt-1">CELPIP Scale (3-12)</div>
                </div>
              </div>

              {/* Score Scale */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-3">Score Reference:</div>
                <div className="flex items-center gap-1">
                  {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                    <div
                      key={s}
                      className={`flex-1 h-10 flex items-center justify-center text-xs font-semibold rounded-lg transition-all ${
                        Math.round(overallScore) === s
                          ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white ring-2 ring-purple-300 scale-110"
                          : s < Math.round(overallScore)
                          ? "bg-purple-100 text-purple-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {s}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1">
                  <span>Initial</span>
                  <span>Intermediate</span>
                  <span>Advanced</span>
                  <span>Expert</span>
                </div>
              </div>

              {!apiConnected && (
                <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900">AI evaluation is not connected</div>
                    <div className="text-xs text-amber-800 mt-1">
                      Go to Admin → API Settings → connect your OpenAI API key to evaluate Writing and Speaking.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Skills Breakdown */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Skills Breakdown
              </h2>

              {/* Listening */}
              <SkillCard
                skill="Listening"
                icon={Headphones}
                score={listeningScore.score}
                evaluated={listeningScore.evaluated}
                percentage={listeningScore.percentage}
                correct={listeningScore.correct}
                total={listeningScore.total}
                error={listeningScore.error}
                color="purple"
                expanded={expandedSkill === "listening"}
                onToggle={() => setExpandedSkill(expandedSkill === "listening" ? null : "listening")}
              >
                <div className="pt-4">
                  {listeningScore.evaluated ? (
                    <FeedbackSection 
                      strengths={listeningFeedback.strengths}
                      improvements={listeningFeedback.improvements}
                      tips={listeningFeedback.tips}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">Complete the listening test to see detailed feedback.</p>
                  )}
                </div>
              </SkillCard>

              {/* Reading */}
              <SkillCard
                skill="Reading"
                icon={BookOpen}
                score={readingScore.score}
                evaluated={readingScore.evaluated}
                percentage={readingScore.percentage}
                correct={readingScore.correct}
                total={readingScore.total}
                error={readingScore.error}
                color="blue"
                expanded={expandedSkill === "reading"}
                onToggle={() => setExpandedSkill(expandedSkill === "reading" ? null : "reading")}
              >
                <div className="pt-4">
                  {readingScore.evaluated ? (
                    <FeedbackSection 
                      strengths={readingFeedback.strengths}
                      improvements={readingFeedback.improvements}
                      tips={readingFeedback.tips}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">Complete the reading test to see detailed feedback.</p>
                  )}
                </div>
              </SkillCard>

              {/* Writing */}
              <SkillCard
                skill="Writing"
                icon={PenTool}
                score={writingScore.score}
                evaluated={writingScore.evaluated}
                error={writingScore.error}
                color="green"
                expanded={expandedSkill === "writing"}
                onToggle={() => setExpandedSkill(expandedSkill === "writing" ? null : "writing")}
              >
                <div className="pt-4">
                  {writingScore.evaluated && writingEval ? (
                    <div className="space-y-6">
                      {/* Task 1 */}
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-gray-900">Task 1: Email Writing</span>
                          </div>
                          <span className={`text-2xl font-bold ${scoreColor(writingEval?.task1?.score || 0)}`}>
                            {writingEval?.task1?.score || "—"}/12
                          </span>
                        </div>
                        
                        {/* Score Breakdown */}
                        {writingEval?.task1?.breakdown && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                              <div className="text-xs text-gray-500">Content</div>
                              <div className="text-lg font-semibold text-gray-900">{writingEval.task1.breakdown.contentCoherence}</div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                              <div className="text-xs text-gray-500">Vocabulary</div>
                              <div className="text-lg font-semibold text-gray-900">{writingEval.task1.breakdown.vocabulary}</div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                              <div className="text-xs text-gray-500">Readability</div>
                              <div className="text-lg font-semibold text-gray-900">{writingEval.task1.breakdown.readability}</div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                              <div className="text-xs text-gray-500">Task Fulfillment</div>
                              <div className="text-lg font-semibold text-gray-900">{writingEval.task1.breakdown.taskFulfillment}</div>
                            </div>
                          </div>
                        )}

                        <FeedbackSection 
                          strengths={writingEval?.task1?.strengths || ["Response submitted"]}
                          improvements={writingEval?.task1?.improvements || ["Continue practicing"]}
                          tips={writingEval?.task1?.detailedFeedback}
                        />
                      </div>

                      {/* Task 2 */}
                      <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-gray-900">Task 2: Survey Response</span>
                          </div>
                          <span className={`text-2xl font-bold ${scoreColor(writingEval?.task2?.score || 0)}`}>
                            {writingEval?.task2?.score || "—"}/12
                          </span>
                        </div>
                        
                        {writingEval?.task2?.breakdown && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                              <div className="text-xs text-gray-500">Content</div>
                              <div className="text-lg font-semibold text-gray-900">{writingEval.task2.breakdown.contentCoherence}</div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                              <div className="text-xs text-gray-500">Vocabulary</div>
                              <div className="text-lg font-semibold text-gray-900">{writingEval.task2.breakdown.vocabulary}</div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                              <div className="text-xs text-gray-500">Readability</div>
                              <div className="text-lg font-semibold text-gray-900">{writingEval.task2.breakdown.readability}</div>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3 text-center">
                              <div className="text-xs text-gray-500">Task Fulfillment</div>
                              <div className="text-lg font-semibold text-gray-900">{writingEval.task2.breakdown.taskFulfillment}</div>
                            </div>
                          </div>
                        )}

                        <FeedbackSection 
                          strengths={writingEval?.task2?.strengths || ["Response submitted"]}
                          improvements={writingEval?.task2?.improvements || ["Continue practicing"]}
                          tips={writingEval?.task2?.detailedFeedback}
                        />
                      </div>
                    </div>
                  ) : writingScore.evaluated ? (
                    // Score exists but no detailed AI eval - show score-based feedback
                    <FeedbackSection 
                      strengths={getWritingFeedback(writingScore.score).strengths}
                      improvements={getWritingFeedback(writingScore.score).improvements}
                      tips={getWritingFeedback(writingScore.score).tips}
                    />
                  ) : (
                    // Show score-based feedback for Writing (no detailed AI eval available)
                    <FeedbackSection 
                      strengths={getWritingFeedback(writingScore.score).strengths}
                      improvements={getWritingFeedback(writingScore.score).improvements}
                      tips={getWritingFeedback(writingScore.score).tips}
                    />
                  )}
                </div>
              </SkillCard>

              {/* Speaking */}
              <SkillCard
                skill="Speaking"
                icon={Mic}
                score={speakingScore.score}
                evaluated={speakingScore.evaluated}
                error={speakingScore.error}
                color="orange"
                expanded={expandedSkill === "speaking"}
                onToggle={() => setExpandedSkill(expandedSkill === "speaking" ? null : "speaking")}
              >
                <div className="pt-4">
                  {speakingScore.evaluated && speakingEval ? (
                    <div className="space-y-6">
                      {/* Overall Speaking Feedback */}
                      {(speakingEval.overallStrengths || speakingEval.overallImprovements) && (
                        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-5">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Award className="w-5 h-5 text-orange-600" />
                            Overall Speaking Performance
                          </h4>
                          <FeedbackSection 
                            strengths={speakingEval.overallStrengths || ["Completed all tasks"]}
                            improvements={speakingEval.overallImprovements || ["Continue practicing"]}
                            tips={speakingEval.overallFeedback}
                          />
                        </div>
                      )}

                      {/* Task Scores Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }, (_, i) => {
                          const taskEval = speakingEval?.[`task${i + 1}`];
                          return (
                            <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-500">Task {i + 1}</span>
<span className={`text-lg font-bold ${scoreColor(taskEval?.score || 0)}`}>
  {taskEval ? (taskEval.score < 3 ? "M" : Math.round(taskEval.score)) : "—"}
</span>
                              </div>
                              {taskEval?.detailedFeedback && (
                                <p className="text-xs text-gray-600 line-clamp-2">{taskEval.detailedFeedback}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Detailed Task Feedback */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900">Task-by-Task Feedback</h4>
                        {Array.from({ length: 8 }, (_, i) => {
                          const taskEval = speakingEval?.[`task${i + 1}`];
                          if (!taskEval || (!taskEval.strengths?.length && !taskEval.improvements?.length)) return null;
                          return (
                            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-900">Task {i + 1}</span>
<span className={`font-bold ${scoreColor(taskEval.score || 0)}`}>
  {taskEval.score < 3 ? "M" : `${Math.round(taskEval.score)}/12`}
</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {taskEval.strengths?.length > 0 && (
                                  <div className="rounded-lg bg-emerald-50 p-3">
                                    <div className="text-xs font-medium text-emerald-700 mb-1">Strengths</div>
                                    <ul className="text-xs text-emerald-800 space-y-1">
                                      {taskEval.strengths.slice(0, 2).map((s: string, j: number) => (
                                        <li key={j}>• {s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {taskEval.improvements?.length > 0 && (
                                  <div className="rounded-lg bg-amber-50 p-3">
                                    <div className="text-xs font-medium text-amber-700 mb-1">To Improve</div>
                                    <ul className="text-xs text-amber-800 space-y-1">
                                      {taskEval.improvements.slice(0, 2).map((s: string, j: number) => (
                                        <li key={j}>• {s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    // Show score-based feedback for Speaking (even if no transcripts or no AI eval)
                    <FeedbackSection 
                      strengths={getSpeakingFeedback(speakingScore.score, speakingData.transcripts.some(t => t.trim())).strengths}
                      improvements={getSpeakingFeedback(speakingScore.score, speakingData.transcripts.some(t => t.trim())).improvements}
                      tips={getSpeakingFeedback(speakingScore.score, speakingData.transcripts.some(t => t.trim())).tips}
                    />
                  )}
                </div>
              </SkillCard>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{listeningScore.evaluated ? (listeningScore.score < 3 ? "M" : Math.round(listeningScore.score)) : "M"}</div>
                <div className="text-sm text-gray-500 mt-1">Listening</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{readingScore.evaluated ? (readingScore.score < 3 ? "M" : Math.round(readingScore.score)) : "M"}</div>
                <div className="text-sm text-gray-500 mt-1">Reading</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{writingScore.evaluated ? (writingScore.score < 3 ? "M" : Math.round(writingScore.score)) : "M"}</div>
                <div className="text-sm text-gray-500 mt-1">Writing</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">{speakingScore.evaluated ? (speakingScore.score < 3 ? "M" : Math.round(speakingScore.score)) : "M"}</div>
                <div className="text-sm text-gray-500 mt-1">Speaking</div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center text-xs text-gray-500 pt-4">
              Note: This is an independent practice tool. Scores shown are estimates
              based on your performance and may differ from official test results.
            </div>
          </div>
        </div>
      </PracticeFrame>
    </div>
  );
}
