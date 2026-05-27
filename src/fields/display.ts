import type { DefinedField, FieldDisplay } from "./types";

type DisplayField = DefinedField & {
  behavior?: {
    display?: FieldDisplay;
  };
};

export async function getDisplayValues<
  const TFields extends Record<string, DisplayField>,
  TValues extends Record<string, unknown>,
>(fields: TFields, values: TValues) {
  const display = { ...values };

  await Promise.all(
    Object.entries(fields)
      .filter(([, field]) => field.display ?? field.behavior?.display)
      .map(async ([key, field]) => {
        const transform = field.display ?? field.behavior?.display;
        Object.assign(display, {
          [key]: await transform?.({
            key,
            field,
            value: values[key],
            values,
          }),
        });
      }),
  );

  return display;
}
