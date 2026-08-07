/*
 * Public entry point: the admin server API for host applications.
 * Export only supported host-facing APIs. Kenstack code imports non-public
 * implementation from its canonical files, not through this entry point.
 */

import "server-only";

import { getTableColumns } from "drizzle-orm";
import {
  getTableConfig,
  type AnyPgColumn,
  type AnyPgTable,
} from "drizzle-orm/pg-core";

export * from "@kenstack/fields/server";
export * from "./lib/searchParams";
export * from "./metadata";
export * from "./table";
export * from "./types/list";
export * from "./module";

import { isSingleRelationshipField } from "@kenstack/fields/relationship";
import type { DefinedAdmin } from "./module";
import type { AdminClientRegistry } from "./clientLoaders";
import { resolveScopedReorders } from "./lib/scopedReorder";
import { resolveSingleRelationship } from "./lib/singleRelationship";

export type { DefinedAdmin };

type AdminModule = DefinedAdmin[string];
type AdminChild =
  | AdminModule
  | {
      module: AdminModule;
      foreignKey: string;
    };
type AdminEntry =
  | AdminModule
  | {
      module: AdminModule;
      children?: readonly AdminChild[];
    };

type EntryModule<TEntry> = TEntry extends AdminModule
  ? TEntry
  : TEntry extends {
        module: infer TModule extends AdminModule;
        children?: readonly (infer TChild)[];
      }
    ? | TModule
      | (TChild extends AdminModule
          ? TChild
          : TChild extends { module: infer TChildModule extends AdminModule }
            ? TChildModule
            : never)
    : never;

type DefinedAdminMap<TEntries extends readonly AdminEntry[]> = DefinedAdmin & {
  [TModule in EntryModule<TEntries[number]> as TModule["name"]]: TModule & {
    client: AdminClientRegistry;
  };
};

export function defineAdmin<const TEntries extends readonly AdminEntry[]>(
  entries: TEntries,
  clients: AdminClientRegistry = {},
): DefinedAdminMap<TEntries> {
  const modules = normalizeAdminEntries(entries);
  const moduleNames = new Set<string>();

  for (const moduleConfig of modules) {
    if (moduleNames.has(moduleConfig.name)) {
      throw new Error(`Duplicate admin module "${moduleConfig.name}".`);
    }

    moduleNames.add(moduleConfig.name);
  }

  for (const moduleConfig of modules) {
    const parentName = moduleConfig.parent?.module;

    if (parentName && !moduleNames.has(parentName)) {
      throw new Error(
        `Admin module "${moduleConfig.name}" references unknown parent module "${parentName}".`,
      );
    }
  }

  const resolvedModules = resolveScopedReorders(modules);

  for (const moduleConfig of resolvedModules) {
    if (!moduleConfig.admin) {
      continue;
    }
    const adminModuleConfig = {
      ...moduleConfig,
      admin: moduleConfig.admin,
    };

    for (const [fieldName, field] of Object.entries(
      moduleConfig.admin.fields,
    )) {
      if (isSingleRelationshipField(field)) {
        resolveSingleRelationship(
          adminModuleConfig,
          resolvedModules,
          fieldName,
        );
      }
    }
  }

  return Object.fromEntries(
    resolvedModules.map((moduleConfig) => {
      validateOneToOne(moduleConfig, resolvedModules);

      return [
        moduleConfig.name,
        {
          ...moduleConfig,
          client: clients,
        },
      ];
    }),
  ) as DefinedAdminMap<TEntries>;
}

// Validates ownership and foreign-key invariants before one-to-one admin configuration is exposed.
function validateOneToOne(
  moduleConfig: AdminModule,
  modules: readonly AdminModule[],
): void {
  if (!moduleConfig.admin) {
    return;
  }

  const admin = moduleConfig.admin;
  const oneToOne = admin.oneToOne;
  if (!oneToOne) {
    return;
  }

  const bindings = oneToOne.relations;
  const bindingNames = Object.keys(bindings).sort();

  const parentTable = admin.table;
  const parentColumns = getTableColumns(parentTable);
  const parentId = parentColumns.id;
  if (!parentId) {
    throw new Error(
      `Admin module "${moduleConfig.name}" table has no identity column "id".`,
    );
  }
  if (!parentColumns[oneToOne.field]) {
    throw new Error(
      `Admin module "${moduleConfig.name}" one-to-one selection field "${oneToOne.field}" must map to a parent table column.`,
    );
  }

  for (const name of bindingNames) {
    const binding = bindings[name];
    const relatedTable = binding.table;
    const foreignKey = binding.foreignKey;

    const identityForeignKey = findIdentityForeignKey(
      relatedTable,
      foreignKey,
      parentTable,
      parentId,
    );
    if (!identityForeignKey) {
      throw new Error(
        `One-to-one binding "${moduleConfig.name}.${name}" related "id" must reference the parent table's "id".`,
      );
    }
    if (identityForeignKey.onDelete !== "cascade") {
      throw new Error(
        `One-to-one binding "${moduleConfig.name}.${name}" related "id" foreign key must use ON DELETE CASCADE.`,
      );
    }

    if (
      !foreignKey.primary ||
      foreignKey.hasDefault ||
      foreignKey.generated ||
      foreignKey.generatedIdentity
    ) {
      throw new Error(
        `One-to-one binding "${moduleConfig.name}.${name}" requires a non-generated related primary-key "id".`,
      );
    }

    const independentModuleName = modules.find(
      (candidate) =>
        candidate !== moduleConfig && candidate.admin?.table === relatedTable,
    )?.name;
    if (independentModuleName) {
      throw new Error(
        `One-to-one binding "${moduleConfig.name}.${name}" is parent-owned and cannot use independently administered module "${independentModuleName}".`,
      );
    }
  }
}

// Finds the exact foreign key proving that a related identity belongs to its parent.
function findIdentityForeignKey(
  ownerTable: AnyPgTable,
  column: AnyPgColumn,
  targetTable: AnyPgTable,
  targetId: AnyPgColumn,
) {
  return getTableConfig(ownerTable).foreignKeys.find((foreignKey) => {
    const reference = foreignKey.reference();

    return (
      reference.columns.length === 1 &&
      reference.columns[0] === column &&
      reference.foreignTable === targetTable &&
      reference.foreignColumns.length === 1 &&
      reference.foreignColumns[0] === targetId
    );
  });
}

function normalizeAdminEntries(entries: readonly AdminEntry[]) {
  return entries.flatMap((entry) => {
    if (isAdminModule(entry)) {
      return [entry];
    }

    return [
      entry.module,
      ...(entry.children ?? []).map((child) => {
        if (isAdminModule(child)) {
          return {
            ...child,
            navigationParent: entry.module.name,
          };
        }

        return {
          ...child.module,
          parent: {
            module: entry.module.name,
            foreignKey: child.foreignKey,
          },
        };
      }),
    ];
  });
}

function isAdminModule(entry: AdminEntry | AdminChild): entry is AdminModule {
  return "name" in entry;
}
