"use client";

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

export type FetchResult<TExtra extends Record<string, unknown> = {}> =
  | FetchSuccess<TExtra>
  | FetchError;

export default async function fetcher<
  TExtra extends Record<string, unknown> = {},
>(
  path: RequestInfo,
  data: Record<string, unknown> | null = null,
  options: RequestInit = {}
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
    return {
      status: "error",
      message: `There was an unexpected problem with your request. ${message}`,
    } satisfies FetchError;
  }

  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    if (response.status === 404) {
      return {
        status: "error",
        message: `We were unable to find the requested resource.`,
      } satisfies FetchError;
    }
    return {
      status: "error",
      message: `There was an unexpected problem with your request. Server error: ${response.status} ${response.statusText}`,
    } satisfies FetchError;
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    return {
      status: "error",
      message: `There was an unexpected problem with the response from the server: ${message}`,
    } satisfies FetchError;
  }

  if (
    typeof json !== "object" ||
    json === null ||
    (json.status !== "success" && json.status !== "error") ||
    (response.ok === false && json.status !== "error")
  ) {
    return {
      status: "error",
      message: "The response from the server was invalid",
    } satisfies FetchError;
  }

  if (json.redirect) {
    window.location.href = json.redirect as string;
    return { status: "error" } satisfies FetchError;
  }
  return json;
}
