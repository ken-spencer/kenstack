/* Host dependencies each site supplies through the `@app/deps` binding. */

import defaultRoles from "@kenstack/auth/roles";

type Roles = Record<string, { label: string }>;

export function createDeps(options?: { defaultTimeZone?: string }): {
  defaultTimeZone: string;
  roles: typeof defaultRoles;
};
export function createDeps<TRoles extends Roles>(options: {
  defaultTimeZone?: string;
  roles: TRoles;
}): { defaultTimeZone: string; roles: TRoles };
export function createDeps({
  // IANA time zone name for timestamps with no venue zone.
  defaultTimeZone = "America/Vancouver",
  roles = defaultRoles,
}: {
  defaultTimeZone?: string;
  roles?: Roles;
} = {}) {
  return { defaultTimeZone, roles };
}
