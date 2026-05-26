import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // If NOT logged in and trying to access protected areas -> Redirect to Login Page
  if (!isLoggedIn && pathname !== "/") {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  // If ALREADY logged in and trying to access the Login Page -> Redirect to Dashboard
  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

// Ensures the middleware runs on all paths except static files, images, and auth internal APIs
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
