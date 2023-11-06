import { NextResponse } from "next/server";
import revalidate from "@thaumazo/cms/auth/revalidate";

export async function GET(request) {
  // for now we are only loading this from middleware.
  // this will prebvent this from being loaded directly
  if (request.nextUrl.pathname === "/login/revalidate") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.redirect(request.nextUrl.href);
  const success = await revalidate(request, response);

  if (success) {
    return response;
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
