/* Public server-only authentication entry point for host applications. */

export * from "./auth";
export { createAccount, updateUser } from "./account";
export {
  loadAuthState,
  loadPublicAuthState,
  type PublicAuthState,
} from "./state";
export {
  getCurrentSession,
  getCurrentUser,
  getFreshCurrentSession,
  requireUser,
  sessionCacheTag,
  userSessionsCacheTag,
} from "./user";
