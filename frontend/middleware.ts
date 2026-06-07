import { NextResponse } from "next/server";

// All routes are publicly accessible — no login required.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
