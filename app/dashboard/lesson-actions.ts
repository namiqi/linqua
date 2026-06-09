"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { deleteLesson, updateLessonName } from "@/lib/db";

export async function renameLessonAction(lessonId: string, name: string) {
  const userId = await requireUserId();
  await updateLessonName(userId, lessonId, name);
  revalidatePath("/dashboard");
  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath(`/lessons/${lessonId}/review`);
}

export async function deleteLessonAction(lessonId: string) {
  const userId = await requireUserId();
  await deleteLesson(userId, lessonId);
  revalidatePath("/dashboard");
}
