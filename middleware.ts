import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { authenticate} from "auth"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const claims = await authenticate(request)

  // check if user is authenticated. If not, redirect to login page. 
  if (!claims) {
    console.log(request.url, new URL("/login", request.url));
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/reset-password',
    // '/((?!api|_next/static|_next/image|favicon.ico|.+\.svg$).*)',
  ]
};
