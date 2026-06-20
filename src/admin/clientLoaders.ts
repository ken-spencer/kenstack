"use client";

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
