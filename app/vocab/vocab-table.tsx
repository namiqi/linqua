"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Word } from "@/lib/types";
import { daysUntilClaimable } from "@/lib/training/promotion";
import { isMissingTranslation, sortVocabWords } from "@/lib/vocab/sort";
import { MoveToLearningButton } from "./move-to-learning-button";
import { MoveToKnownButton } from "./move-to-known-button";
import { EditableTranslation } from "./editable-translation";

type StatusFilter = "all" | "known" | "learning";

interface VocabTableProps {
  words: Word[];
  drillStats: Record<string, { attempts: number; correct: number }>;
  initialFilter?: StatusFilter;
}

const TABS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Known", value: "known" },
  { label: "Learning", value: "learning" },
];

export function VocabTable({ words, drillStats, initialFilter = "all" }: VocabTableProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>(initialFilter);

  const sorted = useMemo(() => sortVocabWords(words), [words]);

  const filtered = useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((w) => w.status === filter);
  }, [sorted, filter]);

  const missingCount = useMemo(
    () => words.filter((w) => isMissingTranslation(w.translation)).length,
    [words]
  );

  function onFilterChange(next: StatusFilter) {
    setFilter(next);
    const url = next === "all" ? "/vocab" : `/vocab?status=${next}`;
    window.history.replaceState(null, "", url);
  }

  function onTranslationSaved() {
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onFilterChange(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-indigo-100 text-indigo-800"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {missingCount > 0 && (
          <span className="text-sm text-amber-700">
            {missingCount} missing translation{missingCount === 1 ? "" : "s"} (shown first)
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          No words in this filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Russian</th>
                <th className="px-4 py-3 font-medium text-slate-700">English</th>
                <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                <th className="px-4 py-3 font-medium text-slate-700">Drill</th>
                <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((word) => {
                const stats = drillStats[word.id];
                const missing = isMissingTranslation(word.translation);
                return (
                  <tr
                    key={word.id}
                    className={`border-b border-slate-100 last:border-0 ${
                      missing ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">{word.lemma}</td>
                    <td className="px-4 py-3">
                      <EditableTranslation
                        wordId={word.id}
                        translation={word.translation}
                        onSaved={onTranslationSaved}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          word.status === "known"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {word.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {word.status === "learning" ? (
                        <span className="text-xs">
                          {stats
                            ? `${stats.correct}/${stats.attempts} correct`
                            : "0/0 correct"}
                          {word.learning_started_at && (
                            <>
                              {" · "}
                              {daysUntilClaimable(word.learning_started_at) > 0
                                ? `claim in ${daysUntilClaimable(word.learning_started_at)}d`
                                : "ready to claim"}
                            </>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {word.status === "known" ? (
                        <MoveToLearningButton wordId={word.id} lemma={word.lemma} />
                      ) : (
                        <MoveToKnownButton wordId={word.id} lemma={word.lemma} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
