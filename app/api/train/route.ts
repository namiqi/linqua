import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getWords, saveTrainingResult } from "@/lib/db";
import {
  buildQuizItems,
  checkAnswer,
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
  const items = buildQuizItems(filtered, direction, limit);

  return NextResponse.json({ items, totalAvailable: filtered.length });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { wordId, direction, answer, expected } = body;

  if (!wordId || !direction || answer === undefined || !expected) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const correct = checkAnswer(expected, answer);
  await saveTrainingResult(userId, wordId, direction, correct);

  return NextResponse.json({ correct, expected });
}
