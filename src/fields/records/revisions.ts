import pick from "lodash-es/pick";
import type { ServerDefinedFields } from "@kenstack/fields/server";

export const filterRevisionSnapshot = (
  snapshot: Record<string, unknown>,
  fields: ServerDefinedFields,
) =>
  pick(
    snapshot,
    Object.entries(fields)
      .filter(([, field]) => field.revisions)
      .map(([key]) => key),
  );
