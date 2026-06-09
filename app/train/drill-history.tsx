"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import type { DrillSessionEntry, DrillSessionSummary } from "@/lib/types";
import type { QuizItem } from "@/lib/training/quiz";

function formatDirection(direction: DrillSessionEntry["direction"]): string {
  return direction === "en_to_ru" ? "EN → RU" : "RU → EN";
}

interface DrillHistoryProps {
  refreshKey: number;
  onRetry: (items: QuizItem[], session: { id: string; name: string }) => void;
}

export function DrillHistory({ refreshKey, onRetry }: DrillHistoryProps) {
  const [session, setSession] = useState<DrillSessionSummary | null>(null);
  const [entries, setEntries] = useState<DrillSessionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    try {
      const sessionsRes = await fetch("/api/train/sessions?limit=1");
      const sessionsData = await sessionsRes.json();
      if (!sessionsRes.ok) throw new Error(sessionsData.error);

      const latest = (sessionsData.sessions ?? [])[0] as
        | DrillSessionSummary
        | undefined;
      setSession(latest ?? null);

      if (!latest) {
        setEntries([]);
        setError(null);
        return;
      }

      const entriesRes = await fetch(`/api/train/sessions/${latest.id}`);
      const entriesData = await entriesRes.json();
      if (!entriesRes.ok) throw new Error(entriesData.error);
      setEntries(entriesData.entries ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drill history");
      setSession(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatest();
  }, [loadLatest, refreshKey]);

  async function handleRetry() {
    if (!session) return;
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch("/api/train/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRetry(data.items, { id: data.session.id, name: data.session.name });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to retry drill");
    } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Latest drill</h2>
        <p className="text-sm text-slate-500">Loading…</p>
      </section>
    );
  }

  if (!session) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No drills yet. Complete a drill to see your latest result here.
      </div>
    );
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Latest drill</h2>
        <Button
          variant="secondary"
          onClick={handleRetry}
          disabled={retrying || entries.length === 0}
        >
          {retrying ? "Starting…" : "Retry this drill"}
        </Button>
      </div>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="font-medium text-slate-900">{session.name}</span>
          <span className="text-sm text-slate-600">
            {session.total > 0 ? `${session.correct} / ${session.total}` : "—"}
          </span>
        </div>

        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No answers recorded.</p>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[32rem] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-slate-500">
                  <th className="px-4 py-2 font-medium whitespace-nowrap">Direction</th>
                  <th className="px-4 py-2 font-medium whitespace-nowrap">Prompt</th>
                  <th className="px-4 py-2 font-medium whitespace-nowrap">Your answer</th>
                  <th className="px-4 py-2 font-medium whitespace-nowrap">Result</th>
                  <th className="px-4 py-2 font-medium whitespace-nowrap">Answer key</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-500">
                      {formatDirection(entry.direction)}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{entry.prompt}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {entry.answer_given || "—"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={
                          entry.correct
                            ? "font-medium text-emerald-700"
                            : "font-medium text-rose-700"
                        }
                      >
                        {entry.correct ? "Correct" : "Wrong"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{entry.expected_answer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
