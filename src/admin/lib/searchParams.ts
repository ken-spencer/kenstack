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

type DraftModeAction = "enable-draft" | "disable-draft";

export function draftModePath(action: DraftModeAction, next: string) {
  const params = new URLSearchParams({ action, next });

  return `/api/admin?${params.toString()}`;
}
