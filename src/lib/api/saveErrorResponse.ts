import { type PipelineResponse } from "@kenstack/lib/api/PipelineResponse";
import { type MongoServerError } from "mongodb";

export default function saveErrorResponse(
  response: PipelineResponse,
  err: MongoServerError
): PipelineResponse {
  if (err.code === 11000 && err.keyPattern) {
    const fieldErrors: Record<string, string[]> = {};
    for (const key in err.keyPattern) {
      fieldErrors[key] = ["Another record with this value already exists."];
    }
    return response.final({
      status: "error",
      fieldErrors,
    });
  }
  // eslint-disable-next-line no-console
  console.error("Unexpected error during save:", err);
  return response.error("Unexpected error during save.");
}
