import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import {
  getWords,
  createGeneratingStory,
  updateStory,
  addStretchWordsAsLearning,
} from "@/lib/db";
import { checkStoriesUnlocked, generateStory } from "@/lib/stories/generate";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unlocked = await checkStoriesUnlocked(userId);
  if (!unlocked) {
    return NextResponse.json({ error: "Stories not unlocked yet" }, { status: 403 });
  }

  const body = await request.json();
  const length = (body.length ?? "short") as "short" | "medium";
  const maxStretchWords = Math.min(parseInt(body.maxStretchWords ?? "10", 10), 20);
  const markStretchAsNew = body.markStretchAsNew === true;

  const words = await getWords(userId, "known");
  if (words.length < 5) {
    return NextResponse.json({ error: "Need more known words" }, { status: 400 });
  }

  try {
    const storyId = await createGeneratingStory(userId);

    after(async () => {
      try {
        const generated = await generateStory(words, length, maxStretchWords);
        await updateStory(storyId, userId, {
          title: generated.title,
          contentRu: generated.contentRu,
          knownWordPct: generated.knownWordPct,
          stretchWords: generated.stretchWords,
          status: "ready",
        });
        if (markStretchAsNew && generated.stretchWords.length) {
          await addStretchWordsAsLearning(userId, generated.stretchWords);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Generation failed";
        await updateStory(storyId, userId, {
          title: "Story generation failed",
          contentRu: `Could not generate story: ${message}\n\nTry again with a shorter length.`,
          knownWordPct: 0,
          stretchWords: [],
          status: "failed",
        });
      }
    });

    return NextResponse.json({ id: storyId, status: "generating" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
