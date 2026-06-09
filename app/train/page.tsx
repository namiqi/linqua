"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import type { DrillDirection } from "@/lib/constants";
import type { QuizItem } from "@/lib/training/quiz";

type Phase = "setup" | "drill" | "done";
type DrillPool = "learning" | "all";

function updateItemStats(
  items: QuizItem[],
  wordId: string,
  drillStats: { attempts: number; correct: number }
): QuizItem[] {
  return items.map((item) =>
    item.wordId === wordId
      ? { ...item, drillAttempts: drillStats.attempts, drillCorrect: drillStats.correct }
      : item
  );
}

export default function TrainPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [drillPool, setDrillPool] = useState<DrillPool>("learning");
  const [limit, setLimit] = useState(25);
  const [direction, setDirection] = useState<DrillDirection>("random");
  const [items, setItems] = useState<QuizItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; expected: string } | null>(
    null
  );
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const current = items[index];

  const startDrill = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        includeKnown: String(drillPool === "all"),
        limit: String(limit),
        direction,
      });
      const res = await fetch(`/api/train?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.items?.length) {
        alert(
          drillPool === "learning"
            ? "No learning words available. Mark words as new in a lesson review first."
            : "No words available for this drill. Add translations for EN→RU drills."
        );
        return;
      }
      setItems(data.items);
      setIndex(0);
      setAnswer("");
      setFeedback(null);
      setClaimMessage(null);
      setScore({ correct: 0, total: 0 });
      setPhase("drill");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start drill");
    } finally {
      setLoading(false);
    }
  }, [drillPool, limit, direction]);

  async function submitAnswer() {
    if (!current || feedback) return;
    setLoading(true);
    setClaimMessage(null);
    try {
      const res = await fetch("/api/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: current.wordId,
          direction: current.direction,
          answer,
          expected: current.expected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeedback({ correct: data.correct, expected: data.expected });
      setScore((s) => ({
        correct: s.correct + (data.correct ? 1 : 0),
        total: s.total + 1,
      }));
      if (data.drillStats) {
        setItems((prev) => updateItemStats(prev, current.wordId, data.drillStats));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to check answer");
    } finally {
      setLoading(false);
    }
  }

  async function claimKnown() {
    if (!current?.canClaimKnown) return;
    setLoading(true);
    setClaimMessage(null);
    try {
      const res = await fetch("/api/train/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: current.wordId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClaimMessage(`"${current.lemma}" marked as known.`);
      setItems((prev) =>
        prev.map((item) =>
          item.wordId === current.wordId
            ? { ...item, status: "known", canClaimKnown: false }
            : item
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to mark as known");
    } finally {
      setLoading(false);
    }
  }

  function nextWord() {
    setClaimMessage(null);
    if (index + 1 >= items.length) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setAnswer("");
    setFeedback(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (phase !== "drill" || !current) return;
      if (e.key === "Enter") {
        if (feedback) nextWord();
        else submitAnswer();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="min-h-full">
      <PageHeader
        title="Train vocab"
        subtitle="Random English↔Russian typing drill"
        active="train"
      />

      <main className="mx-auto max-w-2xl px-4 py-8">
        {phase === "setup" && (
          <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="block text-sm font-medium text-slate-700">Word pool</p>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="drillPool"
                    checked={drillPool === "learning"}
                    onChange={() => setDrillPool("learning")}
                  />
                  Learning only
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="drillPool"
                    checked={drillPool === "all"}
                    onChange={() => setDrillPool("all")}
                  />
                  Known and learning
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Word count</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={0}>All</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as DrillDirection)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="random">Random</option>
                <option value="en_to_ru">English → Russian</option>
                <option value="ru_to_en">Russian → English</option>
              </select>
            </div>

            <p className="text-sm text-slate-500">
              Learning words can be claimed as known after 7 days in the drill.
            </p>

            <Button onClick={startDrill} disabled={loading}>
              {loading ? "Loading…" : "Start drill"}
            </Button>
          </div>
        )}

        {phase === "drill" && current && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">
              {index + 1} / {items.length} ·{" "}
              {current.direction === "en_to_ru" ? "English → Russian" : "Russian → English"}
              {current.status === "learning" && (
                <> · Drilled {current.drillAttempts}× ({current.drillCorrect} correct)</>
              )}
            </p>

            {current.status === "learning" &&
              !current.canClaimKnown &&
              current.daysUntilClaim > 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  Claim as known in {current.daysUntilClaim}{" "}
                  {current.daysUntilClaim === 1 ? "day" : "days"}
                </p>
              )}

            {current.canClaimKnown && (
              <p className="mt-2 text-sm text-emerald-700">
                Ready to claim — mark as known when you feel comfortable.
              </p>
            )}

            <p className="mt-4 text-3xl font-bold text-slate-900">{current.prompt}</p>

            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={!!feedback}
              autoFocus
              placeholder="Type your answer…"
              className="mt-6 w-full rounded-lg border border-slate-300 px-3 py-3 text-lg focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {feedback && (
              <div
                className={`mt-4 rounded-lg p-3 text-sm ${
                  feedback.correct
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-800"
                }`}
              >
                {feedback.correct ? "Correct!" : `Expected: ${feedback.expected}`}
              </div>
            )}

            {claimMessage && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                {claimMessage}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {!feedback ? (
                <>
                  <Button onClick={submitAnswer} disabled={loading || !answer.trim()}>
                    Check
                  </Button>
                  {current.canClaimKnown && current.status === "learning" && (
                    <Button variant="success" onClick={claimKnown} disabled={loading}>
                      Mark as known
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button onClick={nextWord}>
                    {index + 1 >= items.length ? "Finish" : "Next"}
                  </Button>
                  {current.canClaimKnown && current.status === "learning" && (
                    <Button variant="success" onClick={claimKnown} disabled={loading}>
                      Mark as known
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold">Drill complete</h2>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {score.correct} / {score.total}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => setPhase("setup")}>New drill</Button>
              <a href="/dashboard">
                <Button variant="secondary">Dashboard</Button>
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
