import startCase from "lodash-es/startCase";
import * as z from "zod";

import {
  defineFields,
  type DefinedField,
  type DefinedFields,
} from "@kenstack/admin/fields";
import {
  createDefaultValues,
  type DefaultValuesFromFields,
} from "@kenstack/fields/createDefaultValues";
import { field, type FieldInputOption } from "@kenstack/fields/field";

const oneToOneSelectionFieldName = "kind";

type OneToOneFields = Record<string, DefinedFields>;

type OneToOneSelectionField<TValue extends string = string> = DefinedField<
  "one-to-one",
  TValue
> & {
  options: FieldInputOption[];
};

export type ResolvedOneToOneDefinition<
  TRelations extends OneToOneFields = OneToOneFields,
> = {
  field: typeof oneToOneSelectionFieldName;
  relations: {
    [TKey in keyof TRelations]: {
      defaultValues: DefaultValuesFromFields<TRelations[TKey]>;
      fields: TRelations[TKey];
      title: string;
      value: Extract<TKey, string>;
    };
  };
  selectionField: OneToOneSelectionField<Extract<keyof TRelations, string>>;
};

function defineSelectionField(values: readonly [string, ...string[]]) {
  return defineFields({
    fields: {
      [oneToOneSelectionFieldName]: field({
        default: values[0],
        filter: values.length > 1,
        filterKind: "enum",
        kind: "one-to-one",
        label: "Type",
        list: values.length > 1,
        options: values.map((value) => ({ label: startCase(value), value })),
        zod: z.enum(values),
      }),
    },
  })[oneToOneSelectionFieldName];
}

export function resolveOneToOneDefinition<
  const TRelations extends OneToOneFields,
>(relationFields: TRelations): ResolvedOneToOneDefinition<TRelations> {
  const entries = Object.entries(relationFields);
  if (!entries.length) {
    throw new Error("One-to-one fields require at least one relation.");
  }

  for (const [name, fields] of entries) {
    if (!name) {
      throw new Error("One-to-one relation keys cannot be empty.");
    }
    if (name === oneToOneSelectionFieldName) {
      throw new Error(
        `One-to-one relation "${name}" conflicts with the reserved selection field.`,
      );
    }
    if ("id" in fields) {
      throw new Error(
        `One-to-one field set "${name}" cannot define the reserved field "id".`,
      );
    }
  }

  type RelationName = Extract<keyof TRelations, string>;
  const values = entries.map(([name]) => name) as [
    RelationName,
    ...RelationName[],
  ];
  // defineFields widens a runtime-built default to string. Reapply the same
  // value here so consumers retain the actual relation-key union.
  const selectionField = {
    ...defineSelectionField(values),
    default: values[0],
  };
  const relations = Object.fromEntries(
    entries.map(([name, fields]) => [
      name,
      {
        defaultValues: createDefaultValues(fields),
        fields,
        title: startCase(name),
        value: name,
      },
    ]),
  ) as ResolvedOneToOneDefinition<TRelations>["relations"];

  return {
    field: oneToOneSelectionFieldName,
    relations,
    selectionField,
  };
}

export function withOneToOneSelectionField<
  const TFields extends DefinedFields,
  const TSelectionField extends OneToOneSelectionField,
>(
  fields: TFields & { [oneToOneSelectionFieldName]?: never },
  oneToOne: {
    relations: Record<string, unknown>;
    selectionField: TSelectionField;
  },
) {
  if (oneToOneSelectionFieldName in fields) {
    throw new Error(
      `Field "${oneToOneSelectionFieldName}" cannot be defined manually when oneToOne is configured.`,
    );
  }
  for (const name of Object.keys(oneToOne.relations)) {
    if (name in fields) {
      throw new Error(
        `One-to-one relation "${name}" conflicts with parent field "${name}".`,
      );
    }
  }

  return {
    ...fields,
    [oneToOneSelectionFieldName]: oneToOne.selectionField,
  };
}
