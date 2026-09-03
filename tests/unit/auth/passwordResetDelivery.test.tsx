import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PipelineResponse } from "@kenstack/api/PipelineResponse";

const mocks = vi.hoisted(() => ({
  checkQuota: vi.fn(),
  claimQuota: vi.fn(),
  pipeline: vi.fn(),
  recaptcha: vi.fn(),
  render: vi.fn(),
  selectWhere: vi.fn(),
  sendVerificationLink: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: {
    select: vi.fn(() => {
      const query = {
        from: vi.fn(),
        limit: mocks.selectWhere,
        where: vi.fn(),
      };
      query.from.mockReturnValue(query);
      query.where.mockReturnValue(query);
      return query;
    }),
  },
}));
vi.mock("@app/email", () => ({
  loadEmailFrom: vi.fn(async () => "sender@example.com"),
}));
vi.mock("@app/modules", () => ({
  modules: { users: { admin: { table: {} } } },
}));
vi.mock("@kenstack/logger", () => ({ audit: vi.fn() }));
vi.mock("@kenstack/api", () => {
  class ReturnedError extends Error {
    status: number;

    constructor(message: string, { status = 400 }: { status?: number } = {}) {
      super(message);
      this.status = status;
    }
  }

  return {
    checkQuota: mocks.checkQuota,
    claimQuota: mocks.claimQuota,
    pipeline: mocks.pipeline,
    pipelineStage: (_options: unknown, action: (context: unknown) => unknown) =>
      action,
    recaptcha: mocks.recaptcha,
    ReturnedError,
  };
});
vi.mock("@kenstack/auth/handlers/forgotPassword/Email", () => ({
  attachments: [],
  default: vi.fn(),
}));
vi.mock("@kenstack/auth/email/verification/sendCode", () => ({
  sendVerificationLink: mocks.sendVerificationLink,
}));
vi.mock("@kenstack/lib/ip", () => ({
  default: vi.fn(async () => "127.0.0.1"),
}));
vi.mock("@kenstack/lib/user", () => ({
  formatUserName: vi.fn(() => "Patron"),
}));
vi.mock("react-email", () => ({ render: mocks.render }));
vi.mock("@vercel/functions", () => ({ geolocation: vi.fn(() => ({})) }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}));

import { ReturnedError } from "@kenstack/api";
import { forgotPasswordPipeline } from "@kenstack/auth/handlers/forgotPassword";

const request = new NextRequest("https://example.com/api/auth");
const customer = {
  email: "patron@example.com",
  familyName: "Patron",
  givenName: "Test",
};
const admin = { email: "admin@example.com", name: "Admin" };

async function runPipeline(
  options: { json?: Record<string, unknown>; request: NextRequest },
  action: (context: unknown) => Promise<unknown>,
) {
  const response = new PipelineResponse();
  await action({
    data: options.json,
    dataIn: options.json,
    request: options.request,
    response,
    user: admin,
  });
  return response.toNextResponse();
}

async function runForgottenPassword() {
  const response = await forgotPasswordPipeline({
    from: "sender@example.com",
  })({
    request,
    json: { email: customer.email, recaptchaToken: "token" },
  });
  return response.json();
}

describe("password recovery email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pipeline.mockImplementation(runPipeline);
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(6_000);
    mocks.checkQuota.mockResolvedValue(null);
    mocks.claimQuota.mockResolvedValue(null);
    mocks.recaptcha.mockResolvedValue(undefined);
    mocks.render.mockResolvedValue("<p>Reset password</p>");
    mocks.selectWhere.mockResolvedValue([customer]);
    mocks.sendVerificationLink.mockResolvedValue(undefined);
  });

  it("sends the familiar recovery email through an email-login link", async () => {
    mocks.sendVerificationLink.mockImplementation(
      async (_input, createVerificationEmail) => {
        await createVerificationEmail({
          code: "123456",
          email: customer.email,
          expiresInMinutes: 4,
          url: "https://example.com/login?token=token",
        });
      },
    );
    const payload = await runForgottenPassword();

    expect(payload).toMatchObject({ status: "success" });
    expect(mocks.sendVerificationLink).toHaveBeenCalledWith(
      expect.objectContaining({
        email: customer.email,
        linkPath: "/login?returnTo=%2Freset-password",
      }),
      expect.any(Function),
    );
    expect(mocks.render.mock.calls[0]?.[0]).toMatchObject({
      props: { expiresInMinutes: 4 },
    });
  });

  it("creates a decoy verification when the account is missing", async () => {
    mocks.selectWhere.mockResolvedValue([]);

    const payload = await runForgottenPassword();

    expect(payload).toMatchObject({ status: "success" });
    expect(mocks.sendVerificationLink).toHaveBeenCalledWith(
      expect.objectContaining({
        email: customer.email,
        isDecoy: true,
      }),
      expect.any(Function),
    );
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it("keeps the generic response when verification preparation is rejected", async () => {
    mocks.sendVerificationLink.mockRejectedValue(
      new ReturnedError("Delivery failed", { status: 503 }),
    );

    const payload = await runForgottenPassword();

    expect(payload).toMatchObject({ status: "success" });
  });
});
