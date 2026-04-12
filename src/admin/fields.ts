import * as z from "zod";

type BaseFieldOption = {
  column?: string;
  unique?: boolean;
  nullable?: boolean;
  serverZod?: z.ZodType;
  /** field is in the db, but never sent to the browser */
  private?: boolean;
};

type TextFieldOption = BaseFieldOption & {
  kind?: "text";
  default?: string;
  zod?: z.ZodString;
  searchable?: boolean;
};

type BooleanFieldOption = BaseFieldOption & {
  kind: "boolean";
  default: boolean;
  zod?: z.ZodBoolean;
};

type NumberFieldOption = BaseFieldOption & {
  kind: "number";
  default: number;
  zod?: z.ZodNumber;
};

type TimestampFieldOption = BaseFieldOption & {
  kind: "timestamp";
  default?: string;
  zod?: z.ZodType<Date | string | null>;
};

type JsonbFieldOption<TSchema extends z.ZodType = z.ZodType> =
  BaseFieldOption & {
    kind: "jsonb";
    default?: Record<string, unknown> | null;
    zod: TSchema;
  };

export type FieldOption =
  | TextFieldOption
  | BooleanFieldOption
  | NumberFieldOption
  | TimestampFieldOption
  | JsonbFieldOption;

export type FieldOptions = Record<string, FieldOption>;

export function defineFields<const T extends FieldOptions>(options: T) {
  return options;
}

function getFieldZodSchema(field: FieldOption, isServer: boolean): z.ZodType {
  let schema: z.ZodType;

  if (isServer && field.serverZod) {
    schema = field.serverZod;
  } else if (field.zod) {
    schema = field.zod;
  } else {
    switch (field.kind) {
      case "text": {
        schema = z.string();
        break;
      }
      case "boolean": {
        schema = z.boolean();
        break;
      }
      case "number": {
        schema = z.coerce.number();
        break;
      }
      case "timestamp": {
        schema = z.coerce.date();
        break;
      }
      case "jsonb": {
        schema = field.zod;
        break;
      }
      default: {
        schema = z.string();
        break;
      }
    }
  }

  if (field.nullable) {
    return schema.nullable();
  }

  return schema;
}

export function createZodSchema<const T extends FieldOptions>(
  fields: T,
  isServer = false,
) {
  const shape = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [
      key,
      getFieldZodSchema(field, isServer),
    ]),
  );

  return z.object(shape);
}
export function createDefaultValues<const T extends FieldOptions>(fields: T) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => {
      if (field.default !== undefined) {
        return [key, field.default];
      }

      if (field.nullable) {
        return [key, null];
      }

      switch (field.kind) {
        case "text": {
          return [key, ""];
        }
        case "boolean": {
          return [key, false];
        }
        case "number": {
          return [key, 0];
        }
        case "timestamp": {
          return [key, ""];
        }
        case "jsonb": {
          return [key, null];
        }
        default: {
          return [key, ""];
        }
      }
    }),
  );
}
