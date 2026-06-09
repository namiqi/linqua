"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import {
  importFoundationVocabAsLearning,
  resetUserData,
  seedInitialVocab,
} from "@/lib/db";

export async function resetDataAction() {
  const userId = await requireUserId();
  await resetUserData(userId);
  revalidatePath("/dashboard");
  revalidatePath("/vocab");
  revalidatePath("/stories");
  revalidatePath("/train");
}

export async function importFoundationVocabAction(): Promise<{ count: number }> {
  const userId = await requireUserId();
  const count = await importFoundationVocabAsLearning(userId);
  revalidatePath("/dashboard");
  revalidatePath("/vocab");
  revalidatePath("/stories");
  revalidatePath("/train");
  return { count };
}

export async function seedVocabAction(): Promise<{ count: number }> {
  const userId = await requireUserId();
  const count = await seedInitialVocab(userId);
  revalidatePath("/dashboard");
  revalidatePath("/vocab");
  revalidatePath("/stories");
  return { count };
}
