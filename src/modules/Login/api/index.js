import loginAction from "./loginAction";
import apiAction from "@admin/server/apiAction";

import Session from "@admin/server/Session";

const API = (session) => {
  if (!(session instanceof Session)) {
    throw Error("argument 1 must be a valid session object");
  }

  const POST = async (request) => {
    return await apiAction(loginAction, request, {
      session,
      roles: ["ANONYMOUS"],
    });
  };

  return { POST };
};

export default API;
