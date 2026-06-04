export * from "@kenstack/fields";
export * from "./lib/searchParams";
export * from "./metadata";
export * from "./table";
export * from "./types/list";
export * from "./client";
export * from "./module";

import type { DefinedAdmin } from "./module";

export type { DefinedAdmin };

type DefinedAdminMap<TModules extends readonly DefinedAdmin[string][]> =
  DefinedAdmin & {
    [TModule in TModules[number] as TModule["name"]]: TModule;
  };

export function defineAdmin<
  const TModules extends readonly DefinedAdmin[string][],
>(modules: TModules): DefinedAdminMap<TModules> {
  return Object.fromEntries(
    modules.map((module) => [module.name, module]),
  ) as DefinedAdminMap<TModules>;
}
