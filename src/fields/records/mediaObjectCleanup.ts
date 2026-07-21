import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { waitUntil } from "@vercel/functions";

import { deps } from "@app/deps";
import { mediaStorage } from "@kenstack/lib/mediaStorage";

type MediaObjectCleanupMessage = {
  key: string;
  mediaId: number;
  reason: "staged_variant" | "superseded_variant";
};

export function queueMediaObjectCleanup(message: MediaObjectCleanupMessage) {
  const storage = mediaStorage;
  if (!storage) {
    return;
  }

  try {
    waitUntil(
      storage.client
        .send(
          new DeleteObjectCommand({
            Bucket: storage.bucket,
            Key: message.key,
          }),
        )
        .catch((error) => {
          return reportCleanupError(error, message);
        }),
    );
  } catch (error) {
    return reportCleanupError(error, message);
  }
}

function reportCleanupError(
  error: unknown,
  message: MediaObjectCleanupMessage,
) {
  return deps.error(error, {
    source: "media.objectCleanup",
    context: {
      mediaId: message.mediaId,
      reason: message.reason,
    },
  });
}
