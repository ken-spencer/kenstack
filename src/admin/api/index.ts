import { NextRequest, NextResponse } from "next/server";
import isPlainObject from "lodash-es/isPlainObject";

import { deps } from "@app/deps";
import { pipeline } from "@kenstack/api";

import { listAction } from "@kenstack/admin/api/list";
import { loadAction } from "@kenstack/admin/api/load";
import { saveAction } from "@kenstack/admin/api/save";
import { removeAction } from "@kenstack/admin/api/remove";
import { revisionsAction } from "@kenstack/admin/api/revisions";
import { tagsAction } from "@kenstack/admin/api/tags";
import { relationshipSearchAction } from "@kenstack/admin/api/relationshipSearch";
import { getPresignedUrlAction } from "./presignedUrl";
import { uploadCompleteAction } from "./uploadComplete";
import { impersonateAction } from "./impersonate";
import { pageEditorPipeline } from "@kenstack/pageEditor/api";

import { type AdminDefinition } from "@kenstack/admin";
import { type FetchError } from "@kenstack/api/fetcher";

type Options = { admin: AdminDefinition };

export const adminPipeline = async (
  request: NextRequest,
  context: Record<string, unknown>,
  options: Options,
) => {
  if (!(await deps.auth.hasRole("admin"))) {
    return NextResponse.json({ redirect: "/login" });
  }
  // await deps.auth.revalidate();

  const { admin } = options;
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

  if (action === "page-editor") {
    return pageEditorPipeline({ request, json });
  }

  const adminConfig = admin.modules[name];
  if (!adminConfig) {
    return NextResponse.json({
      status: "error",
      message: `Unknown admin config name "${name}"`,
    });
  }

  const stage = (() => {
    switch (action) {
      case "list":
        return listAction(adminConfig);
      case "load":
        return loadAction(adminConfig);
      case "save":
        return saveAction(adminConfig);
      case "remove":
        return removeAction(adminConfig);
      case "revisions":
        return revisionsAction(adminConfig);
      case "get-presigned-url":
        return getPresignedUrlAction(adminConfig);
      case "upload-complete":
        return uploadCompleteAction(adminConfig);
      case "impersonate":
        return impersonateAction();
      case "tags":
        return tagsAction(adminConfig);
      case "relationship-search":
        return relationshipSearchAction(adminConfig);
    }
  })();

  if (!stage) {
    return NextResponse.json({
      status: "error",
      message: `Unknown action ${action}`,
    });
  }

  return pipeline({ request, json }, [stage]);
};
