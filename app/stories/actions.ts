"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { deleteStory, updateStoryTitle } from "@/lib/db";

export async function renameStoryAction(storyId: string, title: string) {
  const userId = await requireUserId();
  await updateStoryTitle(userId, storyId, title);
  revalidatePath("/stories");
  revalidatePath(`/stories/${storyId}`);
}

export async function deleteStoryAction(storyId: string) {
  const userId = await requireUserId();
  await deleteStory(userId, storyId);
  revalidatePath("/stories");
}
