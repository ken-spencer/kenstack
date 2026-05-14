import { type NextRequest } from "next/server";
import { pipeline, pipelineStage } from "@kenstack/lib/api";
import { apiSchema } from "./schema";
import { deps } from "@app/deps";
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

    const [row] = await db
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
      .returning({ id: content.id });

    await logger.audit({
      action: "page-editor",
      userId: user.id,
      table: "content",
      rowId: row.id,
    });
    revalidateTag("content:" + slug, "max");
    return response.success({});
  },
);
