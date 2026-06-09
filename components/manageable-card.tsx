"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";

interface ManageableCardProps {
  id: string;
  title: string;
  href: string;
  subtitle: React.ReactNode;
  badge?: React.ReactNode;
  renameLabel?: string;
  deleteLabel?: string;
  deleteConfirmMessage: string;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ManageableCard({
  id,
  title,
  href,
  subtitle,
  badge,
  renameLabel = "Rename",
  deleteLabel = "Delete",
  deleteConfirmMessage,
  onRename,
  onDelete,
}: ManageableCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [error, setError] = useState<string | null>(null);

  function startEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDraftTitle(title);
    setEditing(true);
    setError(null);
  }

  function cancelEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditing(false);
    setDraftTitle(title);
    setError(null);
  }

  function saveEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      try {
        await onRename(id, draftTitle);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Rename failed");
      }
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(deleteConfirmMessage)) return;

    setError(null);
    startTransition(async () => {
      try {
        await onDelete(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  return (
    <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {editing ? (
        <div className="flex flex-1 flex-col gap-3 p-5">
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            disabled={pending}
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <Button onClick={saveEdit} disabled={pending || !draftTitle.trim()}>
              Save
            </Button>
            <Button variant="secondary" onClick={cancelEdit} disabled={pending}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      ) : (
        <Link href={href} className="min-w-0 flex-1 p-5">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          {badge}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </Link>
      )}

      {!editing && (
        <div className="flex flex-col justify-center gap-1 border-l border-slate-100 px-2 py-3">
          <button
            type="button"
            onClick={startEdit}
            disabled={pending}
            className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {renameLabel}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            {pending ? "…" : deleteLabel}
          </button>
        </div>
      )}
    </div>
  );
}
