import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import isEqual from "lodash-es/isEqual";
import type * as z from "zod";

import { tags as tagsTable, type TagsTable } from "@kenstack/db/tables/tags";
import type { deps } from "@app/deps";
import { tagsSchema } from "@kenstack/zod/tags";
import type { DefinedField } from "../types";
import type { ServerDefinedFields, ServerFieldResolver } from ".";

export function tagField({
  table,
}: {
  table: TagsTable;
}): ServerFieldResolver<DefinedField<"tags">> {
  return () => ({
    tagRelations: table,
    async load({ db, tableId }) {
      return db
        .select({
          name: tagsTable.name,
          slug: tagsTable.slug,
        })
        .from(table)
        .innerJoin(tagsTable, eq(table.tagId, tagsTable.id))
        .where(eq(table.tableId, tableId))
        .orderBy(asc(tagsTable.name));
    },
    async save({ db, tableId, value }) {
      return saveTags({
        db,
        tags: value as z.output<typeof tagsSchema>,
        tableId,
        tagRelations: table,
      });
    },
  });
}

export function isTagField(
  field: ServerDefinedFields[string] | undefined,
): field is ServerDefinedFields[string] & {
  kind: "tags";
  tagRelations: TagsTable;
} {
  return field?.kind === "tags" && Boolean(field.tagRelations);
}

type TagInput = z.output<typeof tagsSchema>[number];

const saveTags = async ({
  db,
  tags,
  tableId,
  tagRelations,
}: {
  db: Pick<typeof deps.db, "delete" | "insert" | "select">;
  tags: TagInput[];
  tableId: number;
  tagRelations: TagsTable;
}) => {
  const slugs = tags.map((tag) => tag.slug);
  const currentTags = await db
    .select({
      id: tagsTable.id,
      name: tagsTable.name,
      slug: tagsTable.slug,
    })
    .from(tagRelations)
    .innerJoin(tagsTable, eq(tagRelations.tagId, tagsTable.id))
    .where(eq(tagRelations.tableId, tableId))
    .orderBy(asc(tagsTable.name));
  const selectedSlugs = [...new Set(slugs)].sort();
  const currentSlugs = [...new Set(currentTags.map((tag) => tag.slug))].sort();

  if (isEqual(selectedSlugs, currentSlugs)) {
    return currentTags.map(({ name, slug }) => ({ name, slug }));
  }

  if (slugs.length === 0) {
    await db.delete(tagRelations).where(eq(tagRelations.tableId, tableId));

    return [];
  }

  await db.insert(tagsTable).values(tags).onConflictDoNothing({
    target: tagsTable.slug,
  });

  const savedTags = await db
    .select({
      id: tagsTable.id,
      name: tagsTable.name,
      slug: tagsTable.slug,
    })
    .from(tagsTable)
    .where(inArray(tagsTable.slug, slugs))
    .orderBy(asc(tagsTable.name));

  const tagIds = savedTags.map((tag) => tag.id);

  await db
    .delete(tagRelations)
    .where(
      and(
        eq(tagRelations.tableId, tableId),
        notInArray(tagRelations.tagId, tagIds),
      ),
    );

  if (tagIds.length === 0) {
    return [];
  }

  await db
    .insert(tagRelations)
    .values(
      tagIds.map((tagId) => ({
        tableId,
        tagId,
      })),
    )
    .onConflictDoNothing();

  return savedTags.map(({ name, slug }) => ({ name, slug }));
};
