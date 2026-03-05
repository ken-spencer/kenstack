import { AuthDeps, type Tables } from "./types";
// import { cookies } from "next/headers";
// import { cache } from "react";
// import { users, sessions } from "@server/db/schema";
// import { type Auth, type UserRole } from "@kenstack/deps/types";

import { generateToken, hashToken } from "./token";
import { createUser } from "./user";
import { createAuth as createAuthLocal } from "./auth";

export function createAuth<TSchema extends Tables>(deps: AuthDeps<TSchema>) {
  type Roles = (typeof deps.roles)[number];

  const userDeps = createUser<TSchema, Roles>(deps);
  const { getCurrentUser } = userDeps;

  return {
    generateToken,
    hashToken,
    ...userDeps,
    ...createAuthLocal<TSchema>(deps, { getCurrentUser }),
  };
}
