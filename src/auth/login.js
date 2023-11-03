"use server";

import { cookies } from "next/headers";
import { SignJWT } from "jose";
import auditLog from "log/audit";
import Session from "models/Session";

const secret = new TextEncoder().encode(process.env.SECRET);
const alg = "HS256";

export default async function login(user) {
  auditLog("login", null, {}, user);

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

  cookies().set("auth", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour,
  });
}
