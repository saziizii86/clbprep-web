// src/pages/Writing/WritingPracticeTest.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Edit, 
  Send, 
  CheckCircle, 
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Award,
  Target,
  BookOpen,
  Zap,
  RotateCcw,
  Save,
  Eye,
  Lightbulb
} from 'lucide-react';

interface WritingPracticeTestProps {
  scenario: {
    id: string;
    title: string;
    skill: string;
    taskName: string;
    taskType: string;
    totalTime?: number;
    instructions?: string;
    contextDescription?: string;
    uploadedFiles?: {
      writingPrompt?: string;
      sampleBasic?: string;
      sampleGood?: string;
      sampleExcellent?: string;
      instructions?: string;
    };
  };
  apiSettings?: {
    openAIKey?: string;
    isConnected?: boolean;
    modelName?: string;
  };
  onBack: () => void;
  onComplete: (results: any) => void;
}

interface EvaluationResult {
  overallScore: number;
  breakdown: {
    contentCoherence: number;
    vocabulary: number;
    readability: number;
    taskFulfillment: number;
  };
  wordCount: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  error?: boolean;
  message?: string;
}

const WritingPracticeTest: React.FC<WritingPracticeTestProps> = ({
  scenario,
  apiSettings,
  onBack,
  onComplete
}) => {
  // State management
  const [writingResponse, setWritingResponse] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [expandedSample, setExpandedSample] = useState<'basic' | 'good' | 'excellent' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(27 * 60); // 27 minutes for each writing task
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [savedDraft, setSavedDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Determine if this is Writing Part 2 (Survey Questions)
  const isWritingPart2 = scenario.taskType === 'part2' || 
                         scenario.taskName?.toLowerCase().includes('survey');

  // Get the writing prompt from uploaded files
  const writingPrompt = scenario.uploadedFiles?.writingPrompt || 
                        scenario.instructions || 
                        scenario.contextDescription || 
                        'No writing prompt available.';

  const sampleBasic = scenario.uploadedFiles?.sampleBasic || '';
  const sampleGood = scenario.uploadedFiles?.sampleGood || '';
  const sampleExcellent = scenario.uploadedFiles?.sampleExcellent || '';

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, timeRemaining]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const autoSave = setInterval(() => {
      if (writingResponse && writingResponse !== savedDraft) {
        setSavedDraft(writingResponse);
        localStorage.setItem(`writing_draft_${scenario.id}`, writingResponse);
      }
    }, 30000);

    return () => clearInterval(autoSave);
  }, [writingResponse, savedDraft, scenario.id]);



  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWordCount = () => {
    return writingResponse.split(/\s+/).filter(word => word.length > 0).length;
  };
  
  // ✅ Match Speaking behavior: AI is available only if BOTH connected + key exist
const isAPIAvailable = !!(apiSettings?.isConnected && apiSettings?.openAIKey);

  // ============================================================
  // SCORE CALIBRATION FUNCTIONS
  // ============================================================
  
  const detectGrammarErrors = (text: string): number => {
    let errorCount = 0;
    const errorPatterns = [
      /\b(it|he|she|this|that)\s+(close|open|make|come|go|work|want|need|have|do|say|tell|give|take|find|think)\b/gi,
      /\bwhen i (move|come|go|start|begin|arrive|sign|choose|decide)\s/gi,
      /\byou (say|tell|promise|mention)\s+(the|it|me)\b/gi,
      /\bthis\s+make\s+me\b/gi,
      /\bit close at\b/gi,
      /\bhave\s+problem\b/gi,
      /\babout\s+problem\b/gi,
      /\bwork\s+evening\s+shift\b/gi,
    ];
    errorPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) errorCount += matches.length;
    });
    return Math.min(errorCount, 10);
  };
  
  const assessVocabularyLevel = (text: string): number => {
    const lowerText = text.toLowerCase();
    const advancedWords = ['facility', 'amenity', 'discrepancy', 'accommodation', 'resolution', 'inconvenience', 'consequently', 'furthermore', 'significantly'];
    const intermediateWords = ['disappointed', 'unfortunately', 'appreciate', 'situation', 'issue', 'request', 'inform', 'mention', 'discover', 'however', 'therefore', 'although'];
    let advancedCount = 0;
    let intermediateCount = 0;
    advancedWords.forEach(word => { if (lowerText.includes(word)) advancedCount++; });
    intermediateWords.forEach(word => { if (lowerText.includes(word)) intermediateCount++; });
    if (advancedCount >= 3) return 9;
    if (advancedCount >= 1) return 7;
    if (intermediateCount >= 3) return 6;
    return 5;
  };
  
  const assessSentenceComplexity = (text: string): number => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const complexIndicators = ['because', 'although', 'even though', 'while', 'since', 'unless', 'which', 'who', 'therefore'];
    let complexCount = 0;
    sentences.forEach(sentence => {
      if (complexIndicators.some(ind => sentence.toLowerCase().includes(ind))) complexCount++;
    });
    const ratio = sentences.length > 0 ? complexCount / sentences.length : 0;
    if (ratio >= 0.3) return 8;
    if (ratio >= 0.15) return 7;
    if (ratio >= 0.05) return 6;
    return 5;
  };
  
  const calibrateScores = (aiResult: EvaluationResult, text: string): EvaluationResult => {
    const grammarErrors = detectGrammarErrors(text);
    const vocabLevel = assessVocabularyLevel(text);
    const sentenceLevel = assessSentenceComplexity(text);
    console.log('Calibration:', { grammarErrors, vocabLevel, sentenceLevel, original: aiResult.breakdown });
    const calibrated = { ...aiResult };
    const breakdown = { ...aiResult.breakdown };
    
    // STRICT grammar error penalties
    if (grammarErrors >= 6) breakdown.readability = Math.min(breakdown.readability, 4);
    else if (grammarErrors >= 4) breakdown.readability = Math.min(breakdown.readability, 5);
    else if (grammarErrors >= 2) breakdown.readability = Math.min(breakdown.readability, 6);
    
    // Cap vocabulary based on detected level
    breakdown.vocabulary = Math.min(breakdown.vocabulary, vocabLevel);
    
    // Cap content based on sentence complexity (stricter: no +1 bonus)
    breakdown.contentCoherence = Math.min(breakdown.contentCoherence, sentenceLevel);
    
    // Cap task fulfillment based on average of other scores
    const avgOther = (breakdown.readability + breakdown.vocabulary + breakdown.contentCoherence) / 3;
    if (avgOther <= 5) breakdown.taskFulfillment = Math.min(breakdown.taskFulfillment, 6);
    else if (avgOther <= 6) breakdown.taskFulfillment = Math.min(breakdown.taskFulfillment, 7);
    
    // Calculate overall as FLOOR of average
    calibrated.overallScore = Math.floor((breakdown.contentCoherence + breakdown.vocabulary + breakdown.readability + breakdown.taskFulfillment) / 4);
    calibrated.breakdown = breakdown;
    calibrated.detailedFeedback = '[Calibrated: ' + grammarErrors + ' grammar errors, vocab=' + vocabLevel + ', complexity=' + sentenceLevel + '] ' + (calibrated.detailedFeedback || '');
    console.log('Calibrated:', calibrated.breakdown, 'Overall:', calibrated.overallScore);
    return calibrated;
  };

  // Default system prompt for Writing AI evaluation
  const defaultSystemPrompt = "You are a STRICT CELPIP Writing examiner. Score conservatively - most ESL learners score 4-7. " +
    "If there are grammar errors, Readability MAX 7. If vocabulary is basic, Vocabulary MAX 6. " +
    "Look for errors like: 'When I move here' (should be moved), 'it close' (should be closes), 'This make me' (should be makes). " +
    "Provide evaluation in JSON format: " +
    '{"overallScore": <0-12>, "breakdown": {"contentCoherence": <0-12>, "vocabulary": <0-12>, "readability": <0-12>, "taskFulfillment": <0-12>}, ' +
    '"wordCount": <number>, "strengths": ["<s1>", "<s2>"], "improvements": ["<i1>", "<i2>"], "detailedFeedback": "<feedback>"}';

  const evaluateWriting = async () => {
    if (!isAPIAvailable) {
      setEvaluation({
        error: true,
        message: 'Please connect to OpenAI API in Settings to enable AI evaluation.',
        overallScore: 0,
        breakdown: { contentCoherence: 0, vocabulary: 0, readability: 0, taskFulfillment: 0 },
        wordCount: getWordCount(),
        strengths: [],
        improvements: [],
        detailedFeedback: ''
      });
      return;
    }

    if (getWordCount() < 50) {
      setEvaluation({
        error: true,
        message: 'Please write at least 50 words before submitting for evaluation.',
        overallScore: 0,
        breakdown: { contentCoherence: 0, vocabulary: 0, readability: 0, taskFulfillment: 0 },
        wordCount: getWordCount(),
        strengths: [],
        improvements: [],
        detailedFeedback: ''
      });
      return;
    }

    setIsEvaluating(true);
    setEvaluation(null);

    try {
      // Build user prompt with optional selected option for Part 2
      let userPrompt = `Writing Task:
${writingPrompt}

Student's Response (${getWordCount()} words):
${writingResponse}`;

      // Add selected option context for Survey Questions (Part 2)
      if (isWritingPart2 && selectedOption) {
        userPrompt += `

Note: This is a survey-style question where the student chose to support Option ${selectedOption}. 
Evaluate whether the student:
1. Clearly stated their chosen option (Option ${selectedOption})
2. Provided relevant reasons to support their choice
3. Used appropriate examples or explanations
4. Maintained a clear position throughout the response`;
      }

      userPrompt += `

${sampleBasic || sampleGood || sampleExcellent ? `Reference Sample Answers for context:
Basic Level: ${sampleBasic || 'N/A'}
Good Level: ${sampleGood || 'N/A'}
Excellent Level: ${sampleExcellent || 'N/A'}` : ''}

Please evaluate the student's response and provide scores and feedback in JSON format.`;

      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings.openAIKey}`
        },
        body: JSON.stringify({
          model: apiSettings.modelName || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: defaultSystemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await apiResponse.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evalResult = JSON.parse(jsonMatch[0]);
        // APPLY CALIBRATION TO FIX INFLATED SCORES
        const calibratedResult = calibrateScores(evalResult, writingResponse);
        setEvaluation(calibratedResult);
        setShowResults(true);
        
        // Clear the saved draft after successful submission
        localStorage.removeItem(`writing_draft_${scenario.id}`);
      } else {
        throw new Error('Could not parse evaluation response');
      }
    } catch (error: any) {
      console.error('Evaluation error:', error);
      setEvaluation({
        error: true,
        message: error.message || 'Failed to evaluate writing. Please check your API key and try again.',
        overallScore: 0,
        breakdown: { contentCoherence: 0, vocabulary: 0, readability: 0, taskFulfillment: 0 },
        wordCount: getWordCount(),
        strengths: [],
        improvements: [],
        detailedFeedback: ''
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSubmit = () => {
    setIsTimerRunning(false);
    evaluateWriting();
  };

  const handleReset = () => {
    setWritingResponse('');
    setEvaluation(null);
    setSelectedOption(null);
    setShowResults(false);
    setTimeRemaining(27 * 60);
    setIsTimerRunning(true);
    localStorage.removeItem(`writing_draft_${scenario.id}`);
  };

  const handleComplete = () => {
    onComplete({
      response: writingResponse,
      evaluation,
      wordCount: getWordCount(),
      timeSpent: 27 * 60 - timeRemaining,
      selectedOption: isWritingPart2 ? selectedOption : null
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 10) return 'text-green-600';
    if (score >= 7) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 10) return 'bg-green-100';
    if (score >= 7) return 'bg-blue-100';
    if (score >= 4) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 10) return 'Advanced';
    if (score >= 7) return 'Good';
    if (score >= 4) return 'Developing';
    return 'Needs Improvement';
  };

  // Results View
  if (showResults && evaluation && !evaluation.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Tasks
            </button>
            <h1 className="text-xl font-bold text-gray-900">Writing Evaluation Results</h1>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>

          {/* Overall Score Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Score</h2>
                <p className="text-gray-600">{scenario.title}</p>
              </div>
              <div className={`text-center p-6 rounded-2xl ${getScoreBgColor(evaluation.overallScore)}`}>
                <div className={`text-5xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
                  {evaluation.overallScore}
                </div>
                <div className="text-sm text-gray-600 mt-1">out of 12</div>
                <div className={`text-sm font-medium mt-1 ${getScoreColor(evaluation.overallScore)}`}>
                  {getScoreLabel(evaluation.overallScore)}
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Content & Coherence', score: evaluation.breakdown.contentCoherence, icon: Target },
                { label: 'Vocabulary', score: evaluation.breakdown.vocabulary, icon: BookOpen },
                { label: 'Readability', score: evaluation.breakdown.readability, icon: Eye },
                { label: 'Task Fulfillment', score: evaluation.breakdown.taskFulfillment, icon: CheckCircle }
              ].map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 text-center">
                  <item.icon className={`w-6 h-6 mx-auto mb-2 ${getScoreColor(item.score)}`} />
                  <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                    {item.score}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Word Count */}
            <div className="flex items-center justify-center gap-2 mb-6 text-gray-600">
              <FileText className="w-4 h-4" />
              <span>Word Count: <strong>{evaluation.wordCount}</strong> words</span>
              {evaluation.wordCount >= 150 && evaluation.wordCount <= 200 && (
                <span className="text-green-600 text-sm">(within target range)</span>
              )}
              {evaluation.wordCount < 150 && (
                <span className="text-yellow-600 text-sm">(below 150 words)</span>
              )}
              {evaluation.wordCount > 200 && (
                <span className="text-yellow-600 text-sm">(above 200 words)</span>
              )}
            </div>
          </div>

          {/* Feedback Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Strengths */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {evaluation.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-orange-700 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {evaluation.improvements.map((improvement, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700">
                    <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Detailed Feedback */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detailed Feedback
            </h3>
            <p className="text-gray-700 leading-relaxed">{evaluation.detailedFeedback}</p>
          </div>

          {/* Your Response */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Your Response
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
              {writingResponse}
            </div>
          </div>

          {/* Sample Responses (if available) */}
          {(sampleBasic || sampleGood || sampleExcellent) && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Sample Responses</h3>
              <div className="space-y-2">
                {sampleExcellent && (
                  <div className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSample(expandedSample === 'excellent' ? null : 'excellent')}
                      className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition text-left"
                    >
                      <span className="font-medium text-green-800">Excellent Response (Score 10-12)</span>
                      {expandedSample === 'excellent' ? 
                        <ChevronUp className="w-4 h-4 text-green-600" /> : 
                        <ChevronDown className="w-4 h-4 text-green-600" />
                      }
                    </button>
                    {expandedSample === 'excellent' && (
                      <div className="p-4 bg-green-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                        {sampleExcellent}
                      </div>
                    )}
                  </div>
                )}
                {sampleGood && (
                  <div className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSample(expandedSample === 'good' ? null : 'good')}
                      className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition text-left"
                    >
                      <span className="font-medium text-blue-800">Good Response (Score 7-9)</span>
                      {expandedSample === 'good' ? 
                        <ChevronUp className="w-4 h-4 text-blue-600" /> : 
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      }
                    </button>
                    {expandedSample === 'good' && (
                      <div className="p-4 bg-blue-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                        {sampleGood}
                      </div>
                    )}
                  </div>
                )}
                {sampleBasic && (
                  <div className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSample(expandedSample === 'basic' ? null : 'basic')}
                      className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 transition text-left"
                    >
                      <span className="font-medium text-yellow-800">Basic Response (Score 4-6)</span>
                      {expandedSample === 'basic' ? 
                        <ChevronUp className="w-4 h-4 text-yellow-600" /> : 
                        <ChevronDown className="w-4 h-4 text-yellow-600" />
                      }
                    </button>
                    {expandedSample === 'basic' && (
                      <div className="p-4 bg-yellow-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                        {sampleBasic}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Try Again
            </button>
            <button
              onClick={handleComplete}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
            >
              Complete & Return
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Writing Test View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{scenario.title}</h1>
                <p className="text-sm text-gray-600">{scenario.taskName}</p>
              </div>
            </div>

            {/* Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
            }`}>
              <Clock className="w-5 h-5" />
              <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="ml-2 text-xs opacity-75 hover:opacity-100"
              >
                {isTimerRunning ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Writing Prompt */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                {isWritingPart2 ? 'Read the following survey question.' : 'Read the following information.'}
              </h2>
              
              <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {writingPrompt}
                </div>
              </div>

              {/* Task Instructions */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-800 mb-2">Instructions:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  {isWritingPart2 ? (
                    <>
                      <li>• Choose ONE option (A or B) to support</li>
                      <li>• Write 150-200 words explaining your choice</li>
                      <li>• Provide clear reasons and examples</li>
                      <li>• You have approximately 26 minutes</li>
                    </>
                  ) : (
                    <>
                      <li>• Write an email based on the given situation</li>
                      <li>• Write 150-200 words</li>
                      <li>• Use appropriate tone and format</li>
                      <li>• You have approximately 27 minutes</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Sample Responses (Collapsible) */}
            {(sampleBasic || sampleGood || sampleExcellent) && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Reference Sample Responses</h3>
                <div className="space-y-2">
                  {sampleBasic && (
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSample(expandedSample === 'basic' ? null : 'basic')}
                        className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 transition text-left"
                      >
                        <span className="font-medium text-yellow-800">Basic Level Sample</span>
                        {expandedSample === 'basic' ? 
                          <ChevronUp className="w-4 h-4 text-yellow-600" /> : 
                          <ChevronDown className="w-4 h-4 text-yellow-600" />
                        }
                      </button>
                      {expandedSample === 'basic' && (
                        <div className="p-4 bg-yellow-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                          {sampleBasic}
                        </div>
                      )}
                    </div>
                  )}
                  {sampleGood && (
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSample(expandedSample === 'good' ? null : 'good')}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition text-left"
                      >
                        <span className="font-medium text-blue-800">Good Level Sample</span>
                        {expandedSample === 'good' ? 
                          <ChevronUp className="w-4 h-4 text-blue-600" /> : 
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        }
                      </button>
                      {expandedSample === 'good' && (
                        <div className="p-4 bg-blue-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                          {sampleGood}
                        </div>
                      )}
                    </div>
                  )}
                  {sampleExcellent && (
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedSample(expandedSample === 'excellent' ? null : 'excellent')}
                        className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition text-left"
                      >
                        <span className="font-medium text-green-800">Excellent Level Sample</span>
                        {expandedSample === 'excellent' ? 
                          <ChevronUp className="w-4 h-4 text-green-600" /> : 
                          <ChevronDown className="w-4 h-4 text-green-600" />
                        }
                      </button>
                      {expandedSample === 'excellent' && (
                        <div className="p-4 bg-green-50/50 text-sm text-gray-700 whitespace-pre-wrap border-t">
                          {sampleExcellent}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Writing Area */}
          <div className="space-y-4">
            {/* Option Selection for Part 2 (Survey Questions) */}
            {isWritingPart2 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Select the option you want to support:</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedOption('A')}
                    className={`flex-1 py-4 px-6 rounded-xl border-2 font-medium transition ${
                      selectedOption === 'A' 
                        ? 'border-purple-600 bg-purple-100 text-purple-800' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <span className="block text-lg mb-1">Option A</span>
                    <span className="text-xs opacity-75">Support this choice</span>
                  </button>
                  <button
                    onClick={() => setSelectedOption('B')}
                    className={`flex-1 py-4 px-6 rounded-xl border-2 font-medium transition ${
                      selectedOption === 'B' 
                        ? 'border-purple-600 bg-purple-100 text-purple-800' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <span className="block text-lg mb-1">Option B</span>
                    <span className="text-xs opacity-75">Support this choice</span>
                  </button>
                </div>
              </div>
            )}

            {/* Writing Area */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-purple-600" />
                  Your Response
                </h3>
                <div className="flex items-center gap-4">
                  <span className={`text-sm ${
                    getWordCount() >= 150 && getWordCount() <= 200 
                      ? 'text-green-600' 
                      : getWordCount() > 200 
                        ? 'text-yellow-600' 
                        : 'text-gray-500'
                  }`}>
                    {getWordCount()} / 150-200 words
                  </span>
                  {savedDraft === writingResponse && writingResponse && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Save className="w-3 h-3" />
                      Saved
                    </span>
                  )}
                </div>
              </div>
              
              <textarea
                ref={textareaRef}
                value={writingResponse}
                onChange={(e) => setWritingResponse(e.target.value)}
                placeholder={isWritingPart2 
                  ? "Write your response here. Start by stating which option you support (A or B) and explain your reasons..."
                  : "Write your email here. Remember to include a greeting, body, and closing..."
                }
                className="w-full h-80 p-4 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-gray-800"
                disabled={timeRemaining <= 0}
              />

              

            {/* Error Message */}
            {evaluation?.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Evaluation Error</h4>
                    <p className="text-sm text-red-700 mt-1">{evaluation.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* API Connection Warning */}
            {!apiSettings?.isConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">AI Evaluation Not Available</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Please ask the administrator to connect the OpenAI API in Settings to enable AI-powered scoring.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!isAPIAvailable || isEvaluating || getWordCount() < 50 || (isWritingPart2 && !selectedOption)}
              className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition ${
                isEvaluating || getWordCount() < 50 || (isWritingPart2 && !selectedOption)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isEvaluating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Evaluating your response...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit for AI Evaluation
                </>
              )}
            </button>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-500">
              {isWritingPart2 && !selectedOption && (
                <p className="text-yellow-600">Please select Option A or B before submitting.</p>
              )}
              {getWordCount() < 50 && (
                <p>Write at least 50 words to submit for evaluation.</p>
              )}
              {getWordCount() >= 50 && apiSettings?.isConnected && (
                <p className="flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4 text-purple-500" />
                  Your response will be evaluated by AI on the CELPIP 0-12 scale.
                </p>
              )}
            </div>
          </div>
        </div>
		</div>   {/* ✅ close: grid lg:grid-cols-2 */}
      </div>
    </div>
  );
};

export default WritingPracticeTest;