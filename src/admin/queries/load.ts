import { eq, getTableColumns } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { deps } from "@app/deps";
import type {
  AnyAdminConfig,
  ModuleParentOptions,
} from "@kenstack/admin/module";
import { loadRecord } from "@kenstack/fields/records";

type AdminLoadTarget = number | "single";

export type AdminEditItem = {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  parentId?: number;
} & Record<string, unknown>;

export function adminLoadCacheTag(name: string, target: AdminLoadTarget) {
  return `admin-load:${name}:${target}`;
}

export async function loadAdminEdit({
  adminConfig,
  id,
  isNew,
  moduleParent,
  name,
}: {
  adminConfig: AnyAdminConfig;
  id?: number;
  isNew: boolean;
  moduleParent?: ModuleParentOptions;
  name: string;
}) {
  if (isNew) {
    return null;
  }

  const target = "list" in adminConfig ? id : "single";

  if (!target) {
    return null;
  }

  return loadCachedAdminRecord(name, target, moduleParent?.foreignKey);
}

async function loadCachedAdminRecord(
  name: string,
  target: AdminLoadTarget,
  parentForeignKey?: string,
): Promise<AdminEditItem | null> {
  "use cache";
  cacheLife("max");
  cacheTag(adminLoadCacheTag(name, target), name);

  const adminConfig = deps.modules[name]?.admin;

  if (!adminConfig) {
    return null;
  }

  if ("list" in adminConfig) {
    if (target === "single") {
      return null;
    }

    const parentColumn = parentForeignKey
      ? getTableColumns(adminConfig.table)[parentForeignKey]
      : undefined;

    const result = await loadRecord({
      table: adminConfig.table,
      fields: adminConfig.fields,
      defaults: adminConfig.defaultValues,
      id: target,
      select: parentColumn ? { parentId: parentColumn } : undefined,
    });

    return result.row ? serializeAdminEditItem(result.values) : null;
  }

  const result = await loadRecord({
    table: adminConfig.table,
    fields: adminConfig.fields,
    defaults: adminConfig.defaultValues,
    where: eq(adminConfig.table.key, name),
  });

  return result.row ? serializeAdminEditItem(result.values) : null;
}

function serializeAdminEditItem(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, serializeValue(value)]),
  ) as AdminEditItem;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeValue(item)]),
    );
  }

  return value;
}
