"use client";

import { useTransition } from "react";
import { markWordAsKnownAction } from "@/app/vocab/actions";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? "h-4 w-4"}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function MarkKnownIconButton({
  wordId,
  lemma,
  onMarked,
  confirm = true,
  size = "md",
}: {
  wordId: string;
  lemma: string;
  onMarked?: () => void;
  confirm?: boolean;
  size?: "sm" | "md";
}) {
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm) {
      const ok = window.confirm(
        `Mark "${lemma}" as known?\n\nSkips the 7-day wait — use when you know the word even if the stored translation didn't match.`
      );
      if (!ok) return;
    }

    startTransition(async () => {
      try {
        await markWordAsKnownAction(wordId);
        onMarked?.();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to mark as known");
      }
    });
  }

  const sizeClass = size === "sm" ? "h-6 w-6" : "h-7 w-7";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={`Mark "${lemma}" as known`}
      aria-label={`Mark ${lemma} as known`}
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40`}
    >
      <CheckIcon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}

export function MarkKnownDoneIcon() {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-emerald-500"
      title="Known"
      aria-label="Known"
    >
      <CheckIcon className="h-4 w-4" />
    </span>
  );
}
