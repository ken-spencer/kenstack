export type DefaultValuesFromFields<TFields> = {
  [K in keyof TFields]: TFields[K] extends { default: infer TDefault }
    ? TDefault
    : never;
};

export function createDefaultValues<
  const T extends Record<string, { default: unknown }>,
>(fields: T) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.default]),
  ) as DefaultValuesFromFields<T>;
}
