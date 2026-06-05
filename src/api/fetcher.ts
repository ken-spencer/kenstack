"use client";

import { UserFacingError } from "./errors";

// type ReservedKeys = "status" | "message" | "fieldErrors" | "success" | "error";
// type WithoutReserved<T extends Record<string, unknown>> = Omit<T, ReservedKeys>;

export type FetchSuccess<T extends Record<string, unknown>> = {
  status: "success";
  message?: string;
  redirect?: string;
} & T;

export type FetchError = {
  status: "error";
  message?: string;
  fieldErrors?: Record<string, string | string[]>;
  redirect?: string;
};

export type FetchResult<
  TExtra extends Record<string, unknown> = Record<string, never>,
> = FetchSuccess<TExtra> | FetchError;

export default async function fetcher<
  TExtra extends Record<string, unknown> = Record<string, never>,
>(
  path: RequestInfo,
  data: Record<string, unknown> | null = null,
  options: RequestInit = {},
): Promise<FetchResult<TExtra>> {
  const { headers: initHeaders, method, cache = "no-store", ...rest } = options;
  const headers = new Headers(initHeaders);
  const isPost = data !== null;

  const body = isPost ? JSON.stringify(data) : undefined;
  if (isPost && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(path, {
      method: method ?? (isPost ? "POST" : "GET"),
      cache,
      headers,
      ...rest,
      body,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    throw UserFacingError(
      `There was an unexpected problem with your request. ${message}`,
    );
  }

  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    if (response.status === 404) {
      throw UserFacingError("We were unable to find the requested resource.");
    }
    throw UserFacingError(
      `There was an unexpected problem with your request. Server error: ${response.status} ${response.statusText}`,
    );
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    throw UserFacingError(
      `There was an unexpected problem with the response from the server: ${message}`,
    );
  }

  if (
    typeof json !== "object" ||
    json === null ||
    (json.status !== "success" && json.status !== "error") ||
    (response.ok === false && json.status !== "error")
  ) {
    throw UserFacingError("The response from the server was invalid");
  }

  if (json.status === "error" && response.status >= 500) {
    throw UserFacingError(
      typeof json.message === "string"
        ? json.message
        : "There was an unexpected problem with your request.",
      { status: response.status },
    );
  }

  if (json.redirect) {
    window.location.href = json.redirect as string;
    return { status: "error" } satisfies FetchError;
  }
  return json;
}
