type UserNameFields = {
  email?: string | null;
  familyName?: string | null;
  givenName?: string | null;
  middleName?: string | null;
};

export function formatUserName(
  user: UserNameFields,
  {
    fallback = "",
    includeMiddleName = false,
  }: { fallback?: string; includeMiddleName?: boolean } = {},
) {
  const nameParts = includeMiddleName
    ? [user.givenName, user.middleName, user.familyName]
    : [user.givenName, user.familyName];
  const name = nameParts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return name || user.email?.trim() || fallback;
}

export function formatUserInitials(
  user: Pick<UserNameFields, "email" | "familyName" | "givenName">,
  { fallback = "" }: { fallback?: string } = {},
) {
  const initials = [user.givenName, user.familyName]
    .map((part) => part?.trim()[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return initials || user.email?.trim().slice(0, 2).toUpperCase() || fallback;
}
