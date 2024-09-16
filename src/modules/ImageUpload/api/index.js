import apiAction from "@kenstack/server/apiAction";

import uploadAction from "./uploadAction";

const API = (session, props = {}) => {
  const POST = async (request) => {
    return await apiAction(uploadAction, request, {
      roles: ["ADMIN"],
      ...props,
      session,
    });
  };

  const config = {
    api: {
      // bodyParser: false, // Disable Next.js's default body parsing
      sizeLimit: "5mb",
    },
  };

  return { POST, config };
};

export default API;
