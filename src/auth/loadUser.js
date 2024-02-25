import { cache } from "react";

import verifyJWT from "./verifyJWT";
import Session from "../models/Session";
// import errorLog from "../log/error";

export default async function loadUser() {
  const claims = await verifyJWT();

  if (!claims) {
    return false;
  }

  return await loadUserById(claims.sub, claims.sid);
}

const loadUserById = cache(async (userId, sessionId) => {
  const User = await thaumazoModels.get("User");
  const session = await Session.findById(sessionId).populate({
    path: "user",
    model: User,
  });

  // User.syncIndexes()

  if (!session || !session.user || session.user._id != userId) {
    return false;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    return false;
  }

  const user = session.user;

  // ensure this is safe. There is likely a more orthodox way.

  // temporarilly link session
  user.session = session;

  return user;
});
