import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useUserInfo } from "@kenstack/auth/useUserInfo";
import type { PublicAuthState } from "@kenstack/auth/server/state";

function createAuthenticatedState(
  email: string,
  userId: number,
): PublicAuthState {
  return {
    avatar: null,
    email,
    familyName: "",
    givenName: email,
    initials: email.slice(0, 2).toUpperCase(),
    name: email,
    roles: [],
    state: "authenticated",
    userId,
  };
}

function AuthState({ authState }: { authState?: PublicAuthState }) {
  const auth = useUserInfo(authState);
  return (
    <span>
      {auth.state === "authenticated"
        ? `${auth.state}:${auth.email}`
        : auth.state}
    </span>
  );
}

describe("useUserInfo server rendering", () => {
  it("keeps initial auth state isolated to its request", () => {
    const firstRequest = renderToStaticMarkup(
      <AuthState
        authState={createAuthenticatedState("first@example.com", 1)}
      />,
    );
    const requestWithoutAuthState = renderToStaticMarkup(<AuthState />);
    const secondRequest = renderToStaticMarkup(
      <AuthState
        authState={createAuthenticatedState("second@example.com", 2)}
      />,
    );

    expect(firstRequest).toBe("<span>authenticated:first@example.com</span>");
    expect(requestWithoutAuthState).toBe("<span>loading</span>");
    expect(secondRequest).toBe("<span>authenticated:second@example.com</span>");
  });
});
