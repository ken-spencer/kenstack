import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyJWT } from "auth/verifyJWT";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const claims = await verifyJWT(request);

  // check if user is authenticated. If not, redirect to login page.
  if (!claims) {
    console.log(request.url, new URL("/login", request.url));
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token has 1/2 hour left before expiration let's re-issue
  const now = Math.round(Date.now() / 1000);
  if (claims.exp - now <= 1800) {
    let res = NextResponse.rewrite(new URL("/login/revalidate", request.url));
    return res;
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/reset-password",
    // '/((?!api|_next/static|_next/image|favicon.ico|.+\.svg$).*)',
  ],
};
