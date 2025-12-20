import {
  type AdminServerConfig,
  type AdminServerOnlyConfig,
  type AdminSharedConfig,
} from "@kenstack/admin/types";
import merge from "lodash-es/merge";

import { type RevalidateKey } from "@kenstack/mongrel/types";
import revalidator, { type Revalidator } from "@kenstack/mongrel/revalidator";

type ServerOnlyConfigInput = Omit<AdminServerOnlyConfig, "revalidate"> & {
  revalidate?: RevalidateKey[] | Revalidator;
};

export default function serverConfig(
  sharedConfig: AdminSharedConfig,
  serverConfig: ServerOnlyConfigInput
): AdminServerConfig {
  const serverProcessed: AdminServerOnlyConfig = {
    ...serverConfig,
    revalidate: Array.isArray(serverConfig.revalidate)
      ? revalidator(serverConfig.model, serverConfig.revalidate)
      : serverConfig.revalidate,
  };

  return merge({}, sharedConfig, serverProcessed);
}
