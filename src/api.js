import { NextResponse } from "next/server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

// These actions are here so that they can be used without refreshing page state
import revalidateAction from "./auth/revalidateAction";
import loginAction from "./auth/loginAction";
import forgottenPasswordRoute from "./auth/forgottenPasswordRoute";
import clientErrorLog from "./log/clientErrorLog";

// import listLoadAction from "./apiActions/listLoad";
// import listDeleteAction from "./apiActions/listDelete";

// import editLoadAction from "./apiActions/editLoad";

import notFoundDoc from "./notFound";
import { notFound } from "next/navigation";

export default function API() {
  async function GET(req, { params }) {
    if (!params.slug) {
      throw Error("Parameter slug is required. is route.js inside [...slug]?");
    }

    const [action, id] = params.slug;

    switch (action) {
      case "forgotten-password":
        return forgottenPasswordRoute(req, id);
      case "revalidate":
        {
          await revalidateAction();
          redirect(headers().get("referer") || thaumazoAdmin.pathName("/"));
        }
        break;
      default:
        return notFoundDoc(req);
    }
  }

  async function POST(req, { params }) {
    if (!params.slug) {
      throw Error("Parameter slug is required. is route.js inside [...slug]?");
    }

    const [action] = params.slug;

    let retval = {};
    switch (action) {
      case "login":
        {
          const formData = await req.formData();
          retval = await loginAction({}, formData, { redirect: false });
        }
        break;
      case "client-error-log":
        return await clientErrorLog(req);
      // case "list-load":
      //  return listLoadAction(server, req);
      //case "list-delete":
      //  return listDeleteAction(server, req);
      // case "edit-load":
      //  return editLoadAction(server, req);
      default:
        notFound();
        break;
    }

    return NextResponse.json(retval);
  }

  return { GET, POST };
}
