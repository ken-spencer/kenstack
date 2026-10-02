import "server-only";

import type { DefinedFields } from "@kenstack/admin/fields";
import { hasKey } from "@kenstack/lib/hasKey";
import { dateField } from "../date/server";
import { dateTimeField } from "../dateTime/server";
import { fileField } from "../file/server";
import { imageField } from "../image/server";
import { isSingleRelationshipField } from "../relationship";
import type {
  ServerField,
  ServerFieldRegistration,
  ServerFieldResolver,
} from "../serverField";
import { attachFieldSetRefinements } from "./fieldSetRefinements";

export type ServerDefinedFields = Record<
  string,
  DefinedFields[string] & ServerField
>;

type ServerRegistrableField<TField> = TField extends {
  kind: "relationship";
  mode: "single";
}
  ? never
  : TField;

export type ServerFields<TFields extends DefinedFields> = {
  [TKey in keyof TFields]?: ServerRegistrableField<TFields[TKey]> extends never
    ? never
    : | ServerFieldResolver<ServerRegistrableField<TFields[TKey]>>
      | (ServerFieldRegistration & { kind: TFields[TKey]["kind"] });
};

type ResolveServerFieldRegistration<TRegistration> = [TRegistration] extends [
  never,
]
  ? Record<never, never>
  : TRegistration extends (...args: never[]) => infer TServerField
    ? TServerField
    : TRegistration extends object
      ? TRegistration
      : Record<never, never>;

type BuiltInServerField<TField extends DefinedFields[string]> =
  ResolveServerFieldRegistration<
    (typeof builtInFieldKinds)[TField["kind"] & keyof typeof builtInFieldKinds]
  >;

type ResolvedZod<TRegistration, TFallback> =
  ResolveServerFieldRegistration<TRegistration> extends { zod: infer TZod }
    ? TZod
    : TFallback;

type ResolvedServerFieldFrom<
  TField extends DefinedFields[string],
  TFieldRegistration,
> = Omit<TField, "zod"> &
  ServerDefinedFields[string] &
  Omit<BuiltInServerField<TField>, "zod"> &
  Omit<ResolveServerFieldRegistration<TFieldRegistration>, "zod"> & {
    kind: TField["kind"];
    zod: ResolvedZod<
      TFieldRegistration,
      ResolvedZod<BuiltInServerField<TField>, TField["zod"]>
    >;
  };

type ServerDefinedFieldsFrom<
  TFields extends DefinedFields,
  TFieldRegistrations extends ServerFields<TFields> = Record<never, never>,
> = {
  [TKey in keyof TFields]: ResolvedServerFieldFrom<
    TFields[TKey],
    TKey extends keyof TFieldRegistrations
      ? NonNullable<TFieldRegistrations[TKey]>
      : never
  >;
};

const builtInFieldKinds = {
  date: dateField(),
  datetime: dateTimeField(),
  file: fileField(),
  image: imageField(),
};

export function resolveServerFields<const TFields extends DefinedFields>(
  fields: TFields,
): ServerDefinedFieldsFrom<TFields>;
export function resolveServerFields<
  const TFields extends DefinedFields,
  const TFieldRegistrations extends ServerFields<TFields>,
>(
  fields: TFields,
  options: {
    fields?: TFieldRegistrations;
  },
): ServerDefinedFieldsFrom<TFields, TFieldRegistrations>;
export function resolveServerFields(
  fields: DefinedFields,
  options: {
    fields?: Record<string, ServerFieldResolver | undefined>;
  } = {},
) {
  const fieldRegistrations = options.fields ?? {};
  assertKnownServerFieldRegistrations(fields, fieldRegistrations);

  const resolvedFields = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => {
      const isDirectRelationship = isSingleRelationshipField(field);
      const builtIn = resolveServerField(
        field,
        hasKey(builtInFieldKinds, field.kind)
          ? builtInFieldKinds[field.kind]
          : undefined,
      );
      const fieldRegistration = isDirectRelationship
        ? {}
        : resolveServerField(field, fieldRegistrations[key]);

      return [
        key,
        {
          ...field,
          ...builtIn,
          ...fieldRegistration,
          kind: field.kind,
        },
      ];
    }),
  );

  return attachFieldSetRefinements(resolvedFields, { from: fields });
}

function assertKnownServerFieldRegistrations(
  fields: DefinedFields,
  registrations: Record<string, unknown>,
) {
  for (const name of Object.keys(registrations)) {
    if (!(name in fields)) {
      throw new Error(
        `Unknown server field registration "${name}". No configured field uses that name.`,
      );
    }
    const registration = registrations[name];
    if (registration !== undefined && isSingleRelationshipField(fields[name])) {
      throw new Error(
        `Single relationship field "${name}" cannot have a server registration; it uses direct table-column persistence.`,
      );
    }
    if (
      typeof registration === "function" &&
      "kind" in registration &&
      registration.kind !== fields[name].kind
    ) {
      throw new Error(
        `Server field registration "${name}" has kind "${registration.kind}", but the field uses kind "${fields[name].kind}".`,
      );
    }
  }
}

function resolveServerField(
  field: DefinedFields[string],
  registration: unknown,
) {
  if (!registration) {
    return {};
  }

  const serverField =
    typeof registration === "function" ? registration(field) : registration;

  if (!serverField || typeof serverField !== "object") {
    throw new Error(
      `Server registration for field kind "${field.kind}" must resolve to an object.`,
    );
  }

  const { zod, ...behavior } = serverField as ServerField;

  return {
    ...behavior,
    ...(zod ? { zod } : {}),
  };
}
