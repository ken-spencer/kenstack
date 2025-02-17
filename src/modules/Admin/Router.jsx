import ListServer from "@kenstack/modules/AdminList/Server";
import EditServer from "@kenstack/modules/AdminEdit/Server";

import { notFound } from "next/navigation";
import matchParams from "./matchParams";

export default async function AdminRouter({
  client: Client,
  // EditClient,
  params,
  ...props
}) {
  const { adminConfig } = props;
  const { admin: adminParams } = await params;
  // const routes = adminConfig.getRoutes();

  const result = await matchParams(adminParams, adminConfig);
  if (!result) {
    notFound();
  }

  const { admin, modelName, id, slug } = result;

  const modelImport = props.models.get(modelName);
  if (!modelImport) {
    throw Error(`Unknown model ${modelName}`);
  }
  const { default: model } = await modelImport;

  if (!model) {
    throw Error(`Unable to find model ${modelName}`);
  }

  // const id = adminParams[0];
  if (id) {
    return (
      <EditServer {...props} admin={admin} model={model} id={id} slug={slug}>
        <Client modelName={modelName} />
      </EditServer>
    );
  }

  return (
    <ListServer {...props} admin={admin} model={model} slug={slug}>
      <Client modelName={modelName} />
    </ListServer>
  );
}
