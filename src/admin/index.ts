export * from "./fields";
export * from "./metadata";
export * from "./table";
export * from "./config";

import type { AnyAdminConfig } from "./config";
import siteSettingsAdminConfig from "@kenstack/modules/siteSettings/admin";
import usersAdminConfig from "@kenstack/modules/users/admin";

export type AdminModuleMap = Record<string, AnyAdminConfig>;

export type AdminOptions<TModules extends AdminModuleMap = AdminModuleMap> = {
  modules?: TModules;
};

export type AdminDefinition = {
  modules: AdminModuleMap;
};

export function defineAdmin<TModules extends AdminModuleMap>(
  options: AdminOptions<TModules>,
): AdminDefinition {
  return {
    modules: {
      users: usersAdminConfig,
      siteSettings: siteSettingsAdminConfig,
      ...options.modules,
    },
  };
}
