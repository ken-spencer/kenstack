export function hasKey<T extends object>(
  object: T,
  key: PropertyKey,
): key is keyof T {
  return Object.hasOwn(object, key);
}
