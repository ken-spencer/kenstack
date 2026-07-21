import type { Instrumentation } from "next";

const alertTtlSeconds = 15 * 60;

export type ErrorReportContext = {
  source: string;
  context?: Record<string, unknown>;
  request?: Request;
};

type ErrorReportRequest = {
  method?: string;
  path?: string | null;
  renderSource?: string;
  routePath?: string;
  routeType?: string;
  routerKind?: string;
};

type ErrorReportInput = ErrorReportContext & {
  emailFrom?: string | { name: string; addr: string };
};

export async function reportError(thrown: unknown, input: ErrorReportInput) {
  await reportErrorDetails(
    thrown,
    input,
    input.request
      ? {
          method: input.request.method,
          path: new URL(input.request.url).pathname,
        }
      : undefined,
  );
}

async function reportErrorDetails(
  thrown: unknown,
  input: ErrorReportInput,
  request: ErrorReportRequest | undefined,
) {
  try {
    await writeErrorReport(thrown, input, request);
  } catch (reporterError) {
    // The public reporter must never hide or replace the original failure.
    // eslint-disable-next-line no-console
    console.error("[kenstack:error] Reporter failed.", {
      error: getSafeErrorSummary(reporterError),
      originalError: getSafeErrorSummary(thrown),
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  await reportErrorDetails(
    error,
    { source: "next.onRequestError" },
    {
      method: request.method,
      path: request.path,
      renderSource: context.renderSource,
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
    },
  );
};

async function writeErrorReport(
  thrown: unknown,
  { emailFrom = process.env.FROM_ADDRESS, source, context }: ErrorReportInput,
  request: ErrorReportRequest | undefined,
) {
  const originalError = toError(thrown);
  const error = getRootError(originalError);
  const code = getErrorCode(error);
  const message = normalizeErrorMessage(error.message).slice(0, 2000);
  const pathname = getSafePathname(request?.path);
  const fingerprint = await createErrorFingerprint(error);
  const timestamp = new Date().toISOString();
  const stack =
    originalError.stack
      ?.split("\n")
      .slice(1, 9)
      .map(redactSensitiveText)
      .join("\n") ?? "";
  const project =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_PROJECT_ID ??
    "unknown-project";
  const environment =
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
  const event = {
    timestamp,
    project,
    environment,
    source,
    fingerprint,
    request: request ? { ...request, path: pathname } : undefined,
    context: sanitizeContext(context),
    error: {
      name: error.name,
      code,
      message,
      digest:
        "digest" in error && typeof error.digest === "string"
          ? error.digest
          : null,
      stack,
    },
  };

  // Permanent structured output for the hosting platform's server logs.
  // eslint-disable-next-line no-console
  console.error("[kenstack:error]", event);

  const monitoring = getMonitoringConfiguration();
  if (!monitoring || process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  if (!emailFrom) {
    // This must not recurse through the reporter.
    // eslint-disable-next-line no-console
    console.error(
      "[kenstack:error] Monitoring email sender is not configured; email suppressed.",
      { fingerprint },
    );
    return;
  }

  const projectKey =
    process.env.VERCEL_PROJECT_ID ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "unknown-project";
  const key = [
    "kenstack:error-alert:v1",
    projectKey,
    environment,
    fingerprint,
  ].join(":");

  let acquired;
  try {
    acquired = await claimErrorAlert(monitoring.redis, key);
  } catch (inhibitorError) {
    // This must not recurse through the reporter.
    // eslint-disable-next-line no-console
    console.error(
      "[kenstack:error] Alert inhibition failed; email suppressed.",
      {
        error: getSafeErrorSummary(inhibitorError),
        fingerprint,
      },
    );
    return;
  }

  if (!acquired) {
    return;
  }

  try {
    const { default: mailer } = await import("@kenstack/lib/mailer");
    const route = request?.routePath ?? pathname ?? "No route";
    const result = await mailer({
      to: monitoring.email,
      from: emailFrom,
      subject: `[${environment}] ${error.name}: ${message}`.slice(0, 180),
      html: [
        `<h1>Unexpected server error</h1>`,
        `<p><strong>Project:</strong> ${escapeHtml(project)}</p>`,
        `<p><strong>Environment:</strong> ${escapeHtml(environment)}</p>`,
        `<p><strong>Time:</strong> ${escapeHtml(timestamp)}</p>`,
        `<p><strong>Source:</strong> ${escapeHtml(source)}</p>`,
        `<p><strong>Route:</strong> ${escapeHtml(route)}</p>`,
        `<p><strong>Method:</strong> ${escapeHtml(request?.method ?? "Unknown")}</p>`,
        `<p><strong>Error:</strong> ${escapeHtml([error.name, code, message].filter(Boolean).join(" · "))}</p>`,
        `<p><strong>Fingerprint:</strong> ${fingerprint}</p>`,
        stack ? `<pre>${escapeHtml(stack)}</pre>` : "",
      ].join(""),
    });

    if (result === false) {
      // The mailer logs its own provider failure. This marker keeps the event
      // searchable without recursively reporting it.
      // eslint-disable-next-line no-console
      console.error("[kenstack:error] Monitoring email could not be sent.", {
        fingerprint,
      });
    }
  } catch (emailError) {
    // This must not recurse through the reporter.
    // eslint-disable-next-line no-console
    console.error("[kenstack:error] Monitoring email failed.", {
      error: getSafeErrorSummary(emailError),
      fingerprint,
    });
  }
}

export async function createErrorFingerprint(thrown: unknown) {
  const error = getRootError(toError(thrown));
  const input = [
    error.name,
    getErrorCode(error) ?? "",
    normalizeErrorMessage(error.message),
  ].join("\n");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function normalizeErrorMessage(message: string) {
  return (
    redactSensitiveText(message)
      .replace(/\b\d+\b/g, "<number>")
      .replace(/\s+/g, " ")
      .trim() || "Unknown error"
  );
}

export function getSafePathname(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const separator = path.search(/[?#]/);
  return separator === -1 ? path : path.slice(0, separator);
}

export async function claimErrorAlert(
  redis: { url: string; token: string },
  key: string,
) {
  const response = await fetch(redis.url.replace(/\/$/, ""), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redis.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", key, "1", "NX", "EX", alertTtlSeconds]),
    signal: AbortSignal.timeout(2000),
  });

  if (!response.ok) {
    throw new Error(`Upstash returned HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || !("result" in body)) {
    throw new Error("Upstash returned an invalid response");
  }

  if (body.result === "OK") {
    return true;
  }

  if (body.result === null) {
    return false;
  }

  throw new Error("Upstash returned an unexpected result");
}

function getMonitoringConfiguration() {
  const email = process.env.MONITORING_EMAIL?.trim();
  if (!email) {
    return null;
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (upstashUrl && upstashToken) {
    return { email, redis: { url: upstashUrl, token: upstashToken } };
  }

  const vercelUrl = process.env.KV_REST_API_URL?.trim();
  const vercelToken = process.env.KV_REST_API_TOKEN?.trim();
  if (vercelUrl && vercelToken) {
    return { email, redis: { url: vercelUrl, token: vercelToken } };
  }

  return null;
}

function toError(thrown: unknown) {
  if (thrown instanceof Error) {
    return thrown;
  }

  return new Error(typeof thrown === "string" ? thrown : String(thrown), {
    cause: thrown,
  });
}

function getSafeErrorSummary(thrown: unknown) {
  if (!(thrown instanceof Error)) {
    return { type: typeof thrown };
  }

  return {
    name: thrown.name,
    message: normalizeErrorMessage(thrown.message).slice(0, 2000),
  };
}

function sanitizeContext(context: Record<string, unknown> | undefined) {
  if (!context) {
    return undefined;
  }

  const sanitized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(context)) {
    if (
      /authorization|password|passwd|token|secret|api[-_]?key|access[-_]?key/i.test(
        key,
      )
    ) {
      sanitized[key] = "<redacted>";
    } else if (typeof value === "string") {
      sanitized[key] = redactSensitiveText(value).slice(0, 500);
    } else if (
      value === null ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    } else {
      sanitized[key] = "<omitted>";
    }
  }

  return sanitized;
}

function getRootError(error: Error) {
  const seen = new Set<unknown>();
  let root = error;

  while (root.cause instanceof Error && !seen.has(root.cause)) {
    seen.add(root);
    root = root.cause;
  }

  return root;
}

function getErrorCode(error: Error) {
  if (!("code" in error)) {
    return null;
  }

  const code = error.code;
  return typeof code === "string" || typeof code === "number"
    ? String(code)
    : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#039;";
    }
  });
}

function redactSensitiveText(value: string) {
  return value
    .replace(
      /\b(?:https?|postgres(?:ql)?|redis|rediss|mongodb(?:\+srv)?|mysql|mariadb|amqp|amqps|s3):\/\/\S+/gi,
      "<url>",
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "<email>")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "<ip>")
    .replace(
      /\bauthorization\s*[:=]\s*(?:(?:bearer|basic)\s+)?[^\s,;]+/gi,
      "authorization=<redacted>",
    )
    .replace(
      /\b(password|passwd|token|secret|api[_-]?key|(?:aws_)?secret_access_key|(?:aws_)?access_key_id)\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi,
      "$1=<redacted>",
    )
    .replace(/"[^"\r\n]*"|'[^'\r\n]*'|`[^`\r\n]*`/g, "<value>")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "<id>",
    )
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, "<time>");
}
