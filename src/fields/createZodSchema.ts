import * as z from "zod";

import type { DefinedFields } from "./types";

type ZodShapeFromFields<TFields extends DefinedFields> = {
  [K in keyof TFields]: TFields[K]["zod"];
};

export function createZodSchema<const T extends DefinedFields>(fields: T) {
  const shape = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.zod]),
  ) as ZodShapeFromFields<T>;

  return z.object(shape);
}
