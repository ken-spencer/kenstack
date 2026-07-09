import type * as z from "zod";

const fieldSetRefinementsKey: unique symbol = Symbol(
  "kenstack.fieldSetRefinements",
);

export type FieldSetSuperRefine = (
  values: Record<string, unknown>,
  ctx: z.RefinementCtx,
) => void;
export type FieldSetSuperRefineOption =
  | FieldSetSuperRefine
  | readonly FieldSetSuperRefine[];
type FieldSetRefinementSource =
  | { from: object; superRefine?: FieldSetSuperRefineOption }
  | { from?: object; superRefine: FieldSetSuperRefineOption };

export function getFieldSetRefinements(fields: object) {
  return (
    fields as {
      [fieldSetRefinementsKey]?: readonly FieldSetSuperRefine[];
    }
  )[fieldSetRefinementsKey] ?? [];
}

export function attachFieldSetRefinements<TFields extends object>(
  fields: TFields,
  refinements: FieldSetSuperRefineOption | FieldSetRefinementSource | undefined,
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

  const nextRefinements = [
    ...getFieldSetRefinements(fields),
    ...(from ? getFieldSetRefinements(from) : []),
    ...(superRefine
      ? Array.isArray(superRefine)
        ? superRefine
        : [superRefine]
      : []),
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
