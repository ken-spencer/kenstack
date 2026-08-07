import { describe, expect, it, vi } from "vitest";
import * as z from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { dateField } from "@kenstack/fields";
import { resolveServerFields } from "@kenstack/fields/internal/serverResolution";

describe("server date fields", () => {
  it("accepts an empty optional date transformed to null by its field schema", () => {
    const fields = defineFields({
      fields: {
        date: dateField({
          zod: z.preprocess(
            (value) => (value === "" ? null : value),
            z.iso.date().nullable(),
          ),
        }),
      },
    });
    const resolved = resolveServerFields(fields);

    expect(resolved.date.zod.parse("")).toBeNull();
    expect(resolved.date.zod.parse(null)).toBeNull();
  });
});
