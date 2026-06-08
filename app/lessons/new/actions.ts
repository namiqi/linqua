"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { createLesson } from "@/lib/db";

export async function createLessonAction(formData: FormData) {
  const userId = await requireUserId();
  const name = (formData.get("name") as string)?.trim();
  const transcript = (formData.get("transcript") as string)?.trim();

  if (!name || !transcript) {
    throw new Error("Name and transcript are required");
  }

  const lessonId = await createLesson(userId, name, transcript);
  redirect(`/lessons/${lessonId}/review`);
}
