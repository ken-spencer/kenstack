// import edit from "@kenstack/modules/AdminEdit/api";
import list from "@kenstack/modules/AdminList/api";
import { notFound } from "next/navigation";

import { match } from "path-to-regexp";

export default function API(props) {
  const POST = async (request, { params }) => {
    const { admin: adminParams } = await params;
  
    const path = adminParams.join("/");

    const editMatch = match(":id/:slug", {
      validate: {
        id: /^[a-fA-F0-9]{24}$/, // Mongoose ObjectId
      },
    })(path);
    if (editMatch) {
      const { POST: editPost } = edit(props);
      return editPost(request, { ...editMatch.params });
    }

    if (adminParams.length === 1) {
      const { POST: listPost } = list(props);
      const [slug] = adminParams;
      return listPost(request, { params: { slug } });
    }

    notFound();
  };

  return { POST };
}
