"use client";

/*
 * Public entry point: the admin client-registry API for host applications.
 * Export only supported host-facing APIs. Kenstack code imports non-public
 * implementation from its canonical files, not through this entry point.
 */

import type { ClientConfig } from "./client";

type ClientConfigModule = { client: ClientConfig } | { default: ClientConfig };

export type AdminClientLoader = () => Promise<ClientConfig>;
export type AdminClientRegistry = Record<string, AdminClientLoader>;

export function defineAdminClients(
  loaders: Record<string, () => Promise<ClientConfigModule>>,
) {
  const clients: AdminClientRegistry = {};

  for (const [name, load] of Object.entries(loaders)) {
    let clientConfig: Promise<ClientConfig> | undefined;

    clients[name] = () => {
      clientConfig ??= load().then((mod) =>
        "client" in mod ? mod.client : mod.default,
      );

      return clientConfig;
    };
  }

  return clients;
}
