import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { retryDrillSession } from "@/lib/db";

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const { session, items } = await retryDrillSession(userId, sessionId);
    return NextResponse.json({ session, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to retry drill";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
