import getIp from "@kenstack/lib/ip";
import { geolocation } from "@vercel/functions";
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
  let errorDetails;
  if (error instanceof Error) {
    errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack?.split("\n").slice(1, 6).join("\n"),
    };
  } else if (error !== undefined) {
    errorDetails = { type: typeof error };
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
