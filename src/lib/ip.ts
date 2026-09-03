import "server-only";

import { ipAddress } from "@vercel/functions";
import { headers } from "next/headers";

export default async function getIp(request?: Request) {
  // The render-path headers() result is not a Headers instance, and the
  // Vercel helper needs one.
  return (
    ipAddress(
      request ?? new Request("http://internal", { headers: await headers() }),
    ) ?? (process.env.NODE_ENV === "development" ? "127.0.0.1" : undefined)
  );
}
