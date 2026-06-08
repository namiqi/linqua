"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button, ProgressBar } from "@/components/ui";
import type { Lesson, ReviewWord } from "@/lib/types";
import { finishReviewAction, markWordAction } from "./actions";

interface ReviewClientProps {
  lesson: Lesson;
  words: ReviewWord[];
}

export function ReviewClient({ lesson, words }: ReviewClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const skippedCount = words.filter((w) => w.skipped).length;
  const [sessionWords] = useState<ReviewWord[]>(() =>
    words.filter((w) => !w.skipped && w.lemma)
  );
  const [index, setIndex] = useState(0);

  const total = sessionWords.length;
  const current = index < total ? sessionWords[index] : null;
  const done = index >= total;
  const translation =
    current != null
      ? (translations[current.lemma] ?? current.existingWord?.translation ?? "")
      : "";

  const mark = useCallback(
    (status: "known" | "learning") => {
      if (!current) return;
      const lemma = current.lemma;
      const translationValue =
        translations[lemma] ?? current.existingWord?.translation ?? "";
      startTransition(async () => {
        await markWordAction(
          lesson.id,
          lemma,
          status,
          translationValue,
          current.occurrence_count
        );
        setIndex((i) => i + 1);
      });
    },
    [current, lesson.id, translations]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (pending || done || !current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key !== "k" && e.key !== "K" && e.key !== "n" && e.key !== "N") return;
        if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          mark("known");
        }
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          mark("learning");
        }
        return;
      }
      if (e.key === "k" || e.key === "K") mark("known");
      if (e.key === "n" || e.key === "N") mark("learning");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mark, pending, done, current]);

  async function handleFinish() {
    await finishReviewAction(lesson.id);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title={lesson.name}
        subtitle="Mark each word as known or new"
        active="lessons"
      />

      <main className="mx-auto max-w-2xl px-4 py-8">
        {total === 0 ? (
          <p className="mt-8 text-center text-slate-500">
            No new words to review — you already know all words in this lesson.
          </p>
        ) : (
          <>
            <ProgressBar
              value={done ? total : index}
              max={total}
              label={`Review progress${skippedCount ? ` (${skippedCount} already known, skipped)` : ""}`}
            />

            {done ? (
              <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Review complete</h2>
                <p className="mt-2 text-slate-600">
                  You reviewed {total} words from this lesson.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button onClick={handleFinish}>Back to dashboard</Button>
                  <a href="/train">
                    <Button variant="secondary">Train vocab</Button>
                  </a>
                </div>
              </div>
            ) : current ? (
              <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-sm text-slate-500">
                  Word {index + 1} of {total}
                  {current.occurrence_count > 1 &&
                    ` · appears ${current.occurrence_count}× in transcript`}
                </p>
                <p className="mt-4 text-4xl font-bold text-slate-900">{current.lemma}</p>

                <div className="mt-6">
                  <label
                    htmlFor="translation"
                    className="block text-sm font-medium text-slate-700"
                  >
                    English meaning (optional)
                  </label>
                  <input
                    id="translation"
                    type="text"
                    value={translation}
                    onChange={(e) =>
                      setTranslations((prev) => ({
                        ...prev,
                        [current.lemma]: e.target.value,
                      }))
                    }
                    placeholder="Type or paste translation…"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Button
                    variant="success"
                    onClick={() => mark("known")}
                    disabled={pending}
                  >
                    Know (K)
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => mark("learning")}
                    disabled={pending}
                  >
                    New / learning (N)
                  </Button>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                  Shortcuts: K = know, N = new
                </p>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
