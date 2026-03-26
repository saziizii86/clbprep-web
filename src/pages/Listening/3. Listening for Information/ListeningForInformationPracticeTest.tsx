// src/pages/Listening/3. Listening for Information/ListeningForInformationPracticeTest.tsx
import React from "react";
import ListeningPracticeTest from "../1. Problem Solving/ListeningPracticeTest";

/**
 * ✅ Listening Part 3: Listening for Information
 * - SAME engine as other listening parts
 * - Usually 1 listening section + 6 questions
 * - Your DB will provide real sections/questions
 * - Uses the main ListeningPracticeTest component which handles DB saving
 */

type Scenario = {
  id: string;
  title: string;
  skill: string;
  taskName: string;
  taskType: string;
  totalTime: number;
  instructions?: string;
  contextImage?: string;
  contextDescription?: string;
  sections: any[];
};

type TestResults = {
  scenarioId: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  timeSpent: number;
};

interface Props {
  scenario: Scenario;
  onBack: () => void;
  onComplete: (results: TestResults) => void;
}

const ListeningForInformationPracticeTest: React.FC<Props> = ({
  scenario,
  onBack,
  onComplete,
}) => {
  // ✅ Force taskName fallback (in case DB taskName is empty)
  const fixedScenario: Scenario = {
    ...scenario,
    taskName: scenario.taskName || "Information",
    taskType: scenario.taskType || "listening-for-information",
  };

  return (
    <ListeningPracticeTest
      scenario={fixedScenario as any}
      onBack={onBack}
      onComplete={onComplete}
    />
  );
};

export default ListeningForInformationPracticeTest;
