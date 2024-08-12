import saveAction from "./save";
import apiAction from "@admin/server/apiAction";

import clientModel from "@admin/client/Model";

import { notFound } from "next/navigation";

const API = ({ session, admin, model }) => {
  if (!(admin instanceof clientModel)) {
    throw Error("admin model must be an instance of clientModel");
  }

  const POST = async (request, { params: { id, slug } }) => {
    let isNew = false;
    if (id === "new") {
      isNew = true;
      id = null;
    } else if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      notFound();
    }

    let action;
    switch (slug) {
      case "save":
        action = saveAction;
        break;
      default:
        notFound();
        break;
    }

    return await apiAction(action, request, {
      id,
      isNew,
      session,
      admin,
      model,
      roles: ["ADMIN"],
    });
  };

  return { POST };
};

export default API;
