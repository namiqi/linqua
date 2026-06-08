import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USER_ID_COOKIE } from "./constants";

export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(USER_ID_COOKIE)?.value ?? null;
}

export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) {
    redirect("/");
  }
  return userId;
}

export function getDevUserId(): string {
  const id = process.env.DEV_USER_ID;
  if (!id) {
    throw new Error("DEV_USER_ID is not configured");
  }
  return id;
}

export function validateDevBypassSecret(secret: string | null): boolean {
  const expected = process.env.DEV_BYPASS_SECRET;
  if (!expected) return true;
  return secret === expected;
}
