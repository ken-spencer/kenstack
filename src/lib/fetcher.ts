"use client";

// type ReservedKeys = "status" | "message" | "fieldErrors" | "success" | "error";
// type WithoutReserved<T extends Record<string, unknown>> = Omit<T, ReservedKeys>;

export type FetchSuccess<T extends Record<string, unknown>> = {
  status: "success";
  message?: string;
} & T;

export type FetchError = {
  status: "error";
  message?: string;
  fieldErrors?: Record<string, string | string[]>;
};

export type FetchResult<
  TExtra extends Record<string, unknown> = Record<string, unknown>
> = FetchSuccess<TExtra> | FetchError;

export default async function fetcher<TExtra extends Record<string, unknown>>(
  path: RequestInfo,
  data: Record<string, unknown> | null = null,
  options: RequestInit = {}
): Promise<FetchResult<TExtra>> {
  const { headers = {}, method, cache = "no-store", ...rest } = options;
  const isPost = data !== null;

  const body = isPost ? JSON.stringify(data) : undefined;
  if (isPost) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    method: method ?? (isPost ? "POST" : "GET"),
    cache,
    headers,
    ...rest,
    body,
  });

  if (!response.ok) {
    try {
      return await response.json();
    } catch {
      /* not JSON, ignore */
    }
    const err = new Error(
      `Server error: ${response.status} ${response.statusText}`
    );
    // err.status = response.status;
    throw err;
  }

  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON, got ${ct}`);
  }

  const json = await response.json();

  if (json.redirect) {
    window.location.href = json.redirect as string;
  }
  return json;
}
