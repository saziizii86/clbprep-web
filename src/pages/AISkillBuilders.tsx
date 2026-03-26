// src/pages/AISkillBuilders.tsx
// ============================================================
// AI Skill Builders — with LIVE AI-powered practice sessions
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Ear,
  Eye,
  EyeOff,
  FlaskConical,
  History,
  Layers,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  PauseCircle,
  PenLine,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Star,
  StopCircle,
  Target,
  Timer,
  Volume2,
  Zap,
} from "lucide-react";
import { getAPISettings } from "../services/settingsService";
import { databases, DATABASE_ID } from "../appwrite";
import { ID, Query } from "appwrite";

// ─────────────────────────────────────────────────────────────
// Appwrite collection for AI Builder session history
// ─────────────────────────────────────────────────────────────
const AI_BUILDER_HISTORY_COLLECTION_ID = "ai_builder_history";

// ─────────────────────────────────────────────────────────────
// History helpers — save & load sessions from Appwrite
// ─────────────────────────────────────────────────────────────
interface SessionHistoryRecord {
  $id?: string;
  userId: string;
  builderType: string;
  mode: string;
  topic: string;
  level: string;
  duration: string;
  angle: string;
  summary: string;
  score: string;
  completedAt: string;
}

async function saveSessionToHistory(record: Omit<SessionHistoryRecord, "$id">): Promise<void> {
  try {
    await databases.createDocument(
      DATABASE_ID,
      AI_BUILDER_HISTORY_COLLECTION_ID,
      ID.unique(),
      record
    );
  } catch (e) {
    console.warn("Could not save session history:", e);
  }
}

async function loadUserHistory(userId: string): Promise<SessionHistoryRecord[]> {
  try {
    const res = await databases.listDocuments(
      DATABASE_ID,
      AI_BUILDER_HISTORY_COLLECTION_ID,
      [
        Query.equal("userId", userId),
        Query.orderDesc("completedAt"),
        Query.limit(50),
      ]
    );
    return res.documents as unknown as SessionHistoryRecord[];
  } catch (e) {
    console.warn("Could not load session history:", e);
    return [];
  }
}

// Also keep sessionStorage exclusion list for within-session deduplication
// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type BuilderId =
  | "vocabulary" | "grammar" | "listening" | "reading"
  | "writing" | "speaking" | "pronunciation" | "conversation" | "mistake-review";

type Mode = "learn" | "practice" | "exam";
type Goal = "learn" | "practice" | "challenge" | "speed";
type Level = "beginner" | "intermediate" | "advanced";
type Topic =
  | "daily-life" | "work" | "travel" | "education" | "health" | "celpip"
  | "shopping" | "housing" | "technology" | "environment" | "sports"
  | "food" | "family" | "immigration" | "banking" | "government";
type Duration = "quick" | "standard" | "deep";

interface ChatMessage {
  role: "ai" | "user";
  text: string;
  isLoading?: boolean;
}

interface Builder {
  id: BuilderId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
  border: string;
  tag: string;
  description: string;
  learnItems: string[];
  practiceItems: string[];
  examItems: string[];
}

// ─────────────────────────────────────────────────────────────
// Builder catalogue
// ─────────────────────────────────────────────────────────────
const BUILDERS: Builder[] = [
  {
    id: "listening",
    title: "Listening Builder",
    subtitle: "Gist, detail & note-taking practice",
    icon: Ear,
    gradient: "from-blue-500 to-blue-700",
    accent: "text-blue-600",
    border: "border-blue-200",
    tag: "bg-blue-50 text-blue-700",
    description: "Train listening skills with AI-generated scenarios, comprehension questions, and vocabulary in context.",
    learnItems: ["Short listening scenarios by topic", "Vocabulary in context", "Comprehension strategies", "Note-taking techniques"],
    practiceItems: ["Gist & detail questions", "Note-taking practice", "Follow-up AI questions", "Vocabulary review"],
    examItems: ["CELPIP-format listening sets", "Timed comprehension", "Performance breakdown"],
  },
  {
    id: "speaking",
    title: "Speaking Builder",
    subtitle: "Fluency, clarity & answer structure",
    icon: Mic,
    gradient: "from-orange-500 to-amber-500",
    accent: "text-orange-600",
    border: "border-orange-200",
    tag: "bg-orange-50 text-orange-700",
    description: "Practice speaking with instant AI feedback on grammar, fluency, clarity and model answers.",
    learnItems: ["Speaking prompts by topic", "Idea generation strategies", "Answer structure (PEEL, etc.)", "Useful phrases & transitions"],
    practiceItems: ["Type or paste your spoken answer", "Grammar & fluency feedback", "Better-phrase suggestions", "Model answer comparison"],
    examItems: ["CELPIP-style speaking tasks", "AI score with detailed criteria", "Model answer"],
  },
  {
    id: "reading",
    title: "Reading Builder",
    subtitle: "Skimming, scanning & comprehension",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-600",
    accent: "text-emerald-600",
    border: "border-emerald-200",
    tag: "bg-emerald-50 text-emerald-700",
    description: "Build speed and comprehension with AI-generated passages, multi-style questions and level-adjusted texts.",
    learnItems: ["Short passages at your CLB level", "Vocabulary in context", "Difficult sentence explanations", "Skimming & scanning tips"],
    practiceItems: ["Multiple question styles", "Speed reading drills", "Main idea vs. detail questions", "Adaptive level adjustment"],
    examItems: ["CELPIP-format reading passages", "Timed reading sections", "Detailed score report"],
  },
  {
    id: "writing",
    title: "Writing Builder",
    subtitle: "Emails, opinions & paragraph craft",
    icon: PenLine,
    gradient: "from-violet-500 to-purple-600",
    accent: "text-violet-600",
    border: "border-violet-200",
    tag: "bg-violet-50 text-violet-700",
    description: "Improve writing with AI scoring, grammar fixes, vocabulary upgrades and model answer comparisons.",
    learnItems: ["Email and opinion writing structures", "Sentence-improvement patterns", "Paragraph building blocks", "Good vs. weak examples"],
    practiceItems: ["Timed or open writing prompts", "AI grammar & vocabulary fix", "Better-version suggestions", "Weak-sentence explanation"],
    examItems: ["CELPIP Task 1 & 2 simulation", "AI score with criteria breakdown", "Model answer comparison"],
  },
  {
    id: "pronunciation",
    title: "Pronunciation Builder",
    subtitle: "Stress, rhythm & difficult sounds",
    icon: Volume2,
    gradient: "from-fuchsia-500 to-pink-500",
    accent: "text-fuchsia-600",
    border: "border-fuchsia-200",
    tag: "bg-fuchsia-50 text-fuchsia-700",
    description: "Master English sounds, word stress and sentence rhythm with targeted drills and AI guidance.",
    learnItems: ["Difficult sounds (th, r, l, v…)", "Word stress rules", "Sentence rhythm & intonation", "Minimal pairs practice"],
    practiceItems: ["Stress placement drills", "Minimal pairs exercises", "Word grouping by sound", "AI correction tips"],
    examItems: ["Pronunciation challenge sets", "Accuracy feedback", "Improvement tips report"],
  },
  {
    id: "conversation",
    title: "Conversation Builder",
    subtitle: "Roleplay real-life English situations",
    icon: MessageCircle,
    gradient: "from-rose-500 to-pink-500",
    accent: "text-rose-600",
    border: "border-rose-200",
    tag: "bg-rose-50 text-rose-700",
    description: "AI becomes your speaking partner in daily, workplace and CELPIP-style conversation scenarios.",
    learnItems: ["Daily life situations (shopping, doctor, travel)", "Workplace English", "Interview conversations", "Canadian culture contexts"],
    practiceItems: ["Open-ended AI roleplay", "Guided conversation flows", "Real-time grammar hints", "Natural phrase suggestions"],
    examItems: ["CELPIP-style interaction tasks", "AI partner with scoring", "Conversation fluency report"],
  },
  {
    id: "vocabulary",
    title: "Vocabulary Builder",
    subtitle: "Words, collocations & expressions",
    icon: BookOpen,
    gradient: "from-indigo-500 to-indigo-700",
    accent: "text-indigo-600",
    border: "border-indigo-200",
    tag: "bg-indigo-50 text-indigo-700",
    description: "Master CELPIP vocabulary through topic-based learning, synonym drills, and AI-generated mini tests.",
    learnItems: ["Learn words by topic (work, health, travel…)", "Synonyms, antonyms & collocations", "Example sentences in CELPIP context", "Simple AI explanations at your level"],
    practiceItems: ["Fill-in-the-blank quiz", "Sentence-making challenges", "Weak-word review rounds", "Adaptive AI drills"],
    examItems: ["CELPIP-style word-usage questions", "Timed vocabulary sets", "Score & detailed feedback"],
  },
  {
    id: "grammar",
    title: "Grammar Builder",
    subtitle: "Pick a rule, master it with AI",
    icon: Layers,
    gradient: "from-cyan-500 to-sky-500",
    accent: "text-cyan-600",
    border: "border-cyan-200",
    tag: "bg-cyan-50 text-cyan-700",
    description: "Pick a specific grammar rule (articles, tenses, conditionals…), choose a real-life topic, and let AI teach it through targeted examples and drills.",
    learnItems: ["Focused rule explanation (1 rule per session)", "3 correct examples in real scenarios", "Common mistakes + corrections", "Write your own sentences with feedback"],
    practiceItems: ["Error correction for your chosen rule", "Fill-in-the-blank drills", "Sentence building exercises", "Rewrite tasks with instant feedback"],
    examItems: ["CELPIP-style grammar questions", "Focused on your chosen rule", "Score (X/6) + full explanations"],
  },
  {
    id: "mistake-review",
    title: "Mistake Review",
    subtitle: "Your personal error tracker & fixer",
    icon: RefreshCw,
    gradient: "from-slate-500 to-gray-600",
    accent: "text-slate-600",
    border: "border-slate-200",
    tag: "bg-slate-50 text-slate-700",
    description: "AI creates targeted review exercises from your common English mistakes and weak areas.",
    learnItems: ["Common grammar mistake patterns", "Frequently misused vocabulary", "Weak writing structures", "Hard comprehension areas"],
    practiceItems: ["Personalized re-test rounds", "Focus on your unique errors", "Spaced repetition drills", "AI progress summary"],
    examItems: ["Targeted mini exam from your errors", "Before vs. after improvement score", "Master-list review"],
  },
];

const GOALS: { id: Goal; label: string; emoji: string; desc: string }[] = [
  { id: "learn",     label: "Learn",     emoji: "📖", desc: "Explanations + guided practice" },
  { id: "practice",  label: "Practice",  emoji: "🏋️", desc: "Drills & exercises with feedback" },
  { id: "challenge", label: "Challenge", emoji: "🎯", desc: "Harder tasks, minimal hints" },
  { id: "speed",     label: "Speed Round", emoji: "⚡", desc: "Fast-paced, quick answers only" },
];

const LEVELS = [
  { id: "beginner" as Level, label: "Beginner", sub: "CLB 4–5" },
  { id: "intermediate" as Level, label: "Intermediate", sub: "CLB 6–7" },
  { id: "advanced" as Level, label: "Advanced", sub: "CLB 8+" },
];

const TOPICS = [
  { id: "daily-life" as Topic,   label: "Daily Life",     emoji: "🏠" },
  { id: "work" as Topic,         label: "Work",           emoji: "💼" },
  { id: "travel" as Topic,       label: "Travel",         emoji: "✈️" },
  { id: "education" as Topic,    label: "Education",      emoji: "🎓" },
  { id: "health" as Topic,       label: "Health",         emoji: "🏥" },
  { id: "celpip" as Topic,       label: "CELPIP Exam",    emoji: "📝" },
  { id: "shopping" as Topic,     label: "Shopping",       emoji: "🛒" },
  { id: "housing" as Topic,      label: "Housing",        emoji: "🏡" },
  { id: "technology" as Topic,   label: "Technology",     emoji: "💻" },
  { id: "environment" as Topic,  label: "Environment",    emoji: "🌿" },
  { id: "sports" as Topic,       label: "Sports",         emoji: "⚽" },
  { id: "food" as Topic,         label: "Food & Cooking", emoji: "🍽️" },
  { id: "family" as Topic,       label: "Family",         emoji: "👨‍👩‍👧" },
  { id: "immigration" as Topic,  label: "Immigration",    emoji: "🇨🇦" },
  { id: "banking" as Topic,      label: "Banking",        emoji: "🏦" },
  { id: "government" as Topic,   label: "Government",     emoji: "🏛️" },
];

const DURATIONS = [
  { id: "quick" as Duration,    label: "Quick Practice",    time: "5 min",     desc: "Fast warm-up",      seconds: 5 * 60 },
  { id: "standard" as Duration, label: "Standard Practice", time: "10–15 min", desc: "Balanced session",   seconds: 12 * 60 },
  { id: "deep" as Duration,     label: "Deep Practice",     time: "20–30 min", desc: "Full deep dive",     seconds: 25 * 60 },
];

const GRAMMAR_TOPICS: { id: string; label: string; emoji: string; desc: string; celpipRelevance: string }[] = [
  { id: "present-perfect",   label: "Present Perfect",          emoji: "⏱️", desc: "Have/has + past participle", celpipRelevance: "Writing Task 1 & emails" },
  { id: "past-tenses",       label: "Past Tenses",              emoji: "⏮️", desc: "Simple, continuous, perfect", celpipRelevance: "Reading & writing tasks" },
  { id: "future-forms",      label: "Future Forms",             emoji: "🔮", desc: "Will, going to, present continuous", celpipRelevance: "Opinion writing" },
  { id: "articles",          label: "Articles",                 emoji: "📌", desc: "A, an, the — when to use each", celpipRelevance: "Very common error in CELPIP" },
  { id: "prepositions",      label: "Prepositions",             emoji: "🗺️", desc: "In, on, at, for, since, by…", celpipRelevance: "Grammar accuracy score" },
  { id: "conditionals",      label: "Conditionals",             emoji: "🔀", desc: "If clauses — 0, 1st, 2nd, 3rd", celpipRelevance: "Opinion & argument writing" },
  { id: "passive-voice",     label: "Passive Voice",            emoji: "🔄", desc: "Is/was/has been + past participle", celpipRelevance: "Formal writing & emails" },
  { id: "modal-verbs",       label: "Modal Verbs",              emoji: "🎛️", desc: "Can, could, must, should, might…", celpipRelevance: "Speaking & writing fluency" },
  { id: "relative-clauses",  label: "Relative Clauses",         emoji: "🔗", desc: "Who, which, that, where, whose", celpipRelevance: "Sentence complexity score" },
  { id: "subject-verb",      label: "Subject-Verb Agreement",   emoji: "⚖️", desc: "Singular/plural matching rules", celpipRelevance: "Most common CELPIP error" },
  { id: "comparatives",      label: "Comparatives & Superlatives", emoji: "📊", desc: "More/most, -er/-est, as…as", celpipRelevance: "Opinion and comparison tasks" },
  { id: "reported-speech",   label: "Reported Speech",          emoji: "💬", desc: "Direct vs indirect speech rules", celpipRelevance: "Listening & email writing" },
  { id: "gerunds-infinitives", label: "Gerunds & Infinitives",  emoji: "🔤", desc: "Verb + -ing vs verb + to", celpipRelevance: "Writing accuracy" },
  { id: "conjunctions",      label: "Conjunctions & Connectors",emoji: "🔁", desc: "Although, however, therefore, since…", celpipRelevance: "Coherence & cohesion score" },
  { id: "countable-uncountable", label: "Countable & Uncountable", emoji: "🔢", desc: "Much/many, some/any, few/little", celpipRelevance: "Grammar accuracy" },
  { id: "word-order",        label: "Word Order",               emoji: "🔡", desc: "Sentence structure & placement rules", celpipRelevance: "Readability score" },
];


const GRAMMAR_SUBTOPICS: Record<string, { id: string; label: string; desc: string }[]> = {
  "present-perfect": [
    { id: "experiences", label: "Experiences", desc: "Have you ever…? Talking about life experiences" },
    { id: "recent-events", label: "Recent Events", desc: "Something just happened — just, already, yet" },
    { id: "changes-over-time", label: "Changes Over Time", desc: "How things have changed since/for" },
    { id: "unfinished-time", label: "Unfinished Time Periods", desc: "Today, this week, this year" },
    { id: "with-since-for", label: "Since & For", desc: "I have lived here for 3 years / since 2020" },
  ],
  "past-tenses": [
    { id: "simple-past", label: "Simple Past", desc: "Completed actions — I worked, she went" },
    { id: "past-continuous", label: "Past Continuous", desc: "Ongoing past action — was/were + -ing" },
    { id: "past-perfect", label: "Past Perfect", desc: "Before another past event — had + past participle" },
    { id: "used-to", label: "Used To / Would", desc: "Habitual past actions — I used to walk to school" },
    { id: "past-simple-vs-continuous", label: "Simple vs Continuous", desc: "When I arrived, she was cooking" },
  ],
  "future-forms": [
    { id: "will", label: "Will (Predictions & Decisions)", desc: "Spontaneous decisions and predictions" },
    { id: "going-to", label: "Going To (Plans)", desc: "Planned intentions — I'm going to apply" },
    { id: "present-continuous-future", label: "Present Continuous for Future", desc: "Fixed arrangements — I'm meeting her tomorrow" },
    { id: "future-continuous", label: "Future Continuous", desc: "Ongoing future action — will be + -ing" },
    { id: "future-perfect", label: "Future Perfect", desc: "Completed before a future time — will have done" },
  ],
  "articles": [
    { id: "a-an", label: "A vs An", desc: "Indefinite articles — a book, an apple" },
    { id: "the", label: "Using 'The'", desc: "Definite article — specific or second mention" },
    { id: "zero-article", label: "Zero Article", desc: "No article needed — general nouns, proper nouns" },
    { id: "articles-with-nouns", label: "Articles with Common Nouns", desc: "Countable, uncountable, abstract nouns" },
    { id: "articles-in-phrases", label: "Fixed Phrases & Expressions", desc: "Go to school, at home, in hospital" },
  ],
  "prepositions": [
    { id: "time-prepositions", label: "Time: In / On / At", desc: "In the morning, on Monday, at 5pm" },
    { id: "place-prepositions", label: "Place: In / On / At", desc: "At the office, in Canada, on the table" },
    { id: "movement-prepositions", label: "Movement Prepositions", desc: "To, from, into, out of, through" },
    { id: "phrasal-prepositions", label: "Phrasal Prepositions", desc: "Consist of, responsible for, interested in" },
    { id: "since-for-during", label: "Since / For / During", desc: "Time duration and specific periods" },
  ],
  "conditionals": [
    { id: "zero-conditional", label: "Zero Conditional", desc: "General truths — If you heat water, it boils" },
    { id: "first-conditional", label: "1st Conditional (Real)", desc: "Possible future — If I pass, I will celebrate" },
    { id: "second-conditional", label: "2nd Conditional (Unreal)", desc: "Hypothetical — If I were rich, I would travel" },
    { id: "third-conditional", label: "3rd Conditional (Past)", desc: "Past regret — If I had studied, I would have passed" },
    { id: "mixed-conditional", label: "Mixed Conditionals", desc: "Mixing 2nd and 3rd conditional forms" },
  ],
  "passive-voice": [
    { id: "present-passive", label: "Present Passive", desc: "Is/are + past participle — It is made in Canada" },
    { id: "past-passive", label: "Past Passive", desc: "Was/were + past participle — It was built in 1990" },
    { id: "perfect-passive", label: "Perfect Passive", desc: "Has/have been + past participle" },
    { id: "passive-with-agent", label: "Passive with Agent (By)", desc: "The report was written by the manager" },
    { id: "passive-vs-active", label: "When to Use Passive vs Active", desc: "Formal writing preference for passive" },
  ],
  "modal-verbs": [
    { id: "ability", label: "Ability: Can / Could", desc: "I can speak English / I could swim as a child" },
    { id: "permission", label: "Permission: May / Can / Could", desc: "May I leave? Could I use your phone?" },
    { id: "obligation", label: "Obligation: Must / Have To", desc: "You must arrive on time / I have to work" },
    { id: "advice", label: "Advice: Should / Ought To", desc: "You should see a doctor" },
    { id: "possibility", label: "Possibility: Might / May / Could", desc: "It might rain / She could be at home" },
  ],
  "relative-clauses": [
    { id: "defining", label: "Defining Relative Clauses", desc: "The man who called is my boss (essential info)" },
    { id: "non-defining", label: "Non-Defining Relative Clauses", desc: "My boss, who is very kind, helped me (extra info)" },
    { id: "who-which-that", label: "Who / Which / That", desc: "Choosing the right relative pronoun" },
    { id: "where-when-whose", label: "Where / When / Whose", desc: "The city where I was born / the person whose bag" },
    { id: "reduced-relative", label: "Reduced Relative Clauses", desc: "The man standing there = the man who is standing" },
  ],
  "subject-verb": [
    { id: "basic-agreement", label: "Basic Agreement", desc: "She works / They work — singular vs plural" },
    { id: "tricky-subjects", label: "Tricky Subjects", desc: "Everyone, nobody, each — these take singular verbs" },
    { id: "collective-nouns", label: "Collective Nouns", desc: "The team is/are — group as one or individuals" },
    { id: "either-neither", label: "Either/Neither…Or/Nor", desc: "Either the manager or the staff is/are responsible" },
    { id: "there-is-are", label: "There Is / There Are", desc: "Agreeing with the noun that follows" },
  ],
  "comparatives": [
    { id: "comparative-adj", label: "Comparative Adjectives", desc: "Taller, more expensive, better than" },
    { id: "superlative-adj", label: "Superlative Adjectives", desc: "The tallest, the most expensive, the best" },
    { id: "as-as", label: "As…As Comparisons", desc: "As fast as, not as tall as" },
    { id: "double-comparative", label: "Double Comparatives", desc: "The more you practice, the better you get" },
    { id: "comparative-adverbs", label: "Comparative Adverbs", desc: "More quickly, more carefully, harder" },
  ],
  "reported-speech": [
    { id: "reporting-statements", label: "Reporting Statements", desc: "She said that she was tired" },
    { id: "reporting-questions", label: "Reporting Questions", desc: "He asked if/whether I could help" },
    { id: "backshift-tenses", label: "Tense Backshift", desc: "Direct to indirect — am → was, will → would" },
    { id: "reporting-verbs", label: "Reporting Verbs", desc: "Said, told, asked, suggested, warned, explained" },
    { id: "time-place-changes", label: "Time & Place Changes", desc: "Now → then, here → there, today → that day" },
  ],
  "gerunds-infinitives": [
    { id: "verb-gerund", label: "Verbs Followed by Gerund", desc: "Enjoy, finish, avoid, suggest + -ing" },
    { id: "verb-infinitive", label: "Verbs Followed by Infinitive", desc: "Want, need, decide, hope + to" },
    { id: "both-forms", label: "Verbs with Both Forms", desc: "Like, love, hate, start — same or different meaning?" },
    { id: "gerund-as-subject", label: "Gerund as Subject", desc: "Swimming is good exercise / Eating well matters" },
    { id: "after-preposition", label: "Gerund After Preposition", desc: "Interested in learning / good at speaking" },
  ],
  "conjunctions": [
    { id: "coordinating", label: "Coordinating (FANBOYS)", desc: "For, and, nor, but, or, yet, so" },
    { id: "subordinating", label: "Subordinating Conjunctions", desc: "Although, because, since, unless, when" },
    { id: "contrast-concession", label: "Contrast & Concession", desc: "However, although, even though, despite" },
    { id: "cause-effect", label: "Cause & Effect", desc: "Therefore, as a result, consequently, so that" },
    { id: "addition-connectors", label: "Addition Connectors", desc: "Furthermore, moreover, in addition, also" },
  ],
  "countable-uncountable": [
    { id: "much-many", label: "Much vs Many", desc: "Much water (uncountable) / Many bottles (countable)" },
    { id: "some-any", label: "Some vs Any", desc: "Some milk, any questions — positive vs negative/question" },
    { id: "few-little", label: "Few vs Little", desc: "Few friends (countable) / Little time (uncountable)" },
    { id: "a-lot-of", label: "A Lot Of / Plenty Of", desc: "Used with both countable and uncountable" },
    { id: "uncountable-traps", label: "Uncountable Traps", desc: "Information, advice, furniture, news — no plural form" },
  ],
  "word-order": [
    { id: "basic-svo", label: "Basic SVO Order", desc: "Subject + Verb + Object — the foundation" },
    { id: "adjective-order", label: "Adjective Order", desc: "A big red Italian leather bag — the order matters" },
    { id: "adverb-placement", label: "Adverb Placement", desc: "Always, usually, never — where they go in a sentence" },
    { id: "indirect-questions", label: "Indirect Question Order", desc: "Can you tell me where the station is? (no inversion)" },
    { id: "fronting", label: "Fronting for Emphasis", desc: "Never have I seen… / Only then did she realize…" },
  ],
};
function getUsedContent(key: string): string[] {
  try {
    const raw = sessionStorage.getItem(`used_${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addUsedContent(key: string, items: string[]): void {
  try {
    const existing = getUsedContent(key);
    const merged = Array.from(new Set([...existing, ...items])).slice(-80);
    sessionStorage.setItem(`used_${key}`, JSON.stringify(merged));
  } catch {}
}

// ─────────────────────────────────────────────────────────────
// Build AI system prompt
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt(
  builder: Builder,
  mode: Mode,
  goal: Goal,
  level: Level,
  topic: Topic,
  duration: Duration,
  grammarTopic?: string,
  grammarSubTopic?: string
): string {
  const levelMap: Record<Level, string> = {
    beginner: "CLB 4-5 (beginner)",
    intermediate: "CLB 6-7 (intermediate)",
    advanced: "CLB 8+ (advanced)",
  };
  const durationMap: Record<Duration, string> = {
    quick: "5 minutes — give 3–4 focused exercises",
    standard: "10–15 minutes — give 6–8 exercises",
    deep: "20–30 minutes — give 10–15 exercises",
  };
  const topicLabel = TOPICS.find((t) => t.id === topic)?.label ?? topic;

  const seed = Math.floor(Math.random() * 999999);

  // 1. Sub-angle per topic — forces the AI into a specific corner of the topic
  const topicAngles: Record<string, string[]> = {
    work:        ["job interviews","office meetings","remote work","workplace conflicts","promotions","coworker relationships","handling deadlines","work-life balance","job hunting","performance reviews"],
    "daily-life":["morning routines","grocery shopping","cooking at home","public transit","neighbourhood life","weekend activities","household chores","managing personal finances","health habits","social plans"],
    travel:      ["airport experience","hotel check-in","getting lost abroad","trying local food","cultural differences","booking a trip","using public transport","visiting tourist spots","travel emergencies","packing tips"],
    education:   ["classroom interactions","exam preparation","group projects","teacher-student relationships","online learning","applying for scholarships","study habits","university life","school facilities","academic writing"],
    health:      ["visiting a doctor","managing stress","exercise routines","diet and nutrition","going to a pharmacy","emergency care","living with a chronic condition","building healthy habits","improving sleep","preventive checkups"],
    celpip:      ["listening strategies","reading speed techniques","writing structure","speaking fluency tips","managing test anxiety","time management in exams","understanding CELPIP scores","effective practice habits","common test mistakes","exam day preparation"],
    shopping:    ["comparing prices","returning items","online vs in-store shopping","grocery planning","impulse buying","sales and discounts","dealing with customer service","quality vs price trade-offs","budgeting for purchases","brand loyalty"],
    housing:     ["renting an apartment","buying a home","dealing with a landlord","moving in day","fixing things at home","neighbour relations","paying utilities","furniture shopping","understanding a lease","neighbourhood safety"],
    technology:  ["using smartphones","navigating social media","staying safe online","protecting privacy","working from home tech","making video calls","streaming services","using AI tools","getting tech support","making digital payments"],
    environment: ["recycling habits","understanding climate change","using public transport","saving energy at home","reducing plastic use","protecting nature","urban gardening","conserving water","choosing eco-friendly products","local environmental policy"],
    sports:      ["playing team sports","building a fitness routine","recovering from injuries","watching live games","sports culture","following professional athletes","joining a gym","competing in tournaments","coaching youth sports","sports nutrition"],
    food:        ["learning cooking techniques","eating at restaurants","exploring food culture","handling dietary restrictions","planning weekly meals","local vs imported food","reducing food waste","trying cultural dishes","fast food habits","cooking for guests"],
    family:      ["parenting challenges","family gatherings","sibling relationships","supporting aging parents","keeping family traditions","balancing work and family","raising children in Canada","resolving family conflicts","generational differences","celebrating milestones"],
    immigration: ["applying for a visa","overcoming language barriers","adjusting to Canadian culture","finding work as a newcomer","applying for permanent residency","dealing with homesickness","making new friends","understanding Canadian customs","the citizenship process","finding support services"],
    banking:     ["opening a bank account","using online banking","managing credit cards","applying for a loan","setting savings goals","understanding basic investments","protecting against fraud","planning personal finances","getting a mortgage","exchanging currency"],
    government:  ["voting in elections","using public services","understanding taxes","navigating the healthcare system","applying for social benefits","how local government works","knowing your rights as a citizen","understanding the legal system","immigration policy changes","getting involved in the community"],
  };
  const angles = topicAngles[topic] ?? [`specific ${topicLabel} situations`, `${topicLabel} interactions`, `${topicLabel} vocabulary in context`];
  const angle = angles[seed % angles.length];

  // 2. Scenario style
  const scenarioStyles = [
    "Use a real-life Canadian scenario set in a specific city.",
    "Frame this as a personal story — something that happened to someone this week.",
    "Use a workplace or school context with named characters.",
    "Structure it as a problem the student needs to solve.",
    "Frame it as advice a Canadian friend gives a newcomer.",
    "Use a before-and-after comparison to highlight a change.",
    "Set it as a conversation between two people in different life situations.",
    "Include real-sounding numbers, dates, or statistics to make it concrete.",
    "Frame it around a decision someone has to make.",
    "Use a misunderstanding that needs to be resolved.",
  ];
  const style = scenarioStyles[(seed * 7) % scenarioStyles.length];

  // 3. Character names for variety
  const names = ["Aisha","Carlos","Priya","Mehmet","Chen Wei","Sofia","James","Fatima","Lucas","Yuna","Omar","Amara","David","Nadia","Raj","Leila","Marcus","Zoe","Ivan","Hana"];
  const name1 = names[seed % names.length];
  const name2 = names[(seed * 3 + 5) % names.length];

  // 4. Exclusion list from previous sessions
  const usedKey = `${builder.id}_${topic}_${mode}`;
  const usedItems = getUsedContent(usedKey);
  const excludeClause = usedItems.length > 0
    ? `\n\n⛔ ALREADY USED — DO NOT REPEAT ANY OF THESE (not even similar ones):\n${usedItems.slice(-40).map((w: string) => `- "${w}"`).join("\n")}\nIf any of the above come to mind, SKIP them and choose something completely different.`
    : "";

  const goalMap: Record<Goal, string> = {
    learn:     "LEARN — explain clearly, give examples, guide step by step",
    practice:  "PRACTICE — give exercises and drills, provide feedback after each",
    challenge: "CHALLENGE — harder tasks, fewer hints, push the student",
    speed:     "SPEED ROUND — fast-paced only, one short question at a time, minimal explanation, keep moving quickly",
  };

  const base = `You are a friendly, expert CELPIP English coach.
Student level: ${levelMap[level]}.
Topic: ${topicLabel} — specifically the angle: "${angle}".${
  builder.id === "grammar" && grammarTopic
    ? (() => {
        const gt = GRAMMAR_TOPICS.find(g => g.id === grammarTopic);
        const gst = GRAMMAR_SUBTOPICS[grammarTopic]?.find(s => s.id === grammarSubTopic);
        return `\nGrammar Rule: "${gt?.label ?? grammarTopic}"${gst ? ` → Sub-focus: "${gst.label}" (${gst.desc})` : ""}. This is the SINGLE grammar focus for the entire session.`;
      })()
    : ""
}
Session length: ${durationMap[duration]}.
Mode: ${mode.toUpperCase()}. Goal: ${goalMap[goal]}.
Session seed: ${seed}.
Scenario style: ${style}
Character names to use: ${name1}, ${name2}.

🎲 ANTI-REPEAT RULES — MANDATORY:
1. This session's specific angle is "${angle}" — ALL content must focus on this angle, not generic "${topicLabel}".
2. Every word, sentence, question, and passage must be freshly invented for this exact session (seed: ${seed}).
3. Avoid the most "obvious" examples for this topic — dig into the specific angle with real-sounding scenarios.
4. Vary: vocabulary difficulty, sentence length, scenario type, characters, settings.
5. If a "typical" example comes to mind — replace it with something more specific, unexpected, and realistic.${excludeClause}

RULES:
- Use clear, encouraging language.
- After every student response: give brief specific feedback FIRST, then continue.
- Number exercises (e.g., "Exercise 2 of 6").
- End session with a short summary of what was practiced and 1 tip to improve.
- Stay on the angle: "${angle}". Do not drift to generic ${topicLabel} content.
`;

  const instructions: Record<BuilderId, string> = {
    vocabulary: mode === "learn"
      ? `VOCABULARY LEARN MODE:
Teach 6 English words specifically about "${angle}" — NOT generic ${topicLabel} words.
For each word:
1. **Word** (bold)
2. Simple definition (1 sentence, plain English)
3. Example sentence set in a real "${angle}" situation using ${name1} or ${name2}
4. One synonym or useful collocation
5. Ask: "Now use this word in your own sentence about ${angle}."
Wait for their sentence, give feedback, move to next word.`
      : mode === "practice"
      ? `VOCABULARY PRACTICE MODE:
Create 6 exercises testing words from the "${angle}" angle — NOT generic ${topicLabel} words.
Mix:
- Fill in the blank (give 3 word choices)
- Choose the correct word (give 3 options)
- "Use this word in a sentence about ${angle}"
Give instant feedback and explanation after each answer before moving on.`
      : `VOCABULARY EXAM MODE:
Give 6 multiple-choice questions (A/B/C/D) testing word meaning, collocation, or usage.
All words must come specifically from the "${angle}" context — not generic ${topicLabel} vocabulary.
Level: ${levelMap[level]}. After ALL answers: reveal score (X/6) and explain each.`,

    grammar: (() => {
      const gt = GRAMMAR_TOPICS.find(g => g.id === grammarTopic);
      const gst = grammarTopic ? GRAMMAR_SUBTOPICS[grammarTopic]?.find(s => s.id === grammarSubTopic) : null;
      const ruleName = gt ? gt.label : "grammar rules";
      const subName = gst ? gst.label : null;
      const subDesc = gst ? gst.desc : null;
      const fullFocus = subName ? `${ruleName} → specifically: "${subName}" (${subDesc})` : ruleName;
      const celpipNote = gt ? `This rule is especially important in CELPIP: ${gt.celpipRelevance}.` : "";

      if (mode === "learn") return `GRAMMAR LEARN MODE — RULE: ${fullFocus}
Focus EXCLUSIVELY on: "${fullFocus}".
${celpipNote}

Structure your lesson exactly like this:

1. 📖 WHAT IS THE RULE?
   Explain "${subName ?? ruleName}" in 2–3 simple sentences at ${levelMap[level]} level.
   If relevant, mention how it differs from similar forms.

2. ✅ CORRECT EXAMPLES (3 examples):
   All 3 must use "${subName ?? ruleName}" and be set in a "${angle}" scenario with ${name1} or ${name2}.
   For each: write the full sentence and **bold** or mark the ${subName ?? ruleName} element.

3. ❌ COMMON MISTAKES (2 examples):
   Show: ❌ Wrong → ✅ Correct → 📌 Why (1 sentence rule explanation).
   Both mistakes must be about "${subName ?? ruleName}" specifically.

4. 🏋️ YOUR TURN — Exercise 1 of ${duration === "quick" ? "3" : duration === "standard" ? "4" : "6"}:
   Ask the student to write 1–2 sentences about "${angle}" using "${subName ?? ruleName}" correctly.
   Give specific, detailed feedback on their use of this rule. Then continue to Exercise 2.`;

      if (mode === "practice") return `GRAMMAR PRACTICE MODE — FOCUS: ${fullFocus}
EVERY exercise must test ONLY "${subName ?? ruleName}".
${celpipNote}

Create ${duration === "quick" ? "4" : duration === "standard" ? "6" : "8"} exercises. Rotate these types:
• ERROR CORRECTION: Write a sentence with a "${subName ?? ruleName}" error. Student finds & fixes it.
• FILL IN THE BLANK: Sentence with a blank requiring "${subName ?? ruleName}". Give 3 options (A/B/C).
• SENTENCE BUILDING: Jumbled words → student arranges correctly using "${subName ?? ruleName}".
• REWRITE: Rewrite using "${subName ?? ruleName}" (e.g. change active to passive, direct to reported).

ALL sentences must be set in a "${angle}" context with ${name1} or ${name2}.
After each answer: confirm correct/incorrect + explain the specific "${subName ?? ruleName}" rule applied.`;

      return `GRAMMAR EXAM MODE — FOCUS: ${fullFocus}
ALL 6 questions test ONLY "${subName ?? ruleName}".
${celpipNote}

Give 6 multiple-choice questions (A/B/C/D), all in a "${angle}" context.
Mix: error correction, fill-in-the-blank, sentence transformation — all testing "${subName ?? ruleName}".
Level: ${levelMap[level]}.
After ALL answers: score (X/6) + explain each answer referencing "${subName ?? ruleName}" specifically.`;
    })(),

    listening: mode === "learn"
      ? `LISTENING LEARN MODE:
You MUST wrap the script text inside [AUDIO_SCRIPT] markers EXACTLY as shown below.
CRITICAL: The block MUST start with [AUDIO_SCRIPT] on its own line and end with [/AUDIO_SCRIPT] on its own line. Do NOT write the script as plain text. Do NOT skip the markers.

Example of the EXACT format you must output (replace with real content about "${angle}"):
Exercise 1 of 4: Listening Practice
Here is a short dialogue between ${name1} and ${name2} about ${angle}. Listen carefully.
[AUDIO_SCRIPT]
${name1}: Good morning! How was your weekend?
${name2}: It was great! I spent time with my family and we went for a walk in the park.
${name1}: That sounds lovely. Did the weather cooperate?
${name2}: Yes, it was sunny and warm. Perfect for being outside.
${name1}: I stayed home and watched a movie. I prefer quiet weekends.
${name2}: That's nice too. Sometimes relaxing at home is the best plan.
${name1}: Exactly. We all need rest. What are you planning this week?
${name2}: I have a big project at work. I need to stay focused.
${name1}: Good luck with that! Let me know if you need help.
${name2}: Thank you, I appreciate it!
[/AUDIO_SCRIPT]
Press ▶ Play to listen. When you are done, type "ready" and I will ask you 3 comprehension questions.

Now output the same structure but with a fresh dialogue specifically about "${angle}" featuring ${name1} and ${name2}. After the [/AUDIO_SCRIPT] marker, tell the user to press Play and type "ready".
Wait for "ready" before asking questions. After questions, highlight 3–4 key vocabulary words from the script.`
      : mode === "practice"
      ? `LISTENING PRACTICE MODE:
You MUST wrap the script inside [AUDIO_SCRIPT] markers. CRITICAL: markers must be on their own lines. Do NOT output the script as plain text.

Example format:
Exercise 1 of 4: Listening Practice
Here is a scenario about ${angle}. Listen carefully.
[AUDIO_SCRIPT]
${name1}: I need to talk to you about the team schedule this week.
${name2}: Of course. What changes are you thinking about?
${name1}: We need to move Tuesday's meeting to Thursday because of the client visit.
${name2}: That works for me. Should I inform the rest of the team?
${name1}: Yes, please send an email today. Also, we need the report ready by Wednesday.
${name2}: Understood. I'll make sure everything is prepared on time.
${name1}: Great. Thanks for your flexibility on this.
${name2}: No problem. I'll get started right away.
[/AUDIO_SCRIPT]
Press ▶ Play to listen. When done, type "ready" and I will ask comprehension questions.

Now output this structure with a fresh scenario about "${angle}". After [/AUDIO_SCRIPT], tell user to press Play and type "ready".
Wait for "ready". Give 5 questions: 2 gist, 2 detail, 1 vocabulary in context. Give feedback on each answer. List 3–4 important phrases.`
      : `LISTENING EXAM MODE:
You MUST wrap the script inside [AUDIO_SCRIPT] markers. CRITICAL: markers must be on their own lines.

Example format:
Exercise 1 of 4: Listening Exam
Listen to this conversation about ${angle}.
[AUDIO_SCRIPT]
${name1}: Excuse me, I am looking for the pharmacy on Main Street.
${name2}: It moved last month. It is now on Oak Avenue, near the library.
${name1}: Oh, I did not know that. Is it far from here?
${name2}: About a ten minute walk. You go straight ahead and then turn left at the traffic lights.
${name1}: Thank you. Do you know what time it closes?
${name2}: I believe it closes at 6 PM on weekdays and at 2 PM on Saturdays.
${name1}: That is helpful. I need to pick up a prescription before it closes.
${name2}: You should hurry then. It is already 5 o'clock.
[/AUDIO_SCRIPT]
Press ▶ Play to listen. When done, type "ready" to begin the exam questions.

Now output this structure with a fresh conversation about "${angle}". After [/AUDIO_SCRIPT], tell user to press Play and type "ready".
Wait for "ready". Give 6 multiple-choice questions (A/B/C/D). After all answers: score (X/6) + explanations.`,

reading: mode === "learn"
  ? `READING LEARN MODE:
Write a passage (120–150 words) about "${angle}" at ${levelMap[level]} level. Make it situation-based, not a general overview.
Label it: "📖 READING PASSAGE:"

IMPORTANT FLOW RULES:
- After presenting the passage, wait for the student to EXPLICITLY confirm they finished reading by saying something like "done", "ready", "yes", or "I've read it".
- If the student asks ANY question (vocabulary, meaning, grammar) BEFORE confirming, answer it helpfully — but do NOT advance to Exercise 2. Stay on Exercise 1 and re-ask: "Have you finished reading the passage? Let me know when you're ready to continue."
- Only move to Exercise 2 after an explicit confirmation from the student.

After confirmed: explain 3–4 difficult words/phrases from YOUR passage, ask 2–3 comprehension questions, discuss main idea and paragraph structure.`
      : mode === "practice"
      ? `READING PRACTICE MODE:
Write a passage (160–200 words) about "${angle}". Make it specific and situation-based using ${name1} or ${name2}.
Ask 5–6 questions: main idea, specific detail, vocabulary in context, inference.
Give feedback and explanation on each answer.`
      : `READING EXAM MODE:
Write a passage (200–250 words) about "${angle}". Include real-sounding details, names, or situations.
Give 6 multiple-choice questions (A/B/C/D): main idea, detail, inference, vocabulary.
After all answers: score (X/6) + explanations.`,

    writing: mode === "learn"
      ? `WRITING LEARN MODE:
1. Explain the structure for writing about "${angle}".
2. Show ❌ WEAK and ✅ STRONG examples specifically about "${angle}" — not generic.
3. Explain 3–4 specific points that make the strong version better.
4. Give a writing task about "${angle}" (3–5 sentences or 1 paragraph).
When submitted: detailed feedback on grammar, vocabulary, and structure.`
      : mode === "practice"
      ? `WRITING PRACTICE MODE:
Give a realistic writing prompt about "${angle}" involving ${name1} or ${name2}.
Student writes their response. When submitted: task completion, grammar, vocabulary, organization.
Estimated CELPIP score (e.g., 7.5/12). List 3 specific improvements. Rewrite 1 weak sentence as a model.`
      : `WRITING EXAM MODE:
Give a CELPIP-style Task 1 (email) OR Task 2 (opinion) prompt specifically about "${angle}".
Score: Content /3, Vocabulary /3, Readability /3, Conventions /3. Total: /12.
Specific feedback per criterion. Provide a model answer.`,

    speaking: mode === "learn"
      ? `SPEAKING LEARN MODE:
You MUST output the SPEAKING_PROMPT block exactly as shown below — filled in with real content about "${angle}".

CRITICAL: The block MUST start with [SPEAKING_PROMPT] on its own line and end with [/SPEAKING_PROMPT] on its own line. Do NOT skip these markers. Do NOT output plain text instead.

Example of the EXACT format you must use (replace content with real content about "${angle}"):
[SPEAKING_PROMPT]
PROMPT: Describe a daily routine activity you do at home. What do you do and why do you enjoy it?
LEVEL: CLB 4-5 (beginner)
WEAK_EXAMPLE: I wake up. I eat breakfast. It is good.
STRONG_EXAMPLE: Every morning I wake up at 7 AM and make coffee because it helps me feel ready for the day. I enjoy this routine since it gives me quiet time to think before work starts. This small habit makes me feel calm and organized.
PHRASES: I usually start by... | One thing I enjoy is... | I like this because... | Every morning I... | This helps me feel...
STRUCTURE: Point → Evidence/Example → Explain → Link back
[/SPEAKING_PROMPT]

Now output the same block filled in with a real prompt about "${angle}". Then tell the user: "Press 🎙️ Record to speak your answer, or type it below."
When they respond: give SCORE/10, what they did well ✅, what to improve 🔧, an upgraded version of their answer 💬, and a model answer ⭐. Then give next prompt.`
      : mode === "practice"
      ? `SPEAKING PRACTICE MODE:
You MUST output the SPEAKING_PROMPT block exactly as shown. Fill it in with real content about "${angle}".

CRITICAL: The block MUST start with [SPEAKING_PROMPT] on its own line and end with [/SPEAKING_PROMPT] on its own line.

Example of EXACT format (replace with real "${angle}" content):
[SPEAKING_PROMPT]
PROMPT: Tell me about a challenge you faced at work and how you handled it.
LEVEL: CLB 6-7 (intermediate)
PHRASES: I faced a situation where... | The main challenge was... | I decided to... | Looking back, I think... | This experience taught me...
HINT: Use the STAR method: Situation, Task, Action, Result.
[/SPEAKING_PROMPT]

Output that block filled in for "${angle}". Then tell the user: "Press 🎙️ Record to speak your answer, or type it below."
When they respond: SCORE/10, strengths ✅, improvements 🔧, upgraded version 💬, model answer ⭐. Then next prompt.`
      : `SPEAKING EXAM MODE:
You MUST output the SPEAKING_PROMPT block exactly as shown. Fill it in with a formal CELPIP task about "${angle}".

CRITICAL: The block MUST start with [SPEAKING_PROMPT] on its own line and end with [/SPEAKING_PROMPT] on its own line.

Example of EXACT format (replace with real "${angle}" content):
[SPEAKING_PROMPT]
PROMPT: Your friend is moving to a new city and asks for your advice on how to make new friends. Give your friend two suggestions and explain why each one would be helpful.
LEVEL: CLB 8+ (advanced)
TIME_HINT: You have about 60 seconds to respond.
[/SPEAKING_PROMPT]

Output that block for "${angle}". Then tell user: "Press 🎙️ Record or type below."
When submitted: CELPIP score (Task Fulfilment /3, Vocabulary /3, Listenability /3, Coherence /3 = total /12), top 3 fixes, model answer.`,

    pronunciation: mode === "learn"
      ? `PRONUNCIATION LEARN MODE:
Present 5–6 words specifically from "${angle}" context that learners mispronounce.
For each: word | /IPA phonetic/ | stressed syllable in CAPS | common mistake | tip.
Give 3 minimal pair examples relevant to "${angle}".
Exercise: "Which syllable is stressed? Write it in CAPITALS." (5 words from "${angle}").`
      : mode === "practice"
      ? `PRONUNCIATION PRACTICE MODE:
Use 5 sentences specifically about "${angle}". Ask student to rewrite each with the STRESSED WORD in capitals.
Give 5 minimal pairs relevant to "${angle}". Ask 1 sentence using each word correctly.
Give a word list from "${angle}" context — ask student to group by vowel sound.`
      : `PRONUNCIATION EXAM MODE:
Give 8 questions: word stress, minimal pairs, phonetic matching, sentence rhythm.
ALL words/sentences must come from "${angle}" context.
After all answers: score (X/8) + explanations.`,

    conversation: mode === "learn"
      ? `You are an English conversation partner for a CELPIP learner.
Level: ${levelMap[level]}. Angle: "${angle}". Seed: ${seed}.
Rules:
- Keep responses SHORT (1–3 sentences). Natural, friendly tone. Stay on "${angle}".
- After EVERY response, add a TIPS line with exactly 5 options.
  TIPS FORMAT: TIPS: "<option1>" | "<option2>" | "<option3>" | "<option4>" | "<option5>"
  ⚠️ Each option MUST directly answer the exact question you just asked about "${angle}". Min 6 words. No questions. Vary lengths 6–25 words. At least 3 use connectors.
- After 6–8 exchanges, end naturally.
First message: Set the scene around "${angle}" in one sentence, ask your opening question, add TIPS.`
      : mode === "practice"
      ? `You are a natural English conversation partner for a CELPIP learner.
Level: ${levelMap[level]}. Angle: "${angle}". Seed: ${seed}.
Rules:
- Keep responses SHORT (1–3 sentences). Natural tone. Stay on "${angle}".
- Gently correct grammar mistakes in [brackets], then continue.
- After EVERY response, add a TIPS line with exactly 5 options.
  TIPS FORMAT: TIPS: "<option1>" | "<option2>" | "<option3>" | "<option4>" | "<option5>"
  ⚠️ Each option MUST directly answer YOUR current question about "${angle}". No recycled phrases. Min 6 words. No questions. Vary lengths 6–25 words. At least 3 use connectors.
- After 8–10 exchanges, close naturally.
First message: Set the scene around "${angle}", speak your opening line, add TIPS.`
      : `You are a CELPIP speaking examiner.
Level: ${levelMap[level]}. Angle: "${angle}". Seed: ${seed}.
Rules:
- Keep messages SHORT (1–2 sentences). Stay on "${angle}".
- After EVERY message, add a TIPS line with exactly 5 options.
  TIPS FORMAT: TIPS: "<option1>" | "<option2>" | "<option3>" | "<option4>" | "<option5>"
  ⚠️ Each option MUST directly answer your current prompt about "${angle}". Min 6 words. No questions. Vary lengths 6–25 words. At least 3 use connectors.
- After 6 exchanges, close formally.
First message: Set the formal "${angle}" scenario, ask your first question, add TIPS.`,

    "mistake-review": mode === "learn"
      ? `MISTAKE REVIEW LEARN MODE:
List 5 errors that ${levelMap[level]} learners make in "${angle}" situations — specific to this angle, not generic:
For each:
❌ WRONG: [example sentence about "${angle}"]
✅ CORRECT: [fixed sentence]
📌 WHY: [1-sentence rule explanation]
Then ask: correct 3 practice sentences with similar errors from a "${angle}" context.`
      : mode === "practice"
      ? `MISTAKE REVIEW PRACTICE MODE:
Give 7 sentences with errors. ALL sentences from a "${angle}" context involving ${name1} or ${name2}.
Mix: grammar, vocabulary, article, preposition, tense errors.
Ask: "Find and correct the error in each sentence."
After each answer: correct/incorrect, explain the rule, keep a running score.`
      : `MISTAKE REVIEW EXAM MODE:
Give 8 error-correction questions at ${levelMap[level]} difficulty.
ALL questions must use a "${angle}" context — not generic sentences.
Mix: grammar, vocabulary, punctuation, word order errors.
After all answers: score (X/8) + explanations for every question.`,
  };

  return (
    base +
    "\n\n" +
    (instructions[builder.id] ?? "") +
    "\n\nStart NOW: greet the student in 1 warm sentence mentioning the specific angle, then immediately begin Exercise 1. Be specific, fresh, and direct."
  );
}

// ─────────────────────────────────────────────────────────────
// Universal AI caller — matches the platform's API pattern
// ─────────────────────────────────────────────────────────────
async function callAI(
  settings: any,
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const provider: string = settings?.provider || "openai";
  const model: string = settings?.modelName || "gpt-4o-mini";
  const key: string =
    provider === "gemini" ? settings.geminiKey
    : provider === "claude" ? settings.claudeKey
    : provider === "deepseek" ? settings.deepseekKey
    : provider === "groq" ? settings.groqKey
    : provider === "openrouter" ? settings.openrouterKey
    : settings.openAIKey;

  if (!key) throw new Error("No API key configured. Please connect an AI provider in Admin → API Settings.");

  // ── Gemini ──────────────────────────────────────────────────
  if (provider === "gemini") {
    const contents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
        }),
      }
    );
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Gemini API error"); }
    const d = await res.json();
    return d.candidates[0].content.parts[0].text;
  }

  // ── Anthropic Claude ────────────────────────────────────────
  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 1500, system: systemPrompt, messages: history }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Claude API error"); }
    const d = await res.json();
    return d.content[0].text;
  }

  // ── Groq ────────────────────────────────────────────────────
  if (provider === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model, temperature: 0.7, max_tokens: 1500,
        messages: [{ role: "system", content: systemPrompt }, ...history],
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Groq API error"); }
    const d = await res.json();
    return d.choices[0].message.content;
  }

  // ── OpenRouter ──────────────────────────────────────────────
  if (provider === "openrouter") {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "CELPIP Practice",
      },
      body: JSON.stringify({
        model, temperature: 0.7, max_tokens: 1500,
        messages: [{ role: "system", content: systemPrompt }, ...history],
      }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "OpenRouter API error"); }
    const d = await res.json();
    return d.choices[0].message.content;
  }

  // ── OpenAI / DeepSeek ───────────────────────────────────────
  const endpoint =
    provider === "deepseek"
      ? "https://api.deepseek.com/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, temperature: 0.7, max_tokens: 1500,
      messages: [{ role: "system", content: systemPrompt }, ...history],
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "API error"); }
  const d = await res.json();
  return d.choices[0].message.content;
}

// ─────────────────────────────────────────────────────────────
// Live AI Session Chat
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Listening Audio Player Card
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Listening Audio Player Card — OpenAI TTS + browser fallback
// ─────────────────────────────────────────────────────────────
const ListeningScriptCard: React.FC<{ scriptText: string; apiSettings: any }> = ({ scriptText, apiSettings }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  };

  const getPlaybackRate = () => speed === "slow" ? 0.75 : speed === "fast" ? 1.25 : 1.0;

  // ── OpenAI TTS ──────────────────────────────────────────────
  const playWithOpenAI = async (key: string) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      // Revoke previous blob URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      const speedMap = { slow: 0.8, normal: 1.0, fast: 1.2 };
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "tts-1",
          input: scriptText,
          voice: "alloy",
          speed: speedMap[speed],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message ?? "OpenAI TTS failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.playbackRate = 1; // already baked into the TTS speed param
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => { setIsPlaying(false); setErrorMsg("Audio playback failed."); };
      await audio.play();
      setIsPlaying(true);
    } catch (e: any) {
      setErrorMsg(e.message ?? "Could not play audio.");
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Browser TTS fallback ────────────────────────────────────
  const playWithBrowser = () => {
    if (!("speechSynthesis" in window)) {
      setErrorMsg("Your browser does not support speech. Please use Chrome.");
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(scriptText);
    utter.lang = "en-US";
    utter.rate = getPlaybackRate();
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utter.voice = preferred;
    utter.onend = () => setIsPlaying(false);
    utter.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utter);
    setIsPlaying(true);
  };

  const play = async () => {
    stop();
    const provider = apiSettings?.provider ?? "openai";
    const key = apiSettings?.openAIKey ?? "";
    if (provider === "openai" && key) {
      await playWithOpenAI(key);
    } else {
      playWithBrowser();
    }
  };

  // Preload browser voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const onChanged = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", onChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  return (
    <div className="my-3 rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-sky-100/80 border-b border-sky-200">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shrink-0 shadow-sm">
          <Ear className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sky-900 text-sm">🎧 Listening Audio</p>
          <p className="text-xs text-sky-600 mt-0.5">
            {apiSettings?.provider === "openai" ? "Powered by OpenAI TTS" : "Browser TTS"} — listen carefully before answering
          </p>
        </div>
      </div>

      {/* Controls row */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-3">

        {/* Play / Stop button */}
        <button
          onClick={isPlaying ? stop : play}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? "#7dd3fc" : isPlaying ? "#ef4444" : "#0284c7",
            color: "#ffffff",
            minWidth: "140px",
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm justify-center hover:opacity-90 disabled:cursor-wait"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
          ) : isPlaying ? (
            <><Square className="w-4 h-4" /> Stop</>
          ) : (
            <><PlayCircle className="w-5 h-5" /> Play Audio</>
          )}
        </button>

        {/* Speed */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ color: "#0369a1" }}>Speed:</span>
          {(["slow", "normal", "fast"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={
                speed === s
                  ? { backgroundColor: "#0284c7", color: "#ffffff", borderColor: "#0284c7" }
                  : { backgroundColor: "#ffffff", color: "#0369a1", borderColor: "#bae6fd" }
              }
              className="px-3 py-1 rounded-lg text-xs font-bold capitalize transition border"
            >
              {s === "slow" ? "Slow" : s === "normal" ? "Normal" : "Fast"}
            </button>
          ))}
        </div>

        {/* Playing waveform */}
        {isPlaying && (
          <div className="flex items-center gap-1 ml-1">
            {[1, 2, 3, 4, 5].map((b) => (
              <span
                key={b}
                className="block w-1 rounded-full animate-bounce"
                style={{ height: `${6 + b * 3}px`, backgroundColor: "#0ea5e9", animationDelay: `${b * 0.08}s` }}
              />
            ))}
            <span className="text-xs font-medium ml-1" style={{ color: "#0369a1" }}>Playing…</span>
          </div>
        )}

        {/* Transcript toggle */}
        <button
          onClick={() => setShowTranscript((v) => !v)}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold transition px-3 py-1.5 rounded-xl border hover:opacity-80"
          style={{ color: "#0369a1", backgroundColor: "#ffffff", borderColor: "#bae6fd" }}
        >
          {showTranscript ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showTranscript ? "Hide Transcript" : "Show Transcript"}
        </button>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Transcript */}
      {showTranscript && (
        <div className="mx-4 mb-4 bg-white rounded-xl border border-sky-200 p-4">
          <p className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> Transcript
          </p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{scriptText}</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Smart message renderer — detects [AUDIO_SCRIPT] + [SPEAKING_PROMPT] blocks
// ─────────────────────────────────────────────────────────────
const SCRIPT_RE = /\[AUDIO_SCRIPT\]([\s\S]*?)\[\/AUDIO_SCRIPT\]/g;
const SPEAK_RE  = /\[SPEAKING_PROMPT\]([\s\S]*?)\[\/SPEAKING_PROMPT\]/g;

// Parse the fields inside [SPEAKING_PROMPT] block
function parseSpeakingBlock(raw: string) {
  const get = (key: string) => {
    const m = raw.match(new RegExp(`${key}:\\s*(.+)`));
    return m ? m[1].trim() : "";
  };
  return {
    prompt:   get("PROMPT"),
    level:    get("LEVEL"),
    hint:     get("HINT"),
    timeHint: get("TIME_HINT"),
    weakEx:   get("WEAK_EXAMPLE"),
    strongEx: get("STRONG_EXAMPLE"),
    structure:get("STRUCTURE"),
    phrases:  get("PHRASES").split("|").map(p => p.trim()).filter(Boolean),
  };
}

// ─────────────────────────────────────────────────────────────
// Speaking Recorder Card
// ─────────────────────────────────────────────────────────────
interface SpeakingRecorderCardProps {
  rawBlock: string;
  apiSettings: any;
  onTranscribed: (text: string) => void;
}

const SpeakingRecorderCard: React.FC<SpeakingRecorderCardProps> = ({ rawBlock, apiSettings, onTranscribed }) => {
  const data = parseSpeakingBlock(rawBlock);
  const [recState, setRecState] = useState<"idle" | "recording" | "processing" | "done">("idle");
  const [transcript, setTranscript] = useState("");
  const [recSeconds, setRecSeconds] = useState(0);
  const [showExamples, setShowExamples] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<any>(null);

  const startRecording = async () => {
    setError(null);
    setTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => stream.getTracks().forEach(t => t.stop());
      mr.start();
      mediaRef.current = mr;
      setRecState("recording");
      setRecSeconds(0);
      tickRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch (e: any) {
      setError("Microphone access denied. Please allow microphone in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state === "recording") {
      mediaRef.current.stop();
    }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setRecState("processing");
    setTimeout(() => transcribeAudio(), 300);
  };

  const transcribeAudio = async () => {
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const provider = apiSettings?.provider ?? "openai";
    const key = provider === "openai" ? apiSettings?.openAIKey
      : provider === "groq" ? apiSettings?.groqKey : null;

    if (!key) {
      // Web Speech API fallback message
      setError("Transcription requires OpenAI or Groq API. Please type your answer below.");
      setRecState("idle");
      return;
    }

    try {
      const formData = new FormData();
      const ext = mimeType.includes("webm") ? "webm" : "mp4";
      formData.append("file", blob, `recording.${ext}`);
      formData.append("model", provider === "groq" ? "whisper-large-v3" : "whisper-1");
      formData.append("language", "en");

      const endpoint = provider === "groq"
        ? "https://api.groq.com/openai/v1/audio/transcriptions"
        : "https://api.openai.com/v1/audio/transcriptions";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: formData,
      });

      if (!res.ok) { const e = await res.json(); throw new Error((e as any)?.error?.message ?? "Transcription failed"); }
      const d = await res.json();
      const text = d.text?.trim() ?? "";
      setTranscript(text);
      setRecState("done");
    } catch (e: any) {
      setError(`Transcription error: ${e.message}`);
      setRecState("idle");
    }
  };

  const submitTranscript = () => {
    if (transcript.trim()) {
      onTranscribed(transcript.trim());
      setRecState("idle");
      setTranscript("");
    }
  };

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  return (
    <div className="my-3 rounded-2xl overflow-hidden shadow-sm" style={{ border: "2px solid #fca5a5", background: "linear-gradient(135deg, #fff7f7 0%, #fff1f2 100%)" }}>

      {/* Header */}
      <div style={{ background: "#fee2e2", borderBottom: "1px solid #fca5a5" }} className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
          <Mic className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: "#7f1d1d" }}>🎙️ Speaking Prompt</p>
          <p className="text-xs mt-0.5" style={{ color: "#dc2626" }}>Record your answer or type it below</p>
        </div>
        {data.timeHint && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#fecaca", color: "#991b1b" }}>
            ⏱ {data.timeHint}
          </span>
        )}
      </div>

      {/* Prompt */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#991b1b" }}>Your Question</p>
        <div className="rounded-xl p-4 text-sm font-medium leading-relaxed" style={{ background: "#ffffff", border: "1px solid #fca5a5", color: "#1f2937" }}>
          {data.prompt || "Speak your answer to the prompt above."}
        </div>
      </div>

      {/* Hints & Phrases */}
      {(data.phrases.length > 0 || data.hint || data.structure) && (
        <div className="px-4 pb-3 space-y-2">
          {data.hint && (
            <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
              💡 <strong>Tip:</strong> {data.hint}
            </div>
          )}
          {data.structure && (
            <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#14532d" }}>
              📐 <strong>Structure:</strong> {data.structure}
            </div>
          )}
          {data.phrases.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-1.5" style={{ color: "#991b1b" }}>Useful phrases you can use:</p>
              <div className="flex flex-wrap gap-1.5">
                {data.phrases.map((ph, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#fff1f2", border: "1px solid #fca5a5", color: "#be123c" }}>
                    "{ph}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weak/Strong examples toggle */}
      {(data.weakEx || data.strongEx) && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowExamples(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold transition"
            style={{ color: "#dc2626" }}
          >
            <Eye className="w-3.5 h-3.5" />
            {showExamples ? "Hide Examples" : "See Weak vs Strong Example"}
          </button>
          {showExamples && (
            <div className="mt-2 space-y-2">
              {data.weakEx && (
                <div className="rounded-xl p-3 text-xs" style={{ background: "#fff7f7", border: "1px solid #fca5a5" }}>
                  <p className="font-bold mb-1" style={{ color: "#dc2626" }}>❌ Weak Answer</p>
                  <p style={{ color: "#374151" }}>{data.weakEx}</p>
                </div>
              )}
              {data.strongEx && (
                <div className="rounded-xl p-3 text-xs" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                  <p className="font-bold mb-1" style={{ color: "#16a34a" }}>✅ Strong Answer</p>
                  <p style={{ color: "#374151" }}>{data.strongEx}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recorder controls */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {recState === "idle" && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", minWidth: "150px", justifyContent: "center" }}
            >
              <Mic className="w-4 h-4" /> Start Recording
            </button>
          )}

          {recState === "recording" && (
            <>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                style={{ background: "#dc2626", minWidth: "150px", justifyContent: "center" }}
              >
                <StopCircle className="w-4 h-4" /> Stop  ({fmtSec(recSeconds)})
              </button>
              {/* Recording indicator */}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                <span className="text-sm font-semibold" style={{ color: "#dc2626" }}>Recording… {fmtSec(recSeconds)}</span>
              </div>
            </>
          )}

          {recState === "processing" && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: "#fee2e2" }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#dc2626" }} />
              <span className="text-sm font-semibold" style={{ color: "#dc2626" }}>Transcribing…</span>
            </div>
          )}

          {recState === "done" && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition hover:opacity-80"
              style={{ background: "#fff", borderColor: "#fca5a5", color: "#dc2626" }}
            >
              <Mic className="w-3.5 h-3.5" /> Re-record
            </button>
          )}
        </div>

        {/* Transcript result */}
        {recState === "done" && transcript && (
          <div className="space-y-2">
            <p className="text-xs font-bold" style={{ color: "#991b1b" }}>📝 Your transcribed answer:</p>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              rows={3}
              className="w-full rounded-xl text-sm resize-none focus:outline-none px-3 py-2.5"
              style={{ background: "#ffffff", border: "1.5px solid #fca5a5", color: "#1f2937" }}
            />
            <div className="flex gap-2">
              <button
                onClick={submitTranscript}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
              >
                <CheckCheck className="w-4 h-4" /> Submit Answer
              </button>
              <p className="text-xs self-center" style={{ color: "#6b7280" }}>You can edit the text before submitting</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ExerciseLabelText — renders "Exercise X of Y:" bolded on its own line
// ─────────────────────────────────────────────────────────────
const ExerciseLabelText: React.FC<{ text: string }> = ({ text }) => {
  // Strip markdown: **, ###, leading asterisks
  const clean = text
    .replace(/^#{1,6}\s*/gm, "")  // strip ### headers
    .replace(/\*\*/g, "")
    .replace(/^\*+|\*+$/gm, "")
    .trim();
  const match = clean.match(/^([\s\S]*?)(Exercise\s+\d+\s+of\s+\d+)\s*:?\s*([\s\S]*)/i);
  if (!match) return <div className="whitespace-pre-wrap">{clean}</div>;
  const before = match[1].replace(/\s*:?\s*$/, "").trim();
  const label  = match[2].trim();
  const after  = match[3].trim();
  return (
    <div>
      {before ? <p className="whitespace-pre-wrap mb-2">{before}</p> : null}
      <p className="font-bold text-gray-900 text-sm">{label}</p>
      {after ? <p className="whitespace-pre-wrap mt-1 text-gray-800">{after}</p> : null}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Smart message renderer — detects [AUDIO_SCRIPT] + [SPEAKING_PROMPT] blocks
// ─────────────────────────────────────────────────────────────

const SmartMessage: React.FC<{ text: string; apiSettings: any; onSpeakSubmit: (text: string) => void }> = ({ text, apiSettings, onSpeakSubmit }) => {
  // Tokenize: find [AUDIO_SCRIPT] and [SPEAKING_PROMPT] blocks
  type Part = { type: "text" | "audio" | "speak"; content: string };
  const parts: Part[] = [];

  // Build a combined regex that matches either block type
  const combined = /\[AUDIO_SCRIPT\]([\s\S]*?)\[\/AUDIO_SCRIPT\]|\[SPEAKING_PROMPT\]([\s\S]*?)\[\/SPEAKING_PROMPT\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      parts.push({ type: "audio", content: match[1].trim() });
    } else if (match[2] !== undefined) {
      parts.push({ type: "speak", content: match[2].trim() });
    }
    lastIndex = combined.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return (
    <div>
      {parts.map((p, i) =>
        p.type === "audio" ? (
          <ListeningScriptCard key={i} scriptText={p.content} apiSettings={apiSettings} />
        ) : p.type === "speak" ? (
          <SpeakingRecorderCard key={i} rawBlock={p.content} apiSettings={apiSettings} onTranscribed={onSpeakSubmit} />
        ) : (
          <ExerciseLabelText key={i} text={p.content} />
        )
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Conversation Session — Voice-first back-and-forth
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Pronunciation Session — word-by-word voice practice with scoring
// ─────────────────────────────────────────────────────────────
interface PronWord {
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
}

// Levenshtein similarity 0–100%
function pronunciationScore(target: string, spoken: string): number {
  const a = target.toLowerCase().trim();
  const b = spoken.toLowerCase().trim();
  if (a === b) return 100;
  const la = a.length, lb = b.length;
  if (!la || !lb) return 0;
  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= la; i++)
    for (let j = 1; j <= lb; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return Math.max(0, Math.round((1 - dp[la][lb] / Math.max(la, lb)) * 100));
}

// ── WordPracticeCard ─────────────────────────────────────────
// Self-contained card for one word; handles its own recording/scoring state.
const WordPracticeCard: React.FC<{
  word: PronWord;
  apiSettings: any;
  onScored: (result: { word: string; score: number; spoken: string }) => void;
  disabled: boolean; // another card is currently recording
  onRecordingChange: (isRecording: boolean) => void;
}> = ({ word, apiSettings, onScored, disabled, onRecordingChange }) => {
  const [showMeaning, setShowMeaning] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [recState, setRecState] = useState<"idle" | "recording" | "processing">("idle");
  const [recSeconds, setRecSeconds] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [spoken, setSpoken] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Browser TTS (always available)
  const browserSpeak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.82; u.pitch = 1;
    // Load voices — prefer a natural English voice
    const loadAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const v =
        voices.find(v => v.lang === "en-US" && /samantha|karen|daniel|google/i.test(v.name)) ||
        voices.find(v => v.lang.startsWith("en-US")) ||
        voices.find(v => v.lang.startsWith("en"));
      if (v) u.voice = v;
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(u);
    };
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", loadAndSpeak, { once: true });
    } else {
      loadAndSpeak();
    }
  };

  const speakText = async (text: string) => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    if (audioRef.current) { audioRef.current.pause(); }
    if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null; }
    // Always use browser TTS for reliability across all providers
    browserSpeak(text);
  };

  const startRecording = async () => {
    if (disabled && recState === "idle") return;
    setErr(null);
    setScore(null);
    setSpoken("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => stream.getTracks().forEach(t => t.stop());
      mr.start();
      mediaRef.current = mr;
      setRecState("recording");
      setRecSeconds(0);
      tickRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
      onRecordingChange(true);
    } catch { setErr("Microphone access denied."); }
  };

  const stopAndScore = async () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setRecState("processing");
    onRecordingChange(false);
    await new Promise(r => setTimeout(r, 300));

    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const provider = apiSettings?.provider ?? "openai";
    const key = provider === "groq" ? apiSettings?.groqKey : apiSettings?.openAIKey;

    if (!key || (provider !== "openai" && provider !== "groq")) {
      setErr("Voice scoring requires OpenAI or Groq API.");
      setRecState("idle");
      return;
    }
    try {
      const fd = new FormData();
      const ext = mimeType.includes("webm") ? "webm" : "mp4";
      fd.append("file", blob, `rec.${ext}`);
      fd.append("model", provider === "groq" ? "whisper-large-v3" : "whisper-1");
      fd.append("language", "en");
      const endpoint = provider === "groq"
        ? "https://api.groq.com/openai/v1/audio/transcriptions"
        : "https://api.openai.com/v1/audio/transcriptions";
      const res = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd });
      if (!res.ok) throw new Error("Transcription failed");
      const d = await res.json();
      const spokenText = (d.text ?? "").trim();
      const sc = pronunciationScore(word.word, spokenText);
      setSpoken(spokenText);
      setScore(sc);
      onScored({ word: word.word, score: sc, spoken: spokenText });
    } catch (e: any) {
      setErr(`Error: ${e.message}`);
    } finally {
      setRecState("idle");
    }
  };

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    window.speechSynthesis?.cancel();
  }, []);

  const scoreMeta = score === null ? null
    : score >= 80 ? { bg: "#f0fdf4", border: "#86efac", text: "#15803d", label: "Excellent! 🎉" }
    : score >= 60 ? { bg: "#fffbeb", border: "#fde68a", text: "#b45309", label: "Good try! 👍" }
    : { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", label: "Keep practicing! 💪" };

  return (
    <div className="bg-white rounded-2xl border-2 shadow-sm transition-all"
      style={{ borderColor: score !== null ? (score >= 80 ? "#86efac" : score >= 60 ? "#fde68a" : "#fca5a5") : "#e9d5ff" }}>

      {/* Word header row */}
      <div className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl font-black text-gray-900">{word.word}</span>
            <span className="text-sm text-fuchsia-600 font-mono">{word.phonetic}</span>
            <button
              onClick={() => speakText(word.word)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition hover:opacity-80"
              style={{ background: "#fdf4ff", border: "1px solid #e879f9", color: "#a21caf" }}
            >
              <Volume2 className="w-3 h-3" />
              {isSpeaking ? "Playing…" : "Hear it"}
            </button>
          </div>

          {/* Meaning + Example inline toggles */}
          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={() => setShowMeaning(v => !v)}
              className="text-xs font-semibold px-2.5 py-1 rounded-full transition"
              style={{ background: showMeaning ? "#fdf4ff" : "#f5f5f5", color: showMeaning ? "#a21caf" : "#6b7280", border: "1px solid " + (showMeaning ? "#e879f9" : "#e5e7eb") }}>
              📖 Meaning
            </button>
            <button onClick={() => setShowExample(v => !v)}
              className="text-xs font-semibold px-2.5 py-1 rounded-full transition"
              style={{ background: showExample ? "#faf5ff" : "#f5f5f5", color: showExample ? "#7e22ce" : "#6b7280", border: "1px solid " + (showExample ? "#d8b4fe" : "#e5e7eb") }}>
              💬 Example
            </button>
          </div>
          {showMeaning && (
            <p className="mt-2 text-sm text-gray-700 bg-fuchsia-50 rounded-xl px-3 py-2 border border-fuchsia-100">{word.meaning}</p>
          )}
          {showExample && (
            <div className="mt-2 text-sm text-gray-600 bg-purple-50 rounded-xl px-3 py-2 border border-purple-100 italic flex items-start gap-2">
              <span>"{word.example}"</span>
              <button onClick={() => speakText(word.example)} className="shrink-0 text-purple-600 hover:opacity-70 transition mt-0.5">
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Score badge */}
        {score !== null && (
          <div className="shrink-0 text-center">
            <div className="text-2xl font-black" style={{ color: scoreMeta!.text }}>{score}%</div>
            <div className="text-xs font-semibold" style={{ color: scoreMeta!.text }}>{scoreMeta!.label}</div>
          </div>
        )}
      </div>

      {/* Spoken result */}
      {spoken && score !== null && (
        <div className="mx-5 mb-3 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
          You said: <span className="font-semibold italic text-gray-700">"{spoken}"</span>
          <span className="ml-2 text-gray-400">→ target: <strong>{word.word}</strong></span>
        </div>
      )}
      {err && <p className="mx-5 mb-3 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-1">{err}</p>}

      {/* Mic controls */}
      <div className="px-5 pb-4 flex items-center gap-3">
        {recState === "idle" ? (
          <>
            <button
              onClick={startRecording}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
            >
              <Mic className="w-4 h-4" />
              {score !== null ? "Try again" : "Say it"}
            </button>
            {score === null && (
              <span className="text-xs text-gray-400">Press and speak: <strong className="text-gray-600">{word.word}</strong></span>
            )}
          </>
        ) : recState === "recording" ? (
          <button
            onClick={stopAndScore}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition animate-pulse"
            style={{ background: "#dc2626" }}
          >
            <StopCircle className="w-4 h-4" />
            Stop ({fmtSec(recSeconds)})
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-fuchsia-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Scoring…
          </div>
        )}
      </div>
    </div>
  );
};

// ── PronunciationSession ─────────────────────────────────────
const PronunciationSession: React.FC<{
  builder: Builder;
  mode: Mode;
  level: Level;
  topic: Topic;
  duration: Duration;
  userId?: string;
  onBack: () => void;
}> = ({ builder, mode, level, topic, duration, userId, onBack }) => {
  const [phase, setPhase] = useState<"loading" | "practice" | "done">("loading");
  const [pageWords, setPageWords] = useState<PronWord[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [results, setResults] = useState<{ word: string; score: number; spoken: string }[]>([]);
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [anyRecording, setAnyRecording] = useState(false);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  // Timer
  const totalSecs = DURATIONS.find(d => d.id === duration)?.seconds ?? 300;
  const [secsLeft, setSecsLeft] = useState(totalSecs);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<any>(null);

  const topicLabel = TOPICS.find(t => t.id === topic)?.label ?? topic;
  const levelMap: Record<Level, string> = {
    beginner: "CLB 4-5 (beginner)",
    intermediate: "CLB 6-7 (intermediate)",
    advanced: "CLB 8+ (advanced)",
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Scroll to top when session mounts
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, []);

  // Start timer once practice begins
  useEffect(() => {
    if (!timerStarted || timerExpired) return;
    timerRef.current = setInterval(() => {
      setSecsLeft(prev => {
        if (prev <= 1) {
          setTimerExpired(true);
          setPhase("done");
          // Save to history when timer ends — read results via ref below
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerStarted]);

  // Save history when session ends (phase becomes "done")
  const savedRef = useRef(false);
  useEffect(() => {
    if (phase !== "done" || savedRef.current || !userId) return;
    savedRef.current = true;
    const avg = results.length
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;
    const wordList = results.map(r => r.word).join(", ");
    saveSessionToHistory({
      userId,
      builderType: builder.id,
      mode,
      topic,
      level,
      duration,
      angle: topicLabel,
      summary: `Practiced ${results.length} word${results.length !== 1 ? "s" : ""}: ${wordList || "—"}`,
      score: results.length > 0 ? `${avg}%` : "—",
      completedAt: new Date().toISOString(),
    });
  }, [phase]);

  // Load API settings + first batch
  useEffect(() => {
    (async () => {
      try {
        const settings = await getAPISettings();
        if (!settings?.isConnected) { setError("No AI provider connected."); return; }
        setApiSettings(settings);
        await fetchBatch(settings, new Set());
      } catch (e: any) {
        setError(e.message ?? "Could not load.");
      }
    })();
  }, []);

  const fetchBatch = async (settings: any, used: Set<string>, append = false) => {
    if (!append) setPhase("loading");
    else setLoadingMore(true);

    const seed = Math.floor(Math.random() * 999999);
    const excludeList = Array.from(used).slice(-30).join(", "); // exclude last 30 used words
    const prompt = `Generate exactly 5 English words related to "${topicLabel}" for a ${levelMap[level]} learner to practice pronouncing.

Seed: ${seed} — generate a COMPLETELY RANDOM, DIFFERENT set every call.
${excludeList ? `DO NOT use any of these already-used words: ${excludeList}` : ""}

Return ONLY a valid JSON array, no markdown:
[{"word":"...","phonetic":"/.../ ","meaning":"...","example":"..."}]

Rules:
- 5 words, all relevant to "${topicLabel}"
- Mix difficulty levels naturally
- Phonetic in IPA notation
- Meaning: 1 simple sentence in plain English
- Example: natural sentence using the word`;

    try {
      const reply = await callAI(settings, "You are an English pronunciation coach. Return only valid JSON.", [
        { role: "user", content: prompt }
      ]);
      const clean = reply.replace(/```json|```/g, "").trim();
      const parsed: PronWord[] = JSON.parse(clean);
      const newUsed = new Set([...used, ...parsed.map(w => w.word.toLowerCase())]);
      setUsedWords(newUsed);
      setPageWords(parsed);
      setPhase("practice");
      if (!timerStarted) setTimerStarted(true);
    } catch (e: any) {
      setError(`Could not load words: ${e.message}`);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScored = (result: { word: string; score: number; spoken: string }) => {
    setResults(prev => {
      const withoutDup = prev.filter(r => r.word !== result.word);
      return [...withoutDup, result];
    });
  };

  const nextBatch = () => {
    if (timerExpired) { setPhase("done"); return; }
    fetchBatch(apiSettings, usedWords, true);
  };

  const timerColor = timerExpired ? { text: "#dc2626", bg: "#fef2f2", border: "#fca5a5" }
    : secsLeft > totalSecs * 0.5 ? { text: "#15803d", bg: "#f0fdf4", border: "#86efac" }
    : secsLeft > totalSecs * 0.2 ? { text: "#b45309", bg: "#fffbeb", border: "#fde68a" }
    : { text: "#dc2626", bg: "#fef2f2", border: "#fca5a5" };

  // ── LOADING ──────────────────────────────────────────────────
  if (phase === "loading") return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header — matches practice header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
          <Volume2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">Pronunciation Builder</p>
          <div className="flex items-center gap-1.5">
            {[mode + " mode", level, topicLabel].map(c => (
              <span key={c} className="text-xs bg-fuchsia-50 text-fuchsia-700 px-2 py-0.5 rounded-full capitalize font-medium">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Chat-bubble loading area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl border border-gray-200 p-4 min-h-0">
        <div className="flex gap-2 justify-start">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shrink-0 mt-1 shadow-sm">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-400">
            AI is thinking…
          </div>
        </div>
        {error && <p className="text-red-500 text-xs text-center bg-red-50 border border-red-200 rounded-xl px-4 py-2 mt-4">{error}</p>}
      </div>
    </div>
  );

  // ── DONE / RESULTS ───────────────────────────────────────────
  if (phase === "done") {
    const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-gray-900 text-lg">Session Results</h2>
        </div>
        <div className="bg-gradient-to-br from-fuchsia-50 to-pink-50 border border-fuchsia-200 rounded-2xl p-6 text-center">
          <p className="text-4xl font-black text-fuchsia-600 mb-1">{avg}%</p>
          <p className="text-sm text-fuchsia-700 font-medium">Average Pronunciation Match</p>
          <p className="text-xs text-gray-500 mt-2">{results.length} word{results.length !== 1 ? "s" : ""} practiced</p>
        </div>
        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">{r.word}</p>
                {r.spoken && <p className="text-xs text-gray-500 mt-0.5">You said: "{r.spoken}"</p>}
              </div>
              <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                r.score >= 80 ? "bg-green-100 text-green-700"
                : r.score >= 60 ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
              }`}>{r.score}%</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setSecsLeft(totalSecs); setTimerStarted(false); setTimerExpired(false); setResults([]); setUsedWords(new Set()); fetchBatch(apiSettings, new Set()); }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
          >
            <RotateCcw className="w-4 h-4" /> New Session
          </button>
          <button onClick={onBack} className="px-5 py-3 rounded-2xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50">
            Back to Builders
          </button>
        </div>
      </div>
    );
  }

  // ── PRACTICE ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
          <Volume2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">Pronunciation Builder</p>
          <div className="flex items-center gap-1.5">
            {[mode + " mode", level, topicLabel].map(c => (
              <span key={c} className="text-xs bg-fuchsia-50 text-fuchsia-700 px-2 py-0.5 rounded-full capitalize font-medium">{c}</span>
            ))}
          </div>
        </div>
        {/* Timer */}
        <div className="flex items-center gap-1.5 border rounded-xl px-3 py-1.5 shrink-0 transition-all"
          style={{ color: timerColor.text, background: timerColor.bg, borderColor: timerColor.border }}>
          <Timer className="w-3.5 h-3.5" />
          <span className="text-sm font-bold tabular-nums">{fmtTime(secsLeft)}</span>
          {timerExpired && <span className="text-xs font-semibold ml-0.5">Time's up!</span>}
        </div>
        {/* Words practiced count */}
        <div className="shrink-0 text-center">
          <span className="text-xs font-bold text-gray-500">{results.length}</span>
          <span className="text-xs text-gray-400 ml-0.5">done</span>
        </div>
      </div>

      {/* Word cards */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-3">
        {error && <p className="text-red-500 text-xs text-center bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}
        {pageWords.map((w, i) => (
          <WordPracticeCard
            key={`${w.word}-${i}`}
            word={w}
            apiSettings={apiSettings}
            onScored={handleScored}
            disabled={anyRecording}
            onRecordingChange={setAnyRecording}
          />
        ))}

        {/* Next 5 words button */}
        <button
          onClick={nextBatch}
          disabled={loadingMore || timerExpired}
          className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#fff" }}
        >
          {loadingMore
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading new words…</>
            : timerExpired
            ? <><CheckCircle2 className="w-4 h-4" /> See Results</>
            : <><RotateCcw className="w-4 h-4" /> Next 5 Words</>
          }
        </button>
      </div>
    </div>
  );
};

interface ConvTurn {
  role: "ai" | "user";
  text: string;
  tips?: string[];   // extracted phrase chips
}

const ConversationSession: React.FC<{
  builder: Builder;
  mode: Mode;
  goal: Goal;
  level: Level;
  topic: Topic;
  duration: Duration;
  userId?: string;
  onBack: () => void;
}> = ({ builder, mode, goal, level, topic, duration, userId, onBack }) => {
  const [phase, setPhase] = useState<"start" | "active" | "feedback">("start");
  const [turns, setTurns] = useState<ConvTurn[]>([]);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [recState, setRecState] = useState<"idle" | "recording" | "processing">("idle");
  const [recSeconds, setRecSeconds] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  // Session countdown timer
  const totalConvSecs = DURATIONS.find((d) => d.id === duration)?.seconds ?? 5 * 60;
  const [convSecsLeft, setConvSecsLeft] = useState(totalConvSecs);
  const [convExpired, setConvExpired] = useState(false);
  const convTimerRef = useRef<any>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const topicLabel = TOPICS.find((t) => t.id === topic)?.label ?? topic;
  const systemPrompt = buildSystemPrompt(builder, mode, goal, level, topic, duration);

  // Scroll to top when session mounts
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, []);

  // Scroll to bottom on new turn
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, feedback]);

  // Load API settings
  useEffect(() => {
    getAPISettings().then((s) => {
      if (s?.isConnected) setApiSettings(s);
      else setError("No AI provider connected. Please go to Admin → API Settings.");
    }).catch(() => setError("Could not load API settings."));
  }, []);

  // Countdown — starts when conversation goes active
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => {
      setConvSecsLeft(s => {
        if (s <= 1) { setConvExpired(true); return 0; }
        return s - 1;
      });
    }, 1000);
    convTimerRef.current = id;
    return () => clearInterval(id);
  }, [phase]);

  // Parse AI reply: split off TIPS: line, return { speech, tips[], display }
  const parseTurn = (raw: string): { display: string; tips: string[] } => {
    const tipMatch = raw.match(/^TIPS:\s*(.+)$/m);
    const tips: string[] = tipMatch
      ? tipMatch[1].split("|").map(p => p.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
      : [];
    const display = raw
      .replace(/^TIPS:\s*.+$/m, "")  // remove TIPS line
      .replace(/\[TIP:[^\]]*\]/g, "") // remove old [TIP:] style
      .trim();
    return { display, tips };
  };

  // Render AI text with "Exercise X of Y:" bolded on its own line
  const renderWithExerciseLabel = (text: string) => {
    const clean = text.replace(/\*\*/g, "").replace(/^\*+|\*+$/gm, "");
    const match = clean.match(/^([\s\S]*?)(Exercise\s+\d+\s+of\s+\d+)\s*:?\s*([\s\S]*)/is);
    if (!match) return <span className="whitespace-pre-wrap">{clean}</span>;
    const before = match[1].replace(/\s*:?\s*$/, "").trim();
    const label  = match[2].trim();
    const after  = match[3].trim();
    return (
      <div>
        {before ? <p className="whitespace-pre-wrap mb-2">{before}</p> : null}
        <p className="font-bold text-gray-900 text-sm">{label}</p>
        {after ? <p className="whitespace-pre-wrap mt-1 text-gray-800">{after}</p> : null}
      </div>
    );
  };

  // Speak AI text using OpenAI TTS or browser fallback
  const speakText = async (text: string) => {
    // Only speak the display part (no TIPS line, no brackets)
    const { display } = parseTurn(text);
    const clean = display.replace(/\[.*?\]/g, "").trim();
    if (!clean) return;

    if (audioRef.current) { audioRef.current.pause(); }
    if (audioUrlRef.current) { URL.revokeObjectURL(audioUrlRef.current); audioUrlRef.current = null; }

    const provider = apiSettings?.provider ?? "openai";
    const key = apiSettings?.openAIKey ?? "";

    if (provider === "openai" && key) {
      try {
        setIsAISpeaking(true);
        const res = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: "tts-1", input: clean, voice: "nova", speed: 1.0 }),
        });
        if (!res.ok) throw new Error("TTS failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsAISpeaking(false);
        audio.onerror = () => setIsAISpeaking(false);
        await audio.play();
      } catch {
        setIsAISpeaking(false);
        browserSpeak(clean);
      }
    } else {
      browserSpeak(clean);
    }
  };

  const browserSpeak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 1;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("google"))
      || voices.find(v => v.lang.startsWith("en"));
    if (v) u.voice = v;
    u.onend = () => setIsAISpeaking(false);
    setIsAISpeaking(true);
    window.speechSynthesis.speak(u);
  };

  // AI reply
  const getAIReply = async (newHistory: { role: "user" | "assistant"; content: string }[]) => {
    if (!apiSettings) return;
    setIsAIThinking(true);
    try {
      const reply = await callAI(apiSettings, systemPrompt, newHistory);
      const updated = [...newHistory, { role: "assistant" as const, content: reply }];
      setHistory(updated);
      const { display, tips } = parseTurn(reply);
      setTurns(prev => [...prev, { role: "ai", text: display, tips }]);
      await speakText(reply);
    } catch (e: any) {
      setError(`AI error: ${e.message}`);
    } finally {
      setIsAIThinking(false);
    }
  };

  // Start conversation — AI speaks first
  const startConversation = async () => {
    if (!apiSettings) return;
    setPhase("active");
    setTurns([]);
    setHistory([]);
    setIsAIThinking(true);
    try {
      const reply = await callAI(apiSettings, systemPrompt, []);
      const newHistory = [{ role: "assistant" as const, content: reply }];
      setHistory(newHistory);
      const { display, tips } = parseTurn(reply);
      setTurns([{ role: "ai", text: display, tips }]);
      await speakText(reply);
    } catch (e: any) {
      setError(`Failed to start: ${e.message}`);
    } finally {
      setIsAIThinking(false);
    }
  };

  // Record user voice
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => stream.getTracks().forEach(t => t.stop());
      mr.start();
      mediaRef.current = mr;
      setRecState("recording");
      setRecSeconds(0);
      tickRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone in your browser settings.");
    }
  };

  const stopAndSend = async () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    setRecState("processing");

    await new Promise(r => setTimeout(r, 300));

    // Transcribe
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const provider = apiSettings?.provider ?? "openai";
    const key = provider === "groq" ? apiSettings?.groqKey : apiSettings?.openAIKey;

    let userText = "";
    if (key && (provider === "openai" || provider === "groq")) {
      try {
        const fd = new FormData();
        const ext = mimeType.includes("webm") ? "webm" : "mp4";
        fd.append("file", blob, `rec.${ext}`);
        fd.append("model", provider === "groq" ? "whisper-large-v3" : "whisper-1");
        fd.append("language", "en");
        const endpoint = provider === "groq"
          ? "https://api.groq.com/openai/v1/audio/transcriptions"
          : "https://api.openai.com/v1/audio/transcriptions";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: fd,
        });
        if (!res.ok) throw new Error("Transcription failed");
        const d = await res.json();
        userText = d.text?.trim() ?? "";
      } catch (e: any) {
        setError(`Transcription error: ${e.message}`);
        setRecState("idle");
        return;
      }
    } else {
      setError("Voice transcription requires OpenAI or Groq. Please type your message instead.");
      setRecState("idle");
      return;
    }

    setRecState("idle");
    if (!userText) return;

    // Add user turn and get AI reply
    setTurns(prev => [...prev, { role: "user", text: userText }]);
    const newHistory = [...history, { role: "user" as const, content: userText }];
    setHistory(newHistory);
    await getAIReply(newHistory);
  };

  // Send a pre-written sentence (from tip cards)
  const sendUserText = async (text: string) => {
    if (isAIThinking || isAISpeaking || recState !== "idle") return;
    setTurns(prev => [...prev, { role: "user", text }]);
    const newHistory = [...history, { role: "user" as const, content: text }];
    setHistory(newHistory);
    await getAIReply(newHistory);
  };

  // End conversation and get feedback
  const endConversation = async () => {
    if (!apiSettings || turns.length < 2) return;
    setPhase("feedback");
    setIsFeedbackLoading(true);

    const transcript = turns.map(t => `${t.role === "user" ? "Student" : "AI"}: ${t.text}`).join("\n");
    const feedbackPrompt = `Here is a conversation transcript between a student and an AI partner:

${transcript}

The student is at ${LEVELS.find(l => l.id === level)?.sub ?? level} level, topic: ${topicLabel}.

Please provide detailed conversation feedback structured exactly like this:

---
🎯 OVERALL PERFORMANCE: X/10

✅ WHAT YOU DID WELL:
• [specific strength with example from the conversation]
• [specific strength with example from the conversation]

❌ MISTAKES FOUND:
1. You said: "[exact quote from student]"
   ✏️ Better: "[improved version]"
   📌 Why: [brief rule explanation]

2. You said: "[exact quote]"
   ✏️ Better: "[improved version]"  
   📌 Why: [brief explanation]

(List all significant mistakes)

💬 PHRASES & EXPRESSIONS TO LEARN:
• Instead of "[their phrase]" → try "[native expression]"
• Instead of "[their phrase]" → try "[native expression]"
• New phrase: "[useful expression for this topic]" — meaning: [simple explanation]

🗣️ FLUENCY TIPS:
• [specific tip based on what you saw in their conversation]
• [specific tip]

⭐ HOW A NATIVE SPEAKER WOULD SAY IT:
Take this sentence you said: "[pick one of their sentences]"
A native speaker might say: "[natural version]"
---`;

    try {
      const fb = await callAI(apiSettings, "You are an expert English teacher giving detailed, encouraging feedback.", [
        { role: "user", content: feedbackPrompt }
      ]);
      setFeedback(fb);

      // Save session to Appwrite history
      if (userId) {
        const scoreMatch = fb.match(/OVERALL PERFORMANCE[:\s]+(\d+(?:\.\d+)?\/\d+)/i);
        const score = scoreMatch ? scoreMatch[1] : "—";
        const userTurns = turns.filter(t => t.role === "user").length;
        const summary = `Conversation: ${userTurns} exchange${userTurns !== 1 ? "s" : ""} about ${topicLabel}. ${score !== "—" ? `Score: ${score}.` : ""}`;
        const firstAiText = turns.find(t => t.role === "ai")?.text ?? "";
        const angleMatch = firstAiText.match(/angle[:\s]+["']?([^"'\n.]{5,60})/i);
        await saveSessionToHistory({
          userId,
          builderType: builder.id,
          mode,
          topic,
          level,
          duration,
          angle: angleMatch ? angleMatch[1].trim() : topicLabel,
          summary,
          score,
          completedAt: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      setFeedback(`Could not generate feedback: ${e.message}`);
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── START SCREEN ──────────────────────────────────────────────
  if (phase === "start") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center">
        <button onClick={onBack} className="self-start flex items-center gap-2 text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${builder.gradient} flex items-center justify-center shadow-xl`}>
          <MessageCircle className="w-10 h-10 text-white" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Conversation Builder</h2>
          <p className="text-gray-500 text-sm max-w-md">
            A live voice conversation with your AI partner about <strong>{topicLabel}</strong>.<br />
            Speak naturally — your voice will be transcribed and read aloud by the AI.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-md w-full">
          {[
            { icon: Mic, label: "You speak", desc: "Press & hold to record" },
            { icon: Sparkles, label: "AI replies", desc: "Transcribed + spoken aloud" },
            { icon: CheckCheck, label: "Get feedback", desc: "Full analysis at the end" },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <item.icon className="w-6 h-6 mx-auto mb-2 text-teal-600" />
              <p className="font-semibold text-sm text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}

        <button
          onClick={startConversation}
          disabled={!apiSettings}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}
        >
          <MessageCircle className="w-5 h-5" />
          Start Conversation
        </button>
      </div>
    );
  }

  // ── FEEDBACK SCREEN ───────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-gray-900 text-lg">Conversation Feedback</h2>
        </div>

        {isFeedbackLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
            <p className="text-gray-500">Analyzing your conversation…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{feedback}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setPhase("start"); setTurns([]); setHistory([]); setFeedback(""); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}
              >
                <RotateCcw className="w-4 h-4" /> New Conversation
              </button>
              <button onClick={onBack} className="px-5 py-3 rounded-2xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50">
                Back to Builders
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ACTIVE CONVERSATION SCREEN ────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button onClick={onBack} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">Conversation Builder</p>
          <div className="flex items-center gap-1.5">
            {[mode + " mode", level, topicLabel].map(c => (
              <span key={c} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full capitalize font-medium">{c}</span>
            ))}
          </div>
        </div>
        {isAISpeaking && (
          <div className="flex items-center gap-1.5 text-teal-600 text-xs font-medium">
            <div className="flex gap-0.5 items-end">
              {[1,2,3,4].map(b => (
                <span key={b} className="block w-1 rounded-full animate-bounce bg-teal-500"
                  style={{ height: `${6+b*3}px`, animationDelay: `${b*0.1}s` }} />
              ))}
            </div>
            AI speaking…
          </div>
        )}

        {/* Session countdown timer */}
        <div
          className="flex items-center gap-1.5 border rounded-xl px-3 py-1.5 shrink-0 transition-all"
          style={{
            color: convExpired ? "#dc2626" : convSecsLeft > totalConvSecs * 0.5 ? "#15803d" : convSecsLeft > totalConvSecs * 0.2 ? "#d97706" : "#dc2626",
            background: convExpired ? "#fef2f2" : convSecsLeft > totalConvSecs * 0.5 ? "#f0fdf4" : convSecsLeft > totalConvSecs * 0.2 ? "#fffbeb" : "#fef2f2",
            borderColor: convExpired ? "#fca5a5" : convSecsLeft > totalConvSecs * 0.5 ? "#86efac" : convSecsLeft > totalConvSecs * 0.2 ? "#fde68a" : "#fca5a5",
          }}
        >
          <Timer className="w-3.5 h-3.5" />
          <span className="text-sm font-bold tabular-nums">{fmtSec(convSecsLeft)}</span>
          {convExpired && <span className="text-xs font-semibold ml-0.5">Time's up!</span>}
        </div>

        <button
          onClick={endConversation}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border transition hover:opacity-80"
          style={{ background: "#fff7ed", borderColor: "#fed7aa", color: "#c2410c" }}
        >
          End & Get Feedback
        </button>
      </div>

      {/* Conversation turns */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-2 min-h-0">
        {turns.map((t, i) => (
          <div key={i}>
            <div className={`flex gap-2 ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              {t.role === "ai" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                t.role === "user"
                  ? "bg-teal-600 text-white rounded-br-sm"
                  : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
              }`}>
                {t.role === "ai" ? renderWithExerciseLabel(t.text) : t.text}
              </div>
              {t.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center shrink-0 mt-1 text-white text-xs font-bold">
                  You
                </div>
              )}
            </div>

            {/* Cheatsheet chips — display only, not clickable */}
            {t.role === "ai" && t.tips && t.tips.length > 0 && (
              <div className="ml-10 mt-2">
                <p className="text-xs font-bold mb-2" style={{ color: "#0f766e" }}>
                  💡 Try one of these examples — or speak your own answer:
                </p>
                <div className="flex flex-wrap items-center gap-y-2">
                  {t.tips.map((tip, j) => (
                    <span
                      key={j}
                      className="text-sm font-medium px-3 py-1 rounded-full border select-none"
                      style={{
                        background: "#f0fdfa",
                        borderColor: "#5eead4",
                        color: "#0f766e",
                      }}
                    >
                      "{tip}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {(isAIThinking || recState === "processing") && (
          <div className="flex gap-2 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-400">
              {recState === "processing" ? "Transcribing your voice…" : "AI is thinking…"}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Bottom mic bar */}
      {error && <p className="text-red-600 text-xs text-center mt-2">{error}</p>}
      <div className="mt-3 shrink-0">
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">

          {/* Mic button */}
          {recState === "idle" ? (
            <button
              onClick={startRecording}
              disabled={isAIThinking || isAISpeaking}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition hover:scale-105 active:scale-95 shrink-0 disabled:opacity-40"
              style={{ background: isAIThinking || isAISpeaking ? "#9ca3af" : "linear-gradient(135deg, #ef4444, #dc2626)" }}
            >
              <Mic className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={stopAndSend}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition hover:scale-105 shrink-0 animate-pulse"
              style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
            >
              <StopCircle className="w-6 h-6" />
            </button>
          )}

          {/* Status / recording timer */}
          <div className="flex-1 min-w-0">
            {recState === "recording" ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" style={{ background: "#ef4444" }} />
                <span className="text-sm font-semibold text-red-600">Recording… {fmtSec(recSeconds)}</span>
              </div>
            ) : recState === "processing" ? (
              <p className="text-sm text-gray-500">Transcribing…</p>
            ) : isAISpeaking ? (
              <div className="flex items-center gap-2">
                {[1,2,3,4].map(b => (
                  <span key={b} className="block w-1 rounded-full animate-bounce"
                    style={{ height: `${6+b*2}px`, background: "#0d9488", animationDelay: `${b*0.08}s` }} />
                ))}
                <span className="text-sm text-teal-600 font-medium ml-1">AI speaking…</span>
              </div>
            ) : isAIThinking ? (
              <p className="text-sm text-gray-400">AI is thinking…</p>
            ) : (
              <p className="text-sm text-gray-500">Press mic to reply</p>
            )}
          </div>

          {/* Tap-to-stop hint when recording */}
          {recState === "recording" && (
            <span className="text-xs text-gray-400 shrink-0">tap to send</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// AI Session Chat
// ─────────────────────────────────────────────────────────────
const AISessionChat: React.FC<{
  builder: Builder;
  mode: Mode;
  goal: Goal;
  level: Level;
  topic: Topic;
  duration: Duration;
  userId?: string;
  grammarTopic?: string;
  grammarSubTopic?: string;
  onBack: () => void;
}> = ({ builder, mode, goal, level, topic, duration, userId, grammarTopic, grammarSubTopic, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  // Countdown timer
  const totalSeconds = DURATIONS.find((d) => d.id === duration)?.seconds ?? 5 * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timerRef = useRef<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const systemPrompt = buildSystemPrompt(builder, mode, goal, level, topic, duration, grammarTopic, grammarSubTopic);
  const Icon = builder.icon;

  // Scroll to top when session mounts
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, []);

  const startSession = async (settings: any) => {
    setIsLoading(true);
    setMessages([{ role: "ai", text: "", isLoading: true }]);
    try {
      const reply = await callAI(settings, systemPrompt, []);
      setHistory([{ role: "assistant", content: reply }]);
      setMessages([{ role: "ai", text: reply }]);
    } catch (e: any) {
      setApiError(e.message ?? "Failed to start session.");
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const settings = await getAPISettings();
        if (!settings?.isConnected) {
          setApiError("No AI provider connected. Please go to Admin → API Settings to connect one.");
          return;
        }
        setApiSettings(settings);
        await startSession(settings);
      } catch (e: any) {
        setApiError(e.message ?? "Could not load API settings.");
      }
    })();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start countdown once the first AI message arrives
  useEffect(() => {
    if (messages.length > 0 && !messages[0].isLoading && !timerStarted && !apiError) {
      setTimerStarted(true);
    }
  }, [messages, timerStarted, apiError]);

  useEffect(() => {
    if (!timerStarted || timerExpired) return;

    const tick = () => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    };

    timerRef.current = setInterval(tick, 1000);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      clearInterval(timerRef.current);
    };
  }, [timerStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Separate effect: mark expired when secondsLeft hits 0
  useEffect(() => {
    if (timerStarted && secondsLeft === 0 && !timerExpired) {
      setTimerExpired(true);
      clearInterval(timerRef.current);
      saveCurrentHistory(); // auto-save when timer ends
    }
  }, [secondsLeft, timerStarted, timerExpired]);

  const saveCurrentHistory = async () => {
    if (!userId || messages.length < 2) return;
    const topicLbl = TOPICS.find((t) => t.id === topic)?.label ?? topic;
    // Extract the angle from the first AI message if it mentions one
    const firstAiMsg = messages.find(m => m.role === "ai" && !m.isLoading)?.text ?? "";
    const angleMatch = firstAiMsg.match(/angle[:\s]+["']?([^"'\n.]{5,60})/i);
    const angle = angleMatch ? angleMatch[1].trim() : "—";
    // Build a compact summary from exchanges
    const userMsgs = messages.filter(m => m.role === "user").map(m => m.text);
    const summary = userMsgs.length > 0
      ? `Practiced ${userMsgs.length} exchange${userMsgs.length !== 1 ? "s" : ""}. Topics covered: ${topicLbl}.`
      : `${builder.title} session — ${topicLbl}`;
    await saveSessionToHistory({
      userId,
      builderType: builder.id,
      mode,
      topic,
      level,
      duration,
      angle,
      summary,
      score: "—",
      completedAt: new Date().toISOString(),
    });
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading || !apiSettings) return;
    setInput("");
    await sendDirect(text);
  };

  // Sends a message directly (used by recorder Submit button)
  const sendDirect = async (text: string) => {
    if (!text || isLoading || !apiSettings) return;

    const newHistory: { role: "user" | "assistant"; content: string }[] = [
      ...history,
      { role: "user", content: text },
    ];

    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "ai", text: "", isLoading: true },
    ]);
    setIsLoading(true);

    try {
      const reply = await callAI(apiSettings, systemPrompt, newHistory);
      const updatedHistory = [...newHistory, { role: "assistant" as const, content: reply }];
      setHistory(updatedHistory);
      setMessages((prev) => [...prev.slice(0, -1), { role: "ai", text: reply }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", text: `⚠️ Error: ${e.message}. Please try again.` },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const restart = () => {
    setMessages([]);
    setHistory([]);
    setApiError(null);
    setInput("");
    setSecondsLeft(totalSeconds);
    setTimerStarted(false);
    setTimerExpired(false);
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (apiSettings) startSession(apiSettings);
  };

  const topicLabel = TOPICS.find((t) => t.id === topic)?.label ?? topic;

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };
  const timerColor =
    timerExpired
      ? "text-red-600 bg-red-50 border-red-200"
      : secondsLeft > totalSeconds * 0.5
      ? "text-green-700 bg-green-50 border-green-200"
      : secondsLeft > totalSeconds * 0.2
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] sm:h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 shrink-0 flex-wrap">
        <button onClick={async () => { await saveCurrentHistory(); onBack(); }} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${builder.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">{builder.title}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {[
              { label: mode + " mode", color: "bg-blue-100 text-blue-700" },
              { label: level, color: "bg-green-100 text-green-700" },
              {
                label: builder.id === "grammar" && grammarTopic
                  ? (GRAMMAR_TOPICS.find(g => g.id === grammarTopic)?.label ?? topicLabel)
                  : topicLabel,
                color: builder.id === "grammar" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700",
              },
            ].map((c) => (
              <span key={c.label} className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${c.color}`}>
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* Countdown timer */}
        <div className={`flex items-center gap-1.5 border rounded-xl px-2.5 py-1.5 shrink-0 transition-all ${timerColor}`}>
          <Timer className="w-3.5 h-3.5" />
          <span className="text-sm font-bold tabular-nums">{fmtTime(secondsLeft)}</span>
          {timerExpired && <span className="hidden sm:inline text-xs font-semibold ml-0.5">Time's up!</span>}
        </div>

        <button onClick={restart} title="Restart session" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition shrink-0">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Error */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center space-y-2">
          <p className="text-red-700 font-semibold text-sm">⚠️ Could not connect to AI</p>
          <p className="text-red-600 text-sm">{apiError}</p>
          <p className="text-gray-500 text-xs mt-1">Admin → Settings → API Settings to connect a provider.</p>
        </div>
      )}

      {/* Chat window */}
      {!apiError && (
        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-4 min-h-0">
          {messages.length === 0 && isLoading && (
            <div className="flex items-center justify-center h-full text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Starting your session…</span>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "ai" && (
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${builder.gradient} flex items-center justify-center shrink-0 mt-1 shadow-sm`}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI is thinking…</span>
                  </div>
                ) : (
                  <SmartMessage
                    text={msg.text}
                    apiSettings={apiSettings}
                    onSpeakSubmit={(transcribed) => {
                      void sendDirect(transcribed);
                    }}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input */}
      {!apiError && (
        <div className="mt-3 flex gap-2 items-end shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your answer…"
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none rounded-2xl border border-gray-300 bg-white px-3 sm:px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50 shadow-sm"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow transition-all shrink-0 ${
              isLoading || !input.trim()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : `bg-gradient-to-br ${builder.gradient} text-white hover:opacity-90`
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Setup Wizard (Builder Detail)
// ─────────────────────────────────────────────────────────────
const Chip: React.FC<{ selected: boolean; onClick: () => void; children: React.ReactNode }> = ({ selected, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
      selected ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
    }`}
  >
    {children}
  </button>
);

const BuilderDetailPage: React.FC<{
  builder: Builder;
  isProMember: boolean;
  onBack: () => void;
  openUpgradeModal: (msg?: string) => void;
  userId?: string;
}> = ({ builder, isProMember, onBack, openUpgradeModal, userId }) => {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [duration, setDuration] = useState<Duration | null>(null);
  const [mode, setMode] = useState<Mode>("learn");
  const [grammarTopic, setGrammarTopic] = useState<string | null>(null);
  const [grammarSubTopic, setGrammarSubTopic] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Scroll to top whenever this page mounts (hub → detail navigation)
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, []);

  const isGrammar = builder.id === "grammar";
  const canStart = !!(goal && level && topic && duration && (!isGrammar || (grammarTopic && grammarSubTopic)));

  const Icon = builder.icon;
  const modeItems = mode === "learn" ? builder.learnItems : mode === "practice" ? builder.practiceItems : builder.examItems;

  if (sessionStarted && goal && level && topic && duration) {
    if (builder.id === "conversation") {
      return (
        <ConversationSession
          builder={builder}
          mode={mode}
          goal={goal}
          level={level}
          topic={topic}
          duration={duration}
          userId={userId}
          onBack={() => setSessionStarted(false)}
        />
      );
    }
    if (builder.id === "pronunciation") {
      return (
        <PronunciationSession
          builder={builder}
          mode={mode}
          level={level}
          topic={topic}
          duration={duration}
          userId={userId}
          onBack={() => setSessionStarted(false)}
        />
      );
    }
    return (
      <AISessionChat
        builder={builder}
        mode={mode}
        goal={goal}
        level={level}
        topic={topic}
        duration={duration}
        userId={userId}
        grammarTopic={grammarTopic ?? undefined}
        grammarSubTopic={grammarSubTopic ?? undefined}
        onBack={() => setSessionStarted(false)}
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
        <ArrowLeft className="w-5 h-5" /> Back to AI Skill Builders
      </button>

      {/* Full-width hero */}
      <div className={`bg-gradient-to-br ${builder.gradient} rounded-2xl p-5 sm:p-6 text-white shadow-lg`}>
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Icon className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">{builder.title}</h2>
            <p className="text-white/80 text-sm mt-1">{builder.description}</p>
          </div>
        </div>
      </div>

      {/* Mode selector — full width horizontal tabs */}
      <div className="bg-gray-100 rounded-2xl p-1.5 flex gap-1.5">
        {(["learn", "practice", "exam"] as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${
              mode === m ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-800 hover:bg-white"
            }`}>
            {m === "learn" ? "📖 Learn Mode" : m === "practice" ? "🏋️ Practice Mode" : "🎯 Exam Mode"}
          </button>
        ))}
      </div>

      {/* Mode description — full width */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          In <span className="text-blue-600 capitalize">{mode} mode</span> you will:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {modeItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />{item}
            </div>
          ))}
        </div>
      </div>

      {/* Config sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Goal */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-bold text-gray-800 mb-3">
            <span className="inline-flex w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold items-center justify-center mr-2">1</span>
            Choose your goal
          </p>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((g) => (
              <button key={g.id} onClick={() => setGoal(g.id)}
                className={`rounded-xl border-2 px-3 py-3 text-left transition-all ${
                  goal === g.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}>
                <p className="font-semibold text-sm text-gray-900">{g.emoji} {g.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{g.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-bold text-gray-800 mb-3">
            <span className="inline-flex w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold items-center justify-center mr-2">2</span>
            Choose your level
          </p>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((l) => (
              <button key={l.id} onClick={() => setLevel(l.id)}
                className={`rounded-xl border-2 p-3 text-center transition-all ${
                  level === l.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}>
                <p className="font-semibold text-sm text-gray-900">{l.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{l.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 3 — Grammar Rule (grammar only, full width) */}
      {isGrammar && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm font-bold text-gray-800 mb-3">
            <span className="inline-flex w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold items-center justify-center mr-2">3</span>
            Choose a grammar rule
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GRAMMAR_TOPICS.map((g) => (
              <button key={g.id}
                onClick={() => { setGrammarTopic(g.id); setGrammarSubTopic(null); }}
                className={`flex items-start gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                  grammarTopic === g.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                }`}>
                <span className="text-lg shrink-0">{g.emoji}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-gray-900 leading-snug">{g.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">{g.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3b — Grammar sub-topic (appears after selecting a rule, full width) */}
      {isGrammar && grammarTopic && (
        <div className="bg-blue-50 rounded-2xl border-2 border-blue-200 p-5">
          <p className="text-sm font-bold text-gray-800 mb-1">
            <span className="inline-flex w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold items-center justify-center mr-2">3b</span>
            What specifically about <span className="text-blue-600">{GRAMMAR_TOPICS.find(g => g.id === grammarTopic)?.label}</span>?
          </p>
          <p className="text-xs text-gray-500 mb-3 ml-8">Pick the exact aspect you want to learn or practice.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {(GRAMMAR_SUBTOPICS[grammarTopic] ?? []).map((s) => (
              <button key={s.id}
                onClick={() => setGrammarSubTopic(s.id)}
                className={`flex flex-col gap-1 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                  grammarSubTopic === s.id ? "border-blue-500 bg-white shadow-sm" : "border-blue-100 bg-white hover:border-blue-300"
                }`}>
                <p className="font-semibold text-xs text-gray-900 leading-snug">{s.label}</p>
                <p className="text-xs text-gray-400 leading-snug line-clamp-2">{s.desc}</p>
                {grammarSubTopic === s.id && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4 (grammar: scenario + session length side-by-side) or Step 4 (non-grammar: topic + session length in original 2×2) */}
      {isGrammar ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Scenario context */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-800 mb-1">
              <span className="inline-flex w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold items-center justify-center mr-2">4</span>
              Choose a scenario context
            </p>
            <p className="text-xs text-gray-500 mb-3">AI sets all grammar examples in this real-life context.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TOPICS.map((t) => (
                <Chip key={t.id} selected={topic === t.id} onClick={() => setTopic(t.id)}>
                  {t.emoji} {t.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Session length */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-800 mb-3">
              <span className="inline-flex w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold items-center justify-center mr-2">5</span>
              Session length
            </p>
            <div className="space-y-2">
              {DURATIONS.map((d) => (
                <button key={d.id} onClick={() => setDuration(d.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                    duration === d.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">{d.label}</p>
                    <p className="text-xs text-gray-500">{d.desc}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{d.time}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Non-grammar: topic + session length side-by-side (original layout) */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-800 mb-3">
              <span className="inline-flex w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold items-center justify-center mr-2">3</span>
              Choose a topic
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TOPICS.map((t) => (
                <Chip key={t.id} selected={topic === t.id} onClick={() => setTopic(t.id)}>
                  {t.emoji} {t.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-800 mb-3">
              <span className="inline-flex w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold items-center justify-center mr-2">4</span>
              Session length
            </p>
            <div className="space-y-2">
              {DURATIONS.map((d) => (
                <button key={d.id} onClick={() => setDuration(d.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                    duration === d.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">{d.label}</p>
                    <p className="text-xs text-gray-500">{d.desc}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{d.time}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Start button — full width at the bottom */}
      <div className="flex flex-col items-center gap-3 pb-2">
        <button
          disabled={!canStart}
          onClick={() => {
            if (!isProMember) { openUpgradeModal("Upgrade to Pro to unlock unlimited AI Skill Builder sessions."); return; }
            setSessionStarted(true);
          }}
          className={`w-full py-4 rounded-2xl text-base font-bold transition flex items-center justify-center gap-3 shadow-lg ${
            canStart
              ? `bg-gradient-to-r ${builder.gradient} text-white hover:opacity-90`
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}>
          <Sparkles className="w-5 h-5" />
          Start AI Session
          {canStart && (
            <span className="text-white/70 text-xs sm:text-sm font-normal ml-1 truncate max-w-[200px] sm:max-w-none">
              · {mode} · {level}
              {isGrammar && grammarTopic
                ? ` · ${GRAMMAR_TOPICS.find(g => g.id === grammarTopic)?.label}${grammarSubTopic ? ` → ${GRAMMAR_SUBTOPICS[grammarTopic]?.find(s => s.id === grammarSubTopic)?.label ?? ""}` : ""}`
                : topic ? ` · ${TOPICS.find(t => t.id === topic)?.label}` : ""}
              · {DURATIONS.find(d => d.id === duration)?.time}
            </span>
          )}
        </button>

        {!isProMember && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> Pro membership required for live AI sessions
          </p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// HistoryView — shows all past AI sessions for this user
// ─────────────────────────────────────────────────────────────
const BUILDER_META: Record<string, { label: string; color: string; bg: string }> = {
  vocabulary:     { label: "Vocabulary",    color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200" },
  grammar:        { label: "Grammar",       color: "text-cyan-700",    bg: "bg-cyan-50 border-cyan-200" },
  listening:      { label: "Listening",     color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  reading:        { label: "Reading",       color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  writing:        { label: "Writing",       color: "text-violet-700",  bg: "bg-violet-50 border-violet-200" },
  speaking:       { label: "Speaking",      color: "text-orange-700",  bg: "bg-orange-50 border-orange-200" },
  pronunciation:  { label: "Pronunciation", color: "text-fuchsia-700", bg: "bg-fuchsia-50 border-fuchsia-200" },
  conversation:   { label: "Conversation",  color: "text-rose-700",    bg: "bg-rose-50 border-rose-200" },
  "mistake-review":{ label: "Mistake Review",color:"text-slate-700",  bg: "bg-slate-50 border-slate-200" },
};

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

const HistoryView: React.FC<{
  records: SessionHistoryRecord[];
  loading: boolean;
  onBack: () => void;
  onReload: () => void;
}> = ({ records, loading, onBack, onReload }) => {
  const [filter, setFilter] = useState<string>("all");

  const builderTypes = Array.from(new Set(records.map(r => r.builderType)));
  const filtered = filter === "all" ? records : records.filter(r => r.builderType === filter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-xl">My Practice History</h2>
          <p className="text-sm text-gray-500 mt-0.5">All your past AI Skill Builder sessions</p>
        </div>
        <button onClick={onReload} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-black text-indigo-600">{records.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Sessions</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-black text-violet-600">{builderTypes.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Builders Used</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-black text-teal-600">
              {records.filter(r => r.score && r.score !== "—").length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Scored Sessions</p>
          </div>
        </div>
      )}

      {/* Filter pills */}
      {builderTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${filter === "all" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
          >
            All ({records.length})
          </button>
          {builderTypes.map(bt => {
            const meta = BUILDER_META[bt];
            const count = records.filter(r => r.builderType === bt).length;
            return (
              <button
                key={bt}
                onClick={() => setFilter(bt)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${filter === bt ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
              >
                {meta?.label ?? bt} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading your history…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && records.length === 0 && (
        <div className="text-center py-20">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">No sessions yet</p>
          <p className="text-sm text-gray-400 mt-1">Start a session and it will appear here</p>
        </div>
      )}

      {/* Records */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((r, i) => {
            const meta = BUILDER_META[r.builderType];
            const topicLabel = TOPICS.find(t => t.id === r.topic)?.label ?? r.topic;
            return (
              <div key={r.$id ?? i} className={`bg-white rounded-2xl border p-4 ${meta?.bg ?? "border-gray-200"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${meta?.bg ?? ""} ${meta?.color ?? "text-gray-700"}`}>
                        {meta?.label ?? r.builderType}
                      </span>
                      <span className="text-xs font-medium text-gray-500 capitalize">{r.mode} mode</span>
                      <span className="text-xs text-gray-400 hidden sm:inline">·</span>
                      <span className="text-xs text-gray-500 capitalize hidden sm:inline">{r.level}</span>
                      <span className="text-xs text-gray-400 hidden sm:inline">·</span>
                      <span className="text-xs text-gray-500 hidden sm:inline">{topicLabel}</span>
                    </div>
                    {/* Show level + topic on mobile as a second line */}
                    <p className="text-xs text-gray-500 sm:hidden capitalize mb-1">{r.level} · {topicLabel}</p>
                    {r.angle && r.angle !== "—" && (
                      <p className="text-sm font-semibold text-gray-800 mt-1">📌 {r.angle}</p>
                    )}
                    {r.summary && r.summary !== "—" && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.summary}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{fmtDate(r.completedAt)}</span>
                    </div>
                  </div>
                  {r.score && r.score !== "—" && (
                    <div className="shrink-0 text-right">
                      <span className={`text-lg font-black ${meta?.color ?? "text-gray-700"}`}>{r.score}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Hub
// ─────────────────────────────────────────────────────────────
interface AISkillBuildersProps {
  isProMember: boolean;
  openUpgradeModal: (msg?: string) => void;
  onBack: () => void;
  userId?: string;
}

const AISkillBuilders: React.FC<AISkillBuildersProps> = ({ isProMember, openUpgradeModal, onBack, userId }) => {
  const [activeBuilder, setActiveBuilder] = useState<Builder | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<SessionHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    if (!userId) return;
    setHistoryLoading(true);
    const records = await loadUserHistory(userId);
    setHistoryRecords(records);
    setHistoryLoading(false);
  };

  // Load history count on mount so the number shows on the card
  useEffect(() => {
    if (userId) loadHistory();
  }, [userId]);

  if (activeBuilder) {
    return (
      <BuilderDetailPage
        builder={activeBuilder}
        isProMember={isProMember}
        onBack={() => setActiveBuilder(null)}
        openUpgradeModal={openUpgradeModal}
        userId={userId}
      />
    );
  }

  if (showHistory) {
    return (
      <HistoryView
        records={historyRecords}
        loading={historyLoading}
        onBack={() => setShowHistory(false)}
        onReload={loadHistory}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-4">
          <ArrowLeft className="w-5 h-5" />Back to Dashboard
        </button>

        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white/80 text-sm font-semibold uppercase tracking-widest">AI Practice Hub</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">AI Skill Builders</h1>
                <p className="text-white/80 max-w-lg text-sm leading-relaxed">
                  Practice English freely with personalized AI coaching. Pick a builder, configure your session, and start learning with live AI feedback.
                </p>
              </div>
              {userId && (
                <button
                  onClick={() => { setShowHistory(true); loadHistory(); }}
                  className="self-start shrink-0 flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
                >
                  <History className="w-4 h-4" />
                  My History
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {[{ icon: Target, text: "Personalized to your level" }, { icon: Zap, text: "Instant AI feedback" }, { icon: FlaskConical, text: "Learn · Practice · Exam modes" }].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-xs font-medium">
                  <item.icon className="w-3.5 h-3.5" />{item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Choose a Builder</h2>
          <span className="text-sm text-gray-500">{BUILDERS.length} builders available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUILDERS.map((b) => {
            const Icon = b.icon;
            return (
              <button key={b.id} onClick={() => setActiveBuilder(b)}
                className={`group bg-white rounded-2xl border-2 ${b.border} p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${b.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{b.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">{b.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.tag}`}>{TOPICS.length} topics</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">AI-powered</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{b.description}</p>
                <div className={`mt-3 flex items-center gap-1 text-xs font-semibold ${b.accent} group-hover:gap-2 transition-all`}>
                  Start Builder <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

     

      {!isProMember && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold text-amber-800">Unlock AI Skill Builders with Pro</p>
            <p className="text-sm text-amber-700 mt-0.5">Unlimited AI-powered sessions, personalized feedback and all 9 builders.</p>
          </div>
          <button onClick={() => openUpgradeModal("Upgrade to Pro to unlock unlimited AI Skill Builder sessions.")}
            className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition shadow">
            Upgrade to Pro
          </button>
        </div>
      )}
    </div>
  );
};

export default AISkillBuilders;
