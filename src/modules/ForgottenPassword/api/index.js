import apiAction from "@kenstack/server/apiAction";
import Session from "@kenstack/server/Session";

import forgottenPasswordAction from "./forgottenPasswordAction";

const API = (session, props) => {
  if (!(session instanceof Session)) {
    throw Error("argument 1 must be a valid session object");
  }

  const POST = async (request) => {
    return await apiAction(forgottenPasswordAction, request, {
      ...props,
      session,
      roles: ["ANONYMOUS"],
    });
  };

  return { POST };
};

export default API;
