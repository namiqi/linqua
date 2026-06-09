import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getDrillSessions } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(
    50,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "1", 10))
  );
  const sessions = await getDrillSessions(userId, limit);
  return NextResponse.json({ sessions });
}
