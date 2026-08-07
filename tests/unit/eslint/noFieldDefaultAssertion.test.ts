import { describe, expect, it } from "vitest";
import { lintSource } from "./lintSource";

async function lintField(source: string) {
  return (await lintSource(source)).filter(
    ({ ruleId }) => ruleId === "kenstack/no-field-default-assertion",
  );
}

describe("kenstack/no-field-default-assertion", () => {
  it("rejects assertions on field defaults", async () => {
    await expect(
      lintField(`
        field({ default: [] as Item[], kind: "items", zod: itemSchema });
        defineField({ default: null as Item | null, kind: "item", zod: itemSchema });
        textField({ default: "example" as string });
      `),
    ).resolves.toHaveLength(3);
  });

  it("allows bare defaults, const assertions, and unrelated APIs", async () => {
    await expect(
      lintField(`
        field({ default: [], kind: "items", zod: itemSchema });
        textField({ default: "example" as const });
        configure({ default: null as Item | null });
      `),
    ).resolves.toHaveLength(0);
  });
});
