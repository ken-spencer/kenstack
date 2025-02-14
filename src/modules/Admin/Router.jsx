import ListServer from "@kenstack/modules/AdminList/Server";
import EditServer from "@kenstack/modules/AdminEdit/Server";

import { notFound } from "next/navigation";

function isId(param) {
  if (param === "new" || param.match(/^[a-fA-F0-9]{24}$/)) {
    return true;
  }
}

export default async function AdminRouter({
  client: Client,
  // EditClient,
  params,
  ...props
}) {
  const { adminConfig } = props;
  const { admin: adminParams } = await params;
  const routes = adminConfig.getRoutes();

  let path = null,
    id;

  if (!adminParams) {
    // index path, do nothing.
  } else if (adminParams.length === 1) {
    const [param] = adminParams;
    if (isId(param)) {
      id = param;
    } else {
      path = param;
    }
  } else if (adminParams.length === 2) {
    const [param1, param2] = adminParams;
    path = param1;
    if (isId(param2)) {
      id = param2;
    } else {
      notFound();
    }
  } else {
    notFound();
  }

  let config;
  for (const options of routes) {
    if (options.path === path) {
      config = options;
      break;
    }
  }
  if (!config) {
    notFound();
  }

  const { admin: adminImport, modelName } = config;
  const modelImport = props.models.get(modelName);
  const { default: admin } = await adminImport();
  const { default: model } = await modelImport();

  if (!model) {
    throw Error(`Unable to find model ${modelName}`);
  }

  // const id = adminParams[0];
  if (id) {
    return (
      <EditServer {...props} admin={admin} model={model} id={id}>
        <Client modelName={modelName} />
      </EditServer>
    );
  }

  return (
    <ListServer {...props} admin={admin} model={model}>
      <Client modelName={modelName} />
    </ListServer>
  );
}
