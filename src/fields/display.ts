import type { DefinedField } from "./types";

export async function getDisplayValues<
  const TFields extends Record<string, DefinedField>,
  TValues extends Record<string, unknown>,
>(fields: TFields, values: TValues) {
  const display = { ...values };

  await Promise.all(
    Object.entries(fields)
      .filter(([, field]) => field.display)
      .map(async ([key, field]) => {
        Object.assign(display, {
          [key]: await field.display?.({
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
