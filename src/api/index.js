import { NextResponse } from "next/server";
import { geolocation } from "@vercel/functions";

import defaultError from "@kenstack/defaultError";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export { default as authenticate } from "./authenticate";
export { default as recaptcha } from "./recaptcha";
export { default as validate } from "./validate";
export { default as loader } from "./loader";

export async function apiPipeline(request, arg, actions = [], options = {}) {
  const contentType = request.headers.get("content-type");

  if (!contentType?.startsWith("application/json")) {
    return Response.json({ error: "Invalid request. Only JSON is accepted." });
  }

  const res = new NextResponse();
  let context = {
    ...options,
    request,
    data: await request.json(),
    cookies: res.cookies,
    headers: res.headers,
  };

  if (context.data._api_props) {
    context = { ...context.data._api_props, ...context };
    delete context.data._api_props;
  }

  const meta = {
    href: request.nextUrl.href,
    referer: request.headers.get("referer"),
    geo: geolocation(request),
    ip: request.ip || "127.0.0.1",
  };

  for (const [key, action] of actions.entries()) {
    let result;
    try {
      result = await action(context);
    } catch (e) {
      if (isRedirectError(e)) {
        throw e;
      }

      // eslint-disable-next-line no-console
      console.error(`Fatal Error on apiPipleine key ${key}`, meta, e);
      return Response.json(defaultError);
    }

    // if a result is returned exit early
    if (result instanceof Response || result instanceof NextResponse) {
      // Brings forward cookies and headers set earlier via context
      for (const [name, value] of context.headers) {
        if (!result.headers.get(name)) {
          result.headers.set(name, value);
        }
      }

      return result;
    }

    if (typeof result === "object") {
      context = { ...context, ...result };
    }
  }

  return Response.json({ error: "No response received from pipeline" });
}
