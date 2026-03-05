import {
  integer,
  pgTable,
  text,
  jsonb,
  timestamp,
  // varchar,
  // index,
  uniqueIndex,
  type AnyPgTable,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { image } from "@kenstack/schemas/atoms";
import * as z from "zod";

type AnyPgTableWithId = AnyPgTable & {
  id: AnyPgColumn;
};

type Image = z.infer<ReturnType<typeof image>>;

// type OrgTableWithId = AnyPgTable & { id: AnyColumn };

const fields = {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  slug: text("slug").notNull(), // per-page identifier (e.g. "home", "about")

  title: text("title"),
  description: text("description"),
  image: jsonb("image").$type<Image>(),
  content: text("content"),

  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),

  data: jsonb("data").$type<Record<string, unknown>>(), // custom fields.

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

const createContentWithoutOrg = () =>
  pgTable(
    "content",
    {
      ...fields,
    },
    (t) => [uniqueIndex("content_slug_unique").on(t.slug)]
  );

const createContentWithOrg = <TOrg extends AnyPgTableWithId>(
  organizations: TOrg
) =>
  pgTable(
    "content",
    {
      ...fields,
      orgId: integer("org_id")
        .notNull()
        .references(() => organizations.id),
    },
    (t) => [uniqueIndex("content_org_slug_unique").on(t.orgId, t.slug)]
  );

export function createContent<TOrg extends AnyPgTableWithId>(args: {
  organizations: TOrg;
}): ReturnType<typeof createContentWithOrg>;
export function createContent(): ReturnType<typeof createContentWithoutOrg>;
export function createContent(args?: { organizations?: AnyPgTableWithId }) {
  if (args?.organizations) {
    return createContentWithOrg(args.organizations);
  }

  return createContentWithoutOrg();
}
