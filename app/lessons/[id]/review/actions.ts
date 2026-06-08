"use server";

import { requireUserId } from "@/lib/auth";
import { reviewWord, markLessonReviewed } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function markWordAction(
  lessonId: string,
  lemma: string,
  status: "known" | "learning",
  translation?: string,
  occurrenceCount?: number
) {
  const userId = await requireUserId();
  await reviewWord(userId, lessonId, lemma, status, translation, occurrenceCount ?? 1);
}

export async function finishReviewAction(lessonId: string) {
  const userId = await requireUserId();
  await markLessonReviewed(userId, lessonId);
  revalidatePath(`/lessons/${lessonId}/review`);
  revalidatePath("/dashboard");
  revalidatePath("/vocab");
}
