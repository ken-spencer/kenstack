import * as z from "zod";

export type FieldOption = {
  zod: z.ZodType;
  serverZod?: z.ZodType;
  default: unknown;
  searchable?: boolean;
};

// type BaseFieldOption = {
//   column?: string;
//   unique?: boolean;
//   nullable?: boolean;
//   serverZod?: z.ZodType;
//   /** field is in the db, but never sent to the browser */
//   private?: boolean;
// };

// type NoBaseFieldOption = {
//   column?: never;
//   unique?: never;
//   nullable?: never;
//   private?: never;
// };

// type TextFieldOption = BaseFieldOption & {
//   kind?: "text";
//   default?: string;
//   zod?: z.ZodString;
//   searchable?: boolean;
// };
// type VirtualFieldOption = NoBaseFieldOption & {
//   kind: "virtual";
//   default: unknown;
//   zod?: z.ZodType;
//   serverZod?: z.ZodType;
// };

// type BooleanFieldOption = BaseFieldOption & {
//   kind: "boolean";
//   default: boolean;
//   zod?: z.ZodBoolean;
// };

// type IntegerFieldOption = BaseFieldOption & {
//   kind: "integer";
//   default?: number;
//   zod?: z.ZodType<number>;
// };

// type NumericFieldOption = BaseFieldOption & {
//   kind: "numeric";
//   default?: string;
//   zod?: z.ZodType<string>;
// };

// type TimestampFieldOption = BaseFieldOption & {
//   kind: "timestamp";
//   default?: string;
//   zod?: z.ZodArray<z.ZodType<string | number>>;
// };

// type TextArrayFieldOption = BaseFieldOption & {
//   kind: "text-array";
//   default?: string[];
//   zod?: z.ZodType<string[]>;
// };

// type IntegerArrayFieldOption = BaseFieldOption & {
//   kind: "integer-array";
//   default?: number[];
//   zod?: z.ZodType<number[]>;
// };
// type JsonbFieldOption<TSchema extends z.ZodType = z.ZodType> =
//   BaseFieldOption & {
//     kind: "jsonb";
//     default?: Record<string, unknown> | null;
//     zod: TSchema;
//   };

// export type FieldOption =
//   | TextFieldOption
//   | BooleanFieldOption
//   | IntegerFieldOption
//   | NumericFieldOption
//   | TimestampFieldOption
//   | JsonbFieldOption
//   | TextArrayFieldOption
//   | IntegerArrayFieldOption
//   | VirtualFieldOption;

// export type FieldKind = NonNullable<FieldOption["kind"]>;

export type FieldOptions = Record<string, FieldOption>;

export function defineFields(options: FieldOptions) {
  return options;
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

export function createZodSchema<const T extends FieldOptions>(
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
export function createDefaultValues<const T extends FieldOptions>(fields: T) {
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
