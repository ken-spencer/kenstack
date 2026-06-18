import "server-only";

export * from "@kenstack/fields/server";
export * from "./lib/searchParams";
export * from "./metadata";
export * from "./table";
export * from "./types/list";
export * from "./module";

import type { DefinedAdmin } from "./module";
import type { AdminClientLoader } from "./clientLoaders";

export type { DefinedAdmin };

type DefinedAdminMap<TModules extends readonly DefinedAdmin[string][]> =
  DefinedAdmin & {
    [TModule in TModules[number] as TModule["name"]]: TModule & {
      client?: AdminClientLoader;
    };
  };

export function defineAdmin<
  const TModules extends readonly DefinedAdmin[string][],
>(
  modules: TModules,
  clients: Record<string, AdminClientLoader> = {},
): DefinedAdminMap<TModules> {
  const moduleNames = new Set<string>();

  for (const moduleConfig of modules) {
    if (moduleNames.has(moduleConfig.name)) {
      throw new Error(`Duplicate admin module "${moduleConfig.name}".`);
    }

    moduleNames.add(moduleConfig.name);
  }

  return Object.fromEntries(
    modules.map((moduleConfig) => [
      moduleConfig.name,
      {
        ...moduleConfig,
        client: clients[moduleConfig.name],
      },
    ]),
  ) as DefinedAdminMap<TModules>;
}
