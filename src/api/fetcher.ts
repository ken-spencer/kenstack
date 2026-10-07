"use client";

import type { UserInfoResult } from "@kenstack/auth/api";
import {
  getRenderedAccount,
  renderedAccountHeader,
} from "@kenstack/auth/renderedAccount";

import { ReturnedError } from "./errors";
import { formatRecaptchaAction } from "./formatRecaptchaAction";

declare global {
  interface Window {
    // The reCAPTCHA v3 script's global. It has only `ready` until the script has loaded.
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute?: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

export type FetchSuccess<T extends Record<string, unknown>> = {
  status: "success";
  message?: string;
  redirect?: string;
  // This tab's own change to the user or session, from a server success with `returnUser`; Kenstack's
  // Form adopts it.
  userInfo?: UserInfoResult;
} & T;

export type FetchError = {
  status: "error";
  code?: string;
  details?: Record<string, unknown>;
  message?: string;
  debugMessage?: string;
  debugStack?: string;
  formErrors?: string[];
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
  options: RequestInit & {
    // Requests a reCAPTCHA token under this action name and sends it as `recaptchaToken`, for an API
    // stage with `recaptcha: true` in a pipeline of the same name.
    recaptchaAction?: string;
  } = {},
): Promise<FetchResult<TExtra>> {
  const {
    headers: initHeaders,
    method,
    cache = "no-store",
    recaptchaAction,
    ...rest
  } = options;
  const headers = new Headers(initHeaders);
  const isPost = data !== null;

  const renderedAccount = getRenderedAccount();
  if (typeof renderedAccount === "number") {
    headers.set(renderedAccountHeader, String(renderedAccount));
  }

  // Without a site key there is no token to send. The provider loads the script after the page, so a
  // request waits up to ten seconds for it; a blocked script sends none. The server ignores a token for
  // a signed-in visitor and refuses its absence for anyone else.
  let payload = data;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
  if (recaptchaAction && data && siteKey) {
    for (
      let waited = 0;
      !window.grecaptcha?.execute && waited < 10_000;
      waited += 100
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const { grecaptcha } = window;
    if (grecaptcha?.execute) {
      let recaptchaToken;
      try {
        await new Promise<void>((resolve) => grecaptcha.ready(resolve));
        recaptchaToken = await grecaptcha.execute(siteKey, {
          action: formatRecaptchaAction(recaptchaAction),
        });
      } catch (error) {
        throw Object.assign(
          new ReturnedError(
            "reCAPTCHA didn’t complete. Refresh the page and try again.",
          ),
          { cause: error },
        );
      }
      payload = { ...data, recaptchaToken };
    }
  }

  const body = isPost ? JSON.stringify(payload) : undefined;
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
    throw new ReturnedError(
      `There was an unexpected problem with your request. ${message}`,
    );
  }

  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    if (response.status === 404) {
      throw new ReturnedError("We were unable to find the requested resource.");
    }
    throw new ReturnedError(
      `There was an unexpected problem with your request. Server error: ${response.status} ${response.statusText}`,
    );
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    throw new ReturnedError(
      `There was an unexpected problem with the response from the server: ${message}`,
    );
  }

  if (
    typeof json !== "object" ||
    json === null ||
    (json.status !== "success" && json.status !== "error") ||
    (response.ok === false && json.status !== "error")
  ) {
    throw new ReturnedError("The response from the server was invalid");
  }

  if (json.status === "error" && response.status >= 500) {
    const error = new ReturnedError(
      typeof json.message === "string"
        ? json.message
        : "There was an unexpected problem with your request.",
      { status: response.status },
    );
    if (typeof json.debugMessage === "string") {
      const cause = new Error(json.debugMessage);
      if (typeof json.debugStack === "string") {
        cause.stack = json.debugStack;
      }
      error.cause = cause;
    }
    throw error;
  }

  if (json.redirect) {
    window.location.href = json.redirect as string;
    return { status: "error" } satisfies FetchError;
  }
  return json;
}
