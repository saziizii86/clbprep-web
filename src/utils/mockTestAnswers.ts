// D:\projects\celpip-master\src\utils\mockTestAnswers.ts
// Utility functions to save and retrieve mock test answers from localStorage

export type QuestionData = {
  questionIndex: number;
  questionText: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  correctLetter: string;
  userAnswerLetter: string;
  isCorrect: boolean;
};

export type PartAnswerData = {
  partNumber: number;
  partName: string;
  totalQuestions: number;
  answers: Record<number, string>;
  correctAnswers: Record<number, string>;
  questions: QuestionData[];
  savedAt: string;
};

// Part names for CELPIP Listening
export const LISTENING_PART_NAMES: Record<number, string> = {
  1: "Problem Solving",
  2: "Daily Life Conversation",
  3: "Information",
  4: "News Item",
  5: "Discussion",
  6: "Viewpoints",
};

// Expected questions per listening part
export const LISTENING_QUESTIONS_PER_PART: Record<number, number> = {
  1: 8,
  2: 5,
  3: 6,
  4: 5,
  5: 8,
  6: 6,
};

/**
 * Save answers for a specific listening mock test part to localStorage
 */
export function saveListeningPartAnswers(
  partNumber: number,
  answers: Record<number, string>,
  correctAnswers: Record<number, string>,
  questions: QuestionData[],
  mockSet?: number
): void {
  const setNumber = mockSet ?? getActiveMockSet();
  const storageKey = `mockListening_part${partNumber}_answers_set${setNumber}`;
  
  const data: PartAnswerData = {
    partNumber,
    partName: LISTENING_PART_NAMES[partNumber] || `Part ${partNumber}`,
    totalQuestions: questions.length || LISTENING_QUESTIONS_PER_PART[partNumber] || 0,
    answers,
    correctAnswers,
    questions,
    savedAt: new Date().toISOString(),
  };
  
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    console.log(`Saved listening part ${partNumber} answers for set ${setNumber}`, data);
  } catch (error) {
    console.error(`Failed to save listening part ${partNumber} answers:`, error);
  }
}

/**
 * Load answers for a specific listening mock test part from localStorage
 */
export function loadListeningPartAnswers(
  partNumber: number,
  mockSet?: number
): PartAnswerData | null {
  const setNumber = mockSet ?? getActiveMockSet();
  const storageKey = `mockListening_part${partNumber}_answers_set${setNumber}`;
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    return JSON.parse(stored) as PartAnswerData;
  } catch (error) {
    console.error(`Failed to load listening part ${partNumber} answers:`, error);
    return null;
  }
}

/**
 * Get all listening parts answers for a mock set
 */
export function getAllListeningAnswers(mockSet?: number): PartAnswerData[] {
  const setNumber = mockSet ?? getActiveMockSet();
  const parts: PartAnswerData[] = [];
  
  for (let partNum = 1; partNum <= 6; partNum++) {
    const data = loadListeningPartAnswers(partNum, setNumber);
    if (data) {
      parts.push(data);
    } else {
      // Create placeholder for missing part
      parts.push({
        partNumber: partNum,
        partName: LISTENING_PART_NAMES[partNum],
        totalQuestions: LISTENING_QUESTIONS_PER_PART[partNum],
        answers: {},
        correctAnswers: {},
        questions: [],
        savedAt: "",
      });
    }
  }
  
  return parts;
}

/**
 * Clear all listening answers for a mock set
 */
export function clearListeningAnswers(mockSet?: number): void {
  const setNumber = mockSet ?? getActiveMockSet();
  
  for (let partNum = 1; partNum <= 6; partNum++) {
    const storageKey = `mockListening_part${partNum}_answers_set${setNumber}`;
    localStorage.removeItem(storageKey);
  }
  
  // Also clear completion status
  localStorage.removeItem(`mockListening_completed_set${setNumber}`);
  localStorage.removeItem(`mockListening_score_set${setNumber}`);
  
  console.log(`Cleared all listening answers for set ${setNumber}`);
}

/**
 * Get the currently active mock set number
 */
export function getActiveMockSet(): number {
  try {
    const stored = localStorage.getItem("activeMockSet");
    return stored ? parseInt(stored, 10) : 1;
  } catch {
    return 1;
  }
}

/**
 * Set the active mock set number
 */
export function setActiveMockSet(setNumber: number): void {
  localStorage.setItem("activeMockSet", String(setNumber));
}

/**
 * Calculate correct answer letter from questionAnswers array
 * Format: [questionText, optionA, optionB, optionC, optionD, correctLetter]
 * Or: [optionA, optionB, optionC, optionD, correctLetter]
 */
export function getCorrectAnswerLetter(questionAnswers: string[]): string {
  if (!questionAnswers || questionAnswers.length === 0) return "";
  
  // Last item should be the correct letter (A, B, C, D)
  const lastItem = questionAnswers[questionAnswers.length - 1]?.trim();
  
  // Check if it's a single letter answer
  if (lastItem && /^[A-D]$/i.test(lastItem)) {
    return lastItem.toUpperCase();
  }
  
  // If 6 items: [stem, A, B, C, D, letter]
  if (questionAnswers.length >= 6) {
    const possibleLetter = questionAnswers[5]?.trim();
    if (possibleLetter && /^[A-D]$/i.test(possibleLetter)) {
      return possibleLetter.toUpperCase();
    }
  }
  
  // If 5 items: [A, B, C, D, letter]
  if (questionAnswers.length >= 5) {
    const possibleLetter = questionAnswers[4]?.trim();
    if (possibleLetter && /^[A-D]$/i.test(possibleLetter)) {
      return possibleLetter.toUpperCase();
    }
  }
  
  return "";
}

/**
 * Get the correct option text based on the answer letter
 */
export function getCorrectOptionText(
  options: string[],
  correctLetter: string
): string {
  if (!options || !correctLetter) return "";
  
  const letterIndex = correctLetter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
  
  if (letterIndex >= 0 && letterIndex < options.length) {
    return options[letterIndex]?.trim() || "";
  }
  
  return "";
}

/**
 * Get the letter (A, B, C, D) for a user's answer based on matching option text
 */
export function getUserAnswerLetter(userAnswer: string, options: string[]): string {
  if (!userAnswer) return "";
  
  const trimmedAnswer = userAnswer.trim();
  
  // If already a letter
  if (/^[A-D]$/i.test(trimmedAnswer)) {
    return trimmedAnswer.toUpperCase();
  }
  
  // Find matching option (case-insensitive comparison)
  const index = options.findIndex(
    opt => opt?.trim().toLowerCase() === trimmedAnswer.toLowerCase()
  );
  
  if (index >= 0 && index < 4) {
    return String.fromCharCode(65 + index); // 0=A, 1=B, etc.
  }
  
  return "";
}

/**
 * Extract question stem from questionAnswers array
 */
export function getQuestionStem(questionAnswers: string[], questionIndex: number): string {
  if (!questionAnswers || questionAnswers.length === 0) {
    return `Question ${questionIndex + 1}`;
  }
  
  // Check if first item looks like a question (not a single letter, longer than typical option)
  const firstItem = questionAnswers[0]?.trim() || "";
  
  // If 6+ items and first is not a single letter, it's likely the stem
  if (questionAnswers.length >= 6 && !/^[A-D]$/i.test(firstItem)) {
    return firstItem || `Question ${questionIndex + 1}`;
  }
  
  // Otherwise, no stem provided
  return `Question ${questionIndex + 1}`;
}

/**
 * Extract options from questionAnswers array
 */
export function getOptions(questionAnswers: string[]): string[] {
  if (!questionAnswers || questionAnswers.length === 0) {
    return ["Option A", "Option B", "Option C", "Option D"];
  }
  
  // If 6+ items: [stem, A, B, C, D, letter] -> options are index 1-4
  if (questionAnswers.length >= 6) {
    const firstItem = questionAnswers[0]?.trim() || "";
    if (!/^[A-D]$/i.test(firstItem)) {
      return questionAnswers.slice(1, 5).map(s => s?.trim() || "");
    }
  }
  
  // If 5 items: [A, B, C, D, letter] -> options are index 0-3
  if (questionAnswers.length >= 5) {
    return questionAnswers.slice(0, 4).map(s => s?.trim() || "");
  }
  
  // Fallback: first 4 items
  return questionAnswers.slice(0, 4).map(s => s?.trim() || "");
}

/**
 * Build question data array for saving - THE MAIN FUNCTION TO USE
 * Call this in each mock test's goNext/onComplete handler
 */
export function buildQuestionDataArray(
  answers: Record<number, string>,
  questionAnswersRaw: string[][],
  totalQuestions: number
): QuestionData[] {
  const questions: QuestionData[] = [];
  
  for (let i = 0; i < totalQuestions; i++) {
    const raw = questionAnswersRaw[i] || [];
    const userAnswer = answers[i] || "";
    
    // Extract question text
    const questionText = getQuestionStem(raw, i);
    
    // Extract options
    const options = getOptions(raw);
    
    // Get correct letter
    const correctLetter = getCorrectAnswerLetter(raw);
    
    // Get correct option text
    const correctAnswer = getCorrectOptionText(options, correctLetter);
    
    // Get user's answer as letter
    const userAnswerLetter = getUserAnswerLetter(userAnswer, options);
    
    // Determine if answer is correct
    const isCorrect = userAnswerLetter !== "" && userAnswerLetter === correctLetter;
    
    questions.push({
      questionIndex: i,
      questionText,
      options,
      userAnswer,
      correctAnswer,
      correctLetter,
      userAnswerLetter,
      isCorrect,
    });
  }
  
  return questions;
}
