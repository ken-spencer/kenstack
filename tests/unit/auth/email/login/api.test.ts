import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redeemEmailProof: vi.fn(),
  loadAuthState: vi.fn(),
  loadPublicAuthState: vi.fn(),
  loadFreshPublicAuthState: vi.fn(),
  sendCode: vi.fn(),
  verifyCode: vi.fn(),
  verifyLink: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@kenstack/lib/ip", () => ({ default: vi.fn() }));
vi.mock("@kenstack/api", () => {
  class ReturnedError extends Error {
    code?: string;
    status: number;

    constructor(
      message: string,
      { code, status = 400 }: { code?: string; status?: number } = {},
    ) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }

  return {
    checkQuota: vi.fn(async () => null),
    pipelineStage: (_options: unknown, callback: unknown) => callback,
    recaptcha: vi.fn(),
    ReturnedError,
  };
});
vi.mock("@kenstack/auth/email/login/redeemProof", () => ({
  redeemEmailProof: mocks.redeemEmailProof,
}));
vi.mock("@kenstack/auth/email/verification/sendCode", () => ({
  sendCode: mocks.sendCode,
}));
vi.mock("@kenstack/auth/email/verification/verifyCode", () => ({
  verifyCode: mocks.verifyCode,
}));
vi.mock("@kenstack/auth/email/verification/verifyLink", () => ({
  verifyLink: mocks.verifyLink,
}));
vi.mock("@kenstack/auth/email/verification/Email", () => ({
  createVerificationEmail: vi.fn(),
}));
vi.mock("@kenstack/auth/server/state", () => ({
  loadAuthState: mocks.loadAuthState,
  loadFreshPublicAuthState: mocks.loadFreshPublicAuthState,
  loadPublicAuthState: mocks.loadPublicAuthState,
}));

import { createEmailLogin } from "@kenstack/auth/email/login/api";

const challengeKey = "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55";
type EmailLoginStageContext = Parameters<
  ReturnType<typeof createEmailLogin>["request"]
>[0];

function stageContext(returnTo?: string): EmailLoginStageContext {
  return {
    data: { challengeKey, code: "123456", returnTo },
    response: {
      headers: new Headers(),
      success: vi.fn((value) => value),
    },
  } as unknown as EmailLoginStageContext;
}

function requestContext(returnTo?: string): EmailLoginStageContext {
  return {
    data: {
      email: "person@example.com",
      recaptchaToken: undefined,
      returnTo,
    },
    request: {},
    response: {
      headers: new Headers(),
      success: vi.fn((value) => value),
    },
  } as unknown as EmailLoginStageContext;
}

function createLinkContext(returnTo?: string): EmailLoginStageContext {
  return {
    data: { returnTo, token: "a".repeat(43) },
    response: {
      headers: new Headers(),
      success: vi.fn((value) => value),
    },
  } as unknown as EmailLoginStageContext;
}

const provenState = {
  email: "person@example.com",
  state: "proven",
  verificationId: 3,
};
const signedInState = {
  email: "person@example.com",
  state: "authenticated",
  userId: 12,
};

describe("requestEmailLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redeemEmailProof.mockResolvedValue(12);
  });

  it("rejects an unknown account from an existing proof", async () => {
    mocks.redeemEmailProof.mockRejectedValueOnce(
      Object.assign(new Error("No account"), { status: 409 }),
    );
    mocks.loadAuthState.mockResolvedValue(provenState);

    await expect(
      createEmailLogin().request(requestContext()),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.sendCode).not.toHaveBeenCalled();
    expect(mocks.redeemEmailProof).toHaveBeenCalledOnce();
  });

  it("authenticates an existing account from the existing proof", async () => {
    mocks.loadAuthState.mockResolvedValue(provenState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(signedInState);

    await expect(
      createEmailLogin().request(requestContext("/membership")),
    ).resolves.toEqual({ authState: signedInState, path: "/membership" });
    expect(mocks.redeemEmailProof).toHaveBeenCalledOnce();
    expect(mocks.sendCode).not.toHaveBeenCalled();
  });

  it("preserves an existing proof for enrollment when enabled", async () => {
    mocks.loadAuthState.mockResolvedValue(provenState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(provenState);

    await expect(
      createEmailLogin({ allowUnregistered: true }).request(requestContext()),
    ).resolves.toEqual({ authState: provenState, path: "/" });
    expect(mocks.redeemEmailProof).toHaveBeenCalledWith(provenState, {
      allowUnregistered: true,
    });
    expect(mocks.sendCode).not.toHaveBeenCalled();
  });

  it("returns the challenge key without duplicating the submitted email", async () => {
    mocks.loadAuthState.mockResolvedValue({ state: "anonymous" });
    mocks.sendCode.mockResolvedValue({
      challengeKey,
      email: "person@example.com",
    });

    await expect(createEmailLogin().request(requestContext())).resolves.toEqual(
      {
        authState: { email: "person@example.com", state: "code-sent" },
        challengeKey,
      },
    );
  });
});

describe("verifyEmailLoginCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redeemEmailProof.mockResolvedValue(12);
  });

  it("authenticates an existing account after proof", async () => {
    mocks.verifyCode.mockResolvedValue(provenState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(signedInState);

    await expect(
      createEmailLogin().verifyCode(stageContext()),
    ).resolves.toEqual({ authState: signedInState, path: "/" });
    expect(mocks.redeemEmailProof).toHaveBeenCalledOnce();
  });

  it("rejects an unknown account after proof", async () => {
    mocks.redeemEmailProof.mockRejectedValueOnce(
      Object.assign(new Error("No account"), { status: 409 }),
    );
    mocks.verifyCode.mockResolvedValue({
      email: "person@example.com",
      state: "proven",
      verificationId: 3,
    });

    await expect(
      createEmailLogin().verifyCode(stageContext()),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("only follows a safe internal return path", async () => {
    mocks.verifyCode.mockResolvedValue(provenState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(signedInState);

    await expect(
      createEmailLogin().verifyCode(stageContext("https://evil.example/")),
    ).resolves.toEqual({ authState: signedInState, path: "/" });
    await expect(
      createEmailLogin().verifyCode(stageContext("/membership")),
    ).resolves.toEqual({ authState: signedInState, path: "/membership" });
  });

  it("returns proven state for enrollment when no account exists", async () => {
    mocks.verifyCode.mockResolvedValue(provenState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(provenState);

    await expect(
      createEmailLogin({ allowUnregistered: true }).verifyCode(stageContext()),
    ).resolves.toEqual({ authState: provenState, path: "/" });
    expect(mocks.redeemEmailProof).toHaveBeenCalledWith(provenState, {
      allowUnregistered: true,
    });
  });
});

describe("verifyEmailLoginLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redeemEmailProof.mockResolvedValue(12);
    mocks.loadAuthState.mockResolvedValue({ state: "anonymous" });
  });

  it("authenticates and follows the link's safe return path", async () => {
    mocks.verifyLink.mockResolvedValue(provenState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(signedInState);

    await expect(
      createEmailLogin().verifyLink(createLinkContext("/reset-password")),
    ).resolves.toEqual({
      authState: signedInState,
      path: "/reset-password",
    });
    expect(mocks.verifyLink).toHaveBeenCalledWith("a".repeat(43));
    expect(mocks.redeemEmailProof).toHaveBeenCalledOnce();
  });

  it("refreshes an authenticated session from its own email link", async () => {
    mocks.loadAuthState.mockResolvedValue(signedInState);
    mocks.verifyLink.mockResolvedValue(provenState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(signedInState);

    await expect(
      createEmailLogin().verifyLink(createLinkContext("/reset-password")),
    ).resolves.toEqual({
      authState: signedInState,
      path: "/reset-password",
    });
    expect(mocks.verifyLink).toHaveBeenCalledWith("a".repeat(43));
    expect(mocks.redeemEmailProof).toHaveBeenCalledWith(provenState, {
      allowUnregistered: undefined,
    });
  });

  it("does not follow an unsafe return path when already authenticated", async () => {
    mocks.loadAuthState.mockResolvedValue(signedInState);
    mocks.verifyLink.mockResolvedValue(provenState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(signedInState);

    await expect(
      createEmailLogin().verifyLink(createLinkContext("https://evil.example/")),
    ).resolves.toEqual({ authState: signedInState, path: "/" });
    expect(mocks.redeemEmailProof).toHaveBeenCalledWith(provenState, {
      allowUnregistered: undefined,
    });
  });

  it("rejects an expired link without authenticating", async () => {
    mocks.verifyLink.mockResolvedValue({ state: "expired" });

    await expect(
      createEmailLogin().verifyLink(createLinkContext()),
    ).rejects.toMatchObject({
      code: "expired",
      message:
        "This sign-in link has expired. Request a new email to continue.",
      status: 409,
    });
    expect(mocks.redeemEmailProof).not.toHaveBeenCalled();
  });

  it("reports an invalid link without authenticating", async () => {
    mocks.verifyLink.mockResolvedValue({ state: "invalid" });

    await expect(
      createEmailLogin().verifyLink(createLinkContext()),
    ).rejects.toMatchObject({
      code: "invalid",
      message:
        "This sign-in link is no longer valid. Request a new email to continue.",
      status: 409,
    });
    expect(mocks.redeemEmailProof).not.toHaveBeenCalled();
  });

  it("keeps a link valid when it is opened in another browser", async () => {
    mocks.verifyLink.mockResolvedValue({ state: "wrong-browser" });

    await expect(
      createEmailLogin().verifyLink(createLinkContext()),
    ).rejects.toMatchObject({
      code: "wrong-browser",
      message:
        "This link was opened in a different browser. Open it in the browser where you requested it, or request a new email here. The link is still valid.",
      status: 409,
    });
    expect(mocks.redeemEmailProof).not.toHaveBeenCalled();
  });

  it("directs a signed-in user to sign out without invalidating the link", async () => {
    mocks.verifyLink.mockResolvedValue({ state: "wrong-account" });

    await expect(
      createEmailLogin().verifyLink(createLinkContext()),
    ).rejects.toMatchObject({
      code: "wrong-account",
      message:
        "Sign out of the current account, then open this link again. The link is still valid.",
      status: 409,
    });
    expect(mocks.redeemEmailProof).not.toHaveBeenCalled();
  });

  it("returns proven state from a link for enrollment when enabled", async () => {
    mocks.verifyLink.mockResolvedValue(provenState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(provenState);

    await expect(
      createEmailLogin({ allowUnregistered: true }).verifyLink(
        createLinkContext(),
      ),
    ).resolves.toEqual({ authState: provenState, path: "/" });
    expect(mocks.redeemEmailProof).toHaveBeenCalledWith(provenState, {
      allowUnregistered: true,
    });
  });
});
