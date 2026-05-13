import { selectFields } from "./helpers/selectFields";
import { pipelineStage } from "@kenstack/lib/api";
import { pipeline } from "@kenstack/lib/api";
import type { AdminApiOptions, AnyAdminTable } from "..";
import { eq, getTableName, getTableColumns } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import * as z from "zod";
import { saveTags } from "./helpers/saveTags";
import { prepareImageFields } from "./helpers/saveImages";
import {
  extractRelationshipValues,
  saveRelationships,
} from "./helpers/saveRelationships";
import { extractGalleryValues, saveGalleries } from "./helpers/saveGalleries";

import { deps } from "@app/deps";
import { errorTranslator } from "@kenstack/db/errorTranslator";

const save = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline(options, [saveAction(adminTable)]);
};

const saveAction = (adminTable: AnyAdminTable) =>
  pipelineStage(
    {
      role: "admin",
      schema: adminTable.schema.extend({
        id: z.number().nullish(),
      }),
    },
    async ({ response, user, data: rawData }) => {
      const { id, tags, ...data } = rawData as Record<string, unknown> & {
        id?: number | null;
      };
      const relationshipValues = extractRelationshipValues({
        data,
        relationships: adminTable.relationships,
      });
      for (const key of Object.keys(relationshipValues)) {
        delete data[key];
      }
      const galleryValues = extractGalleryValues({
        data,
        galleries: adminTable.galleries,
      });
      for (const key of Object.keys(galleryValues)) {
        delete data[key];
      }

      const { db } = deps;

      const { table, fields } = adminTable;
      const columns = getTableColumns(table);
      const tagRelations = adminTable?.tags?.table;

      const select = selectFields(table, fields);
      const imageFields = await prepareImageFields({
        adminTable,
        columns,
        data,
        id,
        user,
        db,
      });

      if (imageFields.status === "error") {
        return response.error(imageFields.message);
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

          if (
            adminTable.relationships &&
            Object.keys(relationshipValues).length
          ) {
            const savedRelationships = await saveRelationships({
              db: tx,
              tableId: savedRow.id,
              relationships: adminTable.relationships,
              values: relationshipValues,
            });

            Object.assign(savedRow, savedRelationships);
          }

          if (imageFields.imageStatusQueries.length) {
            await Promise.all(
              imageFields.imageStatusQueries.map((query) => query(tx)),
            );
          }

          if (adminTable.galleries && Object.keys(galleryValues).length) {
            const savedGalleries = await saveGalleries({
              db: tx,
              tableId: savedRow.id,
              galleries: adminTable.galleries,
              values: galleryValues,
              user,
            });

            Object.assign(savedRow, savedGalleries);
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

      if (adminTable.revalidate) {
        adminTable.revalidate.forEach((validator) => {
          if (typeof validator === "string") {
            revalidateTag(validator, "max");
          } else {
            revalidateTag(validator(row), "max");
          }
        });
      }

      return response.success({
        id: row.id,
        values: row,
      });
    },
  );

export default save;
