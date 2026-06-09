import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { promoteWordToKnown } from "@/lib/db";

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { wordId } = body;

  if (!wordId) {
    return NextResponse.json({ error: "Missing wordId" }, { status: 400 });
  }

  try {
    await promoteWordToKnown(userId, wordId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to promote word" },
      { status: 400 }
    );
  }
}
