import type { AnyAdminConfig } from "@kenstack/admin";
import pick from "lodash-es/pick";

const revisionMetaFields = [
  "id",
  "publicId",
  "createdBy",
  "createdAt",
  "updatedAt",
  "deletedAt",
];

export const getRevisionFields = (fields: AnyAdminConfig["fields"]) =>
  Object.entries(fields)
    .filter(([key, field]) => !revisionMetaFields.includes(key) && field.revisions)
    .map(([key]) => key);

export const filterRevisionSnapshot = (
  snapshot: Record<string, unknown>,
  fields: AnyAdminConfig["fields"],
) => pick(snapshot, getRevisionFields(fields));
