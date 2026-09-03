import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadFreshPublicAuthState: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@kenstack/auth/server/auth", () => ({ logout: mocks.logout }));
vi.mock("@kenstack/auth/server/state", () => ({
  loadFreshPublicAuthState: mocks.loadFreshPublicAuthState,
}));
vi.mock("@kenstack/api", () => ({
  pipeline: (_options: unknown, stage: unknown) => stage,
  pipelineStage: (_options: unknown, action: unknown) => action,
}));

import { logoutPipeline } from "@kenstack/auth/handlers/logout";

type LogoutAction = (context: {
  response: { success: ReturnType<typeof vi.fn> };
}) => Promise<unknown>;

function logoutAction() {
  return logoutPipeline()({} as never) as unknown as LogoutAction;
}

describe("logout action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the session that remains after logging out", async () => {
    const authState = { email: "admin@example.com", state: "authenticated" };
    mocks.loadFreshPublicAuthState.mockResolvedValue(authState);
    const response = { success: vi.fn((value) => value) };

    await logoutAction()({ response });

    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(
      mocks.loadFreshPublicAuthState.mock.invocationCallOrder[0],
    ).toBeGreaterThan(mocks.logout.mock.invocationCallOrder[0]);
    expect(response.success).toHaveBeenCalledWith({ authState, path: "/" });
  });
});
