import type { DrillDirection, WordStatus } from "../constants";
import type { Word } from "../types";
import {
  canClaimAsKnown,
  daysUntilClaimable,
  type WordDrillStats,
} from "./promotion";

export type QuizDirection = "en_to_ru" | "ru_to_en";

export interface QuizItem {
  wordId: string;
  prompt: string;
  expected: string;
  direction: QuizDirection;
  lemma: string;
  status: "known" | "learning";
  learningStartedAt: string | null;
  drillAttempts: number;
  drillCorrect: number;
  canClaimKnown: boolean;
  daysUntilClaim: number;
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function checkAnswer(expected: string, given: string): boolean {
  const a = normalizeAnswer(expected);
  const b = normalizeAnswer(given);
  if (a === b) return true;
  if (levenshtein(a, b) <= Math.max(1, Math.floor(a.length * 0.15))) {
    return true;
  }
  return false;
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

export function pickDirection(direction: DrillDirection): QuizDirection {
  if (direction === "random") {
    return Math.random() < 0.5 ? "en_to_ru" : "ru_to_en";
  }
  return direction;
}

export function buildQuizItems(
  words: Word[],
  direction: DrillDirection,
  limit: number,
  drillStats: Map<string, WordDrillStats> = new Map()
): QuizItem[] {
  const eligible = words.filter((w) => {
    if (direction === "en_to_ru" || direction === "random") {
      return w.translation?.trim();
    }
    return true;
  });

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const selected = limit > 0 ? shuffled.slice(0, limit) : shuffled;
  const items: QuizItem[] = [];

  for (const word of selected) {
    const quizDirection = pickDirection(direction);
    const stats = drillStats.get(word.id) ?? { attempts: 0, correct: 0 };
    const meta = {
      status: word.status,
      learningStartedAt: word.learning_started_at,
      drillAttempts: stats.attempts,
      drillCorrect: stats.correct,
      canClaimKnown: canClaimAsKnown(word.status, word.learning_started_at),
      daysUntilClaim: daysUntilClaimable(word.learning_started_at),
    };
    if (quizDirection === "en_to_ru") {
      if (!word.translation?.trim()) continue;
      items.push({
        wordId: word.id,
        prompt: word.translation,
        expected: word.lemma,
        direction: quizDirection,
        lemma: word.lemma,
        ...meta,
      });
    } else {
      items.push({
        wordId: word.id,
        prompt: word.lemma,
        expected: word.translation ?? "(unknown)",
        direction: quizDirection,
        lemma: word.lemma,
        ...meta,
      });
    }
  }

  return items;
}

export function filterWordsForTraining(
  words: Word[],
  includeKnown: boolean,
  statusFilter?: WordStatus[]
): Word[] {
  let filtered = words;
  if (!includeKnown) {
    filtered = filtered.filter((w) => w.status === "learning");
  }
  if (statusFilter?.length) {
    filtered = filtered.filter((w) => statusFilter.includes(w.status));
  }
  return filtered;
}
