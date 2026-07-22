import { deps } from "@app/deps";
import type { NextRequest } from "next/server";
import * as z from "zod";

import type { PipelineResponse } from "./PipelineResponse";

const schema = z.object({
  action: z.string().optional(),
  "error-codes": z.array(z.string().toLowerCase()).default([]),
  hostname: z.string().optional(),
  score: z.number().optional(),
  success: z.boolean(),
});

export default async function recaptcha({
  action,
  request,
  response,
  threshold = 0.5,
  token,
}: {
  action?: string;
  request: NextRequest;
  response: PipelineResponse;
  threshold?: number;
  token?: string;
}) {
  if (await deps.auth.getCurrentUser()) {
    /** Skip recaptcha if logged in */
    return;
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  const secretKey = process.env.RECAPTCHA_SECRET_KEY?.trim();

  if (!siteKey && !secretKey) {
    return;
  }

  if (!siteKey || !secretKey) {
    await deps.error(
      !siteKey
        ? "NEXT_PUBLIC_RECAPTCHA_SITE_KEY is required for recaptcha"
        : "RECAPTCHA_SECRET_KEY environment variable is not set",
      { request },
    );
    return;
  }

  if (!token) {
    return response.error(
      "reCAPTCHA didn’t complete. Refresh the page and try again.",
    );
  }

  let res;
  try {
    res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    await deps.error(
      `Recaptcha verification request failed: ${String(error)}`,
      { request },
    );
    return;
  }

  if (!res.ok) {
    await deps.error(`Recaptcha verification returned HTTP ${res.status}`, {
      request,
    });
    return;
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (error) {
    await deps.error(
      `Recaptcha verification returned invalid JSON: ${String(error)}`,
      { request },
    );
    return;
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    await deps.error(
      `Recaptcha returned an invalid response: ${parsed.error.message}`,
      { request },
    );
    return;
  }

  const { data } = parsed;

  if (
    data["error-codes"].some((code) => code.startsWith("over free quota")) ||
    data["error-codes"].includes("missing-input-secret") ||
    data["error-codes"].includes("invalid-input-secret") ||
    data["error-codes"].includes("bad-request")
  ) {
    await deps.error(
      `Recaptcha assessment unavailable: ${data["error-codes"].join(", ")}`,
      { request },
    );
    return;
  }

  if (
    (!data.success && data["error-codes"].length === 0) ||
    data["error-codes"].some(
      (code) =>
        code !== "browser-error" &&
        code !== "missing-input-response" &&
        code !== "invalid-input-response" &&
        code !== "timeout-or-duplicate",
    )
  ) {
    await deps.error(
      `Recaptcha returned an unrecognized assessment result: ${data["error-codes"].join(", ") || "no error code"}`,
      { request },
    );
    return;
  }

  if (data["error-codes"].includes("browser-error")) {
    return;
  }

  if (data.success && data.score === undefined) {
    await deps.error(
      "Recaptcha returned a successful response without a score",
      { request },
    );
    return;
  }

  if (
    !data.success ||
    (data.score ?? 0) < threshold ||
    (action && data.action !== action)
  ) {
    // eslint-disable-next-line no-console -- Expected reCAPTCHA rejection with sanitized diagnostics for integration support.
    console.error(
      `Recaptcha verification failed: ${data["error-codes"].join(", ") || "assessment rejected"}`,
      {
        action,
        hostname: data.hostname,
        receivedAction: data.action,
        score: data.score,
        success: data.success,
        threshold,
      },
    );

    if (data["error-codes"].includes("timeout-or-duplicate")) {
      return response.error(
        "This reCAPTCHA check expired or was already used. Try again.",
      );
    }

    return response.error("reCAPTCHA couldn’t verify your request. Try again.");
  }
}
