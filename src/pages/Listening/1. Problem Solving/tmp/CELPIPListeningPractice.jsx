import { saveReadingResult } from '../../../services/userResultsService';

// After calculating score in handleSubmit:
await saveReadingResult({
  testType: "practice",
  taskId: scenario.taskId,
  materialId: scenario.id,
  totalCorrect: correctCount,
  totalQuestions: questions.length,
  celpipScore: celpipScore,
  duration: timeSpent,
});


import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, Clock, Volume2, 
  Play, Pause, CheckCircle, Info, Headphones,
  AlertCircle, RotateCcw, X
} from 'lucide-react';

// Format time as MM:SS
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Sample scenario data
const sampleScenario = {
  id: 'scenario-1',
  title: 'Swimming_Lessons_Registration',
  skill: 'listening',
  taskName: 'Problem Solving',
  taskType: 'problem-solving',
  totalTime: 90,
  instructions: 'You will hear a conversation in 3 sections.',
  sections: [
    {
      id: 'section-1',
      title: 'Section 1',
      audioDuration: 47,
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
        }
      ]
    },
    {
      id: 'section-3',
      title: 'Section 3',
      audioDuration: 55,
      preparationTime: 10,
      questions: [
        {
          id: 'q5',
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
          id: 'q6',
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
          id: 'q7',
          questionText: 'What will most likely happen next?',
          type: 'multiple-choice',
          options: [
            { id: 'a', text: 'The woman will apologize to the man.' },
            { id: 'b', text: 'The man will need help getting out.' },
            { id: 'c', text: 'The man will buy a better umbrella.' },
            { id: 'd', text: 'The woman will begin her chores.' }
          ],
          correctAnswer: 'd'
        },
        {
          id: 'q8',
          questionText: 'What time is the health club closing?',
          type: 'multiple-choice',
          options: [
            { id: 'a', text: '8:00 PM' },
            { id: 'b', text: '9:00 PM' },
            { id: 'c', text: '10:00 PM' },
            { id: 'd', text: '11:00 PM' }
          ],
          correctAnswer: 'b'
        }
      ]
    }
  ]
};

export default function CELPIPListeningPractice() {
  const scenario = sampleScenario;
  const [phase, setPhase] = useState('instructions');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(scenario.totalTime);
  const [preparationTimeLeft, setPreparationTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [testStartTime] = useState(Date.now());
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  
  const audioIntervalRef = useRef(null);

  const currentSection = scenario.sections[currentSectionIndex];
  const allQuestions = scenario.sections.flatMap(s => s.questions);
  const totalQuestions = allQuestions.length;
  
  const getAbsoluteQuestionIndex = () => {
    let count = 0;
    for (let i = 0; i < currentSectionIndex; i++) {
      count += scenario.sections[i].questions.length;
    }
    return count + currentQuestionIndex;
  };

  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  // Timer effect for main test time
  useEffect(() => {
    let timer;
    if (phase === 'question' || phase === 'listening') {
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

  // Preparation countdown effect
  useEffect(() => {
    let timer;
    if (phase === 'preparation' && preparationTimeLeft > 0) {
      timer = setInterval(() => {
        setPreparationTimeLeft(prev => {
          if (prev <= 1) {
            setPhase('listening');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase, preparationTimeLeft]);

  // Simulate audio playback
  const togglePlayPause = () => {
    if (isPlaying) {
      clearInterval(audioIntervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const duration = currentSection.audioDuration;
      const startTime = audioCurrentTime;
      
      audioIntervalRef.current = setInterval(() => {
        setAudioCurrentTime(prev => {
          const newTime = prev + 0.1;
          const newProgress = (newTime / duration) * 100;
          setAudioProgress(newProgress);
          
          if (newTime >= duration) {
            clearInterval(audioIntervalRef.current);
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

  const handleNext = () => {
    if (phase === 'instructions') {
      setPhase('context');
    } else if (phase === 'context') {
      setPhase('listening');
    } else if (phase === 'question') {
      if (currentQuestionIndex < currentSection.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else if (currentSectionIndex < scenario.sections.length - 1) {
        setCurrentSectionIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
        setHasPlayedAudio(false);
        setAudioProgress(0);
        setAudioCurrentTime(0);
        
        const nextSection = scenario.sections[currentSectionIndex + 1];
        if (nextSection.preparationTime) {
          setPreparationTimeLeft(nextSection.preparationTime);
          setPhase('preparation');
        } else {
          setPhase('listening');
        }
      } else {
        handleComplete();
      }
    }
  };

  const handleBack = () => {
    if (phase === 'context') {
      setPhase('instructions');
    } else if (phase === 'question' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setPhase('results');
  };

  const handleAnswerSelect = (questionId, answerId) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };

  const progressPercentage = ((getAbsoluteQuestionIndex() + 1) / totalQuestions) * 100;

  // Instructions Screen
  const renderInstructions = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/25">
          <Headphones className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">{scenario.taskName}</h2>
        <p className="text-slate-500 text-lg">{scenario.title.replace(/_/g, ' ')}</p>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 mb-8 border border-slate-200/80">
        <h3 className="font-semibold text-slate-900 mb-5 flex items-center gap-2 text-lg">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          Instructions
        </h3>
        <div className="space-y-4">
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

  // Context Screen
  const renderContext = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4 border border-blue-100">
          <Info className="w-4 h-4" />
          Context
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Instructions</h2>
      </div>

      <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-8 mb-6 border border-slate-200/80">
        <p className="text-slate-700 leading-relaxed text-lg text-center">
          You will hear a conversation between a man and a woman in a health club. 
          The woman provides customer service; the man is a customer.
        </p>
      </div>

      {/* Placeholder Image */}
      <div className="mb-8 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-blue-100 to-indigo-100 h-56 flex items-center justify-center border border-slate-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/80 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Headphones className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-slate-600 font-medium">Health Club Reception</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleBack}
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

  // Preparation Screen
  const renderPreparation = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6 border border-blue-100">
          <Info className="w-4 h-4" />
          Practice • Preparation
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-8 mb-8 border border-slate-200/80">
          <div className="flex items-center justify-center gap-3 mb-8">
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
            onClick={handleBack}
            className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={() => {
              setPreparationTimeLeft(0);
              setPhase('listening');
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

  // Listening Screen
  const renderListening = () => (
    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6 border border-blue-100">
          <Info className="w-4 h-4" />
          Practice • Intro
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-8 mb-6 border border-slate-200/80">
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
                    {formatTime(currentSection.audioDuration)}
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

          {showTranscript && (
            <div className="mt-4 bg-white rounded-xl p-5 border border-slate-200 text-left text-sm text-slate-700 max-h-48 overflow-y-auto leading-relaxed">
              <p className="font-semibold text-blue-600 mb-2">MAN:</p>
              <p className="mb-3">Excuse me, before I leave, could you take a look at my account and see how many cardio classes I have left?</p>
              <p className="font-semibold text-purple-600 mb-2">WOMAN:</p>
              <p className="mb-3">Sure. Do you have your membership card? Let's see... You have 5 classes left. Did you know we have a special promotion this month? If you buy a 20-class package, you get a 10% discount.</p>
              <p className="font-semibold text-blue-600 mb-2">MAN:</p>
              <p>I already get a 15% student discount. Can I add it on to that?</p>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-400 mb-6">
          In the real test, the audio plays once and no transcript is available.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleBack}
            className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={() => setPhase('question')}
            disabled={!hasPlayedAudio && !showTranscript}
            className={`flex-1 py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 ${
              hasPlayedAudio || showTranscript
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  // Question Screen
  const renderQuestion = () => {
    if (!currentQuestion) return null;
    const absoluteIndex = getAbsoluteQuestionIndex();
    const selectedAnswer = answers[currentQuestion.id];

    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6">
          <span className="text-lg text-slate-500 font-medium">
            Question {absoluteIndex + 1} of {totalQuestions}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 border border-slate-200/80">
            <h3 className="font-bold text-slate-900 text-xl mb-2">
              {currentQuestion.questionText?.split('?')[0] || 'Health Club Conversation'}
            </h3>
            <p className="text-slate-500 mb-6">
              Listen once and answer the question.
            </p>

            {/* Mini Audio Player */}
            <div className="flex items-center gap-4 bg-white rounded-xl p-4 border border-slate-200 mb-5">
              <button
                onClick={togglePlayPause}
                className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white hover:shadow-lg transition-all"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">00:00</span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all w-0" />
                  </div>
                  <span className="text-xs text-slate-500 font-mono">0:06</span>
                </div>
              </div>
              <Volume2 className="w-5 h-5 text-slate-400" />
            </div>

            {currentQuestion.tip && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
                <p className="text-sm text-amber-800">
                  <span className="font-bold">Tip:</span> {currentQuestion.tip}
                </p>
              </div>
            )}

            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="mt-5 w-full py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
            </button>
          </div>

          {/* Right Side - Answers */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-6 border border-slate-200/80">
            <h3 className="font-bold text-slate-900 text-xl mb-2">Choose the best answer</h3>
            <p className="text-slate-500 mb-6">
              Select one option. You can change your answer before moving on.
            </p>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                  className={`w-full p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                    selectedAnswer === option.id
                      ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md text-slate-700'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    selectedAnswer === option.id
                      ? 'border-white bg-white'
                      : 'border-slate-300'
                  }`}>
                    {selectedAnswer === option.id && (
                      <div className="w-3.5 h-3.5 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <span className="font-medium text-lg">{option.text}</span>
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
            onClick={handleBack}
            disabled={currentQuestionIndex === 0 && currentSectionIndex === 0}
            className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!selectedAnswer}
            className={`flex-1 py-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 ${
              selectedAnswer
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  // Results Screen
  const renderResults = () => {
    const correctCount = allQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          <p className="text-slate-500 text-lg">{scenario.taskName} - {scenario.title.replace(/_/g, ' ')}</p>
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
            onClick={() => {
              setPhase('instructions');
              setCurrentSectionIndex(0);
              setCurrentQuestionIndex(0);
              setAnswers({});
              setHasPlayedAudio(false);
              setAudioProgress(0);
              setAudioCurrentTime(0);
              setTimeLeft(scenario.totalTime);
              setShowTranscript(false);
            }}
            className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
          <button
            className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
          >
            Back to Scenarios
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
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="font-bold text-slate-900 text-lg">
                Listening • {scenario.taskName}
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
      <main className="max-w-6xl mx-auto px-6 py-12">
        {phase === 'instructions' && renderInstructions()}
        {phase === 'context' && renderContext()}
        {phase === 'preparation' && renderPreparation()}
        {phase === 'listening' && renderListening()}
        {phase === 'question' && renderQuestion()}
        {phase === 'results' && renderResults()}
      </main>
    </div>
  );
}
