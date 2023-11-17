import { SignJWT } from "jose";
import auditLog from "../log/audit";
import Session from "../models/Session";
import verifyJWT from "./verifyJWT";

const secret = new TextEncoder().encode(process.env.SECRET);
const alg = "HS256";

export default async function revalidate(request, response) {
  const claims = await verifyJWT();

  if (!claims) {
    return false;
  }

  // TODO look up user object to ensure the user is still in the DB
  const session = await Session.findById(claims.sid);

  if (!session) {
    return false;
  }

  // additional security check, may want to audit this
  if (session.user.toString() !== claims.sub) {
    return false;
  }

  // extend session date to max of 1 hour
  const date = new Date();
  session.expiresAt = date.setMinutes(date.getMinutes() + 60);
  await session.save();

  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(session.expiresAt.getTime())
    .sign(secret);

  response.cookies.set("auth", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    expires: session.expiresAt.getTime(),
  });

  const publicToken = response.cookies.get("authPublic");
  response.cookies.set("authPublic", publicToken, {
    httpOnly: false,
    secure: true,
    sameSite: "Strict",
    expires: session.expiresAt.getTime(),
  });

  auditLog("revalidate", null, {}, session.user);

  return true;
}
