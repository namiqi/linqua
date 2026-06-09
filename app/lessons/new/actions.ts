"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { createLesson } from "@/lib/db";
import { formatDbError, isNextRedirect } from "@/lib/errors";

export type CreateLessonState = {
  error?: string;
};

export async function createLessonAction(
  _prev: CreateLessonState,
  formData: FormData
): Promise<CreateLessonState> {
  try {
    const userId = await requireUserId();
    const name = (formData.get("name") as string)?.trim();
    const transcript = (formData.get("transcript") as string)?.trim();

    if (!name || !transcript) {
      return { error: "Name and transcript are required" };
    }

    const lessonId = await createLesson(userId, name, transcript);
    redirect(`/lessons/${lessonId}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: formatDbError(error) };
  }
}
