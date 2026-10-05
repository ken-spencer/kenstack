import getIp from "@kenstack/lib/ip";
import { geolocation } from "@vercel/functions";
import { DrizzleQueryError } from "drizzle-orm";
import { headers } from "next/headers";

type ErrorLogInput = {
  context?: Record<string, unknown>;
  error?: unknown;
  message?: string;
  name: string;
};

// Writes curated event and request context to the server error log for investigation.
export default async function errorLog({
  context,
  error,
  message,
  name,
}: ErrorLogInput) {
  const headersList = await headers();
  const request = new Request("http://internal", { headers: headersList });
  const { city, country, countryRegion } = geolocation(request);
  const location = [city, countryRegion, country].filter(Boolean).join(", ");
  // A failed query's message lists its parameters, which can be personal details such as an email
  // address; the database's own error, its cause, does not.
  const logged = error instanceof DrizzleQueryError ? error.cause : error;
  let errorDetails;
  if (logged instanceof Error) {
    errorDetails = {
      message: logged.message,
      name: logged.name,
      stack: logged.stack?.split("\n").slice(1, 6).join("\n"),
    };
  } else if (logged !== undefined) {
    errorDetails = { type: typeof logged };
  }

  const details: Record<string, unknown> = {
    path: headersList.get("x-pathname") ?? null,
    ip: (await getIp(request)) ?? "unknown",
    userAgent: headersList.get("user-agent"),
  };
  if (message) {
    details.message = message;
  }
  if (location) {
    details.location = location;
  }
  if (context) {
    details.context = context;
  }
  if (errorDetails) {
    details.error = errorDetails;
  }

  // eslint-disable-next-line no-console
  console.error(`[kenstack:errorLog] ${name}`, details);
}
