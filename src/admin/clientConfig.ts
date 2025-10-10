import {
  type AdminClientConfig,
  type AdminClientOnlyConfig,
  type AdminSharedConfig,
} from "@kenstack/admin/types";
import merge from "lodash-es/merge";

export default function clientConfig(
  sharedConfig: AdminSharedConfig,
  clientConfig: AdminClientOnlyConfig
): AdminClientConfig {
  return merge({}, sharedConfig, clientConfig);
}
