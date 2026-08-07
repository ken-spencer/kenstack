import "server-only";

import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import isEqual from "lodash-es/isEqual";
import type * as z from "zod";

import { tags as tagsTable, type TagsTable } from "@kenstack/db/tables/tags";
import { tagField as createTagField, tagsSchema } from ".";
import type { ServerDefinedFields } from "../internal/serverResolution";
import {
  serverField,
  type FieldSaveContext,
  type ServerFieldResolverFor,
} from "../serverField";

export function tagField({
  table,
}: {
  table: TagsTable;
}): ServerFieldResolverFor<ReturnType<typeof createTagField>> {
  return serverField(createTagField(), () => ({
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
        tags: value,
        tableId,
        tagRelations: table,
      });
    },
  }));
}

export function isTagField(
  field: ServerDefinedFields[string] | undefined,
): field is ServerDefinedFields[string] & {
  tagRelations: TagsTable;
} {
  return Boolean(field?.tagRelations);
}

const saveTags = async ({
  db,
  tags,
  tableId,
  tagRelations,
}: {
  db: FieldSaveContext["db"];
  tags: z.output<typeof tagsSchema>;
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
