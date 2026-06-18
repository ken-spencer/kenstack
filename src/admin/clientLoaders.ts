import type { ClientConfig } from "./client";

type ClientConfigModule = { client: ClientConfig } | { default: ClientConfig };

export type AdminClientLoader = () => Promise<ClientConfig>;

export function defineAdminClients(
  loaders: Record<string, () => Promise<ClientConfigModule>>,
) {
  const clients: Record<string, AdminClientLoader> = {};

  for (const [name, load] of Object.entries(loaders)) {
    clients[name] = async () => {
      const mod = await load();

      return "client" in mod ? mod.client : mod.default;
    };
  }

  return clients;
}
