import { describe, expect, it } from "vitest";
import { lintSource } from "./lintSource";

async function lintClient(source: string) {
  return (await lintSource(source)).filter(
    ({ ruleId }) => ruleId === "kenstack/no-client-server-import",
  );
}

describe("kenstack/no-client-server-import", () => {
  it("rejects runtime imports from server-owned modules in client files", async () => {
    await expect(
      lintClient(`
        "use client";
        import { db } from "@app/db";
        import { events } from "@/modules/events/tables";
        export { loadEvents } from "../queries";
        const loadRecord = () => import("@kenstack/records");
      `),
    ).resolves.toHaveLength(4);
  });

  it("allows type-only imports and explicit client-safe API modules", async () => {
    await expect(
      lintClient(`
        "use client";
        import fetcher from "@kenstack/api/fetcher";
        import { rasterMimeTypes } from "@kenstack/db/tables/media/mimeTypes";
        import type { EventRow } from "../queries";
        import { type EventTable } from "@kenstack/db/tables";
      `),
    ).resolves.toHaveLength(0);
  });

  it("does not restrict server files", async () => {
    await expect(
      lintClient(`
        import { db } from "@app/db";
        import { events } from "@/modules/events/tables";
      `),
    ).resolves.toHaveLength(0);
  });
});
