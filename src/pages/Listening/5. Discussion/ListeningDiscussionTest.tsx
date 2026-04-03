import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Play,
  Pause,
  CheckCircle,
  Info,
  Headphones,
  RotateCcw,
  X,
  Video,
  ChevronDown,
} from 'lucide-react';

import { saveListeningResult, calculateCelpipScore } from '../../../services/userResultsService';

// Types
interface QuestionOption {
  id: string;
  text?: string;
}

interface Question {
  id: string;
  questionText: string;
  type: string;
  options: QuestionOption[];
  correctAnswer: string;
  audioUrl?: string | null;
  transcript?: string | null;
}

interface Section {
  id: string;
  title: string;
  audioUrl?: string;
  audioDuration: number;
  transcript?: string;
  questions: Question[];
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
  videoUrl?: string;
  sections: Section[];
  uploadedFiles?: any;
}

interface TestResults {
  scenarioId: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  timeSpent: number;
}

interface ListeningDiscussionTestProps {
  scenario: Scenario;
  onBack: () => void;
  onComplete: (results: TestResults) => void;
}

type TestPhase = 'instructions' | 'media' | 'question' | 'results';

const TranscriptModal = React.memo(function TranscriptModal({
  open,
  title,
  content,
  onClose,
}: {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close transcript"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto overscroll-contain touch-pan-y max-h-[calc(85vh-72px)]">
          <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
});

const ListeningDiscussionTest: React.FC<ListeningDiscussionTestProps> = ({
  scenario,
  onBack,
  onComplete,
}) => {
  // State
  const [phase, setPhase] = useState<TestPhase>('instructions');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(0);
  const [mediaCurrentTime, setMediaCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [hasPlayedMedia, setHasPlayedMedia] = useState(false);
  const [timeLeft, setTimeLeft] = useState(240);
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

  // Save status states
  const [isSaving, setIsSaving] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  const [transcript, setTranscript] = useState('');
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [pendingAutoplay, setPendingAutoplay] = useState(false);
  const [mediaError, setMediaError] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [showIOSStartOverlay, setShowIOSStartOverlay] = useState(false);

const isiPhoneSafari = React.useMemo(() => {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const isIPhone = /iPhone/i.test(ua);
  const isWebKit = /WebKit/i.test(ua);
  const isOtherIOSBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  return isIPhone && isWebKit && !isOtherIOSBrowser;
}, []);

  const uploadedFiles = React.useMemo(() => {
    const raw = scenario?.uploadedFiles;

    if (!raw) return {};

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (error) {
        console.error('[ListeningDiscussionTest] Failed to parse uploadedFiles:', error, raw);
        return {};
      }
    }

    return raw;
  }, [scenario?.uploadedFiles]);

  const extractTranscriptText = (value: any): string => {
    if (!value) return '';

    if (typeof value === 'string') {
      try {
        if (value.startsWith('data:')) {
          const b64 = value.split(',')[1];
          return b64 ? atob(b64) : '';
        }
      } catch {
        return value;
      }
      return value;
    }

    if (typeof value?.text === 'string') return value.text;
    if (typeof value?.content === 'string') return value.content;

    if (typeof value?.data === 'string') {
      try {
        if (value.data.startsWith('data:')) {
          const b64 = value.data.split(',')[1];
          return b64 ? atob(b64) : '';
        }
      } catch {
        return value.data;
      }
      return value.data;
    }

    return '';
  };

  // Get video URL (check multiple possible locations)
  const videoUrl =
    scenario.videoUrl || uploadedFiles?.videoFile?.storageUrl || uploadedFiles?.videoFile?.data;

  // Get audio URL as fallback
  const audioUrl =
    scenario.sections?.[0]?.audioUrl ||
    uploadedFiles?.sectionAudios?.[0]?.storageUrl ||
    uploadedFiles?.sectionAudios?.[0]?.data;

  // Get transcript source file/object/string
  const getTranscriptSource = () => {
    // 1) direct section transcript
    if (scenario.sections?.[0]?.transcript) {
      return scenario.sections[0].transcript;
    }

    // 2) most common Part 5 admin upload location
    if (uploadedFiles?.sectionTranscripts?.[0]) {
      return uploadedFiles.sectionTranscripts[0];
    }

    // 3) older fallback
    if (uploadedFiles?.videoTranscript) {
      return uploadedFiles.videoTranscript;
    }

    return null;
  };

  // Get all questions from all sections
  const allQuestions = scenario.sections?.flatMap((s) => s.questions) || [];
  const totalQuestions = allQuestions.length || 8;
  const currentQuestion = allQuestions[currentQuestionIndex];

  // Determine media type
  const hasVideo = !!videoUrl;
  const hasAudio = !!audioUrl;

  // Instructions from scenario
  const instructionsText =
    scenario.instructions ||
    scenario.contextDescription ||
    'You will watch a discussion between three coworkers. Listen carefully and answer the questions that follow.';

  // Timer for questions
  useEffect(() => {
    if (phase === 'question' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            void handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [phase, timeLeft]);

  // Start test timer when entering questions
  useEffect(() => {
    if (phase === 'question' && !testStartTime) {
      setTestStartTime(Date.now());
    }
  }, [phase, testStartTime]);

  // Retry autoplay when media page is open
  useEffect(() => {
    if (phase === 'media' && pendingAutoplay) {
      void attemptMediaAutoplay();
    }
  }, [phase, pendingAutoplay, hasVideo]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

const attemptMediaAutoplay = async () => {
  const media = hasVideo ? videoRef.current : audioRef.current;
  if (!media) return false;

  if (!media.paused && !media.ended) {
    setIsPlaying(true);
    setMediaError('');
    setPendingAutoplay(false);
    setShowIOSStartOverlay(false);
    return true;
  }

  try {
    media.currentTime = 0;

    const playPromise = media.play();
    if (playPromise && typeof playPromise.then === 'function') {
      await playPromise;
    }

    setIsPlaying(true);
    setMediaError('');
    setPendingAutoplay(false);
    setShowIOSStartOverlay(false);
    return true;
  } catch (error: any) {
    console.warn('[ListeningDiscussionTest] Autoplay failed:', error);
    setIsPlaying(false);

    if (error?.name === 'NotAllowedError') {
      if (isiPhoneSafari && hasVideo) {
        setShowIOSStartOverlay(true);
        setMediaError('Tap once to start the video on iPhone.');
      } else {
        setMediaError('Autoplay was blocked on this device. Tap Play to start.');
      }
    } else if (error?.name === 'NotSupportedError') {
      setMediaError('This video format could not be played on this device.');
    } else {
      setMediaError('Playback could not start automatically on this device.');
    }

    return false;
  }
};

const handleIOSStartPlayback = async () => {
  const media = hasVideo ? videoRef.current : audioRef.current;
  if (!media) return;

  try {
    media.currentTime = 0;

    const playPromise = media.play();
    if (playPromise && typeof playPromise.then === 'function') {
      await playPromise;
    }

    setIsPlaying(true);
    setMediaError('');
    setPendingAutoplay(false);
    setShowIOSStartOverlay(false);
  } catch (error: any) {
    console.error('[ListeningDiscussionTest] iPhone manual play failed:', error);

    if (error?.name === 'NotSupportedError') {
      setMediaError('This video format could not be played on iPhone.');
    } else {
      setMediaError('Playback could not start on iPhone.');
    }
  }
};

  const togglePlayPause = async () => {
    const media = hasVideo ? videoRef.current : audioRef.current;
    if (!media || hasPlayedMedia) return;

    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
      return;
    }

    try {
      const playPromise = media.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
      setIsPlaying(true);
      setMediaError('');
    } catch (error) {
      console.error('[ListeningDiscussionTest] Manual play failed:', error);
      setIsPlaying(false);
      setMediaError('This device blocked playback. Please try again.');
    }
  };

  // Seek helpers
  const seekToPercent = (pct: number) => {
    const media = hasVideo ? videoRef.current : audioRef.current;
    if (!media) return;

    const dur = media.duration;
    if (!dur || !isFinite(dur)) return;

    const clamped = Math.max(0, Math.min(100, pct));
    const t = (clamped / 100) * dur;

    media.currentTime = t;
    setMediaCurrentTime(t);
    setMediaProgress(clamped);
  };

  const seekBySeconds = (deltaSeconds: number) => {
    const media = hasVideo ? videoRef.current : audioRef.current;
    if (!media) return;

    const dur = media.duration;
    if (!dur || !isFinite(dur)) return;

    const next = Math.max(0, Math.min(dur, media.currentTime + deltaSeconds));
    media.currentTime = next;

    setMediaCurrentTime(next);
    setMediaProgress((next / dur) * 100);
  };

  const handleTimeUpdate = () => {
    const media = hasVideo ? videoRef.current : audioRef.current;
    if (media) {
      const duration = media.duration;
      if (duration && isFinite(duration)) {
        const progress = (media.currentTime / duration) * 100;
        setMediaProgress(progress);
        setMediaCurrentTime(media.currentTime);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const media = hasVideo ? videoRef.current : audioRef.current;
    if (media?.duration) {
      setMediaDuration(Math.floor(media.duration));
    }
  };

  const handleMediaEnded = () => {
    setIsPlaying(false);
    setHasPlayedMedia(true);
    setPendingAutoplay(false);
    setMediaError('');
    setTimeout(() => setPhase('question'), 500);
  };

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));
  };

  const handleNext = () => {
if (phase === 'instructions') {
  setMediaError('');
  setShowIOSStartOverlay(false);
  setPendingAutoplay(true);

      flushSync(() => {
        setPhase('media');
      });

      void attemptMediaAutoplay();
    } else if (phase === 'media') {
      if (hasVideo && videoRef.current) {
        videoRef.current.pause();
      }
      if (hasAudio && audioRef.current) {
        audioRef.current.pause();
      }

      setIsPlaying(false);
      setHasPlayedMedia(true);
      setPendingAutoplay(false);
      setMediaError('');
      setPhase('question');
    } else if (phase === 'question') {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        void handleComplete();
      }
    }
  };

const handleBack = () => {
  if (phase === 'media') {
    if (hasVideo && videoRef.current) {
      videoRef.current.pause();
    }
    if (hasAudio && audioRef.current) {
      audioRef.current.pause();
    }

    setIsPlaying(false);
    setPendingAutoplay(false);
    setShowIOSStartOverlay(false);
    setMediaError('');
    setPhase('instructions');
  } else if (phase === 'question') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex((prev) => prev - 1);
      } else {
        setPhase('media');
        setHasPlayedMedia(false);
        setPendingAutoplay(false);
        setMediaError('');
      }
    }
  };

  const handleComplete = async () => {
    let correctCount = 0;
    allQuestions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const timeSpent = Math.floor((Date.now() - (testStartTime ?? Date.now())) / 1000);
    const celpipScore = calculateCelpipScore(correctCount, totalQuestions);

    const results: TestResults = {
      scenarioId: scenario.id,
      answers,
      score: correctCount,
      totalQuestions,
      timeSpent,
    };

    setTestResults(results);
    setPhase('results');

    setIsSaving(true);
    try {
      const resultId = await saveListeningResult({
        testType: 'practice',
        taskId: scenario.taskType || 'part5',
        materialId: scenario.id,
        totalCorrect: correctCount,
        totalQuestions: totalQuestions,
        celpipScore: celpipScore,
        duration: timeSpent,
      });

      if (resultId) {
        setSavedToDb(true);
        console.log('[ListeningDiscussionTest] ✓ Saved to DB:', resultId);
      }
    } catch (error) {
      console.error('[ListeningDiscussionTest] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetTest = () => {
    if (hasVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (hasAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setPhase('instructions');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setHasPlayedMedia(false);
    setMediaProgress(0);
    setMediaCurrentTime(0);
    setMediaDuration(0);
    setTimeLeft(240);
    setShowTranscript(false);
    setTestStartTime(null);
    setIsPlaying(false);
    setSavedToDb(false);
setIsSaving(false);
setPendingAutoplay(false);
setShowIOSStartOverlay(false);
setMediaError('');
  };

  // Load transcript
  useEffect(() => {
    let cancelled = false;

    const loadTranscript = async () => {
      setTranscript('');
      setTranscriptLoading(false);

      const source = getTranscriptSource();

      console.log('[Discussion] scenario.sections[0]?.transcript =', scenario.sections?.[0]?.transcript);
      console.log('[Discussion] uploadedFiles =', uploadedFiles);
      console.log('[Discussion] transcript source =', source);

      if (!source) return;

      // 1) direct text / base64 text
      const immediateText = extractTranscriptText(source);
      if (immediateText?.trim()) {
        if (!cancelled) setTranscript(immediateText);
        return;
      }

      // 2) TXT file stored in Appwrite Storage
      const isTxtFile =
        typeof source?.name === 'string' && source.name.toLowerCase().endsWith('.txt');

      if (source?.storageUrl && isTxtFile) {
        setTranscriptLoading(true);
        try {
          const res = await fetch(source.storageUrl);
          const text = await res.text();
          if (!cancelled) setTranscript(text || '');
        } catch (error) {
          console.error('[Discussion] Failed to fetch transcript from storageUrl:', error);
        } finally {
          if (!cancelled) setTranscriptLoading(false);
        }
      }
    };

    void loadTranscript();

    return () => {
      cancelled = true;
    };
  }, [scenario, uploadedFiles]);

  const answeredCount = allQuestions.filter((q) => answers[q.id]).length;
  const progressPercentage = phase === 'question' ? (answeredCount / totalQuestions) * 100 : 0;

  // Render constants
  const SHELL_BASE =
    'bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl mx-auto';
  const SHELL_FIXED = 'h-[calc(100dvh-7rem)] landscape:h-[calc(100dvh-1.5rem)] max-h-[720px] flex flex-col overflow-hidden';
  const SHELL_COMPACT = 'min-h-[500px] max-h-[620px] flex flex-col overflow-hidden';
  const SHELL_PAD = 'p-4 sm:p-6';

  const renderInstructions = () => (
    <div className={`${SHELL_BASE} ${SHELL_COMPACT} ${SHELL_PAD}`}>
      <div className="flex-1 overflow-y-auto">
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-xl shadow-blue-500/25">
            {hasVideo ? (
              <Video className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            ) : (
              <Headphones className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 tracking-tight">
            Discussion
          </h2>
          <p className="text-slate-500 text-sm sm:text-base">
            {scenario.title?.replace(/_/g, ' ') || 'Listening Practice'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
          <h3 className="font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            Instructions
          </h3>

          <div className="space-y-2.5">
            {[
              hasVideo
                ? 'You will watch a discussion between speakers. You will see it only once.'
                : 'You will hear a discussion between speakers. You will hear it only once.',
              `After the discussion, you will answer ${totalQuestions} questions.`,
              'Choose the best answer to each question.',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20">
                  {i + 1}
                </span>
                <p className="text-slate-700 leading-relaxed pt-1 text-sm sm:text-base">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 sm:pt-5">
        <button
          onClick={handleNext}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold text-base hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
        >
          Continue
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

const renderMedia = () => (
    <div className={`${SHELL_BASE} ${SHELL_FIXED} ${SHELL_PAD}`}>

      {/* Title — hidden in landscape to reclaim vertical space */}
      <div className="text-center mb-3 sm:mb-4 flex-shrink-0 landscape:hidden">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          {hasVideo ? 'Watch the Discussion' : 'Listen to the Discussion'}
        </h2>
        <p className="text-slate-500 mt-1 text-sm sm:text-base line-clamp-2">{instructionsText}</p>
      </div>

      {/* Inner layout: column on portrait, row on landscape */}
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row gap-3">

        {/* ── LEFT / TOP: Video ── */}
        {hasVideo && (
          <div className="flex-1 min-h-0 landscape:flex-[3] relative">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain rounded-2xl bg-black"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={() => {
                if (phase === 'media' && pendingAutoplay) {
                  void attemptMediaAutoplay();
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                setShowIOSStartOverlay(false);
                setMediaError('');
              }}
              onPause={() => setIsPlaying(false)}
              onEnded={handleMediaEnded}
              onError={(e) => {
                const videoEl = e.currentTarget;
                console.error('[ListeningDiscussionTest] Video error:', videoEl.error, videoUrl);
                setIsPlaying(false);
                setPendingAutoplay(false);
                setMediaError(
                  'This video could not be played on this device. Please upload MP4 (H.264 + AAC).'
                );
              }}
              playsInline
              autoPlay
              preload="auto"
              controls={false}
            />

            {showIOSStartOverlay && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45">
                <button
                  type="button"
                  onClick={handleIOSStartPlayback}
                  className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-semibold shadow-xl hover:bg-slate-100 transition"
                >
                  Tap to start video
                </button>
              </div>
            )}
          </div>
        )}

        {/* Audio fallback (no video) */}
        {!hasVideo && hasAudio && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={() => {
              if (phase === 'media' && pendingAutoplay) {
                void attemptMediaAutoplay();
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleMediaEnded}
            onError={(e) => {
              const audioEl = e.currentTarget;
              console.error('[ListeningDiscussionTest] Audio error:', audioEl.error, audioUrl);
              setIsPlaying(false);
              setPendingAutoplay(false);
              setMediaError('This audio could not be played on this device.');
            }}
            autoPlay
            preload="auto"
          />
        )}

        {/* ── RIGHT / BOTTOM: Controls ── */}
        <div className="flex-shrink-0 landscape:flex-[2] flex flex-col justify-end landscape:justify-center gap-2">

          {mediaError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {mediaError}
            </div>
          )}

          {/* Play Controls */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <button
              onClick={togglePlayPause}
              disabled={hasPlayedMedia}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all ${
                hasPlayedMedia
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
              )}
            </button>

            <div className="flex-1 flex items-center gap-2 sm:gap-3">
              <span className="text-sm text-slate-500 font-mono w-10 sm:w-12 flex-shrink-0">
                {formatTime(Math.floor(mediaCurrentTime))}
              </span>

              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={mediaProgress}
                  onChange={(e) => seekToPercent(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                  aria-label={hasVideo ? 'Video progress' : 'Audio progress'}
                  disabled={hasPlayedMedia}
                />
              </div>

              <span className="text-sm text-slate-500 font-mono w-10 sm:w-12 flex-shrink-0">
                {formatTime(mediaDuration)}
              </span>
            </div>
          </div>

          {/* Transcript button */}
          <button
            onClick={() => setShowTranscript(true)}
            className="w-full py-2.5 sm:py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex-shrink-0"
          >
            Show Transcript
          </button>

          {/* Nav buttons */}
          <div className="flex gap-3 sm:gap-4 flex-shrink-0">
            <button
              onClick={handleBack}
              className="flex-1 py-3 sm:py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            <button
              onClick={handleNext}
              className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-3"
            >
              Skip to Questions
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>
        {/* end controls side */}

      </div>
      {/* end inner layout */}

    </div>
  );

  const renderQuestion = () => {
    const localAnsweredCount = allQuestions.filter((q) => !!answers[q.id]).length;
    const progress = totalQuestions ? (localAnsweredCount / totalQuestions) * 100 : 0;

    return (
      <div className={`${SHELL_BASE} ${SHELL_FIXED} ${SHELL_PAD}`}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-snug truncate">
              {scenario.title?.replace(/_/g, ' ')}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Choose the best answer from the drop-down menu (▼).
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Answered: <span className="font-semibold text-slate-700">{localAnsweredCount}</span> /{' '}
              {totalQuestions}
            </p>
          </div>

          <button
            onClick={() => void handleComplete()}
            className="shrink-0 px-4 sm:px-6 py-2 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm sm:text-base"
          >
            NEXT
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-3 flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Questions list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 divide-y divide-slate-100 min-h-0">
          {allQuestions.map((q, idx) => (
            <div key={q.id} className="pt-3 first:pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-slate-700 font-medium text-sm sm:text-base">
                  {idx + 1}. {q.questionText}
                </span>

                <div className="relative w-full sm:min-w-[240px] sm:w-auto">
                  <select
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                    className={`w-full appearance-none bg-white border rounded-xl px-3 sm:px-4 py-2 pr-8 font-medium cursor-pointer text-sm sm:text-base ${
                      answers[q.id]
                        ? 'border-blue-500 text-slate-900'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    <option value="" disabled>
                      Select an answer...
                    </option>
                    {q.options.map((opt, i) => (
                      <option key={opt.id} value={opt.id}>
                        {String.fromCharCode(65 + i)}. {opt.text}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Back button */}
        <div className="mt-auto pt-3 border-t border-slate-200 flex items-center justify-end flex-shrink-0">
          <button
onClick={() => {
  setPhase('media');
  setHasPlayedMedia(false);
  setPendingAutoplay(false);
  setShowIOSStartOverlay(false);
  setMediaError('');
}}
            className="px-4 sm:px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 text-sm sm:text-base"
          >
            BACK
          </button>
        </div>
      </div>
    );
  };

  const renderAnswerKey = () => (
    <div className={`${SHELL_BASE} ${SHELL_COMPACT} ${SHELL_PAD}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Answer Key</h2>
        <button onClick={() => setPhase('results')} className="p-2 hover:bg-slate-100 rounded-lg">
          <X className="w-6 h-6 text-slate-500" />
        </button>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {allQuestions.map((q, idx) => {
          const isCorrect = answers[q.id] === q.correctAnswer;
          const userAnswer = q.options.find((o) => o.id === answers[q.id]);
          const correctAnswer = q.options.find((o) => o.id === q.correctAnswer);

          return (
            <div
              key={q.id}
              className={`p-4 rounded-xl border-2 ${
                isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
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
                    Your answer:{' '}
                    <span
                      className={`font-medium ${
                        isCorrect ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
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

      <button
        onClick={() => setPhase('results')}
        className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 transition-all"
      >
        Back to Results
      </button>
    </div>
  );

  const renderResults = () => {
    const total = allQuestions.length || totalQuestions;
    const score = allQuestions.filter((q) => answers[q.id] === q.correctAnswer).length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const celpipScore = calculateCelpipScore(score, total);

    const getMessage = () => {
      if (percentage >= 90) return { text: 'Excellent work!', color: 'text-emerald-700' };
      if (percentage >= 75) return { text: 'Great job!', color: 'text-emerald-700' };
      if (percentage >= 50) return { text: 'Good effort!', color: 'text-amber-700' };
      return { text: 'Keep practicing!', color: 'text-rose-700' };
    };

    const message = getMessage();

    return (
      <div className={`${SHELL_BASE} ${SHELL_FIXED} ${SHELL_PAD}`}>
        {/* Top score banner */}
        <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="text-xs font-semibold text-emerald-700 tracking-wide">
                CORRECT ANSWERS
              </div>
              <div className="text-xl font-bold text-slate-900">
                {score} / {total}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className={`font-semibold ${message.color}`}>{message.text}</div>
            <div className="text-xs text-slate-500">Review your answers below</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-sm font-semibold">
            Estimated CELPIP Score: {celpipScore}
          </span>

          {savedToDb && (
            <span className="inline-flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Results saved to your account
            </span>
          )}

          {isSaving && (
            <span className="inline-flex items-center gap-2 text-slate-500 text-sm font-medium">
              Saving results...
            </span>
          )}
        </div>

        {/* Answer table */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 overflow-hidden flex-1 flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Answer Key</h3>
              <p className="text-sm text-slate-500">Questions & Answers</p>
            </div>

            <button
              onClick={resetTest}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>

          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Q#
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Option A
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Option B
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Option C
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Option D
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                    Correct
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                    Your Answer
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {allQuestions.map((q, idx) => {
                  const correctIdx = q.options.findIndex((o) => o.id === q.correctAnswer);
                  const yourIdx = q.options.findIndex((o) => o.id === answers[q.id]);

                  const correctLetter = correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : '-';
                  const yourLetter = yourIdx >= 0 ? String.fromCharCode(65 + yourIdx) : '-';

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-4 text-sm font-semibold text-slate-700">{idx + 1}</td>

                      <td className="px-4 py-4 text-sm text-slate-700">{q.options[0]?.text || '-'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{q.options[1]?.text || '-'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{q.options[2]?.text || '-'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{q.options[3]?.text || '-'}</td>

                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                          {correctLetter}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold ${
                            yourLetter === '-'
                              ? 'bg-slate-100 text-slate-500'
                              : yourLetter === correctLetter
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {yourLetter}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={resetTest}
            className="flex-1 py-4 bg-slate-50 text-slate-700 rounded-2xl font-semibold hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>

          <button
            onClick={() => {
              if (testResults) onComplete(testResults);
              else onBack();
            }}
            className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
          >
            Finish
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-6">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition"
              >
                <ArrowLeft className="w-5 h-5" />
                Exit
              </button>

              <span className="font-bold text-slate-900 text-lg">Listening • Discussion</span>

              {/* Progress Bar */}
              {phase === 'question' && (
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
                {phase === 'instructions'
                  ? 'Introduction'
                  : phase === 'media'
                  ? hasVideo
                    ? 'Video'
                    : 'Listening'
                  : phase === 'question'
                  ? 'Question'
                  : 'Results'}
              </span>

              {/* Timer */}
              {phase === 'question' && (
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                    timeLeft < 30
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-600'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 min-h-[calc(100dvh-4rem)] flex items-center justify-center">
        {phase === 'instructions' && renderInstructions()}
        {phase === 'media' && renderMedia()}
        {phase === 'question' && renderQuestion()}
        {phase === 'results' && renderResults()}
      </main>

      <TranscriptModal
        open={showTranscript}
        onClose={() => setShowTranscript(false)}
        title="Discussion Transcript"
        content={
          transcriptLoading
            ? 'Loading transcript...'
            : transcript?.trim() ||
              'No transcript text found. If you uploaded the transcript as PDF or DOCX, upload it as a .txt file instead.'
        }
      />
    </div>
  );
};

export default ListeningDiscussionTest;