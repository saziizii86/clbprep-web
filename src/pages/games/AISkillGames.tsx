// src/pages/games/AISkillGames.tsx
import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Gamepad2, Search, Layers, AlignLeft,
  PenLine, Headphones, MessageSquare, Trophy, Star, Zap,
} from "lucide-react";

import WordSearch from "./WordSearch";
import MatchingGame from "./MatchingGame";
import SentenceBuilder from "./SentenceBuilder";
import FillInTheBlank from "./FillInTheBlank";
import ListeningPuzzle from "./ListeningPuzzle";
import DialogueCompletion from "./DialogueCompletion";

interface GameConfig { topic: string; difficulty: string; duration: number | null; }

const TOPIC_ICONS: Record<string, string> = {
  "Daily Life": "🏠", "Work": "💼", "Travel": "✈️", "Education": "📚",
  "Health": "🏥", "Food & Cooking": "🍳", "Shopping": "🛍️",
  "Technology": "💻", "Environment": "🌱", "Immigration": "🌍",
};

const GAMES = [
  { id: "word-search",      title: "Word Search",        description: "Find hidden English words in a letter grid. Great for vocabulary and spelling.", icon: <Search className="w-7 h-7" />, color: "text-blue-600",   bgColor: "bg-blue-50",   borderColor: "border-blue-200",   badge: "Vocabulary", skills: ["Vocabulary","Spelling"] },
  { id: "matching",         title: "Matching Game",       description: "Match words to their meanings. Flip cards to find the right pairs!", icon: <Layers className="w-7 h-7" />, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200", badge: "Memory",     skills: ["Vocabulary","Memory"] },
  { id: "sentence-builder", title: "Sentence Builder",    description: "Arrange jumbled words into the correct sentence. Master grammar and word order.", icon: <AlignLeft className="w-7 h-7" />, color: "text-green-600",  bgColor: "bg-green-50",  borderColor: "border-green-200",  badge: "Grammar",    skills: ["Grammar","Word Order"] },
  { id: "fill-blank",       title: "Fill in the Blank",   description: "Complete sentences with the missing word. Perfect for grammar and verb tenses.", icon: <PenLine className="w-7 h-7" />, color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200", badge: "Grammar",    skills: ["Grammar","Tenses"] },
  { id: "listening-puzzle", title: "Listening Puzzle",    description: "Listen to natural AI speech and arrange the words you heard. Sharpen your ear!", icon: <Headphones className="w-7 h-7" />, color: "text-teal-600",   bgColor: "bg-teal-50",   borderColor: "border-teal-200",   badge: "Listening",  skills: ["Listening","Comprehension"] },
  { id: "dialogue",         title: "Dialogue Completion", description: "Complete real-life conversations with the best response. Daily English practice.", icon: <MessageSquare className="w-7 h-7" />, color: "text-rose-600",   bgColor: "bg-rose-50",   borderColor: "border-rose-200",   badge: "Speaking",   skills: ["Communication","Real-life English"] },
];

const TOPICS = ["Daily Life","Work","Travel","Education","Health","Food & Cooking","Shopping","Technology","Environment","Immigration"];
const DIFFICULTIES = [{ id: "beginner", label: "Beginner", sub: "CLB 4–5" },{ id: "intermediate", label: "Intermediate", sub: "CLB 6–7" },{ id: "advanced", label: "Advanced", sub: "CLB 8+" }];
const DURATIONS = [{ id: 5, label: "Quick Play", sub: "~5 minutes" },{ id: 10, label: "Standard", sub: "~10 minutes" },{ id: 15, label: "Deep Play", sub: "~15 minutes" }];

interface Props { onBack: () => void; }

export default function AISkillGames({ onBack }: Props) {
  const [selectedGame, setSelectedGame] = useState<typeof GAMES[0] | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfig>({ topic: "", difficulty: "", duration: null });
  const [gameStarted, setGameStarted] = useState(false);

  // Scroll to top whenever the screen changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [selectedGame, gameStarted]);

  if (gameStarted && selectedGame) {
    const p = { config: { ...gameConfig, duration: gameConfig.duration ?? 10 }, onBack: () => { setGameStarted(false); setSelectedGame(null); } };
    return (
      <div className="min-h-screen bg-gray-50">
        {selectedGame.id === "word-search"      && <WordSearch {...p} />}
        {selectedGame.id === "matching"         && <MatchingGame {...p} />}
        {selectedGame.id === "sentence-builder" && <SentenceBuilder {...p} />}
        {selectedGame.id === "fill-blank"       && <FillInTheBlank {...p} />}
        {selectedGame.id === "listening-puzzle" && <ListeningPuzzle {...p} />}
        {selectedGame.id === "dialogue"         && <DialogueCompletion {...p} />}
      </div>
    );
  }

  if (selectedGame) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12">
        <button onClick={() => { setSelectedGame(null); window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition px-6 py-4 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to AI Skill Games
        </button>

        <div className={`mx-4 sm:mx-6 rounded-2xl p-6 mb-6 ${selectedGame.bgColor} border ${selectedGame.borderColor}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm ${selectedGame.color}`}>
              {selectedGame.icon}
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${selectedGame.color}`}>{selectedGame.title}</h1>
              <p className="text-gray-600 mt-0.5 text-sm">{selectedGame.description}</p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Topic */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">1</span>
              Choose a Topic
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {TOPICS.map((topic) => (
                <button key={topic} onClick={() => setGameConfig((p) => ({ ...p, topic }))}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition text-left flex items-center gap-2 ${
                    gameConfig.topic === topic
                      ? `${selectedGame.bgColor} ${selectedGame.color} ${selectedGame.borderColor} font-semibold`
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <span className="text-base">{TOPIC_ICONS[topic]}</span>
                  <span>{topic}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty + Duration */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">2</span>
              Choose Difficulty
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {DIFFICULTIES.map((d) => (
                <button key={d.id} onClick={() => setGameConfig((p) => ({ ...p, difficulty: d.id }))}
                  className={`py-4 rounded-xl border transition flex flex-col items-center ${
                    gameConfig.difficulty === d.id
                      ? `${selectedGame.bgColor} ${selectedGame.color} ${selectedGame.borderColor} font-semibold`
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <span className="text-sm font-semibold">{d.label}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{d.sub}</span>
                </button>
              ))}
            </div>

            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">3</span>
              Session Length
            </h2>
            <div className="space-y-2">
              {DURATIONS.map((dur) => (
                <button key={dur.id} onClick={() => setGameConfig((p) => ({ ...p, duration: dur.id }))}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition ${
                    gameConfig.duration === dur.id
                      ? `${selectedGame.bgColor} ${selectedGame.color} ${selectedGame.borderColor} font-semibold`
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <span className="text-sm font-medium">{dur.label}</span>
                  <span className="text-xs text-gray-400">{dur.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 mt-6">
          {(!gameConfig.topic || !gameConfig.difficulty || !gameConfig.duration) && (
            <p className="text-center text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl py-2.5 mb-3 font-medium">
              {!gameConfig.topic ? "⬆️ Please choose a topic" : !gameConfig.difficulty ? "⬆️ Please choose a difficulty" : "⬆️ Please choose a session length"}
            </p>
          )}
          <button onClick={() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); setGameStarted(true); }}
            disabled={!gameConfig.topic || !gameConfig.difficulty || !gameConfig.duration}
            className={`w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg transition hover:opacity-90 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed ${
              selectedGame.id === "word-search" ? "bg-blue-600" : selectedGame.id === "matching" ? "bg-purple-600" :
              selectedGame.id === "sentence-builder" ? "bg-green-600" : selectedGame.id === "fill-blank" ? "bg-orange-500" :
              selectedGame.id === "listening-puzzle" ? "bg-teal-600" : "bg-rose-500"}`}>
            <Gamepad2 className="w-5 h-5" /> Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition px-6 py-4 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mx-4 sm:mx-6 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Skill Games</h1>
            <p className="text-white/80 mt-0.5">Learn English through fun, interactive games — AI-powered voices & randomized content</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          {[["🏆","Points & Scores"],["⭐","Multiple Difficulty Levels"],["⚡","Randomized Every Game"],["🎙️","AI Natural Voice"]].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 text-sm">{icon} {label}</div>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Choose a Game</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {GAMES.map((game) => (
            <button key={game.id} onClick={() => { setSelectedGame(game); setGameConfig({ topic: "", difficulty: "", duration: null }); window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }}
              className={`bg-white border ${game.borderColor} rounded-2xl p-5 text-left hover:shadow-md transition group cursor-pointer`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${game.bgColor} flex items-center justify-center ${game.color} shrink-0`}>
                  {game.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-base">{game.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${game.bgColor} ${game.color}`}>{game.badge}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-snug">{game.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {game.skills.map((s) => <span key={s} className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{s}</span>)}
                  </div>
                </div>
              </div>
              <div className={`mt-4 py-2 rounded-xl text-center text-sm font-semibold ${game.color} ${game.bgColor} group-hover:opacity-90 transition`}>
                Play Now →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
