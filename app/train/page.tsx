"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Button } from "@/components/ui";
import type { DrillDirection } from "@/lib/constants";
import type { PhraseQuizItem } from "@/lib/training/phrases";
import type { QuizItem } from "@/lib/training/quiz";
import type { PracticeSentence } from "@/lib/types";

type Phase = "setup" | "drill" | "done";
type DrillPool = "learning" | "all";
type DrillMode = "words" | "phrases";

function updateWordItemStats(
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

function updatePhraseItemStats(
  items: PhraseQuizItem[],
  sentenceId: string,
  drillStats: { attempts: number; correct: number }
): PhraseQuizItem[] {
  return items.map((item) =>
    item.sentenceId === sentenceId
      ? { ...item, drillAttempts: drillStats.attempts, drillCorrect: drillStats.correct }
      : item
  );
}

export default function TrainPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [drillMode, setDrillMode] = useState<DrillMode>("words");
  const [drillPool, setDrillPool] = useState<DrillPool>("learning");
  const [limit, setLimit] = useState(25);
  const [direction, setDirection] = useState<DrillDirection>("random");
  const [wordItems, setWordItems] = useState<QuizItem[]>([]);
  const [phraseItems, setPhraseItems] = useState<PhraseQuizItem[]>([]);
  const [savedPhrases, setSavedPhrases] = useState<PracticeSentence[]>([]);
  const [newPromptEn, setNewPromptEn] = useState("");
  const [newAnswerRu, setNewAnswerRu] = useState("");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; expected: string } | null>(
    null
  );
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const currentWord = wordItems[index];
  const currentPhrase = phraseItems[index];
  const totalItems = drillMode === "words" ? wordItems.length : phraseItems.length;

  const loadSavedPhrases = useCallback(async () => {
    const res = await fetch("/api/train/phrases");
    const data = await res.json();
    if (res.ok) setSavedPhrases(data.sentences ?? []);
  }, []);

  useEffect(() => {
    if (drillMode === "phrases") loadSavedPhrases();
  }, [drillMode, loadSavedPhrases]);

  async function addPhrase() {
    if (!newPromptEn.trim() || !newAnswerRu.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/train/phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptEn: newPromptEn, answerRu: newAnswerRu }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedPhrases((prev) => [data.sentence, ...prev]);
      setNewPromptEn("");
      setNewAnswerRu("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add phrase");
    } finally {
      setLoading(false);
    }
  }

  const startDrill = useCallback(async () => {
    setLoading(true);
    try {
      if (drillMode === "words") {
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
        setWordItems(data.items);
        setPhraseItems([]);
      } else {
        const params = new URLSearchParams({
          drill: "1",
          limit: String(limit),
        });
        const res = await fetch(`/api/train/phrases?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!data.items?.length) {
          alert("Add at least one phrase below before starting a sentence drill.");
          return;
        }
        setPhraseItems(data.items);
        setWordItems([]);
      }

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
  }, [drillMode, drillPool, limit, direction]);

  async function submitAnswer() {
    if (feedback) return;
    setLoading(true);
    setClaimMessage(null);
    try {
      if (drillMode === "words" && currentWord) {
        const res = await fetch("/api/train", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wordId: currentWord.wordId,
            direction: currentWord.direction,
            answer,
            expected: currentWord.expected,
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
          setWordItems((prev) =>
            updateWordItemStats(prev, currentWord.wordId, data.drillStats)
          );
        }
      } else if (drillMode === "phrases" && currentPhrase) {
        const res = await fetch("/api/train/phrases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "answer",
            sentenceId: currentPhrase.sentenceId,
            answer,
            expected: currentPhrase.expected,
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
          setPhraseItems((prev) =>
            updatePhraseItemStats(prev, currentPhrase.sentenceId, data.drillStats)
          );
        }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to check answer");
    } finally {
      setLoading(false);
    }
  }

  async function claimKnown() {
    if (!currentWord?.canClaimKnown) return;
    setLoading(true);
    setClaimMessage(null);
    try {
      const res = await fetch("/api/train/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: currentWord.wordId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClaimMessage(`"${currentWord.lemma}" marked as known.`);
      setWordItems((prev) =>
        prev.map((item) =>
          item.wordId === currentWord.wordId
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
    if (index + 1 >= totalItems) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setAnswer("");
    setFeedback(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (phase !== "drill") return;
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
        subtitle="Words, phrases, and sentences"
        active="train"
      />

      <main className="mx-auto max-w-2xl px-4 py-8">
        {phase === "setup" && (
          <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="block text-sm font-medium text-slate-700">Drill type</p>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="drillMode"
                    checked={drillMode === "words"}
                    onChange={() => setDrillMode("words")}
                  />
                  Single words
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="drillMode"
                    checked={drillMode === "phrases"}
                    onChange={() => setDrillMode("phrases")}
                  />
                  Phrases &amp; sentences
                </label>
              </div>
            </div>

            {drillMode === "words" ? (
              <>
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
              </>
            ) : (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700">Add a phrase</p>
                  <p className="mt-1 text-xs text-slate-500">
                    e.g. English &quot;My name is Namiq&quot; → Russian &quot;Меня зовут
                    Namiq&quot;
                  </p>
                  <input
                    type="text"
                    value={newPromptEn}
                    onChange={(e) => setNewPromptEn(e.target.value)}
                    placeholder="English prompt"
                    className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={newAnswerRu}
                    onChange={(e) => setNewAnswerRu(e.target.value)}
                    placeholder="Russian answer"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <Button
                    variant="secondary"
                    className="mt-3"
                    onClick={addPhrase}
                    disabled={loading || !newPromptEn.trim() || !newAnswerRu.trim()}
                  >
                    Add phrase
                  </Button>
                </div>

                {savedPhrases.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Your phrases ({savedPhrases.length})
                    </p>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-600">
                      {savedPhrases.slice(0, 8).map((p) => (
                        <li key={p.id} className="truncate">
                          {p.prompt_en} → {p.answer_ru}
                        </li>
                      ))}
                      {savedPhrases.length > 8 && (
                        <li className="text-slate-400">+ {savedPhrases.length - 8} more</li>
                      )}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-slate-500">
                  Always English → Russian. Build short sentences from words you are learning.
                </p>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                {drillMode === "words" ? "Word count" : "Phrase count"}
              </label>
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

            <Button onClick={startDrill} disabled={loading}>
              {loading ? "Loading…" : "Start drill"}
            </Button>
          </div>
        )}

        {phase === "drill" && drillMode === "words" && currentWord && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">
              {index + 1} / {totalItems} ·{" "}
              {currentWord.direction === "en_to_ru" ? "English → Russian" : "Russian → English"}
              {currentWord.status === "learning" && (
                <> · Drilled {currentWord.drillAttempts}× ({currentWord.drillCorrect} correct)</>
              )}
            </p>

            {currentWord.status === "learning" &&
              !currentWord.canClaimKnown &&
              currentWord.daysUntilClaim > 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  Claim as known in {currentWord.daysUntilClaim}{" "}
                  {currentWord.daysUntilClaim === 1 ? "day" : "days"}
                </p>
              )}

            {currentWord.canClaimKnown && (
              <p className="mt-2 text-sm text-emerald-700">
                Ready to claim — mark as known when you feel comfortable.
              </p>
            )}

            <p className="mt-4 text-3xl font-bold text-slate-900">{currentWord.prompt}</p>

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
                  {currentWord.canClaimKnown && currentWord.status === "learning" && (
                    <Button variant="success" onClick={claimKnown} disabled={loading}>
                      Mark as known
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button onClick={nextWord}>
                    {index + 1 >= totalItems ? "Finish" : "Next"}
                  </Button>
                  {currentWord.canClaimKnown && currentWord.status === "learning" && (
                    <Button variant="success" onClick={claimKnown} disabled={loading}>
                      Mark as known
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {phase === "drill" && drillMode === "phrases" && currentPhrase && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">
              {index + 1} / {totalItems} · English → Russian · Drilled{" "}
              {currentPhrase.drillAttempts}× ({currentPhrase.drillCorrect} correct)
            </p>

            <p className="mt-4 text-2xl font-bold leading-snug text-slate-900">
              {currentPhrase.prompt}
            </p>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={!!feedback}
              autoFocus
              rows={3}
              placeholder="Type the Russian sentence…"
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

            <div className="mt-6 flex flex-wrap gap-3">
              {!feedback ? (
                <Button onClick={submitAnswer} disabled={loading || !answer.trim()}>
                  Check
                </Button>
              ) : (
                <Button onClick={nextWord}>
                  {index + 1 >= totalItems ? "Finish" : "Next"}
                </Button>
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
