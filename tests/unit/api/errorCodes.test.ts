import { describe, expect, it } from "vitest";

import { ReturnedError } from "@kenstack/api/errors";
import { PipelineResponse } from "@kenstack/api/PipelineResponse";

describe("API error codes", () => {
  it("keeps a stable code on a returned error", () => {
    const error = new ReturnedError("User-facing copy", {
      code: "example-conflict",
      status: 409,
    });

    expect(error).toMatchObject({
      code: "example-conflict",
      message: "User-facing copy",
      status: 409,
    });
  });

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
      message: "You are no longer logged in. Please log in and try again.",
      redirect:
        "/login?loginMessage=You%20are%20no%20longer%20logged%20in.%20Please%20log%20in%20and%20try%20again.",
      status: "error",
    });
  });
});
