import { type AdminServerConfig } from "@kenstack/admin/types";
export default function getEditAggregations(adminConfig: AdminServerConfig) {
  const clientSchema =
    typeof adminConfig.schema === "function"
      ? adminConfig.schema("client")
      : adminConfig.schema;

  const projection = {
    ...Object.keys(clientSchema.shape).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {}),
    meta: true,
  };

  const aggregations = adminConfig.edit?.aggregate
    ? adminConfig.edit.aggregate({ projection })
    : [
        {
          $project: projection,
        },
      ];

  return aggregations;
}
