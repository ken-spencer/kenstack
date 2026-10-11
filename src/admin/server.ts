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
// What someone's roles may do in a module, for a check outside the admin, such as whether a link to
// a user's record would open.

import { isSingleRelationshipField } from "@kenstack/fields/relationship";
import {
  adminNavigation,
  type AdminNavigationLink,
  type DefinedAdmin,
  type ModuleGrants,
} from "./module";
import { resolveScopedReorders } from "./lib/scopedReorder";
import { resolveSingleRelationship } from "./lib/singleRelationship";

export type { DefinedAdmin };

type AdminModule = DefinedAdmin[string];
// A child entry with a foreignKey is scoped to its parent's records; without one it is a module of its
// own listed under the parent. An entry's grants replace the module's default.
type AdminChild =
  | AdminModule
  | ({
      module: AdminModule;
      foreignKey?: string;
    } & ModuleGrants);
type AdminParentEntry =
  | AdminModule
  | ({
      module: AdminModule;
      children?: readonly AdminChild[];
    } & ModuleGrants);
// A sidebar heading of its own for its modules and links, in order; other top-level modules sit
// under Administration.
type AdminHeadingEntry = {
  heading: string;
  children: readonly (AdminParentEntry | AdminNavigationLink)[];
};
type AdminEntry = AdminParentEntry | AdminHeadingEntry | AdminNavigationLink;

type EntryModule<TEntry> = TEntry extends AdminModule
  ? TEntry
  : TEntry extends { heading: string; children: readonly (infer TGroupEntry)[] }
    ? EntryModule<TGroupEntry>
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
  [TModule in EntryModule<TEntries[number]> as TModule["name"]]: TModule;
};

export function defineAdmin<const TEntries extends readonly AdminEntry[]>(
  entries: TEntries,
): DefinedAdminMap<TEntries> {
  const { modules, navigation } = normalizeAdminEntries(entries);
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
    // A record-scoped child takes its parent's grants, so its own would be ignored.
    if (parentName && hasGrants(moduleConfig)) {
      throw new Error(
        `Admin module "${moduleConfig.name}" sets grants, but a module scoped to parent "${parentName}" takes its parent's.`,
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

  return {
    ...Object.fromEntries(
      resolvedModules.map((moduleConfig) => {
        validateOneToOne(moduleConfig, resolvedModules);

        return [moduleConfig.name, moduleConfig];
      }),
    ),
    [adminNavigation]: navigation,
  } as DefinedAdminMap<TEntries>;
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
    // The editor and the save check cover a module's own fields only, so a relation field's access
    // would be ignored.
    for (const [fieldName, field] of Object.entries(binding.fields)) {
      if (field.access !== undefined) {
        throw new Error(
          `One-to-one field "${moduleConfig.name}.${name}.${fieldName}" sets access, which relation fields don't support yet.`,
        );
      }
    }
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

// Flattens the registry into its modules and records the sidebar's groups in registry order.
// Top-level modules share one Administration group, placed where the first one appears; top-level
// links show in place without a heading.
function normalizeAdminEntries(entries: readonly AdminEntry[]) {
  const navigation: DefinedAdmin[typeof adminNavigation] = [];
  let administration: (typeof navigation)[number] | undefined;

  const modules = entries.flatMap((entry) => {
    if ("href" in entry) {
      const previous = navigation.at(-1);
      if (previous && previous.heading === undefined) {
        previous.items.push(entry);
      } else {
        navigation.push({ items: [entry] });
      }
      return [];
    }

    let group: (typeof navigation)[number];
    if ("heading" in entry) {
      group = { heading: entry.heading, items: [] };
      navigation.push(group);
    } else if (administration) {
      group = administration;
    } else {
      group = administration = { heading: "Administration", items: [] };
      navigation.push(group);
    }

    return ("heading" in entry ? entry.children : [entry]).flatMap((child) => {
      if ("href" in child) {
        group.items.push(child);
        return [];
      }

      const [module, ...children] = normalizeParentEntries([child]);
      // A module scoped to a parent record is reached from that record, never the sidebar.
      if (!module.parent) {
        group.items.push(module.name);
      }
      return [module, ...children];
    });
  });

  return { modules, navigation };
}

function normalizeParentEntries(entries: readonly AdminParentEntry[]) {
  return entries.flatMap((entry) => {
    if (isAdminModule(entry)) {
      return [entry];
    }

    return [
      withGrants(entry.module, entry),
      ...(entry.children ?? []).map((child) => {
        if (isAdminModule(child)) {
          return {
            ...child,
            navigationParent: entry.module.name,
          };
        }

        const childModule = withGrants(child.module, child);
        return child.foreignKey === undefined
          ? { ...childModule, navigationParent: entry.module.name }
          : {
              ...childModule,
              parent: {
                module: entry.module.name,
                foreignKey: child.foreignKey,
              },
            };
      }),
    ];
  });
}

function hasGrants(grants: ModuleGrants) {
  return Boolean(grants.viewers || grants.contributors || grants.editors);
}

// A registry entry that sets any level replaces all of the module's default grants.
function withGrants(module: AdminModule, entry: ModuleGrants): AdminModule {
  return hasGrants(entry)
    ? {
        ...module,
        viewers: entry.viewers,
        contributors: entry.contributors,
        editors: entry.editors,
      }
    : module;
}

function isAdminModule(
  entry: AdminParentEntry | AdminChild,
): entry is AdminModule {
  return "name" in entry;
}
