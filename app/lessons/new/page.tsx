import { PageHeader, Button } from "@/components/ui";
import { createLessonAction } from "./actions";

export default function NewLessonPage() {
  return (
    <div className="min-h-full">
      <PageHeader
        title="New lesson"
        subtitle="Paste a Russian transcript to extract vocabulary"
        active="lessons"
      />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form action={createLessonAction} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Lesson name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Lesson 1, Video 1"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="transcript" className="block text-sm font-medium text-slate-700">
              Transcript (Russian)
            </label>
            <textarea
              id="transcript"
              name="transcript"
              required
              rows={16}
              placeholder="Paste your Russian transcript here…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit">Extract words & review</Button>
            <a href="/dashboard">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </a>
          </div>
        </form>
      </main>
    </div>
  );
}
