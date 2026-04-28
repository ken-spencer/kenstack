import { and, eq, inArray, notInArray, asc } from "drizzle-orm";
import { tags as tagsTable, type TagsTable } from "@kenstack/db/tables/tags";
import { deps } from "@app/deps";

type TagInput = {
  name: string;
  slug: string;
};

export const saveTags = async ({
  tags,
  tableId,
  tagRelations,
}: {
  tags: TagInput[];
  tableId: number;
  tagRelations: TagsTable;
}) => {
  const slugs = tags.map((tag) => tag.slug);

  if (slugs.length === 0) {
    await deps.db.delete(tagRelations).where(eq(tagRelations.tableId, tableId));

    return [];
  }

  await deps.db.insert(tagsTable).values(tags).onConflictDoNothing({
    target: tagsTable.slug,
  });

  const savedTags = await deps.db
    .select({
      id: tagsTable.id,
      name: tagsTable.name,
      slug: tagsTable.slug,
    })
    .from(tagsTable)
    .where(inArray(tagsTable.slug, slugs))
    .orderBy(asc(tagsTable.name));

  const tagIds = savedTags.map((tag) => tag.id);

  await deps.db
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

  await deps.db
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
