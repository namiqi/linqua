"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { resetUserData, seedInitialVocab } from "@/lib/db";

export async function resetDataAction() {
  const userId = await requireUserId();
  await resetUserData(userId);
  revalidatePath("/dashboard");
  revalidatePath("/vocab");
  revalidatePath("/stories");
  revalidatePath("/train");
}

export async function seedVocabAction(): Promise<{ count: number }> {
  const userId = await requireUserId();
  const count = await seedInitialVocab(userId);
  revalidatePath("/dashboard");
  revalidatePath("/vocab");
  revalidatePath("/stories");
  return { count };
}
