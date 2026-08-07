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

export type ServerFieldKinds<TFields extends DefinedFields> =
  readonly (ServerFieldRegistration & {
    readonly kind: TFields[keyof TFields]["kind"];
  })[];

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

type RegisteredServerField<
  TField extends DefinedFields[string],
  TFieldKinds extends readonly { kind: string }[],
> = ResolveServerFieldRegistration<
  Extract<TFieldKinds[number], { kind: TField["kind"] }>
>;

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
  TFieldKinds extends readonly { kind: string }[],
  TFieldRegistration,
> = Omit<TField, "zod"> &
  ServerDefinedFields[string] &
  Omit<BuiltInServerField<TField>, "zod"> &
  Omit<RegisteredServerField<TField, TFieldKinds>, "zod"> &
  Omit<ResolveServerFieldRegistration<TFieldRegistration>, "zod"> & {
    kind: TField["kind"];
    zod: ResolvedZod<
      TFieldRegistration,
      ResolvedZod<
        Extract<TFieldKinds[number], { kind: TField["kind"] }>,
        ResolvedZod<BuiltInServerField<TField>, TField["zod"]>
      >
    >;
  };

type ServerDefinedFieldsFrom<
  TFields extends DefinedFields,
  TFieldKinds extends readonly { kind: string }[] = readonly [],
  TFieldRegistrations extends ServerFields<TFields> = Record<never, never>,
> = {
  [TKey in keyof TFields]: ResolvedServerFieldFrom<
    TFields[TKey],
    TFieldKinds,
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
  const TFieldKinds extends ServerFieldKinds<TFields>,
  const TFieldRegistrations extends ServerFields<TFields>,
>(
  fields: TFields,
  options: {
    fieldKinds?: TFieldKinds;
    fields?: TFieldRegistrations;
  },
): ServerDefinedFieldsFrom<TFields, TFieldKinds, TFieldRegistrations>;
export function resolveServerFields(
  fields: DefinedFields,
  options: {
    fieldKinds?: readonly ServerFieldRegistration[];
    fields?: Record<string, ServerFieldResolver | undefined>;
  } = {},
) {
  const fieldKinds = options.fieldKinds ?? [];
  const fieldRegistrations = options.fields ?? {};
  const fieldKindRegistry = createServerFieldKindRegistry(fieldKinds);
  assertKnownServerFieldKindRegistrations(fields, fieldKinds);
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
      const kindRegistration = isDirectRelationship
        ? {}
        : resolveServerField(field, fieldKindRegistry[field.kind]);
      const fieldRegistration = isDirectRelationship
        ? {}
        : resolveServerField(field, fieldRegistrations[key]);

      return [
        key,
        {
          ...field,
          ...builtIn,
          ...kindRegistration,
          ...fieldRegistration,
          kind: field.kind,
        },
      ];
    }),
  );

  return attachFieldSetRefinements(resolvedFields, { from: fields });
}

export function assertKnownServerFieldKindRegistrations(
  fields: DefinedFields,
  fieldKinds: readonly { kind: string }[],
) {
  const declaredKinds = new Set<string>();
  collectFieldKinds(fields, declaredKinds);

  for (const { kind } of fieldKinds) {
    if (!declaredKinds.has(kind)) {
      throw new Error(
        `Unknown server field kind registration "${kind}". No configured field uses that kind.`,
      );
    }
  }
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

function createServerFieldKindRegistry(
  fieldKinds: readonly ServerFieldRegistration[],
) {
  const registry: Record<string, ServerFieldRegistration> = {};

  for (const registration of fieldKinds) {
    if (registration.kind in registry) {
      throw new Error(
        `Duplicate server field kind registration "${registration.kind}".`,
      );
    }
    registry[registration.kind] = registration;
  }

  return registry;
}

function collectFieldKinds(fields: DefinedFields, kinds: Set<string>) {
  for (const field of Object.values(fields)) {
    kinds.add(field.kind);
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
