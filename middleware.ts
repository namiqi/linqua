import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { USER_ID_COOKIE } from "./lib/constants";

const protectedPaths = [
  "/dashboard",
  "/lessons",
  "/vocab",
  "/train",
  "/stories",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const userId = request.cookies.get(USER_ID_COOKIE)?.value;
  if (!userId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/lessons/:path*", "/vocab/:path*", "/train/:path*", "/stories/:path*"],
};
