import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import * as z from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({
  deps: {
    error: vi.fn(),
  },
}));

import pipeline, { pipelineStage } from "@kenstack/api/pipeline";

describe("API field errors", () => {
  it("preserves nested field paths and form-level errors", async () => {
    const schema = z
      .object({
        movie: z.object({
          language: z.string().min(2, "Select a language"),
        }),
        showtimes: z.array(
          z.object({ startsAt: z.string().min(1, "Enter a start time") }),
        ),
      })
      .refine(() => false, "Review the whole form");
    const request = new NextRequest("https://kenstack.local/api", {
      body: JSON.stringify({
        movie: { language: "" },
        showtimes: [{ startsAt: "" }],
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const response = await pipeline(
      { request },
      pipelineStage({ schema }, () => {
        throw new Error("Validation should stop the pipeline");
      }),
    );

    expect(await response.json()).toEqual({
      fieldErrors: {
        "movie.language": ["Select a language"],
        "showtimes.0.startsAt": ["Enter a start time"],
      },
      formErrors: ["Review the whole form"],
      message: "Please review the form and correct the highlighted fields.",
      status: "error",
    });
  });
});
