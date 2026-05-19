import { selectFields } from "@kenstack/admin/queries/selectFields";
import { pipelineStage } from "@kenstack/api";
import type { AnyAdminConfig } from "..";
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

type SavedRow = {
  id: number;
} & Record<string, unknown>;

export const saveAction = (adminConfig: AnyAdminConfig) =>
  pipelineStage(
    {
      role: "admin",
      schema: adminConfig.schema.extend({
        id: adminConfig.single ? z.number() : z.number().nullish(),
      }),
    },
    async ({ response, user, data: rawData }) => {
      const { id, tags, ...data } = rawData as Record<string, unknown> & {
        id?: number | null;
      };
      const relationshipValues = extractRelationshipValues({
        data,
        relationships: adminConfig.relationships,
      });
      for (const key of Object.keys(relationshipValues)) {
        delete data[key];
      }
      const galleryValues = extractGalleryValues({
        data,
        galleries: adminConfig.galleries,
      });
      for (const key of Object.keys(galleryValues)) {
        delete data[key];
      }

      const { db } = deps;

      const { table, fields } = adminConfig;
      const columns = getTableColumns(table);

      const select = selectFields(table, fields);
      const imageFields = await prepareImageFields({
        adminConfig,
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
          const rows: SavedRow[] = id
            ? await tx
                .update(adminConfig.table)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(adminConfig.table.id, id))
                .returning(select)
            : await tx
                .insert(adminConfig.table)
                .values({
                  ...data,
                  createdBy: user.id,
                })
                .returning(select);

          const [savedRow] = rows;
          if (!savedRow) {
            return null;
          }

          if (adminConfig.tags?.table && Array.isArray(tags)) {
            const savedTags = await saveTags({
              db: tx,
              tags: tags,
              tableId: savedRow.id,
              tagRelations: adminConfig.tags.table,
            });

            savedRow.tags = savedTags;
          }

          if (
            adminConfig.relationships &&
            Object.keys(relationshipValues).length
          ) {
            const savedRelationships = await saveRelationships({
              db: tx,
              tableId: savedRow.id,
              relationships: adminConfig.relationships,
              values: relationshipValues,
            });

            Object.assign(savedRow, savedRelationships);
          }

          if (imageFields.imageStatusQueries.length) {
            await Promise.all(
              imageFields.imageStatusQueries.map((query) => query(tx)),
            );
          }

          if (adminConfig.galleries && Object.keys(galleryValues).length) {
            const savedGalleries = await saveGalleries({
              db: tx,
              tableId: savedRow.id,
              galleries: adminConfig.galleries,
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

      if (adminConfig.revalidate) {
        adminConfig.revalidate.forEach((validator) => {
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
