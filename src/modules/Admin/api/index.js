import edit from "@kenstack/modules/AdminEdit/api";
import list from "@kenstack/modules/AdminList/api";
import { notFound } from "next/navigation";

export default function API(props) {
  const POST = async (request, { params: { admin: params } }) => {
    if (params.length === 1) {
      const { POST: listPost } = list(props);
      const [slug] = params;
      return listPost(request, { params: { slug } });
    }

    if (params.length === 2) {
      const { POST: editPost } = edit(props);
      const [id, slug] = params;
      return editPost(request, { params: { id, slug } });
    }

    notFound();
  };

  return { POST };
}
