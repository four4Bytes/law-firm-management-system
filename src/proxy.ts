import { NextResponse } from "next/server";

import { auth } from "@/lib/infra/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // Deactivated users keep a flagged session so they can be sent to the
  // notice page instead of being silently dropped to the login page.
  const isDeactivated = isLoggedIn && req.auth?.user?.isActive === false;
  if (isDeactivated && pathname !== "/deactivated") {
    return NextResponse.redirect(new URL("/deactivated?reason=deactivated", nextUrl));
  }

  // Protect private routes; "/deactivated" is reachable while signed out so the
  // post-deactivation notice can be displayed.
  if (
    !isLoggedIn &&
    pathname !== "/" &&
    !pathname.startsWith("/auth") &&
    pathname !== "/deactivated"
  ) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Redirect authenticated users away from the landing/login page
  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

// Ensures the middleware runs on all paths except static files, images, and auth internal APIs
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
  ],
};
