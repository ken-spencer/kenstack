import { describe, expect, it } from "vitest";
import { lintSource } from "./lintSource";

describe("shared cleanup lint rules", () => {
  it("rejects manual field markers", async () => {
    const messages = await lintSource(`
      const manualField = { __kenstackField: true };
    `);

    expect(
      messages.filter(({ ruleId }) => ruleId === "no-restricted-syntax"),
    ).toHaveLength(1);
  });

  it("rejects restated field defaults", async () => {
    const messages = await lintSource(`
      field({
        default: "",
        kind: "title",
        revisions: true,
        searchable: false,
        zod: titleSchema,
      });
    `);

    expect(
      messages.filter(({ ruleId }) => ruleId === "no-restricted-syntax"),
    ).toHaveLength(2);
  });

  it("rejects locally inferrable primitive annotations", async () => {
    const messages = await lintSource(`
      const attempts: number = 0;
    `);

    expect(
      messages.filter(
        ({ ruleId }) => ruleId === "@typescript-eslint/no-inferrable-types",
      ),
    ).toHaveLength(1);
  });

  it("rejects field units importing their public aggregate", async () => {
    const messages = await lintSource(
      `import { textField } from "..";`,
      "src/fields/address/eslint-rule-probe.ts",
    );

    expect(
      messages.filter(({ ruleId }) => ruleId === "import/no-restricted-paths"),
    ).toHaveLength(1);
  });
});
