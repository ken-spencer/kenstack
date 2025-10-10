import getGeo from "@kenstack/lib/geo";
import { getDb } from "@kenstack/lib/db";
import { headers } from "next/headers";
import { getClaims } from "@kenstack/lib/auth";
import { ObjectId } from "mongodb";

export default async function auditLog(
  key: string,
  message: string = null,
  data: Record<string, unknown> | null = null,
  user?: ObjectId | string | null
) {
  const geo = await getGeo();
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  const ip = headersList.get("x-real-ip") ?? "127.0.0.1";
  const pathname = headersList.get("x-pathname") ?? null;

  const claims = await getClaims();

  const db = await getDb();
  return await db.collection("auditlogs").insertOne({
    key,
    message,
    user: user
      ? user instanceof ObjectId
        ? user
        : new ObjectId(user)
      : claims
      ? new ObjectId(claims.sub)
      : null,
    data,
    pathname,
    ip,
    userAgent,
    geo,
    createdAt: new Date(),
  });
}
