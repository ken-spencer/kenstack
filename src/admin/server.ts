import "server-only";

export * from "@kenstack/fields/server";
export * from "./lib/searchParams";
export * from "./metadata";
export * from "./table";
export * from "./types/list";
export * from "./module";

import type { DefinedAdmin } from "./module";
import type { AdminClientRegistry } from "./clientLoaders";

export type { DefinedAdmin };

type AdminModule = DefinedAdmin[string];
type AdminRecordChild = {
  module: AdminModule;
  foreignKey: string;
};
type AdminChild = AdminModule | AdminRecordChild;
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
    ?
        | TModule
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

  return Object.fromEntries(
    modules.map((moduleConfig) => [
      moduleConfig.name,
      {
        ...moduleConfig,
        client: clients,
      },
    ]),
  ) as DefinedAdminMap<TEntries>;
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
