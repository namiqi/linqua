import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import {
  createDrillSession,
  getTrainingStatsForWords,
  getWords,
} from "@/lib/db";
import {
  buildQuizItems,
  countDrillableWords,
  filterWordsForTraining,
} from "@/lib/training/quiz";
import type { DrillDirection } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const includeKnown = body.includeKnown === true;
  const limit = parseInt(body.limit ?? "25", 10);
  const direction = (body.direction ?? "random") as DrillDirection;

  const session = await createDrillSession(userId);
  const words = await getWords(userId);
  const filtered = filterWordsForTraining(words, includeKnown);
  const drillStats = await getTrainingStatsForWords(
    userId,
    filtered.map((w) => w.id)
  );
  const items = buildQuizItems(filtered, direction, limit, drillStats);
  const drillable = countDrillableWords(filtered, direction);

  return NextResponse.json({
    session,
    items,
    totalAvailable: filtered.length,
    drillableCount: drillable.total,
    withTranslationCount: drillable.withTranslation,
  });
}
