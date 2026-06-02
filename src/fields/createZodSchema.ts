import * as z from "zod";

import type { DefinedFields, FieldRecordRefinement } from "./types";

type ZodShapeFromFields<TFields extends DefinedFields> = {
  [K in keyof TFields]: TFields[K]["zod"];
};

export function createZodSchema<const T extends DefinedFields>(fields: T) {
  const shape = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.zod]),
  ) as ZodShapeFromFields<T>;
  const recordRefinements = Object.values(fields)
    .map((field) => field.recordRefinement)
    .filter(
      (refinement): refinement is FieldRecordRefinement =>
        Boolean(refinement),
    );

  const schema = z.object(shape);

  if (!recordRefinements.length) {
    return schema;
  }

  return schema.superRefine((values, ctx) => {
    for (const refine of recordRefinements) {
      refine(values, ctx);
    }
  });
}
