export function hasSearchParam(
  searchParams: unknown,
  key: string,
): searchParams is Record<string, unknown> {
  return (
    searchParams !== null &&
    typeof searchParams === "object" &&
    key in searchParams
  );
}

export function getSearchParam(searchParams: unknown, key: string) {
  if (!hasSearchParam(searchParams, key)) {
    return undefined;
  }

  const value = searchParams[key];

  return typeof value === "string" ? value : undefined;
}

export async function isPreview(searchParams: unknown | Promise<unknown>) {
  return hasSearchParam(await searchParams, "preview");
}
