"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { resetUserData } from "@/lib/db";

export async function resetDataAction() {
  const userId = await requireUserId();
  await resetUserData(userId);
  revalidatePath("/dashboard");
  revalidatePath("/vocab");
  revalidatePath("/stories");
  revalidatePath("/train");
}
