import { eq, getTableColumns } from "drizzle-orm";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { modules } from "@app/modules";
import { requireUser } from "@kenstack/auth/server/user";
import type { AdminContentTable } from "@kenstack/admin/table";
import { pageQuery, resolveVisiblePage } from "@kenstack/db/queries/page";

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
  if (
    beforeSlug === undefined ||
    afterSlug === undefined ||
    extraParts.length
  ) {
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

async function getDisableDraftRedirect(next: string) {
  const nextUrl = new URL(next, previewOrigin);

  for (const moduleConfig of Object.values(modules)) {
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
      const onBasePath =
        normalizePath(nextUrl.pathname) === normalizePath(basePath);

      return onBasePath &&
        (!adminConfig.preview.includes("?") || !nextUrl.search)
        ? next
        : basePath;
    }

    const slugColumn = getTableColumns(adminConfig.table).slug;
    if (!slugColumn) {
      return basePath;
    }

    return (await resolveVisiblePage(
      await pageQuery(adminConfig.table, {
        select: { id: adminConfig.table.id },
        where: eq(slugColumn, slug),
      }),
      { draft: false },
    ))
      ? next
      : basePath;
  }

  return next;
}

export async function enableDraftModeAction(request: NextRequest) {
  await requireUser("admin");
  (await draftMode()).enable();
  return redirect(getRedirectPath(request));
}

export async function disableDraftModeAction(request: NextRequest) {
  const next = getRedirectPath(request);
  const redirectPath = await getDisableDraftRedirect(next);

  (await draftMode()).disable();
  return redirect(redirectPath);
}
