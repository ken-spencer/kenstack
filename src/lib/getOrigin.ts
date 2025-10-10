import { headers } from "next/headers";

export default async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");

  const proto = headersList.get("x-forwarded-proto") || "http";

  const origin = `${proto}://${host}`;

  return origin;
}

// export default function getOrigin() {
//   return process.env.VERCEL_PROJECT_PRODUCTION_URL
//     ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
//     : "http://localhost:" + process.env.PORT;
// }

// export const origin = getOrigin();
