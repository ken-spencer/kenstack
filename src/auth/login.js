import { SignJWT } from "jose";
import { auditLog } from "logger";
import Session from "models/Session";

const secret = new TextEncoder().encode(process.env.SECRET);
const alg = "HS256";

export default async function login(user, request, response) {
  auditLog(request, "LOGIN", null, {}, user);

  const session = new Session({ user });
  await session.save();

  const claims = {
    sub: user._id.toString(), // The UID of the user in your system
    sid: session._id.toString(),
  };

  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    // .setIssuer('urn:example:issuer')
    // .setAudience('urn:example:audience')
    .setExpirationTime("1h")
    .sign(secret);

  response.cookies.set("auth", token, {
    httpOnly: true,
    expires: Date.now() + 60 * 60 * 1000, // 1 hour,
    // secure: true,
  });
}
