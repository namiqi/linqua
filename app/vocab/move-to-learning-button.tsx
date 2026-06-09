"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { demoteWordToLearningAction } from "./actions";

export function MoveToLearningButton({
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
      `Move "${lemma}" back to learning?\n\nThe 7-day clock will restart before you can claim it as known again.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await demoteWordToLearningAction(wordId);
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
      className="text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50"
    >
      {pending ? "Moving…" : "Move to learning"}
    </button>
  );
}
