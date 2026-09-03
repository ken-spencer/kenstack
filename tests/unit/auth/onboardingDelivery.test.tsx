import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PipelineResponse } from "@kenstack/api/PipelineResponse";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  mailer: vi.fn(),
  pipeline: vi.fn(),
  render: vi.fn(),
  selectWhere: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: mocks.selectWhere })),
    })),
  },
}));
vi.mock("@app/email", () => ({
  loadEmailFrom: vi.fn(async () => "sender@example.com"),
}));
vi.mock("@app/modules", () => ({
  modules: { users: { admin: { table: {} } } },
}));
vi.mock("@kenstack/logger", () => ({ audit: mocks.audit }));
vi.mock("@kenstack/api", () => ({
  pipeline: mocks.pipeline,
  pipelineStage: (_options: unknown, action: (context: unknown) => unknown) =>
    action,
}));
vi.mock("@kenstack/auth/handlers/sendOnboarding/Email", () => ({
  attachments: [],
  default: vi.fn(),
}));
vi.mock("@kenstack/lib/mailer", () => ({ default: mocks.mailer }));
vi.mock("@kenstack/lib/user", () => ({
  formatUserName: vi.fn(() => "Test Patron"),
}));
vi.mock("react-email", () => ({ render: mocks.render }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => ({})),
  eq: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
}));

import { sendOnboardingEmailAction } from "@kenstack/auth/handlers/sendOnboarding";

const request = new NextRequest("https://example.com/api/auth");

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
    user: { email: "admin@example.com", id: 7, name: "Admin" },
  });
  return response.toNextResponse();
}

describe("admin onboarding email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pipeline.mockImplementation(runPipeline);
    mocks.render.mockResolvedValue("<p>Your account is ready</p>");
    mocks.selectWhere.mockResolvedValue([
      {
        email: "patron@example.com",
        familyName: "Patron",
        givenName: "Test",
      },
    ]);
    mocks.mailer.mockResolvedValue({ messageId: "message-id", status: "sent" });
  });

  it("sends a non-expiring login prefill without creating authentication proof", async () => {
    const response = await sendOnboardingEmailAction({
      json: { userId: 42 },
      request,
    });

    await expect(response.json()).resolves.toMatchObject({
      status: "success",
    });
    expect(mocks.render).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          invitedBy: "Admin",
          name: "Test Patron",
          url: "https://example.com/login?email=patron%40example.com&notice=onboarding",
        }),
      }),
    );
    expect(mocks.mailer).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Your account is ready",
        to: "patron@example.com",
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith({
      action: "onboarding-email-sent",
      data: { userId: 42 },
      userId: 7,
    });
  });
});
