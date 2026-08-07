import pick from "lodash-es/pick";
import type { DefinedFields } from "@kenstack/admin/fields";
import { isRecord } from "@kenstack/lib/isRecord";

export type RevisionRelations = Record<string, { fields: DefinedFields }>;

export const filterRevisionSnapshot = (
  snapshot: Record<string, unknown>,
  fields: DefinedFields,
  relations: RevisionRelations = {},
) => {
  const filtered = pick(
    snapshot,
    Object.entries(fields)
      .filter(([, field]) => field.revisions)
      .map(([key]) => key),
  );

  for (const [name, relation] of Object.entries(relations)) {
    const value = snapshot[name];
    if (isRecord(value)) {
      filtered[name] = filterRevisionSnapshot(value, relation.fields);
    }
  }

  return filtered;
};
