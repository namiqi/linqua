"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { INITIAL_VOCAB } from "@/lib/seed/initial-vocab";
import { seedVocabAction } from "./actions";

export function SeedVocabButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSeed() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const { count } = await seedVocabAction();
        setMessage(`Imported ${count} words as known.`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-sm font-medium text-indigo-900">Starter vocabulary</p>
      <p className="mt-1 text-sm text-indigo-700">
        Import {INITIAL_VOCAB.length} hardcoded Russian words (marked as known, with
        English translations).
      </p>
      <Button onClick={handleSeed} disabled={pending} className="mt-3">
        {pending ? "Importing…" : "Import starter vocab"}
      </Button>
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
