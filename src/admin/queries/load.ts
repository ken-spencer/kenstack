import { eq, getTableColumns } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { modules } from "@app/modules";
import type {
  AnyAdminConfig,
  ModuleParentOptions,
} from "@kenstack/admin/module";
import { loadRecord } from "@kenstack/records";
import { serializeValues } from "./serialize";

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

  const adminConfig = modules[name]?.admin;

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
      select: {
        ...(adminConfig.select ?? {}),
        ...(parentColumn ? { parentId: parentColumn } : {}),
      },
    });

    // loadRecord always selects identity and timestamps, which serializeValues preserves by key.
    return result.row
      ? (serializeValues(result.values) as AdminEditItem)
      : null;
  }

  const result = await loadRecord({
    table: adminConfig.table,
    fields: adminConfig.fields,
    defaults: adminConfig.defaultValues,
    select: adminConfig.select,
    where: eq(adminConfig.table.key, name),
  });

  // loadRecord always selects identity and timestamps, which serializeValues preserves by key.
  return result.row ? (serializeValues(result.values) as AdminEditItem) : null;
}

// Loads one configured relation separately so relation panels do not expand the parent query.
export async function loadOneToOne({
  name,
  parentId,
  relationKey,
}: {
  name: string;
  parentId: number;
  relationKey: string;
}) {
  "use cache";
  cacheLife("max");
  cacheTag(name, adminLoadCacheTag(name, parentId));

  const binding = modules[name]?.admin?.oneToOne?.relations[relationKey];
  if (!binding) {
    return null;
  }
  const result = await loadRecord({
    table: binding.table,
    fields: binding.fields,
    defaults: binding.defaultValues,
    where: eq(binding.foreignKey, parentId),
  });

  if (!result.row) {
    return null;
  }

  return serializeValues(result.values);
}
