import { describe, expect, it } from "vitest";
import { lintSource } from "./lintSource";

async function lintAwaitedSpread(source: string) {
  return (await lintSource(source, "src/eslint-rule-probe.tsx")).filter(
    ({ ruleId }) => ruleId === "kenstack/no-awaited-jsx-spread",
  );
}

describe("kenstack/no-awaited-jsx-spread", () => {
  it("rejects awaited operations evaluated inside JSX spreads", async () => {
    await expect(
      lintAwaitedSpread(`
        async function Example({ ready }) {
          return (
            <>
              <Widget {...await loadProps()} />
              <Widget {...(ready ? await loadPrimary() : await loadFallback())} />
            </>
          );
        }
      `),
    ).resolves.toHaveLength(2);
  });

  it("allows resolved spreads, ordinary awaited props, and deferred awaits", async () => {
    await expect(
      lintAwaitedSpread(`
        async function Example() {
          const props = await loadProps();

          return (
            <Widget
              {...props}
              items={await loadItems()}
              {...{ onSave: async () => await save() }}
            />
          );
        }
      `),
    ).resolves.toHaveLength(0);
  });
});
