import edit from "@kenstack/modules/AdminEdit/api";
import list from "@kenstack/modules/AdminList/api";
import { notFound } from "next/navigation";
import matchParams from "../matchParams";

export default function API(props) {
  const POST = async (request, { params }) => {
    const { admin: adminParams } = await params;

    // const path = adminParams.join("/");
    // const adminConfig = props.adminConfig;

    const result = await matchParams(adminParams, props.adminConfig);
    if (!result) {
      notFound();
    }

    const { admin, modelName, id, slug } = result;
    const modelImport = props.models.get(modelName);
    if (!modelImport) {
      throw Error(`Unknown model ${modelName}`);
    }
    const { default: model } = await modelImport;
    Object.assign(props, { admin, model });

    // const editMatch = match(":id/:slug", {
    //   validate: {
    //     id: /^[a-fA-F0-9]{24}$/, // Mongoose ObjectId
    //   },
    // })(path);

    if (id) {
      const { POST: editPost } = edit(props);
      return editPost(request, { id, slug });
    }

    const { POST: listPost } = list(props);
    return listPost(request, { slug });

    // notFound();
  };

  return { POST };
}
