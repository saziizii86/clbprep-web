// src/pages/Listening/2. Daily Life Conversation/ListeningDailyLifeConversationTest.tsx
import React from "react";
import ListeningPracticeTest from "../1. Problem Solving/ListeningPracticeTest";

type Props = {
  scenario: any;
  onBack: () => void;
  onComplete: (results: any) => void;
};

/**
 * Listening Part 2: Daily Life Conversation
 * - ONE conversation
 * - 5 questions after listening
 * - Uses the main ListeningPracticeTest component which handles DB saving
 */
export default function ListeningDailyLifeConversationTest({
  scenario,
  onBack,
  onComplete,
}: Props) {
  return (
    <ListeningPracticeTest scenario={scenario} onBack={onBack} onComplete={onComplete} />
  );
}
