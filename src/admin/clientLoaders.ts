import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";
import {
  resolveOneToOneDefinition,
  withOneToOneSelectionField,
} from "@kenstack/admin/internal/oneToOne";

import type {
  AdminClient,
  ClientOneToOne,
  defineAdminClient,
  defineSettingsClient,
  SettingsClient,
} from "./client";

type AdminClientInput = ReturnType<typeof defineAdminClient>;

// A module's loader is the same function on every render, so each client is built once and
// use() always receives the same promise.
function createClientLoader<TInput, TClient>(
  build: (input: TInput) => TClient,
) {
  const clients = new WeakMap<
    () => Promise<{ default: TInput }>,
    Promise<TClient>
  >();
  return (load: () => Promise<{ default: TInput }>) => {
    let client = clients.get(load);
    if (!client) {
      client = load().then(
        ({ default: input }) => build(input),
        (error) => {
          // Forget a failed load, so the next render tries again.
          clients.delete(load);
          throw error;
        },
      );
      clients.set(load, client);
    }
    return client;
  };
}

export const loadAdminClient = createClientLoader(buildAdminClient);

export const loadSettingsClient = createClientLoader(
  (settings: ReturnType<typeof defineSettingsClient>): SettingsClient => ({
    ...settings,
    schema: createSchemaFromFields(settings.fields),
  }),
);

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
