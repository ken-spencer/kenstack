import { type NextRequest } from "next/server";
import { pipeline, authenticate, type PipelineAction } from "@kenstack/lib/api";
import { apiSchema } from "./schema";
import { deps } from "@app/deps";
import { revalidateTag } from "next/cache";

export const pageEditorApi = (request: NextRequest) =>
  pipeline({ request, schema: apiSchema }, [
    authenticate({ role: "admin" }),
    pageEditAction,
  ]);

const pageEditAction: PipelineAction<typeof apiSchema> = async ({
  data,
  user,
  response,
}) => {
  if (!user) {
    throw Error("User is required");
  }

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
    entityType: "content",
    entityId: row.id,
  });
  revalidateTag("content:" + slug, "max");
  return response.success({});
};
