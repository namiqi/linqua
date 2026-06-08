"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button } from "@/components/ui";

export default function NewStoryPage() {
  const router = useRouter();
  const [length, setLength] = useState<"short" | "medium">("short");
  const [maxStretchWords, setMaxStretchWords] = useState(10);
  const [markStretchAsNew, setMarkStretchAsNew] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stories/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ length, maxStretchWords, markStretchAsNew }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate");
      router.push(`/stories/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title="Create story"
        subtitle="Generate a graded reader from your known words"
        active="stories"
      />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700">Length</label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value as "short" | "medium")}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="short">Short (~150–250 words)</option>
              <option value="medium">Medium (~400–600 words)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Max stretch words (new words allowed in story)
            </label>
            <input
              type="number"
              min={0}
              max={20}
              value={maxStretchWords}
              onChange={(e) => setMaxStretchWords(Number(e.target.value))}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={markStretchAsNew}
              onChange={(e) => setMarkStretchAsNew(e.target.checked)}
            />
            Mark stretch words as new in my vocab
          </label>

          <p className="text-sm text-slate-500">
            Uses Gemini if GEMINI_API_KEY is set; otherwise generates a simple template story.
          </p>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating…" : "Generate story"}
            </Button>
            <Link href="/stories">
              <Button variant="secondary">Cancel</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
