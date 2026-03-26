// src/pages/Speaking/SpeakingPracticeTest.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Mic, Square, Play, Pause, Clock, 
  AlertCircle, CheckCircle, Send, Volume2, RefreshCw, Edit3
} from 'lucide-react';

interface SpeakingPracticeTestProps {
  scenario: any;
  onBack: () => void;
  onComplete: (results: any) => void;
  apiSettings: any;
}

const SpeakingPracticeTest: React.FC<SpeakingPracticeTestProps> = ({
  scenario,
  onBack,
  onComplete,
  apiSettings
}) => {
  type StageType = 'selection' | 'prep' | 'recording' | 'review' | 'results';

const isPart5Comparing =
  !!scenario?.uploadedFiles?.optionATitle &&
  !!scenario?.uploadedFiles?.optionBTitle &&
  !!scenario?.uploadedFiles?.optionCTitle;

const [stage, setStage] = useState<StageType>(isPart5Comparing ? 'selection' : 'prep');

// Part 5 states
// ✅ Per-task timing map for ALL 8 tasks
const taskTimingMap: Record<string, { prepTime: number; maxTime: number }> = {
  task1: { prepTime: 30, maxTime: 90 },
  task2: { prepTime: 30, maxTime: 60 },
  task3: { prepTime: 30, maxTime: 60 },
  task4: { prepTime: 30, maxTime: 60 },
  task5: { prepTime: 60, maxTime: 60 },
  task6: { prepTime: 60, maxTime: 60 },
  task7: { prepTime: 30, maxTime: 90 },
  task8: { prepTime: 30, maxTime: 60 },
};
const taskTiming = taskTimingMap[scenario?.taskType] || { prepTime: 30, maxTime: 90 };
const initialPrepTime = taskTiming.prepTime;
const initialMaxTime = taskTiming.maxTime;

// Part 5 states
const [selectedComparisonOption, setSelectedComparisonOption] = useState<'A' | 'B' | null>(null);
const [selectionTime, setSelectionTime] = useState(initialPrepTime); // ✅ uses task timing

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const [prepTime, setPrepTime] = useState(initialPrepTime);
  
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [expandedSample, setExpandedSample] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const files = scenario?.uploadedFiles || {};
  const maxRecordingTime = initialMaxTime;

  // Debug: Log apiSettings
  useEffect(() => {
    console.log('=== SpeakingPracticeTest Debug ===');
    console.log('apiSettings:', apiSettings);
  }, [apiSettings]);

  const isAPIAvailable = !!(apiSettings?.isConnected && apiSettings?.openAIKey);

  // Prep time countdown
  useEffect(() => {
    if (stage === 'prep' && prepTime > 0) {
      prepTimerRef.current = setInterval(() => {
        setPrepTime(prev => {
          if (prev <= 1) {
            if (prepTimerRef.current) clearInterval(prepTimerRef.current);
            setStage('recording');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    };
  }, [stage, prepTime]);

useEffect(() => {
  if (!isPart5Comparing) return;

  if (stage === 'selection' && selectionTime > 0) {
    const t = setInterval(() => {
      setSelectionTime((prev) => {
        if (prev <= 1) {
          clearInterval(t);

          // ✅ If user didn't choose -> auto random
          if (!selectedComparisonOption) {
            const randomPick = Math.random() < 0.5 ? 'A' : 'B';
            setSelectedComparisonOption(randomPick);
          }

          setStage('prep');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }
}, [stage, selectionTime, isPart5Comparing, selectedComparisonOption]);


  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxRecordingTime) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, maxRecordingTime]);

  // AUTO-TRANSCRIBE when audioBlob changes and we're in review stage
// AUTO-TRANSCRIBE when audioBlob changes and we're in review stage
useEffect(() => {
  // Only run in review stage
  if (!audioBlob || stage !== "review") return;

  // If we already have transcript, do nothing
  if (transcript.trim()) return;

  // Wait until API settings are available
  if (!isAPIAvailable) return;

  console.log("Auto-transcribing audio...");
  transcribeAudio(audioBlob);
}, [audioBlob, stage, transcript, isAPIAvailable]);




  const startRecording = async () => {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      
      // Reset previous transcript
      setTranscript('');
      setManualTranscript('');
      setTranscriptionError(null);
      
      const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
];

const selectedMimeType =
  preferredMimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "";

const mediaRecorder = selectedMimeType
  ? new MediaRecorder(stream, { mimeType: selectedMimeType })
  : new MediaRecorder(stream);

mediaRecorderRef.current = mediaRecorder;
audioChunksRef.current = [];

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Audio chunk received:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, total chunks:', audioChunksRef.current.length);
        const blobType = selectedMimeType || "audio/webm";
const blob = new Blob(audioChunksRef.current, { type: blobType });

        console.log('Audio blob created:', blob.size, 'bytes');
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
        setStage('review');
      };

      mediaRecorder.start(1000); // Collect data every 1 second
      setIsRecording(true);
      setRecordingTime(0);
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const transcribeAudio = async (blob?: Blob): Promise<string | null> => {
    const audioToTranscribe = blob || audioBlob;
    
    if (!audioToTranscribe) {
      console.error('No audio to transcribe');
      return null;
    }
	
	  // ✅ PUT IT HERE ✅
  if (audioToTranscribe.size < 2000) {
    setTranscriptionError("Recording is too short. Please try again.");
    setShowManualInput(true);
    return null;
  }
    
    if (!apiSettings?.openAIKey) {
      console.error('No OpenAI API key');
      setTranscriptionError('API key not available');
      setShowManualInput(true);
      return null;
    }
    
    setIsTranscribing(true);
    setTranscriptionError(null);
    console.log('Starting transcription, blob size:', audioToTranscribe.size);
    
    try {
      const formData = new FormData();
      formData.append('file', audioToTranscribe, 'recording.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiSettings.openAIKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transcription error:', response.status, errorText);
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Transcription successful:', data.text);
      setTranscript(data.text);
      return data.text;
    } catch (error: any) {
      console.error('Transcription error:', error);
      setTranscriptionError(error.message || 'Failed to transcribe');
      setShowManualInput(true);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const evaluateSpeaking = async () => {
    // Use manual transcript if provided, otherwise use auto transcript
    const currentTranscript = manualTranscript || transcript;
    
    if (!currentTranscript) {
      alert('Please wait for transcription or enter your response manually.');
      setShowManualInput(true);
      return;
    }

    if (!apiSettings?.openAIKey) {
      alert('API key not available.');
      return;
    }

    setIsEvaluating(true);
    try {
      const systemPrompt = `You are a CELPIP Speaking examiner. Evaluate the following spoken response based on CELPIP scoring criteria (0-12 scale).

CELPIP Speaking Scoring Criteria:
- Content/Coherence: Task fulfillment, organization, coherence
- Vocabulary: Range, accuracy, appropriateness  
- Listenability: Pronunciation, fluency, pace
- Grammar: Grammatical range and accuracy

Score Levels:
- 10-12: Advanced proficiency, native-like fluency
- 7-9: Adequate to good proficiency
- 4-6: Developing proficiency
- 0-3: Minimal proficiency

The speaking prompt was: "${files.speakingPrompt || scenario?.title || 'General speaking task'}"

Provide your evaluation in JSON format only:
{
  "overallScore": <number 0-12>,
  "breakdown": {
    "contentCoherence": <number 0-12>,
    "vocabulary": <number 0-12>,
    "listenability": <number 0-12>,
    "grammar": <number 0-12>
  },
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"],
  "detailedFeedback": "<2-3 sentences of specific feedback>"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiSettings.openAIKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: apiSettings.modelName || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Student's spoken response: "${currentTranscript}"` }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) throw new Error('Evaluation failed');
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evalResult = JSON.parse(jsonMatch[0]);
        setEvaluation(evalResult);
        setStage('results');
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      alert('Failed to evaluate. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const resetRecording = () => {
    if (remainingAttempts > 1) {
      setRemainingAttempts(prev => prev - 1);
      setAudioBlob(null);
      setAudioUrl(null);
      setTranscript('');
      setManualTranscript('');
      setShowManualInput(false);
      setTranscriptionError(null);
      setEvaluation(null);
      setRecordingTime(0);
      setPrepTime(initialPrepTime);
      setStage(isPart5Comparing ? 'selection' : 'prep');
	  setSelectedComparisonOption(null);
	  setSelectionTime(initialPrepTime);

    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gray-50 p-3 sm:p-4 lg:p-6">
      {/* Header */}
{/* Compact Header */}
<div className="mb-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 sm:px-5 sm:py-4 text-white">
  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-sm sm:text-base text-white/90 hover:text-white"
    >
      <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      Back to Speaking
    </button>

    <span className="text-xs sm:text-sm text-white/90">
      Attempts remaining: {remainingAttempts}/3
    </span>
  </div>

  <h1 className="text-xl sm:text-2xl font-bold leading-tight">
    {scenario?.title || 'Speaking Practice'}
  </h1>
  <p className="mt-1 text-sm sm:text-base text-orange-100">
    {scenario?.taskName || 'Speaking Task'}
  </p>
</div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left: Prompt & Recording */}
        <div className="min-w-0 space-y-4">
          {/* Prompt */}
 <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5 lg:p-6">
            <h3 className="mb-3 text-base sm:text-lg font-semibold">Instruction</h3>
            <p className="whitespace-pre-line text-sm sm:text-base text-gray-700 leading-6">
              {isPart5Comparing
                ? (stage === 'selection'
                    ? (files.selectionPrompt || 'Choose one option.')
                    : (files.comparisonPrompt || 'Compare and persuade your choice.'))
                : (files.instructions ||
                    scenario?.instructions ||
                    files.speakingPrompt ||
                    scenario?.description ||
                    'No instruction found in database.')}
            </p>
          </div>

          {/* Scene Image - own centered card */}
          {(scenario?.imageUrl ||
            scenario?.contextImage ||
            files?.contextImage?.storageUrl ||
            files?.contextImage?.data) && (
            <div className="w-full min-w-0 rounded-xl border bg-white p-4 shadow-sm sm:p-5 lg:p-6 flex justify-center items-center overflow-hidden">
              <img
                src={
                  scenario?.imageUrl ||
                  scenario?.contextImage ||
                  files?.contextImage?.storageUrl ||
                  files?.contextImage?.data
                }
                alt="Scene"
               className="block h-auto max-h-[330px] w-auto max-w-full rounded-xl object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
		  
		  

          {/* placeholder for Part5 and other content below */}
          <div className="bg-white rounded-xl p-6 border shadow-sm">

		  



			



{/* ✅ Part 5 (Comparing): show Option A/B selection first, then Option C vs user choice */}
{isPart5Comparing ? (
  <>
    {/* ✅ Selection Stage */}
    {stage === 'selection' && (
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A */}
          <button
            onClick={() => setSelectedComparisonOption('A')}
            className={`h-full text-left rounded-xl border p-4 transition ${
              selectedComparisonOption === 'A'
                ? 'border-green-500 ring-2 ring-green-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >


{files.speakingImages?.[0] && (
  <div className="w-full h-64 bg-slate-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
    <img
      src={files.speakingImages[0]?.data || files.speakingImages[0]?.storageUrl}
      className="w-full h-full object-contain"
      alt="Option A"
    />
  </div>
)}
		  <h4 className="font-bold text-gray-900 mb-2">
  {files.optionATitle || "Option A"}
</h4>
            
            <p className="text-sm text-gray-600 whitespace-pre-line mt-2">
              {files.optionADetails || ""}
            </p>
          </button>

          {/* Option B */}
          <button
            onClick={() => setSelectedComparisonOption('B')}
            className={`h-full text-left rounded-xl border p-4 transition ${
              selectedComparisonOption === 'B'
                ? 'border-green-500 ring-2 ring-green-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >


{files.speakingImages?.[1] && (
  <div className="w-full h-64 bg-slate-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
    <img
      src={files.speakingImages[1]?.data || files.speakingImages[1]?.storageUrl}
      className="w-full h-full object-contain"
      alt="Option B"
    />
  </div>
)}
<h4 className="font-bold text-gray-900 mb-2">
  {files.optionBTitle || "Option B"}
</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line mt-2">
              {files.optionBDetails || ""}
            </p>
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500">
            Auto-select in <span className="font-bold text-orange-600">{selectionTime}s</span>
          </div>

          <button
            onClick={() => setStage('prep')}
            disabled={!selectedComparisonOption}
            className={`w-full sm:w-auto px-6 py-2 rounded-lg text-white ${
              selectedComparisonOption
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Continue →
          </button>
        </div>
      </div>
    )}

{stage !== "selection" && (
  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

    {/* ✅ If user selected A → A LEFT, C RIGHT */}
    {selectedComparisonOption === "A" && (
      <>
        {/* ✅ USER CHOICE (LEFT) */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-xs font-semibold text-green-700 mb-2">Your Choice</div>

          {files.speakingImages?.[0] && (
            <div className="w-full h-64 bg-slate-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
              <img
                src={files.speakingImages[0]?.data || files.speakingImages[0]?.storageUrl}
                className="w-full h-full object-contain"
                alt="Option A"
              />
            </div>
          )}

          <h4 className="font-bold text-gray-900">{files.optionATitle || "Option A"}</h4>
          <p className="text-sm text-gray-600 whitespace-pre-line mt-2">
            {files.optionADetails || ""}
          </p>
        </div>

        {/* ✅ OPTION C (RIGHT) */}
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="text-xs font-semibold text-yellow-700 mb-2">
            {files.optionCLabel || "Your Family"}
          </div>

          {files.speakingImages?.[2] && (
            <div className="w-full h-64 bg-slate-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
              <img
                src={files.speakingImages[2]?.data || files.speakingImages[2]?.storageUrl}
                className="w-full h-full object-contain"
                alt="Option C"
              />
            </div>
          )}

          <h4 className="font-bold text-gray-900">{files.optionCTitle || "Option C"}</h4>
          <p className="text-sm text-gray-600 whitespace-pre-line mt-2">
            {files.optionCDetails || ""}
          </p>
        </div>
      </>
    )}

    {/* ✅ If user selected B → C LEFT, B RIGHT */}
    {selectedComparisonOption === "B" && (
      <>
        {/* ✅ OPTION C (LEFT) */}
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="text-xs font-semibold text-yellow-700 mb-2">
            {files.optionCLabel || "Your Family"}
          </div>

          {files.speakingImages?.[2] && (
            <div className="w-full h-64 bg-slate-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
              <img
                src={files.speakingImages[2]?.data || files.speakingImages[2]?.storageUrl}
                className="w-full h-full object-contain"
                alt="Option C"
              />
            </div>
          )}

          <h4 className="font-bold text-gray-900">{files.optionCTitle || "Option C"}</h4>
          <p className="text-sm text-gray-600 whitespace-pre-line mt-2">
            {files.optionCDetails || ""}
          </p>
        </div>

        {/* ✅ USER CHOICE (RIGHT) */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-xs font-semibold text-green-700 mb-2">Your Choice</div>

          {files.speakingImages?.[1] && (
            <div className="w-full h-64 bg-slate-100 rounded-lg overflow-hidden mb-3 flex items-center justify-center">
              <img
                src={files.speakingImages[1]?.data || files.speakingImages[1]?.storageUrl}
                className="w-full h-full object-contain"
                alt="Option B"
              />
            </div>
          )}

          <h4 className="font-bold text-gray-900">{files.optionBTitle || "Option B"}</h4>
          <p className="text-sm text-gray-600 whitespace-pre-line mt-2">
            {files.optionBDetails || ""}
          </p>
        </div>
      </>
    )}

  </div>
)}

  </>
) : (
  // ✅ Normal tasks (not Part 5)
files.speakingImages?.[0] && (
    <img
      src={files.speakingImages[0]?.data || files.speakingImages[0]?.storageUrl}
      alt="Context"
      className="mx-auto mt-4 block h-auto max-h-[330px] max-w-full rounded-lg object-contain"
    />
  )
)}


          </div>

          {/* Recording Area */}
          <div className="w-full min-w-0 rounded-xl border bg-white p-4 shadow-sm sm:p-5 lg:p-6">
{stage === 'prep' && (
  <div className="py-3">
<div className="w-full flex flex-col gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col items-center justify-between gap-4 text-center lg:flex-row lg:text-left">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
          <Clock className="h-7 w-7 text-orange-600" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900">Preparation Time</h3>
          <p className="text-sm text-gray-600">
            Read the prompt and prepare your response
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-[72px] text-3xl font-bold leading-none text-orange-600">
          {prepTime}s
        </div>

        <button
          onClick={() => {
            if (prepTimerRef.current) clearInterval(prepTimerRef.current);
            setStage('recording');
          }}
          className="whitespace-nowrap rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Skip & Start
        </button>
      </div>
</div>
      {/* Auto-record note - inside orange box */}
      <div className="flex items-start gap-2 rounded-lg bg-orange-100 border border-orange-200 px-3 py-2 text-xs text-orange-800">
        <span>ℹ️</span>
        <p><span className="font-semibold">Real exam & mock test:</span> Recording starts <span className="font-semibold">automatically</span> once preparation time ends — no button needed.</p>
      </div>
    </div>
  </div>
)}

{stage === 'recording' && (
  <div className="py-3">
    <div className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full ${
                isRecording ? 'bg-red-100 animate-pulse' : 'bg-orange-100'
              }`}
            >
              <Mic
                className={`h-6 w-6 sm:h-7 sm:w-7 ${
                  isRecording ? 'text-red-600' : 'text-orange-600'
                }`}
              />
            </div>

            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {isRecording ? 'Recording in Progress' : 'Ready to Record'}
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                {formatTime(recordingTime)} / {formatTime(maxRecordingTime)}
              </p>
            </div>
          </div>

          <div className="mt-4 w-full rounded-full bg-gray-200 h-2">
            <div
              className="h-2 rounded-full bg-orange-600 transition-all"
              style={{ width: `${(recordingTime / maxRecordingTime) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex w-full md:w-auto justify-stretch md:justify-end">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-full bg-red-600 px-5 sm:px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              <Mic className="h-4 w-4" />
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-full bg-gray-800 px-5 sm:px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-900"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)}

            {stage === 'review' && (
              <div className="space-y-6">
                <h3 className="font-semibold text-center">Review Your Recording</h3>
                
                {/* Audio Player */}
                {audioUrl && (
                  <audio controls className="w-full">
                    <source src={audioUrl} type={audioBlob?.type || "audio/webm"} />

                  </audio>
                )}

                {/* Transcription Status */}
                {isTranscribing && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-blue-700">Transcribing your speech...</span>
                  </div>
                )}

                {/* Auto Transcript Display */}
                {transcript && !isTranscribing && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Your Speech (Auto-Transcribed)
                    </h4>
                    <p className="text-gray-700">{transcript}</p>
                  </div>
                )}

                {/* Transcription Error */}
                {transcriptionError && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Auto-transcription failed. Please enter your response manually below.
                    </p>
                  </div>
                )}

                {/* Manual Input */}
                <div className="border-t pt-4">
                  <button
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm mb-3"
                  >
                    <Edit3 className="w-4 h-4" />
                    {showManualInput ? 'Hide manual input' : 'Enter/Edit text manually'}
                  </button>
                  
                  {showManualInput && (
                    <div>
                      <textarea
                        value={manualTranscript}
                        onChange={(e) => setManualTranscript(e.target.value)}
                        placeholder="Type what you said here..."
                        className="w-full p-3 border rounded-lg h-32 resize-none focus:ring-2 focus:ring-orange-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This will be used instead of auto-transcription for evaluation.
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={resetRecording}
                    disabled={remainingAttempts <= 1}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Re-record ({remainingAttempts - 1} left)
                  </button>
                  <button
                    onClick={evaluateSpeaking}
                    disabled={isTranscribing || isEvaluating || (!transcript && !manualTranscript)}
                    className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isEvaluating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Get Score
                      </>
                    )}
                  </button>
                </div>

                {/* Status Info */}
                {!isAPIAvailable && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      AI scoring not available. Contact administrator.
                    </p>
                  </div>
                )}
              </div>
            )}

            {stage === 'results' && evaluation && (
              <div className="space-y-6">
                {/* Score Circle */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <span className="text-4xl font-bold">{evaluation.overallScore}</span>
                    <span className="text-lg">/12</span>
                  </div>
                  <h3 className="text-xl font-bold mt-3">Your Speaking Score</h3>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(evaluation.breakdown || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-bold text-orange-600">{value}/12</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-600 h-2 rounded-full" style={{ width: `${(value / 12) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Strengths */}
                {evaluation.strengths?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Strengths
                    </h4>
                    <ul className="space-y-1">
                      {evaluation.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {evaluation.improvements?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Areas for Improvement
                    </h4>
                    <ul className="space-y-1">
                      {evaluation.improvements.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Feedback */}
                {evaluation.detailedFeedback && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800 mb-2">Detailed Feedback</h4>
                    <p className="text-sm text-gray-700">{evaluation.detailedFeedback}</p>
                  </div>
                )}

                {/* Your Response */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Your Response</h4>
                  <p className="text-sm text-gray-600">{manualTranscript || transcript}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {remainingAttempts > 1 && (
                    <button onClick={resetRecording} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Try Again ({remainingAttempts - 1} left)
                    </button>
                  )}
                  <button
                    onClick={() => onComplete(evaluation)}
                    className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
       <div className="min-w-0 space-y-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
            <h3 className="font-semibold mb-3">Recording Info</h3>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between">
                <span className="text-gray-500">Max Time:</span>
                <span className="font-medium">{maxRecordingTime} seconds</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Prep Time:</span>
                <span className="font-medium">{initialPrepTime} seconds</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">AI Scoring:</span>
                <span className={`font-medium ${isAPIAvailable ? 'text-green-600' : 'text-red-600'}`}>
                  {isAPIAvailable ? 'Available' : 'Not Available'}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <h3 className="font-semibold mb-3">Tips</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Speak clearly and at a natural pace</li>
              <li>• Use a variety of vocabulary</li>
              <li>• Organize your ideas logically</li>
              <li>• Use examples to support your points</li>
            </ul>
          </div>
		  </div>

          {/* Sample Responses */}
          {(files.speakingSampleBasic || files.speakingSampleGood || files.speakingSampleExcellent) && (
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <h3 className="font-semibold mb-3">Sample Responses</h3>
              <div className="space-y-2">

                {files.speakingSampleBasic && (
                  <div className="border border-yellow-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSample(expandedSample === 'basic' ? null : 'basic')}
                      className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 text-left"
                    >
                      <span className="font-medium text-yellow-800 text-sm">Sample Response (Basic) · Score 5-6</span>
                      <span className="text-yellow-600 text-xs">{expandedSample === 'basic' ? '▲' : '▼'}</span>
                    </button>
                    {expandedSample === 'basic' && (
                      <div className="p-3 text-sm text-gray-700 bg-yellow-50/50 whitespace-pre-line">
                        {files.speakingSampleBasic}
                      </div>
                    )}
                  </div>
                )}

                {files.speakingSampleGood && (
                  <div className="border border-blue-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSample(expandedSample === 'good' ? null : 'good')}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 text-left"
                    >
                      <span className="font-medium text-blue-800 text-sm">Sample Response (Good) · Score 7-8</span>
                      <span className="text-blue-600 text-xs">{expandedSample === 'good' ? '▲' : '▼'}</span>
                    </button>
                    {expandedSample === 'good' && (
                      <div className="p-3 text-sm text-gray-700 bg-blue-50/50 whitespace-pre-line">
                        {files.speakingSampleGood}
                      </div>
                    )}
                  </div>
                )}

                {files.speakingSampleExcellent && (
                  <div className="border border-green-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSample(expandedSample === 'excellent' ? null : 'excellent')}
                      className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 text-left"
                    >
                      <span className="font-medium text-green-800 text-sm">Sample Response (Excellent) · Score 9-12</span>
                      <span className="text-green-600 text-xs">{expandedSample === 'excellent' ? '▲' : '▼'}</span>
                    </button>
                    {expandedSample === 'excellent' && (
                      <div className="p-3 text-sm text-gray-700 bg-green-50/50 whitespace-pre-line">
                        {files.speakingSampleExcellent}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>
	  
 
  );
};

export default SpeakingPracticeTest;
