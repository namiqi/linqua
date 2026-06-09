"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { FOUNDATION_VOCAB_1 } from "@/lib/seed/foundation-vocab-1";
import { importFoundationVocabAction } from "./actions";

export function FoundationVocabButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleImport() {
    const confirmed = window.confirm(
      `Replace your entire word list with Foundation 1 (${FOUNDATION_VOCAB_1.length} words)?\n\n` +
        "All words will be marked as Learning and your 7-day practice clock starts now.\n\n" +
        "Drill history is cleared. Lessons and stories are kept."
    );
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const { count } = await importFoundationVocabAction();
        setMessage(
          `Imported ${count} Foundation 1 words as Learning. Drill daily — you can mark them known after 7 days.`
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">Foundation 1 vocabulary</p>
      <p className="mt-1 text-sm text-amber-800">
        Reset your word list and import {FOUNDATION_VOCAB_1.length} core Russian frequency
        words as Learning. Practice in Train for 7 days, then claim words as known.
      </p>
      <Button onClick={handleImport} disabled={pending} className="mt-3">
        {pending ? "Importing…" : "Import Foundation 1 (Learning)"}
      </Button>
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
