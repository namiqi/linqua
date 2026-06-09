import { requireUserId } from "@/lib/auth";
import { getStories } from "@/lib/db";
import { checkStoriesUnlocked } from "@/lib/stories/generate";
import { PageHeader, Button } from "@/components/ui";
import Link from "next/link";
import { STORY_UNLOCK_THRESHOLD } from "@/lib/constants";
import { StoryList } from "./story-list";

export default async function StoriesPage() {
  const userId = await requireUserId();
  const unlocked = await checkStoriesUnlocked(userId);
  const stories = unlocked ? await getStories(userId) : [];

  return (
    <div className="min-h-full">
      <PageHeader
        title="Stories"
        subtitle="Graded reading from your known vocabulary"
        active="stories"
      />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!unlocked ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Stories locked</h2>
            <p className="mt-2 text-slate-600">
              Mark {STORY_UNLOCK_THRESHOLD} words as known to unlock story generation.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block">
              <Button variant="secondary">Back to dashboard</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <Link href="/stories/new">
                <Button>+ Create story</Button>
              </Link>
            </div>

            {stories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                No stories yet. Create your first graded reader!
              </div>
            ) : (
              <StoryList stories={stories} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
