import { describe, expect, it } from "vitest";

import {
  formErrorName,
  getFormFieldErrors,
  hasRegisteredField,
  moveRootFormError,
} from "@kenstack/forms/internal/fieldErrors";

describe("form field errors", () => {
  it("flattens nested errors without changing their stored structure", () => {
    const errors = {
      movie: {
        language: { message: "Select a language", type: "validation" },
        sourceId: { message: "Enter a source ID", type: "validation" },
      },
      posterImage: {
        width: { message: "Image width is required", type: "validation" },
      },
      showtimes: [
        {
          startsAt: {
            message: "Enter a showtime",
            type: "validation",
          },
        },
      ],
      root: {
        server: {
          0: { message: "Review the whole form", type: "validation" },
        },
      },
      [formErrorName]: {
        message: "Choose compatible options",
        type: "validation",
      },
    };

    expect(getFormFieldErrors(errors)).toEqual([
      { message: "Select a language", name: "movie.language" },
      { message: "Enter a source ID", name: "movie.sourceId" },
      { message: "Image width is required", name: "posterImage.width" },
      { message: "Enter a showtime", name: "showtimes.0.startsAt" },
      { message: "Review the whole form", name: "root.server.0" },
      { message: "Choose compatible options", name: formErrorName },
    ]);
  });

  it("preserves errors for fields whose names overlap field error metadata", () => {
    const errors = {
      movie: {
        message: { message: "Enter a public message", type: "validation" },
        type: { message: "Select a movie type", type: "validation" },
      },
    };

    expect(getFormFieldErrors(errors)).toEqual([
      { message: "Enter a public message", name: "movie.message" },
      { message: "Select a movie type", name: "movie.type" },
    ]);
  });

  it("matches errors to the nearest registered field ancestor", () => {
    const fields = {
      movie: {
        language: { _f: { name: "movie.language" } },
      },
      posterImage: { _f: { name: "posterImage" } },
    };

    expect(hasRegisteredField(fields, "movie.language")).toBe(true);
    expect(hasRegisteredField(fields, "posterImage.width")).toBe(true);
    expect(hasRegisteredField(fields, "movie.sourceId")).toBe(false);
  });

  it("preserves every distinct message for one field", () => {
    expect(
      getFormFieldErrors({
        password: {
          message: "Use at least eight characters",
          type: "server",
          types: {
            "server.0": "Use at least eight characters",
            "server.1": "Include a number",
          },
        },
      }),
    ).toEqual([
      { message: "Use at least eight characters", name: "password" },
      { message: "Include a number", name: "password" },
    ]);
  });

  it("moves pathless schema errors away from React Hook Form's reserved root", () => {
    const emailError = { message: "Enter an email", type: "validation" };
    const rootError = {
      message: "Choose compatible options",
      type: "validation",
    };

    expect(moveRootFormError({ email: emailError, root: rootError })).toEqual({
      email: emailError,
      [formErrorName]: rootError,
    });
  });
});
