"use server";

import { redirect } from "next/navigation";

import { cookies } from "next/headers";

import { SignJWT } from "jose";
import auditLog from "../log/audit";
import verifyJWT from "./verifyJWT";

import loadUser from "./loadUser";

const secret = new TextEncoder().encode(process.env.SECRET);
const alg = "HS256";

export default async function revalidate() {
  const claims = await verifyJWT();

  if (!claims) {
    return false;
  }

  const secondsRemaining = Math.round(claims.exp - Date.now() / 1000);
  if (secondsRemaining > 2700) {
    return null;
  }

  // detect server action
  // headers().get("next-action")

  const user = await loadUser();

  if (!user) {
    return false;
  }
  const session = user.session;

  // additional security check, may want to audit this

  if (session.user._id.toString() !== claims.sub) {
    return false;
  }

  // extend session date to max of 1 hour
  const date = new Date();
  session.expiresAt = date.setMinutes(date.getMinutes() + 60);
  await session.save();

  const newClaims = {
    sub: user._id.toString(), // The UID of the user in your system
    sid: session._id.toString(),
    roles: user.roles,
  };

  const token = await new SignJWT(newClaims)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(session.expiresAt.getTime() / 1000)
    .sign(secret);

  try {
    cookies().set("auth", token, {
      httpOnly: true,
      secure: !process.env.DEVELOPMENT && process.env.NODE_ENV === "production",
      sameSite: "Strict",
      expires: session.expiresAt.getTime(),
    });
  } catch (e) {
    // This code is running in a server coponent. Redirect to api.
    redirect(thaumazoAdmin.pathName("/api/revalidate"));
  }

  const publicToken = {
    expires: session.expiresAt.getTime(),
    roles: user.roles,
  };

  let json = JSON.stringify(publicToken);
  let encodedString = Buffer.from(json, "utf-8").toString("base64");

  cookies().set("authPublic", encodedString, {
    httpOnly: false,
    secure: !process.env.DEVELOPMENT && process.env.NODE_ENV === "production",
    sameSite: "Strict",
    expires: session.expiresAt.getTime(),
  });

  auditLog("revalidate", null, {}, session.user);

  return true;
}
