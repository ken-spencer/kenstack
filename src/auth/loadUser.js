import { cache } from "react";

import { cookies } from "next/headers";
import verifyJWT from "./verifyJWT";
import Session from "../models/Session";
import User from "../models/User";

export default cache(async function getUser() {
  const claims = await verifyJWT();

  if (cookies.user) {
    return cookies.user;
  }

  if (!claims) {
    return false;
  }

  // const user = await User.loadById(claims.sub);
  const session = await Session.findById(claims.sid).populate({
    path: "user",
    model: User,
  });

  // User.syncIndexes()

  if (!session.user || session.user._id != claims.sub) {
    return false;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    return false;
  }

  const user = session.user;

  // ensure this is safe. There is likely a more orthodox way. 
  cookies.user = user;

  // temporarilly link session
  user.session = session;
  
  return user;
});
