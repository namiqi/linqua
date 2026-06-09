import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import {
  addPracticeSentence,
  getPhraseDrillStatsForSentences,
  getPracticeSentences,
  savePhraseDrillResult,
} from "@/lib/db";
import { buildPhraseQuizItems, checkPhraseAnswer } from "@/lib/training/phrases";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const forDrill = params.get("drill") === "1";
  const limit = parseInt(params.get("limit") ?? "25", 10);

  const sentences = await getPracticeSentences(userId);

  if (!forDrill) {
    return NextResponse.json({ sentences, total: sentences.length });
  }

  const stats = await getPhraseDrillStatsForSentences(
    userId,
    sentences.map((s) => s.id)
  );
  const items = buildPhraseQuizItems(sentences, limit, stats);

  return NextResponse.json({ items, totalAvailable: sentences.length });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.action === "answer") {
    const { sentenceId, answer, expected } = body;
    if (!sentenceId || answer === undefined || !expected) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const correct = checkPhraseAnswer(expected, answer);
    const drillStats = await savePhraseDrillResult(userId, sentenceId, correct);
    return NextResponse.json({ correct, expected, drillStats });
  }

  const promptEn = body.promptEn?.trim();
  const answerRu = body.answerRu?.trim();
  if (!promptEn || !answerRu) {
    return NextResponse.json(
      { error: "English prompt and Russian answer are required" },
      { status: 400 }
    );
  }

  const sentence = await addPracticeSentence(userId, promptEn, answerRu);
  return NextResponse.json({ sentence });
}
