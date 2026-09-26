import { describe, expect, it } from "vitest";

import { PipelineResponse } from "@kenstack/api/PipelineResponse";

describe("API error codes", () => {
  it("includes the code in an error response", async () => {
    const response = new PipelineResponse()
      .error({
        code: "example-conflict",
        message: "User-facing copy",
        status: 409,
      })
      .toNextResponse();

    await expect(response.json()).resolves.toEqual({
      code: "example-conflict",
      message: "User-facing copy",
      status: "error",
    });
    expect(response.status).toBe(409);
  });

  it("returns a valid API error when redirecting an expired session", async () => {
    const response = new PipelineResponse().redirectToLogin().toNextResponse();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      redirect: expect.stringMatching(/^\/login/),
      status: "error",
    });
  });
});
