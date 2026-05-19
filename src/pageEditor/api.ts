import { type NextRequest } from "next/server";
import { pipeline, pipelineStage } from "@kenstack/api";
import { apiSchema } from "./schema";
import { deps } from "@app/deps";
import { revisions } from "@kenstack/db/tables/revisions";
import { getTableName } from "drizzle-orm";
import { revalidateTag } from "next/cache";

export const pageEditorApi = (request: NextRequest) =>
  pipeline({ request }, [pageEditAction]);

export const pageEditorPipeline = (options: {
  request: NextRequest;
  json?: Record<string, unknown>;
}) => pipeline(options, [pageEditAction]);

const pageEditAction = pipelineStage(
  { schema: apiSchema, role: "admin" },
  async ({ data, user, response }) => {
    const {
      db,
      logger,
      tables: { content },
    } = deps;

    const { field, slug, value } = data;

    const row = await db.transaction(async (tx) => {
      const [savedRow] = await tx
        .insert(content)
        .values({
          slug,
          [field]: value,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: content.slug,
          set: {
            [field]: value,
            updatedAt: new Date(),
          },
        })
        .returning({
          id: content.id,
          title: content.title,
          description: content.description,
          content: content.content,
          seoTitle: content.seoTitle,
          seoDescription: content.seoDescription,
        });

      if (!savedRow) {
        return null;
      }

      await tx.insert(revisions).values({
        table: getTableName(content),
        rowId: savedRow.id,
        createdBy: user.id,
        changes: [field],
        snapshot: {
          title: savedRow.title ?? "",
          description: savedRow.description ?? "",
          content: savedRow.content ?? "",
          seoTitle: savedRow.seoTitle ?? "",
          seoDescription: savedRow.seoDescription ?? "",
        },
      });

      return savedRow;
    });

    if (!row) {
      return response.error("Unable to save this content.");
    }

    await logger.audit({
      action: "page-editor",
      userId: user.id,
      table: "content",
      rowId: row.id,
      data: { changes: [field] },
    });
    revalidateTag("content:" + slug, "max");
    return response.success({});
  },
);
