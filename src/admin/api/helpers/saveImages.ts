import { and, eq, sql, type getTableColumns } from "drizzle-orm";
import type * as z from "zod";

import { images } from "@kenstack/db/tables";
import { imageSchema } from "@kenstack/zod/image";
import type { AnyAdminTable } from "@kenstack/admin";
import type { deps } from "@app/deps";
import type { User } from "@kenstack/types";

type ImageStatusQuery = (tx: TransactionDb) => Promise<unknown>;
type TableColumns = ReturnType<typeof getTableColumns<AnyAdminTable["table"]>>;
type TransactionDb = Parameters<
  Parameters<(typeof deps)["db"]["transaction"]>[0]
>[0];

const imageMetadataKeys = ["alt", "title", "caption"] as const;

function getImageMetadata(fieldData: z.output<typeof imageSchema>) {
  if (!fieldData || typeof fieldData === "number") {
    return {};
  }

  return Object.fromEntries(
    imageMetadataKeys.map((key) => [key, fieldData[key] ?? null]),
  );
}

export async function prepareImageFields({
  adminTable,
  columns,
  data,
  id,
  user,
  db,
}: {
  adminTable: AnyAdminTable;
  columns: TableColumns;
  data: Record<string, unknown>;
  id?: number | null;
  user: User;
  db: typeof deps.db;
}) {
  const imageStatusQueries: ImageStatusQuery[] = [];

  for (const [key, field] of Object.entries(adminTable.fields)) {
    if (field.kind !== "image") {
      continue;
    }

    const fieldData = data[key] as z.output<typeof imageSchema>;
    if (typeof fieldData === "number") {
      delete data[key];
      continue;
    }

    const column = columns[key];
    if (!column) {
      continue;
    }

    if (
      id &&
      (fieldData === null ||
        ("action" in fieldData && fieldData.action === "remove"))
    ) {
      data[key] = null;
      const [oldRow] = await db
        .select({ removeId: column })
        .from(adminTable.table)
        .where(eq(adminTable.table.id, id))
        .limit(1);

      imageStatusQueries.push(async (tx) => {
        if (oldRow && typeof oldRow.removeId === "number") {
          return tx
            .update(images)
            .set({ status: "removed" })
            .where(eq(images.id, oldRow.removeId));
        }
      });
    } else if (fieldData === null) {
      continue;
    } else if (typeof fieldData === "number") {
      delete data[key];
    } else if (!("action" in fieldData)) {
      delete data[key];

      if (typeof fieldData.id === "number") {
        imageStatusQueries.push((tx) =>
          tx
            .update(images)
            .set(getImageMetadata(fieldData))
            .where(eq(images.id, fieldData.id)),
        );
      }
    } else if (fieldData.action === "upload") {
      const imageIdQuery = db
        .select({ id: images.id })
        .from(images)
        .where(
          and(
            eq(images.publicId, fieldData.imageId),
            eq(images.createdBy, user.id),
          ),
        )
        .limit(1);

      data[key] = sql<number>`(${imageIdQuery})`;

      imageStatusQueries.push((tx) =>
        tx
          .update(images)
          .set({ status: "attached", ...getImageMetadata(fieldData) })
          .where(
            and(
              eq(images.publicId, fieldData.imageId),
              eq(images.createdBy, user.id),
            ),
          ),
      );
    } else {
      return {
        status: "error" as const,
        message: "invalid image data",
      };
    }
  }

  return {
    status: "success" as const,
    imageStatusQueries,
  };
}
