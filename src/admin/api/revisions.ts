import { pipelineStage } from "@kenstack/api";
import type { DefinedAdminModule } from "@kenstack/admin/module";
import { db } from "@app/db";
import { modules } from "@app/modules";
import { revisions } from "@kenstack/db/tables/revisions";
import { and, desc, eq, getTableName } from "drizzle-orm";
import * as z from "zod";
import omit from "lodash-es/omit";
import {
  getHiddenFields,
  loadFieldAccess,
} from "@kenstack/admin/lib/fieldAccess";
import { filterRevisionSnapshot } from "@kenstack/records";
import { formatUserName } from "@kenstack/lib/user";

export const revisionsAction = ({
  name,
  admin: adminConfig,
}: DefinedAdminModule) =>
  pipelineStage(
    {
      access: { module: name, permission: "view" },
      schema: z.object({
        id: z.number(),
        revisionId: z.number().optional(),
      }),
    },
    async ({ response, data: { id, revisionId } }) => {
      const tableName = getTableName(adminConfig.table);

      if (revisionId) {
        const [revision] = await db
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

        // A hidden field's value never reaches the browser.
        const hiddenFields = getHiddenFields(
          await loadFieldAccess(name, false),
        );
        return response.success({
          revision: {
            ...revision,
            snapshot: omit(
              filterRevisionSnapshot(
                revision.snapshot,
                adminConfig.fields,
                adminConfig.oneToOne?.relations,
              ),
              hiddenFields,
            ),
          },
        });
      }

      const users = modules.users.admin.table;
      // Keeps trashed users, so a revision still names the author after their account is trashed.
      const rows = await db
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
