import type { PracticeSentence } from "../types";

export interface PhraseQuizItem {
  sentenceId: string;
  prompt: string;
  expected: string;
  drillAttempts: number;
  drillCorrect: number;
}

export interface PhraseDrillStats {
  attempts: number;
  correct: number;
}

export function normalizePhraseAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export function checkPhraseAnswer(expected: string, given: string): boolean {
  const a = normalizePhraseAnswer(expected);
  const b = normalizePhraseAnswer(given);
  if (a === b) return true;
  const maxDist = Math.max(2, Math.floor(a.length * 0.12));
  return levenshtein(a, b) <= maxDist;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }
  return matrix[b.length][a.length];
}

export function splitRussianSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

export function buildPhraseQuizItems(
  sentences: PracticeSentence[],
  limit: number,
  stats: Map<string, PhraseDrillStats> = new Map()
): PhraseQuizItem[] {
  const shuffled = [...sentences].sort(() => Math.random() - 0.5);
  const selected = limit > 0 ? shuffled.slice(0, limit) : shuffled;

  return selected.map((sentence) => {
    const drillStats = stats.get(sentence.id) ?? { attempts: 0, correct: 0 };
    return {
      sentenceId: sentence.id,
      prompt: sentence.prompt_en,
      expected: sentence.answer_ru,
      drillAttempts: drillStats.attempts,
      drillCorrect: drillStats.correct,
    };
  });
}
