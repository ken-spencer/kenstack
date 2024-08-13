import resetPasswordAction from "./resetPasswordAction";
import apiAction from "@kenstack/server/apiAction";

import Session from "@kenstack/server/Session";

const API = (session) => {
  if (!(session instanceof Session)) {
    throw Error("argument 1 must be a valid session object");
  }

  const POST = async (request) => {
    return await apiAction(resetPasswordAction, request, {
      session,
      roles: ["AUTHENTICATED"],
    });
  };

  return { POST };
};

export default API;
