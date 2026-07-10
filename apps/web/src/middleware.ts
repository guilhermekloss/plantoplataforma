import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/invite"];

export default auth((req) => {
  const isPublic = req.nextUrl.pathname === "/" || PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
