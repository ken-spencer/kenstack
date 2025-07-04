import "server-only";
import { geolocation } from "@vercel/functions";

import { NextResponse } from "next/server";
import defaultError from "@kenstack/defaultError";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import Session from "@kenstack/server/Session";

export default async function apiAction(
  actionData, // function or Map of actions
  request,
  { roles = [], session, middleware, ...props } = {}
) {
  const contentType = request.headers.get("content-type");

  let data;
  if (contentType === "application/json") {
    data = await request.json();
    if (data._api_props) {
      props = { ...data._api_props, ...props };
      delete data._api_props;
    }
  } else if (contentType.startsWith("multipart/form-data")) {
    data = await request.formData();

    const jsonString = data.get("_api_props");
    if (jsonString) {
      const json = JSON.parse(jsonString);
      props = { ...json, ...props };
      data.delete("_api_props");
    }
  }

  const meta = {
    href: request.nextUrl.href,
    referer: request.headers.get("referer"),
    geo: geolocation(request),
    ip: request.ip || "127.0.0.1",
  };

  const response = new NextResponse();

  if (!roles.includes("ANONYMOUS")) {
    if (!(session instanceof Session)) {
      throw Error("a valid session must be specified");
    }

    const hasRole = await session.hasRole(...roles);
    if (hasRole !== true) {
      return NextResponse.json({ redirect: session.loginPath });
    }

    await session.revalidate(response);
  }

  const options = {
    ...props,
    roles,
    session,
    request,
    response,
    logMeta: meta,
  };

  let retval;
  if (middleware) {
    try {
      retval = await middleware(data, options);
    } catch (e) {
      // make sure redirects still work.
      if (isRedirectError(e)) {
        throw e;
      }

      // eslint-disable-next-line no-console
      console.error("Fatal Error: ", meta, e);
      return NextResponse.json(defaultError);
    }

    if (retval) {
      if (retval instanceof NextResponse) {
        return retval;
      }

      return NextResponse.json(retval, response);
    }
  }

  let action;
  if (actionData instanceof Map) {
    const name = request.headers.get("x-action");
    action = actionData.get(name);
    if (!action) {
      throw Error("Unknown action: " + name);
    }
  } else {
    action = actionData;
  }

  try {
    retval = await action(data, options);
  } catch (e) {
    // make sure redirects still work.
    if (typeof e.digest === "string" && e.digest.startsWith("NEXT_REDIRECT")) {
      throw e;
    }

    // eslint-disable-next-line no-console
    console.error("Fatal Error: ", meta, e);
    return NextResponse.json(defaultError);
  }

  if (retval instanceof NextResponse) {
    return retval;
  }

  return NextResponse.json(retval, response);
}
