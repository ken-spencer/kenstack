import getGeo from "@kenstack/lib/geo";
import { headers } from "next/headers";

export default async function errorLog(
  error: Error,
  message: string | null = null,
  data: Record<string, unknown> | null = null,
) {
  const geo = await getGeo();
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");
  const pathname = headersList.get("x-pathname") ?? null;
  const ip = headersList.get("x-real-ip") ?? "127.0.0.1";

  const meta = {
    pathname,
    ip,
    userAgent,
    geo,
  };

  const trace = new Error();
  const callerLine = trace.stack?.split("\n")[1]?.trim();

  // eslint-disable-next-line no-console
  console.error(message || error.message, meta, data, callerLine, error);
}
