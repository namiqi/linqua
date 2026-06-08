"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enterDashboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/dev-bypass", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to enter");
      window.location.href = data.redirect ?? "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Personal Russian learning
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            Linqua
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Paste transcripts, build your vocab from content you care about, train
            recall in both directions, and eventually read stories made only from
            words you already know.
          </p>

          <ul className="mt-8 space-y-3 text-slate-700">
            <li className="flex gap-3">
              <span className="text-indigo-500">1.</span>
              Import a lesson — paste Russian text, review each word
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-500">2.</span>
              Train vocab — random English↔Russian typing drills
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-500">3.</span>
              Read stories — unlocked after 500 known words
            </li>
          </ul>

          <div className="mt-10">
            <Button onClick={enterDashboard} disabled={loading} className="px-6 py-3 text-base">
              {loading ? "Entering…" : "Enter dashboard"}
            </Button>
            {error && (
              <p className="mt-3 text-sm text-rose-600">{error}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
