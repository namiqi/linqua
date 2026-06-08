"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import { computeStoryCoverage } from "@/lib/stories/generate";
import type { Story } from "@/lib/types";
import { readJsonResponse } from "@/lib/http";

interface StoryReaderProps {
  initialStory: Story;
  knownLemmas: string[];
}

export function StoryReader({ initialStory, knownLemmas }: StoryReaderProps) {
  const [story, setStory] = useState(initialStory);

  useEffect(() => {
    if (story.status !== "generating") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/stories/${story.id}`);
        const updated = await readJsonResponse<Story>(res);
        if (updated.status !== "generating") {
          setStory(updated);
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [story.id, story.status]);

  const knownSet = new Set(knownLemmas);
  const coverage =
    story.status === "ready" && story.content_ru
      ? computeStoryCoverage(story.content_ru, knownSet, story.stretch_words)
      : null;

  return (
    <div className="min-h-full">
      <PageHeader title={story.title} subtitle="Graded reader" active="stories" />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {story.status === "generating" && (
          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-center">
            <p className="font-medium text-indigo-900">Writing your story with Gemini…</p>
            <p className="mt-2 text-sm text-indigo-700">
              This usually takes 15–30 seconds. This page will update automatically.
            </p>
          </div>
        )}

        {coverage && (
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
            {story.stretch_words.length > 0 && (
              <p className="text-sm text-amber-800">
                New words: {story.stretch_words.join(", ")}
              </p>
            )}
            {coverage.unknownWords.length > 0 && (
              <p className="text-sm text-slate-600">
                Other words in story: {coverage.unknownWords.join(", ")}
              </p>
            )}
          </div>
        )}

        {story.status === "failed" && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Generation failed. See message below or try again.
          </div>
        )}

        <article className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {story.content_ru ? (
            <div className="prose prose-slate max-w-none whitespace-pre-wrap text-lg leading-relaxed text-slate-800">
              {story.content_ru}
            </div>
          ) : (
            <p className="text-slate-400">Waiting for story content…</p>
          )}
        </article>

        <div className="mt-6 flex gap-3">
          <Link href="/stories">
            <Button variant="secondary">Back to stories</Button>
          </Link>
          {story.status === "failed" && (
            <Link href="/stories/new">
              <Button>Try again</Button>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
