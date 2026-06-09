"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { demoteWordToLearning } from "@/lib/db";

export async function demoteWordToLearningAction(wordId: string) {
  const userId = await requireUserId();
  await demoteWordToLearning(userId, wordId);
  revalidatePath("/vocab");
  revalidatePath("/dashboard");
  revalidatePath("/train");
}
