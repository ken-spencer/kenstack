import * as z from "zod";

import type { DefinedFields } from "./types";
import {
  getOneToOneFieldSets,
  type OneToOneFields,
  type OneToOneFieldSetsFrom,
} from "./oneToOneFieldSets";
import { getFieldSetRefinements } from "./fieldSetRefinements";

type ZodShapeFromFields<TFields extends DefinedFields> = {
  [K in keyof TFields]: TFields[K]["zod"];
};

const relationIdSchema = z.int().positive().optional();

type OneToOneShape<TFields extends DefinedFields> = {
  [K in Extract<keyof OneToOneFieldSetsFrom<TFields>, string>]: z.ZodOptional<
    z.ZodObject<
      {
        id: typeof relationIdSchema;
      } & ZodShapeFromFields<OneToOneFields<TFields, K>>
    >
  >;
};

// Builds one field-set schema and applies refinements owned by that field set.
function createFieldSetSchema<
  const TFields extends DefinedFields,
  const TPrefix extends z.ZodRawShape,
>(fields: TFields, shapePrefix: TPrefix) {
  const shape = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.zod]),
  ) as ZodShapeFromFields<TFields>;
  const schema = z.object({ ...shapePrefix, ...shape });
  const refinements = getFieldSetRefinements(fields);

  if (refinements.length) {
    return schema.superRefine((values, ctx) => {
      for (const refine of refinements) {
        refine(values, ctx);
      }
    });
  }

  return schema;
}

export function createZodSchema<const T extends DefinedFields>(fields: T) {
  const oneToOneShape = Object.fromEntries(
    Object.entries(getOneToOneFieldSets(fields)).map(([name, fieldSet]) => [
      name,
      createFieldSetSchema(fieldSet.fields, {
        id: relationIdSchema,
      }).optional(),
    ]),
  ) as OneToOneShape<T>;
  return createFieldSetSchema(fields, oneToOneShape);
}
