// Host proxy entry points import this cookie-presence gate; session and role checks stay in server auth.
import { NextResponse, type NextRequest } from "next/server";

import { getSafeReturnToPath } from "./returnTo";

export function proxyAuth(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/api" ||
    request.nextUrl.pathname.startsWith("/api/") ||
    (request.method !== "GET" && request.method !== "HEAD")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.searchParams.delete("_rsc");
  const returnTo = getSafeReturnToPath(url.pathname + url.search);

  if (!request.cookies.get("sessionId")?.value) {
    const loginUrl = new URL("/login", request.url);
    if (returnTo) {
      loginUrl.searchParams.set("returnTo", returnTo);
    }
    return NextResponse.redirect(loginUrl, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", url.pathname);
  requestHeaders.set("x-search", url.search);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
