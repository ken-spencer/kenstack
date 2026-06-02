import { and, eq, getTableColumns } from "drizzle-orm";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { deps } from "@app/deps";
import { pageWhere } from "@kenstack/admin/queries/page";
import type { AdminContentTable } from "@kenstack/admin/table";

const previewOrigin = "https://kenstack.local";

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

function isModulePath(pathname: string, basePath: string) {
  const path = normalizePath(pathname);
  const base = normalizePath(basePath);

  return base === "/" || path === base || path.startsWith(`${base}/`);
}

function getRedirectPath(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");

  if (!next) {
    return "/";
  }

  let url: URL;
  try {
    url = new URL(next, request.nextUrl.origin);
  } catch {
    return "/";
  }

  if (url.origin !== request.nextUrl.origin) {
    return "/";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function decodePreviewValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getPreviewSlug(nextUrl: URL, preview: string) {
  const [beforeSlug, afterSlug, ...extraParts] = preview.split("${slug}");
  if (beforeSlug === undefined || afterSlug === undefined || extraParts.length) {
    return null;
  }

  const target = preview.includes("?")
    ? `${nextUrl.pathname}${nextUrl.search}`
    : nextUrl.pathname;

  const matched = target.match(
    new RegExp(
      `^${RegExp.escape(beforeSlug)}([^/?#&]+)${RegExp.escape(afterSlug)}$`,
    ),
  );
  if (!matched) {
    return null;
  }

  return decodePreviewValue(matched[1] ?? "");
}

function isContentTable(table: unknown): table is AdminContentTable {
  return (
    typeof table === "object" &&
    table !== null &&
    "deletedAt" in table &&
    "visibility" in table &&
    "publishedAt" in table
  );
}

async function isPublicSlugRecord({
  table,
  slug,
}: {
  table: AdminContentTable;
  slug: string;
}) {
  const slugColumn = getTableColumns(table).slug;
  if (!slugColumn) {
    return false;
  }

  const [row] = await deps.db
    .select({ id: table.id })
    .from(table)
    .where(and(await pageWhere(table), eq(slugColumn, slug)))
    .limit(1);

  return !!row;
}

async function getDisableDraftRedirect(next: string) {
  const nextUrl = new URL(next, previewOrigin);

  for (const moduleConfig of Object.values(deps.modules)) {
    const adminConfig = moduleConfig.admin;
    const { basePath } = moduleConfig;
    if (
      !adminConfig?.preview ||
      !isContentTable(adminConfig.table) ||
      !isModulePath(nextUrl.pathname, basePath)
    ) {
      continue;
    }

    const slug = getPreviewSlug(nextUrl, adminConfig.preview);
    if (!slug) {
      const onBasePath = normalizePath(nextUrl.pathname) === normalizePath(basePath);

      return onBasePath && (!adminConfig.preview.includes("?") || !nextUrl.search)
        ? next
        : basePath;
    }

    return (await isPublicSlugRecord({
      table: adminConfig.table,
      slug,
    }))
      ? next
      : basePath;
  }

  return next;
}

export async function enableDraftModeAction(request: NextRequest) {
  await deps.auth.requireUser("admin");
  (await draftMode()).enable();
  return redirect(getRedirectPath(request));
}

export async function disableDraftModeAction(
  request: NextRequest,
) {
  const next = getRedirectPath(request);
  const redirectPath = await getDisableDraftRedirect(next);

  (await draftMode()).disable();
  return redirect(redirectPath);
}
