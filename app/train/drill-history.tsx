"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import type { DrillSessionEntry, DrillSessionSummary } from "@/lib/types";

interface DrillHistoryProps {
  refreshKey: number;
}

export function DrillHistory({ refreshKey }: DrillHistoryProps) {
  const [sessions, setSessions] = useState<DrillSessionSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, DrillSessionEntry[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/train/sessions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessions(data.sessions ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drill history");
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshKey]);

  async function toggleSession(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(sessionId);

    if (entries[sessionId]) return;

    setLoadingId(sessionId);
    try {
      const res = await fetch(`/api/train/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEntries((prev) => ({ ...prev, [sessionId]: data.entries ?? [] }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load drill details");
      setExpandedId(null);
    } finally {
      setLoadingId(null);
    }
  }

  if (error) {
    return <p className="mt-8 text-sm text-rose-600">{error}</p>;
  }

  if (sessions.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No drills yet. Complete a drill to see your history here.
      </div>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Drill history</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-700">Drill</th>
              <th className="px-4 py-3 font-medium text-slate-700">Score</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const isOpen = expandedId === session.id;
              const sessionEntries = entries[session.id] ?? [];

              return (
                <Fragment key={session.id}>
                  <tr
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => toggleSession(session.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{isOpen ? "▼" : "▶"}</span>
                        <span className="font-medium text-slate-900">{session.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {session.total > 0
                        ? `${session.correct} / ${session.total}`
                        : "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={2} className="px-4 py-3">
                        {loadingId === session.id ? (
                          <p className="text-sm text-slate-500">Loading…</p>
                        ) : sessionEntries.length === 0 ? (
                          <p className="text-sm text-slate-500">No answers recorded.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[36rem] text-left text-xs">
                              <thead>
                                <tr className="text-slate-500">
                                  <th className="pb-2 pr-3 font-medium">Word</th>
                                  <th className="pb-2 pr-3 font-medium">Prompt</th>
                                  <th className="pb-2 pr-3 font-medium">Your answer</th>
                                  <th className="pb-2 pr-3 font-medium">Result</th>
                                  <th className="pb-2 font-medium">Correct answer</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sessionEntries.map((entry) => (
                                  <tr key={entry.id} className="border-t border-slate-200">
                                    <td className="py-2 pr-3 font-medium text-slate-900">
                                      {entry.word_lemma}
                                    </td>
                                    <td className="py-2 pr-3 text-slate-600">{entry.prompt}</td>
                                    <td className="py-2 pr-3 text-slate-600">
                                      {entry.answer_given || "—"}
                                    </td>
                                    <td className="py-2 pr-3">
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
                                    <td className="py-2 text-slate-600">
                                      {entry.correct ? "—" : entry.expected_answer}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
