import "server-only";

import { eq } from "drizzle-orm";

import { media } from "@kenstack/db/tables/media";
import type { FieldAfterSave } from "../../serverField";

export function imageMetadata(input: {
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
}) {
  return {
    alt: input.alt ?? null,
    title: input.title ?? null,
    caption: input.caption ?? null,
  };
}

export function attachMediaAfterSave(
  mediaId: number,
  oldMediaId: number | null,
  metadata: ReturnType<typeof imageMetadata> | undefined,
): FieldAfterSave {
  return async (tx) => {
    await tx
      .update(media)
      .set({ status: "attached", ...metadata })
      .where(eq(media.id, mediaId));

    if (oldMediaId) {
      await tx
        .update(media)
        .set({ status: "removed" })
        .where(eq(media.id, oldMediaId));
    }
  };
}
