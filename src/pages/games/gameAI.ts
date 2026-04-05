// src/pages/games/gameAI.ts
import { getAPISettings } from "../../services/settingsService";

/**
 * Calls the connected AI provider to generate game content.
 * Returns `fallback` immediately if no API is connected or on any error.
 */
export async function generateGameContent<T>(prompt: string, fallback: T): Promise<T> {
  try {
    const settings = await getAPISettings();
    if (!settings?.isConnected) return fallback;

    const provider: string = settings?.provider || "openai";
    const model: string = settings?.modelName || "gpt-4o-mini";

    // Pick the right key for the active provider
    const key: string =
      provider === "gemini"     ? settings?.geminiKey
      : provider === "claude"   ? settings?.claudeKey
      : provider === "deepseek" ? settings?.deepseekKey
      : provider === "groq"     ? settings?.groqKey
      : provider === "openrouter" ? settings?.openrouterKey
      : settings?.openAIKey || "";

    if (!key) return fallback;

    const system = "You are a JSON data generator for an English language learning app. Return ONLY valid JSON — no markdown, no code fences, no explanation.";
    let text = "";

    // ── OpenAI / DeepSeek ─────────────────────────────────────────────────
    if (provider === "openai" || provider === "deepseek") {
      const endpoint = provider === "deepseek"
        ? "https://api.deepseek.com/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({ model, max_tokens: 2000, temperature: 0.85,
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }),
      });
      const d = await res.json();
      text = d.choices?.[0]?.message?.content || "";
    }

    // ── Gemini ────────────────────────────────────────────────────────────
    else if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: 2000 } }) });
      const d = await res.json();
      text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // ── Claude ────────────────────────────────────────────────────────────
    else if (provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 2000, system, messages: [{ role: "user", content: prompt }] }),
      });
      const d = await res.json();
      text = d.content?.[0]?.text || "";
    }

    // ── Groq ──────────────────────────────────────────────────────────────
    else if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({ model, max_tokens: 2000, temperature: 0.85,
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }),
      });
      const d = await res.json();
      text = d.choices?.[0]?.message?.content || "";
    }

    // ── OpenRouter ────────────────────────────────────────────────────────
    else if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`,
          "HTTP-Referer": window.location.origin, "X-Title": "CLBPrep Games" },
        body: JSON.stringify({ model, max_tokens: 2000, temperature: 0.85,
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }),
      });
      const d = await res.json();
      text = d.choices?.[0]?.message?.content || "";
    }

    if (!text) return fallback;

    // Strip any accidental markdown fences
    const clean = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(clean);

    // Validate it's an array with at least one item
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;
    return parsed as T;

  } catch (err) {
    console.warn("[gameAI] Generation failed, using static fallback:", err);
    return fallback;
  }
}
