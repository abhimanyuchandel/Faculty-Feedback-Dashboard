import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const publicAdminPaths = new Set([
    "/admin/login",
    "/admin/forgot-password",
    "/admin/reset-password"
  ]);
  const isPublicAdminPage = publicAdminPaths.has(req.nextUrl.pathname);

  if (!isAdminRoute || isPublicAdminPage) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    const signInUrl = new URL("/admin/login", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin", "/admin/:path*"]
};
