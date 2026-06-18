import { pipelineStage } from "@kenstack/api";
import type { AnyAdminConfig } from "@kenstack/admin/module";
import { deps } from "@app/deps";
import { revisions } from "@kenstack/db/tables/revisions";
import { and, desc, eq, getTableName } from "drizzle-orm";
import * as z from "zod";
import { filterRevisionSnapshot } from "@kenstack/fields/records";
import { formatUserName } from "@kenstack/lib/user";

export const revisionsAction = (adminConfig: AnyAdminConfig) =>
  pipelineStage(
    {
      access: "admin",
      schema: z.object({
        id: z.number(),
        revisionId: z.number().optional(),
      }),
    },
    async ({ response, data: { id, revisionId } }) => {
      const tableName = getTableName(adminConfig.table);

      if (revisionId) {
        const [revision] = await deps.db
          .select({
            id: revisions.id,
            snapshot: revisions.snapshot,
          })
          .from(revisions)
          .where(
            and(
              eq(revisions.id, revisionId),
              eq(revisions.table, tableName),
              eq(revisions.rowId, id),
            ),
          )
          .limit(1);

        if (!revision) {
          return response.error("Unable to find the requested revision.");
        }

        return response.success({
          revision: {
            ...revision,
            snapshot: filterRevisionSnapshot(
              revision.snapshot,
              adminConfig.fields,
            ),
          },
        });
      }

      const { users } = deps.tables;
      const rows = await deps.db
        .select({
          id: revisions.id,
          createdAt: revisions.createdAt,
          createdBy: revisions.createdBy,
          createdByEmail: users.email,
          createdByFamilyName: users.familyName,
          createdByGivenName: users.givenName,
          createdByMiddleName: users.middleName,
          changes: revisions.changes,
        })
        .from(revisions)
        .leftJoin(users, eq(revisions.createdBy, users.id))
        .where(and(eq(revisions.table, tableName), eq(revisions.rowId, id)))
        .orderBy(desc(revisions.createdAt));

      return response.success({
        revisions: rows.map(
          ({
            createdByEmail,
            createdByFamilyName,
            createdByGivenName,
            createdByMiddleName,
            ...row
          }) => ({
            ...row,
            createdByName:
              formatUserName({
                email: createdByEmail,
                familyName: createdByFamilyName,
                givenName: createdByGivenName,
                middleName: createdByMiddleName,
              }) || null,
          }),
        ),
      });
    },
  );
