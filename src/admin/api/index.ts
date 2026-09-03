/*
 * Public entry point: the admin route-handler API for host applications.
 * Export only supported host-facing APIs. Kenstack code imports non-public
 * implementation from its canonical files, not through this entry point.
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { modules } from "@app/modules";
import { pipeline } from "@kenstack/api";
import { hasRole } from "@kenstack/auth/server/auth";
import { content } from "@kenstack/db/tables/content";
import { isRecord } from "@kenstack/lib/isRecord";

import {
  disableDraftModeAction,
  enableDraftModeAction,
} from "@kenstack/admin/api/draftMode";
import { listAction } from "@kenstack/admin/api/list";
import { neighborsAction } from "@kenstack/admin/api/neighbors";
import { saveAction } from "@kenstack/admin/api/save";
import { removeAction } from "@kenstack/admin/api/remove";
import { reorderAction } from "@kenstack/admin/api/reorder";
import { revisionsAction } from "@kenstack/admin/api/revisions";
import { tagsAction } from "@kenstack/admin/api/tags";
import { relationshipSearchAction } from "@kenstack/admin/api/relationshipSearch";
import { loadOneToOneAction } from "@kenstack/admin/api/loadOneToOne";
import { getPresignedUrlAction } from "./presignedUrl";
import { uploadCompleteAction } from "./uploadComplete";
import { impersonateAction } from "./impersonate";
import { pageEditAction } from "@kenstack/admin/pageEditor/api";
import { pageEditorServerFields } from "@kenstack/admin/pageEditor/serverFields";
import {
  loadModuleSettingsAction,
  saveModuleSettingsAction,
} from "./moduleSettings";

import { type FetchError } from "@kenstack/api/fetcher";

const runAdminGet = async (request: NextRequest) => {
  const action = request.nextUrl.searchParams.get("action");

  switch (action) {
    case "enable-draft":
      return enableDraftModeAction(request);
    case "disable-draft":
      return disableDraftModeAction(request);
  }

  return NextResponse.json(
    {
      status: "error",
      message: `Unknown action ${action}`,
    } satisfies FetchError,
    { status: 404 },
  );
};

const runAdminPipeline = async (request: NextRequest) => {
  if (!(await hasRole("admin"))) {
    return NextResponse.json({ redirect: "/login" });
  }

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

  let rawJson: unknown;
  try {
    rawJson = await request.json();
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid request. There was a problem parsing the JSON.",
      } satisfies FetchError,
      { status: 400 },
    );
  }

  if (!isRecord(rawJson)) {
    return NextResponse.json(
      {
        status: "error",
        message: "Invalid JSON. A plain object is expected.",
      } satisfies FetchError,
      { status: 400 },
    );
  }

  const { action, name, ...json } = rawJson;

  switch (action) {
    case "page-editor":
      return pipeline({ request, json }, pageEditAction());
    case "page-editor-get-presigned-url":
      return pipeline(
        { request, json },
        getPresignedUrlAction({
          table: content,
          fields: pageEditorServerFields,
        }),
      );
    case "page-editor-upload-complete":
      return pipeline(
        { request, json },
        uploadCompleteAction({
          table: content,
          fields: pageEditorServerFields,
        }),
      );
  }

  const moduleConfig = typeof name === "string" ? modules[name] : undefined;
  if (!moduleConfig) {
    return NextResponse.json({
      status: "error",
      message: `Unknown module name "${name}"`,
    });
  }

  switch (action) {
    case "load-module-settings": {
      if (!moduleConfig.settings) {
        return NextResponse.json({
          status: "error",
          message: `Module "${name}" does not have settings.`,
        });
      }

      return pipeline(
        { request, json },
        loadModuleSettingsAction(moduleConfig),
      );
    }
    case "save-module-settings": {
      if (!moduleConfig.settings) {
        return NextResponse.json({
          status: "error",
          message: `Module "${name}" does not have settings.`,
        });
      }

      return pipeline(
        { request, json },
        saveModuleSettingsAction(moduleConfig),
      );
    }
  }

  const adminConfig = moduleConfig.admin;
  if (!adminConfig) {
    return NextResponse.json({
      status: "error",
      message: `Module "${name}" does not have admin records.`,
    });
  }
  const adminModuleConfig = { ...moduleConfig, admin: adminConfig };

  switch (action) {
    case "load-one-to-one":
      return pipeline({ request, json }, loadOneToOneAction(adminModuleConfig));
    case "list":
      return pipeline({ request, json }, listAction(adminModuleConfig));
    case "neighbors":
      return pipeline({ request, json }, neighborsAction(adminModuleConfig));
    case "save":
      return pipeline({ request, json }, saveAction(adminModuleConfig));
    case "remove":
      return pipeline({ request, json }, removeAction(adminModuleConfig));
    case "reorder":
      return pipeline({ request, json }, reorderAction(adminModuleConfig));
    case "revisions":
      return pipeline({ request, json }, revisionsAction(adminConfig));
    case "get-presigned-url":
      return pipeline({ request, json }, getPresignedUrlAction(adminConfig));
    case "upload-complete":
      return pipeline({ request, json }, uploadCompleteAction(adminConfig));
    case "impersonate":
      return pipeline({ request, json }, impersonateAction());
    case "tags":
      return pipeline({ request, json }, tagsAction(adminConfig));
    case "relationship-search":
      return pipeline(
        { request, json },
        relationshipSearchAction(adminModuleConfig, Object.values(modules)),
      );
  }

  return NextResponse.json({
    status: "error",
    message: `Unknown action ${action}`,
  });
};

export const adminPipeline = () => ({
  GET: (request: NextRequest) => runAdminGet(request),
  POST: (request: NextRequest) => runAdminPipeline(request),
});
