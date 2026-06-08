import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getDashboardStats, getLessons } from "@/lib/db";
import { STORY_UNLOCK_THRESHOLD } from "@/lib/constants";
import { PageHeader, StatCard, ProgressBar, Button } from "@/components/ui";

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

        <section className="flex flex-wrap gap-3">
          <Link href="/lessons/new">
            <Button>+ New lesson</Button>
          </Link>
          <Link href="/train">
            <Button variant="secondary">Train vocab</Button>
          </Link>
          {stats.storiesUnlocked ? (
            <Link href="/stories">
              <Button variant="secondary">Stories</Button>
            </Link>
          ) : (
            <Button variant="secondary" disabled title="Unlock at 500 known words">
              Stories (locked)
            </Button>
          )}
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
            <div className="grid gap-4 sm:grid-cols-2">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/lessons/${lesson.id}/review`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="font-semibold text-slate-900">{lesson.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(lesson.created_at).toLocaleDateString()} · {lesson.wordCount} words
                    {lesson.newCount > 0 && ` · ${lesson.newCount} learning`}
                  </p>
                  {!lesson.reviewed_at && (
                    <span className="mt-3 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Review pending
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
