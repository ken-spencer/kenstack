import type { FetchError } from "@kenstack/api/fetcher";

const uploadErrorFields = ["size", "type", "filename", "fieldname"] as const;

export default function getUploadErrorMessage(error: FetchError) {
  for (const field of uploadErrorFields) {
    const fieldError = error.fieldErrors?.[field];
    if (fieldError) {
      return Array.isArray(fieldError) ? fieldError[0] : fieldError;
    }
  }

  return error.message ?? "There was a problem uploading your image.";
}
