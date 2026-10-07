import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";
import {
  resolveOneToOneDefinition,
  withOneToOneSelectionField,
} from "@kenstack/admin/internal/oneToOne";

import type {
  AdminClient,
  ClientOneToOne,
  defineAdminClient,
  ModuleClient,
  SettingsClient,
} from "./client";

type AdminClientInput = ReturnType<typeof defineAdminClient>;
type AdminClientLoader = NonNullable<ModuleClient["admin"]>;
type SettingsClientLoader = NonNullable<ModuleClient["settings"]>;

// A module's loader is the same function on every render, so each client is built once and
// use() always receives the same promise.
const adminClients = new WeakMap<AdminClientLoader, Promise<AdminClient>>();
const settingsClients = new WeakMap<
  SettingsClientLoader,
  Promise<SettingsClient>
>();

export function loadAdminClient(load: AdminClientLoader) {
  let adminClient = adminClients.get(load);
  if (!adminClient) {
    adminClient = load().then(
      ({ default: admin }) => buildAdminClient(admin),
      (error) => {
        // Forget a failed load, so the next render tries again.
        adminClients.delete(load);
        throw error;
      },
    );
    adminClients.set(load, adminClient);
  }
  return adminClient;
}

export function loadSettingsClient(load: SettingsClientLoader) {
  let settingsClient = settingsClients.get(load);
  if (!settingsClient) {
    settingsClient = load().then(
      ({ default: settings }) => ({
        ...settings,
        schema: createSchemaFromFields(settings.fields),
      }),
      (error) => {
        settingsClients.delete(load);
        throw error;
      },
    );
    settingsClients.set(load, settingsClient);
  }
  return settingsClient;
}

function buildAdminClient(admin: AdminClientInput): AdminClient {
  const oneToOne = admin.oneToOne ? resolveOneToOne(admin.oneToOne) : undefined;
  const fields = oneToOne
    ? withOneToOneSelectionField(admin.fields, oneToOne)
    : admin.fields;
  return {
    fields,
    listItems: admin.listItems,
    Edit: admin.Edit,
    EditForm: admin.EditForm,
    oneToOne,
  };
}

function resolveOneToOne(
  config: NonNullable<AdminClientInput["oneToOne"]>,
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
