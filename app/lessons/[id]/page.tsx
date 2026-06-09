import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { getLesson, getLessonReviewWords } from "@/lib/db";
import { PageHeader, Button } from "@/components/ui";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();

  const [lesson, reviewData] = await Promise.all([
    getLesson(userId, id),
    getLessonReviewWords(userId, id).catch(() => null),
  ]);

  if (!lesson) notFound();

  const extracted = lesson.extracted_words;
  const pendingReview = reviewData?.words.filter((w) => !w.skipped).length ?? 0;
  const wordCount = extracted.length;

  return (
    <div className="min-h-full">
      <PageHeader title={lesson.name} subtitle="Lesson script" active="lessons" />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
            {new Date(lesson.created_at).toLocaleDateString()}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
            {wordCount} unique words
          </span>
          {pendingReview > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
              {pendingReview} words to review
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
              Words reviewed
            </span>
          )}
        </div>

        {pendingReview > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              New lesson — review each word once, then come back here to read the script.
            </p>
            <Link href={`/lessons/${lesson.id}/review`} className="mt-3 inline-block">
              <Button>Review words ({pendingReview})</Button>
            </Link>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-3">
          {pendingReview === 0 && (
            <Link href={`/lessons/${lesson.id}/review`}>
              <Button variant="secondary">Review words again</Button>
            </Link>
          )}
          <Link href="/dashboard">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
          <Link href="/train">
            <Button variant="secondary">Train vocab</Button>
          </Link>
        </div>

        <article className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">
            Script
          </h2>
          <div className="prose prose-slate max-w-none whitespace-pre-wrap text-lg leading-relaxed text-slate-800">
            {lesson.transcript}
          </div>
        </article>

        <p className="mt-4 text-sm text-slate-500">
          Re-read this script anytime for listening or reading practice. Your vocabulary from
          this lesson stays in your word list even if you delete the lesson later.
        </p>
      </main>
    </div>
  );
}
