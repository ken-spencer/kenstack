"use client";

/*
 * Public entry point: the admin client-registry API for host applications.
 * Export only supported host-facing APIs. Kenstack code imports non-public
 * implementation from its canonical files, not through this entry point.
 */

import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";
import {
  resolveOneToOneDefinition,
  withOneToOneSelectionField,
} from "@kenstack/admin/internal/oneToOne";

import type { ClientConfig, ClientOneToOne, defineClient } from "./client";

// What a module registers: defineClient's inputs, built once by the loader below.
type ClientInput = ReturnType<typeof defineClient>;
type ClientConfigModule = { client: ClientInput } | { default: ClientInput };

function resolveOneToOne(
  config: NonNullable<NonNullable<ClientInput["admin"]>["oneToOne"]>,
): ClientOneToOne {
  const definition = resolveOneToOneDefinition(
    Object.fromEntries(
      Object.entries(config).map(([name, relation]) => [name, relation.fields]),
    ),
  );

  return {
    field: definition.field,
    relations: Object.fromEntries(
      Object.entries(config).map(([name, relationConfig]) => {
        const relation = definition.relations[name];
        if (!relation) {
          throw new Error(`Missing one-to-one definition "${name}".`);
        }
        return [name, { ...relation, EditForm: relationConfig.EditForm }];
      }),
    ),
    selectionField: definition.selectionField,
  };
}

function buildClient({ admin, settings }: ClientInput): ClientConfig {
  return {
    admin: admin
      ? (() => {
          const oneToOne = admin.oneToOne
            ? resolveOneToOne(admin.oneToOne)
            : undefined;
          const fields = oneToOne
            ? withOneToOneSelectionField(admin.fields, oneToOne)
            : admin.fields;
          return {
            fields,
            listItems: admin.listItems,
            EditForm: admin.EditForm,
            oneToOne,
          };
        })()
      : undefined,
    settings: settings
      ? { ...settings, schema: createSchemaFromFields(settings.fields) }
      : undefined,
  };
}

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
        buildClient("client" in mod ? mod.client : mod.default),
      );

      return clientConfig;
    };
  }

  return clients;
}
