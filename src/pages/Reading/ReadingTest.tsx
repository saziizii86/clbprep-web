// src/pages/Reading/ReadingTest.tsx
// Unified Reading Test — Parts 1–4
// Route is determined by the `part` prop (1|2|3|4)
// or auto-detected from scenario.taskId / scenario.taskName / scenario.skill.

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, RotateCcw, ArrowRight } from 'lucide-react';

// ─────────────────────────────────────────────
// Shared Types
// ─────────────────────────────────────────────

type UploadedFiles = {
  sectionTranscripts?: Array<{ data?: string; name?: string } | string>;
  readingPassage?: { data?: string; name?: string } | string;
  questionTexts?: string[];
  questionAnswers?: any[][];
  correctAnswers?: any[];
  paragraphText?: string;
  paragraphTemplate?: string;
  paragraphBlanks?: string[][];
  contextImage?: any;
  contextImageUrl?: string;
  diagramImageUrl?: string;
  diagramImage?: string;
  diagramUrl?: string;
  questions?: { text?: string; question?: string; options?: string[]; answers?: string[]; type?: string }[];
  commentText?: string;
  articleText?: string;
};

type Scenario = {
  id?: string;
  $id?: string;
  title?: string;
  name?: string;
  skill?: string;
  taskName?: string;
  taskId?: string;
  taskType?: string;
  description?: string;
  contextImage?: any;
  uploadedFiles?: UploadedFiles;
  readingPassage?: any;
  questionTexts?: string[];
  correctAnswers?: any[];
  questionAnswers?: any[];
  sectionTranscripts?: any[];
  imageUrl?: string;
  diagramImageUrl?: string;
  articleText?: string;
  paragraphText?: string;
  paragraphBlanks?: string[][];
  answers?: any[];
};

export interface ReadingTestProps {
  /** Explicit part override: 1=Correspondence, 2=Diagram, 3=Information, 4=Viewpoints */
  part?: 1 | 2 | 3 | 4;
  scenario: Scenario;
  onBack: () => void;
  onComplete: (results: any) => void;
}

// ─────────────────────────────────────────────
// Shared Utilities
// ─────────────────────────────────────────────

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${pad2(s)}`;
}

function isLikelyBase64(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith('data:')) return true;
  return /^[A-Za-z0-9+/=\s]+$/.test(t) && t.length > 200;
}

function decodeBase64Maybe(value: any): string {
  if (!value) return '';

  if (typeof value === 'object' && value.data) {
    const raw: string = value.data;
    try {
      if (raw.startsWith('data:')) {
        const comma = raw.indexOf(',');
        return comma !== -1 ? atob(raw.slice(comma + 1)) : raw;
      }
      if (raw.includes(',')) return atob(raw.split(',')[1]);
      return atob(raw);
    } catch {
      return raw;
    }
  }

  if (typeof value === 'string') {
    const t = value.trim();
    try {
      if (t.startsWith('data:')) {
        const comma = t.indexOf(',');
        return comma !== -1 ? atob(t.slice(comma + 1)) : t;
      }
      if (t.includes(',')) return atob(t.split(',')[1]);
      if (isLikelyBase64(t)) return atob(t.replace(/\s/g, ''));
    } catch { /* fall through */ }
    return value;
  }

  if (Array.isArray(value) && value.length) return value.map(String).join('\n');

  return '';
}

function extractTextFlexible(...candidates: any[]): string {
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === 'string' && c.trim()) return decodeBase64Maybe(c);
    if (typeof c === 'object') {
      const maybe =
        c.text ?? c.content ?? c.data ?? c.value ?? c.body ?? c.readingPassage ?? c.articleText;
      if (typeof maybe === 'string' && maybe.trim()) return decodeBase64Maybe(maybe);
      if (Array.isArray(c) && c.length) {
        const joined = c.map(String).join('\n');
        if (joined.trim()) return joined;
      }
    }
    if (Array.isArray(c) && c.length) {
      const joined = c.map(String).join('\n');
      if (joined.trim()) return joined;
    }
  }
  return '';
}

function letterToIndex(v: any): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const upper = s.toUpperCase();
  if (upper === 'A') return 0;
  if (upper === 'B') return 1;
  if (upper === 'C') return 2;
  if (upper === 'D') return 3;
  return undefined;
}

function normalizeAnswerLetter(ans: any): string {
  const OPTS = ['A', 'B', 'C', 'D', 'E'];
  if (ans === null || ans === undefined) return '';
  if (typeof ans === 'number') return OPTS[ans] || '';
  const s = String(ans).trim().toUpperCase();
  if (['1', '2', '3', '4', '5'].includes(s)) return OPTS[parseInt(s, 10) - 1] || '';
  return s;
}

function correctToIndex(correct: any, options: string[]): number | null {
  if (!options.length) return null;
  if (typeof correct === 'number' && Number.isFinite(correct)) {
    const idx = Math.trunc(correct);
    if (idx >= 0 && idx < options.length) return idx;
  }
  if (typeof correct === 'string') {
    const c = correct.trim();
    if (/^[A-E]$/i.test(c)) {
      const idx = c.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
      if (idx >= 0 && idx < options.length) return idx;
    }
    const idx = options.findIndex((o) => o.trim() === c);
    if (idx !== -1) return idx;
  }
  return null;
}

function extractOptionsFromRow(row: any[]): string[] {
  if (!Array.isArray(row)) return [];
  const raw = row
    .slice(1)
    .filter((x) => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
  const last = raw[raw.length - 1];
  const maybeKey = typeof last === 'string' && /^[A-E]$/i.test(last);
  const cleaned = maybeKey ? raw.slice(0, -1) : raw;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const opt of cleaned) {
    if (!seen.has(opt)) { seen.add(opt); out.push(opt); }
  }
  return out;
}

function normalizeInline(s: string) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

const ScoreBanner = ({
  score, total, percentage, msg,
}: { score: number; total: number; percentage: number; msg: { text: string; cls: string } }) => (
  <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
    <div className="flex items-center gap-3">
      <CheckCircle className="w-6 h-6 text-emerald-600" />
      <div>
        <div className="text-xs font-semibold text-emerald-700 tracking-wide">YOUR FINAL SCORE</div>
        <div className="text-xl font-bold text-slate-900">
          {score} / {total} <span className="text-slate-600 text-base">({percentage}%)</span>
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className={`font-semibold ${msg.cls}`}>{msg.text}</div>
      <div className="text-xs text-slate-500">Review your answers below</div>
    </div>
  </div>
);

function getScoreMessage(pct: number) {
  if (pct >= 90) return { text: 'Excellent work!', cls: 'text-emerald-700' };
  if (pct >= 75) return { text: 'Great job!', cls: 'text-emerald-700' };
  if (pct >= 50) return { text: 'Good effort!', cls: 'text-amber-700' };
  return { text: 'Keep practicing!', cls: 'text-rose-700' };
}

function idxToLetter(idx: number | null | undefined): string {
  if (idx === null || idx === undefined || !Number.isFinite(Number(idx)) || Number(idx) < 0) return '-';
  return String.fromCharCode('A'.charCodeAt(0) + Number(idx));
}

function badgeClass(your: string, correct: string): string {
  if (!your || your === '-') return 'bg-slate-100 text-slate-500';
  if (your === correct) return 'bg-emerald-100 text-emerald-700';
  return 'bg-rose-100 text-rose-700';
}

const GreenHeader = ({
  title, subtitle, onBack, timeLeft, onNext,
}: {
  title: string; subtitle?: string; onBack: () => void; timeLeft: number; onNext: () => void;
}) => (
  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm">
    <div className="px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
      <button onClick={onBack} className="flex items-center gap-1 text-white/90 hover:text-white text-sm font-medium shrink-0">
        <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Exit</span>
      </button>
      <span className="hidden sm:block font-semibold text-sm text-center flex-1 truncate px-2">
        {subtitle ? `${title} — ${subtitle}` : title}
      </span>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <span className="text-xs sm:text-sm text-white/90 whitespace-nowrap">
          <span className="hidden sm:inline">Time: </span>
          <strong className="text-white">{formatTime(timeLeft)}</strong>
        </span>
        <button type="button" onClick={onNext}
          className="bg-white text-green-700 hover:bg-green-50 px-3 sm:px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm">
          NEXT
        </button>
      </div>
    </div>
    <div className="sm:hidden px-3 pb-2 text-xs font-medium text-white/90 truncate">
      {subtitle ? `${title} — ${subtitle}` : title}
    </div>
  </div>
);

const StickyBackButton = ({ onBack }: { onBack: () => void }) => (
  <div className="sticky bottom-0 z-30 pt-6">
    <div className="bg-white/80 backdrop-blur border-t border-emerald-100 rounded-2xl">
      <div className="px-6 py-4 flex items-center justify-end">
        <button type="button" onClick={onBack}
          className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600">
          BACK
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// PART 1 — Reading Correspondence
// ─────────────────────────────────────────────

function Part1Correspondence({ scenario, onBack, onComplete }: ReadingTestProps) {
  const [timeRemaining, setTimeRemaining] = useState(660);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(Array(11).fill(null));
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [mobileTab, setMobileTab] = useState<'passage' | 'questions'>('passage');

  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) { handleSubmit(); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, isSubmitted]);

  const getPassageContent = (): string => {
    const transcripts = scenario.uploadedFiles?.sectionTranscripts;
    if (transcripts?.[0]) return decodeBase64Maybe(transcripts[0]);
    if (scenario.uploadedFiles?.readingPassage) return decodeBase64Maybe(scenario.uploadedFiles.readingPassage);
    return scenario.description || 'No reading passage available.';
  };

  const getDropdownQuestions = () => {
    const questionTexts = scenario.uploadedFiles?.questionTexts || [];
    const questionAnswers = scenario.uploadedFiles?.questionAnswers || [];
    return Array.from({ length: 6 }, (_, i) => {
      const row = questionAnswers[i] || [];
      const text = questionTexts[i] || row[0] || `Question ${i + 1}`;
      const options = row.length >= 5
        ? row.slice(1, 5).filter(Boolean)
        : (row.length ? row : ['Option A', 'Option B', 'Option C', 'Option D']);
      return { text, options };
    });
  };

  const getParagraphBlanks = (): string[][] => {
    const blanks = scenario.uploadedFiles?.paragraphBlanks || [];
    if (blanks.length >= 5) return blanks;
    const questionAnswers = scenario.uploadedFiles?.questionAnswers || [];
    return Array.from({ length: 5 }, (_, i) => {
      const raw = questionAnswers[6 + i] || [];
      const hasAdminFormat = Array.isArray(raw) && raw.length >= 5;
      return hasAdminFormat ? raw.slice(1, 5).filter(Boolean) : (raw.length ? raw : ['Option A', 'Option B', 'Option C', 'Option D']);
    });
  };

  const getCorrectIndex = (i: number): number => {
    const direct = scenario.uploadedFiles?.correctAnswers?.[i];
    if (direct !== undefined && direct !== null) {
      if (typeof direct === 'number') return direct;
      const s = String(direct).trim().toLowerCase();
      if (['a', 'b', 'c', 'd'].includes(s)) return ['a', 'b', 'c', 'd'].indexOf(s);
    }
    const row = scenario.uploadedFiles?.questionAnswers?.[i];
    const raw = row?.[5];
    const s2 = String(raw || '').trim().toLowerCase();
    if (['a', 'b', 'c', 'd'].includes(s2)) return ['a', 'b', 'c', 'd'].indexOf(s2);
    return -1;
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (isSubmitted) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[questionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmit = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer !== null && answer === getCorrectIndex(index)) correct++;
    });
    setScore(correct);
    setIsSubmitted(true);
    setShowResults(true);
  };

  const dropdownQuestions = getDropdownQuestions();
  const paragraphBlanks = getParagraphBlanks();

  const renderParagraph = () => {
    const text = scenario.uploadedFiles?.paragraphText;
    if (!text) return null;
    return (
      <div className="space-y-3">
        {text.split('\n').map((line, lineIdx) => (
          <p key={lineIdx}>
            {line.split(/(\{\d+\})/g).map((part, idx) => {
              const match = part.match(/^\{(\d+)\}$/);
              if (!match) return <span key={idx}>{part}</span>;
              const qNum = parseInt(match[1], 10);
              const blankIndex = qNum - 6;
              return (
                <select key={idx} value={selectedAnswers[qNum] ?? ''}
                  onChange={(e) => handleAnswerSelect(qNum, parseInt(e.target.value))}
                  disabled={isSubmitted}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm bg-white mx-1 focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="" disabled hidden />
                  {(paragraphBlanks[blankIndex] || []).map((opt, i) => (
                    <option key={i} value={i}>{opt}</option>
                  ))}
                </select>
              );
            })}
          </p>
        ))}
      </div>
    );
  };

  if (showResults) {
    const total = 11;
    const percentage = Math.round((score / total) * 100);
    const msg = getScoreMessage(percentage);
    const getOptions = (i: number) => i < 6 ? dropdownQuestions[i]?.options || [] : paragraphBlanks[i - 6] || [];

    const handleTryAgain = () => {
      setSelectedAnswers(Array(11).fill(null));
      setTimeRemaining(660);
      setIsSubmitted(false);
      setShowResults(false);
      setScore(0);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <span className="font-semibold text-sm truncate">{scenario.title} — Reading Part 1</span>
          <span className="text-xs sm:text-sm text-white/90 shrink-0 ml-2">Results</span>
        </div>
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl border border-slate-200 flex flex-col">
            <ScoreBanner score={score} total={total} percentage={percentage} msg={msg} />
            <div className="mt-4 sm:mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Answer Key</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Questions & Answers</p>
                </div>
                <button onClick={handleTryAgain}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm">
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Q#', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct', 'Your Answer'].map((h) => (
                        <th key={h} className={`px-3 sm:px-4 py-3 text-xs font-semibold text-slate-600 ${h.includes('Answer') || h === 'Correct' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.from({ length: 11 }).map((_, i) => {
                      const opts = getOptions(i);
                      const correctLetter = idxToLetter(getCorrectIndex(i));
                      const yourLetter = idxToLetter(selectedAnswers[i] ?? -1);
                      return (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-slate-700">{i + 1}</td>
                          {[0, 1, 2, 3].map((oi) => <td key={oi} className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-slate-700">{opts[oi] || '-'}</td>)}
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-sm">{correctLetter}</span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${badgeClass(yourLetter, correctLetter)}`}>{yourLetter}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button onClick={handleTryAgain}
                className="flex-1 py-3 sm:py-4 bg-slate-50 text-slate-700 rounded-2xl font-semibold hover:bg-slate-100 transition-all flex items-center justify-center gap-3">
                <RotateCcw className="w-5 h-5" /> Try Again
              </button>
              <button onClick={() => { onComplete({ score, total: 11, answers: selectedAnswers }); onBack(); }}
                className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-3">
                Back to Scenarios <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 flex flex-col">
      <GreenHeader
        title={`${scenario.title} — Reading Part 1: Reading Correspondence`}
        onBack={onBack}
        timeLeft={timeRemaining}
        onNext={handleSubmit}
      />

      {/* Mobile tab switcher */}
      <div className="sm:hidden flex border-b border-green-200 bg-white sticky top-0 z-10">
        <button
          onClick={() => setMobileTab('passage')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mobileTab === 'passage' ? 'text-green-700 border-b-2 border-green-600 bg-green-50' : 'text-slate-500'}`}>
          📖 Passage
        </button>
        <button
          onClick={() => setMobileTab('questions')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mobileTab === 'questions' ? 'text-green-700 border-b-2 border-green-600 bg-green-50' : 'text-slate-500'}`}>
          ✏️ Questions
        </button>
      </div>

      {/* Desktop: side by side | Mobile: tabbed */}
      <div className="flex-1 flex flex-col sm:flex-row sm:overflow-hidden">
        {/* Passage panel */}
        <div className={`sm:w-1/2 bg-white/90 backdrop-blur-sm sm:border-r border-green-100 sm:overflow-y-auto ${mobileTab === 'passage' ? 'block' : 'hidden sm:block'}`}>
          <div className="p-4 sm:p-6">
            <div className="flex items-start gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">i</div>
              <p className="font-medium text-slate-700 text-sm">Read the following message.</p>
            </div>
            <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{getPassageContent()}</div>
          </div>
        </div>

        {/* Questions panel */}
        <div className={`sm:w-1/2 bg-white/60 backdrop-blur-sm sm:overflow-y-auto ${mobileTab === 'questions' ? 'block' : 'hidden sm:block'}`}>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm">
              <div className="flex items-start gap-2 p-4 border-b border-green-100">
                <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">!</div>
                <p className="font-medium text-slate-700 text-sm">Using the drop-down menu ( ▼ ), choose the best option according to the information given in the message.</p>
              </div>
              <div className="p-4 space-y-4">
                {dropdownQuestions.map((question, qIndex) => (
                  <div key={qIndex} className="flex flex-col gap-2">
                    <span className="text-sm text-gray-700">{qIndex + 1}. {question.text}</span>
                    <select value={selectedAnswers[qIndex] ?? ''}
                      onChange={(e) => handleAnswerSelect(qIndex, parseInt(e.target.value))}
                      disabled={isSubmitted}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="" disabled hidden />
                      {question.options.map((opt, optIdx) => <option key={optIdx} value={optIdx}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm">
              <div className="flex items-start gap-2 p-4 border-b border-green-100">
                <div className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">!</div>
                <p className="font-medium text-slate-700 text-sm">Complete the summary by filling in the blanks. Select the best choice from the drop-down menu ( ▼ ).</p>
              </div>
              <div className="p-4">
                <div className="bg-green-50/60 rounded-xl p-4 text-sm leading-relaxed text-gray-700 border border-green-100">
                  {renderParagraph() ?? <p className="text-gray-500">Paragraph text not found in database.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <StickyBackButton onBack={onBack} />
    </div>
  );
}

// ─────────────────────────────────────────────
// PART 2 — Reading to Apply a Diagram
// ─────────────────────────────────────────────

function Part2Diagram({ scenario, onBack, onComplete }: ReadingTestProps) {
  const TOTAL_SECONDS = 9 * 60;
  const BLANK_COUNT = 5;

  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [phase, setPhase] = useState<'test' | 'results'>('test');
  const [finalResults, setFinalResults] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const diagramUrl: string | null =
    (typeof scenario?.contextImage === 'string' && scenario.contextImage) ||
    (typeof scenario?.contextImage === 'object' && (scenario.contextImage?.data || scenario.contextImage?.storageUrl)) ||
    scenario?.uploadedFiles?.diagramImageUrl ||
    scenario?.uploadedFiles?.diagramImage ||
    scenario?.uploadedFiles?.diagramUrl ||
    scenario?.diagramImageUrl ||
    scenario?.imageUrl ||
    null;

  const paragraphTemplate: string =
    scenario?.uploadedFiles?.paragraphText ||
    scenario?.uploadedFiles?.paragraphTemplate ||
    scenario?.description || '';

  const paragraphBlanks: string[][] =
    (scenario?.uploadedFiles?.paragraphBlanks?.length ?? 0) > 0
      ? scenario!.uploadedFiles!.paragraphBlanks!
      : [];

  const blankOptionsSource: any[] =
    scenario?.uploadedFiles?.questionAnswers ||
    (scenario as any)?.questionAnswers || [];

  const blankOptionsFromQA: string[][] = Array.from({ length: BLANK_COUNT }, (_, i) => {
    const row = blankOptionsSource?.[i] || [];
    return Array.isArray(row)
      ? row.filter((x: any) => typeof x === 'string' && x.trim().length)
           .filter((x: string) => !/^[A-D]$/i.test(x.trim()))
           .slice(0, 4)
      : [];
  });

  const parsedQuestions = useMemo(() => {
    const direct = scenario?.uploadedFiles?.questions;
    if (direct?.length) {
      return direct
        .filter((q: any) => q && (q.type === 'mcq' || !q.type))
        .map((q: any, idx: number) => ({
          text: q.text || q.question || `Question ${BLANK_COUNT + 1 + idx}`,
          options: (q.options || q.answers || []).filter((x: any) => typeof x === 'string' && x.trim()),
        }))
        .filter((q: any) => q.options?.length);
    }

    const questionTexts: string[] = scenario?.uploadedFiles?.questionTexts || [];
    const rows: any[] = scenario?.uploadedFiles?.questionAnswers || [];
    if (!rows.length) return [];

    let mcqRows = rows.length >= BLANK_COUNT + 3 ? rows.slice(BLANK_COUNT) : rows;
    if (mcqRows.length > 3) mcqRows = mcqRows.slice(-3);
    let mcqTexts = questionTexts.length > 3 ? questionTexts.slice(-3) : questionTexts;

    if (mcqTexts.length) {
      return mcqRows.map((row: any, idx: number) => ({
        text: mcqTexts[idx] || `Question ${BLANK_COUNT + 1 + idx}`,
        options: Array.isArray(row)
          ? row.filter((x: any) => typeof x === 'string' && x.trim())
               .filter((x: string) => !/^[A-Da-d]$/.test(x.trim()) && x.trim().length > 1)
          : [],
      })).filter((q: any) => q.options?.length);
    }

    return rows.map((row: any, i: number) => {
      const text = typeof row[0] === 'string' ? row[0] : `Question ${BLANK_COUNT + 1 + i}`;
      const options = Array.isArray(row)
        ? row.slice(1).filter((x: any) => typeof x === 'string' && x.trim())
             .filter((x: string) => !/^[A-Da-d]$/.test(x.trim()) && x.trim().length > 1)
        : [];
      return options.length ? { text, options } : null;
    }).filter(Boolean) as { text: string; options: string[] }[];
  }, [scenario]);

  useEffect(() => {
    if (phase !== 'test') return;
    const t = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'test' && timeLeft === 0) handleSubmit();
  }, [timeLeft, phase]);

  const handleAnswerSelect = (qNum: number, optIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qNum]: optIdx }));
  };

  const renderParagraph = () => {
    if (!paragraphTemplate.trim()) return null;
    const parts = paragraphTemplate.split(/(\{\d+\})/g);
    return (
      <p className="whitespace-pre-wrap">
        {parts.map((part, idx) => {
          const match = part.match(/^\{(\d+)\}$/);
          if (!match) return <span key={idx}>{part}</span>;
          const qNum = parseInt(match[1], 10);
          if (Number.isNaN(qNum)) return <span key={idx}>{part}</span>;
          const blankIndex = qNum - 1;
          const opts = (paragraphBlanks[blankIndex]?.length ? paragraphBlanks[blankIndex] : blankOptionsFromQA[blankIndex]) || [];
          return (
            <select key={idx} value={selectedAnswers[qNum] ?? ''}
              onChange={(e) => handleAnswerSelect(qNum, parseInt(e.target.value))}
              disabled={isSubmitted}
              className="px-2 py-1 border border-gray-300 rounded-md bg-white mx-1 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="" disabled hidden />
              {opts.map((opt: string, i: number) => <option key={i} value={i}>{opt}</option>)}
            </select>
          );
        })}
      </p>
    );
  };

  const buildCorrectAnswers = (): Record<number, number> => {
    const direct = scenario?.uploadedFiles?.correctAnswers;
    if (direct && Object.keys(direct as object).length) return direct as any;
    const rows: any[] = scenario?.uploadedFiles?.questionAnswers || [];
    const total = BLANK_COUNT + (parsedQuestions?.length || 0);
    const out: Record<number, number> = {};
    for (let qNum = 1; qNum <= total; qNum++) {
      const row = rows[qNum - 1];
      if (!Array.isArray(row) || !row.length) continue;
      const raw = row[5] ?? row[row.length - 1];
      const idx = letterToIndex(raw);
      if (typeof idx === 'number') out[qNum] = idx;
    }
    return out;
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    const correct = buildCorrectAnswers();
    let score = 0;
    for (const key of Object.keys(correct)) {
      if (selectedAnswers[parseInt(key)] === correct[parseInt(key)]) score++;
    }
    const results = { score, total: Object.keys(correct).length, answers: selectedAnswers, correctAnswers: correct, scenarioId: scenario?.$id };
    setFinalResults(results);
    setPhase('results');
  };

  const handleTryAgain = () => {
    setIsSubmitted(false);
    setSelectedAnswers({});
    setFinalResults(null);
    setTimeLeft(TOTAL_SECONDS);
    setPhase('test');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const titleText = scenario?.title || 'Reading — Apply a Diagram';

  if (phase === 'results' && finalResults) {
    const totalQuestions = BLANK_COUNT + (parsedQuestions?.length || 0);
    const getOpts = (qNum: number) => {
      if (qNum <= BLANK_COUNT) {
        const idx = qNum - 1;
        return (paragraphBlanks[idx]?.length ? paragraphBlanks[idx] : blankOptionsFromQA[idx]) || [];
      }
      return parsedQuestions?.[qNum - BLANK_COUNT - 1]?.options || [];
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
        <div className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium hover:opacity-90">← Exit</button>
          <div className="text-sm font-semibold truncate ml-2">{titleText} — Results</div>
          <div />
        </div>
        <div className="max-w-6xl mx-auto p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">Answer Key</div>
                <div className="text-xs sm:text-sm text-slate-500">Questions & Answers</div>
              </div>
              <button onClick={handleTryAgain}
                className="px-3 sm:px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 text-sm">
                Try Again
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {['Q#', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct', 'Your Answer'].map((h) => (
                      <th key={h} className={`px-3 sm:px-4 py-3 ${h.includes('Answer') || h === 'Correct' ? 'text-center w-20' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from({ length: totalQuestions }, (_, i) => {
                    const qNum = i + 1;
                    const opts = getOpts(qNum);
                    const correctIdx = finalResults.correctAnswers?.[qNum];
                    const yourIdx = finalResults.answers?.[qNum];
                    const cLetter = idxToLetter(correctIdx);
                    const yLetter = idxToLetter(yourIdx);
                    return (
                      <tr key={qNum}>
                        <td className="px-3 sm:px-4 py-3 font-semibold text-slate-700">{qNum}</td>
                        {[0, 1, 2, 3].map((oi) => <td key={oi} className="px-3 sm:px-4 py-3 text-xs sm:text-sm">{opts[oi] || '-'}</td>)}
                        <td className="px-3 sm:px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-700 font-bold">{cLetter}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold ${badgeClass(yLetter, cLetter)}`}>{yLetter}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button onClick={handleTryAgain}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 text-sm">
                Try Again
              </button>
              <button onClick={() => { onComplete?.(finalResults); onBack(); }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-sm hover:opacity-95 text-sm">
                Back to Scenarios →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      <div className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-sm">
        <div className="px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium hover:opacity-90 shrink-0">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Exit</span>
          </button>
          <div className="hidden sm:block text-sm font-semibold truncate flex-1 text-center px-2">{titleText} — Reading Part 2: Apply a Diagram</div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Time: </span>
              <span className="font-semibold">{formatTime(timeLeft)}</span>
            </div>
            <button onClick={handleSubmit} disabled={isSubmitted}
              className="bg-white text-green-700 px-3 sm:px-5 py-1.5 rounded-md text-sm font-semibold hover:bg-green-50 disabled:opacity-60">
              NEXT
            </button>
          </div>
        </div>
        <div className="sm:hidden px-3 pb-2 text-xs font-medium text-white/90 truncate">{titleText} — Part 2: Apply a Diagram</div>
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          {/* Left: Diagram */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold">i</div>
              <div>
                <div className="font-semibold text-slate-800">Diagram</div>
                <div className="text-xs text-slate-500">Use the diagram to answer the questions.</div>
              </div>
            </div>
            <div className="p-5 flex-1">
              {diagramUrl ? (
                <img src={diagramUrl} alt="Diagram" className="w-full h-auto rounded-xl border border-slate-200" />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Diagram image not found in database.</div>
              )}
            </div>
          </div>

          {/* Right: Paragraph + Questions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold">i</div>
                  <div>
                    <div className="font-semibold text-slate-800">Read the following email message about the diagram.</div>
                    <div className="text-sm text-slate-500">Complete the email by selecting the best option for each blank.</div>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="bg-green-50/60 rounded-xl p-4 text-sm leading-relaxed text-gray-700 border border-green-100">
                  {renderParagraph() ?? <p className="text-gray-500">Paragraph text not found in database.</p>}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold">i</div>
                  <div>
                    <div className="font-semibold text-slate-800">Using the drop-down menu, choose the best option.</div>
                    <div className="text-sm text-slate-500">Select one answer for each question.</div>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {parsedQuestions.length ? parsedQuestions.map((q, idx) => {
                  const qNumber = BLANK_COUNT + 1 + idx;
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-sm text-slate-700"><span className="font-medium">{qNumber}.</span> {q.text}</div>
                      <select value={selectedAnswers[qNumber] ?? ''}
                        onChange={(e) => handleAnswerSelect(qNumber, parseInt(e.target.value))}
                        disabled={isSubmitted}
                        className="w-full sm:w-80 px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="" disabled hidden />
                        {q.options.map((opt, oi) => <option key={oi} value={oi}>{opt}</option>)}
                      </select>
                    </div>
                  );
                }) : <div className="text-sm text-slate-500">No questions found in database.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <StickyBackButton onBack={onBack} />
    </div>
  );
}

// ─────────────────────────────────────────────
// PART 3 — Reading for Information
// ─────────────────────────────────────────────

const FIXED_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

function Part3Information({ scenario, onBack, onComplete }: ReadingTestProps) {
  const DEFAULT_TIME = 10 * 60;
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<'test' | 'results'>('test');
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [submitted]);

  useEffect(() => {
    if (timeLeft === 0 && !submitted) handleSubmit();
  }, [timeLeft, submitted]);

  const passageRaw = useMemo(() => {
    const transcripts = scenario?.uploadedFiles?.sectionTranscripts;
    if (transcripts?.[0]) return decodeBase64Maybe(transcripts[0]);
    if (scenario?.uploadedFiles?.readingPassage) return decodeBase64Maybe(scenario.uploadedFiles.readingPassage);
    if (scenario?.readingPassage) return decodeBase64Maybe(scenario.readingPassage);
    return scenario?.description || '';
  }, [scenario]);

  const questionTexts: string[] = useMemo(() => {
    const fromUploaded = scenario?.uploadedFiles?.questionTexts;
    if (Array.isArray(fromUploaded) && fromUploaded.length > 0) return fromUploaded;

    const paragraphText = scenario?.uploadedFiles?.paragraphText;
    if (typeof paragraphText === 'string' && paragraphText.trim()) {
      const extracted: string[] = [];
      for (const line of paragraphText.split('\n').map((l) => l.trim()).filter(Boolean)) {
        if (/^answer\s*:/i.test(line) || /^QUESTIONS$/i.test(line)) continue;
        const match = line.match(/^(\d+)\.\s*(.+)$/);
        if (match) extracted.push(match[2].trim());
      }
      if (extracted.length > 0) return extracted;
    }

    if (Array.isArray(scenario?.questionTexts) && scenario!.questionTexts!.length > 0) return scenario!.questionTexts!;

    if (Array.isArray(scenario?.questionAnswers) && scenario!.questionAnswers!.length > 0) {
      const extracted = scenario!.questionAnswers!
        .map((row: any) => (Array.isArray(row) ? row[0] : null))
        .filter((x: any) => typeof x === 'string' && x.trim());
      if (extracted.length > 0) return extracted as string[];
    }

    return [];
  }, [scenario]);

  const correctAnswers: string[] = useMemo(() => {
    const direct = scenario?.uploadedFiles?.correctAnswers || scenario?.correctAnswers;
    if (Array.isArray(direct) && direct.length > 0) return direct.map((x) => normalizeAnswerLetter(x));
    const qa = scenario?.uploadedFiles?.questionAnswers;
    if (Array.isArray(qa) && qa.length > 0) return qa.map((row: any) => normalizeAnswerLetter(row?.[5]));
    return [];
  }, [scenario]);

  useEffect(() => {
    if (questionTexts.length > 0) setAnswers(Array(questionTexts.length).fill(''));
  }, [questionTexts.length]);

  const parsedParagraphs = useMemo(() => {
    const raw = (passageRaw || '').trim();
    if (!raw) return [];
    return raw.split(/\n(?=[A-D]\.)/g)
      .map((p) => p.trim()).filter(Boolean)
      .map((block) => ({ label: block.slice(0, 2), text: block.slice(2).trim() }));
  }, [passageRaw]);

  const handleSelect = (index: number, value: string) => {
    if (submitted) return;
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    let s = 0;
    for (let i = 0; i < questionTexts.length; i++) {
      if (normalizeAnswerLetter(answers[i]) && normalizeAnswerLetter(answers[i]) === normalizeAnswerLetter(correctAnswers[i])) s++;
    }
    setScore(s);
    setPhase('results');
  };

  if (phase === 'results') {
    const total = questionTexts.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const msg = getScoreMessage(percentage);
    const optionsText = ['Paragraph A', 'Paragraph B', 'Paragraph C', 'Paragraph D', 'Not given (E)'];

    const handleTryAgain = () => {
      setAnswers(Array(questionTexts.length).fill(''));
      setTimeLeft(DEFAULT_TIME);
      setSubmitted(false);
      setScore(0);
      setPhase('test');
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <span className="font-semibold text-sm truncate">{scenario?.title || 'Reading for Information'}</span>
          <span className="text-xs sm:text-sm text-white/90 shrink-0 ml-2">Results</span>
        </div>
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl border border-slate-200 flex flex-col">
            <ScoreBanner score={score} total={total} percentage={percentage} msg={msg} />
            <div className="mt-4 sm:mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Answer Key</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Questions & Answers</p>
                </div>
                <button onClick={handleTryAgain}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm">
                  Try Again
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Q#', 'Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Correct', 'Your Answer'].map((h) => (
                        <th key={h} className={`px-3 sm:px-4 py-3 text-xs font-semibold text-slate-600 ${h.includes('Answer') || h === 'Correct' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {questionTexts.map((q, i) => {
                      const correct = normalizeAnswerLetter(correctAnswers[i]) || '-';
                      const your = normalizeAnswerLetter(answers[i]) || '-';
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 align-top">
                          <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-slate-700">{i + 1}</td>
                          {optionsText.map((o) => <td key={o} className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-slate-700">{o}</td>)}
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-sm">{correct}</span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${badgeClass(your, correct)}`}>{your}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-slate-200 bg-white">
                  <h4 className="font-semibold text-slate-900 mb-2">Questions</h4>
                  <div className="space-y-2 text-sm text-slate-700">
                    {questionTexts.map((q, i) => (
                      <div key={i}><span className="font-semibold">{i + 1}.</span> {q}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button onClick={handleTryAgain}
                className="flex-1 py-3 sm:py-4 bg-slate-50 text-slate-700 rounded-2xl font-semibold hover:bg-slate-100 transition-all">
                Try Again
              </button>
              <button onClick={() => { onComplete({ skill: 'reading', taskId: 'part3', title: scenario?.title || 'Reading Part 3', totalQuestions: total, score, answers, correctAnswers }); onBack(); }}
                className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Back to Scenarios
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      <div className="bg-green-600 text-white shadow-lg">
        <div className="px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2">
          <button onClick={onBack} className="flex items-center gap-1 text-white/90 hover:text-white shrink-0">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline text-sm">Exit</span>
          </button>
          <div className="hidden sm:block font-semibold text-center flex-1 truncate px-2">{scenario?.title || 'Reading for Information'}</div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="text-white/90 text-xs sm:text-sm">
              <span className="hidden sm:inline">Time: </span>
              <span className="font-bold">{formatTime(timeLeft)}</span>
            </div>
            <button onClick={handleSubmit} className="bg-white text-green-700 px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-50">NEXT</button>
          </div>
        </div>
        <div className="sm:hidden px-3 pb-2 text-xs font-medium text-white/90 truncate">{scenario?.title || 'Reading for Information'}</div>
      </div>
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          <div className="bg-white rounded-2xl shadow p-6 border border-green-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">i</div>
              <div>
                <h2 className="font-semibold text-lg">Read the following passage.</h2>
                <p className="text-sm text-slate-500">Each paragraph is labeled A to D. Select E if the information is not given.</p>
              </div>
            </div>
            {!passageRaw ? (
              <div className="text-slate-500 text-sm">Reading passage not found in database.</div>
            ) : (
              <div className="mt-8 space-y-6 text-[15px] leading-7 text-slate-800 text-justify">
                {parsedParagraphs.length > 0
                  ? parsedParagraphs.map((p, idx) => (
                      <div key={idx} className="leading-7 text-[15px] text-slate-800">
                        <span className="font-semibold mr-2">{p.label}</span>
                        <span className="whitespace-pre-line text-justify">{p.text}</span>
                      </div>
                    ))
                  : <div className="whitespace-pre-line">{passageRaw}</div>}
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow p-6 border border-green-100">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">i</div>
              <div>
                <h2 className="font-semibold text-lg">Decide which paragraph, A to D, has the information in each statement.</h2>
                <p className="text-sm text-slate-500">Select E if the information is not given in any paragraph.</p>
              </div>
            </div>
            {questionTexts.length === 0 ? (
              <div className="text-slate-500 text-sm">Questions are not loaded from database.</div>
            ) : (
              <div className="space-y-4">
                {questionTexts.map((q, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <select
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                      value={answers[i] || ''}
                      onChange={(e) => handleSelect(i, e.target.value)}
                      disabled={submitted}>
                      <option value="">—</option>
                      {FIXED_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="text-sm text-slate-800 leading-6"><span className="font-semibold">{i + 1}.</span> {q}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <StickyBackButton onBack={onBack} />
    </div>
  );
}

// ─────────────────────────────────────────────
// PART 4 — Reading for Viewpoints
// ─────────────────────────────────────────────

function Part4Viewpoints({ scenario, onBack, onComplete }: ReadingTestProps) {
  const TOTAL_TIME = 13 * 60;
  const TOP_Q_COUNT = 5;
  const BLANKS_COUNT = 5;

  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<(number | null)[]>(Array(10).fill(null));

  const title = extractTextFlexible(scenario?.title, scenario?.name) || 'Reading for Viewpoints';

  const articleText = useMemo(() => {
    const raw =
      scenario?.uploadedFiles?.sectionTranscripts?.[0] ||
      (scenario as any)?.sectionTranscripts?.[0] ||
      scenario?.uploadedFiles?.readingPassage ||
      scenario?.uploadedFiles?.articleText ||
      scenario?.readingPassage ||
      scenario?.articleText ||
      scenario?.description || '';
    return extractTextFlexible(raw).trim();
  }, [scenario]);

  const cleanedArticleText = useMemo(() => {
    const t = (articleText || '').trimStart();
    if (!t) return '';
    const firstLine = t.split(/\r?\n/, 1)[0] || '';
    const looksLikeInstruction = /^(read\s+the\s+following|read\s+this\s+article|read\s+the\s+article)/i.test(firstLine.trim());
    return looksLikeInstruction ? t.replace(/^.*\r?\n+/, '').trimStart() : articleText;
  }, [articleText]);

  const questionAnswers = useMemo(() => {
    const qa = scenario?.uploadedFiles?.questionAnswers || (scenario as any)?.questionAnswers || [];
    return Array.isArray(qa) ? qa : [];
  }, [scenario]);

  const topQuestionTexts: string[] = useMemo(() => {
    const fromDB = scenario?.uploadedFiles?.questionTexts;
    if (Array.isArray(fromDB) && fromDB.length) return fromDB.slice(0, TOP_Q_COUNT).map((s) => normalizeInline(String(s)));
    if (Array.isArray(questionAnswers) && questionAnswers.length) {
      const mapped = questionAnswers.slice(0, TOP_Q_COUNT)
        .map((row: any) => (Array.isArray(row) ? normalizeInline(String(row[0] ?? '')) : ''))
        .filter(Boolean);
      if (mapped.length) return mapped;
    }
    return ['The article is mainly about', 'Paragraph one provides a', "The first speaker's views would likely be supported by", "The second speaker thinks implementing those ideas would lead to", "The author's tone indicates support for"];
  }, [scenario, questionAnswers]);

  const topOptions: string[][] = useMemo(() =>
    Array.isArray(questionAnswers) && questionAnswers.length
      ? questionAnswers.slice(0, TOP_Q_COUNT).map((row: any) => extractOptionsFromRow(row))
      : Array.from({ length: TOP_Q_COUNT }, () => ['Option A', 'Option B', 'Option C', 'Option D']),
    [questionAnswers]);

  const commentParagraphText: string = useMemo(() =>
    extractTextFlexible(
      scenario?.uploadedFiles?.paragraphText,
      (scenario as any)?.paragraphText,
      scenario?.uploadedFiles?.commentText,
      (scenario as any)?.commentText
    ), [scenario]);

  const blankOptions: string[][] = useMemo(() => {
    const fromDB = scenario?.uploadedFiles?.paragraphBlanks || (scenario as any)?.paragraphBlanks;
    if (Array.isArray(fromDB) && fromDB.length) {
      return fromDB.slice(0, BLANKS_COUNT).map((row: any) =>
        Array.isArray(row) ? row.map(String).map((s: string) => s.trim()).filter(Boolean) : []);
    }
    if (Array.isArray(questionAnswers) && questionAnswers.length >= TOP_Q_COUNT + BLANKS_COUNT) {
      return questionAnswers.slice(TOP_Q_COUNT, TOP_Q_COUNT + BLANKS_COUNT).map((row: any) => extractOptionsFromRow(row));
    }
    return Array.from({ length: BLANKS_COUNT }, () => ['Option A', 'Option B', 'Option C', 'Option D']);
  }, [scenario, questionAnswers]);

  const correctRaw: any[] = useMemo(() => {
    const direct = scenario?.uploadedFiles?.correctAnswers || scenario?.correctAnswers || (scenario?.uploadedFiles as any)?.answers || (scenario as any)?.answers;
    if (Array.isArray(direct) && direct.length) return direct;
    if (Array.isArray(questionAnswers) && questionAnswers.length) {
      return Array.from({ length: Math.min(10, questionAnswers.length) }, (_, i) => {
        const row = questionAnswers[i];
        return Array.isArray(row) && row.length >= 6 ? row[row.length - 1] : undefined;
      });
    }
    return [];
  }, [scenario, questionAnswers]);

  useEffect(() => {
    if (showResults) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(t); setShowResults(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [showResults]);

  const setAnswer = (qIndex0: number, optionIndex: number | null) => {
    setSelected((prev) => { const next = [...prev]; next[qIndex0] = optionIndex; return next; });
  };

  const renderedComment = useMemo(() => {
    const text = commentParagraphText || '';
    const re = /(\{(\d+)\}|\[(\d+)\])/g;
    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (start > last) parts.push(<span key={`t-${start}`}>{text.slice(last, start)}</span>);

      const qNum = parseInt(m[2] || m[3] || '', 10);
      const qIndex0 = qNum - 1;
      const blankIndex = qNum - 6;

      if (qNum >= 6 && qNum <= 10 && blankOptions[blankIndex]) {
        const opts = blankOptions[blankIndex];
        parts.push(
          <select key={`s-${qNum}-${start}`} value={selected[qIndex0] ?? ''}
            onChange={(e) => setAnswer(qIndex0, e.target.value === '' ? null : Number(e.target.value))}
            className="mx-1 inline-block align-baseline border border-gray-300 rounded px-2 py-1 text-sm bg-white">
            <option value="" disabled />
            {opts.map((opt, idx) => <option key={idx} value={idx}>{opt}</option>)}
          </select>
        );
      } else {
        parts.push(<span key={`missing-${qNum}-${start}`} className="inline-block w-24 border-b border-gray-400 mx-1 align-baseline" />);
      }
      last = end;
    }
    if (last < text.length) parts.push(<span key="t-end">{text.slice(last)}</span>);
    return parts;
  }, [commentParagraphText, blankOptions, selected]);

  const computeResults = () => {
    const correctIdx: (number | null)[] = Array(10).fill(null);
    for (let i = 0; i < 10; i++) {
      const correctVal = correctRaw[i];
      correctIdx[i] = i < TOP_Q_COUNT
        ? correctToIndex(correctVal, topOptions[i] || [])
        : correctToIndex(correctVal, blankOptions[i - TOP_Q_COUNT] || []);
    }
    let known = 0, correct = 0;
    for (let i = 0; i < 10; i++) {
      if (correctIdx[i] !== null) { known++; if (selected[i] === correctIdx[i]) correct++; }
    }
    const details = Array.from({ length: 10 }).map((_, i) => ({
      questionNumber: i + 1,
      selectedIndex: selected[i],
      correctIndex: correctIdx[i],
      isCorrect: correctIdx[i] === null ? null : selected[i] === correctIdx[i],
    }));
    return { correct, known, details };
  };

  const results = useMemo(() => (showResults ? computeResults() : null), [showResults]); // eslint-disable-line react-hooks/exhaustive-deps

  if (showResults && results) {
    const total = 10;
    const percentage = Math.round((results.correct / total) * 100);
    const msg = getScoreMessage(percentage);
    const getOpts = (i: number) => i < TOP_Q_COUNT ? topOptions[i] || [] : blankOptions[i - TOP_Q_COUNT] || [];

    const handleTryAgain = () => {
      setSelected(Array(10).fill(null));
      setTimeLeft(TOTAL_TIME);
      setShowResults(false);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <span className="font-semibold text-sm truncate">{title}</span>
          <span className="text-xs sm:text-sm text-white/90 shrink-0 ml-2">Results</span>
        </div>
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl border border-slate-200 flex flex-col">
            <ScoreBanner score={results.correct} total={total} percentage={percentage} msg={msg} />
            <div className="mt-4 sm:mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Answer Key</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Questions & Answers</p>
                </div>
                <button onClick={handleTryAgain}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium text-sm">
                  Try Again
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Q#', 'Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Correct', 'Your Answer'].map((h) => (
                        <th key={h} className={`px-3 sm:px-4 py-3 text-xs font-semibold text-slate-600 ${h.includes('Answer') || h === 'Correct' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const opts = getOpts(i);
                      const correct = idxToLetter(results.details[i]?.correctIndex ?? null);
                      const your = idxToLetter(results.details[i]?.selectedIndex ?? null);
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 align-top">
                          <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-slate-700">{i + 1}</td>
                          {[0, 1, 2, 3, 4].map((oi) => <td key={oi} className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-slate-700">{opts[oi] || ''}</td>)}
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-sm">{correct}</span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${badgeClass(your, correct)}`}>{your}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-slate-200 bg-white">
                  <h4 className="font-semibold text-slate-900 mb-2">Questions</h4>
                  <div className="space-y-2 text-sm text-slate-700">
                    {topQuestionTexts.map((q, i) => (
                      <div key={i}><span className="font-semibold">{i + 1}.</span> {q}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button onClick={handleTryAgain}
                className="flex-1 py-3 sm:py-4 bg-slate-50 text-slate-700 rounded-2xl font-semibold hover:bg-slate-100 transition-all">
                Try Again
              </button>
              <button onClick={() => {
                const r = computeResults();
                onComplete({ skill: 'reading', taskId: scenario?.taskId ?? scenario?.taskType ?? 'part4', title, submittedAt: new Date().toISOString(), answers: selected, score: r });
              }} className="flex-1 py-3 sm:py-4 bg-green-600 text-white rounded-2xl font-semibold hover:bg-green-700 transition-all">
                Back to the Scenarios
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 p-3 sm:p-6">
      <div className="bg-green-600 text-white rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6">
        <div className="px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2">
          <button onClick={onBack} className="flex items-center gap-1 text-white/90 hover:text-white shrink-0">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline text-sm">Exit</span>
          </button>
          <div className="hidden sm:block font-semibold text-center flex-1 truncate px-2">{title}</div>
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <div className="text-xs sm:text-sm font-semibold whitespace-nowrap">
              <span className="hidden sm:inline text-white/80 font-normal">Time: </span>
              {formatTime(timeLeft)}
            </div>
            <button onClick={() => setShowResults(true)}
              className="bg-white text-green-700 px-3 sm:px-6 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold shadow hover:bg-green-50 text-sm">
              NEXT
            </button>
          </div>
        </div>
        <div className="sm:hidden px-3 pb-2 text-xs font-medium text-white/90 truncate">{title}</div>
      </div>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          <div className="bg-white rounded-2xl shadow p-4 sm:p-6 border border-gray-100 flex flex-col min-w-0">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">i</div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Read the article.</h2>
                <p className="text-xs sm:text-sm text-gray-600">Answer the questions using information from the article.</p>
              </div>
            </div>
            <div className="flex-1 mt-4 text-gray-900 leading-7 text-sm sm:text-base text-justify whitespace-pre-line">
              {cleanedArticleText || <div className="text-sm text-gray-500">No article text found in database.</div>}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 sm:p-6 border border-gray-100 flex flex-col min-w-0">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">i</div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Choose the best option from the menu based on the information in the article.</h2>
              </div>
            </div>
            <div className="flex-1">
              <div className="space-y-4 mb-6">
                {topQuestionTexts.slice(0, TOP_Q_COUNT).map((q, i) => (
                  <div key={i} className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex gap-3 items-start min-w-0">
                      <div className="w-7 text-right font-semibold text-gray-800 shrink-0">{i + 1}.</div>
                      <div className="flex-1 text-sm text-gray-900 leading-6">{q}</div>
                    </div>
                    <div className="pl-10">
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                        value={selected[i] ?? ''}
                        onChange={(e) => setAnswer(i, e.target.value === '' ? null : Number(e.target.value))}>
                        <option value="" disabled />
                        {(topOptions[i] || []).map((opt, idx) => <option key={idx} value={idx}>{opt}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">i</div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">Complete the section by selecting the best option for each blank.</h3>
                  </div>
                </div>
                <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 leading-7 text-gray-900 text-sm sm:text-base">
                  {commentParagraphText
                    ? <div className="whitespace-pre-wrap">{renderedComment}</div>
                    : <div className="text-sm text-gray-500">No comment paragraph found.</div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <StickyBackButton onBack={onBack} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Router — detects which part to render
// ─────────────────────────────────────────────

function detectPart(scenario: Scenario): 1 | 2 | 3 | 4 {
  const candidates = [
    scenario?.taskId,
    scenario?.taskName,
    scenario?.skill,
    scenario?.title,
    scenario?.name,
  ].map((v) => String(v || '').toLowerCase());

  for (const s of candidates) {
    if (s.includes('correspond') || s.includes('part1') || s.includes('part 1')) return 1;
    if (s.includes('diagram') || s.includes('part2') || s.includes('part 2')) return 2;
    if (s.includes('information') || s.includes('part3') || s.includes('part 3')) return 3;
    if (s.includes('viewpoint') || s.includes('part4') || s.includes('part 4')) return 4;
  }

  // Fallback: use diagrams/image presence
  if (
    scenario?.uploadedFiles?.diagramImageUrl ||
    scenario?.uploadedFiles?.diagramImage ||
    scenario?.contextImage
  ) return 2;

  return 1; // Default to Part 1
}

// ─────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────

export default function ReadingTest({ part, scenario, onBack, onComplete }: ReadingTestProps) {
  const resolvedPart = part ?? detectPart(scenario);

  const props = { scenario, onBack, onComplete };

  switch (resolvedPart) {
    case 1: return <Part1Correspondence {...props} />;
    case 2: return <Part2Diagram {...props} />;
    case 3: return <Part3Information {...props} />;
    case 4: return <Part4Viewpoints {...props} />;
    default: return <Part1Correspondence {...props} />;
  }
}
