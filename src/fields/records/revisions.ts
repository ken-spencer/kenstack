import pick from "lodash-es/pick";
import type { DefinedFields } from "@kenstack/fields/types";
import { getOneToOneFieldSets } from "@kenstack/fields/oneToOneFieldSets";
import { isRecord } from "@kenstack/lib/isRecord";

export const filterRevisionSnapshot = (
  snapshot: Record<string, unknown>,
  fields: DefinedFields,
) => {
  const filtered = pick(
    snapshot,
    Object.entries(fields)
      .filter(([, field]) => field.revisions)
      .map(([key]) => key),
  );

  for (const [name, fieldSet] of Object.entries(getOneToOneFieldSets(fields))) {
    const value = snapshot[name];
    if (isRecord(value)) {
      filtered[name] = filterRevisionSnapshot(value, fieldSet.fields);
    }
  }

  return filtered;
};
