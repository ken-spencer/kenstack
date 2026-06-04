import { AuthDeps } from "./types";

import { generateToken, hashToken } from "./token";
import { createUser } from "./user";
import { createAuth as createAuthLocal } from "./auth";

export function createAuth<
  TSchema extends Record<string, unknown>,
  TRoles extends readonly string[],
>(deps: AuthDeps<TSchema, TRoles>) {
  const userDeps = createUser<TSchema, TRoles>(deps);
  const { getCurrentUser } = userDeps;

  return {
    generateToken,
    hashToken,
    ...userDeps,
    ...createAuthLocal<TSchema, TRoles>(deps, { getCurrentUser }),
  };
}
