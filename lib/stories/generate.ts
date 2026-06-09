import { STORY_UNLOCK_THRESHOLD } from "../constants";
import { isHtmlResponse, parseJsonText } from "../http";
import { createServiceClient } from "../supabase/server";
import type { Word } from "../types";
import {
  EmptyGeminiResponseError,
  isParseOrEmptyError,
  parseStoryJson,
} from "./parse";

export interface GeneratedStory {
  title: string;
  contentRu: string;
  knownWordPct: number;
  stretchWords: string[];
}

export interface StoryCoverage {
  exactPct: number;
  familiarPct: number;
  stretchInStory: number;
  totalTokens: number;
  unknownWords: string[];
}

const CYRILLIC_WORD = /[\u0400-\u04FF]+/gu;

const DEFAULT_GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
];

const PROMPT_VOCAB_LIMIT = 80;

const STORY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    content_ru: { type: "STRING" },
    stretch_words: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["title", "content_ru", "stretch_words"],
};

interface GeminiGenerateResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

function extractStoryWords(text: string): string[] {
  return (text.match(CYRILLIC_WORD) ?? []).map((w) => w.toLowerCase());
}

function isExactMatch(word: string, knownLemmas: Set<string>): boolean {
  return knownLemmas.has(word);
}

function isStretchMatch(word: string, stretchLemmas: Set<string>): boolean {
  return stretchLemmas.has(word);
}

/** Rough stem match: думать ↔ думаешь, устать ↔ устал */
function isStemMatch(word: string, lemma: string): boolean {
  if (lemma.includes(" ") || lemma.length < 3) return false;
  const stemLen = Math.min(lemma.length - 1, 5);
  const stem = lemma.slice(0, stemLen);
  return word.startsWith(stem) || lemma.startsWith(word);
}

export function isWordFamiliar(
  word: string,
  knownLemmas: Set<string>,
  stretchLemmas: Set<string>
): boolean {
  if (isExactMatch(word, knownLemmas) || isStretchMatch(word, stretchLemmas)) {
    return true;
  }
  for (const lemma of knownLemmas) {
    if (isStemMatch(word, lemma)) return true;
  }
  for (const lemma of stretchLemmas) {
    if (isStemMatch(word, lemma)) return true;
  }
  return false;
}

export function computeStoryCoverage(
  contentRu: string,
  knownLemmas: Set<string>,
  stretchWords: string[] = []
): StoryCoverage {
  const tokens = extractStoryWords(contentRu);
  if (tokens.length === 0) {
    return {
      exactPct: 100,
      familiarPct: 100,
      stretchInStory: 0,
      totalTokens: 0,
      unknownWords: [],
    };
  }

  const stretchSet = new Set(stretchWords.map((w) => w.toLowerCase()));
  let exactCount = 0;
  let familiarCount = 0;
  let stretchInStory = 0;
  const unknownSet = new Set<string>();

  for (const word of tokens) {
    if (isExactMatch(word, knownLemmas)) exactCount++;
    if (isStretchMatch(word, stretchSet)) stretchInStory++;
    if (isWordFamiliar(word, knownLemmas, stretchSet)) {
      familiarCount++;
    } else {
      unknownSet.add(word);
    }
  }

  return {
    exactPct: Math.round((exactCount / tokens.length) * 100),
    familiarPct: Math.round((familiarCount / tokens.length) * 100),
    stretchInStory,
    totalTokens: tokens.length,
    unknownWords: [...unknownSet].slice(0, 30),
  };
}

/** @deprecated use computeStoryCoverage */
export function computeCoverage(
  contentRu: string,
  knownLemmas: Set<string>
): { pct: number; unknown: string[] } {
  const result = computeStoryCoverage(contentRu, knownLemmas);
  return { pct: result.familiarPct, unknown: result.unknownWords };
}

function buildStoryPrompt(
  knownWords: Word[],
  length: "short" | "medium",
  maxStretchWords: number
): string {
  const wordList = knownWords.map((w) => w.lemma);
  const shuffled = [...wordList].sort(() => Math.random() - 0.5);
  const promptWords = shuffled.slice(0, PROMPT_VOCAB_LIMIT);
  const lengthGuide =
    length === "short"
      ? "about 50-80 Russian words"
      : "about 100-140 Russian words";

  return `You are a Russian language tutor creating graded reader stories.

Write a ${lengthGuide} dialogue or story entirely in Russian for a language learner.

STRICT VOCABULARY RULES:
- Every word in content_ru MUST come from ONLY these two sources:
  1) The learner's vocabulary list below (use any word form naturally: думать→думаешь, устать→устал)
  2) At most ${maxStretchWords} NEW words total — put ONLY these in stretch_words array
- Do NOT use any other words. If you need a word not in the list, it must be one of your ${maxStretchWords} stretch_words.
- stretch_words must contain ONLY genuinely new words not in the vocabulary list. Maximum ${maxStretchWords} items.

Learner vocabulary (sample of ${wordList.length} words, use any natural form):
${promptWords.join(", ")}

Return JSON with fields: title, content_ru, stretch_words`;
}

function getGeminiModels(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  const models = configured
    ? [configured, ...DEFAULT_GEMINI_MODELS]
    : DEFAULT_GEMINI_MODELS;
  return [...new Set(models)];
}

function isCapacityError(status: number, body: string): boolean {
  const lower = body.toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("unavailable")
  );
}

function isModelUnavailableError(status: number, body: string): boolean {
  const lower = body.toLowerCase();
  return (
    status === 404 ||
    lower.includes("not found for api version") ||
    lower.includes("is not supported for generatecontent") ||
    lower.includes("model_not_found") ||
    lower.includes("does not exist")
  );
}

function isRetryableApiError(status: number, body: string): boolean {
  return isCapacityError(status, body) || isModelUnavailableError(status, body);
}

export function formatGeminiError(status: number, body: string): string {
  if (isCapacityError(status, body)) {
    return "Gemini is busy or quota-limited. Wait a minute and try again, set GEMINI_MODEL=gemini-3.1-flash-lite in Netlify, or enable billing in Google AI Studio.";
  }
  if (isHtmlResponse(body)) {
    return "Gemini returned an unexpected HTML response. Check your GEMINI_API_KEY.";
  }
  try {
    const parsed = parseJsonText<{ error?: { message?: string } }>(body, "Gemini");
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // use raw body below
  }
  return body.slice(0, 300);
}

function extractGeminiText(data: GeminiGenerateResponse): string {
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new EmptyGeminiResponseError("Gemini returned no candidates");
  }

  const finishReason = candidate.finishReason;
  if (finishReason === "SAFETY" || finishReason === "RECITATION") {
    throw new Error(`Gemini blocked the response (${finishReason})`);
  }

  const parts = candidate.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("").trim();
  if (!text) {
    throw new EmptyGeminiResponseError(
      finishReason === "MAX_TOKENS"
        ? "Gemini response was cut off (MAX_TOKENS)"
        : "Gemini returned an empty response"
    );
  }

  return text;
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
          temperature: 0.6,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: STORY_RESPONSE_SCHEMA,
        },
      }),
    }
  );

  const body = await response.text();
  if (!response.ok) {
    const err = new Error(formatGeminiError(response.status, body)) as Error & {
      status: number;
      isRetryable: boolean;
    };
    err.status = response.status;
    err.isRetryable = isRetryableApiError(response.status, body);
    throw err;
  }

  if (isHtmlResponse(body)) {
    throw new Error("Gemini returned an HTML error page. Check your API key and model name.");
  }

  const data = parseJsonText<GeminiGenerateResponse>(body, "Gemini");

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt (${data.promptFeedback.blockReason})`);
  }

  return extractGeminiText(data);
}

function isRetryableGeminiError(error: unknown): boolean {
  if (isParseOrEmptyError(error)) return true;
  if (error instanceof Error && "isRetryable" in error) {
    return (error as { isRetryable?: boolean }).isRetryable === true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("not found for api version") ||
      msg.includes("is not supported for generatecontent") ||
      msg.includes("model_not_found")
    );
  }
  return false;
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
      const knownSet = new Set(knownWords.map((w) => w.lemma.toLowerCase()));
      const stretchWords = parsed.stretch_words
        .map((w) => w.toLowerCase())
        .slice(0, maxStretchWords);
      const coverage = computeStoryCoverage(
        parsed.content_ru,
        knownSet,
        stretchWords
      );

      return {
        title: parsed.title,
        contentRu: parsed.content_ru,
        knownWordPct: coverage.familiarPct,
        stretchWords,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!isRetryableGeminiError(error)) {
        throw lastError;
      }
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

function isRecoverableStoryError(error: unknown): boolean {
  if (isParseOrEmptyError(error)) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("quota") ||
      msg.includes("resource_exhausted") ||
      msg.includes("high demand") ||
      msg.includes("overloaded") ||
      msg.includes("unavailable") ||
      msg.includes("not found for api version") ||
      msg.includes("is not supported for generatecontent") ||
      msg.includes("model_not_found") ||
      msg.includes("invalid json") ||
      msg.includes("html") ||
      msg.includes("timed out") ||
      msg.includes("all gemini models failed")
    );
  }
  return false;
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
      if (isRecoverableStoryError(error)) {
        const fallback = await generateFallbackStory(knownWords, length);
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        const suffix =
          message.includes("quota") ||
          message.includes("high demand") ||
          message.includes("overloaded") ||
          message.includes("unavailable")
            ? "Gemini busy"
            : "template fallback";
        return {
          ...fallback,
          title: `${fallback.title} (${suffix})`,
        };
      }
      throw error;
    }
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
