import { beforeEach, describe, expect, it, vi } from "vitest";

const { errorLog, send } = vi.hoisted(() => ({
  errorLog: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@aws-sdk/client-ses", async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import("@aws-sdk/client-ses")>()),
    SESClient: class {
      send = send;
    },
  };
});
vi.mock("@kenstack/lib/errorLog", () => ({ default: errorLog }));

import mailer from "@kenstack/lib/mailer";

const options = {
  from: "sender@example.com",
  html: "<p>Hello</p>",
  subject: "Test",
  to: "recipient@example.com",
};

describe("mailer delivery results", () => {
  beforeEach(() => {
    errorLog.mockReset();
    send.mockReset();
  });

  it("returns the accepted SES message id", async () => {
    send.mockResolvedValue({ MessageId: "message-1" });

    await expect(mailer(options)).resolves.toEqual({
      messageId: "message-1",
      status: "sent",
    });
  });

  it("treats an unusable success response as operational", async () => {
    send.mockResolvedValue({});

    await expect(mailer(options)).resolves.toEqual({
      attempts: 1,
      code: "MissingMessageId",
      status: "operational-failure",
    });
    expect(errorLog).toHaveBeenCalledWith({
      name: "ses-email-delivery-failed",
      message: "SES email delivery failed (MissingMessageId) after 1 attempt.",
      context: { attempts: 1, code: "MissingMessageId" },
    });
  });

  it("classifies a rejection that explicitly names the recipient", async () => {
    send.mockRejectedValue(
      Object.assign(new Error("Address recipient@example.com was rejected"), {
        name: "InvalidParameterValue",
      }),
    );

    await expect(mailer(options)).resolves.toEqual({
      status: "recipient-rejected",
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("keeps an SES message rejection operational even when it names the recipient", async () => {
    send.mockRejectedValue(
      Object.assign(new Error("recipient@example.com is not verified"), {
        $metadata: { httpStatusCode: 400 },
        name: "MessageRejected",
      }),
    );

    await expect(mailer(options)).resolves.toEqual({
      attempts: 1,
      code: "MessageRejected",
      httpStatusCode: 400,
      status: "operational-failure",
    });
    expect(errorLog).toHaveBeenCalledWith({
      name: "ses-email-delivery-failed",
      message:
        "SES email delivery failed (MessageRejected; HTTP 400) after 1 attempt.",
      context: {
        attempts: 1,
        code: "MessageRejected",
        httpStatusCode: 400,
      },
    });
  });
});
