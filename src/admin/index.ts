export * from "@kenstack/fields";
export * from "./metadata";
export * from "./table";
export * from "./types/list";
export * from "./client";
export * from "./module";

import type { DefinedAdmin } from "./module";

export type { DefinedAdmin };

export function defineAdmin<
  const TModules extends readonly DefinedAdmin[string][],
>(modules: TModules): DefinedAdmin {
  const admin: DefinedAdmin = {};

  modules.forEach((module) => {
    admin[module.name] = module;
  });

  return admin;
}
