import { selectFields } from "@kenstack/admin/queries/selectFields";
import { pipelineStage } from "@kenstack/api";
import { revisions } from "@kenstack/db/tables/revisions";
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
import { filterRevisionSnapshot } from "./helpers/revisions";

import { deps } from "@app/deps";
import { errorTranslator } from "@kenstack/db/errorTranslator";

type SavedRow = {
  id: number;
} & Record<string, unknown>;

export const saveAction = (adminConfig: AnyAdminConfig) =>
  pipelineStage(
    {
      role: "admin",
      schema: z.object({
        id: adminConfig.single ? z.number() : z.number().nullish(),
        changes: z.array(z.string()),
        values: adminConfig.schema,
      }),
      fieldsKey: "values",
    },
    async ({ response, user, data: rawData }) => {
      const { changes, id, values } = rawData;
      const changedFields = new Set(changes);
      const shouldSaveField = (key: string) => !id || changedFields.has(key);
      const { tags, ...data } = values as Record<string, unknown> & {
        tags?: unknown;
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
        shouldSaveField,
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
            if (shouldSaveField("tags")) {
              savedRow.tags = await saveTags({
                db: tx,
                tags: tags,
                tableId: savedRow.id,
                tagRelations: adminConfig.tags.table,
              });
            } else {
              savedRow.tags = tags;
            }
          }

          if (
            adminConfig.relationships &&
            Object.keys(relationshipValues).length
          ) {
            const changedRelationshipValues = Object.fromEntries(
              Object.entries(relationshipValues).filter(([key]) =>
                shouldSaveField(key),
              ),
            );
            const unchangedRelationshipValues = Object.fromEntries(
              Object.entries(relationshipValues).filter(
                ([key]) => !shouldSaveField(key),
              ),
            );

            Object.assign(savedRow, unchangedRelationshipValues);

            if (Object.keys(changedRelationshipValues).length) {
              const savedRelationships = await saveRelationships({
                db: tx,
                tableId: savedRow.id,
                relationships: adminConfig.relationships,
                values: changedRelationshipValues,
              });

              Object.assign(savedRow, savedRelationships);
            }
          }

          if (imageFields.imageStatusQueries.length) {
            await Promise.all(
              imageFields.imageStatusQueries.map((query) => query(tx)),
            );
          }

          if (adminConfig.galleries && Object.keys(galleryValues).length) {
            const changedGalleryValues = Object.fromEntries(
              Object.entries(galleryValues).filter(([key]) =>
                shouldSaveField(key),
              ),
            );
            const unchangedGalleryValues = Object.fromEntries(
              Object.entries(galleryValues).filter(
                ([key]) => !shouldSaveField(key),
              ),
            );

            Object.assign(savedRow, unchangedGalleryValues);

            if (Object.keys(changedGalleryValues).length) {
              const savedGalleries = await saveGalleries({
                db: tx,
                tableId: savedRow.id,
                galleries: adminConfig.galleries,
                values: changedGalleryValues,
                user,
              });

              Object.assign(savedRow, savedGalleries);
            }
          }

          await tx.insert(revisions).values({
            table: getTableName(table),
            rowId: savedRow.id,
            createdBy: user.id,
            changes,
            snapshot: filterRevisionSnapshot(savedRow, fields),
          });

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
        data: { changes },
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
