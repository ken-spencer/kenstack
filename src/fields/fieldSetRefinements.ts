import type * as z from "zod";

const fieldSetRefinementsKey: unique symbol = Symbol(
  "kenstack.fieldSetRefinements",
);

export type FieldSetSuperRefine<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> = (values: TValues, ctx: z.RefinementCtx) => void;
export type FieldSetSuperRefineOption<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> = FieldSetSuperRefine<TValues> | readonly FieldSetSuperRefine<TValues>[];
type FieldSetRefinementSource<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> =
  | { from: object; superRefine?: FieldSetSuperRefineOption<TValues> }
  | { from?: object; superRefine: FieldSetSuperRefineOption<TValues> };

export function getFieldSetRefinements(fields: object) {
  return (
    (
      fields as {
        [fieldSetRefinementsKey]?: readonly FieldSetSuperRefine[];
      }
    )[fieldSetRefinementsKey] ?? []
  );
}

function eraseFieldSetSuperRefine<TValues extends Record<string, unknown>>(
  refine: FieldSetSuperRefine<TValues>,
): FieldSetSuperRefine {
  return (values, ctx) => refine(values as TValues, ctx);
}

export function attachFieldSetRefinements<
  TFields extends object,
  TValues extends Record<string, unknown> = Record<string, unknown>,
>(
  fields: TFields,
  refinements:
    | FieldSetSuperRefineOption<TValues>
    | FieldSetRefinementSource<TValues>
    | undefined,
) {
  if (!refinements) {
    return fields;
  }

  const hasRefinementSource =
    typeof refinements === "object" &&
    !Array.isArray(refinements) &&
    ("from" in refinements || "superRefine" in refinements);
  const from = hasRefinementSource ? refinements.from : undefined;
  const superRefine = hasRefinementSource
    ? refinements.superRefine
    : refinements;
  const ownRefinements =
    typeof superRefine === "function" ? [superRefine] : (superRefine ?? []);

  const nextRefinements = [
    ...getFieldSetRefinements(fields),
    ...(from ? getFieldSetRefinements(from) : []),
    ...ownRefinements.map(eraseFieldSetSuperRefine),
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
