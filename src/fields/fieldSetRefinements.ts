import type * as z from "zod";

const fieldSetRefinementsKey = Symbol("kenstack.fieldSetRefinements");

export type FieldSetSuperRefine<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> = (values: TValues, ctx: z.RefinementCtx) => void;
export type FieldSetSuperRefineOption<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> = FieldSetSuperRefine<TValues> | readonly FieldSetSuperRefine<TValues>[];
export function getFieldSetRefinements(fields: object) {
  return (
    (
      fields as {
        [fieldSetRefinementsKey]?: readonly FieldSetSuperRefine[];
      }
    )[fieldSetRefinementsKey] ?? []
  );
}

export function attachFieldSetRefinements<
  TFields extends object,
  TValues extends Record<string, unknown> = Record<string, unknown>,
>(
  fields: TFields,
  {
    from,
    superRefine,
  }: {
    from?: object;
    superRefine?: FieldSetSuperRefineOption<TValues>;
  },
) {
  const ownRefinements =
    typeof superRefine === "function" ? [superRefine] : (superRefine ?? []);

  const nextRefinements = [
    ...getFieldSetRefinements(fields),
    ...(from ? getFieldSetRefinements(from) : []),
    ...ownRefinements.map(
      (refine): FieldSetSuperRefine =>
        (values, ctx) =>
          refine(values as TValues, ctx),
    ),
  ];

  if (!nextRefinements.length) {
    return fields;
  }

  Object.defineProperty(fields, fieldSetRefinementsKey, {
    configurable: true,
    enumerable: true,
    value: nextRefinements,
  });

  return fields;
}
