import { STORY_UNLOCK_THRESHOLD } from "../constants";
import { createServiceClient } from "../supabase/server";
import type { Word } from "../types";

export interface GeneratedStory {
  title: string;
  contentRu: string;
  knownWordPct: number;
  stretchWords: string[];
}

const CYRILLIC_WORD = /[\u0400-\u04FF]+/gu;

const DEFAULT_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
];

function extractStoryWords(text: string): string[] {
  return (text.match(CYRILLIC_WORD) ?? []).map((w) => w.toLowerCase());
}

export function computeCoverage(
  contentRu: string,
  knownLemmas: Set<string>
): { pct: number; unknown: string[] } {
  const words = extractStoryWords(contentRu);
  if (words.length === 0) return { pct: 100, unknown: [] };

  const unknown = [...new Set(words.filter((w) => !knownLemmas.has(w)))];
  const knownCount = words.length - words.filter((w) => !knownLemmas.has(w)).length;
  const pct = Math.round((knownCount / words.length) * 100);
  return { pct, unknown };
}

function pickWordsForPrompt(knownWords: Word[], limit = 120): string[] {
  const lemmas = knownWords.map((w) => w.lemma);
  if (lemmas.length <= limit) return lemmas;
  const shuffled = [...lemmas].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

function buildStoryPrompt(
  knownWords: Word[],
  length: "short" | "medium",
  maxStretchWords: number
): string {
  const wordList = pickWordsForPrompt(knownWords);
  const lengthGuide =
    length === "short"
      ? "about 150-250 Russian words"
      : "about 400-600 Russian words";

  return `You are a Russian language tutor creating graded reader stories.

Write a ${lengthGuide} story entirely in Russian for a language learner.

RULES:
- Use ONLY vocabulary from this list when possible: ${wordList.join(", ")}
- You may use up to ${maxStretchWords} simple new words if needed for the story to flow; list them in stretch_words.
- Use simple, clear sentences suitable for reading practice.
- Return JSON only with this shape: {"title": "...", "content_ru": "...", "stretch_words": ["word1", "word2"]}`;
}

function parseStoryJson(raw: string): {
  title: string;
  content_ru: string;
  stretch_words?: string[];
} {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse story from Gemini response");
  return JSON.parse(jsonMatch[0]);
}

function getGeminiModels(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  const models = configured
    ? [configured, ...DEFAULT_GEMINI_MODELS]
    : DEFAULT_GEMINI_MODELS;
  return [...new Set(models)];
}

function isQuotaError(status: number, body: string): boolean {
  return status === 429 || body.includes("RESOURCE_EXHAUSTED") || body.includes("quota");
}

export function formatGeminiError(status: number, body: string): string {
  if (isQuotaError(status, body)) {
    return "Gemini free-tier quota exceeded. Wait a minute and try again, set GEMINI_MODEL=gemini-2.0-flash-lite in Netlify, or enable billing in Google AI Studio.";
  }
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // use raw body below
  }
  return body.slice(0, 300);
}

async function callGeminiModel(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  const body = await response.text();
  if (!response.ok) {
    const err = new Error(formatGeminiError(response.status, body)) as Error & {
      status: number;
      isQuota: boolean;
    };
    err.status = response.status;
    err.isQuota = isQuotaError(response.status, body);
    throw err;
  }

  const data = JSON.parse(body) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function generateStoryWithGemini(
  knownWords: Word[],
  length: "short" | "medium",
  maxStretchWords: number
): Promise<GeneratedStory> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = buildStoryPrompt(knownWords, length, maxStretchWords);
  const models = getGeminiModels();
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const raw = await callGeminiModel(apiKey, model, prompt);
      const parsed = parseStoryJson(raw);
      const knownSet = new Set(knownWords.map((w) => w.lemma));
      const stretchWords = (parsed.stretch_words ?? []).slice(0, maxStretchWords);
      const { pct } = computeCoverage(parsed.content_ru, knownSet);

      return {
        title: parsed.title,
        contentRu: parsed.content_ru,
        knownWordPct: pct,
        stretchWords,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isQuota =
        error instanceof Error &&
        "isQuota" in error &&
        (error as { isQuota?: boolean }).isQuota;
      if (!isQuota) throw lastError;
    }
  }

  throw lastError ?? new Error("All Gemini models failed");
}

export async function generateFallbackStory(
  knownWords: Word[],
  length: "short" | "medium"
): Promise<GeneratedStory> {
  const sample = knownWords.slice(0, 30).map((w) => w.lemma);
  if (sample.length < 5) {
    throw new Error("Need at least 5 known words to generate a story");
  }

  const sentences = [
    `Однажды ${sample[0]} пошёл в город.`,
    `Там он встретил ${sample[1]} и ${sample[2]}.`,
    `Они говорили о ${sample[3]} и ${sample[4]}.`,
    `Было хорошо и интересно.`,
    `Потом ${sample[0]} вернулся домой.`,
  ];

  const contentRu =
    length === "medium"
      ? [...sentences, ...sentences, `Вечером всё было спокойно.`].join(" ")
      : sentences.join(" ");

  return {
    title: "Простая история",
    contentRu,
    knownWordPct: 95,
    stretchWords: [],
  };
}

export async function generateStory(
  knownWords: Word[],
  length: "short" | "medium",
  maxStretchWords: number
): Promise<GeneratedStory> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateStoryWithGemini(knownWords, length, maxStretchWords);
    } catch (error) {
      const isQuota =
        error instanceof Error &&
        (error.message.includes("quota") ||
          error.message.includes("RESOURCE_EXHAUSTED"));
      if (isQuota) {
        const fallback = await generateFallbackStory(knownWords, length);
        return {
          ...fallback,
          title: `${fallback.title} (Gemini quota — template fallback)`,
        };
      }
      throw error;
    }
  }
  return generateFallbackStory(knownWords, length);
}

export async function checkStoriesUnlocked(userId: string): Promise<boolean> {
  if (STORY_UNLOCK_THRESHOLD === 0) return true;

  const supabase = createServiceClient();
  const { count } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "known");

  return (count ?? 0) >= STORY_UNLOCK_THRESHOLD;
}
