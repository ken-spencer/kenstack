import { NextResponse } from "next/server";
import verifyJWT from "@admin/auth/verifyJWT";

export async function middleware(request) {
  return;
  const publicPaths = ["/login", "/forgotten-password", "/test"];

  const path = request.nextUrl.pathname;

  const response = NextResponse.next();
  response.headers.append("x-href", request.nextUrl.href);
  response.headers.append("x-ip", request.ip || "127.0.0.1");
  response.headers.append("x-geo", JSON.stringify(request.geo));

  const isPublic = publicPaths.find((value) => path.startsWith(value));
  if (isPublic) {
    return response;
  }

  const claims = await verifyJWT();

  // check if user is authenticated. If not, redirect to login page.
  if (!claims) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token has 1/2 hour left before expiration let's re-issue
  const secondsRemaining = Math.round(claims.exp - Date.now() / 1000);
  if (secondsRemaining <= 1800) {
    let res = NextResponse.rewrite(new URL("/login/revalidate", request.url));
    return res;
  }

  /*
  if (path.startsWith("/admin") && !hasRole(claims, ["ADMIN"])) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(
        "loginError",
        "You do not have permission to access this page.",
      );
    return response;
  }
  */

  return response;
}

/*
function hasRole(claims, roles) {
  if (!claims?.roles) {
    return false;
  }

  for (const role of roles) {
    if (claims.roles.includes(role)) {
      return true;
    }
  }

  return false;
}
*/

export const config = {
  matcher: [
    // "/admin/:path*",
    // "/reset-password",
    "/((?!login|$))",
    "/((?!react_devtools|_next/static|_next/image|auth|favicon.ico|robots.txt|images|$).*)",
  ],
};
