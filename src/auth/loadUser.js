import { cache } from "react";

import verifyJWT from "./verifyJWT";
import Session from "../models/Session";
import User from "../models/User";

export default cache(async function getUser() {
  const claims = await verifyJWT();

  if (!claims) {
    return false;
  }

  // const user = await User.loadById(claims.sub);
  const session = await Session.findById(claims.sid).populate({
    path: "user",
    model: User,
  });

  if (!session.user || session.user._id != claims.sub) {
    return false;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    return false;
  }

  return session.user;
});
