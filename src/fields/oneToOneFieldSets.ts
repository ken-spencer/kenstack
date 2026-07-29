import type { DefaultValuesFromFields, DefinedFields } from "./types";

const oneToOneKey = Symbol("kenstack.oneToOneFieldSets");

export type OneToOneFieldSet<TFields extends DefinedFields> = {
  fields: TFields;
  defaultValues: DefaultValuesFromFields<TFields>;
};

type OneToOneFieldSets = Record<string, OneToOneFieldSet<DefinedFields>>;

/**
 * Carries the relation map through field-map transformations without adding the
 * metadata symbol to `keyof TFields`. At runtime the symbol belongs to the fields
 * object itself; intersecting it into each field value is type-level metadata only.
 */
export type FieldsWithOneToOne<
  TFields extends object,
  TOneToOne extends OneToOneFieldSets,
> = {
  [TKey in keyof TFields]: TFields[TKey] & {
    readonly [oneToOneKey]: TOneToOne;
  };
};

export type OneToOneFieldSetsFrom<TFields extends object> =
  TFields[keyof TFields] extends {
    readonly [oneToOneKey]: infer TOneToOne extends OneToOneFieldSets;
  }
    ? TOneToOne
    : Record<never, never>;

export type OneToOneFields<
  TFields extends object,
  TKey extends keyof OneToOneFieldSetsFrom<TFields>,
> =
  OneToOneFieldSetsFrom<TFields>[TKey] extends OneToOneFieldSet<
    infer TRelatedFields
  >
    ? TRelatedFields
    : never;

// Reads one-to-one field-set metadata without exposing its symbol on ordinary field keys.
export function getOneToOneFieldSets<
  TFields extends object,
  TOneToOne extends OneToOneFieldSets,
>(fields: FieldsWithOneToOne<TFields, TOneToOne>): TOneToOne;
export function getOneToOneFieldSets(fields: object): OneToOneFieldSets;
export function getOneToOneFieldSets(fields: object) {
  return (
    (
      fields as {
        [oneToOneKey]?: OneToOneFieldSets;
      }
    )[oneToOneKey] ?? {}
  );
}

// Attaches one-to-one field sets as non-enumerable metadata on the parent fields.
export function attachOneToOneFieldSets<
  TFields extends object,
  TOneToOne extends OneToOneFieldSets,
>(fields: TFields, oneToOne: TOneToOne) {
  Object.defineProperty(fields, oneToOneKey, {
    configurable: true,
    value: oneToOne,
  });

  return fields as FieldsWithOneToOne<TFields, TOneToOne>;
}
