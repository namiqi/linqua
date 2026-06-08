import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getWords, createStory, addStretchWordsAsLearning } from "@/lib/db";
import { checkStoriesUnlocked, generateStory } from "@/lib/stories/generate";

export const maxDuration = 26;

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
    const generated = await generateStory(words, length, maxStretchWords);
    const storyId = await createStory(
      userId,
      generated.title,
      generated.contentRu,
      generated.knownWordPct,
      generated.stretchWords
    );

    if (markStretchAsNew && generated.stretchWords.length) {
      await addStretchWordsAsLearning(userId, generated.stretchWords);
    }

    return NextResponse.json({ id: storyId, ...generated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
