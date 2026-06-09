"use client";

import type { LessonWithStats } from "@/lib/types";
import { ManageableCard } from "@/components/manageable-card";
import { deleteLessonAction, renameLessonAction } from "./lesson-actions";

interface LessonListProps {
  lessons: LessonWithStats[];
}

export function LessonList({ lessons }: LessonListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {lessons.map((lesson) => (
        <ManageableCard
          key={lesson.id}
          id={lesson.id}
          title={lesson.name}
          href={`/lessons/${lesson.id}`}
          subtitle={
            <>
              {new Date(lesson.created_at).toLocaleDateString()} · {lesson.wordCount} words
              {lesson.newCount > 0 && ` · ${lesson.newCount} learning`}
            </>
          }
          badge={
            !lesson.reviewed_at && lesson.reviewedCount < lesson.wordCount ? (
              <span className="mt-3 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Review pending
              </span>
            ) : (
              <span className="mt-3 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                Read script
              </span>
            )
          }
          deleteConfirmMessage={`Delete lesson "${lesson.name}"?\n\nYour vocabulary from this lesson will stay in your word list.`}
          onRename={renameLessonAction}
          onDelete={deleteLessonAction}
        />
      ))}
    </div>
  );
}
