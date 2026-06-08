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

function buildStoryPrompt(
  knownWords: Word[],
  length: "short" | "medium",
  maxStretchWords: number
): string {
  const wordList = knownWords.map((w) => w.lemma).slice(0, 500);
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
  if (!jsonMatch) throw new Error("Failed to parse story from LLM response");
  return JSON.parse(jsonMatch[0]);
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

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const prompt = buildStoryPrompt(knownWords, length, maxStretchWords);

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

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
    return generateStoryWithGemini(knownWords, length, maxStretchWords);
  }
  return generateFallbackStory(knownWords, length);
}

export async function checkStoriesUnlocked(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "known");

  return (count ?? 0) >= STORY_UNLOCK_THRESHOLD;
}
