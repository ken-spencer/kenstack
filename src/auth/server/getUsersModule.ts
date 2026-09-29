import { modules } from "@app/modules";

// What a users module leaves out, or a plain defineModule one lacks.
const usersDefaults = {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  currentUser: { select: (_users: unknown) => ({}) },
  publicUser: (_user: unknown) => ({}),
  loginDestination: (_user: unknown) => "/",
  /* eslint-enable @typescript-eslint/no-unused-vars */
  passwordPath: "/reset-password",
};

// Read on each call: the registry may still be loading when this file is first imported.
export function getUsersModule() {
  return { ...usersDefaults, ...modules.users };
}
