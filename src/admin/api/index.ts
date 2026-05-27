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
import { pageEditAction } from "@kenstack/admin/pageEditor/api";
import { pageEditorServerFields } from "@kenstack/admin/pageEditor/serverFields";
import {
  loadModuleSettingsAction,
  saveModuleSettingsAction,
} from "./moduleSettings";

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

  switch (action) {
    case "page-editor":
      return pipeline({ request, json }, [pageEditAction()]);
    case "page-editor-get-presigned-url":
      return pipeline({ request, json }, [
        getPresignedUrlAction({
          table: deps.tables.content,
          fields: pageEditorServerFields,
        }),
      ]);
    case "page-editor-upload-complete":
      return pipeline({ request, json }, [
        uploadCompleteAction({
          table: deps.tables.content,
          fields: pageEditorServerFields,
        }),
      ]);
  }

  const moduleConfig = admin[name];
  if (!moduleConfig) {
    return NextResponse.json({
      status: "error",
      message: `Unknown module name "${name}"`,
    });
  }

  switch (action) {
    case "load-module-settings":
      if (!moduleConfig.settings) {
        return NextResponse.json({
          status: "error",
          message: `Module "${name}" does not have settings.`,
        });
      }

      return pipeline({ request, json }, [
        loadModuleSettingsAction(name, moduleConfig.settings),
      ]);
    case "save-module-settings":
      if (!moduleConfig.settings) {
        return NextResponse.json({
          status: "error",
          message: `Module "${name}" does not have settings.`,
        });
      }

      return pipeline({ request, json }, [
        saveModuleSettingsAction(name, moduleConfig.settings),
      ]);
  }

  if (!moduleConfig.records) {
    return NextResponse.json({
      status: "error",
      message: `Module "${name}" does not have admin records.`,
    });
  }

  switch (action) {
    case "list":
      if (moduleConfig.single === true) {
        return NextResponse.json({
          status: "error",
          message: "This admin config is not listable.",
        });
      }

      return pipeline({ request, json }, [listAction(moduleConfig)]);
    case "load":
      return pipeline({ request, json }, [loadAction(name, moduleConfig)]);
    case "save":
      return pipeline({ request, json }, [saveAction(name, moduleConfig)]);
    case "remove":
      return pipeline({ request, json }, [removeAction(moduleConfig)]);
    case "revisions":
      return pipeline({ request, json }, [revisionsAction(moduleConfig)]);
    case "get-presigned-url":
      return pipeline({ request, json }, [getPresignedUrlAction(moduleConfig)]);
    case "upload-complete":
      return pipeline({ request, json }, [uploadCompleteAction(moduleConfig)]);
    case "impersonate":
      return pipeline({ request, json }, [impersonateAction()]);
    case "tags":
      return pipeline({ request, json }, [tagsAction(moduleConfig)]);
    case "relationship-search":
      return pipeline({ request, json }, [
        relationshipSearchAction(moduleConfig),
      ]);
  }

  return NextResponse.json({
    status: "error",
    message: `Unknown action ${action}`,
  });
};
