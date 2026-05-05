import * as z from "zod";
import { imageSchema } from "@kenstack/zod/image";

export type DefaultOption = {
  kind?: never;
  zod: z.ZodType;
  serverZod?: z.ZodType;
  default: unknown;
  searchable?: boolean;
};

type ImageOption = {
  kind: "image";
  zod?: typeof imageSchema;
  serverZod?: never;
  default?: null;
  searchable?: false;
};

export type FieldOption = DefaultOption | ImageOption;
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
          },
        ];
      }

      return [
        key,
        {
          ...field,
          searchable: field.searchable === true,
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
