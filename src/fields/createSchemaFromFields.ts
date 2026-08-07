import * as z from "zod";

import { getFieldSetRefinements } from "./internal/fieldSetRefinements";

type SchemaFields = Record<string, { zod: z.ZodType }>;

type ZodShapeFromFields<TFields extends SchemaFields> = {
  [K in keyof TFields]: TFields[K]["zod"];
};

const relationIdSchema = z.int().positive().optional();

type SchemaRelations = Record<string, { fields: SchemaFields }>;

type OneToOneShape<TRelations extends SchemaRelations> = {
  [K in Extract<keyof TRelations, string>]: z.ZodOptional<
    z.ZodObject<
      {
        id: typeof relationIdSchema;
      } & ZodShapeFromFields<TRelations[K]["fields"]>
    >
  >;
};

// Builds one field-set schema and applies refinements owned by that field set.
function createFieldSetSchema<
  const TFields extends SchemaFields,
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

export function createSchemaFromFields<
  const TFields extends SchemaFields,
  const TRelations extends SchemaRelations = Record<never, never>,
>(fields: TFields, oneToOne?: { relations: TRelations }) {
  const oneToOneShape = Object.fromEntries(
    Object.entries(oneToOne?.relations ?? {}).map(([name, relation]) => [
      name,
      createFieldSetSchema(relation.fields, {
        id: relationIdSchema,
      }).optional(),
    ]),
  ) as OneToOneShape<TRelations>;
  return createFieldSetSchema(fields, oneToOneShape);
}
