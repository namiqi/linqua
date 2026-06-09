import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getDrillSessionEntries } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const entries = await getDrillSessionEntries(userId, id);
  return NextResponse.json({ entries });
}
