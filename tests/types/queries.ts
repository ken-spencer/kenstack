import { expectTypeOf } from "vitest";
import { eq, gt, sql } from "drizzle-orm";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

import { db } from "@app/db";

import { defineTable } from "@kenstack/admin/table";
import type { VisibilityValue } from "@kenstack/admin/lib/visibility";
import { getCurrentUser } from "@kenstack/auth/server/user";
import type { Role } from "@kenstack/auth/server/types";
import {
  listQuery,
  type SelectedImage,
  type SelectedMedia,
} from "@kenstack/db/queries";
import { pageQuery } from "@kenstack/db/queries/page";
import { query } from "@kenstack/db/queries/query";

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

  // The joins callback adds joins in place, and rows take their type from `select` alone, so a
  // left-joined column keeps its column type.
  const listTags = defineTable({
    name: "list_query_type_tags",
    columns: {
      label: text("label").notNull(),
      note: text("note"),
    },
  });
  const joinedList = listQuery(titles, {
    draft: false,
    joins: (query) => {
      query.leftJoin(listTags, eq(listTags.id, titles.id));
    },
    select: { id: titles.id, label: listTags.label, note: listTags.note },
  });
  expectTypeOf<Awaited<typeof joinedList>>().toEqualTypeOf<
    { id: number; label: string; note: string | null }[]
  >();
  void joinedList;

  // A page query adds SEO metadata only for tables that enable it.
  const seoArticles = defineTable({
    name: "page_query_type_seo_articles",
    publish: true,
    seo: true,
    columns: {
      slug: text("slug").notNull(),
      title: text("title").notNull(),
    },
  });
  const seoPage = pageQuery(seoArticles, {
    select: { id: seoArticles.id, title: seoArticles.title },
    where: eq(seoArticles.slug, "news"),
  });
  expectTypeOf<Awaited<typeof seoPage>>().toEqualTypeOf<{
    id: number;
    title: string;
    publishedAt: Date | null;
    visibility: VisibilityValue;
    seoTitle: string;
    seoDescription: string;
    ogImage: SelectedImage | null;
  }>();
  type SeoPage = NonNullable<Awaited<typeof seoPage>>;
  expectTypeOf<SeoPage["seoTitle"]>().toEqualTypeOf<string>();
  expectTypeOf<SeoPage["seoDescription"]>().toEqualTypeOf<string>();
  expectTypeOf<SeoPage["ogImage"]>().toEqualTypeOf<SelectedImage | null>();
  void seoPage;

  const plainArticles = defineTable({
    name: "page_query_type_plain_articles",
    publish: true,
    columns: { slug: text("slug").notNull() },
  });
  const plainPage = pageQuery(plainArticles, {
    select: { id: plainArticles.id },
    where: eq(plainArticles.slug, "news"),
  });
  expectTypeOf<Awaited<typeof plainPage>>().toEqualTypeOf<{
    id: number;
    publishedAt: Date | null;
    visibility: VisibilityValue;
  }>();
  void plainPage;

  // The session-based current-user query: Kenstack's own fields, whatever a site's users module
  // adds beside them.
  const currentUser = getCurrentUser();
  expectTypeOf<
    Pick<
      NonNullable<Awaited<typeof currentUser>>,
      | "id"
      | "givenName"
      | "middleName"
      | "familyName"
      | "email"
      | "avatar"
      | "roles"
      | "impersonatedBy"
      | "name"
      | "initials"
    >
  >().toEqualTypeOf<{
    id: number;
    givenName: string;
    middleName: string;
    familyName: string;
    email: string;
    avatar: SelectedMedia | null;
    roles: Role[];
    impersonatedBy?: number;
    name: string;
    initials: string;
  }>();
  void currentUser;

  // The query builder: selections merge, conditions AND, joins accumulate, in any order, and rows
  // infer exactly as the hand-written Drizzle query.
  type Row<T> = Awaited<T> extends (infer R)[] ? R : never;
  const people = pgTable("query_type_people", {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
  });
  const profiles = pgTable("query_type_profiles", {
    id: serial("id").primaryKey(),
    personId: integer("person_id").notNull(),
    bio: text("bio").notNull(),
  });
  const memberships = pgTable("query_type_memberships", {
    id: serial("id").primaryKey(),
    personId: integer("person_id").notNull(),
    plan: text("plan").notNull(),
  });
  const ticketCount = sql<
    string | null
  >`(select max(x) from t where t.person_id = ${people.id})`;

  const merged = query(people)
    .select({ id: people.id, email: people.email })
    .select({ name: people.name, ticketCount })
    .build();
  expectTypeOf<Row<typeof merged>>().toEqualTypeOf<{
    id: number;
    email: string;
    name: string | null;
    ticketCount: string | null;
  }>();
  const overridden = query(people)
    .select({ label: people.email })
    .select({ label: people.name })
    .build();
  expectTypeOf<Row<typeof overridden>>().toEqualTypeOf<{
    label: string | null;
  }>();

  const joined = query(people)
    .select({ id: people.id, bio: profiles.bio, plan: memberships.plan })
    .leftJoin(profiles, eq(profiles.personId, people.id))
    .innerJoin(memberships, eq(memberships.personId, people.id))
    .where(eq(people.email, "a@b.c"))
    .where(gt(people.id, 5))
    .build();
  expectTypeOf<Row<typeof joined>>().toEqualTypeOf<{
    id: number;
    bio: string | null;
    plan: string;
  }>();
  const reordered = query(people)
    .innerJoin(memberships, eq(memberships.personId, people.id))
    .where(gt(people.id, 5))
    .select({ plan: memberships.plan })
    .leftJoin(profiles, eq(profiles.personId, people.id))
    .select({ bio: profiles.bio })
    .where(eq(people.email, "a@b.c"))
    .select({ id: people.id })
    .build();
  expectTypeOf<Row<typeof reordered>>().toEqualTypeOf<Row<typeof joined>>();

  const handWritten = db
    .select({ id: people.id, bio: profiles.bio, plan: memberships.plan })
    .from(people)
    .leftJoin(profiles, eq(profiles.personId, people.id))
    .innerJoin(memberships, eq(memberships.personId, people.id))
    .where(gt(people.id, 5));
  expectTypeOf<Awaited<typeof joined>>().toEqualTypeOf<
    Awaited<typeof handWritten>
  >();
  const limited = joined.orderBy(people.id).limit(10);
  expectTypeOf<Awaited<typeof limited>>().toEqualTypeOf<
    Awaited<typeof handWritten>
  >();
  // @ts-expect-error a left-joined column is nullable
  expectTypeOf<Row<typeof joined>["bio"]>().toEqualTypeOf<string>();
  // The built query leaves where() out, also after chaining, and the methods that would bring it back,
  // so its own methods cannot replace the combined conditions.
  expectTypeOf(joined).not.toHaveProperty("where");
  expectTypeOf(joined).not.toHaveProperty("$dynamic");
  expectTypeOf(joined).not.toHaveProperty("union");
  expectTypeOf(joined).not.toHaveProperty("$withCache");
  expectTypeOf(joined.orderBy(people.id)).not.toHaveProperty("where");
  expectTypeOf(joined.limit(10)).not.toHaveProperty("where");
  expectTypeOf(limited).not.toHaveProperty("where");
  // @ts-expect-error a hand-written dynamic query keeps where()
  expectTypeOf(handWritten.$dynamic()).not.toHaveProperty("where");
  void handWritten;
  void merged;
  void overridden;
  void reordered;
  void limited;
}
