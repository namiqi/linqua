import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getDrillSessions } from "@/lib/db";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await getDrillSessions(userId);
  return NextResponse.json({ sessions });
}
