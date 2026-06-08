import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getStory, getWords } from "@/lib/db";
import { computeStoryCoverage } from "@/lib/stories/generate";
import { PageHeader, Button } from "@/components/ui";

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

  const knownSet = new Set(knownWords.map((w) => w.lemma.toLowerCase()));
  const coverage = computeStoryCoverage(
    story.content_ru,
    knownSet,
    story.stretch_words
  );

  return (
    <div className="min-h-full">
      <PageHeader title={story.title} subtitle="Graded reader" active="stories" />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
              {coverage.familiarPct}% familiar
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
              {coverage.exactPct}% exact vocab match
            </span>
            {story.stretch_words.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                {story.stretch_words.length} allowed new words
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            &quot;Familiar&quot; counts your vocab (including word forms like думаешь
            from думать) plus the allowed new words. Exact match only counts identical
            dictionary forms.
          </p>
          {story.stretch_words.length > 0 && (
            <p className="text-sm text-amber-800">
              New words: {story.stretch_words.join(", ")}
            </p>
          )}
          {coverage.unknownWords.length > 0 && (
            <p className="text-sm text-slate-600">
              Other words in story: {coverage.unknownWords.join(", ")}
              {coverage.unknownWords.length >= 30 ? "…" : ""}
            </p>
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
