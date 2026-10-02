import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useUserInfo } from "@kenstack/auth/useUserInfo";
import type { PublicAuthState } from "@kenstack/auth/server/state";

function AuthState({ authState }: { authState?: PublicAuthState }) {
  const auth = useUserInfo(authState);
  return (
    <span>
      {auth.state === "proven" ? `${auth.state}:${auth.email}` : auth.state}
    </span>
  );
}

describe("useUserInfo server rendering", () => {
  it("keeps initial auth state isolated to its request", () => {
    const firstRequest = renderToStaticMarkup(
      <AuthState authState={{ email: "first@example.com", state: "proven" }} />,
    );
    const requestWithoutAuthState = renderToStaticMarkup(<AuthState />);
    const secondRequest = renderToStaticMarkup(
      <AuthState
        authState={{ email: "second@example.com", state: "proven" }}
      />,
    );

    expect(firstRequest).toBe("<span>proven:first@example.com</span>");
    expect(requestWithoutAuthState).toBe("<span>loading</span>");
    expect(secondRequest).toBe("<span>proven:second@example.com</span>");
  });
});
