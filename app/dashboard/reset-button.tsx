"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { resetDataAction } from "./actions";

export function ResetDataButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleReset() {
    const confirmed = window.confirm(
      "Delete ALL lessons, vocabulary, training history, and stories?\n\nThis cannot be undone."
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await resetDataAction();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reset failed");
      }
    });
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-medium text-rose-900">Testing</p>
      <p className="mt-1 text-sm text-rose-700">
        Clear all your data and start fresh (lessons, vocab, stories).
      </p>
      <Button
        variant="danger"
        onClick={handleReset}
        disabled={pending}
        className="mt-3"
      >
        {pending ? "Resetting…" : "Reset all data"}
      </Button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
