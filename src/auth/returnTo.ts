import type { PublicAuthState } from "@kenstack/auth/server/state";

export function getSafeReturnToPath(
  value?: string | null,
  { allowLogin = false }: { allowLogin?: boolean } = {},
): `/${string}` | undefined {
  const path = value?.trim();

  if (
    !path ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) {
    return;
  }

  const pathname = path.split(/[?#]/, 1)[0];

  if (pathname === "/login" && !allowLogin) {
    return;
  }

  return path as `/${string}`;
}

export type LoginDestination = (
  user: Extract<PublicAuthState, { state: "authenticated" }>,
) => string | Promise<string>;

// A safe returnTo always wins; the host's loginDestination is consulted only
// without one, and its answer passes the same safety check.
export async function resolveLoginDestination(
  returnTo: string | null | undefined,
  authState: PublicAuthState,
  loginDestination?: LoginDestination,
): Promise<string> {
  const safeReturnTo = getSafeReturnToPath(returnTo);
  if (safeReturnTo) {
    return safeReturnTo;
  }
  if (loginDestination && authState.state === "authenticated") {
    return getSafeReturnToPath(await loginDestination(authState)) ?? "/";
  }

  return "/";
}
