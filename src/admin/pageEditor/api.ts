import { pipelineStage } from "@kenstack/api";
import { content } from "@kenstack/db/tables/content";
import { saveRecord } from "@kenstack/records/save";
import * as z from "zod";

import { pageEditorSchema } from "./schema";
import { pageEditorServerFields } from "./serverFields";

const apiSchema = z.object({
  slug: z.string().trim().toLowerCase(),
  changes: z.array(pageEditorSchema.keyof()),
  values: pageEditorSchema.partial(),
});

export const pageEditAction = () =>
  pipelineStage(
    { schema: apiSchema, access: "admin" },
    async ({ data, response }) => {
      const { slug } = data;

      const result = await saveRecord({
        actionPrefix: "page-editor",
        admin: true,
        table: content,
        fields: pageEditorServerFields,
        values: data.values,
        changes: data.changes,
        revalidate: [() => `content:${slug}`],
        query: async ({ tx, data, select, user }) => {
          const [row] = await tx
            .insert(content)
            .values({
              slug,
              createdBy: user.id,
              ...data,
            })
            .onConflictDoUpdate({
              target: content.slug,
              set: {
                ...data,
                updatedAt: new Date(),
              },
            })
            .returning(select);

          return row;
        },
      });

      if (result.status === "error") {
        return response.error(result.error);
      }

      return response.success({ values: result.values });
    },
  );
