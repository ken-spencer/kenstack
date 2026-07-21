import fetcher from "@kenstack/api/fetcher";
import type { SelectedMedia } from "@kenstack/db/tables";
import type { CropSource, SquareCrop } from "@kenstack/db/tables/media/types";
import getUploadErrorMessage from "@kenstack/forms/getUploadErrorMessage";

type UploadMediaCompletePayload = {
  filename?: string;
  height?: number | null;
  imageId: string;
  kind?: SelectedMedia["kind"] | null;
  mediaId?: string;
  originalUrl?: string | null;
  original?: CropSource | null;
  sourceHeight?: number | null;
  sourceSize?: number | null;
  sourceType?: string | null;
  sourceWidth?: number | null;
  url: string;
  width?: number | null;
  squareCrop?: SquareCrop | null;
};

export async function uploadMedia({
  apiPath,
  extraData,
  fieldname,
  file,
  presignedUrlAction,
  signal,
  uploadCompleteAction,
}: {
  apiPath: string;
  extraData?: Record<string, unknown>;
  fieldname: string;
  file: File;
  presignedUrlAction: string;
  signal?: AbortSignal;
  uploadCompleteAction: string;
}): Promise<
  | {
      status: "aborted";
    }
  | {
      complete: UploadMediaCompletePayload;
      status: "success";
    }
  | {
      message: string;
      responseStatus?: number;
      responseText?: string;
      stage: "complete" | "presign" | "s3";
      status: "error";
    }
> {
  try {
    const presigned = await fetcher<{
      id: string;
      uploadUrl: string;
    }>(
      apiPath,
      {
        ...extraData,
        action: presignedUrlAction,
        filename: file.name,
        fieldname,
        size: file.size,
        type: file.type,
      },
      { signal },
    );

    if (presigned.status === "error") {
      return {
        message: getUploadErrorMessage(presigned),
        stage: "presign",
        status: "error",
      };
    }

    if (signal?.aborted) {
      return { status: "aborted" };
    }

    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": file.size.toString(),
        "Content-Type": file.type,
      },
      body: file,
      signal,
    });

    if (!uploadResponse.ok) {
      return {
        message: "There was a problem uploading your file. Please try again.",
        responseStatus: uploadResponse.status,
        responseText: await uploadResponse.text(),
        stage: "s3",
        status: "error",
      };
    }

    if (signal?.aborted) {
      return { status: "aborted" };
    }

    const complete = await fetcher<UploadMediaCompletePayload>(
      apiPath,
      {
        ...extraData,
        action: uploadCompleteAction,
        fieldname,
        imageId: presigned.id,
      },
      { signal },
    );

    if (complete.status === "error") {
      return {
        message: getUploadErrorMessage(complete),
        stage: "complete",
        status: "error",
      };
    }

    if (signal?.aborted) {
      return { status: "aborted" };
    }

    return {
      complete,
      status: "success",
    };
  } catch (error) {
    if (signal?.aborted) {
      return { status: "aborted" };
    }

    throw error;
  }
}
