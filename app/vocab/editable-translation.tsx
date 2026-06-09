"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateWordTranslationAction } from "./actions";

export function EditableTranslation({
  wordId,
  translation,
  onSaved,
}: {
  wordId: string;
  translation: string | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(translation ?? "");
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(translation ?? "");
    setEditing(true);
    setError(null);
  }

  function cancelEdit() {
    setDraft(translation ?? "");
    setEditing(false);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateWordTranslationAction(wordId, draft);
        setEditing(false);
        if (onSaved) onSaved();
        else router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  if (editing) {
    return (
      <div className="min-w-[12rem] space-y-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending}
          autoFocus
          placeholder="English translation"
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancelEdit();
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="text-xs font-medium text-indigo-700 hover:text-indigo-900 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={pending}
            className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <span className={translation ? "text-slate-600" : "italic text-slate-400"}>
        {translation || "missing"}
      </span>
      <button
        type="button"
        onClick={startEdit}
        className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800"
      >
        Edit
      </button>
    </div>
  );
}
