import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { getStory, getWords } from "@/lib/db";
import { StoryReader } from "./story-reader";

export default async function StoryReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [story, knownWords] = await Promise.all([
    getStory(userId, id),
    getWords(userId, "known"),
  ]);

  if (!story) notFound();

  return (
    <StoryReader
      initialStory={story}
      knownLemmas={knownWords.map((w) => w.lemma.toLowerCase())}
    />
  );
}
