import { headers } from "next/headers";

export default async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host");

  const proto = headersList.get("x-forwarded-proto") || "http";

  return `${proto}://${host}`;
}
