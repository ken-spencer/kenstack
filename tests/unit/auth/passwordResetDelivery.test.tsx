import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PipelineResponse } from "@kenstack/api/PipelineResponse";

const {
  audit,
  createInsert,
  createUpdate,
  guardPublicEmailRequest,
  insertValues,
  mailer,
  render,
  selectWhere,
  transaction,
  updateWhere,
  table,
} = vi.hoisted(() => {
  const insertValues = vi.fn();
  const updateWhere = vi.fn();

  return {
    audit: vi.fn(),
    createInsert: () => ({ values: insertValues }),
    createUpdate: () => ({
      set: vi.fn(() => ({ where: updateWhere })),
    }),
    guardPublicEmailRequest: vi.fn(),
    insertValues,
    mailer: vi.fn(),
    render: vi.fn(),
    selectWhere: vi.fn(),
    table: {},
    transaction: vi.fn(),
    updateWhere,
  };
});

vi.mock("@app/deps", () => ({
  deps: {
    db: {
      insert: vi.fn(createInsert),
      select: vi.fn(() => ({
        from: vi.fn(() => ({ where: selectWhere })),
      })),
      transaction,
      update: vi.fn(createUpdate),
    },
    email: { from: "sender@example.com" },
    logger: { audit },
    tables: {
      passwordResetRequests: table,
      users: table,
    },
  },
}));

vi.mock("@kenstack/api", () => ({
  guardPublicEmailRequest,
  pipeline: vi.fn(),
  pipelineStage: (_options: unknown, action: (context: unknown) => unknown) =>
    action,
}));
vi.mock("@kenstack/auth/email/ForgotPassword", () => ({
  attachments: [],
  default: vi.fn(),
}));
vi.mock("@kenstack/lib/mailer", () => ({ default: mailer }));
vi.mock("@kenstack/lib/user", () => ({
  formatUserName: vi.fn(() => "Patron"),
}));
vi.mock("react-email", () => ({ render }));
vi.mock("@vercel/functions", () => ({
  geolocation: vi.fn(() => ({})),
  ipAddress: vi.fn(() => "127.0.0.1"),
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => ({})),
  eq: vi.fn(() => ({})),
  gte: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
}));

import { forgottenPasswordAction } from "@kenstack/auth/handlers/forgotPassword";
import { sendPasswordResetAction } from "@kenstack/auth/handlers/sendPasswordReset";

const request = new NextRequest("https://example.com/api/password-reset");
const customer = {
  email: "patron@example.com",
  familyName: "Patron",
  givenName: "Test",
};
const admin = { email: "admin@example.com", name: "Admin" };

function responsePayload(response: PipelineResponse) {
  return response.toNextResponse().json();
}

async function runForgottenPassword() {
  const response = new PipelineResponse();
  await forgottenPasswordAction({ from: "sender@example.com" })({
    data: { email: customer.email, recaptchaToken: "token" },
    dataIn: {},
    request,
    response,
  } as never);
  return responsePayload(response);
}

async function runAdministrativePasswordReset() {
  const response = new PipelineResponse();
  await sendPasswordResetAction({ from: "sender@example.com" })({
    data: { userId: 42 },
    dataIn: {},
    request,
    response,
    user: admin,
  } as never);
  return { payload: await responsePayload(response), response };
}

describe("password reset email delivery results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(6_000);
    guardPublicEmailRequest.mockResolvedValue(undefined);
    insertValues.mockResolvedValue(undefined);
    render.mockResolvedValue("<p>Reset password</p>");
    selectWhere.mockResolvedValue([customer]);
    transaction.mockImplementation(async (callback) =>
      callback({ insert: createInsert, update: createUpdate }),
    );
    updateWhere.mockResolvedValue(undefined);
  });

  it("preserves the generic public response after operational delivery failure", async () => {
    mailer.mockResolvedValue({
      attempts: 3,
      code: "ThrottlingException",
      httpStatusCode: 429,
      status: "operational-failure",
    });

    const payload = await runForgottenPassword();

    expect(payload).toMatchObject({ status: "success" });
  });

  it("does not record administrative recipient rejection as sent", async () => {
    mailer.mockResolvedValue({ status: "recipient-rejected" });

    const { payload } = await runAdministrativePasswordReset();

    expect(payload).toEqual({
      message:
        "The user's email address could not receive the password reset email.",
      status: "error",
    });
    expect(audit).not.toHaveBeenCalled();
  });

  it("returns an administrative delivery error without recording success", async () => {
    mailer.mockResolvedValue({
      attempts: 1,
      code: "ServiceUnavailable",
      status: "operational-failure",
    });

    const { payload, response } = await runAdministrativePasswordReset();

    expect(response.toNextResponse().status).toBe(503);
    expect(payload).toEqual({
      message:
        "The password reset email could not be sent. Please try again later.",
      status: "error",
    });
    expect(audit).not.toHaveBeenCalled();
  });

  it("records and returns administrative success after confirmed delivery", async () => {
    mailer.mockResolvedValue({ messageId: "message-id", status: "sent" });

    const { payload } = await runAdministrativePasswordReset();

    expect(audit).toHaveBeenCalledWith({
      action: "password-reset-sent",
      data: { userId: 42 },
    });
    expect(mailer.mock.invocationCallOrder[0]).toBeLessThan(
      audit.mock.invocationCallOrder[0],
    );
    expect(payload).toEqual({
      message: `An email has been sent to ${customer.email}`,
      status: "success",
    });
  });
});
