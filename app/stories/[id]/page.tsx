import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getStory } from "@/lib/db";
import { PageHeader, Button } from "@/components/ui";

export default async function StoryReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const story = await getStory(userId, id);

  if (!story) notFound();

  return (
    <div className="min-h-full">
      <PageHeader title={story.title} subtitle="Graded reader" active="stories" />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex flex-wrap gap-2 text-sm text-slate-500">
          {story.known_word_pct != null && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
              {story.known_word_pct}% known words
            </span>
          )}
          {story.stretch_words.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
              Stretch words: {story.stretch_words.join(", ")}
            </span>
          )}
        </div>

        <article className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="prose prose-slate max-w-none whitespace-pre-wrap text-lg leading-relaxed text-slate-800">
            {story.content_ru}
          </div>
        </article>

        <div className="mt-6">
          <Link href="/stories">
            <Button variant="secondary">Back to stories</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
