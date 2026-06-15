import type { deps } from "@app/deps";

export type UserAccess = NonNullable<
  Parameters<typeof deps.auth.requireUser>[0]
>;
