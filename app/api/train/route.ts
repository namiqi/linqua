import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getWords, getTrainingStatsForWords, saveTrainingResult } from "@/lib/db";
import {
  buildQuizItems,
  checkAnswer,
  countDrillableWords,
  filterWordsForTraining,
} from "@/lib/training/quiz";
import type { DrillDirection } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const includeKnown = params.get("includeKnown") === "true";
  const limit = parseInt(params.get("limit") ?? "25", 10);
  const direction = (params.get("direction") ?? "random") as DrillDirection;

  const words = await getWords(userId);
  const filtered = filterWordsForTraining(words, includeKnown);
  const drillStats = await getTrainingStatsForWords(
    userId,
    filtered.map((w) => w.id)
  );
  const items = buildQuizItems(filtered, direction, limit, drillStats);
  const drillable = countDrillableWords(filtered, direction);

  return NextResponse.json({
    items,
    totalAvailable: filtered.length,
    drillableCount: drillable.total,
    withTranslationCount: drillable.withTranslation,
  });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { wordId, direction, answer, expected, sessionId, prompt, lemma } = body;

  if (!wordId || !direction || answer === undefined || !expected) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const correct = checkAnswer(expected, answer);
  const drillStats = await saveTrainingResult(
    userId,
    wordId,
    direction,
    correct,
    sessionId
      ? {
          sessionId,
          wordLemma: lemma ?? expected,
          prompt: prompt ?? "",
          answerGiven: String(answer),
          expectedAnswer: expected,
        }
      : undefined
  );

  return NextResponse.json({ correct, expected, drillStats });
}
