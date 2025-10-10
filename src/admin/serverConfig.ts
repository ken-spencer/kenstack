import {
  type AdminServerConfig,
  type AdminServerOnlyConfig,
  type AdminSharedConfig,
} from "@kenstack/admin/types";
import merge from "lodash-es/merge";

export default function clientConfig(
  sharedConfig: AdminSharedConfig,
  serverConfig: AdminServerOnlyConfig
): AdminServerConfig {
  return merge({}, sharedConfig, serverConfig);
}
