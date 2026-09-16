import "server-only";

import { headers } from "next/headers";

// The origin emailed links point at, in order of trust:
// 1. SITE_URL, set by the host when the public origin is known.
// 2. Vercel's system variables: the production domain in production, the
//    deployment URL in previews. These need "Automatically expose System
//    Environment Variables" on in the Vercel project.
// 3. The Host header the browser addressed, so a name such as civic.localhost
//    works locally. request.url is never used: Next fills it with the
//    hostname the server started on.
export default async function siteOrigin(request?: Request) {
  const configured = process.env.SITE_URL?.trim();
  if (configured) {
    return new URL(configured).origin;
  }

  if (process.env.VERCEL_ENV === "production") {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }
  } else if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const requestHeaders = request?.headers ?? (await headers());
  return `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${requestHeaders.get("host") ?? "localhost"}`;
}
