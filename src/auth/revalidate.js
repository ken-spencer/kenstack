import { SignJWT } from "jose";
import { auditLog } from "logger";
import Session from "models/Session";
import { verifyJWT } from "auth/verifyJWT";

const secret = new TextEncoder().encode(process.env.SECRET);
const alg = "HS256";

export default async function revalidate(request, response) {
  const claims = await verifyJWT(request);

  if (!claims) {
    return false;
  }

  const session = await Session.findById(claims.sid);

  if (!session) {
    return false;
  }

  // additional security check, may want to audit this
  if (session.user.toString() !== claims.sub) {
    return false;
  }

  // extend session date to max of 1 hour
  let date = new Date();
  session.expiresAt = date.setMinutes(date.getMinutes() + 60);
  await session.save();

  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(session.expiresAt.getTime())
    .sign(secret);

  response.cookies.set("auth", token, {
    httpOnly: true,
    expires: session.expiresAt.getTime(),
    // secure: true,
  });

  auditLog(request, "REVALIDATE", null, {}, session.user);

  return true;
}
