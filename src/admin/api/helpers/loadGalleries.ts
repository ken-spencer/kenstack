import { asc, eq, sql } from "drizzle-orm";

import type { ImageGalleryConfig } from "@kenstack/admin";
import type { deps } from "@app/deps";
import { images, selectImageSubquery } from "@kenstack/db/tables";

export async function loadGalleries({
  db,
  tableId,
  galleries,
}: {
  db: Pick<typeof deps.db, "select">;
  tableId: number;
  galleries?: Record<string, ImageGalleryConfig>;
}) {
  const values: Record<string, unknown[]> = {};

  if (!galleries) {
    return values;
  }

  for (const [key, gallery] of Object.entries(galleries)) {
    const rows = await db
      .select({
        id: gallery.imageId,
        image: selectImageSubquery(gallery.imageId, "square"),
        filename: images.filename,
        sourceType: images.sourceType,
        sourceSize: images.sourceSize,
        sourceWidth: images.sourceWidth,
        sourceHeight: images.sourceHeight,
        originalUrl: sql<string | null>`
          case
            when ${images.kind} = 'svg' then ${images.sourceUrl}
            else ${images.variants}->'original'->>'url'
          end
        `,
        title: images.title,
        caption: images.caption,
      })
      .from(gallery.table)
      .innerJoin(images, eq(gallery.imageId, images.id))
      .where(eq(gallery.tableId, tableId))
      .orderBy(asc(gallery.sortOrder));

    values[key] = rows
      .filter((row) => row.image)
      .map((row) => ({
        id: row.id,
        ...row.image,
        filename: row.filename,
        sourceType: row.sourceType,
        sourceSize: row.sourceSize,
        sourceWidth: row.sourceWidth,
        sourceHeight: row.sourceHeight,
        originalUrl: row.originalUrl,
        title: row.title,
        caption: row.caption,
      }));
  }

  return values;
}
