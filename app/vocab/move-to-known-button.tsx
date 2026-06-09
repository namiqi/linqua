"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markWordAsKnownAction } from "./actions";

export function MoveToKnownButton({
  wordId,
  lemma,
}: {
  wordId: string;
  lemma: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      `Mark "${lemma}" as known?\n\nThis skips the 7-day drill wait — use this to fix mistakes.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await markWordAsKnownAction(wordId);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to update word");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Mark as known"}
    </button>
  );
}
