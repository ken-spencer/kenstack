import loadAction from "./load";
import apiAction from "@kenstack/server/apiAction";

// import Session from "@kenstack/server/Session";
import clientModel from "@kenstack/client/Model";

import { notFound } from "next/navigation";

const API = ({ session, admin, model }) => {
  if (!(admin instanceof clientModel)) {
    throw Error("admin model must be an instance of clientModel");
  }

  const POST = async (request, { params: { slug } }) => {
    let action;
    switch (slug) {
      case "load":
        action = loadAction;
        break;
      default:
        notFound();
        break;
    }

    return await apiAction(action, request, {
      session,
      admin,
      model,
      roles: ["ADMIN"],
    });
  };

  return { POST };
};

export default API;
