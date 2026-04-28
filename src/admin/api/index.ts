import { NextRequest, NextResponse } from "next/server";
import isPlainObject from "lodash-es/isPlainObject";

import { deps } from "@app/deps";

// import merge from "lodash-es/merge";

import list from "@kenstack/admin/api/list";
import load from "@kenstack/admin/api/load";
import save from "@kenstack/admin/api/save";
import remove from "@kenstack/admin/api/remove";
// import presignImage from "@kenstack/admin/api/presignedCloudinaryUrl";
import tags from "@kenstack/admin/api/tags";

import { type AdminConfig } from "@kenstack/admin";
import { type FetchError } from "@kenstack/lib/fetcher";

type Options = { adminConfig: AdminConfig };

export const adminPipeline = async (
  request: NextRequest,
  context: Record<string, unknown>,
  options: Options,
) => {
  if (!(await deps.auth.hasRole("admin"))) {
    return NextResponse.json({ redirect: "/login" });
  }
  // await deps.auth.revalidate();

  const { adminConfig } = options;
  // const { type, action } = await params;

  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("application/json")) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid request. Only JSON is accepted.",
      } satisfies FetchError,
      { status: 415 },
    );
  }

  const rawJson = await request.json();
  if (!isPlainObject(rawJson)) {
    return NextResponse.json(
      {
        status: "error",
        message: `Invalid JSON a plain object is expected`,
      } satisfies FetchError,
      { status: 400 },
    );
  }

  const { action, name, ...json } = rawJson;

  const [, base /*overrides*/] = adminConfig.find(([t]) => t === name) || [];
  if (!base) {
    return NextResponse.json({
      status: "error",
      message: `Unknown admin table name "${name}"`,
    });
  }

  // const input: [Request, typeof adminConfig] = [
  //   request,
  //   merge({}, base, overrides),
  // ];
  const input = {
    request,
    json,
    adminTable: base, //merge({}, base, overrides),
  };

  switch (action) {
    case "list":
      return list(input);
    case "load":
      return load(input);
    case "save":
      return save(input);
    case "remove":
      return remove(input);
    // case "get-presigned-url":
    //   return presignImage(...input);
    case "tags":
      return tags(input);
  }
  return NextResponse.json({
    status: "error",
    message: `Unknown action ${action}`,
  });
};
