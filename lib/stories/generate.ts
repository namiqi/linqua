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

export async function generateStoryWithLLM(
  knownWords: Word[],
  length: "short" | "medium",
  maxStretchWords: number
): Promise<GeneratedStory> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const wordList = knownWords.map((w) => w.lemma).slice(0, 500);
  const lengthGuide =
    length === "short"
      ? "about 150-250 Russian words"
      : "about 400-600 Russian words";

  const prompt = `Write a ${lengthGuide} story entirely in Russian for a language learner.

RULES:
- Use ONLY vocabulary from this list when possible: ${wordList.join(", ")}
- You may use up to ${maxStretchWords} simple new words if needed for the story to flow; list them at the end.
- Use simple, clear sentences suitable for reading practice.
- Return JSON only with this shape: {"title": "...", "content_ru": "...", "stretch_words": ["word1", "word2"]}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a Russian language tutor creating graded reader stories. Respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse story from LLM response");

  const parsed = JSON.parse(jsonMatch[0]) as {
    title: string;
    content_ru: string;
    stretch_words?: string[];
  };

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
  if (process.env.OPENAI_API_KEY) {
    return generateStoryWithLLM(knownWords, length, maxStretchWords);
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
