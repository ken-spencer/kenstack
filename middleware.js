import { NextResponse } from "next/server";
import verifyJWT from "@thaumazo/cms/auth/verifyJWT";

export async function middleware(request) {
  const publicPaths = [
    "/login",
    "/forgotten-password",
    "/test",
  ]

  const path = request.nextUrl.pathname;

  const response = NextResponse.next()
  response.headers.append("x-href", request.nextUrl.href)
  response.headers.append("x-ip", request.ip || "127.0.0.1")
  response.headers.append("x-geo", JSON.stringify(request.geo))

  const isPublic = publicPaths.find(value => path.startsWith(value));
  if (isPublic) {
    return response
  }

  const claims = await verifyJWT();

  // check if user is authenticated. If not, redirect to login page.
  if (!claims) {
    console.log(request.url, new URL("/login", request.url));
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token has 1/2 hour left before expiration let's re-issue
  const secondsRemaining = Math.round((claims.exp - Date.now() / 1000));
  if (secondsRemaining <= 1800) {
    let res = NextResponse.rewrite(new URL("/login/revalidate", request.url));
    return res;
  }

  return response
}

export const config = {
  matcher: [
    // "/admin/:path*",
    // "/reset-password",
    '/((?!login|$))',
    "/((?!react_devtools|_next/static|_next/image|auth|favicon.ico|robots.txt|images|$).*)",
  ]
};
