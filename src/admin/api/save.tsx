import { selectFields } from "./helpers/selectFields";
import { type PipelineAction } from "@kenstack/lib/api";
import { pipeline } from "@kenstack/lib/api";
import type { AdminApiOptions, AnyAdminTable } from "..";
import { sql, and, eq, getTableName, getTableColumns } from "drizzle-orm";
import * as z from "zod";
import { saveTags } from "./helpers/saveTags";
import { images } from "@kenstack/db/tables";
import { imageSchema } from "@kenstack/zod/image";

import { deps } from "@app/deps";
import { errorTranslator } from "@kenstack/db/errorTranslator";

const save = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline({ ...options, schema: adminTable.schema }, [
    saveAction(adminTable),
  ]);
};

const saveAction =
  (adminTable: AnyAdminTable): PipelineAction<z.ZodObject> =>
  async ({ response, data: { tags, ...data }, id }) => {
    const { db } = deps;
    type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
    const user = await deps.auth.requireUser();

    const { table, fields } = adminTable;
    const columns = getTableColumns(table);
    const tagRelations = adminTable?.tags?.table;

    const select = selectFields(table, fields);
    const imageStatusQueries: ((tx: Tx) => Promise<unknown>)[] = [];
    for (const [key, field] of Object.entries(fields)) {
      if (field.kind === "image") {
        const fieldData = data[key] as z.output<typeof imageSchema>;
        if (typeof fieldData === "number") {
          // prevent user from switching image directly.
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
            .from(table)
            .where(eq(table.id, id))
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
        } else if (typeof fieldData === "number" || !("action" in fieldData)) {
          delete data[key];
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
              .set({ status: "attached" })
              .where(
                and(
                  eq(images.publicId, fieldData.imageId),
                  eq(images.createdBy, user.id),
                ),
              ),
          );
        } else {
          return response.error("invalid image data");
        }
      }
    }
    let row;
    try {
      row = await db.transaction(async (tx) => {
        const rows = id
          ? await tx
              .update(table)
              .set({ ...data, updatedAt: new Date() })
              .where(eq(table.id, id))
              .returning(select)
          : await tx
              .insert(table)
              .values({
                ...data,
                createdBy: user.id,
              })
              .returning(select);

        const [savedRow] = rows;
        if (!savedRow) {
          return null;
        }

        if (tagRelations && Array.isArray(tags)) {
          const savedTags = await saveTags({
            db: tx,
            tags: tags,
            tableId: savedRow.id,
            tagRelations,
          });

          savedRow.tags = savedTags;
        }

        if (imageStatusQueries.length) {
          await Promise.all(imageStatusQueries.map((query) => query(tx)));
        }

        return savedRow;
      });
    } catch (err) {
      const error = errorTranslator(err);
      if (error) {
        return response.json(error);
      }
      throw err;
    }

    if (!row) {
      return response.error("not found");
    }

    await deps.logger.audit({
      userId: user.id,
      rowId: row.id,
      table: getTableName(table),
      action: id ? "update" : "insert",
    });

    return response.success({
      id: row.id,
      values: row,
    });
  };

export default save;
