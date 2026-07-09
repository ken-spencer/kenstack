import * as z from "zod";

import type { DefinedFields } from "./types";
import { getFieldSetRefinements } from "./fieldSetRefinements";

type ZodShapeFromFields<TFields extends DefinedFields> = {
  [K in keyof TFields]: TFields[K]["zod"];
};

export function createZodSchema<const T extends DefinedFields>(fields: T) {
  const shape = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.zod]),
  ) as ZodShapeFromFields<T>;
  const fieldSetRefinements = getFieldSetRefinements(fields);

  const schema = z.object(shape);

  if (!fieldSetRefinements.length) {
    return schema;
  }

  return schema.superRefine((values, ctx) => {
    for (const refine of fieldSetRefinements) {
      refine(values, ctx);
    }
  });
}
