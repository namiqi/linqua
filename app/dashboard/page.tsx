import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getDashboardStats, getLessons } from "@/lib/db";
import { STORY_UNLOCK_THRESHOLD } from "@/lib/constants";
import { PageHeader, StatCard, ProgressBar, Button } from "@/components/ui";
import { ResetDataButton } from "./reset-button";
import { FoundationVocabButton } from "./foundation-vocab-button";
import { LessonList } from "./lesson-list";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [stats, lessons] = await Promise.all([
    getDashboardStats(userId),
    getLessons(userId),
  ]);

  return (
    <div className="min-h-full">
      <PageHeader
        title="Dashboard"
        subtitle="Your Russian learning hub"
        active="dashboard"
      />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total words" value={stats.totalWords} />
          <StatCard label="Known" value={stats.knownWords} accent="text-emerald-600" />
          <StatCard label="Learning" value={stats.learningWords} accent="text-amber-600" />
          <StatCard label="Lessons" value={stats.lessonCount} />
        </section>

        {STORY_UNLOCK_THRESHOLD > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <ProgressBar
              value={stats.knownWords}
              max={STORY_UNLOCK_THRESHOLD}
              label="Progress toward story unlock"
            />
            <p className="mt-3 text-sm text-slate-600">
              {stats.storiesUnlocked
                ? "Stories unlocked! Create graded reading from your known vocabulary."
                : `${STORY_UNLOCK_THRESHOLD - stats.knownWords} more known words until stories unlock.`}
            </p>
          </section>
        )}

        <section className="flex flex-wrap gap-3">
          <Link href="/lessons/new">
            <Button>+ New lesson</Button>
          </Link>
          <Link href="/train">
            <Button variant="secondary">Train vocab</Button>
          </Link>
          <Link href="/stories">
            <Button variant="secondary">Stories</Button>
          </Link>
          <Link href="/vocab">
            <Button variant="secondary">View vocab</Button>
          </Link>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent lessons</h2>
          {lessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No lessons yet. Paste your first transcript to start building vocab.
            </div>
          ) : (
            <LessonList lessons={lessons} />
          )}
        </section>

        <FoundationVocabButton />
        <ResetDataButton />
      </main>
    </div>
  );
}
