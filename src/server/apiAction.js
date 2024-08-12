import "server-only";

import { isRedirectError } from "next/dist/client/components/redirect";

import { NextResponse } from "next/server";
import defaultError from "@admin/defaultError";

import Session from "@admin/server/Session";

export default async function apiAction(
  action,
  request,
  { roles = [], session, ...props } = {},
) {
  const contentType = request.headers.get("content-type");

  let data;
  if (contentType === "application/json") {
    data = await request.json();
  } else if (contentType.startsWith("multipart/form-data")) {
    data = await request.formData();

    const jsonString = data.get("_api_props");
    if (jsonString) {
      const json = JSON.parse(jsonString);
      props = {...json, ...props};
      data.delete("_api_props");
    }

  }

  const meta = {
    href: request.nextUrl.href,
    referer: request.headers.get("referer"),
    geo: request.geo,
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

  let retval;
  try {
    retval = await action(data, {
      ...props,
      session,
      request,
      response,
      logMeta: meta,
    });
  } catch (e) {
    // make sure redirects still work.
    if (isRedirectError(e)) {
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
