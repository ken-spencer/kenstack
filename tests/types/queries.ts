import { expectTypeOf } from "vitest";
import { sql } from "drizzle-orm";
import { text } from "drizzle-orm/pg-core";

import { defineTable } from "@kenstack/admin/table";
import { listQuery } from "@kenstack/db/queries";

// TypeScript compiles this block; Vitest does not treat these contracts as runtime tests.
if (false) {
  const titles = defineTable({
    name: "list_query_type_titles",
    publish: true,
    columns: { title: text("title").notNull() },
  });
  const listed = listQuery(titles, {
    draft: false,
    select: {
      id: titles.id,
      title: titles.title,
      tags: sql<string[]>`'{}'::text[]`,
    },
  });
  expectTypeOf<Awaited<typeof listed>>().toEqualTypeOf<
    { id: number; title: string; tags: string[] }[]
  >();
  void listed;
}
