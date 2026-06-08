import { NextRequest, NextResponse } from "next/server";
import { getDevUserId, validateDevBypassSecret } from "@/lib/auth";
import { USER_ID_COOKIE } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const secret = body.secret ?? request.nextUrl.searchParams.get("secret");

    if (!validateDevBypassSecret(secret)) {
      return NextResponse.json({ error: "Invalid bypass secret" }, { status: 403 });
    }

    const userId = getDevUserId();
    const response = NextResponse.json({ ok: true, redirect: "/dashboard" });

    response.cookies.set(USER_ID_COOKIE, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auth failed" },
      { status: 500 }
    );
  }
}
