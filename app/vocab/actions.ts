"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { demoteWordToLearning, markWordAsKnown, updateWordTranslation } from "@/lib/db";

export async function demoteWordToLearningAction(wordId: string) {
  const userId = await requireUserId();
  await demoteWordToLearning(userId, wordId);
  revalidatePath("/vocab");
  revalidatePath("/dashboard");
  revalidatePath("/train");
  revalidatePath("/stories");
}

export async function markWordAsKnownAction(wordId: string) {
  const userId = await requireUserId();
  await markWordAsKnown(userId, wordId);
  revalidatePath("/vocab");
  revalidatePath("/dashboard");
  revalidatePath("/train");
  revalidatePath("/stories");
}

export async function updateWordTranslationAction(wordId: string, translation: string) {
  const userId = await requireUserId();
  await updateWordTranslation(userId, wordId, translation);
  revalidatePath("/vocab");
  revalidatePath("/train");
}
