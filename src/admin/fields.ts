import * as z from "zod";
import { imageSchema } from "@kenstack/zod/image";
import { gallerySchema } from "@kenstack/zod/gallery";
import tagsSchema from "@kenstack/schemas/atoms/tags";

export const relationshipValueSchema = z.object({
  id: z.number(),
  label: z.string(),
});

export const relationshipSchema = z.array(relationshipValueSchema);

export type DefaultOption = {
  kind?: never;
  zod: z.ZodType;
  serverZod?: z.ZodType;
  default: unknown;
  searchable?: boolean;
  revisions?: boolean;
};

type ImageOption = {
  kind: "image";
  zod?: typeof imageSchema;
  serverZod?: never;
  default?: null;
  searchable?: false;
  revisions?: boolean;
};

type GalleryOption = {
  kind: "gallery";
  zod?: typeof gallerySchema;
  serverZod?: typeof gallerySchema;
  default?: z.output<typeof gallerySchema>;
  searchable?: false;
  revisions?: boolean;
};

type TagsOption = {
  kind: "tags";
  zod?: ReturnType<typeof tagsSchema>;
  serverZod?: ReturnType<typeof tagsSchema>;
  default?: z.output<ReturnType<typeof tagsSchema>>;
  searchable?: false;
  revisions?: boolean;
};

type RelationshipOption = {
  kind: "relationship";
  zod?: typeof relationshipSchema;
  serverZod?: typeof relationshipSchema;
  default?: z.output<typeof relationshipSchema>;
  searchable?: false;
  revisions?: boolean;
};

export type FieldOption =
  | DefaultOption
  | ImageOption
  | GalleryOption
  | TagsOption
  | RelationshipOption;
export type FieldOptions = Record<string, FieldOption>;
export type DefinedFields = Record<string, Required<FieldOption>>;

export function defineFields(options: FieldOptions) {
  return Object.fromEntries(
    Object.entries(options).map(([key, field]) => {
      if ("kind" in field && field.kind === "image") {
        return [
          key,
          {
            ...field,
            zod: field.zod ?? imageSchema,
            default: field.default ?? null,
            searchable: false,
            revisions: field.revisions ?? true,
          },
        ];
      }

      if ("kind" in field && field.kind === "gallery") {
        return [
          key,
          {
            ...field,
            zod: field.zod ?? gallerySchema,
            serverZod: field.serverZod ?? gallerySchema,
            default: field.default ?? [],
            searchable: false,
            revisions: field.revisions ?? true,
          },
        ];
      }

      if ("kind" in field && field.kind === "relationship") {
        return [
          key,
          {
            ...field,
            zod: field.zod ?? relationshipSchema,
            serverZod: field.serverZod ?? relationshipSchema,
            default: field.default ?? [],
            searchable: false,
            revisions: field.revisions ?? true,
          },
        ];
      }

      if ("kind" in field && field.kind === "tags") {
        return [
          key,
          {
            ...field,
            zod: field.zod ?? tagsSchema(),
            serverZod: field.serverZod ?? tagsSchema(),
            default: field.default ?? [],
            searchable: false,
            revisions: field.revisions ?? true,
          },
        ];
      }

      return [
        key,
        {
          ...field,
          searchable: field.searchable === true,
          revisions: field.revisions ?? true,
        },
      ];
    }),
  ) as DefinedFields;
}

// function getFieldZodSchema(field: FieldOption, isServer: boolean): z.ZodType {
//   let schema: z.ZodType;

//   if (isServer && field.serverZod) {
//     schema = field.serverZod;
//   } else if (field.zod) {
//     schema = field.zod;
//   } else {
//     const kind: FieldKind = field.kind ?? "text";
//     switch (kind) {
//       case "text": {
//         schema = z.string();
//         break;
//       }
//       case "boolean": {
//         schema = z.boolean();
//         break;
//       }
//       case "integer": {
//         schema = z.coerce.number().int();
//         break;
//       }
//       case "numeric": {
//         schema = z.coerce.string();
//         break;
//       }
//       case "text-array": {
//         schema = z.array(z.string());
//         break;
//       }
//       case "integer-array": {
//         schema = z.array(z.coerce.number().int());
//         break;
//       }
//       case "timestamp": {
//         schema = z.coerce.date();
//         break;
//       }
//       default: {
//         throw new Error(`Unsupported field kind: ${String(kind)}`);
//       }
//     }
//   }

//   if (field.nullable) {
//     return schema.nullable();
//   }

//   return schema;
// }

export function createZodSchema<const T extends DefinedFields>(
  fields: T,
  isServer = false,
) {
  const shape = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [
      key,
      isServer ? (field.serverZod ?? field.zod) : field.zod,
      // getFieldZodSchema(field, isServer),
    ]),
  );

  return z.object(shape);
}
export function createDefaultValues<const T extends DefinedFields>(fields: T) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => {
      return [key, field.default];

      // if (field.default !== undefined) {
      //   return [key, field.default];
      // }

      // if (field.nullable) {
      //   return [key, null];
      // }

      // const kind: FieldKind = field.kind ?? "text";

      // switch (kind) {
      //   case "text": {
      //     return [key, ""];
      //   }
      //   // case "boolean": {
      //   //   return [key, false];
      //   // }
      //   case "integer": {
      //     return [key, 0];
      //   }
      //   case "numeric": {
      //     return [key, ""];
      //   }
      //   case "text-array":
      //   case "integer-array": {
      //     return [key, []];
      //   }
      //   case "timestamp": {
      //     return [key, ""];
      //   }
      //   case "jsonb": {
      //     return [key, null];
      //   }
      //   default:
      //     throw new Error(`Unsupported field kind: ${String(kind)}`);
      // }
    }),
  );
}
