import { NextResponse } from "next/server";

import { hasRole, revalidate } from "@kenstack/lib/auth";

import merge from "lodash-es/merge";

import list from "@kenstack/admin/api/list";
import load from "@kenstack/admin/api/load";
import tags from "@kenstack/admin/api/tags";
import save from "@kenstack/admin/api/save";
import remove from "@kenstack/admin/api/remove";
import presignImage from "@kenstack/admin/api/presignedCloudinaryUrl";

import { type ServerConfig } from "@kenstack/admin/types";
type Options = { serverConfig: ServerConfig };

export const adminPipeline = async (
  request: Request,
  context,
  options: Options
) => {
  if (!(await hasRole("ADMIN"))) {
    return NextResponse.json({ redirect: "/login" });
  }
  await revalidate();

  const { params } = context;
  const { serverConfig } = options;
  const { type, action } = await params;

  const [, base, overrides] = serverConfig.find(([t]) => t === type) || [];
  if (!base) {
    return NextResponse.json({
      status: "error",
      message: `Unknown module ${type}`,
    });
  }

  const adminConfig = merge({}, base, overrides);

  const input: [Request, typeof adminConfig] = [
    request,
    // context,
    adminConfig,
  ];

  switch (action) {
    case "list":
      return list(...input);
    case "load":
      return load(...input);
    case "save":
      return save(...input);
    case "remove":
      return remove(...input);
    case "get-presigned-url":
      return presignImage(...input);
    case "tags":
      return tags(...input);
  }
  return NextResponse.json({
    status: "error",
    message: `Unknown action ${action}`,
  });
};
