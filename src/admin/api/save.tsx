import { pipelineStage } from "@kenstack/api";
import type { DefinedAdminModule } from "@kenstack/admin/module";

import * as z from "zod";
import omit from "lodash-es/omit";

import {
  getHiddenFields,
  loadFieldAccess,
} from "@kenstack/admin/lib/fieldAccess";
import { saveAdminRecord } from "@kenstack/admin/queries/save";
import { buildValidationRefusal } from "@kenstack/api/pipeline";
import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";

function withServerPublishDate<
  TData extends { changes: string[]; values: Record<string, unknown> },
>(data: TData) {
  const { values } = data;

  if (
    !Object.hasOwn(values, "visibility") ||
    !Object.hasOwn(values, "publishedAt")
  ) {
    return data;
  }

  if (values.visibility !== "published" && values.visibility !== "unlisted") {
    return data;
  }

  if (values.publishedAt) {
    return data;
  }

  return {
    ...data,
    changes: data.changes.includes("publishedAt")
      ? data.changes
      : [...data.changes, "publishedAt"],
    values: {
      ...values,
      publishedAt: new Date(),
    },
  };
}

export const saveAction = (moduleConfig: DefinedAdminModule) => {
  const { admin: adminConfig } = moduleConfig;

  return pipelineStage(
    {
      access: { module: moduleConfig.name, permission: "edit" },
      schema: z.object({
        id: z.number().nullish(),
        // The token the form loaded: null for a new record or a singleton that has no row yet.
        updatedAt: z.iso
          .datetime()
          .transform((value) => new Date(value))
          .nullable(),
        changes: z.array(z.string()),
        parentId: z.int().positive().optional(),
        // Checked below against the fields this person sees.
        values: z.record(z.string(), z.unknown()),
      }),
      fieldsKey: "values",
    },
    async ({ response, data: { id, values: sentValues, ...meta } }) => {
      const { parent } = moduleConfig;

      // A field the person can't see or change is left out of their schema, so parsing drops any value
      // sent for it and the save never writes it: an existing record keeps its value, and a new one
      // takes the column's default. Nor is it recorded as changed.
      const fieldAccess = await loadFieldAccess(moduleConfig.name, !id);
      const restrictedFields = Object.keys(fieldAccess);
      const parsedValues = await (
        restrictedFields.length
          ? createSchemaFromFields(
              omit(adminConfig.fields, restrictedFields),
              adminConfig.oneToOne,
            )
          : adminConfig.schema
      ).safeParseAsync(sentValues);
      if (!parsedValues.success) {
        return response.error(buildValidationRefusal(parsedValues.error));
      }
      const rawSaveData = withServerPublishDate({
        ...meta,
        changes: meta.changes.filter((key) => !restrictedFields.includes(key)),
        values: parsedValues.data,
      });
      const { changes, updatedAt } = rawSaveData;
      let values: Record<string, unknown> = rawSaveData.values;

      if (!id && parent) {
        if (!rawSaveData.parentId) {
          return response.error("Parent ID is missing.");
        }

        values = {
          ...values,
          [parent.foreignKey]: rawSaveData.parentId,
        };
      }

      const result = await saveAdminRecord({
        changes,
        id,
        module: moduleConfig,
        updatedAt,
        values,
      });

      if (result.status === "error") {
        return response.error(result.error);
      }

      return response.success({
        id: result.row?.id ?? id,
        values: omit(result.values, getHiddenFields(fieldAccess)),
        updatedAt: result.updatedAt,
      });
    },
  );
};
